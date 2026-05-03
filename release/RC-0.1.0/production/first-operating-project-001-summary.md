# First Operating Project 001 Summary

Project ID: `PRJ-PROD-BATH-0001`
Estimate Draft ID: `EST-DRAFT-PROD-BATH-0001`
Status: `PRELIMINARY`
Project: 구축 아파트 욕실 단독 리모델링
Budget Range: 700~900만원
Production DB: `release/RC-0.1.0/production/sqlite/`
Latest Status: NEEDS_CONFIRMATION resolved, price research pending
Applied Master DB Standard: `BATHROOM_REMODEL_STANDARD_V1`
Customer Proposal Amount: 5,490,000원
Final Estimate ID: `FINAL-EST-PRJ-PROD-BATH-0001`
Project Status: `FINAL_ESTIMATE`
Execution Project ID: `EXEC-PRJ-PROD-BATH-0001`
Execution Status: `IN_PROGRESS`
Site Operation ID: `SITE-PRJ-PROD-BATH-0001`
Day 1 Report ID: `DSR-PRJ-PROD-BATH-0001-DAY-001`

## Generated Processes

1. 기존 욕실 철거
2. 폐기물 반출
3. 설비 배관 점검
4. 방수 여부 판단
5. 벽 타일 전체 교체
6. 바닥 타일 전체 교체
7. 줄눈
8. 도기 전체 교체
9. 욕실 천장 교체
10. 욕실 조명 교체
11. 환풍기 교체
12. 욕실장 및 거울 설치
13. 실리콘 마감
14. 준공청소
15. 젠다이 시공
16. 샤워부스 시공

## Resolved Confirmation Values

1. 기존 방수층 상태: 정상 / 살아있음
2. 배관 수정 필요 여부: 없음
3. 기존 누수 흔적: 없음
4. 아래층 누수 민원: 없음
5. 샤워부스 시공: 있음
6. 젠다이 시공: 있음
7. 도기 브랜드: 아메리칸스탠다드
8. 타일 종류: 600각 폴리싱 타일

## Excluded Processes

- 배관 수정 공정
- 전체 재방수 공정

## Updated Default Specs

- Waterproof: 전체 재방수 제외, 방수 상태 확인 + 필요 부위 보강 판단
- Fixture: 아메리칸스탠다드 기준, 모델명/공급가 NEEDS_RESEARCH
- Tile: 600각 폴리싱 타일 기준, 시공 난이도/손실률 NEEDS_RESEARCH

## Bathroom Standard V1 Modules

- 철거/타일 시공 방식: 본드시공 기본, 떠붙임 시공 선택 시 +500,000원
- 돔천장: 700,000원
- 세면대: 350,000원
- 양변기 일체형: 700,000원
- 샤워기 + 악세서리: 300,000원
- 샤워부스 / 파티션: 선택 시 +300,000원
- 젠다이 + 대리석 마감: ON 선택 시 +350,000원
- 환풍기: 150,000원
- 도기류 브랜드 등급: 국산 기본형 / 수입 표준형 / 수입 고급형

## Output Policy

- Customer output: selected modules and option adders only.
- Internal output: module basis, option delta, research gaps, and future approval requirement.

## Customer Estimate Revision

- Previous 8,400,000원 basis: discarded
- New customer proposal: 5,490,000원
- Base package: 본드시공, 600각 폴리싱, 샤워부스, 젠다이, 돔천장, 환풍기, 준공청소
- Fixture package: 아메리칸스탠다드 기본형 기준, upsell available
- Payment plan: 계약금 30% 1,647,000원 / 중도금 40% 2,196,000원 / 잔금 30% 1,647,000원
- Change orders: separate estimate, customer approval, and representative approval required

## Upsell Options

- 떠붙임 시공 전환: +500,000원
- 도기류 브랜드/모델 상향
- 에폭시 줄눈
- 졸리컷 마감
- 샤워부스 하드웨어 상향
- 거울장/욕실장 상향
- 고급 환풍기
- 방수 보강 옵션

## Draft Documents

- 고객용 예비 견적서 초안
- 내부 원가표 초안
- 공정표 초안
- 발주서 초안
- 수금 계획 초안

## Blocking Conditions Before Final Estimate

- FINAL_ESTIMATE approval completed.
- Customer final estimate generated.
- Internal final cost document generated.
- Purchase preparation generated with model/spec/quantity warnings.
- Execution Ready transition is available.

## Purchase Before Execution Checklist

- 아메리칸스탠다드 기본형 패키지 모델/수량/납기 확인
- 600각 폴리싱 타일 품번/수량/손실률 확인
- 샤워부스 유리 두께/하드웨어/납기 확인
- 젠다이 대리석 마감재 사양 확인
- 돔천장 및 환풍기 모델 확인
- 계약금 1,647,000원 청구 및 입금 확인
- 추가공사 별도 승인 조건 고객 고지

## Execution Ready Package

- 계약/수금 계획 확정: 계약금 1,647,000원 입금 확인, 중도금 2,196,000원 예정, 잔금 1,647,000원 예정
- 발주서 준비 상태: READY_TO_ORDER_AFTER_SPEC_CONFIRMATION
- 공정표 확정본: 철거 -> 폐기물 반출 -> 방수 상태 확인 -> 필요 부위 방수 보강 -> 타일 시공 -> 젠다이 -> 샤워부스 -> 도기 설치 -> 돔천장 -> 환풍기 -> 실리콘 마감 -> 준공청소 -> 고객 인도
- 공사일보 템플릿 생성
- 검수 체크리스트 생성
- 고객 인도 체크리스트 생성
- 현금흐름표 생성
- Site Operation 진입 가능

## IN_PROGRESS Entry Conditions

- 발주 품목의 모델/규격/수량/납기 최종 확인
- 현장 착수일 확정
- 관리사무소 또는 현장 작업 가능 시간 확인
- 철거/폐기물 반출 업체 일정 확정
- 방수 상태 확인 담당자 지정

## IN_PROGRESS Day 1

- Status: IN_PROGRESS
- Current process: 철거 / 폐기물 반출 / 기존 방수층 실확인
- Progress: 5%
- Daily site report: Day 1 공사일보 생성
- Inspection task: WATERPROOF_STATUS_CHECK PENDING
- Blocking risk: 방수 검수 실패 시 후속 공정 차단 활성화

## Waterproof Blocking Rule

방수 검수 실패 시 차단 공정:

- 타일 시공
- 젠다이
- 샤워부스
- 도기 설치
- 실리콘 마감

## Waterproof Inspection Result

- Result: PASS
- Existing waterproof layer: 정상
- Drain area: 이상 없음
- Corner/lower wall: 이상 없음
- Blocking status: 해제
- Change order: 발생 없음
- Customer explanation: 별도 이슈 설명 불필요, 정상 확인 안내 가능
- Next process: 타일 착수 승인 후 타일 시공
- Tile start approval: `APP-PRJ-PROD-BATH-0001-TILE-START`

## Tile Start Approval

- Approval: APPROVED
- Day 2 report: `DSR-PRJ-PROD-BATH-0001-DAY-002`
- Current process: 600각 폴리싱 타일 시공 착수
- Material delivery status: RECEIVED_PENDING_QUANTITY_CHECK
- Materials: 600각 폴리싱 타일, 타일 본드, 압착시멘트, 줄눈, 부자재
- Measurement status: STARTED
- Waste tracking: 초기 기준 8~12% 기록 시작
- Labor tracking: 타일공 1팀 품수 기록 시작
- Next inspection: TILE_MID_INSPECTION

## Tile Order Loss Rule V1

- Rule ID: `TILE_ORDER_LOSS_RULE_V1`
- Formula: 타일 발주 수량 = 실측 면적 x 1.12
- Target: 600각 폴리싱 타일
- Order waste rate: 12%
- Warning: 실제 손실률 12% 초과
- RED ALERT: 실제 손실률 15% 초과
- Project status: 실측 면적 입력 후 발주 수량 자동 계산

## Tile Order Quantity Finalized

- Measured tile area: 28㎡
- Order quantity formula: 28㎡ x 1.12 = 31.36㎡
- Box coverage: 1.44㎡ / box
- Final box count: 22 boxes
- Ordered box area: 31.68㎡
- Expected remainder: 3.68㎡
- Box rounding surplus: 0.32㎡
- Next inspection: TILE_MID_INSPECTION

## Tile Mid Inspection Checklist

- Status: PENDING_ITEM_RESULTS
- Result options per item: PASS / WARNING / FAIL
- Items:
  - 타일 들뜸 여부
  - 수평 확인
  - 줄눈 간격 균일성
  - 파손 여부
  - 코너 마감 상태
  - 배수구 경사
  - 젠다이 연결부 마감
- FAIL rule: 후속 공정 일시 차단
- RED ALERT rule: 배수구 역구배 발생
- Rework review rule: 들뜸 / 파손 다수 발생

## Fixture Installation Approval

- Approval ID: `APP-PRJ-PROD-BATH-0001-FIXTURE-INSTALL`
- Approval status: APPROVED
- TILE_MID_INSPECTION: WARNING, FAIL 없음, RED ALERT 없음
- Correction condition: 줄눈 간격 일부 불균일 / 코너 마감 보완 진행
- Fixture package: 아메리칸스탠다드 기본형 패키지
- Items: 양변기, 세면대, 세면수전, 샤워수전, 샤워기
- Missing materials: 없음
- Day 3 report: `DSR-PRJ-PROD-BATH-0001-DAY-003`
- Next inspection: 도기 설치 후 누수/배수/고정 상태 검수

## Fixture Installation Inspection Result

- Result: PASS
- Leak detected: No
- RED ALERT: No
- Reinstall required: No
- Checked items: 양변기 수평, 양변기 흔들림, 세면대 고정/배수, 세면수전 누수, 샤워수전 누수, 냉온수 방향, 샤워기 작동, 도기 접합부
- Next process: 샤워부스 설치

## Shower Booth Installation And Inspection

- Approval ID: `APP-PRJ-PROD-BATH-0001-SHOWER-BOOTH`
- Result: PASS
- Installed items: 강화유리, 하드웨어, 문 개폐 테스트, 실리콘 접합부 마감
- Leak detected: No
- RED ALERT: No
- Rework required: No
- Day 4 report: `DSR-PRJ-PROD-BATH-0001-DAY-004`
- Next process: 돔천장 / 환풍기

## Completion And Closing Package

- Status: COMPLETED
- Completion report: `COMP-PRJ-PROD-BATH-0001`
- Final revenue: 5,490,000원
- Known actual cost baseline: 2,850,000원
- Provisional margin: 2,640,000원
- Provisional margin rate: 48.09%
- Actual cost status: ACTUAL_COST_BASELINE_PARTIAL
- Defects: none
- Claims: none
- Case Library: `CASE-PRJ-PROD-BATH-0001`
- Learning Suggestion: `LS-PRJ-PROD-BATH-0001-COST-CAPTURE`
- Auto Update Candidate: `AUC-PRJ-PROD-BATH-0001-COST-CAPTURE`
- Backup: `release/RC-0.1.0/production/backup/BACKUP-CLOSING-PRJ-PROD-BATH-0001-2026-04-26T06-09-31-439Z`
- JSON Export: `release/RC-0.1.0/production/export/PRJ-PROD-BATH-0001-closing-export.json`
- Excel Export: `release/RC-0.1.0/production/export/PRJ-PROD-BATH-0001-closing-report.xls`

## Remaining Data Gaps

- 철거 실제 원가
- 폐기물 실제 원가
- 타일 실제 원가
- 타일 부자재 실제 원가
- 실리콘 실제 원가
- 인건비
- 운반비
- 기타 잡비
