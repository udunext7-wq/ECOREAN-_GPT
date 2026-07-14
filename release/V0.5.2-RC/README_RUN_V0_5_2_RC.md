# v0.5.2 RC 실행 가이드

## 실행 파일

- 위치: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- 버전 기준: `v0.5.2-rc`
- RC tag target: `6271159b021e3c4a179ec4cb0e0a582e95480b64`
- 기준 official version: `v0.5.1`

## 실행 확인

1. 실행 파일을 더블클릭한다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인한다.
3. 개발 서버 없이 첫 화면이 열리는지 확인한다.
4. 종료 후 잔류 프로세스가 없는지 확인한다.
5. 재실행 후 기존 userData가 유지되는지 확인한다.

## 역할 변경 승인 Workflow

1. `역할 / 권한`에서 `사용자 역할 및 권한 센터`를 연다.
2. `역할 변경 요청`에서 현재 역할, 요청 역할, 요청 사유를 확인한다.
3. permission 추가·제거 diff와 risk badge를 검토한다.
4. 초안 저장 또는 승인 요청으로 `DRAFT` / `PENDING` 상태를 생성한다.
5. 승인 Queue에서 승인자 권한을 확인한다.
6. 요청자 본인의 자기 승인은 차단되어야 한다.
7. 승인 후에도 역할은 즉시 변경되지 않아야 한다.
8. 별도 `승인 역할 적용`을 실행해야 `APPLIED`가 된다.
9. 반려·취소·만료·완료 요청은 적용 또는 재처리되지 않아야 한다.
10. 적용 실패 시 기존 역할이 유지되고 `ROLE_CHANGE_FAILED` 감사 이벤트가 남아야 한다.

지원 상태는 `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `EXPIRED`, `APPLIED`, `FAILED`이다.

## 권한 감사 내보내기

- 형식: JSON, CSV, Print-safe HTML
- 필터: 기간, event type, actor role, target role, request status, risk level, decision
- 생성 후 `AUDIT_EXPORT_GENERATED` 감사 이벤트가 기록된다.
- 내보내기 결과는 저장 전에 redaction을 다시 적용한다.
- 생성된 export 파일은 Git에 추가하지 않는다.

## 고객 안전성

`CLIENT_VIEWER`와 권한 없는 역할에는 다음 정보가 노출되면 안 된다.

- internal cost, vendor price, labor cost
- margin, profit, PCE, recommendation scoring
- queue, audit raw entry, approval internal reason
- internal memo, action, notification
- reviewer private information
- raw phone, email, full address, customer memo
- provider payload, coordinates
- absolute file path, runtime DB path
- token, credential

## 검증 기준

- 실제 EXE 2회 실행: `PASSED`
- 실제 packaged `역할 / 권한` 화면 클릭·레이아웃: `PASSED`
- app.asar 서비스/renderer 포함 검사: `PASSED`
- 역할 승인·rollback·감사 export 서비스 smoke: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`

## 알려진 경고

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder package description/author metadata warning
- Node DEP0190 warning
- npm update notice when emitted

## 금지 사항

- `v0.5.2-rc` 태그 수정·이동 금지
- official `v0.5.2` tag 생성 금지
- GitHub Release 및 release asset 생성 금지
- EXE, app.asar, `electron/release`, `electron/dist` Git 커밋 금지
- 실제 고객·직원 개인정보 fixture 사용 금지

## 최종 판정

`v0.5.2 RC Desktop Package 검증 완료`
