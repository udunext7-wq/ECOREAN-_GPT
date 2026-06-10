# RC-0.3.9 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 렌더링되는지 확인합니다.
4. 실제 단가와 규칙을 변경하기 전에 백업 / 복구 센터에서 백업 상태를 확인합니다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.3.9 추가 내용

- Recommendation Scoring Service
- 추천 점수 규칙 센터
- 품목명, 단위, 규격 정규화
- 공급처 가중치
- 승인/반려 이력 가중치
- 가격 차이율 안전 점수
- 점수 breakdown
- 공급처 단독 HIGH 승격 방지
- 추천 및 Queue 단계의 Master Data 직접 변경 방지
- 고객용 payload scoring/internal data 필터링

## 추천 점수 규칙 센터

1. CEO Dashboard, Drawer 또는 내부 단가 화면에서 `추천 점수 규칙 센터`를 엽니다.
2. 공급처, 품목 동의어, 단위 alias, 규격, 승인/반려 패턴을 확인합니다.
3. 규칙 유형, 패턴, 방향과 가중치를 입력합니다.
4. 규칙을 저장하거나 활성/비활성으로 변경합니다.
5. 점수 breakdown과 추천 후보를 다시 확인합니다.
6. 필요하면 추천 점수 리포트를 생성합니다.

규칙 변경은 추천 점수에만 영향을 주며 Master Data 가격을 직접 변경하지 않습니다.

## Score Breakdown

- 품목명: 30%
- 공정/분류: 20%
- 단위: 15%
- 규격/브랜드: 15%
- 공급처: 10%
- 승인/반려 이력: 5%
- 가격 차이율: 5%

## Confidence

- `HIGH`: 85점 이상
- `MEDIUM`: 65점 이상 85점 미만
- `LOW`: 40점 이상 65점 미만
- `NO_MATCH`: 40점 미만

검증 기준은 `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0`입니다.

## 공급처 가중치

- 동일 공급처가 일치하면 공급처 점수를 높입니다.
- 공급처가 없으면 중립 점수 50을 적용합니다.
- 공급처만 일치하고 품목명, 단위 또는 규격 식별력이 낮으면 HIGH로 승격하지 않습니다.
- 승인 이력은 제한된 범위에서 가산하고 반려 이력은 감산합니다.

## Master Data 보호

- 추천 점수 계산만으로 Master Data를 변경하지 않습니다.
- 추천 규칙 저장 또는 활성/비활성만으로 Master Data를 변경하지 않습니다.
- 추천 승인만으로 Master Data를 변경하지 않습니다.
- Queue 연결만으로 Master Data를 변경하지 않습니다.
- Queue는 `PENDING_REVIEW` 상태를 유지합니다.
- 실제 반영은 Workbench 승인, 백업 성공, apply, old/new history 기록을 거쳐야 합니다.

## 고객용 출력

고객 화면과 payload에는 추천 점수, breakdown, 공급처/이력 가중치, 후보 Master Data, import 가격, 현재/제안 단가, variance, Queue, 승인 상태, 내부 원가, 마진, PCE, 업체/노무/구매/입고 정보와 개인정보를 노출하지 않습니다.

## 문제 발생 시 확인 순서

1. 추천 점수 규칙의 상태와 패턴을 확인합니다.
2. 품목명, 단위, 규격 정규화 결과를 확인합니다.
3. 점수 breakdown과 confidence를 확인합니다.
4. 공급처 점수만으로 HIGH가 되지 않았는지 확인합니다.
5. Queue가 `PENDING_REVIEW`인지 확인합니다.
6. 추천 또는 Queue 연결 후 Master Data 가격이 그대로인지 확인합니다.
7. Workbench의 승인, 백업과 history를 확인합니다.
8. Customer safety regression을 실행합니다.
