# RC-0.3.7 Final Merge Report

## Merge

- Source branch: `rc-0.3.7-real-price-calibration-ux`
- Merge date: 2026-06-09
- Merge commit: `35c1a09609d1aec7b5f388d9b6a0f1d78de5793f`
- Base tag: `v0.3.6-rc-packaged`
- Included commits:
  - `5f21a6f` Start RC-0.3.7 real price calibration UX
  - `9f46c7e` Stabilize RC-0.3.7 real price calibration UX branch

## Included

- Real Price Calibration Workbench
- Queue summary, list, and detail
- Approve, reject, and defer actions with reason records
- Backup-backed apply
- Old/new price and backup id history
- Linked price calibration priority task status updates
- CEO Dashboard, Drawer, pricing, import, and Master Data entry points
- Customer-safe workbench payload

## Safety Results

- `PENDING_REVIEW` direct apply prevention: PASSED
- Master Data protection before approval: PASSED
- Master Data protection after approval and before backup: PASSED
- Master Data update only after successful backup: PASSED
- Old/new price history: PASSED
- Linked priority task update: PASSED
- Customer safety: PASSED
- Unresolved S1/S2: none

## Test Results

- Service syntax checks: PASSED before and after merge
- RC-0.3.7 stabilization smoke: PASSED before and after merge
- RC-0.3.7 workbench smoke: PASSED before and after merge
- RC-0.3.6 and RC-0.3.5 price regressions: PASSED before merge
- Real Project Intake regression: PASSED before and after merge
- LightBIM customer safety regression: PASSED before and after merge
- LightBIM BOC release flow: PASSED before and after merge
- `npm run build:ui`: PASSED before and after merge
- `npm run smoke:prod`: PASSED before and after merge
- `npm run smoke:release`: PASSED before and after merge

## Known Warnings

- Vite bundle size warning
- Node SQLite experimental warning

## Final Decision

`RC-0.3.7 = main 반영 완료 / release candidate tag 생성 가능`
