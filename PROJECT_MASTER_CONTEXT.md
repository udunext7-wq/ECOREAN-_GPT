# Project Master Context

## Current Operational Baseline

- Product: ECOREAN BOC CEO Dashboard
- Official version: `v0.4.5`
- Branch: `main`
- Official release commit: Acceptance QA documentation commit
- Official tag: `v0.4.5`
- Source RC tag: `v0.4.5-rc`
- Previous official tag: `v0.4.4`
- Previous official tag target: `36aaa3d98b26743a828a879d878b142e9e003905`
- GitHub Release: `NOT_CREATED` for v0.4.5 in this acceptance step

## Runtime Paths

- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Baseline Capabilities

- CEO Control Tower and operational decision summaries.
- Real Project Intake with customer safety filtering.
- Estimate workflows for bathroom, kitchen, and full remodeling.
- LightBIM import, quantity review, estimate/PCE linkage, and customer-safe payloads.
- Price workbook import, manual matching, calibration priority, real price workbench, and recommendation scoring.
- CRM pipeline, next-action automation, address normalization readiness, customer portal internal draft, and calendar/site survey sync readiness.
- Backup/restore, export folders, and packaged app launch without a development server.

## Current Acceptance Status

- v0.4.5 official acceptance decision: `ACCEPTED_WITH_WARNINGS`.
- v0.4.5 official tag: to be created after acceptance documentation commit.
- GitHub Release / asset upload: `NOT_CREATED`.
- Packaged EXE launch: PASS, 2 runs.
- Customer safety regression: PASS.
- EXE SHA256: `FFA455C9E224A74695F46767D2A5D3A5DB0038FFA56275A489E70A5FDAEAD06C`.
- app.asar SHA256: `879B876C0D0AC58362C8288DFECD82DFAB10F25A1AA71120986D290F3DC95051`.
- Full visual click QA: PARTIAL; v0.4.5 added packaged launch/source-label/customer-safety harness.
- `smoke:release`: v0.4.5 diagnostics isolate each smoke in a bounded child process and remove the aggregate timeout; official acceptance npm `smoke:release` completed in 147053 ms.
- Output artifact QA: v0.4.5 added PDF/XLSX/print synthetic artifact structure and customer-safety checks.

## Development Rule After v0.4.4

- Do not move `v0.4.4`, `v0.4.4-rc`, or `v0.4.4-rc-packaged`.
- Treat v0.4.4 as the operational baseline.
- P0/P1 discovered after release must be handled as hotfix work.
- v0.4.5 should remain small and focus on QA automation and operational reliability.

## v0.4.5 Acceptance Summary

- RC tag: `v0.4.5-rc`
- RC target: `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`
- RC package docs commit: `c46f378`
- Scope: release smoke diagnostics, packaged visual QA harness, output artifact QA, customer/internal separation reinforcement.
- Current decision: `ACCEPTED_WITH_WARNINGS`.
- P0/P1: none.
- P2: none open.
- P3 deferred: packaged click automation, pixel screenshot comparison, safe screenshot capture mode, PDF Korean typography.
