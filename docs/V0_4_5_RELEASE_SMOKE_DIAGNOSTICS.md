# v0.4.5 Release Smoke Diagnostics

## Baseline

- Branch: `v0.4.5-visual-output-qa-stabilization`
- Base commit: `efd612a`
- Official operational baseline: `v0.4.4`
- Official tag target preserved: `36aaa3d98b26743a828a879d878b142e9e003905`

## Problem

In v0.4.4 acceptance, `npm run smoke:release` timed out at both 120 seconds and 300 seconds without failure logs. The previous aggregate runner loaded every smoke script in a single Node process via `require()`. That structure made the whole command vulnerable to a single slow script, open handle, timer, or child process.

## v0.4.5 Change

- Added `tests/v0-4-5-release-smoke-diagnostics.js`.
- Refactored `tests/release-candidate.smoke.js` to use the diagnostics runner.
- Added Electron package scripts:
  - `smoke:release:diagnose`
  - `smoke:release:timed`
- Added `qa-output/` to `.gitignore`.

## Diagnostics Behavior

Each smoke test is now executed as an isolated child process with:

- per-test start and completion timestamps
- duration in milliseconds
- exit code
- signal
- timeout detection
- stdout/stderr tail capture
- known warning extraction
- slowest test summary
- remaining Electron/ECOREAN process check

Output:

`qa-output/v0.4.5/release-smoke-summary.json`

## Result

- Previous behavior: aggregate timeout at 120s and 300s.
- New diagnostic run from project root: PASSED.
- Project-root diagnostics duration: 175396 ms.
- `npm run smoke:release:diagnose` duration: 217628 ms.
- `npm run smoke:release` duration: 256725 ms.
- Timed out tests: none.
- Failed tests: none.
- Remaining processes: none.

## Slowest Tests

1. `project-profit-closing.smoke.js` - 30119 ms in final `smoke:release`
2. `master-data-management.smoke.js` - 11694 ms in final `smoke:release`
3. `project-calibration.smoke.js` - 10732 ms in final `smoke:release`
4. `ai-agent-automation.smoke.js` - 9592 ms in final `smoke:release`
5. `analytics-business-intelligence.smoke.js` - 8452 ms in final `smoke:release`

## Root Cause

The timeout was caused by the aggregate single-process runner design combined with long-running smoke tests. `project-profit-closing.smoke.js` was measured at about 30.6 seconds standalone and now has an explicit documented slow-test timeout of 60000 ms. Running each smoke in a bounded child process removed the hang and produced deterministic completion plus failure localization.

## Resume Note

The first implementation run was interrupted by Codex approval usage limits. Validation resumed on 2026-06-19, reran syntax checks, v0.4.5 QA tests, Node regressions, Electron build/smoke commands, and confirmed the aggregate timeout no longer reproduces.

## Known Warnings

- SQLite experimental API warning.

## Decision

Release smoke timeout diagnosis: PASSED.
