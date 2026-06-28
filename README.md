# FacilityIQ — Smart Occupancy Intelligence Platform

FacilityIQ is a Wi-Fi RSSI–based occupancy intelligence SaaS platform. It ingests
RSSI scan data, triangulates device positions, maps them onto CAD floor plans, and
visualizes live occupancy across buildings, floors, and zones.

![Status](https://img.shields.io/badge/status-active-success)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/frontend-React%2019-61dafb)
![Database](https://img.shields.io/badge/database-Supabase-3ecf8e)

---

## Features

- **CAD floor-plan parsing** — upload `.dxf` files; the backend (ezdxf) detects units,
  extracts the floor boundary, access points, walls, and furniture, and generates SVG.
- **RSSI triangulation** — converts signal strength to distance and trilaterates each
  device's `(x, y)` position using weighted least-squares.
- **Live occupancy visualization** — three floor-plan modes:
  - **Heatmap** — zones colored by occupancy tier (0–25 / 25–50 / 50–75 / 75–100%)
  - **Devices** — individual device dots over the CAD layout
  - **Flow** — traffic-flow arrows from busiest to quietest zones
- **AP coverage analysis** — estimated coverage %, recommended AP count, and
  out-of-bounds AP warnings.
- **Zone drawing** — freehand polygon drawing or CAD-polyline selection.
- **Analytics** — hourly trends, zone popularity, peak-hour detection (Recharts).
- **Full hierarchy** — organisations → buildings → floors → areas, persisted in Supabase.

---

## Tech Stack

| Layer     | Technology                                                        |
|-----------|-------------------------------------------------------------------|
| Frontend  | React 19, Tailwind CSS v3, lucide-react, axios, recharts, react-dropzone |
| Backend   | FastAPI (async), SQLAlchemy + asyncpg, ezdxf, scipy, pandas       |
| Database  | Supabase (hosted PostgreSQL)                                      |

---

## Project Structure

```
occupancy-app/
├── backend/          FastAPI app
│   ├── main.py           API endpoints, DXF parsing, triangulation
│   ├── database.py       Async Supabase/SQLAlchemy connection
│   ├── models.py         ORM models (8 tables)
│   ├── requirements.txt
│   └── .env.example      Copy to .env and add your credentials
├── frontend/         React app (create-react-app)
│   └── src/
│       ├── App.js
│       ├── context/AppContext.js   Global state + API calls
│       └── components/             8 views + Sidebar/Header
├── core/             DXF/CSV generators + sample CAD files
└── reference/        Original UI design reference (read-only)
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A free [Supabase](https://supabase.com) project

### 1. Configure Supabase credentials

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with values from your Supabase project
(Settings → API and Settings → Database):

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_DB_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
```

Tables are created automatically on first startup via SQLAlchemy `create_all()`.

### 2. Run the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at `http://127.0.0.1:8000` (docs at `/docs`).

### 3. Run the frontend

```bash
cd frontend
npm install
npm start
```

App runs at `http://localhost:3000`.

---

## Usage

1. **Sign in** (any email — demo auth).
2. **Buildings** → add a building → floor → area.
   > The area name must exactly match the `area_name` column in your CSV (case-sensitive).
3. **Area Setup** → upload a `.dxf` (try `core/cad/cafeteria.dxf`) → review parse results
   and AP coverage → draw zones.
4. **Data Sync** → upload an RSSI CSV (try `core/sample_data_multi_area.csv`).
5. **Floor Plan** → switch between Heatmap / Devices / Flow and step through timestamps.
6. **Analytics / Dashboard** → view trends and KPIs.

### CSV format

Required columns:

```
timestamp, mac_address, ap_id, ap_x, ap_y, rssi, area_name
```

---

## API Endpoints

| Method | Path                          | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/health`                 | Health + DB connectivity             |
| POST   | `/api/organisations`          | Create organisation                  |
| GET/POST/PUT/DELETE | `/api/buildings` | Building CRUD                        |
| GET/POST/PUT/DELETE | `/api/floors`    | Floor CRUD                           |
| GET/POST/PUT/DELETE | `/api/areas`     | Area CRUD                            |
| POST   | `/api/dxf/parse`              | Parse DXF, extract geometry + APs    |
| GET/POST/PUT/DELETE | `/api/zones`     | Zone CRUD                            |
| POST   | `/api/upload`                 | Upload RSSI CSV, run triangulation   |
| GET    | `/api/occupancy`              | Zone occupancy for a timestamp       |
| GET    | `/api/devices`                | Device positions for a timestamp     |
| GET    | `/api/timestamps`             | Available timestamps for an area     |
| GET    | `/api/analytics`              | Trends, zone popularity, peak hour   |

---

## CAD File Support

- **Supported:** `.dxf` (AutoCAD DXF). Units auto-detected from `$INSUNITS`
  (mm, cm, m, inches, feet).
- **Not supported:** `.dwg` — convert to `.dxf` first (AutoCAD, FreeCAD, or the
  free ODA File Converter).

Access points should be `INSERT` blocks on a layer named `AP` (or similar) with an
`APID` attribute. The floor boundary is the largest closed polyline, ideally on a
`FLOOR_BOUNDARY` layer.

---

## License

Private project. All rights reserved.
