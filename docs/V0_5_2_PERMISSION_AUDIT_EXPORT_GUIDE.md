# v0.5.2 Permission Audit Export Guide

## Purpose

Permission Audit Export creates redacted operational audit extracts without writing generated files automatically. The permission center displays the generated content in memory so the operator can review the exact payload before any external handling.

## Formats

- `JSON`: structured records and applied filters.
- `CSV`: quoted tabular records with UTF-8 content.
- `HTML`: Korean print-safe table with print CSS.

XLSX and external upload are outside v0.5.2 scope.

## Filters

- Date range
- Event type
- Actor role
- Target role
- Status
- Risk level
- Decision (`ALLOWED` / `DENIED`)

The service supports permission decisions, role change lifecycle events, internal-cost and margin access, customer/internal output generation, and audit export generation.

## Redaction

The export pipeline applies the existing permission audit redaction and a second export-specific pass. It blocks values or keys representing:

- Raw phone numbers and email addresses
- Full or detailed addresses
- Customer memo source text
- Tokens, credentials, secrets, and provider payloads
- Coordinates, latitude, and longitude
- Absolute file paths and runtime DB paths
- Private staff contact data

The export includes stable operational IDs, role IDs, permission keys, decisions, risk level, timestamps, and safe reasons where available.

## Audit Trail

Every generated export records `AUDIT_EXPORT_GENERATED` with format, record count, safe filters, and redaction status. Export content itself is not written into the audit database.

## Customer Safety

Customer-facing and `CLIENT_VIEWER` payloads do not include role-change requests, permission diffs, permission audit events, approver data, approval status, or workflow risk level. Existing internal cost, margin, PCE, vendor price, queue, and credential filtering remains active.

## External Services

External auth/provider, cloud upload, OAuth, and public sharing remain `DISABLED`.
