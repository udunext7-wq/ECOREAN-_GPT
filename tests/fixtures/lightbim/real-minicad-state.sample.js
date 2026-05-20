'use strict';

(function(root){
  const state = {
    projectId: 'MINICAD-REAL-SAMPLE',
    projectName: 'Real MiniCAD LightBIM Sample',
    ceilingHeight: 2400,
    wallThickness: 150,
    vertices: [
      { id: 'v0', x: 0, y: 0 },
      { id: 'v1', x: 5000, y: 0 },
      { id: 'v2', x: 8000, y: 0 },
      { id: 'v3', x: 8000, y: 3000 },
      { id: 'v4', x: 8000, y: 5000 },
      { id: 'v5', x: 6500, y: 5000 },
      { id: 'v6', x: 5000, y: 5000 },
      { id: 'v7', x: 4000, y: 7000 },
      { id: 'v8', x: 0, y: 7000 },
      { id: 'v9', x: 0, y: 4000 },
      { id: 'v10', x: 5000, y: 4000 },
      { id: 'v11', x: 5000, y: 3000 },
      { id: 'v12', x: 6500, y: 3000 }
    ],
    walls: [
      { id: 'w-north-living', v1Id: 'v0', v2Id: 'v1', thickness: 150, height: 2400, wallType: 'exterior', material: 'concrete' },
      { id: 'w-north-kitchen', v1Id: 'v1', v2Id: 'v2', thickness: 150, height: 2400, wallType: 'exterior', material: 'concrete' },
      { id: 'w-east-kitchen', v1Id: 'v2', v2Id: 'v3', thickness: 150, height: 2400, wallType: 'exterior', material: 'concrete' },
      { id: 'w-east-entry', v1Id: 'v3', v2Id: 'v4', thickness: 150, height: 2400, wallType: 'exterior', material: 'concrete' },
      { id: 'w-south-entry', v1Id: 'v4', v2Id: 'v5', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' },
      { id: 'w-south-bath', v1Id: 'v5', v2Id: 'v6', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' },
      { id: 'w-bedroom-east', v1Id: 'v7', v2Id: 'v10', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' },
      { id: 'w-bedroom-south', v1Id: 'v8', v2Id: 'v7', thickness: 150, height: 2400, wallType: 'exterior', material: 'concrete' },
      { id: 'w-west', v1Id: 'v0', v2Id: 'v8', thickness: 150, height: 2400, wallType: 'exterior', material: 'concrete' },
      { id: 'w-living-bedroom', v1Id: 'v9', v2Id: 'v10', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' },
      { id: 'w-living-kitchen', v1Id: 'v1', v2Id: 'v11', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' },
      { id: 'w-kitchen-service', v1Id: 'v3', v2Id: 'v11', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' },
      { id: 'w-bath-entry', v1Id: 'v12', v2Id: 'v5', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' },
      { id: 'w-bath-living', v1Id: 'v11', v2Id: 'v6', thickness: 150, height: 2400, wallType: 'interior', material: 'gypsum' }
    ],
    spaces: [
      { id: 'space-living', name: '거실', type: 'LIVING', vertexIds: ['v0', 'v1', 'v11', 'v10', 'v9'], floorMaterial: 'engineered_wood', wallMaterial: 'wallpaper_silk', ceilingMaterial: 'paint' },
      { id: 'space-kitchen', name: '주방', type: 'KITCHEN', vertexIds: ['v1', 'v2', 'v3', 'v12', 'v11'], floorMaterial: 'tile', wallMaterial: 'tile', ceilingMaterial: 'paint' },
      { id: 'space-bath', name: '욕실', type: 'BATHROOM', vertexIds: ['v11', 'v12', 'v5', 'v6'], floorMaterial: 'porcelain_tile', wallMaterial: 'porcelain_tile', ceilingMaterial: 'bathroom_ceiling', waterproofApplied: true },
      { id: 'space-bedroom', name: '침실', type: 'BEDROOM', vertexIds: ['v9', 'v10', 'v7', 'v8'], floorMaterial: 'engineered_wood', wallMaterial: 'wallpaper_silk', ceilingMaterial: 'paint' },
      { id: 'space-entry', name: '현관', type: 'ENTRANCE', vertexIds: ['v12', 'v3', 'v4', 'v5'], floorMaterial: 'tile', wallMaterial: 'wallpaper_silk', ceilingMaterial: 'paint' }
    ],
    openings: [
      { id: 'door-entry', type: 'door', spaceId: 'space-entry', wallId: 'w-east-entry', width: 900, height: 2100, sillHeight: 0, x: 8000, y: 3900 },
      { id: 'door-bedroom', type: 'door', spaceId: 'space-bedroom', wallId: 'w-living-bedroom', width: 800, height: 2100, sillHeight: 0, x: 2500, y: 4000 },
      { id: 'door-bath', type: 'door', spaceId: 'space-bath', wallId: 'w-bath-living', width: 700, height: 2100, sillHeight: 0, x: 5000, y: 4100 },
      { id: 'window-living', type: 'window', spaceId: 'space-living', wallId: 'w-west', width: 1800, height: 1200, sillHeight: 900, x: 0, y: 1800 },
      { id: 'window-kitchen', type: 'window', spaceId: 'space-kitchen', wallId: 'w-north-kitchen', width: 1200, height: 1000, sillHeight: 1000, x: 6500, y: 0 }
    ],
    fixtures: [
      { id: 'fix-toilet', type: 'toilet', spaceId: 'space-bath', x: 5750, y: 4400, w: 700, h: 450 },
      { id: 'fix-sink', type: 'sink', spaceId: 'space-kitchen', x: 6200, y: 650, w: 800, h: 600 }
    ],
    furniture: [
      { id: 'f-sofa', type: 'sofa', spaceId: 'space-living', x: 1200, y: 2500, w: 2200, h: 900 }
    ],
    lights: [
      { id: 'light-living', type: 'downlight', spaceId: 'space-living', x: 2500, y: 1800 },
      { id: 'light-kitchen', type: 'line_light', spaceId: 'space-kitchen', x: 6400, y: 1500 }
    ],
    electric: [
      { id: 'elec-outlet-1', type: 'outlet', spaceId: 'space-kitchen', x: 7200, y: 450 },
      { id: 'elec-switch-1', type: 'switch', spaceId: 'space-entry', x: 6800, y: 3200 }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = state;
  root.REAL_MINICAD_STATE_SAMPLE = state;
})(typeof window !== 'undefined' ? window : globalThis);
