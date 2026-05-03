# ECOREAN 자동견적 OS 제품 명세

## 1. 제품 정의

ECOREAN 자동견적 OS는 단순 견적 프로그램이 아니다.

이 시스템은 ECOREAN Build Operation Center, 즉 BOC의 첫 번째 핵심 모듈이다.

최소 입력값을 기반으로 다음 산출물을 자동 생성하는 운영 시스템이다.

- 고객용 견적서
- 내부 원가표
- 공정별 마진표
- 자재 발주표
- 공정표
- 인력 투입표
- 일정표
- 현장 관리표

## 2. 핵심 원칙

모든 공정은 단순 단가 항목이 아니다.

모든 공정은 다음 구조를 가진다.

```text
대분류 -> 중분류 -> 소분류 -> 세부사양 -> 옵션
```

각 공정에는 다음 데이터가 반드시 포함된다.

- `defaultSpec`
- `optionGroups`
- `ontologyRelation`
- `triggerType`
- `priceLogic`
- `quantityLogic`
- `scheduleLogic`
- `outputPolicy`
- `governance`

## 3. 사용자

초기 사용자는 ECOREAN 내부 관리자와 견적 담당자다.

장기 사용자는 다음으로 확장된다.

- 현장 관리자
- 시공 파트너
- 본사 관리자
- 지점 관리자
- 프랜차이즈 운영자
- 재무 관리자
- AI 에이전트

## 4. 주요 입력

초기 입력값:

- 프로젝트명
- 고객 정보
- 현장 주소
- 건물 유형
- 층수
- 엘리베이터 여부
- 주차 가능 여부
- 공간 구성
- 면적
- 시공 범위
- 마감 등급
- 공정 선택
- 수량 입력
- 현장 조건
- 희망 일정

## 5. 주요 출력

고객용 출력:

- 고객용 견적서
- 공사 범위 요약
- 총액
- VAT
- 견적 유효기간
- 고객 안내사항

내부용 출력:

- 내부 원가표
- 공정별 마진표
- 자재 발주표
- 인력 투입표
- 공정표
- 현장 체크리스트
- 리스크 진단표
- 누락 공정 진단표
- 현금 흐름표

## 6. 트리거 타입

모든 공정은 하나의 `triggerType`을 가진다.

### AUTO

조건이 충족되면 자동 포함된다.

예:

```text
욕실 타일 선택 -> 방수 자동 포함
```

### SELECT

사용자가 명시적으로 선택해야 포함된다.

예:

```text
아트월, 간접조명, 중문
```

### QTY

수량 입력이 있으면 포함된다.

예:

```text
콘센트, 도어, 조명, 창호
```

### CONDITIONAL

조건 조합에 따라 포함된다.

예:

```text
3층 초과 + 엘리베이터 없음 -> 사다리차 또는 양중비
```

## 7. 가격 계산 원칙

모든 공정은 다음 가격 구조를 가진다.

```text
basePrice
laborCost
materialCost
equipmentCost
accessoryCost
wasteRate
optionAdjust
difficultyAdjust
finalPrice
```

기본 계산 개념:

```text
baseCost = laborCost + materialCost + equipmentCost
adjustedCost = baseCost + optionAdjust + difficultyAdjust
finalPrice = adjustedCost * marginMultiplier
```

견적 결과에는 최종 금액만 저장하지 않는다.

반드시 다음을 함께 저장한다.

- 입력값
- 선택 옵션
- 적용된 보정값
- 사용한 Master DB 버전
- 계산 결과
- 고객용 노출 결과
- 내부용 원가 결과

## 8. AI 개발 방향

초기 시스템은 규칙 기반으로 시작한다.

장기적으로는 다음 단계로 진화한다.

```text
Rule-Based OS
-> Data-Accumulating OS
-> Feedback OS
-> Self-Calibrating OS
-> Predictive AI OS
-> Autonomous BOC
```

AI는 처음부터 임의로 견적을 생성하지 않는다.

AI는 다음 역할부터 수행한다.

- 누락 공정 탐지
- 위험 견적 경고
- 유사 현장 비교
- 단가 보정 추천
- 공정 충돌 탐지
- 마진 위험 분석

## 9. 선택 공정 원칙

모든 공정은 기본적으로 선택되지 않으면 견적에 포함되지 않는다.

단, 사용자가 선택한 공정 또는 입력 조건에 의해 필요한 공정은 `triggerType`에 따라 자동 포함될 수 있다.

```text
SELECT: 사용자가 선택해야 포함
QTY: 수량이 1 이상이면 포함
AUTO: 선택된 상위 공정 또는 필수 조건에 의해 자동 포함
CONDITIONAL: 조건 조합 충족 시 포함
```

포함된 공정은 `defaultSpec` 기준으로 먼저 계산하고, 옵션 변경 시 즉시 재계산되어야 한다.

## 10. AI 조직 구조

BOC 중심의 AI 조직 구조는 다음과 같다.

```text
대표님
-> BOC
-> 7개 AI 임원
```

7개 AI 임원:

```text
1. 전략실 AI (CSO)
2. 견적설계 AI (COO)
3. 현장관리 AI (PMO)
4. 재무 AI (CFO)
5. 마케팅 AI (CMO)
6. 자동화개발 AI (CTO)
7. 리서치 AI (CIO)
```

우선순위:

```text
견적설계 AI
-> 현장관리 AI
-> 재무 AI
```

핵심은 개별 AI가 아니라 AI 간 의사결정 흐름 연결이다.

## 11. 금지사항

- 기존 HTML 파일 삭제 금지
- UI에 계산 로직 직접 삽입 금지
- Master DB를 화면 코드에 직접 종속 금지
- 고객용 출력에 내부 원가/마진 노출 금지
- 단가 변경 시 과거 견적 자동 변경 금지
- 승인 없는 DB 스키마 변경 금지
