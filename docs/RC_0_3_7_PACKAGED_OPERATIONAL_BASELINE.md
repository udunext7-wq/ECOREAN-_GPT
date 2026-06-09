# RC-0.3.7 Packaged Operational Baseline

## Summary

- Baseline commit: `f3ff67e Build RC-0.3.7 desktop release package`
- Package source commit: `49a3b48 Finalize RC-0.3.7 merge documentation`
- New tag: `v0.3.7-rc-packaged`
- Final decision: `RC-0.3.7 packaged operational baseline 사용 가능`

## Existing Tags Preserved

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
- `v0.3.6-rc`
- `v0.3.6-rc-packaged`
- `v0.3.7-rc`

## Packaged App

- Executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Verified Flow

- packaged app launch
- Real Price Calibration Workbench
- queue item list and detail
- approval, rejection, and deferral
- review reason recording
- backup-before-apply protection
- Master Data direct change prevention
- price apply after successful backup
- old/new price history
- linked priority task update
- customer safety

## Workbench Result

- Queue summary/list/detail: PASSED.
- Approval: PASSED.
- Rejection: PASSED.
- Deferral: PASSED.
- Review reason recording: PASSED.
- Workbench report generation: PASSED.
- Linked entry points: PASSED.

## Backup And Master Data Safety

- Pending queue direct apply prevention: PASSED.
- Master Data remains unchanged before approval: PASSED.
- Master Data remains unchanged after approval and before backup: PASSED.
- Backup-before-apply: PASSED.
- Price apply after successful backup: PASSED.
- Old/new price history and backup id recording: PASSED.
- Linked priority task update: PASSED.

Master Data price updates remain limited to the approved Real Price Calibration backup/apply workflow.

## Customer Safety

- Customer safety: PASSED.
- Customer-facing payloads do not expose:
  - Real Price Calibration Workbench
  - queue and approval status
  - current or suggested price
  - price difference and variance
  - risk level and priority task
  - backup id
  - internal cost, margin, or PCE
  - vendor, labor, purchase, or receiving data
  - internal, profit, or risk score
  - detailed address, phone, email, or memo

## Final Verification

- Service JavaScript syntax checks: PASSED.
- `node tests/rc-0-3-7-packaged-release.smoke.js`: PASSED.
- `node tests/rc-0-3-7-branch-stabilization.smoke.js`: PASSED.
- `node tests/rc-0-3-7-real-price-calibration-ux.smoke.js`: PASSED.
- `node tests/rc-0-3-6-packaged-release.smoke.js`: PASSED.
- `node tests/rc-0-3-6-branch-stabilization.smoke.js`: PASSED.
- `node tests/rc-0-3-6-price-calibration-ux.smoke.js`: PASSED.
- `node tests/rc-0-3-5-price-readiness-impact.smoke.js`: PASSED.
- `node tests/real-project-intake.smoke.js`: PASSED.
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED.
- `node tests/lightbim-boc-release-flow.smoke.js`: PASSED.
- `npm run build:ui`: PASSED.
- `npm run smoke:prod`: PASSED.
- `npm run smoke:release`: PASSED.

Known non-blocking warnings:

- Vite bundle size warning.
- SQLite experimental warning.
- electron-builder metadata warning when packaging is run.
- Node DEP0190 warning when packaging is run.
- npm update notice when shown.

## Next Direction

- RC-0.3.8: 단가표 미매칭 자동 추천 고도화
- RC-0.4.0: CRM pipeline, 주소 API, 고객 포털, 일정 연동

## Operational Decision

`RC-0.3.7 packaged operational baseline 사용 가능`

The source release tag `v0.3.7-rc` remains preserved. The packaged Real Price Calibration Workbench operational baseline is fixed separately as `v0.3.7-rc-packaged`.
