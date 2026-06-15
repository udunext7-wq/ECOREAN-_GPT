# RC-0.4.2 Address Normalization Stabilization Report

## 기준

- 작업일: 2026-06-15
- Branch: `rc-0.4.2-address-normalization-readiness`
- Implementation commit: `3d372e7`
- Base tag: `v0.4.1-rc-packaged`
- 구현 서비스: `addressNormalizationService`, `addressProviderAdapter`
- 구현 화면: `AddressNormalizationCenterView`

## 주소 유형 및 Confidence

- `ROAD`: PASSED
- `JIBUN`: PASSED
- `MIXED`: PASSED
- `UNKNOWN`: PASSED
- `HIGH`: PASSED
- `MEDIUM`: PASSED
- `LOW`: PASSED
- `INVALID`: PASSED

앞뒤 공백, 연속 공백, 불필요 구분 문자, 지번 하이픈을 포함한 주소 문자열을 fixture로 재현했습니다.

## 원본 주소 보호

- 정규화 요청 후 `address_summary` 유지: PASSED
- 정규화 결과 별도 컬럼 저장: PASSED
- 승인 전 CRM Lead/현장조사/프로젝트 원본 변경 없음: PASSED
- 승인 후 source 자동 반영 없음: PASSED
- 반려/보류 후 원본 유지: PASSED
- 재정규화 이전 결과와 history 보존: PASSED
- 내부 상세주소 고객 payload 비노출: PASSED

## 승인 및 변경 이력

- 승인/반려/보류 상태 전환: PASSED
- 승인자와 승인 시간: PASSED
- 사유, 변경자, 변경 시간: PASSED
- old/new summary와 old/new status: PASSED
- `CREATED`, `NORMALIZED`, `APPROVED`, `REJECTED`, `DEFERRED`, `LINKED`, `UPDATED`: PASSED

## 중복 주소 경고

- canonical key 동일: PASSED
- fingerprint hash 동일: PASSED
- 행정구역/도로명 또는 지번/건물번호 조합: PASSED
- 동일 Lead: PASSED
- 동일 현장조사: PASSED
- 동일 프로젝트: PASSED
- 자동 주소 병합/삭제: 없음
- 자동 Lead/프로젝트 통합: 없음

중복은 후보 목록과 경고로만 제공하며 낮은 confidence만으로 중복을 확정하지 않습니다.

## 연결 결과

- Lead 연결과 history: PASSED
- 현장조사 연결과 history: PASSED
- 프로젝트 연결과 history: PASSED
- 연결 시 기존 업무 주소 또는 일정 자동 변경: 없음
- INVALID/LOW 상태는 내부 경고와 검토 상태로 유지

## Provider Adapter

- 필수 6개 interface: PASSED
- provider status: `DISABLED`
- `external_call_performed`: `false`
- HTTP/HTTPS/fetch/axios 호출: 없음
- provider URL/API key/Authorization: 없음
- 실제 geocoding/좌표 반환: 없음
- provider raw payload 저장: 없음

## Customer Safety

- 내부 상세주소와 정규화 상세주소 비노출: PASSED
- canonical key/fingerprint/중복 후보 비노출: PASSED
- provider 구성/응답/오류/좌표 비노출: PASSED
- 내부 검증 사유와 검토 메모 비노출: PASSED
- 연락처, 내부 알림/액션, 원가/마진/PCE/Queue/scoring/risk score 비노출: PASSED

## 내부 진입점

- First Entry Panel: PASSED
- CEO Dashboard: PASSED
- Drawer: PASSED
- CRM Pipeline Center: PASSED
- 현장조사 상세: PASSED
- 실제 프로젝트 접수: PASSED
- 고객용 화면 내부 센터 진입점: 없음

Windows 자동 시각 검증은 이전 실행 승인 환경에서 사용할 수 없었습니다. 실제 시각 검증을 수행했다고 기록하지 않으며 TypeScript/Vite build와 Electron production smoke로 렌더 경로를 검증했습니다.

## 경계값

- 빈 문자열/공백 문자열: 안전하게 `INVALID`
- 숫자만 있는 문자열: 안전하게 `UNKNOWN`/`LOW`
- 건물명만 있는 문자열: 안전하게 `UNKNOWN`/`LOW`
- 도로명만 있는 주소: 안전하게 검토 대상
- 지번 주소와 도로명/지번 혼합 주소: PASSED
- 긴 내부 상세주소: 처리 가능, 고객 payload 비노출
- 한글/영문/숫자 혼합: 안전 처리
- 공백과 하이픈 차이: canonical 정규화
- `null`, `undefined`, 잘못된 payload: 앱 중단 없이 안전 처리

## 발견 및 수정 이슈

- S1/S2: 없음
- 수정: 공백으로 둘러싼 구분용 하이픈이 도로명과 건물번호를 붙이던 문제를 수정했습니다. 지번 부번의 하이픈은 유지합니다.
- 수정: `null`/비객체 payload를 빈 payload로 안전하게 처리합니다.
- 수정: 동일 현장조사 ID의 반복 주소도 중복 후보로 경고합니다.

## Deferred

- 실제 주소 provider 선정과 API 계약
- 실제 주소 존재 여부 검증
- geocoding 및 좌표 보안 정책
- CRM 주소와 현장조사 주소 불일치 전용 비교 UI 고도화
- 실제 사용자 시각/접근성 검증

## Known Warnings

- SQLite experimental API
- Vite bundle size
- electron-builder metadata 및 Node DEP 경고가 표시될 수 있음

## 검증 결과

- RC-0.4.2 stabilization smoke: PASSED
- RC-0.4.2 implementation smoke: PASSED
- 지정 Node 회귀: PASSED
- 전체 서비스 syntax: PASSED
- TypeScript/Vite production UI build: PASSED
- Electron production smoke: PASSED
- Release smoke: PASSED

## Merge Readiness

미해결 S1/S2가 없고 주소 유형, confidence, 원본 보호, 이력, 중복 경고, 연결, Provider 비호출, Customer safety가 통과했습니다.

`MERGE_READY`
