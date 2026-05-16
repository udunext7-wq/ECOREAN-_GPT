'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};
  function n(value){ return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function widthOf(opening){ return n(opening.width || opening.width_mm || opening.w || opening.w_mm); }
  function heightOf(opening){ return n(opening.height || opening.height_mm || opening.h || opening.h_mm); }
  function calculateOpeningArea(opening){ return (widthOf(opening || {}) * heightOf(opening || {})) / 1000000; }
  function groupOpeningsByWall(openings){
    return (openings || []).reduce((map, opening) => {
      const key = opening.wallId || opening.wall_id || 'unassigned';
      map[key] = map[key] || [];
      map[key].push(opening);
      return map;
    }, {});
  }
  function groupOpeningsBySpace(openings){
    return (openings || []).reduce((map, opening) => {
      const key = opening.spaceId || opening.space_id || 'unassigned';
      map[key] = map[key] || [];
      map[key].push(opening);
      return map;
    }, {});
  }
  function countDoors(openings){
    return (openings || []).filter(opening => String(opening.type || '').toLowerCase().indexOf('door') >= 0).length;
  }
  function countWindows(openings){
    return (openings || []).filter(opening => String(opening.type || '').toLowerCase().indexOf('window') >= 0).length;
  }
  LB.openingEngine = { calculateOpeningArea, groupOpeningsByWall, groupOpeningsBySpace, countDoors, countWindows };
  LB.core.openingEngine = LB.openingEngine;
})(window);
