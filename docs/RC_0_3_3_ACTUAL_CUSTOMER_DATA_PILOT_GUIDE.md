# RC-0.3.3 Actual Customer Data Pilot Guide

## 목적

RC-0.3.3은 새 기능 확장이 아니라 실제 고객/현장 데이터 1건을 안전하게 입력해 운영 병목, 불편, 오류를 기록하는 Pilot 단계입니다.

## 실제 고객 데이터 입력 전 주의사항

- 실제 전화번호, 이메일, 상세주소, 고객 메모는 꼭 필요한 경우에만 입력합니다.
- 테스트/문서/로그에는 실제 개인정보 원문을 남기지 않습니다.
- 문서화할 때는 고객명을 익명화하고 주소는 요약만 남깁니다.
- 고객용 출력 전 고객 안전성 검사를 반드시 실행합니다.

## 개인정보 최소 입력 원칙

필수 최소 입력:

- 고객명 또는 익명 고객명
- 현장명
- 주소 요약
- 공사 유형
- 면적
- 공사 범위
- 예산 등급 또는 예산 금액

선택 입력:

- 전화번호
- 이메일
- 상세주소
- 고객 메모

선택 입력값은 Pilot report에 원문 저장하지 않습니다.

## 백업 먼저 생성하는 방법

1. `백업 / 복구 센터`를 엽니다.
2. `전체 백업 생성`을 실행합니다.
3. backup ID와 manifest 생성 여부를 확인합니다.
4. 백업 실패 시 Pilot 입력을 중단하고 S1로 기록합니다.

## 실제 프로젝트 접수 방법

1. `실제 프로젝트 접수`를 엽니다.
2. 새 접수 draft를 생성합니다.
3. 고객/현장/공사 유형/면적/범위/예산 정보를 입력합니다.
4. `접수 정보 검증`을 실행합니다.
5. `READY_FOR_ESTIMATE` 상태가 되면 다음 단계로 진행합니다.

## LightBIM 연결 방법

1. 익명화된 LightBIM JSON 또는 기존 import record를 연결합니다.
2. 프로젝트명, 공간 수, 총 면적, 추천 견적 유형, 수량 경고 수를 확인합니다.
3. 선택한 견적 유형과 LightBIM 추천 유형이 다르면 경고를 기록합니다.
4. 사용자의 선택 견적 유형은 자동으로 덮어쓰지 않습니다.

## 단가 준비 상태 확인 방법

1. `단가 준비 상태 확인`을 실행합니다.
2. `READY`, `PARTIAL`, `NEEDS_UPDATE` 중 결과를 기록합니다.
3. `PARTIAL`은 경고로 남기되 견적 생성을 막지 않습니다.
4. `NEEDS_UPDATE`는 단가 보정 필요 항목으로 기록합니다.

## 견적/PCE 생성 방법

1. 접수 필수값 검증을 통과합니다.
2. LightBIM이 연결되어 있으면 연결 수량을 우선 확인합니다.
3. `견적 생성`을 실행합니다.
4. `PCE 실행` 후 GO / MODIFY / SCALE / BLOCK 판정을 기록합니다.

## 고객용 PDF 출력 전 안전성 검사

고객용 출력에는 다음 정보가 노출되면 안 됩니다.

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
- actual used quantity
- variance
- calibration
- backup path
- import rows
- approval queue
- internal
- profit
- risk_score

누출이 발견되면 S1으로 기록하고 고객용 출력을 차단합니다.

## 이슈 기록 방법

Severity:

- S1: 고객정보/내부정보 노출, 백업 실패, 데이터 손상, PCE 불가
- S2: 유효 접수 견적 생성 실패, LightBIM 연결 실패, 출력 실패
- S3: 불편한 흐름, 헷갈리는 문구, 수동 우회 필요
- S4: 문구/간격/비차단 경고

S1/S2는 RC-0.3.3 Pilot 가능 판정을 막습니다.

## 안정화 판정 기준

- `MERGE_READY`: S1/S2 없음, 개인정보 익명화 통과, 고객 안전성 통과, 견적/PCE 통과, build/smoke 통과
- `CONDITIONAL_MERGE_READY`: S1 없음, S2는 안전한 우회 가능, S3/S4만 남음
- `NOT_READY`: S1 존재, 고객정보 원문 누출, 견적/PCE 실패, build 실패

RC-0.3.3 안정화 결과는 `docs/RC_0_3_3_STABILIZATION_REPORT.md`에 기록합니다.
