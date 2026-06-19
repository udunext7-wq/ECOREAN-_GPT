# v0.4.5 Stabilization Report

## Summary

- Branch: `v0.4.5-visual-output-qa-stabilization`
- Base official version: `v0.4.4`
- Official `v0.4.4` tag target: `36aaa3d98b26743a828a879d878b142e9e003905`
- Implementation commit: `d9d84f2`
- Stabilization objective: verify and harden the v0.4.5 QA reliability work before any main merge.

## Previous v0.4.4 Issue

`npm run smoke:release` previously timed out at 120 seconds and 300 seconds without failure logs. The aggregate runner loaded every smoke test in one Node process with `require()`, which made timeout attribution weak and could leave the release gate waiting on a long-running test or open handle.

## Root Cause

The root cause was the combination of:

- single-process aggregate smoke execution
- no per-test process isolation
- no per-test timeout/reporting
- long-running `project-profit-closing.smoke.js`, measured at about 30.6 seconds standalone on Windows/Node 24

## Stabilization Fix

- `tests/release-candidate.smoke.js` now delegates to the v0.4.5 diagnostics runner.
- `tests/v0-4-5-release-smoke-diagnostics.js` runs each smoke in a child process.
- Each test records duration, exit code, signal, timeout status, stdout tail, stderr tail, and known warnings.
- `project-profit-closing.smoke.js` has a documented per-test `60000 ms` timeout.
- `qa-output/`, generated PDFs, Excels, and screenshots are ignored by Git.

## Before / After

| Check | Before | After |
| --- | --- | --- |
| `smoke:release` | Timeout at 120s and 300s | PASSED |
| Failure attribution | Unknown | Per-test script name, exit code, signal, stdout/stderr tail |
| Remaining process check | Not explicit | Recorded in summary JSON |
| Long-running smoke handling | Global timeout boundary | Documented per-test timeout |

## Final Measured Results

- Project-root diagnostics: PASSED, `175396 ms`
- `npm run smoke:release:diagnose`: PASSED, `217628 ms`
- `npm run smoke:release`: PASSED, `256725 ms`
- Timed out tests: none
- Failed tests: none
- Remaining processes: none

## Packaged Visual QA

- Test: `tests/v0-4-5-packaged-visual-qa.smoke.js`
- Result: `CONDITIONAL_PASSED`
- Packaged EXE launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Customer screen isolation: PASSED
- Screenshot policy: `NOT_CAPTURED_TO_AVOID_REAL_DESKTOP_OR_CUSTOMER_DATA_CAPTURE`

Remaining limitation:

- Full click/pixel automation is still partial because no packaged Electron click driver is available in the current dependency set.

## Output Artifact QA

- Test: `tests/v0-4-5-output-artifact-render.smoke.js`
- Result: `PASSED_WITH_WARNINGS`
- Customer estimate PDF: PASSED
- Internal cost PDF: PASSED
- Customer Excel: PASSED
- Internal Excel: PASSED
- Customer print HTML: PASSED
- Customer/internal separation: PASSED

Known warning:

- `PDF_KOREAN_TEXT_ASCII_FALLBACK`: existing basic PDF writer uses ASCII-safe text output. This is not a customer/internal data leak, but Korean PDF typography remains a future improvement.

## Customer Safety

- Customer-facing visual/source checks: PASSED
- Customer output PDF/Excel/print separation: PASSED
- LightBIM customer safety regression: PASSED
- No internal cost, margin, PCE, queue, runtime path, token, provider payload, raw phone/email, or detailed internal address was allowed in customer-facing output QA.

## Regression Summary

- Syntax checks: PASSED
- v0.4.5 release diagnostics: PASSED
- v0.4.5 packaged visual QA: CONDITIONAL_PASSED
- v0.4.5 output artifact QA: PASSED_WITH_WARNINGS
- RC-0.4.4 / 0.4.3 / 0.4.2 / 0.4.1 / 0.4.0 / 0.3.9 regressions: PASSED
- Real project intake: PASSED
- LightBIM BOC release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED
- `npm run smoke:release`: PASSED

## Findings

### P0

- None.

### P1

- None.

### P2

- Previous aggregate smoke timeout: fixed.

### P3

- Packaged click/pixel automation remains partial.
- Screenshot capture is disabled to protect desktop/customer data.
- PDF Korean typography uses ASCII fallback.

### P4

- Full pixel diffing.
- Advanced PDF typography engine.
- External provider-backed calendar sync.

## Deferred Items

- Add a dedicated packaged Electron click driver if the project accepts a test dependency.
- Add privacy-safe screenshot capture with controlled fixture userData.
- Replace basic ASCII PDF writer with Korean-capable PDF rendering.

## Final Decision

`CONDITIONAL_MERGE_READY`

The v0.4.5 QA stabilization is safe to review for merge. It removes the release smoke timeout and adds concrete visual/output QA gates, but remains conditional because full click/pixel automation is not yet implemented.
