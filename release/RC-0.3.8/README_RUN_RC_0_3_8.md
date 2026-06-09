# RC-0.3.8 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행 방법

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 렌더링되는지 확인합니다.
4. 실제 단가표를 입력하기 전에 백업 / 복구 센터에서 전체 백업 상태를 확인합니다.

## 데이터 저장 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.3.8 추가 내용

- 단가 미매칭 추천 센터
- 미매칭 import row 목록과 상세
- Master Data 후보 Top 3
- `HIGH / MEDIUM / LOW / NO_MATCH` confidence 분류
- 추천 승인 / 반려 / 보류
- 승인 추천의 Price Queue 연결
- Queue `PENDING_REVIEW` 보호
- Master Data 직접 변경 방지
- 고객용 payload 내부 추천 정보 필터링

## 단가 미매칭 추천 센터 사용 방법

1. 단가표 일괄 가져오기에서 CSV를 가져오고 자동 매칭을 실행합니다.
2. CEO Dashboard, Drawer 또는 관련 내부 단가 화면에서 `단가 미매칭 추천 센터`를 엽니다.
3. 미매칭 row와 추천 후보 Top 3를 확인합니다.
4. 점수 근거, 단위, 규격, 현재 단가와 import 단가를 검토합니다.
5. 추천을 승인, 반려 또는 보류합니다.
6. 승인된 추천만 Price Queue에 연결합니다.
7. 실제 단가 보정 워크벤치에서 다시 승인하고 백업 후 반영합니다.

## Confidence 의미

- `HIGH`: 75점 이상. 강한 후보지만 대표 검토가 필요합니다.
- `MEDIUM`: 55점 이상 75점 미만. 품목과 규격을 재확인합니다.
- `LOW`: 30점 이상 55점 미만. 참고 후보로만 사용합니다.
- `NO_MATCH`: 30점 미만. 신규 Master Data 검토 대상으로 남깁니다.

검증 fixture 점수는 `HIGH 93`, `MEDIUM 66`, `LOW 54`, `NO_MATCH 0`입니다.

## 추천 승인 / 반려 / 보류 기준

- 승인: 품목, 단위, 규격과 후보가 일치한다고 판단한 경우
- 반려: 다른 품목이거나 단위, 규격, 후보가 잘못된 경우
- 보류: 공급처, 규격, 가격을 추가로 확인해야 하는 경우

## Price Queue 연결 원칙

- 승인된 추천만 Queue에 연결할 수 있습니다.
- 연결된 Queue 상태는 `PENDING_REVIEW`입니다.
- Queue 연결은 최종 가격 승인이 아닙니다.
- 기존 Real Price Calibration Workbench에서 승인과 백업 절차를 다시 거쳐야 합니다.

## Master Data 직접 변경 방지

- 추천 점수 계산은 Master Data를 변경하지 않습니다.
- 추천 승인만으로 Master Data를 변경하지 않습니다.
- Queue 연결만으로 Master Data를 변경하지 않습니다.
- 백업 성공 후 기존 단가 보정 서비스가 old/new history를 기록하며 반영합니다.

## 고객용 출력 비노출 원칙

고객용 화면과 payload에는 추천 점수, confidence, import row 가격, 후보 Master Data, 현재/제안 단가, variance, Queue, 승인 상태, 내부 원가, 마진, PCE, 업체/노무/구매/입고 정보와 개인정보를 노출하지 않습니다.

## 문제 발생 시 확인 순서

1. import row의 검증 상태와 매칭 상태를 확인합니다.
2. 추천 점수 근거와 후보 유형을 확인합니다.
3. 추천 승인/반려/보류 사유를 확인합니다.
4. Queue가 `PENDING_REVIEW`인지 확인합니다.
5. 추천 승인 또는 Queue 연결 후 Master Data 가격이 그대로인지 확인합니다.
6. 실제 단가 보정 워크벤치의 승인과 백업 상태를 확인합니다.
7. Customer safety regression을 실행합니다.
