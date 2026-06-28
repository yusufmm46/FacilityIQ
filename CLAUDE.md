# FacilityIQ — Claude Code Instructions

## Project Overview
FacilityIQ is a Smart Occupancy Intelligence SaaS platform.
Wi-Fi RSSI based occupancy detection and floor plan visualization.

## Design Reference
All files in `reference/src/components/` are the UI design reference
from Google AI Studio. Read these first before building any component.
Convert from TypeScript to plain React JS when rebuilding.

## Key Rules
1. `area_name` in CSV must exactly match area name in system
2. Use `localStorage` for buildings, areas, zones persistence
3. All components in plain React JS (no TypeScript)
4. Use existing packages: axios, recharts, react-dropzone, lucide-react
5. Keep FastAPI backend unchanged

## Views (8 total)
1. SignInView — login with branding, SSO button
2. DashboardView — KPIs, floor heatmap, zone list
3. FloorPlanView — SVG floor plan, device dots, AP markers
4. AnalyticsView — charts, weekly heatmap grid
5. BuildingsView — building cards, add/edit modals
6. DataImportView — CSV upload, terminal log console
7. AreaSetupView — 3-step wizard, polygon zone drawing
8. SettingsView — toggles, sliders, intelligence modes

---

# FacilityIQ — Smart Occupancy Intelligence Platform

## Project Structure

```
occupancy-app/
├── backend/          ← Python FastAPI (main.py)
├── frontend/         ← React JS (create-react-app)
│   ├── src/
│   │   ├── App.js                     ← Main router + state + modals
│   │   ├── index.css                  ← Tailwind + custom utilities
│   │   └── components/
│   │       ├── Sidebar.js             ← Left navigation
│   │       ├── Header.js              ← Top bar with clock/breadcrumb
│   │       ├── SignInView.js          ← Login page
│   │       ├── DashboardView.js       ← KPI cards + heatmap + zones
│   │       ├── FloorPlanView.js       ← SVG floor plan + API devices
│   │       ├── AnalyticsView.js       ← Charts, heatmap grid, donut
│   │       ├── BuildingsView.js       ← Building cards grid
│   │       ├── DataImportView.js      ← CSV upload + terminal logs
│   │       ├── AreaSetupView.js       ← Zone polygon drawing wizard
│   │       └── SettingsView.js        ← Toggles, sliders, presets
│   ├── tailwind.config.js
│   └── postcss.config.js
├── core/             ← occupancy_core.py (triangulation engine)
├── data/
└── reference/        ← Google AI Studio TypeScript reference (read-only)
```

## Tech Stack

### Frontend
- React 19 (plain JS, create-react-app)
- Tailwind CSS v3 with custom design tokens
- lucide-react for icons
- axios for API calls
- react-dropzone for CSV upload
- recharts (available, not yet used in components)

### Backend
- Python FastAPI at `http://127.0.0.1:8000`
- Triangulation engine: RSSI → distance → trilateration

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload CSV, runs triangulation, stores results |
| GET | `/occupancy` | Zone occupancy breakdown (latest timestamp) |
| GET | `/devices` | Device positions with `est_x`, `est_y`, `zone`, `area_name` |
| GET | `/timestamps` | All available timestamps in uploaded data |
| GET | `/occupancy/{timestamp}` | Zone occupancy for a specific timestamp |

## CSV Format

Required columns:
```
timestamp, mac_address, ap_id, ap_x, ap_y, rssi
```

Optional: `area_name` (must match area name in AreaSetupView exactly)

## Design System

### Colors (Tailwind custom tokens)
- `primary` = `#00071b` (navy) — used for text, headings
- `secondary` = `#006a61` (teal) — active states, buttons, accents
- `on-surface` = `#171c23`
- `on-surface-variant` = `#45474e`
- `error` = `#ba1a1a`
- `status-success` = `#2ea056`
- `chart-teal` = `#0d9488`
- `chart-blue` = `#1d4ed8`

### Custom CSS Classes
- `.glass-card` — white/85 background, backdrop-blur, subtle shadow
- `.primary-gradient` — `linear-gradient(135deg, #0f1f3d 0%, #0d9488 100%)`
- `.brand-gradient-btn` — navy-to-teal gradient button

### Fonts
- `font-sans` → Inter
- `font-display` → DM Sans
- `font-mono` → JetBrains Mono

## Data Persistence
- Buildings and areas stored in `localStorage` keys: `fiq_buildings`, `fiq_areas`
- Backend stores data in-memory (resets on server restart)

## Starting the App

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm start
```

## Key State in App.js

Global state flows down as props:
- `buildings` / `setBuildings` → BuildingsView
- `logs` / `handleAddLog` → DataImportView
- `alertThreshold`, `intelligenceMode`, etc. → SettingsView
- Add/Edit building modals rendered in App.js (not in BuildingsView)
