'use strict';
// ===== STATE =====
const STATE={
  scale:80,gridSize:1,ceilingHeight:2400,wallThickness:50,bearingWallThickness:200,projectName:'신규 인테리어',
  // v5.9: 배경 이미지 (PNG/JPG/SVG 트레이싱용) — null이면 비활성
  bgImage:null, // {filename, dataURL, x_mm, y_mm, scale, opacity, locked, naturalWidth, naturalHeight}
  // v5.9: 벽 정렬 (interior=내벽 / center=중심 / exterior=외벽). 시작 시 중심선
  wallAlignment:'center',
  vertices:[],  // VEF: 모든 점의 단일 진실 원천 [{id,x,y}]
  spaces:[],walls:[],openings:[],furniture:[],fixtures:[],lights:[],electric:[],texts:[],measures:[],
  circles:[],arcs:[], // v5.3: 원·아크
  curves:[], // v5.9: 자유곡선 (3차 베지에 segments 배열)
  hvac:[], // v5.6: 공조/소방
  leaders:[], // v5.9: 지시선 (LE 명령)
  pillars:[], // v5.9: 기둥 (사각/원형/L자) — RC 콘크리트 표기
  pillarDefaults:{shape:'rect',width:500,height:500,thickness:200,rotation:0}, // v5.9: 기둥 도구 기본값
  selectedTool:'select',selectedSpaceType:'LIVING',selectedLib:null,
  selectedId:null,selectedKind:null,
  boxSelection:[], // v5.3: 다중 선택 [{kind,id},...]
  zoom:1,offsetX:200,offsetY:100,
  showGrid:true,showDimensions:true,
  snap:{grid:true,endpoint:true,ghost:false,ortho:false}, // v5.9: ghost(선 근처점)는 별도 토글, 시작 OFF
  shiftPressed:false,
  ctrlPressed:false, // v5.9: Ctrl 누르면 자석 스냅 일시 OFF
  history:[],historyIdx:-1,measureFirst:null,
  layers:{walls:true,spaces:true,openings:true,furniture:true,fixtures:true,lights:true,electric:true,dimensions:true,text:true,circles:true,arcs:true,curves:true,hvac:true,leaders:true,pillars:true},
  estimateConfig:{},
  cmdHistory:[],cmdHistoryIdx:-1,
  cmdMode:null,cmdData:{}, // v5.1: 단계별 프롬프트 모드
  rotateState:null, // 공간 회전 핸들 드래그 상태 {spaceId,cxMm,cyMm,lastAngle,totalAngle}
  snapMarker:null, // v5.2: 현재 스냅 위치 (글로우 표시용)
  isMobile:false,  // v5.2: 모바일 디바이스 감지 (런타임)
  // ===== v5.7: 2.5D 토글 (기본 OFF, 시공 정확도 우선) =====
  plus2D:false,
  // ===== v5.8: 영상 동선 커스텀 순서 (null=면적순 자동, array=사용자 지정 spaceId 배열) =====
  videoSequenceOrder:null,
  // ===== v5.7: AI 생성 파이프라인 SSoT 메타 (이미지·영상 모델 프롬프트 힌트) =====
  aiPromptHints:{
    style:'modern_luxury',         // modern_luxury | scandinavian | industrial | wabi_sabi | korean_modern | minimal | classic | bohemian | mid_century | art_deco | contemporary | rustic | hotel_lux | natural_organic
    mood:'warm_sophisticated',     // warm_sophisticated | cool_calm | bright_airy | cozy_intimate | dramatic | serene | energetic
    lighting:'natural_warm_3000K', // natural_warm_3000K | bright_daylight_5000K | cool_4000K | golden_hour | evening_ambient
    materialPalette:['walnut','white_oak','brass','beige_paint'],
    cameraSuggestion:'isometric_eye_level' // isometric_eye_level | top_down | wide_angle | dolly_in | orbit
  },
};
