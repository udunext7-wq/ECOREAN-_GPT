const PCE_LABELS_KO = {
  BLOCK: '위험',
  MODIFY: '수정 필요',
  GO: '진행 가능',
  SCALE: '고마진 복제 대상'
};

const {
  resolveQuantity,
  itemQuantityMeta,
  preserveQuantityMeta,
  summarizeQuantitySources
} = require('./lightBimQuantityBinding');

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundWon(value) {
  return Math.round(Number(value || 0));
}

function normalizeBathroomInput(input = {}) {
  return {
    customerName: String(input.customerName || '').trim(),
    siteName: String(input.siteName || '').trim(),
    constructionType: String(input.constructionType || 'bathroom_remodel'),
    bathroomCount: Math.max(1, numberOr(input.bathroomCount, 1)),
    bathroomAreaM2: Math.max(1, numberOr(input.bathroomAreaM2, 4.2)),
    ceilingHeightMm: Math.max(1800, numberOr(input.ceilingHeightMm, 2200)),
    demolitionIncluded: input.demolitionIncluded !== false,
    constructionMethod: String(input.constructionMethod || 'bond'),
    waterproofMethod: String(input.waterproofMethod || 'liquid'),
    tileWallType: String(input.tileWallType || 'ceramic_300x600'),
    tileFloorType: String(input.tileFloorType || 'porcelain_600'),
    fixtureGrade: String(input.fixtureGrade || 'basic'),
    options: {
      showerBooth: Boolean(input.options?.showerBooth),
      zenda: Boolean(input.options?.zenda),
      bathtub: Boolean(input.options?.bathtub),
      slidingCabinet: Boolean(input.options?.slidingCabinet),
      ventilationFanReplace: input.options?.ventilationFanReplace !== false,
      lightingReplace: input.options?.lightingReplace !== false,
      faucetReplace: input.options?.faucetReplace !== false
    },
    customerPriceMultiplier: Math.max(0.3, numberOr(input.customerPriceMultiplier, 1)),
    lightBimSource: input.lightBimSource && typeof input.lightBimSource === 'object' ? input.lightBimSource : null,
    manualQuantityOverrides: input.manualQuantityOverrides || input.quantityOverrides || {}
  };
}

function decidePce(marginRate) {
  if (marginRate < 0.25) return 'BLOCK';
  if (marginRate < 0.3) return 'MODIFY';
  if (marginRate < 0.35) return 'GO';
  return 'SCALE';
}

function tileUnitPrice(type) {
  const map = {
    ceramic_300x600: { customer: 76000, material: 26000, labor: 25000, labelKo: '300x600 벽타일' },
    porcelain_600: { customer: 98000, material: 39000, labor: 31000, labelKo: '600각 포세린/폴리싱' },
    large_tile: { customer: 128000, material: 54000, labor: 43000, labelKo: '대형타일' },
    basic_floor: { customer: 82000, material: 30000, labor: 27000, labelKo: '기본 바닥타일' }
  };
  return map[type] || map.ceramic_300x600;
}

function fixtureUnitPrices(grade) {
  const map = {
    basic: { toilet: 450000, basin: 300000, faucet: 180000, shower: 220000, costRate: 0.62, labelKo: '기본형' },
    mid: { toilet: 650000, basin: 380000, faucet: 260000, shower: 320000, costRate: 0.64, labelKo: '중급형' },
    high: { toilet: 950000, basin: 520000, faucet: 420000, shower: 520000, costRate: 0.67, labelKo: '고급형' }
  };
  return map[grade] || map.basic;
}

function makeItem({ category, itemName, quantity, unit, customerUnitPrice, materialCost = 0, laborCost = 0, subcontractCost = 0, quantityMeta = {} }) {
  const customerTotal = roundWon(quantity * customerUnitPrice);
  const internalTotal = roundWon(materialCost + laborCost + subcontractCost);
  const margin = customerTotal - internalTotal;
  const marginRate = customerTotal > 0 ? Number((margin / customerTotal).toFixed(4)) : 0;
  return {
    category,
    itemName,
    quantity: Number(quantity.toFixed ? quantity.toFixed(2) : quantity),
    unit,
    customerUnitPrice: roundWon(customerUnitPrice),
    customerTotal,
    materialCost: roundWon(materialCost),
    laborCost: roundWon(laborCost),
    subcontractCost: roundWon(subcontractCost),
    internalTotal,
    margin,
    marginRate,
    ...quantityMeta
  };
}

function applyCustomerMultiplier(items, multiplier) {
  return items.map((item) => {
    const customerUnitPrice = roundWon(item.customerUnitPrice * multiplier);
    return makeItem({
      category: item.category,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      customerUnitPrice,
      materialCost: item.materialCost,
      laborCost: item.laborCost,
      subcontractCost: item.subcontractCost,
      quantityMeta: preserveQuantityMeta(item)
    });
  });
}

function calculateBathroomEstimate(rawInput = {}) {
  const input = normalizeBathroomInput(rawInput);
  const defaultFloorArea = input.bathroomAreaM2 * input.bathroomCount;
  const floorAreaQuantity = resolveQuantity(input, 'bathroom_area_m2', defaultFloorArea);
  if (floorAreaQuantity.source === 'DEFAULT') {
    const floorAreaFallback = resolveQuantity(input, 'floor_area_m2', defaultFloorArea);
    if (floorAreaFallback.source !== 'DEFAULT') Object.assign(floorAreaQuantity, floorAreaFallback, { basisKey: 'floor_area_m2' });
  }
  const floorArea = floorAreaQuantity.value;
  const wallAreaQuantity = resolveQuantity(input, 'net_wall_area_m2', floorArea * 3.2);
  const wallArea = wallAreaQuantity.value;
  const ceilingAreaQuantity = resolveQuantity(input, 'ceiling_area_m2', input.bathroomCount);
  const tileAreaQuantity = resolveQuantity(input, 'bathroom_tile_area_m2', floorArea + wallArea);
  if (tileAreaQuantity.source === 'DEFAULT') {
    const tileFallback = resolveQuantity(input, 'tile_area_m2', floorArea + wallArea);
    if (tileFallback.source !== 'DEFAULT') Object.assign(tileAreaQuantity, tileFallback, { basisKey: 'tile_area_m2' });
  }
  const tileArea = tileAreaQuantity.value;
  const items = [];

  if (input.demolitionIncluded) {
    items.push(makeItem({
      category: '철거',
      itemName: '기존 욕실 철거',
      quantity: input.bathroomCount,
      unit: '식',
      customerUnitPrice: input.constructionMethod === 'full_demolition' ? 650000 : 450000,
      laborCost: input.constructionMethod === 'full_demolition' ? 420000 : 280000,
      subcontractCost: input.constructionMethod === 'full_demolition' ? 90000 : 60000
    }));
    items.push(makeItem({
      category: '철거',
      itemName: '폐기물 처리',
      quantity: input.bathroomCount,
      unit: '식',
      customerUnitPrice: 180000,
      subcontractCost: 130000
    }));
  }

  if (input.constructionMethod === 'floating') {
    items.push(makeItem({
      category: '철거',
      itemName: '떠붙임 시공 추가 철거/바탕 정리',
      quantity: input.bathroomCount,
      unit: '식',
      customerUnitPrice: 500000,
      laborCost: 310000,
      subcontractCost: 40000
    }));
  }

  const waterproofExtra = input.waterproofMethod === 'membrane' ? 180000 : input.waterproofMethod === 'elastic' ? 260000 : 0;
    items.push(makeItem({
      category: '방수',
      itemName: '바닥 방수',
      quantity: floorArea,
      unit: '㎡',
      customerUnitPrice: 52000,
      materialCost: floorArea * 15000,
      laborCost: floorArea * 18000,
      quantityMeta: itemQuantityMeta(floorAreaQuantity)
    }));
    items.push(makeItem({
      category: '방수',
      itemName: '벽체 하부 방수',
      quantity: wallArea * 0.35,
      unit: '㎡',
      customerUnitPrice: 36000,
      materialCost: wallArea * 0.35 * 11000,
      laborCost: wallArea * 0.35 * 12000,
      quantityMeta: itemQuantityMeta(wallAreaQuantity)
    }));
  if (waterproofExtra > 0) {
    items.push(makeItem({
      category: '방수',
      itemName: input.waterproofMethod === 'membrane' ? '도막방수 보강' : '탄성방수 보강',
      quantity: input.bathroomCount,
      unit: '식',
      customerUnitPrice: waterproofExtra,
      materialCost: waterproofExtra * 0.42,
      laborCost: waterproofExtra * 0.24
    }));
  }

  const wallTile = tileUnitPrice(input.tileWallType);
  const floorTile = tileUnitPrice(input.tileFloorType);
  items.push(makeItem({
    category: '타일',
    itemName: `벽 타일 - ${wallTile.labelKo}`,
    quantity: wallArea,
    unit: '㎡',
    customerUnitPrice: wallTile.customer,
    materialCost: wallArea * wallTile.material,
    laborCost: wallArea * wallTile.labor,
    quantityMeta: itemQuantityMeta(wallAreaQuantity)
  }));
  items.push(makeItem({
    category: '타일',
    itemName: `바닥 타일 - ${floorTile.labelKo}`,
    quantity: floorArea,
    unit: '㎡',
    customerUnitPrice: floorTile.customer,
    materialCost: floorArea * floorTile.material,
    laborCost: floorArea * floorTile.labor,
    quantityMeta: itemQuantityMeta(floorAreaQuantity)
  }));
  items.push(makeItem({
    category: '타일',
    itemName: '타일 부자재',
    quantity: tileArea,
    unit: '㎡',
    customerUnitPrice: 18000,
    materialCost: tileArea * 9500,
    laborCost: tileArea * 1500,
    quantityMeta: itemQuantityMeta(tileAreaQuantity)
  }));
  items.push(makeItem({
    category: '타일',
    itemName: '줄눈',
    quantity: tileArea,
    unit: '㎡',
    customerUnitPrice: 12000,
    materialCost: tileArea * 3500,
    laborCost: tileArea * 4500,
    quantityMeta: itemQuantityMeta(tileAreaQuantity)
  }));

  const fixture = fixtureUnitPrices(input.fixtureGrade);
  items.push(makeItem({
    category: '설비',
    itemName: `양변기 - ${fixture.labelKo}`,
    quantity: input.bathroomCount,
    unit: '대',
    customerUnitPrice: fixture.toilet,
    materialCost: fixture.toilet * fixture.costRate,
    laborCost: 60000
  }));
  items.push(makeItem({
    category: '설비',
    itemName: `세면기 - ${fixture.labelKo}`,
    quantity: input.bathroomCount,
    unit: '대',
    customerUnitPrice: fixture.basin,
    materialCost: fixture.basin * fixture.costRate,
    laborCost: 60000
  }));
  if (input.options.faucetReplace) {
    items.push(makeItem({
      category: '설비',
      itemName: `수전 - ${fixture.labelKo}`,
      quantity: input.bathroomCount,
      unit: '개',
      customerUnitPrice: fixture.faucet,
      materialCost: fixture.faucet * fixture.costRate,
      laborCost: 35000
    }));
    items.push(makeItem({
      category: '설비',
      itemName: `샤워수전 - ${fixture.labelKo}`,
      quantity: input.bathroomCount,
      unit: '개',
      customerUnitPrice: fixture.shower,
      materialCost: fixture.shower * fixture.costRate,
      laborCost: 45000
    }));
  }
  items.push(makeItem({
    category: '설비',
    itemName: '배수 부속',
    quantity: input.bathroomCount,
    unit: '식',
    customerUnitPrice: 100000,
    materialCost: 55000,
    laborCost: 25000
  }));

  items.push(makeItem({
    category: '천장/전기',
    itemName: '욕실 천장',
    quantity: ceilingAreaQuantity.source === 'DEFAULT' ? input.bathroomCount : ceilingAreaQuantity.value,
    unit: ceilingAreaQuantity.source === 'DEFAULT' ? '식' : '㎡',
    customerUnitPrice: ceilingAreaQuantity.source === 'DEFAULT' ? 700000 : 155000,
    materialCost: ceilingAreaQuantity.source === 'DEFAULT' ? 310000 : ceilingAreaQuantity.value * 62000,
    laborCost: ceilingAreaQuantity.source === 'DEFAULT' ? 180000 : ceilingAreaQuantity.value * 41000,
    quantityMeta: itemQuantityMeta(ceilingAreaQuantity)
  }));
  if (input.options.lightingReplace) {
    items.push(makeItem({
      category: '천장/전기',
      itemName: '조명',
      quantity: input.bathroomCount,
      unit: '식',
      customerUnitPrice: 150000,
      materialCost: 65000,
      laborCost: 30000
    }));
  }
  if (input.options.ventilationFanReplace) {
    items.push(makeItem({
      category: '천장/전기',
      itemName: '환풍기',
      quantity: input.bathroomCount,
      unit: '대',
      customerUnitPrice: 150000,
      materialCost: 70000,
      laborCost: 30000
    }));
  }

  if (input.options.showerBooth) {
    items.push(makeItem({ category: '옵션', itemName: '샤워부스', quantity: input.bathroomCount, unit: '식', customerUnitPrice: 300000, materialCost: 190000, laborCost: 30000 }));
  }
  if (input.options.zenda) {
    items.push(makeItem({ category: '옵션', itemName: '젠다이', quantity: input.bathroomCount, unit: '식', customerUnitPrice: 350000, materialCost: 210000, laborCost: 40000 }));
  }
  if (input.options.bathtub) {
    items.push(makeItem({ category: '옵션', itemName: '욕조', quantity: input.bathroomCount, unit: '대', customerUnitPrice: 800000, materialCost: 500000, laborCost: 90000 }));
  }
  if (input.options.slidingCabinet) {
    items.push(makeItem({ category: '옵션', itemName: '슬라이딩장', quantity: input.bathroomCount, unit: '대', customerUnitPrice: 350000, materialCost: 220000, laborCost: 30000 }));
  }

  items.push(makeItem({ category: '마감', itemName: '실리콘', quantity: input.bathroomCount, unit: '식', customerUnitPrice: 120000, materialCost: 35000, laborCost: 35000 }));
  items.push(makeItem({ category: '마감', itemName: '청소', quantity: input.bathroomCount, unit: '식', customerUnitPrice: 150000, laborCost: 100000 }));
  items.push(makeItem({ category: '마감', itemName: '검수', quantity: input.bathroomCount, unit: '식', customerUnitPrice: 80000, laborCost: 40000 }));

  const adjustedItems = applyCustomerMultiplier(items, input.customerPriceMultiplier);
  const revenue = roundWon(adjustedItems.reduce((sum, item) => sum + item.customerTotal, 0));
  const materialCost = roundWon(adjustedItems.reduce((sum, item) => sum + item.materialCost, 0));
  const laborCost = roundWon(adjustedItems.reduce((sum, item) => sum + item.laborCost, 0));
  const subcontractCost = roundWon(adjustedItems.reduce((sum, item) => sum + item.subcontractCost, 0));
  const totalCost = roundWon(materialCost + laborCost + subcontractCost);
  const expectedMargin = revenue - totalCost;
  const expectedMarginRate = revenue > 0 ? Number((expectedMargin / revenue).toFixed(4)) : 0;
  const pceDecision = decidePce(expectedMarginRate);

  return {
    input,
    revenue,
    material_cost: materialCost,
    labor_cost: laborCost,
    subcontract_cost: subcontractCost,
    total_cost: totalCost,
    expected_margin: expectedMargin,
    expected_margin_rate: expectedMarginRate,
    pce_decision: pceDecision,
    pce_label_ko: PCE_LABELS_KO[pceDecision],
    quantity_source_summary: summarizeQuantitySources(adjustedItems),
    line_items: adjustedItems
  };
}

function buildCustomerEstimateView(estimate) {
  const grouped = new Map();
  for (const item of estimate.line_items || []) {
    const current = grouped.get(item.category) || 0;
    grouped.set(item.category, current + Number(item.customerTotal || 0));
  }
  return {
    customerName: estimate.input.customerName,
    siteName: estimate.input.siteName,
    groups: Array.from(grouped.entries()).map(([category, customerTotal]) => ({ category, customerTotal: roundWon(customerTotal) })),
    totalCustomerPrice: estimate.revenue,
    noteKo: '고객용 견적서는 내부 원가와 마진을 표시하지 않습니다.'
  };
}

function buildInternalCostView(estimate) {
  return {
    totals: {
      revenue: estimate.revenue,
      materialCost: estimate.material_cost,
      laborCost: estimate.labor_cost,
      subcontractCost: estimate.subcontract_cost,
      totalCost: estimate.total_cost,
      expectedMargin: estimate.expected_margin,
      expectedMarginRate: estimate.expected_margin_rate,
      pceDecision: estimate.pce_decision,
      pceLabelKo: estimate.pce_label_ko
    },
    lineItems: estimate.line_items
  };
}

module.exports = {
  calculateBathroomEstimate,
  buildCustomerEstimateView,
  buildInternalCostView,
  decidePce
};
