# ECOREAN BOC Final Integration QA Report

작성일: 2026-04-26

## 1. QA Summary

현재 ECOREAN BOC는 MVP Release 후보로 볼 수 있다.

핵심 운영 흐름은 다음 단계까지 실제 SQLite 기반으로 연결되어 있다.

```text
Dashboard
-> New Estimate Wizard
-> Estimate Draft Save/Edit
-> Estimate Approval
-> Final Estimate
-> Project Execution
-> Site Operation
-> Change Order Approval
-> Project Completion
-> Estimate vs Actual
-> Case Library
-> Learning Suggestion
-> Learning Approval
-> Master DB Update Candidate / Master DB Value
-> Backup / Export
-> 3D Ontology Viewer
```

단, 현재 버전은 실무 데이터 입력 전 MVP 운영 골격이다. 실제 단가, 거래처, 브랜드, 품수 데이터는 여전히 `UNKNOWN`, `NEEDS_RESEARCH`, `EMPTY` 상태를 허용하며, 견적 금액은 실데이터 투입 전까지 예비 견적 성격이다.

## 2. Verified Scope

| Area | Status | Evidence |
|---|---|---|
| Dashboard | PASS | SQLite `getDashboardData()` returns projects, approvals, alerts, notifications |
| New Estimate Wizard | PASS | React build includes wizard and draft service |
| Estimate Draft Save/Edit | PASS | `estimate_drafts`, inputs, processes, confirmations, documents, warnings exist |
| Estimate Approval | PASS | Approval creates `final_estimates` and final documents |
| Final Estimate | PASS | `final_estimates` count exists and execution flow reads it |
| Project Execution | PASS | `execution_projects`, `execution_documents`, `purchase_orders`, `payment_milestones` exist |
| Site Operation | PASS | `site_operations`, daily report, delivery, inspection, issues, risk logs exist |
| Change Order Approval | PASS | Cost, schedule, payment impact tables exist and approval flow works |
| Project Completion | PASS | Completion, actual cost, duration, margin, variance reports exist |
| Case Library | PASS | Completed projects sync into `case_library` |
| Learning Approval | PASS | Learning approval creates Master DB request and rollback snapshot |
| Master DB Admin | PASS with limitation | Admin screen exists; real data remains mostly research-state |
| Backup / Restore / Export | PASS | Backup, preview checksum, JSON export, Excel export verified |
| 3D Ontology Viewer | PASS | CSS 3D graph view renders from dashboard data |
| SQLite Save/Load | PASS | Four DBs open and stats return |
| Notification Log | PASS | `notification_logs` populated |
| Action Log | PASS | `action_logs` populated |
| Approval Log | PASS | `approval_actions`, feature-specific approval logs exist |
| Rollback Structure | PASS with limitation | Rollback snapshots exist for Master DB/Learning/Restore; full restore reversal UI is future work |

## 3. E2E Flow Status

| Step | Status | Notes |
|---|---|---|
| minimum input | PASS | Minimum input schema and wizard flow exist |
| preliminary estimate | PASS | Draft generated with missing price warnings |
| save draft | PASS | Saved to `project.db` |
| edit draft | PASS | Change log table exists |
| approve estimate | PASS | Approval Center flow exists |
| final estimate | PASS | Final estimate generated after approval |
| execution ready | PASS | Execution transition creates documents |
| in progress | PASS | Site operation transition exists |
| daily site report | PASS | Daily report table and UI exist |
| inspection fail | PASS | Failed inspection blocks downstream processes |
| blocking rule | PASS | Blocked processes and risk logs update |
| change order request | PASS | Request creates approval item |
| change order approval | PASS | Approval creates cost/schedule/payment impacts |
| project completion | PASS | Completion stores actual cost/duration/margin |
| actual cost input | PASS | Actual cost UI and DB table exist |
| estimate vs actual | PASS | Variance report and dashboard top list update |
| case library | PASS | Completed projects become cases |
| learning suggestion | PASS | Repeated patterns create suggestions |
| learning approval | PASS | Approval applies Master DB value with rollback snapshot |
| master db update candidate | PASS | Candidates and requests are created |
| backup export | PASS | Backup, JSON export, Excel export verified |

## 4. Data Continuity Check

데이터는 주요 단계마다 별도 테이블로 보존된다.

- 예비 견적: `estimate_drafts`, `estimate_draft_inputs`, `estimate_draft_processes`
- 승인: `approvals`, `approval_actions`, feature-specific approval log tables
- 실행: `execution_projects`, `execution_documents`, `purchase_orders`, `payment_milestones`
- 현장: `site_operations`, `daily_site_reports`, `inspection_results`, `site_risk_logs`
- 완료: `project_completion_reports`, `actual_costs`, `actual_durations`, `final_margin_reports`
- 학습: `case_library`, `defect_patterns`, `profit_patterns`, `learning_suggestions`
- Master DB 반영: `master_db_update_requests`, `master_db_values`, `master_db_rollback_snapshots`
- 백업/복구: `backup_logs`, `restore_logs`, `export_logs`

## 5. Approval / Rollback Check

승인 없는 변경 차단은 다음 영역에 적용되어 있다.

- Final Estimate 전환
- Execution Ready 전환
- Change Order 반영
- Learning Suggestion의 Master DB 반영
- Restore 실행
- Master DB Update Request 반영

Rollback snapshot은 다음 영역에 존재한다.

- `master_db_rollback_snapshots`
- `learning_update_snapshots`
- Restore 전 자동 백업
- Change Order rollback data
- Final Estimate rollback data

## 6. Known Issues

### Release Blocker

현재 치명적 blocker는 발견되지 않았다.

### Should Fix Before Wider Use

1. 일부 기존 UI 문자열에 인코딩 깨짐이 남아 있다.
   - 기능 동작에는 영향이 없지만 대표/운영자 화면 신뢰도를 낮춘다.

2. 3D Ontology Viewer는 현재 CSS 3D 기반 MVP다.
   - 실제 Three.js 또는 `react-force-graph-3d` 기반 물리 그래프는 다음 단계에서 교체하는 것이 좋다.

3. Restore 실제 실행은 구현되어 있으나, QA에서는 무승인 차단과 preview/checksum까지만 검증했다.
   - 실제 restore overwrite 테스트는 별도 사본 환경에서 수행해야 한다.

4. Excel Export는 보고용 Spreadsheet XML `.xls`다.
   - 복잡한 Excel 서식, 다중 시트 안정성, 대용량 데이터는 추후 강화가 필요하다.

5. 실제 단가/거래처/브랜드 데이터가 없다.
   - 현 버전은 운영 구조 MVP이며, 실견적 정확도는 Living Master DB 채움 이후 올라간다.

## 7. MVP Release Judgement

현재 버전은 `MVP Release Candidate`로 볼 수 있다.

조건:

- 실제 고객 제출용 금액 확정 시스템으로 쓰기 전에는 `예비 견적` 표시 유지
- Restore 실제 실행은 대표 승인과 별도 백업 확인 후 제한적으로 사용
- 인코딩 깨짐 정리 후 운영자 배포 권장

## 8. Commands Verified

```text
npm run build
npm run build:ui
npm run smoke:prod
npm run dist
```

결과:

```text
BOC dashboard loaded
win-unpacked EXE launched with title: ECOREAN BOC CEO Dashboard
```
