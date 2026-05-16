'use strict';
// ===== KONVA 전역 변수 =====
var container, stage, bgLayer, mainLayer, previewLayer, groups, labelGroup, drawGroup, snapGroup, flashGroup, ghostHintGroup;

function getContainerSize(){return{width:Math.max((container||document.getElementById('canvas-container')).offsetWidth||800,100),height:Math.max((container||document.getElementById('canvas-container')).offsetHeight||600,100)};}

function initKonva(){
// ===== KONVA =====
container=document.getElementById('canvas-container');
var initSize=getContainerSize();
stage=new Konva.Stage({container:'canvas-container',width:initSize.width,height:initSize.height});
bgLayer=new Konva.Layer({listening:false});
mainLayer=new Konva.Layer();
previewLayer=new Konva.Layer({listening:false});
stage.add(bgLayer);stage.add(mainLayer);stage.add(previewLayer);
groups={
  walls:new Konva.Group(),spaces:new Konva.Group(),openings:new Konva.Group(),
  fixtures:new Konva.Group(),furniture:new Konva.Group(),electric:new Konva.Group(),
  lights:new Konva.Group(),text:new Konva.Group(),dimensions:new Konva.Group(),
  circles:new Konva.Group(),arcs:new Konva.Group(), // v5.3
  curves:new Konva.Group(), // v5.9: 자유곡선 (Bezier)
  hvac:new Konva.Group(), // v5.6
  leaders:new Konva.Group(), // v5.9
  pillars:new Konva.Group(), // v5.9: 기둥 (RC) — 내력벽과 함께 최상단
  spaceHandles:new Konva.Group(), // v5.9: 공간 vertex 편집 핸들 (선택 시만 표시, 가장 위 z-order)
};
// v5.9: 공간(fill 배경) → 벽(상단) 순서 — 벽이 위에 그려져 클릭 가능, 공간 fill에 가려지지 않음
mainLayer.add(groups.spaces);mainLayer.add(groups.walls);mainLayer.add(groups.openings);
mainLayer.add(groups.fixtures);mainLayer.add(groups.furniture);mainLayer.add(groups.electric);
mainLayer.add(groups.lights);mainLayer.add(groups.dimensions);mainLayer.add(groups.text);
mainLayer.add(groups.circles);mainLayer.add(groups.arcs); // v5.3
mainLayer.add(groups.curves); // v5.9: 자유곡선
mainLayer.add(groups.hvac); // v5.6
mainLayer.add(groups.leaders); // v5.9
mainLayer.add(groups.pillars); // v5.9: 기둥 — 벽 위로
mainLayer.add(groups.spaceHandles); // v5.9: 핸들이 가장 위 — 벽보다 위에서 클릭 가능
labelGroup=new Konva.Group({listening:false});
drawGroup=new Konva.Group({listening:false});
snapGroup=new Konva.Group({listening:false}); // v5.2: 스냅 마커 글로우
ghostHintGroup=new Konva.Group({listening:false}); // v5.9: 고스트 스냅 힌트 (선 위 잠재적 스냅점 미리 표시)
flashGroup=new Konva.Group({listening:false});
previewLayer.add(labelGroup);previewLayer.add(drawGroup);previewLayer.add(ghostHintGroup);previewLayer.add(snapGroup);previewLayer.add(flashGroup);

}

// ===== 좌표 + 스냅 + 그리드 + VEF + 히스토리 + 렌더 함수 =====
// ===== 좌표 + 스냅 =====
function mmToPx(mm){return(mm/1000)*STATE.scale*STATE.zoom;}
function pxToMm(px){return Math.round((px/STATE.zoom/STATE.scale)*1000);}
function snapMm(mm){
  // v5.9: Ctrl 누르면 그리드 스냅도 OFF (자유 입력)
  if(STATE.ctrlPressed) return Math.round(mm);
  return STATE.snap.grid?Math.round(mm/STATE.gridSize)*STATE.gridSize:Math.round(mm);
}
function snapToEndpoint(mm){
  // v5.9: Ctrl 누르면 자석 스냅 OFF
  if(STATE.ctrlPressed) return {pt:mm,snapped:false};
  if(!STATE.snap.endpoint) return {pt:mm,snapped:false};
  const threshold=300;
  let nearest=null,minD=threshold;
  // 공간 폴리곤 점
  STATE.spaces.forEach(s=>s.polygon.forEach(p=>{
    const dx=p.x-mm.x,dy=p.y-mm.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<minD){minD=d;nearest={x:p.x,y:p.y};}
  }));
  // 벽 끝점 + 중점 — 도구별 격리: 일반 벽 그리기 중엔 내력벽 무시, 내력벽 그리기 중엔 일반벽 무시
  const _isDrawingBearing=STATE.selectedTool==='gabyeok';
  const _isDrawingRegular=STATE.selectedTool==='wall'||STATE.selectedTool==='line';
  STATE.walls.forEach(w=>{
    const isB=w.wallType==='bearing';
    if(_isDrawingBearing&&!isB) return; // 내력벽 그릴 때 일반벽 끝점 무시
    if(_isDrawingRegular&&isB) return;  // 일반벽 그릴 때 내력벽 끝점 무시
    [{x:w.x1,y:w.y1},{x:w.x2,y:w.y2},{x:(w.x1+w.x2)/2,y:(w.y1+w.y2)/2}].forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest=p;}
    });
  });
  // v5.9: 내력벽끼리의 중심선 교차점 스냅 — "선과 선이 만나는 곳은 모두 점" 원칙
  // v5.9 fix: T-자 교차(끝점이 다른 벽 가까이 있지만 살짝 못 닿은 경우)도 검출 — 200mm 연장 허용
  const bearingWalls=STATE.walls.filter(w=>w.wallType==='bearing');
  const extIntersect=(p1,p2,p3,p4,extPx=200)=>{
    const x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y,x3=p3.x,y3=p3.y,x4=p4.x,y4=p4.y;
    const denom=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
    if(Math.abs(denom)<1e-6) return null;
    const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/denom;
    const u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/denom;
    const len12=Math.hypot(x2-x1,y2-y1)||1;
    const len34=Math.hypot(x4-x3,y4-y3)||1;
    const tExt=extPx/len12, uExt=extPx/len34;
    if(t<-tExt||t>1+tExt||u<-uExt||u>1+uExt) return null;
    return {x:x1+t*(x2-x1), y:y1+t*(y2-y1)};
  };
  for(let i=0;i<bearingWalls.length;i++){
    for(let j=i+1;j<bearingWalls.length;j++){
      const a=bearingWalls[i], b=bearingWalls[j];
      const ip=extIntersect({x:a.x1,y:a.y1},{x:a.x2,y:a.y2},{x:b.x1,y:b.y1},{x:b.x2,y:b.y2},200);
      if(!ip) continue;
      const dx=ip.x-mm.x, dy=ip.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:Math.round(ip.x),y:Math.round(ip.y)};}
    }
  }
  // v5.9: 도어/창 중심점 스냅 — 라이브러리 객체와 동일하게 끌어당김
  STATE.openings.forEach(o=>{
    const dx=o.x-mm.x, dy=o.y-mm.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<minD){minD=d;nearest={x:o.x,y:o.y};}
  });
  // v5.4: 원·아크 중심 + 4분점 (사분점)
  STATE.circles.forEach(c=>{
    const pts=[{x:c.x,y:c.y},{x:c.x+c.radius_mm,y:c.y},{x:c.x-c.radius_mm,y:c.y},{x:c.x,y:c.y+c.radius_mm},{x:c.x,y:c.y-c.radius_mm}];
    pts.forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:Math.round(p.x),y:Math.round(p.y)};}
    });
  });
  STATE.arcs.forEach(a=>{
    const sa=a.startAngle*Math.PI/180, ea=a.endAngle*Math.PI/180;
    const pts=[
      {x:a.x,y:a.y}, // 중심
      {x:a.x+Math.cos(sa)*a.radius_mm,y:a.y+Math.sin(sa)*a.radius_mm}, // 시작점
      {x:a.x+Math.cos(ea)*a.radius_mm,y:a.y+Math.sin(ea)*a.radius_mm}, // 끝점
    ];
    pts.forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:Math.round(p.x),y:Math.round(p.y)};}
    });
  });
  // v5.9: 곡선 (Bezier) — 각 segment의 앵커 + 컨트롤 + 중점
  if(STATE.curves) STATE.curves.forEach(cv=>{
    if(!cv.segments) return;
    cv.segments.forEach(s=>{
      const t=0.5, mt=1-t;
      const midX=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
      const midY=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
      [s.p0,s.p3,s.p1,s.p2,{x:midX,y:midY}].forEach(p=>{
        const dx=p.x-mm.x,dy=p.y-mm.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<minD){minD=d;nearest={x:Math.round(p.x),y:Math.round(p.y)};}
      });
    });
  });
  // v5.4: 라이브러리 객체 중심점 (v5.9: hvac도 포함)
  [STATE.furniture,STATE.fixtures,STATE.lights,STATE.electric,STATE.hvac||[]].forEach(arr=>{
    arr.forEach(o=>{
      const dx=o.x-mm.x,dy=o.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:o.x,y:o.y};}
    });
  });
  // v5.9: 기둥 — 중심점 + 폴리곤 corner 점 모두 스냅 대상
  if(STATE.pillars) STATE.pillars.forEach(p=>{
    [{x:p.x,y:p.y},...pillarPolygon(p)].forEach(pt=>{
      const dx=pt.x-mm.x, dy=pt.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:pt.x,y:pt.y};}
    });
  });
  // v5.9: 점 스냅 결과 우선 (코너·끝점·중점·교차점은 항상 작동)
  if(nearest) return {pt:nearest,snapped:true,type:'point'};
  // v5.9 NEW: 수직 발(perpendicular foot) — 항상 작동, 작은 임계값 80mm
  // 끝점/중점/코너 다음 가장 신뢰성 있는 스냅. 벽 위 임의 지점에 직각으로 떨어뜨림
  {
    const perpThreshold=120;
    let pMin=perpThreshold, pPt=null, pEdge=null;
    STATE.walls.forEach(w=>{
      const isB=w.wallType==='bearing';
      if(_isDrawingBearing&&!isB) return;
      if(_isDrawingRegular&&isB) return;
      const dx=w.x2-w.x1, dy=w.y2-w.y1;
      const len2=dx*dx+dy*dy; if(len2<1) return;
      const t=Math.max(0,Math.min(1,((mm.x-w.x1)*dx+(mm.y-w.y1)*dy)/len2));
      const fx=w.x1+t*dx, fy=w.y1+t*dy;
      const d=Math.hypot(fx-mm.x,fy-mm.y);
      if(d<pMin){pMin=d;pPt={x:Math.round(fx),y:Math.round(fy)};pEdge={ax:w.x1,ay:w.y1,bx:w.x2,by:w.y2};}
    });
    if(pPt) return {pt:pPt,snapped:true,type:'perp',edge:pEdge};
  }
  // v5.9: 고스트 스냅 (선 근처 자동 흡착) — 별도 토글로만 작동
  if(!STATE.snap.ghost) return {pt:mm,snapped:false};
  const lineThreshold=400;
  let lineMinD=lineThreshold;
  let lineNearest=null;
  let lineEdge=null; // {ax,ay,bx,by} — 마커를 이 선에 수직으로 그리기 위함
  STATE.walls.forEach(w=>{
    // v5.9: 도구 격리 (벽/내력벽 그릴 때 반대 종류 무시) — point 스냅과 일관성
    const isB=w.wallType==='bearing';
    if(_isDrawingBearing&&!isB) return;
    if(_isDrawingRegular&&isB) return;
    const dx=w.x2-w.x1, dy=w.y2-w.y1;
    const len2=dx*dx+dy*dy;
    if(len2<1) return;
    const t=Math.max(0,Math.min(1,((mm.x-w.x1)*dx+(mm.y-w.y1)*dy)/len2));
    const fx=w.x1+t*dx, fy=w.y1+t*dy;
    const d=Math.hypot(fx-mm.x,fy-mm.y);
    if(d<lineMinD){lineMinD=d;lineNearest={x:Math.round(fx),y:Math.round(fy)};lineEdge={ax:w.x1,ay:w.y1,bx:w.x2,by:w.y2};}
  });
  STATE.spaces.forEach(s=>{
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
      const dx=b.x-a.x, dy=b.y-a.y;
      const len2=dx*dx+dy*dy;
      if(len2<1) continue;
      const t=Math.max(0,Math.min(1,((mm.x-a.x)*dx+(mm.y-a.y)*dy)/len2));
      const fx=a.x+t*dx, fy=a.y+t*dy;
      const d=Math.hypot(fx-mm.x,fy-mm.y);
      if(d<lineMinD){lineMinD=d;lineNearest={x:Math.round(fx),y:Math.round(fy)};lineEdge={ax:a.x,ay:a.y,bx:b.x,by:b.y};}
    }
  });
  // v5.9: 원/타원 둘레 스냅 (각도 샘플링 + 접선)
  STATE.circles.forEach(c=>{
    const rx=c.rx_mm!=null?c.rx_mm:c.radius_mm;
    const ry=c.ry_mm!=null?c.ry_mm:c.radius_mm;
    const rot=(c.rotation||0)*Math.PI/180;
    const cosA=Math.cos(rot), sinA=Math.sin(rot);
    // 360° 36단계로 샘플링 (10°마다)
    let bestT=0,bestD=Infinity,bestPt=null;
    for(let deg=0;deg<360;deg+=10){
      const θ=deg*Math.PI/180;
      const lx=rx*Math.cos(θ), ly=ry*Math.sin(θ);
      const px=c.x+lx*cosA-ly*sinA;
      const py=c.y+lx*sinA+ly*cosA;
      const d=Math.hypot(px-mm.x,py-mm.y);
      if(d<bestD){bestD=d;bestT=θ;bestPt={x:px,y:py};}
    }
    if(bestPt&&bestD<lineMinD){
      lineMinD=bestD;
      lineNearest={x:Math.round(bestPt.x),y:Math.round(bestPt.y)};
      // 접선 방향 (둘레 점에서의 ellipse 접선)
      const tx_loc=-rx*Math.sin(bestT), ty_loc=ry*Math.cos(bestT);
      const tx=tx_loc*cosA-ty_loc*sinA, ty=tx_loc*sinA+ty_loc*cosA;
      lineEdge={ax:bestPt.x-tx,ay:bestPt.y-ty,bx:bestPt.x+tx,by:bestPt.y+ty};
    }
  });
  // v5.9: 곡선(Bezier) 스냅 — segment마다 t 샘플링
  if(STATE.curves) STATE.curves.forEach(cv=>{
    if(!cv.segments) return;
    cv.segments.forEach(s=>{
      let bestT=0,bestD=Infinity,bestPt=null;
      for(let i=0;i<=20;i++){
        const t=i/20, mt=1-t;
        const x=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
        const y=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
        const d=Math.hypot(x-mm.x,y-mm.y);
        if(d<bestD){bestD=d;bestT=t;bestPt={x,y};}
      }
      if(bestPt&&bestD<lineMinD){
        lineMinD=bestD;
        lineNearest={x:Math.round(bestPt.x),y:Math.round(bestPt.y)};
        // 접선 (Bezier 미분: B'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2))
        const t=bestT, mt=1-t;
        const tx=3*mt*mt*(s.p1.x-s.p0.x)+6*mt*t*(s.p2.x-s.p1.x)+3*t*t*(s.p3.x-s.p2.x);
        const ty=3*mt*mt*(s.p1.y-s.p0.y)+6*mt*t*(s.p2.y-s.p1.y)+3*t*t*(s.p3.y-s.p2.y);
        const tlen=Math.hypot(tx,ty)||1;
        const ux=tx/tlen*30, uy=ty/tlen*30;
        lineEdge={ax:bestPt.x-ux,ay:bestPt.y-uy,bx:bestPt.x+ux,by:bestPt.y+uy};
      }
    });
  });
  return lineNearest?{pt:lineNearest,snapped:true,type:'ghost',edge:lineEdge}:{pt:mm,snapped:false};
}

// v5.8: 공간 변(edge) 스냅 — 점을 다른 공간 폴리곤 변에 투영해서 가장 가까운 점 찾기
// 공간 드래그 시 사용. excludeId = 자기 자신 공간은 제외
function snapPointToSpaceEdges(mm,excludeId){
  if(!STATE.snap.endpoint) return {pt:mm,snapped:false};
  const threshold=STATE.snap.grid?STATE.gridSize*2:200; // mm (그리드 스냅 활성 시 2배)
  let best=null,minD=threshold;
  STATE.spaces.forEach(s=>{
    if(s.id===excludeId) return;
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
      // 점 mm를 선분 ab에 투영
      const dx=b.x-a.x, dy=b.y-a.y;
      const len2=dx*dx+dy*dy;
      if(len2<1) continue;
      const t=Math.max(0,Math.min(1,((mm.x-a.x)*dx+(mm.y-a.y)*dy)/len2));
      const fx=a.x+t*dx, fy=a.y+t*dy;
      const d=Math.sqrt((fx-mm.x)**2+(fy-mm.y)**2);
      if(d<minD){minD=d;best={x:Math.round(fx),y:Math.round(fy)};}
    }
  });
  return best?{pt:best,snapped:true,distance:minD}:{pt:mm,snapped:false};
}
function getMm(pos){
  let mm={x:snapMm(pxToMm(pos.x-STATE.offsetX)),y:snapMm(pxToMm(pos.y-STATE.offsetY))};
  const r=snapToEndpoint(mm);
  // v5.2: 스냅 마커 갱신용 정보 저장
  if(r.snapped){STATE.snapMarker={x:r.pt.x,y:r.pt.y};}
  else{STATE.snapMarker=null;}
  return r.pt;
}
// v5.2: 스냅 마커 별도 그룹 (라벨 그룹과 분리)
// v5.9: 마우스 호버 시 스냅 마커 자동 갱신 — 도구 선택 + 자석 활성 시 항상 표시
function updateSnapMarker(pos){
  if(pos&&STATE.snap.endpoint&&!STATE.ctrlPressed){
    const mm={x:pxToMm(pos.x-STATE.offsetX),y:pxToMm(pos.y-STATE.offsetY)};
    const r=snapToEndpoint(mm);
    if(r.snapped){
      STATE.snapMarker={x:r.pt.x,y:r.pt.y,type:r.type||'point',edge:r.edge||null};
      STATE.snapCursor={x:mm.x,y:mm.y};
    }else{
      STATE.snapMarker=null;
      STATE.snapCursor=null;
    }
  }else{
    STATE.snapMarker=null;
    STATE.snapCursor=null;
  }
  drawSnapMarker();
}
function drawSnapMarker(){
  snapGroup.destroyChildren();
  if(!STATE.snapMarker){previewLayer.batchDraw();return;}
  const x=STATE.offsetX+mmToPx(STATE.snapMarker.x);
  const y=STATE.offsetY+mmToPx(STATE.snapMarker.y);
  const r=STATE.isMobile?12:7;
  // v5.9: 수직 발(perp) 스냅 — 작은 직각 표시 (┴) 형태
  if(STATE.snapMarker.type==='perp'){
    let nx=0,ny=-1, tx=1,ty=0;
    if(STATE.snapMarker.edge){
      const e=STATE.snapMarker.edge;
      const dxE=e.bx-e.ax, dyE=e.by-e.ay;
      const lenE=Math.hypot(dxE,dyE);
      if(lenE>0.5){tx=dxE/lenE; ty=dyE/lenE; nx=-ty; ny=tx;}
    }
    const L=8;
    // ⊥ 모양: 선 위에 짧은 평행선 + 그 위에 수직선
    snapGroup.add(new Konva.Line({points:[x-tx*L,y-ty*L,x+tx*L,y+ty*L],stroke:'#5BC9F5',strokeWidth:2,lineCap:'round',opacity:0.95}));
    snapGroup.add(new Konva.Line({points:[x,y,x+nx*L*0.9,y+ny*L*0.9],stroke:'#5BC9F5',strokeWidth:2,lineCap:'round',opacity:0.95}));
    snapGroup.add(new Konva.Rect({x:x-2.5,y:y-2.5,width:5,height:5,fill:'#5BC9F5',stroke:'#000',strokeWidth:0.8}));
    previewLayer.batchDraw();
    return;
  }
  // v5.9: 고스트 스냅 — 라인에 수직으로 짧은 대시 + 작은 사각 (선 위에 묻히지 않게)
  if(STATE.snapMarker.type==='ghost'){
    let nx=0,ny=-1; // 기본 수직 (위 방향)
    if(STATE.snapMarker.edge){
      const e=STATE.snapMarker.edge;
      const dxE=e.bx-e.ax, dyE=e.by-e.ay;
      const lenE=Math.hypot(dxE,dyE);
      if(lenE>0.5){nx=-dyE/lenE; ny=dxE/lenE;}
    }
    const dashLen=10;
    // 라인에 수직으로 한 일자 대시
    snapGroup.add(new Konva.Line({
      points:[x-nx*dashLen,y-ny*dashLen,x+nx*dashLen,y+ny*dashLen],
      stroke:'#FFE066',strokeWidth:2.5,
      lineCap:'round',opacity:0.95,
      shadowColor:'#000',shadowBlur:3,shadowOpacity:0.6,
    }));
    // 중앙에 작은 사각 (배경 대비로 또렷하게)
    snapGroup.add(new Konva.Rect({
      x:x-2.5,y:y-2.5,width:5,height:5,
      fill:'#FFE066',stroke:'#000',strokeWidth:0.8,
      shadowColor:'#FFE066',shadowBlur:4,shadowOpacity:0.8,
    }));
    previewLayer.batchDraw();return;
  }
  // 코너·끝점·중점·교차점 — 기존 글로우 표시
  snapGroup.add(new Konva.Circle({
    x,y,radius:r+10,
    fill:'#C9A96118',
    shadowColor:'#C9A961',shadowBlur:24,shadowOpacity:1,
  }));
  snapGroup.add(new Konva.Circle({
    x,y,radius:r+5,
    fill:'#C9A96130',
    shadowColor:'#C9A961',shadowBlur:14,shadowOpacity:0.9,
  }));
  // 내부 골드 원 (작은 점)
  snapGroup.add(new Konva.Circle({
    x,y,radius:r-2,
    fill:'#C9A961',
    shadowColor:'#C9A961',shadowBlur:8,shadowOpacity:1,
  }));
  previewLayer.batchDraw();
}
function applyOrtho(start,end){
  // v5.2: snap.ortho ON이면 자동 직교, Shift 누르면 임시 반전(자유)
  // snap.ortho OFF이고 Shift 누르면 임시 직교
  const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
  if(!orthoActive) return end;
  const dx=end.x-start.x,dy=end.y-start.y;
  return Math.abs(dx)>Math.abs(dy)?{x:end.x,y:start.y}:{x:start.x,y:end.y};
}

// ===== 그리드 =====
// v5.9: 배경 이미지 노드 캐시 — drawGrid 호출 시마다 재생성 안 하도록
let _bgImageNode=null;
function ensureBgImageNode(){
  if(!STATE.bgImage){_bgImageNode=null;return null;}
  // dataURL 변경 시 새 노드 생성
  if(_bgImageNode&&_bgImageNode._dataURL===STATE.bgImage.dataURL){
    _bgImageNode.x(STATE.offsetX+mmToPx(STATE.bgImage.x_mm||0));
    _bgImageNode.y(STATE.offsetY+mmToPx(STATE.bgImage.y_mm||0));
    _bgImageNode.scaleX(STATE.bgImage.scale||1);
    _bgImageNode.scaleY(STATE.bgImage.scale||1);
    _bgImageNode.opacity(STATE.bgImage.opacity!=null?STATE.bgImage.opacity:0.5);
    _bgImageNode.listening(!STATE.bgImage.locked);
    return _bgImageNode;
  }
  const img=new Image();
  img.onload=()=>{if(typeof bgLayer!=='undefined') bgLayer.batchDraw();};
  img.src=STATE.bgImage.dataURL;
  _bgImageNode=new Konva.Image({
    image:img,
    x:STATE.offsetX+mmToPx(STATE.bgImage.x_mm||0),
    y:STATE.offsetY+mmToPx(STATE.bgImage.y_mm||0),
    scaleX:STATE.bgImage.scale||1,
    scaleY:STATE.bgImage.scale||1,
    opacity:STATE.bgImage.opacity!=null?STATE.bgImage.opacity:0.5,
    listening:!STATE.bgImage.locked,
  });
  _bgImageNode._dataURL=STATE.bgImage.dataURL;
  // 드래그로 이동 가능 (잠금 해제 시)
  _bgImageNode.draggable(true);
  _bgImageNode.on('dragend',()=>{
    if(STATE.bgImage&&!STATE.bgImage.locked){
      const dx=_bgImageNode.x()-STATE.offsetX;
      const dy=_bgImageNode.y()-STATE.offsetY;
      STATE.bgImage.x_mm=Math.round(dx*1000/STATE.scale);
      STATE.bgImage.y_mm=Math.round(dy*1000/STATE.scale);
    }
  });
  return _bgImageNode;
}

function drawGrid(){
  bgLayer.destroyChildren();
  // v5.9: 배경 이미지 (그리드보다 뒤에 깔림)
  const bgImg=ensureBgImageNode();
  if(bgImg) bgLayer.add(bgImg);
  if(!STATE.showGrid){bgLayer.batchDraw();return;}
  const w=stage.width(),h=stage.height();
  const gpx=mmToPx(STATE.gridSize);
  if(gpx<4){bgLayer.batchDraw();return;}
  // v5.9: 테마별 그리드 색상 — 라이트(아이보리)에선 객체 안 가리도록 매우 옅게
  const _theme=document.body&&document.body.getAttribute('data-theme');
  const _isLight=_theme==='architect';
  const minorCol=_isLight?'rgba(20,18,12,0.07)':'#1A1A1A';
  const majorCol=_isLight?'rgba(20,18,12,0.14)':'#2A2A2A';
  const minorW=_isLight?0.4:0.5;
  const majorW=_isLight?0.6:0.8;
  const sx=STATE.offsetX%gpx,sy=STATE.offsetY%gpx;
  for(let x=sx;x<w;x+=gpx) bgLayer.add(new Konva.Line({points:[x,0,x,h],stroke:minorCol,strokeWidth:minorW}));
  for(let y=sy;y<h;y+=gpx) bgLayer.add(new Konva.Line({points:[0,y,w,y],stroke:minorCol,strokeWidth:minorW}));
  const mpx=mmToPx(1000);
  if(mpx>30){
    const smx=STATE.offsetX%mpx,smy=STATE.offsetY%mpx;
    for(let x=smx;x<w;x+=mpx) bgLayer.add(new Konva.Line({points:[x,0,x,h],stroke:majorCol,strokeWidth:majorW}));
    for(let y=smy;y<h;y+=mpx) bgLayer.add(new Konva.Line({points:[0,y,w,y],stroke:majorCol,strokeWidth:majorW}));
  }
  // 원점 마커 — 라이트에선 브래스, 다크에선 라임
  const originCol=_isLight?'#B8923D':'#D4FF3D';
  bgLayer.add(new Konva.Circle({x:STATE.offsetX,y:STATE.offsetY,radius:4,fill:originCol}));
  bgLayer.add(new Konva.Text({x:STATE.offsetX+8,y:STATE.offsetY-16,text:'0,0',fontSize:10,fontFamily:'JetBrains Mono',fill:originCol}));
  bgLayer.batchDraw();
}

// ===== 면적 =====
function polyArea(pts){let a=0;for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;a+=pts[i].x*pts[j].y-pts[j].x*pts[i].y;}return Math.abs(a)/2;}
function polyPeri(pts){let p=0;for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;const dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y;p+=Math.sqrt(dx*dx+dy*dy);}return p;}
function spArea(s){
  let a=polyArea(s.polygon);
  if(s.holes&&s.holes.length){
    s.holes.forEach(h=>{a-=polyArea(h);});
  }
  return Math.max(0,a)/1e6;
}
function spPeri(s){return polyPeri(s.polygon)/1000;}
function spCH(s){return s.ceilingHeight_mm||STATE.ceilingHeight;}
function spWall(s){
  // v5.9: 내력벽은 KPI/적산에서 제외 (보여주기 전용)
  const spaceWalls=STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine&&w.wallType!=='bearing');
  let wallArea=0;
  spaceWalls.forEach(w=>{
    const len=Math.hypot(w.x2-w.x1,w.y2-w.y1)/1000;
    wallArea+=len*(w.height_mm||spCH(s))/1000;
  });
  let oa=0;
  // v5.9: subtractMode (single=단면 ×1, double=양면 ×2) — 도어 종류 또는 사용자 설정에 따름
  STATE.openings.filter(o=>o.spaceId===s.id).forEach(o=>{
    const factor=o.subtractMode==='double'?2:1;
    oa+=(o.width_mm*o.height_mm)/1e6*factor;
  });
  return Math.max(0,wallArea-oa);
}
function spCenter(s){let cx=0,cy=0;s.polygon.forEach(p=>{cx+=p.x;cy+=p.y;});return{x:cx/s.polygon.length,y:cy/s.polygon.length};}

// 폴리곤 시계방향 판정
function isClockwise(pts){
  let sum=0;
  for(let i=0;i<pts.length;i++){
    const j=(i+1)%pts.length;
    sum+=(pts[j].x-pts[i].x)*(pts[j].y+pts[i].y);
  }
  return sum>0;
}

// ===== 공간 회전 (점·선·면·벽·치수·가구 포함) =====
function rotateSpaceByAngle(spaceId,angleDeg){
  const sp=STATE.spaces.find(s=>s.id===spaceId);
  if(!sp) return;
  const poly=sp.polygon.slice(); // vertex 회전 전 스냅샷 (내부 판정용)
  if(poly.length<2) return;
  // 중심점 (centroid — 회전 후에도 동일 위치 유지)
  const cx=poly.reduce((s,p)=>s+p.x,0)/poly.length;
  const cy=poly.reduce((s,p)=>s+p.y,0)/poly.length;
  const rad=angleDeg*Math.PI/180;
  const cos=Math.cos(rad),sin=Math.sin(rad);
  function rotatePt(x,y){
    const dx=x-cx,dy=y-cy;
    return{x:Math.round(cx+dx*cos-dy*sin),y:Math.round(cy+dx*sin+dy*cos)};
  }
  // 0. 내부 객체 수집 (vertex 회전 전)
  const innerItems=[];
  ['furniture','fixtures','lights','electric','hvac'].forEach(kind=>{
    STATE[kind].forEach(item=>{if(typeof pointInPolygon==='function'&&pointInPolygon({x:item.x,y:item.y},poly)) innerItems.push(item);});
  });
  // 치수선: 양 끝점이 모두 공간 변 300mm 이내
  function nearEdge(x,y){
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      const ddx=b.x-a.x,ddy=b.y-a.y,len2=ddx*ddx+ddy*ddy;
      if(len2<1) continue;
      const t=Math.max(0,Math.min(1,((x-a.x)*ddx+(y-a.y)*ddy)/len2));
      if(Math.hypot(x-a.x-t*ddx,y-a.y-t*ddy)<300) return true;
    }
    return false;
  }
  const innerMeasures=STATE.measures.filter(m=>nearEdge(m.x1,m.y1)&&nearEdge(m.x2,m.y2));
  const innerCircles=STATE.circles.filter(c=>typeof pointInPolygon==='function'&&pointInPolygon({x:c.x,y:c.y},poly));
  const innerArcs=STATE.arcs.filter(a=>typeof pointInPolygon==='function'&&pointInPolygon({x:a.x,y:a.y},poly));
  // 1. Space vertex 회전 → 벽도 VEF로 자동 따라옴
  const movedVids=new Set(sp.vertexIds||[]);
  (sp.vertexIds||[]).forEach(vid=>{
    const v=getVertex(vid);if(!v) return;
    const p=rotatePt(v.x,v.y);v.x=p.x;v.y=p.y;
  });
  // 2. spaceId로 연결된 벽의 별도 vertex 회전
  STATE.walls.forEach(w=>{
    if(w.spaceId!==spaceId) return;
    [w.v1Id,w.v2Id].forEach(vid=>{
      if(!vid||movedVids.has(vid)) return;
      const v=getVertex(vid);if(!v) return;
      const p=rotatePt(v.x,v.y);v.x=p.x;v.y=p.y;
      movedVids.add(vid);
    });
  });
  // 3. 내부 가구·위생·조명·전기·공조 회전 (자체 angle도 동일 각도만큼 회전)
  innerItems.forEach(item=>{
    const p=rotatePt(item.x,item.y);
    item.x=p.x;item.y=p.y;
    item.angle=((item.angle||0)+angleDeg)%360;
  });
  // 4. 치수선 회전
  innerMeasures.forEach(m=>{
    const p1=rotatePt(m.x1,m.y1),p2=rotatePt(m.x2,m.y2);
    m.x1=p1.x;m.y1=p1.y;m.x2=p2.x;m.y2=p2.y;
  });
  // 5. 원·아크 회전
  innerCircles.forEach(c=>{const p=rotatePt(c.x,c.y);c.x=p.x;c.y=p.y;});
  innerArcs.forEach(a=>{
    const p=rotatePt(a.x,a.y);a.x=p.x;a.y=p.y;
    a.startAngle=(a.startAngle+angleDeg)%360;
    a.endAngle=(a.endAngle+angleDeg)%360;
  });
  // 원형공간 _circleMeta 중심 업데이트
  if(sp._circleMeta){
    const p=rotatePt(sp._circleMeta.cx,sp._circleMeta.cy);
    sp._circleMeta.cx=p.x;sp._circleMeta.cy=p.y;
  }
}

// ===== 분할 완료 펄스 효과 =====
function flashSplitSpaces(ids){
  const DURATION=900;
  let start=null;
  function frame(now){
    if(start===null) start=now;
    const t=Math.min(1,(now-start)/DURATION);
    const alpha=(1-t)*(1-t); // ease-out²
    flashGroup.destroyChildren();
    ids.forEach(id=>{
      const sp=STATE.spaces.find(s=>s.id===id);
      if(!sp||sp.polygon.length<3) return;
      const pts=[];
      sp.polygon.forEach(p=>{pts.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
      // 채움 레이어
      flashGroup.add(new Konva.Line({
        points:pts,closed:true,
        fill:'#FFEE44',
        stroke:'#FFAA00',
        strokeWidth:6,
        opacity:alpha*0.85,
        shadowColor:'#FFCC00',
        shadowBlur:30,
        shadowOpacity:1,
        shadowEnabled:true,
        listening:false,
      }));
    });
    previewLayer.draw();
    if(t<1) requestAnimationFrame(frame);
    else{flashGroup.destroyChildren();previewLayer.draw();}
  }
  requestAnimationFrame(frame);
}

let idCounter=0;
function makeId(p){idCounter++;return p+'_'+Date.now()+'_'+idCounter;}
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ===== VEF TOPOLOGY =====
function getVertex(id){return STATE.vertices.find(v=>v.id===id);}
function ensureVertex(x,y,tol=60){
  x=Math.round(x);y=Math.round(y);
  // v5.9: bearing vertex(내력벽 전용)는 일반벽 그래프에 재사용 안 됨
  const found=STATE.vertices.find(v=>v.kind!=='bearing'&&Math.hypot(v.x-x,v.y-y)<tol);
  if(found) return found;
  const v={id:makeId('v'),x,y};
  STATE.vertices.push(v);
  return v;
}
// v5.9: 내력벽 전용 vertex — 내력벽들끼리만 공유 (코너 짤림 해결)
function ensureBearingVertex(x,y,tol=30){
  x=Math.round(x);y=Math.round(y);
  const found=STATE.vertices.find(v=>v.kind==='bearing'&&Math.hypot(v.x-x,v.y-y)<tol);
  if(found) return found;
  const v={id:makeId('v'),x,y,kind:'bearing'};
  STATE.vertices.push(v);
  return v;
}
function moveVertex(id,x,y){const v=getVertex(id);if(v){v.x=Math.round(x);v.y=Math.round(y);}}
function verticesOfObj(obj){
  if(obj.vertexIds) return obj.vertexIds.map(getVertex).filter(Boolean);
  if(obj.v1Id) return [getVertex(obj.v1Id),getVertex(obj.v2Id)].filter(Boolean);
  return [];
}
// VEF: wall/space 팩토리 — getter로 x1/y1/x2/y2, polygon 자동 제공
function makeWallVEF(v1Id,v2Id,props={}){
  const w=Object.defineProperties({
    id:makeId('w'),v1Id,v2Id,
    thickness:props.thickness??STATE.wallThickness,
    // v5.9: 벽 분류 + 정렬 (적산·렌더링 양쪽에서 사용)
    wallType:props.wallType??'standard', // 'standard' | 'partition' (가벽)
    alignment:props.alignment??(STATE.wallAlignment||'center'), // 'interior'|'center'|'exterior'
    layerName:props.layerName??'',
    spaceId:props.spaceId??null,
    finishMaterial:props.finishMaterial??null,
    height_mm:props.height_mm??null,
  },{
    x1:{get(){return getVertex(this.v1Id)?.x??0},enumerable:true,configurable:true},
    y1:{get(){return getVertex(this.v1Id)?.y??0},enumerable:true,configurable:true},
    x2:{get(){return getVertex(this.v2Id)?.x??0},enumerable:true,configurable:true},
    y2:{get(){return getVertex(this.v2Id)?.y??0},enumerable:true,configurable:true},
  });
  return w;
}
function makeSpaceVEF(vertexIds,props={}){
  const s=Object.defineProperties({
    id:props.id??makeId('sp'),
    vertexIds:[...vertexIds],
    holes:props.holes??[], // v5.9: 도넛 hole 폴리곤 배열 [[{x,y},...], ...]
    name:props.name??'',
    type:props.type??'LIVING',
    typeIndex:props.typeIndex??1,
    layerName:props.layerName??'',
    ceilingHeight_mm:props.ceilingHeight_mm??null,
    materialGrade:props.materialGrade??'STANDARD',
    difficulty:props.difficulty??'NORMAL',
    materialColor:props.materialColor??null,
    floorMaterial:props.floorMaterial??'STRONG',
    ceilingMaterial:props.ceilingMaterial??'GYPSUM',
    videoSequenceOrder:props.videoSequenceOrder??null,
  },{
    polygon:{
      get(){return this.vertexIds.map(getVertex).filter(Boolean);},
      set(pts){this.vertexIds=polygonToVertexIds(pts);},
      enumerable:true,configurable:true,
    },
  });
  return s;
}
// 기존 plain polygon 배열을 vertexIds로 변환 (마이그레이션용)
function polygonToVertexIds(polygon){
  // tol=1: 공간 꼭짓점은 별개 점이므로 60mm 허용 오차로 병합하지 않음
  // 단, 이미 존재하는 버텍스와 1mm 이내면 재사용 (중복 방지)
  // v5.9: 내력벽 vertex는 공간 vertex와 절대 공유 안 함 — 격리 보장
  const used=new Set();
  return polygon.map(p=>{
    let best=null,bestD=Infinity;
    for(const v of STATE.vertices){
      if(used.has(v.id)) continue;
      if(v.kind==='bearing') continue; // 내력벽 vertex 제외
      const d=Math.hypot(v.x-p.x,v.y-p.y);
      if(d<1&&d<bestD){bestD=d;best=v;}
    }
    if(best){used.add(best.id);return best.id;}
    const nv={id:makeId('v'),x:Math.round(p.x),y:Math.round(p.y)};
    STATE.vertices.push(nv);
    used.add(nv.id);
    return nv.id;
  });
}
// JSON.parse 후 VEF getter 재설치 (history 복원·load·duplicate·mirror 공통)
function reinstallVEF(obj){
  if('v1Id' in obj){
    Object.defineProperties(obj,{
      x1:{get(){return getVertex(this.v1Id)?.x??0},enumerable:true,configurable:true},
      y1:{get(){return getVertex(this.v1Id)?.y??0},enumerable:true,configurable:true},
      x2:{get(){return getVertex(this.v2Id)?.x??0},enumerable:true,configurable:true},
      y2:{get(){return getVertex(this.v2Id)?.y??0},enumerable:true,configurable:true},
    });
  }
  if('vertexIds' in obj){
    Object.defineProperty(obj,'polygon',{
      get(){return this.vertexIds.map(getVertex).filter(Boolean);},
      set(pts){this.vertexIds=polygonToVertexIds(pts);},
      enumerable:true,configurable:true,
    });
  }
  return obj;
}
// 모든 wall/space에 VEF getter 재설치
function reinstallVEFAll(){
  STATE.walls.forEach(reinstallVEF);
  STATE.spaces.forEach(reinstallVEF);
}
// 참조되지 않는 버텍스 정리
function cleanupOrphanVertices(){
  // 레거시 벽(v1Id 없음)이 남아있으면 마이그레이션 전이므로 정리 건너뜀
  if(STATE.walls.some(w=>!w.v1Id&&'x1' in w)) return;
  const used=new Set();
  STATE.walls.forEach(w=>{if(w.v1Id)used.add(w.v1Id);if(w.v2Id)used.add(w.v2Id);});
  STATE.spaces.forEach(s=>{if(s.vertexIds)s.vertexIds.forEach(id=>used.add(id));});
  STATE.vertices=STATE.vertices.filter(v=>used.has(v.id));
}

// ===== HISTORY =====
function saveHistory(){
  const snap=JSON.stringify({
    vertices:STATE.vertices,
    spaces:STATE.spaces,walls:STATE.walls,openings:STATE.openings,
    furniture:STATE.furniture,fixtures:STATE.fixtures,lights:STATE.lights,
    electric:STATE.electric,texts:STATE.texts,measures:STATE.measures,
    circles:STATE.circles,arcs:STATE.arcs,hvac:STATE.hvac,
    leaders:STATE.leaders,
    estimateConfig:STATE.estimateConfig,
  });
  STATE.history=STATE.history.slice(0,STATE.historyIdx+1);
  STATE.history.push(snap);
  if(STATE.history.length>50) STATE.history.shift();
  STATE.historyIdx=STATE.history.length-1;
}
function undo(){
  if(STATE.historyIdx<=0){showStatus('실행취소 불가');return;}
  STATE.historyIdx--;
  Object.assign(STATE,JSON.parse(STATE.history[STATE.historyIdx]));
  reinstallVEFAll();
  renderAll();refreshUI();showStatus('실행취소');
}
function redo(){
  if(STATE.historyIdx>=STATE.history.length-1){showStatus('재실행 불가');return;}
  STATE.historyIdx++;
  Object.assign(STATE,JSON.parse(STATE.history[STATE.historyIdx]));
  reinstallVEFAll();
  renderAll();refreshUI();showStatus('재실행');
}

// v5.9: 잠금 시각효과 — 반투명(0.30) + 점선만 사용 (배지 제거)
// ===== 렌더 — 공간 =====
function renderSpaces(){
  groups.spaces.destroyChildren();
  labelGroup.destroyChildren();
  STATE.spaces.forEach(s=>{
    const td=SPACE_TYPES[s.type];
    const pts=[];
    s.polygon.forEach(p=>{pts.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
    const sel=STATE.selectedKind==='space'&&STATE.selectedId===s.id||STATE.boxSelection.some(b=>b.kind==='space'&&b.id===s.id);
    const fillColor=s.materialColor||td.color+'33';
    let poly;
    if(s.holes&&s.holes.length){
      // v5.9: 도넛 (hole 있음) — Konva.Shape sceneFunc로 even-odd 채우기
      const strokeCol=sel?'#E2725B':td.color;
      poly=new Konva.Shape({
        id:s.id,
        sceneFunc(ctx,sh){
          ctx.beginPath();
          // 외곽
          for(let i=0;i<s.polygon.length;i++){
            const p=s.polygon[i];
            const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.closePath();
          // hole — 외곽과 반대 방향으로 (even-odd 룰)
          s.holes.forEach(h=>{
            for(let i=0;i<h.length;i++){
              const p=h[i];
              const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
              if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath();
          });
          ctx.fillStyle=fillColor;
          // Konva.Context의 fill은 인자 통과 → 무조건 'evenodd' 룰로 호출 (도넛 hole 표현)
          try{ctx.fill('evenodd');}catch(e){ctx.fill();}
          ctx.strokeStyle=strokeCol;
          ctx.lineWidth=sel?3.5:2.2;
          ctx.stroke();
        },
        hitFunc(ctx,sh){
          // 외곽으로만 hit (hole 영역은 제외)
          ctx.beginPath();
          for(let i=0;i<s.polygon.length;i++){
            const p=s.polygon[i];
            const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.closePath();
          ctx.fillStrokeShape(sh);
        },
        shadowColor:sel?'#E2725B':'transparent',shadowBlur:sel?12:0,shadowOpacity:sel?0.6:0,
      });
    }else{
      poly=new Konva.Line({
        points:pts,fill:fillColor,stroke:sel?'#E2725B':td.color,
        strokeWidth:sel?3.5:2.2,closed:true,id:s.id,
        shadowColor:sel?'#E2725B':'transparent',shadowBlur:sel?12:0,shadowOpacity:sel?0.6:0,
        opacity:s.locked?0.30:1, dash:s.locked?[8,5]:null, // v5.9: 잠금 시 반투명+점선
      });
    }
    poly.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('space',s.id);});
    groups.spaces.add(poly);

    // 원형공간 리사이즈 핸들 (선택 시만 표시 — 잠금 시 숨김)
    if(sel&&!s.locked&&s._circleMeta){
      const{cx,cy,r}=s._circleMeta;
      // 동쪽(0°), 북쪽(270°), 서쪽(180°), 남쪽(90°) 4방향 핸들
      [[r,0],[0,-r],[-r,0],[0,r]].forEach(([dx,dy])=>{
        const hx=STATE.offsetX+mmToPx(cx+dx), hy=STATE.offsetY+mmToPx(cy+dy);
        const handle=new Konva.Circle({x:hx,y:hy,radius:7,fill:'#E2725B',stroke:'#fff',strokeWidth:1.5,draggable:true,listening:true});
        let _rafId=null;
        handle.on('dragmove',()=>{
          if(_rafId) return; // 이전 프레임 처리 중이면 스킵
          _rafId=requestAnimationFrame(()=>{
            _rafId=null;
            const hxMm=pxToMm(handle.x()-STATE.offsetX);
            const hyMm=pxToMm(handle.y()-STATE.offsetY);
            const newR=Math.hypot(hxMm-cx,hyMm-cy);
            if(newR<100) return;
            s._circleMeta.r=newR;
            s.vertexIds=polygonToVertexIds(circleToPolygon(cx,cy,newR));
            renderAll();
          });
        });
        handle.on('dragend',()=>{if(_rafId){cancelAnimationFrame(_rafId);_rafId=null;}saveHistory();renderAll();});
        groups.spaces.add(handle);
      });
      // 중심점 표시
      const hcx=STATE.offsetX+mmToPx(cx), hcy=STATE.offsetY+mmToPx(cy);
      groups.spaces.add(new Konva.Circle({x:hcx,y:hcy,radius:4,fill:td.color,stroke:'#fff',strokeWidth:1,listening:false}));
      // 반지름 수치 표시
      const rLabel=new Konva.Text({x:STATE.offsetX+mmToPx(cx)+8,y:STATE.offsetY+mmToPx(cy)-20,
        text:'R '+Math.round(r)+'mm',fontSize:10,fontFamily:'JetBrains Mono',fill:'#E2725B',listening:false});
      groups.spaces.add(rLabel);
    }

    // 회전 핸들 (선택 시 상단 중앙에 표시 — ↻ 드래그 또는 R 키로 회전; 잠금 시 숨김)
    if(sel&&!s.locked){
      const ctr=spCenter(s);
      const cxPx=STATE.offsetX+mmToPx(ctr.x);
      const cyPx=STATE.offsetY+mmToPx(ctr.y);
      const topYPx=Math.min(...s.polygon.map(p=>STATE.offsetY+mmToPx(p.y)));
      const rhx=cxPx,rhy=topYPx-44;
      groups.spaces.add(new Konva.Line({points:[cxPx,cyPx,rhx,rhy],stroke:'#C07B3A',strokeWidth:1,dash:[4,3],listening:false}));
      const rg=new Konva.Group({x:rhx,y:rhy,listening:true,id:'__rot_'+s.id});
      rg.add(new Konva.Circle({radius:11,fill:'#C07B3A',stroke:'#fff',strokeWidth:1.5,listening:true}));
      rg.add(new Konva.Text({x:-7,y:-8,text:'↻',fontSize:15,fill:'#fff',fontFamily:'Inter',listening:false}));
      rg.on('mousedown touchstart',e2=>{
        e2.cancelBubble=true;
        const center2=spCenter(s);
        STATE.rotateState={spaceId:s.id,cxMm:center2.x,cyMm:center2.y,lastAngle:null,totalAngle:0};
      });
      groups.spaces.add(rg);
    }

    // 공간명 라벨
    const c=spCenter(s);
    const lg=new Konva.Group({x:STATE.offsetX+mmToPx(c.x),y:STATE.offsetY+mmToPx(c.y),listening:false});
    const t1=new Konva.Text({text:s.name,fontSize:13,fontFamily:'Inter',fontStyle:'500',fill:'#F5F1EB'});
    t1.offsetX(t1.width()/2);t1.offsetY(15);
    lg.add(t1);
    const t2=new Konva.Text({text:spArea(s).toFixed(1)+' ㎡',fontSize:10,fontFamily:'JetBrains Mono',fill:td.color});
    t2.offsetX(t2.width()/2);t2.offsetY(0);
    lg.add(t2);
    labelGroup.add(lg);

    // *** 치수 자동 표시 — KS F 1501 건축 평면도 치수표기법 ***
    if(STATE.showDimensions){
      const cw=isClockwise(s.polygon);
      for(let i=0;i<s.polygon.length;i++){
        const p1=s.polygon[i];
        const p2=s.polygon[(i+1)%s.polygon.length];
        const dx=p2.x-p1.x,dy=p2.y-p1.y;
        const lenmm=Math.sqrt(dx*dx+dy*dy);
        if(lenmm<200) continue;
        const ux=dx/lenmm, uy=dy/lenmm;
        // 외부 방향 노말 (공간 바깥쪽)
        const nx=cw?-uy:uy;
        const ny=cw?ux:-ux;
        const offMm=350; // 자동 치수선 오프셋
        const gapMm=40, extMm=80, tickPx=mmToPx(70);
        const cos45=Math.cos(Math.PI/4),sin45=Math.sin(Math.PI/4);
        const TX=xm=>STATE.offsetX+mmToPx(xm);
        const TY=ym=>STATE.offsetY+mmToPx(ym);

        // 치수선 끝점
        const d1x=p1.x+nx*offMm, d1y=p1.y+ny*offMm;
        const d2x=p2.x+nx*offMm, d2y=p2.y+ny*offMm;

        // 보조선
        labelGroup.add(new Konva.Line({points:[TX(p1.x+nx*gapMm),TY(p1.y+ny*gapMm),TX(p1.x+nx*(offMm+extMm)),TY(p1.y+ny*(offMm+extMm))],stroke:'#6B7A8A',strokeWidth:0.5}));
        labelGroup.add(new Konva.Line({points:[TX(p2.x+nx*gapMm),TY(p2.y+ny*gapMm),TX(p2.x+nx*(offMm+extMm)),TY(p2.y+ny*(offMm+extMm))],stroke:'#6B7A8A',strokeWidth:0.5}));

        // 치수선
        labelGroup.add(new Konva.Line({points:[TX(d1x),TY(d1y),TX(d2x),TY(d2y)],stroke:'#6B7A8A',strokeWidth:0.7}));

        // 사선 마크
        const tkx=(ux*cos45-uy*sin45)*tickPx;
        const tky=(ux*sin45+uy*cos45)*tickPx;
        labelGroup.add(new Konva.Line({points:[TX(d1x)-tkx,TY(d1y)-tky,TX(d1x)+tkx,TY(d1y)+tky],stroke:'#6B7A8A',strokeWidth:1.1}));
        labelGroup.add(new Konva.Line({points:[TX(d2x)-tkx,TY(d2y)-tky,TX(d2x)+tkx,TY(d2y)+tky],stroke:'#6B7A8A',strokeWidth:1.1}));

        // 치수 수치
        const tmx=(d1x+d2x)/2-nx*90, tmy=(d1y+d2y)/2-ny*90;
        let rot=Math.atan2(dy,dx)*180/Math.PI;
        if(rot>90||rot<-90) rot+=180;
        const t=new Konva.Text({x:TX(tmx),y:TY(tmy),text:Math.round(lenmm).toString(),fontSize:10,fontFamily:'JetBrains Mono',fill:'#8899AA',fontStyle:'500',rotation:rot});
        t.offsetX(t.width()/2);t.offsetY(t.height()/2);
        labelGroup.add(t);
      }
    }
  });
}

// v5.9: 내력벽 네트워크의 centroid 기준 "안쪽" 판정 — 클릭 방향 독립
// 모든 내력벽 중점 평균을 공간 안쪽으로 가정. 그 점이 이 벽의 +n쪽이면 +1, -n쪽이면 -1
function _bearingInteriorSign(w){
  let cx=0,cy=0,count=0;
  STATE.walls.forEach(o=>{
    if(o.wallType==='bearing'){
      cx+=(o.x1+o.x2)/2; cy+=(o.y1+o.y2)/2; count++;
    }
  });
  if(count<=1) return 1; // 단일 벽 — 기본 convention (+n 쪽 = 안쪽)
  cx/=count; cy/=count;
  const wmx=(w.x1+w.x2)/2, wmy=(w.y1+w.y2)/2;
  const tx=cx-wmx, ty=cy-wmy;
  const dx=w.x2-w.x1, dy=w.y2-w.y1;
  const len=Math.hypot(dx,dy);
  if(len<1) return 1;
  const ux=dx/len, uy=dy/len;
  const nx=-uy, ny=ux;
  const dot=tx*nx+ty*ny;
  return dot>0?1:-1;
}

// v5.9: 벽 정렬 오프셋 (px) — 클릭 방향 독립 (centroid 기반)
//   interior(내벽) = 그린 선이 실내쪽 면 → body는 centroid 반대 (바깥으로)
//   exterior(외벽) = 그린 선이 외부쪽 면 → body는 centroid 쪽 (안으로)
//   center = 양쪽 ±half (정렬 무관)
function _wallAlignOffsetPx(w){
  if(w.isLine) return 0;
  const align=w.alignment||'center';
  if(align==='center') return 0;
  const tPx=mmToPx(w.thickness||100);
  // 내력벽이 아닌 일반벽은 단순 정렬 (centroid 영향 없음 — 기본 convention 사용)
  if(w.wallType!=='bearing'){
    return align==='interior'?(tPx/2):(-tPx/2);
  }
  // 내력벽: centroid 방향 기준
  const sign=_bearingInteriorSign(w);
  // 내벽: centroid 쪽(안쪽)으로 body, 외벽: centroid 반대(바깥쪽)으로 body
  const factor=(align==='interior')?sign:-sign;
  return factor*(tPx/2);
}

// v5.9: 미터 조인트 — 두 직선의 교점 (px 기준)
function _lineIntersect(p1,d1,p2,d2){
  const det=d1.x*d2.y-d1.y*d2.x;
  if(Math.abs(det)<1e-6) return null; // 평행
  const t=((p2.x-p1.x)*d2.y-(p2.y-p1.y)*d2.x)/det;
  return {x:p1.x+t*d1.x,y:p1.y+t*d1.y};
}

// v5.9: 내력벽 미터 조인트 — 비대칭 오프셋(topOff/botOff) + 원본 vertex 기준
// 정렬(center/interior/exterior)이 어떻든 두 벽이 원본 vertex에서 같은 미터점을 산출하도록 설계
// vertexPx: 원본 vertex(shift 없음) px, tFwd: vertex→body 방향, tN: tFwd의 CCW 수직
// tTopOffPx: 이 벽 +tN 쪽 edge 오프셋(px), tBotOffPx: -tN 쪽 edge 오프셋(px, 보통 음수)
function _miterEnd(thisWall,neighbor,thisVId,vertexPx,tFwd,tN,tTopOffPx,tBotOffPx){
  const nx1=neighbor.x1,ny1=neighbor.y1,nx2=neighbor.x2,ny2=neighbor.y2;
  const ndx=nx2-nx1,ndy=ny2-ny1;
  const nlen=Math.hypot(ndx,ndy);
  if(nlen<1) return null;
  const nuxMm=ndx/nlen, nuyMm=ndy/nlen;
  const intoBodyX=(neighbor.v1Id===thisVId)?nuxMm:-nuxMm;
  const intoBodyY=(neighbor.v1Id===thisVId)?nuyMm:-nuyMm;
  const nFwd={x:intoBodyX,y:intoBodyY};
  const nN={x:-intoBodyY,y:intoBodyX};
  // 이웃 벽의 비대칭 오프셋 (centroid 기반 클릭 방향 독립)
  const nbT=neighbor.thickness||200;
  const nbIntSign=(typeof _bearingInteriorSign==='function')?_bearingInteriorSign(neighbor):1;
  const nbAlignFactor=(neighbor.alignment==='interior')?nbIntSign:(neighbor.alignment==='exterior')?-nbIntSign:0;
  const nbHalfMm=nbT/2;
  const nbOffMm=nbAlignFactor*nbHalfMm;
  let nbTopOffPx=mmToPx(nbOffMm+nbHalfMm);
  let nbBotOffPx=mmToPx(nbOffMm-nbHalfMm);
  // v5.9 fix: 이웃의 v2가 공유 vertex면 nN 방향이 이웃 원본 n과 반대 → 오프셋 부호 반전
  if(neighbor.v2Id===thisVId){
    nbTopOffPx = -nbTopOffPx;
    nbBotOffPx = -nbBotOffPx;
  }

  // 내부 각도등분선
  const bisX=tFwd.x+nFwd.x, bisY=tFwd.y+nFwd.y;
  const bisLen=Math.hypot(bisX,bisY);
  if(bisLen<1e-3) return null;
  const innerBis={x:bisX/bisLen,y:bisY/bisLen};

  // 각 edge가 inner인지 outer인지 판정 — 오프셋 부호 × n방향과 bisector 내적
  function sideOf(offPx,n){
    if(Math.abs(offPx)<0.5) return 0; // edge가 vertex 위 (interior/exterior 정렬 시 한쪽 edge가 centerline에 정확히 위치)
    const sign=offPx>0?1:-1;
    const v=sign*(n.x*innerBis.x+n.y*innerBis.y);
    return v>0?1:-1; // 1=inner, -1=outer
  }
  const aTopSide=sideOf(tTopOffPx,tN);
  const aBotSide=sideOf(tBotOffPx,tN);
  const bTopSide=sideOf(nbTopOffPx,nN);
  const bBotSide=sideOf(nbBotOffPx,nN);

  // 4개 edge 직선
  const aTop={x:vertexPx.x+tN.x*tTopOffPx, y:vertexPx.y+tN.y*tTopOffPx};
  const aBot={x:vertexPx.x+tN.x*tBotOffPx, y:vertexPx.y+tN.y*tBotOffPx};
  const bTop={x:vertexPx.x+nN.x*nbTopOffPx, y:vertexPx.y+nN.y*nbTopOffPx};
  const bBot={x:vertexPx.x+nN.x*nbBotOffPx, y:vertexPx.y+nN.y*nbBotOffPx};

  // 매칭: 같은 inner/outer 상태인 edge 우선, 없으면 vertex(0) edge로 fallback
  // (혼합 정렬에서 inner/outer 짝이 안 맞을 때 잘못된 반대측 매칭 방지)
  function pickB(aSide){
    if(aSide===1){
      if(bTopSide===1) return bTop;
      if(bBotSide===1) return bBot;
      // 같은 inner 없음 — vertex edge로 fallback (vertex edge는 어느 쪽이든 통과)
      if(bTopSide===0) return bTop;
      if(bBotSide===0) return bBot;
    }else if(aSide===-1){
      if(bTopSide===-1) return bTop;
      if(bBotSide===-1) return bBot;
      if(bTopSide===0) return bTop;
      if(bBotSide===0) return bBot;
    }else{ // aSide===0
      if(bTopSide===0) return bTop;
      if(bBotSide===0) return bBot;
      return bTop;
    }
    return bTop;
  }
  const matchAtop=pickB(aTopSide);
  const matchAbot=pickB(aBotSide);
  // edge가 vertex와 일치하면 미터 점도 vertex
  const top = (aTopSide===0||(matchAtop===bTop?bTopSide===0:bBotSide===0))
              ? aTop : (_lineIntersect(aTop,tFwd,matchAtop,nFwd)||aTop);
  const bot = (aBotSide===0||(matchAbot===bTop?bTopSide===0:bBotSide===0))
              ? aBot : (_lineIntersect(aBot,tFwd,matchAbot,nFwd)||aBot);
  // sub-pixel 차이로 양쪽 벽이 미세하게 어긋나는 것 방지: 정수 반올림
  return {
    top:{x:Math.round(top.x),y:Math.round(top.y)},
    bot:{x:Math.round(bot.x),y:Math.round(bot.y)},
  };
}
// v5.9: 일반벽 4코너 계산 — 내력벽과 동일한 미터 조인트 로직, 정렬은 단순 (center/interior/exterior)
function _computeStandardCorners(w){
  const x1Orig=STATE.offsetX+mmToPx(w.x1), y1Orig=STATE.offsetY+mmToPx(w.y1);
  const x2Orig=STATE.offsetX+mmToPx(w.x2), y2Orig=STATE.offsetY+mmToPx(w.y2);
  const dxO=x2Orig-x1Orig, dyO=y2Orig-y1Orig, lenO=Math.hypot(dxO,dyO);
  if(lenO<1) return null;
  const ux=dxO/lenO, uy=dyO/lenO, nx=-uy, ny=ux;
  const tT=w.thickness||STATE.wallThickness||100;
  const halfMm=tT/2;
  const align=w.alignment||STATE.wallAlignment||'center';
  const alignFactor=(align==='interior')?1:(align==='exterior')?-1:0;
  const offMm=alignFactor*halfMm;
  const topOffPx=mmToPx(offMm+halfMm);
  const botOffPx=mmToPx(offMm-halfMm);
  let c1={x:x1Orig+nx*topOffPx,y:y1Orig+ny*topOffPx};
  let c2={x:x2Orig+nx*topOffPx,y:y2Orig+ny*topOffPx};
  let c3={x:x2Orig+nx*botOffPx,y:y2Orig+ny*botOffPx};
  let c4={x:x1Orig+nx*botOffPx,y:y1Orig+ny*botOffPx};
  // 인접 일반벽 (내력벽 / isLine 제외) 1개일 때만 미터
  const isStdNeighbor=o=>o.id!==w.id&&!o.isLine&&o.wallType!=='bearing';
  const adjV1=STATE.walls.filter(o=>isStdNeighbor(o)&&(o.v1Id===w.v1Id||o.v2Id===w.v1Id));
  if(adjV1.length===1){
    const m=_miterEnd(w,adjV1[0],w.v1Id,{x:x1Orig,y:y1Orig},{x:ux,y:uy},{x:nx,y:ny},topOffPx,botOffPx);
    if(m){c1=m.top;c4=m.bot;}
  }
  const adjV2=STATE.walls.filter(o=>isStdNeighbor(o)&&(o.v1Id===w.v2Id||o.v2Id===w.v2Id));
  if(adjV2.length===1){
    const m=_miterEnd(w,adjV2[0],w.v2Id,{x:x2Orig,y:y2Orig},{x:-ux,y:-uy},{x:-nx,y:-ny},-botOffPx,-topOffPx);
    if(m){c3=m.top;c2=m.bot;}
  }
  return {c1,c2,c3,c4,ux,uy,nx,ny};
}
// v5.9: 내력벽 4코너 계산 헬퍼 — 미터 조인트 적용
function _computeBearingCorners(w){
  const x1Orig=STATE.offsetX+mmToPx(w.x1), y1Orig=STATE.offsetY+mmToPx(w.y1);
  const x2Orig=STATE.offsetX+mmToPx(w.x2), y2Orig=STATE.offsetY+mmToPx(w.y2);
  const dxO=x2Orig-x1Orig, dyO=y2Orig-y1Orig, lenO=Math.hypot(dxO,dyO);
  if(lenO<1) return null;
  const ux=dxO/lenO, uy=dyO/lenO, nx=-uy, ny=ux;
  const tT=w.thickness||200;
  const halfMm=tT/2;
  const intSign=_bearingInteriorSign(w);
  const alignFactor=(w.alignment==='interior')?intSign:(w.alignment==='exterior')?-intSign:0;
  const offMm=alignFactor*halfMm;
  const topOffPx=mmToPx(offMm+halfMm);
  const botOffPx=mmToPx(offMm-halfMm);
  let c1={x:x1Orig+nx*topOffPx,y:y1Orig+ny*topOffPx};
  let c2={x:x2Orig+nx*topOffPx,y:y2Orig+ny*topOffPx};
  let c3={x:x2Orig+nx*botOffPx,y:y2Orig+ny*botOffPx};
  let c4={x:x1Orig+nx*botOffPx,y:y1Orig+ny*botOffPx};
  let v1Mitered=false, v2Mitered=false;
  const adjV1=STATE.walls.filter(o=>o.id!==w.id&&o.wallType==='bearing'&&(o.v1Id===w.v1Id||o.v2Id===w.v1Id));
  if(adjV1.length===1){
    const m=_miterEnd(w,adjV1[0],w.v1Id,{x:x1Orig,y:y1Orig},{x:ux,y:uy},{x:nx,y:ny},topOffPx,botOffPx);
    if(m){c1=m.top;c4=m.bot;v1Mitered=true;}
  }
  const adjV2=STATE.walls.filter(o=>o.id!==w.id&&o.wallType==='bearing'&&(o.v1Id===w.v2Id||o.v2Id===w.v2Id));
  if(adjV2.length===1){
    const m=_miterEnd(w,adjV2[0],w.v2Id,{x:x2Orig,y:y2Orig},{x:-ux,y:-uy},{x:-nx,y:-ny},-botOffPx,-topOffPx);
    if(m){c3=m.top;c2=m.bot;v2Mitered=true;}
  }
  return {c1,c2,c3,c4,ux,uy,nx,ny,v1Mitered,v2Mitered};
}
function renderWalls(){
  groups.walls.destroyChildren();
  // v5.4+v5.5: 중첩 감지 — 벽↔벽(주황) 와 벽↔공간변(파랑) 분리
  const overlapsWall=detectOverlappingWalls();
  const overlapsSpace=detectWallSpaceOverlap();
  // v5.9: 내력벽 통합 렌더 — 본체(fill+hatch+외곽선)를 단일 패스로 합쳐서 겹치는 부분 자연 병합
  const _bearingDataAll=STATE.walls.filter(w=>w.wallType==='bearing'&&!w.isLine).map(w=>{
    const c=_computeBearingCorners(w);
    return c?{wall:w,...c}:null;
  }).filter(Boolean);
  // v5.9: 내력벽이 일반벽보다 위 레이어에 오도록 — 렌더 후 moveToTop 호출용 참조 보관
  let _mergedBearingRef=null;
  const _bearingPerWallRefs=[];
  const _bearingCenterlineRefs=[];
  if(_bearingDataAll.length>0){
    const _theme=document.body&&document.body.getAttribute('data-theme');
    const _isLight=_theme==='architect';
    const _bearingMain=_isLight?'#000000':'#FFFFFF';
    const _bearingHatch=_isLight?'#1A1A1A':'#E5E5E5';
    const _bearingFill=_isLight?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.10)';
    const merged=new Konva.Shape({
      listening:false,
      sceneFunc(ctx,sh){
        // 1. 통합 path: nonzero 룰로 한 번에 fill (겹침 영역도 한 픽셀당 한번만 칠해짐)
        const buildPath=()=>{
          ctx.beginPath();
          _bearingDataAll.forEach(({c1,c2,c3,c4})=>{
            ctx.moveTo(c1.x,c1.y);
            ctx.lineTo(c2.x,c2.y);
            ctx.lineTo(c3.x,c3.y);
            ctx.lineTo(c4.x,c4.y);
            ctx.closePath();
          });
        };
        buildPath();
        ctx.fillStyle=_bearingFill;
        ctx.fill();
        // 2. 해치 (통합 영역 클립 + 글로벌 y=x+c 격자)
        ctx.save();
        buildPath();
        ctx.clip();
        ctx.strokeStyle=_bearingHatch;
        ctx.lineWidth=1.0;
        let minX=Infinity,maxX=-Infinity;
        let cMin=Infinity,cMax=-Infinity;
        _bearingDataAll.forEach(({c1,c2,c3,c4})=>{
          [c1,c2,c3,c4].forEach(p=>{
            if(p.x<minX) minX=p.x;
            if(p.x>maxX) maxX=p.x;
            const cv=p.y-p.x;
            if(cv<cMin) cMin=cv;
            if(cv>cMax) cMax=cv;
          });
        });
        const HATCH_SPACING=6;
        const cStep=HATCH_SPACING*Math.SQRT2;
        cMin-=cStep; cMax+=cStep;
        const cStart=Math.ceil(cMin/cStep)*cStep;
        for(let c=cStart;c<=cMax;c+=cStep){
          ctx.beginPath();
          ctx.moveTo(minX-100, minX-100+c);
          ctx.lineTo(maxX+100, maxX+100+c);
          ctx.stroke();
        }
        ctx.restore();
        // 3. 외곽선 — 오프스크린 캔버스에 strokes 그린 후, 각 폴리곤 inset 영역 destination-out으로 내부 선 제거
        const cw=ctx.canvas.width, ch=ctx.canvas.height;
        const off=document.createElement('canvas');
        off.width=cw; off.height=ch;
        const o=off.getContext('2d');
        o.strokeStyle=_bearingMain;
        o.lineWidth=2.0;
        o.lineCap='square';
        o.lineJoin='miter';
        _bearingDataAll.forEach(({c1,c2,c3,c4})=>{
          o.beginPath();
          o.moveTo(c1.x,c1.y);
          o.lineTo(c2.x,c2.y);
          o.lineTo(c3.x,c3.y);
          o.lineTo(c4.x,c4.y);
          o.closePath();
          o.stroke();
        });
        // 자기 경계선은 보존(±1px stroke)하고 내부 침투 선만 제거: 1.05px 만큼 안쪽 inset
        o.globalCompositeOperation='destination-out';
        o.fillStyle='#000';
        const insetAmt=1.05;
        _bearingDataAll.forEach(({c1,c2,c3,c4,ux,uy,nx,ny})=>{
          const i1={x:c1.x-nx*insetAmt+ux*insetAmt, y:c1.y-ny*insetAmt+uy*insetAmt};
          const i2={x:c2.x-nx*insetAmt-ux*insetAmt, y:c2.y-ny*insetAmt-uy*insetAmt};
          const i3={x:c3.x+nx*insetAmt-ux*insetAmt, y:c3.y+ny*insetAmt-uy*insetAmt};
          const i4={x:c4.x+nx*insetAmt+ux*insetAmt, y:c4.y+ny*insetAmt+uy*insetAmt};
          o.beginPath();
          o.moveTo(i1.x,i1.y);
          o.lineTo(i2.x,i2.y);
          o.lineTo(i3.x,i3.y);
          o.lineTo(i4.x,i4.y);
          o.closePath();
          o.fill();
        });
        o.globalCompositeOperation='source-over';
        ctx.drawImage(off, 0, 0);
      },
    });
    groups.walls.add(merged);
    _mergedBearingRef=merged;
  }
  // v5.9: 자유벽(공간 vertex 미공유) 중 다른 자유벽과 vertex 공유하는 것을 미리 식별 → 파란색 표시
  const _spaceVertexSet=new Set();
  STATE.spaces.forEach(s=>s.vertexIds&&s.vertexIds.forEach(vid=>_spaceVertexSet.add(vid)));
  const _isFreeWall=w=>!w.isLine&&w.wallType!=='bearing'&&!_spaceVertexSet.has(w.v1Id)&&!_spaceVertexSet.has(w.v2Id);
  const _connectedFreeWallIds=new Set();
  const _freeWalls=STATE.walls.filter(_isFreeWall);
  for(let i=0;i<_freeWalls.length;i++){
    for(let j=i+1;j<_freeWalls.length;j++){
      const a=_freeWalls[i], b=_freeWalls[j];
      if(a.v1Id===b.v1Id||a.v1Id===b.v2Id||a.v2Id===b.v1Id||a.v2Id===b.v2Id){
        _connectedFreeWallIds.add(a.id);
        _connectedFreeWallIds.add(b.id);
      }
    }
  }
  STATE.walls.forEach(w=>{
    let x1=STATE.offsetX+mmToPx(w.x1),y1=STATE.offsetY+mmToPx(w.y1);
    let x2=STATE.offsetX+mmToPx(w.x2),y2=STATE.offsetY+mmToPx(w.y2);
    // v5.9: 정렬에 따른 수직 오프셋 (방향벡터의 우측 = (-dy, dx) 기준)
    const offT=_wallAlignOffsetPx(w);
    if(offT!==0){
      const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
      if(len>1){
        const nx=-dy/len, ny=dx/len; // 진행방향 우측 perpendicular
        x1+=nx*offT;y1+=ny*offT;x2+=nx*offT;y2+=ny*offT;
      }
    }
    const sel=STATE.selectedKind==='wall'&&STATE.selectedId===w.id||STATE.boxSelection.some(b=>b.kind==='wall'&&b.id===w.id);
    const isOW=overlapsWall.has(w.id);
    const isOS=overlapsSpace.has(w.id);
    const overlapColor=isOS?'#3D9DE2':(isOW?'#E03030':null);
    const isLine=!!w.isLine;
    const isPartition=w.wallType==='bearing';
    const lineSp=isLine&&w.spaceId?STATE.spaces.find(s=>s.id===w.spaceId):null;
    const lineBaseColor=lineSp?SPACE_TYPES[lineSp.type].color:'#7B82B5';

    if(!isLine && isPartition){
      // v5.9: 내력벽 본체는 위쪽 통합 렌더로 처리. 여기선 hit / 선택표시 / 경고만.
      const corners=_computeBearingCorners(w);
      if(!corners) return;
      const {c1,c2,c3,c4}=corners;
      const shape=new Konva.Shape({
        id:w.id,
        sceneFunc(ctx,sh){
          if(sel){
            // 선택 강조: 주황 fill + 외곽선
            ctx.beginPath();
            ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
            ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
            ctx.closePath();
            ctx.fillStyle='rgba(226,114,91,0.18)';
            ctx.fill();
            ctx.strokeStyle='#E2725B';
            ctx.lineWidth=2.8;
            ctx.lineCap='square';ctx.lineJoin='miter';
            ctx.stroke();
          } else if(overlapColor){
            // 중첩 경고 — 점선 외곽
            ctx.setLineDash([4,4]);
            ctx.strokeStyle=overlapColor;
            ctx.lineWidth=1.5;
            ctx.beginPath();
            ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
            ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
          }
        },
        hitFunc(ctx,sh){
          ctx.beginPath();
          ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
          ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
          ctx.closePath();
          ctx.fillStrokeShape(sh);
        },
        shadowColor:sel?'#E2725B':(overlapColor||'transparent'),
        shadowBlur:sel?8:(overlapColor?10:0),
        shadowOpacity:sel?0.5:(overlapColor?0.7:0),
      });
      shape.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('wall',w.id);});
      groups.walls.add(shape);
      _bearingPerWallRefs.push(shape);
    }else if(isLine){
      // 선(isLine) — 기존 Konva.Line 유지 (두께가 1px대라 lineCap overshoot 무시 가능)
      const line=new Konva.Line({
        points:[x1,y1,x2,y2],
        stroke:sel?'#E2725B':(overlapColor||lineBaseColor),
        strokeWidth:sel?3.5:2.2,
        lineCap:'square',
        id:w.id,hitStrokeWidth:16,
        dash:overlapColor?[4,4]:[],
        shadowColor:sel?'#E2725B':(overlapColor||'transparent'),
        shadowBlur:sel?8:(overlapColor?12:0),
        shadowOpacity:sel?0.5:(overlapColor?0.8:0),
      });
      line.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('wall',w.id);});
      if(w.locked){line.opacity(0.30);line.dash([6,4]);}
      groups.walls.add(line);
    }else{
      // v5.9: 표준벽 — 4코너 폴리곤 + 미터 조인트 (lineCap overshoot 제거, 코너 자연 결합)
      const corners=_computeStandardCorners(w);
      if(!corners) return;
      const {c1,c2,c3,c4}=corners;
      const _isConnectedFree=_connectedFreeWallIds.has(w.id);
      const _fillColor=_isConnectedFree?'#5BA0D4':'#3E3E3E';
      const shape=new Konva.Shape({
        id:w.id,
        sceneFunc(ctx,sh){
          ctx.beginPath();
          ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
          ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
          ctx.closePath();
          ctx.fillStyle=sel?'rgba(226,114,91,0.85)':(overlapColor?overlapColor:_fillColor);
          ctx.fill();
          if(sel||overlapColor){
            if(overlapColor) ctx.setLineDash([4,4]);
            ctx.strokeStyle=sel?'#E2725B':overlapColor;
            ctx.lineWidth=sel?2.5:1.5;
            ctx.lineJoin='miter';
            ctx.stroke();
            ctx.setLineDash([]);
          }
        },
        hitFunc(ctx,sh){
          ctx.beginPath();
          ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
          ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
          ctx.closePath();
          ctx.fillStrokeShape(sh);
        },
        opacity:w.locked?0.30:1,
        shadowColor:sel?'#E2725B':(overlapColor||'transparent'),
        shadowBlur:sel?8:(overlapColor?10:0),
        shadowOpacity:sel?0.5:(overlapColor?0.7:0),
      });
      shape.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('wall',w.id);});
      groups.walls.add(shape);
    }
    // 경고 마크
    if(isOW&&!sel){
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      groups.walls.add(new Konva.Text({x:mx-10,y:my-14,text:'⚠',fontSize:28,fontFamily:'Inter',fill:'#E03030',shadowColor:'#000',shadowBlur:3}));
    }
  });

  // v5.9: 내력벽 코너는 미터 조인트로 자연스럽게 처리 (위 _miterEnd) — 별도 캡 불필요

  // v5.9: 기준선(centerline) 별도 패스 — 정렬에 따라 wall body가 offset된 경우 클릭한 선 위치 식별용
  // CAD 표준 CENTER linetype (장-단 점선) + 라임/골드 강조색
  STATE.walls.forEach(w=>{
    if(w.isLine) return;
    const x1c=STATE.offsetX+mmToPx(w.x1),y1c=STATE.offsetY+mmToPx(w.y1);
    const x2c=STATE.offsetX+mmToPx(w.x2),y2c=STATE.offsetY+mmToPx(w.y2);
    const isBearing=w.wallType==='bearing';
    const cl=new Konva.Line({
      points:[x1c,y1c,x2c,y2c],
      stroke:isBearing?'#D4FF3D':'#C9A961',
      strokeWidth:0.8,
      dash:[10,3,2,3], // CENTER linetype: 장점-짧점-장점
      opacity:0.85,
      listening:false,
    });
    groups.walls.add(cl);
    if(isBearing) _bearingCenterlineRefs.push(cl);
  });
  // v5.9: 내력벽 시각효과를 일반벽 위로 — 통합 본체 → 개별 hit/select → 센터라인 순으로 moveToTop
  // (moveToTop은 호출 순서대로 쌓이므로 마지막 호출이 최상단)
  if(_mergedBearingRef) _mergedBearingRef.moveToTop();
  _bearingPerWallRefs.forEach(s=>s.moveToTop());
  _bearingCenterlineRefs.forEach(c=>c.moveToTop());
}
// v5.5: 벽이 공간 폴리곤 변과 같은 직선상에서 겹치는지 검사
function detectWallSpaceOverlap(){
  const overlaps=new Set();
  STATE.walls.forEach(w=>{
    if(w.wallType==='bearing') return; // v5.9: 내력벽 격리 — 공간 겹침 무시
    STATE.spaces.forEach(s=>{
      for(let i=0;i<s.polygon.length;i++){
        const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
        if(wallsOverlap(w,{x1:a.x,y1:a.y,x2:b.x,y2:b.y})){overlaps.add(w.id);return;}
      }
    });
  });
  return overlaps;
}
// v5.4: 두 벽이 같은 직선상에 있고 겹치는지 검사
// v5.9 (개정): 점단위 스택 카운트 — 같은 직선 그룹에서 1D 스윕으로 어느 한 점에 3겹 이상 쌓이는지 검사
// pairwise cnt 방식은 장거리 벽이 두 짧은 벽과 다른 구간에서 각각 2겹인 경우도 3겹으로 오탐했음
function detectOverlappingWalls(){
  const overlaps=new Set();
  const candidates=STATE.walls.filter(w=>w.wallType!=='bearing'&&!w.isLine);
  // 직선 그룹핑 — 같은 직선상에 있는 벽들끼리 묶음
  const groups=[];
  candidates.forEach(w=>{
    for(const g of groups){
      if(_wallsCollinear(g[0],w)){g.push(w);return;}
    }
    groups.push([w]);
  });
  // 그룹별 1D 스윕
  groups.forEach(g=>{
    if(g.length<3) return; // 3겹 이상 가능성 없음
    const ref=g[0];
    const dxR=ref.x2-ref.x1, dyR=ref.y2-ref.y1;
    const lenR=Math.hypot(dxR,dyR);
    if(lenR<1) return;
    const ux=dxR/lenR, uy=dyR/lenR;
    const ox=ref.x1, oy=ref.y1;
    // 각 벽을 t-구간으로 투영
    const intervals=g.map((w,idx)=>{
      const t1=(w.x1-ox)*ux+(w.y1-oy)*uy;
      const t2=(w.x2-ox)*ux+(w.y2-oy)*uy;
      return{wall:w,idx,lo:Math.min(t1,t2),hi:Math.max(t1,t2)};
    });
    // 이벤트: +1 = 진입, -1 = 이탈
    const events=[];
    intervals.forEach(iv=>{
      events.push({t:iv.lo,type:1,idx:iv.idx});
      events.push({t:iv.hi,type:-1,idx:iv.idx});
    });
    // 같은 t에서는 -1 먼저 (끝점만 닿는 경우는 동시 활성 아님)
    events.sort((a,b)=>a.t-b.t||a.type-b.type);
    const active=new Set();
    for(const e of events){
      if(e.type===1) active.add(e.idx); else active.delete(e.idx);
      if(active.size>=3){
        active.forEach(idx=>overlaps.add(intervals[idx].wall.id));
      }
    }
  });
  return overlaps;
}
// 두 벽이 같은 직선상에 있는지 (구간 겹침 여부 무관)
function _wallsCollinear(a,b){
  const dxa=a.x2-a.x1, dya=a.y2-a.y1;
  const dxb=b.x2-b.x1, dyb=b.y2-b.y1;
  const lenA=Math.hypot(dxa,dya), lenB=Math.hypot(dxb,dyb);
  if(lenA<1||lenB<1) return false;
  const cross=dxa*dyb-dya*dxb;
  if(Math.abs(cross)>lenA*lenB*0.02) return false; // ~1.1° 이내 평행
  const cross2=(b.x1-a.x1)*dya-(b.y1-a.y1)*dxa;
  if(Math.abs(cross2)>lenA*10) return false; // 10mm 이내 동일 직선
  return true;
}
function wallsOverlap(a,b){
  // 바운딩박스 사전 검사 — 멀리 떨어진 벽쌍 즉시 제거 (O(n²) 성능 핵심)
  const TOL=20;
  const aMinX=Math.min(a.x1,a.x2)-TOL, aMaxX=Math.max(a.x1,a.x2)+TOL;
  const aMinY=Math.min(a.y1,a.y2)-TOL, aMaxY=Math.max(a.y1,a.y2)+TOL;
  const bMinX=Math.min(b.x1,b.x2)-TOL, bMaxX=Math.max(b.x1,b.x2)+TOL;
  const bMinY=Math.min(b.y1,b.y2)-TOL, bMaxY=Math.max(b.y1,b.y2)+TOL;
  if(aMaxX<bMinX||bMaxX<aMinX||aMaxY<bMinY||bMaxY<aMinY) return false;
  // 같은 직선상에 있는지: 외적 = 0
  const dxa=a.x2-a.x1, dya=a.y2-a.y1;
  const dxb=b.x2-b.x1, dyb=b.y2-b.y1;
  const cross=dxa*dyb-dya*dxb;
  const lenA=Math.sqrt(dxa*dxa+dya*dya), lenB=Math.sqrt(dxb*dxb+dyb*dyb);
  if(lenA<1||lenB<1) return false;
  if(Math.abs(cross)>lenA*lenB*0.02) return false; // 약 1.1° 이내만 평행 인정
  // a선상에 b의 시작/끝 점이 있는지
  const cross2=(b.x1-a.x1)*dya-(b.y1-a.y1)*dxa;
  if(Math.abs(cross2)>lenA*10) return false; // 10mm 이내 동일 직선 인정
  // 매개변수 t로 겹침 구간 계산
  const len2=dxa*dxa+dya*dya;
  if(len2<1) return false;
  const tb1=((b.x1-a.x1)*dxa+(b.y1-a.y1)*dya)/len2;
  const tb2=((b.x2-a.x1)*dxa+(b.y2-a.y1)*dya)/len2;
  const lo=Math.min(tb1,tb2), hi=Math.max(tb1,tb2);
  return hi>0.01&&lo<0.99;
}

// *** 개구부 — 도어/창 W×H×D 풀 데이터 (요구사항 #2, #3) ***
function renderOpenings(){
  groups.openings.destroyChildren();
  STATE.openings.forEach(o=>{
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const w=mmToPx(o.width_mm);
    const isDoor=o.type==='DOOR';
    const color=isDoor?'#D4A05B':'#5BA0D4';
    const sel=STATE.selectedKind==='opening'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='opening'&&b.id===o.id);
    const g=new Konva.Group({x,y,rotation:o.angle||0,scaleX:o.flipped?-1:1,id:o.id});
    // v5.9: depth_mm가 클수록 jamb(벽 단면) 사각형 시각 두께 증가
    const dPx=Math.max(3,mmToPx(o.depth_mm||(isDoor?40:200)));
    const isDouble=isDoor&&(o.subtractMode||'double')==='double';
    if(isDoor){
      // 양면차감 시 jamb를 살짝 더 진하게(opacity ↑) + 양쪽 끝에 표시 라인
      g.add(new Konva.Rect({x:-w/2,y:-dPx/2,width:w,height:dPx,
        fill:color,opacity:isDouble?0.95:0.75,
        stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2:1}));
      // 양면차감 표시: 양쪽 면(jamb 외곽)에 가는 라인
      if(isDouble){
        g.add(new Konva.Line({points:[-w/2,-dPx/2,w/2,-dPx/2],stroke:'#0A0A0A',strokeWidth:1.2,opacity:0.6}));
        g.add(new Konva.Line({points:[-w/2,dPx/2,w/2,dPx/2],stroke:'#0A0A0A',strokeWidth:1.2,opacity:0.6}));
      }
      g.add(new Konva.Arc({x:-w/2,y:0,innerRadius:0,outerRadius:w,angle:90,rotation:0,
        stroke:color,strokeWidth:1,fillEnabled:false,dash:[4,3]}));
      g.add(new Konva.Line({points:[-w/2,0,-w/2,w],stroke:color,strokeWidth:2}));
    }else{
      // v5.9: KS F 1501 표준 창 표기 — 미닫이창 Z자 이중 표시
      // 외창(상단 1/4 y)이 좌→중앙오버랩, 내창(하단 1/4 y)이 중앙오버랩→우 (Z 형태)
      const _wTheme=document.body&&document.body.getAttribute('data-theme');
      const _isLight=_wTheme==='architect';
      const fillCol=_isLight?'#FFFFFF':'#F5F1EB';
      const strokeCol=sel?'#E2725B':'#0A0A0A';
      // 좌우 jamb (벽 단면)
      const jambW=Math.max(2,Math.min(dPx*0.18,8));
      g.add(new Konva.Rect({x:-w/2,y:-dPx/2,width:jambW,height:dPx,
        fill:'#0A0A0A',opacity:0.9,listening:false}));
      g.add(new Konva.Rect({x:w/2-jambW,y:-dPx/2,width:jambW,height:dPx,
        fill:'#0A0A0A',opacity:0.9,listening:false}));
      // 본체 흰 바탕
      g.add(new Konva.Rect({x:-w/2,y:-dPx/2,width:w,height:dPx,
        fill:fillCol,opacity:0.95,
        stroke:strokeCol,strokeWidth:sel?2:1.2}));
      // Z자 미닫이창 표기
      const innerL=-w/2+jambW;
      const innerR=w/2-jambW;
      const innerW=innerR-innerL;
      const half=innerW/2;
      const overlap=innerW*0.06;
      const upperY=-dPx*0.25;
      const lowerY=dPx*0.25;
      const outerEnd=innerL+half+overlap;
      const innerStart=innerR-half-overlap;
      // 좌·우 프레임 수직선 (jamb 안쪽 — 창틀 측면)
      g.add(new Konva.Line({points:[innerL,-dPx/2,innerL,dPx/2],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      g.add(new Konva.Line({points:[innerR,-dPx/2,innerR,dPx/2],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 중앙 긴 수평선 (창 중심선 — KS F 1501 표준)
      g.add(new Konva.Line({points:[innerL,0,innerR,0],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 외창 상단 수평선
      g.add(new Konva.Line({points:[innerL,upperY,outerEnd,upperY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 외창 우측 수직 (Z 첫 수직)
      g.add(new Konva.Line({points:[outerEnd,upperY,outerEnd,lowerY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 내창 하단 수평선
      g.add(new Konva.Line({points:[innerStart,lowerY,innerR,lowerY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 내창 좌측 수직 (Z 두 번째 수직)
      g.add(new Konva.Line({points:[innerStart,upperY,innerStart,lowerY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
    }
    // 미부착 경고 — spaceId 없거나 해당 공간이 삭제된 경우 빨간 점선
    const isAttached=o.spaceId&&STATE.spaces.some(s=>s.id===o.spaceId);
    if(!isAttached){
      g.add(new Konva.Rect({x:-w/2-5,y:-9,width:w+10,height:18,
        stroke:'#E2725B',strokeWidth:1.5,fillEnabled:false,dash:[5,3],cornerRadius:2,listening:false}));
    }
    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('opening',o.id);});
    groups.openings.add(g);
    // 라벨에 W×H 표시
    const subTypeName=isDoor?(DOOR_TYPES[o.subType]||{name:'문'}).name:(WINDOW_TYPES[o.subType]||{name:'창'}).name;
    labelGroup.add(new Konva.Text({
      x:x-40,y:y+12,width:80,align:'center',
      text:subTypeName+' '+o.width_mm+'×'+o.height_mm,
      fontSize:9,fontFamily:'JetBrains Mono',fill:color,
    }));
  });
}

// v5.5: 라이브러리 도형 명령(shape)을 Konva 노드로 변환
// v5.5: shape 정의를 Konva 노드로 변환
// v5.7: 2.5D 토글 ON 시 그림자(opacity 어두운 사각형) + 그라데이션(linearGradient) 적용
function drawShape(shape){
  const nodes=[];
  const plus=STATE.plus2D; // v5.7: 2.5D 활성화 여부
  shape.forEach(s=>{
    const px=mmToPx(1); // 1mm → px
    const sx=v=>v*px; // mm → px
    if(s.type==='rect'){
      // v5.7: 2.5D ON + 채워진 rect만 그라데이션 적용 (밝은 위 → 어두운 아래)
      let fill=s.fill||'transparent';
      if(plus && s.fill && s.fill!=='transparent' && s.fill!=='none'){
        // 단순 그라데이션: 시작색은 fill, 종료색은 약간 어두운 톤 (16진수 → 어둡게)
        const dark=darkenHex(s.fill,0.35);
        nodes.push(new Konva.Rect({x:sx(s.x),y:sx(s.y),width:sx(s.w),height:sx(s.h),
          fillLinearGradientStartPoint:{x:0,y:0},
          fillLinearGradientEndPoint:{x:0,y:sx(s.h)},
          fillLinearGradientColorStops:[0,s.fill,1,dark],
          stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
          cornerRadius:s.r?sx(s.r):0,dash:s.dash?s.dash.map(d=>sx(d)):[]}));
        return;
      }
      nodes.push(new Konva.Rect({x:sx(s.x),y:sx(s.y),width:sx(s.w),height:sx(s.h),
        fill,stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
        cornerRadius:s.r?sx(s.r):0,dash:s.dash?s.dash.map(d=>sx(d)):[]}));
    }else if(s.type==='circle'){
      nodes.push(new Konva.Circle({x:sx(s.cx),y:sx(s.cy),radius:sx(s.r),
        fill:s.fill||'transparent',stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
        dash:s.dash?s.dash.map(d=>sx(d)):[]}));
    }else if(s.type==='line'){
      nodes.push(new Konva.Line({points:[sx(s.x1),sx(s.y1),sx(s.x2),sx(s.y2)],
        stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
        dash:s.dash?s.dash.map(d=>sx(d)):[]}));
    }else if(s.type==='arc'){
      nodes.push(new Konva.Arc({x:sx(s.cx),y:sx(s.cy),
        innerRadius:sx(s.r),outerRadius:sx(s.r),
        angle:s.end-s.start,rotation:s.start,
        fill:s.fill||'transparent',stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10))}));
    }else if(s.type==='text'){
      // v5.6: 소방 심볼용 텍스트 (S, H, E, F 등)
      nodes.push(new Konva.Text({x:sx(s.x),y:sx(s.y),
        text:s.text,fontSize:sx(s.fontSize||50),fontFamily:'Inter',fontStyle:'700',
        fill:s.fill||'#000',listening:false}));
    }
  });
  return nodes;
}

// v5.7: hex 색상 어둡게 (그라데이션용). frac 0~1 (0=원색, 1=검정)
function darkenHex(hex,frac){
  if(!hex||hex[0]!=='#'||hex.length<7) return hex||'#000';
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const k=1-frac;
  const tr=Math.round(r*k),tg=Math.round(g*k),tb=Math.round(b*k);
  return '#'+tr.toString(16).padStart(2,'0')+tg.toString(16).padStart(2,'0')+tb.toString(16).padStart(2,'0');
}

function renderRect(arr,group,lib,kind){
  group.destroyChildren();
  arr.forEach(o=>{
    const def=lib[o.type];
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind===kind&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind===kind&&b.id===o.id);
    // v5.7: flipped(미러) 좌우반전 — 그룹 scaleX(-1)로 처리, 단 텍스트 노드는 별도 보정
    const sx=o.flipped?-1:1;
    const g=new Konva.Group({x,y,rotation:o.angle||0,scaleX:sx,scaleY:1,id:o.id});
    // v5.7: 2.5D ON 시 그림자 — 객체 외곽 사각형을 어두운 색으로 약간 옵셋
    if(STATE.plus2D){
      const w=mmToPx(def.w),h=mmToPx(def.h);
      const sd=mmToPx(80); // 80mm 옵셋 (px 환산)
      g.add(new Konva.Rect({x:-w/2+sd,y:-h/2+sd,width:w,height:h,
        fill:'#000',opacity:0.18,listening:false,cornerRadius:4}));
    }
    if(def.shape){
      // v5.5: 정교한 도형 (shape 정의 기반)
      const nodes=drawShape(def.shape);
      // v5.7: flipped 시 텍스트만 다시 좌우반전(부모 -1, 자식 -1 = 정방향)
      if(o.flipped){
        nodes.forEach(n=>{
          if(n.getClassName && n.getClassName()==='Text'){
            n.scaleX(-1);
            // 텍스트 위치도 반대편으로 (본문 길이만큼 보정 필요 없음 — Konva Text는 좌상단 기준)
          }
        });
      }
      nodes.forEach(n=>g.add(n));
      // v5.9: 영문 이름 라벨 — 객체 중앙. 흰 글자 + 검정 외곽선으로 모든 배경에서 가독성 확보
      if(def.nameEn){
        const w=mmToPx(def.w),h=mmToPx(def.h);
        const minDim=Math.min(w,h);
        const fontSize=Math.max(10,Math.min(18,minDim*0.14));
        const txt=new Konva.Text({
          x:-w/2,y:-fontSize*0.7,
          width:w,height:fontSize*1.4,
          text:def.nameEn,
          fontSize:fontSize,
          fontFamily:'Inter Tight, Inter, sans-serif',
          fontStyle:'700',
          fill:'#FFFFFF',
          stroke:'#000000',
          strokeWidth:Math.max(2.5,fontSize*0.22),
          fillAfterStrokeEnabled:true,
          lineJoin:'round',
          align:'center',verticalAlign:'middle',
          listening:false,
          shadowColor:'#000000',
          shadowBlur:3,
          shadowOpacity:0.6,
        });
        if(o.flipped) txt.scaleX(-1);
        g.add(txt);
      }
      if(sel){
        // 선택 시 골드 외곽 박스 (mm 좌표 기준)
        const w=mmToPx(def.w),h=mmToPx(def.h);
        g.add(new Konva.Rect({x:-w/2-3,y:-h/2-3,width:w+6,height:h+6,
          stroke:'#E2725B',strokeWidth:2.5,dash:[6,4],fill:'transparent',
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6}));
      }
    }else{
      // 폴백: 기존 단순 사각형
      const w=mmToPx(def.w),h=mmToPx(def.h);
      g.add(new Konva.Rect({x:-w/2,y:-h/2,width:w,height:h,fill:def.c+'CC',
        stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2.5:1,cornerRadius:2}));
      g.add(new Konva.Text({x:-w/2,y:-h/2,width:w,height:h,text:def.name,
        fontSize:Math.min(11,h*0.18),fontFamily:'Inter',
        fill:'#0A0A0A',align:'center',verticalAlign:'middle',listening:false}));
    }
    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj(kind,o.id);});
    // v5.9: 잠금 시각효과 — 반투명만
    if(o.locked) g.opacity(0.30);
    group.add(g);
  });
}

function renderLights(){
  groups.lights.destroyChildren();
  STATE.lights.forEach(o=>{
    const def=LIGHT_LIB[o.type];
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind==='lights'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='lights'&&b.id===o.id);
    const g=new Konva.Group({x,y,rotation:o.angle||0,id:o.id});
    if(def.shape){
      drawShape(def.shape).forEach(n=>g.add(n));
      if(sel){
        const r=mmToPx(def.size||200)/2+5;
        g.add(new Konva.Circle({radius:r,stroke:'#E2725B',strokeWidth:2.5,dash:[6,4],
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6}));
      }
    }else{
      // 폴백
      const r=Math.max(8,mmToPx(def.size||200)/2);
      g.add(new Konva.Circle({radius:r,stroke:def.c,strokeWidth:2,fill:def.c+'22'}));
      if(sel) g.add(new Konva.Circle({radius:r+4,stroke:'#E2725B',strokeWidth:2,dash:[3,3]}));
    }
    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('lights',o.id);});
    if(o.locked) g.opacity(0.30);
    groups.lights.add(g);
  });
}
function renderElectric(){
  groups.electric.destroyChildren();
  STATE.electric.forEach(o=>{
    const def=ELECTRIC_LIB[o.type];
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind==='electric'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='electric'&&b.id===o.id);
    const g=new Konva.Group({x,y,rotation:o.angle||0,id:o.id});
    if(def.shape){
      drawShape(def.shape).forEach(n=>g.add(n));
      if(sel){
        const r=mmToPx(def.size||200)/2+5;
        g.add(new Konva.Circle({radius:r,stroke:'#E2725B',strokeWidth:2.5,dash:[6,4],
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6}));
      }
    }else{
      // 폴백
      const r=Math.max(8,mmToPx(def.size||200)/2);
      g.add(new Konva.Circle({radius:r,fill:def.c+'88',stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2:1}));
      g.add(new Konva.Text({x:-r,y:-7,width:r*2,text:def.sym,fontSize:13,fill:'#FFFFFF',align:'center',listening:false}));
    }
    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('electric',o.id);});
    if(o.locked) g.opacity(0.30);
    groups.electric.add(g);
  });
}
function renderTexts(){
  groups.text.destroyChildren();
  STATE.texts.forEach(t=>{
    const x=STATE.offsetX+mmToPx(t.x),y=STATE.offsetY+mmToPx(t.y);
    const sel=STATE.selectedKind==='texts'&&STATE.selectedId===t.id||STATE.boxSelection.some(b=>b.kind==='texts'&&b.id===t.id);
    const txt=new Konva.Text({x,y,text:t.text,fontSize:t.fontSize||14,fontFamily:'Inter',fill:sel?'#E2725B':'#F5F1EB',id:t.id,opacity:t.locked?0.30:1});
    txt.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('texts',t.id);});
    groups.text.add(txt);
  });
}
function renderMeasures(){
  groups.dimensions.destroyChildren();
  STATE.measures.forEach(m=>{
    const style=m.style||'simple';
    const sel=STATE.selectedKind==='measures'&&STATE.selectedId===m.id||STATE.boxSelection.some(b=>b.kind==='measures'&&b.id===m.id);
    const color=sel?'#E2725B':'#7A9BB5';
    const g=new Konva.Group({id:m.id});

    if(style==='arch'){
      // ── KS F 1501 건축 평면도 치수표기법 ──
      const dx=m.x2-m.x1, dy=m.y2-m.y1;
      const lenmm=Math.sqrt(dx*dx+dy*dy);
      if(lenmm<1){groups.dimensions.add(g);return;}
      const ux=dx/lenmm, uy=dy/lenmm;   // 치수선 방향 단위벡터
      const perpx=-uy, perpy=ux;         // 수직 단위벡터 (좌회전 90°)
      const side=m.side!=null?m.side:1;
      const offMm=(m.offsetMm||1500)*side;// 벽~치수선 거리
      const gapMm=50*side;               // 벽면~보조선 시작 갭
      const extMm=100*side;              // 치수선 너머 보조선 연장
      const tickPx=mmToPx(90);           // 사선 마크 반길이 (px)
      const textOffMm=120;               // 치수수치~치수선 간격

      const TX=xmm=>STATE.offsetX+mmToPx(xmm);
      const TY=ymm=>STATE.offsetY+mmToPx(ymm);

      // 치수선 끝점
      const d1x=m.x1+perpx*offMm, d1y=m.y1+perpy*offMm;
      const d2x=m.x2+perpx*offMm, d2y=m.y2+perpy*offMm;

      // 치수 보조선 (extension lines)
      g.add(new Konva.Line({points:[TX(m.x1+perpx*gapMm),TY(m.y1+perpy*gapMm),TX(m.x1+perpx*(offMm+extMm)),TY(m.y1+perpy*(offMm+extMm))],stroke:color,strokeWidth:0.6}));
      g.add(new Konva.Line({points:[TX(m.x2+perpx*gapMm),TY(m.y2+perpy*gapMm),TX(m.x2+perpx*(offMm+extMm)),TY(m.y2+perpy*(offMm+extMm))],stroke:color,strokeWidth:0.6}));

      // 치수선 (메인)
      g.add(new Konva.Line({points:[TX(d1x),TY(d1y),TX(d2x),TY(d2y)],stroke:color,strokeWidth:0.8,hitStrokeWidth:14}));

      // 사선 마크 (45° tick — KS 건축 표준)
      const cos45=Math.cos(Math.PI/4), sin45=Math.sin(Math.PI/4);
      const tkx=(ux*cos45-uy*sin45)*tickPx;
      const tky=(ux*sin45+uy*cos45)*tickPx;
      g.add(new Konva.Line({points:[TX(d1x)-tkx,TY(d1y)-tky,TX(d1x)+tkx,TY(d1y)+tky],stroke:color,strokeWidth:1.4}));
      g.add(new Konva.Line({points:[TX(d2x)-tkx,TY(d2y)-tky,TX(d2x)+tkx,TY(d2y)+tky],stroke:color,strokeWidth:1.4}));

      // 치수 수치 — 항상 위쪽(수평)/왼쪽(수직) 고정
      let tpx=perpx,tpy=perpy;
      if(tpy>1e-9||(Math.abs(tpy)<1e-9&&tpx>0)){tpx=-tpx;tpy=-tpy;}
      const tmx=(d1x+d2x)/2+tpx*textOffMm;
      const tmy=(d1y+d2y)/2+tpy*textOffMm;
      let rot=Math.atan2(dy,dx)*180/Math.PI;
      if(rot>=90||rot<-90) rot+=180;
      const t=new Konva.Text({x:TX(tmx),y:TY(tmy),text:Math.round(lenmm).toString(),fontSize:11,fontFamily:'JetBrains Mono',fill:color,fontStyle:'600',rotation:rot});
      t.offsetX(t.width()/2);t.offsetY(t.height()/2);
      g.add(t);

    } else {
      // 기존 simple 스타일 (줄자 도구 — 하위호환)
      const x1=STATE.offsetX+mmToPx(m.x1),y1=STATE.offsetY+mmToPx(m.y1);
      const x2=STATE.offsetX+mmToPx(m.x2),y2=STATE.offsetY+mmToPx(m.y2);
      const dist=Math.sqrt((m.x2-m.x1)**2+(m.y2-m.y1)**2);
      g.add(new Konva.Line({points:[x1,y1,x2,y2],stroke:sel?'#E2725B':'#B8B0A0',strokeWidth:1,dash:[5,3],hitStrokeWidth:12}));
      g.add(new Konva.Circle({x:x1,y:y1,radius:3,fill:sel?'#E2725B':'#B8B0A0'}));
      g.add(new Konva.Circle({x:x2,y:y2,radius:3,fill:sel?'#E2725B':'#B8B0A0'}));
      const mx=(x1+x2)/2,my=(y1+y2)/2;
      g.add(new Konva.Text({x:mx-50,y:my-18,width:100,align:'center',text:Math.round(dist)+' mm',fontSize:11,fontFamily:'JetBrains Mono',fill:sel?'#E2725B':'#D4B872',stroke:'#0A0A0A',strokeWidth:0.5}));
    }

    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('measures',m.id);});
    groups.dimensions.add(g);
  });
}
// v5.9: 지시선 (LE)
function renderLeaders(){
  groups.leaders.destroyChildren();
  STATE.leaders.forEach(ld=>{
    if(!ld.points||ld.points.length<2) return;
    const sel=STATE.selectedKind==='leaders'&&STATE.selectedId===ld.id||STATE.boxSelection.some(b=>b.kind==='leaders'&&b.id===ld.id);
    const color=sel?'#E2725B':'#A8D8A8';
    const g=new Konva.Group({id:ld.id});

    const TX=xmm=>STATE.offsetX+mmToPx(xmm);
    const TY=ymm=>STATE.offsetY+mmToPx(ymm);

    // 선 세그먼트 (모든 점 연결)
    const flatPts=[];
    ld.points.forEach(p=>{flatPts.push(TX(p.x),TY(p.y));});
    g.add(new Konva.Line({points:flatPts,stroke:color,strokeWidth:1.2,hitStrokeWidth:12,lineCap:'round',lineJoin:'round'}));

    // 화살표 (점[0] 방향 — points[1]→points[0] 방향, 고정 px 크기)
    const p0=ld.points[0], p1=ld.points[1];
    const adx=p0.x-p1.x, ady=p0.y-p1.y;
    const alen=Math.hypot(adx,ady)||1;
    const ax=adx/alen, ay=ady/alen;
    const arrLen=14, arrW=7; // 고정 픽셀 (줌 독립)
    const tip={x:TX(p0.x),y:TY(p0.y)};
    const base={x:tip.x-ax*arrLen,y:tip.y-ay*arrLen};
    const lx=base.x+ay*arrW/2, ly=base.y-ax*arrW/2;
    const rx=base.x-ay*arrW/2, ry=base.y+ax*arrW/2;
    g.add(new Konva.Line({points:[tip.x,tip.y,lx,ly,rx,ry,tip.x,tip.y],closed:true,fill:color,stroke:color,strokeWidth:0.5}));

    // shelf (마지막 점에서 수평 연장)
    const last=ld.points[ld.points.length-1];
    const prev=ld.points[ld.points.length-2];
    const sdx=last.x-prev.x;
    const shelfDir=sdx>=0?1:-1;
    const shelfMm=300;
    const shelfEndX=last.x+shelfDir*shelfMm;
    g.add(new Konva.Line({points:[TX(last.x),TY(last.y),TX(shelfEndX),TY(last.y)],stroke:color,strokeWidth:1.2}));

    // 텍스트
    if(ld.text){
      const tx=new Konva.Text({
        x:TX(shelfEndX)+(shelfDir>0?4:-4),
        y:TY(last.y)-mmToPx(120),
        text:ld.text,
        fontSize:ld.fontSize||13,
        fontFamily:'Inter',
        fill:color,
      });
      if(shelfDir<0) tx.x(TX(shelfEndX)-tx.width()-4);
      g.add(tx);
    }

    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('leaders',ld.id);});
    groups.leaders.add(g);
  });
}
function renderAll(){
  renderWalls();renderSpaces();renderOpenings();
  renderRect(STATE.fixtures,groups.fixtures,FIXTURE_LIB,'fixtures');
  renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture');
  renderRect(STATE.hvac,groups.hvac,HVAC_FIRE_LIB,'hvac'); // v5.6
  renderLights();renderElectric();renderTexts();renderMeasures();
  renderCircles();renderArcs(); // v5.3
  renderCurves(); // v5.9: 자유곡선 (Bezier)
  renderLeaders(); // v5.9
  renderPillars(); // v5.9: 기둥 (RC)
  // v5.9: 자동 면적 라벨 비활성화 — 공간 공유 변 사이 부분영역마다 라벨이 생겨 도면이 어지러움
  renderSpaceHandles(); // v5.9: 선택된 공간 vertex 핸들
  renderGhostHints(); // v5.9: 고스트 스냅 힌트 (선 위 잠재 스냅점 미리 표시)
  Object.entries(STATE.layers).forEach(([k,v])=>{if(groups[k]) groups[k].visible(v);});
  mainLayer.batchDraw();previewLayer.batchDraw();
}

// v5.9: 고스트 스냅 힌트 — 모든 객체의 잠재적 스냅점 미리 표시
function renderGhostHints(){
  ghostHintGroup.destroyChildren();
  if(!STATE.snap.ghost){previewLayer.batchDraw();return;}
  const seen=new Set();
  const drawHint=(mmX,mmY,emphasize)=>{
    const k=Math.round(mmX)+':'+Math.round(mmY);
    if(seen.has(k)) return; seen.add(k);
    const x=STATE.offsetX+mmToPx(mmX), y=STATE.offsetY+mmToPx(mmY);
    ghostHintGroup.add(new Konva.Circle({
      x,y,radius:emphasize?3:2,
      fill:emphasize?'#FFE066':'#A8A8B8',
      stroke:'#000',strokeWidth:0.5,opacity:emphasize?0.85:0.55,
    }));
  };
  // 모든 벽 (일반 + 내력벽 + line) — 끝점·중점·1/4·3/4
  // 내력벽은 두꺼운 벽체 안에 점이 묻히므로 크게 + 검정 외곽으로 또렷하게
  const drawWallHint=(mmX,mmY,emphasize,isBearing)=>{
    const k=Math.round(mmX)+':'+Math.round(mmY);
    if(seen.has(k)) return; seen.add(k);
    const x=STATE.offsetX+mmToPx(mmX), y=STATE.offsetY+mmToPx(mmY);
    const r=isBearing?(emphasize?4:3):(emphasize?3:2);
    ghostHintGroup.add(new Konva.Circle({
      x,y,radius:r,
      fill:emphasize?'#FFE066':'#A8A8B8',
      stroke:'#000',strokeWidth:isBearing?1.2:0.5,
      opacity:emphasize?0.95:0.75,
      shadowColor:isBearing?'#000':'transparent',shadowBlur:isBearing?4:0,shadowOpacity:isBearing?0.7:0,
    }));
  };
  STATE.walls.forEach(w=>{
    const isBrg=w.wallType==='bearing';
    drawWallHint(w.x1,w.y1,true,isBrg);
    drawWallHint(w.x2,w.y2,true,isBrg);
    drawWallHint((w.x1+w.x2)/2,(w.y1+w.y2)/2,false,isBrg);
    drawWallHint(w.x1+(w.x2-w.x1)*0.25,w.y1+(w.y2-w.y1)*0.25,false,isBrg);
    drawWallHint(w.x1+(w.x2-w.x1)*0.75,w.y1+(w.y2-w.y1)*0.75,false,isBrg);
  });
  // 내력벽끼리 교차점
  const bearings=STATE.walls.filter(w=>w.wallType==='bearing');
  for(let i=0;i<bearings.length;i++){
    for(let j=i+1;j<bearings.length;j++){
      const a=bearings[i], b=bearings[j];
      const ip=(typeof segIntersection==='function')?
        segIntersection({x:a.x1,y:a.y1},{x:a.x2,y:a.y2},{x:b.x1,y:b.y1},{x:b.x2,y:b.y2}):null;
      if(ip) drawHint(ip.x,ip.y,true);
    }
  }
  // 공간 — 코너·변 중점·1/4·3/4
  STATE.spaces.forEach(s=>{
    s.polygon.forEach(p=>drawHint(p.x,p.y,true));
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
      drawHint((a.x+b.x)/2,(a.y+b.y)/2,false);
      drawHint(a.x+(b.x-a.x)*0.25,a.y+(b.y-a.y)*0.25,false);
      drawHint(a.x+(b.x-a.x)*0.75,a.y+(b.y-a.y)*0.75,false);
    }
  });
  // 도어·창 — 중심점
  STATE.openings.forEach(o=>drawHint(o.x,o.y,true));
  // 라이브러리 — 중심점
  [STATE.furniture,STATE.fixtures,STATE.lights,STATE.electric,STATE.hvac].forEach(arr=>{
    arr.forEach(o=>drawHint(o.x,o.y,false));
  });
  // 원 — 중심 + 4분점 (사분점)
  STATE.circles.forEach(c=>{
    drawHint(c.x,c.y,true);
    drawHint(c.x+c.radius_mm,c.y,false);
    drawHint(c.x-c.radius_mm,c.y,false);
    drawHint(c.x,c.y+c.radius_mm,false);
    drawHint(c.x,c.y-c.radius_mm,false);
  });
  // 아크 — 중심 + 시작·끝점
  STATE.arcs.forEach(a=>{
    const sa=a.startAngle*Math.PI/180, ea=a.endAngle*Math.PI/180;
    drawHint(a.x,a.y,true);
    drawHint(a.x+Math.cos(sa)*a.radius_mm,a.y+Math.sin(sa)*a.radius_mm,true);
    drawHint(a.x+Math.cos(ea)*a.radius_mm,a.y+Math.sin(ea)*a.radius_mm,true);
  });
  // 텍스트·치수 — 위치
  STATE.texts.forEach(t=>drawHint(t.x,t.y,false));
  STATE.measures.forEach(m=>{drawHint(m.x1,m.y1,true);drawHint(m.x2,m.y2,true);});
  // 지시선 — 모든 꼭지점
  if(STATE.leaders) STATE.leaders.forEach(l=>{
    if(l.points) l.points.forEach(p=>drawHint(p.x,p.y,true));
  });
  // 곡선 — 각 segment의 앵커(P0, P3) 강조 + 중점 표식
  if(STATE.curves) STATE.curves.forEach(cv=>{
    if(!cv.segments) return;
    cv.segments.forEach((s,i)=>{
      if(i===0) drawHint(s.p0.x,s.p0.y,true);
      drawHint(s.p3.x,s.p3.y,true);
      const t=0.5, mt=1-t;
      const midX=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
      const midY=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
      drawHint(midX,midY,false);
    });
  });
  previewLayer.batchDraw();
}
// v5.9: vertex 편집 핸들 — 선택된 공간/벽의 모서리·끝점에 드래그 핸들
// 드래그 시 vertex 좌표만 갱신 → getter로 모든 연결 객체 자동 따라옴
let _spaceHandleDragging=false;
let _spaceHandleStartMm=null; // 직교 모드 기준점
let _vertexSnapIndicator=null; // vertex-vertex 스냅 시각 마커
function renderSpaceHandles(){
  if(_spaceHandleDragging) return; // 드래그 중에는 핸들 재생성 안 함 (위치 리셋 방지)
  groups.spaceHandles.destroyChildren();
  if(STATE.selectedTool!=='select') return;

  // 표시할 vertex ID 수집 (선택된 공간·벽·박스선택 모두) — v5.9: 잠금 객체는 핸들 숨김
  const vidSet=new Set();
  const collectFromObj=(kind,id)=>{
    if(kind==='space'){
      const s=STATE.spaces.find(x=>x.id===id);
      if(s&&!s.locked&&s.vertexIds) s.vertexIds.forEach(vid=>vidSet.add(vid));
    }else if(kind==='wall'){
      const w=STATE.walls.find(x=>x.id===id);
      if(w&&!w.locked){if(w.v1Id) vidSet.add(w.v1Id); if(w.v2Id) vidSet.add(w.v2Id);}
    }
  };
  if(STATE.selectedKind&&STATE.selectedId) collectFromObj(STATE.selectedKind,STATE.selectedId);
  if(STATE.boxSelection&&STATE.boxSelection.length){
    STATE.boxSelection.forEach(b=>collectFromObj(b.kind,b.id));
  }

  // 각 vertex에 핸들 생성
  vidSet.forEach(vid=>{
    const v=getVertex(vid);
    if(!v) return;
    const hx=STATE.offsetX+mmToPx(v.x), hy=STATE.offsetY+mmToPx(v.y);
    // v5.9: 미니멀 글로우 핸들 — opacity 30%, 클릭 영역 30px
    const handle=new Konva.Circle({
      x:hx,y:hy,radius:5,
      fill:'#D4FF3D',
      strokeEnabled:false,
      draggable:true,
      opacity:0.3,
      shadowColor:'#D4FF3D',shadowBlur:12,shadowOpacity:1,
      hitStrokeWidth:30, // 클릭 영역 확장
    });
    handle.on('mouseenter',()=>{
      document.body.style.cursor='move';
      handle.opacity(0.9);handle.radius(7);handle.shadowBlur(18);
      groups.spaceHandles.batchDraw();
    });
    handle.on('mouseleave',()=>{
      document.body.style.cursor='';
      handle.opacity(0.3);handle.radius(5);handle.shadowBlur(12);
      groups.spaceHandles.batchDraw();
    });
    handle.on('mousedown touchstart',e=>{e.cancelBubble=true;});
    handle.on('dragstart',()=>{
      _spaceHandleDragging=true;
      // v5.9: 선택(드래그 시작) — 흰색 코어 + 강한 라임 글로우로 강조
      handle.opacity(1);handle.radius(8);
      handle.fill('#FFFFFF');
      handle.shadowColor('#D4FF3D');handle.shadowBlur(28);handle.shadowOpacity(1);
      // 직교 기준점 = vertex 원래 mm 좌표
      const vNow=getVertex(vid);
      _spaceHandleStartMm=vNow?{x:vNow.x,y:vNow.y}:null;
      groups.spaceHandles.batchDraw();
    });
    handle.on('dragmove',()=>{
      let newXmm=Math.round((handle.x()-STATE.offsetX)/STATE.scale*1000/STATE.zoom);
      let newYmm=Math.round((handle.y()-STATE.offsetY)/STATE.scale*1000/STATE.zoom);
      // v5.9: 직교 모드 — Shift로 토글 (snap.ortho XOR shiftPressed)
      const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
      if(orthoActive&&_spaceHandleStartMm){
        const dx=newXmm-_spaceHandleStartMm.x, dy=newYmm-_spaceHandleStartMm.y;
        if(Math.abs(dx)>=Math.abs(dy)) newYmm=_spaceHandleStartMm.y;
        else newXmm=_spaceHandleStartMm.x;
      }
      if(STATE.snap.grid){
        newXmm=Math.round(newXmm/STATE.gridSize)*STATE.gridSize;
        newYmm=Math.round(newYmm/STATE.gridSize)*STATE.gridSize;
      }
      // v5.9: vertex-to-vertex 스냅 (자기 자신 제외, 가장 가까운 80mm 이내)
      const SNAP_TOL_MM=80;
      let snapTarget=null, snapBest=Infinity;
      STATE.vertices.forEach(o=>{
        if(o.id===vid) return;
        const d=Math.hypot(o.x-newXmm,o.y-newYmm);
        if(d<SNAP_TOL_MM&&d<snapBest){snapBest=d;snapTarget=o;}
      });
      if(snapTarget){
        newXmm=snapTarget.x;newYmm=snapTarget.y;
        handle.fill('#FF8B6B');handle.shadowColor('#FF8B6B');
        if(!_vertexSnapIndicator){
          _vertexSnapIndicator=new Konva.Circle({
            radius:13,stroke:'#FF8B6B',strokeWidth:2,fill:'transparent',
            listening:false,
            shadowColor:'#FF8B6B',shadowBlur:14,shadowOpacity:1,
          });
          // 작은 십자도 추가 (정확한 스냅 위치 표시)
          groups.spaceHandles.add(_vertexSnapIndicator);
        }
        _vertexSnapIndicator.x(STATE.offsetX+mmToPx(snapTarget.x));
        _vertexSnapIndicator.y(STATE.offsetY+mmToPx(snapTarget.y));
        _vertexSnapIndicator.visible(true);
      }else{
        handle.fill('#FFFFFF');handle.shadowColor('#D4FF3D');
        if(_vertexSnapIndicator) _vertexSnapIndicator.visible(false);
      }
      moveVertex(vid,newXmm,newYmm);
      handle.x(STATE.offsetX+mmToPx(newXmm));
      handle.y(STATE.offsetY+mmToPx(newYmm));
      // 벽·공간 + 개구부(벽 부착) 재렌더 (핸들은 유지)
      renderWalls();renderSpaces();renderOpenings();
      groups.spaceHandles.batchDraw();
    });
    handle.on('dragend',()=>{
      _spaceHandleDragging=false;
      _spaceHandleStartMm=null;
      if(_vertexSnapIndicator){_vertexSnapIndicator.destroy();_vertexSnapIndicator=null;}
      saveHistory();
      renderAll();refreshUI();
    });
    groups.spaceHandles.add(handle);
  });
}
// v5.4: 벽들이 만드는 폐곡면 자동 감지 → 면적 라벨 표시 (㎡)
function renderAutoAreas(){
  const cycles=findClosedCyclesInWalls();
  cycles.forEach(poly=>{
    // 이미 spaces로 등록된 폴리곤과 거의 같으면 스킵 (중복 표시 방지)
    const isRegistered=STATE.spaces.some(s=>polygonsSimilar(s.polygon,poly));
    if(isRegistered) return;
    const area=polyArea(poly)/1e6; // mm² → m²
    if(area<0.5) return; // 너무 작은 면적 무시
    let cx=0,cy=0;
    poly.forEach(p=>{cx+=p.x;cy+=p.y;});
    cx/=poly.length;cy/=poly.length;
    const px=STATE.offsetX+mmToPx(cx), py=STATE.offsetY+mmToPx(cy);
    labelGroup.add(new Konva.Text({
      x:px-50,y:py-12,text:'⌂ '+area.toFixed(2)+' ㎡',width:100,align:'center',
      fontSize:11,fontFamily:'JetBrains Mono',fill:'#5BA0D4',fontStyle:'600',
      shadowColor:'#000',shadowBlur:4,shadowOpacity:0.5,
    }));
  });
}
function polygonsSimilar(a,b,tol=200){
  if(a.length!==b.length) return false;
  // 시작점 다르더라도 같은 폴리곤일 수 있으므로 회전 비교
  for(let off=0;off<a.length;off++){
    let ok=true;
    for(let i=0;i<a.length;i++){
      const pa=a[(i+off)%a.length], pb=b[i];
      if(Math.abs(pa.x-pb.x)>tol||Math.abs(pa.y-pb.y)>tol){ok=false;break;}
    }
    if(ok) return true;
  }
  return false;
}
// 벽 그래프에서 가장 작은 폐곡면들 탐색 (최대 6각형까지)
function findClosedCyclesInWalls(){
  const tol=150; // 끝점 일치 톨러런스
  // 노드 = 끝점 (근접 통합), 간선 = 벽
  const nodes=[]; // {x,y, edges:[wallIdx,...]}
  const findOrAddNode=(p)=>{
    for(let i=0;i<nodes.length;i++){
      if(Math.abs(nodes[i].x-p.x)<tol&&Math.abs(nodes[i].y-p.y)<tol) return i;
    }
    nodes.push({x:p.x,y:p.y,edges:[]});
    return nodes.length-1;
  };
  const edges=[]; // {a:nodeIdx,b:nodeIdx,wallId}
  STATE.walls.forEach((w,wi)=>{
    if(w.wallType==='bearing') return; // v5.9: 내력벽 격리 — 자동 면적 감지에서 제외
    const a=findOrAddNode({x:w.x1,y:w.y1});
    const b=findOrAddNode({x:w.x2,y:w.y2});
    if(a!==b){
      const ei=edges.length;
      edges.push({a,b,wallId:w.id});
      nodes[a].edges.push(ei);nodes[b].edges.push(ei);
    }
  });
  // DFS로 사이클 찾기 (최대 깊이 6)
  const cycles=[];const seenCycles=new Set();
  const dfs=(start,curr,path,visited)=>{
    if(path.length>6) return;
    for(const ei of nodes[curr].edges){
      const e=edges[ei];
      const nxt=e.a===curr?e.b:e.a;
      if(nxt===start&&path.length>=3){
        // 사이클 발견
        const key=[...path].sort((a,b)=>a-b).join(',');
        if(!seenCycles.has(key)){
          seenCycles.add(key);
          cycles.push(path.map(n=>({x:nodes[n].x,y:nodes[n].y})));
        }
        continue;
      }
      if(visited.has(nxt)) continue;
      visited.add(nxt);path.push(nxt);
      dfs(start,nxt,path,visited);
      path.pop();visited.delete(nxt);
    }
  };
  for(let s=0;s<nodes.length;s++){
    const visited=new Set([s]);
    dfs(s,s,[s],visited);
    if(cycles.length>20) break; // 안전 한계
  }
  return cycles;
}
// v5.3: 원·아크 렌더
function renderCircles(){
  groups.circles.destroyChildren();
  STATE.circles.forEach(c=>{
    const sel=STATE.selectedKind==='circles'&&STATE.selectedId===c.id;
    const inBox=STATE.boxSelection.some(b=>b.kind==='circles'&&b.id===c.id);
    const sp=c.spaceId?STATE.spaces.find(s=>s.id===c.spaceId):null;
    const stroke=(sel||inBox)?'#E2725B':(sp?SPACE_TYPES[sp.type].color:'#C9A961');
    const cx=STATE.offsetX+mmToPx(c.x), cy=STATE.offsetY+mmToPx(c.y);
    // v5.9: 타원 지원 — rx_mm/ry_mm/rotation 사용, 없으면 radius_mm으로 폴백
    const rx=c.rx_mm!=null?c.rx_mm:c.radius_mm;
    const ry=c.ry_mm!=null?c.ry_mm:c.radius_mm;
    const rotDeg=c.rotation||0;
    // v5.9: 사용자 지정 색상 적용 (없으면 기본 - stroke + 15% 투명)
    const fillCol=c.fillColor||(stroke+'15');
    const strokeCol=c.strokeColor||stroke;
    const k=new Konva.Ellipse({x:cx,y:cy,radiusX:mmToPx(rx),radiusY:mmToPx(ry),rotation:rotDeg,
      stroke:(sel||inBox)?'#E2725B':strokeCol,strokeWidth:sel?2.5:1.6,fill:fillCol,id:c.id,
      opacity:c.locked?0.30:1, dash:c.locked?[6,4]:null}); // v5.9: 잠금 시 반투명+점선
    k.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('circles',c.id);});
    groups.circles.add(k);
    // v5.9: 중앙 텍스트 (사용자 지정)
    if(c.centerText){
      // 텍스트 크기 — 단축 반지름의 30%, 최소 10, 최대 28
      const minR=Math.min(rx,ry);
      const fontSize=Math.max(10,Math.min(28,mmToPx(minR)*0.30));
      const txt=new Konva.Text({
        x:cx,y:cy,text:c.centerText,
        fontSize:fontSize,fontFamily:'Inter',fontStyle:'600',
        fill:'#F5F1EB',
        shadowColor:'#000',shadowBlur:3,shadowOpacity:0.7,
        listening:false,align:'center',verticalAlign:'middle',
      });
      txt.offsetX(txt.width()/2);
      txt.offsetY(txt.height()/2);
      groups.circles.add(txt);
    }
    // v5.9: 선택 시 편집 핸들 — rx± / ry± / 회전 (잠금 시 핸들 숨김)
    if(sel&&!c.locked){
      const cosA=Math.cos(rotDeg*Math.PI/180), sinA=Math.sin(rotDeg*Math.PI/180);
      const rxPx=mmToPx(rx), ryPx=mmToPx(ry);
      const handles=[
        {axis:'rx',sign: 1,x:cx+rxPx*cosA, y:cy+rxPx*sinA},
        {axis:'rx',sign:-1,x:cx-rxPx*cosA, y:cy-rxPx*sinA},
        {axis:'ry',sign: 1,x:cx-ryPx*sinA, y:cy+ryPx*cosA},
        {axis:'ry',sign:-1,x:cx+ryPx*sinA, y:cy-ryPx*cosA},
      ];
      handles.forEach(h=>{
        const hd=new Konva.Rect({x:h.x-4,y:h.y-4,width:8,height:8,
          fill:'#FFD700',stroke:'#000',strokeWidth:1,draggable:true,hitStrokeWidth:14});
        hd.on('dragmove',()=>{
          const mx=pxToMm(hd.x()+4-STATE.offsetX), my=pxToMm(hd.y()+4-STATE.offsetY);
          const dx=mx-c.x, dy=my-c.y;
          const along=dx*Math.cos(rotDeg*Math.PI/180)+dy*Math.sin(rotDeg*Math.PI/180);
          const perp =-dx*Math.sin(rotDeg*Math.PI/180)+dy*Math.cos(rotDeg*Math.PI/180);
          if(h.axis==='rx') c.rx_mm=Math.max(10,Math.abs(along));
          else c.ry_mm=Math.max(10,Math.abs(perp));
          c.radius_mm=Math.max(c.rx_mm||c.radius_mm,c.ry_mm||c.radius_mm);
          // Ellipse 본체 직접 업데이트 (renderAll 호출 안 함 → 드래그 끊김 없음)
          k.radiusX(mmToPx(c.rx_mm));
          k.radiusY(mmToPx(c.ry_mm));
          mainLayer.batchDraw();
        });
        hd.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.circles.add(hd);
      });
      // 회전 핸들 (rx 양극 너머 30px)
      const rotHx=cx+(rxPx+30)*cosA, rotHy=cy+(rxPx+30)*sinA;
      const rotGuide=new Konva.Line({points:[cx+rxPx*cosA,cy+rxPx*sinA,rotHx,rotHy],
        stroke:'#C07B3A',strokeWidth:1,dash:[4,3],listening:false});
      groups.circles.add(rotGuide);
      const rotH=new Konva.Circle({x:rotHx,y:rotHy,radius:7,fill:'#C07B3A',stroke:'#fff',strokeWidth:1.5,draggable:true,hitStrokeWidth:18});
      rotH.on('dragmove',()=>{
        const mx=pxToMm(rotH.x()-STATE.offsetX), my=pxToMm(rotH.y()-STATE.offsetY);
        c.rotation=Math.atan2(my-c.y,mx-c.x)*180/Math.PI;
        // Ellipse 회전 + 가이드라인 끝점 직접 업데이트
        k.rotation(c.rotation);
        const newCosA=Math.cos(c.rotation*Math.PI/180), newSinA=Math.sin(c.rotation*Math.PI/180);
        const guideStart=[cx+rxPx*newCosA,cy+rxPx*newSinA,rotH.x(),rotH.y()];
        rotGuide.points(guideStart);
        mainLayer.batchDraw();
      });
      rotH.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
      groups.circles.add(rotH);
      // 중심점 표시
      groups.circles.add(new Konva.Circle({x:cx,y:cy,radius:3,fill:'#E2725B',stroke:'#fff',strokeWidth:1,listening:false}));
      // R 라벨
      groups.circles.add(new Konva.Text({x:cx+10,y:cy-22,
        text:'rx '+Math.round(rx)+' / ry '+Math.round(ry)+'mm',
        fontSize:10,fontFamily:'JetBrains Mono',fill:'#E2725B',listening:false}));
    }
  });
}
function renderArcs(){
  groups.arcs.destroyChildren();
  STATE.arcs.forEach(a=>{
    const sel=STATE.selectedKind==='arcs'&&STATE.selectedId===a.id;
    const inBox=STATE.boxSelection.some(b=>b.kind==='arcs'&&b.id===a.id);
    const sp=a.spaceId?STATE.spaces.find(s=>s.id===a.spaceId):null;
    const stroke=(sel||inBox)?'#E2725B':(sp?SPACE_TYPES[sp.type].color:'#C9A961');
    const cx=STATE.offsetX+mmToPx(a.x), cy=STATE.offsetY+mmToPx(a.y);
    // Konva.Arc는 angle을 deg로 받음, rotation으로 startAngle 설정
    const sweep=((a.endAngle-a.startAngle)%360+360)%360;
    const k=new Konva.Arc({x:cx,y:cy,innerRadius:mmToPx(a.radius_mm),outerRadius:mmToPx(a.radius_mm),
      angle:sweep,rotation:a.startAngle,
      stroke,strokeWidth:sel?2.5:1.6,id:a.id});
    k.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('arcs',a.id);});
    groups.arcs.add(k);
  });
}
// v5.9: 아크를 3차 베지에 segments로 변환 (90° 단위 분할)
function arcToBezier(cx,cy,r,startAng,endAng){
  const segments=[];
  let a=startAng;
  // sweep 정규화
  let sweep=endAng-startAng;
  while(sweep<=0) sweep+=360;
  while(sweep>360) sweep-=360;
  const stop=startAng+sweep;
  while(a<stop){
    const a2=Math.min(a+90,stop);
    const theta=(a2-a)*Math.PI/180;
    const k=(4/3)*Math.tan(theta/4);
    const a1Rad=a*Math.PI/180, a2Rad=a2*Math.PI/180;
    const p0={x:Math.round(cx+r*Math.cos(a1Rad)),y:Math.round(cy+r*Math.sin(a1Rad))};
    const p3={x:Math.round(cx+r*Math.cos(a2Rad)),y:Math.round(cy+r*Math.sin(a2Rad))};
    const t1x=-Math.sin(a1Rad), t1y=Math.cos(a1Rad);
    const t2x=-Math.sin(a2Rad), t2y=Math.cos(a2Rad);
    const p1={x:Math.round(p0.x+t1x*k*r),y:Math.round(p0.y+t1y*k*r)};
    const p2={x:Math.round(p3.x-t2x*k*r),y:Math.round(p3.y-t2y*k*r)};
    segments.push({p0,p1,p2,p3});
    a=a2;
  }
  return segments;
}
// v5.9: 자유곡선 (3차 베지에) 렌더링 + 편집 핸들
function renderCurves(){
  groups.curves.destroyChildren();
  if(!STATE.curves) return;
  STATE.curves.forEach(c=>{
    if(!c.segments||c.segments.length===0) return;
    const sel=STATE.selectedKind==='curves'&&STATE.selectedId===c.id;
    const inBox=STATE.boxSelection.some(b=>b.kind==='curves'&&b.id===c.id);
    const sp=c.spaceId?STATE.spaces.find(s=>s.id===c.spaceId):null;
    const stroke=(sel||inBox)?'#E2725B':(sp?SPACE_TYPES[sp.type].color:'#C9A961');
    const k=new Konva.Shape({
      id:c.id,
      stroke:stroke, // Konva.Shape의 stroke 속성 — strokeShape(sh) 호출 시 사용
      strokeWidth:sel?2.5:1.6,
      hitStrokeWidth:24, // v5.9: 클릭 영역 확장 (곡선 위 24px 이내 클릭이면 선택)
      opacity:c.locked?0.30:1, dash:c.locked?[6,4]:null, // v5.9: 잠금 시각효과
      sceneFunc(ctx,sh){
        ctx.beginPath();
        const s0=c.segments[0];
        ctx.moveTo(STATE.offsetX+mmToPx(s0.p0.x),STATE.offsetY+mmToPx(s0.p0.y));
        c.segments.forEach(s=>{
          ctx.bezierCurveTo(
            STATE.offsetX+mmToPx(s.p1.x),STATE.offsetY+mmToPx(s.p1.y),
            STATE.offsetX+mmToPx(s.p2.x),STATE.offsetY+mmToPx(s.p2.y),
            STATE.offsetX+mmToPx(s.p3.x),STATE.offsetY+mmToPx(s.p3.y)
          );
        });
        ctx.strokeShape(sh);
      },
      hitFunc(ctx,sh){
        ctx.beginPath();
        const s0=c.segments[0];
        ctx.moveTo(STATE.offsetX+mmToPx(s0.p0.x),STATE.offsetY+mmToPx(s0.p0.y));
        c.segments.forEach(s=>{
          ctx.bezierCurveTo(
            STATE.offsetX+mmToPx(s.p1.x),STATE.offsetY+mmToPx(s.p1.y),
            STATE.offsetX+mmToPx(s.p2.x),STATE.offsetY+mmToPx(s.p2.y),
            STATE.offsetX+mmToPx(s.p3.x),STATE.offsetY+mmToPx(s.p3.y)
          );
        });
        ctx.strokeShape(sh);
      },
    });
    k.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('curves',c.id);});
    groups.curves.add(k);
    // 선택 시 편집 핸들 (앵커 + 컨트롤 + 가이드라인) — 잠금 시 핸들 숨김
    if(sel&&!c.locked){
      const drawAnchor=(p,segIdx,ptKey)=>{
        const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
        const hd=new Konva.Rect({x:x-5,y:y-5,width:10,height:10,
          fill:'#FFD700',stroke:'#000',strokeWidth:1,draggable:true,hitStrokeWidth:14});
        hd.on('dragmove',()=>{
          c.segments[segIdx][ptKey]={x:Math.round(pxToMm(hd.x()+5-STATE.offsetX)),y:Math.round(pxToMm(hd.y()+5-STATE.offsetY))};
          if(ptKey==='p3'&&segIdx+1<c.segments.length) c.segments[segIdx+1].p0={...c.segments[segIdx][ptKey]};
          if(ptKey==='p0'&&segIdx>0) c.segments[segIdx-1].p3={...c.segments[segIdx][ptKey]};
          mainLayer.batchDraw(); // 곡선 path만 갱신, 핸들은 유지
        });
        hd.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.curves.add(hd);
      };
      const drawControl=(p,segIdx,ptKey,anchor)=>{
        const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
        const ax=STATE.offsetX+mmToPx(anchor.x), ay=STATE.offsetY+mmToPx(anchor.y);
        const guide=new Konva.Line({points:[ax,ay,x,y],stroke:'#7BA05B',strokeWidth:1,dash:[3,3],listening:false});
        groups.curves.add(guide);
        const hd=new Konva.Circle({x,y,radius:5,fill:'#7BA05B',stroke:'#fff',strokeWidth:1.5,draggable:true,hitStrokeWidth:14});
        hd.on('dragmove',()=>{
          c.segments[segIdx][ptKey]={x:Math.round(pxToMm(hd.x()-STATE.offsetX)),y:Math.round(pxToMm(hd.y()-STATE.offsetY))};
          // 가이드라인 끝점도 따라 업데이트
          guide.points([ax,ay,hd.x(),hd.y()]);
          mainLayer.batchDraw();
        });
        hd.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.curves.add(hd);
      };
      c.segments.forEach((s,i)=>{
        // 마지막 p3는 다음 segment의 p0과 같으므로 첫 segment에서만 p0 그림
        if(i===0) drawAnchor(s.p0,i,'p0');
        drawControl(s.p1,i,'p1',s.p0);
        drawControl(s.p2,i,'p2',s.p3);
        drawAnchor(s.p3,i,'p3');
        // v5.9: 중점 bend 핸들 — 드래그한 위치로 곡선 중점이 자연스럽게 도달
        // 곡선 중점 B(0.5) = chord_midpoint + 0.75 × offset
        // → 사용자가 원하는 위치로 이동: offset = (drag - chord_midpoint) / 0.75
        const t=0.5, mt=1-t;
        const mxMm=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
        const myMm=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
        const mxPx=STATE.offsetX+mmToPx(mxMm), myPx=STATE.offsetY+mmToPx(myMm);
        const bend=new Konva.Circle({x:mxPx,y:myPx,radius:7,fill:'#E2725B',stroke:'#fff',strokeWidth:1.5,
          draggable:true,hitStrokeWidth:18,
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6});
        bend.on('mouseenter',()=>{document.body.style.cursor='grab';bend.radius(9);groups.curves.batchDraw();});
        bend.on('mouseleave',()=>{document.body.style.cursor='';bend.radius(7);groups.curves.batchDraw();});
        bend.on('dragmove',()=>{
          const dx=pxToMm(bend.x()-STATE.offsetX);
          const dy=pxToMm(bend.y()-STATE.offsetY);
          const cmidX=(s.p0.x+s.p3.x)/2, cmidY=(s.p0.y+s.p3.y)/2;
          const offX=(dx-cmidX)/0.75, offY=(dy-cmidY)/0.75;
          const dxv=s.p3.x-s.p0.x, dyv=s.p3.y-s.p0.y;
          s.p1={x:Math.round(s.p0.x+dxv/3+offX),y:Math.round(s.p0.y+dyv/3+offY)};
          s.p2={x:Math.round(s.p3.x-dxv/3+offX),y:Math.round(s.p3.y-dyv/3+offY)};
          mainLayer.batchDraw();
        });
        bend.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.curves.add(bend);
      });
    }
  });
}

// v5.9: 기둥 (RC 콘크리트) — 사각/원형/L자 + 콘크리트 해치
// 기둥 폴리곤 (회전 전, 중심 기준 mm 좌표)
function pillarPolygonLocal(p){
  const w=p.width||500, h=p.height||500, t=p.thickness||200;
  if(p.shape==='circle'){
    const r=w/2; const N=48; const pts=[];
    for(let i=0;i<N;i++){const a=(i/N)*Math.PI*2;pts.push({x:r*Math.cos(a),y:r*Math.sin(a)});}
    return pts;
  }
  if(p.shape==='L'){
    // L자: 중심 = 두 팔의 무게중심 근처 (대칭 위해 외곽 사각의 중심에서 보정)
    // 외곽: w x h. 안쪽 칼라: (w-t) x (h-t)
    // 중심 기준 좌표: 외곽 사각의 중심을 원점으로 두고 L 모양을 그림
    const x0=-w/2, y0=-h/2;
    return [
      {x:x0,y:y0},{x:x0+w,y:y0},{x:x0+w,y:y0+t},
      {x:x0+t,y:y0+t},{x:x0+t,y:y0+h},{x:x0,y:y0+h}
    ];
  }
  // rect (default)
  return [{x:-w/2,y:-h/2},{x:w/2,y:-h/2},{x:w/2,y:h/2},{x:-w/2,y:h/2}];
}
// 기둥 폴리곤 (회전 + 위치 적용) → mm 좌표
function pillarPolygon(p){
  const local=pillarPolygonLocal(p);
  const rad=(p.rotation||0)*Math.PI/180;
  const cosA=Math.cos(rad), sinA=Math.sin(rad);
  return local.map(pt=>({x:Math.round(p.x+pt.x*cosA-pt.y*sinA),y:Math.round(p.y+pt.x*sinA+pt.y*cosA)}));
}
function renderPillars(){
  groups.pillars.destroyChildren();
  if(!STATE.pillars) return;
  const _theme=document.body&&document.body.getAttribute('data-theme');
  const _isLight=_theme==='architect';
  const _outline=_isLight?'#000000':'#FFFFFF';
  const _hatch=_isLight?'#1A1A1A':'#E5E5E5';
  const _fill=_isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.12)';
  STATE.pillars.forEach(p=>{
    const sel=STATE.selectedKind==='pillars'&&STATE.selectedId===p.id||STATE.boxSelection.some(b=>b.kind==='pillars'&&b.id===p.id);
    const polyMm=pillarPolygon(p);
    const polyPx=polyMm.map(pt=>({x:STATE.offsetX+mmToPx(pt.x),y:STATE.offsetY+mmToPx(pt.y)}));
    // 본체 + 콘크리트 해치 (45° 빗금 + 작은 점 — RC 콘크리트 표준 표기)
    const shape=new Konva.Shape({
      id:p.id,
      sceneFunc(ctx,sh){
        // 1. fill
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.fillStyle=_fill; ctx.fill();
        // 2. 콘크리트 해치 — 단순화: 긴 대각선 3줄 + 큰 원 1개 + 작은 원 1개
        ctx.save();
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.clip();
        ctx.strokeStyle=_hatch;
        ctx.fillStyle=_hatch;
        ctx.lineWidth=0.9;
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        polyPx.forEach(pt=>{minX=Math.min(minX,pt.x);maxX=Math.max(maxX,pt.x);minY=Math.min(minY,pt.y);maxY=Math.max(maxY,pt.y);});
        const w=maxX-minX, h=maxY-minY;
        const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
        const seed=(p.id||'').split('').reduce((s,c)=>s+c.charCodeAt(0),0)||1;
        const rnd=(i)=>{const x=Math.sin(seed*9999+i*131.71)*43758.5453;return x-Math.floor(x);};
        // 모든 해치 요소를 기둥 크기에 비례 (mm 공간 고정) — 줌해도 기둥과 같은 비율 유지
        const minDim=Math.min(w,h);
        const span=Math.hypot(w,h)+minDim*0.1;        // 대각선 길이 ≒ 폴리곤 대각선
        const gap=minDim/8;                            // 평행 간격 = 짧은 변의 1/8
        const shiftMag=minDim*0.15;                    // 비대칭 오프셋 ±15%
        const rBig=minDim*0.18;                        // 큰 원 반지름 = 짧은 변의 18% (기존의 절반)
        const rSml=rBig*0.4;                           // 작은 원 = 큰 원의 40%
        ctx.lineWidth=Math.max(0.6,minDim*0.018);      // 선 굵기도 비례
        const sX=(rnd(5)-0.5)*2*shiftMag, sY=(rnd(6)-0.5)*2*shiftMag;
        // (1) 대각선 3줄 (45°) — 폴리곤 끝~끝 길이, 짧은 변 1/8 간격
        for(let k=-1;k<=1;k++){
          ctx.beginPath();
          const offX=-k*gap/Math.SQRT2+sX, offY=k*gap/Math.SQRT2+sY;
          ctx.moveTo(cx+offX-span/2/Math.SQRT2, cy+offY-span/2/Math.SQRT2);
          ctx.lineTo(cx+offX+span/2/Math.SQRT2, cy+offY+span/2/Math.SQRT2);
          ctx.stroke();
        }
        // (2) 큰 원 — 폴리곤 하단 절반 안 임의 위치 (시드)
        const bxRange=Math.max(0,w-rBig*2);
        const byRangeLower=Math.max(0,h/2-rBig*2);
        const bx=minX+rBig+rnd(1)*bxRange;
        const by=minY+h/2+rBig+rnd(2)*byRangeLower;
        ctx.beginPath();
        ctx.arc(bx,by,rBig,0,Math.PI*2);
        ctx.stroke();
        // (3) 작은 원 (외곽선만)
        const sxRange=Math.max(0,w-rSml*2), syRange=Math.max(0,h-rSml*2);
        const sx=minX+rSml+rnd(3)*sxRange;
        const sy=minY+rSml+rnd(4)*syRange;
        ctx.beginPath();
        ctx.arc(sx,sy,rSml,0,Math.PI*2);
        ctx.stroke();
        ctx.restore();
        // 3. 외곽선 (굵게)
        ctx.strokeStyle=sel?'#E2725B':_outline;
        ctx.lineWidth=sel?2.8:2.2;
        ctx.lineJoin='miter';
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.stroke();
        // 선택 fill 강조
        if(sel){
          ctx.fillStyle='rgba(226,114,91,0.18)';
          ctx.beginPath();
          polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
          ctx.closePath();
          ctx.fill();
        }
      },
      hitFunc(ctx,sh){
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.fillStrokeShape(sh);
      },
      shadowColor:sel?'#E2725B':'transparent',shadowBlur:sel?10:0,shadowOpacity:sel?0.55:0,
      opacity:p.locked?0.30:1,
    });
    shape.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('pillars',p.id);});
    groups.pillars.add(shape);
    // 선택 시 회전 핸들 (잠금 시 숨김)
    if(sel&&!p.locked){
      const cxPx=STATE.offsetX+mmToPx(p.x), cyPx=STATE.offsetY+mmToPx(p.y);
      // 중심점
      groups.pillars.add(new Konva.Circle({x:cxPx,y:cyPx,radius:3,fill:'#E2725B',stroke:'#fff',strokeWidth:1,listening:false}));
      // 회전 핸들 (위쪽 60px)
      const rad=(p.rotation||0)*Math.PI/180;
      const upY=-(p.shape==='circle'?p.width/2:p.height/2)-300;
      const rhx=cxPx+mmToPx(upY*Math.sin(-rad)*0+0)+0; // simpler: place at top-of-bounding
      const _rh={x:cxPx-Math.sin(rad)*40, y:cyPx-Math.cos(rad)*40-30};
      const guide=new Konva.Line({points:[cxPx,cyPx,_rh.x,_rh.y],stroke:'#C07B3A',strokeWidth:1,dash:[4,3],listening:false});
      groups.pillars.add(guide);
      const rh=new Konva.Circle({x:_rh.x,y:_rh.y,radius:7,fill:'#C07B3A',stroke:'#fff',strokeWidth:1.5,draggable:true,hitStrokeWidth:18});
      rh.on('dragmove',()=>{
        const mx=pxToMm(rh.x()-STATE.offsetX), my=pxToMm(rh.y()-STATE.offsetY);
        p.rotation=Math.atan2(my-p.y,mx-p.x)*180/Math.PI+90;
        renderPillars();mainLayer.batchDraw();
      });
      rh.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
      groups.pillars.add(rh);
    }
  });
}

// ===== 선택 =====
// v5.9: Shift 누른 채 클릭 시 boxSelection에 토글 추가 (다중 선택)
function selectObj(kind,id){
  if(STATE.shiftPressed){
    const idx=STATE.boxSelection.findIndex(b=>b.kind===kind&&b.id===id);
    if(idx>=0){
      STATE.boxSelection.splice(idx,1);
    }else{
      // 단일 선택만 있고 박스가 비었으면 기존 단일도 박스에 포함
      if(STATE.boxSelection.length===0&&STATE.selectedKind&&STATE.selectedId
         &&!(STATE.selectedKind===kind&&STATE.selectedId===id)){
        STATE.boxSelection.push({kind:STATE.selectedKind,id:STATE.selectedId});
      }
      STATE.boxSelection.push({kind,id});
    }
    STATE.selectedKind=kind;STATE.selectedId=id;
    renderAll();refreshUI();return;
  }
  STATE.selectedKind=kind;STATE.selectedId=id;
  STATE.boxSelection=[];
  renderAll();refreshUI();
}
function deselect(){STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];renderAll();refreshUI();}

