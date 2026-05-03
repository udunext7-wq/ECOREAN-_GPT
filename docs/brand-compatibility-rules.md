# Brand Compatibility Rules

## Purpose

Brand compatibility rules prevent wrong combinations between products, spaces, processes, accessories, installers, warranty, and schedule.

## Compatibility Dimensions

- Process compatibility
- Space compatibility
- Material and accessory compatibility
- Installer capability
- Warranty/A/S conditions
- Lead time and schedule compatibility
- Customer grade compatibility

## Required Structure

```json
{
  "compatibility": {
    "compatibleProcesses": ["NEEDS_RESEARCH"],
    "compatibleSpaces": ["NEEDS_RESEARCH"],
    "requiredAccessories": ["NEEDS_RESEARCH"],
    "incompatibleMaterials": ["NEEDS_RESEARCH"],
    "requiredInstallerSkill": "NEEDS_RESEARCH",
    "warrantyConditions": ["NEEDS_RESEARCH"],
    "leadTimeConstraints": "NEEDS_RESEARCH"
  },
  "alternativeBrands": [
    {
      "brandId": "NEEDS_RESEARCH",
      "replacementLevel": "sameGrade | upgrade | downgrade | emergencySubstitute",
      "priceImpact": "NEEDS_RESEARCH",
      "laborImpact": "NEEDS_RESEARCH",
      "approvalRequired": true
    }
  ]
}
```

## Risk Flags

Create Risk nodes when:

- Required accessory is missing
- Product lead time conflicts with schedule
- Installer skill level is insufficient
- Warranty condition is not met
- Alternative brand changes customer-facing grade
- Product has high defect rate in Case Library

