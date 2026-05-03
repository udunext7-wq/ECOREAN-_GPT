# ECOREAN 자동견적 OS 테스트 계획

## 1. 테스트 원칙

ECOREAN 자동견적 OS의 테스트 목적은 단순 오류 확인이 아니다.

테스트 목적은 다음이다.

- 같은 입력이면 같은 결과가 나오는지 확인
- 공정 누락이 발생하지 않는지 확인
- 고객용 출력과 내부용 출력이 분리되는지 확인
- 옵션 변경이 가격에 정확히 반영되는지 확인
- 공정 온톨로지가 일정, 자재, 인력에 연결되는지 확인
- 기존 HTML 기준 결과와 신규 엔진 결과를 비교할 수 있는지 확인

## 2. 테스트 단계

모든 주요 작업은 다음 흐름으로 검증한다.

```text
BUILD -> TEST -> REPORT
```

## 3. 문서 테스트

대상:

- PLAN.md
- SPEC.md
- ARCHITECTURE.md
- MASTER_DB_SCHEMA.md
- TASKS.md
- TEST_PLAN.md
- CHANGELOG.md

검증 기준:

- 파일이 존재해야 한다.
- 문서 목적이 명확해야 한다.
- 승인 필요 지점이 명시되어야 한다.
- 기존 HTML 삭제 금지 원칙이 포함되어야 한다.
- Master DB / Estimate Engine / Schedule Engine / Output / Storage / UI 분리 원칙이 포함되어야 한다.

## 4. Legacy 보존 테스트

대상:

- 기존 ECOREAN HTML
- `legacy/ECOREAN_original.html`

검증 기준:

- 원본 HTML이 삭제되지 않아야 한다.
- 복사본이 존재해야 한다.
- 복사본 크기가 원본과 같아야 한다.
- 복사 후 CHANGELOG에 기록되어야 한다.

## 5. Master DB 스키마 테스트

대상:

- ProcessItem
- defaultSpec
- optionGroups
- ontologyRelation
- triggerType
- priceLogic
- scheduleLogic
- outputPolicy
- governance

검증 기준:

- 모든 공정은 code를 가져야 한다.
- 모든 공정은 hierarchy를 가져야 한다.
- 모든 공정은 defaultSpec을 가져야 한다.
- 모든 공정은 triggerType을 가져야 한다.
- 모든 공정은 priceLogic을 가져야 한다.
- 모든 공정은 outputPolicy를 가져야 한다.
- triggerType은 `AUTO`, `SELECT`, `QTY`, `CONDITIONAL` 중 하나여야 한다.
- optionGroups의 기본 옵션은 실제 options 안에 존재해야 한다.
- 선행공정 코드는 실제 공정 코드와 연결 가능해야 한다.

## 6. 견적 엔진 테스트

검증 대상:

- 수량 산출
- 옵션 보정
- 난이도 보정
- 원가 계산
- 마진 계산
- VAT 계산
- 고객용/내부용 결과 분리

기본 테스트:

```text
같은 입력 -> 같은 결과
옵션 변경 -> 가격 변경
수량 증가 -> 총액 증가
AUTO 트리거 조건 충족 -> 공정 자동 포함
SELECT 미선택 -> 공정 미포함
QTY 0 -> 공정 미포함
CONDITIONAL 조건 충족 -> 공정 포함
```

## 7. 공정표 엔진 테스트

검증 대상:

- 선행공정
- 후행공정
- 공정 기간
- 양생 기간
- 인력 투입
- 자재 발주 시점
- 공정 충돌

기본 테스트:

```text
타일은 방수 이후 배치되어야 한다.
도기 설치는 타일 이후 배치되어야 한다.
방수 양생기간은 공정표에 반영되어야 한다.
동시에 진행할 수 없는 공정은 충돌로 표시되어야 한다.
```

## 8. 출력 테스트

고객용 출력 검증:

- 내부 원가 미노출
- 마진 미노출
- 리스크 내부 메모 미노출
- 총액 표시
- VAT 표시
- 견적 유효기간 표시

내부용 출력 검증:

- 노무비 표시
- 자재비 표시
- 장비비 표시
- 마진 표시
- 공정별 수익성 표시
- 자재 발주표 표시
- 인력 투입표 표시
- 리스크 표시

## 9. 저장 테스트

초기 저장 대상:

- JSON export/import
- SQLite 저장
- 견적 입력 스냅샷
- 견적 결과 스냅샷
- Master DB 버전
- 실제 결과
- 오차 분석

검증 기준:

- 견적 당시 Master DB 버전이 저장되어야 한다.
- 저장 후 불러오면 동일한 견적 결과가 재현되어야 한다.
- 실제 결과 입력 후 예상 대비 실제 차이를 계산할 수 있어야 한다.

## 10. 회귀 테스트

기존 HTML 기준 결과와 신규 엔진 결과를 비교한다.

검증 방식:

```text
샘플 입력을 기존 HTML에 입력
-> 결과 금액 기록
-> 동일 입력을 신규 엔진에 입력
-> 결과 비교
-> 차이 발생 시 원인 기록
```

초기 목표:

- 완전 일치보다 계산 근거 추적 가능성을 우선한다.
- 차이는 허용하되 반드시 원인을 기록한다.

## 11. 다음 테스트 작업

다음 단계에서 생성할 fixture:

- `tests/fixtures/sample-apartment.json`
- `tests/fixtures/sample-commercial.json`
- `tests/fixtures/sample-bathroom-process.json`

