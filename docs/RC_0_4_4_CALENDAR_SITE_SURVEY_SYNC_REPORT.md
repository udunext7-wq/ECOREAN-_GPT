# RC-0.4.4 Calendar / Site Survey Sync Readiness Report

## 테스트 개요

- Branch: `rc-0.4.4-calendar-site-survey-sync-readiness`
- Base tag: `v0.4.3-rc-packaged`
- External calendar provider: `DISABLED`
- External message sending: `DISABLED`

## 검증 항목

- 내부 일정 생성 / 조회 / 수정
- 일정 취소 / 복원 / 완료 / No-show
- 일정 변경과 충돌 감지
- 현장조사 일정 연결
- Survey / Calendar 불일치 감지
- 수동 해결 / 보류
- 내부 알림 생성과 중복 방지
- 감사 기록
- 고객 안전성 payload
- 외부 provider 비활성 상태

## 개인정보 보호

실제 전화번호, 실제 이메일, 상세주소, 고객 메모 원문은 테스트 데이터와 리포트에 기록하지 않는다.

## 최종 판정

RC-0.4.4 Calendar / Site Survey Sync Readiness는 내부 운영 준비 흐름으로 검증한다. 외부 캘린더 연동은 후속 버전으로 분리한다.

## 재개 검증 결과

- 최초 검증 중단 사유: Windows sandbox `CreateProcessAsUserW failed: 5` 및 승인 실행 사용 한도 초과.
- 재개 후 WIP patch 백업: `C:\Users\udune\Desktop\rc-0.4.4-calendar-wip.patch`
- 서비스 syntax: PASSED
- RC-0.4.4 전용 smoke: PASSED
- 기존 Node 회귀: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- 외부 Calendar/OAuth/API/invitation 호출: DISABLED / ABSENT
- Provider 상태: DISABLED
- Customer safety: PASSED

## 수정된 이슈

- unsupported timezone 문자열이 정규식만으로 통과되던 문제를 `Intl.DateTimeFormat` 검증으로 보정했다.
- SQLite `""` 빈 문자열 비교가 Node 24 `node:sqlite`에서 컬럼명으로 해석되는 문제를 단일 따옴표 문자열 리터럴로 보정했다.
- UI build 중 `result.event` 타입 추론 오류를 안전한 `Record<string, unknown>` 처리로 보정했다.

## 핵심 기능 판정

- Calendar lifecycle: PASSED
- Survey linkage: PASSED
- Survey to Calendar: PASSED
- Calendar to Survey: PASSED
- mismatch detection / manual resolution / defer: PASSED
- 원본 자동 덮어쓰기 방지: PASSED
- conflict detection: PASSED
- 자동 취소 / 자동 담당자 변경 / 자동 일정 변경 방지: PASSED
- Reminder lifecycle / OVERDUE / CRM Action duplicate prevention: PASSED
- Timezone / invalid date / negative duration protection: PASSED
- Customer-safe schedule payload: PASSED
- 내부 owner/conflict/memo/provider/hash/cost/margin/PCE 비노출: PASSED
- 내부 진입점: PASSED
- 고객 화면 내부 진입점 비노출: PASSED
- Empty state / edge case: PASSED

## 최종 판정

MERGE_READY
