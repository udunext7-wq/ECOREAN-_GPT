# RC-0.4.3 Packaged Operational Baseline

## Version Identity

- version: RC-0.4.3
- base tag: `v0.4.2-rc-packaged`
- source commit: `3a99fdf`
- merge commit: `b6c9500`
- package documentation commit: `60cb288`
- source tag: `v0.4.3-rc`
- packaged baseline tag: `v0.4.3-rc-packaged`
- branch: `main`

## Package Identity

- executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- executable size: 210,149,888 bytes
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: 2,692,145 bytes
- actual launch result: PASSED
- window title: `ECOREAN BOC CEO Dashboard`
- responsiveness result: PASSED
- dev server requirement: not required

## Runtime Paths

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Packaged Verification

- service syntax: PASSED
- Node regression: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- packaged launch: PASSED
- app.asar inclusion: PASSED
- source/smoke/archive entry-point verification: PASSED
- visual full click QA: NOT_PERFORMED

## Customer Portal Draft

- Draft lifecycle: PASSED
- Lead / Project / Estimate / Contract linkage: PASSED
- allowlist payload: PASSED
- forbidden field exclusion: PASSED
- approved document filtering: PASSED
- progress safety: PASSED
- Snapshot / revision: PASSED
- audit history: PASSED
- review workflow: PASSED
- Publish block: PASSED
- preview session: PASSED
- token SHA-256 protection: PASSED
- customer screen isolation: PASSED

## External Status

- public portal: NOT_AVAILABLE
- authentication: INTERNAL_PREVIEW_ONLY
- external delivery: DISABLED
- SMS: DISABLED
- Email: DISABLED
- Kakao: DISABLED
- Push: DISABLED
- external file upload: DISABLED

`INTERNAL_APPROVED` is an internal review result only. It is not external publication.

## Customer Safety

- internal financial fields protected: PASSED
- CRM internal fields protected: PASSED
- detailed address / provider / coordinates protected: PASSED
- internal operations data protected: PASSED
- raw personal data protected: PASSED
- token plaintext protected: PASSED
- final result: PASSED

## Git Exclusions

The following artifacts were intentionally not committed:

- `electron/release`
- EXE
- app.asar
- runtime DB / SQLite
- userData
- backups
- exports
- actual customer data
- actual token
- generated PDF / Excel
- temporary logs

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning
- Node DEP0190 warning

## Known Limitations

- full visual click QA: NOT_PERFORMED
- actual customer external portal: not implemented
- customer authentication: not implemented
- public URL: not implemented
- external invitation delivery: not implemented
- actual customer file delivery: not implemented

## Deferred Items

- packaged full click QA
- external customer portal
- customer login / authentication
- customer invitation delivery
- access permissions
- secure file delivery
- mobile customer portal
- audit retention policy
- role-based access
- bundle optimization

## Final Decision

`RC-0.4.3 packaged operational baseline 사용 가능`

Full visual click QA was not performed. This baseline is based on source, smoke, archive/app.asar, packaged launch, and customer safety verification.
