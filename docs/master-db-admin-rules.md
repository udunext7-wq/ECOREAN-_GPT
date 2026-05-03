# Master DB Admin Rules

목적: 실제 단가, 거래처, 브랜드, 공정 데이터가 아직 없어도 ECOREAN BOC가 깨지지 않고 운영되도록 Master DB 관리 기준을 정의한다.

## 관리 대상

| 관리 화면 | 관리 데이터 | 현재 허용 상태 |
|---|---|---|
| Master DB Admin | 전체 DB 상태, 승인 대기, Import/Export | `EMPTY`, `NEEDS_RESEARCH`, `UNKNOWN`, `VERIFIED` |
| Pricing Research Admin | 단가 조사 테이블, 가격 출처, 조사 상태 | `UNKNOWN`, `NEEDS_RESEARCH` |
| Vendor CRM Admin | 거래처 후보, 연락 기록, 검증 상태 | `CANDIDATE`, `VERIFIED`, `REJECTED` |
| Brand DB Admin | 브랜드, 모델, A/S, 선호도, 대체 브랜드 | `NEEDS_RESEARCH`, `VERIFIED` |
| Process DB Admin | 공정 트리, 옵션, 온톨로지, 트리거 조건 | `STRUCTURE_READY`, `VERIFIED` |
| Approval Required Queue | 변경 요청, 승인, 반려, rollback | `PENDING_CEO_APPROVAL` |

## 직접 수정 금지

Master DB의 공정, 단가, 브랜드, 거래처, 인건비, 리스크 값은 직접 수정하지 않는다.

모든 변경은 다음 흐름을 따른다.

`Edit Draft` -> `Change Request` -> `CEO Approval` -> `Apply to Master DB` -> `Rollback Snapshot` -> `Change History`

## Empty Data State

| 상태 | 의미 | 시스템 동작 |
|---|---|---|
| `EMPTY` | 데이터가 아직 없음 | 화면은 표시하되 입력 필요 경고 |
| `UNKNOWN` | 값이 존재하지만 아직 확인 안 됨 | 견적은 예비 견적으로 표시 |
| `NEEDS_RESEARCH` | 조사 필요 | Dashboard에 DB 부족 경고 |
| `PARTIAL` | 일부 값만 있음 | 누락 필드 표시 |
| `VERIFIED` | 검증 완료 | 운영 견적에 사용 가능 |
| `INTERNAL_VALIDATED` | 현장 결과로 검증 | Living Master DB 기준값 후보 |

## 예비 견적 원칙

필수 단가가 `UNKNOWN` 또는 `NEEDS_RESEARCH`이면 견적 생성을 막지 않는다.  
다만 고객용/내부용 출력에는 반드시 `예비 견적`으로 표시한다.

## 승인 차단 기준

- 대표 승인 없는 Master DB 직접 수정
- rollback snapshot 없는 값 변경
- sourceType 없는 단가 반영
- sourceDate 없는 단가 반영
- official/market/supplier/internal 가격 구분 없는 단가 반영
- 고객용/내부용 데이터 혼합 저장

