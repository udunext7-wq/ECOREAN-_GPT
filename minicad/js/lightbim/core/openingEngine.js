'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};
  function n(value){ return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function normalizeOpeningType(type){
    const text = String(type || 'UNKNOWN').trim().toUpperCase();
    if(text.indexOf('SLIDING') >= 0 || text.indexOf('미닫') >= 0) return 'SLIDING_DOOR';
    if(text.indexOf('BALCONY') >= 0 || text.indexOf('발코니') >= 0) return 'BALCONY_DOOR';
    if(text.indexOf('DOOR') >= 0 || text.indexOf('문') >= 0) return 'DOOR';
    if(text.indexOf('WINDOW') >= 0 || text.indexOf('창') >= 0) return 'WINDOW';
    if(text.indexOf('OPEN') >= 0 || text.indexOf('개구') >= 0) return 'OPENING';
    return 'UNKNOWN';
  }
  function defaultSize(type){
    const normalized = normalizeOpeningType(type);
    if(normalized === 'WINDOW') return { width:1200, height:1200 };
    return { width:900, height:2100 };
  }
  function getOpeningDimensions(opening){
    opening = opening || {};
    const type = normalizeOpeningType(opening.type);
    const defaults = defaultSize(type);
    const rawWidth = opening.width || opening.width_mm || opening.w || opening.w_mm;
    const rawHeight = opening.height || opening.height_mm || opening.h || opening.h_mm;
    const defaultedWidth = !Number.isFinite(Number(rawWidth)) || Number(rawWidth) <= 0;
    const defaultedHeight = !Number.isFinite(Number(rawHeight)) || Number(rawHeight) <= 0;
    return {
      width: defaultedWidth ? defaults.width : n(rawWidth),
      height: defaultedHeight ? defaults.height : n(rawHeight),
      type,
      defaultedWidth,
      defaultedHeight
    };
  }
  function widthOf(opening){ return getOpeningDimensions(opening).width; }
  function heightOf(opening){ return getOpeningDimensions(opening).height; }
  function calculateOpeningArea(opening){ return (widthOf(opening || {}) * heightOf(opening || {})) / 1000000; }
  function calculateOpeningQuantity(opening){
    const dimensions = getOpeningDimensions(opening || {});
    const warnings = [];
    if(dimensions.defaultedWidth || dimensions.defaultedHeight){
      warnings.push({
        code:'DEFAULT_OPENING_SIZE_USED',
        severity:'WARNING',
        message:'Opening missing width or height used default size.',
        entity_type:'opening',
        entity_id:(opening || {}).id || null
      });
    }
    return {
      opening_area_m2: calculateOpeningArea(opening || {}),
      width_mm: dimensions.width,
      height_mm: dimensions.height,
      opening_type: dimensions.type,
      warnings
    };
  }
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
    return (openings || []).filter(opening => ['DOOR', 'SLIDING_DOOR', 'BALCONY_DOOR'].indexOf(normalizeOpeningType(opening.type)) >= 0).length;
  }
  function countWindows(openings){
    return (openings || []).filter(opening => normalizeOpeningType(opening.type) === 'WINDOW').length;
  }
  function countOpenings(openings){ return (openings || []).length; }
  LB.openingEngine = { normalizeOpeningType, getOpeningDimensions, calculateOpeningArea, calculateOpeningQuantity, groupOpeningsByWall, groupOpeningsBySpace, countDoors, countWindows, countOpenings };
  LB.core.openingEngine = LB.openingEngine;
})(window);
