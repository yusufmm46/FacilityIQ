"""
Realistic Wi-Fi RSSI data generator for FacilityIQ.

This mimics what a real Cisco/Aruba Wi-Fi controller observes: for every
device (phone/laptop) it reports the signal strength (RSSI) heard by each
nearby access point. FacilityIQ then triangulates positions from those RSSI
values — exactly as it would with real hardware.

To make the demo compelling, the generator places synthetic people inside the
real zones you drew in FacilityIQ and varies the crowd by time of day
(morning arrival, lunch surge, end-of-day). A real controller would not know
about "zones" — it only emits RSSI — but placing people in zones makes the
live floor plan light up realistically.
"""
import math
import random
import time as _time
from datetime import datetime, timezone

# RSSI signal model — MUST match FacilityIQ's backend (rssi_to_distance):
#   distance = 10 ** ((TX_POWER - rssi) / (10 * PATH_LOSS_N))
# so the inverse used here is:
#   rssi = TX_POWER - 10 * PATH_LOSS_N * log10(distance)
TX_POWER = -30
PATH_LOSS_N = 2.5

# An AP only "hears" a device if the modelled RSSI is above this floor (dBm).
RSSI_SENSITIVITY = -92


def distance_to_rssi(d_m):
    d = max(d_m, 0.1)
    return TX_POWER - 10 * PATH_LOSS_N * math.log10(d)


# ── Time-of-day occupancy patterns ────────────────────────────────
# Each returns a 0..1 factor of how full the area is at a given hour.
def _bell(hour, peak, width):
    return math.exp(-((hour - peak) ** 2) / (2 * width ** 2))


def occupancy_factor(area_name, hour):
    """0..1 fraction of capacity expected for an area at a given hour."""
    name = area_name.lower()
    if "cafeteria" in name:
        # breakfast bump + strong lunch surge
        return min(1.0, 0.25 + 0.4 * _bell(hour, 8.5, 0.8) + 0.95 * _bell(hour, 12.5, 1.1))
    if "lobby" in name or "reception" in name:
        # arrival and departure spikes
        return min(1.0, 0.1 + 0.8 * _bell(hour, 8.5, 0.7) + 0.7 * _bell(hour, 17.5, 0.9))
    if "work" in name or "office" in name:
        # steady work hours, dips at lunch
        base = 0.85 * _bell(hour, 11, 2.6) + 0.85 * _bell(hour, 15, 2.4)
        return max(0.05, min(1.0, base - 0.3 * _bell(hour, 12.5, 0.8)))
    # default generic office pattern
    return max(0.05, min(1.0, 0.8 * _bell(hour, 13, 3.0)))


# ── Geometry helpers ──────────────────────────────────────────────
def _point_in_polygon(x, y, poly):
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i][0], poly[i][1]
        xj, yj = poly[j][0], poly[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _random_point_in_polygon(poly, max_tries=40):
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    for _ in range(max_tries):
        x = random.uniform(minx, maxx)
        y = random.uniform(miny, maxy)
        if _point_in_polygon(x, y, poly):
            return x, y
    # fallback to centroid
    return sum(xs) / len(xs), sum(ys) / len(ys)


def _readings_for_person(area, x, y, mac):
    """Generate one RSSI reading per AP that can hear this device."""
    rows = []
    for ap in area["access_points"]:
        d = math.hypot(x - ap["x_m"], y - ap["y_m"])
        rssi = distance_to_rssi(d) + random.gauss(0, 2.0)  # 2 dBm measurement noise
        if rssi >= RSSI_SENSITIVITY:
            rows.append({
                "area_name": area["name"],
                "mac_address": mac,
                "ap_id": ap["ap_id"],
                "ap_x": round(ap["x_m"], 3),
                "ap_y": round(ap["y_m"], 3),
                "rssi": round(rssi, 1),
            })
    # need >= 3 APs for a good fix; if fewer, still send what we have
    return rows


class Generator:
    """Holds the fetched layout and produces RSSI batches on demand."""

    def __init__(self, areas):
        # areas: list of {name, width_m, height_m, access_points:[{ap_id,x_m,y_m}],
        #                 zones:[{name, capacity, polygon_json}]}
        self.areas = [a for a in areas if a.get("access_points")]
        # stable device identities per area so MACs persist across pushes
        self._macs = {}
        for a in self.areas:
            total_cap = sum(max(z.get("capacity", 0), 0) for z in a.get("zones", [])) or 40
            pool = int(total_cap * 1.3) + 10
            self._macs[a["name"]] = [
                ":".join(f"{random.randint(0,255):02X}" for _ in range(6))
                for _ in range(pool)
            ]

    @property
    def area_names(self):
        return [a["name"] for a in self.areas]

    def _target_count(self, area, hour):
        zones = area.get("zones", [])
        total_cap = sum(max(z.get("capacity", 0), 0) for z in zones) or 40
        factor = occupancy_factor(area["name"], hour)
        jitter = random.uniform(0.85, 1.15)  # per-push movement
        return max(0, int(round(total_cap * factor * jitter)))

    def generate_batch(self, hour=None):
        """Build a full RSSI batch across all areas. Returns the payload dict
        and a per-area people-count summary."""
        if hour is None:
            hour = datetime.now().hour + datetime.now().minute / 60.0

        readings = []
        summary = {}
        for area in self.areas:
            count = self._target_count(area, hour)
            macs = self._macs[area["name"]]
            chosen = random.sample(macs, min(count, len(macs)))
            zones = area.get("zones", [])

            placed = 0
            for mac in chosen:
                # 80% of people stand inside a zone (weighted by capacity),
                # 20% are "in transit" somewhere on the floor.
                if zones and random.random() < 0.8:
                    z = random.choices(
                        zones,
                        weights=[max(zz.get("capacity", 1), 1) for zz in zones],
                    )[0]
                    poly = z.get("polygon_json") or []
                    if len(poly) >= 3:
                        x, y = _random_point_in_polygon(poly)
                    else:
                        x = random.uniform(0, area["width_m"])
                        y = random.uniform(0, area["height_m"])
                else:
                    x = random.uniform(0, area["width_m"])
                    y = random.uniform(0, area["height_m"])

                rows = _readings_for_person(area, x, y, mac)
                if rows:
                    readings.extend(rows)
                    placed += 1
            summary[area["name"]] = placed

        payload = {
            "source": "facilityiq-simulator",
            "batch_timestamp": datetime.now(timezone.utc).isoformat(),
            "readings": readings,
        }
        return payload, summary
