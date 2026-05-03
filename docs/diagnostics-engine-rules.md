# Diagnostics Engine Rules

## Purpose

Diagnostics Engine converts project conditions into warnings, blocking errors, and approval requirements.

## Result Types

- PASS
- FAIL
- WARN
- BLOCKED
- APPROVAL_REQUIRED
- NEEDS_CONFIRMATION

## Blocking Diagnostics

The following must block:

- 방수 자동 확정 when trigger conditions are not met
- Master DB update without approval
- Middle payment claim before required milestone
- Successor process before predecessor
- Missing minimum labor charge
- Full process generated from partial repair
- Internal values exposed in customer document
- DB change without rollbackData

## Warning Diagnostics

The following may warn without blocking:

- lead time risk
- schedule compression risk
- source confidence LOW
- missing supplier quote
- incomplete brand/model selection before final order

## Approval Diagnostics

The following must create approval requests:

- high-risk process exclusion
- Master DB update
- margin/default spec change
- customer-facing price change after contract
- payment condition change
- rollback-sensitive DB change

## Output Shape

```json
{
  "diagnosticId": "NEEDS_RESEARCH",
  "resultType": "BLOCKED",
  "severity": "HIGH",
  "relatedProcess": "방수",
  "relatedDocument": "공정표",
  "message": "방수 검수 실패 상태에서는 타일공정을 시작할 수 없다.",
  "approvalRequired": false,
  "rollbackRequired": false
}
```

