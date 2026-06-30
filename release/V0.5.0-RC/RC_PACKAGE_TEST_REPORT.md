# v0.5.0 RC Package Test Report

## Summary

- Test date: `2026-06-30`
- Version: `v0.5.0-rc`
- RC tag target: `2ed04851024b5b9a2e26195a78a2ceb53afd61cd`
- Branch: `main`
- Implementation commit: `97a284e`
- Merge commit: `d0004ff`
- Final docs commit: `2ed0485`
- Package type: Windows unpacked

## Package

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888`
- EXE SHA-256: `A9FD5B48BFF85DA2AEC1D3182509ABFEC4A5B513CB09EE8DF6D5303E39B62B86`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2802032`
- app.asar SHA-256: `72FB99056913B2D5167FE977499BE1C5532C1074EADE2B15CF56893BB47176EC`

## Launch

- Packaged launch: `PASSED`
- Launch runs: `2`
- Visible window title check: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit: `NO`
- Not responding: `NO`
- Restart persistence: `PASSED`
- Production userData reset: `NO`
- Remaining process: `0`

## RBAC Acceptance

- 7 roles: `PASSED`
- 28 permissions: `PASSED`
- Permission evaluator: `PASSED`
- Default deny: `PASSED`
- Unknown role deny: `PASSED`
- Missing role deny: `PASSED`
- Route guard: `PASSED`
- Menu guard: `PASSED`
- Output guard: `PASSED`
- Customer data guard: `PASSED`
- Audit redaction: `PASSED`
- External auth/provider: `DISABLED`

## Role-Specific Checks

- CEO full access: `PASSED`
- ADMIN allowed scope: `PASSED`
- MANAGER allowed scope: `PASSED`
- STAFF margin/internal cost deny: `PASSED`
- SITE_CREW estimate/vendor/margin deny: `PASSED`
- CLIENT_VIEWER internal route deny: `PASSED`
- READ_ONLY_AUDITOR mutation deny: `PASSED`

## Customer Safety

- Customer PDF internal data: `BLOCKED`
- Customer Excel internal data: `BLOCKED`
- Customer Print internal data: `BLOCKED`
- Internal output permission guard: `PASSED`
- LightBIM customer safety regression: `PASSED`

## Regression

- v0.5.0 smoke: `PASSED`
- v0.4.6 regression: `PASSED`
- v0.4.5 regression: `PASSED`
- RC-0.4.4 regression: `PASSED`
- Real project intake: `PASSED`
- LightBIM release flow: `PASSED`
- Electron `build:ui`: `PASSED`
- Electron `smoke:prod`: `PASSED`
- Electron `smoke:release:diagnose`: `PASSED`
- Electron `smoke:release`: `PASSED`
- `npm run dist`: `PASSED`

## Findings

- P0: none
- P1: none
- P2: none
- P3: none for v0.5.0 RC package scope

Known warnings:

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder missing description/author metadata warning
- Node DEP0190 warning

Deferred items:

- v0.5.1 role management UX refinement
- v0.5.1 permission audit viewer refinement
- external auth strategy
- Excel native viewer pixel QA
- OS print dialog automation

## Final Decision

`v0.5.0 RC Desktop Package 검증 완료`
