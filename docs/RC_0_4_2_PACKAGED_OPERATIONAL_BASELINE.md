# RC-0.4.2 Packaged Operational Baseline

## Version Identity

- version: RC-0.4.2
- source commit: `8dfd5ef`
- package documentation commit: `8924fbd`
- source tag: `v0.4.2-rc`
- packaged tag: `v0.4.2-rc-packaged`
- branch: `main`
- merge commit: `cb41933`
- implementation commit: `3d372e7`
- stabilization commit: `d379950`
- baseline finalized date: 2026-06-16

## Package

- executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2,626,370 bytes`
- executable size: `210,149,888 bytes`
- actual launch result: PASSED
- window title result: `ECOREAN BOC CEO Dashboard`
- responsiveness result: PASSED
- dev server requirement: not required

## Runtime Paths

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Verification

- service syntax result: PASSED
- Node smoke result: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- actual launch result: PASSED
- app.asar inclusion result: PASSED
- main/origin sync before baseline: `0/0`

## Address Normalization

- ROAD / JIBUN / MIXED / UNKNOWN: PASSED
- HIGH / MEDIUM / LOW / INVALID: PASSED
- separator and hyphen normalization: PASSED
- null / undefined / invalid payload handling: PASSED
- whitespace, numeric, building-only, road-only, lot, mixed-language, and long-detail edge cases: PASSED
- edge-case count verified by stabilization smoke: `14`

## Data Protection

- original address protection: PASSED
- original and normalized address fields stored separately: PASSED
- approval / rejection / deferral: PASSED
- history retention: PASSED
- re-normalization history preservation: PASSED
- duplicate warning only: PASSED
- no automatic merge: PASSED
- no automatic delete: PASSED
- no automatic entity consolidation: PASSED

## Entity Linkage

- Lead linkage: PASSED
- site survey linkage: PASSED
- project linkage: PASSED

## Provider Readiness

- provider status: DISABLED
- `external_call_performed`: `false`
- actual address API status: DISABLED
- geocoding status: DISABLED
- coordinate lookup status: DISABLED
- credential status: absent
- provider raw payload storage: absent

## Customer Safety

- detailed address protected: PASSED
- address fingerprint and canonical key hash protected: PASSED
- duplicate candidates protected: PASSED
- provider data protected: PASSED
- coordinate data protected: PASSED
- internal validation reason and review memo protected: PASSED
- raw phone and raw email protected: PASSED
- internal business fields protected: PASSED
- final customer safety result: PASSED

## Entry Points

- First Entry Panel: PASSED
- CEO Dashboard: PASSED
- Drawer: PASSED
- CRM Pipeline Center: PASSED
- site survey detail: PASSED
- real project intake: PASSED

## Git Exclusions

The following items were not committed:

- EXE
- app.asar
- `electron/release`
- userData
- DB / SQLite
- backup
- export
- real address data
- generated PDF / Excel
- temporary logs

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning
- Node DEP0190 warning
- npm update notice when shown

## Deferred Items

- real address search API
- real postal code lookup
- real coordinate / geocoding lookup
- provider selection settings
- credential secure storage
- map preview
- customer portal address confirmation
- calendar location sync
- user roles / permissions
- bundle optimization

## Final Decision

RC-0.4.2 packaged operational baseline 사용 가능
