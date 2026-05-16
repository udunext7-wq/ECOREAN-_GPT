'use strict';
(function(global){
  const LB = global.LightBIM = global.LightBIM || {};
  LB.core = LB.core || {};

  function number(value){ return Number.isFinite(Number(value)) ? Number(value) : 0; }
  function safeNumber(value, fallback){ return Number.isFinite(Number(value)) ? Number(value) : (Number(fallback) || 0); }
  function distance(a, b){
    const dx = number((b || {}).x) - number((a || {}).x);
    const dy = number((b || {}).y) - number((a || {}).y);
    return Math.hypot(dx, dy);
  }
  function roundMm(value){ return Math.round(number(value)); }
  function polygonArea(points){
    points = Array.isArray(points) ? points : [];
    if(points.length < 3) return 0;
    let sum = 0;
    for(let i = 0; i < points.length; i += 1){
      const a = points[i];
      const b = points[(i + 1) % points.length];
      sum += number(a.x) * number(b.y) - number(b.x) * number(a.y);
    }
    return Math.abs(sum) / 2;
  }
  function polygonPerimeter(points){
    points = Array.isArray(points) ? points : [];
    if(points.length < 2) return 0;
    let total = 0;
    for(let i = 0; i < points.length; i += 1){ total += distance(points[i], points[(i + 1) % points.length]); }
    return total;
  }
  function getBounds(points){
    points = Array.isArray(points) ? points : [];
    if(!points.length) return { minX:0, minY:0, maxX:0, maxY:0, width:0, height:0 };
    const xs = points.map(p => number(p.x));
    const ys = points.map(p => number(p.y));
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    return { minX, minY, maxX, maxY, width:maxX - minX, height:maxY - minY };
  }
  function pointInPolygon(point, polygon){
    polygon = Array.isArray(polygon) ? polygon : [];
    if(polygon.length < 3) return false;
    const x = number(point && point.x);
    const y = number(point && point.y);
    let inside = false;
    for(let i = 0, j = polygon.length - 1; i < polygon.length; j = i++){
      const xi = number(polygon[i].x), yi = number(polygon[i].y);
      const xj = number(polygon[j].x), yj = number(polygon[j].y);
      const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
      if(intersects) inside = !inside;
    }
    return inside;
  }
  function segmentLength(v1, v2){ return distance(v1, v2); }

  LB.geometryCore = { polygonArea, polygonPerimeter, distance, roundMm, getBounds, pointInPolygon, segmentLength, safeNumber };
  LB.core.geometryCore = LB.geometryCore;
})(window);
