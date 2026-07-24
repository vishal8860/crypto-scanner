# Vishal Scanner

Production-oriented architecture for a CoinDCX Futures trade scanner with modular indicator, scoring, eligibility, stage, and planning engines.

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
- `COINDCX_PUBLIC_API_BASE_URL` (default: `https://public.coindcx.com`)
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

## Day 3: Market Data Engine (Candles)

- Backend endpoint available at `GET /api/candles` and `GET /api/v1/candles`
- Required query params:
  - `symbol` (e.g. `AAVEUSDT`)
  - `interval` (supported: `1m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `1d`)
  - `limit` (`1` to `1000`, default `250`)
- Backend `candles` module structure:
  - `controller/` request parsing + validation
  - `service/` orchestration and CoinDCX provider integration
  - `dto/` request and response contracts
  - `interfaces/` normalized entity and provider contracts
  - `types/` interval and query types
  - `constants/` supported intervals and limits
- CoinDCX candle response is normalized before returning:

```ts
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

- Frontend scanner includes a temporary debug panel:
  - Click any market row
  - Fetches last 250 candles (`15m`)
  - Shows symbol, interval, candle count, latest close, latest volume, first timestamp, last timestamp

## Day 4: Indicator Engine

- Backend endpoint available at `GET /api/indicators` and `GET /api/v1/indicators`
- Query params:
  - `symbol` (e.g. `AAVEUSDT`)
  - `interval` (same candle interval set as the market data engine)
- Indicator Engine consumes only normalized `Candle[]` from the Candles module
- Output contract:

```ts
interface IndicatorResult {
  symbol: string;
  price: number;
  ema9: number;
  ema20: number;
  ema200: number;
  distanceFromEMA20Percent: number;
  distanceFromEMA200Percent: number;
  isBelowEMA200: boolean;
  isBearishAlignment: boolean;
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  candlesSinceEMA200Cross: number;
  freshCross: boolean;
  trendAge: 'Fresh' | 'Developing' | 'Old';
  scannerScore: number;
}
```

- Frontend Scanner page now uses a Market Inspector panel:
  - Click any market row
  - Calculates indicators live through the backend
  - Displays price, EMA9, EMA20, EMA200, distance metrics, below-EMA200 flag, bearish alignment flag, and trend

## Day 5: Bearish Opportunity Scoring Engine

- Indicator Engine expanded with additional bearish opportunity metrics:
  - Percentage distance from EMA20 and EMA200
  - Candles since bearish EMA200 cross (above to below)
  - Fresh-cross flag (`<= 8` candles)
  - Trend age (`Fresh`, `Developing`, `Old`)
  - Scanner score (0 to 100)
- Scoring model is constant-driven and modular:
  - Below EMA200: `+25`
  - Bearish EMA alignment: `+25`
  - Fresh cross: `+25`
  - Distance below EMA200 `< 3%`: `+25`
  - Distance below EMA200 `> 8%`: `-20`
  - Trend age `Old`: `-15`
- Scanner page Market Inspector now shows:
  - Current price
  - EMA9 / EMA20 / EMA200
  - Distance EMA20 / EMA200 (percentage)
  - Candles since EMA200 cross
  - Trend age
  - Fresh cross
  - Scanner score

## Day 6: Market-Wide Scan Engine

- Frontend `ScannerEngineService` added to transform single-symbol inspection into market-wide scanning.
- Scan flow:
  - Load active futures markets
  - Fetch indicators for each symbol at `15m`
  - Build `ScannerResult[]`
  - Auto-sort by `score` descending
- Concurrency control:
  - Batched indicator requests (`8` per batch) to reduce API pressure
- Progress reporting:
  - Scanner page shows live progress `Current: x / total`
- Candle cache:
  - Backend candles service now applies in-memory `60s` TTL cache by `symbol + interval + limit`
  - Repeated scans within TTL avoid unnecessary CoinDCX candle calls
- Scanner Opportunities table columns:
  - Rank
  - Symbol
  - Scanner Score
  - Trend
  - Trend Age
  - Fresh Cross
  - Distance EMA200
  - Below EMA200
- Row click behavior:
  - Clicking an opportunity row updates Market Inspector from selected `ScannerResult`

## Day 7.2: Weighted Scoring Engine

- Replaced fixed bucket scoring with proportional weighted scoring components:
  - `emaDistanceScore`
  - `trendAgeScore`
  - `alignmentScore`
  - `slopeScore`
  - `volumeScore`
  - `momentumScore`
  - `sidewaysPenalty`
  - `finalScore`
- Final score remains clamped between `0` and `100`.
- Added dedicated backend scoring service:
  - `backend/src/modules/indicators/service/trend-scoring.service.ts`
- Added reusable thresholds/constants in:
  - `backend/src/modules/indicators/constants/indicator.constants.ts`

## Day 7.3: Eligibility-First Trade Candidate Filter

- Scanner behavior moved from ranking-first to eligibility-first.
- Added dedicated backend eligibility service:
  - `backend/src/modules/indicators/service/trade-eligibility.service.ts`
- Eligibility output now includes:
  - `eligible`
  - `eligibilityReasons`
  - `priority` (`High` | `Medium` | `Low`)
- Rule-based eligibility checks include:
  - price must be below EMA200
  - bearish trend classification only
  - minimum trend strength
  - volume quality not poor
  - sideways score threshold
  - trend age not old
  - distance-from-EMA200 not over-extended
- Only eligible markets are displayed as trade candidates.
- Scanner summary now shows:
  - Markets Scanned
  - Eligible
  - Rejected
  - High Priority
  - Medium Priority
  - Low Priority

## Day 7.4: Trade Stage Lifecycle Classification

- Added dedicated trade-stage classifier service:
  - `backend/src/modules/indicators/service/trade-stage.service.ts`
- Every analyzed market now receives one lifecycle stage:
  - `EARLY_BREAKDOWN`
  - `PULLBACK_ENTRY`
  - `TREND_CONTINUATION`
  - `LATE_TREND`
  - `SIDEWAYS`
- API now exposes stage metadata:
  - `tradeStage`
  - `tradeStageLabel`
  - `tradeStageColor`
  - `tradeStageReason`
- Scanner table includes a new `Trade Stage` column.
- Market Inspector includes `Trade Stage` and `Stage Reason`.

## Day 8: Entry Quality Engine and Inspector UX Refinement

- Added dedicated backend entry planning service:
  - `backend/src/modules/indicators/service/entry-planner.service.ts`
- Trade plan output now includes:
  - `suggestedEntry`
  - `suggestedStopLoss`
  - `suggestedTakeProfit`
  - `riskReward`
  - `entryQuality`
  - `planningReason`
- Entry planning logic is stage-aware and reusable:
  - Early Breakdown entry handling
  - Pullback Entry by EMA9/EMA20 context
  - Trend Continuation guardrails (`No Entry` conditions)
  - Stop logic using recent swing high vs EMA200 with buffer
  - Target logic using nearest support placeholder or `2x` risk fallback
- Entry Quality scoring is independent from scanner score and clamped to `0..100`.
- Frontend Scanner table now includes an `Entry Quality` column.
- Market Inspector now presents a structured analysis report with:
  - Trend Analysis groups
  - Trade Quality section
  - Trade Plan emphasis card
  - Risk/Reward quality badge
  - Dynamic `Why this trade?` bullet explanation
  - Eligibility pass/fail summary

## Day 8.1: Split Market Quality and Entry Quality

- Added independent scoring outputs in backend indicator response:
  - `trendScore`
  - `trendGrade`
  - `entryScore`
  - `entryGrade`
  - `tradeVerdict` (`READY` / `WATCH` / `DEVELOPING` / `IGNORE`)
- Scanner table now uses:
  - `Trend Score`
  - `Entry Score`
  - `Verdict`
- Ranking semantics remain market-quality first:
  - primary table score maps to `trendScore`
- Existing engines remain intact:
  - weighted trend scoring
  - eligibility filter
  - trade stage classification
  - entry planner

## Day 8.2: Trade Analysis UI/UX Refactor

- Renamed details panel from `Market Inspector` to `Trade Analysis`
- Replaced duplicated value dump with explainable cards:
  - `Trend Score Breakdown`
  - `Entry Score Breakdown`
  - `Trade Plan`
  - `Why this trade?`
  - `What prevents a higher score?`
- Added score-contribution rows and totals for trend and entry cards
- Added positive-only strengths list (max 5 points)
- Added blockers list with empty-state guidance when no blockers are present
- Kept all backend algorithms and frontend scan/ranking/filtering logic unchanged
- Preserved existing visual language while improving responsive card readability

## Day 9: Smart Entry Engine (Trade Decision Layer)

- Added a new intelligent decision layer on top of existing scoring:
  - `tradeDecisionScore` (0-100)
  - `tradeDecisionVerdict` (`A_PLUS_SETUP`, `STRONG_SETUP`, `WATCH`, `WEAK`, `AVOID`)
- Existing scoring remains intact:
  - `trendScore` still measures trend quality
  - `entryScore` still measures entry timing quality
  - legacy fields remain available for compatibility
- New decision model combines trade quality dimensions:
  - 35% Trend Score
  - 35% Entry Score
  - 15% Risk/Reward quality
  - 10% Volume quality
  - 5% Trade stage quality
- Added professional execution checks:
  - pullback quality (`Perfect Pullback` / `Acceptable Pullback` / `Extended Move`)
  - extension state (`Not Extended` / `Slightly Extended` / `Extended`)
  - risk/reward band (`Excellent` / `Good` / `Average` / `Poor` / `Unknown`)
- Added transparent score adjustments with signed reasons:
  - positive and negative contributions are exposed as `tradeDecisionAdjustments`
- Added one-line final recommendation per market as `finalRecommendation`
- Scanner ranking now uses `tradeDecisionScore` as final ranking score
- Trade Analysis panel now includes `Professional Trade Assessment` card showing:
  - Overall Rating
  - TradeDecisionScore
  - Risk Reward
  - Pullback Quality
  - Extension
  - Volume
  - Momentum
  - Deduction/bonus explanation lines
  - Final recommendation sentence
