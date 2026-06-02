# ECOREAN BOC Release Notes

## Version: RC-0.3.2

### RC-0.3.2 Real Project Intake Package Started

- Branch: `rc-0.3.2-real-project-intake`
- Purpose: prepare the first real customer/project data entry without changing RC-0.3.0 or RC-0.3.1 tags.
- Added structured intake flow for:
  - 고객 정보
  - 현장 정보
  - 공사 유형
  - 면적 / 공간 구성
  - 공사 범위
  - 예산 / 등급
  - 일정 희망일
  - LightBIM 도면 연결
  - 단가표 적용 여부
  - 견적/PCE 생성
  - 고객용 출력 전 내부정보 검사
  - 실제 프로젝트 입력 리포트
- Customer data handling: telephone, email, detailed address, and memo remain optional and are redacted in intake logs.
- Customer safety: customer output is blocked if internal cost, margin, PCE, vendor/labor/purchase/receiving, variance, calibration, backup path, onboarding/import/matching logs, approval queue, profit, or risk-score terms appear in customer payload.
- Status: package implementation started on RC-0.3.2 branch; not merged to main and not tagged.

### RC-0.3.2 First Real Project Intake Test

- Test date: 2026-05-30
- Intake ID: `RPI-RC032-FIRST-TEST`
- Test data path: `tests/user-test-data/rc-0.3.2/real-project-intake`
- Result: `접수 흐름 사용 가능`
- Price readiness: `PARTIAL`
- LightBIM connection: PASSED
- Estimate/PCE: PASSED, PCE decision `SCALE`
- Customer safety: PASSED
- Injected leak check: detailed address, internal cost, margin, and PCE were blocked with S1 issue creation.
- Documentation: `docs/RC_0_3_2_FIRST_REAL_PROJECT_INTAKE_TEST_REPORT.md`

### RC-0.3.2 Real Project Intake Branch Stabilization

- Branch: `rc-0.3.2-real-project-intake`
- Stabilization result: `MERGE_READY`
- Price readiness result: `PARTIAL`, allowed with warning and does not block estimate generation.
- LightBIM connection: PASSED, including project name, space count, total area, suggested estimate type, and warning count.
- Estimate/PCE: PASSED, PCE decision `SCALE` in stabilization smoke.
- Customer safety: PASSED.
- Privacy regression: detailed address, customer phone, customer email, memo, internal cost, margin, PCE, vendor/labor/purchase/receiving, variance, calibration, backup path, import rows, manual matching logs, approval queue, profit, and risk-score data are blocked from customer-facing payloads.
- Release smoke includes representative RC-0.3.2 intake checks.

### RC-0.3.2 Real Project Intake - Merged to Main

- Merge date: 2026-06-03
- Source branch: `rc-0.3.2-real-project-intake`
- Merge commit: `8875e3239110fe707077cf139432de585d050fc8`
- Included improvements:
  - Real Project Intake Center
  - customer/site/project intake validation
  - LightBIM connection from intake
  - price readiness check
  - estimate/PCE generation from intake
  - customer output safety check
  - detailed address, phone, email, and memo privacy filtering
- Tests passed:
  - `node tests/rc-0-3-2-branch-stabilization.smoke.js`
  - `node tests/rc-0-3-2-first-real-project-intake.smoke.js`
  - `node tests/real-project-intake.smoke.js`
  - `node tests/rc-0-3-1-packaged-release.smoke.js`
  - `node tests/price-import-manual-matching.smoke.js`
  - `node tests/lightbim-customer-safety-regression.smoke.js`
  - `node tests/lightbim-boc-release-flow.smoke.js`
  - `npm run build:ui`
  - `npm run smoke:prod`
  - `npm run smoke:release`
- Customer privacy/safety result: PASSED.
- Final decision: `RC-0.3.2 = main 반영 가능 / 실제 프로젝트 접수 흐름 사용 가능`.

## Version: RC-0.3.1

### RC-0.3.1 Operational Data Onboarding Started

- Branch: `rc-0.3.1-operational-data-onboarding`
- Baseline tag preserved: `v0.3.0-rc`
- Purpose: guide real operating data entry without changing the RC-0.3.0 operational baseline.
- Added workflow focus:
  - 실제 업체 정보 입력
  - 실제 자재/노무 단가표 가져오기
  - 단가 승인 및 Master Data 반영
  - 첫 실제 프로젝트 생성
  - 첫 LightBIM 도면 가져오기
  - 첫 견적/PCE 확인
  - 고객용 견적서와 내부 원가표 출력 확인
  - 고객 화면 내부정보 비노출 확인
  - 문제 기록 및 RC-0.3.1 수정 후보 정리
- Customer safety remains unchanged: onboarding issue details, backup paths, vendor data, labor cost, internal cost, margin, PCE, purchase/receiving data, variance, and calibration data are not customer-facing.

### RC-0.3.1 First Operational Data Onboarding Test

- Test date: 2026-05-29
- Branch: `rc-0.3.1-operational-data-onboarding`
- Onboarding run ID: `OOR-1780056032648-BDE1Y6`
- Result: `운영 시작 가능`
- Backup: `FULL-2026-05-29_210032`
- Material price CSV: 7 rows parsed, 6 matched, 1 intentionally unmatched.
- Labor rate CSV: 5 rows parsed, 5 matched.
- Price queue apply: approved updates were applied only after backup.
- First LightBIM project import: `LIGHTBIM-IMPORT-1780056034605`
- First estimate: `RC031-FIRST-OPERATIONAL-PROJECT`
- PCE decision: `SCALE`
- Customer safety: PASSED for customer estimate, client portal, customer proposal map, proposal board payload, and contract customer section.
- Deferred item: Vite bundle size warning remains non-blocking and is tracked for optimization.

### RC-0.3.1 Price Import Manual Matching UX

- Improved `단가표 일괄 가져오기` for unmatched and multiple-matched rows.
- Added Master Data candidate search for material, labor, equipment, standard estimate item, and package targets.
- Added manual match save flow:
  - `UNMATCHED` / `MULTIPLE_MATCHES`
  - search/select Master Data target
  - save as `MATCHED_MANUAL`
  - recalculate variance
  - make row eligible for approval Queue
- Added row exclusion flow with `EXCLUDED` status.
- Added queue readiness summary:
  - matched rows
  - manually matched rows
  - unmatched rows
  - multiple match rows
  - invalid rows
  - excluded rows
  - queue eligible rows
- Customer safety remains unchanged: import rows, match logs, unit cost, labor rate, variance, approval queue, and calibration history stay internal only.

### RC-0.3.1 Operational Data Onboarding Branch Stabilization

- Branch: `rc-0.3.1-operational-data-onboarding`
- Base tag preserved: `v0.3.0-rc`
- Stabilization decision: `MERGE_READY`
- Verified:
  - operational onboarding run creation and completion
  - full backup
  - material/labor CSV import
  - unmatched row manual matching
  - queue readiness after manual match
  - approval queue creation
  - backup before apply
  - Master Data price update
  - first LightBIM project import
  - estimate/PCE
  - customer/internal output separation
  - customer safety regression
- Deferred:
  - XLSX direct parsing
  - advanced fuzzy matching
  - new Master Data auto-create from unmatched rows
  - Vite bundle optimization
  - packaged app metadata cleanup

### RC-0.3.1 Operational Data Onboarding — Merged to Main

- Merge commit: `0da5513`
- Source branch: `rc-0.3.1-operational-data-onboarding`
- Base tag preserved: `v0.3.0-rc`
- Included improvements:
  - operational data onboarding center and 12-step workflow
  - first operational onboarding test package
  - price import manual matching for unmatched and multiple-matched rows
  - queue readiness and match log checks
  - stabilization smoke and MERGE_READY report
- Tests passed:
  - pre-merge RC-0.3.1 stabilization suite
  - post-merge main validation suite
  - `npm run build:ui`
  - `npm run smoke:prod`
  - `npm run smoke:release`
- Customer safety: PASSED. Customer-facing payloads do not expose internal cost, margin, PCE, vendor/labor data, purchase/receiving data, variance, calibration, backup paths, onboarding issues, import rows, manual matching logs, or approval queue details.
- Final decision: `RC-0.3.1 = main 반영 가능 / 운영 데이터 입력 개선 완료`
- Deferred:
  - XLSX direct parsing
  - advanced fuzzy matching
  - unmatched row new Master Data auto-create
  - Vite bundle optimization
  - package metadata cleanup

### RC-0.3.1 Desktop Release Package

- Package source commit: `d519304`
- Tag: `v0.3.1-rc`
- Packaging script: `npm run dist`
- Package type: `electron-builder --win --x64 --dir`
- Local package output: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked`
- Executable: `ECOREAN BOC CEO Dashboard.exe`
- Packaged launch result: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- userData path: `%APPDATA%\ecorean-boc-electron`
- DB path: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export path: `%APPDATA%\ecorean-boc-electron\export`
- backup path: `%APPDATA%\ecorean-boc-electron\backups`
- Verified:
  - RC-0.3.1 onboarding service and 12-step flow
  - price import manual matching smoke
  - customer safety regression
  - export folder creation
  - backup folder creation
  - production UI dist
- Customer safety: PASSED
- Final decision: `RC-0.3.1 패키지 실사용 가능`
- Binary policy: packaged binaries are generated locally under `electron/release` and are not committed.

### RC-0.3.1 First Real Project Run

- Test date: 2026-05-30
- Packaged app: `ECOREAN BOC CEO Dashboard.exe`
- Packaged launch: PASSED
- Dev server required: NO
- Project label: `RC-0.3.1 첫 실제 운영 테스트 프로젝트`
- Backup result: PASSED
- Price import/apply: PASSED, approved updates applied after backup
- LightBIM import: PASSED
- Estimate/PCE: PASSED, PCE decision `SCALE`
- Customer estimate/internal cost output: PASSED
- Contract/schedule/purchase order checks: PASSED
- Customer safety: PASSED
- Issues:
  - S1: none
  - S2: none
  - S3: real customer/site data was not provided, so safe test data was used
  - S4: known Vite bundle size and SQLite experimental warnings remain non-blocking
- Final decision: `첫 실제 프로젝트 운영 가능`

## Version: RC-0.3.0

### RC-0.3.0 Operational Release Candidate — Finalized

- Finalized date: 2026-05-29
- Validated functional commit: `1c421a6 Run RC-0.3.0 real price import user test`
- Final tag target: `v0.3.0-rc`
- Final decision: `RC-0.3.0 = 운영 기준선 사용 가능`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData path: `%APPDATA%/ecorean-boc-electron`
- DB path: `%APPDATA%/ecorean-boc-electron/storage/sqlite`
- export path: `%APPDATA%/ecorean-boc-electron/export`
- backup path: `%APPDATA%/ecorean-boc-electron/backups`

Confirmed flows:

- MiniCAD / LightBIM JSON export and BOC import
- LightBIM quantity review, override, traceability, space map, customer map
- Bathroom, kitchen, and full remodeling estimates
- PCE, contract, schedule, purchase order, material receiving, execution feedback
- Initial master data setup
- Real price calibration
- CSV price workbook import and real price import user test
- Customer/internal data separation
- Desktop packaged app real-use and persistence
- Backup/restore data safety

Final validation summary:

- Service syntax check: PASSED
- Real price import user test: PASSED
- Price workbook import: PASSED
- Real price calibration: PASSED
- Initial master data setup: PASSED
- Backup/restore data safety: PASSED
- Packaged real use: PASSED
- LightBIM BOC release flow: PASSED
- Customer safety regression: PASSED
- UI build: PASSED
- prod smoke: PASSED
- release smoke: PASSED

Known non-blocking warnings:

- Vite bundle size warning
- electron-builder description/author metadata warning
- SQLite experimental warning
- Node deprecation warning may appear depending on runtime

Known limitations:

- No automatic DWG/DXF parsing
- No full BIM editor
- No cloud sync
- No real-time multi-user collaboration
- No accounting/bank integration
- ComfyUI requires local server
- Customer portal public link is still local/token placeholder
- XLSX direct parsing deferred; CSV is supported

Next version direction:

- RC-0.3.1: XLSX direct import, price import matching polish, packaged metadata cleanup, bundle optimization, bugfixes.
- RC-0.4.0: LightBIM object editing, better DXF import/export, multi-project dashboard polish, accounting pre-layer.
- RC-1.0: installer/signing, production data migration policy, full backup/restore verification, customer portal deployment strategy.

### RC-0.3.0 LightBIM + BOC Release Flow

LightBIM is now stabilized as the spatial quantity source for the BOC operating flow. The release verifies the path from MiniCAD drawing export through estimate, execution planning, field feedback, traceability, and customer proposal output.

#### Completed LightBIM Modules

- MiniCAD LightBIM Core and `exportLightBIMJSON()`
- LightBIM JSON import and estimate draft creation
- Quantity calculation, review, and user override
- Estimate line item quantity binding and PCE recalculation
- Schedule duration and purchase order quantity binding
- Material receiving baseline and execution feedback
- Visual traceability and interactive internal space map
- Customer-safe proposal map and proposal board integration

#### RC-0.3.0 User Test Package

- Added the in-app `RC-0.3.0 사용자 테스트` center for starting test runs, recording evidence and severity, and completing a release verdict.
- Persists test runs and twelve release workflow steps in `user_test_runs` and `user_test_steps`.
- Stores the selected test scenario, including `전체 사용자 테스트`, on each run for clearer release audit history.
- Provides executable sample inputs in `tests/user-test-data/rc-0.3.0`.
- Provides checklist, bug report, acceptance criteria, and report templates in `docs/RC_0_3_0_*.md`.
- Release acceptance requires customer/internal data separation checks and no unresolved high-impact blocking defects.

#### RC-0.3.0 User Test Execution

- Test run: `UTRUN-RC030-1779961488230-1035`
- Scenario: `전체 사용자 테스트`
- Result: `실사용 가능`
- S1/S2 issues found: none.
- Fixed issue: `RC030-S3-001` added scenario persistence and display to the User Test Center.
- Deferred issue: `RC030-S4-001` Vite bundle size warning remains non-blocking and is tracked for later optimization.

#### RC-0.3.0 Desktop Release Package

- Packaging script used: `npm run dist` from `electron/`.
- Package output: `electron/release/win-unpacked`.
- Packaged executable: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`.
- Packaged launch check: PASSED, main window title `ECOREAN BOC CEO Dashboard`.
- Packaged userData path: `%APPDATA%/ecorean-boc-electron`.
- Packaged export folders created under `%APPDATA%/ecorean-boc-electron/export`.
- Release docs and manifest created under `release/RC-0.3.0`.
- Packaged readiness smoke: PASSED.
- Known warnings: Vite bundle size warning and electron-builder missing description/author warnings are non-blocking for RC-0.3.0.

#### RC-0.3.0 Packaged App Real Use Test

- Packaged app launch: PASSED.
- Dev server requirement: not required in packaged mode.
- userData path: `%APPDATA%/ecorean-boc-electron`.
- Export path: `%APPDATA%/ecorean-boc-electron/export`.
- LightBIM import in packaged environment: PASSED.
- Estimate/PCE result: FULL_REMODELING estimate created, PCE `SCALE`.
- Export result: customer estimate PDF, internal estimate Excel, and proposal board PDF created in userData export folders.
- Persistence result: saved estimate remained available after packaged service restart and could export again.
- Customer safety result: PASSED.
- Fixed packaged-only S1 issue `RC030-S1-001`: repeated packaged userData initialization no longer causes `company_cashflow_forecast.forecast_id` duplicate errors.
- Final packaged decision: `패키지 실사용 가능`.

#### RC-0.3.0 Backup Restore and Data Safety Layer

- Added internal `백업 / 복구 센터` for RC-0.3.0 packaged desktop use.
- Backup root: `%APPDATA%/ecorean-boc-electron/backups`.
- Supported backup types:
  - DB backup under `backups/db`
  - Export folder backup under `backups/export`
  - Full userData backup under `backups/full`
  - Pre-update full backup placeholder
- Each backup generates a manifest under `backups/manifests` and a `backup_history` record in SQLite.
- Current DB validation checks DB file presence, openability, key table availability, and SQLite `PRAGMA integrity_check`.
- Restore is intentionally plan-first in RC-0.3.0 and does not silently overwrite current operating data.
- Backup controls are internal-only and are not exposed to customer portal or customer proposal map screens.
- Limitation: no cloud backup, external storage integration, account login, or automatic remote restore in RC-0.3.0.

#### RC-0.3.0 Initial Master Data Setup Package

- Added internal `초기 기준 데이터 세팅` center for preparing editable RC-0.3.0 starting data.
- Seeds process, material, labor, equipment, standard estimate item, and default estimate package data with source marker `INITIAL_RC_0_3_0`.
- Adds seed tracking through `initial_master_data_seed_logs`.
- Adds default packages through `estimate_default_packages`.
- Seed execution is idempotent and does not overwrite existing edited rows unless explicitly requested.
- Full setup creates a pre-seed backup through the local backup restore service when available.
- All starting prices are marked as estimated / needs update and must be calibrated against real vendor and labor conditions before live use.
- Documentation added in `docs/RC_0_3_0_INITIAL_MASTER_DATA_SETUP.md`.

#### RC-0.3.0 Real Price Calibration Package

- Added internal `실제 단가 보정` center for replacing estimated defaults with user-entered real vendor, purchase, and labor prices.
- Adds `real_price_update_queue` and `real_price_update_history`.
- Supports NEEDS_UPDATE price lists, HIGH/MEDIUM/LOW priority classification, vendor quote input, actual purchase input, labor rate input, variance analysis, approval, backup, and apply.
- Approved prices are applied only after backup and are recorded in history with old/new price values.
- Updated master records move from `NEEDS_UPDATE` to `CONFIRMED`.
- Customer-facing views remain separated and do not expose vendor quote details, internal unit cost, labor rate, price variance, approval queue, or calibration history.
- Documentation added in `docs/RC_0_3_0_REAL_PRICE_CALIBRATION_GUIDE.md`.

#### RC-0.3.0 Price Workbook Import Layer

- Added internal `단가표 일괄 가져오기` center for bulk CSV price input.
- Supports 자재 단가표, 업체 견적 단가표, 실제 매입 단가표, 노무 단가표, 장비 단가표, 표준 견적 품목 단가표 import types.
- Adds `price_workbook_imports` and `price_workbook_import_rows` for import audit history.
- Provides Korean CSV templates under `templates/price-import`.
- Import flow parses, previews, infers columns, validates rows, matches master data, calculates variance, and creates `PENDING_REVIEW` queue items.
- Imported prices do not update master data directly; approval, backup, and apply remain in the Real Price Calibration Center.
- Customer-facing screens do not expose imported vendor quotes, unit cost, labor rates, variance, approval queue, import history, or calibration history.
- Limitation: CSV is the primary supported format in RC-0.3.0. XLSX is available only if a local parser dependency is present; no external market verification is performed.
- Documentation added in `docs/RC_0_3_0_PRICE_WORKBOOK_IMPORT_GUIDE.md`.

#### RC-0.3.0 Real Price Import User Test

- Added realistic user-test CSV files under `tests/user-test-data/rc-0.3.0/price-import`.
- Verified material, vendor quote, actual purchase, labor rate, and standard estimate item CSV import flows.
- Verified column mapping, master data matching, unmatched/invalid row handling, variance analysis, and approval queue creation.
- Verified imported prices are not applied before approval.
- Verified approval applies updates only after backup and records old/new price history.
- Verified updated material, labor, and standard estimate item prices appear in master data and the next estimate can read updated master data or safely fallback.
- Verified customer-facing payloads hide vendor quote, unit cost, labor rate, price variance, approval queue, import history, calibration history, internal cost, margin, and PCE.
- Final result: `실사용 가능`.
- Deferred: XLSX parser support and automatic new master-data creation for unmatched rows.

#### Verified End-To-End Flow

`MiniCAD / LightBIM -> JSON Export -> BOC Import -> Quantity Review -> Estimate / PCE -> Contract -> Schedule -> Purchase Order -> Material Receiving -> Execution Feedback -> Traceability -> Space Map -> Customer Proposal Map -> Proposal Board / Export -> Project Closing / Calibration`

#### Export Paths

- `export/estimates`
- `export/contracts`
- `export/schedules`
- `export/purchase-orders`
- `export/visualizations`
- `export/boards`
- `export/reports`
- `export/lightbim`

Development builds use the project export directory. Packaged Electron builds use the application `userData/export` directory.

#### Customer / Internal Separation

- Customer-facing portal, proposal map, estimate, contract sections, and proposal board must not expose internal cost, margin, PCE, vendor, labor, purchasing, receiving, variance, calibration, profit, or risk-score fields.
- Internal quantity review, execution feedback, traceability, and space-map views remain operational control surfaces.
- Customer proposal exports use sanitized payloads before PDF generation.

#### Validation Commands

```powershell
Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }
node tests/lightbim-boc-release-flow.smoke.js
node tests/lightbim-customer-safety-regression.smoke.js
node tests/lightbim-proposal-board-integration.smoke.js
node tests/lightbim-customer-proposal-map.smoke.js
node tests/lightbim-interactive-space-map.smoke.js
node tests/lightbim-traceability.smoke.js
node tests/lightbim-execution-feedback.smoke.js
node tests/lightbim-schedule-purchase-binding.smoke.js
node tests/lightbim-quantity-review.smoke.js
node tests/lightbim-quantity-binding.smoke.js
node tests/lightbim-quantity-accuracy.smoke.js
node tests/rc-0-3-0-user-test-package.smoke.js
cd electron
npm run build:ui
npm run smoke:prod
npm run smoke:release
```

#### Known Limitations

- No external DWG/DXF automatic parsing.
- No full BIM object editor.
- No real-time multi-user collaboration.
- No accounting or bank transfer integration.
- ComfyUI requires a local server when used.
- Customer portal link remains a local/token placeholder.
- Vite bundle size warning is non-blocking for RC-0.3.0 and is a future optimization target.

---

## Version: RC-0.2.0

### Stability Goal

BOC core release hardening for crash-proof startup, stable schemas, contract/payment execution, site operation continuity, and production smoke validation.

### Included Modules

- CEO Control Tower and drawer navigation
- Estimate and PCE foundation
- Bathroom, kitchen, and full remodeling estimate wizards
- Customer and internal estimate PDF/Excel export
- Contract generation and contract PDF export
- Schedule and purchase order generation
- Site execution, daily reports, change orders, inspections, defect handling, and receiving
- Payment / cashflow control
- Communication Center, Floorplan Center, AI Visualization Center, and Board Generation Center
- Release readiness checks, diagnostics, backup/restore, and internal test-mode environment tools

