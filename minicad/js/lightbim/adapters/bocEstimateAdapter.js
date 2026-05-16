'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.adapters = LB.adapters || {};
  function hasType(spaces, needle){
    return (spaces || []).some(space => ((space.type || '') + ' ' + (space.name || '')).toUpperCase().indexOf(needle) >= 0);
  }
  function detectEstimateType(project){
    const spaces = project.spaces || [];
    const hasBathroom = hasType(spaces, 'BATH') || hasType(spaces, 'WC');
    const hasKitchen = hasType(spaces, 'KITCHEN');
    const meaningfulCount = spaces.length;
    if(hasBathroom && !hasKitchen && meaningfulCount <= 2) return 'BATHROOM';
    if(hasKitchen && !hasBathroom && meaningfulCount <= 2) return 'KITCHEN';
    return 'FULL_REMODELING';
  }
  function createBOCEstimateInput(lightBimProject, quantitySummary){
    const project = lightBimProject || {};
    const quantities = quantitySummary || project.quantities || LB.quantityEngine.calculateProjectQuantities(project);
    const spaces = (project.spaces || []).map(space => ({ id:space.id, name:space.name, type:space.type, area_m2:space.area_m2 || 0, perimeter_m:space.perimeter_m || 0 }));
    const estimateType = detectEstimateType(project);
    const selectedProcesses = ['flooring', 'wallpaper', 'painting', 'ceiling', 'baseboard'];
    if(hasType(project.spaces, 'BATH') || hasType(project.spaces, 'WC')) selectedProcesses.push('bathroom');
    if(hasType(project.spaces, 'KITCHEN')) selectedProcesses.push('kitchen');
    return {
      estimate_type: estimateType,
      area_m2: quantities.total_floor_area_m2 || 0,
      spaces,
      selected_processes: selectedProcesses,
      process_options: {
        bathroom_count: spaces.filter(space => ((space.type || '') + ' ' + (space.name || '')).toUpperCase().indexOf('BATH') >= 0).length,
        kitchen_count: spaces.filter(space => ((space.type || '') + ' ' + (space.name || '')).toUpperCase().indexOf('KITCHEN') >= 0).length,
        has_openings: (project.openings || []).length > 0,
        source_schema: project.schema_version || '0.1'
      },
      quantity_basis: Object.assign({}, quantities.process_quantities || {}, {
        total_floor_area_m2: quantities.total_floor_area_m2 || 0,
        total_net_wall_area_m2: quantities.total_net_wall_area_m2 || 0,
        door_count: quantities.door_count || 0,
        window_count: quantities.window_count || 0
      }),
      source: 'LIGHTBIM'
    };
  }
  LB.adapters.bocEstimateAdapter = { createBOCEstimateInput, detectEstimateType };
})(window);
