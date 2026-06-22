# v0.4.5 Official Acceptance QA

## Summary

- Version: `v0.4.5`
- RC tag: `v0.4.5-rc`
- RC target: `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`
- RC package docs commit: `c46f378`
- Official v0.4.4 tag target: `36aaa3d98b26743a828a879d878b142e9e003905`
- Official v0.4.5 tag target: Acceptance QA documentation commit
- GitHub Release: `NOT_CREATED`
- Release asset upload: `NOT_CREATED`
- Final release decision: `ACCEPTED_WITH_WARNINGS`

v0.4.5 is a QA and operational reliability release. It does not add new business modules. It stabilizes release smoke behavior, packaged visual QA coverage, output artifact QA, and customer/internal separation after the official v0.4.4 operational baseline.

## Package Identity

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA256: `FFA455C9E224A74695F46767D2A5D3A5DB0038FFA56275A489E70A5FDAEAD06C`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2763157` bytes
- app.asar SHA256: `879B876C0D0AC58362C8288DFECD82DFAB10F25A1AA71120986D290F3DC95051`

## Packaged Launch

- Actual launch: PASSED
- Runs: 2
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- Immediate exit: none
- Unresponsive state: none observed
- Production userData intentional reset: none performed
- Remaining process after test: none

## Official Acceptance QA Results

- Service syntax: PASSED
- v0.4.5 RC packaged smoke: PASSED
- v0.4.5 branch stabilization smoke: PASSED
- v0.4.5 release smoke diagnostics: PASSED, `166824 ms`
- v0.4.5 packaged visual QA: `CONDITIONAL_PASSED`
- v0.4.5 output artifact QA: `PASSED_WITH_WARNINGS`
- RC-0.4.4 packaged release regression: PASSED
- RC-0.4.4 calendar/site survey regression: PASSED
- RC-0.4.3 packaged release regression: PASSED
- RC-0.4.2 packaged release regression: PASSED
- RC-0.4.1 packaged release regression: PASSED
- RC-0.4.0 packaged release regression: PASSED
- Real project intake regression: PASSED
- LightBIM customer safety regression: PASSED
- LightBIM BOC release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED, `141883 ms`
- `npm run smoke:release`: PASSED, `147053 ms`
- Timeout result: none
- Failed tests: none
- Remaining process result: none

## Customer Safety Acceptance

Customer-facing payloads and output surfaces were checked for internal and sensitive fields.

Forbidden data checked:

- internal cost
- vendor price
- labor cost
- margin and margin rate
- profit
- PCE
- recommendation scoring
- queue data
- internal action / notification / memo
- raw phone/email
- detailed internal address
- provider payload
- coordinates
- internal file path
- runtime DB path
- token/credential
- internal calendar conflict detail
- mismatch detail
- provider hash/error

Result: PASSED. No customer-facing leak was detected.

## Output Acceptance

- PDF generation/parse: PASSED
- PDF Korean typography: `PDF_KOREAN_TEXT_ASCII_FALLBACK` known warning
- Excel generation/structure: PASSED
- Print HTML generation/structure: PASSED
- Customer/internal separation: PASSED
- Generated output files: not committed

The PDF Korean fallback is accepted as a P3/P4 known warning because customer data is not leaked, document generation does not fail, and required amount/structure checks pass.

## Findings

- P0: none
- P1: none
- P2: none open
- P3:
  - full packaged visual click automation remains partial
  - pixel-level screenshot comparison remains deferred
  - safe screenshot capture mode remains deferred
  - PDF Korean typography improvement remains deferred

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning
- npm update notice if shown
- `PDF_KOREAN_TEXT_ASCII_FALLBACK`

## Deferred Items

- Full packaged visual click automation
- Pixel-level screenshot comparison
- Safe screenshot capture mode
- PDF Korean typography/output render improvement
- GitHub Release creation and release asset upload, if approved as a separate release publication step

## Final Release Decision

`ACCEPTED_WITH_WARNINGS`

Reason:

- P0/P1: none
- Open P2: none
- Customer safety: PASSED
- Release smoke timeout: resolved
- Packaged app launch: PASSED
- Output artifact QA: PASSED_WITH_WARNINGS
- Known P3 visual/pixel/PDF typography gaps are documented and deferred

Final 판정 문구:

`v0.4.5 ACCEPTED WITH WARNINGS`
