'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};

  function rq(value){ return LB.geometryCore.roundQuantity(value); }
  function textOf(value){ return String(value || '').trim().toUpperCase(); }
  function warning(code, severity, message, entityType, entityId){
    return { code, severity, message, entity_type:entityType || 'project', entity_id:entityId || null };
  }
  function normalizeSpaceType(space){
    const text = textOf(((space || {}).type || '') + ' ' + ((space || {}).name || '') + ' ' + ((space || {}).space_type || ''));
    if(text.indexOf('BATHROOM') >= 0 || text.indexOf('BATH') >= 0 || text.indexOf('WC') >= 0 || text.indexOf('욕실') >= 0 || text.indexOf('화장실') >= 0) return 'BATHROOM';
    if(text.indexOf('KITCHEN') >= 0 || text.indexOf('주방') >= 0) return 'KITCHEN';
    if(text.indexOf('LIVING_ROOM') >= 0 || text.indexOf('LIVING') >= 0 || text.indexOf('거실') >= 0) return 'LIVING';
    if(text.indexOf('BEDROOM') >= 0 || text === 'ROOM' || text.indexOf(' ROOM') >= 0 || text.indexOf('침실') >= 0 || text.indexOf(' 방') >= 0) return 'BEDROOM';
    if(text.indexOf('ENTRANCE') >= 0 || text.indexOf('현관') >= 0) return 'ENTRANCE';
    if(text.indexOf('BALCONY') >= 0 || text.indexOf('발코니') >= 0 || text.indexOf('베란다') >= 0) return 'BALCONY';
    if(text.indexOf('UTILITY') >= 0 || text.indexOf('다용도실') >= 0) return 'UTILITY';
    return 'ETC';
  }
  function finishText(space, key){
    return textOf((space || {})[key] || (space || {}).wall_finish || (space || {}).wallFinish || (space || {}).floor_finish || (space || {}).floorFinish || '');
  }
  function hasFinish(space, keys){
    const text = textOf([space.floor_finish, space.floorFinish, space.floorMaterial, space.wall_finish, space.wallFinish, space.wallMaterial, space.ceiling_finish, space.ceilingFinish, space.ceilingMaterial].join(' '));
    return keys.some(key => text.indexOf(key) >= 0);
  }
  function openingWidthM(opening){
    const d = LB.openingEngine.getOpeningDimensions(opening || {});
    return d.width / 1000;
  }
  function openingAreaForSpace(openings, spaceId){
    return (openings || []).filter(o => (o.spaceId || o.space_id) === spaceId).reduce((sum, opening) => sum + LB.openingEngine.calculateOpeningArea(opening), 0);
  }
  function openingWidthForSpace(openings, spaceId){
    return (openings || []).filter(o => {
      const type = LB.openingEngine.normalizeOpeningType(o.type);
      return (o.spaceId || o.space_id) === spaceId && ['DOOR', 'SLIDING_DOOR', 'BALCONY_DOOR'].indexOf(type) >= 0;
    }).reduce((sum, opening) => sum + openingWidthM(opening), 0);
  }
  function spaceWallArea(space, q, openings){
    const heightM = (((space || {}).ceilingHeight_mm || (space || {}).height_mm || 2400) / 1000);
    return Math.max(0, (q.perimeter_m || 0) * heightM - openingAreaForSpace(openings, space.id));
  }
  function kitchenBacksplashArea(space, q, warnings){
    const basis = q.room_bounds || {};
    const lengthM = Math.max((basis.width || 0) / 1000, (basis.height || 0) / 1000, 1.8);
    warnings.push(warning('ESTIMATED_KITCHEN_TILE_AREA', 'INFO', 'Kitchen wall tile area estimated from kitchen length x 0.6m.', 'space', space.id));
    return lengthM * 0.6;
  }
  function calculateProjectQuantities(project){
    project = project || {};
    const vertices = project.vertices || [];
    const openings = project.openings || [];
    const warnings = [];
    const spaceQuantities = (project.spaces || []).map(space => {
      const q = LB.spaceEngine.calculateSpaceQuantities(space, vertices);
      const normalizedType = normalizeSpaceType(space);
      const netWallArea = rq(spaceWallArea(space, q, openings));
      warnings.push.apply(warnings, q.warnings || []);
      return Object.assign({}, q, {
        space_id: space.id,
        space_name: space.name,
        space_type: normalizedType,
        wall_area_m2: netWallArea,
        net_wall_area_m2: netWallArea
      });
    });
    const totals = spaceQuantities.reduce((sum, q) => {
      sum.total_floor_area_m2 += q.floor_area_m2 || 0;
      sum.total_ceiling_area_m2 += q.ceiling_area_m2 || 0;
      sum.total_perimeter_m += q.perimeter_m || 0;
      return sum;
    }, { total_floor_area_m2:0, total_ceiling_area_m2:0, total_perimeter_m:0 });

    const wallTotals = (project.walls || []).reduce((sum, wall) => {
      const wq = LB.wallEngine.calculateWallQuantities(wall, vertices, openings);
      warnings.push.apply(warnings, wq.warnings || []);
      sum.total_wall_area_m2 += wq.gross_wall_area_m2 || 0;
      sum.total_net_wall_area_m2 += wq.net_wall_area_m2 || 0;
      sum.opening_area_m2 += wq.opening_area_m2 || 0;
      return sum;
    }, { total_wall_area_m2:0, total_net_wall_area_m2:0, opening_area_m2:0 });
    if(!project.walls || !project.walls.length){
      wallTotals.total_wall_area_m2 = totals.total_perimeter_m * 2.4;
      wallTotals.opening_area_m2 = (openings || []).reduce((sum, opening) => sum + LB.openingEngine.calculateOpeningArea(opening), 0);
      wallTotals.total_net_wall_area_m2 = Math.max(0, wallTotals.total_wall_area_m2 - wallTotals.opening_area_m2);
    }
    (openings || []).forEach(opening => {
      const oq = LB.openingEngine.calculateOpeningQuantity(opening);
      warnings.push.apply(warnings, oq.warnings || []);
    });

    let flooringArea = 0;
    let wallpaperArea = 0;
    let paintingArea = 0;
    let baseboardLength = 0;
    let moldingLength = 0;
    let bathroomTileArea = 0;
    let kitchenWallTileArea = 0;
    let entranceTileArea = 0;

    (project.spaces || []).forEach((space, index) => {
      const q = spaceQuantities[index] || {};
      const type = q.space_type;
      const floorApplies = ['BALCONY', 'UTILITY'].indexOf(type) < 0;
      if(floorApplies) flooringArea += q.floor_area_m2 || 0;
      if(floorApplies) baseboardLength += Math.max(0, (q.perimeter_m || 0) - openingWidthForSpace(openings, space.id));
      moldingLength += q.perimeter_m || 0;
      if(type === 'BATHROOM'){
        bathroomTileArea += (q.floor_area_m2 || 0) + (q.net_wall_area_m2 || 0);
        return;
      }
      if(type === 'KITCHEN'){
        kitchenWallTileArea += kitchenBacksplashArea(space, q, warnings);
      }
      if(type === 'ENTRANCE' && hasFinish(space, ['TILE', '타일'])){
        entranceTileArea += q.floor_area_m2 || 0;
      }
      const wallFinish = finishText(space, 'wall_finish');
      if(wallFinish.indexOf('PAINT') >= 0 || wallFinish.indexOf('도장') >= 0 || wallFinish.indexOf('페인트') >= 0) paintingArea += q.net_wall_area_m2 || 0;
      else wallpaperArea += q.net_wall_area_m2 || 0;
      const ceilingFinish = textOf(space.ceiling_finish || space.ceilingFinish || space.ceilingMaterial);
      if(ceilingFinish.indexOf('PAINT') >= 0 || ceilingFinish.indexOf('도장') >= 0 || ceilingFinish.indexOf('페인트') >= 0) paintingArea += q.ceiling_area_m2 || 0;
    });

    const doorCount = LB.openingEngine.countDoors(openings);
    const windowCount = LB.openingEngine.countWindows(openings);
    return {
      total_floor_area_m2: rq(totals.total_floor_area_m2),
      total_ceiling_area_m2: rq(totals.total_ceiling_area_m2),
      total_wall_area_m2: rq(wallTotals.total_wall_area_m2),
      total_net_wall_area_m2: rq(wallTotals.total_net_wall_area_m2),
      opening_area_m2: rq(wallTotals.opening_area_m2),
      total_perimeter_m: rq(totals.total_perimeter_m),
      door_count: doorCount,
      window_count: windowCount,
      opening_count: LB.openingEngine.countOpenings(openings),
      opening_by_space: LB.openingEngine.groupOpeningsBySpace(openings),
      opening_by_wall: LB.openingEngine.groupOpeningsByWall(openings),
      space_quantities: spaceQuantities,
      warnings,
      process_quantities: {
        flooring_area_m2: rq(flooringArea),
        wallpaper_area_m2: rq(wallpaperArea),
        painting_area_m2: rq(paintingArea),
        ceiling_area_m2: rq(totals.total_ceiling_area_m2),
        baseboard_length_m: rq(baseboardLength),
        molding_length_m: rq(moldingLength),
        tile_area_m2: rq(bathroomTileArea + kitchenWallTileArea + entranceTileArea),
        bathroom_tile_area_m2: rq(bathroomTileArea),
        kitchen_wall_tile_area_m2: rq(kitchenWallTileArea),
        door_count: doorCount,
        window_count: windowCount,
        opening_area_m2: rq(wallTotals.opening_area_m2)
      }
    };
  }

  LB.quantityEngine = { calculateProjectQuantities, normalizeSpaceType };
  LB.core.quantityEngine = LB.quantityEngine;
})(window);
