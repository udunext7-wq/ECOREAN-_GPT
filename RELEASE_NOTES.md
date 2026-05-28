# ECOREAN BOC Release Notes

## Version: RC-0.3.0

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
