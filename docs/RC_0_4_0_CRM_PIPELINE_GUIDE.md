# RC-0.4.0 CRM Pipeline Foundation Guide

## 목적

고객 CRM 파이프라인 센터는 신규 문의부터 상담, 현장조사, 견적 발송, 협의, 계약 전환까지의 고객 운영 상태를 한곳에서 관리합니다.

CRM은 고객 관계와 영업 진행 상태만 관리합니다. 단가, 원가, 마진, PCE, Price Queue, 추천 점수 계산은 기존 전문 화면과 서비스에 남겨 둡니다.

## 고객 단계 정의

| 단계 | 운영 의미 |
| --- | --- |
| `LEAD` | 신규 문의 등록 |
| `CONTACTED` | 최초 연락 완료 |
| `CONSULTING` | 요구사항과 공사 범위 상담 중 |
| `SITE_SURVEY_SCHEDULED` | 현장조사 일정 요청 또는 확정 |
| `SITE_SURVEY_DONE` | 현장조사 완료 |
| `ESTIMATE_REQUESTED` | 견적 작성 요청 |
| `ESTIMATE_SENT` | 고객용 견적 발송 또는 견적 연결 완료 |
| `NEGOTIATION` | 금액, 범위, 일정 협의 |
| `CONTRACT_PENDING` | 계약 확정 대기 |
| `CONTRACTED` | 계약 완료 |
| `ON_HOLD` | 일정 또는 고객 사유로 보류 |
| `LOST` | 계약 전환 실패 |

모든 단계 변경은 `crm_stage_history`에 이전 단계, 다음 단계, 사유와 변경자를 기록합니다.

## 상담 기록 기준

- 내부 상담 요약과 고객 공개 가능 요약을 분리합니다.
- 고객 payload에는 명시적으로 입력한 공개 가능 요약만 포함합니다.
- 다음 액션과 기한을 함께 기록해 후속 조치를 놓치지 않도록 합니다.
- 원문 전화번호, 이메일, 상세주소와 내부 메모는 상담 리포트에 넣지 않습니다.

## 현장조사 요청 기준

- 요청일, 희망 시간, 주소 요약, 담당자와 내부 확인사항을 기록합니다.
- 현장조사 요청 생성 시 CRM 단계는 `SITE_SURVEY_SCHEDULED`로 이동합니다.
- 상세주소 대신 운영에 필요한 주소 요약만 고객용 일정 payload에서 사용합니다.

## 견적 / 프로젝트 / 계약 연결

- 견적 연결 시 `linked_estimate_id`를 저장하고 단계를 `ESTIMATE_SENT`로 이동합니다.
- 기존 프로젝트 연결 시 `linked_project_id`만 저장합니다.
- 계약 연결 준비 필드 `linked_contract_id`를 제공합니다.
- CRM은 연결 ID와 진행 상태만 관리하며 견적 내부 원가, 마진, PCE 결과를 복제하지 않습니다.

## 주소 / 포털 / 캘린더 연동 준비

이번 RC에서는 외부 API를 호출하지 않습니다.

공통 상태:

- `NOT_READY`
- `READY_TO_CONNECT`
- `CONNECTED`
- `FAILED`
- `DISABLED`

주소 준비 필드는 정규화 상태, provider 이름과 provider payload 참조값만 보관합니다. 고객 포털 public token이 입력되면 SHA-256 hash만 저장합니다. 캘린더는 provider와 외부 event 참조값 및 동기화 상태만 저장합니다.

API key, public token 원문, 외부 API 응답 원문은 저장하지 않습니다.

## 고객용 출력 비노출 원칙

고객 payload는 허용 목록 방식으로 새 객체를 생성합니다.

허용:

- 고객 표시명
- 프로젝트 유형과 공개 가능한 범위
- CRM 진행 단계
- 공개 가능 상담 요약
- 현장조사 일정과 상태
- 견적 발송 상태
- 계약 진행 상태
- 회사 연락 가능 상태
- 고객 문서 링크 준비 상태

금지:

- 원문 전화번호, 이메일, 상세주소, 내부 메모
- 내부 우선순위와 위험 정보
- 내부 원가, 마진, PCE
- Price Queue, 승인 상태, backup ID
- recommendation scoring, score breakdown, vendor/history weight
- 업체, 노무, 구매, 입고, 이익과 risk score

## 개인정보 저장 원칙

- 전화번호는 `010-****-1234` 형식으로 마스킹 저장합니다.
- 이메일은 앞 두 글자만 남긴 마스킹 형식으로 저장합니다.
- 상세주소는 `address_detail_internal`에 내부 전용으로 격리합니다.
- 고객 포털 token은 원문 대신 SHA-256 hash만 저장합니다.
- CRM 리포트에는 익명화된 고객 표시명과 연결 여부만 기록합니다.
- 테스트 데이터는 `TEST` 유형과 명백한 테스트 값만 사용합니다.
