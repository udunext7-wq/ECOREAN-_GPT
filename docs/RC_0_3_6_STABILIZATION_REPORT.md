# RC-0.3.6 Price Calibration UX Stabilization Report

## Summary

- Branch: `rc-0.3.6-price-calibration-ux`
- Base tag: `v0.3.5-rc-packaged`
- Latest implementation commit: `11963f4 Start RC-0.3.6 price calibration UX`
- Stabilization decision: `MERGE_READY`

## Implemented Screen And Service

- UI: `단가 보정 우선순위 센터`
- View: `ui/app/pricing/PriceCalibrationPriorityCenterView.tsx`
- Service: `electron/services/priceCalibrationPriorityService.js`
- IPC/preload methods:
  - `getPriceCalibrationPrioritySummary`
  - `getPriceCalibrationPriorityItems`
  - `createCalibrationTaskFromImpact`
  - `markCalibrationTaskReviewed`
  - `linkCalibrationTaskToPriceQueue`
  - `createPriceCalibrationPriorityReport`

## Priority Results

| Estimate type | READY | PARTIAL | NEEDS_UPDATE |
| --- | --- | --- | --- |
| BATHROOM | LOW / 확인 완료 | MEDIUM / 대표 검토 필요 | BLOCKING / 즉시 보정 필요 |
| KITCHEN | LOW / 확인 완료 | HIGH / 견적 전 보정 권장 | BLOCKING / 즉시 보정 필요 |
| FULL_REMODELING | LOW / 확인 완료 | HIGH / 견적 전 보정 권장 | BLOCKING / 즉시 보정 필요 |

## Calibration Task Result

- Calibration task creation: PASSED.
- Task review: PASSED.
- Review status flow:
  - `PENDING`
  - `REVIEWED`
  - `LINKED_TO_QUEUE`

## Price Queue Link Result

- Price queue link: PASSED.
- Linked queue status remains `PENDING_REVIEW`.
- No automatic approval is performed.
- No automatic apply is performed.

## Master Price Protection

- Result: PASSED.
- `PriceCalibrationPriorityCenter` and `priceCalibrationPriorityService` do not directly update Master Data prices.
- Master price update remains limited to the existing Real Price Calibration approval, backup, and apply workflow.

## Customer Safety Result

- Result: PASSED.
- Customer-safe priority payload does not expose:
  - price calibration priority
  - `risk_level`
  - fallback price
  - `current_price`
  - `suggested_price`
  - internal cost
  - margin
  - PCE
  - vendor / labor / purchase / receiving data
  - approval queue
  - internal / profit / risk_score
  - detailed address / phone / email / memo

## package.json smoke:release Verification

- Result: PASSED.
- `npm run smoke:release` now runs from the `electron` folder and resolves the release smoke from the repository root.
- `npm run build:ui`: PASSED.
- `npm run smoke:prod`: PASSED.
- `npm run smoke:release`: PASSED.
- Known warning: Vite bundle size warning.
- Known warning: SQLite experimental warning.

## Issues Found

- S1: none.
- S2: release smoke cwd/path instability was found during the RC-0.3.6 start validation and fixed by anchoring the release smoke path to the repository root.
- S3/S4: none requiring merge block.

## Fixed Issues

- `electron/package.json` `smoke:release` script now changes to the repository root and requires `tests/release-candidate.smoke.js` through an absolute path.

## Deferred Items

- Advanced calibration batch UX.
- New master-data creation from unmatched pricing rows.
- Bundle splitting / Vite chunk optimization.
- Deeper PCE explanation polish.

## Merge Readiness Decision

`MERGE_READY`

RC-0.3.6 is ready to merge after final maintainer review because priority calculation, task creation, price queue linkage, master-price protection, customer safety, and release smoke stability pass.
