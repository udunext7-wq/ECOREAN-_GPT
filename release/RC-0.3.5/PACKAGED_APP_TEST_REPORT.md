# RC-0.3.5 Packaged App Test Report

## Summary

- Test date: 2026-06-05
- Version: RC-0.3.5
- Tag: `v0.3.5-rc`
- Commit: `ba7df50`
- Package type: `windows-unpacked`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Final decision: `RC-0.3.5 desktop release package 사용 가능`

## Launch Result

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen rendered: YES

## Runtime Paths

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Folder Result

- userData folder: PASSED
- export folder: PASSED
- backup folder: PASSED
- required export subfolders: PASSED
- required backup subfolders: PASSED

## Price Readiness Impact Result

| 상태 / 유형 | 리스크 | 권장 조치 |
| --- | --- | --- |
| READY / all | `LOW` | 견적 진행 가능 |
| PARTIAL / BATHROOM | `MEDIUM` | 대표 검토 후 진행 |
| PARTIAL / KITCHEN | `HIGH` | 단가 보정 후 진행 |
| PARTIAL / FULL_REMODELING | `HIGH` | 단가 보정 후 진행 |
| NEEDS_UPDATE / all | `BLOCKING` | 견적 차단 |

- fallback line item count: PASSED
- confirmed line item count: PASSED
- margin impact: PASSED
- PCE decision linkage: PASSED
- CEO action required: PASSED

## Customer Safety Result

Customer safety: PASSED.

Customer-facing payloads do not expose price readiness impact, risk level, fallback price, internal cost, margin, PCE, vendor/labor/purchase/receiving data, variance, calibration, approval queue, internal, profit, risk_score, detailed address, customer phone/email, or memo.

## Tests

Validated:

```powershell
node tests/rc-0-3-5-packaged-release.smoke.js
node tests/rc-0-3-5-branch-stabilization.smoke.js
node tests/rc-0-3-5-price-readiness-impact.smoke.js
node tests/lightbim-customer-safety-regression.smoke.js
node tests/real-project-intake.smoke.js
cd electron
npm run build:ui
npm run smoke:prod
npm run smoke:release
npm run dist
cd ..
```

## Known Warnings

- Vite bundle size warning
- SQLite experimental warning
- Electron metadata warning if emitted by packaging
- Node DEP warning if emitted
- npm update notice if emitted
