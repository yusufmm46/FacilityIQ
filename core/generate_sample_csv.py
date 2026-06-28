"""
Generate sample_data_multi_area.csv with AP-CAF-01..05 matching test_cafeteria.dxf
Floor: 30m x 20m, APs at meter positions
"""
import numpy as np
import pandas as pd
import os

np.random.seed(42)

TX_POWER = -30
PATH_LOSS_N = 2.5

ACCESS_POINTS = {
    "AP-CAF-01": (7,  4),
    "AP-CAF-02": (23, 4),
    "AP-CAF-03": (8,  15),
    "AP-CAF-04": (16, 15),
    "AP-CAF-05": (15, 1),
}

FLOOR_W, FLOOR_H = 30, 20

def distance_to_rssi(dist):
    rssi = TX_POWER - 10 * PATH_LOSS_N * np.log10(max(dist, 0.1))
    return round(rssi + np.random.normal(0, 2), 1)

records = []
n_devices = 40
timestamps = [
    "2024-01-15 09:00:00",
    "2024-01-15 09:10:00",
    "2024-01-15 09:20:00",
    "2024-01-15 09:30:00",
    "2024-01-15 09:40:00",
]

for ts in timestamps:
    for d in range(n_devices):
        px = np.random.uniform(1, FLOOR_W - 1)
        py = np.random.uniform(1, FLOOR_H - 1)
        mac = f"AA:CA:CC:{d:02X}:00:01"
        for ap_id, (ax, ay) in ACCESS_POINTS.items():
            dist = np.sqrt((px - ax) ** 2 + (py - ay) ** 2)
            rssi = distance_to_rssi(dist)
            records.append({
                "timestamp": ts,
                "mac_address": mac,
                "ap_id": ap_id,
                "ap_x": ax,
                "ap_y": ay,
                "rssi": rssi,
                "area_name": "cafeteria",
                "true_x": round(px, 3),
                "true_y": round(py, 3),
            })

df = pd.DataFrame(records)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data_multi_area.csv")
df.to_csv(out, index=False)
print(f"Generated: {out}")
print(f"  Rows: {len(df)}, Devices: {n_devices}, Timestamps: {len(timestamps)}")
print(f"  AP IDs: {list(ACCESS_POINTS.keys())}")
print(f"  area_name: cafeteria")
