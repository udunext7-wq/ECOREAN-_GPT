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
