# RC-0.4.4 Packaged Operational Baseline

## Version Identity

- version: RC-0.4.4
- base tag: `v0.4.3-rc-packaged`
- source commit: `06b92be`
- merge commit: `ee78a2c`
- package documentation commit: `517aa1d`
- source tag: `v0.4.4-rc`
- packaged tag: `v0.4.4-rc-packaged`
- branch: `main`

## Package Identity

- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: 210,149,888 bytes
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: 2,763,169 bytes
- actual launch: PASSED
- title/responsiveness: PASSED
- dev server: not required

## Runtime Paths

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Verification

- service syntax: PASSED
- Node regression: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- packaged launch: PASSED
- app.asar inclusion: PASSED
- seven entry points source/smoke/archive: PASSED
- visual click QA: NOT_PERFORMED

## Calendar & Site Survey

- Calendar lifecycle: PASSED
- timezone handling: PASSED
- Survey linkage: PASSED
- Survey to Calendar: PASSED
- Calendar to Survey: PASSED
- mismatch resolution/defer: PASSED
- original data protection: PASSED
- conflict detection: PASSED
- automatic change prevention: PASSED
- Reminder/OVERDUE: PASSED
- CRM Action duplicate prevention: PASSED
- audit history: PASSED

## Provider Status

- Provider: DISABLED
- external_call_performed: false
- authentication: NOT_CONFIGURED
- OAuth: DISABLED
- invitation: DISABLED
- messages: DISABLED

## Customer Safety

- customer-safe schedule payload: PASSED
- internal owner protected: PASSED
- conflicts/mismatches protected: PASSED
- internal reminders/actions protected: PASSED
- internal address protected: PASSED
- provider/error/hash protected: PASSED
- financial/internal operations data protected: PASSED
- result: PASSED

## Git Exclusions

- `electron/release`
- EXE
- app.asar
- runtime DB/SQLite
- userData
- backups
- exports
- generated PDF/Excel
- temporary logs
- API key/token/credential
- actual customer or staff personal data

## Known Warnings

- Vite bundle size
- SQLite experimental API
- electron-builder metadata
- Node DEP0190

## Known Limitations

- full visual click QA: NOT_PERFORMED
- actual external Calendar provider not implemented
- OAuth not implemented
- external invitation not implemented
- automatic external two-way sync not implemented

## Deferred Items

- packaged full click QA
- Google/Microsoft Calendar integration
- OAuth credential storage
- provider selection
- external invitation delivery
- customer schedule notification
- provider conflict resolution
- mobile calendar UX
- role-based access
- bundle optimization

## Final Decision

`RC-0.4.4 packaged operational baseline 사용 가능`

단, Full visual click QA는 NOT_PERFORMED이며 source/smoke/archive 및 packaged launch 검증 기준이다.
