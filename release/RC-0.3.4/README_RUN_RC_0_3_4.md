# RC-0.3.4 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행 방법

1. 실행 파일을 엽니다.
2. 첫 화면이 표시되는지 확인합니다.
3. dev server 없이 실행되는지 확인합니다.
4. 운영 데이터 입력 전 백업 / 복구 센터에서 전체 백업을 생성합니다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.3.4 추가 내용

- 실제 고객 Pilot 3개 유형 반복 검증
- 욕실 단독 리모델링 / `BATHROOM`
- 주방 리모델링 / `KITCHEN`
- 전체 리모델링 / `FULL_REMODELING`
- Pilot 운영 병목 기록
- Pilot report 개인정보 익명화
- 고객 안전성 회귀 검증
- 견적/PCE 반복 검증

## 3개 Pilot 유형 검증 결과

| Pilot | 견적 유형 | 결과 |
| --- | --- | --- |
| Pilot A | `BATHROOM` | PASSED |
| Pilot B | `KITCHEN` | PASSED |
| Pilot C | `FULL_REMODELING` | PASSED |

## 욕실 / 주방 / 전체 리모델링 운영 차이

- 욕실: 필수 접수 항목이 짧아 비교적 빠르게 진행됩니다.
- 주방: 단가와 품목 검토 부담이 커서 확인 시간이 늘어납니다.
- 전체 리모델링: LightBIM 수량 검토와 PCE 해석이 운영 판단의 핵심입니다.

## 개인정보 최소 입력 원칙

실제 고객 Pilot에서는 필요한 최소 정보만 입력합니다.

- 전화번호 원문은 문서나 고객-facing payload에 남기지 않습니다.
- 이메일 원문은 문서나 고객-facing payload에 남기지 않습니다.
- 상세주소 원문은 고객-facing payload에 노출하지 않습니다.
- 고객 메모 원문은 Pilot report에 저장하지 않습니다.

## Pilot Report 익명화 원칙

Pilot report에는 익명 고객명, 주소 요약, 견적 유형, LightBIM 연결 결과, 단가 준비 상태, 견적/PCE 결과, 고객 안전성 결과, 운영 병목만 기록합니다.

## LightBIM 연결 방법

1. 실제 프로젝트 접수 또는 Pilot 흐름에서 LightBIM JSON을 가져옵니다.
2. project name, space count, total area, suggested estimate type, warning count를 확인합니다.
3. LightBIM 추천 유형과 사용자가 선택한 견적 유형이 다르면 경고를 확인합니다.
4. 수량 검토가 필요한 경우 고객 출력 전 내부 검토를 완료합니다.

## 견적/PCE 생성 방법

1. 접수 필수값을 검증합니다.
2. 단가 준비 상태를 확인합니다.
3. estimate를 생성합니다.
4. PCE를 실행합니다.
5. 고객 출력 READY와 내부 출력 READY를 확인합니다.

## 고객용 출력 전 안전성 검사

고객용 출력 전 다음 항목이 노출되지 않는지 확인합니다.

- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- actual used quantity
- variance
- calibration
- backup path
- import rows
- manual matching logs
- approval queue
- internal
- profit
- risk_score
- detailed address, customer phone/email, memo 원문

## 문제 발생 시 확인 순서

1. 백업 / 복구 센터에서 최근 백업을 확인합니다.
2. 고객 안전성 검사 결과를 확인합니다.
3. Pilot report의 운영 병목과 S1/S2 issue 여부를 확인합니다.
4. LightBIM 수량 검토와 PCE 결과를 다시 확인합니다.
5. S1/S2가 있으면 고객 출력과 실제 운영 반영을 중단합니다.
