# RC-0.3.6 Final Merge Report

## Summary

- Source branch: `rc-0.3.6-price-calibration-ux`
- Base tags:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
  - `v0.3.2-rc`
  - `v0.3.2-rc-packaged`
  - `v0.3.3-rc`
  - `v0.3.3-rc-packaged`
  - `v0.3.4-rc`
  - `v0.3.4-rc-packaged`
  - `v0.3.5-rc`
  - `v0.3.5-rc-packaged`
- Merge date: 2026-06-08
- Merge commit: `74894f0 Merge RC-0.3.6 price calibration UX branch`
- Included commits:
  - `11963f4 Start RC-0.3.6 price calibration UX`
  - `50d7556 Stabilize RC-0.3.6 price calibration UX branch`

## Implemented Screen And Service

- Screen: `단가 보정 우선순위 센터`
- UI view: `ui/app/pricing/PriceCalibrationPriorityCenterView.tsx`
- Backend service: `electron/services/priceCalibrationPriorityService.js`
- UI service wrapper: `ui/services/pricing-service/priceCalibrationPriorityService.ts`
- IPC/preload methods:
  - `getPriceCalibrationPrioritySummary`
  - `getPriceCalibrationPriorityItems`
  - `createCalibrationTaskFromImpact`
  - `markCalibrationTaskReviewed`
  - `linkCalibrationTaskToPriceQueue`
  - `createPriceCalibrationPriorityReport`

## Priority Results

| Estimate type | PARTIAL result | NEEDS_UPDATE result |
| --- | --- | --- |
| BATHROOM | `MEDIUM / 대표 검토 필요` | `BLOCKING / 즉시 보정 필요` |
| KITCHEN | `HIGH / 견적 전 보정 권장` | `BLOCKING / 즉시 보정 필요` |
| FULL_REMODELING | `HIGH / 견적 전 보정 권장` | `BLOCKING / 즉시 보정 필요` |

READY status remains `LOW / 확인 완료`.

## Calibration Task Result

- Calibration task creation: PASSED.
- Task review: PASSED.
- Task status flow:
  - `PENDING`
  - `REVIEWED`
  - `LINKED_TO_QUEUE`

## Price Queue Link Result

- Price queue link: PASSED.
- Linked price queue remains `PENDING_REVIEW`.
- No automatic approval occurs.
- No automatic apply occurs.

## Master Price Protection

- Result: PASSED.
- RC-0.3.6 priority task and queue creation do not directly update Master Data prices.
- Master Data price updates remain limited to the existing Real Price Calibration approval, backup, and apply workflow.

## Customer Safety Result

- Result: PASSED.
- Customer-facing payloads do not expose:
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

## smoke:release Path Verification

- Result: PASSED.
- `npm run smoke:release` runs successfully from the `electron` folder.
- The script anchors `tests/release-candidate.smoke.js` to the repository root to avoid cwd-dependent release smoke hangs.

## Test Results

- Pre-merge validation: PASSED.
- Post-merge validation on `main`: PASSED.
- `node --check electron/services/*.js`: PASSED.
- `node tests/rc-0-3-6-branch-stabilization.smoke.js`: PASSED.
- `node tests/rc-0-3-6-price-calibration-ux.smoke.js`: PASSED.
- `node tests/rc-0-3-5-packaged-release.smoke.js`: PASSED.
- `node tests/real-project-intake.smoke.js`: PASSED.
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED.
- `node tests/lightbim-boc-release-flow.smoke.js`: PASSED.
- `npm run build:ui`: PASSED.
- `npm run smoke:prod`: PASSED.
- `npm run smoke:release`: PASSED.

Known non-blocking warnings:

- Vite bundle size warning.
- SQLite experimental warning.
- Node / Electron metadata warnings if emitted by packaging.

## Known Deferred Items

- 실제 단가 보정 UX 추가 고도화.
- 단가표 미매칭 자동 추천 고도화.
- LightBIM 수량 검토 UX.
- PCE 해석 안내.
- CRM pipeline.
- Address API.
- Customer portal deployment.
- Calendar integration.
- Cloud sync.
- Bundle optimization.

## Final Decision

`RC-0.3.6 = 단가 보정 우선순위 UX main 반영 가능`

RC-0.3.6 is ready to tag as `v0.3.6-rc` after main push.
