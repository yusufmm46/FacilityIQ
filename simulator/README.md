# FacilityIQ Wi-Fi Simulator

A standalone mini-server that mimics a real Wi-Fi controller (Cisco/Aruba).
It generates realistic RSSI data for your areas and pushes it to FacilityIQ's
live-stream ingest endpoint every 30 seconds.

It is **completely independent** of FacilityIQ — they communicate only over
REST. In production you replace this simulator with a real controller pointed
at the same `/api/stream/ingest` endpoint; no FacilityIQ code changes needed.

## What it does

1. On first use, fetches your area layout (access points + zones) from FacilityIQ.
2. Places synthetic people inside zones, varying the crowd by time of day
   (morning arrival, lunch surge in the cafeteria, end-of-day departure).
3. Back-computes the RSSI each access point would observe and POSTs the batch
   to FacilityIQ, which triangulates positions exactly as with real hardware.

## Setup

```bash
cd simulator
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

cp .env.example .env           # then edit if needed
```

Edit `.env`:

```
FACILITYIQ_API_URL=http://127.0.0.1:8000     # or https://facilityiq.onrender.com
PUSH_INTERVAL_SECONDS=30
```

## Run

```bash
uvicorn main:app --port 8100
```

The simulator runs at `http://127.0.0.1:8100`.

> Prerequisite: FacilityIQ must already have at least one area with a parsed
> DXF (access points). The simulator reads that layout to generate data.

## Endpoints

| Method | Path       | Description                                         |
|--------|------------|-----------------------------------------------------|
| GET    | `/status`  | Health + current people counts per area             |
| POST   | `/start`   | Begin pushing data every interval (pushes once now) |
| POST   | `/stop`    | Stop pushing                                        |
| GET    | `/preview` | Return one sample batch **without** sending it      |

### Quick test

```bash
curl http://127.0.0.1:8100/preview          # see sample data
curl -X POST http://127.0.0.1:8100/start    # start streaming
curl http://127.0.0.1:8100/status           # watch counts
curl -X POST http://127.0.0.1:8100/stop     # stop
```

Then open FacilityIQ — the floor plan updates automatically every 30 seconds.

## Deploying separately (Render / Railway)

Deploy as its own free web service:

- **Root directory:** `simulator`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Env vars:** `FACILITYIQ_API_URL=https://facilityiq.onrender.com`, `PUSH_INTERVAL_SECONDS=30`

After it deploys, call its `/start` endpoint once to begin streaming.

## Replacing with a real Wi-Fi controller

A real controller just needs to POST batches to FacilityIQ:

```
POST {FACILITYIQ_API_URL}/api/stream/ingest
{
  "source": "aruba-controller-1",
  "batch_timestamp": "2026-06-28T12:00:00Z",
  "readings": [
    {"area_name": "Cafeteria", "mac_address": "AA:BB:CC:DD:EE:FF",
     "ap_id": "AP-CAF-01", "ap_x": 5.0, "ap_y": 4.0, "rssi": -55}
  ]
}
```

`area_name` must match the area name in FacilityIQ exactly (case-sensitive).
