import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy.optimize import minimize

# ── CONFIG ────────────────────────────────────────────────────
FLOOR_W, FLOOR_H = 100, 60   # Cafeteria: 100ft x 60ft

# Access Point positions (x, y)
ACCESS_POINTS = {
    "AP-1": (10,  10),
    "AP-2": (90,  10),
    "AP-3": (10,  50),
    "AP-4": (90,  50),
    "AP-5": (50,  30),   # center AP for better accuracy
}

# Zone definitions (name, x_min, x_max, y_min, y_max)
ZONES = {
    "Zone-A (Entrance)":    (0,  33, 0,  30),
    "Zone-B (Window Side)": (33, 67, 0,  30),
    "Zone-C (Far Corner)":  (67,100, 0,  30),
    "Zone-D (Center)":      (0,  50, 30, 60),
    "Zone-E (Back Area)":   (50,100, 30, 60),
}

TX_POWER = -30   # dBm at 1 meter
PATH_LOSS_N = 2.5  # environment factor (2=open, 3=walls)

# ── 1. RSSI DATA GENERATOR ────────────────────────────────────
def distance_to_rssi(dist):
    """Convert real distance to RSSI with noise"""
    rssi = TX_POWER - 10 * PATH_LOSS_N * np.log10(max(dist, 0.1))
    noise = np.random.normal(0, 2)   # ±2 dBm noise
    return round(rssi + noise, 1)

def generate_rssi_data(n_devices=40, n_timestamps=5):
    records = []
    for t in range(n_timestamps):
        timestamp = f"2024-01-15 09:{t*10:02d}:00"
        for d in range(n_devices):
            # Random person position
            px = np.random.uniform(2, FLOOR_W-2)
            py = np.random.uniform(2, FLOOR_H-2)
            mac = f"AA:BB:CC:{d:02X}:00:01"
            for ap_id, (ax, ay) in ACCESS_POINTS.items():
                dist = np.sqrt((px-ax)**2 + (py-ay)**2)
                rssi = distance_to_rssi(dist)
                records.append({
                    "timestamp": timestamp,
                    "mac_address": mac,
                    "ap_id": ap_id,
                    "ap_x": ax, "ap_y": ay,
                    "rssi": rssi,
                    "true_x": px,   # kept for validation only
                    "true_y": py
                })
    return pd.DataFrame(records)

# ── 2. TRIANGULATION ALGORITHM ────────────────────────────────
def rssi_to_distance(rssi):
    """Convert RSSI back to estimated distance"""
    return 10 ** ((TX_POWER - rssi) / (10 * PATH_LOSS_N))

def trilaterate(ap_positions, distances):
    """Weighted least-squares trilateration"""
    def error(pos):
        total = 0
        for (ax, ay), d_est in zip(ap_positions, distances):
            d_calc = np.sqrt((pos[0]-ax)**2 + (pos[1]-ay)**2)
            total += (d_calc - d_est)**2
        return total
    # Initial guess = weighted centroid
    weights = [1/max(d,0.1) for d in distances]
    x0 = np.average([p[0] for p in ap_positions], weights=weights)
    y0 = np.average([p[1] for p in ap_positions], weights=weights)
    result = minimize(error, [x0, y0], method="Nelder-Mead")
    x = np.clip(result.x[0], 0, FLOOR_W)
    y = np.clip(result.x[1], 0, FLOOR_H)
    return round(x, 1), round(y, 1)

def locate_devices(df):
    """Run triangulation for each device at each timestamp"""
    results = []
    for (ts, mac), grp in df.groupby(["timestamp","mac_address"]):
        ap_pos   = list(zip(grp["ap_x"], grp["ap_y"]))
        distances = [rssi_to_distance(r) for r in grp["rssi"]]
        est_x, est_y = trilaterate(ap_pos, distances)
        true_x = grp["true_x"].iloc[0]
        true_y = grp["true_y"].iloc[0]
        error_ft = round(np.sqrt((est_x-true_x)**2 + (est_y-true_y)**2), 1)
        results.append({
            "timestamp": ts, "mac_address": mac,
            "est_x": est_x, "est_y": est_y,
            "true_x": true_x, "true_y": true_y,
            "error_ft": error_ft
        })
    return pd.DataFrame(results)

# ── 3. ZONE DETECTION ─────────────────────────────────────────
def assign_zone(x, y):
    for zone, (xmin, xmax, ymin, ymax) in ZONES.items():
        if xmin <= x < xmax and ymin <= y < ymax:
            return zone
    return "Unknown"

def zone_occupancy(located_df):
    located_df = located_df.copy()
    located_df["zone"] = located_df.apply(
        lambda r: assign_zone(r["est_x"], r["est_y"]), axis=1)
    latest = located_df[located_df["timestamp"] == located_df["timestamp"].max()]
    counts = latest["zone"].value_counts().reset_index()
    counts.columns = ["Zone", "Devices"]
    counts["Occupancy%"] = (counts["Devices"] / counts["Devices"].sum() * 100).round(1)
    return counts, located_df

# ── 4. VISUALIZATION ──────────────────────────────────────────
def plot_results(located_df, zone_counts):
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    fig.patch.set_facecolor("#F8FAFC")

    # --- LEFT: Floor plan with device positions ---
    ax = axes[0]
    ax.set_facecolor("#EFF6FF")
    ax.set_xlim(0, FLOOR_W); ax.set_ylim(0, FLOOR_H)
    ax.set_title("Device Positions + Zone Map", fontsize=13, fontweight="bold", pad=10)

    zone_colors = ["#BFDBFE","#BBF7D0","#FEF08A","#FECACA","#DDD6FE"]
    for (zname, (x0,x1,y0,y1)), col in zip(ZONES.items(), zone_colors):
        rect = mpatches.FancyBboxPatch((x0,y0), x1-x0, y1-y0,
            boxstyle="round,pad=0.5", facecolor=col, edgecolor="#94A3B8",
            linewidth=1, alpha=0.6)
        ax.add_patch(rect)
        ax.text((x0+x1)/2, (y0+y1)/2, zname.split("(")[0].strip(),
                ha="center", va="center", fontsize=7.5, fontweight="bold",
                color="#1E293B")

    # Plot estimated positions (latest timestamp)
    latest = located_df[located_df["timestamp"] == located_df["timestamp"].max()]
    ax.scatter(latest["true_x"], latest["true_y"],
               c="#2563EB", alpha=0.4, s=30, label="True position")
    ax.scatter(latest["est_x"], latest["est_y"],
               c="#DC2626", alpha=0.7, s=30, marker="x", label="Estimated position", linewidths=1.5)

    # AP markers
    for ap_id, (ax_, ay_) in ACCESS_POINTS.items():
        ax.plot(ax_, ay_, "^", color="#0F172A", markersize=10, zorder=5)
        ax.text(ax_+1.5, ay_+1.5, ap_id, fontsize=7, color="#0F172A", fontweight="bold")

    ax.legend(loc="upper right", fontsize=8)
    ax.set_xlabel("Floor Width (ft)"); ax.set_ylabel("Floor Height (ft)")
    ax.grid(True, linestyle="--", alpha=0.3)

    # --- RIGHT: Zone occupancy bar chart ---
    ax2 = axes[1]
    ax2.set_facecolor("#F8FAFC")
    bar_colors = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6"]
    bars = ax2.barh(zone_counts["Zone"], zone_counts["Occupancy%"],
                    color=bar_colors[:len(zone_counts)], edgecolor="white",
                    linewidth=1.5, height=0.55)
    for bar, (_, row) in zip(bars, zone_counts.iterrows()):
        ax2.text(bar.get_width()+0.5, bar.get_y()+bar.get_height()/2,
                 f'{row["Devices"]} devices  ({row["Occupancy%"]}%)',
                 va="center", fontsize=9, color="#1E293B")
    ax2.set_title("Zone Occupancy (Latest Snapshot)", fontsize=13, fontweight="bold", pad=10)
    ax2.set_xlabel("Occupancy %")
    ax2.set_xlim(0, zone_counts["Occupancy%"].max() + 20)
    ax2.grid(axis="x", linestyle="--", alpha=0.3)
    ax2.invert_yaxis()

    plt.tight_layout(pad=3)
    plt.savefig("occupancy_core_output.png", dpi=150,
                bbox_inches="tight", facecolor=fig.get_facecolor())
    print("Chart saved.")

# ── MAIN ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== Wi-Fi Occupancy Core Engine ===\n")

    print("1. Generating synthetic RSSI data...")
    raw_df = generate_rssi_data(n_devices=40, n_timestamps=5)
    print(f"   ✓ {len(raw_df)} raw RSSI records generated")
    print(raw_df[["timestamp","mac_address","ap_id","rssi"]].head(5).to_string(index=False))

    print("\n2. Running triangulation algorithm...")
    located_df = locate_devices(raw_df)
    avg_error = located_df["error_ft"].mean()
    print(f"   ✓ {len(located_df)} devices located")
    print(f"   ✓ Average location error: {avg_error:.1f} ft")
    print(located_df[["timestamp","mac_address","est_x","est_y","error_ft"]].head(5).to_string(index=False))

    print("\n3. Running zone detection...")
    zone_counts, located_df = zone_occupancy(located_df)
    print(f"   ✓ Zone occupancy breakdown:")
    print(zone_counts.to_string(index=False))
    most_popular = zone_counts.iloc[0]["Zone"]
    print(f"\n   🔴 Most crowded zone: {most_popular}")

    print("\n4. Generating visualization...")
    plot_results(located_df, zone_counts)

    print("\n=== Core Engine Test PASSED ✓ ===")