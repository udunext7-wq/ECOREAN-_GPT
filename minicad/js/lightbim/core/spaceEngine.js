'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};
  function byId(vertices){ return (vertices || []).reduce((map, v) => { if(v && v.id) map[v.id] = v; return map; }, {}); }
  function pointsForSpace(space, vertices){
    space = space || {};
    const map = byId(vertices || []);
    if(Array.isArray(space.vertexIds) && space.vertexIds.length){ return space.vertexIds.map(id => map[id]).filter(Boolean); }
    if(Array.isArray(space.polygon)){ return space.polygon.map(p => ({ x:Number(p.x) || 0, y:Number(p.y) || 0 })); }
    return [];
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
    return { area_m2: area, perimeter_m: perimeter, ceiling_area_m2: area, floor_area_m2: area };
  }
  function getSpacePoints(space, vertices){ return pointsForSpace(space, vertices); }
  LB.spaceEngine = { getSpacePoints, calculateSpaceArea, calculateSpacePerimeter, calculateCeilingArea, calculateFloorArea, calculateSpaceQuantities, pointsForSpace };
  LB.core.spaceEngine = LB.spaceEngine;
})(window);
