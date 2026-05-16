'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};
  function n(value){ return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function vertexMap(vertices){ return (vertices || []).reduce((map, v) => { if(v && v.id) map[v.id] = v; return map; }, {}); }
  function wallPointIds(wall){
    wall = wall || {};
    return [wall.v1Id || wall.v1 || wall.aId || (wall.vertexIds || [])[0], wall.v2Id || wall.v2 || wall.bId || (wall.vertexIds || [])[1]];
  }
  function wallEndpoints(wall, vertices){
    const ids = wallPointIds(wall);
    const map = vertexMap(vertices);
    const a = map[ids[0]] || (Number.isFinite(Number(wall.x1)) ? { x:wall.x1, y:wall.y1 } : null);
    const b = map[ids[1]] || (Number.isFinite(Number(wall.x2)) ? { x:wall.x2, y:wall.y2 } : null);
    return { a, b };
  }
  function calculateWallLength(wall, vertices){
    const endpoints = wallEndpoints(wall || {}, vertices || []);
    if(!endpoints.a || !endpoints.b) return 0;
    return LB.geometryCore.distance(endpoints.a, endpoints.b) / 1000;
  }
  function calculateWallArea(wall, vertices){
    const heightM = (n((wall || {}).height || (wall || {}).height_mm || 2400)) / 1000;
    return calculateWallLength(wall, vertices) * heightM;
  }
  function calculateNetWallArea(wall, vertices, openings){
    const gross = calculateWallArea(wall, vertices);
    const wallId = (wall || {}).id;
    const openingArea = (openings || []).filter(o => !wallId || o.wallId === wallId || o.wall_id === wallId).reduce((sum, opening) => sum + LB.openingEngine.calculateOpeningArea(opening), 0);
    return { length_m: calculateWallLength(wall, vertices), gross_wall_area_m2: gross, opening_area_m2: openingArea, net_wall_area_m2: Math.max(0, gross - openingArea) };
  }
  function getWallsBySpace(spaceId, walls){ return (walls || []).filter(wall => wall.spaceId === spaceId || wall.space_id === spaceId); }
  LB.wallEngine = { calculateWallLength, calculateWallArea, calculateNetWallArea, getWallsBySpace };
  LB.core.wallEngine = LB.wallEngine;
})(window);
