'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};
  function round2(value){ return Math.round((Number(value) || 0) * 100) / 100; }
  function isBathOrKitchen(space){
    const text = ((space.type || '') + ' ' + (space.name || '')).toUpperCase();
    return text.indexOf('BATH') >= 0 || text.indexOf('KITCHEN') >= 0 || text.indexOf('WC') >= 0;
  }
  function calculateProjectQuantities(project){
    project = project || {};
    const vertices = project.vertices || [];
    const openings = project.openings || [];
    const spaceQuantities = (project.spaces || []).map(space => {
      const q = LB.spaceEngine.calculateSpaceQuantities(space, vertices);
      return Object.assign({ space_id: space.id, space_name: space.name, space_type: space.type }, {
        area_m2: round2(q.area_m2),
        perimeter_m: round2(q.perimeter_m),
        ceiling_area_m2: round2(q.ceiling_area_m2),
        floor_area_m2: round2(q.floor_area_m2)
      });
    });
    const totals = spaceQuantities.reduce((sum, q) => {
      sum.total_floor_area_m2 += q.floor_area_m2;
      sum.total_ceiling_area_m2 += q.ceiling_area_m2;
      sum.total_perimeter_m += q.perimeter_m;
      return sum;
    }, { total_floor_area_m2:0, total_ceiling_area_m2:0, total_perimeter_m:0 });
    const wallTotals = (project.walls || []).reduce((sum, wall) => {
      const wq = LB.wallEngine.calculateNetWallArea(wall, vertices, openings);
      sum.total_wall_area_m2 += wq.gross_wall_area_m2;
      sum.total_net_wall_area_m2 += wq.net_wall_area_m2;
      return sum;
    }, { total_wall_area_m2:0, total_net_wall_area_m2:0 });
    if(!project.walls || !project.walls.length){
      wallTotals.total_wall_area_m2 = totals.total_perimeter_m * 2.4;
      wallTotals.total_net_wall_area_m2 = wallTotals.total_wall_area_m2;
    }
    const doorCount = LB.openingEngine.countDoors(openings);
    const windowCount = LB.openingEngine.countWindows(openings);
    const tileArea = (project.spaces || []).reduce((sum, space, index) => sum + (isBathOrKitchen(space) ? (spaceQuantities[index] || {}).floor_area_m2 || 0 : 0), 0);
    return {
      total_floor_area_m2: round2(totals.total_floor_area_m2),
      total_ceiling_area_m2: round2(totals.total_ceiling_area_m2),
      total_wall_area_m2: round2(wallTotals.total_wall_area_m2),
      total_net_wall_area_m2: round2(wallTotals.total_net_wall_area_m2),
      total_perimeter_m: round2(totals.total_perimeter_m),
      door_count: doorCount,
      window_count: windowCount,
      space_quantities: spaceQuantities,
      process_quantities: {
        flooring_area_m2: round2(totals.total_floor_area_m2),
        wallpaper_area_m2: round2(wallTotals.total_net_wall_area_m2),
        painting_area_m2: round2(wallTotals.total_net_wall_area_m2),
        ceiling_area_m2: round2(totals.total_ceiling_area_m2),
        baseboard_length_m: round2(totals.total_perimeter_m),
        molding_length_m: round2(totals.total_perimeter_m),
        tile_area_m2: round2(tileArea)
      }
    };
  }
  LB.quantityEngine = { calculateProjectQuantities };
  LB.core.quantityEngine = LB.quantityEngine;
})(window);
