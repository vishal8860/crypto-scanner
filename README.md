# Vishal Scanner

Production-oriented architecture for a CoinDCX Futures market scanner. This repository deliberately contains **no trading, market-scanning, signal-generation, or technical-analysis logic**.

## Stack

- `frontend/`: Angular 20, standalone components, Signals, SCSS, Angular Material
- `backend/`: Node.js, Express, TypeScript, Axios, node-cron, SQLite placeholder

## Prerequisites

- Node.js 20.19+ (or a current LTS release)
- npm 10+

## Setup

```bash
npm install
cp backend/.env.example backend/.env
npm run dev
```

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000/api/v1/health`

### Backend environment

`backend/.env` supports these CoinDCX integration settings:

- `COINDCX_API_BASE_URL` (default: `https://api.coindcx.com`)
- `COINDCX_API_TIMEOUT_MS` (default: `10000`)
- `COINDCX_API_RETRIES` (default: `3`)
- `CORS_ALLOWED_ORIGINS` (default: `http://localhost:4200`, comma-separated for multiple origins)

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and backend development servers |
| `npm run build` | Build both applications |
| `npm run lint` | Lint both applications |
| `npm run test` | Run both test suites |

## Structure

```
frontend/src/app/
  core/          # app-wide providers, API infrastructure, layout
  features/      # route-level product features
  shared/        # reusable UI and types
backend/src/
  config/        # environment validation and configuration
  common/        # middleware, errors, logging
  modules/       # independently owned domain modules
```

## Architecture decisions

The frontend is organized by feature so each page can grow independently and be lazy-loaded. Cross-cutting concerns live in `core`, while generic reusable pieces live in `shared`; this avoids a catch-all services folder. Standalone Angular APIs replace NgModules, and Signals provide simple local reactive state without committing the app to a global store before it needs one.

The backend follows a modular boundary per domain (`markets`, `scanner`, `indicators`, etc.). Each module can own its routes, service, interfaces, and eventual persistence adapters. HTTP concerns are centralized in middleware and route registration, so future business logic remains framework-light and testable. Configuration is validated at startup, and infrastructure integrations are represented by placeholders behind services, keeping future vendor or database changes localized.

## Day 2: CoinDCX Markets Integration

- Endpoint available at `GET /api/markets` and `GET /api/v1/markets`
- Backend `markets` module merges:
  - Futures instruments from `exchange/v1/derivatives/futures/data/active_instruments`
  - Ticker metrics from `exchange/ticker`
- Frontend Scanner page (`/scanner`) shows markets in an Angular Material table with:
  - Search by symbol
  - Sorting by symbol and volume
  - Loading, empty, and error states
  - Refresh action
