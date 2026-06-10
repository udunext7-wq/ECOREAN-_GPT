# RC-0.3.9 Packaged Operational Baseline

## 기준 정보

- 기준 커밋: `c00eed2 Build RC-0.3.9 desktop release package`
- Source commit: `be0367c Finalize RC-0.3.9 merge documentation`
- Source tag: `v0.3.9-rc`
- Packaged baseline tag: `v0.3.9-rc-packaged`
- 기준 확정일: 2026-06-10

## 기존 태그

- `v0.3.0-rc`
- `v0.3.1-rc`
- `v0.3.2-rc`
- `v0.3.2-rc-packaged`
- `v0.3.3-rc`
- `v0.3.3-rc-packaged`
- `v0.3.4-rc`
- `v0.3.4-rc-packaged`
- `v0.3.5-rc`
- `v0.3.5-rc-packaged`
- `v0.3.6-rc`
- `v0.3.6-rc-packaged`
- `v0.3.7-rc`
- `v0.3.7-rc-packaged`
- `v0.3.8-rc`
- `v0.3.8-rc-packaged`
- `v0.3.9-rc`

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

필수 export 및 backup 하위 폴더의 존재를 확인했습니다.

## Recommendation Scoring Rules View

- 내부 전용 `추천 점수 규칙 센터`: PASSED
- 품목명 정규화: PASSED
- 단위 정규화: PASSED
- 규격 및 브랜드 정규화: PASSED
- name/category/unit/spec/vendor/history/price score breakdown: PASSED
- 공급처 가중치: PASSED
- 승인/반려 이력 가중치: PASSED
- 가격 차이율 안전 점수: PASSED
- CEO Dashboard를 포함한 5개 내부 진입점: PASSED
- 고객용 화면 진입점 없음: PASSED

## Confidence 결과

| Confidence | 점수 | 결과 |
| --- | ---: | --- |
| HIGH | 93 | PASSED |
| MEDIUM | 66 | PASSED |
| LOW | 54 | PASSED |
| NO_MATCH | 0 | PASSED |

공급처 일치만으로 품목 식별이 약한 후보가 `HIGH`로 승격되지 않는 보호 규칙을 확인했습니다.

## Master Data 보호

- 추천 규칙 변경만으로 Master Data 변경 없음: PASSED
- 추천 승인만으로 Master Data 변경 없음: PASSED
- Price Queue 연결만으로 Master Data 변경 없음: PASSED
- 연결 Queue 상태 `PENDING_REVIEW` 유지: PASSED
- 최종 반영은 Workbench 승인, 백업, apply, old/new history 절차 사용: PASSED

## Customer Safety

- 추천 점수, breakdown, confidence, 가중치 비노출: PASSED
- import row, 후보 Master Data, Queue, 승인 상태 비노출: PASSED
- 현재/제안 단가, variance, 내부 원가, 마진, PCE 비노출: PASSED
- 업체, 노무, 구매, 입고 정보 비노출: PASSED
- 상세 주소, 전화번호, 이메일, 고객 메모 비노출: PASSED

## 최종 검증

- Electron service JavaScript 43개 문법 검사: PASSED
- 요청된 RC-0.3.5~RC-0.3.9 및 LightBIM Node smoke 13개: PASSED
- RC-0.3.9 packaged/recommendation/stabilization smoke: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## Known Warnings

- Vite production bundle size warning
- Node SQLite experimental API warning
- electron-builder metadata warning when packaging is run
- Node DEP0190 warning or npm update notice when shown

## 최종 판정

`RC-0.3.9 packaged operational baseline 사용 가능`

추천 점수는 검토 우선순위를 돕는 내부 판단 자료입니다. 추천 규칙 변경, 추천 승인, Queue 연결만으로 Master Data 가격이 변경되지 않으며, 기존 승인·백업·반영·이력 절차가 계속 필수입니다.
