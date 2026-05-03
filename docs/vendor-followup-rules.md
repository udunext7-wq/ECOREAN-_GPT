# Vendor Follow-Up Rules

## Follow-Up Purpose

Follow-up prevents supplier conversations from disappearing into KakaoTalk history.

Every quote request must have:

- owner
- next follow-up date
- next action
- approval needed flag
- evidence attachment

## Contact Method Priority

1. Phone call: confirm person and availability.
2. KakaoTalk: send item list and project summary.
3. Written quote: request itemized numbers.
4. Meeting: negotiate payment condition and defect responsibility.
5. Approval request: submit final vendor data for CEO review.

## Follow-Up Status

Use one of:

- `CONTACT_PLANNED`
- `CONTACTED`
- `QUOTE_REQUESTED`
- `QUOTE_RECEIVED`
- `MISSING_INFORMATION`
- `FOLLOWUP_REQUIRED`
- `READY_FOR_COMPARISON`
- `READY_FOR_APPROVAL`
- `APPROVED`
- `REJECTED`

## Follow-Up Timing

- Quote request: follow up within 1 business day.
- Urgent order: follow up same day.
- Missing price or payment condition: follow up within 24 hours.
- A/S or defect issue: follow up immediately.
- Master DB candidate: submit for CEO approval after comparison.

## Approval Triggers

Create approval request when:

- new vendor should be registered
- supplier price should update Master DB
- payment condition changes
- vendor becomes preferred supplier
- vendor becomes blacklist candidate
- high-value order is placed

## Evidence Rule

Accepted evidence:

- written quote
- KakaoTalk screenshot
- price list
- tax invoice
- delivery note
- defect photo
- A/S confirmation message

No evidence, no Master DB update.
