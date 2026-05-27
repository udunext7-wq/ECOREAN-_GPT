export type CustomerProposalMapData = {
  customerSafe: true;
  importId: string;
  estimateId: string;
  projectId: string;
  projectName: string;
  siteName: string;
  customerName: string;
  geometry: {
    vertices: Array<{ id: string; x: number; y: number }>;
    walls: Array<{ id: string; v1Id: string; v2Id: string }>;
    openings: Array<{ id: string; type: string; spaceId: string; x: number; y: number }>;
  };
  spaces: Array<{
    id: string;
    name: string;
    type: string;
    vertexIds: string[];
    areaM2: number;
    constructionScope: string[];
    finishDirectionKo: string[];
    progressStatusKo: string;
    customerNoteKo: string;
  }>;
  publicScopeSummary: string[];
  publicScheduleStatus: { statusKo: string; progressRate: number; nextProcessKo: string };
  designDirection: { style: string; colorTone: string; primaryMaterials: string; lightingMood: string };
  approvedImages: Array<{ id: string; imagePath: string; resultType: string; spaceName: string }>;
  customerNotes: string[];
  safeWarnings: string[];
  statusKo: string;
};

function stringValue(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function emptyCustomerProposalMapData(messageKo = '표시할 공간 정보가 없습니다.'): CustomerProposalMapData {
  return {
    customerSafe: true,
    importId: '',
    estimateId: '',
    projectId: '',
    projectName: '프로젝트 정보 없음',
    siteName: '현장명 확인 필요',
    customerName: '고객명 확인 필요',
    geometry: { vertices: [], walls: [], openings: [] },
    spaces: [],
    publicScopeSummary: [],
    publicScheduleStatus: { statusKo: '공사 예정', progressRate: 0, nextProcessKo: '다음 예정 공정 확인 중' },
    designDirection: { style: '', colorTone: '', primaryMaterials: '', lightingMood: '' },
    approvedImages: [],
    customerNotes: [],
    safeWarnings: [],
    statusKo: messageKo
  };
}

export function sanitizeLightBIMCustomerMapData(data: Record<string, any> | null | undefined): CustomerProposalMapData {
  if (!data) return emptyCustomerProposalMapData();
  const safe = emptyCustomerProposalMapData(stringValue(data.statusKo, '고객용 공간 맵을 불러왔습니다.'));
  const geometry = data.geometry || {};
  return {
    ...safe,
    importId: stringValue(data.importId),
    estimateId: stringValue(data.estimateId),
    projectId: stringValue(data.projectId),
    projectName: stringValue(data.projectName, safe.projectName),
    siteName: stringValue(data.siteName, safe.siteName),
    customerName: stringValue(data.customerName, safe.customerName),
    geometry: {
      vertices: Array.isArray(geometry.vertices) ? geometry.vertices.map((vertex: any) => ({
        id: stringValue(vertex.id),
        x: numberValue(vertex.x),
        y: numberValue(vertex.y)
      })) : [],
      walls: Array.isArray(geometry.walls) ? geometry.walls.map((wall: any) => ({
        id: stringValue(wall.id),
        v1Id: stringValue(wall.v1Id),
        v2Id: stringValue(wall.v2Id)
      })) : [],
      openings: Array.isArray(geometry.openings) ? geometry.openings.map((opening: any) => ({
        id: stringValue(opening.id),
        type: stringValue(opening.type, 'opening'),
        spaceId: stringValue(opening.spaceId),
        x: numberValue(opening.x),
        y: numberValue(opening.y)
      })) : []
    },
    spaces: Array.isArray(data.spaces) ? data.spaces.map((space: any) => ({
      id: stringValue(space.id),
      name: stringValue(space.name, '미지정 공간'),
      type: stringValue(space.type, 'ETC'),
      vertexIds: Array.isArray(space.vertexIds) ? space.vertexIds.map(String) : [],
      areaM2: numberValue(space.areaM2),
      constructionScope: Array.isArray(space.constructionScope) ? space.constructionScope.map(String) : [],
      finishDirectionKo: Array.isArray(space.finishDirectionKo) ? space.finishDirectionKo.map(String) : [],
      progressStatusKo: stringValue(space.progressStatusKo, '공사 예정'),
      customerNoteKo: stringValue(space.customerNoteKo)
    })) : [],
    publicScopeSummary: Array.isArray(data.publicScopeSummary) ? data.publicScopeSummary.map(String) : [],
    publicScheduleStatus: {
      statusKo: stringValue(data.publicScheduleStatus?.statusKo, '공사 예정'),
      progressRate: numberValue(data.publicScheduleStatus?.progressRate),
      nextProcessKo: stringValue(data.publicScheduleStatus?.nextProcessKo, '다음 예정 공정 확인 중')
    },
    designDirection: {
      style: stringValue(data.designDirection?.style),
      colorTone: stringValue(data.designDirection?.colorTone),
      primaryMaterials: stringValue(data.designDirection?.primaryMaterials),
      lightingMood: stringValue(data.designDirection?.lightingMood)
    },
    approvedImages: Array.isArray(data.approvedImages) ? data.approvedImages.map((image: any) => ({
      id: stringValue(image.id),
      imagePath: stringValue(image.imagePath),
      resultType: stringValue(image.resultType, 'PERSPECTIVE'),
      spaceName: stringValue(image.spaceName)
    })) : [],
    customerNotes: Array.isArray(data.customerNotes) ? data.customerNotes.map(String) : [],
    safeWarnings: Array.isArray(data.safeWarnings) ? data.safeWarnings.map(String) : [],
    statusKo: stringValue(data.statusKo, safe.statusKo)
  };
}
