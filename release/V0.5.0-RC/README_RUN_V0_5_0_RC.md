# v0.5.0 RC 실행 가이드

## 실행 파일

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 기준

- RC tag: `v0.5.0-rc`
- RC tag target: `2ed04851024b5b9a2e26195a78a2ceb53afd61cd`
- Base official version: `v0.4.6`
- Official `v0.5.0` tag: 아직 생성하지 않음
- GitHub Release / release asset: 아직 생성하지 않음

## 최초 실행

1. 실행 파일을 연다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인한다.
3. 개발 서버 없이 첫 화면이 렌더링되는지 확인한다.
4. 앱을 종료한 뒤 다시 실행해 즉시 종료나 무응답이 없는지 확인한다.

## 데이터 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## v0.5.0 RC 핵심 확인

- `사용자 역할 및 권한 센터`
- 7개 역할과 28개 권한
- default-deny 권한 평가
- 알 수 없는 역할/권한 차단
- route/menu/output guard
- 고객 데이터 guard
- audit redaction
- external auth/provider 비활성

## 권한 확인 순서

1. 대시보드의 역할 배지를 확인한다.
2. `역할 / 권한` 또는 설정 화면에서 `사용자 역할 및 권한 센터`를 연다.
3. `CLIENT_VIEWER`, `STAFF`, `SITE_CREW`, `READ_ONLY_AUDITOR`로 전환해 제한 메뉴와 차단 화면을 확인한다.
4. 권한 없는 화면은 `권한 없음` 화면으로 이동해야 한다.
5. 고객용 출력은 내부 원가, 마진, PCE, vendor price, queue, audit raw entry를 포함하지 않아야 한다.

## 고객 안전성

고객 또는 권한 없는 role에서는 다음 정보가 노출되면 안 된다.

- internal cost, vendor price, labor cost
- margin, margin rate, profit, PCE
- queue, recommendation scoring
- internal action, internal notification, internal memo
- raw phone/email, detailed internal address
- provider payload, coordinates, provider hash/error
- runtime DB path, token, credential
- staff private contact, audit raw entry

## 문제 발생 시 확인 순서

1. `release/V0.5.0-RC/RELEASE_MANIFEST.json`
2. `release/V0.5.0-RC/RC_PACKAGE_TEST_REPORT.md`
3. `tests/v0-5-0-rc-packaged-release.smoke.js`
4. `tests/v0-5-0-branch-stabilization.smoke.js`
5. `tests/lightbim-customer-safety-regression.smoke.js`

## 최종 판정

`v0.5.0 RC Desktop Package 검증 완료`
