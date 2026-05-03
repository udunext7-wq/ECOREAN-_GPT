# NEXT ACTION

Version: `ECOREAN BOC MVP RC-0.1.0`
Date: 2026-04-26
Owner: 대표님

## Immediate Development Priority

`Estimate Wizard + Approval Flow Margin Safety Enforcement`

목표:

욕실 견적 생성 시 고객가가 자동으로 Margin Safety Rule을 통과해야만 `FINAL_ESTIMATE`로 갈 수 있게 한다.

## Why This Is First

`PRJ-PROD-BATH-0001`의 실제 결과:

- 고객가: `5,490,000원`
- 실제 총원가: `5,070,000원`
- 실제 마진: `420,000원`
- 실제 마진율: `7.65%`

결론:

계약은 됐지만 돈이 거의 남지 않았다.

따라서 다음 욕실 프로젝트부터는 견적 단계에서 저마진 수주를 자동 차단해야 한다.

## Required Build

### 1. Estimate Wizard 연결

욕실 견적 생성 시 패키지 선택을 추가한다.

- Basic
- Standard
- Premium

고객가 입력 시 자동 계산한다.

- 예상 원가
- 예상 마진
- 예상 마진율
- 수주 가능 여부

### 2. Margin Safety Rule 적용

Rule:

- `20% 미만`: `BLOCKED`
- `20~25%`: `CEO_APPROVAL_REQUIRED`
- `25% 이상`: `PASS`
- `30% 이상`: `PRIORITY`

### 3. Final Estimate Approval 연결

`FINAL_ESTIMATE` 승인 전 반드시 확인한다.

- `marginSafetyStatus`
- `selectedBathroomPackage`
- `customerOfferPrice`
- `estimatedCost`
- `estimatedMargin`
- `estimatedMarginRate`
- `marginSafetyDecision`

차단:

- `BLOCKED` 상태는 FINAL_ESTIMATE 전환 불가
- `CEO_APPROVAL_REQUIRED` 상태는 대표 승인 로그 없이는 FINAL_ESTIMATE 전환 불가

### 4. Dashboard 경고

CEO Dashboard에 저마진 경고를 표시한다.

- 저마진 견적 대기
- CEO 승인 필요 견적
- 자동 차단 견적
- V1 위험 Case: `PRJ-PROD-BATH-0001`

## Files To Modify Next

Likely files:

- `ui/app/estimate/NewEstimateWizard.tsx`
- `ui/app/estimate/EstimatePreview.tsx`
- `ui/app/approvals/EstimateApprovalView.tsx`
- `ui/services/estimate-service/estimateDraftService.ts`
- `ui/services/margin-safety-service/marginSafetyService.ts`
- `electron/services/sqliteService.js`
- `electron/main.js`
- `electron/preload.js`
- `ui/src/types/electron.d.ts`
- `ui/src/types/dashboard.ts`

Potential DB additions:

- `estimate_margin_safety_checks`
- `estimate_draft_margin_safety`
- `final_estimate_margin_safety_logs`

## Current Pricing Standard

Bathroom Pricing Standard V2:

| Package | Minimum Allowed | Recommended |
| --- | ---: | ---: |
| Basic | 5,530,000원 | 5,900,000원 |
| Standard | 6,760,000원 | 6,800,000원 |
| Premium | 7,250,000원 | 7,300,000원 |

Current 5,490,000원 quote result:

- Basic: `BLOCKED`
- Standard: `BLOCKED`

## Operating Principle

대표님은 작업자가 아니라 승인자다.

System should surface only meaningful decisions:

- 이 견적은 해도 되는가?
- 얼마 밑으로는 받으면 안 되는가?
- 대표 승인이 필요한가?
- 이 프로젝트가 돈을 남기는가?

## Do Not Do Yet

- Do not manually change Master DB prices without approval flow.
- Do not remove `PRJ-PROD-BATH-0001`; keep it as the learning Case.
- Do not guess supplier prices.
- Do not bypass Margin Safety for bathroom projects.
- Do not allow `FINAL_ESTIMATE` without margin safety status.

## Definition Of Done

This next task is complete when:

1. Estimate Wizard shows Basic / Standard / Premium selection.
2. Customer price input calculates margin automatically.
3. Low-margin quote is blocked.
4. 20~25% quote requires CEO approval.
5. `FINAL_ESTIMATE` approval checks `marginSafetyStatus`.
6. Dashboard shows low-margin warnings.
7. `PRJ-PROD-BATH-0001` remains Case Library evidence, not a reusable pricing standard.

