'use strict';
(function(global){
  function approx(actual, expected, tolerance){ return Math.abs(actual - expected) <= (tolerance || 0.0001); }
  function runLightBIMSmokeTests(){
    const LB = global.LightBIM;
    const results = [];
    function assert(name, condition, detail){
      results.push({ name, ok: !!condition, detail: detail || '' });
      if(!condition) console.error('[LightBIM FAIL]', name, detail || '');
      else console.log('[LightBIM PASS]', name);
    }
    assert('LightBIM namespace exists', !!LB);
    assert('LightBIM core namespace exists', !!(LB && LB.core && LB.core.geometryCore));
    const square = [{x:0,y:0},{x:1000,y:0},{x:1000,y:1000},{x:0,y:1000}];
    assert('polygon area calculation works', LB && LB.geometryCore.polygonArea(square) === 1000000);
    assert('polygon perimeter calculation works', LB && LB.geometryCore.polygonPerimeter(square) === 4000);
    const sampleState = {
      projectName: 'LightBIM Smoke', ceilingHeight: 2400, wallThickness: 100,
      vertices: [{id:'v1',x:0,y:0},{id:'v2',x:2000,y:0},{id:'v3',x:2000,y:1500},{id:'v4',x:0,y:1500}],
      spaces: [{id:'s1',name:'Bathroom',type:'BATHROOM',vertexIds:['v1','v2','v3','v4']}],
      walls: [{id:'w1',v1Id:'v1',v2Id:'v2',height:2400,spaceId:'s1'}],
      openings: [{id:'o1',type:'door',wallId:'w1',spaceId:'s1',width:800,height:2100}],
      fixtures: [], furniture: [], lights: [], electric: []
    };
    const emptyProject = LB.adapters.miniCadStateAdapter.normalizeMiniCadState({});
    assert('MiniCAD empty state normalizes safely', emptyProject && emptyProject.schema === 'ECOREAN.LightBIM.Project' && Array.isArray(emptyProject.spaces));
    const project = LB.adapters.miniCadStateAdapter.normalizeMiniCadState(sampleState);
    assert('MiniCAD STATE normalizes into LightBIM project', project && project.schema_version === '0.1' && project.spaces.length === 1);
    assert('Space area is calculated', approx(project.spaces[0].area_m2, 3));
    assert('Wall length is calculated', approx(LB.wallEngine.calculateWallLength(project.walls[0], project.vertices), 2));
    assert('Opening area is calculated', approx(LB.openingEngine.calculateOpeningArea(project.openings[0]), 1.68));
    const quantities = LB.quantityEngine.calculateProjectQuantities(project);
    assert('Quantity summary is generated', quantities.total_floor_area_m2 > 0 && quantities.door_count === 1);
    const boc = LB.adapters.bocEstimateAdapter.createBOCEstimateInput(project, quantities);
    assert('BOC estimate input is generated', boc.source === 'LIGHTBIM' && boc.estimate_type === 'BATHROOM');
    const hints = LB.adapters.aiPromptAdapter.createAIPromptHints(project);
    assert('AI prompt hints are generated', hints.room_list.length === 1 && hints.negative_constraints.length > 0);
    if(typeof global.exportLightBIMJSON === 'function' && global.STATE){
      const bundle = global.exportLightBIMJSON();
      assert('Original MiniCAD app still exposes LightBIM export', bundle && bundle.schema === 'ECOREAN.LightBIM.v0.1');
    }
    const failed = results.filter(result => !result.ok);
    console.log('[LightBIM] smoke tests complete:', results.length - failed.length + '/' + results.length, 'passed');
    return { total: results.length, failed: failed.length, results };
  }
  global.LightBIM = global.LightBIM || {};
  global.LightBIM.tests = global.LightBIM.tests || {};
  global.LightBIM.tests.runLightBIMSmokeTests = runLightBIMSmokeTests;
  global.runLightBIMSmokeTest = runLightBIMSmokeTests;
  try{
    if(global.location && new URLSearchParams(global.location.search).get('test') === '1'){
      setTimeout(runLightBIMSmokeTests, 0);
    }
  }catch(error){
    console.warn('[LightBIM] smoke auto-run skipped', error);
  }
})(window);
