'use strict';

const SOURCE_LABEL_KO = {
  USER_REVIEW: '사용자 검토 수량',
  LIGHTBIM_REVIEWED: '검토 완료 LightBIM 수량',
  LIGHTBIM: 'LightBIM 도면 수량',
  ESTIMATE: '견적 수량',
  DEFAULT: '기본 산식'
};

const PRODUCTIVITY = {
  tile_area_m2: { rate: 15, unit: '㎡/일' },
  bathroom_tile_area_m2: { rate: 15, unit: '㎡/일' },
  kitchen_wall_tile_area_m2: { rate: 15, unit: '㎡/일' },
  wallpaper_area_m2: { rate: 40, unit: '㎡/일' },
  painting_area_m2: { rate: 35, unit: '㎡/일' },
  flooring_area_m2: { rate: 35, unit: '㎡/일' },
  ceiling_area_m2: { rate: 30, unit: '㎡/일' },
  baseboard_length_m: { rate: 40, unit: 'm/일' },
  molding_length_m: { rate: 35, unit: 'm/일' },
  door_count: { rate: 4, unit: '개/일' },
  window_count: { rate: 4, unit: '개/일' }
};

const WASTE_FACTORS = {
  tile: 1.1,
  wallpaper: 1.08,
  flooring: 1.05,
  paint: 1.1,
  ceiling: 1.05,
  lengthFinish: 1.05
};

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundQuantity(value) {
  return Math.round(safeNumber(value, 0) * 1000) / 1000;
}

function addDays(dateText, days) {
  const date = new Date(dateText);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function sourceLabelKo(source) {
  return SOURCE_LABEL_KO[source] || SOURCE_LABEL_KO.DEFAULT;
}

function basisKeysForText(text) {
  if (/타일/.test(text) && /주방/.test(text)) return ['kitchen_wall_tile_area_m2', 'tile_area_m2'];
  if (/타일/.test(text) && /욕실/.test(text)) return ['bathroom_tile_area_m2', 'tile_area_m2'];
  if (/욕실/.test(text)) return ['bathroom_tile_area_m2', 'tile_area_m2'];
  if (/주방/.test(text)) return ['kitchen_wall_tile_area_m2'];
  if (/타일/.test(text)) return ['bathroom_tile_area_m2', 'tile_area_m2', 'kitchen_wall_tile_area_m2'];
  if (/도배|벽지/.test(text)) return ['wallpaper_area_m2'];
  if (/도장|페인트/.test(text)) return ['painting_area_m2'];
  if (/바닥재|바닥/.test(text) && !/철거/.test(text)) return ['flooring_area_m2'];
  if (/천장/.test(text)) return ['ceiling_area_m2'];
  if (/걸레받이/.test(text)) return ['baseboard_length_m'];
  if (/몰딩/.test(text)) return ['molding_length_m'];
  if (/창호|창문/.test(text)) return ['window_count'];
  if (/문|도어|필름/.test(text)) return ['door_count'];
  return [];
}

function pickBasis(context, keys) {
  for (const key of keys) {
    const item = context?.basis?.[key];
    if (item && safeNumber(item.quantity, 0) > 0) return item;
  }
  return null;
}

function quantityBindingForProcess(processName, context) {
  return pickBasis(context, basisKeysForText(String(processName || '')));
}

function recalculateScheduleDates(schedule) {
  let cursor = schedule.startDate;
  schedule.items = schedule.items.map((item) => {
    const startDate = cursor;
    const endDate = addDays(startDate, Number(item.durationDays || 1) - 1);
    cursor = addDays(endDate, 1);
    return { ...item, startDate, endDate };
  });
  schedule.endDate = schedule.items[schedule.items.length - 1]?.endDate || schedule.startDate;
  schedule.durationDays = schedule.items.reduce((sum, item) => sum + Number(item.durationDays || 0), 0);
  return schedule;
}

function applyQuantityAwareSchedule(schedule, quantityContext = {}) {
  const items = schedule.items.map((item) => {
    const binding = quantityBindingForProcess(item.processName, quantityContext);
    if (!binding) return item;
    const productivity = PRODUCTIVITY[binding.quantityBasisKey];
    if (!productivity) return item;
    const durationDays = Math.max(1, Math.ceil(safeNumber(binding.quantity, 0) / productivity.rate));
    return {
      ...item,
      durationDays,
      quantity: roundQuantity(binding.quantity),
      unit: binding.unit || (binding.quantityBasisKey.endsWith('_m') ? 'm' : '㎡'),
      quantitySource: binding.quantitySource,
      quantity_source: binding.quantitySource,
      productivityRate: productivity.rate,
      productivity_rate: productivity.rate,
      durationBasisNote: `${sourceLabelKo(binding.quantitySource)} ${roundQuantity(binding.quantity)}${binding.unit || '㎡'} 기준, ${productivity.rate}${productivity.unit} 생산성으로 산정`,
      duration_basis_note: `${sourceLabelKo(binding.quantitySource)} ${roundQuantity(binding.quantity)}${binding.unit || '㎡'} 기준, ${productivity.rate}${productivity.unit} 생산성으로 산정`
    };
  });
  return recalculateScheduleDates({
    ...schedule,
    items,
    quantitySummary: {
      ...(quantityContext.summary || {}),
      generated_schedule_item_count: items.length
    }
  });
}

function wasteFactorForItem(item, basisKey) {
  const text = `${item.specification || ''} ${item.itemName || ''}`;
  if (/tile/.test(basisKey) || /타일/.test(text)) return WASTE_FACTORS.tile;
  if (basisKey === 'wallpaper_area_m2' || /도배|벽지/.test(text)) return WASTE_FACTORS.wallpaper;
  if (basisKey === 'flooring_area_m2' || /바닥재/.test(text)) return WASTE_FACTORS.flooring;
  if (basisKey === 'painting_area_m2' || /도장|페인트/.test(text)) return WASTE_FACTORS.paint;
  if (basisKey === 'ceiling_area_m2' || /천장/.test(text)) return WASTE_FACTORS.ceiling;
  if (basisKey === 'baseboard_length_m' || basisKey === 'molding_length_m' || /걸레받이|몰딩/.test(text)) return WASTE_FACTORS.lengthFinish;
  return 1;
}

function applyQuantityAwarePurchaseOrder(purchaseOrder, executionItems = [], quantityContext = {}) {
  const byName = new Map(executionItems.map((item) => [item.itemName, item]));
  const items = purchaseOrder.items.map((item) => {
    const estimateItem = byName.get(item.itemName);
    const keys = estimateItem?.quantity_basis_key ? [estimateItem.quantity_basis_key] : basisKeysForText(`${item.specification} ${item.itemName}`);
    const binding = pickBasis(quantityContext, keys);
    if (!binding) {
      return {
        ...item,
        baseQuantity: item.quantity,
        base_quantity: item.quantity,
        orderQuantity: item.quantity,
        order_quantity: item.quantity,
        wasteFactor: 1,
        waste_factor: 1,
        quantitySource: estimateItem?.executionQuantitySource || 'ESTIMATE',
        quantity_source: estimateItem?.executionQuantitySource || 'ESTIMATE',
        quantityBasisKey: estimateItem?.quantity_basis_key || '',
        quantity_basis_key: estimateItem?.quantity_basis_key || '',
        quantityNote: '견적 수량 기준',
        quantity_note: '견적 수량 기준'
      };
    }
    const wasteFactor = wasteFactorForItem(item, binding.quantityBasisKey);
    const baseQuantity = roundQuantity(binding.quantity);
    const orderQuantity = roundQuantity(baseQuantity * wasteFactor);
    const expectedTotal = Math.round(safeNumber(item.expectedUnitPrice, 0) * orderQuantity);
    return {
      ...item,
      quantity: orderQuantity,
      baseQuantity,
      base_quantity: baseQuantity,
      orderQuantity,
      order_quantity: orderQuantity,
      wasteFactor,
      waste_factor: wasteFactor,
      quantitySource: binding.quantitySource,
      quantity_source: binding.quantitySource,
      quantityBasisKey: binding.quantityBasisKey,
      quantity_basis_key: binding.quantityBasisKey,
      quantityNote: `${sourceLabelKo(binding.quantitySource)} 기준 / 할증 ${(wasteFactor * 100 - 100).toFixed(0)}%`,
      quantity_note: `${sourceLabelKo(binding.quantitySource)} 기준 / 할증 ${(wasteFactor * 100 - 100).toFixed(0)}%`,
      expectedTotal,
      notes: `${item.notes || ''} ${sourceLabelKo(binding.quantitySource)} 기준 발주.`.trim()
    };
  });
  return {
    ...purchaseOrder,
    items,
    totalAmount: items.reduce((sum, item) => sum + safeNumber(item.expectedTotal, 0), 0),
    quantitySummary: {
      ...(quantityContext.summary || {}),
      generated_purchase_order_item_count: items.length
    }
  };
}

module.exports = {
  SOURCE_LABEL_KO,
  PRODUCTIVITY,
  WASTE_FACTORS,
  sourceLabelKo,
  basisKeysForText,
  applyQuantityAwareSchedule,
  applyQuantityAwarePurchaseOrder
};
