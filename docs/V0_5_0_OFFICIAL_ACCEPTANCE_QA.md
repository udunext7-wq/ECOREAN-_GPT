# v0.5.0 Official Acceptance QA

## Summary

- Version: `v0.5.0`
- RC tag: `v0.5.0-rc`
- RC target: `2ed04851024b5b9a2e26195a78a2ceb53afd61cd`
- RC package docs commit: `268a5f9`
- Context follow-up commit: `2630f6a`
- Acceptance date: `2026-06-30`
- Official v0.4.6 tag target: `f1c45d4a10bae5b269b2751ab030cec06df59a58`
- Official v0.5.0 tag target: this acceptance QA document commit
- GitHub Release: `NOT_CREATED`
- Release asset: `NOT_CREATED`

## Package Integrity

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888`
- EXE SHA-256: `A9FD5B48BFF85DA2AEC1D3182509ABFEC4A5B513CB09EE8DF6D5303E39B62B86`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2802032`
- app.asar SHA-256: `72FB99056913B2D5167FE977499BE1C5532C1074EADE2B15CF56893BB47176EC`

## Packaged Launch

- Launch runs: `2`
- Launch result: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit: `NO`
- Not responding: `NO`
- Restart persistence: `PASSED`
- Production userData intentional reset: `NO`
- Remaining process: `0`

## Build And Smoke

- `node --check electron/services/*.js`: `PASSED`
- `build:ui`: `PASSED`
- `smoke:prod`: `PASSED`
- `smoke:release:diagnose`: `PASSED`
- `smoke:release`: `PASSED`
- Timeout result: `PASSED`
- Remaining process result: `PASSED`

## RBAC Acceptance

- 7 roles: `PASSED`
- 28 permissions: `PASSED`
- Permission matrix: `PASSED`
- Permission evaluator: `PASSED`
- Default deny: `PASSED`
- Unknown role deny: `PASSED`
- Missing role deny: `PASSED`
- Route guard: `PASSED`
- Menu guard: `PASSED`
- Output guard: `PASSED`
- Customer data guard: `PASSED`
- Audit redaction: `PASSED`

Role-specific results:

- `CEO`: `PASSED`
- `ADMIN`: `PASSED`
- `MANAGER`: `PASSED`
- `STAFF`: `PASSED`
- `SITE_CREW`: `PASSED`
- `CLIENT_VIEWER`: `PASSED`
- `READ_ONLY_AUDITOR`: `PASSED`

## Customer Safety

- Customer safety regression: `PASSED`
- Customer output internal cost: `BLOCKED`
- Customer output vendor price: `BLOCKED`
- Customer output labor cost: `BLOCKED`
- Customer output margin/profit/PCE: `BLOCKED`
- Queue/internal action/internal notification/internal memo: `BLOCKED`
- raw phone/email/detailed internal address/provider payload/coordinates: `BLOCKED`
- runtime DB path/token/credential/audit raw entry: `BLOCKED`

## External Auth

- OAuth: `DISABLED`
- Auth0: `DISABLED`
- Firebase: `DISABLED`
- Supabase: `DISABLED`
- Kakao/Google login: `DISABLED`
- API key/client secret: `NOT_ADDED`

## Regression

- v0.5.0 RC packaged smoke: `PASSED`
- v0.5.0 smoke 5종: `PASSED`
- v0.4.6 packaged visual click: `PASSED`
- v0.4.6 safe screenshot: `PASSED`
- v0.4.6 output typography render: `PASSED_WITH_PARSER_NOTE`
- v0.4.6 branch stabilization: `PASSED`
- v0.4.5 release diagnostics: `PASSED`
- v0.4.5 output artifact render: `PASSED_WITH_WARNINGS`
- RC-0.4.4 calendar/site survey: `PASSED`
- Real project intake: `PASSED`
- LightBIM customer safety: `PASSED`
- LightBIM BOC release flow: `PASSED`

## Compatibility Note

`tests/v0-4-6-rc-packaged-release.smoke.js` is a historical local package artifact check. After v0.5.0 `npm run dist`, the shared `electron/release/win-unpacked/resources/app.asar` path contains the v0.5.0 package, so the old v0.4.6 local artifact-size assertion can fail. This is not a v0.5.0 release blocker because the official v0.4.6 tag is preserved and the v0.5.0 package manifest/checksum smoke passed.

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - Excel native viewer pixel QA
  - OS print dialog automation
  - Role management UX refinement
  - Permission audit viewer refinement
  - External auth strategy

Known warnings:

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning
- Node DEP0190 warning
- npm update notice if shown

Deferred items:

- v0.5.1 role management UX refinement
- v0.5.1 permission audit viewer refinement
- external auth strategy
- Excel native viewer pixel QA
- OS print dialog automation

## Final Release Decision

`ACCEPTED_WITH_WARNINGS`

v0.5.0 has no P0/P1/P2 blocker. The official tag can be created after this acceptance document is committed and pushed to `main`.
