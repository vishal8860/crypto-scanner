# Vishal Scanner Development Journal

---

# Day 1

**Date**  
17 July 2026

## Objective

Bootstrap the application and create a scalable architecture.

---

## Completed

✅ Angular application created

✅ Routing configured

✅ Sidebar navigation

✅ Dashboard page

✅ Scanner page

✅ Basic layout shell

✅ Project structure finalized

✅ Development environment working

---

## Engineering Decisions

- Angular selected because of existing expertise.
- Standalone Components adopted.
- Feature-based architecture.
- Application will act as a Trading Assistant, not an automated Trading Bot.
- Build the foundation before implementing trading logic.

---

## Lessons Learned

A clean architecture is more valuable than implementing features quickly.

Today's success was creating a maintainable codebase rather than a working scanner.

---

## Tomorrow

- Build Node backend
- Connect CoinDCX API
- Fetch Futures Markets
- Display all Futures inside Scanner page

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐☆☆☆ |

### Overall

9/10

---

## Version

v0.1.0

---

# Day 2

**Date**  
18 July 2026

## Objective

Integrate CoinDCX Futures markets end-to-end and render them in the Scanner page.

---

## Completed

✅ Backend markets module implemented with CoinDCX integration

✅ Reusable Axios client created with timeout and retry support (3 retries)

✅ CoinDCX base URL moved to environment configuration

✅ Error handling implemented through AppError + global error middleware

✅ Logging middleware retained for request-level observability

✅ Endpoint implemented: GET /api/markets (and /api/v1/markets compatibility)

✅ DTOs/interfaces added for clear contract boundaries

✅ Angular MarketsService created using HttpClient + strict typing + Signals

✅ Scanner page built with Angular Material table

✅ Loading state, error state, no-data state, and refresh flow implemented

✅ Search by symbol implemented

✅ Sort by symbol and volume implemented

✅ Responsive behavior validated for table container

✅ Backend and frontend lint/build checks passed

---

## Engineering Decisions

- CoinDCX futures instruments are sourced from `/exchange/v1/derivatives/futures/data/active_instruments`.
- Ticker metrics are sourced from `/exchange/ticker` and merged in the markets service.
- Missing ticker rows are represented as `null` values to avoid synthetic data and keep response truthful.
- Axios retry is limited to transient failures (timeouts, network errors, and retryable 4xx/5xx statuses).
- The backend route is exposed under both `/api/markets` and `/api/v1/markets` to satisfy immediate task requirements while preserving existing API versioning.
- Scanner UI keeps logic in the feature service and uses Signals for local reactive state without introducing global store complexity.

---

## Lessons Learned

CoinDCX futures metadata and ticker data come from separate endpoints; merging both on the backend keeps the frontend simple and stable.

---

## Next

- Add unit tests for MarketsService mapping and retry behavior.
- Add API contract tests for `/api/markets`.
- Start scanner logic only after market ingestion is stable.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐☆ |

### Overall

9.5/10

---

## Version

v0.2.0

---

# Day 3

**Date**  
19 July 2026

## Objective

Build a reusable Market Data Engine for OHLC candle ingestion and normalization.

---

## Completed

✅ New backend `candles` module created with feature-first structure:

- `controller/`
- `service/`
- `dto/`
- `interfaces/`
- `types/`
- `constants/`

✅ Endpoint implemented: `GET /api/candles` and `GET /api/v1/candles`

✅ Query validation added for `symbol`, `interval`, and `limit`

✅ Dedicated CoinDCX candle service implemented with:

- reusable Axios client
- timeout
- retry support
- error handling
- logging

✅ CoinDCX response normalized to internal `Candle` contract

✅ Service architecture designed for future caching integration via provider abstraction

✅ Frontend `CandlesService` + typed interfaces added

✅ Scanner row click integration completed

✅ Temporary candle debug panel implemented (no chart)

✅ Required verification completed with `limit=250`:

- `AAVEUSDT`: 250
- `LABUSDT`: 250
- `BTCUSDT`: 250
- `ETHUSDT`: 250

✅ Backend/frontend lint and builds passed

---

## Engineering Decisions

- Candle ingestion is isolated behind `CandleDataProvider` to enable caching later without changing controller or response contracts.
- CoinDCX raw payloads are never exposed directly; API always returns normalized candles.
- Validation happens at controller boundary to keep downstream services pure and predictable.
- Default interval and limit are centralized in constants to avoid duplicated magic values.
- Debug panel validates data-layer correctness early before charting or indicators are introduced.

---

## Lessons Learned

Establishing a normalized data contract early makes future indicator/scanner modules simpler and safer.

---

## Next

- Add unit tests for validation and normalization logic.
- Add optional in-memory caching adapter behind `CandleDataProvider`.
- Keep scanner logic disabled until data-layer test coverage is in place.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐☆ |

### Overall

9.6/10

---

## Version

v0.3.0

---

# Day 4

**Date**  
20 July 2026

## Objective

Build the Indicator Engine on top of normalized candle data and surface live calculations in the Scanner page.

---

## Completed

✅ New backend `indicators` module created with feature-first structure:

- `controller/`
- `service/`
- `dto/`
- `interfaces/`
- `utils/`
- `constants/`

✅ Endpoint implemented: `GET /api/indicators` and `GET /api/v1/indicators`

✅ Indicator Engine consumes only normalized candles from the Candles module

✅ Reusable `calculateEMA()` utility implemented once and shared for EMA 9 / 20 / 200

✅ IndicatorResult contract created with trend and distance fields

✅ Validation added for `symbol` and `interval`

✅ Frontend `IndicatorsService` added with typed API client

✅ Scanner page updated to use Market Inspector instead of candle debug panel

✅ Live indicator verification completed for:

- `AAVEUSDT`
- `BTCUSDT`
- `ETHUSDT`
- `LABUSDT`

✅ Backend/frontend lint and builds passed

---

## Engineering Decisions

- Indicators are computed from normalized Candle data only, so no CoinDCX vendor coupling leaks into the engine.
- EMA logic is centralized in a single utility to prevent duplication and ensure future indicator reuse.
- Controller validation is kept strict so the service layer can focus on computation, not HTTP concerns.
- The Market Inspector is intentionally numeric-only and chart-free so the scanner can verify signal readiness before any visual layer is introduced.

---

## Lessons Learned

A clean indicator boundary makes future scanner rules and strategy layers much easier to add without rewriting data plumbing.

---

## Next

- Add unit tests for EMA calculation and indicator trend classification.
- Add endpoint tests for invalid symbol and interval input.
- Keep scanner logic focused on inspection until the data layer is fully covered.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐☆ |

### Overall

9.7/10

---

## Version

v0.4.0

---

# Day 5

**Date**  
21 July 2026

## Objective

Build a Bearish Opportunity Scoring Engine on top of the existing Indicator Engine.

---

## Completed

✅ Extended `IndicatorResult` with bearish opportunity metrics:

- `distanceFromEMA20Percent`
- `distanceFromEMA200Percent`
- `candlesSinceEMA200Cross`
- `freshCross`
- `trendAge`
- `scannerScore`

✅ Implemented reusable utility modules:

- `calculateEMASeries()`
- `countCandlesSinceEMA200Cross()`
- `resolveTrendAge()`
- `calculateScannerScore()`

✅ Added rule-based scoring engine (0 to 100 clamp) using constant configuration

✅ Market Inspector updated to display all new scoring fields

✅ Verified symbols:

- `AAVEUSDT`
- `BTCUSDT`
- `ETHUSDT`
- `LABUSDT`

✅ Backend/frontend lint and builds passed

---

## Engineering Decisions

- Kept scoring logic in dedicated utilities to avoid bloating `IndicatorsService`.
- Used EMA200 series computation utility so cross-detection can be deterministic and reusable.
- Encoded thresholds and scoring weights as constants for maintainability and future tuning.
- Preserved strict separation: indicator/scoring engine consumes normalized candles only, never exchange payloads.

---

## Lessons Learned

Scoring rules evolve quickly, so constant-driven and utility-oriented design makes the system easier to tune without destabilizing API contracts.

---

## Next

- Add unit tests for cross-detection and score-weight boundaries.
- Add endpoint contract tests for new Day 5 fields.
- Start scanner ranking list once score confidence and tests are stable.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐⭐ |

### Overall

9.8/10

---

## Version

v0.5.0

---

# Day 6

**Date**  
21 July 2026

## Objective

Transform Scanner from single-symbol analysis into a market-wide scanning engine.

---

## Completed

✅ Created frontend `ScannerEngineService` for market-wide scanning orchestration

✅ Implemented `ScannerResult` model with ranking and scanner-opportunity fields

✅ Added batched concurrency control for indicator requests (batch size: 8)

✅ Added live scan progress reporting (`Current: x / total`)

✅ Added Scanner Opportunities table with required columns:

- Rank
- Symbol
- Scanner Score
- Trend
- Trend Age
- Fresh Cross
- Distance EMA200
- Below EMA200

✅ Enabled row click to update existing Market Inspector from selected `ScannerResult`

✅ Added Scan button to refresh all opportunities

✅ Implemented backend candle cache (TTL 60 seconds) to reduce repeated CoinDCX hits

✅ Scanner opportunities auto-sorted by Scanner Score descending

✅ Lint/build validations passed for backend and frontend

---

## Engineering Decisions

- Kept scanner orchestration in dedicated `ScannerEngineService` for separation of concerns and easier testing.
- Retained indicator computation on backend; frontend only orchestrates scan execution and presentation.
- Used batched request windows instead of unbounded parallelism to reduce vendor API stress.
- Added cache at candles service level so all consumers (inspector and market scans) benefit uniformly.
- Kept Market Inspector contract stable by selecting from the already-computed `ScannerResult`.

---

## Lessons Learned

The combination of batched concurrency + short-lived candle caching is critical for reliable market-wide scans without overwhelming upstream APIs.

---

## Next

- Add scan cancellation and retry controls for long-running scans.
- Add unit tests for scanner batching and ranking behavior.
- Add backend endpoint for server-side bulk scanning when scaling beyond browser-triggered scans.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐⭐ |

### Overall

9.9/10

---

## Version

v0.6.0

---

# Day 6.1

**Date**  
21 July 2026

## Objective

Improve scanner usability using visual badges, chips, row emphasis, and score legend while preserving existing scanner behavior.

---

## Completed

✅ Added reusable scanner UI components:

- `vs-scanner-score-badge`
- `vs-scanner-trend-chip`
- `vs-scanner-status-chip`

✅ Replaced plain numeric score display with Opportunity Badge system:

- 🟢 Excellent (90-100)
- 🟡 Good (75-89)
- 🟠 Average (60-74)
- 🔴 Ignore (<60)

✅ Replaced trend text with visual trend chips:

- 🔻 Bearish
- 🟢 Bullish
- ⚪ Neutral

✅ Replaced Fresh Cross text indicators:

- ✅ Fresh
- ❌ Old Trend

✅ Replaced Trend Age text with colored chips:

- Fresh (Green)
- Developing (Orange)
- Old (Red)

✅ Replaced EMA alignment text with explicit status chips:

- 🔴 Bearish Alignment
- 🟢 Bullish Alignment
- ⚪ Mixed Alignment

✅ Added distance color coding for EMA200/EMA20 values:

- within ±3% => Green
- 3% to 8% => Orange
- >8% => Red

✅ Added Scanner Score Legend above table

✅ Added row-level visual emphasis by score tier with hover and selected row highlighting

✅ Preserved responsive layout for badges/chips on narrower screens

✅ Frontend lint/build passed with no breaking changes

---

## Engineering Decisions

- Encapsulated badge/chip behavior into reusable standalone components to avoid duplicated UI logic.
- Centralized UI color values via SCSS variables instead of inline hardcoded colors.
- Kept scanner computation and API contracts unchanged; this release focuses purely on visual readability.
- Used typed helper methods for tiering/alignment classification to keep template logic clean and testable.

---

## Lessons Learned

Visual hierarchy dramatically improves scanner usability; traders can parse opportunity quality faster with consistent badges and chip semantics.

---

## Next

- Add accessibility labels for badge/chip states.
- Add minimal component tests for score tier and chip mapping.
- Add optional user preference toggle for compact vs detailed table density.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐⭐ |

### Overall

10/10

---

## Version

v0.6.1

---

# Day 7.2

**Date**  
22 July 2026

## Objective

Upgrade scanner scoring quality from fixed buckets to a weighted, proportional scoring engine.

---

## Completed

✅ Replaced rule-bucket scoring with weighted component scoring

✅ Added score components:

- `emaDistanceScore`
- `trendAgeScore`
- `alignmentScore`
- `slopeScore`
- `volumeScore`
- `momentumScore`
- `sidewaysPenalty`
- `finalScore`

✅ Added dedicated backend `TrendScoringService`

✅ Added tuning constants for slope, momentum, volume, and sideways logic

✅ Exposed score component fields through indicator and scanner contracts

✅ Preserved final score clamp between `0` and `100`

✅ Backend/frontend builds passed

---

## Engineering Decisions

- Kept weighted scoring isolated in a dedicated service to avoid bloating `IndicatorsService`.
- Moved numeric thresholds into constants for rapid strategy tuning without contract rewrites.
- Preserved existing scanner table structure while expanding debug-ready response fields.

---

## Lessons Learned

Weighted sub-scores reduce false positives better than binary score buckets, especially when sideways penalties are modeled explicitly.

---

## Next

- Introduce eligibility gating before market display.
- Classify market lifecycle stages beyond numeric score.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐⭐ |

### Overall

10/10

---

## Version

v0.7.2

---

# Day 7.3

**Date**  
22 July 2026

## Objective

Convert scanner into an eligibility-first trade candidate filter.

---

## Completed

✅ Added dedicated backend `TradeEligibilityService`

✅ Implemented rule-based eligibility with explicit rejection reasons:

- Above EMA200
- Trend not bearish
- Weak trend
- Insufficient volume
- Sideways market
- Trend too old
- Move already extended

✅ Added priority assignment (`High` / `Medium` / `Low`) for eligible markets

✅ Scanner now keeps both:

- `allResults` (all analyzed markets)
- `filteredResults` (eligible trade candidates)

✅ Scanner table now excludes rejected markets

✅ Summary block updated to:

- Markets Scanned
- Eligible
- Rejected
- High Priority
- Medium Priority
- Low Priority

✅ Added debug fields to scanner model:

- `eligible`
- `eligibilityReasons`
- `priority`

✅ Backend/frontend builds passed

---

## Engineering Decisions

- Introduced eligibility as an independent layer after scoring to keep architecture extensible.
- Preserved full market analysis in memory so future filters can be toggled without rescanning.
- Kept UI changes minimal and focused on clarity.

---

## Lessons Learned

Eligibility gates improve signal quality more effectively than display-score thresholds alone.

---

## Next

- Add lifecycle stage classification for where the trade sits in trend development.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐⭐ |

### Overall

10/10

---

## Version

v0.7.3

---

# Day 7.4

**Date**  
22 July 2026

## Objective

Classify each trade candidate by lifecycle stage for execution context.

---

## Completed

✅ Added dedicated backend `TradeStageService` for stage classification

✅ Added typed `TradeStage` categories:

- `EARLY_BREAKDOWN`
- `PULLBACK_ENTRY`
- `TREND_CONTINUATION`
- `LATE_TREND`
- `SIDEWAYS`

✅ Added stage metadata in contracts:

- `tradeStage`
- `tradeStageLabel`
- `tradeStageColor`
- `tradeStageReason`

✅ Implemented stage rules using trend strength, sideways score, candles since cross, EMA slope, EMA distance, and price efficiency

✅ Added `Trade Stage` column to scanner table

✅ Added `Trade Stage` + `Stage Reason` to Market Inspector

✅ Preserved existing scoring, eligibility, and ranking behavior

✅ Backend/frontend builds passed

---

## Engineering Decisions

- Kept lifecycle classification in a dedicated service to prevent coupling with scoring logic.
- Used typed stage outputs to keep frontend rendering deterministic and reusable.
- Added constants for stage thresholds to support future strategy tuning.

---

## Lessons Learned

Trade lifecycle context helps decision quality by separating setup timing from raw score strength.

---

## Next

- Add stage distribution analytics (counts by stage) above scanner table.
- Add tests for stage boundary conditions.

---

## Development Score

| Area | Score |
| --- | --- |
| Planning | ⭐⭐⭐⭐⭐ |
| Architecture | ⭐⭐⭐⭐⭐ |
| Code Quality | ⭐⭐⭐⭐⭐ |
| Learning | ⭐⭐⭐⭐⭐ |
| Features | ⭐⭐⭐⭐⭐ |

### Overall

10/10

---

## Version

v0.7.4
