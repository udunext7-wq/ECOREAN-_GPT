'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.adapters = LB.adapters || {};
  function createDXFExportPayload(lightBimProject){
    const project = lightBimProject || {};
    return {
      source: 'LIGHTBIM',
      note: 'DXF export remains handled by the MiniCAD legacy export layer.',
      wall_count: (project.walls || []).length,
      space_count: (project.spaces || []).length,
      opening_count: (project.openings || []).length
    };
  }
  LB.adapters.dxfAdapter = { createDXFExportPayload };
})(window);
