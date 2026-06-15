# RC-0.4.2 Packaged App Test Report

## Summary

- Test date: 2026-06-15
- Version: RC-0.4.2
- Tag: `v0.4.2-rc`
- Source commit: `8dfd5ef`
- Merge commit: `cb41933`
- Implementation commit: `3d372e7`
- Stabilization commit: `d379950`
- Package: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`

## Build and Launch

- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- `npm run dist`: PASSED
- Actual packaged launch: PASSED
- Immediate exit: NO
- Process responding: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First window creation: PASSED

The packaged Electron process was actually launched and observed for eight seconds. Every internal navigation button was not manually clicked; route, bundle, archive, and smoke verification were used for those entries.

## Package Contents

- Executable exists and is non-empty: PASSED
- app.asar exists and is non-empty: PASSED
- Executable size: 210,149,888 bytes
- app.asar size: 2,626,370 bytes
- `addressNormalizationService`: PASSED
- `addressProviderAdapter`: PASSED
- `main.js` address IPC routes: PASSED
- `preload.js` address IPC routes: PASSED
- Production UI contains `주소 정규화 센터`: PASSED
- Production UI contains `addressNormalization` route key: PASSED

## Data Paths

- userData: `%APPDATA%\ecorean-boc-electron` - PASSED
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite` - PASSED
- export: `%APPDATA%\ecorean-boc-electron\export` - PASSED
- backups: `%APPDATA%\ecorean-boc-electron\backups` - PASSED
- Required export folders: PASSED
- Required backup folders: PASSED

## Address Normalization

- ROAD/JIBUN/MIXED/UNKNOWN: PASSED
- HIGH/MEDIUM/LOW/INVALID: PASSED
- Component parsing, canonical address, and SHA-256 fingerprint: PASSED
- Original and normalized address separation: PASSED
- Normalization does not overwrite source address: PASSED
- Approval/rejection/deferral: PASSED
- Full history: PASSED
- Duplicate warnings including same survey: PASSED
- Automatic merge/delete: absent
- Lead/site survey/project linkage: PASSED

## Provider and Edge Cases

- Provider status: `DISABLED`
- `external_call_performed`: `false`
- Address API, geocoding, postal-code, and coordinate calls: absent
- API key, provider URL, and Authorization: absent
- Null/undefined/malformed payload: PASSED
- Empty/whitespace/numeric/building-only/road-only/lot/mixed/long-detail/mixed-language input: PASSED
- Whitespace and hyphen variants: PASSED

## Customer Safety

- Detailed and normalized detailed address hidden: PASSED
- Canonical key/fingerprint hidden: PASSED
- Duplicate candidates hidden: PASSED
- Provider configuration/response/error hidden: PASSED
- Coordinates/latitude/longitude hidden: PASSED
- Internal validation/review details hidden: PASSED
- Phone/email/internal action/notification/margin/PCE/Queue/scoring/internal cost/risk score hidden: PASSED

## Internal Entry Points

- First Entry Panel: PASSED by source/bundle smoke
- CEO Dashboard: PASSED by source/bundle smoke
- Drawer: PASSED by source/bundle smoke
- CRM Pipeline Center: PASSED by source/bundle smoke
- Site survey detail: PASSED by source/bundle smoke
- Real Project Intake: PASSED by source/bundle smoke
- Customer-facing internal entry point: absent

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning

## Failed Commands

- None affecting package or functional validation.

## Final Decision

`RC-0.4.2 Desktop Release Package 사용 가능`
