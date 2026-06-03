# RC-0.3.2 Packaged Real Project Intake Run Report

## 기본 정보

- Test date: 2026-06-03
- Branch: `main`
- Commit: `d85f678 Build RC-0.3.2 desktop release package`
- Tag: `v0.3.2-rc`
- Packaged exe path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Production data path: `%APPDATA%\ecorean-boc-electron`

## Packaged App Launch Result

- Launch result: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED
- Verified packaged feature signal:
  - `실제 프로젝트 접수`
  - `백업 / 복구 센터`
  - `LightBIM 도면 가져오기`
  - `자동견적 시작`

## Backup Result

- Backup type: FULL userData backup
- Backup ID: `FULL-2026-06-03_154750`
- Manifest path: `%APPDATA%\ecorean-boc-electron\backups\manifests\boc_backup_manifest_FULL-2026-06-03_154750.json`
- backup_history record: PASSED
- Backup path policy: under `%APPDATA%\ecorean-boc-electron\backups`
- Result: PASSED

## Intake Result

- Intake ID: `RPI-RC032-PACKAGED-REAL-TEST`
- Customer name: `테스트 고객`
- Site name: `RC-0.3.2 패키지 접수 테스트 현장`
- Estimate type: `FULL_REMODELING`
- Area: `84㎡`
- Budget grade: `STANDARD`
- Construction scope:
  - 철거
  - 욕실
  - 주방
  - 바닥
  - 도배
  - 조명
- Draft creation: PASSED
- Missing required field blocking: PASSED
- Completed intake validation: `READY_FOR_ESTIMATE`
- Intake list visibility: PASSED

## LightBIM Result

- LightBIM connection: PASSED
- LightBIM import ID: `LIGHTBIM-IMPORT-1780469270192`
- Project name: PASSED
- Space count: PASSED
- Total area: PASSED
- Suggested estimate type: PASSED
- Quantity warning count: available in LightBIM summary
- User-selected estimate type overwrite: NOT overwritten

## Price Readiness Result

- Status: `PARTIAL`
- Korean label: returned by service
- Decision: allowed with warning
- Estimate generation blocking: NO

## Estimate / PCE Result

- Estimate generation: PASSED
- Estimate ID: `INTAKE-FULL_REMODELING-1780469270225`
- Line item / estimate payload: PASSED
- LightBIM quantity or fallback path: PASSED
- PCE execution: PASSED
- PCE decision: `SCALE`
- Total/cost/margin calculation crash: none observed

## Customer Safety Result

PASSED.

Customer-facing payload blocks or hides:

- `detailed_address`
- `customer_phone`
- `customer_email`
- `memo`
- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- actual used quantity
- variance
- calibration
- backup path
- onboarding issue details
- import rows
- manual matching logs
- approval queue
- internal
- profit
- risk_score

Injected sensitive payload created an S1 issue and blocked customer output as expected.

## Output Result

- Intake report generation: PASSED
- Report path in smoke: `C:\Users\udune\AppData\Local\Temp\boc-rc032-packaged-intake-run-hqwSm1\docs\RC_0_3_2_REAL_PROJECT_INTAKE_REPORT_RPI-RC032-PACKAGED-REAL-TEST.md`
- Customer estimate PDF: readiness covered by existing export/release smoke
- Internal cost Excel: readiness covered by existing export/release smoke
- Export path policy: packaged app uses `%APPDATA%\ecorean-boc-electron\export`

## Restart / Persistence Result

- App relaunch check: PASSED
- Service restart simulation: PASSED
- Intake data persisted after recreating the intake service against the same packaged-run data set.
- Backup folders persisted under `%APPDATA%\ecorean-boc-electron\backups`.

## Issues Found

### S1

- 없음

### S2

- 없음

### S3

- 없음

### S4

- Vite bundle size warning: non-blocking
- SQLite experimental warning: non-blocking
- electron-builder metadata warning: non-blocking
- Node DEP0190 warning during packaging: non-blocking

## Tests Run

- `node --check electron/services/*.js`
- `node tests/rc-0-3-2-packaged-real-project-intake-run.smoke.js`
- `node tests/rc-0-3-2-packaged-release.smoke.js`
- `node tests/rc-0-3-2-branch-stabilization.smoke.js`
- `node tests/real-project-intake.smoke.js`
- `node tests/lightbim-customer-safety-regression.smoke.js`
- `npm run build:ui`
- `npm run smoke:prod`
- `npm run smoke:release`

## Final Decision

`패키지 접수 흐름 사용 가능`

RC-0.3.2 packaged executable includes and validates the real project intake flow without requiring a dev server. Customer/internal data separation remains intact.
