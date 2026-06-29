"""
FacilityIQ Wi-Fi Simulator — a standalone mini server that mimics a real
Wi-Fi controller (Cisco/Aruba). It pushes RSSI batches to FacilityIQ's
/api/stream/ingest endpoint every PUSH_INTERVAL_SECONDS.

This is completely independent of FacilityIQ — they only talk over REST.
In production, replace this with a real controller pointed at the same
ingest endpoint; no FacilityIQ code changes are needed.

Endpoints:
  GET  /status   — simulator health + current people counts per area
  POST /start    — begin pushing data to FacilityIQ
  POST /stop     — stop pushing
  GET  /preview  — return one sample batch WITHOUT sending it
"""
import os
import asyncio
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from generator import Generator

load_dotenv()

FACILITYIQ_API_URL = os.getenv("FACILITYIQ_API_URL", "http://127.0.0.1:8000").rstrip("/")
PUSH_INTERVAL_SECONDS = int(os.getenv("PUSH_INTERVAL_SECONDS", "30"))

app = FastAPI(title="FacilityIQ Wi-Fi Simulator", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


class State:
    generator: Generator | None = None
    running: bool = False
    task: asyncio.Task | None = None
    last_push_at: str | None = None
    last_summary: dict = {}
    last_error: str | None = None
    pushes_sent: int = 0


state = State()


# ── Layout fetching ───────────────────────────────────────────────
async def fetch_layout():
    """Pull all areas (with APs + zones) from FacilityIQ to drive generation."""
    async with httpx.AsyncClient(timeout=90) as client:
        buildings = (await client.get(f"{FACILITYIQ_API_URL}/api/buildings")).json()
        areas = []
        for b in buildings:
            floors = (await client.get(
                f"{FACILITYIQ_API_URL}/api/floors", params={"building_id": b["id"]}
            )).json()
            for f in floors:
                fa = (await client.get(
                    f"{FACILITYIQ_API_URL}/api/areas", params={"floor_id": f["id"]}
                )).json()
                for a in fa:
                    aps = a.get("access_points") or []
                    if not aps and a.get("dxf_parsed_data"):
                        aps = a["dxf_parsed_data"].get("access_points") or []
                    areas.append({
                        "name": a["name"],
                        "width_m": a.get("width_m") or 100,
                        "height_m": a.get("height_m") or 60,
                        "access_points": [
                            {"ap_id": ap["ap_id"], "x_m": ap["x_m"], "y_m": ap["y_m"]}
                            for ap in aps
                        ],
                        "zones": a.get("zones") or [],
                    })
        return areas


async def ensure_generator():
    if state.generator is None:
        areas = await fetch_layout()
        usable = [a for a in areas if a["access_points"]]
        if not usable:
            raise HTTPException(
                503,
                "No areas with access points found in FacilityIQ. "
                "Upload a DXF for at least one area first.",
            )
        state.generator = Generator(usable)
    return state.generator


# ── Push loop ─────────────────────────────────────────────────────
async def push_once():
    gen = await ensure_generator()
    payload, summary = gen.generate_batch()
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            f"{FACILITYIQ_API_URL}/api/stream/ingest", json=payload
        )
        resp.raise_for_status()
    state.last_push_at = datetime.now(timezone.utc).isoformat()
    state.last_summary = summary
    state.pushes_sent += 1
    state.last_error = None
    return summary


async def push_loop():
    # Pushes immediately, then every interval. No separate manual push needed.
    while state.running:
        try:
            await push_once()
        except Exception as e:  # keep looping on transient errors
            state.last_error = str(e)
        await asyncio.sleep(PUSH_INTERVAL_SECONDS)


# ── Endpoints ─────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service": "FacilityIQ Wi-Fi Simulator", "target": FACILITYIQ_API_URL}


@app.get("/status")
async def status():
    areas = state.generator.area_names if state.generator else []
    return {
        "running": state.running,
        "target": FACILITYIQ_API_URL,
        "push_interval_seconds": PUSH_INTERVAL_SECONDS,
        "pushes_sent": state.pushes_sent,
        "last_push_at": state.last_push_at,
        "last_error": state.last_error,
        "areas": areas,
        "current_people": state.last_summary,
    }


@app.post("/start")
async def start():
    if state.running:
        return {"status": "already running"}
    await ensure_generator()  # validates layout before starting
    # Fire one push now (so the UI updates immediately), then run the loop.
    summary = await push_once()
    state.running = True
    state.task = asyncio.create_task(push_loop())
    return {"status": "started", "interval_seconds": PUSH_INTERVAL_SECONDS,
            "first_push": summary}


@app.post("/stop")
async def stop():
    state.running = False
    if state.task:
        state.task.cancel()
        state.task = None
    return {"status": "stopped", "pushes_sent": state.pushes_sent}


@app.get("/preview")
async def preview():
    """Return one sample batch WITHOUT sending it to FacilityIQ."""
    gen = await ensure_generator()
    payload, summary = gen.generate_batch()
    return {
        "people_per_area": summary,
        "total_readings": len(payload["readings"]),
        "sample_readings": payload["readings"][:10],
        "batch_timestamp": payload["batch_timestamp"],
    }
