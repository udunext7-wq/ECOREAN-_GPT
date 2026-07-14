# Handoff Summary

## v0.5.1 RBAC UX & Audit Viewer Refinement

- Branch: `v0.5.1-rbac-ux-audit-viewer`
- Base official version: `v0.5.0`
- Official v0.5.0 release: published with asset.
- Official v0.5.0 tag target: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- Main merge: completed.
- Merge commit: `4d69cd4`
- Implementation commit: `7eca99efbb08403136c98ffc3f414ced9721db48`
- Regression fix commit: `34fc6aedca0579ae0da9a8cafaad86f28b2d7833`
- Added role management UX summaries and local role simulation warning.
- Added permission center matrix with search, role filter, allow/deny/restricted status, and dangerous permission highlighting.
- Added permission audit viewer filters for denied, role changed, internal cost, margin, customer output, and internal output events.
- Added safe access denied reason display that hides internal route path, DB path, token, provider payload, and raw customer data.
- Added customer/internal visibility preview using existing sanitizer and output guard behavior.
- External auth/provider remains `DISABLED`.
- Validation: v0.5.1 smoke, v0.5.0 RBAC regression, customer safety, historical regressions, and Electron build/release smoke passed.
- Decision: `MERGE_READY`.
- Next: v0.5.1 RC Desktop Package verification and official acceptance QA.

## v0.5.0 User Roles & Permissions

- Branch: `v0.5.0-user-roles-permissions`
- Base: official `v0.4.6`
- Added local/internal RBAC with 7 roles and default deny.
- Added route, menu, customer output, and internal output guards.
- Added customer data sanitizer and privacy-redacted permission audit.
- Added role badge and Korean role/permission center.
- External login and public authentication remain disabled.
- Validation: v0.5.0 smoke, customer safety, v0.4.6/v0.4.5/RC-0.4.4 regression, `build:ui`, `smoke:prod`, `smoke:release:diagnose`, and `smoke:release` passed.
- Decision: `MERGE_READY`.
- Main merge: completed with `d0004ff`.
- RC tag: `v0.5.0-rc`
- RC tag target: `2ed04851024b5b9a2e26195a78a2ceb53afd61cd`
- RC Desktop Package: `PASSED`
- Packaged launch/title/dev-server check: `PASSED`
- EXE SHA-256: `A9FD5B48BFF85DA2AEC1D3182509ABFEC4A5B513CB09EE8DF6D5303E39B62B86`
- app.asar SHA-256: `72FB99056913B2D5167FE977499BE1C5532C1074EADE2B15CF56893BB47176EC`
- Official acceptance: `ACCEPTED_WITH_WARNINGS`
- Official tag: created after acceptance QA document commit.
- GitHub Release / asset: not performed.

## v0.4.6 Official Acceptance

- Decision: `ACCEPTED_WITH_WARNINGS`
- Official acceptance date: `2026-06-25`
- RC tag target: `59f646968e7de4aa6c1392216f8c9444a49d6bf8`
- RC package docs commit: `88d2e4e`
- EXE launch twice, title, restart persistence, and no remaining process: passed.
- Visual click: LightBIM / CRM / Client Portal passed.
- Safe screenshot: viewport only; desktop and sensitive capture blocked.
- Pixel/layout comparison: passed.
- PDF Korean typography and Poppler render: passed.
- Customer PDF 1 page and internal PDF 2 pages: passed.
- Excel, print, customer/internal separation, and customer safety: passed.
- P0/P1/P2: none.
- P3: Excel native viewer pixel automation and OS print dialog automation.
- GitHub Release and asset: `NOT_CREATED`.
- Recommended next scope: `v0.5.0 User Roles & Permissions`, with `v0.4.7` available for deferred output QA.

## v0.4.6 Work In Progress

- Branch: `v0.4.6-packaged-visual-click-output-typography-qa`
- Actual packaged click automation: implemented and passed.
- Safe screenshot: app viewport only; desktop and sensitive DOM capture rejected.
- Pixel/layout comparison: implemented with direct PNG decoding.
- PDF Korean typography: ASCII replacement removed when Windows Korean TTF is available; Type0/ToUnicode/FontFile2 render passed.
- PDF rendering: customer 1 page and internal 2 pages rendered through Poppler with visible content.
- Excel: OpenXML structure and customer safety passed.
- Print: CSS pagination/layout guards passed.
- Customer safety: passed.
- Full requested regression and build/release smoke: passed.
- Decision: `MERGE_READY`.
- Remaining P3: native Excel viewer pixel automation and OS print dialog click automation.

## Status

`v0.4.5` official acceptance QA completed with decision `ACCEPTED_WITH_WARNINGS`. The release remains a QA/reliability stabilization release after the `v0.4.4` official operational baseline.

## What Was Verified

- Repository on `main`, clean and synced with origin.
- `v0.4.4` annotated official tag points to `36aaa3d98b26743a828a879d878b142e9e003905`.
- `v0.4.5-rc` points to `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`.
- RC package docs commit: `c46f378`.
- GitHub Release for `v0.4.5`: `NOT_CREATED` in this step.
- Packaged app launches without a dev server.
- Packaged app relaunch succeeds.
- Customer safety regression passes.
- Calendar/site survey sync smoke passes.
- Real project intake smoke passes.
- LightBIM BOC release flow passes.
- `build:ui` and `smoke:prod` pass.
- `smoke:release:diagnose` passes with no timeout and no remaining process.
- `smoke:release` passes with no timeout.
- EXE SHA256: `FFA455C9E224A74695F46767D2A5D3A5DB0038FFA56275A489E70A5FDAEAD06C`.
- app.asar SHA256: `879B876C0D0AC58362C8288DFECD82DFAB10F25A1AA71120986D290F3DC95051`.

## Warnings

- v0.4.4 `npm run smoke:release` timeout was addressed in v0.4.5 by child-process diagnostics.
- Full packaged visual click QA remains conditional because no click automation dependency is available.
- PDF/Excel/print structure QA exists in v0.4.5; PDF Korean typography still uses ASCII fallback.

## Open Issues

- `V045-P3-001`: packaged click automation remains partial.
- `V045-P3-002`: screenshot capture disabled to avoid real desktop/customer data capture.
- `V045-P3-003`: PDF Korean typography engine remains future improvement.

## Latest Validation

- Syntax checks: PASSED.
- v0.4.5 release smoke diagnostics: PASSED, `166824 ms`.
- v0.4.5 packaged visual QA: CONDITIONAL_PASSED.
- v0.4.5 output artifact QA: PASSED_WITH_WARNINGS.
- Requested Node regressions: PASSED.
- `npm run build:ui`: PASSED.
- `npm run smoke:prod`: PASSED.
- `npm run smoke:release:diagnose`: PASSED, `141883 ms`.
- `npm run smoke:release`: PASSED, `147053 ms`.
- Final decision: `ACCEPTED_WITH_WARNINGS`.

## Next Version Recommendation

Finish official `v0.4.5` tag verification before starting the next feature branch.

Recommended headline:

`v0.4.5 Visual Output QA Stabilization`

Follow-up candidates:

- `v0.4.6` packaged visual click automation.
- `v0.4.6` PDF Korean typography / output render improvement.
- `v0.5.0` User Roles & Permissions.

## Do Not Change

- Do not move `v0.4.4`.
- Do not move `v0.4.5-rc`.
- Do not move official `v0.4.5` after creation.
- Do not move `v0.4.4-rc`.
- Do not move `v0.4.4-rc-packaged`.
- Do not commit userData, backups, exports, generated PDFs/Excels, SQLite runtime data, or packaged binaries.

## v0.5.1 RC Desktop Package Handoff

`v0.5.1` RC desktop package verification is complete on `main`.

Verified package:

- RC tag: `v0.5.1-rc`
- RC target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- Official `v0.5.0` preserved: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- Official `v0.5.1` tag: `NOT_CREATED`
- GitHub Release / release asset: `NOT_CREATED`
- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE SHA-256: `17E8A0CAF81F3BEC5AC464B1F9A75B6FE11EBE7084FD0D651EBDF6BC9BE19319`
- app.asar SHA-256: `95D21A9DE575FD5BC14723EBE46F2B558393572CB2E095A0574F350B3B5EEAF4`

Validation result:

- Packaged launch: `PASSED`, 2 runs.
- Window title: `ECOREAN BOC CEO Dashboard`.
- Dev server required: `NO`.
- Role Management UX, Permission Center UX, Permission Audit Viewer: `PASSED`.
- Access Denied Reason, Visibility Preview, audit redaction: `PASSED`.
- Customer safety: `PASSED`.
- v0.5.0 RBAC regression and OVERDUE CRM duplicate prevention: `PASSED`.
- Final decision: `v0.5.1 RC Desktop Package 검증 완료`.

Next step: perform v0.5.1 official acceptance QA. Do not create the official `v0.5.1` tag, GitHub Release, or asset before that decision.

## v0.5.1 Official Acceptance QA Handoff

`v0.5.1` official acceptance QA completed with decision `ACCEPTED_WITH_WARNINGS`.

Verified state:

- Branch: `main`
- RC tag: `v0.5.1-rc`
- RC target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- RC package docs commit: `c4c19c9`
- Official `v0.5.0` preserved: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- GitHub Release / release asset: `NOT_CREATED`

Acceptance result:

- Packaged launch: `PASSED`, 2 runs.
- Window title: `ECOREAN BOC CEO Dashboard`.
- Dev server required: `NO`.
- `build:ui`, `smoke:prod`, `smoke:release:diagnose`, `smoke:release`: `PASSED`.
- Role Management UX, Permission Center UX, Permission Audit Viewer: `PASSED`.
- Access Denied Reason, Visibility Preview, audit redaction: `PASSED`.
- Customer safety and v0.5.0 RBAC regression: `PASSED`.
- External auth/provider: `DISABLED`.
- P0/P1/P2: none.
- P3 deferred: Excel native viewer pixel automation, OS print dialog automation.

Next step: create official annotated tag `v0.5.1`, then publish GitHub Release and asset in a separate step.

## v0.5.2 Audit Export And Role Change Approval Handoff

Implementation is complete on `v0.5.2-audit-export-role-change-approval`, based on official `v0.5.1`.

Delivered:

- Role change requests with DRAFT/PENDING/APPROVED/REJECTED/CANCELLED/EXPIRED/APPLIED/FAILED states.
- Permission additions/removals diff and dangerous-permission risk classification.
- Authorized approval, rejection, cancellation, expiration, explicit apply, and failure rollback.
- Self-approval, unknown role, stale current role, direct renderer role change, duplicate processing, and terminal-state apply prevention.
- Permission audit export in JSON, CSV, and print-safe HTML with operational filters.
- Double-pass export redaction and `AUDIT_EXPORT_GENERATED` audit event.
- Customer payload filtering for role-change, permission-diff, audit, approver, approval status, and risk-level data.
- External authentication/provider remains `DISABLED`.

Validation:

- v0.5.2 smoke suite: `PASSED`.
- v0.5.1/v0.5.0 RBAC regressions: `PASSED`.
- v0.4.6, RC-0.4.4, Real Project Intake, and LightBIM regressions: `PASSED`.
- Electron build, production smoke, release diagnostics, and aggregate release smoke: `PASSED`.
- P0/P1/P2: none.
- Decision: `MERGE_READY`.

Do not merge to main or create a v0.5.2 tag in this implementation step.
