# v0.4.6 RC Desktop Package Test Report

## Test Metadata

- Test date: `2026-06-25`
- Branch: `main`
- RC tag: `v0.4.6-rc`
- RC tag target: `59f646968e7de4aa6c1392216f8c9444a49d6bf8`
- Base official version: `v0.4.5`
- Official `v0.4.5` target: `abe9094a8f09776a0960f0e65550bf301c5b8c55`
- Official `v0.4.6` tag: not created
- GitHub Release: not created

## Source Identity

- Implementation commit: `318c3d9`
- Merge commit: `016b50a`
- Main smoke compatibility commit: `f22874e`
- Final merge docs commit: `59f6469`

## Package

- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA-256: `CADE74000D0C60E9FD158C167A692275DD5C7FD4046C538EF617B07DD25B113B`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2772008` bytes
- app.asar SHA-256: `AD92EA901A664C231F1D61A4B9AADCF1A3802A4C39337B66D0A1000A494BFD4D`
- `npm run dist`: PASSED, `15426 ms`

## Actual Launch

- Launch run 1: PASSED
- Launch run 2: PASSED
- Running after 6 seconds: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- Restart persistence: PASSED
- Existing userData files deleted: none
- Existing userData files shrunk: none
- Remaining process: none
- Production userData intentional reset: not performed

## Build And Smoke

- `npm run build:ui`: PASSED, `6267 ms`
- `npm run smoke:prod`: PASSED, `2994 ms`
- `npm run smoke:release:diagnose`: PASSED, `110945 ms`
- `npm run smoke:release`: PASSED, `100451 ms`
- Pre-package release diagnostics: PASSED, `197816 ms`
- Timed out tests: none
- Failed tests: none
- Remaining processes: none

The historical v0.4.5 packaged smoke previously compared the mutable current
`win-unpacked/app.asar` size with the archived v0.4.5 manifest size. A newer
package necessarily changes that path. The regression now preserves and checks
the historical manifest values while requiring the current EXE and app.asar to
exist and be non-empty.

## Packaged Visual Click

- LightBIM: PASSED, pixel change `65.4%`
- CRM: PASSED, pixel change `51.5%`
- Client Portal: PASSED, pixel change `45.3%`
- Layout bounds: PASSED

## Safe Screenshot

- App viewport-only: PASSED
- Full desktop capture: blocked
- Sensitive customer information capture: blocked
- Isolated synthetic userData: PASSED
- Real customer/employee fixture: not used

## Output QA

- PDF Korean font embedding: PASSED
- FontFile2 / Identity-H / ToUnicode: PASSED
- Poppler render: PASSED
- Customer PDF: PASSED, 1 page
- Internal PDF: PASSED, 2 pages
- Excel: PASSED, OpenXML structure verified
- Print: PASSED, CSS pagination/layout guards verified
- Customer/internal separation: PASSED
- Customer safety: PASSED

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - Excel native viewer pixel automation
  - OS print dialog click automation

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning

## Deferred Items

- Excel native viewer pixel automation
- OS print dialog click automation
- Official `v0.4.6` release/tag
- GitHub Release and release asset publication

## Final Decision

`v0.4.6 RC Desktop Package 검증 완료`

공식 `v0.4.6` release/tag/GitHub Release는 아직 생성하지 않았다.
