'use strict';
// ===== UI / 패널 / 저장·로드 / 버튼 바인딩 =====
// v5.9: 라이브러리 카테고리 — 인라인 패널 → 팝업 창 (썸네일 버튼)
function setLibCategory(toolName){
  const popup=document.getElementById('lib-popup');
  const wasOpen=popup.classList.contains('show');
  const prevTool=popup.dataset.tool;
  // 같은 카테고리 다시 클릭 → 토글로 닫기
  if(wasOpen && prevTool===toolName){
    hideLibPopup();
    document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.remove('active'));
    return;
  }
  const lib={furniture:FURNITURE_LIB,fixture:FIXTURE_LIB,light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB}[toolName];
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===toolName));
  if(lib){
    showLibPopup(toolName,lib);
    popup.dataset.tool=toolName;
  }
  cmdToast({furniture:'1 가구',fixture:'2 위생/주방',light:'3 조명',electric:'4 전기',hvac:'5 공조/소방'}[toolName]||toolName);
}
function rebuildLibPanel(toolName){
  // v5.9: 인라인 패널 비활성 — 팝업으로 이전됨. 카테고리 탭 강조만 동기화.
  const panel=document.getElementById('lib-panel');
  if(panel) panel.innerHTML='';
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===toolName));
}

// v5.2: 직교 토글 함수
function toggleOrtho(){
  STATE.snap.ortho=!STATE.snap.ortho;
  const onOff=STATE.snap.ortho?'ON':'OFF';
  cmdToast('직교 (Ortho) '+onOff+' — F8 / Ctrl+L');
  updateOrthoFAB();
  // snap UI checkbox 동기화
  const cb=document.querySelector('input[data-snap="ortho"]');
  if(cb) cb.checked=STATE.snap.ortho;
  _refreshShiftOrtho(); // 작업 중 F8 즉시 반영
}
function updateOrthoFAB(){
  const fab=document.getElementById('ortho-fab');
  if(!fab) return;
  fab.classList.toggle('active',STATE.snap.ortho);
  fab.textContent=STATE.snap.ortho?'직교 ON':'직교 OFF';
}

// ===== 도구 =====
function setTool(tool){
  STATE.selectedTool=tool;
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  drawState=null;STATE.measureFirst=null;polyState=null;leaderDrawState=null;
  drawGroup.destroyChildren();previewLayer.batchDraw();
  container.className='tool-'+tool;
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===tool));
  const libTools={furniture:FURNITURE_LIB,fixture:FIXTURE_LIB,light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB};
  if(libTools[tool]) rebuildLibPanel(tool);
  else{const p=document.getElementById('lib-panel');if(p)p.innerHTML='';STATE.selectedLib=null;}
  showStatus('도구: '+tool);
}
document.querySelectorAll('.tool-btn').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));

// ===== 라이브러리 팝업 (v5.9: 썸네일 버튼 그리드) =====
function _libShapeBounds(shape){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  shape.forEach(s=>{
    if(s.type==='rect'){
      minX=Math.min(minX,s.x);minY=Math.min(minY,s.y);
      maxX=Math.max(maxX,s.x+s.w);maxY=Math.max(maxY,s.y+s.h);
    } else if(s.type==='circle'||s.type==='arc'){
      minX=Math.min(minX,s.cx-s.r);minY=Math.min(minY,s.cy-s.r);
      maxX=Math.max(maxX,s.cx+s.r);maxY=Math.max(maxY,s.cy+s.r);
    } else if(s.type==='line'){
      minX=Math.min(minX,s.x1,s.x2);minY=Math.min(minY,s.y1,s.y2);
      maxX=Math.max(maxX,s.x1,s.x2);maxY=Math.max(maxY,s.y1,s.y2);
    }
  });
  if(!isFinite(minX)) return {x:-50,y:-50,w:100,h:100};
  return {x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
}
function _libShapeToSVG(shape){
  const b=_libShapeBounds(shape);
  const pad=Math.max(b.w,b.h)*0.05+10;
  const vbX=b.x-pad,vbY=b.y-pad,vbW=b.w+pad*2,vbH=b.h+pad*2;
  const parts=shape.map(s=>{
    const fill=(s.fill&&s.fill!=='transparent')?s.fill:'none';
    const stroke=s.stroke||'none';
    const sw=s.sw||1;
    const dash=s.dash?' stroke-dasharray="'+s.dash.join(',')+'"':'';
    if(s.type==='rect'){
      const r=s.r||0;
      return '<rect x="'+s.x+'" y="'+s.y+'" width="'+s.w+'" height="'+s.h+'" rx="'+r+'" ry="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='circle'){
      return '<circle cx="'+s.cx+'" cy="'+s.cy+'" r="'+s.r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='line'){
      const st=stroke==='none'?(s.fill||'#888'):stroke;
      return '<line x1="'+s.x1+'" y1="'+s.y1+'" x2="'+s.x2+'" y2="'+s.y2+'" stroke="'+st+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='arc'){
      const st=stroke==='none'?(s.fill||'#888'):stroke;
      return '<circle cx="'+s.cx+'" cy="'+s.cy+'" r="'+s.r+'" fill="none" stroke="'+st+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='path'&&s.d){
      return '<path d="'+s.d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    return '';
  }).join('');
  return '<svg viewBox="'+vbX+' '+vbY+' '+vbW+' '+vbH+'" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'+parts+'</svg>';
}
function _attachLibPopupDrag(popup){
  if(popup.dataset.dragWired) return;
  popup.dataset.dragWired='1';
  const handle=popup.querySelector('h4');
  if(!handle) return;
  let startX=0,startY=0,baseLeft=0,baseTop=0,dragging=false;
  handle.addEventListener('mousedown',e=>{
    if(e.target.closest('.lib-popup-close')) return;
    e.preventDefault();
    const parent=popup.offsetParent||popup.parentElement;
    const pr=parent.getBoundingClientRect();
    const r=popup.getBoundingClientRect();
    baseLeft=r.left-pr.left;baseTop=r.top-pr.top;
    popup.style.left=baseLeft+'px';popup.style.top=baseTop+'px';
    popup.style.right='auto';popup.style.bottom='auto';
    startX=e.clientX;startY=e.clientY;
    dragging=true;popup.classList.add('dragging');
  });
  document.addEventListener('mousemove',e=>{
    if(!dragging) return;
    const parent=popup.offsetParent||popup.parentElement;
    const pw=parent.clientWidth, ph=parent.clientHeight;
    const w=popup.offsetWidth, h=popup.offsetHeight;
    let nl=baseLeft+(e.clientX-startX);
    let nt=baseTop+(e.clientY-startY);
    nl=Math.max(0,Math.min(pw-Math.min(w,pw),nl));
    nt=Math.max(0,Math.min(ph-Math.min(h,ph),nt));
    popup.style.left=nl+'px';popup.style.top=nt+'px';
  });
  document.addEventListener('mouseup',()=>{
    if(dragging){dragging=false;popup.classList.remove('dragging');}
  });
}
function showLibPopup(tool,lib){
  const titles={furniture:'1 가구',fixture:'2 위생/주방',light:'3 조명',electric:'4 전기',hvac:'5 공조/소방'};
  const popup=document.getElementById('lib-popup');
  document.getElementById('lib-popup-title').textContent=titles[tool]||'라이브러리';
  // 닫기 버튼 (없으면 1회 생성)
  if(!popup.querySelector('.lib-popup-close')){
    const close=document.createElement('button');
    close.className='lib-popup-close';close.type='button';close.title='닫기 (Esc)';close.textContent='✕';
    close.addEventListener('click',hideLibPopup);
    popup.insertBefore(close,popup.firstChild);
  }
  _attachLibPopupDrag(popup);
  const grid=document.getElementById('lib-popup-grid');
  grid.innerHTML='';
  const kindMap={furniture:'furniture',fixture:'fixtures',light:'lights',electric:'electric',hvac:'hvac'};
  Object.entries(lib).forEach(([key,def])=>{
    const btn=document.createElement('button');
    btn.className='lib-thumb-btn'+(STATE.selectedLib===key?' active':'');
    btn.type='button';
    btn.dataset.libKey=key;
    btn.dataset.libKind=kindMap[tool];
    btn.title=def.name+(def.nameEn?' / '+def.nameEn:'')+(def.w&&def.h?' ('+def.w+'×'+def.h+'mm)':'');
    let thumbHTML;
    if(def.shape&&def.shape.length){
      thumbHTML=_libShapeToSVG(def.shape);
    } else if(def.sym){
      thumbHTML='<span class="lib-sym" style="color:'+(def.c||'#C9A961')+'">'+def.sym+'</span>';
    } else {
      thumbHTML='<span class="lib-sym">■</span>';
    }
    var enHTML=def.nameEn?'<div class="lib-thumb-name-en">'+def.nameEn+'</div>':'';
    btn.innerHTML='<div class="lib-thumb">'+thumbHTML+'</div><div class="lib-thumb-name">'+def.name+'</div>'+enHTML;
    btn.addEventListener('click',()=>{
      STATE.selectedLib=key;
      grid.querySelectorAll('.lib-thumb-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showStatus(def.name+' 선택 — 캔버스 클릭으로 배치');
    });
    grid.appendChild(btn);
  });
  popup.classList.add('show');
}
function hideLibPopup(){
  const p=document.getElementById('lib-popup');
  if(p){p.classList.remove('show');delete p.dataset.tool;}
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.remove('active'));
}

// ===== 공간 타입 / 레이어 / 스냅 UI =====
function buildSpaceTypeUI(){
  const grid=document.getElementById('stype-grid');grid.innerHTML='';
  Object.entries(SPACE_TYPES).forEach(([k,td])=>{
    const btn=document.createElement('button');
    btn.className='stype-btn'+(k===STATE.selectedSpaceType?' active':'');
    btn.dataset.type=k;
    btn.innerHTML='<span class="stype-dot" style="background:'+td.color+'"></span>'+td.name;
    btn.addEventListener('click',()=>{
      STATE.selectedSpaceType=k;
      document.querySelectorAll('.stype-btn').forEach(b=>b.classList.toggle('active',b.dataset.type===k));
    });
    grid.appendChild(btn);
  });
}
function buildLayerUI(){
  const list=document.getElementById('layer-list');list.innerHTML='';
  const labels={walls:['벽','#3E3E3E'],spaces:['공간','#C9A961'],openings:['문/창','#D4A05B'],
    furniture:['가구','#8B7239'],fixtures:['위생/주방','#5BA0D4'],lights:['조명','#D4B872'],
    electric:['전기','#7BA05B'],hvac:['공조/소방','#9B7AC9'],circles:['원/타원','#C9A961'],arcs:['아크','#D4B872'],curves:['자유곡선','#7BA05B'],
    pillars:['기둥 (RC)','#D4D4D4'],
    dimensions:['치수','#B8B0A0'],text:['주석','#F5F1EB'],leaders:['지시선','#A8D8A8']};
  Object.entries(labels).forEach(([k,[name,color]])=>{
    const row=document.createElement('div');
    row.className='layer-row'+(STATE.layers[k]?'':' off');
    row.innerHTML='<span class="layer-dot" style="background:'+color+'"></span><span class="layer-name">'+name+'</span><span class="layer-eye">●</span>';
    row.addEventListener('click',()=>{
      STATE.layers[k]=!STATE.layers[k];
      row.classList.toggle('off',!STATE.layers[k]);
      if(groups[k]){groups[k].visible(STATE.layers[k]);mainLayer.batchDraw();}
    });
    list.appendChild(row);
  });
}
function buildSnapUI(){
  const list=document.getElementById('snap-list');list.innerHTML='';
  const labels={grid:['그리드 스냅','#C9A961'],endpoint:['끝점 스냅','#7BA05B'],ghost:['고스트 스냅 (선 근처)','#A8A8B8'],ortho:['직교 (Shift)','#5B8DA0']};
  Object.entries(labels).forEach(([k,[name,color]])=>{
    const row=document.createElement('div');
    row.className='layer-row'+(STATE.snap[k]?'':' off');
    row.innerHTML='<span class="layer-dot" style="background:'+color+'"></span><span class="layer-name">'+name+'</span><span class="layer-eye">●</span>';
    row.addEventListener('click',()=>{
      STATE.snap[k]=!STATE.snap[k];
      row.classList.toggle('off',!STATE.snap[k]);
      showStatus(name+': '+(STATE.snap[k]?'ON':'OFF'));
      if(k==='ghost'&&typeof renderGhostHints==='function') renderGhostHints();
    });
    list.appendChild(row);
  });
}

// ===== UI =====
function refreshUI(){refreshHeader();refreshSpaceList();refreshDetail();refreshEstimate();refreshJSON();refreshMaterial();}
function refreshHeader(){
  const ta=STATE.spaces.reduce((s,sp)=>s+spArea(sp),0);
  const pyeong=(ta*0.3025).toFixed(1);
  const floorPyeong=document.getElementById('t-floor-pyeong');
  if(floorPyeong) floorPyeong.textContent=pyeong;
  document.getElementById('space-count').textContent=STATE.spaces.length;
  // v5.9: 내력벽은 KPI/카운트 영향 없음 (보여주기 전용)
  const wallCount=STATE.walls.filter(w=>w.wallType!=='bearing').length;
  const oc=STATE.openings.length+wallCount+STATE.furniture.length+STATE.fixtures.length+STATE.lights.length+STATE.electric.length+STATE.texts.length+STATE.measures.length;
  document.getElementById('object-count').textContent=oc;
}
function refreshSpaceList(){
  const list=document.getElementById('space-list');
  if(STATE.spaces.length===0){list.innerHTML='<p style="color:var(--text-tertiary);font-size:10px;text-align:center;padding:14px">공간 없음</p>';return;}
  list.innerHTML=STATE.spaces.map(s=>{
    const td=SPACE_TYPES[s.type];
    const sel=STATE.selectedKind==='space'&&STATE.selectedId===s.id||STATE.boxSelection.some(b=>b.kind==='space'&&b.id===s.id);
    return '<div class="space-item'+(sel?' selected':'')+'" data-id="'+s.id+'" style="border-left-color:'+td.color+'">'+
      '<div class="si-head"><span class="si-name">'+escapeHtml(s.name)+'</span>'+
      '<span class="si-type" style="background:'+td.color+'33;color:'+td.color+'">'+escapeHtml(td.name)+'</span></div>'+
      '<div class="si-stats"><span><span class="num">'+spArea(s).toFixed(1)+'</span>㎡</span>'+
      '<span><span class="num">'+spWall(s).toFixed(1)+'</span>벽㎡</span>'+
      '<span><span class="num">'+spPeri(s).toFixed(1)+'</span>m</span></div></div>';
  }).join('');
  list.querySelectorAll('.space-item').forEach(el=>el.addEventListener('click',()=>selectObj('space',el.dataset.id)));
}

// *** 디테일 — 도어/창 W×H×D 편집 UI (요구사항 #2, #3) ***
function refreshDetail(){
  const empty=document.getElementById('sp-empty');
  const detail=document.getElementById('sp-detail');
  const stats=document.getElementById('detail-stats-card');
  const warn=document.getElementById('detail-warn-card');
  if(!STATE.selectedKind||!STATE.selectedId){empty.style.display='block';detail.style.display='none';return;}
  empty.style.display='none';detail.style.display='block';
  stats.style.display='none';warn.style.display='none';
  const dc=document.getElementById('detail-content');

  if(STATE.selectedKind==='space'){
    const s=STATE.spaces.find(x=>x.id===STATE.selectedId);
    if(!s) return;
    // v5.8: 자재 누락 방지 — 마이그레이션
    if(!s.floorMaterial){s.floorMaterial=defaultMaterials(s.type).floor;}
    if(!s.ceilingMaterial){s.ceilingMaterial='GYPSUM';}
    dc.innerHTML=
      '<div class="field"><label class="field-label">이름</label><input type="text" id="d-name" value="'+escapeHtml(s.name)+'"></div>'+
      '<div class="field"><label class="field-label">타입</label><select id="d-type">'+
      Object.entries(SPACE_TYPES).map(([k,td])=>'<option value="'+k+'"'+(k===s.type?' selected':'')+'>'+td.name+'</option>').join('')+'</select></div>'+
      '<div class="field"><label class="field-label">개별 천장고 (mm)</label>'+
      '<input type="number" id="d-ch" value="'+(s.ceilingHeight_mm||'')+'" placeholder="'+STATE.ceilingHeight+'"></div>'+
      // v5.8: 바닥재 / 벽자재 드롭다운
      '<div class="field-row"><div class="field"><label class="field-label">바닥재</label>'+
      '<select id="d-floor">'+
      Object.entries(FLOOR_MATERIALS).map(([k,m])=>'<option value="'+k+'"'+(k===s.floorMaterial?' selected':'')+'>'+m.name+'</option>').join('')+
      '</select></div>'+
      '<div class="field"><label class="field-label">벽자재</label>'+
      '<span style="font-size:11px;color:var(--text-tertiary)">벽 선택 → 개별 설정</span>'+
      '</div></div>'+
      '<div class="field-row"><div class="field"><label class="field-label">자재 등급</label>'+
      '<select id="d-grade"><option value="STANDARD"'+(s.materialGrade==='STANDARD'?' selected':'')+'>표준</option>'+
      '<option value="PREMIUM"'+(s.materialGrade==='PREMIUM'?' selected':'')+'>프리미엄</option>'+
      '<option value="LUXURY"'+(s.materialGrade==='LUXURY'?' selected':'')+'>럭셔리</option></select></div>'+
      '<div class="field"><label class="field-label">난이도</label>'+
      '<select id="d-diff"><option value="NORMAL"'+(s.difficulty==='NORMAL'?' selected':'')+'>보통</option>'+
      '<option value="HARD"'+(s.difficulty==='HARD'?' selected':'')+'>높음</option>'+
      '<option value="VERY_HARD"'+(s.difficulty==='VERY_HARD'?' selected':'')+'>최고</option></select></div></div>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:6px">삭제 (Del)</button>'+
      (SPACE_TYPES[s.type].waterproof?
        '<div style="margin-top:10px;padding:8px;background:rgba(91,160,212,0.08);border:1px solid rgba(91,160,212,0.3);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#5BA0D4">방수 적용 여부</div>'+
        '<div style="display:flex;gap:4px">'+
        '<button class="btn sm'+(s.waterproofApplied===true?' active':'')+'" id="wp-yes" style="flex:1'+(s.waterproofApplied===true?';background:rgba(91,160,212,0.25);border-color:#5BA0D4;color:#5BA0D4':'')+'" >✓ 적용</button>'+
        '<button class="btn sm'+(s.waterproofApplied===false?' active':'')+'" id="wp-no"  style="flex:1'+(s.waterproofApplied===false?';background:rgba(226,114,91,0.2);border-color:#E2725B;color:#E2725B' :'')+'" >✗ 미적용</button>'+
        '<button class="btn sm'+(s.waterproofApplied==null?' active':'')+'"  id="wp-null" style="flex:1'+(s.waterproofApplied==null ?';background:rgba(201,169,97,0.15);border-color:var(--gold);color:var(--gold)':'')+'" >? 미결정</button>'+
        '</div></div>' : '');
    document.getElementById('d-name').addEventListener('change',e=>{s.name=e.target.value;renderAll();refreshUI();});
    document.getElementById('d-type').addEventListener('change',e=>{
      s.type=e.target.value;
      // v5.8: 타입 변경 시 자재 기본값 자동 갱신 (사용자 미설정 시)
      const dm=defaultMaterials(s.type);
      s.floorMaterial=dm.floor;
      STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine).forEach(w=>w.finishMaterial=dm.wall);
      renderAll();refreshUI();
    });
    document.getElementById('d-ch').addEventListener('change',e=>{s.ceilingHeight_mm=e.target.value?parseInt(e.target.value):null;refreshUI();});
    document.getElementById('d-floor').addEventListener('change',e=>{s.floorMaterial=e.target.value;saveHistory();refreshUI();showStatus('바닥재: '+FLOOR_MATERIALS[e.target.value].name);});
    document.getElementById('d-grade').addEventListener('change',e=>{s.materialGrade=e.target.value;refreshUI();});
    document.getElementById('d-diff').addEventListener('change',e=>{s.difficulty=e.target.value;refreshUI();});
    document.getElementById('d-del').addEventListener('click',deleteSelected);
    if(SPACE_TYPES[s.type].waterproof){
      const setWP=v=>{s.waterproofApplied=v;saveHistory();refreshUI();};
      document.getElementById('wp-yes').addEventListener('click',()=>setWP(true));
      document.getElementById('wp-no').addEventListener('click',()=>setWP(false));
      document.getElementById('wp-null').addEventListener('click',()=>setWP(null));
    }
    stats.style.display='block';warn.style.display='block';
    document.getElementById('cell-floor').textContent=spArea(s).toFixed(2);
    document.getElementById('cell-ceiling').textContent=spArea(s).toFixed(2);
    document.getElementById('cell-wall').textContent=spWall(s).toFixed(2);
    document.getElementById('cell-peri').textContent=spPeri(s).toFixed(2);
    const ws=computeWarns(s);
    document.getElementById('detail-warns').innerHTML=ws.length===0?'<div class="warn success">✓ 입력 완료</div>':ws.map(w=>'<div class="warn '+w.lv+'">'+w.msg+'</div>').join('');
  }
  else if(STATE.selectedKind==='opening'){
    // *** 문/창 W×H×D 편집 ***
    const o=STATE.openings.find(x=>x.id===STATE.selectedId);
    if(!o) return;
    const isDoor=o.type==='DOOR';
    const lib=isDoor?DOOR_TYPES:WINDOW_TYPES;
    const sub=lib[o.subType]||Object.values(lib)[0];
    dc.innerHTML=
      '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">'+(isDoor?'문':'창')+'</strong></p>'+
      '<div class="field"><label class="field-label">'+(isDoor?'문 종류':'창 종류')+'</label>'+
      '<select id="d-subtype">'+Object.entries(lib).map(([k,d])=>'<option value="'+k+'"'+(k===o.subType?' selected':'')+'>'+d.name+'</option>').join('')+'</select></div>'+
      '<div class="field-row-3">'+
      '<div class="field"><label class="field-label">가로 W (mm)</label><input type="number" id="d-w" value="'+o.width_mm+'" step="50"></div>'+
      '<div class="field"><label class="field-label">세로 H (mm)</label><input type="number" id="d-h" value="'+o.height_mm+'" step="50"></div>'+
      '<div class="field"><label class="field-label">뎁스 D (mm)</label><input type="number" id="d-d" value="'+o.depth_mm+'" step="10"></div>'+
      '</div>'+
      (!isDoor?'<div class="field"><label class="field-label">창대 높이 (mm) — 바닥에서</label><input type="number" id="d-sill" value="'+(o.sillHeight_mm||0)+'" step="50"></div>':'')+
      (isDoor?'<div class="field"><label class="field-label">벽면 차감</label>'+
      '<div class="align-toggle" id="d-subtract-toggle" role="group" aria-label="도어 차감 모드">'+
      '<button type="button" class="align-btn'+((o.subtractMode||'double')==='single'?' active':'')+'" data-sub="single" title="단면차감 — 외부문(현관·발코니) 등">단면</button>'+
      '<button type="button" class="align-btn'+((o.subtractMode||'double')==='double'?' active':'')+'" data-sub="double" title="양면차감 — 내부문(방문·미닫이) 등 양쪽 모두 마감 차감">양면</button>'+
      '</div></div>':'')+
      '<div class="field"><label class="field-label">회전 (°) — 0~359</label>'+
      '<input type="number" id="d-angle" value="'+Math.round(o.angle||0)+'" step="1" min="-360" max="360"></div>'+
      '<div class="hint">통상값 자동 적용. 회전은 벽 가까이 추가 시 자동 정렬됨.</div>'+
      (!(o.spaceId&&STATE.spaces.some(s=>s.id===o.spaceId))?'<div class="warn warning" style="margin-top:6px">⚠ 벽 미부착 — 공간 모서리나 벽 가까이 재배치하세요.</div>':'')+
      '<div style="display:flex;gap:4px;margin-top:6px">'+
      '<button class="btn sm" id="d-rot-90" style="flex:1">+90°</button>'+
      '<button class="btn sm" id="d-rot-m90" style="flex:1">−90°</button>'+
      '<button class="btn sm" id="d-rot-180" style="flex:1">180°</button>'+
      '<button class="btn sm" id="d-flip" style="flex:1'+(o.flipped?';background:rgba(201,169,97,0.18);border-color:var(--gold);color:var(--gold)':'')+'" title="힌지 좌우 반전">↔ 반전</button>'+
      '</div>'+
      '<button class="btn sm" id="d-dup" style="width:100%;margin-top:5px">복제</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>';
    document.getElementById('d-subtype').addEventListener('change',e=>{
      o.subType=e.target.value;
      const def=lib[o.subType];
      // 통상값 자동 적용
      o.width_mm=def.w;o.height_mm=def.h;o.depth_mm=def.d;
      if(!isDoor) o.sillHeight_mm=def.sill;
      saveHistory();renderAll();refreshUI();
    });
    document.getElementById('d-w').addEventListener('change',e=>{o.width_mm=parseInt(e.target.value);saveHistory();renderAll();refreshUI();});
    document.getElementById('d-h').addEventListener('change',e=>{o.height_mm=parseInt(e.target.value);saveHistory();refreshUI();});
    document.getElementById('d-d').addEventListener('change',e=>{o.depth_mm=parseInt(e.target.value);saveHistory();refreshUI();});
    if(!isDoor){
      const sf=document.getElementById('d-sill');
      if(sf) sf.addEventListener('change',e=>{o.sillHeight_mm=parseInt(e.target.value);saveHistory();refreshUI();});
    }
    document.getElementById('d-angle').addEventListener('change',e=>{
      const v=parseFloat(e.target.value);
      if(isFinite(v)){o.angle=((v%360)+360)%360;saveHistory();renderAll();refreshUI();}
    });
    document.getElementById('d-rot-90').addEventListener('click',()=>{o.angle=((o.angle||0)+90)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-rot-m90').addEventListener('click',()=>{o.angle=((o.angle||0)-90+360)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-rot-180').addEventListener('click',()=>{o.angle=((o.angle||0)+180)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-flip').addEventListener('click',()=>{o.flipped=!o.flipped;saveHistory();renderAll();refreshUI();});
    // v5.9: 도어 차감 모드 토글
    const subToggle=document.getElementById('d-subtract-toggle');
    if(subToggle){
      subToggle.querySelectorAll('.align-btn').forEach(b=>{
        b.addEventListener('click',()=>{
          o.subtractMode=b.dataset.sub;
          saveHistory();refreshUI();
          showStatus('차감 모드: '+(o.subtractMode==='double'?'양면 (×2)':'단면 (×1)'));
        });
      });
    }
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
  else if(STATE.selectedKind==='wall'){
    const w=STATE.walls.find(x=>x.id===STATE.selectedId);
    if(!w) return;
    dc.innerHTML=
      '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">벽</strong></p>'+
      '<div class="field"><label class="field-label">벽 마감재</label>'+
      '<select id="d-wmat">'+
      '<option value=""'+(w.finishMaterial?'':' selected')+'>미정</option>'+
      Object.entries(WALL_MATERIALS).map(([k,m])=>'<option value="'+k+'"'+(k===w.finishMaterial?' selected':'')+'>'+m.name+'</option>').join('')+
      '</select></div>'+
      '<div class="field"><label class="field-label">개별 높이 (mm)</label>'+
      '<input type="number" id="d-wh" value="'+(w.height_mm||'')+'" placeholder="공간 천장고 따름" step="50"></div>'+
      '<div class="field"><label class="field-label">두께 (mm)</label>'+
      '<input type="number" id="d-wthick" value="'+(w.thickness||100)+'" step="10"></div>'+
      '<button class="btn sm" id="d-dup" style="width:100%;margin-top:6px">복제</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>';
    document.getElementById('d-wmat').addEventListener('change',e=>{w.finishMaterial=e.target.value||null;saveHistory();refreshUI();showStatus('벽 마감재: '+(WALL_MATERIALS[e.target.value]?.name||'미정'));});
    document.getElementById('d-wh').addEventListener('change',e=>{w.height_mm=e.target.value?parseInt(e.target.value):null;saveHistory();refreshUI();});
    document.getElementById('d-wthick').addEventListener('change',e=>{w.thickness=parseInt(e.target.value)||100;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
  else{
    const kn={wall:'벽',furniture:'가구',fixtures:'위생/주방',lights:'조명',electric:'전기',texts:'텍스트',measures:'치수'};
    const arr=getArr(STATE.selectedKind);
    const obj=arr?arr.find(x=>x.id===STATE.selectedId):null;
    const hasAngle=obj&&'angle' in obj;
    let extraHtml='';
    if(hasAngle){
      extraHtml=
        '<div class="field"><label class="field-label">회전 (°)</label>'+
        '<input type="number" id="d-angle" value="'+Math.round(obj.angle||0)+'" step="1" min="-360" max="360"></div>'+
        '<div style="display:flex;gap:4px;margin-top:6px">'+
        '<button class="btn sm" id="d-rot-90" style="flex:1">+90°</button>'+
        '<button class="btn sm" id="d-rot-m90" style="flex:1">−90°</button>'+
        '<button class="btn sm" id="d-rot-180" style="flex:1">180°</button>'+
        '</div>';
    }
    dc.innerHTML='<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">'+kn[STATE.selectedKind]+'</strong></p>'+
      extraHtml+
      '<button class="btn sm" id="d-dup" style="width:100%;margin-top:6px">복제</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>';
    if(hasAngle){
      document.getElementById('d-angle').addEventListener('change',e=>{
        const v=parseFloat(e.target.value);
        if(isFinite(v)){obj.angle=((v%360)+360)%360;saveHistory();renderAll();refreshUI();}
      });
      document.getElementById('d-rot-90').addEventListener('click',()=>{obj.angle=((obj.angle||0)+90)%360;saveHistory();renderAll();refreshUI();});
      document.getElementById('d-rot-m90').addEventListener('click',()=>{obj.angle=((obj.angle||0)-90+360)%360;saveHistory();renderAll();refreshUI();});
      document.getElementById('d-rot-180').addEventListener('click',()=>{obj.angle=((obj.angle||0)+180)%360;saveHistory();renderAll();refreshUI();});
    }
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
}
function computeWarns(s){
  const out=[];
  if(SPACE_TYPES[s.type].waterproof){
    if(s.waterproofApplied==null) out.push({lv:'warning',msg:'⚠ 방수 미결정 — 아래에서 적용 여부를 선택하세요.'});
    else if(s.waterproofApplied===true) out.push({lv:'success',msg:'✓ 방수 적용 확정.'});
  }
  if(!s.ceilingHeight_mm) out.push({lv:'warning',msg:'천장고 미입력.<div class="pre">NEEDS_CONFIRMATION</div>'});
  if(s.polygon.length>4) out.push({lv:'warning',msg:'다각형 '+s.polygon.length+'각.'});
  const a=spArea(s);
  if(a<1) out.push({lv:'critical',msg:'면적 비정상: '+a.toFixed(2)+'㎡'});
  if(a>100) out.push({lv:'warning',msg:'면적 매우 큼: '+a.toFixed(2)+'㎡'});
  return out;
}

// *** 견적 카탈로그 24종 (요구사항 #5) ***
function refreshEstimate(){
  let tf=0,tw=0,tp=0,twa=0;
  STATE.spaces.forEach(s=>{tf+=spArea(s);tw+=spWall(s);tp+=spPeri(s);if(s.waterproofApplied===true) twa+=spArea(s);});
  // 공간 미소속 독립 벽도 총 벽 면적에 포함 — v5.9: 내력벽은 KPI 제외
  STATE.walls.filter(w=>!w.spaceId&&!w.isLine&&w.wallType!=='bearing').forEach(w=>{
    const len=Math.hypot((w.x2||0)-(w.x1||0),(w.y2||0)-(w.y1||0))/1000;
    tw+=len*STATE.ceilingHeight/1000;
  });
  document.getElementById('t-floor').textContent=tf.toFixed(2);
  document.getElementById('t-wall').textContent=tw.toFixed(2);
  document.getElementById('t-ceiling').textContent=tf.toFixed(2);
  document.getElementById('t-peri').textContent=tp.toFixed(2);
  document.getElementById('t-water').textContent=twa.toFixed(2);
  document.getElementById('t-open').textContent=STATE.openings.length;
  document.getElementById('t-door').textContent=STATE.openings.filter(o=>o.type==='DOOR').length;
  document.getElementById('t-window').textContent=STATE.openings.filter(o=>o.type==='WINDOW').length;
  
  // v5.8: t-table을 공정별 합산으로 변경 (요구사항 #4 — 공간별 X, 공정별 O)
  document.getElementById('t-table').innerHTML=CAT_ORDER.map(cat=>{
    const items=Object.entries(CATALOG).filter(([k,c])=>c.cat===cat);
    const rows=items.map(([k,c])=>{
      const qty=computeQty(k,c);
      if(qty<=0&&!(c.applies==='set'&&isCatalogApplicable(c))) return null;
      const qtyStr=(c.unit==='식'||c.unit==='세트'||c.unit==='개'||c.unit==='톤')?qty.toFixed(0):qty.toFixed(2);
      const applicable=c.spaces?STATE.spaces.filter(s=>c.spaces.includes(s.type)).length:STATE.spaces.length;
      return '<tr><td>'+c.name+'</td><td style="color:var(--text-tertiary)">'+cat+'</td>'+
        '<td class="r"><span class="num">'+qtyStr+'</span> '+c.unit+'</td>'+
        '<td class="r">'+applicable+'</td></tr>';
    }).filter(Boolean);
    return rows.join('');
  }).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:12px">공간 추가 시 자동 산출</td></tr>';
  
  // 카탈로그 — 카테고리별 그룹
  const catalog=document.getElementById('t-catalog');
  let html='';
  CAT_ORDER.forEach(cat=>{
    const items=Object.entries(CATALOG).filter(([k,c])=>c.cat===cat);
    const visibleItems=items.filter(([k,c])=>{
      const qty=computeQty(k,c);
      return qty>0||c.applies==='set'&&isCatalogApplicable(c);
    });
    if(visibleItems.length===0) return;
    html+='<div class="cat-group"><div class="cat-title">'+cat+'</div>';
    visibleItems.forEach(([k,c])=>{
      const qty=computeQty(k,c);
      const cfg=STATE.estimateConfig[k]||{};
      const selectedOpt=cfg.option||(c.options?Object.keys(c.options)[0]:'');
      const tagClass='tag-'+c.tag.toLowerCase();
      const qtyStr=c.unit==='식'||c.unit==='세트'||c.unit==='개'||c.unit==='톤'?qty.toFixed(0):qty.toFixed(2);
      html+='<div class="est-row">';
      html+='<div class="est-row-head">';
      html+='<span class="est-row-name">'+c.name+'</span>';
      html+='<span class="proc-tag '+tagClass+'">'+c.tag+'</span>';
      html+='</div>';
      html+='<div class="est-row-options">';
      html+='<span class="est-row-qty">'+qtyStr+' '+c.unit+'</span>';
      if(c.options){
        html+='<select data-cat="'+k+'">';
        Object.entries(c.options).forEach(([ok,oname])=>{
          html+='<option value="'+ok+'"'+(ok===selectedOpt?' selected':'')+'>'+oname+'</option>';
        });
        html+='</select>';
      }
      html+='<span class="est-price">단가 NEEDS_RESEARCH</span>';
      html+='</div>';
      html+='</div>';
    });
    html+='</div>';
  });
  if(html===''){html='<p style="color:var(--text-tertiary);font-size:11px;text-align:center;padding:20px">공간 추가 시 자동</p>';}
  catalog.innerHTML=html;
  catalog.querySelectorAll('select[data-cat]').forEach(sel=>{
    sel.addEventListener('change',e=>{
      const k=e.target.dataset.cat;
      if(!STATE.estimateConfig[k]) STATE.estimateConfig[k]={};
      STATE.estimateConfig[k].option=e.target.value;
      saveHistory();refreshJSON();
    });
  });

  const aw=[];
  STATE.spaces.forEach(s=>computeWarns(s).forEach(w=>aw.push({lv:w.lv,msg:'['+escapeHtml(s.name)+'] '+w.msg})));
  if(STATE.spaces.length===0) aw.push({lv:'warning',msg:'공간 없음.'});
  if(tf>0&&STATE.openings.length===0) aw.push({lv:'warning',msg:'⚠ 개구부 0개. 벽 면적 정확도 ↓.'});
  document.getElementById('t-warns').innerHTML=aw.length===0?'<div class="warn success">✓ 견적 입력 준비 완료. 단가 = UNKNOWN/NEEDS_RESEARCH.</div>':aw.map(w=>'<div class="warn '+w.lv+'">'+w.msg+'</div>').join('');
}

function isCatalogApplicable(c){
  if(!c.spaces) return true;
  return STATE.spaces.some(s=>c.spaces.includes(s.type));
}
function computeQty(catKey,c){
  let qty=0;
  if(c.applies==='floor'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spArea(s);
    });
  }else if(c.applies==='wall'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spWall(s);
    });
  }else if(c.applies==='ceiling'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spArea(s);
    });
  }else if(c.applies==='perimeter'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spPeri(s);
    });
  }else if(c.applies==='partial'){
    const factor=c.partialFactor||0.5;
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spPeri(s)*factor;
    });
  }else if(c.applies==='set'){
    if(c.spaces) qty=STATE.spaces.filter(s=>c.spaces.includes(s.type)).length;
    else qty=1;
  }else if(c.applies==='count_doors'){
    qty=STATE.openings.filter(o=>o.type==='DOOR').length;
  }else if(c.applies==='count_windows'){
    qty=STATE.openings.filter(o=>o.type==='WINDOW').length;
  }else if(c.applies==='count_lights'){
    qty=STATE.lights.length;
  }else if(c.applies==='count_electric'){
    qty=STATE.electric.length;
  }
  return qty;
}

function showFinishMenu(kind,obj,cx,cy){
  const menu=document.getElementById('finish-ctx-menu');
  const titleEl=document.getElementById('finish-ctx-title');
  const itemsEl=document.getElementById('finish-ctx-items');
  itemsEl.innerHTML='';
  function makeSection(label,materials,currentCode,surfaceKey){
    const sec=document.createElement('div');
    const hdr=document.createElement('div');
    hdr.style.cssText='padding:5px 13px 3px;color:#6b7a99;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;';
    hdr.textContent=label;
    sec.appendChild(hdr);
    Object.values(materials).forEach(m=>{
      const btn=document.createElement('button');
      const active=m.code===currentCode;
      btn.style.cssText='display:block;width:100%;text-align:left;padding:7px 14px 7px 18px;background:none;border:none;color:'+(active?'#C9A961':'#C8C2B4')+';cursor:pointer;font-size:12px;font-family:Inter,sans-serif;white-space:nowrap;';
      btn.textContent=(active?'✓ ':'')+m.name;
      btn.addEventListener('mouseenter',()=>{btn.style.background='rgba(255,255,255,0.07)';});
      btn.addEventListener('mouseleave',()=>{btn.style.background='none';});
      btn.addEventListener('click',()=>{applyFinish(kind,obj,surfaceKey,m.code);menu.style.display='none';});
      sec.appendChild(btn);
    });
    return sec;
  }
  if(kind==='wall'){
    titleEl.textContent='벽 마감재';
    itemsEl.appendChild(makeSection('벽 마감재',WALL_MATERIALS,obj.finishMaterial||'UNDECIDED','finishMaterial'));
  }else if(kind==='space'){
    titleEl.textContent=obj.name+' 마감재';
    itemsEl.appendChild(makeSection('바닥재',FLOOR_MATERIALS,obj.floorMaterial||'UNDECIDED','floorMaterial'));
    const div=document.createElement('div');
    div.style.cssText='height:1px;background:#2e3347;margin:4px 0;';
    itemsEl.appendChild(div);
    itemsEl.appendChild(makeSection('천정재',CEILING_MATERIALS,obj.ceilingMaterial||'GYPSUM','ceilingMaterial'));
  }
  menu.style.display='block';
  const mw=menu.offsetWidth,mh=menu.offsetHeight;
  let x=cx,y=cy;
  if(x+mw>window.innerWidth) x=window.innerWidth-mw-8;
  if(y+mh>window.innerHeight) y=window.innerHeight-mh-8;
  menu.style.left=x+'px';menu.style.top=y+'px';
}
function applyFinish(kind,obj,surfaceKey,materialCode){
  obj[surfaceKey]=materialCode;
  saveHistory();
  selectObj(kind,obj.id);
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab==='material'));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('active',x.dataset.tabContent==='material'));
  renderAll();refreshUI();
  const map={floorMaterial:['바닥재',FLOOR_MATERIALS],ceilingMaterial:['천정재',CEILING_MATERIALS],finishMaterial:['벽 마감재',WALL_MATERIALS]};
  const [label,dict]=map[surfaceKey]||['마감재',{}];
  showStatus(label+': '+(dict[materialCode]?.name||materialCode));
}
// 외부 클릭 시 컨텍스트 메뉴 닫기
document.addEventListener('mousedown',e=>{
  const menu=document.getElementById('finish-ctx-menu');
  if(menu&&menu.style.display!=='none'&&!menu.contains(e.target)) menu.style.display='none';
});

function refreshMaterial(){
  const md=document.getElementById('material-detail');
  function finishRow(label,name){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px;">'+
      '<span style="color:var(--text-tertiary)">'+label+'</span>'+
      '<span style="color:var(--text-primary);font-weight:500">'+name+'</span></div>';
  }
  if(STATE.selectedKind==='space'&&STATE.selectedId){
    const s=STATE.spaces.find(x=>x.id===STATE.selectedId);
    if(s){
      if(!s.ceilingMaterial) s.ceilingMaterial='GYPSUM';
      md.innerHTML=
        '<p style="font-size:11px;margin-bottom:8px">선택: <strong style="color:var(--gold)">'+escapeHtml(s.name)+'</strong></p>'+
        finishRow('바닥재',FLOOR_MATERIALS[s.floorMaterial]?.name||s.floorMaterial||'미정')+
        finishRow('벽 마감재',(()=>{const ws=STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine);const mats=[...new Set(ws.map(w=>w.finishMaterial).filter(Boolean))];return mats.length===0?'미정':mats.length===1?(WALL_MATERIALS[mats[0]]?.name||mats[0]):'('+mats.length+'종 혼합)'})())+
        finishRow('천정재',CEILING_MATERIALS[s.ceilingMaterial]?.name||s.ceilingMaterial||'미정')+
        '<p style="font-size:10px;color:var(--text-tertiary);margin:8px 0 4px">우클릭으로 마감재 변경</p>'+
        '<div class="field" style="margin-top:8px"><label class="field-label">공간 컬러</label>'+
        '<input type="color" id="mat-color" value="'+(s.materialColor?s.materialColor.substring(0,7):'#C9A961')+'" style="width:100%;height:32px;cursor:pointer"></div>'+
        '<button class="btn sm" id="mat-clear" style="width:100%;margin-top:4px">기본 색상으로</button>';
      document.getElementById('mat-color').addEventListener('change',e=>{s.materialColor=e.target.value+'66';renderAll();});
      document.getElementById('mat-clear').addEventListener('click',()=>{s.materialColor=null;renderAll();refreshMaterial();});
    }
  }else if(STATE.selectedKind==='wall'&&STATE.selectedId){
    const w=STATE.walls.find(x=>x.id===STATE.selectedId);
    if(w){
      md.innerHTML=
        '<p style="font-size:11px;margin-bottom:8px">벽 선택됨</p>'+
        finishRow('벽 마감재',WALL_MATERIALS[w.finishMaterial]?.name||'미정')+
        '<p style="font-size:10px;color:var(--text-tertiary);margin-top:8px">우클릭으로 마감재 변경</p>';
    }
  }else{
    md.innerHTML='<p style="font-size:11px;color:var(--text-tertiary)">벽 또는 공간을 우클릭하여<br>마감재를 지정하세요</p>';
  }
  document.getElementById('color-palette').innerHTML=COLOR_PALETTES.map(p=>
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:6px;background:var(--bg-tertiary);border-radius:3px">'+
    '<div style="display:flex;border-radius:2px;overflow:hidden;width:60px;height:24px">'+
    '<div style="flex:6;background:'+p.primary+'"></div>'+
    '<div style="flex:3;background:'+p.secondary+'"></div>'+
    '<div style="flex:1;background:'+p.accent+'"></div></div>'+
    '<span style="font-size:11px">'+p.name+'</span></div>').join('');
}

// ===== JSON =====
// v5.8: 라이브러리 type → AI 친화 영문 키워드/시맨틱 태그 매핑 (75종 전체 — v5.8 완성)
// 저작권: promptKeyword에 브랜드명 금지. 일반명사만 사용 (헌법 준수)
const SEMANTIC_MAP={
  // ===== FURNITURE_LIB (25종) =====
  sofa3:{tag:'main_seating',kw:'large 3-seat sofa, beige leather'},
  sofa2:{tag:'main_seating',kw:'2-seat sofa, beige leather'},
  sofa1:{tag:'accent_chair',kw:'single armchair'},
  coffee:{tag:'coffee_table',kw:'rectangular wood coffee table'},
  tv_stand:{tag:'media_console',kw:'low TV console, dark wood'},
  bookshelf:{tag:'storage',kw:'open bookshelf, wood'},
  piano:{tag:'instrument',kw:'upright piano, black'},
  rug:{tag:'rug',kw:'large area rug'},
  plant:{tag:'plant',kw:'potted indoor plant'},
  bed_d:{tag:'sleeping',kw:'double bed with headboard'},
  bed_s:{tag:'sleeping',kw:'single bed'},
  bed_k:{tag:'sleeping',kw:'king bed with headboard'},
  nightstand:{tag:'side_table',kw:'bedside nightstand'},
  wardrobe:{tag:'wardrobe',kw:'large 4-door wardrobe'},
  dressing_table:{tag:'vanity',kw:'dressing table with mirror'},
  mirror:{tag:'mirror',kw:'full-length floor mirror'},
  desk:{tag:'desk',kw:'work desk'},
  desk_l:{tag:'desk',kw:'L-shaped work desk'},
  office_chair:{tag:'chair',kw:'swivel office chair'},
  dining4:{tag:'dining_table',kw:'rectangular dining table for 4'},
  dining6:{tag:'dining_table',kw:'rectangular dining table for 6'},
  dining_round:{tag:'dining_table',kw:'round dining table'},
  chair:{tag:'chair',kw:'dining chair'},
  bar_stool:{tag:'chair',kw:'bar stool'},
  treadmill:{tag:'exercise',kw:'treadmill, fitness equipment'},
  // ===== FIXTURE_LIB (20종) =====
  toilet:{tag:'sanitary',kw:'modern wall-hung toilet'},
  toilet_round:{tag:'sanitary',kw:'round-bowl toilet'},
  bidet:{tag:'sanitary',kw:'bidet fixture'},
  sink_b:{tag:'sanitary',kw:'wall-hung washbasin'},
  sink_b_oval:{tag:'sanitary',kw:'oval washbasin'},
  bathtub:{tag:'sanitary',kw:'freestanding bathtub'},
  bathtub_corner:{tag:'sanitary',kw:'corner bathtub'},
  shower:{tag:'sanitary',kw:'shower enclosure with glass door'},
  shower_corner:{tag:'sanitary',kw:'corner shower enclosure with glass'},
  sink_k:{tag:'kitchen',kw:'single-bowl stainless steel kitchen sink'},
  sink_k_double:{tag:'kitchen',kw:'double-bowl stainless steel kitchen sink'},
  stove:{tag:'kitchen',kw:'4-burner gas stove'},
  induction:{tag:'kitchen',kw:'4-zone induction cooktop'},
  oven:{tag:'kitchen',kw:'built-in oven'},
  microwave:{tag:'kitchen',kw:'countertop microwave oven'},
  fridge:{tag:'kitchen',kw:'tall refrigerator'},
  fridge_2door:{tag:'kitchen',kw:'side-by-side double-door refrigerator'},
  dishwasher:{tag:'kitchen',kw:'built-in dishwasher'},
  washer:{tag:'laundry',kw:'front-load washing machine'},
  dryer:{tag:'laundry',kw:'clothes dryer'},
  // ===== LIGHT_LIB (8종) =====
  ceiling:{tag:'ceiling_light',kw:'flush-mount ceiling light fixture'},
  downlight:{tag:'ceiling_light',kw:'recessed downlight'},
  pendant:{tag:'pendant',kw:'pendant light'},
  chandelier:{tag:'chandelier',kw:'chandelier'},
  wall_lamp:{tag:'wall_light',kw:'wall sconce light'},
  floor_lamp:{tag:'floor_lamp',kw:'floor standing lamp'},
  track:{tag:'track_light',kw:'ceiling track lighting'},
  fluorescent:{tag:'ceiling_light',kw:'fluorescent ceiling strip light'},
  // ===== ELECTRIC_LIB (11종) =====
  outlet_w:{tag:'outlet',kw:'2-gang wall outlet'},
  outlet_w4:{tag:'outlet',kw:'4-gang wall outlet'},
  outlet_f:{tag:'outlet',kw:'floor outlet'},
  switch_1:{tag:'switch',kw:'single light switch'},
  switch_2:{tag:'switch',kw:'2-gang light switch'},
  switch_3:{tag:'switch',kw:'3-gang light switch'},
  internet:{tag:'data_outlet',kw:'internet and TV outlet panel'},
  ac:{tag:'split_ac',kw:'wall-mounted split air conditioner'},
  ac_floor:{tag:'split_ac',kw:'floor-standing split air conditioner'},
  intercom:{tag:'intercom',kw:'intercom panel'},
  boiler_ctrl:{tag:'boiler_control',kw:'boiler control panel'},
  // ===== HVAC_FIRE_LIB (15종) =====
  ac_ceiling:{tag:'system_ac',kw:'ceiling cassette air conditioning unit'},
  diffuser:{tag:'ac_diffuser',kw:'ceiling air diffuser'},
  vent_fan:{tag:'ventilation',kw:'ceiling exhaust ventilation fan'},
  hood:{tag:'kitchen',kw:'kitchen range hood'},
  hvac_grille:{tag:'ventilation',kw:'ceiling HVAC supply grille'},
  sprinkler:{tag:'fire_sprinkler',kw:'ceiling sprinkler head'},
  sprinkler_side:{tag:'fire_sprinkler',kw:'sidewall sprinkler head'},
  smoke_detector:{tag:'smoke_detector',kw:'ceiling smoke detector'},
  heat_detector:{tag:'heat_detector',kw:'ceiling heat detector'},
  emerg_light:{tag:'emergency_light',kw:'emergency exit light'},
  exit_sign:{tag:'emergency_light',kw:'emergency exit sign'},
  fire_ext:{tag:'fire_extinguisher',kw:'wall-mounted fire extinguisher'},
  hydrant:{tag:'fire_hydrant',kw:'indoor fire hydrant cabinet'},
  emerg_bell:{tag:'fire_alarm',kw:'fire alarm bell'},
  auto_ext:{tag:'fire_suppression',kw:'automatic fire suppression unit'},
};
function semanticOf(type){return SEMANTIC_MAP[type]||{tag:'generic',kw:type};}

// v5.7: 가구 등 객체가 어느 공간에 포함되는지 자동 산정 (point-in-polygon)
function findContainingSpace(p){
  for(const s of STATE.spaces){
    if(pointInPolygon(p,s.polygon)) return s.id;
  }
  return null;
}
function pointInPolygon(p,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    const intersect=((yi>p.y)!==(yj>p.y))&&(p.x<(xj-xi)*(p.y-yi)/(yj-yi+1e-9)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

// v5.7: 가구의 placement (8방위) 자동 산정 — 공간 중심 기준 객체 위치
function placementOf(o,sp){
  if(!sp||!sp.polygon||sp.polygon.length===0) return 'unknown';
  let cx=0,cy=0;sp.polygon.forEach(p=>{cx+=p.x;cy+=p.y;});cx/=sp.polygon.length;cy/=sp.polygon.length;
  const dx=o.x-cx, dy=o.y-cy;
  const ang=Math.atan2(dy,dx)*180/Math.PI; // 화면 좌표는 y가 아래로 +이므로 'south'가 +y
  const d=Math.sqrt(dx*dx+dy*dy);
  if(d<300) return 'center';
  // 8방위 (north=위, south=아래, east=오른쪽, west=왼쪽)
  const dirs=[
    {min:-22.5,max:22.5,name:'east'},
    {min:22.5,max:67.5,name:'southeast'},
    {min:67.5,max:112.5,name:'south'},
    {min:112.5,max:157.5,name:'southwest'},
    {min:157.5,max:180,name:'west'},
    {min:-180,max:-157.5,name:'west'},
    {min:-157.5,max:-112.5,name:'northwest'},
    {min:-112.5,max:-67.5,name:'north'},
    {min:-67.5,max:-22.5,name:'northeast'},
  ];
  const found=dirs.find(d=>ang>=d.min&&ang<d.max);
  return 'in_'+(found?found.name:'center');
}

// v5.7: 도어를 가장 가까운 벽에 매핑 (parentId) — v5.9: 내력벽 제외
function findNearestWallId(o){
  let bestId=null,bestD=Infinity;
  STATE.walls.forEach(w=>{
    if(w.wallType==='bearing') return; // 내력벽은 도어/창 부착 대상 아님
    const d=pointToSegmentDist({x:o.x,y:o.y},{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<bestD){bestD=d;bestId=w.id;}
  });
  return bestD<500?bestId:null;
}

function buildJSON(){
  // v5.3: 레이어 매핑 자동 생성
  const layers={};
  const collect=(arr,defaultElem)=>arr.forEach(o=>{
    const ln=o.layerName||('A-'+defaultElem);
    if(!layers[ln]){
      const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null;
      layers[ln]={
        element:ln.split('-')[1]||defaultElem,
        spaceCode:sp?SPACE_TYPES[sp.type].code:null,
        spaceName:sp?sp.name:null,
        spaceType:sp?sp.type:null,
        color:sp?SPACE_TYPES[sp.type].color:'#C9A961',
        objectIds:[],
      };
    }
    layers[ln].objectIds.push(o.id);
  });
  STATE.spaces.forEach(s=>{
    const ln=s.layerName||('A-AREA-'+SPACE_TYPES[s.type].code);
    layers[ln]={element:'AREA',spaceCode:SPACE_TYPES[s.type].code,spaceName:s.name,
      spaceType:s.type,color:SPACE_TYPES[s.type].color,objectIds:[s.id]};
  });
  collect(STATE.walls,'WALL');
  collect(STATE.openings.filter(o=>o.type==='DOOR'),'DOOR');
  collect(STATE.openings.filter(o=>o.type==='WINDOW'),'WIND');
  collect(STATE.furniture,'FURN');collect(STATE.fixtures,'FIXT');
  collect(STATE.lights,'LITE');collect(STATE.electric,'ELEC');
  collect(STATE.hvac,'HVAC');
  collect(STATE.circles,'CIRC');collect(STATE.arcs,'ARC');

  // v5.7: 객체별 의미 태그/프롬프트 키워드/배치 자동 산정
  // v5.9: nameKo/nameEn 추가 — AI 파싱(T2I/T2V) 정확도 향상
  const _libByKind={FURN:typeof FURNITURE_LIB!=='undefined'?FURNITURE_LIB:{},FIXT:typeof FIXTURE_LIB!=='undefined'?FIXTURE_LIB:{},LITE:typeof LIGHT_LIB!=='undefined'?LIGHT_LIB:{},ELEC:typeof ELECTRIC_LIB!=='undefined'?ELECTRIC_LIB:{},HVAC:typeof HVAC_FIRE_LIB!=='undefined'?HVAC_FIRE_LIB:{}};
  const enrichLib=(arr,kindElem)=>arr.map(o=>{
    const sm=semanticOf(o.type);
    const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null
            ||STATE.spaces.find(s=>s.id===findContainingSpace({x:o.x,y:o.y}));
    const def=(_libByKind[kindElem]||{})[o.type]||{};
    return{
      ...o,
      flipped:!!o.flipped,
      nameKo:def.name||o.type,
      nameEn:def.nameEn||sm.kw||o.type,
      semanticTag:sm.tag,
      promptKeyword:def.nameEn||sm.kw,
      placement:placementOf(o,sp),
      parentSpaceId:sp?sp.id:'NEEDS_CONFIRMATION',
    };
  });

  // v5.7: 도어/창은 parentWallId 추가
  const enrichOpenings=STATE.openings.map(o=>({
    ...o,
    semanticTag:o.type==='DOOR'?'door':'window',
    promptKeyword:o.type==='DOOR'?'interior door':'window with view',
    parentWallId:findNearestWallId(o)||'NEEDS_CONFIRMATION',
    parentSpaceId:o.spaceId||'NEEDS_CONFIRMATION',
  }));

  // v5.7: 명시적 관계 그래프
  const relationships=[];
  enrichOpenings.forEach(o=>{
    if(o.parentWallId&&o.parentWallId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentWallId,type:'embedded_in_wall'});
    if(o.parentSpaceId&&o.parentSpaceId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentSpaceId,type:'opens_into_space'});
  });
  ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
    enrichLib(STATE[k]).forEach(o=>{
      if(o.parentSpaceId&&o.parentSpaceId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentSpaceId,type:'contained_in_space'});
    });
  });
  // 인접 공간(공유 도어로 연결된 두 공간)
  const doorPairs={};
  enrichOpenings.filter(o=>o.type==='DOOR').forEach(d=>{
    if(d.parentWallId&&d.parentWallId!=='NEEDS_CONFIRMATION'){
      doorPairs[d.parentWallId]=doorPairs[d.parentWallId]||[];
      if(d.parentSpaceId&&d.parentSpaceId!=='NEEDS_CONFIRMATION') doorPairs[d.parentWallId].push(d.parentSpaceId);
    }
  });

  // v5.7: 자동 폐곡면 감지 → JSON에 포함
  const autoCycles=findClosedCyclesInWalls()
    .filter(poly=>!STATE.spaces.some(s=>polygonsSimilar(s.polygon,poly)))
    .filter(poly=>polyArea(poly)/1e6>=0.5)
    .map((poly,i)=>({
      id:'autocycle_'+i,
      polygon:poly,
      area_m2:parseFloat((polyArea(poly)/1e6).toFixed(4)),
      semanticTag:'detected_closed_area',
      note:'자동 감지 폐곡면 — 명시적 공간 미등록',
    }));

  // v5.7: 색인 (byLayer / bySpace / byTag)
  const indices={
    byLayer:Object.fromEntries(Object.entries(layers).map(([k,v])=>[k,v.objectIds])),
    bySpace:{},
    byTag:{},
  };
  STATE.spaces.forEach(s=>{
    indices.bySpace[s.id]={
      walls:STATE.walls.filter(w=>w.spaceId===s.id).map(w=>w.id),
      openings:STATE.openings.filter(o=>o.spaceId===s.id).map(o=>o.id),
      furniture:STATE.furniture.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      fixtures:STATE.fixtures.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      lights:STATE.lights.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      electric:STATE.electric.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      hvac:STATE.hvac.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
    };
  });
  ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
    STATE[k].forEach(o=>{
      const tag=semanticOf(o.type).tag;
      indices.byTag[tag]=indices.byTag[tag]||[];
      indices.byTag[tag].push(o.id);
    });
  });

  // v5.8: 영상 시퀀스 — 사용자 지정 순서(videoSequenceOrder) 우선, 없으면 면적순 자동
  let seqSpaces;
  if(STATE.videoSequenceOrder&&STATE.videoSequenceOrder.length>0){
    seqSpaces=STATE.videoSequenceOrder
      .map(id=>STATE.spaces.find(s=>s.id===id))
      .filter(Boolean);
    // 순서에 없는 공간 뒤에 추가
    STATE.spaces.forEach(s=>{if(!seqSpaces.find(x=>x.id===s.id))seqSpaces.push(s);});
  }else{
    seqSpaces=[...STATE.spaces].sort((a,b)=>spArea(b)-spArea(a));
  }
  const CAMERA_MOVES=['establishing_wide','dolly_in','orbit_right','push_in','pan_across'];
  const walkthrough=seqSpaces.map((s,i)=>({
    spaceId:s.id,
    spaceName:s.name||SPACE_TYPES[s.type].name,
    dwell_sec:i===0?3:5,
    cameraMove:i===0?'establishing_wide':CAMERA_MOVES[1+(i-1)%4],
  }));

  // v5.9: 워터마크 — JSON 생성 시점·세션 ID·EULA 동의 시각 자동 삽입 (출처 추적용)
  const _eulaRaw=(typeof localStorage!=='undefined')?localStorage.getItem('ecorean_eula_accepted_v5_9'):null;
  let _eulaAt=null; try{_eulaAt=_eulaRaw?JSON.parse(_eulaRaw).at:null;}catch(e){}
  const _sessionId=(()=>{
    if(typeof sessionStorage==='undefined') return null;
    let s=sessionStorage.getItem('ecorean_session_id');
    if(!s){s='ses_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);sessionStorage.setItem('ecorean_session_id',s);}
    return s;
  })();
  return{
    schema:'ECOREAN.FloorPlan.v5.9',
    // v5.9: 저작권·라이선스 — JSON 파일 자체에 법적 효력 부여
    copyright:'© 2026 ECOREAN. All Rights Reserved.',
    license:'Proprietary — 무단 복제·배포·역공학 금지 (저작권법 §136 / 부정경쟁방지법 §18)',
    licenseContact:'udunext7@gmail.com',
    licenseWarning:'본 JSON 파일은 ECOREAN MiniCAD로 생성된 저작물입니다. 무단 사용 시 민·형사 책임이 발생합니다.',
    watermark:{
      generatedBy:'ECOREAN MiniCAD v5.9',
      sessionId:_sessionId,
      eulaAcceptedAt:_eulaAt,
      userAgent:(typeof navigator!=='undefined')?navigator.userAgent:null,
      generatedAt:new Date().toISOString(),
    },
    vertices:STATE.vertices,  // VEF: 공유 버텍스 원본
    meta:{
      project:STATE.projectName,
      unit:'mm',
      ceilingHeight_mm:STATE.ceilingHeight,
      wallThickness:STATE.wallThickness,
      drawnAt:new Date().toISOString(),
      tool:'ECOREAN MiniCAD v5.9',
      coordOrigin:{x:0,y:0,units:'mm',rotation_deg:0},
      layerNamingScheme:'A-{ELEMENT}-{SPACECODE}-{INDEX02}',
      elementCodes:['AREA','WALL','DOOR','WIND','FURN','FIXT','LITE','ELEC','HVAC','CIRC','ARC','DIMS','ANNO'],
      // v5.7: 차세대 AI 생성 파이프라인 SSoT 메타
      aiPromptHints:STATE.aiPromptHints,
      videoSequence:{
        walkthrough,
        totalDuration_sec:walkthrough.reduce((s,w)=>s+w.dwell_sec,0),
        suggestedFps:24,
        suggestedResolution:'1920x1080',
      },
      ssotPipeline:{
        purpose:'JSON → text-to-image prompts → T2I model (Midjourney/FLUX/SDXL) → renders → text-to-video prompts → T2V model (Sora/Veo/Runway) → walkthrough MP4',
        plus2D_active:STATE.plus2D,
        note:STATE.plus2D?'WARNING: 2.5D mode ON — for sales preview only, NOT for AI parsing':'OK: 평면 모드 — AI vision 친화 기본값',
      },
    },
    spaces:STATE.spaces.map(s=>({
      id:s.id,name:s.name,type:s.type,typeIndex:s.typeIndex||1,
      layerName:s.layerName||makeLayerName('AREA',s),
      ksCode:SPACE_TYPES[s.type].ks,
      code:SPACE_TYPES[s.type].code,
      color:SPACE_TYPES[s.type].color,
      polygon:s.polygon,
      holes:s.holes||[], // v5.9: 도넛 hole 배열 ([[{x,y},...], ...])
      vertexIds:s.vertexIds, // VEF 그래프 일관성
      ceilingHeight_mm:s.ceilingHeight_mm||STATE.ceilingHeight,
      materialGrade:s.materialGrade,difficulty:s.difficulty,
      waterproofRecommended:SPACE_TYPES[s.type].waterproof?'CONDITIONAL':false, // 헌법: AUTO 금지
      area_m2:parseFloat(spArea(s).toFixed(4)),
      perimeter_m:parseFloat(spPeri(s).toFixed(4)),
      wallArea_m2:parseFloat(spWall(s).toFixed(4)),
      // v5.8: 자재 선정 (사용자 드롭다운 입력)
      floorMaterial:s.floorMaterial||'UNDECIDED',
      floorMaterialName:FLOOR_MATERIALS[s.floorMaterial||'UNDECIDED'].name,
      // v5.7: AI 친화 시맨틱
      semanticTag:'space_'+SPACE_TYPES[s.type].code.toLowerCase(),
      promptDescriptor:(s.name||SPACE_TYPES[s.type].name)+', '+parseFloat(spArea(s).toFixed(2))+'sqm, '+SPACE_TYPES[s.type].code.toLowerCase(),
    })),
    walls:STATE.walls.map(w=>({
      ...w,
      wallType:w.wallType||'standard',
      alignment:w.alignment||'center',
      semanticTag:(w.wallType==='bearing')?'load_bearing_wall':(w.spaceId?'interior_partition':'free_wall'),
      promptKeyword:(w.wallType==='bearing')?'load-bearing structural wall (RC concrete)':'standard wall',
    })),
    openings:enrichOpenings,
    furniture:enrichLib(STATE.furniture,'FURN'),
    fixtures:enrichLib(STATE.fixtures,'FIXT'),
    lights:enrichLib(STATE.lights,'LITE'),
    electric:enrichLib(STATE.electric,'ELEC'),
    hvac:enrichLib(STATE.hvac,'HVAC'),
    texts:STATE.texts,measures:STATE.measures,
    circles:STATE.circles,arcs:STATE.arcs,
    curves:STATE.curves||[], // v5.9: 자유곡선 (Bezier)
    leaders:STATE.leaders, // v5.9
    pillars:STATE.pillars||[], // v5.9: 기둥 (RC)
    autoDetectedCycles:autoCycles, // v5.7
    relationships, // v5.7
    indices, // v5.7
    layers,
    estimateInput:buildEstimateInput(),
  };
}
function exportLightBIMJSON(){
  if(!window.LightBIM || !LightBIM.adapters || !LightBIM.adapters.miniCadStateAdapter){
    throw new Error('LightBIM core is not loaded');
  }
  const currentState=window.STATE || (typeof STATE!=='undefined'?STATE:{});
  const project=LightBIM.adapters.miniCadStateAdapter.normalizeMiniCadState(currentState);
  const quantities=LightBIM.quantityEngine.calculateProjectQuantities(project);
  project.quantities=quantities;
  const bocEstimateInput=LightBIM.adapters.bocEstimateAdapter.createBOCEstimateInput(project,quantities);
  const aiPromptHints=LightBIM.adapters.aiPromptAdapter.createAIPromptHints(project);
  return{
    schema:'ECOREAN.LightBIM.v0.1',
    project,
    quantities,
    bocEstimateInput,
    aiPromptHints,
  };
}

function downloadLightBIMJSON(){
  try{
    const bundle=exportLightBIMJSON();
    const safe=(STATE.projectName||'ecorean_minicad').replace(/[^a-z0-9가-힣_-]+/gi,'_');
    downloadText(JSON.stringify(bundle,null,2),safe+'_lightbim.json','application/json');
    showStatus('LightBIM JSON 내보내기 완료');
  }catch(error){
    console.error('[LightBIM] export failed',error);
    showStatus('LightBIM JSON 내보내기 실패');
  }
}
window.exportLightBIMJSON=exportLightBIMJSON;
window.downloadLightBIMJSON=downloadLightBIMJSON;
function buildEstimateInput(){
  const items=[];
  Object.entries(CATALOG).forEach(([k,c])=>{
    const qty=computeQty(k,c);
    if(qty<=0&&c.applies!=='set') return;
    const cfg=STATE.estimateConfig[k]||{};
    items.push({
      catalogKey:k,name:c.name,category:c.cat,
      unit:c.unit,quantity:parseFloat(qty.toFixed(4)),
      tag:c.tag,
      selectedOption:cfg.option||(c.options?Object.keys(c.options)[0]:null),
      optionName:cfg.option&&c.options?c.options[cfg.option]:(c.options?c.options[Object.keys(c.options)[0]]:null),
      unitPrice:'NEEDS_RESEARCH',
    });
  });
  let tf=0,tw=0,tp=0,twa=0;
  STATE.spaces.forEach(s=>{tf+=spArea(s);tw+=spWall(s);tp+=spPeri(s);if(s.waterproofApplied===true) twa+=spArea(s);});
  return{
    summary:{
      totalFloorArea_m2:parseFloat(tf.toFixed(4)),
      totalWallArea_m2:parseFloat(tw.toFixed(4)),
      totalCeilingArea_m2:parseFloat(tf.toFixed(4)),
      totalPerimeter_m:parseFloat(tp.toFixed(4)),
      waterproofArea_m2:parseFloat(twa.toFixed(4)),
      doorCount:STATE.openings.filter(o=>o.type==='DOOR').length,
      windowCount:STATE.openings.filter(o=>o.type==='WINDOW').length,
      lightCount:STATE.lights.length,
      electricCount:STATE.electric.length,
      pyeong:parseFloat((tf*0.3025).toFixed(2)),
    },
    catalogItems:items,
    rules:{
      waterproof:'CONDITIONAL_ONLY',
      autoEstimate:'FORBIDDEN',
      unitPriceSource:'EXTERNAL_BOC_MASTER_DB_REQUIRED',
      needsConfirmation:STATE.spaces.filter(s=>!s.ceilingHeight_mm).map(s=>({spaceId:s.id,field:'ceilingHeight_mm',reason:'천장고 미입력'})),
    },
  };
}
function refreshJSON(){
  const t=JSON.stringify(buildJSON(),null,2);
  const h=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"([^"]+)":/g,'<span class="k">"$1"</span>:')
    .replace(/: "([^"]*)"/g,': <span class="s">"$1"</span>')
    .replace(/: (-?\d+\.?\d*)/g,': <span class="n">$1</span>')
    .replace(/: (true|false|null)/g,': <span class="b">$1</span>');
  document.getElementById('json-out').innerHTML=h;
  refreshVideoSeqUI();
}

// v5.8 Task 4: 영상 동선 순서 편집 UI (드래그 핸들)
function refreshVideoSeqUI(){
  const card=document.getElementById('video-seq-card');
  const listEl=document.getElementById('video-seq-list');
  const hint=document.getElementById('video-seq-hint');
  if(!card||!listEl) return;
  if(STATE.spaces.length===0){card.style.display='none';return;}
  card.style.display='';

  // 현재 표시 순서 결정
  let ordered;
  if(STATE.videoSequenceOrder&&STATE.videoSequenceOrder.length>0){
    ordered=STATE.videoSequenceOrder.map(id=>STATE.spaces.find(s=>s.id===id)).filter(Boolean);
    STATE.spaces.forEach(s=>{if(!ordered.find(x=>x.id===s.id))ordered.push(s);});
    if(hint) hint.textContent='사용자 지정 순서';
  }else{
    ordered=[...STATE.spaces].sort((a,b)=>spArea(b)-spArea(a));
    if(hint) hint.textContent='자동 (면적순)';
  }

  // DOM 재구성
  listEl.innerHTML='';
  let dragSrc=null;
  ordered.forEach((s,i)=>{
    const row=document.createElement('div');
    row.style.cssText='background:var(--bg-card);border:1px solid var(--border);border-radius:3px;'
      +'padding:6px 8px;display:flex;align-items:center;gap:6px;cursor:grab;user-select:none;font-size:10px';
    row.draggable=true;
    row.dataset.id=s.id;
    const sp=SPACE_TYPES[s.type];
    const dot=`<span style="width:8px;height:8px;border-radius:2px;background:${sp?sp.color:'#888'};flex-shrink:0;display:inline-block"></span>`;
    const cam=['establishing_wide','dolly_in','orbit_right','push_in','pan_across'];
    const camLabel=i===0?'establishing_wide':cam[1+(i-1)%4];
    row.innerHTML=`<span style="color:var(--text-tertiary);font-family:var(--mono);min-width:14px">${i+1}</span>`
      +dot
      +`<span style="flex:1;color:var(--text-primary)">${sp?escapeHtml(sp.name):'?'} ${escapeHtml(s.name||'')}</span>`
      +`<span style="color:var(--text-tertiary);font-family:var(--mono);font-size:9px">${camLabel}</span>`
      +`<span style="color:var(--text-tertiary);cursor:grab;padding:0 2px">⋮⋮</span>`;
    // 드래그 이벤트
    row.addEventListener('dragstart',e=>{
      dragSrc=row;
      e.dataTransfer.effectAllowed='move';
      row.style.opacity='0.4';
    });
    row.addEventListener('dragend',()=>{row.style.opacity='';dragSrc=null;});
    row.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';});
    row.addEventListener('dragenter',()=>{if(dragSrc&&dragSrc!==row) row.style.borderColor='var(--gold)';});
    row.addEventListener('dragleave',()=>{row.style.borderColor='var(--border)';});
    row.addEventListener('drop',e=>{
      e.preventDefault();
      row.style.borderColor='var(--border)';
      if(!dragSrc||dragSrc===row) return;
      // 순서 재배열
      const ids=[...listEl.querySelectorAll('[data-id]')].map(el=>el.dataset.id);
      const fi=ids.indexOf(dragSrc.dataset.id),ti=ids.indexOf(row.dataset.id);
      ids.splice(fi,1);ids.splice(ti,0,dragSrc.dataset.id);
      STATE.videoSequenceOrder=ids;
      refreshVideoSeqUI();
      refreshJSON();
    });
    listEl.appendChild(row);
  });
}

// ===== 회전·복제·삭제 =====
function getArr(kind){return{space:STATE.spaces,wall:STATE.walls,opening:STATE.openings,furniture:STATE.furniture,fixtures:STATE.fixtures,lights:STATE.lights,electric:STATE.electric,texts:STATE.texts,measures:STATE.measures,circles:STATE.circles,arcs:STATE.arcs,curves:STATE.curves,hvac:STATE.hvac,leaders:STATE.leaders,pillars:STATE.pillars}[kind];}

// v5.7: 다중 선택 헬퍼 — boxSelection 우선, 비어있으면 단일 selected
function getSelectedTargets(){
  if(STATE.boxSelection.length>0) return [...STATE.boxSelection];
  if(STATE.selectedKind&&STATE.selectedId) return [{kind:STATE.selectedKind,id:STATE.selectedId}];
  return [];
}

function rotateSelected(){
  // 공간 선택 시: 점·선·면·벽·치수 포함 전체 회전 — 각도 입력 모드
  if(STATE.selectedKind==='space'&&STATE.selectedId){
    enterCmdMode('rotate-space',{spaceId:STATE.selectedId},'회전각(°):','각도 입력 (예: 45, -90, 180) — Enter / ↻ 핸들 드래그도 가능');
    return;
  }
  const targets=getSelectedTargets();
  if(targets.length===0) return;
  let n=0;
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id);
    if(!obj||!('angle' in obj)) return;
    obj.angle=((obj.angle||0)+90)%360; n++;
  });
  if(n===0) return;
  saveHistory();renderAll();showStatus('회전 90° ('+n+'개)');
}
function duplicateSelected(){
  const targets=getSelectedTargets();
  if(targets.length===0) return;
  const newSel=[];
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    const copy=JSON.parse(JSON.stringify(obj));
    copy.id=makeId(t.kind.charAt(0));
    if('x' in copy){copy.x+=500;copy.y+=500;}
    // VEF: 새 버텍스 생성 후 getter 재설치
    if('v1Id' in copy){
      copy.v1Id=ensureVertex(copy.x1+500,copy.y1+500).id;
      copy.v2Id=ensureVertex(copy.x2+500,copy.y2+500).id;
      reinstallVEF(copy);
    } else if('x1' in copy){
      copy.x1+=500;copy.y1+=500;copy.x2+=500;copy.y2+=500;
    }
    if('vertexIds' in copy&&copy.polygon){
      copy.vertexIds=copy.polygon.map(p=>ensureVertex(p.x+500,p.y+500).id);
      reinstallVEF(copy);
    } else if(copy.polygon&&!('vertexIds' in copy)){
      copy.polygon=copy.polygon.map(p=>({x:p.x+500,y:p.y+500}));
    }
    arr.push(copy);
    newSel.push({kind:t.kind,id:copy.id});
  });
  if(targets.length>1){STATE.boxSelection=newSel;STATE.selectedKind=null;STATE.selectedId=null;}
  saveHistory();renderAll();refreshUI();showStatus('복제됨 ('+targets.length+'개)');
}
function deleteSelected(){
  const targets=getSelectedTargets();
  if(targets.length===0) return;
  targets.forEach(t=>{
    if(t.kind==='space'){
      STATE.spaces=STATE.spaces.filter(x=>x.id!==t.id);
      STATE.openings=STATE.openings.filter(o=>o.spaceId!==t.id);
      // v5.9: 공간 삭제 시 그 공간 소유 벽도 함께 제거
      STATE.walls=STATE.walls.filter(w=>w.spaceId!==t.id);
      // 자식 라이브러리 객체도 함께 제거
      ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
        STATE[k]=STATE[k].filter(o=>o.spaceId!==t.id);
      });
    }else if(t.kind==='wall'){STATE.walls=STATE.walls.filter(x=>x.id!==t.id);}
    else if(t.kind==='opening'){STATE.openings=STATE.openings.filter(x=>x.id!==t.id);}
    else{
      const arr=getArr(t.kind);
      if(arr){const idx=arr.findIndex(x=>x.id===t.id);if(idx>=0) arr.splice(idx,1);}
    }
  });
  STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];
  // 공간 삭제 시 커스텀 동선 순서에서도 제거
  if(STATE.videoSequenceOrder){
    const delIds=new Set(targets.filter(t=>t.kind==='space').map(t=>t.id));
    STATE.videoSequenceOrder=STATE.videoSequenceOrder.filter(id=>!delIds.has(id));
    if(STATE.videoSequenceOrder.length===0) STATE.videoSequenceOrder=null;
  }
  cleanupOrphanVertices();
  saveHistory();renderAll();refreshUI();showStatus('삭제 ('+targets.length+'개)');
}

// ===== 토글 =====
function toggleGrid(){STATE.showGrid=!STATE.showGrid;document.getElementById('btn-grid').classList.toggle('gold',STATE.showGrid);drawGrid();showStatus('그리드: '+(STATE.showGrid?'ON':'OFF'));}
function toggleDim(){STATE.showDimensions=!STATE.showDimensions;document.getElementById('btn-dim').classList.toggle('gold',STATE.showDimensions);renderAll();showStatus('치수: '+(STATE.showDimensions?'ON':'OFF'));}
// v5.7: 2.5D 영업 모드 토글 — 인쇄/JSON/AI번들 시 강제 OFF
function toggle2_5D(){
  STATE.plus2D=!STATE.plus2D;
  document.getElementById('btn-2_5d').classList.toggle('gold',STATE.plus2D);
  renderAll();
  showStatus('2.5D 영업 모드: '+(STATE.plus2D?'ON (영업/미리보기 전용 — 인쇄·JSON 강제 OFF)':'OFF (시공 도면 모드)'));
}

// ===== 줌 =====
function zoomBy(factor){
  const oldZoom=STATE.zoom;
  const newZoom=Math.max(0.2,Math.min(5,oldZoom*factor));
  if(newZoom===oldZoom) return;
  const cx=stage.width()/2,cy=stage.height()/2;
  STATE.offsetX=cx-(cx-STATE.offsetX)*(newZoom/oldZoom);
  STATE.offsetY=cy-(cy-STATE.offsetY)*(newZoom/oldZoom);
  STATE.zoom=newZoom;
  drawGrid();renderAll();
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
}
function zoomFit(){
  if(STATE.spaces.length===0){STATE.zoom=1;STATE.offsetX=200;STATE.offsetY=100;drawGrid();renderAll();document.getElementById('zoom-pct').textContent='100%';return;}
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  STATE.spaces.forEach(s=>s.polygon.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}));
  const wMm=maxX-minX,hMm=maxY-minY,padding=120;
  const zw=(stage.width()-padding*2)/((wMm/1000)*STATE.scale);
  const zh=(stage.height()-padding*2)/((hMm/1000)*STATE.scale);
  STATE.zoom=Math.min(zw,zh,3);
  STATE.offsetX=padding-mmToPx(minX);
  STATE.offsetY=padding-mmToPx(minY);
  drawGrid();renderAll();
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
}

// ===== 저장/불러오기 =====
function saveJSON(){
  const json=buildJSON();
  const blob=new Blob([JSON.stringify(json,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=STATE.projectName.replace(/\s+/g,'_')+'_'+Date.now()+'.json';
  a.click();URL.revokeObjectURL(url);
  showStatus('저장됨');
}
function loadJSON(){
  const input=document.createElement('input');
  input.type='file';input.name='load-json-file';input.accept='.json';
  input.onchange=e=>{
    const f=e.target.files[0];if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const d=JSON.parse(ev.target.result);
        if(!d.schema||!d.schema.startsWith('ECOREAN.FloorPlan')){alert('ECOREAN MiniCAD 파일이 아닙니다');return;}
        STATE.projectName=d.meta.project||'불러온 프로젝트';
        STATE.ceilingHeight=d.meta.ceilingHeight_mm||2400;
        if(d.meta.wallThickness) {STATE.wallThickness=d.meta.wallThickness;const el=document.getElementById('wall-thickness');if(el) el.value=d.meta.wallThickness;}
        STATE.vertices=d.vertices||[];
        STATE.spaces=d.spaces||[];STATE.walls=d.walls||[];
        STATE.openings=d.openings||[];STATE.furniture=d.furniture||[];
        STATE.fixtures=d.fixtures||[];STATE.lights=d.lights||[];
        STATE.electric=d.electric||[];STATE.texts=d.texts||[];
        STATE.measures=d.measures||[];
        // v5.7: 데이터 손실 버그 수정 — circles/arcs/hvac 누락 보충
        STATE.circles=d.circles||[];
        STATE.arcs=d.arcs||[];
        STATE.hvac=d.hvac||[];
        STATE.leaders=d.leaders||[]; // v5.9
        STATE.curves=d.curves||[]; // v5.9: 자유곡선 (Bezier)
        STATE.pillars=d.pillars||[]; // v5.9: 기둥
        // v5.7: AI 프롬프트 힌트 복구 (있으면 덮어씀)
        if(d.meta.aiPromptHints) STATE.aiPromptHints={...STATE.aiPromptHints,...d.meta.aiPromptHints};
        // v5.7: 구버전(v5.0~v5.6) 마이그레이션
        migrateLoadedState(d.schema);
        document.getElementById('project-name').value=STATE.projectName;
        document.getElementById('ceiling-height').value=STATE.ceilingHeight;
        saveHistory();renderAll();refreshUI();
        showStatus('불러옴 ('+d.schema+' → v5.7 마이그레이션)');
      }catch(err){alert('파일 읽기 실패: '+err.message);}
    };
    r.readAsText(f);
  };
  input.click();
}

// v5.8: 구버전 데이터 → v5.8 스키마 마이그레이션 (v5.7 확장)
// - layerName 누락 객체 자동 생성
// - typeIndex 누락 자동 채움
// - flipped 기본값 false
// - floorMaterial 누락 시 defaultMaterials() 기반 자동 보충 (v5.8)
// - wallMaterial → wall.finishMaterial 이전 (v5.9)
// - parentId(가구→공간, 도어→벽) 자동 추론 NEEDS_CONFIRMATION 처리
function migrateLoadedState(schema){
  let warns=0;
  // 공간 typeIndex/code/layerName/자재 보충
  const typeCounters={};
  STATE.spaces.forEach(s=>{
    if(!SPACE_TYPES[s.type]) s.type='ROOM';
    typeCounters[s.type]=(typeCounters[s.type]||0)+1;
    if(!s.typeIndex) s.typeIndex=typeCounters[s.type];
    if(!s.code) s.code=SPACE_TYPES[s.type].code;
    if(!s.layerName) s.layerName='A-AREA-'+s.code+'-'+String(s.typeIndex).padStart(2,'0');
    if(s.waterproofRecommended===undefined) s.waterproofRecommended=SPACE_TYPES[s.type].waterproof?'CONDITIONAL':false;
    if(!s.floorMaterial){s.floorMaterial=defaultMaterials(s.type).floor;warns++;}
    // v5.9: wallMaterial → wall.finishMaterial 이전 (구버전 호환)
    if(s.wallMaterial){
      STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine).forEach(w=>{if(!w.finishMaterial)w.finishMaterial=s.wallMaterial;});
      delete s.wallMaterial;
    }
  });
  // 벽 layerName 보충
  STATE.walls.forEach(w=>{
    if(!w.layerName){
      const sp=w.spaceId?STATE.spaces.find(s=>s.id===w.spaceId):null;
      const code=sp?sp.code:'GEN';
      const idx=sp?String(sp.typeIndex||1).padStart(2,'0'):'01';
      w.layerName='A-WALL-'+code+'-'+idx;warns++;
    }
    if(!w.thickness) w.thickness=100;
  });
  // 도어/창
  STATE.openings.forEach(o=>{
    if(!o.layerName){
      const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null;
      const code=sp?sp.code:'GEN';
      const idx=sp?String(sp.typeIndex||1).padStart(2,'0'):'01';
      o.layerName='A-'+(o.type==='DOOR'?'DOOR':'WIND')+'-'+code+'-'+idx;warns++;
    }
  });
  // 라이브러리 객체 (가구/위생/조명/전기/공조)
  ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
    (STATE[k]||[]).forEach(o=>{
      if(o.flipped===undefined) o.flipped=false;
      if(!o.layerName){
        const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null;
        const code=sp?sp.code:'GEN';
        const idx=sp?String(sp.typeIndex||1).padStart(2,'0'):'01';
        const elemMap={furniture:'FURN',fixtures:'FIXT',lights:'LITE',electric:'ELEC',hvac:'HVAC'};
        o.layerName='A-'+elemMap[k]+'-'+code+'-'+idx;warns++;
      }
    });
  });
  if(warns>0) console.warn('[ECOREAN v5.7] 마이그레이션: '+warns+'개 객체 layerName 자동 보충 (원본 schema='+schema+')');

  // VEF 마이그레이션: 구버전(flat x1/y1/x2/y2) → 버텍스 시스템으로 업그레이드
  STATE.walls=STATE.walls.map(w=>{
    if('v1Id' in w) return reinstallVEF(w); // v5.8+ 파일: getter만 재설치
    // 구버전: flat 좌표 → 버텍스 생성
    const v1=ensureVertex(w.x1||0,w.y1||0);
    const v2=ensureVertex(w.x2||0,w.y2||0);
    return makeWallVEF(v1.id,v2.id,w);
  });
  STATE.spaces=STATE.spaces.map(s=>{
    if('vertexIds' in s) return reinstallVEF(s); // v5.8+ 파일: getter만 재설치
    // 구버전: flat polygon → 버텍스 생성
    const polygon=s.polygon||[];
    const vertexIds=polygonToVertexIds(polygon);
    return makeSpaceVEF(vertexIds,{...s});
  });
}

// ===== 인쇄 =====
// v5.7: 인쇄 시 2.5D 강제 OFF (시공 도면은 평면 모드만 허용)
// v5.9: 인쇄 시 라이트 테마 강제 (내력벽이 검정으로 인쇄되도록), 캡처 후 원복
function printPlan(){
  const wasPlus2D=STATE.plus2D;
  const wasTheme=document.body.getAttribute('data-theme');
  const isAlreadyLight=wasTheme==='architect';
  if(wasPlus2D) STATE.plus2D=false;
  if(!isAlreadyLight) document.body.setAttribute('data-theme','architect');
  renderAll();
  const dataURL=stage.toDataURL({pixelRatio:2,mimeType:'image/png'});
  // 원복
  if(wasPlus2D) STATE.plus2D=true;
  if(!isAlreadyLight){
    if(wasTheme) document.body.setAttribute('data-theme',wasTheme);
    else document.body.removeAttribute('data-theme');
  }
  renderAll();
  const w=window.open('','_blank');
  if(!w){alert('팝업 차단');return;}
  w.document.write('<html><head><title>'+STATE.projectName+'</title>'+
    '<style>body{margin:0;padding:20px;background:white;font-family:sans-serif;text-align:center}'+
    'h1{font-size:18px;margin-bottom:8px}p{font-size:11px;color:#666}img{max-width:100%;border:1px solid #ddd}'+
    '@media print{body{padding:0}h1{font-size:14px}}</style></head>'+
    '<body><h1>'+STATE.projectName+'</h1>'+
    '<p>면적: '+document.getElementById('t-floor').textContent+'㎡ · 평수: '+document.getElementById('t-floor-pyeong').textContent+'py · 평면 모드 (시공 도면)</p>'+
    '<img src="'+dataURL+'" onload="setTimeout(()=>window.print(),300)"></body></html>');
}

// ===== v5.7: AI 생성 파이프라인 SSoT 번들 export =====
// 평면 PNG + JSON + 이미지 프롬프트 + 영상 프롬프트를 동시 다운로드
// 파이프라인: JSON → 이미지프롬프트 → T2I → PNG → 영상프롬프트 → T2V → MP4
function exportAIBundle(){
  // 1) 2.5D 강제 OFF로 평면 PNG 생성
  const wasPlus2D=STATE.plus2D;
  if(wasPlus2D){STATE.plus2D=false;renderAll();}
  const pngDataURL=stage.toDataURL({pixelRatio:2,mimeType:'image/png'});
  if(wasPlus2D){STATE.plus2D=true;renderAll();}

  // 2) JSON SSoT
  const json=buildJSON();
  json.meta.ssotPipeline.plus2D_active=false; // export 시점은 강제 OFF
  json.meta.ssotPipeline.note='AI bundle export — 평면 모드 (AI vision 친화 보장)';

  // 3) 공간별 이미지 생성 프롬프트 텍스트 조립
  const imgPrompts=[];
  imgPrompts.push('# ECOREAN MiniCAD v5.7 — 이미지 생성 프롬프트 묶음');
  imgPrompts.push('# 사용 모델: Midjourney / FLUX / SDXL / Leonardo');
  imgPrompts.push('# Project: '+STATE.projectName);
  imgPrompts.push('# 출력 시간: '+new Date().toISOString());
  imgPrompts.push('');
  const hints=STATE.aiPromptHints;
  const baseStyle=hints.style.replace(/_/g,' ');
  const baseMood=hints.mood.replace(/_/g,' ');
  const baseLight=hints.lighting.replace(/_/g,' ');
  const palette=hints.materialPalette.join(', ').replace(/_/g,' ');
  const camera=hints.cameraSuggestion.replace(/_/g,' ');

  json.spaces.forEach(s=>{
    const objs=[
      ...json.furniture.filter(o=>o.parentSpaceId===s.id),
      ...json.fixtures.filter(o=>o.parentSpaceId===s.id),
      ...json.lights.filter(o=>o.parentSpaceId===s.id),
      ...json.electric.filter(o=>o.parentSpaceId===s.id),
      ...json.hvac.filter(o=>o.parentSpaceId===s.id),
    ];
    const objList=objs.map(o=>o.promptKeyword+' ('+o.placement.replace(/_/g,' ')+')').join(', ')||'empty room';
    imgPrompts.push('## ['+s.code+'-'+String(s.typeIndex||1).padStart(2,'0')+'] '+s.promptDescriptor);
    imgPrompts.push('');
    const prompt=baseStyle+' Korean apartment, '+s.promptDescriptor+', '
      +objList+', '
      +'palette: '+palette+', '+baseLight+', '+baseMood+' mood, '
      +camera+', photorealistic, --ar 16:9';
    imgPrompts.push(prompt);
    imgPrompts.push('');
  });

  // 4) 영상 시퀀스 프롬프트 조립
  const vidLines=[];
  vidLines.push('# ECOREAN MiniCAD v5.7 — 영상 생성 프롬프트');
  vidLines.push('# 사용 모델: Sora / Veo / Runway Gen-3 / Kling');
  vidLines.push('# Project: '+STATE.projectName);
  vidLines.push('');
  vidLines.push('Cinematic walkthrough of '+baseStyle+' Korean apartment.');
  vidLines.push('Total duration: '+json.meta.videoSequence.totalDuration_sec+'s, '
    +json.meta.videoSequence.suggestedFps+'fps, '
    +json.meta.videoSequence.suggestedResolution+'.');
  vidLines.push('');
  json.meta.videoSequence.walkthrough.forEach((w,i)=>{
    const sp=json.spaces.find(s=>s.id===w.spaceId);
    vidLines.push('Shot '+(i+1)+' ('+w.dwell_sec+'s): '+w.spaceName+' — '+w.cameraMove.replace(/_/g,' ')
      +(sp?(' ('+sp.promptDescriptor+')'):''));
  });
  vidLines.push('');
  vidLines.push('Lighting: '+baseLight+'. Mood: '+baseMood+'. '
    +'Palette: '+palette+'. Photorealistic, no human figures.');

  // 5) ZIP 없이 4개 파일 순차 다운로드 (대표님 환경 단순화)
  const safeName=STATE.projectName.replace(/[^a-zA-Z0-9가-힣_-]/g,'_');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const base=safeName+'_'+stamp;

  downloadDataURL(pngDataURL,base+'_floorplan.png');
  downloadText(JSON.stringify(json,null,2),base+'_floorplan.json','application/json');
  downloadText(imgPrompts.join('\n'),base+'_image_prompts.txt','text/plain');
  downloadText(vidLines.join('\n'),base+'_video_sequence.txt','text/plain');

  showStatus('AI 번들 4종 다운로드 완료 — PNG·JSON·이미지프롬프트·영상프롬프트');
}

// ===== v5.8 Task 3: DXF 내보내기/가져오기 =====
// AutoCAD R12 ASCII DXF 호환. 외주 인테리어 업체 도면 인계용.
// 좌표계: STATE는 Y-down(화면), DXF는 Y-up → 내보낼 때 Y값 부호 반전
function exportDXF(){
  const dlines=[];let hc=1;
  const h=()=>(hc++).toString(16).toUpperCase().padStart(4,'0');
  const g=(code,val)=>dlines.push(String(code).padStart(3),String(val));

  // Layer 집합 수집
  const lyrs=new Set(['0']);
  const addL=arr=>arr.forEach(o=>o.layerName&&lyrs.add(o.layerName));
  [STATE.spaces,STATE.walls,STATE.openings,STATE.furniture,STATE.fixtures,
   STATE.lights,STATE.electric,STATE.hvac,STATE.texts,STATE.circles,STATE.arcs].forEach(addL);

  // HEADER
  g(0,'SECTION');g(2,'HEADER');
  g(9,'$ACADVER');g(1,'AC1009');
  g(9,'$INSUNITS');g(70,4); // mm
  g(9,'$MEASUREMENT');g(70,1); // metric
  g(0,'ENDSEC');

  // TABLES
  g(0,'SECTION');g(2,'TABLES');
  // LAYER table
  g(0,'TABLE');g(2,'LAYER');g(70,lyrs.size);
  const spColorMap={LIVING:3,ROOM:4,KITCHEN:2,BATHROOM:5,ENTRANCE:7,BALCONY:3,CORRIDOR:8,
    DRESSING:6,STAIRS:8,PANTRY:2,UTILITY:4,POWDER:6,STUDY:4,BOILER:1,STORAGE:8,DINING:2,FOYER:8,GARAGE:8,TERRACE:3};
  lyrs.forEach(name=>{g(0,'LAYER');g(2,name);g(70,0);g(62,7);g(6,'CONTINUOUS');});
  g(0,'ENDTAB');
  // TEXT STYLE
  g(0,'TABLE');g(2,'STYLE');g(70,1);
  g(0,'STYLE');g(2,'STANDARD');g(70,0);g(40,0);g(41,1);g(50,0);g(71,0);g(42,250);g(3,'txt');g(4,'');
  g(0,'ENDTAB');
  g(0,'ENDSEC');

  // ENTITIES
  g(0,'SECTION');g(2,'ENTITIES');

  // 공간 → 닫힌 POLYLINE + 중심 라벨 TEXT
  STATE.spaces.forEach(s=>{
    if(!s.polygon||s.polygon.length<3)return;
    const lyr=s.layerName||'A-AREA';
    const col=spColorMap[s.type]||7;
    g(0,'POLYLINE');g(5,h());g(8,lyr);g(62,col);g(66,1);g(70,1);
    s.polygon.forEach(pt=>{
      g(0,'VERTEX');g(5,h());g(8,lyr);g(10,pt.x);g(20,-pt.y);g(30,0);g(70,32);
    });
    g(0,'SEQEND');g(5,h());g(8,lyr);
    // 공간명 텍스트
    const cx=Math.round(s.polygon.reduce((a,p)=>a+p.x,0)/s.polygon.length);
    const cy=Math.round(s.polygon.reduce((a,p)=>a+p.y,0)/s.polygon.length);
    const spT=SPACE_TYPES[s.type];
    const label=((spT?spT.name:'?')+' '+(s.name||'')).trim();
    g(0,'TEXT');g(5,h());g(8,lyr);g(62,col);
    g(10,cx);g(20,-cy);g(30,0);g(40,200);g(1,label);g(72,1);g(11,cx);g(21,-cy);g(31,0);
  });

  // 벽 → LINE
  STATE.walls.forEach(w=>{
    g(0,'LINE');g(5,h());g(8,w.layerName||'A-WALL');
    g(10,w.x1);g(20,-w.y1);g(30,0);g(11,w.x2);g(21,-w.y2);g(31,0);
  });

  // 개구부(도어/창) → 중심선 LINE
  STATE.openings.forEach(o=>{
    const lyr=o.layerName||(o.type==='DOOR'?'A-DOOR':'A-WIND');
    const col=o.type==='DOOR'?2:4;
    const ang=(o.angle||0)*Math.PI/180;
    const hw=Math.round((o.w||900)/2);
    const x1=Math.round(o.x+hw*Math.cos(ang)),y1=Math.round(o.y+hw*Math.sin(ang));
    const x2=Math.round(o.x-hw*Math.cos(ang)),y2=Math.round(o.y-hw*Math.sin(ang));
    g(0,'LINE');g(5,h());g(8,lyr);g(62,col);
    g(10,x1);g(20,-y1);g(30,0);g(11,x2);g(21,-y2);g(31,0);
    // 도어 호 (단순화: 1/4 원)
    if(o.type==='DOOR'){
      g(0,'ARC');g(5,h());g(8,lyr);g(62,col);
      g(10,x2);g(20,-y2);g(30,0);g(40,o.w||900);g(50,0);g(51,90);
    }
  });

  // 텍스트 → TEXT
  STATE.texts.forEach(t=>{
    g(0,'TEXT');g(5,h());g(8,t.layerName||'A-TEXT');
    g(10,t.x);g(20,-t.y);g(30,0);g(40,Math.max(100,t.h||300));g(1,t.text||'');g(50,-(t.angle||0));
  });

  // 원 → CIRCLE, 아크 → ARC
  STATE.circles.forEach(c=>{
    g(0,'CIRCLE');g(5,h());g(8,c.layerName||'A-CIRC');g(10,c.x);g(20,-c.y);g(30,0);g(40,c.r);
  });
  STATE.arcs.forEach(a=>{
    g(0,'ARC');g(5,h());g(8,a.layerName||'A-ARC');
    g(10,a.cx);g(20,-a.cy);g(30,0);g(40,a.r);g(50,a.startAngle||0);g(51,a.endAngle||90);
  });

  g(0,'ENDSEC');g(0,'EOF');

  const dxfText=dlines.join('\n');
  const safe=(STATE.projectName||'MiniCAD').replace(/[^a-zA-Z0-9가-힣_-]/g,'_');
  downloadText(dxfText,safe+'_v5.8.dxf','application/dxf');
  showStatus('DXF 내보내기 완료 — AutoCAD R12 호환 ('+lyrs.size+'개 레이어)');
}

function importDXF(text){
  // ASCII DXF 파서 (R12 ~ AutoCAD 2018+ 호환): LINE/POLYLINE/LWPOLYLINE → 벽·공간, ARC/CIRCLE → 개별 객체
  const rows=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const pairs=[];
  for(let i=0;i+1<rows.length;i+=2) pairs.push({c:parseInt(rows[i].trim(),10),v:rows[i+1].trim()});

  let newWalls=0,newSpaces=0,newCircles=0,newArcs=0,i=0;
  while(i<pairs.length){
    const {c,v}=pairs[i];
    if(c===0&&v==='LINE'){
      let lyr='A-WALL',x1=0,y1=0,x2=0,y2=0;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===10) x1=Math.round(parseFloat(p.v));
        if(p.c===20) y1=Math.round(-parseFloat(p.v));
        if(p.c===11) x2=Math.round(parseFloat(p.v));
        if(p.c===21) y2=Math.round(-parseFloat(p.v));
        i++;
      }
      if(Math.hypot(x2-x1,y2-y1)>=50){
        const dv1=ensureVertex(x1,y1),dv2=ensureVertex(x2,y2);
        STATE.walls.push(makeWallVEF(dv1.id,dv2.id,{thickness:STATE.wallThickness,layerName:lyr}));
        newWalls++;
      }
    } else if(c===0&&v==='POLYLINE'){
      let lyr='A-AREA',flags=0;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        if(pairs[i].c===8) lyr=pairs[i].v;
        if(pairs[i].c===70) flags=parseInt(pairs[i].v,10);
        i++;
      }
      const verts=[];
      while(i<pairs.length&&pairs[i].c===0&&pairs[i].v==='VERTEX'){
        let vx=0,vy=0;i++;
        while(i<pairs.length&&pairs[i].c!==0){
          if(pairs[i].c===10) vx=Math.round(parseFloat(pairs[i].v));
          if(pairs[i].c===20) vy=Math.round(-parseFloat(pairs[i].v));
          i++;
        }
        verts.push({x:vx,y:vy});
      }
      if(verts.length>=3&&(flags&1)){
        // 레이어명에서 공간 타입 추론 (A-AREA-BATH-01 → BATHROOM)
        const typeEntry=Object.entries(SPACE_TYPES).find(([,sp])=>lyr.includes(sp.code));
        const spType=typeEntry?typeEntry[0]:'LIVING';
        const cnt=(STATE.spaces.filter(s=>s.type===spType).length)+1;
        const sp=SPACE_TYPES[spType];
        const dm=defaultMaterials(spType);
        STATE.spaces.push({
          id:makeId('s'),type:spType,polygon:verts,typeIndex:cnt,
          code:sp.code,layerName:'A-AREA-'+sp.code+'-'+String(cnt).padStart(2,'0'),
          name:'',ceilingHeight:sp.ceil||STATE.ceilingHeight,
          waterproofRecommended:sp.waterproof?'CONDITIONAL':false,
          floorMaterial:dm.floor,color:sp.color,
        });
        newSpaces++;
      }
    } else if(c===0&&v==='LWPOLYLINE'){
      // v5.9: AutoCAD 2000+ LWPOLYLINE — 벡터 좌표가 같은 entity 내에 (10/20) 반복
      let lyr='A-AREA',flags=0;
      const lwVerts=[];
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===70) flags=parseInt(p.v,10);
        if(p.c===10){
          const xv=Math.round(parseFloat(p.v));
          // 다음 pair가 c=20 이면 그 y값과 페어링
          if(i+1<pairs.length&&pairs[i+1].c===20){
            const yv=Math.round(-parseFloat(pairs[i+1].v));
            lwVerts.push({x:xv,y:yv});
            i++;
          }
        }
        i++;
      }
      if(lwVerts.length>=2){
        const closed=(flags&1)===1;
        if(closed&&lwVerts.length>=3){
          // 닫힌 polyline → 공간
          const typeEntry=Object.entries(SPACE_TYPES).find(([,sp])=>lyr.includes(sp.code));
          const spType=typeEntry?typeEntry[0]:'LIVING';
          const cnt=(STATE.spaces.filter(s=>s.type===spType).length)+1;
          const sp=SPACE_TYPES[spType];
          const dm=defaultMaterials(spType);
          STATE.spaces.push({
            id:makeId('s'),type:spType,polygon:lwVerts,typeIndex:cnt,
            code:sp.code,layerName:'A-AREA-'+sp.code+'-'+String(cnt).padStart(2,'0'),
            name:'',ceilingHeight:sp.ceil||STATE.ceilingHeight,
            waterproofRecommended:sp.waterproof?'CONDITIONAL':false,
            floorMaterial:dm.floor,color:sp.color,
          });
          newSpaces++;
        }else{
          // 열린 polyline → 연속된 벽 segments
          for(let k=0;k+1<lwVerts.length;k++){
            const a=lwVerts[k], b=lwVerts[k+1];
            if(Math.hypot(b.x-a.x,b.y-a.y)>=50){
              const dv1=ensureVertex(a.x,a.y),dv2=ensureVertex(b.x,b.y);
              STATE.walls.push(makeWallVEF(dv1.id,dv2.id,{thickness:STATE.wallThickness,layerName:lyr}));
              newWalls++;
            }
          }
        }
      }
    } else if(c===0&&v==='CIRCLE'){
      let lyr='A-CIRC',cx=0,cy=0,r=0;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===10) cx=Math.round(parseFloat(p.v));
        if(p.c===20) cy=Math.round(-parseFloat(p.v));
        if(p.c===40) r=Math.round(parseFloat(p.v));
        i++;
      }
      if(r>=10){
        STATE.circles.push({id:makeId('cir'),x:cx,y:cy,radius_mm:r,layerName:lyr,spaceId:null});
        newCircles++;
      }
    } else if(c===0&&v==='ARC'){
      let lyr='A-ARC',cx=0,cy=0,r=0,sa=0,ea=90;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===10) cx=Math.round(parseFloat(p.v));
        if(p.c===20) cy=Math.round(-parseFloat(p.v));
        if(p.c===40) r=Math.round(parseFloat(p.v));
        if(p.c===50) sa=parseFloat(p.v); // 시작각 (°)
        if(p.c===51) ea=parseFloat(p.v); // 끝각 (°)
        i++;
      }
      if(r>=10){
        STATE.arcs.push({id:makeId('arc'),x:cx,y:cy,radius_mm:r,startAngle:-ea,endAngle:-sa,layerName:lyr,spaceId:null});
        newArcs++;
      }
    } else { i++; }
  }
  STATE.videoSequenceOrder=null; // 공간 변경 시 자동 순서 초기화
  saveHistory();renderAll();refreshUI();
  const parts=['벽 '+newWalls+'개','공간 '+newSpaces+'개'];
  if(newCircles) parts.push('원 '+newCircles+'개');
  if(newArcs) parts.push('아크 '+newArcs+'개');
  showStatus('DXF 가져오기 완료 — '+parts.join(' · '));
}

function downloadDataURL(dataURL,filename){
  const a=document.createElement('a');a.href=dataURL;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}
function downloadText(text,filename,mime){
  const blob=new Blob([text],{type:mime||'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// ===== 클립보드 =====
function copyToClipboard(text){
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>showStatus('복사됨')).catch(()=>fallbackCopy(text));
  }else fallbackCopy(text);
}
function fallbackCopy(text){
  const ta=document.createElement('textarea');
  ta.name='clipboard-fallback';ta.value=text;ta.style.position='fixed';ta.style.opacity='0';ta.style.left='-9999px';
  document.body.appendChild(ta);
  ta.select();ta.setSelectionRange(0,99999);
  let ok=false;try{ok=document.execCommand('copy');}catch(e){}
  document.body.removeChild(ta);
  showStatus(ok?'복사됨':'복사 실패');
}

// ===== 상태 =====
let statusTimer=null;
function showStatus(msg){
  const el=document.getElementById('canvas-status');
  el.textContent=msg;el.classList.remove('hidden');
  clearTimeout(statusTimer);
  statusTimer=setTimeout(()=>el.classList.add('hidden'),1800);
}

// ===== 탭 =====
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
  const tab=b.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('active',x.dataset.tabContent===tab));
}));

// ===== 테마 (v5.9 Cyber dual: lime / architect) =====
function applyTheme(t){
  const theme=(t==='architect')?'architect':'lime';
  document.body.setAttribute('data-theme',theme);
  try{localStorage.setItem('minicad.theme',theme);}catch(_){}
  const btn=document.getElementById('btn-theme');
  if(btn){
    btn.textContent=theme==='lime'?'🌙':'☀';
    btn.title='테마: '+(theme==='lime'?'Lime (다크) — 클릭하여 Architect로':'Architect (라이트) — 클릭하여 Lime로');
  }
  // v5.9: 테마 변경 시 캔버스 그리드/벽 재렌더 (테마별 색상 반영)
  if(typeof drawGrid==='function'&&typeof bgLayer!=='undefined') drawGrid();
  if(typeof renderAll==='function'&&typeof groups!=='undefined'&&groups&&groups.walls) renderAll();
}
function toggleTheme(){
  const cur=document.body.getAttribute('data-theme')||'lime';
  applyTheme(cur==='lime'?'architect':'lime');
  if(typeof cmdToast==='function') cmdToast('테마: '+(document.body.getAttribute('data-theme')==='lime'?'Lime (다크)':'Architect (라이트)'));
}
(function _initTheme(){
  let saved='lime';
  try{saved=localStorage.getItem('minicad.theme')||'lime';}catch(_){}
  applyTheme(saved);
})();
document.getElementById('btn-theme').addEventListener('click',toggleTheme);

// ===== 버튼 =====
document.getElementById('btn-undo').addEventListener('click',undo);
document.getElementById('btn-redo').addEventListener('click',redo);
document.getElementById('btn-grid').addEventListener('click',toggleGrid);
document.getElementById('btn-dim').addEventListener('click',toggleDim);
document.getElementById('btn-2_5d').addEventListener('click',toggle2_5D); // v5.7
document.getElementById('btn-ai-bundle').addEventListener('click',exportAIBundle); // v5.7
document.getElementById('btn-print').addEventListener('click',printPlan);
// v5.8 Task 3: DXF
document.getElementById('btn-dxf-export').addEventListener('click',exportDXF);
document.getElementById('btn-dxf-import').addEventListener('click',()=>document.getElementById('dxf-file-input').click());
document.getElementById('dxf-file-input').addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  const reader=new FileReader();
  if(ext==='dxf'){
    reader.onload=ev=>importDXF(ev.target.result);
    reader.readAsText(file,'utf-8');
  } else if(ext==='dwg'){
    showDWGGuide(file.name);
  } else if(ext==='svg'){
    reader.onload=ev=>importSVG(ev.target.result,file.name);
    reader.readAsText(file,'utf-8');
  } else if(['png','jpg','jpeg'].includes(ext)){
    reader.onload=ev=>setBgImage(ev.target.result,file.name);
    reader.readAsDataURL(file);
  } else {
    alert('지원되지 않는 파일 형식: .'+ext+'\n지원: DXF, DWG(가이드), SVG, PNG, JPG');
  }
  e.target.value='';
});

// v5.9: SVG 가져오기 — data URL로 변환 후 배경 이미지로 처리
function importSVG(svgText,filename){
  try{
    const dataURL='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svgText)));
    setBgImage(dataURL,filename||'imported.svg');
  }catch(err){
    alert('SVG 처리 실패: '+err.message);
  }
}

// v5.9: 배경 이미지 설정 (PNG/JPG/SVG 트레이싱용)
function setBgImage(dataURL,filename){
  const img=new Image();
  img.onload=()=>{
    STATE.bgImage={
      filename:filename||'image',
      dataURL,
      x_mm:0,y_mm:0,
      scale:1,opacity:0.5,locked:false,
      naturalWidth:img.width,naturalHeight:img.height,
    };
    drawGrid();renderAll();
    refreshBgImageUI();
    showStatus('배경 이미지 추가 — '+filename+' ('+img.width+'×'+img.height+'px) — 투명도 50%');
  };
  img.onerror=()=>alert('이미지 로드 실패');
  img.src=dataURL;
}

// v5.9: DWG 변환 안내 모달
function showDWGGuide(filename){
  let modal=document.getElementById('dwg-guide-modal');
  if(modal){modal.classList.add('visible');return;}
  modal=document.createElement('div');
  modal.id='dwg-guide-modal';
  modal.className='sc-overlay visible';
  modal.innerHTML='<div class="sc-modal" style="max-width:560px">'+
    '<div class="sc-header"><div class="sc-title">⚠ DWG 직접 가져오기 미지원</div>'+
    '<button class="sc-close" id="dwg-guide-close">✕</button></div>'+
    '<div style="padding:18px 22px">'+
      (filename?'<p style="font-size:11px;color:var(--ink-3);margin-bottom:10px">선택 파일: '+filename+'</p>':'')+
      '<p style="color:var(--ink-2);font-size:12px;line-height:1.7;margin-bottom:14px">'+
        'DWG는 AutoCAD 바이너리 포맷입니다. 다음 중 한 방법으로 <strong style="color:var(--accent-1)">DXF로 변환</strong> 후 다시 가져와 주세요.'+
      '</p>'+
      '<div style="background:var(--surface-2);border:1px solid var(--stroke-1);border-radius:6px;padding:12px;margin-bottom:14px">'+
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--accent-1);letter-spacing:0.1em;margin-bottom:8px">변환 방법</div>'+
        '<ol style="color:var(--ink-2);font-size:11px;line-height:1.9;padding-left:20px;margin:0">'+
          '<li><strong>ODA File Converter (무료, 추천)</strong><br><span style="color:var(--ink-3);font-size:10px">opendesign.com/guestfiles/oda_file_converter</span></li>'+
          '<li><strong>온라인 변환</strong><br><span style="color:var(--ink-3);font-size:10px">cloudconvert.com / aconvert.com / convertio.co</span></li>'+
          '<li><strong>AutoCAD/BricsCAD/QCAD에서 직접 저장</strong><br><span style="color:var(--ink-3);font-size:10px">SAVEAS → AutoCAD R12 DXF 선택</span></li>'+
        '</ol>'+
      '</div>'+
      '<p style="color:var(--ink-3);font-size:10px;line-height:1.6;margin-bottom:0">'+
        '💡 <strong>팁</strong>: R12 ASCII DXF 포맷이 호환성 가장 높음. R2018+ DXF도 부분 지원 (LWPOLYLINE/ARC/CIRCLE).'+
      '</p>'+
    '</div></div>';
  document.body.appendChild(modal);
  document.getElementById('dwg-guide-close').addEventListener('click',()=>{
    modal.classList.remove('visible');
  });
  modal.addEventListener('click',e=>{
    if(e.target===modal) modal.classList.remove('visible');
  });
}

// v5.9: 배경 이미지 컨트롤 패널 새로고침
function refreshBgImageUI(){
  const panel=document.getElementById('bg-image-panel');
  if(!panel) return;
  if(!STATE.bgImage){panel.style.display='none';return;}
  panel.style.display='';
  const nameEl=document.getElementById('bg-image-name');
  if(nameEl) nameEl.textContent='📎 '+STATE.bgImage.filename+' ('+(STATE.bgImage.naturalWidth||0)+'×'+(STATE.bgImage.naturalHeight||0)+'px)';
  const opEl=document.getElementById('bg-opacity');
  if(opEl) opEl.value=Math.round((STATE.bgImage.opacity||0.5)*100);
  const scEl=document.getElementById('bg-scale');
  if(scEl) scEl.value=Math.round((STATE.bgImage.scale||1)*100);
  const lockBtn=document.getElementById('bg-lock');
  if(lockBtn) lockBtn.textContent=STATE.bgImage.locked?'🔒 잠김':'🔓 잠금해제';
}
// 배경 이미지 컨트롤 이벤트
const _bgOp=document.getElementById('bg-opacity');
if(_bgOp) _bgOp.addEventListener('input',e=>{
  if(!STATE.bgImage) return;
  STATE.bgImage.opacity=parseInt(e.target.value)/100;
  drawGrid();
});
const _bgSc=document.getElementById('bg-scale');
if(_bgSc) _bgSc.addEventListener('change',e=>{
  if(!STATE.bgImage) return;
  STATE.bgImage.scale=Math.max(0.01,Math.min(20,parseInt(e.target.value)/100));
  drawGrid();
});
const _bgLock=document.getElementById('bg-lock');
if(_bgLock) _bgLock.addEventListener('click',()=>{
  if(!STATE.bgImage) return;
  STATE.bgImage.locked=!STATE.bgImage.locked;
  drawGrid();refreshBgImageUI();
});
const _bgRm=document.getElementById('bg-remove');
if(_bgRm) _bgRm.addEventListener('click',()=>{
  if(!STATE.bgImage) return;
  if(!confirm('배경 이미지 제거?')) return;
  STATE.bgImage=null;
  drawGrid();refreshBgImageUI();
  showStatus('배경 이미지 제거됨');
});

// v5.9: 스케일 보정 모드 시작 (수동 — C안). _scaleCalActive는 tools.js의 같은 스크립트 lexical scope 변수.
const _bgScaleCal=document.getElementById('bg-scale-cal');
if(_bgScaleCal) _bgScaleCal.addEventListener('click',()=>{
  if(!STATE.bgImage){alert('배경 이미지를 먼저 가져오세요'); return;}
  _scaleCalActive=true;
  _scaleCalP1=null;
  showStatus('스케일 보정: 알려진 두 점의 첫 점 클릭 (Esc 취소)');
});

// v5.9: AI 자동 스케일 — Anthropic Claude Vision으로 도면 치수 OCR + 스케일 자동 산정
async function aiAutoScale(apiKey){
  if(!STATE.bgImage){alert('배경 이미지를 먼저 가져오세요'); return;}
  const dataURL=STATE.bgImage.dataURL;
  const m=dataURL.match(/^data:([^;]+);base64,(.+)$/);
  if(!m){alert('이미지 포맷 인식 실패'); return;}
  const mediaType=m[1];
  const base64Data=m[2];
  if(mediaType==='image/svg+xml'){
    alert('SVG는 AI 자동 스케일 미지원 (Claude Vision은 raster만 처리).\n📐 수동 스케일 보정을 사용해주세요.');
    return;
  }
  if(!['image/png','image/jpeg','image/gif','image/webp'].includes(mediaType)){
    alert('지원되지 않는 이미지 형식: '+mediaType);
    return;
  }
  showStatus('AI 자동 스케일: 도면 분석 중... (10~30초)');
  const prompt=`이 건축 도면에서 치수 텍스트(예: "3000", "2400mm", "5.5m", "3,000")와 그것이 측정하는 선분의 양 끝점 픽셀 좌표를 추출하세요.

응답은 다음 JSON 형식만 (마크다운 코드블록·다른 텍스트 모두 제외):
{
  "dimensions": [
    {"value_mm": 3000, "p1": [123, 456], "p2": [789, 456], "label": "3000mm"}
  ]
}

규칙:
- value_mm은 mm 단위 정수 (m 단위면 ×1000, 콤마 제거)
- p1, p2는 입력 이미지 픽셀 좌표 (좌상단 0,0 기준)
- 끝점은 치수선 양 끝 또는 측정 대상 벽의 양 끝
- 최소 3개, 최대 8개
- 명확한 것만 (애매하면 제외)
- 방 이름·가구명 등 다른 텍스트는 무시`;

  try{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key':apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1500,
        messages:[{
          role:'user',
          content:[
            {type:'image',source:{type:'base64',media_type:mediaType,data:base64Data}},
            {type:'text',text:prompt},
          ],
        }],
      }),
    });
    if(!resp.ok){
      const errText=await resp.text();
      throw new Error('API '+resp.status+': '+errText.substring(0,200));
    }
    const data=await resp.json();
    const text=data.content&&data.content[0]&&data.content[0].text;
    if(!text) throw new Error('AI 응답 비어있음');
    // JSON 추출 (마크다운 코드블록 처리 포함)
    const jsonMatch=text.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('JSON 형식 응답 없음. AI 응답: '+text.substring(0,200));
    const parsed=JSON.parse(jsonMatch[0]);
    const dims=parsed.dimensions||[];
    if(dims.length===0) throw new Error('치수가 도면에서 인식되지 않음');

    // 각 치수에서 pixel↔mm 비율 계산 (이미지 native px 기준)
    const ratios=[];
    dims.forEach(d=>{
      if(!Array.isArray(d.p1)||!Array.isArray(d.p2)||!d.value_mm) return;
      const pxDist=Math.hypot(d.p2[0]-d.p1[0],d.p2[1]-d.p1[1]);
      if(pxDist<1) return;
      const scale=mmToPx(d.value_mm)/pxDist;
      ratios.push({scale,value_mm:d.value_mm,pxDist,label:d.label||(d.value_mm+'mm')});
    });
    if(ratios.length===0) throw new Error('유효한 치수가 없음 (좌표 누락)');

    // 중앙값 (이상치 제거)
    const scales=ratios.map(r=>r.scale).sort((a,b)=>a-b);
    const medianScale=scales[Math.floor(scales.length/2)];

    // 신뢰도 검증: 중앙값에서 ±15% 이상 벗어나는 비율 개수
    const tolerance=0.15;
    const consistent=ratios.filter(r=>Math.abs(r.scale-medianScale)/medianScale<tolerance).length;
    const reliability=Math.round(consistent/ratios.length*100);

    STATE.bgImage.scale=medianScale;
    drawGrid();refreshBgImageUI();

    const detail=ratios.map(r=>r.label+'='+Math.round(r.pxDist)+'px').join(' / ');
    showStatus('AI 스케일 완료 — '+ratios.length+'개 치수, 신뢰도 '+reliability+'%. '+detail);
    if(reliability<70){
      setTimeout(()=>{
        alert('AI 인식 신뢰도가 낮습니다 ('+reliability+'%). 결과 재확인 후 필요 시 📐 수동 보정으로 다시 맞춰주세요.');
      },300);
    }
  }catch(err){
    console.error('[AI 자동 스케일]',err);
    alert('AI 자동 스케일 실패\n\n'+err.message+'\n\n📐 수동 스케일 보정을 사용해주세요.');
    showStatus('AI 자동 스케일 실패');
  }
}

const _bgAiScale=document.getElementById('bg-ai-scale');
if(_bgAiScale){
  // 활성화: 항상 클릭 가능 (opacity 제거)
  _bgAiScale.style.opacity='1';
  // 우클릭 → API 키 초기화
  _bgAiScale.addEventListener('contextmenu',e=>{
    e.preventDefault();
    if(confirm('저장된 Anthropic API 키를 삭제할까요?')){
      try{localStorage.removeItem('minicad.anthropicKey');}catch(_){}
      showStatus('API 키 삭제됨');
    }
  });
  _bgAiScale.addEventListener('click',()=>{
    if(!STATE.bgImage){alert('배경 이미지를 먼저 가져오세요'); return;}
    let key=null;
    try{key=localStorage.getItem('minicad.anthropicKey');}catch(_){}
    if(!key){
      const k=prompt('Anthropic API 키 입력 (sk-ant-... 형식)\n\n도면 치수를 AI가 자동 OCR해서 스케일을 계산합니다.\n키는 브라우저 localStorage에만 저장됩니다.\n발급: https://console.anthropic.com\n\n비용: 도면당 약 $0.005~0.02 (Sonnet 4.6 사용)','');
      if(!k) return;
      if(!k.startsWith('sk-ant-')){alert('잘못된 키 형식 (sk-ant-...로 시작해야 함)'); return;}
      try{localStorage.setItem('minicad.anthropicKey',k);}catch(_){}
      key=k;
    }
    aiAutoScale(key);
  });
}
// v5.8 Task 4: 영상 동선 순서 초기화
const videoSeqResetBtn=document.getElementById('btn-video-seq-reset');
if(videoSeqResetBtn) videoSeqResetBtn.addEventListener('click',()=>{
  STATE.videoSequenceOrder=null;
  refreshVideoSeqUI();refreshJSON();
  showStatus('영상 동선 순서 — 자동(면적순)으로 초기화');
});

// v5.7: AI 프롬프트 힌트 편집 UI 바인딩
['ai-style','ai-mood','ai-light','ai-camera'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  // 초기값 동기화
  const key={'ai-style':'style','ai-mood':'mood','ai-light':'lighting','ai-camera':'cameraSuggestion'}[id];
  el.value=STATE.aiPromptHints[key];
  el.addEventListener('change',e=>{
    STATE.aiPromptHints[key]=e.target.value;
    refreshJSON();
    showStatus('AI 힌트 업데이트: '+key+'='+e.target.value);
  });
});
const palEl=document.getElementById('ai-palette');
if(palEl){
  palEl.value=STATE.aiPromptHints.materialPalette.join(', ');
  palEl.addEventListener('change',e=>{
    STATE.aiPromptHints.materialPalette=e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
    refreshJSON();
    showStatus('팔레트 업데이트: '+STATE.aiPromptHints.materialPalette.length+'종');
  });
}
const sideAIBtn=document.getElementById('btn-ai-bundle-side');
if(sideAIBtn) sideAIBtn.addEventListener('click',exportAIBundle);
document.getElementById('btn-save').addEventListener('click',saveJSON);
document.getElementById('btn-load').addEventListener('click',loadJSON);
document.getElementById('btn-clear-all').addEventListener('click',()=>{
  if(STATE.spaces.length===0&&STATE.walls.length===0) return;
  if(!confirm('모든 객체를 삭제할까요?')) return;
  STATE.spaces=[];STATE.walls=[];STATE.openings=[];
  STATE.furniture=[];STATE.fixtures=[];STATE.lights=[];STATE.electric=[];
  STATE.texts=[];STATE.measures=[];STATE.estimateConfig={};
  STATE.selectedKind=null;STATE.selectedId=null;
  saveHistory();renderAll();refreshUI();showStatus('전체 삭제');
});
document.getElementById('btn-export').addEventListener('click',()=>{
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab==='estimate'));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('active',x.dataset.tabContent==='estimate'));
});
document.getElementById('btn-copy-json').addEventListener('click',()=>copyToClipboard(JSON.stringify(buildJSON(),null,2)));
document.getElementById('btn-help').addEventListener('click',()=>{
  document.getElementById('canvas-help').classList.toggle('visible');
});
document.getElementById('shortcut-close').addEventListener('click',()=>{
  document.getElementById('canvas-help').classList.remove('visible');
});
document.getElementById('canvas-help').addEventListener('click',e=>{
  if(e.target===e.currentTarget) e.currentTarget.classList.remove('visible');
});
document.getElementById('snap-unit').addEventListener('change',e=>{STATE.gridSize=parseInt(e.target.value);drawGrid();showStatus('스냅 거리: '+e.target.value+'mm');});
document.getElementById('ceiling-height').addEventListener('change',e=>{STATE.ceilingHeight=parseInt(e.target.value);refreshUI();});
document.getElementById('wall-thickness').addEventListener('change',e=>{
  const v=parseInt(e.target.value);STATE.wallThickness=v;
  document.getElementById('wall-thickness-input').value=v;
  showStatus('벽체 두께: '+v+'mm');
});
document.getElementById('wall-thickness-input').addEventListener('change',e=>{
  const v=Math.max(10,Math.min(1000,parseInt(e.target.value)||100));
  STATE.wallThickness=v;e.target.value=v;
  // select를 일치하는 옵션으로 맞추거나 없으면 첫 옵션 유지
  const sel=document.getElementById('wall-thickness');
  const match=[...sel.options].find(o=>parseInt(o.value)===v);
  if(match) sel.value=v; else sel.selectedIndex=0;
  showStatus('벽체 두께: '+v+'mm');
});
document.getElementById('project-name').addEventListener('change',e=>{STATE.projectName=e.target.value;});

// v5.9: 내력벽 두께 — 드롭다운 + 직접입력 (벽체 두께와 동일 패턴)
const _bearTSel=document.getElementById('bearing-thickness-select');
const _bearT=document.getElementById('bearing-thickness');
if(_bearTSel){
  _bearTSel.addEventListener('change',e=>{
    const v=parseInt(e.target.value);
    STATE.bearingWallThickness=v;
    if(_bearT) _bearT.value=v;
    renderAll();showStatus('내력벽 두께: '+v+'mm');
  });
}
if(_bearT){
  _bearT.addEventListener('change',e=>{
    const v=Math.max(50,Math.min(800,parseInt(e.target.value)||200));
    STATE.bearingWallThickness=v;e.target.value=v;
    // 드롭다운 동기화 — 일치 옵션 있으면 선택, 없으면 첫 옵션 유지
    if(_bearTSel){
      const match=[...(_bearTSel.options)].find(o=>parseInt(o.value)===v);
      if(match) _bearTSel.value=v;
    }
    renderAll();showStatus('내력벽 두께: '+v+'mm');
  });
}

// v5.9: 기둥 도구 설정 패널 — 형태/너비/높이/L팔두께/회전을 STATE.pillarDefaults에 동기화
['pillar-shape','pillar-w','pillar-h','pillar-t','pillar-rot'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('change',()=>{
    const def=STATE.pillarDefaults||(STATE.pillarDefaults={shape:'rect',width:500,height:500,thickness:200,rotation:0});
    if(id==='pillar-shape') def.shape=el.value;
    else if(id==='pillar-w') def.width=Math.max(50,Math.min(5000,parseInt(el.value)||500));
    else if(id==='pillar-h') def.height=Math.max(50,Math.min(5000,parseInt(el.value)||500));
    else if(id==='pillar-t') def.thickness=Math.max(30,Math.min(800,parseInt(el.value)||200));
    else if(id==='pillar-rot') def.rotation=parseFloat(el.value)||0;
    showStatus('기둥 설정 — '+def.shape+' '+def.width+(def.shape==='rect'||def.shape==='L'?'×'+def.height:'')+'mm @ '+def.rotation+'°');
  });
  el.addEventListener('input',()=>el.dispatchEvent(new Event('change')));
});

// v5.9: 벽 정렬 토글 (프로젝트 패널 + FAB 동기화)
const ALIGN_LABELS={interior:'내벽',center:'중심',exterior:'외벽'};
function setWallAlignment(a,opts={}){
  if(!['interior','center','exterior'].includes(a)) a='interior';
  STATE.wallAlignment=a;
  document.querySelectorAll('#align-toggle .align-btn').forEach(b=>b.classList.toggle('active',b.dataset.align===a));
  const fab=document.getElementById('align-fab');
  if(fab){fab.textContent='정렬: '+ALIGN_LABELS[a];fab.classList.toggle('active',a!=='center');}
  // initKonva 전에 호출되면 renderAll이 groups 미정의로 터지므로 가드
  if(typeof groups!=='undefined'&&groups&&groups.walls){
    renderAll();
  }
  if(!opts.silent&&typeof showStatus==='function'){showStatus('벽 정렬: '+ALIGN_LABELS[a]);}
}
document.querySelectorAll('#align-toggle .align-btn').forEach(b=>{
  b.addEventListener('click',()=>setWallAlignment(b.dataset.align));
});
const _alignFab=document.getElementById('align-fab');
if(_alignFab){
  _alignFab.addEventListener('click',()=>{
    const order=['interior','center','exterior'];
    const cur=STATE.wallAlignment||'interior';
    const next=order[(order.indexOf(cur)+1)%order.length];
    setWallAlignment(next);
  });
}
// 초기 정렬 상태 반영 — UI 버튼 클래스만 업데이트, 렌더링은 initUI에서
setWallAlignment(STATE.wallAlignment||'interior',{silent:true});
document.getElementById('zoom-in').addEventListener('click',()=>zoomBy(1.2));
document.getElementById('zoom-out').addEventListener('click',()=>zoomBy(0.8));
document.getElementById('zoom-fit').addEventListener('click',zoomFit);

// ===== Boolean 메뉴 이벤트 초기화 =====
(function initBoolMenu(){
  const menu=document.getElementById('bool-menu');
  if(!menu) return;
  // 버튼 클릭
  menu.querySelectorAll('.bool-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();applyBoolOp(btn.dataset.op);});
  });
  // 외부 클릭 시 닫기
  document.addEventListener('mousedown',e=>{
    if(menu.style.display!=='none'&&!menu.contains(e.target)) hideBoolMenu();
  });
})();

// ===== 리사이즈 =====
function handleResize(){const sz=getContainerSize();stage.size(sz);drawGrid();renderAll();}
window.addEventListener('resize',handleResize);

// ===== AutoCAD 스타일 명령어 시스템 =====
const CMD_HINTS={
  select:'선택(V): 클릭=단일 / 드래그=박스(좌→우 Window/우→좌 Crossing) / Del=일괄삭제',
  rect:'사각공간(R): 클릭 → 폭 → 높이 / 또는 드래그',
  polygon:'다각공간(P): 꼭짓점 수 입력 → 중심 클릭 → 반지름(mm) 입력',
  circlespace:'원형공간(G): 중심 클릭 → 반지름(mm) Enter / 또는 드래그',
  wall:'벽(B): 클릭+클릭 또는 클릭→길이 입력 (두께 100mm)',
  line:'선(L): 클릭+클릭 또는 클릭→길이 입력 / 공간 내부 → 공간 분할',
  door:'문(D): 공간/벽 가까이 클릭 → 자동 각도 정렬',
  window:'창(W): 공간/벽 가까이 클릭 → 자동 각도 정렬',
  furniture:'1 가구: 라이브러리 선택 → 클릭',
  fixture:'2 위생/주방: 라이브러리 선택 → 클릭',
  light:'3 조명: 라이브러리 선택 → 클릭',
  electric:'4 전기: 라이브러리 선택 → 클릭',
  hvac:'5 공조/소방: 라이브러리 선택 → 클릭',
  text:'텍스트(T): 위치 클릭 → 텍스트 입력 Enter',
  measure:'줄자(M): 첫 점 클릭 → 거리 또는 두 번째 점 클릭',
  dimwall:'벽치수(I): 벽 클릭 → 양 끝점 기준 자동 치수선 생성',
  pan:'화면이동(H): 마우스 드래그 또는 휠클릭 드래그',
  circle:'원(C): 클릭 → 반지름(mm) Enter / 또는 드래그',
  arc:'아크(A): 클릭 → 반지름 → 시작각° → 끝각°',
  trim:'트림(tr): 자를 선분 클릭 — 다른 선분과 교차 부분 제거',
  break:'분할(br): 선분 클릭한 위치에서 둘로 분할',
  eraser:'지우개(E): 지울 객체 클릭 — 벽/공간/문/가구 등 모든 객체 삭제',
  offset:'옵셋(O): 거리 입력 → 객체 클릭 → 방향 클릭',
  mirror:'미러(mi): 객체 선택 후 → 기준선 1점 → 2점 → 대칭 복제',
  leader:'지시선(le): 화살표 끝점 클릭 → 꺾임점 클릭 → 더블클릭/Enter로 텍스트 입력',
};

function toggleSection(el){el.parentElement.classList.toggle('collapsed');}
function cmdToast(msg){
  const el=document.getElementById('cmd-toast');
  el.textContent=msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer=setTimeout(()=>el.classList.add('hidden'),2200);
}

// ===== v5.1 단계별 프롬프트 모드 =====
function enterCmdMode(mode,data,promptLabel,hintText){
  STATE.cmdMode=mode;
  STATE.cmdData=data||{};
  document.getElementById('cmd-prompt').textContent=promptLabel||'▶';
  document.getElementById('cmd-prompt').style.color='#E2725B'; // 주황: 입력 대기 강조
  if(hintText) document.getElementById('cmd-hint').textContent=hintText;
  const inp=document.getElementById('cmd-input');
  inp.value='';
  inp.focus();
  inp.placeholder=hintText||'';
  // 단축키 문자(o, x 등)가 포커스 직후 입력창에 삽입되는 것 방지
  setTimeout(()=>{inp.value='';},0);
}
function exitCmdMode(){
  STATE.cmdMode=null;
  STATE.cmdData={};
  document.getElementById('cmd-prompt').textContent='▶';
  document.getElementById('cmd-prompt').style.color='';
  const tool=STATE.selectedTool;
  document.getElementById('cmd-hint').textContent=CMD_HINTS[tool]||'명령어 입력';
  document.getElementById('cmd-input').placeholder='명령어 — 도구 선택 후 캔버스 클릭하면 단계별 입력 / @W,H / r 90 / del / ?';
}

function doEnterAction(){
  const inp=document.getElementById('cmd-input');
  if(document.activeElement===inp){
    const cmd=inp.value;
    if(cmd.trim()){
      processCommand(cmd);
      inp.value='';
      // v5.9: 다음 단계 cmdMode가 활성이면 (예: rect-w → rect-h) 포커스 유지
      if(STATE.cmdMode){inp.focus();}
      else{inp.blur();}
    }
    else{inp.blur();}
  }else{
    inp.focus();
  }
}

function processCommand(rawCmd){
  const c=rawCmd.trim();
  if(!c) return;
  // 히스토리
  STATE.cmdHistory.unshift(c);
  if(STATE.cmdHistory.length>50) STATE.cmdHistory.pop();
  STATE.cmdHistoryIdx=-1;

  // v5.1 단계별 프롬프트 모드 우선 처리
  if(STATE.cmdMode){
    if(handleCmdModeInput(c)) return;
  }

  // 도움말
  if(c==='/'||c==='?'||c.toLowerCase()==='help'){showCmdHelp();return;}

  // v5.2: 직교 명령어
  if(/^ortho(\s+(on|off))?$/i.test(c)){
    const mm=c.match(/^ortho(\s+(on|off))?$/i);
    if(mm&&mm[2]){STATE.snap.ortho=mm[2].toLowerCase()==='on';}
    else{STATE.snap.ortho=!STATE.snap.ortho;}
    cmdToast('직교 (Ortho) '+(STATE.snap.ortho?'ON':'OFF'));
    updateOrthoFAB();
    const cb=document.querySelector('input[data-snap="ortho"]');
    if(cb) cb.checked=STATE.snap.ortho;
    return;
  }
  // v5.3: 트림 / 브레이크 도구 진입
  if(/^(tr|trim)$/i.test(c)){setTool('trim');cmdToast('트림 모드 — 자를 부분 클릭');return;}
  if(/^(br|break)$/i.test(c)){setTool('break');cmdToast('분할 모드 — 분할할 위치 클릭');return;}
  // v5.3: 원·아크 명령어
  if(/^(circle|cir)$/i.test(c)){setTool('circle');return;}
  if(/^(arc|ar)$/i.test(c)){setTool('arc');return;}
  // v5.4: 치수 명령어
  if(/^(di|dim|dimwall)$/i.test(c)){setTool('dimwall');cmdToast('치수 모드 — 벽 클릭');return;}
  // v5.6: 옵셋·미러·선 명령어
  if(/^(o|of|offset)$/i.test(c)){setTool('offset');return;}
  if(/^(mi|mirror)$/i.test(c)){startMirror();return;}
  if(/^(le|leader)$/i.test(c)){setTool('leader');cmdToast('지시선 — 화살표 끝점 클릭, 더블클릭으로 텍스트 입력');return;}
  if(/^(l|line)$/i.test(c)){setTool('line');return;}
  if(/^(b|wall|벽)$/i.test(c)){setTool('wall');return;}

  // del / delete
  if(/^(del|delete|d)$/i.test(c)){deleteSelected();cmdToast('삭제');return;}

  // v5.9: cv / curve — 선택된 아크를 자유 곡선으로 변환
  if(/^(cv|curve|곡선)$/i.test(c)){convertArcToCurve();return;}

  // r [angle] — 회전
  const rotM=c.match(/^r\s+(-?\d+\.?\d*)$/i);
  if(rotM){const ang=parseFloat(rotM[1]);rotateSelectedBy(ang);return;}

  // m x,y — 이동
  const mvM=c.match(/^m\s+(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/i);
  if(mvM){moveSelectedBy(parseFloat(mvM[1]),parseFloat(mvM[2]));return;}

  // cp x,y — 복제
  const cpM=c.match(/^cp\s+(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/i);
  if(cpM){duplicateSelectedAt(parseFloat(cpM[1]),parseFloat(cpM[2]));return;}

  // @x,y — 상대 좌표
  const relM=c.match(/^@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if(relM){handleRelativeCoord(parseFloat(relM[1]),parseFloat(relM[2]));return;}

  // W,H,D — 도어/창 3차원 크기
  const d3M=c.match(/^(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)$/);
  if(d3M){handleSizeInput(parseFloat(d3M[1]),parseFloat(d3M[2]),parseFloat(d3M[3]));return;}

  // WxHxD 또는 W×H×D
  const xM=c.match(/^(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)(?:\s*[x×]\s*(\d+\.?\d*))?$/i);
  if(xM){handleSizeInput(parseFloat(xM[1]),parseFloat(xM[2]),xM[3]?parseFloat(xM[3]):null);return;}

  // x,y — 절대좌표 또는 2D 크기
  const absM=c.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if(absM){handleAbsoluteOrSize(parseFloat(absM[1]),parseFloat(absM[2]));return;}

  cmdToast('알 수 없는 명령: '+c+' — / 또는 ? 로 도움말');
}

function handleCmdModeInput(c){
  const mode=STATE.cmdMode;
  // 공통: 'esc'/'cancel' 입력으로 취소
  if(/^(esc|cancel|q)$/i.test(c)){
    drawState=null;STATE.measureFirst=null;polyState=null;
    drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    cmdToast('취소');
    return true;
  }

  // ===== rect-w: 폭 입력 대기 =====
  // v5.6: offset-d 옵셋 거리 입력
  if(mode==='offset-d'){
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 거리(mm) 입력');return true;}
    offsetState={distance:num};
    exitCmdMode();
    cmdToast('거리 '+num+'mm 설정 — 옵셋할 객체 클릭');
    return true;
  }

  // ===== circlespace-r: 원형공간 반지름 =====
  if(mode==='circlespace-r'){
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    const{cx,cy}=STATE.cmdData;
    addCircleSpace(cx,cy,num);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    return true;
  }
  // v5.3 ===== circle-r: 원 반지름 =====
  if(mode==='circle-r'){
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    if(drawState&&drawState.type==='circle'){
      addCircle(drawState.center.x,drawState.center.y,num);
    }else{
      addCircle(0,0,num);
    }
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    return true;
  }
  // v5.3 ===== arc-r: 아크 반지름 =====
  if(mode==='arc-r'){
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    STATE.cmdData.r=num;
    enterCmdMode('arc-start',STATE.cmdData,'시작각(°):','시작 각도 (0=동쪽, 90=북, 180=서, 270=남)');
    return true;
  }
  if(mode==='arc-start'){
    const num=parseFloat(c);
    if(!isFinite(num)){cmdToast('각도(°) 입력');return true;}
    STATE.cmdData.startAngle=num;
    enterCmdMode('arc-end',STATE.cmdData,'끝각(°):','끝 각도 (시계방향)');
    return true;
  }
  if(mode==='arc-end'){
    const num=parseFloat(c);
    if(!isFinite(num)){cmdToast('각도(°) 입력');return true;}
    const r=STATE.cmdData.r, sa=STATE.cmdData.startAngle, ea=num;
    const cx=drawState&&drawState.type==='arc'?drawState.center.x:0;
    const cy=drawState&&drawState.type==='arc'?drawState.center.y:0;
    addArc(cx,cy,r,sa,ea);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    return true;
  }

  if(mode==='rect-w'){
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 폭(mm) 입력 필요');return true;}
    STATE.cmdData.w=Math.round(num);
    enterCmdMode('rect-h',STATE.cmdData,'높이(mm):','세로 길이 입력 후 Enter');
    return true;
  }
  // ===== rect-h: 높이 입력 → 사각공간 생성 =====
  if(mode==='rect-h'){
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 높이(mm) 입력 필요');return true;}
    const h=Math.round(num);
    const w=STATE.cmdData.w;
    const start=(drawState&&drawState.type==='rect')?drawState.start:{x:0,y:0};
    addSpace([
      {x:start.x,y:start.y},{x:start.x+w,y:start.y},
      {x:start.x+w,y:start.y+h},{x:start.x,y:start.y+h},
    ]);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    cmdToast('사각공간 '+w+'×'+h+'mm 생성');
    return true;
  }

  // ===== wall-len: 벽 길이 입력 → 마우스 방향으로 생성 =====
  if(mode==='wall-len'){
    if(!drawState||(drawState.type!=='wall'&&drawState.type!=='line')){exitCmdMode();return true;}
    const isLineMode=drawState.type==='line';
    const isGabyeok=STATE.selectedTool==='gabyeok';
    const wallOpts={wallType:isGabyeok?'bearing':'standard'};
    // @dx,dy 형식도 허용
    const relM=c.match(/^@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if(relM){
      const dx=parseFloat(relM[1]),dy=parseFloat(relM[2]);
      const s=drawState.start;
      const endX=s.x+dx, endY=s.y+dy;
      isLineMode?addLine(s.x,s.y,endX,endY):addWall(s.x,s.y,endX,endY,wallOpts);
      drawGroup.destroyChildren();previewLayer.batchDraw();
      // v5.9: 선·벽 모두 @dx,dy 입력 후도 연속 모드 유지
      drawState={type:isLineMode?'line':'wall',start:{x:endX,y:endY},current:{x:endX,y:endY}};
      cmdToast((isLineMode?'선':(isGabyeok?'내력벽':'벽'))+' 추가 — 다음 끝점 클릭 또는 길이 입력 (Esc 종료)');
      return true;
    }
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 길이(mm) 또는 @dx,dy 입력');return true;}
    const s=drawState.start;
    let dx=drawState.current.x-s.x, dy=drawState.current.y-s.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<1){dx=1;dy=0;} else {dx/=d;dy/=d;}
    let endX,endY;
    const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
    if(orthoActive){
      if(Math.abs(dx)>=Math.abs(dy)){endX=s.x+Math.sign(dx||1)*num;endY=s.y;}
      else{endX=s.x;endY=s.y+Math.sign(dy)*num;}
    }else{
      endX=s.x+dx*num;endY=s.y+dy*num;
    }
    endX=snapMm(endX);endY=snapMm(endY);
    isLineMode?addLine(s.x,s.y,endX,endY):addWall(s.x,s.y,endX,endY,wallOpts);
    drawGroup.destroyChildren();previewLayer.batchDraw();
    // v5.9: 선·벽·내력벽 모두 거리 입력 후 연속 모드 유지
    drawState={type:isLineMode?'line':'wall',start:{x:endX,y:endY},current:{x:endX,y:endY}};
    const tag=isLineMode?'선':(isGabyeok?'내력벽':'벽');
    cmdToast(tag+' '+Math.round(num)+'mm — 다음 끝점 클릭 또는 길이 입력 (Esc 종료)');
    return true;
  }

  // ===== polygon-n: 꼭짓점 수 입력 =====
  if(mode==='polygon-n'){
    const n=parseInt(c);
    if(!isFinite(n)||n<3||n>20){cmdToast('3~20 사이 정수 입력');return true;}
    polyState={n,phase:'center'};
    // Enter keyup 이 캔버스로 전파되어 즉시 center 클릭으로 처리되는 것을 방지
    polyClickGuard=true;
    setTimeout(()=>{polyClickGuard=false;},200);
    exitCmdMode();
    document.getElementById('cmd-hint').textContent=n+'각형 — 중심점을 클릭하세요';
    cmdToast(n+'각형 — 중심점을 클릭하세요');
    return true;
  }

  // ===== polygon-r: 반지름 입력 =====
  if(mode==='polygon-r'){
    if(!polyState||!polyState.center){exitCmdMode();return true;}
    const r=parseFloat(c);
    if(!isFinite(r)||r<50){cmdToast('50mm 이상 반지름 입력');return true;}
    createRegularPolygon(polyState.center,r,polyState.n);
    return true;
  }

  // ===== measure-rel: 줄자 두 번째 점 =====
  if(mode==='measure-rel'){
    if(!STATE.measureFirst){exitCmdMode();return true;}
    const relM=c.match(/^@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    let endX,endY;
    if(relM){
      endX=STATE.measureFirst.x+parseFloat(relM[1]);
      endY=STATE.measureFirst.y+parseFloat(relM[2]);
    }else{
      const num=parseFloat(c);
      if(!isFinite(num)||num<=0){cmdToast('거리(mm) 또는 @dx,dy 입력');return true;}
      const s=STATE.measureFirst;
      let dx=(STATE.cmdData.curX!=null?STATE.cmdData.curX:s.x+1)-s.x;
      let dy=(STATE.cmdData.curY!=null?STATE.cmdData.curY:s.y)-s.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<1){dx=1;dy=0;} else {dx/=d;dy/=d;}
      const orthoActiveM=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
      if(orthoActiveM){
        if(Math.abs(dx)>=Math.abs(dy)){endX=s.x+Math.sign(dx||1)*num;endY=s.y;}
        else{endX=s.x;endY=s.y+Math.sign(dy)*num;}
      }else{endX=s.x+dx*num;endY=s.y+dy*num;}
    }
    endX=snapMm(endX);endY=snapMm(endY);
    STATE.measures.push({id:makeId('m'),x1:STATE.measureFirst.x,y1:STATE.measureFirst.y,x2:endX,y2:endY});
    STATE.measureFirst=null;
    saveHistory();renderAll();refreshUI();
    exitCmdMode();
    cmdToast('치수선 추가');
    return true;
  }

  // ===== text-input: 텍스트 입력 =====
  if(mode==='text-input'){
    if(!STATE.cmdData.pos){exitCmdMode();return true;}
    if(!c){exitCmdMode();return true;}
    const p=STATE.cmdData.pos;
    STATE.texts.push({id:makeId('t'),x:p.x,y:p.y,text:c,fontSize:14});
    saveHistory();renderAll();refreshUI();
    exitCmdMode();
    cmdToast('텍스트 추가');
    return true;
  }

  // ===== leader-text: 지시선 텍스트 입력 =====
  if(mode==='leader-text'){
    const pts=STATE.cmdData.points;
    if(!pts||pts.length<2){exitCmdMode();return true;}
    STATE.leaders.push({id:makeId('ld'),points:pts,text:c||'',fontSize:13});
    saveHistory();renderAll();refreshUI();
    exitCmdMode();
    setTool('leader');
    cmdToast('지시선 추가 — 계속 클릭하거나 Esc');
    return true;
  }

  // ===== rotate-space: 공간 회전 각도 입력 =====
  if(mode==='rotate-space'){
    const ang=parseFloat(c);
    if(isNaN(ang)){cmdToast('숫자를 입력하세요 (예: 45, -90)');return true;}
    rotateSpaceByAngle(STATE.cmdData.spaceId,ang);
    saveHistory();renderAll();refreshUI();
    cmdToast('공간 회전 '+ang+'°');
    exitCmdMode();
    return true;
  }

  return false; // 처리 안됨 → processCommand 일반 흐름으로
}

function handleRelativeCoord(dx,dy){
  // 객체 선택된 상태에서는 이동
  if(STATE.selectedKind&&STATE.selectedId&&STATE.selectedTool==='select'){
    moveSelectedBy(dx,dy);
    return;
  }
  // 사각공간
  if(STATE.selectedTool==='rect'){
    if(drawState&&drawState.type==='rect'){
      const start=drawState.start;
      addSpace([
        {x:start.x,y:start.y},{x:start.x+dx,y:start.y},
        {x:start.x+dx,y:start.y+dy},{x:start.x,y:start.y+dy},
      ]);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('사각공간 '+dx+'×'+dy+'mm 생성');
    }else{
      addSpace([{x:0,y:0},{x:dx,y:0},{x:dx,y:dy},{x:0,y:dy}]);
      cmdToast('사각공간 '+dx+'×'+dy+'mm 생성 (원점)');
      zoomFit();
    }
  }
  // 정다각형 — @dx,dy 입력 미지원 (꼭짓점 수·반지름으로 생성)
  else if(STATE.selectedTool==='polygon'){
    cmdToast('정다각형: 꼭짓점 수 입력 후 중심 클릭 → 반지름 입력');
  }
  // 벽
  else if(STATE.selectedTool==='wall'){
    if(drawState&&drawState.type==='wall'){
      const start=drawState.start;
      addWall(start.x,start.y,start.x+dx,start.y+dy);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('벽 추가: '+Math.round(Math.sqrt(dx*dx+dy*dy))+'mm');
    }else{addWall(0,0,dx,dy);cmdToast('벽 추가 (원점부터)');}
  }
  // 선
  else if(STATE.selectedTool==='line'){
    if(drawState&&drawState.type==='line'){
      const start=drawState.start;
      addLine(start.x,start.y,start.x+dx,start.y+dy);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('선 추가: '+Math.round(Math.sqrt(dx*dx+dy*dy))+'mm');
    }else{addLine(0,0,dx,dy);cmdToast('선 추가 (원점부터)');}
  }
  // 줄자
  else if(STATE.selectedTool==='measure'){
    if(STATE.measureFirst){
      const end={x:STATE.measureFirst.x+dx,y:STATE.measureFirst.y+dy};
      STATE.measures.push({id:makeId('m'),x1:STATE.measureFirst.x,y1:STATE.measureFirst.y,x2:end.x,y2:end.y});
      STATE.measureFirst=null;
      saveHistory();renderAll();refreshUI();
      cmdToast('치수선 추가');
    }else{
      cmdToast('첫 점 클릭 후 @x,y 입력');
    }
  }
  // 가구/위생/조명/전기 — 선택된 라이브러리 객체 추가
  else if(['furniture','fixture','light','electric'].includes(STATE.selectedTool)&&STATE.selectedLib){
    const kind=STATE.selectedTool==='fixture'?'fixtures':STATE.selectedTool+'s';
    const k=kind==='lights'?'lights':kind==='furnitures'?'furniture':kind;
    const target=k==='furnitures'?'furniture':k;
    const o={id:makeId(target.charAt(0)),type:STATE.selectedLib,x:dx,y:dy,angle:0};
    if(target==='fixtures') STATE.fixtures.push(o);
    else if(target==='furniture') STATE.furniture.push(o);
    else if(target==='lights') STATE.lights.push(o);
    else if(target==='electric') STATE.electric.push(o);
    saveHistory();renderAll();refreshUI();
    cmdToast(target+' 추가됨');
  }else{
    cmdToast('도구 또는 객체 선택 필요');
  }
}

function handleAbsoluteOrSize(x,y){
  // 도어/창 선택 상태 = W,H 변경
  if(STATE.selectedKind==='opening'){
    const o=STATE.openings.find(op=>op.id===STATE.selectedId);
    if(o){
      o.width_mm=Math.round(x);o.height_mm=Math.round(y);
      saveHistory();renderAll();refreshUI();
      cmdToast('개구부 W:'+x+' × H:'+y+'mm');
      return;
    }
  }
  // 사각공간 도구 + 시작점 없음 = 시작점 (절대좌표)으로 설정
  if(STATE.selectedTool==='rect'&&(!drawState||drawState.type!=='rect')){
    drawState={type:'rect',start:{x:Math.round(x),y:Math.round(y)},current:{x:Math.round(x),y:Math.round(y)}};
    updatePreview();
    cmdToast('첫 점 ('+x+','+y+') — @W,H로 끝점 입력');
    return;
  }
  // 사각공간 + 시작점 있음 = W,H로 크기 적용
  if(STATE.selectedTool==='rect'&&drawState&&drawState.type==='rect'){
    handleSizeInput(x,y,null);
    return;
  }
  // 객체 선택 상태 = 절대 위치로 이동
  if(STATE.selectedKind&&STATE.selectedId){
    const arr=getArr(STATE.selectedKind);
    if(arr){
      const obj=arr.find(o=>o.id===STATE.selectedId);
      if(obj&&'x' in obj){
        const dx=x-obj.x,dy=y-obj.y;
        moveSelectedBy(dx,dy);
        return;
      }
    }
  }
  cmdToast('컨텍스트 불명 — 도구/객체 선택 후 다시 시도');
}

function handleSizeInput(w,h,d){
  // 도어/창 선택 시 크기 적용
  if(STATE.selectedKind==='opening'){
    const o=STATE.openings.find(op=>op.id===STATE.selectedId);
    if(o){
      o.width_mm=Math.round(w);o.height_mm=Math.round(h);
      if(d!==null) o.depth_mm=Math.round(d);
      saveHistory();renderAll();refreshUI();
      cmdToast('크기: '+w+'×'+h+(d?'×'+d:'')+'mm');
      return;
    }
  }
  // 사각공간 + 시작점 = 끝점 결정
  if(STATE.selectedTool==='rect'&&drawState&&drawState.type==='rect'){
    const start=drawState.start;
    addSpace([
      {x:start.x,y:start.y},{x:start.x+w,y:start.y},
      {x:start.x+w,y:start.y+h},{x:start.x,y:start.y+h},
    ]);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    cmdToast('사각공간 '+w+'×'+h+'mm 생성');
    return;
  }
  // 사각공간 도구만 활성 = 원점에서
  if(STATE.selectedTool==='rect'){
    addSpace([{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]);
    cmdToast('사각공간 '+w+'×'+h+'mm 생성 (원점)');
    zoomFit();
    return;
  }
  cmdToast('사각공간 도구 또는 도어/창 선택 필요');
}

function moveSelectedBy(dx,dy){
  const targets=getSelectedTargets();
  if(targets.length===0){cmdToast('객체 선택 필요');return;}
  let n=0;
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    if('x' in obj){obj.x+=dx;obj.y+=dy;}
    if('v1Id' in obj){
      moveVertex(obj.v1Id,obj.x1+dx,obj.y1+dy);
      moveVertex(obj.v2Id,obj.x2+dx,obj.y2+dy);
    } else if('x1' in obj){
      obj.x1+=dx;obj.y1+=dy;obj.x2+=dx;obj.y2+=dy;
    }
    if('vertexIds' in obj){
      obj.vertexIds.forEach(vid=>{const v=getVertex(vid);if(v){v.x=Math.round(v.x+dx);v.y=Math.round(v.y+dy);}});
    } else if(obj.polygon){
      obj.polygon=obj.polygon.map(p=>({x:p.x+dx,y:p.y+dy}));
    }
    n++;
  });
  if(n===0) return;
  saveHistory();renderAll();refreshUI();
  cmdToast('이동: '+dx+','+dy+'mm ('+n+'개)');
}

function rotateSelectedBy(angle){
  // 공간 선택 시: 점·선·면·벽·치수 포함 전체 회전
  if(STATE.selectedKind==='space'&&STATE.selectedId){
    rotateSpaceByAngle(STATE.selectedId,angle);
    saveHistory();renderAll();refreshUI();
    cmdToast('공간 회전 '+angle+'°');
    return;
  }
  const targets=getSelectedTargets();
  if(targets.length===0){cmdToast('객체 선택 필요');return;}
  let n=0;
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    if(!('angle' in obj)) return;
    obj.angle=((obj.angle||0)+angle)%360; n++;
  });
  if(n===0){cmdToast('회전 가능 객체 없음');return;}
  saveHistory();renderAll();
  cmdToast('회전 '+angle+'° ('+n+'개)');
}

function duplicateSelectedAt(dx,dy){
  const targets=getSelectedTargets();
  if(targets.length===0){cmdToast('객체 선택 필요');return;}
  const newSel=[];
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    const copy=JSON.parse(JSON.stringify(obj));
    copy.id=makeId(t.kind.charAt(0));
    if('x' in copy){copy.x+=dx;copy.y+=dy;}
    if('v1Id' in copy){
      copy.v1Id=ensureVertex(copy.x1+dx,copy.y1+dy).id;
      copy.v2Id=ensureVertex(copy.x2+dx,copy.y2+dy).id;
      reinstallVEF(copy);
    } else if('x1' in copy){
      copy.x1+=dx;copy.y1+=dy;copy.x2+=dx;copy.y2+=dy;
    }
    if('vertexIds' in copy&&copy.polygon){
      copy.vertexIds=copy.polygon.map(p=>ensureVertex(p.x+dx,p.y+dy).id);
      reinstallVEF(copy);
    } else if(copy.polygon&&!('vertexIds' in copy)){
      copy.polygon=copy.polygon.map(p=>({x:p.x+dx,y:p.y+dy}));
    }
    arr.push(copy);
    newSel.push({kind:t.kind,id:copy.id});
  });
  if(targets.length>1){STATE.boxSelection=newSel;STATE.selectedKind=null;STATE.selectedId=null;}
  saveHistory();renderAll();refreshUI();
  cmdToast('복제: '+dx+','+dy+'mm ('+targets.length+'개)');
}

function showCmdHelp(){
  alert(`ECOREAN MiniCAD v5.1 — AutoCAD 스타일 단계별 입력

[새 워크플로우 v5.1 — 클릭 후 명령창 자동 활성]

▶ 사각공간 (R 키)
  1. R 키 → 사각공간 도구
  2. 캔버스 시작점 클릭
  3. 명령창에 "폭(mm):" 자동 표시 → 4500 Enter
  4. "높이(mm):" → 3200 Enter
  → 4.5m × 3.2m 사각공간 생성
  (드래그 방식도 여전히 가능)

▶ 벽 (A 키)
  1. A 키 → 벽 도구
  2. 시작점 클릭
  3. 마우스 위치로 방향 결정
  4. "길이(mm):" → 3000 Enter
  → 마우스 방향으로 3m 벽 생성
  Shift 누르면 직각 강제 (수평/수직)

▶ 다각공간 (P 키) — L자 거실
  1. P 키 → 첫 점 클릭
  2. 마우스 동쪽 → 5000 Enter (5m)
  3. 마우스 북쪽 → 3000 Enter
  4. 또는 @-2000,0 형식도 가능
  5. c Enter 또는 더블클릭으로 닫기

▶ 줄자 (M 키)
  1. M 키 → 첫 점 클릭
  2. 두 번째 점 클릭 또는
  3. 길이(mm) Enter / @dx,dy Enter

▶ 텍스트 (T 키)
  1. T 키 → 위치 클릭
  2. 명령창에 텍스트 입력 → Enter

[기존 명령 (cmdMode 외)]
@W,H        상대 좌표 (예: @4500,3200)
W,H,D       3차원 크기 (도어/창 풀 변경)
WxHxD       크기 (예: 1200x1500x200)
r 90        90도 회전 (객체 선택 후)
m 500,300   500mm 우, 300mm 아래로 이동
cp 1000,0   1000mm 우로 복제
del         삭제

[취소 / 도움말]
esc         현재 입력 모드 취소 (또는 명령창에 'esc' 입력)
↑ ↓        명령어 히스토리 탐색
/ 또는 ?    이 도움말 표시

[원칙]
모든 단위 mm. 좌표는 우측(+X) 아래쪽(+Y).
스냅 ON 시 자동 정렬. 클릭 후 명령창은 자동 포커스됨.`);
}

// 명령어 입력 이벤트
const cmdInput=document.getElementById('cmd-input');
cmdInput.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    e.preventDefault();
    doEnterAction();
  }else if(e.key==='ArrowUp'){
    e.preventDefault();
    if(STATE.cmdHistoryIdx+1<STATE.cmdHistory.length){
      STATE.cmdHistoryIdx++;
      cmdInput.value=STATE.cmdHistory[STATE.cmdHistoryIdx];
    }
  }else if(e.key==='ArrowDown'){
    e.preventDefault();
    if(STATE.cmdHistoryIdx>0){
      STATE.cmdHistoryIdx--;
      cmdInput.value=STATE.cmdHistory[STATE.cmdHistoryIdx];
    }else if(STATE.cmdHistoryIdx===0){
      STATE.cmdHistoryIdx=-1;
      cmdInput.value='';
    }
  }else if(e.key==='Escape'){
    e.preventDefault();
    cmdInput.value='';
    STATE.cmdHistoryIdx=-1;
    // v5.1: cmdMode 활성 시 모드 종료 + drawState 클리어
    if(STATE.cmdMode){
      drawState=null;STATE.measureFirst=null;polyState=null;
      drawGroup.destroyChildren();previewLayer.batchDraw();
      exitCmdMode();
      cmdToast('취소');
    }
    cmdInput.blur();
  }
});

document.getElementById('btn-cmd-help').addEventListener('click',showCmdHelp);

// 도구 변경 시 힌트 업데이트 + cmdMode 자동 종료 + 라이브러리 패널 갱신
const _origSetTool=setTool;
setTool=function(tool){
  if(STATE.cmdMode){
    drawState=null;STATE.measureFirst=null;polyState=null;
    drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
  }
  _origSetTool(tool);
  const hint=CMD_HINTS[tool]||'명령어 입력';
  document.getElementById('cmd-hint').textContent=hint;
  // v5.6: 라이브러리 도구 활성 시 패널 자동 갱신
  if(['furniture','fixture','light','electric','hvac'].includes(tool)){
    rebuildLibPanel(tool);
  }
  // 정다각형 도구 활성 시 — 꼭짓점 수 입력
  if(tool==='polygon'){
    polyState=null;
    enterCmdMode('polygon-n',{},'꼭짓점 수:','3~20 정수 입력 (예: 6 = 정육각형)');
  }
  // v5.9: offset 도구 활성 시 — distance 없을 때만 거리 입력, 있으면 바로 재사용
  if(tool==='offset'){
    if(!offsetState?.distance){
      offsetState=null;
      enterCmdMode('offset-d',{},'옵셋 거리(mm):','거리 Enter → 객체 클릭 → 방향 클릭');
    }else{
      offsetState.target=null;
      drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('옵셋 거리: '+offsetState.distance+'mm — 객체 클릭 (거리 변경: Esc 후 O)');
    }
  }
  // v5.6: mirror 도구 클릭 — 선택 객체 있어야 진행
  if(tool==='mirror'){
    if(STATE.boxSelection.length===0&&!STATE.selectedKind){
      cmdToast('미러: 먼저 객체를 선택 (V 도구로 클릭/박스 선택)');
      _origSetTool('select');
      return;
    }
    mirrorState={phase:'pickLine1'};
    enterCmdMode('mirror-line1',{},'기준선 1점:','기준선 첫 점 클릭');
  }
};


function initUI(){
// ===== 초기화 =====
buildSpaceTypeUI();buildLayerUI();buildSnapUI();
drawGrid();saveHistory();refreshUI();
document.getElementById('btn-grid').classList.add('gold');
document.getElementById('btn-dim').classList.add('gold');
setTimeout(handleResize,100);setTimeout(handleResize,500);
document.getElementById('cmd-hint').textContent=CMD_HINTS.select;
document.getElementById('loading').classList.add('hidden');

// v5.2: 모바일 감지
STATE.isMobile=/Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent)||(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);

// v5.2: 직교 FAB
document.getElementById('ortho-fab').addEventListener('click',toggleOrtho);
updateOrthoFAB();

// 정다각형 도구에서는 닫기 FAB 사용 안 함
document.getElementById('polyclose-fab').addEventListener('click',()=>{});

// v5.2: 빠른 치수칩 (자주 쓰는 인테리어 치수)
const QUICK_DIMS=[600,900,1200,1500,1800,2400,3000,3600,4500];
function showQuickChips(mode){
  const el=document.getElementById('quick-chips');
  el.classList.remove('hidden');
  el.innerHTML=QUICK_DIMS.map(d=>'<button class="quick-chip" data-d="'+d+'">'+d+'</button>').join('')+
    '<button class="quick-chip" data-cmd="esc" style="border-color:#E2725B;color:#E2725B">esc 취소</button>'+
    '';
  el.querySelectorAll('.quick-chip').forEach(b=>{
    b.addEventListener('click',e=>{
      e.preventDefault();
      const d=b.dataset.d, cmd=b.dataset.cmd;
      const inp=document.getElementById('cmd-input');
      if(cmd==='esc'){
        if(STATE.cmdMode){drawState=null;STATE.measureFirst=null;polyState=null;drawGroup.destroyChildren();previewLayer.batchDraw();exitCmdMode();cmdToast('취소');}
      }else if(d){
        processCommand(String(d));
        inp.value='';inp.focus();
      }
    });
  });
}
function hideQuickChips(){
  const el=document.getElementById('quick-chips');
  el.classList.add('hidden');
  el.innerHTML='';
}

// v5.2: cmdMode 변경 시 빠른칩/다각형 FAB 자동 표시 (래퍼)
const _origEnter=enterCmdMode;
enterCmdMode=function(mode,data,promptLabel,hintText){
  _origEnter(mode,data,promptLabel,hintText);
  if(['rect-w','rect-h','wall-len','measure-rel'].includes(mode)){
    showQuickChips(mode);
  }else{
    hideQuickChips();
  }
  document.getElementById('polyclose-fab').classList.add('hidden');
};
const _origExit=exitCmdMode;
exitCmdMode=function(){
  _origExit();
  hideQuickChips();
  document.getElementById('polyclose-fab').classList.add('hidden');
};

// v5.2: 핀치 줌 + 2손가락 패닝
let pinchState=null;
container.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    e.preventDefault();
    isPanning=false;isMouseDown=false;mouseDownPos=null;
    const t1=e.touches[0],t2=e.touches[1];
    const dx=t2.clientX-t1.clientX, dy=t2.clientY-t1.clientY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const cx=(t1.clientX+t2.clientX)/2, cy=(t1.clientY+t2.clientY)/2;
    const rect=container.getBoundingClientRect();
    pinchState={dist,cx:cx-rect.left,cy:cy-rect.top,zoom:STATE.zoom,offsetX:STATE.offsetX,offsetY:STATE.offsetY};
  }
},{passive:false});
container.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&pinchState){
    e.preventDefault();
    const t1=e.touches[0],t2=e.touches[1];
    const dx=t2.clientX-t1.clientX, dy=t2.clientY-t1.clientY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const cx=(t1.clientX+t2.clientX)/2, cy=(t1.clientY+t2.clientY)/2;
    const rect=container.getBoundingClientRect();
    const lcx=cx-rect.left, lcy=cy-rect.top;
    const scale=dist/pinchState.dist;
    const newZoom=Math.max(0.2,Math.min(5,pinchState.zoom*scale));
    STATE.offsetX=lcx-(pinchState.cx-pinchState.offsetX)*(newZoom/pinchState.zoom);
    STATE.offsetY=lcy-(pinchState.cy-pinchState.offsetY)*(newZoom/pinchState.zoom);
    STATE.offsetX+=(lcx-pinchState.cx);
    STATE.offsetY+=(lcy-pinchState.cy);
    STATE.zoom=newZoom;
    drawGrid();renderAll();
    document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
  }
},{passive:false});
container.addEventListener('touchend',e=>{
  if(e.touches.length<2) pinchState=null;
});


console.log('%c ECOREAN MiniCAD v5.8 ','background:#C9A961;color:#0A0A0A;font-weight:bold;padding:4px 8px;');
console.log('  v5.8 신규: 공간 변 스냅 / 라이브러리 객체 드래그 / 벽 교차 자동 vertex 분할 / 공정별 합산표 / 바닥재·벽자재 드롭다운');
console.log('  v5.8 완성: SEMANTIC_MAP 79종 / 자체 테스트 스위트 (?test=1)');
console.log('  v5.7 유지: 2.5D 토글 / AI 생성 파이프라인 SSoT JSON / exportAIBundle');
console.log('  헌법: 단가 추정 금지·NEEDS_CONFIRMATION·방수 CONDITIONAL·mm 정수·평면 모드 기본·인쇄/JSON 시 2.5D 강제 OFF');
console.log('L=선/벽 (AutoCAD) / 라이브러리 5개 통합 (1~5) / 공조·소방 15종 / 옵셋(O) + 미러(mi)');
console.log('Stage:',stage.width(),'×',stage.height(),' / 모바일:',STATE.isMobile);

}

