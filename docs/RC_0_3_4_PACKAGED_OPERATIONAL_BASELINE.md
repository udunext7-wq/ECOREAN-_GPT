# RC-0.3.4 Packaged Operational Baseline

## 기준 정보

- 기준 커밋: `12a7bbb Build RC-0.3.4 desktop release package`
- 새 태그: `v0.3.4-rc-packaged`
- 기준 날짜: 2026-06-04

## 기존 태그

- `v0.3.0-rc`
- `v0.3.1-rc`
- `v0.3.2-rc`
- `v0.3.2-rc-packaged`
- `v0.3.3-rc`
- `v0.3.3-rc-packaged`
- `v0.3.4-rc`

## 패키지 실행 파일

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 운영 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## 검증 완료 흐름

- packaged app launch
- `BATHROOM` pilot
- `KITCHEN` pilot
- `FULL_REMODELING` pilot
- privacy/anonymization
- customer safety
- estimate/PCE repeated verification
- operational bottleneck recording

## 3개 Pilot 유형 검증 결과

| Pilot | 견적 유형 | 결과 |
| --- | --- | --- |
| Pilot A | `BATHROOM` | PASSED |
| Pilot B | `KITCHEN` | PASSED |
| Pilot C | `FULL_REMODELING` | PASSED |

## Privacy / Anonymization

PASSED

- Pilot report는 실제 전화번호, 실제 이메일, 상세주소 원문, 고객 메모 원문을 저장하지 않습니다.
- 고객-facing payload는 상세주소, 전화번호, 이메일, 고객 메모 원문을 노출하지 않습니다.

## Customer Safety

PASSED

고객-facing payload는 internal cost, margin, PCE, vendor/labor/purchase/receiving data, actual used quantity, variance, calibration, backup path, import rows, manual matching logs, approval queue, internal, profit, `risk_score`를 노출하지 않습니다.

## Known Warnings

- Vite bundle size warning
- SQLite experimental warning
- electron-builder metadata warning
- Node DEP0190 warning

## 최종 판정

`RC-0.3.4 packaged operational baseline 사용 가능`
