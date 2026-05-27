'use strict';

const PUBLIC_STATUS_LABELS = {
  PLANNED: '공사 예정',
  IN_PROGRESS: '공사 중',
  INSPECTION: '검수 중',
  COMPLETED: '완료',
  REVISION: '보완 예정'
};

const PROCESS_SCOPE_LABELS = {
  flooring: '바닥 마감',
  wallpaper: '도배',
  painting: '도장',
  bathroom: '욕실 리모델링',
  kitchen: '주방 리모델링',
  lighting: '조명',
  windows: '창호',
  furniture: '수납/가구',
  demolition: '철거',
  finishing: '마감',
  tile: '타일 마감',
  ceiling: '천장 마감',
  doors: '문 교체'
};

function cleanString(value, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMatchText(value) {
  return cleanString(value).replace(/\s+/g, '').toUpperCase();
}

function finishLabel(value) {
  const labels = {
    engineered_wood: '강마루',
    wallpaper_silk: '실크 벽지',
    porcelain_tile: '포세린 타일',
    tile: '타일',
    paint: '도장',
    bathroom_ceiling: '욕실 천장 마감'
  };
  const key = cleanString(value);
  return labels[key] || key;
}

function normalizePublicStatus(value) {
  const status = cleanString(value).toUpperCase();
  if (status.includes('COMPLETE') || status.includes('DONE')) return PUBLIC_STATUS_LABELS.COMPLETED;
  if (status.includes('INSPECT') || status.includes('CHECK')) return PUBLIC_STATUS_LABELS.INSPECTION;
  if (status.includes('REVISION') || status.includes('REPAIR') || status.includes('SUPPLEMENT')) return PUBLIC_STATUS_LABELS.REVISION;
  if (status.includes('PROGRESS') || status.includes('START') || status.includes('WORK')) return PUBLIC_STATUS_LABELS.IN_PROGRESS;
  return PUBLIC_STATUS_LABELS.PLANNED;
}

function scopeForSpace(space, selectedProcesses) {
  const type = cleanString(space.type, 'ETC').toUpperCase();
  if (type === 'BATHROOM') return ['욕실 리모델링', '바닥/벽 타일 교체', '도기 및 마감 교체', '조명/환기 설비 정비'];
  if (type === 'KITCHEN') return ['주방 리모델링', '주방 가구 교체', '상판 및 벽면 마감', '수전/싱크볼 정비'];
  const processScope = selectedProcesses
    .map((process) => PROCESS_SCOPE_LABELS[cleanString(process).toLowerCase()])
    .filter(Boolean);
  const finish = type === 'ENTRANCE' ? '현관 바닥 마감' : type === 'LIVING' || type === 'BEDROOM' ? '바닥 및 벽면 마감' : '공간 마감';
  return Array.from(new Set([finish, ...processScope.slice(0, 3)]));
}

function mapSpace(space, selectedProcesses, publicStatus) {
  return {
    id: cleanString(space.id),
    name: cleanString(space.name, '미지정 공간'),
    type: cleanString(space.type, 'ETC'),
    vertexIds: Array.isArray(space.vertexIds) ? space.vertexIds.map(String) : [],
    areaM2: safeNumber(space.area_m2),
    constructionScope: scopeForSpace(space, selectedProcesses),
    finishDirectionKo: [
      cleanString(space.floor_finish) ? `바닥: ${finishLabel(space.floor_finish)}` : '',
      cleanString(space.wall_finish) ? `벽: ${finishLabel(space.wall_finish)}` : '',
      cleanString(space.ceiling_finish) ? `천장: ${finishLabel(space.ceiling_finish)}` : ''
    ].filter(Boolean),
    progressStatusKo: publicStatus,
    approvedImages: [],
    customerNoteKo: '선정된 디자인 방향과 현장 여건에 따라 상세 사양을 협의합니다.'
  };
}

function imageMatchesSpace(image, space) {
  if (image.spaceId && image.spaceId === space.id) return true;
  const imageName = normalizeMatchText(image.spaceName);
  const imageType = normalizeMatchText(image.spaceType);
  return Boolean(
    (imageName && imageName === normalizeMatchText(space.name))
    || (imageType && imageType === normalizeMatchText(space.type))
  );
}

function sanitizeLightBIMCustomerMapData(data = {}) {
  const geometry = data.geometry || {};
  return {
    customerSafe: true,
    importId: cleanString(data.importId),
    estimateId: cleanString(data.estimateId),
    projectId: cleanString(data.projectId),
    projectName: cleanString(data.projectName, '프로젝트 정보 없음'),
    siteName: cleanString(data.siteName, '현장명 확인 필요'),
    customerName: cleanString(data.customerName, '고객명 확인 필요'),
    geometry: {
      vertices: Array.isArray(geometry.vertices) ? geometry.vertices.map((vertex) => ({
        id: cleanString(vertex.id),
        x: safeNumber(vertex.x),
        y: safeNumber(vertex.y)
      })) : [],
      walls: Array.isArray(geometry.walls) ? geometry.walls.map((wall) => ({
        id: cleanString(wall.id),
        v1Id: cleanString(wall.v1Id),
        v2Id: cleanString(wall.v2Id)
      })) : [],
      openings: Array.isArray(geometry.openings) ? geometry.openings.map((opening) => ({
        id: cleanString(opening.id),
        type: cleanString(opening.type, 'opening'),
        spaceId: cleanString(opening.spaceId),
        x: safeNumber(opening.x),
        y: safeNumber(opening.y)
      })) : []
    },
    spaces: Array.isArray(data.spaces) ? data.spaces.map((space) => ({
      id: cleanString(space.id),
      name: cleanString(space.name, '미지정 공간'),
      type: cleanString(space.type, 'ETC'),
      vertexIds: Array.isArray(space.vertexIds) ? space.vertexIds.map(String) : [],
      areaM2: safeNumber(space.areaM2),
      constructionScope: Array.isArray(space.constructionScope) ? space.constructionScope.map(String) : [],
      finishDirectionKo: Array.isArray(space.finishDirectionKo) ? space.finishDirectionKo.map(String) : [],
      progressStatusKo: cleanString(space.progressStatusKo, PUBLIC_STATUS_LABELS.PLANNED),
      approvedImages: Array.isArray(space.approvedImages) ? space.approvedImages.map((image) => ({
        id: cleanString(image.id),
        imagePath: cleanString(image.imagePath),
        resultType: cleanString(image.resultType, 'PERSPECTIVE')
      })) : [],
      customerNoteKo: cleanString(space.customerNoteKo)
    })) : [],
    publicScopeSummary: Array.isArray(data.publicScopeSummary) ? data.publicScopeSummary.map(String) : [],
    publicScheduleStatus: {
      statusKo: cleanString(data.publicScheduleStatus?.statusKo, PUBLIC_STATUS_LABELS.PLANNED),
      progressRate: safeNumber(data.publicScheduleStatus?.progressRate),
      nextProcessKo: cleanString(data.publicScheduleStatus?.nextProcessKo, '다음 예정 공정 확인 중')
    },
    designDirection: {
      style: cleanString(data.designDirection?.style),
      colorTone: cleanString(data.designDirection?.colorTone),
      primaryMaterials: cleanString(data.designDirection?.primaryMaterials),
      lightingMood: cleanString(data.designDirection?.lightingMood),
      designKeywords: cleanString(data.designDirection?.designKeywords)
    },
    approvedImages: Array.isArray(data.approvedImages) ? data.approvedImages.map((image) => ({
      id: cleanString(image.id),
      imagePath: cleanString(image.imagePath),
      resultType: cleanString(image.resultType, 'PERSPECTIVE'),
      spaceId: cleanString(image.spaceId),
      spaceName: cleanString(image.spaceName),
      spaceType: cleanString(image.spaceType)
    })) : [],
    customerNotes: Array.isArray(data.customerNotes) ? data.customerNotes.map(String) : [],
    safeWarnings: Array.isArray(data.safeWarnings) ? data.safeWarnings.map(String) : [],
    statusKo: cleanString(data.statusKo, '고객용 공간 맵을 불러왔습니다.')
  };
}

function createLightBIMCustomerMapService({ db, fromJson }) {
  function findImport({ importId = '', estimateId = '', projectId = '' } = {}) {
    if (importId) return db.project.prepare('SELECT * FROM lightbim_imports WHERE id = ? AND status = ?').get(importId, 'SUCCESS');
    const targetId = estimateId || projectId;
    if (targetId) {
      return db.project.prepare(`
        SELECT * FROM lightbim_imports
        WHERE created_estimate_id = ? AND status = 'SUCCESS'
        ORDER BY created_at DESC LIMIT 1
      `).get(targetId);
    }
    return db.project.prepare("SELECT * FROM lightbim_imports WHERE status = 'SUCCESS' ORDER BY created_at DESC LIMIT 1").get();
  }

  function approvedImagesForEstimate(estimateId) {
    if (!estimateId) return [];
    return db.project.prepare(`
      SELECT vr.id, vr.image_path, vr.result_type, vb.space_id, vb.space_name, vb.space_type
      FROM visualization_results vr
      JOIN visualization_briefs vb ON vb.id = vr.brief_id
      WHERE vb.estimate_id = ? AND vr.status = 'APPROVED'
      ORDER BY COALESCE(vr.approved_at, vr.created_at) DESC
      LIMIT 8
    `).all(estimateId).map((row) => ({
      id: row.id,
      imagePath: row.image_path,
      resultType: row.result_type,
      spaceId: row.space_id,
      spaceName: row.space_name,
      spaceType: row.space_type
    }));
  }

  function publicSchedule(estimateId) {
    if (!estimateId) return { statusKo: PUBLIC_STATUS_LABELS.PLANNED, progressRate: 0, nextProcessKo: '다음 예정 공정 확인 중' };
    const schedule = db.project.prepare('SELECT * FROM construction_schedules WHERE estimate_id = ? ORDER BY updated_at DESC LIMIT 1').get(estimateId);
    if (!schedule) return { statusKo: PUBLIC_STATUS_LABELS.PLANNED, progressRate: 0, nextProcessKo: '다음 예정 공정 확인 중' };
    const items = db.project.prepare('SELECT process_name, status FROM construction_schedule_items WHERE schedule_id = ? ORDER BY sort_order').all(schedule.id);
    const completed = items.filter((item) => normalizePublicStatus(item.status) === PUBLIC_STATUS_LABELS.COMPLETED).length;
    const next = items.find((item) => normalizePublicStatus(item.status) !== PUBLIC_STATUS_LABELS.COMPLETED);
    return {
      statusKo: completed === items.length && items.length ? PUBLIC_STATUS_LABELS.COMPLETED : normalizePublicStatus(schedule.status),
      progressRate: items.length ? Math.round((completed / items.length) * 100) : 0,
      nextProcessKo: next?.process_name || '다음 예정 공정 확인 중'
    };
  }

  function designDirectionForEstimate(estimateId) {
    if (!estimateId) return {};
    const moodboard = db.project.prepare('SELECT * FROM moodboard_profiles WHERE estimate_id = ? ORDER BY updated_at DESC LIMIT 1').get(estimateId);
    if (moodboard) {
      return {
        style: moodboard.style,
        colorTone: moodboard.color_tone,
        primaryMaterials: moodboard.primary_materials,
        lightingMood: moodboard.lighting_mood,
        designKeywords: moodboard.reference_notes || ''
      };
    }
    const brief = db.project.prepare('SELECT * FROM visualization_briefs WHERE estimate_id = ? ORDER BY updated_at DESC LIMIT 1').get(estimateId);
    return brief ? {
      style: brief.style,
      colorTone: brief.color_tone,
      primaryMaterials: brief.material_keywords,
      lightingMood: brief.lighting_mood,
      designKeywords: brief.design_notes || ''
    } : {};
  }

  function buildMapData(importRow, projectId = '') {
    if (!importRow) return sanitizeLightBIMCustomerMapData({ statusKo: '표시할 공간 정보가 없습니다.' });
    const raw = fromJson(importRow.raw_json, {}) || {};
    const project = raw.project || {};
    const estimateId = importRow.created_estimate_id || '';
    const scheduleStatus = publicSchedule(estimateId);
    const rawProcesses = raw.bocEstimateInput?.selected_processes;
    const selectedProcesses = Array.isArray(rawProcesses)
      ? rawProcesses
      : Object.entries(rawProcesses || {}).filter(([, enabled]) => Boolean(enabled)).map(([key]) => key);
    const approvedImages = approvedImagesForEstimate(estimateId);
    const spaces = Array.isArray(project.spaces) ? project.spaces.map((space) => {
      const safeSpace = mapSpace(space, selectedProcesses, scheduleStatus.statusKo);
      return {
        ...safeSpace,
        approvedImages: approvedImages.filter((image) => imageMatchesSpace(image, safeSpace))
      };
    }) : [];
    const scopeSummary = Array.from(new Set(spaces.flatMap((space) => space.constructionScope)));
    return sanitizeLightBIMCustomerMapData({
      importId: importRow.id,
      estimateId,
      projectId: projectId || estimateId,
      projectName: project.name || importRow.project_name,
      siteName: project.name,
      customerName: '고객명 확인 필요',
      geometry: {
        vertices: project.vertices || [],
        walls: project.walls || [],
        openings: project.openings || []
      },
      spaces,
      publicScopeSummary: scopeSummary,
      publicScheduleStatus: scheduleStatus,
      designDirection: designDirectionForEstimate(estimateId),
      approvedImages,
      customerNotes: ['공간별 마감과 시공 일정은 계약 확정 후 상세 안내드립니다.'],
      safeWarnings: spaces.length ? [] : ['표시할 공간 정보가 없습니다.'],
      statusKo: spaces.length ? '고객용 공간 맵을 불러왔습니다.' : '표시할 공간 정보가 없습니다.'
    });
  }

  function getCustomerProposalMapData(importId) {
    return buildMapData(findImport({ importId }));
  }

  function getCustomerProposalMapByEstimate(estimateType, estimateId) {
    return buildMapData(findImport({ estimateId }), estimateId);
  }

  function getCustomerProposalMapByProject(projectId) {
    return buildMapData(findImport({ projectId }), projectId);
  }

  function generateCustomerMapSummary(payload = {}) {
    const map = payload.importId
      ? getCustomerProposalMapData(payload.importId)
      : payload.estimateId
        ? getCustomerProposalMapByEstimate(payload.estimateType, payload.estimateId)
        : getCustomerProposalMapByProject(payload.projectId);
    return {
      projectName: map.projectName,
      spaceCount: map.spaces.length,
      spaces: map.spaces.map((space) => ({
        name: space.name,
        areaM2: space.areaM2,
        constructionScope: space.constructionScope,
        progressStatusKo: space.progressStatusKo
      })),
      publicScopeSummary: map.publicScopeSummary,
      publicScheduleStatus: map.publicScheduleStatus,
      designDirection: map.designDirection,
      approvedImages: map.approvedImages,
      customerSafe: true
    };
  }

  return {
    getCustomerProposalMapData,
    getCustomerProposalMapByEstimate,
    getCustomerProposalMapByProject,
    generateCustomerMapSummary
  };
}

module.exports = {
  createLightBIMCustomerMapService,
  sanitizeLightBIMCustomerMapData
};
