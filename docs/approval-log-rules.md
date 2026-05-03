# Approval Log Rules

## Purpose

Approval Log records all important decisions that affect price, margin, schedule, risk, or Master DB.

## Action Types

- CREATE
- UPDATE
- DELETE
- APPROVE
- REJECT
- APPLY
- ROLLBACK

## Required Rule

No Master DB change is considered valid without an Approval Log record.

## Rollback

If rollbackAvailable is true, rollbackData must be enough to restore the prior value.

