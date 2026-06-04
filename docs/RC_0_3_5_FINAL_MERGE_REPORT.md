# RC-0.3.5 Final Merge Report

## Summary

- Source branch: `rc-0.3.5-price-readiness-impact-analysis`
- Base tags:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
  - `v0.3.2-rc`
  - `v0.3.2-rc-packaged`
  - `v0.3.3-rc`
  - `v0.3.3-rc-packaged`
  - `v0.3.4-rc`
  - `v0.3.4-rc-packaged`
- Merge date: 2026-06-04
- Merge commit: `2377194 Merge RC-0.3.5 price readiness impact analysis branch`
- Final decision: `RC-0.3.5 = 단가 준비 상태 리스크 판단 흐름 main 반영 가능`

## Included Commits

- `42e6fa9 Start RC-0.3.5 price readiness impact analysis`
- `97adb9d Stabilize RC-0.3.5 price readiness impact analysis branch`
- `60e9a03 Fix release candidate smoke exit handling`

## Price Readiness Results

| Price readiness | Result |
| --- | --- |
| READY | All estimate types remain `LOW` risk and can proceed. |
| PARTIAL | Allowed with warning. Bathroom is `MEDIUM`; kitchen and full remodeling are `HIGH`. |
| NEEDS_UPDATE | All estimate types are `BLOCKING` and should not proceed to customer output. |

## Estimate Type Results

| Estimate type | READY | PARTIAL | NEEDS_UPDATE |
| --- | --- | --- | --- |
| BATHROOM | `LOW` / 견적 진행 가능 | `MEDIUM` / 대표 검토 후 진행 | `BLOCKING` / 견적 차단 |
| KITCHEN | `LOW` / 견적 진행 가능 | `HIGH` / 단가 보정 후 진행 | `BLOCKING` / 견적 차단 |
| FULL_REMODELING | `LOW` / 견적 진행 가능 | `HIGH` / 단가 보정 후 진행 | `BLOCKING` / 견적 차단 |

## Margin Impact

- READY: confirmed prices are sufficient for normal margin review.
- PARTIAL: estimated/fallback items may distort internal cost and margin.
- PARTIAL kitchen/full remodeling: margin impact is treated as high because more line items and interdependent work scopes are affected.
- NEEDS_UPDATE: margin review is not reliable enough for customer-facing output.

## PCE Result

- READY: PCE may proceed with normal decision handling.
- PARTIAL bathroom: PCE may proceed with representative review.
- PARTIAL kitchen/full remodeling: PCE should guide the CEO toward price calibration before proceeding.
- NEEDS_UPDATE: PCE should block estimate progression until price readiness improves.

## Risk Level / Recommended Action

| Risk level | Recommended action |
| --- | --- |
| LOW | 견적 진행 가능 |
| MEDIUM | 대표 검토 후 진행 |
| HIGH | 단가 보정 후 진행 |
| BLOCKING | 견적 차단 |

## Customer Safety Result

Customer safety result: PASSED.

Customer-facing payloads do not expose:

- internal cost
- margin
- PCE
- vendor/labor/purchase data
- variance
- calibration
- approval queue
- fallback line item count
- confirmed line item count
- price readiness impact details
- internal/profit/risk_score fields

## Test Results

Pre-merge validation on `rc-0.3.5-price-readiness-impact-analysis`: PASSED.

Post-merge validation on `main`: PASSED.

Validated commands:

```powershell
Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }
node tests/rc-0-3-5-branch-stabilization.smoke.js
node tests/rc-0-3-5-price-readiness-impact.smoke.js
node tests/rc-0-3-4-packaged-release.smoke.js
node tests/rc-0-3-4-branch-stabilization.smoke.js
node tests/rc-0-3-4-actual-customer-pilot-expansion.smoke.js
node tests/real-project-intake.smoke.js
node tests/lightbim-customer-safety-regression.smoke.js
cd electron
npm run build:ui
npm run smoke:prod
npm run smoke:release
cd ..
```

## Known Deferred Items

- 주방/전체 리모델링 PARTIAL 상태의 검토 부담
- 단가 보정 UX 고도화
- LightBIM 수량 검토 UX
- PCE 해석 안내
- CRM pipeline
- address API
- customer portal deployment
- calendar integration
- cloud sync
- bundle optimization

## Known Warnings

- Vite bundle size warning
- SQLite experimental warning
- Electron metadata warning if packaging is run
- Node DEP warning if emitted
- npm update notice if emitted

## Final Decision

`MERGE_READY`

RC-0.3.5 can be used as the main baseline for price readiness impact analysis. The branch was merged after pre-merge and post-merge tests passed, and customer-facing output remains safe.
