# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ECOREAN MiniCAD v5.9** — Korean interior design floor plan editor built on Konva.js. Single-page HTML app that outputs JSON for downstream AI pipelines (T2I/T2V) and estimate engines. Korean-language UI; user is the project owner (대표님), responses in Korean.

## Working locations

- **Edit here**: `C:\Users\udune\ecorean-os\minicad\` (split structure — HTML + css/js)
- **Run from here**: `C:\Users\udune\Desktop\MiniCAD-v5.9-Galaxy\` (synced copy)

After every edit, sync to the Desktop folder and bump the cache buster (see below). The user opens the Desktop copy.

## Common commands

```bash
# Cache-bust + sync to Desktop after editing (single bump applies to all <script> tags)
sed -i 's/v=OLDTAG/v=NEWTAG/g' "/c/Users/udune/ecorean-os/minicad/ecorean_minicad_v5_9.html"
cp -rf "/c/Users/udune/ecorean-os/minicad/." "/c/Users/udune/Desktop/MiniCAD-v5.9-Galaxy/"

# Open in default browser
start "" "C:\Users\udune\Desktop\MiniCAD-v5.9-Galaxy\ecorean_minicad_v5_9.html"

# Verify current cache buster
grep "engine.js?" "/c/Users/udune/ecorean-os/minicad/ecorean_minicad_v5_9.html"

# JS syntax check (no real test suite — built-in ?test=1 query in URL runs tests.js)
```

The cache buster must be bumped on EVERY change or the browser serves stale JS. All six JS files share the same `?v=TAG` query string — sed-replace updates all at once.

## File structure & load order

The HTML loads scripts in this order — files have implicit dependencies:

```
state.js    → STATE singleton (defines all arrays + layers + snap config)
data.js     → SPACE_TYPES, FLOOR_MATERIALS, WALL_MATERIALS, FURNITURE_LIB, etc.
library.js  → Library object shape definitions (rects, circles for furniture symbols)
engine.js   → Konva setup, groups, renderAll(), snapToEndpoint, VEF helpers
tools.js    → All drawing tools, mousedown/mousemove handlers, addLine/addWall/...
ui.js       → Left panel, JSON save/load, layer toggles, deleteSelected
tests.js    → Self-test runner (activated with ?test=1 query param)
```

`engine.js` defines globals (stage, mainLayer, groups). `tools.js` and `ui.js` reference them by name. Don't reorder includes.

## Architecture

### VEF (Vertex-Edge-Face) graph

`STATE.vertices` is the single source of truth for all coordinates. Walls store `v1Id`/`v2Id`; spaces store `vertexIds[]`. Getter properties on wall/space objects (`x1`, `y1`, `polygon`) read from vertices live — moving a vertex automatically updates every wall/space referencing it. This is what allows shared corners between adjoining spaces.

`ensureVertex(x,y)` reuses nearby vertices (tolerance). `ensureBearingVertex(x,y,30)` is **separate** — bearing wall vertices have `kind:'bearing'` and never merge with regular space/wall vertices. This isolation prevents bearing walls from deforming spaces when dragged.

`_ensureFreeWallVertex` creates independent vertices for free-standing walls so they don't drag with spaces.

### Konva layer ordering (z-order, bottom → top)

```
bgLayer (background image)
mainLayer
  ├ spaces → walls → openings → fixtures → furniture → electric
  ├ lights → dimensions → text → circles → arcs → curves → hvac
  ├ leaders → pillars → spaceHandles (top)
previewLayer (snap markers, drag preview, ghost hints — listening:false)
```

Bearing walls and pillars use `moveToTop()` at end of their render to ensure concrete hatching is visible over regular walls.

### Selection model

- `STATE.selectedKind` + `STATE.selectedId` — single selection
- `STATE.boxSelection[]` — multi-select from drag-box
- `getSelectedTargets()` returns whichever is active
- `selectObj(kind, id)` — call sites check `e.evt.button !== 0` first to skip right-click

When adding new object types, update **all** of these:
- `getArr(kind)` in `ui.js` (kind→array map)
- `findObjById(id)` in `tools.js` (used by mousedown drag start)
- `finishBoxSelection` `tests` + `map` in `tools.js`
- `deleteBoxSelection` `groups2` map in `tools.js`
- `_nudgeSelected` (already handles via `'x' in obj` / `'vertexIds' in obj` patterns)
- `applyDragMove` (single + multi branches)
- `buildJSON` + `loadJSON` in `ui.js`
- `STATE.layers.NAME` in `state.js` + `buildLayerUI` labels

Missing any of these silently breaks one aspect (e.g., missing in `findObjById` = clickable but not draggable).

### Snap system

`snapToEndpoint(mm)` — priority order:
1. Space corners
2. Wall endpoints + midpoints (filtered by tool — bearing tool excludes regular walls and vice versa via `_isDrawingBearing`/`_isDrawingRegular`)
3. Bearing wall pairwise intersection (200mm extension allowed for near-T-junctions)
4. Opening/library/pillar/curve centers
5. Circle quadrants, arc endpoints/center, bezier anchors
6. Perpendicular foot on walls (120mm threshold, **always on**)
7. Ghost snap (lines + edges + curve/ellipse circumference, 400mm — separate toggle)

`STATE.ctrlPressed` disables all snap (free coordinates). `STATE.snap.ghost` is a separate toggle for the perpendicular-foot/line-edge sampling marker.

### Tool dispatch

`STATE.selectedTool` is a string. The `mousedown` handler in `tools.js` has a long `if/else if` chain on this string. Drawing tools (wall/line/arc/circle/rect/polygon) set `drawState` for two-click drawing. Library tools set `selectedLib` and place on click. Pillar tool reads `STATE.pillarDefaults` and places ghost preview on mousemove via `updatePillarGhost`.

### Continuous-drawing tools

`wall`, `gabyeok` (bearing), `line`, `arc` (curve), `pillar` all stay active after first creation. The pattern: after `addXxx()`, reset `drawState = {type, start:endMm, current:endMm}` so the next click extends from previous endpoint. Esc exits.

### Concrete hatching (pillars, bearing walls)

Bearing wall hatching uses 45° diagonal stripes inside a clipped polygon path, computed in pixel space but the polygon path itself scales with zoom (mm space). Pillars use a simplified hatch (3 long diagonals + 1 big stroke circle + 1 small stroke circle). All hatch dimensions are **proportional to pillar mm-size** (e.g., `rBig = minDim * 0.18`) — the user calls this "기둥에 맞춰서 고정" (fixed relative to pillar). Annotative (pixel-fixed) hatching was tried and rejected.

### Boolean operations on spaces

Right-click with 2+ spaces selected → context menu with Union (병합) / Subtract (차감) / Intersect (교집합). Uses Sutherland-Hodgman clipping (`suthHodg`, `polyDiff`, `polyUnion` in `tools.js`). Subtraction creates **holes** (`space.holes[]`) rendered via `ctx.fill('evenodd')` rather than slit polygons.

### Line-divides-space (single + polyline)

When a `line` tool segment crosses a space polygon at exactly 2 edges, `splitPolygonByLine` divides it. If a single segment doesn't cross but it chains end-to-end with existing `isLine` walls forming a polyline that does cross, `tryPolylineSplit` consumes those line segments and performs the split. End-point match tolerance is 150mm. Corners (`t_poly` at 0/1) are normalized + deduplicated to avoid breaking on corner-snapped lines.

### Lock (잠금)

`obj.locked = true` on any object disables drag, arrow-nudge, and edit handles. Visual: opacity 0.30 + dashed stroke (no badge — user rejected lock icon). Right-click menu offers toggle. Drag prevention is checked in `applyDragMove` (multi branch filters, single branch returns early) and `_nudgeSelected` (filters then toasts if all locked).

### JSON schema

`buildJSON()` outputs schema `ECOREAN.FloorPlan.v5.9` with rich AI metadata: `meta.aiPromptHints`, `meta.videoSequence`, per-object `semanticTag`/`promptKeyword`/`placement`, `relationships` graph, `indices.byLayer/bySpace/byTag`. `loadJSON` migrates from v5.0~v5.6 via `migrateLoadedState`. When adding a new STATE array, both functions must be updated.

## Conventions (project constitution — strict)

- **All coordinates are integer mm** — no fractional. `snapMm()` rounds.
- **No price estimation** — output `NEEDS_RESEARCH` instead of guessing unit prices.
- **Waterproofing is `CONDITIONAL` only** — never `AUTO`.
- **Ambiguous values become `NEEDS_CONFIRMATION`** — don't silently default.
- **No brand names** in `promptKeyword` (no "Eames", "Hermès") — generic nouns only.
- **2.5D mode** is sales-preview only; forced OFF during JSON save / DXF export / AI bundle / print, then restored.
- **No comments in new code** unless explaining a non-obvious WHY (subtle invariant, workaround for specific bug). Naming should carry the load.

## Response style

- User language: Korean. Respond in Korean.
- The user is "대표님". Be terse and direct — they review diffs themselves.
- After non-trivial edits: bump cache buster, sync to Desktop, and confirm in one or two sentences. No long summaries.
- For UI/behavior changes that require browser testing: state explicitly that you can't run the browser; ask the user to verify after hard-refresh (Ctrl+Shift+R).
