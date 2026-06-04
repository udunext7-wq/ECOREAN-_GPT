# RC-0.3.4 Packaged App Test Report

## 기본 정보

- Test date: 2026-06-04
- Version: `RC-0.3.4`
- Tag: `v0.3.4-rc`
- Commit: `2cb40e4 Finalize RC-0.3.4 merge documentation`
- Package type: `windows-unpacked`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## Launch Result

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED

## userData / Export / Backup Result

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`
- Export folders: estimates, contracts, schedules, purchase-orders, visualizations, boards, reports, lightbim
- Backup folders: db, export, full, manifests

## Pilot A/B/C Packaged Readiness

| Pilot | 견적 유형 | Packaged readiness |
| --- | --- | --- |
| Pilot A | `BATHROOM` | READY |
| Pilot B | `KITCHEN` | READY |
| Pilot C | `FULL_REMODELING` | READY |

## Privacy / Anonymization Result

PASSED

- Pilot report는 실제 전화번호, 실제 이메일, 상세주소 원문, 고객 메모 원문을 저장하지 않습니다.
- 고객-facing payload는 상세주소, 전화번호, 이메일, 고객 메모 원문을 노출하지 않습니다.

## Customer Safety Result

PASSED

고객-facing payload는 internal cost, margin, PCE, vendor/labor/purchase/receiving data, actual used quantity, variance, calibration, backup path, import rows, manual matching logs, approval queue, internal, profit, `risk_score`를 노출하지 않습니다.

## Final Decision

`RC-0.3.4 desktop release package 사용 가능`
