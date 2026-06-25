# v0.4.6 RC Desktop Package 실행 안내

## 실행 파일

- 실행 파일: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- 패키지 기준 태그: `v0.4.6-rc`
- 태그 대상: `59f646968e7de4aa6c1392216f8c9444a49d6bf8`
- 기준 공식 버전: `v0.4.5`
- 공식 `v0.4.6` 태그: 생성하지 않음
- GitHub Release / release asset 업로드: 수행하지 않음

## 실행 방법

1. 실행 중인 `ECOREAN BOC CEO Dashboard` 프로세스가 있으면 종료한다.
2. 위 EXE를 실행한다.
3. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인한다.
4. 별도 dev server 없이 첫 화면이 열리는지 확인한다.
5. 종료 후 재실행해 기존 userData가 유지되는지 확인한다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## v0.4.6 RC 핵심 검증

- LightBIM / CRM / Client Portal 실제 패키지 클릭
- 앱 viewport 전용 safe screenshot
- 전체 desktop 및 민감정보 캡처 차단
- 클릭 전후 pixel 변화와 layout bounds 비교
- PDF Korean Type0 font / FontFile2 / ToUnicode
- Poppler PDF raster render
- 고객용 PDF 1페이지
- 내부용 PDF 2페이지
- Excel OpenXML 구조
- Print CSS pagination/layout guards
- PDF/Excel/Print 고객용·내부용 분리
- Customer safety regression

## 알려진 경고

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning

## 후속 P3

- Excel native viewer pixel automation
- OS print dialog click automation

## 최종 판정

`v0.4.6 RC Desktop Package 검증 완료`

공식 `v0.4.6` release/tag/GitHub Release는 아직 생성하지 않았다.
