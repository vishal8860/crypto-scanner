# Scoring Engine

## Status

Planned. No scoring or signal-generation logic has been implemented.

## Purpose

The eventual scoring engine should make market observations easier to review, not determine or automate trades. Any score must be explainable, reproducible, and shown alongside its underlying evidence.

## Design Principles

- Prefer transparent factors over opaque recommendations.
- Record the market data timestamp used for every evaluation.
- Separate raw indicators, derived observations, and presentation scores.
- Make thresholds configurable and auditable.
- Never connect a score to order execution.

## Candidate Inputs

The following ideas are intentionally unprioritized: trend strength, volume context, support/resistance context, setup freshness, and multi-timeframe alignment. Their inclusion requires validation, documentation, and manual trader review.

## Open Questions

- Which market data intervals are appropriate for review?
- How should a score explain uncertainty or incomplete data?
- What historical evaluation method is reliable enough to assess a factor?
