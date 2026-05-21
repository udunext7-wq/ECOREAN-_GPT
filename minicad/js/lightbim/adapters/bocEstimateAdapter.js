'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.adapters = LB.adapters || {};

  function normalizeType(space){
    return LB.quantityEngine && LB.quantityEngine.normalizeSpaceType
      ? LB.quantityEngine.normalizeSpaceType(space)
      : String((space || {}).type || 'ETC').toUpperCase();
  }
  function hasType(spaces, type){ return (spaces || []).some(space => normalizeType(space) === type); }
  function detectEstimateType(project){
    const spaces = project.spaces || [];
    const hasBathroom = hasType(spaces, 'BATHROOM');
    const hasKitchen = hasType(spaces, 'KITCHEN');
    const meaningfulCount = spaces.length;
    if(hasBathroom && !hasKitchen && meaningfulCount <= 2) return 'BATHROOM';
    if(hasKitchen && !hasBathroom && meaningfulCount <= 2) return 'KITCHEN';
    return 'FULL_REMODELING';
  }
  function processFlags(project, quantities){
    const pq = quantities.process_quantities || {};
    const spaces = project.spaces || [];
    return {
      flooring: (pq.flooring_area_m2 || 0) > 0,
      wallpaper: (pq.wallpaper_area_m2 || 0) > 0,
      painting: (pq.painting_area_m2 || 0) > 0,
      ceiling: (pq.ceiling_area_m2 || 0) > 0,
      bathroom: hasType(spaces, 'BATHROOM'),
      kitchen: hasType(spaces, 'KITCHEN'),
      windows: (quantities.window_count || 0) > 0,
      doors: (quantities.door_count || 0) > 0,
      tile: (pq.tile_area_m2 || 0) > 0,
      baseboard: (pq.baseboard_length_m || 0) > 0,
      molding: (pq.molding_length_m || 0) > 0
    };
  }
  function createBOCEstimateInput(lightBimProject, quantitySummary){
    const project = lightBimProject || {};
    const quantities = quantitySummary || project.quantities || LB.quantityEngine.calculateProjectQuantities(project);
    const pq = quantities.process_quantities || {};
    const spaces = (project.spaces || []).map((space, index) => {
      const sq = (quantities.space_quantities || [])[index] || {};
      return {
        id:space.id,
        name:space.name,
        type:normalizeType(space),
        area_m2:sq.floor_area_m2 || space.area_m2 || 0,
        perimeter_m:sq.perimeter_m || space.perimeter_m || 0,
        net_wall_area_m2:sq.net_wall_area_m2 || 0
      };
    });
    const estimateType = detectEstimateType(project);
    const selectedProcesses = processFlags(project, quantities);
    return {
      estimate_type: estimateType,
      area_m2: quantities.total_floor_area_m2 || 0,
      spaces,
      selected_processes: selectedProcesses,
      process_options: {
        bathroom_count: spaces.filter(space => space.type === 'BATHROOM').length,
        kitchen_count: spaces.filter(space => space.type === 'KITCHEN').length,
        has_openings: (project.openings || []).length > 0,
        source_schema: project.schema_version || '0.1'
      },
      quantity_basis: {
        total_area_m2: quantities.total_floor_area_m2 || 0,
        floor_area_m2: quantities.total_floor_area_m2 || 0,
        ceiling_area_m2: quantities.total_ceiling_area_m2 || 0,
        net_wall_area_m2: quantities.total_net_wall_area_m2 || 0,
        wallpaper_area_m2: pq.wallpaper_area_m2 || 0,
        painting_area_m2: pq.painting_area_m2 || 0,
        tile_area_m2: pq.tile_area_m2 || 0,
        bathroom_tile_area_m2: pq.bathroom_tile_area_m2 || 0,
        kitchen_wall_tile_area_m2: pq.kitchen_wall_tile_area_m2 || 0,
        baseboard_length_m: pq.baseboard_length_m || 0,
        molding_length_m: pq.molding_length_m || 0,
        door_count: quantities.door_count || 0,
        window_count: quantities.window_count || 0,
        opening_area_m2: quantities.opening_area_m2 || pq.opening_area_m2 || 0,
        space_summaries: spaces,
        warnings: quantities.warnings || []
      },
      source: 'LIGHTBIM'
    };
  }
  LB.adapters.bocEstimateAdapter = { createBOCEstimateInput, detectEstimateType };
})(window);
