# RC-0.4.1 CRM Next Action Guide

## 목적

CRM 다음 액션 / 내부 알림 센터는 고객 단계가 바뀔 때 필요한 후속 업무를 자동 생성하고, 기한 초과와 업무 누락을 내부 운영 화면에서 확인하기 위한 기능입니다.

문자, 이메일, 카카오, push, 주소 API, 캘린더 동기화는 실행하지 않습니다. 모든 알림은 로컬 DB와 내부 대시보드에만 기록되며 `external_delivery_status`는 `DISABLED`입니다.

## 자동 생성 규칙

| CRM stage | 생성 액션 | 기본 기한 | 우선순위 |
| --- | --- | --- | --- |
| `LEAD` | `FIRST_CONTACT` | 24시간 | HIGH |
| `CONTACTED` | `CONSULTATION_REVIEW` | 24시간 | NORMAL |
| `CONSULTING` | `FOLLOW_UP` | 48시간 | NORMAL |
| `SITE_SURVEY_SCHEDULED` | `SITE_SURVEY_CONFIRM` | 현장조사 24시간 전 | HIGH |
| `SITE_SURVEY_DONE` | `ESTIMATE_PREPARE` | 48시간 | HIGH |
| `ESTIMATE_REQUESTED` | `ESTIMATE_SEND` | 72시간 | HIGH |
| `ESTIMATE_SENT` | `NEGOTIATION_FOLLOW_UP` | 72시간 | NORMAL |
| `NEGOTIATION` | `NEGOTIATION_FOLLOW_UP` | 72시간 | NORMAL |
| `CONTRACT_PENDING` | `CONTRACT_FOLLOW_UP` | 48시간 | HIGH |
| `CONTRACTED` | `PROJECT_HANDOFF` | 24시간 | HIGH |

같은 고객에게 동일한 `action_type`의 활성 액션이 있으면 중복 생성하지 않습니다. `ON_HOLD` 진입 시 활성 액션은 `SNOOZED`, `LOST` 진입 시 `CANCELLED`로 전환합니다.

## 상태와 우선순위

상태:

- `OPEN`: 진행 필요
- `IN_PROGRESS`: 진행 중
- `SNOOZED`: 보류 또는 연기
- `COMPLETED`: 완료
- `CANCELLED`: 취소
- `OVERDUE`: 기한 초과

우선순위:

- `LOW`
- `NORMAL`
- `HIGH`
- `URGENT`

`due_at`이 현재 시각보다 이전이고 액션이 진행 중이면 `OVERDUE`로 바뀝니다. 같은 액션의 기한 초과 알림은 한 번만 생성합니다.

## 내부 알림 기준

- `INFO`: 일반 다음 액션과 보류 상태
- `WARNING`: 높은 우선순위, 기한 초과, 계약/견적 후속 확인
- `CRITICAL`: 운영자가 별도로 기록한 고위험 내부 상태

알림 category는 `NEXT_ACTION`, `OVERDUE`, `STAGE_DELAY`, `SITE_SURVEY`, `ESTIMATE`, `CONTRACT`, `DATA_QUALITY`, `SYSTEM`을 사용합니다.

## 화면 사용 순서

1. CRM 파이프라인에서 고객을 생성하거나 단계를 이동합니다.
2. CRM 다음 액션 / 내부 알림 센터를 엽니다.
3. 오늘, 기한 초과, stage, 담당자, 우선순위, action type으로 필터링합니다.
4. 액션 상세에서 stage history와 공개 가능 상담 요약을 확인합니다.
5. 업무를 완료, 24시간 보류 또는 취소 처리합니다.
6. 자동 규칙에 없는 작업은 수동 다음 액션으로 생성합니다.
7. 내부 알림을 읽음 또는 닫기 처리합니다.

## 진입점

- First Entry Panel
- CEO Dashboard
- Drawer navigation
- 고객 CRM 파이프라인 센터
- 실제 프로젝트 접수

## 고객 안전성

고객 payload는 허용 목록으로 별도 생성합니다. 다음 정보는 고객 화면에 포함하지 않습니다.

- 내부 알림과 내부 액션 메모
- 담당자 판단, 지연 위험과 내부 우선순위
- 원문 전화번호, 이메일, 상세주소, 내부 메모
- 내부 원가, 마진, PCE
- Price Queue, 승인 상태, backup ID
- 추천 scoring, score breakdown, vendor/history weight
- 업체, 노무, 구매, 입고, 이익과 risk score

고객에게는 표시명, 프로젝트 유형, 공개 가능 상담 요약, 현장조사 일정, 견적/계약 진행 상태와 회사 연락 안내만 허용합니다.

## 외부 API 비호출

이번 RC에는 외부 endpoint, API key, Authorization header, SMS, 이메일, 카카오, push, 주소 API 또는 캘린더 API 호출이 없습니다. 후속 외부 연동은 별도 버전에서 개인정보 전송 범위와 동의를 먼저 정의한 뒤 진행합니다.
