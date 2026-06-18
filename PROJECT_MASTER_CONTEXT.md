# Project Master Context

## Current Operational Baseline

- Product: ECOREAN BOC CEO Dashboard
- Official version: `v0.4.4`
- Branch: `main`
- Official release commit: `36aaa3d98b26743a828a879d878b142e9e003905`
- Official tag: `v0.4.4`
- Packaged baseline tag: `v0.4.4-rc-packaged`
- Source RC tag: `v0.4.4-rc`
- GitHub Release: `https://github.com/udunext7-wq/ECOREAN-_GPT/releases/tag/v0.4.4`

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

- Official release created: PASS.
- Packaged EXE launch: PASS.
- Customer safety regression: PASS.
- Release asset checksum match: PASS.
- Full visual click QA: PARTIAL.
- `smoke:release`: TIMEOUT in current run; focused release and safety smokes passed.

## Development Rule After v0.4.4

- Do not move `v0.4.4`, `v0.4.4-rc`, or `v0.4.4-rc-packaged`.
- Treat v0.4.4 as the operational baseline.
- P0/P1 discovered after release must be handled as hotfix work.
- v0.4.5 should remain small and focus on QA automation and operational reliability.

