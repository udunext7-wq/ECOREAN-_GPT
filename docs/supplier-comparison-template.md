# Supplier Comparison Template

## Comparison Table

| Vendor | Category | Item | Official Price | Market Price | Dealer Price | Supplier Price | Internal Purchase Price | Min Order | Lead Time | Payment Condition | A/S | Defect Rate | Recommended | Notes |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|
| NEEDS_RESEARCH | Tile | 벽타일 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | UNKNOWN | NEEDS_RESEARCH |  |
| NEEDS_RESEARCH | Waterproof | 도막방수 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | UNKNOWN | NEEDS_RESEARCH |  |
| NEEDS_RESEARCH | Bathroom Fixture | 양변기 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | UNKNOWN | NEEDS_RESEARCH |  |
| NEEDS_RESEARCH | Window | PVC 창호 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | NEEDS_RESEARCH | UNKNOWN | NEEDS_RESEARCH |  |

## Recommendation Rule

Do not recommend only by lowest price.

Recommendation must consider:

- supplier price
- payment condition
- lead time
- A/S responsibility
- defect rate
- urgent order capacity
- installer preference
- margin potential

## Score Template

| Score Item | Weight | Meaning |
|---|---:|---|
| Supplier Price | 25 | Real price competitiveness |
| Payment Condition | 15 | Cashflow impact |
| Lead Time | 15 | Schedule risk |
| Defect Responsibility | 20 | Claim and rework risk |
| Installer Preference | 10 | Execution quality |
| A/S Policy | 10 | Customer complaint response |
| Data Confidence | 5 | Source reliability |

## Decision Status

Use one of:

- `NEEDS_RESEARCH`
- `CALL_BACK_REQUIRED`
- `QUOTE_RECEIVED`
- `READY_FOR_COMPARISON`
- `READY_FOR_APPROVAL`
- `APPROVED_VENDOR`
- `REJECTED_VENDOR`

## Master DB Rule

Supplier comparison is not Master DB.

After comparison, create:

- `MasterDbUpdateRequest`
- evidence
- impact analysis
- rollback data
- CEO approval log
