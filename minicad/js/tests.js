'use strict';
// ===== v5.8 Task 2: 자체 테스트 스위트 (?test=1 쿼리 시 실행) =====
// ===== v5.8 Task 2: 자체 테스트 스위트 (?test=1 쿼리 시 실행) =====
if(new URLSearchParams(location.search).get('test')==='1'){(function runTests(){
  let pass=0,fail=0,results=[];
  function assert(name,cond,detail){
    if(cond){pass++;results.push('✅ '+name);}
    else{fail++;results.push('❌ '+name+(detail?' — '+detail:''));}
  }
  // === Critical Test 1: SEMANTIC_MAP keys ⊆ 전체 라이브러리 키 합집합 ===
  const allLibKeys=new Set([
    ...Object.keys(FURNITURE_LIB),...Object.keys(FIXTURE_LIB),
    ...Object.keys(LIGHT_LIB),...Object.keys(ELECTRIC_LIB),...Object.keys(HVAC_FIRE_LIB)
  ]);
  const smKeys=Object.keys(SEMANTIC_MAP);
  const deadKeys=smKeys.filter(k=>!allLibKeys.has(k));
  if(deadKeys.length>0){
    deadKeys.forEach(k=>console.error('%c[SEMANTIC_MAP 사망키] '+k+' — 라이브러리에 없음','color:#E2725B;font-weight:bold'));
  }
  assert('CT1: SEMANTIC_MAP ⊆ 라이브러리 (dead alias 없음)',deadKeys.length===0,
    deadKeys.length?'사망키: '+deadKeys.join(', '):'');
  // === Critical Test 2: 전체 라이브러리 키 ⊆ SEMANTIC_MAP (역방향) ===
  const smSet=new Set(smKeys);
  const unmappedKeys=[...allLibKeys].filter(k=>!smSet.has(k));
  if(unmappedKeys.length>0){
    unmappedKeys.forEach(k=>console.warn('%c[SEMANTIC_MAP 누락키] '+k+' — fallback generic 사용 중','color:#D4A017;font-weight:bold'));
  }
  assert('CT2: 라이브러리 ⊆ SEMANTIC_MAP (미매핑 없음)',unmappedKeys.length===0,
    unmappedKeys.length?'미매핑: '+unmappedKeys.join(', '):'');
  // 1. darkenHex
  assert('darkenHex 빨강50%',darkenHex('#FF0000',0.5)==='#7f0000');
  assert('darkenHex 흰색50%',darkenHex('#FFFFFF',0.5)==='#7f7f7f');
  assert('darkenHex null입력',darkenHex(null,0.5)==='#000');
  assert('darkenHex 0%무변화',darkenHex('#C9A961',0)==='#c9a961');
  // 2. semanticOf
  assert('semanticOf sofa3',semanticOf('sofa3').tag==='main_seating');
  assert('semanticOf bathtub v5.8',semanticOf('bathtub').tag==='sanitary');
  assert('semanticOf smoke_detector v5.8',semanticOf('smoke_detector').tag==='smoke_detector');
  assert('semanticOf outlet_w v5.8',semanticOf('outlet_w').tag==='outlet');
  assert('semanticOf ac_ceiling v5.8',semanticOf('ac_ceiling').tag==='system_ac');
  assert('semanticOf unknown fallback',semanticOf('_xyz_').tag==='generic');
  // 3. pointInPolygon
  const sq=[{x:0,y:0},{x:1000,y:0},{x:1000,y:1000},{x:0,y:1000}];
  assert('pointInPolygon 내부',pointInPolygon({x:500,y:500},sq)===true);
  assert('pointInPolygon 외부',pointInPolygon({x:1500,y:500},sq)===false);
  assert('pointInPolygon 모서리근처',pointInPolygon({x:1,y:1},sq)===true);
  // 4. findContainingSpace
  const orig4=STATE.spaces.slice();
  STATE.spaces=[{id:'tsp',polygon:sq}];
  assert('findContainingSpace 내부',findContainingSpace({x:500,y:500})==='tsp');
  assert('findContainingSpace 외부',findContainingSpace({x:2000,y:2000})===null);
  STATE.spaces=orig4;
  // 5. placementOf
  const mSp={polygon:[{x:0,y:0},{x:2000,y:0},{x:2000,y:2000},{x:0,y:2000}]};
  assert('placementOf 중앙',placementOf({x:1000,y:1000},mSp)==='center');
  assert('placementOf 북쪽',placementOf({x:1000,y:100},mSp)==='in_north');
  assert('placementOf 남쪽',placementOf({x:1000,y:1900},mSp)==='in_south');
  assert('placementOf null공간',placementOf({x:0,y:0},null)==='unknown');
  // 6. defaultMaterials
  assert('defaultMaterials BATHROOM바닥',defaultMaterials('BATHROOM').floor==='TILE_BATH');
  assert('defaultMaterials BATHROOM벽',defaultMaterials('BATHROOM').wall==='WALL_TILE');
  assert('defaultMaterials LIVING기본',defaultMaterials('LIVING').floor==='STRONG');
  assert('defaultMaterials GARAGE에폭시',defaultMaterials('GARAGE').floor==='EPOXY');
  assert('defaultMaterials KITCHEN바닥',defaultMaterials('KITCHEN').floor==='STRONG');
  // 7. snapPointToSpaceEdges
  const orig7=STATE.spaces.slice();
  STATE.spaces=[{id:'ssp',polygon:[{x:0,y:0},{x:5000,y:0},{x:5000,y:5000},{x:0,y:5000}]}];
  const sn1=snapPointToSpaceEdges({x:150,y:2500},null);
  assert('snapPointToSpaceEdges 흡착',sn1.snapped===true);
  assert('snapPointToSpaceEdges x=0',sn1.pt.x===0);
  const sn2=snapPointToSpaceEdges({x:2500,y:2500},null);
  assert('snapPointToSpaceEdges 중앙없음',sn2.snapped===false);
  STATE.spaces=orig7;
  // 8. splitWallsAtIntersections
  const orig8=STATE.walls.slice();
  STATE.walls=[
    {id:'wh',x1:0,y1:500,x2:1000,y2:500,thickness:100},
    {id:'wv',x1:500,y1:0,x2:500,y2:1000,thickness:100},
  ];
  splitWallsAtIntersections();
  assert('splitWallsAtIntersections 4개',STATE.walls.length===4);
  const cw=STATE.walls.filter(w=>(Math.abs(w.x1-500)<2&&Math.abs(w.y1-500)<2)||(Math.abs(w.x2-500)<2&&Math.abs(w.y2-500)<2));
  assert('splitWallsAtIntersections vertex',cw.length===4);
  STATE.walls=orig8;
  // 9. migrateLoadedState
  const orig9=STATE.spaces.slice(),origW9=STATE.walls.slice();
  STATE.spaces=[{id:'m1',type:'BATHROOM',polygon:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}]}];
  STATE.walls=[];
  migrateLoadedState('v5.0');
  assert('migrateLoadedState typeIndex',typeof STATE.spaces[0].typeIndex==='number');
  assert('migrateLoadedState code=BATH',STATE.spaces[0].code==='BATH');
  assert('migrateLoadedState CONDITIONAL',STATE.spaces[0].waterproofRecommended==='CONDITIONAL');
  STATE.spaces=orig9;STATE.walls=origW9;
  // 10. findNearestWallId
  const orig10=STATE.walls.slice();
  STATE.walls=[{id:'nw',x1:0,y1:0,x2:0,y2:3000,thickness:100}];
  assert('findNearestWallId 가까운벽',findNearestWallId({x:80,y:1500,w:200,h:100})==='nw');
  STATE.walls=orig10;
  // 11. exportAIBundle (download 모킹)
  const oDDU=window.downloadDataURL,oDT=window.downloadText,bFiles=[];
  window.downloadDataURL=(u,n)=>bFiles.push(n);
  window.downloadText=(t,n)=>bFiles.push(n);
  try{
    exportAIBundle();
    assert('exportAIBundle 4종',bFiles.length===4);
    assert('exportAIBundle PNG',bFiles.some(f=>f.endsWith('.png')));
    assert('exportAIBundle JSON',bFiles.some(f=>f.endsWith('.json')));
    assert('exportAIBundle 이미지프롬프트',bFiles.some(f=>f.includes('image_prompts')));
    assert('exportAIBundle 영상프롬프트',bFiles.some(f=>f.includes('video_sequence')));
  }catch(e){assert('exportAIBundle 예외없음',false,e.message);}
  finally{window.downloadDataURL=oDDU;window.downloadText=oDT;}
  // 결과
  const total=pass+fail,color=fail?'#E2725B':'#7BA05B';
  console.group('%c ECOREAN v5.8 Test Suite','background:'+color+';color:#fff;font-weight:bold;padding:4px 8px');
  results.forEach(r=>console.log(r));
  console.groupEnd();
  console.log('%c '+pass+'/'+total+' 통과'+(fail?' | 실패 '+fail:''),'font-weight:bold;color:'+color);
  if(fail>0)console.error('[ECOREAN TDD] 테스트 실패 — 커밋 금지');
  const t=document.createElement('div');
  t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:'+color
    +';color:#fff;padding:12px 28px;border-radius:4px;font-family:monospace;font-size:13px;'
    +'font-weight:bold;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.6)';
  t.textContent='TEST '+(fail?'FAIL ❌':'PASS ✅')+' — '+pass+'/'+total+(fail?' (실패 '+fail+'건)':'');
  document.body.appendChild(t);
})();}
