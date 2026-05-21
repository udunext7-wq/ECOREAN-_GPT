'use strict';

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseLightBIMJSON(payload) {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch (error) {
      const err = new Error('LightBIM JSON 형식이 올바르지 않습니다.');
      err.rawError = error;
      throw err;
    }
  }
  if (payload && typeof payload === 'object') return payload;
  throw new Error('LightBIM JSON 형식이 올바르지 않습니다.');
}

function getSpaces(payload) {
  return asArray(payload?.bocEstimateInput?.spaces).length
    ? asArray(payload.bocEstimateInput.spaces)
    : asArray(payload?.project?.spaces);
}

function validateLightBIMJSON(payload) {
  let parsed;
  try {
    parsed = parseLightBIMJSON(payload);
  } catch {
    return { ok: false, valid: false, errorMessage: 'LightBIM JSON 형식이 올바르지 않습니다.' };
  }

  const hasRequiredShape = Boolean(parsed.schema && parsed.project && parsed.quantities && parsed.bocEstimateInput);
  if (!hasRequiredShape) {
    return { ok: false, valid: false, errorMessage: 'LightBIM JSON 형식이 올바르지 않습니다.' };
  }

  const spaces = getSpaces(parsed);
  if (!spaces.length) {
    return { ok: false, valid: false, errorMessage: '공간 정보가 없습니다.' };
  }

  return { ok: true, valid: true, payload: parsed };
}

function textOf(value) {
  return String(value || '').toUpperCase();
}

function isBathroomSpace(space) {
  const text = `${textOf(space.type)} ${textOf(space.name)} ${textOf(space.space_type)} ${textOf(space.spaceName)}`;
  return text.includes('BATH') || text.includes('WC') || text.includes('욕실') || text.includes('화장실');
}

function isKitchenSpace(space) {
  const text = `${textOf(space.type)} ${textOf(space.name)} ${textOf(space.space_type)} ${textOf(space.spaceName)}`;
  return text.includes('KITCHEN') || text.includes('주방');
}

function isBalconySpace(space) {
  const text = `${textOf(space.type)} ${textOf(space.name)} ${textOf(space.space_type)} ${textOf(space.spaceName)}`;
  return text.includes('BALCONY') || text.includes('발코니');
}

function normalizeEstimateType(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('BATH')) return 'BATHROOM';
  if (normalized.includes('KITCHEN')) return 'KITCHEN';
  if (normalized.includes('FULL')) return 'FULL_REMODELING';
  return '';
}

function detectEstimateType(payload) {
  const parsed = parseLightBIMJSON(payload);
  const fromBoc = normalizeEstimateType(parsed?.bocEstimateInput?.estimate_type);
  if (fromBoc) return fromBoc;

  const spaces = getSpaces(parsed);
  const bathroomCount = spaces.filter(isBathroomSpace).length;
  const kitchenCount = spaces.filter(isKitchenSpace).length;
  if (bathroomCount > 0 && kitchenCount === 0 && spaces.length <= 2) return 'BATHROOM';
  if (kitchenCount > 0 && bathroomCount === 0 && spaces.length <= 2) return 'KITCHEN';
  if (spaces.length > 1) return 'FULL_REMODELING';
  throw new Error('견적 유형을 판단할 수 없습니다.');
}

function getArea(space) {
  return safeNumber(space.area_m2 ?? space.floor_area_m2 ?? space.areaM2, 0);
}

function getProjectName(payload) {
  return String(payload?.project?.name || payload?.project?.project_name || payload?.bocEstimateInput?.projectName || '').trim();
}

function sumSpaceArea(spaces, predicate) {
  return spaces.filter(predicate).reduce((sum, space) => sum + getArea(space), 0);
}

function buildSummary(payload, estimateType) {
  const spaces = getSpaces(payload);
  const quantities = payload.quantities || {};
  const processQuantities = quantities.process_quantities || {};
  const bathroomSpaces = spaces.filter(isBathroomSpace);
  const kitchenSpaces = spaces.filter(isKitchenSpace);
  const balconySpaces = spaces.filter(isBalconySpace);

  return {
    schema: payload.schema,
    schemaVersion: payload.project?.schema_version || payload.project?.schemaVersion || '0.1',
    projectName: getProjectName(payload),
    detectedEstimateType: estimateType,
    totalAreaM2: safeNumber(quantities.total_floor_area_m2 ?? payload.bocEstimateInput?.area_m2, spaces.reduce((sum, space) => sum + getArea(space), 0)),
    floorAreaM2: safeNumber(quantities.total_floor_area_m2 ?? processQuantities.flooring_area_m2, 0),
    totalWallAreaM2: safeNumber(quantities.total_net_wall_area_m2 ?? quantities.total_wall_area_m2, 0),
    grossWallAreaM2: safeNumber(quantities.total_wall_area_m2, 0),
    openingAreaM2: safeNumber(quantities.opening_area_m2 ?? processQuantities.opening_area_m2, 0),
    totalCeilingAreaM2: safeNumber(quantities.total_ceiling_area_m2, 0),
    totalPerimeterM: safeNumber(quantities.total_perimeter_m, 0),
    tileAreaM2: safeNumber(processQuantities.tile_area_m2, 0),
    wallpaperAreaM2: safeNumber(processQuantities.wallpaper_area_m2, 0),
    paintingAreaM2: safeNumber(processQuantities.painting_area_m2, 0),
    baseboardLengthM: safeNumber(processQuantities.baseboard_length_m, 0),
    moldingLengthM: safeNumber(processQuantities.molding_length_m, 0),
    doorCount: safeNumber(quantities.door_count, 0),
    windowCount: safeNumber(quantities.window_count, 0),
    warnings: Array.isArray(quantities.warnings) ? quantities.warnings : Array.isArray(payload?.bocEstimateInput?.quantity_basis?.warnings) ? payload.bocEstimateInput.quantity_basis.warnings : [],
    spaceCount: spaces.length,
    bathroomCount: bathroomSpaces.length,
    kitchenExists: kitchenSpaces.length > 0,
    balconyCount: balconySpaces.length,
    spaces: spaces.map((space) => ({
      id: space.id,
      name: space.name || space.spaceName || space.type || 'Space',
      type: space.type || space.space_type || 'OTHER',
      areaM2: getArea(space),
      perimeterM: safeNumber(space.perimeter_m ?? space.perimeterM, 0)
    })),
    processQuantities,
    aiPromptHints: payload.aiPromptHints || {}
  };
}

function buildQuantityBasis(summary) {
  const processQuantities = summary.processQuantities || {};
  return {
    total_area_m2: summary.totalAreaM2,
    flooring_area_m2: safeNumber(processQuantities.flooring_area_m2, summary.floorAreaM2 || summary.totalAreaM2),
    floor_area_m2: summary.floorAreaM2 || summary.totalAreaM2,
    bathroom_area_m2: summary.bathroomCount > 0 ? summary.spaces.filter(isBathroomSpace).reduce((sum, space) => sum + getArea(space), 0) : 0,
    kitchen_area_m2: summary.kitchenExists ? summary.spaces.filter(isKitchenSpace).reduce((sum, space) => sum + getArea(space), 0) : 0,
    ceiling_area_m2: summary.totalCeilingAreaM2,
    wall_area_m2: summary.totalWallAreaM2,
    net_wall_area_m2: summary.totalWallAreaM2,
    wallpaper_area_m2: summary.wallpaperAreaM2,
    painting_area_m2: summary.paintingAreaM2,
    tile_area_m2: summary.tileAreaM2,
    bathroom_tile_area_m2: safeNumber(processQuantities.bathroom_tile_area_m2, summary.bathroomCount > 0 ? summary.tileAreaM2 : 0),
    kitchen_wall_tile_area_m2: safeNumber(processQuantities.kitchen_wall_tile_area_m2, 0),
    baseboard_length_m: summary.baseboardLengthM,
    molding_length_m: summary.moldingLengthM,
    perimeter_m: summary.totalPerimeterM,
    kitchen_length_m: safeNumber(processQuantities.kitchen_length_m ?? processQuantities.estimated_kitchen_length_m, 0),
    door_count: summary.doorCount,
    window_count: summary.windowCount,
    warnings: summary.warnings
  };
}

function createBathroomDraft(payload, summary) {
  const spaces = getSpaces(payload);
  const bathroomArea = sumSpaceArea(spaces, isBathroomSpace) || summary.totalAreaM2 || 4.2;
  const quantityBasis = buildQuantityBasis(summary);
  return {
    customerName: '',
    siteName: summary.projectName || '',
    constructionType: 'bathroom_remodel',
    bathroomCount: Math.max(1, summary.bathroomCount || 1),
    bathroomAreaM2: Math.max(1, Number(bathroomArea.toFixed(2))),
    ceilingHeightMm: 2200,
    demolitionIncluded: false,
    constructionMethod: 'bond',
    waterproofMethod: 'liquid',
    tileWallType: 'ceramic_300x600',
    tileFloorType: 'porcelain_600',
    fixtureGrade: 'basic',
    options: {
      showerBooth: false,
      zenda: false,
      bathtub: false,
      slidingCabinet: false,
      ventilationFanReplace: true,
      lightingReplace: true,
      faucetReplace: true
    },
    lightBimSource: {
      quantityBasis,
      floorAreaM2: summary.totalAreaM2,
      bathroomAreaM2: quantityBasis.bathroom_area_m2 || bathroomArea,
      wallAreaM2: summary.totalWallAreaM2,
      ceilingAreaM2: summary.totalCeilingAreaM2,
      perimeterM: summary.totalPerimeterM,
      tileAreaM2: summary.tileAreaM2,
      bathroomTileAreaM2: quantityBasis.bathroom_tile_area_m2,
      warnings: summary.warnings,
      doorCount: summary.doorCount,
      windowCount: summary.windowCount
    }
  };
}

function createKitchenDraft(payload, summary) {
  const spaces = getSpaces(payload);
  const kitchenSpaces = spaces.filter(isKitchenSpace);
  const kitchenArea = kitchenSpaces.reduce((sum, space) => sum + getArea(space), 0) || summary.totalAreaM2 || 6;
  const kitchenPerimeter = kitchenSpaces.reduce((sum, space) => sum + safeNumber(space.perimeter_m ?? space.perimeterM, 0), 0) || summary.totalPerimeterM;
  const suppliedLengthMm = safeNumber(
    payload?.quantities?.process_quantities?.estimated_kitchen_length_mm ??
    payload?.bocEstimateInput?.estimated_kitchen_length_mm ??
    kitchenSpaces[0]?.estimated_kitchen_length_mm,
    0
  );
  const estimatedLengthMm = Math.max(1800, suppliedLengthMm || Math.round(((kitchenPerimeter || Math.sqrt(kitchenArea) * 2) / 2) * 1000));
  const quantityBasis = buildQuantityBasis(summary);
  quantityBasis.kitchen_length_m = suppliedLengthMm ? suppliedLengthMm / 1000 : estimatedLengthMm / 1000;
  const warnings = suppliedLengthMm
    ? summary.warnings
    : [
      ...summary.warnings,
      {
        code: 'ESTIMATED_KITCHEN_LENGTH',
        severity: 'INFO',
        message: '주방 길이가 직접 입력되지 않아 둘레 기준으로 추정되었습니다.',
        entity_type: 'SPACE',
        entity_id: kitchenSpaces[0]?.id || ''
      }
    ];
  return {
    customerName: '',
    siteName: summary.projectName || '',
    constructionType: 'kitchen_remodel',
    kitchenType: 'straight',
    kitchenLengthMm: estimatedLengthMm,
    ceilingHeightMm: 2300,
    demolitionIncluded: false,
    expansionIncluded: false,
    upperCabinetLengthMm: estimatedLengthMm,
    lowerCabinetLengthMm: estimatedLengthMm,
    tallCabinet: false,
    pantry: false,
    island: false,
    doorFinish: 'pet',
    countertopType: 'artificial_marble',
    handleType: 'exposed',
    customerPriceMultiplier: 1.18,
    options: {
      sinkBowlReplace: true,
      faucetReplace: true,
      hoodReplace: true,
      cooktopReplace: false,
      outletAdd: false,
      indirectLighting: false,
      electricalUpgrade: false,
      wallTile: true,
      floorFinishConnection: true,
      wallpaperConnection: false,
      ceilingFinish: false,
      moldingFinish: true
    },
    lightBimSource: {
      quantityBasis,
      kitchenAreaM2: Number(kitchenArea.toFixed(2)),
      wallAreaM2: summary.totalWallAreaM2,
      perimeterM: kitchenPerimeter,
      estimatedKitchenLengthMm: estimatedLengthMm,
      tileAreaM2: summary.tileAreaM2,
      kitchenWallTileAreaM2: quantityBasis.kitchen_wall_tile_area_m2,
      warnings,
      doorCount: summary.doorCount,
      windowCount: summary.windowCount
    }
  };
}

function createFullDraft(payload, summary) {
  const processQuantities = summary.processQuantities || {};
  const quantityBasis = buildQuantityBasis(summary);
  const spaces = summary.spaces || [];
  const bathroomCount = Math.max(1, summary.bathroomCount || 1);
  const selectedProcesses = {
    bathroom: summary.bathroomCount > 0,
    kitchen: summary.kitchenExists,
    flooring: safeNumber(processQuantities.flooring_area_m2, summary.totalAreaM2) > 0,
    wallpaper: safeNumber(processQuantities.wallpaper_area_m2, 0) > 0,
    painting: safeNumber(processQuantities.painting_area_m2, 0) > 0,
    carpentry: true,
    electrical: true,
    lighting: true,
    film: false,
    windows: summary.windowCount > 0,
    builtInFurniture: false,
    entrance: true,
    balcony: summary.balconyCount > 0
  };

  return {
    customerName: '',
    siteName: summary.projectName || '',
    constructionType: 'full_remodel',
    housingType: 'apartment',
    areaM2: Math.max(20, Number((summary.totalAreaM2 || 79).toFixed(1))),
    areaPyeong: Number(((summary.totalAreaM2 || 79) / 3.3058).toFixed(1)),
    roomCount: Math.max(1, spaces.length - summary.bathroomCount - (summary.kitchenExists ? 1 : 0) - summary.balconyCount),
    bathroomCount,
    kitchenType: 'straight',
    balconyCount: summary.balconyCount || 0,
    constructionScope: 'full_interior',
    demolition: {
      fullDemolition: false,
      bathroomDemolition: summary.bathroomCount > 0,
      kitchenDemolition: summary.kitchenExists,
      floorDemolition: selectedProcesses.flooring,
      ceilingDemolition: false,
      moldingDemolition: true,
      wasteVolumeTon: Math.max(1, Number(((summary.totalAreaM2 || 79) / 35).toFixed(1)))
    },
    selectedProcesses,
    options: {
      bathroom: { count: bathroomCount, tileMethod: 'overlay', waterproofMethod: 'membrane', showerBooth: false, bathtub: false, zenda: false },
      kitchen: { type: 'straight', lengthMm: Math.max(1800, Math.round((summary.totalPerimeterM || 6) * 500)), countertopType: 'artificial_marble', hood: true, cooktop: false, sinkBowl: true },
      flooring: { type: 'engineered_wood', demolitionIncluded: true },
      wallpaper: { type: 'silk', ceilingIncluded: true },
      painting: { doors: false, frames: false, balcony: false, ceiling: false, walls: false },
      carpentry: { ceiling: false, indirectBox: false, artWall: false, molding: true, doorTrim: true },
      electrical: { outletAdd: true, switchReplace: true, panelBoard: false, upgrade: false },
      lighting: { downlight: true, indirect: false, lineLight: false, mainLight: true },
      film: { doors: false, frames: false, sash: false, furniture: false },
      windows: { replacement: false, glassReplacement: false, insulation: false },
      builtInFurniture: { closet: false, shoeCabinet: false, pantry: false, storage: false }
    },
    customerPriceMultiplier: 1.22,
    lightBimSource: {
      quantityBasis,
      floorAreaM2: summary.totalAreaM2,
      bathroomAreaM2: quantityBasis.bathroom_area_m2,
      kitchenAreaM2: quantityBasis.kitchen_area_m2,
      wallAreaM2: summary.totalWallAreaM2,
      ceilingAreaM2: summary.totalCeilingAreaM2,
      perimeterM: summary.totalPerimeterM,
      tileAreaM2: summary.tileAreaM2,
      bathroomTileAreaM2: quantityBasis.bathroom_tile_area_m2,
      kitchenWallTileAreaM2: quantityBasis.kitchen_wall_tile_area_m2,
      doorCount: summary.doorCount,
      windowCount: summary.windowCount,
      spaces: summary.spaces,
      processQuantities: summary.processQuantities,
      warnings: summary.warnings
    }
  };
}

function createEstimateDraftFromLightBIM(payload, estimateTypeOverride = '') {
  const parsed = parseLightBIMJSON(payload);
  const validation = validateLightBIMJSON(parsed);
  if (!validation.ok) throw new Error(validation.errorMessage);
  const estimateType = normalizeEstimateType(estimateTypeOverride) || detectEstimateType(parsed);
  const summary = buildSummary(parsed, estimateType);
  let input;
  if (estimateType === 'BATHROOM') input = createBathroomDraft(parsed, summary);
  else if (estimateType === 'KITCHEN') input = createKitchenDraft(parsed, summary);
  else input = createFullDraft(parsed, summary);

  return {
    estimateType,
    input,
    summary,
    source: 'LIGHTBIM',
    sourceSchema: parsed.schema,
    aiPromptHints: parsed.aiPromptHints || {}
  };
}

function saveLightBIMImportRecord(payload, result) {
  return {
    sourceFileName: payload?.sourceFileName || payload?.source_file_name || '',
    schemaVersion: result?.summary?.schemaVersion || payload?.project?.schema_version || '0.1',
    projectName: result?.summary?.projectName || getProjectName(payload),
    detectedEstimateType: result?.estimateType || '',
    totalAreaM2: result?.summary?.totalAreaM2 || 0,
    spaceCount: result?.summary?.spaceCount || 0,
    rawJson: payload,
    normalizedSummary: result?.summary || {},
    createdEstimateType: result?.estimateType || '',
    createdEstimateId: result?.estimateId || '',
    status: result?.status || 'SUCCESS',
    errorMessage: result?.errorMessage || ''
  };
}

module.exports = {
  validateLightBIMJSON,
  parseLightBIMJSON,
  detectEstimateType,
  createEstimateDraftFromLightBIM,
  saveLightBIMImportRecord
};
