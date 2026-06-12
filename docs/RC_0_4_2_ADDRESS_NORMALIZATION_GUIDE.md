# RC-0.4.2 주소 정규화 가이드

## 목적

주소 정규화 센터는 CRM Lead, 현장조사, 프로젝트에서 사용하는 주소를 동일한 내부 구조로 정리하고 누락, 저신뢰, 중복 가능성을 검토하기 위한 내부 데이터 품질 도구입니다.

이번 RC는 실제 주소의 존재를 외부 기관에 확인하지 않습니다. 주소 API, geocoding, 좌표 조회, API key는 모두 비활성입니다.

## 주소 유형

- `ROAD`: 도로명과 건물번호 구조
- `JIBUN`: 읍/면/동/리와 지번 구조
- `MIXED`: 도로명과 지번 구조가 함께 포함된 주소
- `UNKNOWN`: 내부 규칙만으로 유형을 판단하기 어려운 주소

## 정규화 상태

- `PENDING`: 정규화 또는 검토 대기
- `NORMALIZED`: 내부 구조 정규화 완료
- `REVIEW_REQUIRED`: 저신뢰 또는 누락 항목 검토 필요
- `INVALID`: 주소로 처리하기 어려운 입력
- `DEFERRED`: 추가 확인을 위해 보류
- `REJECTED`: 정규화 결과 반려

## Confidence 기준

- `HIGH`: 행정구역, 도로명 또는 읍/면/동, 건물번호 또는 지번이 명확함
- `MEDIUM`: 식별 가능한 구조지만 번호 등 일부 핵심 구성요소가 누락됨
- `LOW`: 문자열은 있으나 주소 유형이나 행정구역이 불명확함
- `INVALID`: 주소로 판단하기에 너무 짧거나 필수 구조가 없음

Confidence는 내부 구조 품질을 뜻하며 실제 주소의 존재 여부를 보증하지 않습니다.

## 원본과 정규화 결과

`address_summary`, `address_detail_internal`은 원본 내부 데이터로 보존합니다. 정규화 결과는 `normalized_address_summary`, `normalized_address_detail_internal`에 별도로 저장합니다.

승인, 반려, 보류 또는 재정규화는 원본 CRM/현장조사/프로젝트 주소를 자동 덮어쓰지 않습니다. 연결 작업도 대상 ID만 기록하며 원본 업무 데이터를 자동 변경하지 않습니다.

## 승인과 변경 이력

주소 생성, 수정, 정규화, 승인, 반려, 보류, Lead/현장조사/프로젝트 연결은 `address_normalization_history`에 기록합니다.

승인은 정규화 레코드의 상태만 확정합니다. 기존 업무 주소에 반영하는 별도 승인 작업은 이번 RC 범위에 포함하지 않습니다.

## 중복 후보

다음 조건을 경고 후보로 사용합니다.

- canonical key 또는 SHA-256 fingerprint 동일
- 행정구역, 도로명/지번, 건물번호 조합 동일
- 동일 Lead 또는 동일 프로젝트에 반복 등록

중복 탐지는 경고만 제공합니다. 주소, Lead, 프로젝트를 자동 병합하거나 삭제하지 않습니다.

## Provider Adapter

`addressProviderAdapter`는 향후 provider 연결을 위한 interface만 제공합니다.

- provider 상태: `DISABLED`
- 외부 호출 수행 여부: `false`
- HTTP/HTTPS/fetch/axios 호출: 없음
- API key 및 Authorization: 없음
- provider 원본 응답 저장: 없음

## 사용 순서

1. 주소 정규화 센터에서 원본 주소와 source type을 등록합니다.
2. address type, 구성요소, confidence, 구조 검증 경고를 확인합니다.
3. 재정규화 후 결과를 승인, 반려 또는 보류합니다.
4. 필요한 경우 Lead, 현장조사, 프로젝트 ID와 연결합니다.
5. 중복 후보와 변경 이력을 확인합니다.
6. 저신뢰 또는 잘못된 주소는 내부 검토 대상으로 유지합니다.

## Customer-safe Payload

고객용 payload는 주소 요약과 승인된 경우의 우편번호 등 최소 정보만 허용합니다.

다음 정보는 포함하지 않습니다.

- 내부 상세주소와 정규화 상세주소
- canonical key, fingerprint, 중복 후보
- provider 응답, 오류 상세, 좌표
- 내부 검증 사유와 검토 메모
- 원문 전화번호, 이메일, 내부 알림/액션
- 내부 원가, 마진, PCE, Price Queue, scoring, risk score

주소 정규화 센터 진입점은 내부 화면에만 존재합니다.
