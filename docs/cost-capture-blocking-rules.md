# Cost Capture Blocking Rules

## Blocking Rules

### ACC-BLOCK-001: Missing Actual Cost

If a project has required cost categories without actual entries, completion is blocked.

### ACC-BLOCK-002: Missing Critical Cost

If any critical category is missing, RED ALERT is created.

Critical categories:

- 철거
- 폐기물
- 타일
- 타일 부자재
- 인건비
- 운반비
- 기타 잡비

### ACC-BLOCK-003: Missing Supplier Price At Purchase

If a purchase order is marked ready but actual supplier price is missing, the item is shown as a research warning and completion remains blocked until the cost is captured.

### ACC-BLOCK-004: Missing Labor Man-Day

If labor is used but man-day input is missing in the daily site report, completion is blocked.

### ACC-ALERT-001: Margin Drop

If forecast margin rate falls below the configured warning threshold, CEO Alert is created.

Default thresholds:

- Warning: below 25%
- RED: below 15%

## Warning Rules

Warnings do not always block execution, but they must be visible:

- UNKNOWN supplier price
- NEEDS_RESEARCH vendor price
- Missing source document
- Missing vendor link

## Approval Rules

CEO approval is required for:

- Missing-cost override
- Master DB update candidate
- Vendor actual supplier price reflection
- Rollback after cost correction

## Rollback

Every captured actual cost update stores:

- Previous value
- New value
- Reason
- Actor
- Timestamp
- Source document

This allows rollback and audit.
