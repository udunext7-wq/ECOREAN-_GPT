'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.adapters = LB.adapters || {};
  function unique(values){ return Array.from(new Set(values.filter(Boolean))); }
  function createAIPromptHints(lightBimProject){
    const project = lightBimProject || {};
    const spaces = project.spaces || [];
    const openings = project.openings || [];
    const furniture = project.furniture || [];
    const hasWindows = openings.some(opening => String(opening.type || '').toLowerCase().indexOf('window') >= 0);
    return {
      space_summaries: spaces.map(space => ({
        id: space.id,
        name: space.name,
        type: space.type,
        area_m2: space.area_m2 || 0,
        floor_finish: space.floor_finish || null,
        wall_finish: space.wall_finish || null,
        ceiling_finish: space.ceiling_finish || null
      })),
      geometry_consistency_notes: [
        'Preserve the room count and relative room layout from the floorplan.',
        'Preserve openings and wall positions where provided.',
        'Use the LightBIM quantity summary as spatial scale guidance.'
      ],
      room_list: spaces.map(space => space.name || space.type || 'Space'),
      material_hints: {
        floor: unique(spaces.map(space => space.floor_finish)),
        wall: unique(spaces.map(space => space.wall_finish)),
        ceiling: unique(spaces.map(space => space.ceiling_finish))
      },
      camera_hints: [
        'Use realistic interior camera height.',
        'Use wide angle only when needed to show the complete space.',
        'Keep perspective consistent with the floorplan geometry.'
      ],
      negative_constraints: [
        furniture.length ? 'Do not add furniture outside the provided furniture list.' : 'Do not invent furniture.',
        hasWindows ? 'Do not change the number or placement of windows.' : 'Do not invent windows.',
        'Do not invent materials that are not selected in the estimate or moodboard.',
        'Do not change room count, opening count, or major geometry.'
      ]
    };
  }
  LB.adapters.aiPromptAdapter = { createAIPromptHints };
})(window);
