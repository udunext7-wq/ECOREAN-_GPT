# Report Output Format

## Purpose

All reports must be generated from structured project data and be exportable to JSON, Excel, PDF, and HTML.

## Report Types

- 고객용 견적 보고서
- 내부 원가 보고서
- 공정표 보고서
- 발주 보고서
- 공사일보 보고서
- 검수 보고서
- 현금흐름 보고서
- 완료 보고서
- 오차 분석 보고서
- Master DB 업데이트 보고서

## Audience Types

Each report must define one or more audiences:

- 고객용
- 내부용
- 대표 검토용
- 현장관리자용
- 회계/재무용
- AI 학습용

## Report Structure

```json
{
  "reportId": "NEEDS_RESEARCH",
  "reportType": "customerEstimate",
  "audience": ["고객용"],
  "sourceProjectId": "NEEDS_RESEARCH",
  "sections": [],
  "visibilityRules": [],
  "exportTargets": ["JSON", "Excel", "PDF", "HTML"]
}
```

## Separation Rule

Customer reports must not expose internal supplier price, margin, internal defect score, or approval notes.

