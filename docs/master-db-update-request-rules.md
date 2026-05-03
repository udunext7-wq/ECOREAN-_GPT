# Master DB Update Request Rules

## Purpose

Master DB must not update automatically from one project result.

Every proposed change becomes a request.

## Request Flow

```text
Completion Report
-> Estimate vs Actual Report
-> Correction Candidate
-> Master DB Update Request
-> Representative Approval
-> Approval Log
-> Master DB Applied Change
```

## Approval Required

Approval is required for changes to:

- unit price
- labor productivity
- minimum labor charge
- margin
- default spec
- lead time
- defect rate
- trigger rule
- preset default

## Rollback

Every approved change must include rollbackData.

