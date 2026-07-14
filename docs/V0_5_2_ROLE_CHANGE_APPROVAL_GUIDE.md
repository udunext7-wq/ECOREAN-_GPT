# v0.5.2 Role Change Approval Guide

## Purpose

v0.5.2 replaces renderer-accessible direct role switching with a local internal approval workflow. A request, approval, and explicit apply action are required before the active role changes.

External authentication and public identity providers remain disabled. Test runs must use local anonymized actor IDs only.

## Workflow

1. Open `사용자 역할 및 권한 센터`.
2. In `역할 변경 요청`, select the requested role and enter a business reason.
3. Save as `DRAFT` or submit as `PENDING`.
4. Review added and removed permissions, high-risk permissions, and risk level in `역할 변경 승인 Queue`.
5. An authorized actor with `system.settings.edit` approves or rejects the request.
6. Apply an `APPROVED` request explicitly.
7. Confirm the request becomes `APPLIED` and the active role changes.

Approval alone does not change the role. Rejected, cancelled, expired, applied, and failed requests cannot be applied or approved again.

## Statuses

- `DRAFT`: saved but not submitted.
- `PENDING`: waiting for approval.
- `APPROVED`: approved but not yet applied.
- `REJECTED`: rejected and terminal.
- `CANCELLED`: cancelled by requester or authorized administrator.
- `EXPIRED`: expired and terminal.
- `APPLIED`: approved role change completed.
- `FAILED`: apply failed; the previous role is preserved.

## Approval Policy

- The approver must be a known role with `system.settings.edit`.
- The requester cannot approve the same request.
- Unknown or missing roles are denied.
- The claimed current role must match the active DB role.
- A processed request cannot be approved twice.
- A `CLIENT_VIEWER` to internal role transition runs the customer-safety transition check before apply.

## Risk Classification

`HIGH` applies when the requested role is `CEO` or `ADMIN`, when a dangerous permission is added, or when a customer-viewer role moves to internal scope.

Dangerous permissions:

- `estimate.internal_cost.view`
- `estimate.margin.view`
- `vendor.price.view`
- `internal_output.generate`
- `audit.view`
- `system.settings.edit`

Requests adding ordinary permissions are `MEDIUM`; requests that only remove permissions are `LOW`.

## Failure And Rollback

The service validates the current role again immediately before apply. If validation, customer safety, role update, or request-state persistence fails, the service restores the prior active role and records `ROLE_CHANGE_FAILED`.

## Audit Events

The workflow records request, approval, rejection, cancellation, expiration, apply, and failure events. Sensitive customer data, credentials, provider payloads, coordinates, runtime paths, and staff private contacts are redacted.
