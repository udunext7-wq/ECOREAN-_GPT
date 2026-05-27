export type MapPoint = { x: number; y: number };

type RawVertex = { id?: string; x?: number; y?: number };
type RawSpace = { id?: string; name?: string; type?: string; vertexIds?: string[]; area_m2?: number; perimeter_m?: number };
type RawWall = { id?: string; v1Id?: string; v2Id?: string };
type RawOpening = { id?: string; type?: string; spaceId?: string; x?: number; y?: number };

export type NormalizedMapSpace = {
  id: string;
  name: string;
  type: string;
  areaM2: number;
  perimeterM: number;
  points: MapPoint[];
  center: MapPoint;
};

export type NormalizedMapGeometry = {
  spaces: NormalizedMapSpace[];
  walls: Array<{ id: string; start: MapPoint; end: MapPoint }>;
  openings: Array<{ id: string; type: string; spaceId: string; point: MapPoint }>;
  viewBox: { x: number; y: number; width: number; height: number };
  warnings: string[];
};

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getSpacePolygon(space: RawSpace, vertices: RawVertex[]) {
  const byId = new Map(vertices.map((vertex) => [vertex.id, vertex]));
  return (space.vertexIds || []).map((id) => byId.get(id)).filter((vertex): vertex is RawVertex => Boolean(vertex)).map((vertex) => ({
    x: finite(vertex.x) || 0,
    y: finite(vertex.y) || 0
  }));
}

export function getSpaceCenter(points: MapPoint[]) {
  if (!points.length) return { x: 0, y: 0 };
  return {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length
  };
}

export function calculateViewBox(spaces: Array<{ points: MapPoint[] }>) {
  const points = spaces.flatMap((space) => space.points);
  if (!points.length) return { x: 0, y: 0, width: 1000, height: 700 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = Math.max(maxX - minX, maxY - minY, 1000) * 0.06;
  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(1, maxX - minX) + padding * 2,
    height: Math.max(1, maxY - minY) + padding * 2
  };
}

export function scaleToViewBox(points: MapPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function getSpaceRiskColor(status: string) {
  if (status === 'REVIEW_REQUIRED') return 'review-required';
  if (status === 'MISSING') return 'missing';
  if (status === 'PARTIAL') return 'partial';
  return 'linked';
}

export function getSpaceLabel(space: { name?: string; type?: string }) {
  return space.name || space.type || '미지정 공간';
}

export function normalizeMapGeometry(project: Record<string, unknown> | null | undefined): NormalizedMapGeometry {
  const vertices = Array.isArray(project?.vertices) ? project.vertices as RawVertex[] : [];
  const rawSpaces = Array.isArray(project?.spaces) ? project.spaces as RawSpace[] : [];
  const warnings: string[] = [];
  const spaces = rawSpaces.flatMap((space) => {
    const points = getSpacePolygon(space, vertices);
    if (points.length < 3) {
      warnings.push(`${getSpaceLabel(space)}: 일부 공간의 좌표가 올바르지 않습니다.`);
      return [];
    }
    return [{
      id: String(space.id || ''),
      name: getSpaceLabel(space),
      type: String(space.type || 'ETC'),
      areaM2: Number(space.area_m2 || 0),
      perimeterM: Number(space.perimeter_m || 0),
      points,
      center: getSpaceCenter(points)
    }];
  });
  const vertexMap = new Map(vertices.map((vertex) => [vertex.id, vertex]));
  const walls = (Array.isArray(project?.walls) ? project.walls as RawWall[] : []).flatMap((wall) => {
    const start = vertexMap.get(wall.v1Id);
    const end = vertexMap.get(wall.v2Id);
    if (!start || !end) return [];
    return [{ id: String(wall.id || ''), start: { x: Number(start.x || 0), y: Number(start.y || 0) }, end: { x: Number(end.x || 0), y: Number(end.y || 0) } }];
  });
  const openings = (Array.isArray(project?.openings) ? project.openings as RawOpening[] : []).flatMap((opening) => {
    const x = finite(opening.x);
    const y = finite(opening.y);
    if (x === null || y === null) return [];
    return [{ id: String(opening.id || ''), type: String(opening.type || 'opening'), spaceId: String(opening.spaceId || ''), point: { x, y } }];
  });
  return { spaces, walls, openings, viewBox: calculateViewBox(spaces), warnings };
}
