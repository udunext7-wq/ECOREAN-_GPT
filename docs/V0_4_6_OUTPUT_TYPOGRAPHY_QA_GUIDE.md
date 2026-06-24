# v0.4.6 Output Typography QA Guide

## PDF 한글 원인

v0.4.5의 `PDF_KOREAN_TEXT_ASCII_FALLBACK`은 parser 한계가 아니라 `estimateExportService`가 비 ASCII 문자를 공백으로 치환한 실제 생성 문제였다.

v0.4.6은 폰트 파일을 저장소에 커밋하지 않고 Windows 시스템의 `malgun.ttf`를 런타임에 읽어 PDF에 포함한다.

- Type0 / CIDFontType2
- Identity-H
- FontFile2 임베딩
- ToUnicode CMap
- 한글 CID 폭 보정
- 긴 행 줄바꿈
- 42행 단위 다중 페이지 분할

시스템 한글 TTF를 찾지 못한 환경에서는 기존 ASCII fallback이 유지되며 QA가 실패해 원인을 숨기지 않는다.

## PDF Render QA

번들 Poppler `pdftoppm`으로 고객용/내부용 PDF의 모든 페이지를 PNG로 렌더한다.

- 고객용 PDF: 1페이지, 한글 표시, visible ink 확인
- 내부용 PDF: 2페이지, 긴 행 줄바꿈, 각 페이지 visible ink 확인
- 빈 페이지, 렌더 실패, FontFile2/ToUnicode 누락은 실패

raw byte 검색은 UTF-16 hex text를 완전하게 해석하지 못할 수 있다. 최종 판정은 PDF 폰트 구조와 Poppler 렌더 결과를 함께 사용한다.

## Excel / Print QA

- 고객용/내부용 XLSX 생성
- workbook/worksheet OpenXML 구조 확인
- 고객용 XLSX 내부 원가/PCE/마진 금지어 검사
- 인쇄 CSS의 `table-header-group`, `page-break-inside`, `break-inside` 확인
- OS Excel viewer 픽셀 비교와 시스템 print dialog 클릭은 P3 후속 항목

## 실행

```powershell
cd electron
npm run qa:v0.4.6:output-typography
```

생성 PDF/XLSX/PNG는 모두 `qa-output/` 아래에만 존재하며 커밋하지 않는다.
