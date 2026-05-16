'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};
  const SCHEMA_VERSION = '0.1';

  function id(prefix){
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function createProject(input){
    input = input || {};
    return {
      schema: 'ECOREAN.LightBIM.Project',
      schema_version: SCHEMA_VERSION,
      project_id: input.project_id || id('project'),
      name: input.name || 'MiniCAD Project',
      unit: input.unit || 'mm',
      vertices: input.vertices || [],
      walls: input.walls || [],
      spaces: input.spaces || [],
      openings: input.openings || [],
      fixtures: input.fixtures || [],
      furniture: input.furniture || [],
      lights: input.lights || [],
      electric: input.electric || [],
      quantities: input.quantities || {},
      metadata: input.metadata || {}
    };
  }

  function createVertex(input){
    input = input || {};
    return { id: input.id || id('v'), x: Number(input.x) || 0, y: Number(input.y) || 0 };
  }

  function createWall(input){
    input = input || {};
    return {
      id: input.id || id('wall'),
      v1Id: input.v1Id || null,
      v2Id: input.v2Id || null,
      thickness: Number(input.thickness) || 200,
      height: Number(input.height) || 2400,
      wallType: input.wallType || 'generic',
      material: input.material || null,
      spaceId: input.spaceId || null,
      openings: input.openings || []
    };
  }

  function createSpace(input){
    input = input || {};
    return {
      id: input.id || id('space'),
      name: input.name || 'Space',
      type: input.type || 'OTHER',
      vertexIds: input.vertexIds || [],
      area_m2: Number(input.area_m2) || 0,
      perimeter_m: Number(input.perimeter_m) || 0,
      wall_area_m2: Number(input.wall_area_m2) || 0,
      ceiling_area_m2: Number(input.ceiling_area_m2) || 0,
      floor_finish: input.floor_finish || null,
      wall_finish: input.wall_finish || null,
      ceiling_finish: input.ceiling_finish || null
    };
  }

  function createOpening(input){
    input = input || {};
    return {
      id: input.id || id('opening'),
      type: input.type || 'opening',
      spaceId: input.spaceId || null,
      wallId: input.wallId || null,
      width: Number(input.width) || 0,
      height: Number(input.height) || 0,
      sillHeight: Number(input.sillHeight) || 0,
      x: Number(input.x) || 0,
      y: Number(input.y) || 0
    };
  }

  function createEmptyProject(input){
    return createProject(input || {});
  }

  function normalizeWall(rawWall){
    return createWall(rawWall || {});
  }

  function normalizeSpace(rawSpace){
    return createSpace(rawSpace || {});
  }

  function normalizeOpening(rawOpening){
    return createOpening(rawOpening || {});
  }

  LB.schema = {
    SCHEMA_VERSION,
    createProject,
    createEmptyProject,
    createVertex,
    createWall,
    createSpace,
    createOpening,
    normalizeWall,
    normalizeSpace,
    normalizeOpening
  };
  LB.core.schema = LB.schema;
})(window);
