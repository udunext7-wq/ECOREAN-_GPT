const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function money(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')} KRW`;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function asciiPdfText(value) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()\\]/g, (match) => `\\${match}`);
}

function groupItems(items) {
  const grouped = new Map();
  for (const item of items) {
    const current = grouped.get(item.category) || {
      category: item.category,
      customerTotal: 0,
      materialCost: 0,
      laborCost: 0,
      subcontractCost: 0,
      internalTotal: 0,
      margin: 0
    };
    current.customerTotal += Number(item.customerTotal || 0);
    current.materialCost += Number(item.materialCost || 0);
    current.laborCost += Number(item.laborCost || 0);
    current.subcontractCost += Number(item.subcontractCost || 0);
    current.internalTotal += Number(item.internalTotal || 0);
    current.margin += Number(item.margin || 0);
    grouped.set(item.category, current);
  }
  return Array.from(grouped.values());
}

function buildPdfLines(model, type) {
  const { estimate, items } = model;
  const lines = [];
  if (type === 'customer') {
    lines.push('ECOREAN');
    lines.push(estimate.documentTitle || 'Bathroom Remodeling Estimate');
    lines.push(`Estimate ID: ${estimate.id}`);
    lines.push(`Customer: ${estimate.customerName}`);
    lines.push(`Site: ${estimate.siteName}`);
    lines.push(`Date: ${new Date().toLocaleDateString('ko-KR')}`);
    lines.push(`Valid Until: 7 days`);
    lines.push(`Total Customer Price: ${money(estimate.revenue)}`);
    lines.push('');
    lines.push('Scope Summary');
    for (const row of groupItems(items)) {
      lines.push(`${row.category} / standard work and materials / ${money(row.customerTotal)}`);
    }
    lines.push('');
    lines.push('Payment Terms: Deposit 30% / Progress 40% / Balance 30%');
    lines.push('Separate Agreement: plumbing major repair, leak repair, structural reinforcement, client change order.');
    lines.push('Client Signature: ____________________');
  } else {
    lines.push('ECOREAN INTERNAL COST SHEET');
    lines.push(`Estimate ID: ${estimate.id}`);
    lines.push(`Customer Price: ${money(estimate.revenue)}`);
    lines.push(`Total Cost: ${money(estimate.totalCost)}`);
    lines.push(`Material Cost: ${money(items.reduce((sum, item) => sum + Number(item.materialCost || 0), 0))}`);
    lines.push(`Labor Cost: ${money(items.reduce((sum, item) => sum + Number(item.laborCost || 0), 0))}`);
    lines.push(`Subcontract Cost: ${money(items.reduce((sum, item) => sum + Number(item.subcontractCost || 0), 0))}`);
    lines.push(`Margin: ${money(estimate.expectedMargin)}`);
    lines.push(`Margin Rate: ${(Number(estimate.expectedMarginRate || 0) * 100).toFixed(1)}%`);
    lines.push(`PCE Result: ${estimate.pceDecision}`);
    lines.push('');
    lines.push('Process Cost Summary');
    for (const row of groupItems(items)) {
      lines.push(`${row.category} / Revenue ${money(row.customerTotal)} / Cost ${money(row.internalTotal)} / margin ${money(row.margin)}`);
    }
    lines.push('');
    lines.push('Detail Items');
    for (const item of items) {
      lines.push(`${item.category} / ${item.itemName} / qty ${item.quantity}${item.unit} / revenue ${money(item.customerTotal)} / cost ${money(item.internalTotal)} / margin ${money(item.margin)}`);
    }
  }
  return lines;
}

function createBasicPdf(filePath, lines) {
  const pageHeight = 800;
  const lineHeight = 16;
  const visibleLines = lines.slice(0, 44);
  const textCommands = ['BT', '/F1 10 Tf', '50 760 Td'];
  visibleLines.forEach((line, index) => {
    if (index > 0) textCommands.push(`0 -${lineHeight} Td`);
    textCommands.push(`(${asciiPdfText(line)}) Tj`);
  });
  textCommands.push('ET');
  const stream = textCommands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join('')));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xrefOffset = Buffer.byteLength(chunks.join(''));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objects.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  fs.writeFileSync(filePath, chunks.join(''));
}

function crc32(buffer) {
  let table = crc32.table;
  if (!table) {
    table = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    });
    crc32.table = table;
  }
  let crc = -1;
  for (const byte of buffer) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, day } = dosDateTime();
  for (const file of files) {
    const name = Buffer.from(file.name);
    const content = Buffer.from(file.content);
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + content.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function cell(value) {
  if (typeof value === 'number') return `<c><v>${value}</v></c>`;
  return `<c t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function sheetXml(rows) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map(cell).join('')}</row>`).join('')}
  </sheetData>
</worksheet>`;
}

function createXlsx(filePath, sheets) {
  const sheetEntries = sheets.map((sheet, index) => ({ ...sheet, id: index + 1 }));
  const files = [
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${sheetEntries.map((sheet) => `<Override PartName="/xl/worksheets/sheet${sheet.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries.map((sheet) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${sheet.id}" r:id="rId${sheet.id}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetEntries.map((sheet) => `<Relationship Id="rId${sheet.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheet.id}.xml"/>`).join('')}</Relationships>` },
    ...sheetEntries.map((sheet) => ({ name: `xl/worksheets/sheet${sheet.id}.xml`, content: sheetXml(sheet.rows) }))
  ];
  fs.writeFileSync(filePath, createZip(files));
}

function buildCustomerSheets(model) {
  const { estimate, items } = model;
  return [
    {
      name: 'Summary',
      rows: [
        ['ECOREAN 고객용 견적서'],
        ['견적번호', estimate.id],
        ['고객명', estimate.customerName],
        ['현장명', estimate.siteName],
        ['총 견적금액', estimate.revenue],
        ['결제조건', '계약금 30% / 중도금 40% / 잔금 30%']
      ]
    },
    {
      name: '공정별 금액',
      rows: [
        ['공정', '항목', '수량', '단가', '금액'],
        ...items.map((item) => [item.category, item.itemName, item.quantity, item.customerUnitPrice, item.customerTotal])
      ]
    }
  ];
}

function buildInternalSheets(model) {
  const { estimate, items } = model;
  return [
    {
      name: 'Summary KPI',
      rows: [
        ['ECOREAN 내부 원가표'],
        ['견적번호', estimate.id],
        ['고객가', estimate.revenue],
        ['총 원가', estimate.totalCost],
        ['마진', estimate.expectedMargin],
        ['마진율', `${(Number(estimate.expectedMarginRate || 0) * 100).toFixed(1)}%`],
        ['PCE 결과', estimate.pceDecision]
      ]
    },
    {
      name: '공정별 원가',
      rows: [
        ['공정', '고객금액', '원가합계', '마진', '마진율'],
        ...groupItems(items).map((row) => [row.category, row.customerTotal, row.internalTotal, row.margin, row.customerTotal > 0 ? `${((row.margin / row.customerTotal) * 100).toFixed(1)}%` : '0.0%'])
      ]
    },
    {
      name: '상세 항목',
      rows: [
        ['공정', '항목', '수량', '고객단가', '고객금액', '자재비', '노무비', '외주비', '원가합계', '마진', '마진율'],
        ...items.map((item) => [item.category, item.itemName, item.quantity, item.customerUnitPrice, item.customerTotal, item.materialCost, item.laborCost, item.subcontractCost, item.internalTotal, item.margin, `${(Number(item.marginRate || 0) * 100).toFixed(1)}%`])
      ]
    }
  ];
}

function exportEstimateDocument({ model, type, format, outputDir }) {
  ensureDir(outputDir);
  const safeType = type === 'internal' ? 'internal' : 'customer';
  const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
  const filePath = path.join(outputDir, `estimate_${model.estimate.id}_${safeType}.${safeFormat}`);

  if (safeFormat === 'pdf') {
    createBasicPdf(filePath, buildPdfLines(model, safeType));
  } else {
    createXlsx(filePath, safeType === 'customer' ? buildCustomerSheets(model) : buildInternalSheets(model));
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    documentType: safeType,
    format: safeFormat,
    bytes: fs.statSync(filePath).size
  };
}

module.exports = {
  exportEstimateDocument,
  buildPdfLines,
  buildCustomerSheets,
  buildInternalSheets,
  createBasicPdf,
  createXlsx
};
