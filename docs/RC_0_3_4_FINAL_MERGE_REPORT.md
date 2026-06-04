# RC-0.3.4 Final Merge Report

## 기본 정보

- Source branch: `rc-0.3.4-actual-customer-pilot-expansion`
- Merge date: 2026-06-04
- Merge commit: `0cba7e6 Merge RC-0.3.4 actual customer pilot expansion branch`
- Base tags:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
  - `v0.3.2-rc`
  - `v0.3.2-rc-packaged`
  - `v0.3.3-rc`
  - `v0.3.3-rc-packaged`

## Included Commits

- `7d0a1af Start RC-0.3.4 actual customer pilot expansion`
- `35280a1 Stabilize RC-0.3.4 actual customer pilot expansion branch`
- `0cba7e6 Merge RC-0.3.4 actual customer pilot expansion branch`

## 포함 내용

- 3개 Pilot 유형 반복 검증
- `BATHROOM` Pilot
- `KITCHEN` Pilot
- `FULL_REMODELING` Pilot
- Pilot report 개인정보 익명화 검증
- 고객-facing payload 안전성 검사
- 견적/PCE 검증
- 고객 출력 READY / 내부 출력 READY 검증
- 운영 병목 기록

## Pilot A/B/C 결과

| Pilot | 견적 유형 | Intake | LightBIM | 단가 준비 | 견적/PCE | 고객 출력 | 내부 출력 | 개인정보 익명화 | 고객 안전성 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pilot A | `BATHROOM` | PASSED | PASSED | `PARTIAL` | PASSED / `SCALE` | READY | READY | PASSED | PASSED |
| Pilot B | `KITCHEN` | PASSED | PASSED | `PARTIAL` | PASSED / `SCALE` | READY | READY | PASSED | PASSED |
| Pilot C | `FULL_REMODELING` | PASSED | PASSED | `PARTIAL` | PASSED / `SCALE` | READY | READY | PASSED | PASSED |

## Privacy / Anonymization Result

PASSED

- Pilot report에는 실제 전화번호, 실제 이메일, 상세주소 원문, 고객 메모 원문을 저장하지 않습니다.
- 고객-facing payload에는 `detailed_address`, `customer_phone`, `customer_email`, `memo`를 노출하지 않습니다.
- Leak injection 시 S1 issue가 생성되고 고객 출력이 차단되는 경로를 확인했습니다.

## Customer Safety Result

PASSED

고객-facing payload는 internal cost, margin, PCE, vendor data, labor cost, purchase data, receiving data, variance, calibration, backup path, import rows, approval queue, internal, profit, `risk_score`를 노출하지 않습니다.

## Estimate / PCE Result

PASSED

- 3개 Pilot 모두 estimate 생성 확인.
- 3개 Pilot 모두 PCE 결과 존재.
- 테스트 기준 PCE decision: `SCALE`.
- `price readiness = PARTIAL`은 비차단 경고로 기록하며 견적 생성은 차단하지 않습니다.

## Operational Bottlenecks

- 욕실: 비교적 빠름. 필수 접수 항목이 짧아 반복 Pilot 흐름이 가볍습니다.
- 주방: 단가/품목 검토 부담. 품목 선택과 단가 준비 상태 확인 시간이 늘어납니다.
- 전체 리모델링: LightBIM 수량/PCE 검토 중요. 수량 검토와 PCE 해석 안내가 운영 판단의 핵심입니다.

## Known Deferred Items

- 추가 Pilot
- `PARTIAL` 단가 준비 영향 분석
- LightBIM 수량 검토 UX
- PCE 해석 안내
- CRM pipeline
- address API
- customer portal deployment
- calendar integration
- cloud sync
- bundle optimization

## Test Results

### Pre-Merge Validation

- `node --check electron/services/*.js`: PASSED
- `node tests/rc-0-3-4-branch-stabilization.smoke.js`: PASSED
- `node tests/rc-0-3-4-actual-customer-pilot-expansion.smoke.js`: PASSED
- `node tests/rc-0-3-3-packaged-actual-customer-pilot-run.smoke.js`: PASSED
- `node tests/rc-0-3-3-packaged-release.smoke.js`: PASSED
- `node tests/real-project-intake.smoke.js`: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

### Post-Merge Validation on Main

- `node --check electron/services/*.js`: PASSED
- `node tests/rc-0-3-4-branch-stabilization.smoke.js`: PASSED
- `node tests/rc-0-3-4-actual-customer-pilot-expansion.smoke.js`: PASSED
- `node tests/rc-0-3-3-packaged-actual-customer-pilot-run.smoke.js`: PASSED
- `node tests/real-project-intake.smoke.js`: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

Known warnings only: Vite bundle size warning and SQLite experimental warning.

## Final Decision

`RC-0.3.4 = 실제 고객 Pilot 반복 검증 흐름 main 반영 가능`
