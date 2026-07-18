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
