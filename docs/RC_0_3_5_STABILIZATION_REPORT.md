# RC-0.3.5 Stabilization Report

## 기본 정보

- Branch: `rc-0.3.5-price-readiness-impact-analysis`
- 기준 태그: `v0.3.4-rc-packaged`
- 최신 커밋: `42e6fa9 Start RC-0.3.5 price readiness impact analysis`
- Stabilization date: 2026-06-04

## 분석 대상 견적 유형

- `BATHROOM`
- `KITCHEN`
- `FULL_REMODELING`

## READY / PARTIAL / NEEDS_UPDATE 비교

| 상태 | Risk level | Recommended action | CEO action |
| --- | --- | --- | --- |
| `READY` | `LOW` | 견적 진행 가능 | 불필요 |
| `PARTIAL` / `BATHROOM` | `MEDIUM` | 대표 검토 후 진행 | 필요 |
| `PARTIAL` / `KITCHEN` | `HIGH` | 단가 보정 후 진행 | 필요 |
| `PARTIAL` / `FULL_REMODELING` | `HIGH` | 단가 보정 후 진행 | 필요 |
| `NEEDS_UPDATE` | `BLOCKING` | 견적 차단 | 필요 |

## BATHROOM 결과

- READY: `LOW` / 견적 진행 가능
- PARTIAL: `MEDIUM` / 대표 검토 후 진행
- NEEDS_UPDATE: `BLOCKING` / 견적 차단
- Margin impact: PARTIAL 상태에서도 일부 fallback 단가 영향은 있으나 전체 범위가 작아 대표 검토로 통제 가능
- PCE result: READY는 `GO`, PARTIAL은 `SCALE`, NEEDS_UPDATE는 `BLOCK`

## KITCHEN 결과

- READY: `LOW` / 견적 진행 가능
- PARTIAL: `HIGH` / 단가 보정 후 진행
- NEEDS_UPDATE: `BLOCKING` / 견적 차단
- Margin impact: 주방 가구, 상판, 수전, 후드 단가가 전체 원가와 마진에 직접 영향
- PCE result: READY는 `GO`, PARTIAL은 `MODIFY`, NEEDS_UPDATE는 `BLOCK`

## FULL_REMODELING 결과

- READY: `LOW` / 견적 진행 가능
- PARTIAL: `HIGH` / 단가 보정 후 진행
- NEEDS_UPDATE: `BLOCKING` / 견적 차단
- Margin impact: LightBIM 수량, fallback 단가, 공정 범위가 결합되어 마진 신뢰도 하락 가능
- PCE result: READY는 `SCALE`, PARTIAL은 `MODIFY`, NEEDS_UPDATE는 `BLOCK`

## HIGH Risk를 만드는 공정/항목

- 주방: 주방 가구, 상판, 싱크볼, 수전, 후드, 주방 벽타일, 전기/콘센트
- 전체 리모델링: 철거/폐기물, 목공, 전기, 도배, 바닥, 창호, 가구, LightBIM 수량 검토 항목

## 대표 승인 필요 조건

- `PARTIAL` 상태에서 fallback line item이 존재하는 경우
- HIGH priority `NEEDS_UPDATE` 항목이 주요 공정에 포함된 경우
- PCE가 `MODIFY` 또는 `BLOCK`으로 계산되는 경우
- margin rate가 운영 기준보다 낮아지는 경우

## 고객 견적 출력 위험 조건

- `NEEDS_UPDATE` 상태
- PCE `BLOCK`
- 주요 공정 단가 미확인
- fallback 단가가 고객 총액과 내부 원가 판단을 흔드는 경우

## 고객 안전성 결과

PASSED

고객-facing payload에는 price readiness impact, `risk_level`, fallback price, internal cost, margin, PCE, vendor/labor/purchase/receiving data, variance, calibration, approval queue, internal, profit, `risk_score`, detailed address, customer phone/email, memo를 노출하지 않습니다.

## Issues Found

- S1: 없음
- S2: 없음
- S3: 주방/전체 리모델링 PARTIAL 상태에서 대표 검토 부담이 큼
- S4: Vite bundle size warning, SQLite experimental warning, npm update notice

## Fixed Issues

- 없음. 이번 단계는 기능 수정이 아니라 분석 안정화입니다.

## Deferred Issues

- 실제 고객 데이터 추가 Pilot에서 단가 PARTIAL 영향 추가 수집
- 주방 주요 품목 단가 보정 우선순위 운영 표준화
- 전체 리모델링 LightBIM 수량 검토 UX 개선
- PCE 결과와 price readiness를 함께 해석하는 내부 리포트 개선

## Merge Readiness Decision

`MERGE_READY`

판정 근거:

- S1/S2 없음
- 3개 견적 유형 분석 통과
- 고객 안전성 통과
- build/smoke 통과
- 문서 업데이트 완료
