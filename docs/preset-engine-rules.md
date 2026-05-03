# Preset Engine Rules

## Purpose

Preset Engine applies a default project package from minimal input.

A preset is not a final estimate. It is a starting assumption set that Rule Engine must validate.

## Preset Types

- apartment-full-remodeling
- bathroom-remodeling
- kitchen-remodeling
- partial-repair
- commercial-interior
- office-interior

## Preset Output

A preset may suggest:

- candidateProcesses
- candidateMaterials
- defaultSpecProfile
- requiredInspections
- defaultDocuments
- paymentMilestones
- scheduleTemplate
- diagnosticRules

## Important Rule

Preset Engine may suggest processes, but must not force high-risk processes into final estimate without Rule Engine confirmation.

Examples:

```text
bathroom-remodeling preset suggests waterproof review.
Rule Engine decides if waterproof is included, excluded, or NEEDS_CONFIRMATION.
```

## Preset Process Status

| Status | Meaning |
|---|---|
| SUGGESTED | Preset recommends process |
| REQUIRED_BY_RULE | Rule Engine confirmed |
| EXCLUDED_BY_RULE | Rule Engine excluded |
| NEEDS_CONFIRMATION | Input insufficient |
| USER_SELECTED | User explicitly selected |
| USER_DECLINED_APPROVAL_REQUIRED | User declined high-risk item |

## Preset Governance

Changes to preset process lists, default specs, payment milestones, and margin assumptions require approval.

