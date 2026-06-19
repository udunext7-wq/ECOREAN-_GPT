# v0.4.5 Visual & Output QA Stabilization Final Merge Report

## Summary

- Source branch: `v0.4.5-visual-output-qa-stabilization`
- Base official version: `v0.4.4`
- Official `v0.4.4` tag target: `36aaa3d98b26743a828a879d878b142e9e003905`
- Implementation commit: `d9d84f2`
- Stabilization commit: `e3089e6`
- Merge commit: `a1e2213`
- Main-context smoke adjustment commit: `86d2596`
- Merge conflict: none
- Final decision: `v0.4.5 Visual & Output QA Stabilization main 반영 완료, CONDITIONAL_MERGE_READY`

## Scope

v0.4.5 is a Visual & Output QA stabilization step after the official `v0.4.4` operational baseline. It does not create the official `v0.4.5` release, does not publish release assets, and does not enable external providers.

Included:

- Release smoke child-process isolation and diagnostics.
- Per-test timeout handling for slow release smoke entries.
- Packaged visual QA launch/source-label verification.
- Output artifact QA for PDF, Excel, and print HTML.
- Customer/internal separation checks.
- Customer safety regression preservation.
- QA artifact ignore rules for generated output.

Excluded / deferred:

- Full packaged visual click automation.
- Pixel-level screenshot comparison.
- Safe screenshot capture mode.
- PDF Korean typography improvement.
- Output artifact rendered visual inspection expansion.
- Future official v0.4.5 release package validation.

## Release Smoke Timeout Root Cause

The release smoke timeout came from the aggregate release smoke running long-running tests inside a single process with a default 30000 ms boundary. The consistently relevant slow test was:

- `project-profit-closing.smoke.js`

This test can cross the 30-second boundary on slower runs, even when it eventually exits successfully. The fix is not a global timeout increase; it is child-process isolation with per-test diagnostics and a documented per-test timeout.

## Timeout Fix

- `tests/release-candidate.smoke.js` now uses release smoke diagnostics.
- `tests/v0-4-5-release-smoke-diagnostics.js` records:
  - per-test duration
  - exit code and signal
  - timed out tests
  - failed tests
  - stdout/stderr tails
  - remaining process checks
- `project-profit-closing.smoke.js` has documented `timeoutMs: 60000`.
- `smoke:release:diagnose` is available from the Electron package.

## Pre-Merge Validation

Pre-merge branch state:

- Branch: `v0.4.5-visual-output-qa-stabilization`
- HEAD: `e3089e6`
- Origin sync: `0/0`
- Working tree: clean
- `v0.4.5*` tags: none
- Official `v0.4.4` target: `36aaa3d98b26743a828a879d878b142e9e003905`

Pre-merge test results:

- Service syntax: PASSED
- v0.4.5 branch stabilization smoke: PASSED
- v0.4.5 release smoke diagnostics: PASSED
- v0.4.5 packaged visual QA: `CONDITIONAL_PASSED`
- v0.4.5 output artifact QA: `PASSED_WITH_WARNINGS`
- RC-0.4.4 packaged release regression: PASSED
- RC-0.4.4 branch stabilization regression: PASSED
- RC-0.4.4 calendar/site survey regression: PASSED
- RC-0.4.3 packaged release regression: PASSED
- RC-0.4.3 customer portal draft regression: PASSED
- RC-0.4.2 packaged release regression: PASSED
- RC-0.4.1 packaged release regression: PASSED
- RC-0.4.0 packaged release regression: PASSED
- Real project intake regression: PASSED
- LightBIM customer safety regression: PASSED
- LightBIM BOC release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED
- `npm run smoke:release`: PASSED

Pre-merge timing:

- Project-root diagnostics: `173584 ms`
- `npm run smoke:release:diagnose`: `190745 ms`
- `npm run smoke:release`: `165554 ms`
- Timed out tests: none
- Failed tests: none
- Remaining processes: none

## Post-Merge Validation

Post-merge main state:

- Merge commit: `a1e2213`
- Merge conflict: none
- Main-context smoke adjustment: `86d2596`

Post-merge test results:

- v0.4.5 branch stabilization smoke: PASSED on `main`
- v0.4.5 release smoke diagnostics: PASSED
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
- `npm run smoke:release:diagnose`: PASSED
- `npm run smoke:release`: PASSED

Post-merge timing:

- Project-root diagnostics: `171518 ms`
- `npm run smoke:release:diagnose`: `149741 ms`
- `npm run smoke:release`: `148005 ms`
- Timed out tests: none
- Failed tests: none
- Remaining processes: none

## Packaged Visual QA

- Result: `CONDITIONAL_PASSED`
- Packaged EXE launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Customer safety by screen: PASSED
- Full click automation: partial / deferred
- Pixel-level screenshot comparison: deferred
- Screenshot capture: intentionally not captured to avoid real desktop or customer data capture

The visual QA result is intentionally not recorded as full PASSED because packaged click/pixel automation remains a P3 follow-up.

## Output Artifact QA

- Result: `PASSED_WITH_WARNINGS`
- Artifact count: 5
- Customer estimate PDF: PASSED
- Internal cost PDF: PASSED
- Customer Excel: PASSED
- Internal Excel: PASSED
- Customer print HTML: PASSED
- Customer/internal separation: PASSED
- Customer forbidden terms: no leak detected
- Known warning: `PDF_KOREAN_TEXT_ASCII_FALLBACK`

The PDF Korean text fallback is non-blocking for this stabilization step and remains a typography improvement item.

## Customer Safety

- LightBIM customer safety regression: PASSED
- Customer-facing payloads checked:
  - portal
  - estimate
  - contract
  - customer map
  - proposal board
- Forbidden internal/customer-sensitive fields: not exposed
- Customer/internal output separation: PASSED

## Findings

- P0: none
- P1: none
- P2: release smoke timeout risk resolved with child-process diagnostics and per-test timeout
- P3:
  - full packaged visual click automation remains partial
  - pixel-level screenshot comparison remains deferred
  - safe screenshot capture mode remains deferred
  - PDF Korean typography improvement remains deferred

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- PDF Korean text ASCII fallback
- npm update notice if shown
- Node deprecation warning if shown

## Deferred Items

- Full packaged visual click automation
- Pixel-level screenshot comparison
- Safe screenshot capture mode
- PDF Korean typography improvement
- Output artifact rendered visual inspection expansion
- Future official v0.4.5 release package validation

## Final Decision

`v0.4.5 Visual & Output QA Stabilization main 반영 완료, CONDITIONAL_MERGE_READY`

This is not the official `v0.4.5` release. It is the `v0.4.5-rc` source candidate for Visual & Output QA stabilization. Full packaged click/pixel automation and PDF Korean typography improvements remain follow-up QA work.
