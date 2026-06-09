# RC-0.3.8 Packaged Operational Baseline

## 기준 정보

- 기준 커밋: `625150d Build RC-0.3.8 desktop release package`
- Source commit: `9c5d1da Finalize RC-0.3.8 merge documentation`
- Source tag: `v0.3.8-rc`
- Packaged baseline tag: `v0.3.8-rc-packaged`
- 기준 확정일: 2026-06-09

## 실행 파일

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

필수 export 하위 폴더와 backup 하위 폴더의 존재를 확인했습니다.

## 단가 미매칭 추천 결과

- Unmatched Price Recommendation Center: PASSED
- 미매칭 import row 목록과 상세: PASSED
- Master Data 후보 Top 3: PASSED
- Recommendation report: PASSED
- 6개 내부 진입점: PASSED
- 고객용 화면 추천 센터 진입점 없음: PASSED

## Confidence 결과

| Confidence | 점수 | 결과 |
| --- | ---: | --- |
| HIGH | 93 | PASSED |
| MEDIUM | 66 | PASSED |
| LOW | 54 | PASSED |
| NO_MATCH | 0 | PASSED |

## 추천 검토와 Queue 결과

- 추천 승인 `APPROVED`: PASSED
- 추천 반려 `REJECTED`: PASSED
- 추천 보류 `DEFERRED`: PASSED
- 승인 추천의 Price Queue 연결: PASSED
- 연결 Queue 상태 `PENDING_REVIEW` 유지: PASSED

## Master Data 보호

- 추천 점수 계산만으로 Master Data 변경 없음: PASSED
- 추천 승인만으로 Master Data 변경 없음: PASSED
- Queue 연결만으로 Master Data 변경 없음: PASSED
- 최종 반영은 기존 Workbench 승인, 백업, apply, old/new history 절차 사용: PASSED

## Customer Safety

- 추천 점수와 confidence 비노출: PASSED
- import row 가격과 후보 Master Data 비노출: PASSED
- 현재/제안 단가, variance, Queue, 승인 상태 비노출: PASSED
- 내부 원가, 마진, PCE, 업체/노무/구매/입고 정보 비노출: PASSED
- 상세 주소, 전화번호, 이메일, 고객 메모 비노출: PASSED

## 최종 검증

- 서비스 JavaScript 문법 검사: PASSED
- RC-0.3.8 packaged/recommendation/stabilization smoke: PASSED
- RC-0.3.7 이하 가격 보정 회귀: PASSED
- Real Project Intake: PASSED
- LightBIM customer safety and release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## Known Warnings

- Vite production bundle size warning
- Node SQLite experimental API warning
- electron-builder metadata warning when packaging is run
- Node DEP0190 warning or npm update notice when shown

## 최종 판정

`RC-0.3.8 packaged operational baseline 사용 가능`

추천은 판단 보조이며, Master Data 변경은 기존 Queue, 승인, 백업, history 흐름 외에는 발생하지 않습니다.
