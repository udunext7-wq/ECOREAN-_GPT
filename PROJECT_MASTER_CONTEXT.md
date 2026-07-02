# Project Master Context

## v0.5.1 RBAC UX & Audit Viewer Refinement

- Branch: `v0.5.1-rbac-ux-audit-viewer`
- Base official version: `v0.5.0`
- Official v0.5.0 tag target: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- GitHub Release: `https://github.com/udunext7-wq/ECOREAN-_GPT/releases/tag/v0.5.0`
- Main merge: completed
- Merge commit: `4d69cd4`
- Final merge report: `docs/V0_5_1_FINAL_MERGE_REPORT.md`
- Goal: make the v0.5.0 RBAC foundation operable through clearer role, permission, audit, denied-reason, and visibility-preview UX.
- Role Management UX: role summaries, local role simulation warning, role-change audit.
- Permission Center UX: 7 roles / 28 permissions matrix, search, role filter, dangerous permission highlighting.
- Audit Viewer: denied, role-change, internal-cost, margin, customer-output, and internal-output event filters.
- Access Denied: safe Korean reason without internal route path, DB path, token, provider payload, or raw customer data.
- Visibility Preview: role-based customer/internal payload sanitizer preview.
- External auth/provider: `DISABLED`.
- Validation: v0.5.1 smoke, v0.5.0 RBAC regression, customer safety, historical regressions, and Electron build/release smoke passed.
- Decision: `MERGE_READY`.
- Next: v0.5.1 RC Desktop Package verification, then official acceptance QA.

## v0.5.0 User Roles & Permissions

- Branch: `v0.5.0-user-roles-permissions`
- Base official version: `v0.4.6`
- Main merge commit: `d0004ff`
- RC package docs commit: `268a5f9`
- RC package status: `PASSED`
- Official acceptance: `ACCEPTED_WITH_WARNINGS`
- Official acceptance QA document: `docs/V0_5_0_OFFICIAL_ACCEPTANCE_QA.md`
- Packaged EXE SHA-256: `A9FD5B48BFF85DA2AEC1D3182509ABFEC4A5B513CB09EE8DF6D5303E39B62B86`
- Packaged app.asar SHA-256: `72FB99056913B2D5167FE977499BE1C5532C1074EADE2B15CF56893BB47176EC`
- Scope: local/internal RBAC only; no external OAuth/Auth0/Firebase/Supabase integration.
- Roles: `CEO`, `ADMIN`, `MANAGER`, `STAFF`, `SITE_CREW`, `CLIENT_VIEWER`, `READ_ONLY_AUDITOR`.
- Permissions: 28 dot-notation permission keys with default-deny evaluation.
- Guards: route, menu, output, customer data sanitizer, audit redaction.
- UI: role badge, `사용자 역할 및 권한 센터`, access denied view.
- Validation: v0.5.0 smoke, customer safety, v0.4.6/v0.4.5/RC-0.4.4 regression, `build:ui`, `smoke:prod`, `smoke:release:diagnose`, and `smoke:release` passed.
- Decision: `MERGE_READY`.
- Main merge: completed.
- RC tag target: `2ed04851024b5b9a2e26195a78a2ceb53afd61cd`
- Official tag: created after acceptance QA document commit.
- GitHub Release / release asset: not performed.

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

## v0.5.1 RC Desktop Package

- Branch: `main`
- RC tag: `v0.5.1-rc`
- RC tag target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- Base official version: `v0.5.0`
- Official `v0.5.0` target: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- Official `v0.5.1` tag / GitHub Release / release asset: `NOT_CREATED`
- Package path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE SHA-256: `17E8A0CAF81F3BEC5AC464B1F9A75B6FE11EBE7084FD0D651EBDF6BC9BE19319`
- app.asar SHA-256: `95D21A9DE575FD5BC14723EBE46F2B558393572CB2E095A0574F350B3B5EEAF4`
- Packaged launch: `PASSED`, 2 runs, no development server required.
- Role Management UX / Permission Center UX / Permission Audit Viewer: `PASSED`
- Access Denied Reason / Visibility Preview / Audit redaction: `PASSED`
- Customer safety and v0.5.0 RBAC regression: `PASSED`
- External auth/provider remains disabled.
- Final decision: `v0.5.1 RC Desktop Package 검증 완료`
