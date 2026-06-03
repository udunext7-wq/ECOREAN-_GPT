# RC-0.3.4 Actual Customer Pilot Expansion Report

## 기본 정보

- Branch: `rc-0.3.4-actual-customer-pilot-expansion`
- Baseline: `v0.3.3-rc-packaged`
- Test date: 2026-06-04
- Purpose: 실제 고객 Pilot을 3개 견적 유형으로 확장하여 반복 가능성과 운영 병목을 확인

## Pilot Summary

- Pilot 수: 3
- Pilot A: 욕실 단독 리모델링 / `BATHROOM`
- Pilot B: 주방 리모델링 / `KITCHEN`
- Pilot C: 전체 리모델링 / `FULL_REMODELING`

## 견적 유형별 결과

| Pilot | 견적 유형 | LightBIM | 단가 준비 | 견적/PCE | 고객 출력 | 내부 출력 | 개인정보 익명화 | 고객 안전성 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pilot A | `BATHROOM` | PASSED | `PARTIAL` | `SCALE` | READY | READY | PASSED | PASSED |
| Pilot B | `KITCHEN` | PASSED | `PARTIAL` | `SCALE` | READY | READY | PASSED | PASSED |
| Pilot C | `FULL_REMODELING` | PASSED | `PARTIAL` | `SCALE` | READY | READY | PASSED | PASSED |

## 실행 식별자

| Pilot | Pilot ID | Intake ID | Estimate ID |
| --- | --- | --- | --- |
| Pilot A | `ACP-RC034-BATHROOM-PILOT` | `RPI-RC034-BATHROOM-PILOT` | `INTAKE-BATHROOM-1780500319131` |
| Pilot B | `ACP-RC034-KITCHEN-PILOT` | `RPI-RC034-KITCHEN-PILOT` | `INTAKE-KITCHEN-1780500319435` |
| Pilot C | `ACP-RC034-FULL-PILOT` | `RPI-RC034-FULL-PILOT` | `INTAKE-FULL_REMODELING-1780500319687` |

## 운영 병목

- 욕실 단독 Pilot은 필수 접수 항목이 짧아 입력 흐름이 가장 빠름.
- 주방 Pilot은 품목 선택과 단가 준비 상태 확인 단계에서 검토 시간이 늘어남.
- 전체 리모델링 Pilot은 LightBIM 수량 검토와 PCE 해석 확인이 가장 중요함.

## 발견 이슈

### S1

- 없음

### S2

- 없음

### S3

- 각 Pilot의 입력/검토 friction을 운영 병목으로 기록함.

### S4

- `Price readiness = PARTIAL`은 비차단 경고로 계속 관찰 필요.
- SQLite experimental warning은 비차단 경고.

## 우선 수정 후보

- 실제 고객 추가 Pilot에서 입력 UX 병목 계속 수집
- 단가 준비 상태가 PARTIAL인 항목의 운영 영향 확인
- 전체 리모델링의 LightBIM 수량 검토 동선 관찰

## 최종 판정

`3개 Pilot 유형 반복 검증 가능`

## Branch Stabilization

- Stabilization report: `docs/RC_0_3_4_STABILIZATION_REPORT.md`
- Stabilization smoke: `tests/rc-0-3-4-branch-stabilization.smoke.js`
- Stabilization decision: `MERGE_READY`
- Unresolved S1/S2: 없음
- 개인정보 익명화: PASSED
- 고객 안전성: PASSED
- 견적/PCE: PASSED
