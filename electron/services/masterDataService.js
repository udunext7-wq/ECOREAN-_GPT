const MASTER_TYPES = ['process', 'material', 'vendor', 'labor', 'equipment', 'standardItem'];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function normalizeActive(value = true) {
  return value === false || value === 0 || value === '0' || String(value).toUpperCase() === 'INACTIVE' ? 0 : 1;
}

function buildValidationWarning({ entityType, entityId, warningType, messageKo, severity = 'YELLOW' }) {
  return {
    id: `MDVAL-${entityType}-${warningType}-${entityId}`.replace(/[^A-Za-z0-9_-]/g, '-'),
    entityType,
    entityId,
    warningType,
    messageKo,
    severity
  };
}

function validateMasterDataSets({
  processes = [],
  materials = [],
  vendors = [],
  labor = [],
  equipment = [],
  standardItems = []
} = {}) {
  const warnings = [];
  const seen = new Map();

  function checkDuplicate(entityType, key, entityId, labelKo) {
    const composite = `${entityType}:${key}`;
    if (seen.has(composite)) {
      warnings.push(buildValidationWarning({
        entityType,
        entityId,
        warningType: 'DUPLICATE_ITEM',
        messageKo: `${labelKo} 중복 항목이 있습니다.`,
        severity: 'YELLOW'
      }));
    }
    seen.set(composite, entityId);
  }

  processes.forEach((item) => {
    checkDuplicate('process', item.process_name, item.id, item.process_name);
    if (!item.default_unit) warnings.push(buildValidationWarning({ entityType: 'process', entityId: item.id, warningType: 'MISSING_UNIT', messageKo: `${item.process_name} 기본 단위가 없습니다.` }));
  });

  materials.forEach((item) => {
    checkDuplicate('material', `${item.material_name}:${item.specification}:${item.brand}`, item.id, item.material_name);
    if (!item.unit) warnings.push(buildValidationWarning({ entityType: 'material', entityId: item.id, warningType: 'MISSING_UNIT', messageKo: `${item.material_name} 단위가 없습니다.` }));
    if (!item.applied_process) warnings.push(buildValidationWarning({ entityType: 'material', entityId: item.id, warningType: 'MISSING_PROCESS_LINK', messageKo: `${item.material_name} 연결 공정이 없습니다.` }));
    if (!item.recommended_vendor) warnings.push(buildValidationWarning({ entityType: 'material', entityId: item.id, warningType: 'MISSING_VENDOR_LINK', messageKo: `${item.material_name} 추천 업체가 없습니다.`, severity: 'ORANGE' }));
  });

  vendors.forEach((item) => {
    checkDuplicate('vendor', item.vendor_name, item.id, item.vendor_name);
    if (!item.vendor_name) warnings.push(buildValidationWarning({ entityType: 'vendor', entityId: item.id, warningType: 'MISSING_NAME', messageKo: '업체명이 없는 업체 마스터가 있습니다.', severity: 'RED' }));
  });

  labor.forEach((item) => {
    checkDuplicate('labor', `${item.role}:${item.process}`, item.id, `${item.role}/${item.process}`);
    if (!item.process) warnings.push(buildValidationWarning({ entityType: 'labor', entityId: item.id, warningType: 'MISSING_PROCESS_LINK', messageKo: `${item.role} 인력의 연결 공정이 없습니다.` }));
    if (toInteger(item.default_daily_wage) <= 0) warnings.push(buildValidationWarning({ entityType: 'labor', entityId: item.id, warningType: 'MISSING_PRICE', messageKo: `${item.role} 기본 일당이 없습니다.` }));
  });

  equipment.forEach((item) => {
    checkDuplicate('equipment', item.equipment_name, item.id, item.equipment_name);
    if (!item.unit) warnings.push(buildValidationWarning({ entityType: 'equipment', entityId: item.id, warningType: 'MISSING_UNIT', messageKo: `${item.equipment_name} 단위가 없습니다.` }));
  });

  standardItems.forEach((item) => {
    checkDuplicate('standardItem', `${item.item_name}:${item.estimate_type}`, item.id, item.item_name);
    if (!item.default_unit) warnings.push(buildValidationWarning({ entityType: 'standardItem', entityId: item.id, warningType: 'MISSING_UNIT', messageKo: `${item.item_name} 기본 단위가 없습니다.` }));
    if (!item.process) warnings.push(buildValidationWarning({ entityType: 'standardItem', entityId: item.id, warningType: 'MISSING_PROCESS_LINK', messageKo: `${item.item_name} 연결 공정이 없습니다.` }));
    if (toNumber(item.default_margin_rate) <= 0) warnings.push(buildValidationWarning({ entityType: 'standardItem', entityId: item.id, warningType: 'NON_POSITIVE_MARGIN', messageKo: `${item.item_name} 기본 마진율이 0 이하입니다.`, severity: 'RED' }));
  });

  return warnings;
}

function parseMasterCsv(csvText = '') {
  const lines = String(csvText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const row = { rowNumber: index + 2 };
    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex] ?? '';
    });
    return row;
  });
}

function buildCsv(rows = []) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => String(row[header] ?? '').replace(/,/g, ' ')).join(','))
  ].join('\n');
}

module.exports = {
  MASTER_TYPES,
  normalizeActive,
  toInteger,
  validateMasterDataSets,
  parseMasterCsv,
  buildCsv
};
