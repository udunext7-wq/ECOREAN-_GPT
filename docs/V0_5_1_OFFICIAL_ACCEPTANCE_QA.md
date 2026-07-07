# v0.5.1 Official Acceptance QA

## Summary

- Version: `v0.5.1`
- Acceptance date: `2026-07-07`
- Branch: `main`
- RC tag: `v0.5.1-rc`
- RC target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- RC package docs commit: `c4c19c9`
- Official v0.5.0 tag target: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- GitHub Release: `NOT_CREATED`
- Release asset: `NOT_CREATED`
- Final decision: `ACCEPTED_WITH_WARNINGS`

## Package Integrity

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA-256: `17E8A0CAF81F3BEC5AC464B1F9A75B6FE11EBE7084FD0D651EBDF6BC9BE19319`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2816483` bytes
- app.asar SHA-256: `95D21A9DE575FD5BC14723EBE46F2B558393572CB2E095A0574F350B3B5EEAF4`

## Packaged Launch

- Actual launch runs: `2`
- Launch result: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit: `NO`
- Not responding: `NO`
- Restart persistence: `PASSED`
- Production userData reset: `NO`
- Remaining process: `0`

## Build And Smoke

- Service syntax check: `PASSED`
- `npm run build:ui`: `PASSED`
- `npm run smoke:prod`: `PASSED`
- `npm run smoke:release:diagnose`: `PASSED`
- `npm run smoke:release`: `PASSED`
- Timeout result: `PASSED`
- Remaining process result: `PASSED`

## v0.5.1 Acceptance Checks

- Role Management UX: `PASSED`
- Permission Center UX: `PASSED`
- Permission Audit Viewer: `PASSED`
- Access Denied Reason: `PASSED`
- Visibility Preview: `PASSED`
- Audit redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- v0.5.0 RBAC regression: `PASSED`
- OVERDUE CRM reminder duplicate prevention: `PASSED`

## Customer Safety Acceptance

Customer-facing screens, outputs, previews, and unauthorized role payloads were checked for internal or sensitive data leakage.

- Internal cost: `BLOCKED`
- Vendor price: `BLOCKED`
- Labor cost: `BLOCKED`
- Margin / margin rate / profit: `BLOCKED`
- PCE: `BLOCKED`
- Recommendation scoring: `BLOCKED`
- Queue and internal action data: `BLOCKED`
- Raw phone/email and detailed internal address: `BLOCKED`
- Provider payload, coordinates, runtime DB path, token/credential: `BLOCKED`
- Staff private contact and audit raw entry: `BLOCKED`
- Result: `PASSED`

## Regressions

- v0.5.1 RC packaged release smoke: `PASSED`
- v0.5.1 RBAC UX smoke: `PASSED`
- v0.5.1 permission audit viewer smoke: `PASSED`
- v0.5.1 access denied reason smoke: `PASSED`
- v0.5.1 branch stabilization smoke: `PASSED`
- v0.5.0 RBAC regression suite: `PASSED`
- v0.4.6 packaged visual / screenshot / output typography regression: `PASSED`
- v0.4.5 release diagnostics and output artifact regression: `PASSED`
- RC-0.4.4 calendar/site survey regression: `PASSED`
- Real project intake regression: `PASSED`
- LightBIM customer safety regression: `PASSED`
- LightBIM BOC release flow: `PASSED`

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - Excel native viewer pixel automation remains deferred.
  - OS print dialog automation remains deferred.

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning
- Node DEP0190 warning
- npm update notice

## Deferred Items

- Excel native viewer pixel QA
- OS print dialog automation
- Permission audit export
- Role change approval workflow
- External auth strategy

## Release Decision

`v0.5.1 ACCEPTED WITH WARNINGS`

The package satisfies the official acceptance criteria for the RBAC UX and Permission Audit Viewer release. No P0/P1/P2 release blockers were found. GitHub Release creation and release asset upload remain intentionally deferred to a separate publishing step.
