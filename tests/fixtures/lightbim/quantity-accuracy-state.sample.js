'use strict';

(function(root){
  const state = {
    projectId: 'MINICAD-QUANTITY-ACCURACY',
    projectName: 'LightBIM Quantity Accuracy Sample',
    ceilingHeight: 2400,
    wallThickness: 150,
    vertices: [
      { id: 'lv0', x: 0, y: 0 },
      { id: 'lv1', x: 4000, y: 0 },
      { id: 'lv2', x: 4000, y: 5000 },
      { id: 'lv3', x: 0, y: 5000 },
      { id: 'kv0', x: 4000, y: 0 },
      { id: 'kv1', x: 7000, y: 0 },
      { id: 'kv2', x: 7000, y: 2500 },
      { id: 'kv3', x: 4000, y: 2500 },
      { id: 'bv0', x: 4000, y: 2500 },
      { id: 'bv1', x: 6000, y: 2500 },
      { id: 'bv2', x: 6000, y: 4700 },
      { id: 'bv3', x: 4000, y: 4700 },
      { id: 'rv0', x: 0, y: 5000 },
      { id: 'rv1', x: 3500, y: 5000 },
      { id: 'rv2', x: 3500, y: 8500 },
      { id: 'rv3', x: 0, y: 8500 },
      { id: 'ev0', x: 6000, y: 2500 },
      { id: 'ev1', x: 7500, y: 2500 },
      { id: 'ev2', x: 7500, y: 4500 },
      { id: 'ev3', x: 6000, y: 4500 }
    ],
    spaces: [
      { id: 'space-living', name: '거실', type: 'living_room', vertexIds: ['lv0', 'lv1', 'lv2', 'lv3'], floorMaterial: 'engineered_wood', wallMaterial: 'wallpaper', ceilingMaterial: 'paint' },
      { id: 'space-kitchen', name: '주방', type: 'kitchen', vertexIds: ['kv0', 'kv1', 'kv2', 'kv3'], floorMaterial: 'engineered_wood', wallMaterial: 'wallpaper', ceilingMaterial: 'paint' },
      { id: 'space-bath', name: '욕실', type: 'bathroom', vertexIds: ['bv0', 'bv1', 'bv2', 'bv3'], floorMaterial: 'tile', wallMaterial: 'tile', ceilingMaterial: 'bathroom_ceiling' },
      { id: 'space-bedroom', name: '침실', type: 'bedroom', vertexIds: ['rv0', 'rv1', 'rv2', 'rv3'], floorMaterial: 'engineered_wood', wallMaterial: 'wallpaper', ceilingMaterial: 'paint' },
      { id: 'space-entry', name: '현관', type: 'entrance', vertexIds: ['ev0', 'ev1', 'ev2', 'ev3'], floorMaterial: 'tile', wallMaterial: 'paint', ceilingMaterial: 'paint' }
    ],
    walls: [
      { id: 'wall-living-window', v1Id: 'lv0', v2Id: 'lv1', height: 2400, thickness: 150, spaceId: 'space-living' },
      { id: 'wall-living-east', v1Id: 'lv1', v2Id: 'lv2', height: 2400, thickness: 150, spaceId: 'space-living' },
      { id: 'wall-kitchen-north', v1Id: 'kv0', v2Id: 'kv1', height: 2400, thickness: 150, spaceId: 'space-kitchen' },
      { id: 'wall-bath-door', v1Id: 'bv3', v2Id: 'bv2', height: 2400, thickness: 150, spaceId: 'space-bath' },
      { id: 'wall-bedroom-door', v1Id: 'rv0', v2Id: 'rv1', height: 2400, thickness: 150, spaceId: 'space-bedroom' }
    ],
    openings: [
      { id: 'opening-window-living', type: 'WINDOW', spaceId: 'space-living', wallId: 'wall-living-window', width: 1200, height: 1200, sillHeight: 900 },
      { id: 'opening-door-bath', type: 'door', spaceId: 'space-bath', wallId: 'wall-bath-door', width: 900, height: 2100, sillHeight: 0 },
      { id: 'opening-door-bedroom-default', type: 'DOOR', spaceId: 'space-bedroom', wallId: 'wall-bedroom-door', sillHeight: 0 }
    ],
    fixtures: [],
    furniture: [],
    lights: [],
    electric: []
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = state;
  root.QUANTITY_ACCURACY_STATE_SAMPLE = state;
})(typeof window !== 'undefined' ? window : globalThis);
