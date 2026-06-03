# RC-0.3.3 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행 방법

1. 위 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. 개발 서버 없이 첫 화면이 렌더링되는지 확인합니다.
4. 실제 고객 데이터 Pilot은 테스트/익명값으로 먼저 실행합니다.

## 운영 데이터 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.3.3 추가 내용

- Actual Customer Data Pilot 기록 구조
- 실제 고객 Pilot report 익명화
- Real Project Intake 연결
- LightBIM 연결
- 견적/PCE 검증
- 고객 안전성 검사
- 실제 전화번호, 이메일, 상세주소, 고객 메모 원문 report 저장 방지

## 실제 고객 Pilot 실행 방법

1. 실행 전 전체 백업을 생성합니다.
2. 실제 고객 정보는 최소 범위만 입력합니다.
3. 민감한 전화번호, 이메일, 상세주소, 고객 메모는 report에 원문 저장되지 않는지 확인합니다.
4. Intake를 Pilot에 연결합니다.
5. LightBIM 도면을 연결합니다.
6. 단가 준비 상태를 확인합니다.
7. 견적/PCE를 실행합니다.
8. 고객용 출력 전 고객 안전성 검사를 실행합니다.
9. Pilot report를 생성하고 익명화 결과를 확인합니다.

## 개인정보 최소 입력 원칙

- 실제 전화번호와 이메일은 꼭 필요한 경우에만 입력합니다.
- 상세주소는 고객용 출력이나 Pilot report에 원문 노출하지 않습니다.
- 고객 메모는 내부 참고용이며 report에는 요약/익명화 기준으로만 남깁니다.
- 테스트 중에는 `테스트 고객`, `익명 현장`처럼 안전한 값을 사용합니다.

## Pilot Report 익명화 원칙

Pilot report는 다음 원문을 저장하지 않아야 합니다.

- 실제 전화번호
- 실제 이메일
- 상세주소
- 고객 메모 원문
- 내부 원가
- 마진
- PCE
- 협력업체/노무/매입/입고 정보
- variance, calibration, backup path, import rows, approval queue

## LightBIM 연결 방법

1. Pilot 또는 Intake 화면에서 LightBIM 연결을 선택합니다.
2. 기존 LightBIM import를 선택하거나 JSON을 가져옵니다.
3. project name, space count, total area, suggested estimate type을 확인합니다.
4. 견적 유형 충돌 경고가 있으면 사용자 선택을 기준으로 검토합니다.

## 견적/PCE 생성 방법

1. Intake 필수 정보가 채워졌는지 검증합니다.
2. 단가 준비 상태가 `READY`, `PARTIAL`, `NEEDS_UPDATE` 중 무엇인지 확인합니다.
3. `PARTIAL`은 경고이며 견적 생성은 가능합니다.
4. 견적 생성 후 PCE 결과가 존재하는지 확인합니다.

## 고객용 출력 전 안전성 검사

고객용 출력 전에 다음 정보가 payload에 없는지 확인합니다.

- customer_phone, customer_email, detailed_address, memo 원문
- internal cost, margin, PCE, vendor data, labor cost
- purchase, receiving, actual used quantity
- variance, calibration, backup path, onboarding/pilot issue details
- import rows, manual matching logs, approval queue, profit, risk_score

## 문제 발생 시 확인 순서

1. 백업 생성 여부를 확인합니다.
2. DB 무결성과 userData 경로를 확인합니다.
3. Pilot report 익명화 결과를 확인합니다.
4. 고객 안전성 smoke 결과를 확인합니다.
5. LightBIM 연결과 견적/PCE 결과를 확인합니다.
6. S1/S2 이슈는 고객 출력 전에 반드시 차단합니다.

