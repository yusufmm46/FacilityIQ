import io
import os
import sys
import json
import hashlib
import tempfile
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.optimize import minimize
from sqlalchemy import select, delete, text, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_db, init_db, AsyncSessionLocal
from models import (
    Organisation, Building, Floor, Area, AccessPoint,
    Zone, RssiUpload, DevicePosition, ZoneHourlyStat
)

app = FastAPI(title="FacilityIQ API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TX_POWER = -30
PATH_LOSS_N = 2.5


# ── STARTUP ──────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await init_db()
    # Purge any history beyond the retention window on boot
    try:
        async with AsyncSessionLocal() as db:
            await _purge_old_history(db, force=True)
            await db.commit()
    except Exception:
        pass


# ── HELPERS ──────────────────────────────────────────────────────
def rssi_to_distance(rssi):
    return 10 ** ((TX_POWER - rssi) / (10 * PATH_LOSS_N))


def trilaterate(ap_positions, distances, floor_w=100, floor_h=60):
    def error(pos):
        total = 0
        for (ax, ay), d_est in zip(ap_positions, distances):
            d_calc = np.sqrt((pos[0] - ax) ** 2 + (pos[1] - ay) ** 2)
            total += (d_calc - d_est) ** 2
        return total

    weights = [1 / max(d, 0.1) for d in distances]
    x0 = np.average([p[0] for p in ap_positions], weights=weights)
    y0 = np.average([p[1] for p in ap_positions], weights=weights)
    result = minimize(error, [x0, y0], method="Nelder-Mead")
    x = float(np.clip(result.x[0], 0, floor_w))
    y = float(np.clip(result.x[1], 0, floor_h))
    return round(x, 2), round(y, 2)


def point_in_polygon(x, y, polygon):
    """Ray-casting algorithm. polygon is list of [px, py] in meters."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i][0], polygon[i][1]
        xj, yj = polygon[j][0], polygon[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def get_zone_status(pct):
    if pct < 30:
        return "QUIET"
    elif pct < 60:
        return "MODERATE"
    elif pct < 80:
        return "BUSY"
    return "CRITICAL"


def meters_to_svg(x_m, y_m, width_m, height_m, vw=1000, vh=600):
    scale = min(vw / max(width_m, 0.01), vh / max(height_m, 0.01))
    x_svg = x_m * scale + (vw - width_m * scale) / 2
    y_svg = (height_m - y_m) * scale + (vh - height_m * scale) / 2
    return round(x_svg, 1), round(y_svg, 1)


# ── PYDANTIC SCHEMAS ──────────────────────────────────────────────
class OrgCreate(BaseModel):
    name: str


class BuildingCreate(BaseModel):
    org_id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class FloorCreate(BaseModel):
    building_id: str
    name: str
    level_number: int = 1


class FloorUpdate(BaseModel):
    name: Optional[str] = None
    level_number: Optional[int] = None


class AreaCreate(BaseModel):
    floor_id: str
    name: str


class AreaUpdate(BaseModel):
    name: Optional[str] = None
    width_m: Optional[float] = None
    height_m: Optional[float] = None


class ZoneCreate(BaseModel):
    area_id: str
    name: str
    capacity: int = 10
    polygon_json: list
    color: str = "#3B82F6"
    method: str = "freehand"


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    color: Optional[str] = None


# ── HEALTH ────────────────────────────────────────────────────────
@app.get("/api/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "ok", "database": db_status}


@app.get("/")
def root():
    return {"message": "FacilityIQ API v2 ✅"}


# ── ORGANISATIONS ─────────────────────────────────────────────────
@app.post("/api/organisations")
async def create_org(body: OrgCreate, db: AsyncSession = Depends(get_db)):
    org = Organisation(id=str(uuid.uuid4()), name=body.name)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return {"id": org.id, "name": org.name, "created_at": str(org.created_at)}


@app.get("/api/organisations")
async def list_orgs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organisation).order_by(Organisation.created_at))
    orgs = result.scalars().all()
    return [{"id": o.id, "name": o.name, "created_at": str(o.created_at)} for o in orgs]


# ── BUILDINGS ─────────────────────────────────────────────────────
@app.post("/api/buildings")
async def create_building(body: BuildingCreate, db: AsyncSession = Depends(get_db)):
    b = Building(
        id=str(uuid.uuid4()),
        org_id=body.org_id,
        name=body.name,
        address=body.address,
        city=body.city,
        country=body.country,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _building_dict(b)


@app.get("/api/buildings")
async def list_buildings(org_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Building).order_by(Building.created_at)
    if org_id:
        q = q.where(Building.org_id == org_id)
    result = await db.execute(q)
    return [_building_dict(b) for b in result.scalars().all()]


@app.put("/api/buildings/{bid}")
async def update_building(bid: str, body: BuildingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Building).where(Building.id == bid))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Building not found")
    if body.name is not None:
        b.name = body.name
    if body.address is not None:
        b.address = body.address
    if body.city is not None:
        b.city = body.city
    if body.country is not None:
        b.country = body.country
    await db.commit()
    await db.refresh(b)
    return _building_dict(b)


@app.delete("/api/buildings/{bid}")
async def delete_building(bid: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Building).where(Building.id == bid))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Building not found")
    await db.delete(b)
    await db.commit()
    return {"deleted": bid}


def _building_dict(b):
    return {
        "id": b.id, "org_id": b.org_id, "name": b.name,
        "address": b.address, "city": b.city, "country": b.country,
        "created_at": str(b.created_at),
    }


# ── FLOORS ────────────────────────────────────────────────────────
@app.post("/api/floors")
async def create_floor(body: FloorCreate, db: AsyncSession = Depends(get_db)):
    f = Floor(id=str(uuid.uuid4()), building_id=body.building_id, name=body.name, level_number=body.level_number)
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return _floor_dict(f)


@app.get("/api/floors")
async def list_floors(building_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Floor).order_by(Floor.level_number)
    if building_id:
        q = q.where(Floor.building_id == building_id)
    result = await db.execute(q)
    return [_floor_dict(f) for f in result.scalars().all()]


@app.put("/api/floors/{fid}")
async def update_floor(fid: str, body: FloorUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Floor).where(Floor.id == fid))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Floor not found")
    if body.name is not None:
        f.name = body.name
    if body.level_number is not None:
        f.level_number = body.level_number
    await db.commit()
    await db.refresh(f)
    return _floor_dict(f)


@app.delete("/api/floors/{fid}")
async def delete_floor(fid: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Floor).where(Floor.id == fid))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Floor not found")
    await db.delete(f)
    await db.commit()
    return {"deleted": fid}


def _floor_dict(f):
    return {"id": f.id, "building_id": f.building_id, "name": f.name,
            "level_number": f.level_number, "created_at": str(f.created_at)}


# ── AREAS ─────────────────────────────────────────────────────────
@app.post("/api/areas")
async def create_area(body: AreaCreate, db: AsyncSession = Depends(get_db)):
    a = Area(id=str(uuid.uuid4()), floor_id=body.floor_id, name=body.name)
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return _area_dict(a)


@app.get("/api/areas")
async def list_areas(floor_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Area).order_by(Area.created_at)
    if floor_id:
        q = q.where(Area.floor_id == floor_id)
    result = await db.execute(q)
    areas = result.scalars().all()
    out = []
    for a in areas:
        zones_r = await db.execute(select(Zone).where(Zone.area_id == a.id))
        aps_r = await db.execute(select(AccessPoint).where(AccessPoint.area_id == a.id))
        d = _area_dict(a)
        d["zones"] = [_zone_dict(z) for z in zones_r.scalars().all()]
        d["access_points"] = [_ap_dict(p) for p in aps_r.scalars().all()]
        out.append(d)
    return out


@app.put("/api/areas/{aid}")
async def update_area(aid: str, body: AreaUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Area).where(Area.id == aid))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Area not found")
    if body.name is not None:
        a.name = body.name
    if body.width_m is not None:
        a.width_m = body.width_m
    if body.height_m is not None:
        a.height_m = body.height_m
    await db.commit()
    await db.refresh(a)
    return _area_dict(a)


@app.delete("/api/areas/{aid}")
async def delete_area(aid: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Area).where(Area.id == aid))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Area not found")
    await db.delete(a)
    await db.commit()
    return {"deleted": aid}


def _area_dict(a):
    return {
        "id": a.id, "floor_id": a.floor_id, "name": a.name,
        "width_m": a.width_m, "height_m": a.height_m,
        "svg_path_data": a.svg_path_data,
        "dxf_parsed_data": a.dxf_parsed_data,
        "created_at": str(a.created_at),
    }


# ── DXF PARSING ───────────────────────────────────────────────────

# Layers that represent structural room walls (kept as room polys)
_STRUCTURAL_LAYERS = {
    "WALLS", "WALL", "ROOMS", "ROOM", "PARTITIONS", "PARTITION",
    "INTERIOR", "INTERIORS", "SPACE", "SPACES", "STRUCTURAL",
    "ARCHITECTURE", "ARCH", "A-WALL", "A-WALLS", "A-ROOM", "A-ROOMS",
    "A-AREA", "A-FLOR", "A-FLOR-OTLN", "BOUNDARY", "BOUNDARIES",
    "FLOOR_BOUNDARY", "OUTLINE", "OUTLINES", "PERIMETER",
}

# Layers to always exclude (furniture, annotations, dimensions, etc.)
_EXCLUDE_LAYERS = {
    "FURNITURE", "FURN", "FURNITUR", "FF&E", "FIXTURES",
    "DIMENSIONS", "DIMENSION", "DIM", "DIMS", "ANNO",
    "ANNOTATION", "ANNOTATIONS", "TEXT", "TEXTS",
    "DOORS", "DOOR", "WINDOWS", "WINDOW", "WIN",
    "COLUMNS", "COLUMN", "COL", "STAIR", "STAIRS",
    "HATCH", "HATCHING", "PATTERN", "DEFPOINTS",
    "TITLEBLOCK", "TITLE", "BORDER", "FRAME",
    "ELECTRICAL", "ELEC", "PLUMBING", "PLUMB", "HVAC",
    "DETAIL", "DETAILS", "NOTES", "NOTE",
}

# AP layer names to search
_AP_LAYERS = {
    "AP", "APS", "ACCESS-POINTS", "ACCESS_POINTS", "ACCESSPOINTS",
    "WIFI", "WIRELESS", "NETWORK", "WLAN", "ROUTER", "ROUTERS",
    "AP-LOCATIONS", "AP_LOCATIONS", "WIFIAP", "WIFI-AP",
}

# Attribute tag names that hold the AP ID
_AP_ATTRIB_TAGS = {
    "APID", "AP_ID", "AP-ID", "ID", "NAME", "SSID",
    "LABEL", "TAG", "DEVICE", "DEVICE_ID",
}


def _ap_coverage_analysis(ap_list, floor_pts, width_m, height_m):
    """
    Compare AP positions against the floor boundary.
    Returns coverage stats: floor_area_m2, coverage_radius_m per AP,
    estimated_coverage_pct, APs outside boundary, dead zones (corners far from any AP).
    """
    import math

    floor_area = abs(_shoelace_area([(p[0], p[1]) for p in floor_pts]))

    # Typical Wi-Fi indoor range ~10-15m radius, use 10m conservative
    AP_RADIUS_M = 10.0
    ap_circle_area = math.pi * AP_RADIUS_M ** 2

    # Check each AP: inside floor boundary?
    aps_inside = []
    aps_outside = []
    for ap in ap_list:
        x, y = ap["x_m"], ap["y_m"]
        poly = [(p[0], p[1]) for p in floor_pts]
        if point_in_polygon(x, y, poly):
            aps_inside.append(ap["ap_id"])
        else:
            aps_outside.append(ap["ap_id"])

    # Rough coverage estimate: union of circles vs floor area
    # Simple approximation: n APs × circle area, capped at floor area
    raw_coverage = len(ap_list) * ap_circle_area
    coverage_pct = min(100.0, round((raw_coverage / max(floor_area, 1)) * 100, 1))

    # Recommended AP count based on floor area (1 AP per 80m² indoors)
    recommended_aps = max(1, math.ceil(floor_area / 80))

    # Dead zone warning: if recommended > actual
    dead_zone_risk = recommended_aps > len(ap_list)

    return {
        "floor_area_m2": round(floor_area, 1),
        "ap_count": len(ap_list),
        "ap_radius_m": AP_RADIUS_M,
        "estimated_coverage_pct": coverage_pct,
        "aps_inside_boundary": aps_inside,
        "aps_outside_boundary": aps_outside,
        "recommended_ap_count": recommended_aps,
        "dead_zone_risk": dead_zone_risk,
        "coverage_rating": (
            "Excellent" if coverage_pct >= 90 else
            "Good"      if coverage_pct >= 70 else
            "Fair"      if coverage_pct >= 50 else
            "Poor"
        ),
    }


@app.post("/api/dxf/parse")
async def parse_dxf(
    file: UploadFile = File(...),
    area_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        import ezdxf
    except ImportError:
        raise HTTPException(500, "ezdxf not installed. Run: pip install ezdxf")

    result = await db.execute(select(Area).where(Area.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(404, "Area not found")

    contents = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        doc = ezdxf.readfile(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(400, f"DXF parse error: {e}")

    msp = doc.modelspace()
    warnings = []

    # ── 1. UNIT DETECTION ──────────────────────────────────────────
    unit_code = doc.header.get("$INSUNITS", 0)
    unit_factors = {
        0: 1.0,      # unknown → assume meters
        1: 0.0254,   # inches
        2: 0.3048,   # feet
        4: 0.001,    # millimeters (most common in architectural DXF)
        5: 0.01,     # centimeters
        6: 1.0,      # meters
        13: 0.01,    # centimeters (alternate code)
    }
    unit_factor = unit_factors.get(unit_code, 1.0)
    unit_name = {0:"unknown(m)",1:"inches",2:"feet",4:"mm",5:"cm",6:"m",13:"cm"}.get(unit_code,"unknown")

    if unit_code == 0:
        warnings.append("$INSUNITS not set in DXF header — assuming meters. If the floor plan looks wrong, the file may use different units.")

    # ── 2. COLLECT ALL LWPOLYLINES ─────────────────────────────────
    polylines_raw = []
    layers_found = set()

    for e in msp:
        layers_found.add(e.dxf.layer)
        if e.dxftype() != "LWPOLYLINE":
            continue
        try:
            pts = [(v[0] * unit_factor, v[1] * unit_factor) for v in e.get_points("xy")]
            if len(pts) < 2:
                continue
            # Use both flag bit and e.closed property for maximum compatibility
            is_closed = e.closed or bool(e.dxf.flags & 1)
            area_sqm = abs(_shoelace_area(pts))
            polylines_raw.append({
                "pts": pts,
                "is_closed": is_closed,
                "layer": e.dxf.layer,
                "area_sqm": area_sqm,
            })
        except Exception:
            continue

    if not polylines_raw:
        os.unlink(tmp_path)
        raise HTTPException(400, "No LWPOLYLINE entities found in DXF. The file may use POLYLINE or SPLINE entities which are not yet supported.")

    # ── 3. FLOOR BOUNDARY DETECTION ───────────────────────────────
    # Strategy: prefer a poly on a known boundary layer; fall back to largest closed
    boundary_layer_polys = [
        p for p in polylines_raw
        if p["layer"].upper() in {"FLOOR_BOUNDARY", "BOUNDARY", "OUTLINE", "PERIMETER", "A-FLOR-OTLN"}
        and p["is_closed"]
    ]
    closed_polys = [p for p in polylines_raw if p["is_closed"]]

    if boundary_layer_polys:
        floor_poly = max(boundary_layer_polys, key=lambda p: p["area_sqm"])
    elif closed_polys:
        floor_poly = max(closed_polys, key=lambda p: p["area_sqm"])
        warnings.append(f"No FLOOR_BOUNDARY layer found — using largest closed polyline on layer '{floor_poly['layer']}' as floor boundary.")
    else:
        # Last resort: use largest polyline even if open
        floor_poly = max(polylines_raw, key=lambda p: p["area_sqm"])
        warnings.append("No closed polylines found — using largest polyline as floor boundary. Results may be inaccurate.")

    # ── 4. NORMALIZE COORDINATES ──────────────────────────────────
    all_x = [v[0] for v in floor_poly["pts"]]
    all_y = [v[1] for v in floor_poly["pts"]]
    origin_x, origin_y = min(all_x), min(all_y)
    width_m  = max(all_x) - origin_x
    height_m = max(all_y) - origin_y

    if width_m < 0.1 or height_m < 0.1:
        os.unlink(tmp_path)
        raise HTTPException(400, f"Floor boundary too small ({width_m:.3f}m × {height_m:.3f}m). Check that $INSUNITS is set correctly in the DXF file (current: {unit_name}).")

    def normalize(pts):
        return [[round(v[0] - origin_x, 4), round(v[1] - origin_y, 4)] for v in pts]

    floor_pts = normalize(floor_poly["pts"])

    # ── 5. SVG COORDINATE SYSTEM ──────────────────────────────────
    vw, vh = 1000, 600
    scale    = min(vw / max(width_m, 0.01), vh / max(height_m, 0.01))
    offset_x = (vw - width_m * scale) / 2
    offset_y = (vh - height_m * scale) / 2

    def to_svg(x_m, y_m):
        return round(x_m * scale + offset_x, 1), round((height_m - y_m) * scale + offset_y, 1)

    def pts_to_svg_path(pts):
        parts = [f"{'M' if i == 0 else 'L'} {to_svg(x,y)[0]},{to_svg(x,y)[1]}" for i,(x,y) in enumerate(pts)]
        parts.append("Z")
        return " ".join(parts)

    floor_svg_path = pts_to_svg_path(floor_pts)

    # ── 6. POLYLINES — two lists ──────────────────────────────────
    # display_polylines : ALL polys (walls + furniture) for visual rendering
    # structural_polylines: walls/rooms only, for zone drawing in AreaSetupView
    floor_area_m2 = abs(_shoelace_area([(p[0], p[1]) for p in floor_pts]))
    min_room_area = max(1.0, floor_area_m2 * 0.005)

    display_polylines    = []   # everything — shown in FloorPlanView
    structural_polylines = []   # walls only — used for CAD zone selection

    for i, p in enumerate(polylines_raw):
        if p is floor_poly:
            continue
        norm_pts = normalize(p["pts"])
        layer_up = p["layer"].upper()

        # Classify layer
        is_structural = layer_up in _STRUCTURAL_LAYERS
        is_furniture  = layer_up in _EXCLUDE_LAYERS
        is_room_scale = p["area_sqm"] >= min_room_area

        poly_obj = {
            "id": f"poly_{i:03d}",
            "svg_path": pts_to_svg_path(norm_pts),
            "points_m": norm_pts,
            "is_closed": p["is_closed"],
            "layer": p["layer"],
            "area_sqm": round(p["area_sqm"], 2),
            # category drives frontend stroke style
            "category": (
                "structural" if is_structural else
                "furniture"  if is_furniture  else
                "detail"
            ),
        }

        # Display: include everything except annotation/dimension open lines
        # Skip open non-structural lines that are clearly just dimension text lines
        if p["is_closed"] or is_structural:
            display_polylines.append(poly_obj)
        elif not (layer_up in {"DIMENSIONS", "DIMENSION", "DIM", "DIMS", "TEXT", "TEXTS", "ANNO", "ANNOTATIONS", "TITLEBLOCK", "TITLE", "BORDER", "DEFPOINTS"}):
            display_polylines.append(poly_obj)

        # Structural: closed and room-scale only
        if p["is_closed"] and (is_structural or is_room_scale) and not is_furniture:
            structural_polylines.append(poly_obj)

    # Keep room_polys as alias for backwards compat
    room_polys = structural_polylines

    # ── 7. ACCESS POINT EXTRACTION ────────────────────────────────
    ap_entities = []

    for e in msp:
        if e.dxftype() != "INSERT":
            continue
        layer_up = e.dxf.layer.upper()
        if layer_up not in _AP_LAYERS:
            continue
        try:
            x = round(e.dxf.insert.x * unit_factor - origin_x, 3)
            y = round(e.dxf.insert.y * unit_factor - origin_y, 3)
        except Exception:
            continue

        # Try to get AP ID from attributes
        ap_id = None
        try:
            for attrib in e.attribs:
                if attrib.dxf.tag.upper() in _AP_ATTRIB_TAGS:
                    ap_id = attrib.dxf.text.strip()
                    break
        except Exception:
            pass
        if not ap_id:
            # Fallback: block name + index
            try:
                ap_id = f"{e.dxf.name}-{len(ap_entities)+1:02d}"
            except Exception:
                ap_id = f"AP-{len(ap_entities)+1:02d}"

        sx, sy = to_svg(x, y)
        ap_entities.append({
            "ap_id": ap_id, "x_m": x, "y_m": y,
            "x_svg": sx, "y_svg": sy, "layer": e.dxf.layer,
        })

    if not ap_entities:
        # Warn with all INSERT layers actually found, to help user fix layer name
        insert_layers = sorted({e.dxf.layer for e in msp if e.dxftype() == "INSERT"})
        warnings.append(
            f"No APs found. Expected INSERT entities on one of: {sorted(_AP_LAYERS)}. "
            f"INSERT layers in this file: {insert_layers or ['(none)']}."
        )

    # ── 8. AP COVERAGE ANALYSIS ───────────────────────────────────
    coverage = _ap_coverage_analysis(ap_entities, floor_pts, width_m, height_m)

    if coverage["aps_outside_boundary"]:
        warnings.append(f"APs outside floor boundary: {coverage['aps_outside_boundary']}. Check AP positions in the DXF.")
    if coverage["dead_zone_risk"]:
        warnings.append(
            f"Potential dead zones: {len(ap_entities)} APs for {coverage['floor_area_m2']}m² floor. "
            f"Recommended: {coverage['recommended_ap_count']} APs (1 per 80m²)."
        )

    # ── 9. SAVE TO DATABASE ───────────────────────────────────────
    await db.execute(delete(AccessPoint).where(AccessPoint.area_id == area_id))
    for ap in ap_entities:
        db.add(AccessPoint(
            id=str(uuid.uuid4()),
            area_id=area_id,
            ap_id=ap["ap_id"],
            x_m=ap["x_m"],
            y_m=ap["y_m"],
            layer=ap["layer"],
        ))

    # Stored format MUST match the upload-response shape exactly, so that
    # selecting an area from the sidebar renders identically to a fresh upload.
    parsed_data = {
        "floor_boundary": {
            "svg_path": floor_svg_path,
            "points_m": floor_pts,
            "width_m": round(width_m, 3),
            "height_m": round(height_m, 3),
            "viewbox": f"0 0 {vw} {vh}",
        },
        "polylines": display_polylines,            # ALL lines (walls + furniture)
        "structural_polylines": structural_polylines,  # walls only (zone drawing)
        "access_points": ap_entities,
        "layers": sorted(layers_found),
        "unit_code": unit_code,
        "unit_name": unit_name,
        "scale": scale,
        "offset_x": offset_x,
        "offset_y": offset_y,
        "viewbox": f"0 0 {vw} {vh}",
        "coverage": coverage,
    }

    area.width_m = round(width_m, 3)
    area.height_m = round(height_m, 3)
    area.svg_path_data = floor_svg_path
    area.dxf_parsed_data = parsed_data

    await db.commit()
    os.unlink(tmp_path)

    return {
        "area_id": area_id,
        "floor_boundary": {
            "svg_path": floor_svg_path,
            "points_m": floor_pts,
            "width_m": round(width_m, 3),
            "height_m": round(height_m, 3),
            "viewbox": f"0 0 {vw} {vh}",
        },
        "access_points": ap_entities,
        "polylines": display_polylines,
        "structural_polylines": structural_polylines,
        "layers": sorted(layers_found),
        "unit_name": unit_name,
        "coverage": coverage,
        "warnings": warnings,
    }


def _shoelace_area(pts):
    n = len(pts)
    area = 0
    for i in range(n):
        j = (i + 1) % n
        area += pts[i][0] * pts[j][1]
        area -= pts[j][0] * pts[i][1]
    return area / 2


# ── ZONES ─────────────────────────────────────────────────────────
@app.post("/api/zones")
async def create_zone(body: ZoneCreate, db: AsyncSession = Depends(get_db)):
    z = Zone(
        id=str(uuid.uuid4()),
        area_id=body.area_id,
        name=body.name,
        capacity=body.capacity,
        polygon_json=body.polygon_json,
        color=body.color,
        method=body.method,
    )
    db.add(z)
    await db.commit()
    await db.refresh(z)
    return _zone_dict(z)


@app.get("/api/zones")
async def list_zones(area_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Zone).order_by(Zone.created_at)
    if area_id:
        q = q.where(Zone.area_id == area_id)
    result = await db.execute(q)
    return [_zone_dict(z) for z in result.scalars().all()]


@app.put("/api/zones/{zid}")
async def update_zone(zid: str, body: ZoneUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Zone).where(Zone.id == zid))
    z = result.scalar_one_or_none()
    if not z:
        raise HTTPException(404, "Zone not found")
    if body.name is not None:
        z.name = body.name
    if body.capacity is not None:
        z.capacity = body.capacity
    if body.color is not None:
        z.color = body.color
    await db.commit()
    await db.refresh(z)
    return _zone_dict(z)


@app.delete("/api/zones/{zid}")
async def delete_zone(zid: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Zone).where(Zone.id == zid))
    z = result.scalar_one_or_none()
    if not z:
        raise HTTPException(404, "Zone not found")
    await db.delete(z)
    await db.commit()
    return {"deleted": zid}


def _zone_dict(z):
    return {
        "id": z.id, "area_id": z.area_id, "name": z.name,
        "capacity": z.capacity, "polygon_json": z.polygon_json,
        "color": z.color, "method": z.method,
        "created_at": str(z.created_at),
    }


def _ap_dict(p):
    return {"id": p.id, "area_id": p.area_id, "ap_id": p.ap_id,
            "x_m": p.x_m, "y_m": p.y_m, "layer": p.layer}



# ── LIVE WI-FI STREAM (Phase 2) ───────────────────────────────────
# A real Wi-Fi controller (or the simulator) POSTs RSSI batches to
# /api/stream/ingest. We triangulate, store a single "live" snapshot per
# area (filename "__live__<area>"), and the frontend polls /api/stream/live.

LIVE_PREFIX = "__live__"
LIVE_STALE_SECONDS = 60  # data older than this is considered "not live"


class StreamReading(BaseModel):
    area_name: str
    mac_address: str
    ap_id: str
    ap_x: float
    ap_y: float
    rssi: float


class StreamBatch(BaseModel):
    source: Optional[str] = "unknown"
    batch_timestamp: Optional[str] = None
    readings: List[StreamReading]


def _seconds_ago(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0, int((datetime.now(timezone.utc) - dt).total_seconds()))


HISTORY_RETENTION_DAYS = 90  # rolling ~3 months
_last_purge_at = None         # module-level throttle for opportunistic cleanup


async def _record_history(db, area, zones, located, now):
    """Upsert this snapshot's per-zone occupancy into the current hour bucket.
    Lightweight: a handful of indexed upserts per push — does not block live state."""
    hour_bucket = now.replace(minute=0, second=0, microsecond=0)

    # Count located devices per zone
    zone_counts = {}
    for d in located:
        if d["zone_id"]:
            zone_counts[d["zone_id"]] = zone_counts.get(d["zone_id"], 0) + 1

    for z in zones:
        count = zone_counts.get(z.id, 0)
        cap = max(z.capacity or 1, 1)
        pct = round(count / cap * 100, 2)
        status = get_zone_status(pct)
        q = "quiet_n" if status == "QUIET" else "moderate_n" if status == "MODERATE" \
            else "busy_n" if status == "BUSY" else "critical_n"

        row = {
            "id": str(uuid.uuid4()),
            "area_id": area.id, "area_name": area.name,
            "zone_id": z.id, "zone_name": z.name, "capacity": z.capacity or 0,
            "hour_bucket": hour_bucket,
            "sample_count": 1, "sum_pct": pct, "sum_devices": count,
            "peak_pct": pct, "peak_devices": count,
            "quiet_n": 1 if q == "quiet_n" else 0,
            "moderate_n": 1 if q == "moderate_n" else 0,
            "busy_n": 1 if q == "busy_n" else 0,
            "critical_n": 1 if q == "critical_n" else 0,
        }
        stmt = pg_insert(ZoneHourlyStat).values(**row)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_zone_hour",
            set_={
                "sample_count": ZoneHourlyStat.sample_count + 1,
                "sum_pct": ZoneHourlyStat.sum_pct + pct,
                "sum_devices": ZoneHourlyStat.sum_devices + count,
                "peak_pct": func.greatest(ZoneHourlyStat.peak_pct, pct),
                "peak_devices": func.greatest(ZoneHourlyStat.peak_devices, count),
                "quiet_n": ZoneHourlyStat.quiet_n + row["quiet_n"],
                "moderate_n": ZoneHourlyStat.moderate_n + row["moderate_n"],
                "busy_n": ZoneHourlyStat.busy_n + row["busy_n"],
                "critical_n": ZoneHourlyStat.critical_n + row["critical_n"],
                "capacity": z.capacity or 0,
                "zone_name": z.name,
                "area_name": area.name,
                "updated_at": now,
            },
        )
        await db.execute(stmt)


async def _purge_old_history(db, force=False):
    """Delete history older than the retention window. Throttled to once/hour
    unless forced (e.g. on startup)."""
    global _last_purge_at
    now = datetime.now(timezone.utc)
    if not force and _last_purge_at and (now - _last_purge_at).total_seconds() < 3600:
        return 0
    cutoff = now - timedelta(days=HISTORY_RETENTION_DAYS)
    result = await db.execute(
        delete(ZoneHourlyStat).where(ZoneHourlyStat.hour_bucket < cutoff)
    )
    _last_purge_at = now
    return result.rowcount or 0


@app.post("/api/stream/ingest")
async def stream_ingest(batch: StreamBatch, db: AsyncSession = Depends(get_db)):
    if not batch.readings:
        raise HTTPException(400, "Empty batch: no readings provided")

    # Group readings by area name
    by_area = {}
    for r in batch.readings:
        by_area.setdefault(r.area_name, []).append(r)

    now = datetime.now(timezone.utc)
    results = []
    unmatched_areas = []

    for area_name, readings in by_area.items():
        # Match area by exact name (case-sensitive, like CSV flow)
        res = await db.execute(select(Area).where(Area.name == area_name))
        area = res.scalar_one_or_none()
        if not area:
            unmatched_areas.append(area_name)
            continue

        floor_w = area.width_m or 100
        floor_h = area.height_m or 60

        zones_res = await db.execute(select(Zone).where(Zone.area_id == area.id))
        zones = zones_res.scalars().all()

        def find_zone(x, y):
            for z in zones:
                if z.polygon_json and point_in_polygon(x, y, z.polygon_json):
                    return z.id
            return None

        # Triangulate per device (group readings by mac)
        by_mac = {}
        for r in readings:
            by_mac.setdefault(r.mac_address, []).append(r)

        located = []
        for mac, rows in by_mac.items():
            ap_pos = [(rw.ap_x, rw.ap_y) for rw in rows]
            distances = [rssi_to_distance(rw.rssi) for rw in rows]
            est_x, est_y = trilaterate(ap_pos, distances, floor_w, floor_h)
            located.append({
                "mac_hash": hashlib.sha256(mac.encode()).hexdigest()[:16],
                "est_x": est_x, "est_y": est_y,
                "zone_id": find_zone(est_x, est_y),
            })

        # Replace the single live snapshot for this area
        live_name = f"{LIVE_PREFIX}{area_name}"
        old = await db.execute(
            select(RssiUpload).where(
                RssiUpload.area_id == area.id, RssiUpload.filename == live_name
            )
        )
        for u in old.scalars().all():
            await db.delete(u)
        await db.flush()

        upload = RssiUpload(
            id=str(uuid.uuid4()), area_id=area.id,
            filename=live_name, record_count=len(readings),
        )
        db.add(upload)
        await db.flush()

        for d in located:
            db.add(DevicePosition(
                id=str(uuid.uuid4()), upload_id=upload.id,
                mac_hash=d["mac_hash"], timestamp=now,
                est_x=d["est_x"], est_y=d["est_y"],
                zone_id=d["zone_id"], area_name=area_name,
            ))

        # Log this snapshot into rolling hourly history
        await _record_history(db, area, zones, located, now)

        results.append({
            "area_name": area_name,
            "devices_located": len(located),
            "readings": len(readings),
        })

    # Opportunistic retention cleanup (throttled to once/hour, non-blocking-ish)
    try:
        await _purge_old_history(db)
    except Exception:
        pass

    await db.commit()

    return {
        "status": "ok",
        "received_at": now.isoformat(),
        "source": batch.source,
        "areas_processed": results,
        "unmatched_areas": unmatched_areas,
    }


async def _live_snapshot(area, db):
    """Build the live occupancy snapshot for one area (or None if no live data)."""
    live_name = f"{LIVE_PREFIX}{area.name}"
    res = await db.execute(
        select(RssiUpload).where(
            RssiUpload.area_id == area.id, RssiUpload.filename == live_name
        ).order_by(RssiUpload.uploaded_at.desc())
    )
    upload = res.scalars().first()  # tolerate duplicates: newest wins
    if not upload:
        return None

    zones_res = await db.execute(select(Zone).where(Zone.area_id == area.id))
    zones = {z.id: z for z in zones_res.scalars().all()}

    devs_res = await db.execute(
        select(DevicePosition).where(DevicePosition.upload_id == upload.id)
    )
    devs = devs_res.scalars().all()

    width_m = area.width_m or 100
    height_m = area.height_m or 60

    device_list, zone_counts = [], {}
    for d in devs:
        sx, sy = meters_to_svg(d.est_x, d.est_y, width_m, height_m)
        zname = zones[d.zone_id].name if d.zone_id in zones else None
        if d.zone_id in zones:
            zone_counts[d.zone_id] = zone_counts.get(d.zone_id, 0) + 1
        device_list.append({
            "mac_hash": d.mac_hash, "est_x": d.est_x, "est_y": d.est_y,
            "x_svg": sx, "y_svg": sy, "zone_id": d.zone_id, "zone_name": zname,
        })

    out_zones = []
    for zid, z in zones.items():
        count = zone_counts.get(zid, 0)
        pct = round(count / max(z.capacity, 1) * 100, 1)
        out_zones.append({
            "zone_id": zid, "zone_name": z.name, "devices": count,
            "capacity": z.capacity, "occupancy_pct": pct,
            "status": get_zone_status(pct), "color": z.color,
        })
    out_zones.sort(key=lambda x: -x["occupancy_pct"])

    secs = _seconds_ago(upload.uploaded_at)
    return {
        "area_id": area.id,
        "area_name": area.name,
        "last_updated": str(upload.uploaded_at),
        "seconds_ago": secs,
        "is_live": secs is not None and secs <= LIVE_STALE_SECONDS,
        "total_devices": len(device_list),
        "most_crowded": out_zones[0]["zone_name"] if out_zones and out_zones[0]["devices"] else None,
        "devices": device_list,
        "zones": out_zones,
    }


@app.get("/api/stream/live")
async def stream_live(area_name: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Area).where(Area.name == area_name))
    area = res.scalar_one_or_none()
    if not area:
        raise HTTPException(404, f"Area '{area_name}' not found")
    snap = await _live_snapshot(area, db)
    if snap is None:
        return {
            "area_name": area_name, "area_id": area.id,
            "is_live": False, "seconds_ago": None, "last_updated": None,
            "total_devices": 0, "most_crowded": None,
            "devices": [], "zones": [],
            "message": "Waiting for live data...",
        }
    return snap


@app.get("/api/stream/status")
async def stream_status(db: AsyncSession = Depends(get_db)):
    areas_res = await db.execute(select(Area))
    areas = areas_res.scalars().all()
    out = []
    for area in areas:
        snap = await _live_snapshot(area, db)
        if snap is None:
            out.append({
                "area_name": area.name, "area_id": area.id,
                "is_live": False, "seconds_ago": None,
                "total_devices": 0, "most_crowded": None,
            })
        else:
            out.append({
                "area_name": snap["area_name"], "area_id": snap["area_id"],
                "is_live": snap["is_live"], "seconds_ago": snap["seconds_ago"],
                "last_updated": snap["last_updated"],
                "total_devices": snap["total_devices"],
                "most_crowded": snap["most_crowded"],
            })
    return {"server_time": datetime.now(timezone.utc).isoformat(), "areas": out}


# ── HISTORICAL ANALYTICS (Phase 2.1) ──────────────────────────────
# All numbers below are derived from the rolling zone_hourly_stats table.

DOW_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _parse_dt(s):
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


@app.get("/api/analytics/meta")
async def analytics_meta(db: AsyncSession = Depends(get_db)):
    """Filter options (full Building → Floor → Area → Zone hierarchy) + the
    date range for which history exists."""
    cov = await db.execute(
        select(func.min(ZoneHourlyStat.hour_bucket), func.max(ZoneHourlyStat.hour_bucket),
               func.count(ZoneHourlyStat.id))
    )
    earliest, latest, total = cov.first()

    buildings_res = await db.execute(select(Building).order_by(Building.created_at))
    buildings = []
    for b in buildings_res.scalars().all():
        floors_res = await db.execute(
            select(Floor).where(Floor.building_id == b.id).order_by(Floor.level_number)
        )
        floors = []
        for f in floors_res.scalars().all():
            areas_res = await db.execute(
                select(Area).where(Area.floor_id == f.id).order_by(Area.created_at)
            )
            areas = []
            for a in areas_res.scalars().all():
                zres = await db.execute(
                    select(Zone).where(Zone.area_id == a.id).order_by(Zone.created_at)
                )
                areas.append({
                    "area_id": a.id, "area_name": a.name,
                    "zones": [{"zone_id": z.id, "zone_name": z.name, "capacity": z.capacity}
                              for z in zres.scalars().all()],
                })
            floors.append({"floor_id": f.id, "floor_name": f.name,
                           "level_number": f.level_number, "areas": areas})
        buildings.append({"building_id": b.id, "building_name": b.name, "floors": floors})

    return {
        "coverage": {
            "earliest": str(earliest) if earliest else None,
            "latest": str(latest) if latest else None,
            "total_rows": total or 0,
        },
        "buildings": buildings,
        "retention_days": HISTORY_RETENTION_DAYS,
    }


async def _window_avg(db, base_filters, start, end):
    """Sample-weighted average occupancy % over a time window (or None)."""
    q = select(func.sum(ZoneHourlyStat.sum_pct), func.sum(ZoneHourlyStat.sample_count)).where(
        *base_filters,
        ZoneHourlyStat.hour_bucket >= start,
        ZoneHourlyStat.hour_bucket < end,
    )
    r = (await db.execute(q)).first()
    sum_pct, n = (r[0] or 0), (r[1] or 0)
    if not n:
        return None
    return round(sum_pct / n, 1)


@app.get("/api/analytics/summary")
async def analytics_summary(
    area_ids: Optional[str] = None,   # comma-separated; omit = all areas
    zone_id: Optional[str] = None,
    start: Optional[str] = None,      # ISO datetime (UTC)
    end: Optional[str] = None,
    dow: Optional[int] = None,        # 0=Mon … 6=Sun (local), filter
    hour_start: Optional[int] = None, # local hour 0-23 inclusive
    hour_end: Optional[int] = None,   # local hour 0-23 inclusive
    tz_offset: int = 0,               # minutes, from JS getTimezoneOffset()
    group_by: str = "zone",           # ranking level: zone | area | floor
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    start_dt = _parse_dt(start) or (now - timedelta(days=7))
    end_dt = _parse_dt(end) or now

    base_filters = []
    area_id_list = [a for a in (area_ids.split(",") if area_ids else []) if a]
    if area_id_list:
        base_filters.append(ZoneHourlyStat.area_id.in_(area_id_list))
    if zone_id:
        base_filters.append(ZoneHourlyStat.zone_id == zone_id)

    # Fetch the rows in range matching the area/zone filters
    rows = (await db.execute(
        select(ZoneHourlyStat).where(
            *base_filters,
            ZoneHourlyStat.hour_bucket >= start_dt,
            ZoneHourlyStat.hour_bucket <= end_dt,
        )
    )).scalars().all()

    def local(dt):
        return dt - timedelta(minutes=tz_offset)

    # Apply local-time filters (day-of-week, hour-of-day)
    matched = []
    for r in rows:
        ldt = local(r.hour_bucket)
        if dow is not None and ldt.weekday() != dow:
            continue
        if hour_start is not None and hour_end is not None:
            h = ldt.hour
            ok = (hour_start <= h <= hour_end) if hour_start <= hour_end else (h >= hour_start or h <= hour_end)
            if not ok:
                continue
        matched.append((r, ldt))

    if not matched:
        return {
            "has_data": False,
            "period": {"start": str(start_dt), "end": str(end_dt)},
            "message": "No data available yet for this selection. Data is still accumulating.",
        }

    # Helper to sample-weighted-average a list of (sum_pct, n)
    def wavg(pairs):
        s = sum(p for p, _ in pairs)
        n = sum(c for _, c in pairs)
        return round(s / n, 1) if n else 0.0

    total_n = sum(r.sample_count for r, _ in matched)
    total_sum_pct = sum(r.sum_pct for r, _ in matched)
    overall_avg = round(total_sum_pct / total_n, 1) if total_n else 0.0
    overall_peak = round(max((r.peak_pct for r, _ in matched), default=0.0), 1)

    span_days = (end_dt - start_dt).total_seconds() / 86400
    granularity = "hour" if span_days <= 2 else "day"

    # ── Trend over time ──
    trend_acc = {}
    for r, ldt in matched:
        key = ldt.strftime("%Y-%m-%d %H:00") if granularity == "hour" else ldt.strftime("%Y-%m-%d")
        a = trend_acc.setdefault(key, {"sum_pct": 0.0, "n": 0, "peak": 0.0})
        a["sum_pct"] += r.sum_pct
        a["n"] += r.sample_count
        a["peak"] = max(a["peak"], r.peak_pct)
    trend = [{"bucket": k, "avg_pct": round(v["sum_pct"] / v["n"], 1) if v["n"] else 0,
              "peak_pct": round(v["peak"], 1)} for k, v in sorted(trend_acc.items())]

    # ── Peak hours (avg by local hour-of-day) ──
    hour_acc = {}
    for r, ldt in matched:
        a = hour_acc.setdefault(ldt.hour, [0.0, 0])
        a[0] += r.sum_pct; a[1] += r.sample_count
    peak_hours = [{"hour": h, "avg_pct": round(v[0] / v[1], 1) if v[1] else 0}
                  for h, v in sorted(hour_acc.items())]

    # ── Peak days (avg by local day-of-week) ──
    dow_acc = {}
    for r, ldt in matched:
        a = dow_acc.setdefault(ldt.weekday(), [0.0, 0])
        a[0] += r.sum_pct; a[1] += r.sample_count
    peak_days = [{"dow": d, "day": DOW_NAMES[d], "avg_pct": round(v[0] / v[1], 1) if v[1] else 0}
                 for d, v in sorted(dow_acc.items())]

    # ── Ranking (level depends on group_by: zone | area | floor) ──
    level = group_by if group_by in ("zone", "area", "floor") else "zone"

    # Build a mapping to floor names when ranking by floor
    area_to_floor = {}
    floor_names = {}
    if level == "floor":
        matched_area_ids = list({r.area_id for r, _ in matched})
        if matched_area_ids:
            ares = (await db.execute(select(Area).where(Area.id.in_(matched_area_ids)))).scalars().all()
            for a in ares:
                area_to_floor[a.id] = a.floor_id
            fids = list({fid for fid in area_to_floor.values() if fid})
            if fids:
                frs = (await db.execute(select(Floor).where(Floor.id.in_(fids)))).scalars().all()
                for f in frs:
                    floor_names[f.id] = f.name

    def group_key_name(r):
        if level == "zone":
            return r.zone_id, r.zone_name
        if level == "area":
            return r.area_id, r.area_name
        fid = area_to_floor.get(r.area_id)
        return fid, floor_names.get(fid, "Unknown floor")

    rank_acc = {}
    for r, _ in matched:
        k, name = group_key_name(r)
        if k is None:
            continue
        a = rank_acc.setdefault(k, {"name": name, "sum_pct": 0.0, "n": 0, "peak": 0.0})
        a["sum_pct"] += r.sum_pct; a["n"] += r.sample_count; a["peak"] = max(a["peak"], r.peak_pct)
    ranking_items = sorted(
        [{"id": k, "name": v["name"],
          "avg_pct": round(v["sum_pct"] / v["n"], 1) if v["n"] else 0,
          "peak_pct": round(v["peak"], 1)} for k, v in rank_acc.items()],
        key=lambda x: -x["avg_pct"],
    )
    ranking = {"level": level, "items": ranking_items}

    # ── Heatmap (avg by dow × hour) ──
    heat_acc = {}
    for r, ldt in matched:
        key = (ldt.weekday(), ldt.hour)
        a = heat_acc.setdefault(key, [0.0, 0])
        a[0] += r.sum_pct; a[1] += r.sample_count
    heatmap = [{"dow": d, "hour": h, "avg_pct": round(v[0] / v[1], 1) if v[1] else 0}
               for (d, h), v in heat_acc.items()]

    # ── Utilization (% of time in each status) ──
    util = {"quiet": 0, "moderate": 0, "busy": 0, "critical": 0}
    for r, _ in matched:
        util["quiet"] += r.quiet_n; util["moderate"] += r.moderate_n
        util["busy"] += r.busy_n; util["critical"] += r.critical_n
    util_total = sum(util.values()) or 1
    utilization = {k: round(v / util_total * 100, 1) for k, v in util.items()}

    # ── Avg vs peak per area ──
    area_acc = {}
    for r, _ in matched:
        a = area_acc.setdefault(r.area_id, {"name": r.area_name, "sum_pct": 0.0, "n": 0, "peak": 0.0})
        a["sum_pct"] += r.sum_pct; a["n"] += r.sample_count; a["peak"] = max(a["peak"], r.peak_pct)
    area_avg_peak = [{"area_id": k, "area_name": v["name"],
                      "avg_pct": round(v["sum_pct"] / v["n"], 1) if v["n"] else 0,
                      "peak_pct": round(v["peak"], 1)} for k, v in area_acc.items()]

    # ── Trend comparisons (rolling windows, real % change) ──
    def pct_change(cur, prev):
        if cur is None or prev is None or prev == 0:
            return None
        return round((cur - prev) / prev * 100, 1)

    wk_cur = await _window_avg(db, base_filters, now - timedelta(days=7), now)
    wk_prev = await _window_avg(db, base_filters, now - timedelta(days=14), now - timedelta(days=7))
    mo_cur = await _window_avg(db, base_filters, now - timedelta(days=30), now)
    mo_prev = await _window_avg(db, base_filters, now - timedelta(days=60), now - timedelta(days=30))

    return {
        "has_data": True,
        "period": {"start": str(start_dt), "end": str(end_dt), "granularity": granularity},
        "totals": {
            "avg_pct": overall_avg, "peak_pct": overall_peak,
            "samples": total_n,
            "first_sample": str(min(r.hour_bucket for r, _ in matched)),
            "last_sample": str(max(r.hour_bucket for r, _ in matched)),
        },
        "trend": trend,
        "peak_hours": peak_hours,
        "peak_days": peak_days,
        "ranking": ranking,
        "heatmap": heatmap,
        "utilization": utilization,
        "area_avg_peak": area_avg_peak,
        "comparisons": {
            "week": {"current": wk_cur, "previous": wk_prev, "pct_change": pct_change(wk_cur, wk_prev)},
            "month": {"current": mo_cur, "previous": mo_prev, "pct_change": pct_change(mo_cur, mo_prev)},
        },
    }
