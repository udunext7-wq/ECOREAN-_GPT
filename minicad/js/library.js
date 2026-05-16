'use strict';
// ===== v5.5: 통합 라이브러리 — 평면도용 정교한 도형 (shape 필드로 볼륨감) =====
// shape 좌표계: 객체 중심 (0,0), 가로축 = +X, 세로축 = +Y. 단위 mm.
// shape 명령: rect/circle/line/arc/path. fill·stroke·strokeWidth로 볼륨감.
// v5.9: nameEn 필드 추가 — AI 파싱(T2I/T2V 프롬프트, JSON SSoT, BOC 카탈로그) 정확도 향상

const FURNITURE_LIB={
  // ===== 거실 =====
  sofa3:{name:'소파(3인)',nameEn:'3-seater sofa',w:2200,h:900,c:'#8B7239',shape:[
    {type:'rect',x:-1100,y:-450,w:2200,h:900,fill:'#8B7239',stroke:'#3E2A14',sw:30,r:80},
    {type:'rect',x:-1050,y:-200,w:2100,h:600,fill:'#A88248',stroke:'#5D4225',sw:15,r:50},
    {type:'line',x1:-367,y1:-200,x2:-367,y2:400,stroke:'#5D4225',sw:8},
    {type:'line',x1:367,y1:-200,x2:367,y2:400,stroke:'#5D4225',sw:8},
  ]},
  sofa2:{name:'소파(2인)',nameEn:'2-seater sofa (loveseat)',w:1500,h:900,c:'#8B7239',shape:[
    {type:'rect',x:-750,y:-450,w:1500,h:900,fill:'#8B7239',stroke:'#3E2A14',sw:30,r:80},
    {type:'rect',x:-700,y:-200,w:1400,h:600,fill:'#A88248',stroke:'#5D4225',sw:15,r:50},
    {type:'line',x1:0,y1:-200,x2:0,y2:400,stroke:'#5D4225',sw:8},
  ]},
  sofa1:{name:'1인 의자',nameEn:'armchair',w:800,h:900,c:'#8B7239',shape:[
    {type:'rect',x:-400,y:-450,w:800,h:900,fill:'#8B7239',stroke:'#3E2A14',sw:25,r:60},
    {type:'rect',x:-350,y:-200,w:700,h:600,fill:'#A88248',stroke:'#5D4225',sw:12,r:40},
  ]},
  coffee:{name:'거실 테이블',nameEn:'coffee table',w:1200,h:600,c:'#5D4037',shape:[
    {type:'rect',x:-600,y:-300,w:1200,h:600,fill:'#5D4037',stroke:'#2A1505',sw:18,r:30},
    {type:'rect',x:-580,y:-280,w:1160,h:560,fill:'transparent',stroke:'#8B6336',sw:3,r:25},
  ]},
  tv_stand:{name:'TV장',nameEn:'TV stand',w:1800,h:400,c:'#3E3E3E',shape:[
    {type:'rect',x:-900,y:-200,w:1800,h:400,fill:'#2A2A2A',stroke:'#5A5A5A',sw:15,r:8},
    {type:'rect',x:-880,y:-180,w:1760,h:80,fill:'#1A1A1A',stroke:'#0A0A0A',sw:2},
    {type:'line',x1:-300,y1:-100,x2:-300,y2:200,stroke:'#5A5A5A',sw:4},
    {type:'line',x1:300,y1:-100,x2:300,y2:200,stroke:'#5A5A5A',sw:4},
  ]},
  bookshelf:{name:'책장',nameEn:'bookshelf',w:1600,h:350,c:'#5D4037',shape:[
    {type:'rect',x:-800,y:-175,w:1600,h:350,fill:'#5D4037',stroke:'#2A1505',sw:15,r:5},
    {type:'line',x1:-800,y1:-50,x2:800,y2:-50,stroke:'#2A1505',sw:5},
    {type:'line',x1:-800,y1:80,x2:800,y2:80,stroke:'#2A1505',sw:5},
    {type:'line',x1:-400,y1:-175,x2:-400,y2:175,stroke:'#2A1505',sw:5},
    {type:'line',x1:0,y1:-175,x2:0,y2:175,stroke:'#2A1505',sw:5},
    {type:'line',x1:400,y1:-175,x2:400,y2:175,stroke:'#2A1505',sw:5},
  ]},
  piano:{name:'피아노 (업라이트)',nameEn:'upright piano',w:1500,h:600,c:'#1A1A1A',shape:[
    {type:'rect',x:-750,y:-300,w:1500,h:600,fill:'#1A1A1A',stroke:'#000',sw:18,r:8},
    {type:'rect',x:-700,y:120,w:1400,h:160,fill:'#F5F1EB',stroke:'#5A5A5A',sw:3},
    {type:'rect',x:-700,y:120,w:1400,h:30,fill:'#0A0A0A',stroke:'#000',sw:1},
  ]},
  rug:{name:'러그',nameEn:'area rug',w:2400,h:1800,c:'#A88248',shape:[
    {type:'rect',x:-1200,y:-900,w:2400,h:1800,fill:'#A88248',stroke:'#5D4225',sw:8,r:30},
    {type:'rect',x:-1150,y:-850,w:2300,h:1700,fill:'transparent',stroke:'#5D4225',sw:5,dash:[20,15]},
  ]},
  plant:{name:'화분',nameEn:'potted plant',w:500,h:500,c:'#7BA05B',shape:[
    {type:'circle',cx:0,cy:0,r:250,fill:'#5D4037',stroke:'#2A1505',sw:8},
    {type:'circle',cx:0,cy:0,r:200,fill:'#7BA05B',stroke:'#3D6034',sw:4},
    {type:'circle',cx:-80,cy:-50,r:60,fill:'#94B07A',stroke:'#3D6034',sw:2},
    {type:'circle',cx:60,cy:30,r:50,fill:'#94B07A',stroke:'#3D6034',sw:2},
    {type:'circle',cx:0,cy:80,r:55,fill:'#94B07A',stroke:'#3D6034',sw:2},
  ]},
  // ===== 침실 =====
  bed_d:{name:'더블 침대',nameEn:'double bed',w:1500,h:2000,c:'#5D4037',shape:[
    {type:'rect',x:-750,y:-1000,w:1500,h:2000,fill:'#F5F1EB',stroke:'#3E2A14',sw:30,r:30},
    {type:'rect',x:-750,y:-1000,w:1500,h:300,fill:'#5D4037',stroke:'#3E2A14',sw:20,r:15},
    {type:'rect',x:-650,y:-900,w:600,h:200,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'rect',x:50,y:-900,w:600,h:200,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'line',x1:-750,y1:300,x2:750,y2:300,stroke:'#A88248',sw:4,dash:[15,8]},
  ]},
  bed_s:{name:'싱글 침대',nameEn:'single bed',w:1000,h:2000,c:'#5D4037',shape:[
    {type:'rect',x:-500,y:-1000,w:1000,h:2000,fill:'#F5F1EB',stroke:'#3E2A14',sw:25,r:25},
    {type:'rect',x:-500,y:-1000,w:1000,h:300,fill:'#5D4037',stroke:'#3E2A14',sw:18,r:15},
    {type:'rect',x:-400,y:-900,w:800,h:200,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
  ]},
  bed_k:{name:'킹 침대',nameEn:'king bed',w:1800,h:2000,c:'#5D4037',shape:[
    {type:'rect',x:-900,y:-1000,w:1800,h:2000,fill:'#F5F1EB',stroke:'#3E2A14',sw:30,r:30},
    {type:'rect',x:-900,y:-1000,w:1800,h:300,fill:'#5D4037',stroke:'#3E2A14',sw:20,r:15},
    {type:'rect',x:-820,y:-900,w:700,h:220,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'rect',x:120,y:-900,w:700,h:220,fill:'#FFFFFF',stroke:'#A88248',sw:6,r:25},
    {type:'line',x1:-900,y1:300,x2:900,y2:300,stroke:'#A88248',sw:4,dash:[15,8]},
  ]},
  nightstand:{name:'협탁',nameEn:'nightstand',w:500,h:400,c:'#5D4037',shape:[
    {type:'rect',x:-250,y:-200,w:500,h:400,fill:'#5D4037',stroke:'#2A1505',sw:15,r:8},
    {type:'rect',x:-220,y:-100,w:440,h:80,fill:'transparent',stroke:'#A88248',sw:3,r:5},
    {type:'circle',cx:0,cy:-60,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  wardrobe:{name:'옷장',nameEn:'wardrobe',w:2000,h:600,c:'#5D4037',shape:[
    {type:'rect',x:-1000,y:-300,w:2000,h:600,fill:'#5D4037',stroke:'#2A1505',sw:20,r:5},
    {type:'line',x1:-500,y1:-300,x2:-500,y2:300,stroke:'#2A1505',sw:5},
    {type:'line',x1:0,y1:-300,x2:0,y2:300,stroke:'#2A1505',sw:5},
    {type:'line',x1:500,y1:-300,x2:500,y2:300,stroke:'#2A1505',sw:5},
    {type:'circle',cx:-750,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:-250,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:250,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:750,cy:0,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  dressing_table:{name:'화장대',nameEn:'dressing table (vanity)',w:1200,h:500,c:'#5D4037',shape:[
    {type:'rect',x:-600,y:-250,w:1200,h:500,fill:'#5D4037',stroke:'#2A1505',sw:18,r:5},
    {type:'rect',x:-550,y:-220,w:1100,h:200,fill:'#A88248',stroke:'#5D4037',sw:5,r:5},
    {type:'circle',cx:-300,cy:100,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
    {type:'circle',cx:300,cy:100,r:18,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  mirror:{name:'전신거울',nameEn:'full-length mirror',w:600,h:150,c:'#A0C8E0',shape:[
    {type:'rect',x:-300,y:-75,w:600,h:150,fill:'#A0C8E0',stroke:'#5D4037',sw:18,r:8},
    {type:'rect',x:-280,y:-55,w:560,h:110,fill:'#D4ECF5',stroke:'#A0C8E0',sw:3,r:4},
  ]},
  // ===== 서재 =====
  desk:{name:'책상',nameEn:'desk',w:1400,h:700,c:'#5D4037',shape:[
    {type:'rect',x:-700,y:-350,w:1400,h:700,fill:'#5D4037',stroke:'#2A1505',sw:18,r:8},
    {type:'rect',x:-680,y:-330,w:1360,h:200,fill:'transparent',stroke:'#A88248',sw:3,r:5},
  ]},
  desk_l:{name:'L자 책상',nameEn:'L-shaped desk',w:1800,h:1500,c:'#5D4037',shape:[
    {type:'rect',x:-900,y:-750,w:1800,h:600,fill:'#5D4037',stroke:'#2A1505',sw:18,r:8},
    {type:'rect',x:-900,y:-150,w:600,h:900,fill:'#5D4037',stroke:'#2A1505',sw:18,r:8},
  ]},
  office_chair:{name:'사무 의자',nameEn:'office chair',w:600,h:600,c:'#3E3E3E',shape:[
    {type:'circle',cx:0,cy:0,r:280,fill:'#3E3E3E',stroke:'#1A1A1A',sw:15},
    {type:'circle',cx:0,cy:0,r:230,fill:'#5A5A5A',stroke:'#3E3E3E',sw:5},
    {type:'rect',x:-180,y:-300,w:360,h:80,fill:'#5A5A5A',stroke:'#1A1A1A',sw:8,r:15},
  ]},
  // ===== 식당 =====
  dining4:{name:'식탁(4인)',nameEn:'4-person dining table',w:1400,h:900,c:'#5D4037',shape:[
    {type:'rect',x:-700,y:-450,w:1400,h:900,fill:'#5D4037',stroke:'#2A1505',sw:25,r:15},
    {type:'rect',x:-680,y:-430,w:1360,h:860,fill:'transparent',stroke:'#A88248',sw:3,r:12},
  ]},
  dining6:{name:'식탁(6인)',nameEn:'6-person dining table',w:1800,h:900,c:'#5D4037',shape:[
    {type:'rect',x:-900,y:-450,w:1800,h:900,fill:'#5D4037',stroke:'#2A1505',sw:25,r:15},
    {type:'rect',x:-880,y:-430,w:1760,h:860,fill:'transparent',stroke:'#A88248',sw:3,r:12},
  ]},
  dining_round:{name:'원형 식탁',nameEn:'round dining table',w:1300,h:1300,c:'#5D4037',shape:[
    {type:'circle',cx:0,cy:0,r:650,fill:'#5D4037',stroke:'#2A1505',sw:25},
    {type:'circle',cx:0,cy:0,r:625,fill:'transparent',stroke:'#A88248',sw:3},
  ]},
  chair:{name:'의자',nameEn:'dining chair',w:450,h:450,c:'#5D4037',shape:[
    {type:'rect',x:-225,y:-225,w:450,h:450,fill:'#5D4037',stroke:'#2A1505',sw:15,r:8},
    {type:'rect',x:-225,y:-225,w:450,h:80,fill:'#3E2A14',stroke:'#1A1A1A',sw:5,r:5},
  ]},
  bar_stool:{name:'바 스툴',nameEn:'bar stool',w:450,h:450,c:'#5D4037',shape:[
    {type:'circle',cx:0,cy:0,r:200,fill:'#5D4037',stroke:'#2A1505',sw:15},
    {type:'circle',cx:0,cy:0,r:160,fill:'transparent',stroke:'#A88248',sw:3},
  ]},
  // ===== 기타 =====
  treadmill:{name:'러닝머신',nameEn:'treadmill',w:900,h:1900,c:'#3E3E3E',shape:[
    {type:'rect',x:-450,y:-950,w:900,h:1900,fill:'#3E3E3E',stroke:'#1A1A1A',sw:18,r:30},
    {type:'rect',x:-380,y:-300,w:760,h:1100,fill:'#1A1A1A',stroke:'#000',sw:3,r:8},
    {type:'rect',x:-380,y:-870,w:760,h:200,fill:'#5A5A5A',stroke:'#1A1A1A',sw:5,r:8},
  ]},
};

const FIXTURE_LIB={
  // ===== 욕실 =====
  toilet:{name:'양변기',nameEn:'toilet',w:400,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-200,y:-350,w:400,h:250,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:15},
    {type:'rect',x:-180,y:-330,w:360,h:210,fill:'transparent',stroke:'#5A5A5A',sw:3,r:10},
    {type:'circle',cx:0,cy:120,r:200,fill:'#FFFFFF',stroke:'#A8A8A8',sw:8},
    {type:'circle',cx:0,cy:120,r:170,fill:'transparent',stroke:'#5A5A5A',sw:3},
  ]},
  toilet_round:{name:'원형변기',nameEn:'round-bowl toilet',w:400,h:600,c:'#FFFFFF',shape:[
    {type:'rect',x:-180,y:-300,w:360,h:200,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:15},
    {type:'circle',cx:0,cy:80,r:200,fill:'#FFFFFF',stroke:'#A8A8A8',sw:8},
  ]},
  bidet:{name:'비데',nameEn:'bidet',w:400,h:550,c:'#FFFFFF',shape:[
    {type:'rect',x:-200,y:-275,w:400,h:550,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:25},
    {type:'rect',x:-150,y:-200,w:300,h:80,fill:'#3E3E3E',stroke:'#1A1A1A',sw:4,r:8},
  ]},
  sink_b:{name:'세면대',nameEn:'bathroom sink (basin)',w:600,h:450,c:'#FFFFFF',shape:[
    {type:'rect',x:-300,y:-225,w:600,h:450,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:25},
    {type:'circle',cx:0,cy:30,r:170,fill:'#FFFFFF',stroke:'#A8A8A8',sw:5},
    {type:'circle',cx:0,cy:30,r:30,fill:'#5A5A5A',stroke:'#3E3E3E',sw:3},
    {type:'rect',x:-15,y:-180,w:30,h:80,fill:'#A8A8A8',stroke:'#5A5A5A',sw:3,r:5},
  ]},
  sink_b_oval:{name:'세면대(타원)',nameEn:'oval bathroom basin',w:700,h:500,c:'#FFFFFF',shape:[
    {type:'rect',x:-350,y:-250,w:700,h:500,fill:'#F5F5F5',stroke:'#A8A8A8',sw:8,r:30},
    {type:'circle',cx:0,cy:50,r:200,fill:'#FFFFFF',stroke:'#A8A8A8',sw:5},
  ]},
  bathtub:{name:'욕조',nameEn:'bathtub',w:1700,h:750,c:'#F0F0F0',shape:[
    {type:'rect',x:-850,y:-375,w:1700,h:750,fill:'#F5F5F5',stroke:'#A8A8A8',sw:12,r:60},
    {type:'rect',x:-780,y:-310,w:1560,h:620,fill:'#E8F0F5',stroke:'#5BA0D4',sw:8,r:50},
    {type:'circle',cx:-700,cy:0,r:18,fill:'#5A5A5A',stroke:'#3E3E3E',sw:3},
  ]},
  bathtub_corner:{name:'코너 욕조',nameEn:'corner bathtub',w:1500,h:1500,c:'#F0F0F0',shape:[
    {type:'arc',cx:-750,cy:-750,r:1500,start:0,end:90,fill:'#F5F5F5',stroke:'#A8A8A8',sw:12},
    {type:'arc',cx:-750,cy:-750,r:1380,start:0,end:90,fill:'#E8F0F5',stroke:'#5BA0D4',sw:8},
  ]},
  shower:{name:'샤워부스',nameEn:'shower stall',w:900,h:900,c:'#5BA0D4',shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#D4ECF5',stroke:'#5BA0D4',sw:12,r:8},
    {type:'rect',x:-430,y:-430,w:860,h:860,fill:'transparent',stroke:'#5BA0D4',sw:3,dash:[15,8],r:5},
    {type:'circle',cx:0,cy:0,r:30,fill:'#A8A8A8',stroke:'#5A5A5A',sw:3},
  ]},
  shower_corner:{name:'코너 샤워',nameEn:'corner shower',w:900,h:900,c:'#5BA0D4',shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#D4ECF5',stroke:'#5BA0D4',sw:12,r:8},
    {type:'arc',cx:-450,cy:-450,r:850,start:0,end:90,fill:'transparent',stroke:'#5BA0D4',sw:5,dash:[10,5]},
  ]},
  // ===== 주방 =====
  sink_k:{name:'싱크대',nameEn:'kitchen sink',w:800,h:600,c:'#A8A8A8',shape:[
    {type:'rect',x:-400,y:-300,w:800,h:600,fill:'#A8A8A8',stroke:'#5A5A5A',sw:10,r:10},
    {type:'rect',x:-350,y:-250,w:700,h:500,fill:'#3E3E3E',stroke:'#1A1A1A',sw:5,r:8},
    {type:'rect',x:-330,y:-230,w:660,h:460,fill:'transparent',stroke:'#5A5A5A',sw:3,r:5},
    {type:'circle',cx:0,cy:0,r:25,fill:'#1A1A1A'},
  ]},
  sink_k_double:{name:'싱크대 2조',nameEn:'double-bowl kitchen sink',w:1200,h:600,c:'#A8A8A8',shape:[
    {type:'rect',x:-600,y:-300,w:1200,h:600,fill:'#A8A8A8',stroke:'#5A5A5A',sw:10,r:10},
    {type:'rect',x:-560,y:-250,w:520,h:500,fill:'#3E3E3E',stroke:'#1A1A1A',sw:5,r:8},
    {type:'rect',x:40,y:-250,w:520,h:500,fill:'#3E3E3E',stroke:'#1A1A1A',sw:5,r:8},
    {type:'circle',cx:-300,cy:0,r:25,fill:'#1A1A1A'},
    {type:'circle',cx:300,cy:0,r:25,fill:'#1A1A1A'},
  ]},
  stove:{name:'가스레인지',nameEn:'gas stove (gas range)',w:600,h:600,c:'#3E3E3E',shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#1A1A1A',stroke:'#5A5A5A',sw:10,r:8},
    {type:'circle',cx:-150,cy:-150,r:80,fill:'transparent',stroke:'#A8A8A8',sw:6},
    {type:'circle',cx:-150,cy:-150,r:25,fill:'#5A5A5A',stroke:'#A8A8A8',sw:3},
    {type:'circle',cx:150,cy:-150,r:80,fill:'transparent',stroke:'#A8A8A8',sw:6},
    {type:'circle',cx:150,cy:-150,r:25,fill:'#5A5A5A',stroke:'#A8A8A8',sw:3},
    {type:'circle',cx:-150,cy:150,r:80,fill:'transparent',stroke:'#A8A8A8',sw:6},
    {type:'circle',cx:-150,cy:150,r:25,fill:'#5A5A5A',stroke:'#A8A8A8',sw:3},
    {type:'circle',cx:150,cy:150,r:80,fill:'transparent',stroke:'#A8A8A8',sw:6},
    {type:'circle',cx:150,cy:150,r:25,fill:'#5A5A5A',stroke:'#A8A8A8',sw:3},
  ]},
  induction:{name:'인덕션',nameEn:'induction cooktop',w:600,h:520,c:'#1A1A1A',shape:[
    {type:'rect',x:-300,y:-260,w:600,h:520,fill:'#1A1A1A',stroke:'#3E3E3E',sw:10,r:5},
    {type:'circle',cx:-150,cy:-130,r:70,fill:'transparent',stroke:'#5BA0D4',sw:4},
    {type:'circle',cx:150,cy:-130,r:70,fill:'transparent',stroke:'#5BA0D4',sw:4},
    {type:'circle',cx:-150,cy:130,r:70,fill:'transparent',stroke:'#5BA0D4',sw:4},
    {type:'circle',cx:150,cy:130,r:70,fill:'transparent',stroke:'#5BA0D4',sw:4},
  ]},
  oven:{name:'오븐',nameEn:'oven',w:600,h:550,c:'#3E3E3E',shape:[
    {type:'rect',x:-300,y:-275,w:600,h:550,fill:'#3E3E3E',stroke:'#1A1A1A',sw:12,r:8},
    {type:'rect',x:-260,y:-235,w:520,h:380,fill:'#1A1A1A',stroke:'#5A5A5A',sw:5,r:5},
    {type:'rect',x:-260,y:170,w:520,h:60,fill:'#5A5A5A',stroke:'#1A1A1A',sw:3,r:3},
    {type:'circle',cx:-200,cy:200,r:12,fill:'#A8A8A8'},
    {type:'circle',cx:-130,cy:200,r:12,fill:'#A8A8A8'},
    {type:'circle',cx:130,cy:200,r:12,fill:'#A8A8A8'},
    {type:'circle',cx:200,cy:200,r:12,fill:'#A8A8A8'},
  ]},
  microwave:{name:'전자레인지',nameEn:'microwave oven',w:550,h:400,c:'#3E3E3E',shape:[
    {type:'rect',x:-275,y:-200,w:550,h:400,fill:'#3E3E3E',stroke:'#1A1A1A',sw:10,r:5},
    {type:'rect',x:-240,y:-170,w:380,h:340,fill:'#1A1A1A',stroke:'#5A5A5A',sw:4,r:5},
    {type:'rect',x:160,y:-170,w:80,h:340,fill:'#2A2A2A',stroke:'#5A5A5A',sw:3,r:3},
  ]},
  fridge:{name:'냉장고',nameEn:'refrigerator',w:800,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-400,y:-350,w:800,h:700,fill:'#F5F1EB',stroke:'#A8A8A8',sw:18,r:10},
    {type:'line',x1:-400,y1:-50,x2:400,y2:-50,stroke:'#A8A8A8',sw:5},
    {type:'rect',x:-380,y:-330,w:760,h:260,fill:'transparent',stroke:'#5A5A5A',sw:2,r:5},
    {type:'rect',x:-380,y:-30,w:760,h:360,fill:'transparent',stroke:'#5A5A5A',sw:2,r:5},
    {type:'rect',x:330,y:-280,w:30,h:160,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
    {type:'rect',x:330,y:50,w:30,h:240,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
  ]},
  fridge_2door:{name:'냉장고 양문',nameEn:'side-by-side refrigerator',w:1100,h:750,c:'#FFFFFF',shape:[
    {type:'rect',x:-550,y:-375,w:1100,h:750,fill:'#F5F1EB',stroke:'#A8A8A8',sw:18,r:10},
    {type:'line',x1:0,y1:-375,x2:0,y2:375,stroke:'#A8A8A8',sw:5},
    {type:'rect',x:-30,y:-300,w:30,h:200,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
    {type:'rect',x:0,y:-300,w:30,h:200,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:5},
  ]},
  dishwasher:{name:'식기세척기',nameEn:'dishwasher',w:600,h:600,c:'#A8A8A8',shape:[
    {type:'rect',x:-300,y:-300,w:600,h:600,fill:'#A8A8A8',stroke:'#5A5A5A',sw:12,r:5},
    {type:'rect',x:-260,y:-260,w:520,h:520,fill:'transparent',stroke:'#5A5A5A',sw:3,r:5},
    {type:'rect',x:-180,y:-280,w:360,h:30,fill:'#5A5A5A',stroke:'#3E3E3E',sw:2,r:3},
  ]},
  // ===== 세탁/유틸리티 =====
  washer:{name:'세탁기',nameEn:'washing machine',w:700,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-350,y:-350,w:700,h:700,fill:'#F5F1EB',stroke:'#A8A8A8',sw:15,r:8},
    {type:'circle',cx:0,cy:30,r:240,fill:'#3E3E3E',stroke:'#5A5A5A',sw:8},
    {type:'circle',cx:0,cy:30,r:200,fill:'#1A1A1A',stroke:'#5A5A5A',sw:3},
    {type:'rect',x:-300,y:-330,w:600,h:80,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:5},
    {type:'circle',cx:240,cy:-290,r:15,fill:'#5BA0D4'},
  ]},
  dryer:{name:'건조기',nameEn:'clothes dryer',w:700,h:700,c:'#FFFFFF',shape:[
    {type:'rect',x:-350,y:-350,w:700,h:700,fill:'#F5F1EB',stroke:'#A8A8A8',sw:15,r:8},
    {type:'circle',cx:0,cy:30,r:240,fill:'#5A5A5A',stroke:'#3E3E3E',sw:8},
    {type:'rect',x:-300,y:-330,w:600,h:80,fill:'#5A5A5A',stroke:'#1A1A1A',sw:3,r:5},
  ]},
};

const LIGHT_LIB={
  ceiling:{name:'천장 조명',nameEn:'ceiling light',size:400,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:200,fill:'#D4B872',stroke:'#A88248',sw:8},
    {type:'circle',cx:0,cy:0,r:160,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
  ]},
  downlight:{name:'다운라이트',nameEn:'recessed downlight',size:150,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:75,fill:'#D4B872',stroke:'#A88248',sw:5},
    {type:'circle',cx:0,cy:0,r:55,fill:'#F5E5B8',stroke:'#D4B872',sw:2},
  ]},
  pendant:{name:'펜던트',nameEn:'pendant light',size:300,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:150,fill:'#D4B872',stroke:'#A88248',sw:8},
    {type:'circle',cx:0,cy:0,r:120,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:0,r:25,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2},
  ]},
  chandelier:{name:'샹들리에',nameEn:'chandelier',size:600,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:300,fill:'transparent',stroke:'#D4B872',sw:5},
    {type:'circle',cx:-200,cy:0,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:200,cy:0,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:-200,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:200,r:50,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:-141,cy:-141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:141,cy:-141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:-141,cy:141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:141,cy:141,r:45,fill:'#F5E5B8',stroke:'#D4B872',sw:3},
    {type:'circle',cx:0,cy:0,r:30,fill:'#A88248',stroke:'#5D4037',sw:2},
  ]},
  wall_lamp:{name:'벽등',nameEn:'wall sconce',size:200,c:'#D4B872',shape:[
    {type:'rect',x:-100,y:-50,w:200,h:100,fill:'#D4B872',stroke:'#A88248',sw:5,r:10},
    {type:'rect',x:-80,y:-30,w:160,h:60,fill:'#F5E5B8',stroke:'#D4B872',sw:2,r:5},
  ]},
  floor_lamp:{name:'스탠드',nameEn:'floor lamp',size:400,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:200,fill:'#D4B872',stroke:'#A88248',sw:6},
    {type:'circle',cx:0,cy:0,r:30,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3},
  ]},
  track:{name:'트랙라이트',nameEn:'track light',size:300,c:'#D4B872',shape:[
    {type:'rect',x:-150,y:-25,w:300,h:50,fill:'#5A5A5A',stroke:'#1A1A1A',sw:5,r:5},
    {type:'circle',cx:-100,cy:0,r:18,fill:'#D4B872',stroke:'#A88248',sw:2},
    {type:'circle',cx:0,cy:0,r:18,fill:'#D4B872',stroke:'#A88248',sw:2},
    {type:'circle',cx:100,cy:0,r:18,fill:'#D4B872',stroke:'#A88248',sw:2},
  ]},
  fluorescent:{name:'형광등',nameEn:'fluorescent light fixture',size:1200,c:'#D4B872',shape:[
    {type:'rect',x:-600,y:-50,w:1200,h:100,fill:'#F5E5B8',stroke:'#D4B872',sw:5,r:5},
    {type:'rect',x:-580,y:-30,w:1160,h:60,fill:'#FFF8E0',stroke:'#F5E5B8',sw:2,r:3},
  ]},
};

const ELECTRIC_LIB={
  outlet_w:{name:'벽 콘센트(2구)',nameEn:'wall outlet (2-gang)',size:200,c:'#7BA05B',sym:'⚡',shape:[
    {type:'rect',x:-100,y:-60,w:200,h:120,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'circle',cx:-40,cy:0,r:18,fill:'#3E3E3E'},
    {type:'circle',cx:40,cy:0,r:18,fill:'#3E3E3E'},
  ]},
  outlet_w4:{name:'벽 콘센트(4구)',nameEn:'wall outlet (4-gang)',size:300,c:'#7BA05B',sym:'⚡',shape:[
    {type:'rect',x:-150,y:-60,w:300,h:120,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'circle',cx:-90,cy:0,r:15,fill:'#3E3E3E'},
    {type:'circle',cx:-30,cy:0,r:15,fill:'#3E3E3E'},
    {type:'circle',cx:30,cy:0,r:15,fill:'#3E3E3E'},
    {type:'circle',cx:90,cy:0,r:15,fill:'#3E3E3E'},
  ]},
  outlet_f:{name:'바닥 콘센트',nameEn:'floor outlet',size:200,c:'#7BA05B',sym:'◉',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5},
    {type:'circle',cx:0,cy:0,r:40,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3},
  ]},
  switch_1:{name:'스위치(1구)',nameEn:'light switch (1-gang)',size:150,c:'#7BA05B',sym:'◇',shape:[
    {type:'rect',x:-50,y:-75,w:100,h:150,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'rect',x:-30,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
  ]},
  switch_2:{name:'스위치(2구)',nameEn:'light switch (2-gang)',size:200,c:'#7BA05B',sym:'◇',shape:[
    {type:'rect',x:-100,y:-75,w:200,h:150,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'rect',x:-80,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
    {type:'rect',x:20,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
  ]},
  switch_3:{name:'스위치(3구)',nameEn:'light switch (3-gang)',size:280,c:'#7BA05B',sym:'◇',shape:[
    {type:'rect',x:-140,y:-75,w:280,h:150,fill:'#FFFFFF',stroke:'#5A5A5A',sw:5,r:5},
    {type:'rect',x:-120,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
    {type:'rect',x:-30,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
    {type:'rect',x:60,y:-30,w:60,h:60,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2,r:3},
  ]},
  internet:{name:'인터넷/TV',nameEn:'internet/TV jack',size:200,c:'#5B8DA0',sym:'📡',shape:[
    {type:'rect',x:-80,y:-80,w:160,h:160,fill:'#D4ECF5',stroke:'#5B8DA0',sw:5,r:8},
    {type:'rect',x:-50,y:-50,w:100,h:30,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2,r:3},
    {type:'rect',x:-50,y:20,w:100,h:30,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2,r:3},
  ]},
  ac:{name:'에어컨',nameEn:'wall-mounted air conditioner',size:800,c:'#5B8DA0',sym:'❄',shape:[
    {type:'rect',x:-400,y:-150,w:800,h:300,fill:'#F5F1EB',stroke:'#5B8DA0',sw:10,r:30},
    {type:'rect',x:-380,y:-130,w:760,h:60,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:8},
    {type:'rect',x:-380,y:-50,w:760,h:160,fill:'transparent',stroke:'#A8A8A8',sw:2,dash:[10,5]},
  ]},
  ac_floor:{name:'스탠드 에어컨',nameEn:'floor-standing air conditioner',size:500,c:'#5B8DA0',sym:'❄',shape:[
    {type:'rect',x:-250,y:-200,w:500,h:400,fill:'#F5F1EB',stroke:'#5B8DA0',sw:12,r:25},
    {type:'rect',x:-220,y:-170,w:440,h:60,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:8},
    {type:'rect',x:-220,y:-90,w:440,h:260,fill:'transparent',stroke:'#A8A8A8',sw:2,dash:[10,5]},
  ]},
  intercom:{name:'인터폰',nameEn:'video intercom',size:200,c:'#7BA05B',sym:'📞',shape:[
    {type:'rect',x:-90,y:-100,w:180,h:200,fill:'#F5F1EB',stroke:'#5A5A5A',sw:5,r:8},
    {type:'rect',x:-70,y:-80,w:140,h:80,fill:'#3E3E3E',stroke:'#1A1A1A',sw:2,r:3},
    {type:'circle',cx:0,cy:50,r:18,fill:'#A8A8A8',stroke:'#5A5A5A',sw:2},
  ]},
  boiler_ctrl:{name:'보일러 조작기',nameEn:'boiler controller (thermostat)',size:200,c:'#C96A4A',sym:'🔥',shape:[
    {type:'rect',x:-90,y:-60,w:180,h:120,fill:'#F5F1EB',stroke:'#C96A4A',sw:5,r:8},
    {type:'rect',x:-70,y:-40,w:140,h:50,fill:'#1A1A1A',stroke:'#5A5A5A',sw:2,r:3},
    {type:'circle',cx:-40,cy:30,r:10,fill:'#C96A4A'},
    {type:'circle',cx:0,cy:30,r:10,fill:'#A8A8A8'},
    {type:'circle',cx:40,cy:30,r:10,fill:'#A8A8A8'},
  ]},
};

// v5.6: 공조/소방 라이브러리 (HVAC + Fire) — 한국 평면도 표준 심볼
const HVAC_FIRE_LIB={
  // ===== 공조 (HVAC) =====
  ac_ceiling:{name:'시스템 에어컨',nameEn:'ceiling-mounted system AC',size:900,c:'#5B8DA0',shape:[
    {type:'rect',x:-450,y:-450,w:900,h:900,fill:'#F5F1EB',stroke:'#5B8DA0',sw:15,r:10},
    {type:'rect',x:-380,y:-380,w:760,h:760,fill:'transparent',stroke:'#5B8DA0',sw:5,r:5},
    {type:'line',x1:-380,y1:0,x2:380,y2:0,stroke:'#5B8DA0',sw:5,dash:[20,10]},
    {type:'line',x1:0,y1:-380,x2:0,y2:380,stroke:'#5B8DA0',sw:5,dash:[20,10]},
  ]},
  diffuser:{name:'환기 디퓨저',nameEn:'ventilation diffuser',size:300,c:'#5B8DA0',shape:[
    {type:'rect',x:-150,y:-150,w:300,h:300,fill:'#F5F1EB',stroke:'#5B8DA0',sw:8,r:5},
    {type:'circle',cx:0,cy:0,r:100,fill:'transparent',stroke:'#5B8DA0',sw:5},
    {type:'line',x1:-100,y1:0,x2:100,y2:0,stroke:'#5B8DA0',sw:4},
    {type:'line',x1:0,y1:-100,x2:0,y2:100,stroke:'#5B8DA0',sw:4},
  ]},
  vent_fan:{name:'환기팬',nameEn:'ventilation fan',size:300,c:'#5B8DA0',shape:[
    {type:'rect',x:-150,y:-150,w:300,h:300,fill:'#F5F1EB',stroke:'#5B8DA0',sw:8,r:5},
    {type:'circle',cx:0,cy:0,r:120,fill:'transparent',stroke:'#5B8DA0',sw:5},
    {type:'line',x1:-90,y1:-50,x2:90,y2:50,stroke:'#5B8DA0',sw:6},
    {type:'line',x1:-50,y1:90,x2:50,y2:-90,stroke:'#5B8DA0',sw:6},
    {type:'line',x1:90,y1:-50,x2:-50,y2:90,stroke:'#5B8DA0',sw:6},
  ]},
  hood:{name:'레인지 후드',nameEn:'range hood',size:900,c:'#5A5A5A',shape:[
    {type:'rect',x:-450,y:-200,w:900,h:400,fill:'#5A5A5A',stroke:'#1A1A1A',sw:12,r:5},
    {type:'rect',x:-400,y:-150,w:800,h:50,fill:'#3E3E3E',stroke:'#1A1A1A',sw:3,r:3},
    {type:'rect',x:-300,y:-50,w:600,h:200,fill:'#A8A8A8',stroke:'#5A5A5A',sw:3,r:5},
  ]},
  hvac_grille:{name:'공조 그릴',nameEn:'HVAC grille',size:400,c:'#5B8DA0',shape:[
    {type:'rect',x:-200,y:-100,w:400,h:200,fill:'#F5F1EB',stroke:'#5B8DA0',sw:8,r:5},
    {type:'line',x1:-180,y1:-60,x2:180,y2:-60,stroke:'#5B8DA0',sw:3},
    {type:'line',x1:-180,y1:-20,x2:180,y2:-20,stroke:'#5B8DA0',sw:3},
    {type:'line',x1:-180,y1:20,x2:180,y2:20,stroke:'#5B8DA0',sw:3},
    {type:'line',x1:-180,y1:60,x2:180,y2:60,stroke:'#5B8DA0',sw:3},
  ]},
  // ===== 소방 (Fire) =====
  sprinkler:{name:'스프링클러(펜던트)',nameEn:'pendant fire sprinkler',size:200,c:'#E2725B',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#E2725B',sw:8},
    {type:'circle',cx:0,cy:0,r:30,fill:'#E2725B',stroke:'#A04830',sw:3},
    {type:'line',x1:-80,y1:0,x2:80,y2:0,stroke:'#E2725B',sw:5},
    {type:'line',x1:0,y1:-80,x2:0,y2:80,stroke:'#E2725B',sw:5},
  ]},
  sprinkler_side:{name:'스프링클러(사이드월)',nameEn:'sidewall fire sprinkler',size:200,c:'#E2725B',shape:[
    {type:'rect',x:-60,y:-30,w:120,h:60,fill:'#FFFFFF',stroke:'#E2725B',sw:6,r:8},
    {type:'circle',cx:60,cy:0,r:25,fill:'#E2725B',stroke:'#A04830',sw:3},
    {type:'line',x1:-50,y1:-20,x2:-50,y2:20,stroke:'#E2725B',sw:4},
  ]},
  smoke_detector:{name:'연기 감지기',nameEn:'smoke detector',size:200,c:'#D4B872',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#D4B872',sw:8},
    {type:'circle',cx:0,cy:0,r:50,fill:'transparent',stroke:'#D4B872',sw:4},
    {type:'text',x:-30,y:-25,text:'S',fontSize:50,fill:'#D4B872'},
  ]},
  heat_detector:{name:'열 감지기',nameEn:'heat detector',size:200,c:'#C96A4A',shape:[
    {type:'circle',cx:0,cy:0,r:80,fill:'#FFFFFF',stroke:'#C96A4A',sw:8},
    {type:'circle',cx:0,cy:0,r:50,fill:'transparent',stroke:'#C96A4A',sw:4},
    {type:'text',x:-30,y:-25,text:'H',fontSize:50,fill:'#C96A4A'},
  ]},
  emerg_light:{name:'비상 조명',nameEn:'emergency light',size:200,c:'#7BA05B',shape:[
    {type:'rect',x:-90,y:-50,w:180,h:100,fill:'#7BA05B',stroke:'#3D6034',sw:8,r:8},
    {type:'rect',x:-70,y:-30,w:140,h:60,fill:'#FFFFFF',stroke:'#7BA05B',sw:3,r:5},
    {type:'text',x:-15,y:-25,text:'E',fontSize:40,fill:'#7BA05B'},
  ]},
  exit_sign:{name:'비상 대피등',nameEn:'exit sign',size:300,c:'#7BA05B',shape:[
    {type:'rect',x:-150,y:-50,w:300,h:100,fill:'#7BA05B',stroke:'#3D6034',sw:8,r:8},
    {type:'rect',x:-130,y:-30,w:260,h:60,fill:'#FFFFFF',stroke:'#7BA05B',sw:3,r:5},
    {type:'text',x:-50,y:-25,text:'EXIT',fontSize:30,fill:'#7BA05B'},
  ]},
  fire_ext:{name:'소화기',nameEn:'fire extinguisher',size:250,c:'#C96A4A',shape:[
    {type:'rect',x:-60,y:-125,w:120,h:250,fill:'#C96A4A',stroke:'#7A3825',sw:8,r:15},
    {type:'rect',x:-40,y:-105,w:80,h:30,fill:'#1A1A1A',stroke:'#000',sw:3,r:5},
    {type:'rect',x:-50,y:-50,w:100,h:80,fill:'#FFFFFF',stroke:'#C96A4A',sw:3,r:3},
    {type:'text',x:-15,y:-30,text:'F',fontSize:50,fill:'#C96A4A'},
  ]},
  hydrant:{name:'옥내 소화전',nameEn:'indoor fire hydrant',size:500,c:'#C96A4A',shape:[
    {type:'rect',x:-200,y:-250,w:400,h:500,fill:'#C96A4A',stroke:'#7A3825',sw:12,r:8},
    {type:'rect',x:-160,y:-210,w:320,h:420,fill:'#FFFFFF',stroke:'#C96A4A',sw:5,r:5},
    {type:'text',x:-100,y:-50,text:'消防',fontSize:60,fill:'#C96A4A'},
  ]},
  emerg_bell:{name:'비상벨',nameEn:'emergency alarm bell',size:200,c:'#C96A4A',shape:[
    {type:'circle',cx:0,cy:0,r:90,fill:'#C96A4A',stroke:'#7A3825',sw:8},
    {type:'circle',cx:0,cy:0,r:55,fill:'#FFFFFF',stroke:'#C96A4A',sw:4},
    {type:'text',x:-25,y:-30,text:'B',fontSize:50,fill:'#C96A4A'},
  ]},
  auto_ext:{name:'자동확산소화기',nameEn:'automatic fire suppressor',size:300,c:'#C96A4A',shape:[
    {type:'circle',cx:0,cy:0,r:130,fill:'#C96A4A',stroke:'#7A3825',sw:10},
    {type:'circle',cx:0,cy:0,r:100,fill:'#FFFFFF',stroke:'#C96A4A',sw:5},
    {type:'circle',cx:0,cy:0,r:30,fill:'#C96A4A',stroke:'#7A3825',sw:3},
    {type:'line',x1:-100,y1:0,x2:100,y2:0,stroke:'#C96A4A',sw:5},
    {type:'line',x1:0,y1:-100,x2:0,y2:100,stroke:'#C96A4A',sw:5},
  ]},
};
