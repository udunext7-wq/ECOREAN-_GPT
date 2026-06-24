# v0.4.6 Packaged Visual Click QA Guide

## 목적

v0.4.5에서 source label 확인으로 남았던 packaged click QA를 실제 패키지 renderer 클릭과 앱 viewport 픽셀 비교로 확장한다.

## 안전 실행 원칙

- 실행 파일: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- userData: `qa-output/v0.4.6/visual-click/synthetic-user-data`
- fixture marker: `SYNTHETIC_V0_4_6_QA`
- 캡처 범위: Chromium `Page.captureScreenshot`의 앱 viewport만 사용
- 전체 데스크톱 캡처, 운영 `%APPDATA%`, 실제 고객 데이터 사용 금지
- 모든 PNG와 manifest는 Git에서 제외된 `qa-output/`에만 저장

## 자동 클릭 시나리오

1. LightBIM 도면 가져오기
2. 고객 CRM 파이프라인
3. Client Portal

각 시나리오는 패키지 앱을 실행한 뒤 실제 DOM 버튼에 CDP mouse input을 전달한다. 화면 밖의 기존 floating action rail은 DOM MouseEvent fallback을 사용하며, 클릭 후 표시 문구와 drawer 상태를 확인한다.

## 픽셀 및 레이아웃 판정

- 클릭 전/후 PNG를 직접 디코딩한다.
- RGB delta가 있는 픽셀 비율을 계산한다.
- 변경 비율이 `0.5%` 미만이면 화면 전환 실패로 처리한다.
- 현재 실제 변경 비율:
  - LightBIM: 약 `65.4%`
  - CRM: 약 `51.5%`
  - Client Portal: 약 `45.3%`
- viewport 내 drawer/header/button의 수평 잘림과 0 크기 요소를 실패로 처리한다.
- 의도적으로 viewport 밖에 배치된 floating action rail은 콘텐츠 레이아웃 판정에서 제외한다.

## 실행

```powershell
cd electron
npm run qa:v0.4.6:visual-click
npm run qa:v0.4.6:screenshot
```

생성 결과는 `qa-output/v0.4.6/visual-click/`에 저장되며 커밋하지 않는다.
