# Architecture

## Overview

Vishal Scanner is a monorepo with independently deployable Angular and Node.js applications. It is intentionally designed as a read-only decision-support tool; execution of trades is outside the system boundary.

## Frontend

`frontend/src/app` is organized by product feature. Route-level features are lazy-loaded and own their UI as they grow. Shared application infrastructure is held in `core`, while reusable type definitions and UI primitives belong in `shared`.

| Area | Responsibility |
| --- | --- |
| `core` | Providers, HTTP configuration, layout, cross-cutting services |
| `features` | Dashboard, Scanner, Watchlist, Journal, and Settings screens |
| `shared` | Reusable components, models, and utilities |

Angular standalone components and providers are used throughout. Signals are preferred for local UI state; a global state library should only be introduced when a real cross-feature need emerges.

## Backend

`backend/src/modules` groups code by domain, not technical layer. Each module may grow its own router, service, models, repositories, and tests while retaining a clear boundary.

| Module | Intended responsibility |
| --- | --- |
| Markets | Market metadata and read-only exchange data |
| Scanner | Scan orchestration and results presentation |
| Indicators | Reusable calculation contracts |
| Signals | Explainable setup records |
| Storage | Persistence abstractions and adapters |
| Scheduler | Timed, non-executing background work |

HTTP middleware, errors, logging, and configuration are cross-cutting concerns kept outside domain modules.

## Data Flow

```text
Angular UI -> Express API -> Domain module -> Integration / storage adapter
```

Domain modules must not place orders or manage exchange credentials with trading permissions.
