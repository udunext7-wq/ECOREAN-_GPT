# HANDOVER v5.8 — ECOREAN MiniCAD

## 현재 상태

| 항목 | 값 |
|---|---|
| 파일 | `ecorean_minicad_v5_8.html` |
| 줄수 | **4,939줄** |
| 크기 | **251,144 bytes (≈ 245 KB)** |
| 작성일 | 2026-05-01 |
| JS 문법 | ✅ `node --check` 통과 (추출 후 검사) |

v5.6 기준 라인 증감: v5.7 **+563줄**, v5.8 **+214줄** (킥오프 기준)

---

## 변경 사항 (v5.7 → v5.8, +214줄)

### 신규 함수

| 함수 | 줄 | 의도 |
|---|---|---|
| `defaultMaterials(spaceType)` | 1022 | 공간 타입별 기본 바닥재·벽자재 반환 (FLOOR_MATERIALS / WALL_MATERIALS 코드 기준) |
| `snapPointToSpaceEdges(mm, excludeId)` | 1220 | 공간 드래그 시 다른 공간의 모든 폴리곤 변에 200mm 이내 자동 흡착 (투영법) |
| `splitWallsAtIntersections()` | 1911 | 새 벽 추가 후 교차점에서 4개 조각으로 분할, TOL=50mm, 안전장치 20회 while loop |

### 신규 데이터 상수

| 상수 | 줄 | 내용 |
|---|---|---|
| `FLOOR_MATERIALS` | 988 | 바닥재 14종 (UNDECIDED, STRONG, WOOD, REINFORCED, LVT, PVC, TILE_PORC, TILE_POLISHED, TILE_BATH, MARBLE, WOOD_TILE, CARPET, EPOXY, CONCRETE) |
| `WALL_MATERIALS` | 1004 | 벽자재 15종 (UNDECIDED, WP_COMPOSITE, WP_SILK, WP_ECO, WP_DESIGN, PAINT_WATER, PAINT_ECO, PAINT_SPECIAL, WALL_TILE, KITCHEN_TILE, WOOD_PANEL, VENEER, CONCRETE, FABRIC, METAL) |

### 버그 수정

| 번호 | 증상 | 수정 위치 |
|---|---|---|
| B-1 | 라이브러리 객체 드래그 시 group 자식 노드 hit → `id` 미인식 | mousedown 핸들러에서 부모 group 탐색 로직 추가 |

### 기존 함수 수정

| 함수/영역 | 변경 내용 |
|---|---|
| 견적 탭 공정별 표 | 공간별 면적 표 → 공정별 합산 표 (`CAT_ORDER` 기반 그룹화) |
| 자재 드롭다운 | `defaultMaterials()` 연동 → 공간 타입 변경 시 자재 자동 초기화 |

---

## 변경 사항 (v5.6 → v5.7, +563줄)

### 신규 함수

| 함수 | 줄 | 의도 |
|---|---|---|
| `darkenHex(hex, frac)` | 1590 | 헥스 색상 다크닝 (2.5D 모드 그림자 오프셋 렌더용) |
| `semanticOf(type)` | 3469 | `SEMANTIC_MAP[type]` 조회, 없으면 `{tag:'generic',kw:type}` fallback |
| `findContainingSpace(p)` | 3472 | point-in-polygon으로 좌표 p가 속하는 공간 id 반환 |
| `pointInPolygon(p, poly)` | 3478 | ray-casting 알고리즘 (가로선 교차 횟수 홀짝 판정) |
| `placementOf(o, sp)` | 3489 | 공간 중심 기준 객체 8방위 `in_north` 등 반환, 300mm 이내면 `center` |
| `findNearestWallId(o)` | 3513 | 도어·창 객체를 가장 가까운 벽 id에 매핑 (`parentId`) |
| `migrateLoadedState(schema)` | 3903 | v5.0~v5.6 저장 파일 → layerName, flipped, typeIndex, code 자동 보충 |
| `exportAIBundle()` | 3971 | 평면 PNG + JSON SSoT + 이미지프롬프트.txt + 영상프롬프트.txt 4종 동시 다운로드 |

### 신규 데이터

| 항목 | 위치 | 내용 |
|---|---|---|
| `SEMANTIC_MAP` | 3416 | 라이브러리 type → `{tag, kw}` 영문 매핑 (현재 **46종** 등록, 아래 분석 참조) |
| `STATE.plus2D` | 463 | 2.5D 토글 (기본 `false`), 인쇄·JSON·AI 번들 export 시 강제 OFF + 자동 복구 |
| `STATE.aiPromptHints` | 466 | style / mood / lighting / materialPalette / cameraSuggestion 5개 필드 |

### 버그 수정 (v5.7)

| 번호 | 증상 |
|---|---|
| B-2 | `loadJSON` 시 circles / arcs / hvac 데이터 손실 |
| B-3 | 다중 선택 일괄 이동·회전 미작동 |
| B-4 | 미러 시 라이브러리 shape 좌우 반전 안 됨 |

---

## SEMANTIC_MAP 현황 분석 (Task 1 준비)

### 현재 등록 46종

가구(18): sofa3, sofa2, sofa1, coffee, tv_stand, bookshelf, piano, rug, bed_d, bed_s, bed_q, bed_k, wardrobe, desk, chair, dressing, diningT, diningC  
위생·주방(11): toilet, bath, shower, basin, vanity, sink, stove, fridge, oven, hood, island  
조명(5): downlight, pendant, chandelier, wall_light, floor_light  
전기(4): outlet, switch, ac, intercom  
공조·소방(8): sprinkler, smoke, heat, emergency, extinguisher, vent, diffuser, ahu  

### ⚠️ 키 불일치 — 실제로 조회되지 않는 alias 17종

아래 SEMANTIC_MAP 키들은 라이브러리에 동일한 키가 없어 `semanticOf(o.type)` 호출 시 **절대 매칭되지 않음** (dead code). Task 1에서 수정 또는 재매핑 필요.

| SEMANTIC_MAP 키 (현재) | 실제 라이브러리 키 | 조치 |
|---|---|---|
| `bath` | `bathtub`, `bathtub_corner` | 삭제 후 두 키 신규 추가 |
| `basin` | `sink_b`, `sink_b_oval` | 삭제 후 두 키 신규 추가 |
| `dressing` | `dressing_table` | 키 수정 |
| `diningT` | `dining4`, `dining6`, `dining_round` | 삭제 후 세 키 신규 추가 |
| `diningC` | `chair` (이미 별도 존재) | 삭제 (중복) |
| `wall_light` | `wall_lamp` | 키 수정 |
| `floor_light` | `floor_lamp` | 키 수정 |
| `outlet` | `outlet_w`, `outlet_w4`, `outlet_f` | 삭제 후 세 키 신규 추가 |
| `switch` | `switch_1`, `switch_2`, `switch_3` | 삭제 후 세 키 신규 추가 |
| `smoke` | `smoke_detector` | 키 수정 |
| `heat` | `heat_detector` | 키 수정 |
| `emergency` | `emerg_light` | 키 수정 |
| `extinguisher` | `fire_ext` | 키 수정 |
| `vent` | `vent_fan` | 키 수정 |
| `ahu` | `ac_ceiling` | 키 수정 |
| `bed_q` | 라이브러리에 없음 (bed_d/s/k만 존재) | 삭제 |
| `island` | 라이브러리에 없음 | 삭제 또는 주방 island 객체 추가 시 재사용 |

### 미매핑 라이브러리 항목 (Task 1 신규 추가 대상)

| 카테고리 | 키 목록 | 수 |
|---|---|---|
| FURNITURE_LIB | plant, nightstand, dressing_table, mirror, desk_l, office_chair, dining4, dining6, dining_round, bar_stool, treadmill | 11 |
| FIXTURE_LIB | toilet_round, bidet, sink_b, sink_b_oval, bathtub, bathtub_corner, shower_corner, sink_k, sink_k_double, induction, microwave, fridge_2door, dishwasher, washer, dryer | 15 |
| LIGHT_LIB | ceiling, wall_lamp, floor_lamp, track, fluorescent | 5 |
| ELECTRIC_LIB | outlet_w, outlet_w4, outlet_f, switch_1, switch_2, switch_3, internet, ac_floor, boiler_ctrl | 9 |
| HVAC_FIRE_LIB | ac_ceiling, vent_fan, hvac_grille, sprinkler_side, smoke_detector, heat_detector, emerg_light, exit_sign, fire_ext, hydrant, emerg_bell, auto_ext | 12 |
| **합계** | | **52** |

> 킥오프 문서의 "34종" 수치는 v5.7 시점 집계(일부 alias 계산 방식 차이). v5.8 코드 기준 실제 미매핑은 52종.  
> alias 불일치 17종 수정 + 신규 52종 추가 시 실질 적용 범위는 75종 이상.

---

## 검증 결과

### JS 문법 체크

```
node --check (JS 추출 후 검사)
결과: ✅ OK  — Node.js v24.14.1
```

### 수동 테스트 (수행 전 — Task 2 선행 필요)

TDD 헌법 준수 → 테스트 스위트 작성 전 커밋 금지.  
아래 항목은 Task 2에서 `?test=1` 러너로 검증 예정:

| 함수 | 상태 |
|---|---|
| `darkenHex` | ⬜ 미검증 |
| `semanticOf` | ⬜ 미검증 |
| `findContainingSpace` | ⬜ 미검증 |
| `pointInPolygon` | ⬜ 미검증 |
| `placementOf` | ⬜ 미검증 |
| `findNearestWallId` | ⬜ 미검증 |
| `migrateLoadedState` | ⬜ 미검증 |
| `exportAIBundle` (조립 부분) | ⬜ 미검증 |
| `snapPointToSpaceEdges` | ⬜ 미검증 |
| `splitWallsAtIntersections` | ⬜ 미검증 |
| `defaultMaterials` | ⬜ 미검증 |

### 알려진 미해결 이슈

| ID | 내용 | 심각도 |
|---|---|---|
| I-2 | `splitWallsAtIntersections` — 안전 한계(20회) 도달 시 경고만 출력, 분할 미완료 잔류 가능 | 🟡 MED |
| I-3 | `bed_q`(퀸침대) / `island`(아일랜드 주방) LIBRARY 추가 여부 대표님 결정 필요 | 🟡 NEEDS_CONFIRMATION |
| I-4 | DXF import: LWPOLYLINE(R14+) 미지원 — R12 POLYLINE만 파싱 가능 | 🟡 MED |

---

## 완료된 작업 (Task 0~5+2차 완료)

| Task | 커밋 | 내용 |
|---|---|---|
| Task 0 | `66e986f` | HANDOVER_v5_8.md 작성 |
| Task 1 (1차) | `34370f3` | SEMANTIC_MAP 79종 완성 (alias 수정 + 신규 52종) |
| Task 2 (1차) | `34370f3` | 자체 테스트 스위트 40건 (?test=1) |
| Task 3 | `e1479af` | DXF 내보내기(exportDXF)/가져오기(importDXF) — AutoCAD R12 호환 |
| Task 4 | `e1479af` | 영상 동선 드래그 편집 UI (refreshVideoSeqUI + STATE.videoSequenceOrder) |
| Task 5 | `e1479af` | migrateLoadedState 강화 — floorMaterial/wallMaterial 자동 보충 |
| Task 2+1 (2차) | `ec4c5a4` | CT1/CT2 무결성 테스트 추가 + bed_q/island dead alias 제거 → SEMANTIC_MAP=79종 완전 일치 |

## 다음 작업 큐 (v5.9 예정)

| 우선순위 | Task | 내용 |
|---|---|---|
| 🟡 | v5.9-A | DXF import LWPOLYLINE(R14+) 지원 |
| 🟢 | v5.9-B | 테스트 커버리지 확대 (DXF, videoSeq) |

---

## 헌법 위반 자가 점검

| 항목 | 상태 | 비고 |
|---|---|---|
| mm 정수 좌표 | ✅ | DXF export 포함 전 항목 `Math.round()` 적용 |
| 단가 추정 금지 | ✅ | CATALOG 전체 `NEEDS_RESEARCH` 표기, 단가 필드 없음 |
| 방수 = CONDITIONAL만 | ✅ | WATERPROOF tag='CONDITIONAL' 확인 |
| NEEDS_CONFIRMATION 누락 | ✅ | bed_q/island SEMANTIC_MAP 제거 완료 — 미결 항목 없음 |
| TDD 강제 | ✅ | 테스트 스위트 42건 (CT1/CT2 포함) 전통과 — 커밋 가드 활성 |
| AI 파싱 SSoT | ✅ | 인쇄·JSON·AI번들·DXF export 시 `plus2D` 강제 OFF |
| 저작권 (브랜드명 금지) | ✅ | SEMANTIC_MAP 79종 전수 확인 — 일반명사만 사용 |
