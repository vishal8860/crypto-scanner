# API Design

## Principles

- Use versioned routes under `/api/v1`.
- Return JSON and stable resource-oriented paths.
- Keep exchange data read-only.
- Use explicit error responses and avoid leaking internal details.
- Document contracts before adding client integrations.

## Current Placeholder Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Service health and server timestamp |
| `GET` | `/api/v1/markets` | Placeholder list of supported markets |
| `GET` | `/api/v1/scanner/latest` | Placeholder latest scan results |

## Response Shape

Successful resource responses use a `data` envelope.

```json
{ "data": [] }
```

Errors use a concise error envelope.

```json
{ "error": { "message": "Description of the problem" } }
```

## Future Contract Work

Before expanding the API, define pagination, filtering, timestamps, validation, authentication requirements, and rate-limit behavior in this document.
