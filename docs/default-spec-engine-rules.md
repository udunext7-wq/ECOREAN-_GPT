# Default Spec Engine Rules

## Purpose

Default Spec Engine applies standard specs based on `finishGrade`, `budgetLevel`, project type, and preset.

It reduces manual selection while keeping all assumptions visible.

## Inputs

- finishGrade
- budgetLevel
- projectType
- buildingType
- clientPriority
- knownDefects
- selectedPreset

## Output

```json
{
  "defaultSpecProfile": "standard",
  "appliedSpecs": [
    {
      "processId": "NEEDS_RESEARCH",
      "specSource": "preset.defaultSpec",
      "customerVisible": true,
      "internalReasonLog": ["finishGrade=standard", "budgetLevel=mid"]
    }
  ]
}
```

## Grade Examples

| finishGrade | Meaning |
|---|---|
| economy | cost-efficient standard |
| standard | common Korean residential standard |
| premium | higher brand/spec selection |
| luxury | high-end brand/custom specification |

| budgetLevel | Meaning |
|---|---|
| low | minimize cost |
| mid | balanced |
| high | quality and design priority |
| premium | brand and custom priority |

## Rule

Default Spec Engine must not invent prices. It only selects default spec candidates. Price must come from Master DB, Brand DB, Supplier DB, or Internal DB.

