# ECOREAN BOC Release Notes

## Version: RC-0.2.0

### Release Status

ECOREAN BOC RC-0.2.0 is a release-candidate stabilization build. The goal of this release is coherence, safe navigation, consistent exports, and a single smoke path for first user testing.

### Completed Modules

- Bathroom Estimate Wizard
- Kitchen Estimate Wizard
- Full Remodeling Estimate Wizard
- AI Estimate Intelligence
- PCE / Profit Automation Loop
- Contract / Schedule / Purchase Order generation
- Site Execution Management
- Payment / Cashflow
- Project Profit Closing
- CEO Control Tower
- Communication Center
- Floorplan / Isometric Center
- AI Visualization / ComfyUI Integration
- Portfolio / Proposal Board Generation
- Premium Board Export Polish

### How To Test

Run from `electron/`:

```powershell
npm run build:ui
npm run smoke:prod
npm run smoke:release
```

The release smoke test verifies the first operating path:

1. Create bathroom estimate
2. Create kitchen estimate
3. Create full remodeling estimate
4. Export estimate
5. Generate contract
6. Generate schedule
7. Generate purchase order
8. Create daily site report
9. Create payment schedule
10. Create project closing snapshot
11. Generate visualization prompt
12. Create design board
13. Load CEO Control Tower
14. Handle empty states
15. Handle ComfyUI offline safely

### Export Folders

Development exports are stored under the project `export/` folder.

Packaged app exports are stored under the Electron `userData/export/` folder.

- `export/estimates`
- `export/contracts`
- `export/schedules`
- `export/purchase-orders`
- `export/visualizations`
- `export/boards`
- `export/reports`

### ComfyUI Setup Note

ComfyUI integration is optional. Default connection settings are:

- Host: `127.0.0.1`
- Port: `8188`

If ComfyUI is not running, BOC must show the safe Korean message: `ComfyUI가 실행 중이 아닙니다.` Manual prompt copy and image attachment remain available.

### Known Limitations

- CAD parsing is not implemented.
- Real-time 3D editing is not implemented.
- External image APIs are not connected except the local ComfyUI adapter.
- Accounting and bank transfer execution are not implemented.
- Mobile optimization is partial; desktop operation is the primary target.

### Git Commit Reference

- Commit: `TBD`
