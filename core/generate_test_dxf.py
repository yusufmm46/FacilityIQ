"""
Generate test_cafeteria.dxf — a realistic L-shaped cafeteria floor plan.
Units: millimeters ($INSUNITS = 4)
All coordinates are in mm (meters * 1000)
Run: python core/generate_test_dxf.py
"""
import ezdxf
from ezdxf.enums import TextEntityAlignment
import os

MM = 1000  # 1 meter = 1000 mm

def main():
    doc = ezdxf.new(dxfversion="R2010")
    doc.header["$INSUNITS"] = 4  # millimeters

    msp = doc.modelspace()

    # Create layers
    doc.layers.add("BOUNDARY", color=7)    # white
    doc.layers.add("WALLS", color=3)       # green
    doc.layers.add("AP", color=5)          # blue
    doc.layers.add("DIMENSIONS", color=2)  # yellow

    # ── FLOOR BOUNDARY (L-shaped, in mm) ──────────────────────────
    # Meters: (0,0)→(30,0)→(30,10)→(20,10)→(20,20)→(0,20)→close
    boundary_pts = [
        (0*MM,  0*MM),
        (30*MM, 0*MM),
        (30*MM, 10*MM),
        (20*MM, 10*MM),
        (20*MM, 20*MM),
        (0*MM,  20*MM),
    ]
    boundary = msp.add_lwpolyline(boundary_pts, dxfattribs={"layer": "BOUNDARY", "closed": True})

    # ── INTERNAL ROOM POLYLINES on layer WALLS ────────────────────
    rooms = [
        # (name, points in meters)
        ("Dining Area A",  [(1,1),  (14,1), (14,9),  (1,9)]),
        ("Dining Area B",  [(16,1), (29,1), (29,9),  (16,9)]),
        ("Food Counter",   [(1,11), (19,11),(19,19), (1,19)]),
        ("Storage",        [(21,11),(29,11),(29,19), (21,19)]),
    ]
    for name, pts_m in rooms:
        pts_mm = [(x*MM, y*MM) for x, y in pts_m]
        msp.add_lwpolyline(pts_mm, dxfattribs={"layer": "WALLS", "closed": True})
        # Add room label
        cx = (pts_m[0][0] + pts_m[2][0]) / 2 * MM
        cy = (pts_m[0][1] + pts_m[2][1]) / 2 * MM
        msp.add_text(name, dxfattribs={"layer": "WALLS", "height": 400,
                                        "insert": (cx, cy)})

    # ── ACCESS POINTS on layer AP with APID attribute ─────────────
    # Positions in meters: AP-CAF-01(7,4), AP-CAF-02(23,4),
    #                      AP-CAF-03(8,15), AP-CAF-04(16,15), AP-CAF-05(15,1)
    aps = [
        ("AP-CAF-01", 7,  4),
        ("AP-CAF-02", 23, 4),
        ("AP-CAF-03", 8,  15),
        ("AP-CAF-04", 16, 15),
        ("AP-CAF-05", 15, 1),
    ]

    # Create block definition for AP with APID attribute
    ap_block = doc.blocks.new("AP_MARKER")
    ap_block.add_circle((0, 0), radius=300, dxfattribs={"layer": "AP", "color": 5})
    ap_block.add_attdef("APID", (0, -500), dxfattribs={"layer": "AP", "height": 300})

    for ap_id, x_m, y_m in aps:
        x_mm, y_mm = x_m * MM, y_m * MM
        blockref = msp.add_blockref("AP_MARKER", (x_mm, y_mm), dxfattribs={"layer": "AP"})
        blockref.add_attrib("APID", ap_id, (x_mm, y_mm - 500))

    # ── DIMENSION LINES on layer DIMENSIONS ──────────────────────
    # Horizontal: 0 to 30m labeled "30000" (mm)
    msp.add_linear_dim(
        base=(15*MM, -2*MM),
        p1=(0, 0),
        p2=(30*MM, 0),
        dxfattribs={"layer": "DIMENSIONS"},
    ).render()
    # Vertical: 0 to 20m labeled "20000" (mm)
    msp.add_linear_dim(
        base=(-2*MM, 10*MM),
        p1=(0, 0),
        p2=(0, 20*MM),
        angle=90,
        dxfattribs={"layer": "DIMENSIONS"},
    ).render()

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_cafeteria.dxf")
    doc.saveas(out_path)
    print(f"Generated: {out_path}")
    print(f"  Floor: L-shaped 30m x 20m")
    print(f"  APs: {len(aps)} ({', '.join(a[0] for a in aps)})")
    print(f"  Rooms: {len(rooms)}")
    print(f"  Units: millimeters ($INSUNITS=4)")


if __name__ == "__main__":
    main()
