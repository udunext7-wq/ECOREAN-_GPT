# RC-0.4.3 Packaged App Test Report

## Summary

- Test date: 2026-06-17
- Version: RC-0.4.3
- Base tag: `v0.4.2-rc-packaged`
- Source tag: `v0.4.3-rc`
- Source commit: `3a99fdf`
- Merge commit: `b6c9500`
- Implementation commit: `a345991`
- Stabilization commit: `f22c5a6`
- Smoke correction commit: `f5be119`
- Package: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: 2,692,145 bytes

## Build and Launch

- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED with extended timeout
- `npm run dist`: PASSED
- Actual packaged launch: PASSED
- Immediate exit: NO
- Responsiveness: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First window creation: PASSED

The packaged Electron process was actually launched and observed. Full click-through QA for every internal entry point was not performed; source, smoke, production bundle, and archive verification were used for the six entry points.

## Package Contents

- Executable exists and is non-empty: PASSED
- app.asar exists and is non-empty: PASSED
- Executable size: 210,149,888 bytes
- app.asar size: 2,692,145 bytes
- `customerPortalDraftService`: PASSED
- `CustomerPortalDraftCenterView` production bundle label/route: PASSED
- `customer_portal_drafts` schema/table reference: PASSED
- `customer_portal_snapshots` schema/table reference: PASSED
- `customer_portal_audit_history` schema/table reference: PASSED
- `customer_portal_preview_sessions` schema/table reference: PASSED
- `main.js` RC-0.4.3 IPC handlers: PASSED
- `preload.js` RC-0.4.3 bridge: PASSED
- Production UI includes `고객 포털 내부 초안`: PASSED
- Production UI includes `customerPortalDraft` route key: PASSED

## Data Paths

- userData: `%APPDATA%\ecorean-boc-electron` - PASSED
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite` - PASSED
- export: `%APPDATA%\ecorean-boc-electron\export` - PASSED
- backups: `%APPDATA%\ecorean-boc-electron\backups` - PASSED

## Customer Portal Draft

- Draft create / list / detail / update: PASSED
- Archive / restore: PASSED
- Archived update restriction: PASSED
- Approved Draft revision requirement: PASSED
- Lead / Project / Estimate / Contract linkage: PASSED
- bad ID safe handling: PASSED
- Project missing publish block: PASSED
- entity automatic delete: ABSENT

## Payload and Customer Safety

- Allowlist-only customer payload: PASSED
- Internal object spread-and-delete pattern: ABSENT
- unexpected source fields excluded: PASSED
- nested internal fields excluded: PASSED
- prototype pollution defense: PASSED
- HTML/script/iframe sanitization: PASSED
- dangerous URL and absolute path protection: PASSED
- internal DB ID hidden: PASSED
- forbidden financial, price, CRM, address, operation, privacy, and token fields: HIDDEN
- Customer safety: PASSED

## Documents and Progress

- customer-approved documents only: PASSED
- FINAL / APPROVED customer documents only: PASSED
- internal document types blocked: PASSED
- local absolute paths hidden: PASSED
- customer-visible milestone progress: PASSED
- manual customer progress: PASSED
- 0~100 clamp: PASSED
- NaN / Infinity safe: PASSED
- empty state: PASSED

## Snapshot / Audit / Review

- Snapshot creation: PASSED
- Revision increment: PASSED
- Previous snapshot retention: PASSED
- Snapshot hash: PASSED
- Audit history: PASSED
- Review request: PASSED
- Internal approval: PASSED
- Rejection: PASSED
- Approval revocation: PASSED
- Approved Draft change returns to review: PASSED

## Publish Block / Preview / Token

- Publish block for customer safety failure: PASSED
- Publish block for missing project/title/customer: PASSED
- Publish block for forbidden fields, unapproved documents, token plaintext, absolute path, provider/coordinates, internal action/notification: PASSED
- Internal preview session create: PASSED
- Preview expiration and revoke: PASSED
- expired/revoked preview access blocked: PASSED
- token plaintext DB storage: ABSENT
- token SHA-256 hash storage: PASSED
- token UI/log/customer payload exposure: ABSENT

## External Communication

- public portal hosting: DISABLED
- external URL: DISABLED
- customer login: DISABLED
- external auth / OAuth: DISABLED
- SMS / Email / Kakao / Push / Calendar: DISABLED
- external file upload: DISABLED
- API key: ABSENT

## Internal Entry Points

- First Entry Panel: PASSED by source/smoke/archive
- CEO Dashboard: PASSED by source/smoke/archive
- Drawer: PASSED by source/smoke/archive
- CRM Lead detail: PASSED by source/smoke/archive
- Project detail: PASSED by source/smoke/archive
- Contract / estimate link screen: PASSED by source/smoke/archive
- Customer screen internal Draft Center entry: ABSENT
- Visual click QA: BASIC_LAUNCH_VERIFIED_FULL_CLICK_QA_NOT_PERFORMED

## Tests Run

- service syntax: PASSED
- `rc-0-4-3-packaged-release.smoke.js`: PASSED
- `rc-0-4-3-branch-stabilization.smoke.js`: PASSED
- `rc-0-4-3-customer-portal-draft.smoke.js`: PASSED
- RC-0.4.2 / RC-0.4.1 / RC-0.4.0 / RC-0.3.9 regression smoke: PASSED
- real project intake: PASSED
- LightBIM customer safety / release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- `npm run dist`: PASSED

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning from electron-builder child process invocation

## Failed Commands and Workarounds

- Some shell operations required approved execution because Windows sandbox process creation returned `CreateProcessAsUserW failed: 5`.
- `smoke:release` was run with a sufficiently long timeout because previous release smoke runs exceeded 184 seconds without functional failure.
- No package, launch, customer safety, or build failure remained.

## Final Decision

`RC-0.4.3 Desktop Release Package 사용 가능`
