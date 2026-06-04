# RC-0.3.5 Packaged Operational Baseline

## Summary

- Baseline commit: `29b8074 Build RC-0.3.5 desktop release package`
- Source tag: `v0.3.5-rc`
- Packaged baseline tag: `v0.3.5-rc-packaged`
- Final decision: `RC-0.3.5 packaged operational baseline 사용 가능`

## Preserved Tags

- `v0.3.0-rc`
- `v0.3.1-rc`
- `v0.3.2-rc`
- `v0.3.2-rc-packaged`
- `v0.3.3-rc`
- `v0.3.3-rc-packaged`
- `v0.3.4-rc`
- `v0.3.4-rc-packaged`
- `v0.3.5-rc`

## Packaged App

- Executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Package type: `windows-unpacked`
- Window title verified: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO

## Runtime Paths

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Verified Flow

- packaged app launch
- READY / PARTIAL / NEEDS_UPDATE risk decision
- BATHROOM / KITCHEN / FULL_REMODELING risk criteria
- fallback line item count
- confirmed line item count
- margin impact
- PCE decision
- CEO action required
- customer safety

## Price Readiness Results

| Status / Estimate type | Risk | Recommended action |
| --- | --- | --- |
| READY / all | `LOW` | 견적 진행 가능 |
| PARTIAL / BATHROOM | `MEDIUM` | 대표 검토 후 진행 |
| PARTIAL / KITCHEN | `HIGH` | 단가 보정 후 진행 |
| PARTIAL / FULL_REMODELING | `HIGH` | 단가 보정 후 진행 |
| NEEDS_UPDATE / all | `BLOCKING` | 견적 차단 |

## Customer Safety Result

Customer safety: PASSED.

Customer-facing payloads do not expose:

- price readiness impact
- risk_level
- fallback price
- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- variance
- calibration
- approval queue
- internal
- profit
- risk_score
- detailed address
- customer phone/email
- memo

## Final Validation

Validated commands:

```powershell
Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }
node tests/rc-0-3-5-packaged-release.smoke.js
node tests/rc-0-3-5-branch-stabilization.smoke.js
node tests/rc-0-3-5-price-readiness-impact.smoke.js
node tests/rc-0-3-4-packaged-release.smoke.js
node tests/real-project-intake.smoke.js
node tests/lightbim-customer-safety-regression.smoke.js
node tests/lightbim-boc-release-flow.smoke.js
cd electron
npm run build:ui
npm run smoke:prod
npm run smoke:release
cd ..
```

## Known Warnings

- Vite bundle size warning
- SQLite experimental warning
- electron-builder metadata warning if packaging is run
- Node DEP0190 warning if emitted by packaging

## Next Direction

- RC-0.3.6: 단가 보정 UX 고도화
- RC-0.4.0: CRM pipeline / 주소 API / 고객 포털 배포 / 일정 연동

## Final Decision

`RC-0.3.5 packaged operational baseline 사용 가능`

`v0.3.5-rc` remains the source release candidate tag. `v0.3.5-rc-packaged` is the packaged execution baseline tag.
