'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};
  function byId(vertices){ return (vertices || []).reduce((map, v) => { if(v && v.id) map[v.id] = v; return map; }, {}); }
  function warning(code, severity, message, entityId){
    return { code, severity, message, entity_type:'space', entity_id:entityId || null };
  }
  function pointsForSpace(space, vertices){
    space = space || {};
    const map = byId(vertices || []);
    if(Array.isArray(space.vertexIds) && space.vertexIds.length){ return space.vertexIds.map(id => map[id]).filter(Boolean); }
    if(Array.isArray(space.polygon)){ return space.polygon.map(p => ({ x:Number(p.x) || 0, y:Number(p.y) || 0 })); }
    return [];
  }
  function polygonWarnings(space, vertices){
    space = space || {};
    const warnings = [];
    const map = byId(vertices || []);
    if(Array.isArray(space.vertexIds)){
      const seen = {};
      space.vertexIds.forEach(id => {
        if(!map[id]) warnings.push(warning('MISSING_VERTEX', 'CRITICAL', 'Space references a missing vertex.', space.id));
        if(seen[id]) warnings.push(warning('DUPLICATE_VERTEX', 'WARNING', 'Space polygon has duplicate vertex ids.', space.id));
        seen[id] = true;
      });
    }
    const points = pointsForSpace(space, vertices);
    if(points.length < 3) warnings.push(warning('INVALID_POLYGON', 'CRITICAL', 'Space polygon needs at least three valid vertices.', space.id));
    return warnings;
  }
  function calculateSpaceArea(space, vertices){
    const outer = pointsForSpace(space, vertices);
    let area = LB.geometryCore.polygonArea(outer);
    const holes = Array.isArray((space || {}).holes) ? space.holes : [];
    holes.forEach(hole => { area -= LB.geometryCore.polygonArea(hole || []); });
    return Math.max(0, area) / 1000000;
  }
  function calculateSpacePerimeter(space, vertices){ return LB.geometryCore.polygonPerimeter(pointsForSpace(space, vertices)) / 1000; }
  function calculateCeilingArea(space, vertices){ return calculateSpaceArea(space, vertices); }
  function calculateFloorArea(space, vertices){ return calculateSpaceArea(space, vertices); }
  function calculateSpaceQuantities(space, vertices){
    const area = calculateSpaceArea(space, vertices);
    const perimeter = calculateSpacePerimeter(space, vertices);
    const points = pointsForSpace(space, vertices);
    const warnings = polygonWarnings(space, vertices);
    if(area <= 0 && points.length >= 3) warnings.push(warning('ZERO_AREA_SPACE', 'WARNING', 'Space polygon produced zero area.', (space || {}).id));
    return {
      area_m2: LB.geometryCore.roundQuantity(area),
      perimeter_m: LB.geometryCore.roundQuantity(perimeter),
      ceiling_area_m2: LB.geometryCore.roundQuantity(area),
      floor_area_m2: LB.geometryCore.roundQuantity(area),
      room_bounds: LB.geometryCore.getBounds(points),
      space_type: (space || {}).type || 'OTHER',
      room_name: (space || {}).name || 'Space',
      warnings
    };
  }
  function getSpacePoints(space, vertices){ return pointsForSpace(space, vertices); }
  LB.spaceEngine = { getSpacePoints, calculateSpaceArea, calculateSpacePerimeter, calculateCeilingArea, calculateFloorArea, calculateSpaceQuantities, pointsForSpace, polygonWarnings };
  LB.core.spaceEngine = LB.spaceEngine;
})(window);
