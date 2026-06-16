# RC-0.4.3 Customer Portal Internal Draft Guide

## 목적

RC-0.4.3은 실제 고객에게 공개되는 포털이 아니라, 고객에게 보여도 되는 정보만 별도 payload로 구성하는 내부 초안 단계다. 내부 시스템 데이터에서 금지 필드를 삭제하는 방식이 아니라, 고객 공개용 DTO를 allowlist로 새로 만든다.

## 외부 공개와 내부 승인의 차이

- `INTERNAL_APPROVED`: 내부 담당자가 고객 공개용 내용 구성을 승인했다는 의미다.
- `PUBLIC`, `LIVE`, `PUBLISHED`: 이번 RC에서는 만들지 않는다.
- 실제 고객 URL, 로그인, 메시지 발송, 외부 호스팅은 모두 비활성이다.

## Portal Status

- `DRAFT`: 초안 작성 중
- `REVIEW_REQUIRED`: 내부 검토 필요
- `INTERNAL_APPROVED`: 내부 승인 완료
- `REJECTED`: 내부 반려
- `ARCHIVED`: 보관
- `PUBLISH_BLOCKED`: 고객 안전성 또는 필수 정보 문제로 공개 차단

## Review Status

- `NOT_REVIEWED`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `REVISION_REQUIRED`

## Allowlist Payload 원칙

고객 포털 payload는 `buildCustomerSafePortalPayload()`에서 새 객체로 구성한다. 내부 프로젝트, CRM, 견적, 계약 객체를 그대로 복사한 뒤 필드를 제거하는 방식은 금지한다.

## 고객 공개 허용 필드

- 고객 표시명
- 프로젝트 표시명
- 공사 유형
- 승인된 주소 요약
- 고객 표시용 상태
- 고객 표시용 진행률
- 고객 공개 공정
- 승인된 고객 견적 총액
- 고객 계약 총액
- 고객 공개 지급 일정
- 고객 승인 문서 reference
- 공개 사업자 연락처

## 고객 공개 금지 필드

- 원가, 마진, 수익, PCE
- 내부 견적, 단가 queue, 추천 점수, price calibration
- 내부 action, 내부 알림, 영업 확률, 내부 메모
- 상세주소 내부 필드, hash, canonical key, provider payload, 좌표
- 업체, 인건비, 발주/입고 비용, 백업/DB/storage 경로
- raw phone/email, token 원문, 민감 개인정보

## 문서 승인 정책

고객 포털에 포함되는 문서는 다음 조건을 모두 만족해야 한다.

- `customer_approved = true`
- `document_status = FINAL` 또는 `APPROVED`
- 허용 문서 유형
- 내부 전용 표기가 없음
- 파일 시스템 절대경로가 직접 노출되지 않음

## Preview Session 정책

- 내부 Electron 화면에서만 사용한다.
- 외부 공개 URL을 만들지 않는다.
- 외부 서버 업로드를 하지 않는다.
- 실제 고객 접근을 허용하지 않는다.
- preview session은 만료 및 폐기가 가능하다.

## Token Hash 정책

- token 원문은 DB에 저장하지 않는다.
- SHA-256 hash만 저장한다.
- UI와 로그에는 token 전체를 표시하지 않는다.
- customer-facing payload에는 token 관련 값을 포함하지 않는다.

## Publish Block 규칙

다음 조건은 `PUBLISH_BLOCKED` 또는 customer safety 실패 사유다.

- 내부 원가/마진/PCE 필드 감지
- 내부 상세주소/hash/provider/좌표 감지
- raw phone/email 감지
- 승인되지 않은 문서 포함
- token 원문 포함
- 파일 시스템 절대경로 포함
- 내부 action/notification 포함
- 포털 제목 또는 고객 표시명 누락

## Customer Safety 원칙

고객 화면은 내부 draft center, queue, scoring, PCE, 원가, 마진, 상세주소, token, provider 데이터를 노출하지 않는다. 내부 초안 화면도 금지 필드의 실제 값은 다시 보여주지 않고 분류와 개수만 표시한다.

## 외부 공개 비활성 원칙

- external delivery: `DISABLED`
- authentication: `INTERNAL_PREVIEW_ONLY`
- public portal: `NOT_AVAILABLE`
- SMS / Email / Kakao / Push / Calendar / Address API / OAuth: DISABLED
