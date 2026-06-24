# v0.4.6 Implementation Report

## 범위

- Packaged Visual Click QA
- Safe Screenshot Capture Mode
- Pixel/Layout comparison
- PDF Korean typography 개선
- PDF/Excel/Print output render QA
- Customer/internal separation 및 customer safety 회귀

## 구현 결과

- 실제 패키지 앱 CDP 연결: PASSED
- LightBIM / CRM / Client Portal 실제 클릭: PASSED
- 앱 viewport 전용 screenshot: PASSED
- 전체 desktop capture 거부: PASSED
- 운영 userData 대신 합성 격리 경로 사용: PASSED
- 클릭 전후 pixel delta: PASSED
- drawer/header/button 수평 layout 검사: PASSED
- PDF Type0 한글 폰트 임베딩: PASSED
- PDF ToUnicode 및 CID 폭 보정: PASSED
- 긴 내부 행 줄바꿈 / 2페이지 분할: PASSED
- Poppler PDF 실제 렌더: PASSED
- 고객 PDF/Excel 내부정보 비노출: PASSED
- Print CSS layout guard: PASSED

## 결함 등급

- P0: 0
- P1: 0
- P2: 0
- P3:
  - OS Excel viewer 기반 픽셀 렌더 자동화
  - 시스템 print dialog 실제 클릭 자동화

## 최종 검증

- v0.4.6 신규 smoke 4종: PASSED
- v0.4.5 RC/package/diagnostics/visual/output 회귀: PASSED
- RC-0.4.4 package/calendar 회귀: PASSED
- Real Project Intake: PASSED
- LightBIM customer safety / release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED, timeout/failed/remaining process 없음
- `npm run smoke:release`: PASSED

허용 경고:

- Vite bundle size warning
- SQLite experimental API warning

v0.4.5 역사 회귀의 “공식 v0.4.5 태그가 없어야 한다” 조건은 공식 릴리스 이후 부정확해졌으므로, 현재 공식 target `abe9094a8f09776a0960f0e65550bf301c5b8c55` 보존 검사로 변경했다.

## 생성물 정책

`qa-output/`, screenshots, generated PDF/XLSX, `electron/release/`, `release-assets/`는 커밋하지 않는다.

## 최종 판정

`MERGE_READY`

v0.4.5의 packaged click, safe screenshot, pixel comparison, PDF Korean typography P3 항목은 이번 범위에서 해소됐다. 남은 P3는 외부 viewer/OS dialog 자동화이며 customer safety 또는 운영 차단 이슈가 아니다.
