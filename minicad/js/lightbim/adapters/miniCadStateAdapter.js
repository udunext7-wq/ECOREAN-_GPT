'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.adapters = LB.adapters || {};

  function clone(value){ return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function n(value){ return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function ensureVertex(vertices, point, prefix){
    const v = { id: prefix + '_' + vertices.length, x: n(point.x), y: n(point.y) };
    vertices.push(v);
    return v.id;
  }
  function normalizeVertices(state){
    return (state.vertices || []).map((v, index) => ({ id: v.id || 'v_' + index, x: n(v.x), y: n(v.y) }));
  }
  function normalizeSpace(space, vertices, state, index){
    let vertexIds = Array.isArray(space.vertexIds) ? space.vertexIds.slice() : [];
    if(!vertexIds.length && Array.isArray(space.polygon)){
      vertexIds = space.polygon.map((point, pointIndex) => ensureVertex(vertices, point, 'space_' + index + '_' + pointIndex));
    }
    const normalized = LB.schema.createSpace({
      id: space.id || 'space_' + index,
      name: space.name || space.label || 'Space ' + (index + 1),
      type: space.type || space.spaceType || 'OTHER',
      vertexIds,
      floor_finish: space.floor_finish || space.floorMaterial || null,
      wall_finish: space.wall_finish || space.wallMaterial || null,
      ceiling_finish: space.ceiling_finish || space.ceilingMaterial || null
    });
    const q = LB.spaceEngine.calculateSpaceQuantities(normalized, vertices);
    normalized.area_m2 = q.area_m2;
    normalized.perimeter_m = q.perimeter_m;
    normalized.ceiling_area_m2 = q.ceiling_area_m2;
    normalized.wall_area_m2 = q.perimeter_m * ((n(space.ceilingHeight_mm || state.ceilingHeight || 2400)) / 1000);
    return normalized;
  }
  function normalizeWall(wall, vertices, state, index){
    let v1Id = wall.v1Id || wall.v1 || wall.aId || (wall.vertexIds || [])[0] || null;
    let v2Id = wall.v2Id || wall.v2 || wall.bId || (wall.vertexIds || [])[1] || null;
    if((!v1Id || !v2Id) && Number.isFinite(Number(wall.x1)) && Number.isFinite(Number(wall.x2))){
      v1Id = ensureVertex(vertices, { x:wall.x1, y:wall.y1 }, 'wall_' + index + '_a');
      v2Id = ensureVertex(vertices, { x:wall.x2, y:wall.y2 }, 'wall_' + index + '_b');
    }
    return LB.schema.createWall({
      id: wall.id || 'wall_' + index,
      v1Id,
      v2Id,
      thickness: wall.thickness || wall.thickness_mm || state.wallThickness || 200,
      height: wall.height || wall.height_mm || state.ceilingHeight || 2400,
      wallType: wall.wallType || wall.type || 'generic',
      material: wall.material || null,
      spaceId: wall.spaceId || wall.space_id || null,
      openings: wall.openings || []
    });
  }
  function normalizeOpening(opening, index){
    return LB.schema.createOpening({
      id: opening.id || 'opening_' + index,
      type: opening.type || 'opening',
      spaceId: opening.spaceId || opening.space_id || null,
      wallId: opening.wallId || opening.wall_id || null,
      width: opening.width || opening.width_mm || opening.w || opening.w_mm || 0,
      height: opening.height || opening.height_mm || opening.h || opening.h_mm || 0,
      sillHeight: opening.sillHeight || opening.sillHeight_mm || opening.sill || 0,
      x: opening.x || 0,
      y: opening.y || 0
    });
  }
  function normalizeMiniCadState(state){
    state = state || {};
    const vertices = normalizeVertices(state);
    const spaces = (state.spaces || []).map((space, index) => normalizeSpace(space || {}, vertices, state, index));
    const walls = (state.walls || []).map((wall, index) => normalizeWall(wall || {}, vertices, state, index));
    const openings = (state.openings || []).map((opening, index) => normalizeOpening(opening || {}, index));
    const project = LB.schema.createProject({
      project_id: state.projectId || state.project_id || 'minicad_' + Date.now().toString(36),
      name: state.projectName || state.name || 'MiniCAD Project',
      unit: 'mm',
      vertices,
      walls,
      spaces,
      openings,
      fixtures: clone(state.fixtures || []),
      furniture: clone(state.furniture || []),
      lights: clone(state.lights || []),
      electric: clone(state.electric || []),
      metadata: {
        source: 'MiniCAD',
        source_version: 'v5.9',
        ceiling_height_mm: state.ceilingHeight || 2400,
        wall_thickness_mm: state.wallThickness || 100,
        created_at: new Date().toISOString()
      }
    });
    project.quantities = LB.quantityEngine.calculateProjectQuantities(project);
    return project;
  }
  LB.adapters.miniCadStateAdapter = { normalizeMiniCadState };
})(window);
