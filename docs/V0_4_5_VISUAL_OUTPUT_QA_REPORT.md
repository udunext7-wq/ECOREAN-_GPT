# v0.4.5 Visual & Output QA Report

## Summary

- Branch: `v0.4.5-visual-output-qa-stabilization`
- Base commit: `efd612a`
- Official baseline: `v0.4.4`
- v0.4.4 accepted warnings addressed:
  - release smoke timeout: addressed by diagnostics runner
  - packaged visual QA gap: partially addressed with launch/source-label/customer-safety harness
  - output artifact render QA gap: addressed with synthetic PDF/XLSX/print artifact structure QA

## Release Smoke Diagnostics

- Harness: `tests/v0-4-5-release-smoke-diagnostics.js`
- Summary: `qa-output/v0.4.5/release-smoke-summary.json`
- Result: PASSED
- Project-root diagnostics duration: 175396 ms
- `npm run smoke:release:diagnose`: PASSED, 217628 ms
- `npm run smoke:release`: PASSED, 256725 ms
- Timed out tests: none
- Failed tests: none
- Remaining processes: none
- Root cause: previous single-process aggregate smoke runner could hang because every smoke was loaded via `require()` in one process and long-running tests were not isolated.
- Fix: each smoke now runs in an isolated child process with timeout, output tail, exit code, signal, and summary JSON. `project-profit-closing.smoke.js` has a documented slow-test timeout because standalone measurement was about 30.6 seconds.

## Packaged Visual QA

- Harness: `tests/v0-4-5-packaged-visual-qa.smoke.js`
- Manifest: `qa-output/v0.4.5/visual/visual-qa-manifest.json`
- Result: CONDITIONAL_PASSED
- Packaged EXE launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Remaining processes after stop: none
- Customer screen isolation: PASSED

### Screens Verified

| Screen | Result |
| --- | --- |
| First Entry Panel | PASSED |
| CEO Dashboard | PASSED |
| Address Normalization Center | PASSED |
| Calendar & Site Survey Sync Center | PASSED |
| Real Project Intake | PASSED |
| Estimate Screen | PASSED |
| Contract/Schedule/Order | PASSED |
| Client Portal Center | PASSED |

### Screens Requiring Manual Review

| Screen | Reason |
| --- | --- |
| Drawer Navigation | Source labels found partially; full click path not automated |
| CRM Pipeline Center | Source labels found partially; full click path not automated |
| Customer Portal Draft Center | Source labels found partially; full click path not automated |

Screenshot capture was not performed to avoid accidental capture of real desktop or production data.

## Output Artifact QA

- Harness: `tests/v0-4-5-output-artifact-render.smoke.js`
- Manifest: `qa-output/v0.4.5/output/output-qa-manifest.json`
- Result: PASSED_WITH_WARNINGS
- Synthetic fixture: `synthetic-v0.4.5-output-qa`
- Artifact count: 5

| Artifact | Result |
| --- | --- |
| Customer estimate PDF | PASSED |
| Internal cost PDF | PASSED |
| Customer Excel | PASSED |
| Internal Excel | PASSED |
| Customer print HTML | PASSED |

Known warning:

- `PDF_KOREAN_TEXT_ASCII_FALLBACK`: the existing basic PDF writer strips non-ASCII text for PDF safety. This is not a customer/internal leak, but true Korean PDF typography remains a future improvement.

## Electron Verification

- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED
- `npm run smoke:release`: PASSED
- Known warnings: Vite bundle size warning, SQLite experimental API warning.

## Customer Safety

- Existing customer safety regression: PASSED
- Visual harness customer portal source check: PASSED
- Output artifact customer safety: PASSED

## Issues Found

### P0

- None.

### P1

- None.

### P2

- None unresolved. The v0.4.4 `smoke:release` timeout is resolved by process isolation and bounded diagnostics.

### P3

- Full packaged click automation remains partial because no Playwright/Electron click driver is available in the current dependency set.
- Screenshot capture remains disabled by policy to avoid real desktop/customer data capture.
- PDF Korean typography is ASCII fallback.

### P4

- Pixel-level visual comparison.
- Full provider-backed calendar sync.
- Public customer portal deployment.
- Advanced PDF typography engine.

## Final Decision

`CONDITIONAL_MERGE_READY`

No P0/P1 issues were found. Required QA reliability improved materially and `smoke:release` now exits normally. Remaining gaps are packaged click/pixel automation and Korean PDF typography, both documented as non-blocking P3/P4 items.
