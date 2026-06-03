# RC-0.3.3 Packaged Actual Customer Pilot Run Report

## 기본 정보

- Test date: 2026-06-03
- Commit: `25feb4d Build RC-0.3.3 desktop release package`
- Branch: `main`
- Packaged exe path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO

## Packaged Pilot Run Result

- Backup ID: `FULL-2026-06-03_213734`
- Backup manifest: `%APPDATA%\ecorean-boc-electron\backups\manifests\boc_backup_manifest_FULL-2026-06-03_213734.json`
- Pilot ID: `ACP-RC033-PACKAGED-PILOT`
- Intake ID: `RPI-RC033-PACKAGED-PILOT`
- LightBIM result: PASSED
- LightBIM import ID: `LIGHTBIM-IMPORT-1780490254638`
- Price readiness: `PARTIAL`
- Estimate ID: `INTAKE-FULL_REMODELING-1780490254727`
- PCE result: `SCALE`
- Customer output result: `READY`
- Internal output result: `READY`
- Pilot report generation: PASSED
- Restart persistence result: PASSED

## 개인정보 익명화 결과

PASSED.

Pilot report에 다음 원문이 저장되지 않음을 확인했습니다.

- 실제 전화번호
- 실제 이메일
- 상세주소
- 고객 메모 원문

테스트에서 사용한 민감값은 report에 저장되지 않았고, Pilot step payload의 민감 필드는 `[REDACTED]` 처리됩니다.

## 고객 안전성 결과

PASSED.

Customer-facing payload와 leak injection 검증에서 다음 내부/민감 정보가 고객 출력으로 통과하지 않음을 확인했습니다.

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

민감/내부 정보 leak injection 시 S1 issue가 생성되고 고객 출력은 차단됩니다.

## 앱 재시작 / 데이터 유지

PASSED.

서비스 재시작 시뮬레이션 후 다음 데이터가 유지됨을 확인했습니다.

- Pilot run
- Intake
- Estimate reference
- Pilot report
- Backup history

## Issues Found

### S1

- 없음

### S2

- 없음

### S3

- 없음

### S4

- `Price readiness = PARTIAL`은 비차단 경고입니다.
- SQLite experimental warning은 비차단 경고입니다.

## Final Decision

`패키지 고객 Pilot 흐름 사용 가능`
