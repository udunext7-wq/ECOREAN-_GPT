# RC-0.3.6 Price Calibration UX Guide

## 목적

RC-0.3.6은 RC-0.3.5에서 확인한 READY / PARTIAL / NEEDS_UPDATE 단가 준비 영향 결과를 대표가 바로 보정 작업으로 옮길 수 있게 하는 UX 단계입니다.

이 단계는 단가를 직접 변경하지 않습니다. 단가 변경은 기존 실제 단가 보정 센터의 승인, 백업, 반영 흐름을 그대로 사용합니다.

## 단가 보정 우선순위 센터

화면 이름은 `단가 보정 우선순위 센터`입니다.

주요 영역:

- 견적 유형별 단가 준비 영향
- 보정 우선순위 목록
- 필터
- 단가 보정 작업
- Queue 연결
- 리포트 생성

진입 위치:

- First Entry / CEO Dashboard
- Estimate Entry Panel
- 기준 데이터 관리
- 실제 단가 보정
- 단가표 일괄 가져오기
- 실제 프로젝트 접수
- Drawer navigation

## 우선순위 기준

우선순위는 READY / PARTIAL / NEEDS_UPDATE와 견적 유형별 리스크를 함께 봅니다.

| 조건 | 우선순위 | 표시 |
| --- | ---: | --- |
| NEEDS_UPDATE 또는 BLOCKING | 1 | 즉시 보정 필요 |
| PARTIAL + HIGH + KITCHEN | 2 | 견적 전 보정 권장 |
| PARTIAL + HIGH + FULL_REMODELING | 2 | 견적 전 보정 권장 |
| PARTIAL + MEDIUM | 3 | 대표 검토 필요 |
| READY + LOW | 4 | 확인 완료 |

## 견적 유형별 의미

### BATHROOM

욕실은 PARTIAL 상태여도 상대적으로 범위가 작기 때문에 `대표 검토 필요`로 분류됩니다.

### KITCHEN

주방은 가구, 상판, 수전, 후드 등 품목별 단가 영향이 커서 PARTIAL 상태를 `견적 전 보정 권장`으로 봅니다.

### FULL_REMODELING

전체 리모델링은 LightBIM 수량, 공정 범위, PCE 영향이 크기 때문에 PARTIAL 상태를 `견적 전 보정 권장`으로 봅니다.

## 작업 흐름

1. 단가 보정 우선순위 센터를 엽니다.
2. 견적 유형과 리스크를 필터링합니다.
3. NEEDS_UPDATE / PARTIAL 항목을 확인합니다.
4. `보정 작업 생성`으로 내부 검토 작업을 만듭니다.
5. 검토 후 `보정 대기열로 연결`합니다.
6. 실제 단가 보정 센터에서 승인합니다.
7. 승인된 항목만 백업 후 Master Data에 반영합니다.

## 안전 원칙

- 우선순위 작업 생성은 Master Data 가격을 변경하지 않습니다.
- Queue 생성도 자동 승인 또는 자동 반영하지 않습니다.
- 고객용 화면에는 단가 보정 우선순위, 리스크, 내부 단가, PCE, margin, queue 정보가 노출되지 않습니다.
- 고객 견적은 최종 고객용 금액만 보여야 합니다.

## 후속 단계

RC-0.3.6 이후에는 반복 운영 중 쌓인 보정 작업을 기준으로 단가 보정 UX를 더 다듬습니다.
