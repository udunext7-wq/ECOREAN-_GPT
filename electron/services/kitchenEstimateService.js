const PCE_LABELS_KO = {
  BLOCK: '위험',
  MODIFY: '수정 필요',
  GO: '진행 가능',
  SCALE: '고마진 복제 대상'
};

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundWon(value) {
  return Math.round(Number(value || 0));
}

function normalizeKitchenInput(input = {}) {
  return {
    customerName: String(input.customerName || '').trim(),
    siteName: String(input.siteName || '').trim(),
    constructionType: 'kitchen_remodel',
    kitchenType: String(input.kitchenType || 'straight'),
    kitchenLengthMm: Math.max(1200, numberOr(input.kitchenLengthMm, 3000)),
    ceilingHeightMm: Math.max(1800, numberOr(input.ceilingHeightMm, 2300)),
    demolitionIncluded: input.demolitionIncluded !== false,
    expansionIncluded: Boolean(input.expansionIncluded),
    upperCabinetLengthMm: Math.max(0, numberOr(input.upperCabinetLengthMm, input.kitchenLengthMm || 3000)),
    lowerCabinetLengthMm: Math.max(0, numberOr(input.lowerCabinetLengthMm, input.kitchenLengthMm || 3000)),
    tallCabinet: Boolean(input.tallCabinet),
    pantry: Boolean(input.pantry),
    island: Boolean(input.island),
    doorFinish: String(input.doorFinish || 'pet'),
    countertopType: String(input.countertopType || 'artificial_marble'),
    handleType: String(input.handleType || 'exposed'),
    options: {
      sinkBowlReplace: input.options?.sinkBowlReplace !== false,
      faucetReplace: input.options?.faucetReplace !== false,
      hoodReplace: input.options?.hoodReplace !== false,
      cooktopReplace: Boolean(input.options?.cooktopReplace),
      outletAdd: Boolean(input.options?.outletAdd),
      indirectLighting: Boolean(input.options?.indirectLighting),
      electricalUpgrade: Boolean(input.options?.electricalUpgrade),
      wallTile: input.options?.wallTile !== false,
      floorFinishConnection: input.options?.floorFinishConnection !== false,
      wallpaperConnection: Boolean(input.options?.wallpaperConnection),
      ceilingFinish: Boolean(input.options?.ceilingFinish),
      moldingFinish: input.options?.moldingFinish !== false
    },
    customerPriceMultiplier: Math.max(0.3, numberOr(input.customerPriceMultiplier, 1))
  };
}

function decidePce(marginRate) {
  if (marginRate < 0.25) return 'BLOCK';
  if (marginRate < 0.3) return 'MODIFY';
  if (marginRate < 0.35) return 'GO';
  return 'SCALE';
}

const doorFinishPrice = {
  pet: { customer: 560000, cost: 335000, labelKo: 'PET' },
  uv: { customer: 640000, cost: 395000, labelKo: 'UV' },
  painted: { customer: 820000, cost: 540000, labelKo: '도장' },
  matte: { customer: 720000, cost: 455000, labelKo: '무광' }
};

const countertopPrice = {
  artificial_marble: { customer: 360000, cost: 210000, labelKo: '인조대리석' },
  ceramic: { customer: 780000, cost: 530000, labelKo: '세라믹' },
  engineered_stone: { customer: 620000, cost: 410000, labelKo: '엔지니어드 스톤' }
};

function kitchenShapeFactor(type) {
  return { straight: 1, l_shape: 1.15, u_shape: 1.32, island: 1.45 }[type] || 1;
}

function makeItem({ category, itemName, quantity, unit, customerUnitPrice, materialCost = 0, laborCost = 0, subcontractCost = 0 }) {
  const customerTotal = roundWon(quantity * customerUnitPrice);
  const internalTotal = roundWon(materialCost + laborCost + subcontractCost);
  const margin = customerTotal - internalTotal;
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
    marginRate: customerTotal > 0 ? Number((margin / customerTotal).toFixed(4)) : 0
  };
}

function applyCustomerMultiplier(items, multiplier) {
  return items.map((item) => makeItem({
    category: item.category,
    itemName: item.itemName,
    quantity: item.quantity,
    unit: item.unit,
    customerUnitPrice: item.customerUnitPrice * multiplier,
    materialCost: item.materialCost,
    laborCost: item.laborCost,
    subcontractCost: item.subcontractCost
  }));
}

function calculateKitchenEstimate(rawInput = {}) {
  const input = normalizeKitchenInput(rawInput);
  const items = [];
  const shapeFactor = kitchenShapeFactor(input.kitchenType);
  const lowerM = (input.lowerCabinetLengthMm / 1000) * shapeFactor;
  const upperM = (input.upperCabinetLengthMm / 1000) * shapeFactor;
  const counterM = lowerM + (input.island ? 1.8 : 0);
  const door = doorFinishPrice[input.doorFinish] || doorFinishPrice.pet;
  const counter = countertopPrice[input.countertopType] || countertopPrice.artificial_marble;

  if (input.demolitionIncluded) {
    items.push(makeItem({ category: '철거', itemName: '기존 주방 철거', quantity: 1, unit: '식', customerUnitPrice: 650000, laborCost: 360000, subcontractCost: 120000 }));
    items.push(makeItem({ category: '철거', itemName: '폐기물 처리', quantity: 1, unit: '식', customerUnitPrice: 260000, subcontractCost: 180000 }));
  }
  if (input.expansionIncluded) {
    items.push(makeItem({ category: '철거', itemName: '확장부 정리/보강', quantity: 1, unit: '식', customerUnitPrice: 900000, materialCost: 180000, laborCost: 420000, subcontractCost: 120000 }));
  }

  items.push(makeItem({ category: '가구', itemName: `상부장 - ${door.labelKo}`, quantity: upperM, unit: 'm', customerUnitPrice: door.customer * 0.72, materialCost: upperM * door.cost * 0.72, laborCost: upperM * 85000 }));
  items.push(makeItem({ category: '가구', itemName: `하부장 - ${door.labelKo}`, quantity: lowerM, unit: 'm', customerUnitPrice: door.customer, materialCost: lowerM * door.cost, laborCost: lowerM * 105000 }));
  if (input.tallCabinet) items.push(makeItem({ category: '가구', itemName: '키큰장', quantity: 1, unit: '개', customerUnitPrice: 850000, materialCost: 520000, laborCost: 90000 }));
  if (input.pantry) items.push(makeItem({ category: '가구', itemName: '팬트리장', quantity: 1, unit: '개', customerUnitPrice: 780000, materialCost: 480000, laborCost: 85000 }));
  if (input.island) items.push(makeItem({ category: '가구', itemName: '아일랜드장', quantity: 1, unit: '식', customerUnitPrice: 1250000, materialCost: 760000, laborCost: 160000 }));
  if (input.handleType === 'hidden') items.push(makeItem({ category: '가구', itemName: '히든 손잡이/하드웨어', quantity: lowerM + upperM, unit: 'm', customerUnitPrice: 85000, materialCost: (lowerM + upperM) * 42000, laborCost: (lowerM + upperM) * 12000 }));
  else items.push(makeItem({ category: '가구', itemName: '노출형 손잡이/하드웨어', quantity: lowerM + upperM, unit: 'm', customerUnitPrice: 45000, materialCost: (lowerM + upperM) * 22000, laborCost: (lowerM + upperM) * 8000 }));

  items.push(makeItem({ category: '상판', itemName: counter.labelKo, quantity: counterM, unit: 'm', customerUnitPrice: counter.customer, materialCost: counterM * counter.cost, laborCost: counterM * 65000 }));
  if (input.countertopType === 'ceramic') items.push(makeItem({ category: '상판', itemName: '세라믹 상판 보강', quantity: counterM, unit: 'm', customerUnitPrice: 120000, materialCost: counterM * 52000, laborCost: counterM * 28000 }));

  if (input.options.sinkBowlReplace) items.push(makeItem({ category: '설비', itemName: '싱크볼', quantity: 1, unit: '개', customerUnitPrice: 280000, materialCost: 170000, laborCost: 50000 }));
  if (input.options.faucetReplace) items.push(makeItem({ category: '설비', itemName: '주방 수전', quantity: 1, unit: '개', customerUnitPrice: 260000, materialCost: 160000, laborCost: 45000 }));
  items.push(makeItem({ category: '설비', itemName: '배관 연결/트랩', quantity: 1, unit: '식', customerUnitPrice: 220000, materialCost: 65000, laborCost: 95000 }));

  if (input.options.hoodReplace) items.push(makeItem({ category: '전기', itemName: '후드 교체', quantity: 1, unit: '대', customerUnitPrice: 380000, materialCost: 240000, laborCost: 60000 }));
  if (input.options.cooktopReplace) items.push(makeItem({ category: '전기', itemName: '쿡탑 교체', quantity: 1, unit: '대', customerUnitPrice: 450000, materialCost: 300000, laborCost: 55000 }));
  if (input.options.outletAdd) items.push(makeItem({ category: '전기', itemName: '콘센트 추가', quantity: 2, unit: '구', customerUnitPrice: 85000, materialCost: 35000, laborCost: 90000 }));
  if (input.options.indirectLighting) items.push(makeItem({ category: '전기', itemName: '간접조명', quantity: lowerM + upperM, unit: 'm', customerUnitPrice: 95000, materialCost: (lowerM + upperM) * 38000, laborCost: (lowerM + upperM) * 22000 }));
  if (input.options.electricalUpgrade) items.push(makeItem({ category: '전기', itemName: '전기 증설', quantity: 1, unit: '식', customerUnitPrice: 450000, materialCost: 120000, laborCost: 220000 }));

  if (input.options.wallTile) items.push(makeItem({ category: '마감', itemName: '주방 벽타일', quantity: Math.max(3, lowerM * 1.2), unit: '㎡', customerUnitPrice: 125000, materialCost: Math.max(3, lowerM * 1.2) * 52000, laborCost: Math.max(3, lowerM * 1.2) * 36000 }));
  if (input.options.floorFinishConnection) items.push(makeItem({ category: '마감', itemName: '바닥 연결 마감', quantity: 1, unit: '식', customerUnitPrice: 180000, materialCost: 65000, laborCost: 70000 }));
  if (input.options.wallpaperConnection) items.push(makeItem({ category: '마감', itemName: '도배 연계', quantity: 1, unit: '식', customerUnitPrice: 220000, materialCost: 80000, laborCost: 95000 }));
  if (input.options.ceilingFinish) items.push(makeItem({ category: '마감', itemName: '천장 마감', quantity: 1, unit: '식', customerUnitPrice: 360000, materialCost: 140000, laborCost: 140000 }));
  if (input.options.moldingFinish) items.push(makeItem({ category: '마감', itemName: '몰딩 마감', quantity: 1, unit: '식', customerUnitPrice: 160000, materialCost: 55000, laborCost: 65000 }));

  items.push(makeItem({ category: '기타', itemName: '운반/양중', quantity: 1, unit: '식', customerUnitPrice: 260000, subcontractCost: 180000 }));
  items.push(makeItem({ category: '기타', itemName: '청소/검수', quantity: 1, unit: '식', customerUnitPrice: 180000, laborCost: 90000 }));

  const multiplied = applyCustomerMultiplier(items, input.customerPriceMultiplier);
  const revenue = multiplied.reduce((sum, item) => sum + item.customerTotal, 0);
  const materialCost = multiplied.reduce((sum, item) => sum + item.materialCost, 0);
  const laborCost = multiplied.reduce((sum, item) => sum + item.laborCost, 0);
  const subcontractCost = multiplied.reduce((sum, item) => sum + item.subcontractCost, 0);
  const totalCost = materialCost + laborCost + subcontractCost;
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
    schedule_days: suggestKitchenDuration(input),
    line_items: multiplied
  };
}

function suggestKitchenDuration(input) {
  let days = 5;
  if (input.demolitionIncluded) days += 1;
  if (input.expansionIncluded) days += 2;
  if (input.kitchenType === 'u_shape' || input.kitchenType === 'island') days += 1;
  if (input.countertopType === 'ceramic') days += 1;
  if (input.options.indirectLighting || input.options.electricalUpgrade) days += 1;
  return Math.min(12, days);
}

function buildCustomerKitchenEstimateView(estimate) {
  const groups = new Map();
  estimate.line_items.forEach((item) => {
    const current = groups.get(item.category) || { category: item.category, customerTotal: 0 };
    current.customerTotal += item.customerTotal;
    groups.set(item.category, current);
  });
  return { groups: Array.from(groups.values()), total: estimate.revenue };
}

function buildInternalKitchenCostView(estimate) {
  return {
    summary: {
      revenue: estimate.revenue,
      totalCost: estimate.total_cost,
      materialCost: estimate.material_cost,
      laborCost: estimate.labor_cost,
      subcontractCost: estimate.subcontract_cost,
      margin: estimate.expected_margin,
      marginRate: estimate.expected_margin_rate,
      pceDecision: estimate.pce_decision
    },
    items: estimate.line_items
  };
}

function buildKitchenScheduleFromEstimate({ estimate, contractId = null, startDate }) {
  if (estimate.pce_decision === 'BLOCK') throw new Error('수익성 검증 BLOCK 상태에서는 공정표를 생성할 수 없습니다.');
  if (estimate.pce_decision === 'MODIFY') throw new Error('수정 필요 상태입니다. 견적 수정 후 공정표를 생성하세요.');
  const start = startDate || new Date().toISOString().slice(0, 10);
  let cursor = new Date(start);
  const add = (days) => {
    const itemStart = cursor.toISOString().slice(0, 10);
    cursor.setDate(cursor.getDate() + days - 1);
    const itemEnd = cursor.toISOString().slice(0, 10);
    cursor.setDate(cursor.getDate() + 1);
    return { itemStart, itemEnd };
  };
  const processes = [
    ['철거', estimate.input.demolitionIncluded ? 1 : 0, '', '현장팀'],
    ['폐기물 처리', estimate.input.demolitionIncluded ? 1 : 0, '철거', '현장팀'],
    ['설비/배관', 1, estimate.input.demolitionIncluded ? '폐기물 처리' : '', '설비팀'],
    ['전기', estimate.input.options.electricalUpgrade || estimate.input.options.indirectLighting ? 1 : 0, '설비/배관', '전기팀'],
    ['가구 제작/반입', 2, '전기', '가구팀'],
    ['상판 설치', 1, '가구 제작/반입', '상판팀'],
    ['마감', 1, '상판 설치', '마감팀'],
    ['청소/검수', 1, '마감', '현장관리자'],
    ['고객 인도', 1, '청소/검수', '대표/현장관리자']
  ].filter(([, duration]) => Number(duration) > 0);
  const items = processes.map(([processName, durationDays, dependency, assignee], index) => {
    const { itemStart, itemEnd } = add(Number(durationDays));
    return { processName, startDate: itemStart, endDate: itemEnd, durationDays: Number(durationDays), dependency, assignee, status: 'PLANNED', sortOrder: index + 1 };
  });
  return {
    scheduleName: '주방 리모델링 공정표',
    estimateId: estimate.id,
    contractId,
    startDate: start,
    endDate: items[items.length - 1]?.endDate || start,
    durationDays: items.reduce((sum, item) => sum + item.durationDays, 0),
    status: 'DRAFT',
    items
  };
}

function buildKitchenPurchaseOrderFromEstimate({ estimate, contractId = null, requiredDate }) {
  if (estimate.pce_decision === 'BLOCK') throw new Error('수익성 검증 BLOCK 상태에서는 발주서를 생성할 수 없습니다.');
  if (estimate.pce_decision === 'MODIFY') throw new Error('수정 필요 상태입니다. 견적 수정 후 발주서를 생성하세요.');
  const date = requiredDate || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const purchasable = ['가구', '상판', '설비', '전기', '마감', '기타'];
  const items = estimate.line_items
    .filter((item) => purchasable.includes(item.category))
    .map((item) => ({
      itemName: item.itemName,
      specification: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expectedUnitPrice: item.materialCost > 0 && item.quantity > 0 ? Math.round(item.materialCost / item.quantity) : item.customerUnitPrice,
      expectedTotal: item.materialCost > 0 ? item.materialCost : item.customerTotal,
      supplierName: `${item.category} 거래처 미정`,
      orderStatus: 'NEEDS_ORDER',
      requiredDate: date,
      notes: '주방 견적 기반 자동 생성. 실제 공급가 확인 필요.'
    }));
  return {
    estimateId: estimate.id,
    contractId,
    orderNumber: `PO-${estimate.id}`,
    supplierName: '복수 거래처',
    totalAmount: items.reduce((sum, item) => sum + item.expectedTotal, 0),
    status: 'DRAFT',
    requiredDate: date,
    items
  };
}

module.exports = {
  calculateKitchenEstimate,
  buildCustomerKitchenEstimateView,
  buildInternalKitchenCostView,
  buildKitchenScheduleFromEstimate,
  buildKitchenPurchaseOrderFromEstimate
};
