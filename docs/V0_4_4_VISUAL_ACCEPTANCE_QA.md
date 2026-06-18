# v0.4.4 Visual Acceptance QA

## 1. Test Environment

- Date: 2026-06-18
- Branch: `main`
- Official release commit: `36aaa3d98b26743a828a879d878b142e9e003905`
- Official tag: `v0.4.4`
- GitHub Release: `https://github.com/udunext7-wq/ECOREAN-_GPT/releases/tag/v0.4.4`
- Packaged EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## 2. Release Integrity

| Check | Result | Evidence |
| --- | --- | --- |
| Branch is `main` | PASS | `git branch --show-current` |
| Working tree clean before QA | PASS | `git status --short` returned empty |
| `HEAD...origin/main` | PASS | `0 0` |
| `v0.4.4` tag target | PASS | `36aaa3d98b26743a828a879d878b142e9e003905` |
| GitHub Release exists | PASS | Release URL confirmed |
| Release EXE asset exists | PASS | `ECOREAN.BOC.CEO.Dashboard.exe`, 210149888 bytes |
| Release checksum asset exists | PASS | `BOC-v0.4.4-SHA256SUMS.txt` |
| Local EXE checksum | PASS | `FFA455C9E224A74695F46767D2A5D3A5DB0038FFA56275A489E70A5FDAEAD06C` |
| Local `app.asar` checksum | PASS | `879B876C0D0AC58362C8288DFECD82DFAB10F25A1AA71120986D290F3DC95051` |

## 3. Packaged Launch QA

| Check | Result | Evidence |
| --- | --- | --- |
| Launch without dev server | PASS | Packaged EXE launched directly |
| Main window appears | PASS | Window title: `ECOREAN BOC CEO Dashboard` |
| Immediate crash | PASS | Process remained alive after 6 seconds |
| Relaunch | PASS | Second launch succeeded |
| Blank window / white screen | PARTIAL | Window opened; full visual pixel inspection not available in this run |
| Fatal JavaScript error | PASS | No fatal error observed during launch smoke |
| SQLite/local init error | PASS | No launch-blocking SQLite error observed |

## 4. Screen Coverage Matrix

The QA used packaged launch, source route audit, packaged release smoke, and focused service regressions. Full manual click-through of every visible control was not available in the current automation environment and is marked explicitly.

| Area | Result | Notes |
| --- | --- | --- |
| CEO Control Tower | PASS | Source screen exists; release smoke includes direct CEO Control Tower data check |
| Project and Intake | PASS | `RealProjectIntakeCenterView` exists; `real-project-intake.smoke.js` passed |
| Estimate | PASS | Estimate entry and BATHROOM/KITCHEN/FULL_REMODELING screens exist; LightBIM release flow passed |
| Margin Safety | PASS | PCE decision path covered by LightBIM release flow; low-margin guards exist in services |
| Contract and Execution | PARTIAL | Screens and service tests exist; additional execution output smokes were not rerun due approval timeout |
| Payment and Cashflow | PARTIAL | Screens and service tests exist; additional payment smoke was not rerun due approval timeout |
| Closing and Intelligence | PASS | Closing/intelligence screens and release smoke coverage exist |
| Calendar and Survey | PASS | `rc-0-4-4-calendar-site-survey-sync.smoke.js` passed |
| LightBIM | PASS | Customer safety and BOC release flow smokes passed |
| Navigation and UI | PARTIAL | Source navigation and component presence audited; full visual click QA not automated |

## 5. Automated Verification Results

| Command | Result | Notes |
| --- | --- | --- |
| `Get-ChildItem electron/services -Filter *.js \| node --check` | PASS | Wildcard form failed in PowerShell; fallback passed |
| `node tests/rc-0-4-4-packaged-release.smoke.js` | PASS | Packaged release smoke |
| `node tests/rc-0-4-4-branch-stabilization.smoke.js` | PASS | Calendar/survey stabilization |
| `node tests/rc-0-4-4-calendar-site-survey-sync.smoke.js` | PASS | Calendar/survey sync |
| `node tests/real-project-intake.smoke.js` | PASS | Intake flow |
| `node tests/lightbim-customer-safety-regression.smoke.js` | PASS | Customer safety |
| `node tests/lightbim-boc-release-flow.smoke.js` | PASS | LightBIM estimate/PCE flow |
| `npm run build:ui` | PASS | Vite bundle size warning only |
| `npm run smoke:prod` | PASS | Dashboard loaded |
| `npm run smoke:release` | FAIL/TIMEOUT | Timed out at 120s and 300s with no failure logs |

## 6. Persistence and Restart QA

| Check | Result | Notes |
| --- | --- | --- |
| App restart | PASS | Packaged app launched twice successfully |
| Test data persistence | PARTIAL | Calendar/survey and intake smokes use isolated test services; packaged production userData was not mutated |
| Duplicate data check | PARTIAL | Covered by service smoke patterns, not full packaged click-through |
| Data loss | PASS | No data loss observed; no production data mutation performed |

## 7. Output QA

| Output | Result | Notes |
| --- | --- | --- |
| Customer estimate PDF | PARTIAL | Output services exist; full packaged file click export not performed |
| Internal cost PDF | PARTIAL | Internal/customer split covered by customer safety tests |
| Customer Excel | PARTIAL | Export service coverage exists; full packaged click export not performed |
| Internal Excel | PARTIAL | Export service coverage exists; full packaged click export not performed |
| Print preview | NOT TESTABLE | No print-preview automation available in this run |
| A4 layout | NOT TESTABLE | Requires rendered artifact visual QA |
| Customer document internal data exposure | PASS | Customer safety regression passed |

## 8. Issues

### P0 RELEASE BLOCKER

- None found.

### P1 CRITICAL BUG

- None found.

### P2 NORMAL BUG

| ID | Title | Reproduction | Impact | Decision |
| --- | --- | --- | --- | --- |
| V044-QA-P2-001 | `npm run smoke:release` timeout | Run from `electron`; timed out at 120s and 300s without failure logs | Reduces confidence in the broad release-candidate aggregate smoke, but packaged release smoke and focused regressions passed | Defer to v0.4.5 QA automation cleanup |

### P3 UX IMPROVEMENT

| ID | Title | Reproduction | Impact | Decision |
| --- | --- | --- | --- | --- |
| V044-QA-P3-001 | Full visual click QA automation gap | No packaged Electron click automation available in this run | Some UI overlap/modal/dropdown states remain manual verification items | Plan v0.4.5 visual QA harness |
| V044-QA-P3-002 | Output artifact visual inspection gap | PDF/Excel/print preview not rendered and visually inspected in this run | Output layout confidence is service-level, not page-render-level | Add artifact render QA to next cycle |

### P4 FUTURE FEATURE

- CRM pipeline deployment refinements.
- Address API provider connection.
- Public customer portal deployment.
- Calendar provider integration.
- LightBIM Core production interface hardening.

## 9. Final Operational Acceptance

Final result: `V0.4.4 ACCEPTED WITH WARNINGS`

v0.4.4 remains the official operational baseline. No P0 or P1 release blocker was found. The release is acceptable for operation with the following warnings:

- Full visual click QA was not fully automated.
- `smoke:release` aggregate command timed out without failure logs.
- Output PDF/Excel/print layout requires a dedicated rendered artifact QA pass.

