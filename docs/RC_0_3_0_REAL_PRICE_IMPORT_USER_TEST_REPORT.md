# RC-0.3.0 Real Price Import User Test Report

## Test Summary

- Test date: 2026-05-29
- Version: RC-0.3.0
- Baseline commit: `90a252a Add RC-0.3.0 price workbook import layer`
- Environment: Local desktop smoke / SQLite test userData
- Scenario: 실제 단가표 가져오기 테스트
- Final decision: 실사용 가능

## Imported Files

| File | Import Type | Rows | Matched | Unmatched / Invalid | Queue Created |
| --- | --- | ---: | ---: | ---: | ---: |
| `material-price-real-test.csv` | 자재 단가표 | 8 | 6 | 2 | 6 |
| `vendor-quote-real-test.csv` | 업체 견적 단가표 | 4 | 4 | 0 | 4 |
| `labor-rate-real-test.csv` | 노무 단가표 | 5 | 5 | 0 | 5 |
| `actual-purchase-real-test.csv` | 실제 매입 단가표 | 3 | 3 | 0 | 3 |
| `standard-item-price-real-test.csv` | 표준 견적 품목 단가표 | 4 | 4 | 0 | 4 |

## Workflow Result

- CSV import: PASSED
- Required column mapping: PASSED
- Master data matching: PASSED
- Unmatched row handling: PASSED
- Invalid row handling: PASSED
- Variance analysis: PASSED
- Approval queue creation: PASSED
- No price applied before approval: PASSED
- Approval and backup-before-apply: PASSED
- Master data price update: PASSED
- Update history old/new price: PASSED
- Estimate impact check: PASSED
- Customer safety check: PASSED

## Applied Verification

Approved and applied sample queue items:

- `기본 벽타일` material price
- `벽타일` bathroom standard estimate item price
- `타일공` labor rate

Verification:

- `material_master.latest_unit_price` changed after apply.
- `standard_estimate_items.default_customer_unit_price` changed after apply.
- `labor_master.default_daily_wage` changed after apply.
- Applied rows changed `price_status` to `CONFIRMED`.
- `real_price_update_queue.status` changed to `APPLIED`.
- `real_price_update_history` recorded old/new price.
- `backup_id` existed on applied queue/history path.

## Estimate Impact

Test estimates were recalculated after apply:

- Bathroom estimate: PCE ran.
- Kitchen estimate: PCE ran.
- Full remodeling estimate: PCE ran.

Bathroom estimate master data summary included the updated `벽타일` standard item price.

## Customer Safety

Customer-facing payloads were checked for forbidden internal price data.

Forbidden data remained hidden:

- vendor quote
- unit cost
- labor rate
- price variance
- approval queue
- import history
- calibration history
- internal cost
- margin
- PCE

## Issues Found

No S1/S2 issues found.

No blocking S3 issue found.

## Deferred Issues

- XLSX import remains optional and depends on local parser dependency. CSV is the supported RC-0.3.0 path.
- Advanced fuzzy matching and external market price verification are deferred by scope.

## Final Decision

실사용 가능

CSV 단가표 가져오기부터 승인, 백업, 마스터 데이터 반영, 다음 견적 영향, 고객 안전성까지 통과했다.
