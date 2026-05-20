# LightBIM to BOC Import

## Purpose

This workflow connects MiniCAD drawing data to BOC estimate creation.

MiniCAD drawing -> `exportLightBIMJSON()` -> LightBIM JSON file -> BOC LightBIM Import -> estimate draft -> estimate calculation -> PCE -> customer/internal output.

## Export From MiniCAD

1. Open `minicad/ecorean_minicad_v5_9.html`.
2. Draw spaces, walls, doors, and windows.
3. Click `LightBIM JSON 내보내기`.
4. MiniCAD downloads a file named `lightbim_export_{timestamp}.json`.

The existing MiniCAD JSON export remains unchanged. Use the LightBIM export when the next step is BOC estimating.

## Import Into BOC

1. Open BOC.
2. Click `LightBIM 도면 가져오기`.
3. Select the exported LightBIM JSON file.
4. Review the preview:
   - 프로젝트명
   - 공간 수
   - 총 면적
   - 공간 목록
   - 욕실 수
   - 주방 여부
   - 바닥/벽/천장/둘레
   - 문/창 개수
   - 추천 견적 유형
5. Click the recommended draft button, or choose a specific estimate draft:
   - 욕실 견적 초안 생성
   - 주방 견적 초안 생성
   - 전체 리모델링 견적 초안 생성
6. Open the estimate Wizard. The Wizard shows `LightBIM 도면 데이터가 적용되었습니다.`
7. Run automatic calculation. BOC calculates price and PCE. LightBIM only supplies geometry and quantity basis.

## Supported JSON Schema

BOC expects:

```json
{
  "schema": "ECOREAN.LightBIM.v0.1",
  "project": {},
  "quantities": {},
  "bocEstimateInput": {},
  "aiPromptHints": {}
}
```

Required data:

- `project.spaces` or `bocEstimateInput.spaces`
- `quantities.total_floor_area_m2`
- `quantities.process_quantities`
- `bocEstimateInput.estimate_type` when available

## Supported Estimate Types

- `BATHROOM`: bathroom-only drawing
- `KITCHEN`: kitchen-only drawing
- `FULL_REMODELING`: multi-space interior remodeling drawing

If `bocEstimateInput.estimate_type` is missing, BOC infers the type from space names/types.

## Output Readiness

After import and draft creation, BOC verifies:

- Estimate calculation runs
- PCE decision exists
- Customer estimate output is available
- Internal cost output is available
- Existing PDF/Excel export paths can be used after saving the estimate

## Known Limitations

- CAD parsing from external DWG/DXF is not included.
- Real 3D BIM is not included.
- Manual drawing quality affects quantity accuracy.
- Pricing is calculated by BOC, not LightBIM.
- LightBIM quantities are a basis for estimating, not a replacement for estimator review.

## Troubleshooting

- `LightBIM JSON 형식이 올바르지 않습니다.`: the file is not the supported LightBIM schema.
- `공간 정보가 없습니다.`: no spaces were exported from MiniCAD.
- `견적 유형을 판단할 수 없습니다.`: space names/types do not identify bathroom, kitchen, or full remodeling.
- `견적 초안 생성에 실패했습니다.`: BOC could not map the LightBIM quantities into an estimate draft.
- `기존 수동 입력 방식은 계속 사용할 수 있습니다.`: manual estimate entry remains available even if import fails.
