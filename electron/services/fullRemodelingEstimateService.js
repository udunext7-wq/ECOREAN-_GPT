const PCE_LABELS_KO = {
  BLOCK: '차단',
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
const { applyQuantityAwareSchedule, applyQuantityAwarePurchaseOrder } = require('./lightBimExecutionBindingService');

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundWon(value) {
  return Math.round(Number(value || 0));
}

function normalizeFullInput(input = {}) {
  const selectedProcesses = {
    bathroom: input.selectedProcesses?.bathroom !== false,
    kitchen: input.selectedProcesses?.kitchen !== false,
    flooring: input.selectedProcesses?.flooring !== false,
    wallpaper: input.selectedProcesses?.wallpaper !== false,
    painting: Boolean(input.selectedProcesses?.painting),
    carpentry: input.selectedProcesses?.carpentry !== false,
    electrical: input.selectedProcesses?.electrical !== false,
    lighting: input.selectedProcesses?.lighting !== false,
    film: Boolean(input.selectedProcesses?.film),
    windows: Boolean(input.selectedProcesses?.windows),
    builtInFurniture: Boolean(input.selectedProcesses?.builtInFurniture),
    entrance: Boolean(input.selectedProcesses?.entrance),
    balcony: input.selectedProcesses?.balcony !== false
  };

  return {
    customerName: String(input.customerName || '').trim(),
    siteName: String(input.siteName || '').trim(),
    constructionType: 'full_remodel',
    housingType: String(input.housingType || 'apartment'),
    areaM2: Math.max(20, numberOr(input.areaM2, 79)),
    areaPyeong: Math.max(6, numberOr(input.areaPyeong, Math.round(numberOr(input.areaM2, 79) / 3.3058))),
    roomCount: Math.max(1, numberOr(input.roomCount, 3)),
    bathroomCount: Math.max(1, numberOr(input.bathroomCount, 1)),
    kitchenType: String(input.kitchenType || 'straight'),
    balconyCount: Math.max(0, numberOr(input.balconyCount, 1)),
    constructionScope: String(input.constructionScope || 'full_interior'),
    demolition: {
      fullDemolition: Boolean(input.demolition?.fullDemolition),
      bathroomDemolition: input.demolition?.bathroomDemolition !== false,
      kitchenDemolition: input.demolition?.kitchenDemolition !== false,
      floorDemolition: input.demolition?.floorDemolition !== false,
      ceilingDemolition: Boolean(input.demolition?.ceilingDemolition),
      moldingDemolition: input.demolition?.moldingDemolition !== false,
      wasteVolumeTon: Math.max(1, numberOr(input.demolition?.wasteVolumeTon, 2.5))
    },
    selectedProcesses,
    options: {
      bathroom: {
        count: Math.max(1, numberOr(input.options?.bathroom?.count, input.bathroomCount || 1)),
        tileMethod: String(input.options?.bathroom?.tileMethod || 'overlay'),
        waterproofMethod: String(input.options?.bathroom?.waterproofMethod || 'membrane'),
        showerBooth: Boolean(input.options?.bathroom?.showerBooth),
        bathtub: Boolean(input.options?.bathroom?.bathtub),
        zenda: Boolean(input.options?.bathroom?.zenda)
      },
      kitchen: {
        type: String(input.options?.kitchen?.type || input.kitchenType || 'straight'),
        lengthMm: Math.max(1800, numberOr(input.options?.kitchen?.lengthMm, 3300)),
        countertopType: String(input.options?.kitchen?.countertopType || 'artificial_marble'),
        hood: input.options?.kitchen?.hood !== false,
        cooktop: Boolean(input.options?.kitchen?.cooktop),
        sinkBowl: input.options?.kitchen?.sinkBowl !== false
      },
      flooring: {
        type: String(input.options?.flooring?.type || 'engineered_wood'),
        demolitionIncluded: input.options?.flooring?.demolitionIncluded !== false
      },
      wallpaper: {
        type: String(input.options?.wallpaper?.type || 'silk'),
        ceilingIncluded: input.options?.wallpaper?.ceilingIncluded !== false
      },
      painting: {
        doors: Boolean(input.options?.painting?.doors),
        frames: Boolean(input.options?.painting?.frames),
        balcony: Boolean(input.options?.painting?.balcony),
        ceiling: Boolean(input.options?.painting?.ceiling),
        walls: Boolean(input.options?.painting?.walls)
      },
      carpentry: {
        ceiling: Boolean(input.options?.carpentry?.ceiling),
        indirectBox: Boolean(input.options?.carpentry?.indirectBox),
        artWall: Boolean(input.options?.carpentry?.artWall),
        molding: input.options?.carpentry?.molding !== false,
        doorTrim: input.options?.carpentry?.doorTrim !== false
      },
      electrical: {
        outletAdd: input.options?.electrical?.outletAdd !== false,
        switchReplace: input.options?.electrical?.switchReplace !== false,
        panelBoard: Boolean(input.options?.electrical?.panelBoard),
        upgrade: Boolean(input.options?.electrical?.upgrade)
      },
      lighting: {
        downlight: input.options?.lighting?.downlight !== false,
        indirect: Boolean(input.options?.lighting?.indirect),
        lineLight: Boolean(input.options?.lighting?.lineLight),
        mainLight: input.options?.lighting?.mainLight !== false
      },
      film: {
        doors: Boolean(input.options?.film?.doors),
        frames: Boolean(input.options?.film?.frames),
        sash: Boolean(input.options?.film?.sash),
        furniture: Boolean(input.options?.film?.furniture)
      },
      windows: {
        replacement: Boolean(input.options?.windows?.replacement),
        glassReplacement: Boolean(input.options?.windows?.glassReplacement),
        insulation: Boolean(input.options?.windows?.insulation)
      },
      builtInFurniture: {
        closet: Boolean(input.options?.builtInFurniture?.closet),
        shoeCabinet: Boolean(input.options?.builtInFurniture?.shoeCabinet),
        pantry: Boolean(input.options?.builtInFurniture?.pantry),
        storage: Boolean(input.options?.builtInFurniture?.storage)
      }
    },
    customerPriceMultiplier: Math.max(0.3, numberOr(input.customerPriceMultiplier, 1.22)),
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

function makeItem({ category, itemName, quantity, unit, customerUnitPrice, materialCost = 0, laborCost = 0, subcontractCost = 0, quantityMeta = {} }) {
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
    marginRate: customerTotal > 0 ? Number((margin / customerTotal).toFixed(4)) : 0,
    ...quantityMeta
  };
}

function applyMultiplier(items, multiplier) {
  return items.map((item) => makeItem({
    category: item.category,
    itemName: item.itemName,
    quantity: item.quantity,
    unit: item.unit,
    customerUnitPrice: item.customerUnitPrice * multiplier,
    materialCost: item.materialCost,
    laborCost: item.laborCost,
    subcontractCost: item.subcontractCost,
    quantityMeta: preserveQuantityMeta(item)
  }));
}

function addDemolition(items, input) {
  const area = input.areaM2;
  if (input.demolition.fullDemolition) {
    items.push(makeItem({ category: '철거', itemName: '전체 철거', quantity: area, unit: 'm2', customerUnitPrice: 48000, laborCost: area * 22000, subcontractCost: area * 12000 }));
  } else {
    if (input.demolition.bathroomDemolition) items.push(makeItem({ category: '철거', itemName: '욕실 철거', quantity: input.bathroomCount, unit: '실', customerUnitPrice: 550000, laborCost: input.bathroomCount * 280000, subcontractCost: input.bathroomCount * 110000 }));
    if (input.demolition.kitchenDemolition) items.push(makeItem({ category: '철거', itemName: '주방 철거', quantity: 1, unit: '식', customerUnitPrice: 650000, laborCost: 360000, subcontractCost: 120000 }));
    if (input.demolition.floorDemolition) items.push(makeItem({ category: '철거', itemName: '바닥 철거', quantity: area, unit: 'm2', customerUnitPrice: 18000, laborCost: area * 7000, subcontractCost: area * 5500 }));
    if (input.demolition.ceilingDemolition) items.push(makeItem({ category: '철거', itemName: '천장 철거', quantity: area, unit: 'm2', customerUnitPrice: 16000, laborCost: area * 7500, subcontractCost: area * 4500 }));
    if (input.demolition.moldingDemolition) items.push(makeItem({ category: '철거', itemName: '몰딩 철거', quantity: input.roomCount + 2, unit: '실', customerUnitPrice: 45000, laborCost: (input.roomCount + 2) * 18000 }));
  }
  items.push(makeItem({ category: '철거', itemName: '폐기물 처리', quantity: input.demolition.wasteVolumeTon, unit: 'ton', customerUnitPrice: 260000, subcontractCost: input.demolition.wasteVolumeTon * 175000 }));
}

function addBathroom(items, input) {
  if (!input.selectedProcesses.bathroom) return;
  const count = input.options.bathroom.count;
  const bathroomArea = resolveQuantity(input, 'bathroom_area_m2', count);
  const bathroomTile = resolveQuantity(input, 'bathroom_tile_area_m2', count, { lightBimNote: 'LightBIM 욕실 타일 수량 기준' });
  const bathroomCeiling = resolveQuantity(input, 'ceiling_area_m2', count, { lightBimNote: 'LightBIM 천장 면적 기준' });
  items.push(makeItem({
    category: '욕실',
    itemName: '방수',
    quantity: bathroomArea.source === 'DEFAULT' ? count : bathroomArea.value,
    unit: bathroomArea.source === 'DEFAULT' ? '실' : 'm2',
    customerUnitPrice: bathroomArea.source === 'DEFAULT' ? 520000 : 72000,
    materialCost: bathroomArea.source === 'DEFAULT' ? count * 130000 : bathroomArea.value * 21000,
    laborCost: bathroomArea.source === 'DEFAULT' ? count * 220000 : bathroomArea.value * 28000,
    quantityMeta: itemQuantityMeta(bathroomArea)
  }));
  items.push(makeItem({
    category: '욕실',
    itemName: '타일',
    quantity: bathroomTile.source === 'DEFAULT' ? count : bathroomTile.value,
    unit: bathroomTile.source === 'DEFAULT' ? '실' : 'm2',
    customerUnitPrice: bathroomTile.source === 'DEFAULT' ? 1450000 : 98000,
    materialCost: bathroomTile.source === 'DEFAULT' ? count * 520000 : bathroomTile.value * 39000,
    laborCost: bathroomTile.source === 'DEFAULT' ? count * 520000 : bathroomTile.value * 31000,
    quantityMeta: itemQuantityMeta(bathroomTile)
  }));
  items.push(makeItem({ category: '욕실', itemName: '도기/수전', quantity: count, unit: '실', customerUnitPrice: 1250000, materialCost: count * 760000, laborCost: count * 170000 }));
  items.push(makeItem({
    category: '욕실',
    itemName: '천장/환풍기',
    quantity: bathroomCeiling.source === 'DEFAULT' ? count : bathroomCeiling.value,
    unit: bathroomCeiling.source === 'DEFAULT' ? '실' : 'm2',
    customerUnitPrice: bathroomCeiling.source === 'DEFAULT' ? 850000 : 155000,
    materialCost: bathroomCeiling.source === 'DEFAULT' ? count * 430000 : bathroomCeiling.value * 62000,
    laborCost: bathroomCeiling.source === 'DEFAULT' ? count * 160000 : bathroomCeiling.value * 41000,
    quantityMeta: itemQuantityMeta(bathroomCeiling)
  }));
  if (input.options.bathroom.showerBooth) items.push(makeItem({ category: '욕실', itemName: '샤워부스', quantity: count, unit: '실', customerUnitPrice: 520000, materialCost: count * 310000, laborCost: count * 70000 }));
  if (input.options.bathroom.bathtub) items.push(makeItem({ category: '욕실', itemName: '욕조', quantity: count, unit: '실', customerUnitPrice: 650000, materialCost: count * 390000, laborCost: count * 85000 }));
  if (input.options.bathroom.zenda) items.push(makeItem({ category: '욕실', itemName: '젠다이', quantity: count, unit: '실', customerUnitPrice: 420000, materialCost: count * 160000, laborCost: count * 150000 }));
}

function addKitchen(items, input) {
  if (!input.selectedProcesses.kitchen) return;
  const kitchenLength = resolveQuantity(input, 'kitchen_length_m', input.options.kitchen.lengthMm / 1000, {
    lightBimNote: 'LightBIM 주방 길이 수량 기준'
  });
  const lengthM = kitchenLength.value;
  const shapeFactor = { straight: 1, l_shape: 1.15, u_shape: 1.3, island: 1.45 }[input.options.kitchen.type] || 1;
  const adjustedM = lengthM * shapeFactor;
  const adjustedKitchenLength = { ...kitchenLength, value: adjustedM };
  items.push(makeItem({ category: '주방', itemName: '가구', quantity: adjustedM, unit: 'm', customerUnitPrice: 920000, materialCost: adjustedM * 520000, laborCost: adjustedM * 120000, quantityMeta: itemQuantityMeta(adjustedKitchenLength) }));
  items.push(makeItem({ category: '주방', itemName: '상판', quantity: adjustedM, unit: 'm', customerUnitPrice: input.options.kitchen.countertopType === 'ceramic' ? 820000 : 430000, materialCost: adjustedM * (input.options.kitchen.countertopType === 'ceramic' ? 550000 : 245000), laborCost: adjustedM * 70000, quantityMeta: itemQuantityMeta(adjustedKitchenLength) }));
  if (input.options.kitchen.sinkBowl) items.push(makeItem({ category: '주방', itemName: '싱크볼/수전/배관', quantity: 1, unit: '식', customerUnitPrice: 680000, materialCost: 390000, laborCost: 150000 }));
  if (input.options.kitchen.hood) items.push(makeItem({ category: '주방', itemName: '후드', quantity: 1, unit: '대', customerUnitPrice: 380000, materialCost: 240000, laborCost: 60000 }));
  if (input.options.kitchen.cooktop) items.push(makeItem({ category: '주방', itemName: '쿡탑', quantity: 1, unit: '대', customerUnitPrice: 450000, materialCost: 300000, laborCost: 55000 }));
  const kitchenTile = resolveQuantity(input, 'kitchen_wall_tile_area_m2', Math.max(3, adjustedM * 0.6), {
    lightBimNote: 'LightBIM 주방 벽타일 수량 기준'
  });
  items.push(makeItem({ category: '주방', itemName: '주방 마감', quantity: kitchenTile.source === 'DEFAULT' ? 1 : kitchenTile.value, unit: kitchenTile.source === 'DEFAULT' ? '식' : 'm2', customerUnitPrice: kitchenTile.source === 'DEFAULT' ? 420000 : 125000, materialCost: kitchenTile.source === 'DEFAULT' ? 160000 : kitchenTile.value * 52000, laborCost: kitchenTile.source === 'DEFAULT' ? 160000 : kitchenTile.value * 36000, quantityMeta: itemQuantityMeta(kitchenTile) }));
}

function addFinishProcesses(items, input) {
  const area = input.areaM2;
  const flooringArea = resolveQuantity(input, 'flooring_area_m2', area);
  const wallpaperArea = resolveQuantity(input, 'wallpaper_area_m2', input.options.wallpaper.ceilingIncluded ? area * 2.7 : area * 2.15);
  const paintingArea = resolveQuantity(input, 'painting_area_m2', area * 1.1);
  const ceilingArea = resolveQuantity(input, 'ceiling_area_m2', area);
  const baseboardLength = resolveQuantity(input, 'baseboard_length_m', area, { lightBimNote: 'LightBIM 걸레받이 길이 기준' });
  const moldingLength = resolveQuantity(input, 'molding_length_m', area, { lightBimNote: 'LightBIM 몰딩 길이 기준' });
  if (input.selectedProcesses.flooring) {
    if (input.options.flooring.demolitionIncluded) items.push(makeItem({ category: '바닥', itemName: '바닥 철거', quantity: flooringArea.value, unit: 'm2', customerUnitPrice: 12000, laborCost: flooringArea.value * 4200, subcontractCost: flooringArea.value * 3800, quantityMeta: itemQuantityMeta(flooringArea) }));
    items.push(makeItem({ category: '바닥', itemName: `바닥재 ${input.options.flooring.type}`, quantity: flooringArea.value, unit: 'm2', customerUnitPrice: 76000, materialCost: flooringArea.value * 39000, laborCost: flooringArea.value * 17000, quantityMeta: itemQuantityMeta(flooringArea) }));
    items.push(makeItem({ category: '바닥', itemName: '걸레받이/부자재', quantity: baseboardLength.value, unit: 'm', customerUnitPrice: 9000, materialCost: baseboardLength.value * 4200, laborCost: baseboardLength.value * 2300, quantityMeta: itemQuantityMeta(baseboardLength) }));
  }
  if (input.selectedProcesses.wallpaper) {
    const paperArea = wallpaperArea.value;
    items.push(makeItem({ category: '도배', itemName: input.options.wallpaper.type === 'silk' ? '실크벽지' : '합지', quantity: paperArea, unit: 'm2', customerUnitPrice: input.options.wallpaper.type === 'silk' ? 18500 : 12000, materialCost: paperArea * 7200, laborCost: paperArea * 6800, quantityMeta: itemQuantityMeta(wallpaperArea) }));
    items.push(makeItem({ category: '도배', itemName: '도배 부자재', quantity: paperArea, unit: 'm2', customerUnitPrice: 2600, materialCost: paperArea * 1400, quantityMeta: itemQuantityMeta(wallpaperArea) }));
  }
  if (input.selectedProcesses.painting) {
    const paintArea = paintingArea.value;
    items.push(makeItem({ category: '도장', itemName: '도장재/퍼티', quantity: paintArea, unit: 'm2', customerUnitPrice: 15500, materialCost: paintArea * 5200, laborCost: paintArea * 7600, quantityMeta: itemQuantityMeta(paintingArea) }));
  }
  if (input.selectedProcesses.carpentry) {
    if (input.options.carpentry.ceiling) items.push(makeItem({ category: '목공', itemName: '천장 목공', quantity: ceilingArea.value, unit: 'm2', customerUnitPrice: 42000, materialCost: ceilingArea.value * 16000, laborCost: ceilingArea.value * 19000, quantityMeta: itemQuantityMeta(ceilingArea) }));
    if (input.options.carpentry.indirectBox) items.push(makeItem({ category: '목공', itemName: '간접조명 박스', quantity: input.roomCount + 1, unit: '실', customerUnitPrice: 320000, materialCost: (input.roomCount + 1) * 120000, laborCost: (input.roomCount + 1) * 135000 }));
    if (input.options.carpentry.artWall) items.push(makeItem({ category: '목공', itemName: '아트월', quantity: 1, unit: '식', customerUnitPrice: 850000, materialCost: 350000, laborCost: 320000 }));
    if (input.options.carpentry.molding) items.push(makeItem({ category: '목공', itemName: '몰딩', quantity: moldingLength.value, unit: 'm', customerUnitPrice: 9500, materialCost: moldingLength.value * 4100, laborCost: moldingLength.value * 3200, quantityMeta: itemQuantityMeta(moldingLength) }));
    if (input.options.carpentry.doorTrim) items.push(makeItem({ category: '목공', itemName: '문선', quantity: input.roomCount + 2, unit: '개소', customerUnitPrice: 95000, materialCost: (input.roomCount + 2) * 36000, laborCost: (input.roomCount + 2) * 41000 }));
  }
}

function addSystems(items, input) {
  if (input.selectedProcesses.electrical) {
    items.push(makeItem({ category: '전기/조명', itemName: '배선/콘센트/스위치', quantity: input.areaPyeong, unit: '평', customerUnitPrice: 52000, materialCost: input.areaPyeong * 18000, laborCost: input.areaPyeong * 24500 }));
    if (input.options.electrical.panelBoard) items.push(makeItem({ category: '전기/조명', itemName: '분전반', quantity: 1, unit: '식', customerUnitPrice: 480000, materialCost: 210000, laborCost: 180000 }));
    if (input.options.electrical.upgrade) items.push(makeItem({ category: '전기/조명', itemName: '전기 증설', quantity: 1, unit: '식', customerUnitPrice: 620000, materialCost: 190000, laborCost: 280000 }));
  }
  if (input.selectedProcesses.lighting) {
    if (input.options.lighting.downlight) items.push(makeItem({ category: '전기/조명', itemName: '다운라이트', quantity: Math.max(8, input.roomCount * 4), unit: '개', customerUnitPrice: 58000, materialCost: Math.max(8, input.roomCount * 4) * 22000, laborCost: Math.max(8, input.roomCount * 4) * 18000 }));
    if (input.options.lighting.indirect) items.push(makeItem({ category: '전기/조명', itemName: '간접조명', quantity: input.roomCount + 1, unit: '실', customerUnitPrice: 260000, materialCost: (input.roomCount + 1) * 85000, laborCost: (input.roomCount + 1) * 110000 }));
    if (input.options.lighting.lineLight) items.push(makeItem({ category: '전기/조명', itemName: '라인조명', quantity: input.roomCount + 1, unit: '실', customerUnitPrice: 320000, materialCost: (input.roomCount + 1) * 120000, laborCost: (input.roomCount + 1) * 120000 }));
    if (input.options.lighting.mainLight) items.push(makeItem({ category: '전기/조명', itemName: '메인등', quantity: input.roomCount + 2, unit: '개', customerUnitPrice: 120000, materialCost: (input.roomCount + 2) * 70000, laborCost: (input.roomCount + 2) * 18000 }));
  }
}

function addSpecialProcesses(items, input) {
  if (input.selectedProcesses.film) {
    if (input.options.film.doors) items.push(makeItem({ category: '필름', itemName: '방문 필름', quantity: input.roomCount + 1, unit: '개', customerUnitPrice: 180000, materialCost: (input.roomCount + 1) * 42000, laborCost: (input.roomCount + 1) * 92000 }));
    if (input.options.film.frames) items.push(makeItem({ category: '필름', itemName: '문틀 필름', quantity: input.roomCount + 1, unit: '개', customerUnitPrice: 110000, materialCost: (input.roomCount + 1) * 28000, laborCost: (input.roomCount + 1) * 56000 }));
    if (input.options.film.sash) items.push(makeItem({ category: '필름', itemName: '샤시 필름', quantity: input.balconyCount + input.roomCount, unit: '개소', customerUnitPrice: 220000, materialCost: (input.balconyCount + input.roomCount) * 52000, laborCost: (input.balconyCount + input.roomCount) * 120000 }));
    if (input.options.film.furniture) items.push(makeItem({ category: '필름', itemName: '가구 필름', quantity: 1, unit: '식', customerUnitPrice: 650000, materialCost: 160000, laborCost: 340000 }));
  }
  if (input.selectedProcesses.windows) {
    if (input.options.windows.replacement) items.push(makeItem({ category: '창호', itemName: '창호 교체', quantity: input.balconyCount + input.roomCount, unit: '개소', customerUnitPrice: 950000, materialCost: (input.balconyCount + input.roomCount) * 590000, laborCost: (input.balconyCount + input.roomCount) * 120000 }));
    if (input.options.windows.glassReplacement) items.push(makeItem({ category: '창호', itemName: '유리 교체', quantity: input.balconyCount + input.roomCount, unit: '개소', customerUnitPrice: 260000, materialCost: (input.balconyCount + input.roomCount) * 155000, laborCost: (input.balconyCount + input.roomCount) * 42000 }));
    if (input.options.windows.insulation) items.push(makeItem({ category: '창호', itemName: '단열 보강/실리콘', quantity: input.balconyCount + input.roomCount, unit: '개소', customerUnitPrice: 160000, materialCost: (input.balconyCount + input.roomCount) * 52000, laborCost: (input.balconyCount + input.roomCount) * 64000 }));
  }
  if (input.selectedProcesses.builtInFurniture) {
    if (input.options.builtInFurniture.closet) items.push(makeItem({ category: '가구', itemName: '붙박이장', quantity: input.roomCount, unit: '개소', customerUnitPrice: 980000, materialCost: input.roomCount * 590000, laborCost: input.roomCount * 110000 }));
    if (input.options.builtInFurniture.shoeCabinet) items.push(makeItem({ category: '가구', itemName: '신발장', quantity: 1, unit: '개소', customerUnitPrice: 780000, materialCost: 460000, laborCost: 90000 }));
    if (input.options.builtInFurniture.pantry) items.push(makeItem({ category: '가구', itemName: '팬트리', quantity: 1, unit: '개소', customerUnitPrice: 850000, materialCost: 520000, laborCost: 95000 }));
    if (input.options.builtInFurniture.storage) items.push(makeItem({ category: '가구', itemName: '수납장', quantity: 1, unit: '식', customerUnitPrice: 720000, materialCost: 420000, laborCost: 85000 }));
  }
  items.push(makeItem({ category: '마감', itemName: '실리콘/마감 보수', quantity: 1, unit: '식', customerUnitPrice: 420000, materialCost: 120000, laborCost: 170000 }));
  items.push(makeItem({ category: '마감', itemName: '준공청소', quantity: input.areaM2, unit: 'm2', customerUnitPrice: 4500, laborCost: input.areaM2 * 2600 }));
  items.push(makeItem({ category: '마감', itemName: '검수/현장관리비', quantity: 1, unit: '식', customerUnitPrice: Math.max(650000, input.areaM2 * 9500), laborCost: Math.max(280000, input.areaM2 * 3800) }));
}

function summarizeByProcess(items) {
  const groups = new Map();
  for (const item of items) {
    const current = groups.get(item.category) || { category: item.category, customerTotal: 0, internalTotal: 0, margin: 0 };
    current.customerTotal += item.customerTotal;
    current.internalTotal += item.internalTotal;
    current.margin += item.margin;
    groups.set(item.category, current);
  }
  return Array.from(groups.values()).map((row) => ({
    ...row,
    marginRate: row.customerTotal > 0 ? Number((row.margin / row.customerTotal).toFixed(4)) : 0
  }));
}

function suggestFullDuration(input) {
  let days = 14;
  days += Math.max(0, input.areaPyeong - 20) * 0.35;
  if (input.demolition.fullDemolition) days += 2;
  if (input.selectedProcesses.bathroom) days += input.bathroomCount * 3;
  if (input.selectedProcesses.kitchen) days += 3;
  if (input.selectedProcesses.windows) days += 2;
  if (input.selectedProcesses.carpentry) days += 3;
  if (input.selectedProcesses.film) days += 2;
  return Math.ceil(Math.min(45, days));
}

function calculateFullRemodelingEstimate(rawInput = {}) {
  const input = normalizeFullInput(rawInput);
  const items = [];
  addDemolition(items, input);
  addBathroom(items, input);
  addKitchen(items, input);
  addFinishProcesses(items, input);
  addSystems(items, input);
  addSpecialProcesses(items, input);

  const multiplied = applyMultiplier(items, input.customerPriceMultiplier);
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
    schedule_days: suggestFullDuration(input),
    process_summary: summarizeByProcess(multiplied),
    quantity_source_summary: summarizeQuantitySources(multiplied),
    line_items: multiplied
  };
}

function buildCustomerFullEstimateView(estimate) {
  return { groups: estimate.process_summary, total: estimate.revenue };
}

function buildInternalFullCostView(estimate) {
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
    groups: estimate.process_summary,
    items: estimate.line_items
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildFullScheduleFromEstimate({ estimate, contractId = null, startDate, quantityContext = {} }) {
  if (estimate.pce_decision === 'BLOCK') throw new Error('수익성 검증 BLOCK 상태에서는 공정표를 생성할 수 없습니다.');
  if (estimate.pce_decision === 'MODIFY') throw new Error('수정 필요 상태입니다. 견적 수정 후 공정표를 생성하세요.');
  const start = startDate || new Date().toISOString().slice(0, 10);
  let cursor = new Date(start);
  const processes = estimate.process_summary.map((group, index) => {
    const duration = Math.max(1, Math.ceil(group.customerTotal / 3500000));
    const itemStart = cursor.toISOString().slice(0, 10);
    cursor = addDays(cursor, duration - 1);
    const itemEnd = cursor.toISOString().slice(0, 10);
    cursor = addDays(cursor, 1);
    return {
      processName: group.category,
      startDate: itemStart,
      endDate: itemEnd,
      durationDays: duration,
      dependency: index === 0 ? '' : estimate.process_summary[index - 1].category,
      assignee: `${group.category} 담당팀`,
      status: 'PLANNED',
      sortOrder: index + 1
    };
  });
  return applyQuantityAwareSchedule({
    scheduleName: '전체 리모델링 공정표',
    estimateId: estimate.id,
    contractId,
    startDate: start,
    endDate: processes[processes.length - 1]?.endDate || start,
    durationDays: processes.reduce((sum, item) => sum + item.durationDays, 0),
    status: 'DRAFT',
    items: processes
  }, quantityContext);
}

function buildFullPurchaseOrderFromEstimate({ estimate, contractId = null, requiredDate, quantityContext = {} }) {
  if (estimate.pce_decision === 'BLOCK') throw new Error('수익성 검증 BLOCK 상태에서는 발주서를 생성할 수 없습니다.');
  if (estimate.pce_decision === 'MODIFY') throw new Error('수정 필요 상태입니다. 견적 수정 후 발주서를 생성하세요.');
  const date = requiredDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const purchasable = ['욕실', '주방', '바닥', '도배', '도장', '목공', '전기/조명', '필름', '창호', '가구', '마감'];
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
      notes: '전체 리모델링 견적 기반 자동 생성. 실제 공급가 확인 필요.'
    }));
  return applyQuantityAwarePurchaseOrder({
    estimateId: estimate.id,
    contractId,
    orderNumber: `PO-${estimate.id}`,
    supplierName: '복수 거래처',
    totalAmount: items.reduce((sum, item) => sum + item.expectedTotal, 0),
    status: 'DRAFT',
    requiredDate: date,
    items
  }, estimate.line_items, quantityContext);
}

module.exports = {
  calculateFullRemodelingEstimate,
  buildCustomerFullEstimateView,
  buildInternalFullCostView,
  buildFullScheduleFromEstimate,
  buildFullPurchaseOrderFromEstimate
};
