# v0.4.6 Official Acceptance QA

## Release Identity

- Version: `v0.4.6`
- Acceptance date: `2026-06-25`
- Branch: `main`
- RC tag: `v0.4.6-rc`
- RC target: `59f646968e7de4aa6c1392216f8c9444a49d6bf8`
- RC package docs commit: `88d2e4edccec5c6512fac09ffcbb0ad71a8fc42b`
- Previous official version: `v0.4.5`
- Official `v0.4.5` target: `abe9094a8f09776a0960f0e65550bf301c5b8c55`
- GitHub Release: `NOT_CREATED`
- Release asset: `NOT_CREATED`

## Package Identity

- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA-256: `CADE74000D0C60E9FD158C167A692275DD5C7FD4046C538EF617B07DD25B113B`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2772008` bytes
- app.asar SHA-256: `AD92EA901A664C231F1D61A4B9AADCF1A3802A4C39337B66D0A1000A494BFD4D`

## Packaged Launch

- Launch runs: 2
- Running after 6 seconds: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit: none
- Unresponsive state: none observed
- Restart persistence: `PASSED`
- Existing userData files removed: none
- Existing userData files shrunk: none
- Production userData intentional reset: not performed
- Remaining processes: none

## Build And Release Smoke

- Service syntax: `PASSED`
- `npm run build:ui`: `PASSED`, `5961 ms`
- `npm run smoke:prod`: `PASSED`, `1931 ms`
- `npm run smoke:release:diagnose`: `PASSED`, `98790 ms`
- `npm run smoke:release`: `PASSED`, `98669 ms`
- Timed out tests: none
- Failed tests: none
- Remaining processes: none

## Visual Click And Screenshot Acceptance

- Packaged visual click QA: `PASSED`
- LightBIM click: `PASSED`
- CRM click: `PASSED`
- Client Portal click: `PASSED`
- Pixel change:
  - LightBIM: `65.4%`
  - CRM: `51.5%`
  - Client Portal: `45.3%`
- Layout bounds: `PASSED`
- Screenshot scope: `APP_VIEWPORT_ONLY`
- Capture method: `CDP_PAGE_VIEWPORT`
- Full desktop capture: `BLOCKED`
- Sensitive information capture: `BLOCKED`
- Real customer or employee fixture: not used
- Generated screenshots and pixel output committed to Git: no

## Output Acceptance

- PDF Korean Type0 font embedding: `PASSED`
- FontFile2 / Identity-H / ToUnicode: `PASSED`
- Poppler render: `PASSED`
- Customer PDF: `PASSED`, 1 page
- Internal PDF: `PASSED`, 2 pages
- Excel structure: `PASSED`
- Print layout guards: `PASSED`
- Customer/internal separation: `PASSED`
- Customer PDF internal cost/margin/PCE exposure: none
- Internal PDF internal classification: present
- Generated PDF/Excel committed to Git: no

## Customer Safety Acceptance

Customer-facing payloads and outputs were checked for:

- internal cost
- vendor price
- labor cost
- margin and margin rate
- profit
- PCE
- recommendation scoring
- queues
- internal action and notification
- internal memo
- raw phone/email
- detailed internal address
- provider payload, coordinates, hash, or error
- internal file and runtime DB paths
- token or credential
- internal calendar conflict and mismatch detail

Result: `PASSED`

No customer-facing leak was found.

## Regression

- v0.4.6 RC packaged release smoke: `PASSED`
- v0.4.6 visual click / screenshot / output / stabilization: `PASSED`
- v0.4.5 RC package and stabilization regression: `PASSED`
- v0.4.5 release diagnostics and output regression: `PASSED`
- RC-0.4.4 package and calendar regression: `PASSED`
- Real Project Intake: `PASSED`
- LightBIM customer safety: `PASSED`
- LightBIM release flow: `PASSED`

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - Excel native viewer pixel automation
  - OS print dialog automation

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning
- npm update notice when shown

## Deferred Items

- Excel native viewer pixel automation
- OS print dialog automation
- GitHub Release publication for `v0.4.6`
- Release asset creation/upload and checksum publication
- User Roles & Permissions as a potential `v0.5.0` scope

## Release Decision

`ACCEPTED_WITH_WARNINGS`

P0/P1/P2 issues were not found. The remaining P3 items do not block operation, customer safety, packaged launch, or output generation.

Official `v0.4.6` may be tagged at this acceptance documentation commit. GitHub Release and release asset remain `NOT_CREATED` in this step.
