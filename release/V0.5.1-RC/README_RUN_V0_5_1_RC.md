# v0.5.1 RC 실행 가이드

## 실행 파일

- 위치: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- 버전 기준: `v0.5.1-rc`
- RC tag target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- 기준 official version: `v0.5.0`

## 최초 실행

1. 실행 파일을 더블클릭한다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인한다.
3. 개발 서버 없이 첫 화면이 열리는지 확인한다.
4. 실행 후 남은 프로세스가 없는지 확인한다.

## v0.5.1에서 확인할 항목

### Role Management UX

- 현재 role 표시
- role별 권한 요약 표시
- `CLIENT_VIEWER`, `SITE_CREW` 같은 제한 role 차이 표시
- role 변경 전 경고 표시
- role 변경 후 audit 기록
- 외부 auth/provider `DISABLED`

### Permission Center UX

- 7 roles / 28 permissions matrix 표시
- permission 검색
- role filter
- 위험 권한 강조
  - `estimate.internal_cost.view`
  - `estimate.margin.view`
  - `vendor.price.view`
  - `internal_output.generate`
  - `audit.view`
  - `system.settings.edit`

### Permission Audit Viewer

- `PERMISSION_DENIED` 조회
- `ACTIVE_ROLE_CHANGED` 조회
- `INTERNAL_COST_ACCESSED` 조회
- `MARGIN_VIEWED` 조회
- `CUSTOMER_OUTPUT_GENERATED` 조회
- `INTERNAL_OUTPUT_GENERATED` 조회
- raw phone/email/full address/token/provider payload 원문 비노출

### Access Denied Reason

- 권한 없는 화면 접근 시 안전한 한국어 사유 표시
- 내부 route/path/DB/token/raw customer data 비노출
- `CLIENT_VIEWER`, `STAFF`, `SITE_CREW` 제한 route에서 safe denial 확인

### Visibility Preview

- role별 customer/internal payload preview 확인
- `CLIENT_VIEWER`에서 내부 원가, 마진, PCE, vendor price, queue, raw contact 제거 확인
- `CEO`, `MANAGER` 내부 접근 범위 확인
- 기존 sanitizer와 일관성 확인

## 고객 안전성 확인

고객용 화면, 출력, preview에는 다음 항목이 표시되면 안 된다.

- internal cost
- vendor price
- labor cost
- margin / profit / PCE
- recommendation scoring
- queue
- internal action / notification / memo
- raw phone/email
- detailed internal address
- provider payload / hash / error
- coordinates
- internal file path
- runtime DB path
- token / credential
- audit raw entry

## 알려진 경고

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning
- Node DEP0190 warning
- npm update notice

## 금지 사항

- official `v0.5.1` tag 생성 금지
- GitHub Release 생성 금지
- release asset 업로드 금지
- EXE/app.asar/electron/release Git 커밋 금지
- 실제 고객/직원 개인정보 fixture 사용 금지

## 최종 판정

`v0.5.1 RC Desktop Package 검증 완료`
