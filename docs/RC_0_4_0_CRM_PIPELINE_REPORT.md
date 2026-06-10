# RC-0.4.0 CRM Pipeline Foundation Report

## 기준 정보

- 작업 날짜: 2026-06-10
- 브랜치: `rc-0.4.0-crm-pipeline-foundation`
- 기준 태그: `v0.3.9-rc-packaged`
- 기준 커밋: `c1dfb16`

## 구현 화면 / 서비스

- 화면: `ui/app/crm/CrmPipelineCenterView.tsx`
- 서비스: `electron/services/crmPipelineService.js`
- UI bridge: `ui/services/crm-service/crmPipelineService.ts`
- IPC / preload / Electron type 연결: 완료
- 진입점: First Entry Panel, CEO Dashboard, Drawer, 실제 프로젝트 접수

## CRM 단계 흐름

`LEAD → CONTACTED → CONSULTING → SITE_SURVEY_SCHEDULED → SITE_SURVEY_DONE → ESTIMATE_REQUESTED → ESTIMATE_SENT → NEGOTIATION → CONTRACT_PENDING → CONTRACTED`

`ON_HOLD`와 `LOST`는 사유를 기록하는 별도 종료/보류 단계로 지원합니다.

## 기능 결과

- CRM lead 생성: PASSED
- CRM lead 목록 / 상세 조회: PASSED
- 단계 이동과 stage history: PASSED
- 상담 기록과 다음 액션: PASSED
- 현장조사 요청과 단계 연결: PASSED
- 견적 연결과 `ESTIMATE_SENT` 전환: PASSED
- 프로젝트 연결: PASSED
- CRM dashboard KPI summary: PASSED
- CRM report 생성: PASSED

## 주소 / 포털 / 캘린더 준비 구조

- 주소 정규화 상태와 provider 참조: PASSED
- 고객 포털 연결 / 초대 준비 상태: PASSED
- public token SHA-256 hash 저장: PASSED
- 일정 연결 / 캘린더 provider / event 참조 / sync 상태: PASSED
- 외부 API 호출: DISABLED
- 외부 API key: 미추가

## 개인정보 / 고객 안전성

- 전화번호 마스킹 저장: PASSED
- 이메일 마스킹 저장: PASSED
- 상세주소 내부 전용 격리: PASSED
- 내부 메모 고객 payload 비노출: PASSED
- 고객 공개 가능 상담 요약만 노출: PASSED
- 내부 단가, 마진, PCE, Queue, scoring 비노출: PASSED
- CRM report 원문 개인정보 비저장: PASSED

## 발견 이슈

- S1: 없음
- S2: 없음
- S3: 없음
- S4: Vite bundle size 및 SQLite experimental warning

## 최종 판정

`MERGE_READY`

CRM Pipeline Foundation은 고객 운영 상태와 기존 프로젝트/견적 연결만 담당하며, 가격 엔진과 고객 안전 경계를 변경하지 않습니다.
