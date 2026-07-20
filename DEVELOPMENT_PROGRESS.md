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
