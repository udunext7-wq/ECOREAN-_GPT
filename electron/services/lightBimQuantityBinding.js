'use strict';

const QUANTITY_SOURCE = {
  USER: 'USER',
  LIGHTBIM: 'LIGHTBIM',
  DEFAULT: 'DEFAULT'
};

const SOURCE_LABEL_KO = {
  USER: '사용자 수정',
  LIGHTBIM: 'LightBIM 도면 수량',
  DEFAULT: '기본 산식'
};

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function positiveNumber(value) {
  const parsed = safeNumber(value, 0);
  return parsed > 0 ? parsed : 0;
}

function roundQuantity(value, precision = 2) {
  const parsed = safeNumber(value, 0);
  const factor = 10 ** precision;
  return Math.round(parsed * factor) / factor;
}

function firstPositive(...values) {
  for (const value of values) {
    const parsed = positiveNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function getRawQuantityBasis(lightBimSource = {}) {
  if (!lightBimSource || typeof lightBimSource !== 'object') return {};
  const direct = lightBimSource.quantity_basis || lightBimSource.quantityBasis || {};
  const process = lightBimSource.processQuantities || lightBimSource.process_quantities || {};
  const kitchenLengthM = firstPositive(
    direct.kitchen_length_m,
    direct.estimated_kitchen_length_m,
    lightBimSource.kitchenLengthM,
    lightBimSource.estimatedKitchenLengthM,
    positiveNumber(lightBimSource.estimatedKitchenLengthMm) / 1000
  );

  return {
    ...direct,
    total_area_m2: firstPositive(direct.total_area_m2, direct.floor_area_m2, lightBimSource.floorAreaM2, lightBimSource.kitchenAreaM2),
    flooring_area_m2: firstPositive(direct.flooring_area_m2, process.flooring_area_m2, lightBimSource.flooringAreaM2),
    floor_area_m2: firstPositive(direct.floor_area_m2, process.flooring_area_m2, lightBimSource.floorAreaM2, lightBimSource.kitchenAreaM2),
    bathroom_area_m2: firstPositive(direct.bathroom_area_m2, lightBimSource.bathroomAreaM2),
    kitchen_area_m2: firstPositive(direct.kitchen_area_m2, lightBimSource.kitchenAreaM2),
    ceiling_area_m2: firstPositive(direct.ceiling_area_m2, process.ceiling_area_m2, lightBimSource.ceilingAreaM2),
    net_wall_area_m2: firstPositive(direct.net_wall_area_m2, lightBimSource.wallAreaM2),
    wall_area_m2: firstPositive(direct.wall_area_m2, direct.net_wall_area_m2, lightBimSource.wallAreaM2),
    wallpaper_area_m2: firstPositive(direct.wallpaper_area_m2, process.wallpaper_area_m2),
    painting_area_m2: firstPositive(direct.painting_area_m2, process.painting_area_m2),
    tile_area_m2: firstPositive(direct.tile_area_m2, process.tile_area_m2, lightBimSource.tileAreaM2),
    bathroom_tile_area_m2: firstPositive(direct.bathroom_tile_area_m2, process.bathroom_tile_area_m2, lightBimSource.bathroomTileAreaM2),
    kitchen_wall_tile_area_m2: firstPositive(direct.kitchen_wall_tile_area_m2, process.kitchen_wall_tile_area_m2, lightBimSource.kitchenWallTileAreaM2),
    baseboard_length_m: firstPositive(direct.baseboard_length_m, process.baseboard_length_m),
    molding_length_m: firstPositive(direct.molding_length_m, process.molding_length_m),
    perimeter_m: firstPositive(direct.perimeter_m, lightBimSource.perimeterM),
    kitchen_length_m: kitchenLengthM,
    door_count: firstPositive(direct.door_count, lightBimSource.doorCount),
    window_count: firstPositive(direct.window_count, lightBimSource.windowCount),
    warnings: Array.isArray(direct.warnings) ? direct.warnings : Array.isArray(lightBimSource.warnings) ? lightBimSource.warnings : []
  };
}

function getManualOverrides(input = {}) {
  return input.manualQuantityOverrides || input.quantityOverrides || {};
}

function resolveQuantity(input, basisKey, defaultValue, options = {}) {
  const overrideKey = options.overrideKey || basisKey;
  const overrides = getManualOverrides(input);
  const userValue = positiveNumber(overrides[overrideKey]);
  const basis = getRawQuantityBasis(input.lightBimSource);
  const lightBimValue = positiveNumber(basis[basisKey]);

  if (userValue > 0) {
    return {
      value: roundQuantity(userValue),
      source: QUANTITY_SOURCE.USER,
      sourceLabelKo: SOURCE_LABEL_KO.USER,
      basisKey,
      note: options.userNote || '사용자가 수정한 수량 기준',
      originalLightBimQuantity: lightBimValue || null,
      userQuantityOverride: userValue
    };
  }

  if (lightBimValue > 0) {
    return {
      value: roundQuantity(lightBimValue),
      source: QUANTITY_SOURCE.LIGHTBIM,
      sourceLabelKo: SOURCE_LABEL_KO.LIGHTBIM,
      basisKey,
      note: options.lightBimNote || 'LightBIM 도면 수량 기준',
      originalLightBimQuantity: lightBimValue,
      userQuantityOverride: null
    };
  }

  return {
    value: roundQuantity(defaultValue),
    source: QUANTITY_SOURCE.DEFAULT,
    sourceLabelKo: SOURCE_LABEL_KO.DEFAULT,
    basisKey,
    note: options.defaultNote || '기본 산식 기준',
    originalLightBimQuantity: null,
    userQuantityOverride: null
  };
}

function itemQuantityMeta(resolved) {
  return {
    quantitySource: resolved.source,
    quantity_source: resolved.source,
    quantitySourceKo: resolved.sourceLabelKo,
    quantity_basis_key: resolved.basisKey,
    quantityBasisKey: resolved.basisKey,
    quantity_note: resolved.note,
    quantityNote: resolved.note,
    original_lightbim_quantity: resolved.originalLightBimQuantity,
    originalLightBimQuantity: resolved.originalLightBimQuantity,
    user_quantity_override: resolved.userQuantityOverride,
    userQuantityOverride: resolved.userQuantityOverride
  };
}

function preserveQuantityMeta(item = {}) {
  return {
    quantitySource: item.quantitySource,
    quantity_source: item.quantity_source,
    quantitySourceKo: item.quantitySourceKo,
    quantity_basis_key: item.quantity_basis_key,
    quantityBasisKey: item.quantityBasisKey,
    quantity_note: item.quantity_note,
    quantityNote: item.quantityNote,
    original_lightbim_quantity: item.original_lightbim_quantity,
    originalLightBimQuantity: item.originalLightBimQuantity,
    user_quantity_override: item.user_quantity_override,
    userQuantityOverride: item.userQuantityOverride
  };
}

function summarizeQuantitySources(items = []) {
  const summary = {
    lightbim_bound_item_count: 0,
    default_item_count: 0,
    user_override_count: 0,
    applied_quantity_keys: []
  };
  const keys = new Set();
  for (const item of items) {
    const source = item.quantity_source || item.quantitySource || QUANTITY_SOURCE.DEFAULT;
    if (source === QUANTITY_SOURCE.LIGHTBIM) summary.lightbim_bound_item_count += 1;
    else if (source === QUANTITY_SOURCE.USER) summary.user_override_count += 1;
    else summary.default_item_count += 1;
    const key = item.quantity_basis_key || item.quantityBasisKey;
    if (key && source !== QUANTITY_SOURCE.DEFAULT) keys.add(key);
  }
  summary.applied_quantity_keys = Array.from(keys);
  return summary;
}

module.exports = {
  QUANTITY_SOURCE,
  SOURCE_LABEL_KO,
  safeNumber,
  positiveNumber,
  roundQuantity,
  firstPositive,
  getRawQuantityBasis,
  resolveQuantity,
  itemQuantityMeta,
  preserveQuantityMeta,
  summarizeQuantitySources
};
