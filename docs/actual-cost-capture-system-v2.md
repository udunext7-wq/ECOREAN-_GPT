# Actual Cost Capture System V2

## Purpose

Actual Cost Capture System V2 prevents cost leakage by collecting actual costs during execution, not after completion.

The CEO should always see actual remaining margin, not only revenue.

## Core Principle

- System Layer: English keys, table names, service names, status codes.
- Display Layer: Korean labels, warnings, approval reasons, dashboard messages.
- Actual cost is captured at the process stage where the cost happens.
- Completion is blocked when critical actual costs are missing.

## Critical Cost Categories

The following categories are mandatory for every execution project:

- Demolition
- Waste
- Tile
- Tile accessory materials
- Labor
- Transport
- Miscellaneous site expenses

## Capture Timing

| Cost Category | Capture Timing | Blocking Stage |
| --- | --- | --- |
| Demolition | 철거 공정 시작/완료 시 | Completion |
| Waste | 폐기물 반출 시 | Completion |
| Tile | 발주 확정 시 | Completion |
| Tile accessory materials | 발주 확정 시 | Completion |
| Labor | 공사일보 작성 시 | Completion |
| Transport | 현장 반입/양중/운반 발생 시 | Completion |
| Miscellaneous | 발생 즉시 | Completion |

## Dashboard Requirements

Cost Capture Dashboard shows:

- Project revenue
- Captured actual cost
- Missing critical cost count
- Forecast margin
- Forecast margin rate
- Completion block status
- Cost leak analysis
- Vendor actual price link status

## Database Ownership

- `project.db`: cost capture requirements, entries, project forecast status.
- `logs.db`: action log and notification log.
- `approval.db`: approval records for exceptions or missing-cost overrides.
- `master.db`: no direct update. Actual cost evidence only becomes a Master DB update candidate after approval.

## Completion Rule

Completion must call cost capture readiness before final completion.

If any critical required cost is not captured:

- `completionBlocked = true`
- RED ALERT is created
- Approval Center receives a blocking item
- Project cannot move to `COMPLETED`

## Vendor Link

Vendor actual supplier price is linked to cost capture entries through:

- `vendorId`
- `vendorNameKo`
- `sourceDocumentKo`
- `capturedAt`
- `capturedBy`

Vendor data is evidence. It does not update Master DB without CEO approval.
