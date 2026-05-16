'use strict';
// ===== 공간 타입 =====
// v5.3: 19개 공간 type, HSL 휠 균등 분배 + 한국 인테리어 표준 색상 보존
// 메타: name(한글) / color / ks(표준) / code(영문 4글자) / ceil(천장고mm) / waterproof(방수권장)
const SPACE_TYPES={
  LIVING:  {name:'거실',     color:'#C9A961',ks:'KS F 2872',  code:'LIV',  ceil:2400,waterproof:false},
  ROOM:    {name:'방',       color:'#5B8DA0',ks:'KS F 2872',  code:'ROOM', ceil:2400,waterproof:false},
  KITCHEN: {name:'주방',     color:'#D4A05B',ks:'KS L 2002',  code:'KIT',  ceil:2400,waterproof:false},
  BATHROOM:{name:'욕실',     color:'#5BA0D4',ks:'KS F 4910',  code:'BATH', ceil:2200,waterproof:true},
  ENTRANCE:{name:'현관',     color:'#B8B0A0',ks:'KS F 2872',  code:'ENT',  ceil:2300,waterproof:false},
  BALCONY: {name:'발코니',   color:'#7BA05B',ks:'KS F 4910',  code:'BAL',  ceil:2200,waterproof:true},
  CORRIDOR:{name:'복도',     color:'#6B6258',ks:'KS F 2872',  code:'COR',  ceil:2400,waterproof:false},
  DRESSING:{name:'드레스룸', color:'#9B7AC9',ks:'KS F 2872',  code:'DRS',  ceil:2400,waterproof:false},
  // v5.3 신규 추가 (Tier 1)
  STAIRS:  {name:'계단실',   color:'#8E7B5C',ks:'KS F 2876',  code:'STR',  ceil:null,waterproof:false},
  PANTRY:  {name:'팬트리',   color:'#A88560',ks:'KS F 2872',  code:'PAN',  ceil:2400,waterproof:false},
  UTILITY: {name:'다용도실', color:'#6FA89C',ks:'KS F 4910',  code:'UTL',  ceil:2200,waterproof:true},
  POWDER:  {name:'파우더룸', color:'#C97AA0',ks:'KS F 2872',  code:'PWD',  ceil:2300,waterproof:false},
  STUDY:   {name:'서재',     color:'#7A6B9E',ks:'KS F 2872',  code:'STD',  ceil:2400,waterproof:false},
  // v5.3 신규 추가 (Tier 2)
  BOILER:  {name:'보일러실', color:'#C96A4A',ks:'KS B 8121',  code:'BLR',  ceil:2200,waterproof:true},
  STORAGE: {name:'창고',     color:'#7E7567',ks:'KS F 2872',  code:'STG',  ceil:2300,waterproof:false},
  DINING:  {name:'다이닝',   color:'#D4B96A',ks:'KS F 2872',  code:'DIN',  ceil:2400,waterproof:false},
  FOYER:   {name:'전실',     color:'#A09988',ks:'KS F 2872',  code:'FOY',  ceil:2300,waterproof:false},
  GARAGE:  {name:'차고',     color:'#5C5550',ks:'KS F 2876',  code:'GAR',  ceil:2400,waterproof:false},
  TERRACE: {name:'테라스',   color:'#94B07A',ks:'KS F 4910',  code:'TER',  ceil:null,waterproof:true},
};

// ===== 도어 / 창 타입 (W×H×D 통상값) =====
// v5.9: subtract = 'single'(단면차감, 외부문) | 'double'(양면차감, 내부문). depth 기본 200mm (벽체 표준)
const DOOR_TYPES={
  swing:{name:'여닫이 (방문)',w:900,h:2100,d:200,subtract:'double'},
  entry:{name:'현관문',w:1000,h:2100,d:200,subtract:'single'},
  sliding:{name:'슬라이딩',w:1500,h:2100,d:200,subtract:'double'},
  folding:{name:'폴딩 (3연동)',w:2400,h:2100,d:200,subtract:'double'},
  pocket:{name:'포켓도어',w:900,h:2100,d:200,subtract:'double'},
};
const WINDOW_TYPES={
  casement:{name:'여닫이창',w:1200,h:1500,d:200,sill:900},
  sliding2:{name:'미세기 2짝',w:1800,h:1500,d:200,sill:900},
  sliding4:{name:'미세기 4짝',w:3600,h:1500,d:200,sill:900},
  fixed:{name:'고정창 (FIX)',w:1500,h:1800,d:200,sill:600},
  bay:{name:'베이창 (돌출)',w:2400,h:1500,d:400,sill:900},
  system:{name:'시스템 창호',w:1800,h:2100,d:250,sill:0},
};

// ===== 견적 카탈로그 24종 =====
// applies: floor / wall / ceiling / perimeter / set / count_doors / count_windows / count_lights / count_electric / partial
// v5.8: 한국 인테리어 표준 바닥재 / 벽자재 (공간별 자재 선정 드롭다운용)
const FLOOR_MATERIALS={
  UNDECIDED:{name:'미정',code:'UNDECIDED'},
  STRONG:{name:'강마루',code:'STRONG'},
  WOOD:{name:'원목마루',code:'WOOD'},
  REINFORCED:{name:'강화마루',code:'REINFORCED'},
  LVT:{name:'데코타일(LVT)',code:'LVT'},
  PVC:{name:'장판(PVC)',code:'PVC'},
  TILE_PORC:{name:'포세린타일',code:'TILE_PORC'},
  TILE_POLISHED:{name:'폴리싱타일',code:'TILE_POLISHED'},
  TILE_BATH:{name:'욕실타일(논슬립)',code:'TILE_BATH'},
  MARBLE:{name:'대리석',code:'MARBLE'},
  WOOD_TILE:{name:'우드타일',code:'WOOD_TILE'},
  CARPET:{name:'카펫타일',code:'CARPET'},
  EPOXY:{name:'에폭시(차고/창고)',code:'EPOXY'},
  CONCRETE:{name:'노출콘크리트',code:'CONCRETE'},
};
const WALL_MATERIALS={
  UNDECIDED:{name:'미정',code:'UNDECIDED'},
  WP_COMPOSITE:{name:'합지벽지',code:'WP_COMPOSITE'},
  WP_SILK:{name:'실크벽지',code:'WP_SILK'},
  WP_ECO:{name:'친환경벽지(천연)',code:'WP_ECO'},
  WP_DESIGN:{name:'디자인벽지',code:'WP_DESIGN'},
  PAINT_WATER:{name:'페인트(수성)',code:'PAINT_WATER'},
  PAINT_ECO:{name:'페인트(친환경)',code:'PAINT_ECO'},
  PAINT_SPECIAL:{name:'특수도장(스타코/벨벳)',code:'PAINT_SPECIAL'},
  WALL_TILE:{name:'욕실벽타일',code:'WALL_TILE'},
  KITCHEN_TILE:{name:'주방벽타일',code:'KITCHEN_TILE'},
  WOOD_PANEL:{name:'우드패널',code:'WOOD_PANEL'},
  VENEER:{name:'무늬목패널',code:'VENEER'},
  CONCRETE:{name:'노출콘크리트',code:'CONCRETE'},
  FABRIC:{name:'패브릭패널',code:'FABRIC'},
  METAL:{name:'메탈패널',code:'METAL'},
};
const CEILING_MATERIALS={
  UNDECIDED:{name:'미정',code:'UNDECIDED'},
  GYPSUM:{name:'석고보드',code:'GYPSUM'},
  TBAR:{name:'T-BAR(텍스)',code:'TBAR'},
  COFFER:{name:'우물천정',code:'COFFER'},
  PAINT_WATER:{name:'페인트(수성)',code:'PAINT_WATER'},
  PAINT_ECO:{name:'페인트(친환경)',code:'PAINT_ECO'},
  EXPOSED_CON:{name:'노출콘크리트',code:'EXPOSED_CON'},
  WOOD_CEIL:{name:'목재패널',code:'WOOD_CEIL'},
  STRETCH:{name:'스트레치실링',code:'STRETCH'},
};
// 공간 타입별 기본 자재 (사용자는 드롭다운에서 변경 가능)
function defaultMaterials(spaceType){
  switch(spaceType){
    case 'BATHROOM': return {floor:'TILE_BATH',wall:'WALL_TILE'};
    case 'KITCHEN':  return {floor:'STRONG',  wall:'KITCHEN_TILE'};
    case 'BALCONY':  return {floor:'TILE_PORC',wall:'PAINT_WATER'};
    case 'UTILITY':  return {floor:'TILE_PORC',wall:'PAINT_WATER'};
    case 'BOILER':   return {floor:'TILE_PORC',wall:'PAINT_WATER'};
    case 'STORAGE':  return {floor:'PVC',     wall:'PAINT_WATER'};
    case 'GARAGE':   return {floor:'EPOXY',   wall:'PAINT_WATER'};
    case 'TERRACE':  return {floor:'WOOD_TILE',wall:'PAINT_WATER'};
    case 'STAIRS':   return {floor:'TILE_PORC',wall:'PAINT_WATER'};
    case 'ENTRANCE': return {floor:'TILE_PORC',wall:'WP_SILK'};
    case 'POWDER':   return {floor:'TILE_PORC',wall:'WP_SILK'};
    case 'PANTRY':   return {floor:'STRONG',  wall:'WP_SILK'};
    case 'DRESSING': return {floor:'STRONG',  wall:'WP_SILK'};
    case 'CORRIDOR': return {floor:'STRONG',  wall:'WP_SILK'};
    case 'STUDY':    return {floor:'STRONG',  wall:'WP_SILK'};
    case 'DINING':   return {floor:'STRONG',  wall:'WP_SILK'};
    case 'VESTIBULE':return {floor:'TILE_PORC',wall:'WP_SILK'};
    default: return {floor:'STRONG',wall:'WP_SILK'}; // LIVING / ROOM 등
  }
}

const CATALOG={
  // 철거
  DEMOLITION:{cat:'철거',name:'철거',unit:'식',applies:'set',tag:'OPTIONAL',options:{NONE:'없음',PARTIAL:'부분 철거',FULL:'전체 철거'}},
  WASTE:{cat:'철거',name:'폐기물 처리',unit:'톤',applies:'set',tag:'OPTIONAL'},
  // 바닥
  FLOORING:{cat:'바닥',name:'바닥재',unit:'㎡',applies:'floor',tag:'REQUIRED',
    options:{STRONG:'강마루',WOOD:'원목마루',LVT:'데코타일(LVT)',JANG:'장판(PVC)',TILE:'바닥타일',MARBLE:'대리석'},
    spaces:['LIVING','ROOM','KITCHEN','BATHROOM','ENTRANCE','BALCONY','CORRIDOR','DRESSING']},
  BASEBOARD:{cat:'바닥',name:'걸레받이',unit:'m',applies:'perimeter',tag:'REQUIRED',
    options:{PVC:'PVC 걸레받이',WOOD:'원목 걸레받이',MOLDING:'몰딩 일체형'},
    spaces:['LIVING','ROOM','CORRIDOR','DRESSING']},
  // 벽
  WALLPAPER:{cat:'벽',name:'도배',unit:'㎡',applies:'wall',tag:'REQUIRED',
    options:{COMPOSITE:'합지',SILK:'실크',ECO:'친환경',DESIGN:'디자인 벽지'},
    spaces:['LIVING','ROOM','CORRIDOR','DRESSING']},
  WALL_PAINT:{cat:'벽',name:'벽 도장',unit:'㎡',applies:'wall',tag:'OPTIONAL',
    options:{WATER:'수성',ECO:'친환경',SPECIAL:'특수도장'},
    spaces:['LIVING','ROOM','CORRIDOR']},
  WALL_TILE_BATH:{cat:'벽',name:'욕실 벽 타일',unit:'㎡',applies:'wall',tag:'REQUIRED',
    options:{S300:'300×600',S600:'600×600',LARGE:'대형타일',MOSAIC:'모자이크'},
    spaces:['BATHROOM']},
  WALL_TILE_KITCHEN:{cat:'벽',name:'주방 벽 타일',unit:'㎡',applies:'partial',partialFactor:0.3,tag:'REQUIRED',
    options:{S300:'300×600',SUBWAY:'서브웨이',LARGE:'대형타일',MOSAIC:'모자이크'},
    spaces:['KITCHEN']},
  // 천장
  CEILING_PAINT:{cat:'천장',name:'천장 도장',unit:'㎡',applies:'ceiling',tag:'REQUIRED',
    options:{WATER:'수성',ECO:'친환경'},
    spaces:['LIVING','ROOM','KITCHEN','CORRIDOR','DRESSING','ENTRANCE']},
  CEILING_SMC:{cat:'천장',name:'천장 SMC',unit:'㎡',applies:'ceiling',tag:'REQUIRED',spaces:['BATHROOM']},
  MOLDING:{cat:'천장',name:'몰딩',unit:'m',applies:'perimeter',tag:'OPTIONAL',
    options:{NONE:'없음',SIMPLE:'심플 몰딩',CLASSIC:'클래식 몰딩',LED:'간접조명 몰딩'},
    spaces:['LIVING','ROOM','DRESSING']},
  // 방수
  WATERPROOF:{cat:'방수',name:'방수 시공',unit:'㎡',applies:'floor',tag:'CONDITIONAL',
    options:{NONE:'기존 방수 유지',TWO_LAYER:'2회 도포',THREE_LAYER:'3회 도포',SHEET:'시트 방수'},
    spaces:['BATHROOM','BALCONY']},
  // 주방
  KITCHEN_SINK:{cat:'주방',name:'싱크대',unit:'세트',applies:'set',tag:'REQUIRED',
    options:{LINEAR:'일자형(ㅡ)',L_TYPE:'ㄱ자형',U_TYPE:'ㄷ자형',ISLAND:'+ 아일랜드 추가'},
    spaces:['KITCHEN']},
  UPPER_CABINET:{cat:'주방',name:'상부장',unit:'m',applies:'partial',partialFactor:0.6,tag:'REQUIRED',
    options:{HIGH_GLOSS:'하이글로시',MATTE:'무광',WOOD:'원목',ECO:'친환경 PB'},
    spaces:['KITCHEN']},
  RANGE_HOOD:{cat:'주방',name:'조리 후드',unit:'개',applies:'set',tag:'REQUIRED',
    options:{STD:'기본형',SLIM:'슬림형',ISLAND:'아일랜드형'},
    spaces:['KITCHEN']},
  // 욕실
  BATH_FIXTURE:{cat:'욕실',name:'위생도기',unit:'세트',applies:'set',tag:'REQUIRED',
    options:{STD:'기본 (변기+세면대)',PREMIUM:'프리미엄',LUXURY:'럭셔리'},
    spaces:['BATHROOM']},
  SHOWER_TUB:{cat:'욕실',name:'샤워/욕조',unit:'세트',applies:'set',tag:'REQUIRED',
    options:{SHOWER:'샤워부스',TUB:'욕조',BOTH:'샤워+욕조 분리',BUILT_IN:'빌트인 욕조'},
    spaces:['BATHROOM']},
  BATH_FAN:{cat:'욕실',name:'환풍기',unit:'개',applies:'set',tag:'REQUIRED',
    options:{STD:'기본형',SILENT:'저소음형'},
    spaces:['BATHROOM']},
  // 창호 (자동 카운트)
  DOORS:{cat:'창호',name:'도어 교체',unit:'개',applies:'count_doors',tag:'OPTIONAL',
    options:{NONE:'유지',PARTIAL:'부분 교체',FULL:'전체 교체'}},
  WINDOWS:{cat:'창호',name:'창호 교체',unit:'개',applies:'count_windows',tag:'OPTIONAL',
    options:{NONE:'유지',SYSTEM:'시스템 창호',DOUBLE:'이중창',TRIPLE:'삼중창'}},
  // 전기
  LIGHTING_INSTALL:{cat:'전기',name:'조명 설치',unit:'개',applies:'count_lights',tag:'REQUIRED',
    options:{LED:'LED 일반',SMART:'스마트 조명',DIMMING:'디밍 조명'}},
  ELECTRIC_INSTALL:{cat:'전기',name:'콘센트/스위치',unit:'개',applies:'count_electric',tag:'REQUIRED',
    options:{STD:'기본형',USB:'USB 통합형',SMART:'스마트 스위치'}},
  // 가구
  SHOE_CABINET:{cat:'가구',name:'신발장',unit:'세트',applies:'set',tag:'REQUIRED',
    options:{STD:'기본형',TALL:'키 큰장',MIRROR:'거울장 통합'},
    spaces:['ENTRANCE']},
  WARDROBE_BUILT:{cat:'가구',name:'붙박이 옷장',unit:'m',applies:'partial',partialFactor:0.5,tag:'OPTIONAL',
    options:{STD:'기본',SLIDING:'슬라이딩 도어',WALK_IN:'워크인'},
    spaces:['ROOM','DRESSING']},
  HANGER_SYSTEM:{cat:'가구',name:'시스템 행거',unit:'세트',applies:'set',tag:'REQUIRED',
    spaces:['DRESSING']},
  // 기타
  BALCONY_EXT:{cat:'기타',name:'발코니 확장',unit:'식',applies:'set',tag:'OPTIONAL',
    options:{NONE:'유지',EXT:'확장 시공'},
    spaces:['BALCONY']},
};
const CAT_ORDER=['철거','바닥','벽','천장','방수','주방','욕실','창호','전기','가구','기타'];

// ===== 컬러 팔레트 =====
const COLOR_PALETTES=[
  {name:'모던 미니멀',primary:'#F5F1EB',secondary:'#5D4037',accent:'#C9A961'},
  {name:'스칸디나비아',primary:'#FFFFFF',secondary:'#D7CCC8',accent:'#8B7239'},
  {name:'재패니즈',primary:'#F5F5DC',secondary:'#5D4037',accent:'#2E7D32'},
  {name:'인더스트리얼',primary:'#3E3E3E',secondary:'#A8A8A8',accent:'#D4A05B'},
  {name:'클래식',primary:'#F5F1EB',secondary:'#8B7239',accent:'#5D4037'},
  {name:'한국 모던',primary:'#F5F1EB',secondary:'#5D4037',accent:'#7BA05B'},
];
