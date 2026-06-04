# RC-0.3.5 Price Readiness Impact Analysis Report

## 기본 정보

- 분석 날짜: 2026-06-04
- 브랜치: `rc-0.3.5-price-readiness-impact-analysis`
- 기준 태그: `v0.3.4-rc-packaged`
- 목적: `Price readiness = PARTIAL` 상태가 견적/PCE/마진/대표 승인 판단에 주는 영향을 분석

## 분석한 견적 유형

- `BATHROOM`
- `KITCHEN`
- `FULL_REMODELING`

## READY / PARTIAL / NEEDS_UPDATE 비교

| 상태 | 의미 | 리스크 | 추천 조치 |
| --- | --- | --- | --- |
| `READY` | 주요 단가 확인 완료 | LOW | 견적 진행 가능 |
| `PARTIAL` | 일부 단가 확인 필요 | MEDIUM/HIGH | 대표 검토 후 진행 또는 단가 보정 후 진행 |
| `NEEDS_UPDATE` | 주요 단가 미확인 | BLOCKING | 견적 차단 |

## BATHROOM 결과

- READY: LOW / 견적 진행 가능
- PARTIAL: MEDIUM / 대표 검토 후 진행
- NEEDS_UPDATE: BLOCKING / 견적 차단
- 운영 해석: 욕실은 범위가 작아 PARTIAL 영향이 비교적 제한적이나, 타일/방수/도기/수전은 확인 필요.

## KITCHEN 결과

- READY: LOW / 견적 진행 가능
- PARTIAL: HIGH / 단가 보정 후 진행
- NEEDS_UPDATE: BLOCKING / 견적 차단
- 운영 해석: 주방은 가구, 상판, 싱크볼, 수전, 후드 등 품목 단가 영향이 커서 PARTIAL 상태의 운영 부담이 큼.

## FULL_REMODELING 결과

- READY: LOW / 견적 진행 가능
- PARTIAL: HIGH / 단가 보정 후 진행
- NEEDS_UPDATE: BLOCKING / 견적 차단
- 운영 해석: 전체 리모델링은 LightBIM 수량과 PCE 해석이 함께 필요하며 fallback 항목이 누적되면 마진 신뢰도가 낮아짐.

## PCE 결과 비교

- READY: `GO` 또는 `SCALE`
- PARTIAL: `SCALE` 또는 `MODIFY`
- NEEDS_UPDATE: `BLOCK`

## Margin Impact 요약

- READY는 confirmed line item 중심이라 마진 판단 신뢰도가 높음.
- PARTIAL은 fallback/estimated line item이 포함되어 내부 원가와 마진 방어 판단에 대표 검토가 필요함.
- NEEDS_UPDATE는 주요 단가 신뢰도가 낮아 고객 견적 출력 전 차단해야 함.

## 운영 병목

- 주방: 단가/품목 검토 부담
- 전체 리모델링: LightBIM 수량/PCE 검토 중요
- 공통: `PARTIAL` 상태가 비차단 경고로 남아 운영자가 위험도를 해석해야 함

## 우선 수정 후보

- 주방 주요 품목 단가 보정 우선순위 정리
- 전체 리모델링 fallback 항목 시각화
- PCE 결과와 단가 준비 상태를 함께 보는 내부 리포트 개선

## 최종 판정

`RC-0.3.5 price readiness impact analysis 시작 가능`

고객 출력에는 risk level, margin, PCE, fallback 항목을 노출하지 않습니다.
