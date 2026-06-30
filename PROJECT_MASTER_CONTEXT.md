# Project Master Context

## v0.5.0 User Roles & Permissions

- Branch: `v0.5.0-user-roles-permissions`
- Base official version: `v0.4.6`
- Scope: local/internal RBAC only; no external OAuth/Auth0/Firebase/Supabase integration.
- Roles: `CEO`, `ADMIN`, `MANAGER`, `STAFF`, `SITE_CREW`, `CLIENT_VIEWER`, `READ_ONLY_AUDITOR`.
- Permissions: 28 dot-notation permission keys with default-deny evaluation.
- Guards: route, menu, output, customer data sanitizer, audit redaction.
- UI: role badge, `사용자 역할 및 권한 센터`, access denied view.
- Validation: v0.5.0 smoke, customer safety, v0.4.6/v0.4.5/RC-0.4.4 regression, `build:ui`, `smoke:prod`, `smoke:release:diagnose`, and `smoke:release` passed.
- Decision: `MERGE_READY`.
- Main merge/tag/release: not performed.

## v0.4.6 Official Acceptance

- Official version: `v0.4.6`
- Acceptance decision: `ACCEPTED_WITH_WARNINGS`
- RC tag: `v0.4.6-rc`
- RC target: `59f646968e7de4aa6c1392216f8c9444a49d6bf8`
- RC package docs commit: `88d2e4e`
- Official `v0.4.5` remains preserved.
- Packaged visual click, safe screenshot, pixel/layout, PDF Korean typography, Poppler render, and customer safety passed.
- P0/P1/P2: none.
- P3: Excel native viewer pixel automation and OS print dialog automation.
- GitHub Release / release asset: `NOT_CREATED` in the acceptance step.
- Official `v0.4.6` tag is created only after this acceptance document is committed and main is synced.

## v0.4.6 Active QA Branch

- Branch: `v0.4.6-packaged-visual-click-output-typography-qa`
- Base: official `v0.4.5`
- Goal: close packaged click, safe screenshot, pixel comparison, and PDF Korean typography P3 gaps.
- Packaged clicks: LightBIM, CRM, Client Portal passed against the real packaged renderer.
- Screenshot policy: app viewport only, isolated synthetic userData, no desktop capture.
- PDF: runtime Korean font embedding and Poppler render passed.
- Customer safety: passed for packaged customer route and PDF/XLSX/print outputs.
- Current decision: `MERGE_READY`

## Current Operational Baseline

- Product: ECOREAN BOC CEO Dashboard
- Official version: `v0.4.5`
- Branch: `main`
- Official release commit: Acceptance QA documentation commit
- Official tag: `v0.4.5`
- Source RC tag: `v0.4.5-rc`
- Previous official tag: `v0.4.4`
- Previous official tag target: `36aaa3d98b26743a828a879d878b142e9e003905`
- GitHub Release: `https://github.com/udunext7-wq/ECOREAN-_GPT/releases/tag/v0.4.5`

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
- GitHub Release / asset upload: completed for official `v0.4.5`.
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
# v0.5.0 Work In Progress

- Branch: `v0.5.0-user-roles-permissions`
- Base: official `v0.4.6`
- Scope: local/internal user roles, permission matrix, route/menu/output guards, customer data filtering, and permission audit.
- Roles: CEO, ADMIN, MANAGER, STAFF, SITE_CREW, CLIENT_VIEWER, READ_ONLY_AUDITOR.
- External authentication: disabled and out of scope.
- Existing v0.4.6 tags and GitHub Release remain unchanged.
