# ECOREAN BOC Handoff Summary

Use this file when starting a new chat.

## Current Version

`ECOREAN BOC MVP RC-0.1.0`

Release baseline is locked.

Production / development DB separation is complete.

## Completed Systems

- CEO Dashboard
- Estimate Wizard
- Preliminary → Final Estimate Approval
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

## First Operating Project

Project ID:

`PRJ-PROD-BATH-0001`

Project:

구축 아파트 욕실 단독 리모델링

Status:

`COMPLETED`

Financial result:

- Customer price: `5,490,000원`
- Actual cost: `5,070,000원`
- Actual margin: `420,000원`
- Actual margin rate: `7.65%`

Judgment:

Low-margin danger project.

Learning:

- V1 pricing is discarded.
- Bathroom Pricing Standard V2 is required.
- Actual Cost Capture V2 is required.

## Current Pricing Rule

Bathroom Pricing Standard V2:

- Below 20%: 자동 차단
- 20~25%: CEO 승인 필요
- 25% 이상: 진행 가능
- 30% 이상: 우선 수주 가능

Packages:

- Basic: minimum `5,530,000원`, recommended `5,900,000원`
- Standard: minimum `6,760,000원`, recommended `6,800,000원`
- Premium: minimum `7,250,000원`, recommended `7,300,000원`

Default inclusion forbidden:

- 샤워부스
- 젠다이
- 600각 폴리싱
- 수입 도기
- 에폭시 줄눈
- 졸리컷
- 떠붙임 시공

## Next Required Task

Implement:

`Estimate Wizard + Approval Flow Margin Safety Enforcement`

Required behavior:

```text
Bathroom estimate
→ select Basic / Standard / Premium
→ input customer price
→ calculate estimated cost / margin / margin rate
→ apply Margin Safety Rule
→ BLOCKED / CEO_APPROVAL_REQUIRED / PASS / PRIORITY
→ block FINAL_ESTIMATE unless marginSafetyStatus is valid
```

## First Prompt For New Chat

대표님 기준으로 아래 프롬프트를 새 채팅 첫 입력으로 사용하면 된다.

```text
ECOREAN BOC 프로젝트를 이어서 진행한다.

현재 기준 문서는 docs/PROJECT_MASTER_CONTEXT.md, docs/NEXT_ACTION.md, docs/HANDOFF_SUMMARY.md다.

현재 버전은 ECOREAN BOC MVP RC-0.1.0이고 production/development DB 분리는 완료되어 있다.

첫 운영 프로젝트 PRJ-PROD-BATH-0001은 COMPLETED 상태이며 고객가 5,490,000원, 실제 총원가 5,070,000원, 실제 마진 420,000원, 실제 마진율 7.65%로 저마진 위험 Case다.

Bathroom Pricing Standard V2는 구축 완료되어 Basic / Standard / Premium 가격과 Margin Safety Rule이 master.db에 반영되어 있다.

다음 작업은 Estimate Wizard와 Final Estimate Approval Flow에 Margin Safety Rule을 강제 연결하는 것이다.

구현하라:
1. Estimate Wizard에서 욕실 패키지 Basic / Standard / Premium 선택 추가
2. 고객가 입력 시 예상 원가, 예상 마진, 예상 마진율, 수주 가능 여부 자동 계산
3. 20% 미만은 BLOCKED
4. 20~25%는 CEO_APPROVAL_REQUIRED
5. 25% 이상은 PASS
6. 30% 이상은 PRIORITY
7. FINAL_ESTIMATE 승인 전 marginSafetyStatus 필수 확인
8. Dashboard에 저마진 경고 표시

System Layer는 English, Display Layer는 Korean 원칙을 유지하라.
PRJ-PROD-BATH-0001은 Case로 남기고 다음 프로젝트부터 V2 기준이 자동 적용되게 하라.
완료 후 build와 smoke test까지 실행하고 보고하라.
```

