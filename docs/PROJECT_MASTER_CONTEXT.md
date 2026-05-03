# ECOREAN BOC Project Master Context

Version: `ECOREAN BOC MVP RC-0.1.0`
Date: 2026-04-26
Owner: 대표님
Status: `RELEASE_CANDIDATE_LOCKED`

## 1. Project Identity

ECOREAN BOC는 단순 견적 프로그램이 아니다.

이 시스템은 인테리어 공사의 견적, 계약, 수금, 발주, 공정, 현장관리, 검수, 추가공사, 하자, 정산, 실제 원가, Case Library, Learning Suggestion, Living Master DB까지 연결하는 Build Operation Center의 시작점이다.

대표님은 작업자가 아니라 승인자다.

운영 원칙은 다음과 같다.

- 작은 승인 제거
- 큰 결과만 보고
- 대표는 작업자가 아니라 승인자
- 고객가보다 수익률 우선
- 계약률보다 안전한 마진 우선
- Master DB 직접 수정 금지
- 승인 없는 가격/마진/DB 변경 금지

## 2. Release Baseline

RC Version:

`ECOREAN BOC MVP RC-0.1.0`

Release baseline is locked.

Baseline folder:

`release/RC-0.1.0/`

Production / Development separation is complete.

Primary separated areas:

- `release/RC-0.1.0/production/`
- `release/RC-0.1.0/development/`
- `release/RC-0.1.0/backup/`
- `release/RC-0.1.0/export/`
- `release/RC-0.1.0/installer/`
- `release/RC-0.1.0/win-unpacked/`

Primary SQLite DBs:

- `project.db`
- `approval.db`
- `master.db`
- `logs.db`

RC baseline rule:

- Do not overwrite RC-0.1.0 casually.
- Development work continues in the normal workspace.
- Real operational data belongs in production DB.
- Before major production changes, backup first.

## 3. System Layer / Display Layer Rule

System Layer uses English:

- schema keys
- JSON fields
- database table names
- process IDs
- trigger types
- service names
- IPC/API names
- React/Electron code identifiers

Display Layer uses Korean:

- 대표 UI
- 고객 견적서
- 내부 보고서
- 공사일보
- 발주서
- 검수표
- 승인 사유
- 경고 메시지
- customerExplanation
- approvalReason

## 4. Completed Core Systems

The following systems are implemented in the current MVP baseline:

- CEO Dashboard
- Estimate Wizard
- Preliminary Estimate creation
- Estimate Draft Save/Edit
- Preliminary → Final Estimate Approval
- Final Estimate
- Execution Ready
- Site Operation
- Change Order Approval
- Project Completion
- Actual Cost Capture System V2
- Case Library
- Learning Suggestion
- Learning Approval
- Backup / Restore / Export
- 3D Ontology Viewer
- Margin Safety Dashboard
- Bathroom Pricing Standard V2
- SQLite actual save/load
- Notification Log
- Action Log
- Approval Log
- Rollback-oriented approval model

## 5. First Real Operating Project

Project ID:

`PRJ-PROD-BATH-0001`

Project:

구축 아파트 욕실 단독 리모델링

Status:

`COMPLETED`

Final result:

- Customer price: `5,490,000원`
- Actual total cost: `5,070,000원`
- Actual margin: `420,000원`
- Actual margin rate: `7.65%`

Result judgment:

저마진 위험 프로젝트.

Learning:

- V1 customer-price-first pricing must be discarded.
- Bathroom Pricing Standard V2 is now required.
- Actual Cost Capture System V2 must collect real costs during execution, not after completion.

## 6. Actual Cost Capture System V2

Goal:

실제 원가 누락을 구조적으로 막는다.

Mandatory captured categories:

- 철거
- 폐기물
- 타일
- 타일 부자재
- 인건비
- 운반비
- 기타 잡비

Current PRJ-PROD-BATH-0001 recovery:

- Previous captured baseline: `2,850,000원`
- Recovered missing costs: `2,220,000원`
- Final actual cost baseline: `5,070,000원`
- Missing critical cost count: `0`
- Completion block: cleared
- CEO Alert: maintained because final margin rate is too low

Recovery values are marked as:

`ACTUAL_COST_BASELINE_PENDING_SUPPLIER_PROOF`

Supplier invoices and transaction records can still override these baselines later.

## 7. Bathroom Pricing Standard V2

Bathroom Pricing Standard V2 is the current pricing rule for standalone bathroom remodeling.

V1 is superseded.

Core rule:

고객가 중심이 아니라 최소 마진율 중심.

Margin tiers:

- Below 20%: 자동 차단
- 20~25%: CEO 승인 필요
- 25% 이상: 진행 가능
- 30% 이상: 우선 수주 가능

Packages:

| Package | Cost Floor | Minimum Allowed Price | Recommended Price | Target Margin |
| --- | ---: | ---: | ---: | ---: |
| Basic | 4,420,000원 | 5,530,000원 | 5,900,000원 | 25% |
| Standard | 5,070,000원 | 6,760,000원 | 6,800,000원 | 25% |
| Premium | 5,070,000원 | 7,250,000원 | 7,300,000원 | 30% |

Basic / Standard / Premium are stored in `master.db`.

Tables:

- `bathroom_pricing_standards`
- `bathroom_pricing_options`
- `margin_safety_rules`

Basic rule:

Only verified excluded costs are used to lower the cost floor.

Default inclusion is forbidden for:

- 샤워부스
- 젠다이
- 600각 폴리싱
- 수입 도기
- 에폭시 줄눈
- 졸리컷
- 떠붙임 시공

These must be upsell / option items.

## 8. Current Critical Gap

Bathroom Pricing Standard V2 exists, and Margin Safety Dashboard exists.

However, the next required implementation is:

Estimate Wizard와 Final Estimate Approval Flow에 Margin Safety Rule을 강제 연결한다.

Required flow:

```text
욕실 견적 생성
→ 패키지 선택 Basic / Standard / Premium
→ 고객가 입력
→ 예상 원가 계산
→ 예상 마진 계산
→ 예상 마진율 계산
→ Margin Safety Rule 적용
→ BLOCKED / CEO_APPROVAL_REQUIRED / PASS / PRIORITY 판정
→ FINAL_ESTIMATE 승인 전 marginSafetyStatus 필수 확인
```

## 9. Next Priority

Next development priority:

`Estimate Wizard + Approval Flow Margin Safety Enforcement`

Implementation requirements:

1. Estimate Wizard에 욕실 패키지 선택 추가
2. 고객가 입력 시 자동 계산
3. Margin Safety Rule 적용
4. `20% 미만 = BLOCKED`
5. `20~25% = CEO_APPROVAL_REQUIRED`
6. `25% 이상 = PASS`
7. `30% 이상 = PRIORITY`
8. FINAL_ESTIMATE 승인 전 `marginSafetyStatus` 확인
9. Dashboard에 저마진 경고 표시
10. `PRJ-PROD-BATH-0001`은 Case로 유지하고 다음 프로젝트부터 V2 기준 자동 적용

## 10. Do Not Break

- Existing HTML legacy must not be deleted.
- RC-0.1.0 baseline must not be casually overwritten.
- Production and development DB must stay separated.
- Master DB direct update is forbidden.
- CEO approval is required for margin exception, Master DB update, rollback-sensitive change.
- UNKNOWN / NEEDS_RESEARCH / EMPTY / VERIFIED states must remain valid.
- Real supplier prices must not be guessed.

