# v0.4.4 Release Gate

## Release Identity

- Final release: `v0.4.4`
- Release candidate source tag: `v0.4.4-rc`
- Release candidate source tag target: `06b92be9910a8cd91c109e773783cbe4a1c334ad`
- Packaged baseline tag: `v0.4.4-rc-packaged`
- Packaged baseline tag target: `d2d3e1dbd5f41c83ef5e6d871d91f69f25033367`
- Final release commit: the commit tagged by `v0.4.4`
- Branch: `main`

## Scope

v0.4.4 promotes the verified Calendar & Site Survey Sync readiness package to the official operational baseline.

Completed capabilities:

- Internal Calendar & Site Survey Sync readiness center
- Internal calendar lifecycle and audit history
- Site survey linkage and explicit Survey to Calendar / Calendar to Survey sync paths
- Mismatch review with manual resolve/defer
- Conflict detection without automatic cancellation, owner reassignment, time change, or conflict resolution
- Reminder, OVERDUE, and CRM Action duplicate prevention
- Disabled external Calendar provider adapter
- Customer-safe schedule payload filtering
- Packaged Windows desktop launch verification

## Build Artifact Verification

- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- EXE size: 210,149,888 bytes
- EXE SHA-256: `FFA455C9E224A74695F46767D2A5D3A5DB0038FFA56275A489E70A5FDAEAD06C`
- app.asar size: 2,763,157 bytes
- app.asar SHA-256: `879B876C0D0AC58362C8288DFECD82DFAB10F25A1AA71120986D290F3DC95051`
- Official UI label: `v0.4.4`

## Runtime Launch Verification

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- Immediate exit or fatal startup failure: NOT OBSERVED
- Source/service syntax checks: PASSED
- Node smoke/regression checks: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- `npm run dist`: PASSED
- lint: NOT AVAILABLE

## Git Synchronization Verification

- `main` must be synchronized with `origin/main`
- Working tree must be clean before official tag creation
- Existing tags `v0.4.4-rc` and `v0.4.4-rc-packaged` must be preserved
- Official tag `v0.4.4` must point to the final release commit

## Known Issues

- Full visual click QA: NOT_PERFORMED
- Vite bundle size warning remains non-blocking
- SQLite experimental API warning remains non-blocking
- electron-builder metadata warning remains non-blocking unless installer metadata cleanup is prioritized
- External Google/Microsoft/Apple/CalDAV provider integration is not implemented
- OAuth and external invitation delivery are not implemented
- Customer schedule notification delivery is not implemented

## Rollback Reference

- Source RC rollback: `v0.4.4-rc`
- Packaged operational rollback: `v0.4.4-rc-packaged`
- Prior packaged baseline: `v0.4.3-rc-packaged`

## Final Release Decision

`v0.4.4 official operational baseline release approved after final tag and GitHub Release creation.`
