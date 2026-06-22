# v0.4.5 RC Desktop Package Test Report

## Test Metadata

- Test date: 2026-06-22
- Branch: `main`
- RC tag: `v0.4.5-rc`
- RC tag target: `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`
- Official `v0.4.4` target: `36aaa3d98b26743a828a879d878b142e9e003905`
- Official `v0.4.5` tag: not created
- GitHub Release: not created

## Package

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2763157` bytes
- `npm run dist`: PASSED

## Actual Launch

- Launch run 1: PASSED
- Launch run 2: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Immediate exit: none
- Unresponsive app: none observed
- Dev server required: NO
- Remaining process after test: none
- Production userData intentional reset: none performed

## Pre-Package Regression

- Service syntax: PASSED
- v0.4.5 branch stabilization smoke: PASSED after allowing `v0.4.5-rc` while still blocking official `v0.4.5`
- v0.4.5 release smoke diagnostics: PASSED, `154886 ms`
- v0.4.5 packaged visual QA: `CONDITIONAL_PASSED`
- v0.4.5 output artifact QA: `PASSED_WITH_WARNINGS`
- RC-0.4.4 packaged release: PASSED
- RC-0.4.4 calendar/site survey sync: PASSED
- Real project intake: PASSED
- LightBIM customer safety regression: PASSED
- LightBIM BOC release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED, `161848 ms`
- `npm run smoke:release`: PASSED, `247454 ms`

## Post-Package QA

- v0.4.5 release smoke diagnostics: PASSED, `171934 ms`
- v0.4.5 packaged visual QA: `CONDITIONAL_PASSED`
- v0.4.5 output artifact QA: `PASSED_WITH_WARNINGS`
- Timeout result: none
- Remaining process result: none
- Customer/internal separation: PASSED
- Customer safety: PASSED

## Output Artifact Result

- PDF: PASSED with `PDF_KOREAN_TEXT_ASCII_FALLBACK` warning
- Excel: PASSED
- Print HTML: PASSED
- Customer/internal separation: PASSED

## Findings

- P0: none
- P1: none
- P2: none open
- P3:
  - full packaged click automation remains partial
  - pixel-level screenshot comparison remains deferred
  - safe screenshot capture mode remains deferred
  - PDF Korean typography improvement remains deferred

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning
- PDF Korean text ASCII fallback

## Deferred Items

- Full packaged visual click automation
- Pixel-level screenshot comparison
- Safe screenshot capture mode
- PDF Korean typography improvement
- Official v0.4.5 release package validation
- GitHub Release and release asset publication

## Final Decision

`v0.4.5 RC Desktop Package 검증 완료`

공식 `v0.4.5` release/tag/GitHub Release는 아직 생성하지 않았다.
