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

## Day 10: Smart Trade Management Engine

- Added a dedicated trade management layer on top of existing setup detection and decision scoring.
- New management outputs now available per market:
  - `tradeState`
  - `dynamicStopLoss`
  - `stopLossStrategy`
  - `profitTargets` (`TP1`, `TP2`, `TP3` with R-multiple)
  - `tradeProgressLabel`
  - `tradeProgressR`
  - `managementAdvice`
  - `riskLevel`
  - `exitWarnings` (severity-tagged)
  - `professionalSummary`
- Trade Analysis UI now includes a new `Trade Management` card with:
  - Current Trade State badge
  - Dynamic stop suggestion and logic
  - Profit target planner (TP1/TP2/TP3)
  - Live trade progress (`Waiting`, `Triggered`, `+xR`, `Stopped`, `Target Hit`)
  - Management advice
  - Risk meter (`Low`, `Medium`, `High`)
  - Exit warnings with severity
  - Professional summary block
- Management logic is structured to support future live price refresh without architecture changes.
- Existing trend score, entry score, eligibility, stage, priority, filtering, and decision layers are preserved.

## Day 11: Performance Intelligence Engine

- Added a full historical trade recording and analytics module:
  - backend module: `backend/src/modules/performance/`
  - persistent repository: `trade-history.repository.ts` (file-backed, replaceable adapter)
  - analytics service: `performance.service.ts`
  - API router: `performance.router.ts`
- Trade history model now stores completed trades with execution and context metadata:
  - symbol/time/direction
  - trend + entry + decision grades
  - stage / trend age / volume quality
  - risk-reward, entry/stop/target/exit, holding time
  - P&L (% and R), win/loss, exit reason
  - scanner version for version-over-version analysis
- New Performance Dashboard capabilities:
  - total trades
  - win rate
  - average R
  - average winner
  - average loser
  - profit factor
  - average holding time
  - longest winning streak
  - longest losing streak
- Added breakdown tables for:
  - decision grade
  - trend grade
  - entry grade
  - trade stage
  - trend age
  - volume quality
- Added Trend vs Entry heatmap with:
  - trades count
  - win rate
  - average R
- Added Indicator Validation page with historical validation for:
  - trend age
  - volume quality
  - EMA distance buckets
  - pullback quality buckets
  - risk/reward buckets
- Added version comparison endpoint and dashboard section to compare performance across scanner versions.

## Day 11.1: Smarter Decision Engine (False Positive Reduction)

- Refactored trade decision logic to a gated hierarchy instead of additive-only scoring.
- New decision flow:
  - Step 1: Trend Qualification gate
  - Step 2: Entry Qualification (`READY`, `WATCH`, `DEVELOPING`, `POOR`)
  - Step 3: Hard Blockers override (`AVOID`)
  - Step 4: Positive Boosters
  - Step 5: Decision Matrix mapping to final verdict
  - Step 6: Transparent explanation lines (`blocked because`, `positive factor`)
- Hard blockers now always override boosters/scores.
- All thresholds moved into centralized indicator constants (no hardcoded decision thresholds in service).
- Trend Score and Entry Score calculations are unchanged; only final decision production was improved.

## Day 12: Multi-Timeframe Confirmation Engine

- Added reusable backend `MultiTimeframeAnalysisService` to analyze multiple intervals per market.
- Current architecture evaluates:
  - `15m` primary analysis
  - `1h` higher-timeframe confirmation
  - future-ready extension path for `4h`, daily, and weekly
- Each timeframe snapshot exposes:
  - `trendScore`
  - `entryScore`
  - `trendGrade`
  - `tradeStage`
  - `trend`
  - EMA alignment status
  - `volumeQuality`
  - `trendStrengthScore`
- Added higher timeframe confirmation state:
  - `Confirmed`
  - `Neutral`
  - `Counter Trend`
- Multi-timeframe confirmation now contributes to decision quality as another booster/blocker:
  - confirmed bearish alignment adds a bonus
  - counter-trend higher timeframe applies a penalty
  - stronger bonus when both timeframes are excellent
- Scanner table now includes compact `MTF` column.
- Trade Analysis now includes `Multi-Timeframe Analysis` card.

## Day 13: Market Structure Engine

- Added dedicated backend `MarketStructureService` for price-action intelligence.
- Structure engine now detects:
  - swing highs and lows (`HH`, `HL`, `LH`, `LL`)
  - Break of Structure (`BOS`)
  - Change of Character (`CHoCH`)
  - retest outcomes
  - nearest swing support and resistance
  - support/resistance distance
  - compression states (`Triangle`, `Range`, `Low Volatility Squeeze`)
  - false breakdown reclaim behavior
- Added `structureQualityScore` (`0..10`) and compact structure state (`Strong`, `Mixed`, `Weak`).
- Market structure now feeds the decision engine with:
  - positive structure adjustments for clean BOS, successful retest, and strong structure
  - negative adjustments for fake breakdowns, CHoCH against trend, compression, and weak structure
- Scanner table now includes compact `Structure` column.
- Trade Analysis now includes `Market Structure` card.

## Day 13.1: Price Action Intelligence Engine

- Upgraded scanner intelligence with a modular price-action stack while keeping Trend Score, Entry Score, MTF, and Trade Management intact.
- Added independent services:
  - `MarketStructureService`
  - `SupportResistanceService`
  - `LiquidityService`
  - `TrendExhaustionService`
  - `PriceActionAnalysisService`
- Market structure now provides discretionary-style context:
  - configurable pivot swing detection (`HH`, `HL`, `LH`, `LL`) with noise filtering
  - structure trend, swing sequence, swing strength, structure confidence
  - BOS direction, break price, candles since BOS, and break strength
  - CHoCH direction (`Bullish CHoCH`, `Bearish CHoCH`, `None`)
  - retest state (`Broke and Continued`, `Retesting`, `Broke then Retested`, `Broke then Failed`)
- Dynamic support/resistance layer now computes:
  - nearest support and resistance
  - distance percent to each
  - strength classification (`Strong`, `Medium`, `Weak`, `None`)
  - compact support table state (`Clear`, `Near`, `Strong Support`)
- Liquidity engine now detects and reports:
  - equal highs/lows
  - previous day high/low
  - recent swing liquidity
  - nearest liquidity zone, distance, direction, and pressure flag
- Trend exhaustion engine now classifies:
  - `Healthy Trend`, `Extended`, `Exhausted`, `Parabolic`
  - using impulsive-candle count, EMA20 extension, ATR expansion, and climax volume ratio
- Decision engine now consumes price-action adjustments (config-driven, explainable):
  - bonuses: clean BOS, confirmed retest, strong structure, rejection from strong overhead structure
  - penalties: fake breakdown, CHoCH against setup, strong support nearby, exhaustion/parabolic state, compression, liquidity pressure
- Professional assessment explainability now includes explicit `Price Action Adjustment` lines with signed points and reasons.
- Scanner table now includes compact `Support` column in addition to `Structure` and `MTF`.
- Trade Analysis now includes a primary `Price Action Analysis` card showing:
  - Structure Trend
  - Structure Score
  - Latest BOS and Candles Since BOS
  - CHoCH
  - Retest Status
  - Support/Resistance Strength
  - Liquidity Zone
  - Trend Exhaustion
  - Compression
  - Swing Pattern
- All thresholds are centralized in indicator constants; no magic numbers in price-action logic.

## Day 14: Market Structure Engine (Professional Trend Classification)

- Introduced a richer market-context classification layer before trend and entry quality interpretation.
- Added professional market structure states:
  - `StrongBearish`
  - `Bearish`
  - `TransitionalBearish`
  - `Neutral`
  - `TransitionalBullish`
  - `Bullish`
  - `StrongBullish`
- Structure classification now considers EMA200, EMA20, price location, and EMA slope context.
- Scanner UI now shows a colored market-structure badge instead of only compact `Strong/Mixed` structure context.
- Trend Score is now structure-aware for bearish scanning bias:
  - strong bearish context gets a positive bonus
  - neutral and bullish contexts get increasing penalties
  - strong bullish context gets the heaviest penalty
- Entry Score now applies bearish-context caps to reduce false positives:
  - neutral structure limits maximum entry quality
  - bullish and strong bullish structures heavily cap or suppress bearish entry quality
- Trade Analysis panel now includes `Market Structure` with context-aware reason text.
- `Why this trade?` now includes a dedicated market-structure narrative sentence.
- Ranking refinement for similar candidates now prioritizes:
  - market structure quality first
  - trend score second
  - entry score third
- Outcome:
  - markets in bullish recovery phases are no longer surfaced as high-quality bearish continuation candidates.

## Day 15: Decision Engine Recalibration

- Reworked the decision engine to rank opportunities instead of rejecting almost every setup.
- Decision production is now score-first and driven by a true `tradeDecisionScore` out of `100`.
- Current weighted model:
  - `Trend Score` = 40%
  - `Entry Score` = 30%
  - `MTF Confirmation` = 10%
  - `Risk/Reward` = 10%
  - `Market Quality` = 10%
- Decision thresholds were recalibrated to:
  - `95-100` → `A+`
  - `85-94` → `Strong`
  - `70-84` → `Watch`
  - `55-69` → `Weak`
  - `<55` → `Avoid`
- Immediate rejection logic was reduced to true hard blockers only:
  - risk/reward below configured minimum
  - higher timeframe conflict (`Counter Trend`)
  - price sitting directly on major support
  - market quality classified as `Avoid`
  - extreme extension beyond acceptable zone
- Non-fatal issues now reduce score instead of forcing rejection:
  - nearby support pressure
  - slight extension
- Entry calibration was relaxed so mid-range entries are treated more realistically:
  - `80-100` → strong/premium pullback quality
  - `60-79` → good pullback
  - `45-59` → developing
  - `30-44` → weak but acceptable context
  - `<30` → poor
- Scanner UI now surfaces calibrated decision transparency more clearly:
  - `Decision Score` column in the table
  - `Market Quality` badge in the table
  - explicit blocker list when a setup is rejected
  - clearer score contribution lines in `Professional Trade Assessment`
- Added `DEBUG_CALIBRATION_MODE` so every scanned market can emit:
  - symbol
  - trend score
  - entry score
  - decision score
  - final decision
  - score contributions
  - hard blockers
- Outcome:
  - strong bearish trends with acceptable entries are now more likely to land in `Watch` or `Strong` instead of defaulting to `Avoid`.

## Day 15.2: Calibration Pass and Scanner Health Reporting

- Tightened the decision engine further so a `70`-class setup is no longer pushed into `Avoid` by conservative guardrails.
- Lowered default market-quality thresholds to better match the live scanner population:
  - market cap default minimum: `25M`
  - daily volume default minimum: `10M`
- Softened market-quality scoring so `smallCap` and `thin` markets are penalized, but not automatically flattened.
- Added `debugCalibrationMode` to the indicator request so calibration output can be enabled per scan.
- Added a dev-only scanner health report after each scan with:
  - rejected / weak / watch / strong / A+ counts
  - average trend, entry, and decision scores
  - hard blocker counts
  - top candidate preview for quick review
- Added a support contribution line to the decision breakdown so the final score is easier to audit.
- Outcome:
  - the scanner now ranks opportunities more like a discretionary trader and surfaces calibration data immediately after each scan.

## Day 16: Trend Quality Engine (Clean Trend vs Choppy Market)

- Added a new Trend Quality component (`0-20`) without introducing any new indicator source.
- Trend Quality now rewards clean bearish behavior:
  - staying on one side of EMA20
  - consistent lower highs and lower lows
  - stronger bearish impulse persistence
  - disciplined (smaller) pullbacks
  - smoother EMA20 slope behavior
- Trend Quality now penalizes choppy behavior:
  - repeated EMA20 crosses
  - high candle overlap
  - frequent red/green alternation
  - wick-heavy noisy candles
  - fake-breakout/reclaim patterns
  - sideways drag
- Trend Quality is normalized into labels:
  - `Excellent`
  - `Good`
  - `Average`
  - `Poor`
- Final Trend Score now includes this new quality layer so charts with similar EMA alignment can still rank differently by cleanliness.
- Scanner Trade Analysis now shows Trend Quality label and score directly in Trend Score Breakdown.
- Outcome:
  - clean staircase trends naturally rank above messy trends even when base EMA structure is similar.

## Day 17: Structure Confirmation Engine (Eliminate Fake Trendline Breaks)

- Replaced loose trendline-break interpretation with structure-first confirmation logic.
- Added `Structure Confirmation Score` (`0-100`) to validate true bullish-to-bearish transition quality.
- Added swing-sequence based structure phase classification:
  - `Bullish`
  - `Transition Bullish`
  - `Range`
  - `Transition Bearish`
  - `Bearish`
  - `Strong Bearish`
- Tightened BOS behavior to require actual swing confirmation (break of prior higher low context) rather than line-only breaks.
- Added retest + rejection awareness so entries stay constrained when confirmation is incomplete.
- Added `Pullback Quality Score` (`0-100`) and integrated it into entry-quality scoring.
- Added support-risk protection in entry scoring (penalty when downside room is below `1R`, unless support is already broken).
- Updated decision weighting to include structure and pullback quality while preserving conservative hard blockers.
- Added `Structure Score` visibility and explicit structure-reason bullets in scanner analysis.
- Outcome:
  - fewer fake-break bearish candidates are promoted; quality remains conservative with stronger structural confirmation.

## Day 18: Scanner UX Consolidation (Two Primary Scores)

- Consolidated scanner presentation into two primary scores:
  - `Setup Quality` (`0-100`): "Is this market worth trading?"
  - `Entry Readiness` (`0-100`): "Can I enter right now?"
- Kept all internal engines and raw factors intact (Trend, Structure, Market Quality, Support, MTF, Entry, Pullback, RR, Volume, Momentum), but surfaced them through consolidated score breakdowns.
- Simplified scanner table layout to:
  - `Rank`
  - `Symbol`
  - `Structure`
  - `Setup Quality`
  - `Entry Readiness`
  - `Decision`
  - `Trade Stage`
  - `Priority`
- Updated default ranking order to:
  - Setup Quality DESC
  - Entry Readiness DESC
  - Decision
  - Symbol
- Refactored decision verdict mapping to matrix logic based on the two consolidated scores while preserving hard blockers.
- Trade Analysis now includes explicit Setup Quality and Entry Readiness component breakdown sections for easier interpretation.
- Outcome:
  - scanner reads like a product-first decision board while preserving full analytical depth under the hood.
