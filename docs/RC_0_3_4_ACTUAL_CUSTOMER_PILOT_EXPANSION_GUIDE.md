# RC-0.3.4 Actual Customer Pilot Expansion Guide

## 목적

RC-0.3.4는 새 기능 추가가 아니라 실제 고객 Pilot 흐름을 1건에서 3건 이상으로 확장해 운영 병목을 찾는 단계입니다.

## 기준선

- Source baseline: `v0.3.3-rc-packaged`
- Branch: `rc-0.3.4-actual-customer-pilot-expansion`
- Existing tags are preserved and RC-0.3.4 is not tagged yet.

## Pilot 시나리오

- Pilot A: 욕실 단독 리모델링 / `BATHROOM`
- Pilot B: 주방 리모델링 / `KITCHEN`
- Pilot C: 전체 리모델링 / `FULL_REMODELING`

각 Pilot에서 확인합니다.

- 백업 생성
- 접수 생성
- 필수값 검증
- LightBIM 연결 또는 수동 면적 입력
- 단가 준비 상태 확인
- 견적 생성
- PCE 실행
- 고객용 출력 READY
- 내부 원가표 READY
- 개인정보 익명화
- 고객 안전성
- 문제/불편사항 기록

## 개인정보 보호 원칙

Pilot 기록과 문서에는 실제 개인정보 원문을 저장하지 않습니다.

- 실제 전화번호 금지
- 실제 이메일 금지
- 상세주소 원문 금지
- 고객 메모 원문 금지

사용 가능한 값:

- 익명 고객 A/B/C
- 주소 요약
- 민감 메모의 요약/분류

## 고객용 Payload 금지 항목

- detailed_address
- customer_phone
- customer_email
- memo
- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- variance
- calibration
- backup path
- import rows
- approval queue
- internal
- profit
- risk_score

## 병목 기록 기준

- S1: 개인정보/내부정보 노출, 백업 실패, DB 손상, 견적/PCE 치명 실패
- S2: 정상 접수에서 견적 생성 실패, LightBIM 연결 실패, 출력 생성 실패, 단가 적용 차단
- S3: 입력 UX 불편, 필드명 혼란, 흐름 순서 불편, 미매칭 처리 번거로움, 리포트 문구 부족
- S4: 문구/간격/경고/비차단 로그

## 운영 방식

1. Pilot 시작 전 전체 백업을 생성합니다.
2. 익명 고객과 주소 요약만 사용합니다.
3. Pilot 유형별 견적 흐름을 끝까지 진행합니다.
4. 고객 출력 전 안전성 검사를 반드시 실행합니다.
5. S1/S2는 즉시 차단하고, S3/S4는 운영 병목으로 기록합니다.

