# RC-0.3.5 Price Readiness Impact Analysis Guide

## 목적

RC-0.3.5는 새 기능 추가가 아니라 `Price readiness = PARTIAL` 상태가 견적, PCE, 마진 판단에 주는 영향을 분석하는 단계입니다.

## Price Readiness 의미

- `READY`: 주요 단가가 확인되어 견적 진행이 가능한 상태
- `PARTIAL`: 일부 단가가 아직 추정값이거나 확인 필요인 상태
- `NEEDS_UPDATE`: 주요 공정 또는 품목 단가가 보정되지 않아 견적 신뢰도가 낮은 상태

## 왜 PARTIAL이 위험한가

`PARTIAL`은 견적 생성을 막지는 않지만, fallback 단가나 추정 단가가 주요 공정에 섞일 수 있습니다. 이 경우 고객 가격은 계산되더라도 내부 원가와 마진 방어력이 흔들릴 수 있습니다.

## 견적/PCE/마진 영향

분석 항목:

- HIGH / MEDIUM / LOW 우선순위 `NEEDS_UPDATE` 잔여 수
- confirmed line item 수
- fallback line item 수
- estimated/default price line item 수
- total customer price
- total internal cost
- margin amount / margin rate
- PCE decision
- risk level
- recommended action

## 대표 검토 기준

- `LOW`: 견적 진행 가능
- `MEDIUM`: 대표 검토 후 진행
- `HIGH`: 단가 보정 후 진행
- `BLOCKING`: 견적 차단

이 기준은 자동 최종 결정이 아니라 CEO 판단 보조입니다.

## 고객용 출력 비노출 원칙

고객용 화면, PDF, 제안서 payload에는 다음 정보를 노출하지 않습니다.

- price readiness impact
- risk_level
- fallback price
- internal cost
- margin
- PCE
- vendor/labor/purchase/receiving data
- variance
- calibration
- approval queue
- internal
- profit
- risk_score
- detailed_address
- customer_phone
- customer_email
- memo

## 주방에서 특히 볼 항목

- 주방 가구
- 상판
- 싱크볼
- 수전
- 후드
- 주방 벽타일
- 전기/콘센트

주방은 품목 단위 단가 영향이 커서 `PARTIAL` 상태에서도 `HIGH` 리스크로 올라갈 수 있습니다.

## 전체 리모델링에서 특히 볼 항목

- LightBIM 수량
- 철거/폐기물
- 목공
- 전기
- 도배
- 바닥
- 창호
- 가구
- PCE 해석

전체 리모델링은 fallback 항목 수가 늘어날수록 PCE와 마진 방어 판단이 어려워집니다.

## Stabilization Result

- Stabilization date: 2026-06-04
- Stabilization smoke: `tests/rc-0-3-5-branch-stabilization.smoke.js`
- Merge readiness: `MERGE_READY`
- S1/S2: 없음
- Customer safety: PASSED

안정화 기준에서는 `PARTIAL`을 단순 경고가 아니라 CEO 판단용 risk level로 분리합니다.

- 욕실 PARTIAL: `MEDIUM` / 대표 검토 후 진행
- 주방 PARTIAL: `HIGH` / 단가 보정 후 진행
- 전체 리모델링 PARTIAL: `HIGH` / 단가 보정 후 진행
