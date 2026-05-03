# Test Runner Rules

## Purpose

Test Runner validates whether ECOREAN rules produce clear PASS, FAIL, WARN, BLOCKED, APPROVAL_REQUIRED, or NEEDS_CONFIRMATION results.

## Required Test Shape

Every test case must include:

- testId
- ruleName
- inputCondition
- expectedResult
- actualResult
- passFail
- warningMessage
- blockingReason
- approvalRequired
- rollbackRequired
- relatedProcess
- relatedDocument
- notes

## Pass / Fail Rule

```text
expectedResult == actualResult -> PASS
expectedResult != actualResult -> FAIL
```

## Blocking Rule

`BLOCKED` means the system must stop the requested action.

Examples:

- Start tile process before waterproof inspection pass
- Apply Master DB update without approval
- Claim middle payment before inspection condition
- Generate full process from partial repair
- Mix internal margin into customer estimate

## Warning Rule

`WARN` means the system can continue, but must display a risk.

Example:

- delivery date later than process start date

## Approval Rule

`APPROVAL_REQUIRED` means the action cannot be finalized until representative approval or required customer approval is recorded.

## Rollback Rule

Any DB change must include rollbackData. Without rollbackData, the change is blocked.

