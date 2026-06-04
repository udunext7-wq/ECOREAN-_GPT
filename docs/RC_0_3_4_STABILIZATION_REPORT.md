# RC-0.3.4 Stabilization Report

## 기본 정보

- Branch: `rc-0.3.4-actual-customer-pilot-expansion`
- 기준 태그:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
  - `v0.3.2-rc`
  - `v0.3.2-rc-packaged`
  - `v0.3.3-rc`
  - `v0.3.3-rc-packaged`
- 최신 커밋: `7d0a1af Start RC-0.3.4 actual customer pilot expansion`
- Stabilization date: 2026-06-04
- Pilot 수: 3

## Pilot A/B/C 결과

| Pilot | 견적 유형 | Intake 연결 | LightBIM 연결 | 단가 준비 | 견적/PCE | 고객 출력 | 내부 출력 | 개인정보 익명화 | 고객 안전성 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pilot A | `BATHROOM` | PASSED | PASSED | `PARTIAL` | PASSED / `SCALE` | READY | READY | PASSED | PASSED |
| Pilot B | `KITCHEN` | PASSED | PASSED | `PARTIAL` | PASSED / `SCALE` | READY | READY | PASSED | PASSED |
| Pilot C | `FULL_REMODELING` | PASSED | PASSED | `PARTIAL` | PASSED / `SCALE` | READY | READY | PASSED | PASSED |

## 개인정보 / 고객 안전성

- Pilot report에는 실제 전화번호, 실제 이메일, 상세주소 원문, 고객 메모 원문을 저장하지 않도록 검증했습니다.
- 고객-facing payload에는 `detailed_address`, `customer_phone`, `customer_email`, `memo`, internal cost, margin, PCE, vendor/labor/purchase/receiving data, variance, calibration, backup path, import rows, approval queue, internal, profit, `risk_score`가 노출되지 않도록 검증했습니다.
- Leak injection 시 S1 issue가 생성되고 고객 출력이 차단되는 경로를 확인했습니다.

## 견적 / PCE

- 3개 Pilot 모두 intake에서 estimate가 생성되었습니다.
- 3개 Pilot 모두 PCE 결과가 존재했습니다.
- 테스트 결과 PCE decision은 `SCALE`로 계산되었습니다.
- `price readiness = PARTIAL`은 비차단 경고로 남기고, 견적 생성은 막지 않습니다.

## 운영 병목

- 욕실: 비교적 빠름. 필수 접수 항목이 짧아 반복 Pilot에 적합합니다.
- 주방: 단가/품목 검토 부담이 큽니다. 품목 선택과 단가 확인 단계에서 시간이 늘어납니다.
- 전체 리모델링: LightBIM 수량/PCE 검토가 중요합니다. 수량 검토와 PCE 해석 안내가 실제 운영 판단의 핵심입니다.

추가 확인 결과:

- 입력 필드는 Pilot별 최소 데이터로 저장 가능하며, 과도한 필수 입력은 확인되지 않았습니다.
- 단가 검토 흐름은 `PARTIAL` 경고를 남기지만 차단하지 않습니다.
- LightBIM 연결 정보는 project name, space count, total area, suggested estimate type, warning count 중심으로 확인 가능합니다.
- 고객용/내부용 출력 구분은 고객 안전성 테스트로 통과했습니다.
- 반복 Pilot 기록은 `BATHROOM`, `KITCHEN`, `FULL_REMODELING` 유형별 비교가 가능합니다.

## 이슈

### S1

- 없음

### S2

- 없음

### S3

- 주방 단가/품목 검토 부담은 계속 관찰합니다.
- 전체 리모델링 LightBIM 수량 검토와 PCE 해석 흐름은 더 선명한 운영 안내가 필요할 수 있습니다.

### S4

- Vite bundle size warning, SQLite experimental warning, Electron metadata warning, Node DEP warning은 비차단 경고입니다.

## Deferred Items

- 실제 고객 데이터 추가 Pilot / 현장 데이터 축적
- 단가 준비 상태 `PARTIAL` 항목의 운영 영향 분석
- 전체 리모델링 LightBIM 수량 검토 UX 개선
- PCE 결과 해석 안내 개선
- CRM pipeline
- 주소 API
- 고객 포털 배포
- calendar integration
- cloud sync
- bundle optimization

## Merge Readiness Decision

`MERGE_READY`

판정 근거:

- S1/S2 없음
- 3개 Pilot 모두 통과
- 개인정보 익명화 통과
- 고객 안전성 통과
- 견적/PCE 통과
- build/smoke 통과 대상
