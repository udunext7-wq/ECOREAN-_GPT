# v0.4.5 RC Desktop Package 실행 안내

## 실행 파일

- 실행 파일: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- 패키지 기준 태그: `v0.4.5-rc`
- 태그 대상: `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`
- 공식 `v0.4.5` 태그: 아직 생성하지 않음
- GitHub Release / release asset 업로드: 아직 수행하지 않음

## 실행 방법

1. 실행 중인 `ECOREAN BOC CEO Dashboard` 프로세스가 있으면 종료한다.
2. 위 EXE 파일을 실행한다.
3. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인한다.
4. 별도 dev server 없이 첫 화면이 열리는지 확인한다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## v0.4.5 RC 검증 범위

- Release smoke diagnostics
- Packaged visual QA
- PDF / Excel / print output artifact QA
- Customer/internal output separation
- Customer safety regression
- Official `v0.4.4` tag preservation
- Official `v0.4.5` tag non-creation

## 알려진 경고

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning
- PDF Korean text ASCII fallback

## 후속 QA 항목

- Full packaged visual click automation
- Pixel-level screenshot comparison
- Safe screenshot capture mode
- PDF Korean typography improvement
- Official v0.4.5 release package validation

## 최종 판정

`v0.4.5 RC Desktop Package 검증 완료`

단, 공식 `v0.4.5` release/tag/GitHub Release는 아직 생성하지 않았다.
