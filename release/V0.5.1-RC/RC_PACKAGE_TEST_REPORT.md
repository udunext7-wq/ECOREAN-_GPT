# v0.5.1 RC Package Test Report

## Summary

- Version: `v0.5.1-rc`
- Branch: `main`
- RC tag: `v0.5.1-rc`
- RC tag target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- Base official version: `v0.5.0`
- Official v0.5.0 tag target: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- Test date: `2026-07-02`
- Final decision: `v0.5.1 RC Desktop Package 검증 완료`

## Package Integrity

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888`
- EXE SHA-256: `17E8A0CAF81F3BEC5AC464B1F9A75B6FE11EBE7084FD0D651EBDF6BC9BE19319`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2816483`
- app.asar SHA-256: `95D21A9DE575FD5BC14723EBE46F2B558393572CB2E095A0574F350B3B5EEAF4`

## Actual Launch

- Launch runs: `2`
- Launch result: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit: `NO`
- Not responding: `NO`
- Restart persistence: `PASSED`
- Production userData intentional reset: `NO`
- Remaining process: `0`

## v0.5.1 Acceptance Checks

- Role Management UX: `PASSED`
- Permission Center UX: `PASSED`
- Permission Audit Viewer: `PASSED`
- Access Denied Reason: `PASSED`
- Visibility Preview: `PASSED`
- Audit redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- OVERDUE CRM reminder duplicate prevention: `PASSED`

## Regression

- v0.5.0 RBAC regression: `PASSED`
- v0.4.6 visual/output regression: `PASSED`
- v0.4.5 diagnostics/output regression: `PASSED`
- RC-0.4.4 calendar/site survey sync: `PASSED`
- Real project intake: `PASSED`
- LightBIM customer safety: `PASSED`
- LightBIM BOC release flow: `PASSED`

## Build And Smoke

- `node --check electron/services/*.js`: `PASSED`
- `build:ui`: `PASSED`
- `smoke:prod`: `PASSED`
- `smoke:release:diagnose`: `PASSED`
- `smoke:release`: `PASSED`
- `npm run dist`: `PASSED`
- Timeout result: `PASSED`
- Remaining process result: `PASSED`

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - Excel native viewer pixel QA remains deferred.
  - OS print dialog automation remains deferred.

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning
- Node DEP0190 warning
- npm update notice

## Deferred Items

- official v0.5.1 Acceptance QA
- official v0.5.1 tag after acceptance
- GitHub Release after official tag
- v0.5.2 permission audit export
- v0.5.2 role change approval workflow
- v0.6.0 external auth strategy
- Excel native viewer pixel QA
- OS print dialog automation

## Final Decision

`v0.5.1 RC Desktop Package 검증 완료`
