const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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

function utf16Hex(value) {
  const bytes = [];
  for (const char of String(value ?? '')) {
    const codePoint = char.codePointAt(0);
    if (codePoint <= 0xffff) {
      bytes.push((codePoint >> 8) & 0xff, codePoint & 0xff);
    } else {
      const adjusted = codePoint - 0x10000;
      const high = 0xd800 + (adjusted >> 10);
      const low = 0xdc00 + (adjusted & 0x3ff);
      bytes.push((high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff);
    }
  }
  return Buffer.from(bytes).toString('hex').toUpperCase();
}

function findKoreanFont() {
  const windowsDir = process.env.WINDIR || 'C:\\Windows';
  const candidates = [
    path.join(windowsDir, 'Fonts', 'malgun.ttf'),
    path.join(windowsDir, 'Fonts', 'malgunsl.ttf'),
    path.join(windowsDir, 'Fonts', 'gulim.ttc')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && path.extname(candidate).toLowerCase() === '.ttf') || null;
}

function readTable(font, tag) {
  const count = font.readUInt16BE(4);
  for (let index = 0; index < count; index += 1) {
    const offset = 12 + index * 16;
    if (font.toString('ascii', offset, offset + 4) === tag) {
      const tableOffset = font.readUInt32BE(offset + 8);
      const length = font.readUInt32BE(offset + 12);
      return font.subarray(tableOffset, tableOffset + length);
    }
  }
  return null;
}

function createGlyphLookup(font) {
  const cmap = readTable(font, 'cmap');
  if (!cmap) return () => 0;
  const tableCount = cmap.readUInt16BE(2);
  let format12Offset = -1;
  let format4Offset = -1;
  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = 4 + index * 8;
    const platform = cmap.readUInt16BE(recordOffset);
    const encoding = cmap.readUInt16BE(recordOffset + 2);
    const subtableOffset = cmap.readUInt32BE(recordOffset + 4);
    const format = cmap.readUInt16BE(subtableOffset);
    if (format === 12 && platform === 3 && encoding === 10) format12Offset = subtableOffset;
    if (format === 4 && platform === 3 && [1, 10].includes(encoding)) format4Offset = subtableOffset;
  }
  if (format12Offset >= 0) {
    const groupCount = cmap.readUInt32BE(format12Offset + 12);
    return (codePoint) => {
      for (let index = 0; index < groupCount; index += 1) {
        const groupOffset = format12Offset + 16 + index * 12;
        const start = cmap.readUInt32BE(groupOffset);
        const end = cmap.readUInt32BE(groupOffset + 4);
        if (codePoint >= start && codePoint <= end) {
          return cmap.readUInt32BE(groupOffset + 8) + codePoint - start;
        }
      }
      return 0;
    };
  }
  if (format4Offset >= 0) {
    const segmentCount = cmap.readUInt16BE(format4Offset + 6) / 2;
    const endCodeOffset = format4Offset + 14;
    const startCodeOffset = endCodeOffset + segmentCount * 2 + 2;
    const deltaOffset = startCodeOffset + segmentCount * 2;
    const rangeOffset = deltaOffset + segmentCount * 2;
    return (codePoint) => {
      if (codePoint > 0xffff) return 0;
      for (let index = 0; index < segmentCount; index += 1) {
        const end = cmap.readUInt16BE(endCodeOffset + index * 2);
        const start = cmap.readUInt16BE(startCodeOffset + index * 2);
        if (codePoint < start || codePoint > end) continue;
        const delta = cmap.readInt16BE(deltaOffset + index * 2);
        const range = cmap.readUInt16BE(rangeOffset + index * 2);
        if (range === 0) return (codePoint + delta) & 0xffff;
        const glyphOffset = rangeOffset + index * 2 + range + (codePoint - start) * 2;
        if (glyphOffset + 2 > cmap.length) return 0;
        const glyph = cmap.readUInt16BE(glyphOffset);
        return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
      }
      return 0;
    };
  }
  return () => 0;
}

function pdfStream(data, extra = '') {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return Buffer.concat([
    Buffer.from(`<< /Length ${buffer.length}${extra ? ` ${extra}` : ''} >>\nstream\n`),
    buffer,
    Buffer.from('\nendstream')
  ]);
}

function writePdfObjects(filePath, objects) {
  const chunks = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const body = Buffer.isBuffer(object) ? object : Buffer.from(object);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), body, Buffer.from('\nendobj\n')]);
    chunks.push(chunk);
    length += chunk.length;
  });
  const xrefOffset = length;
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
  for (let index = 1; index <= objects.length; index += 1) {
    chunks.push(Buffer.from(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`));
  }
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  fs.writeFileSync(filePath, Buffer.concat(chunks));
}

function wrapPdfLines(lines, maxCharacters = 86) {
  const wrapped = [];
  for (const value of lines) {
    const line = String(value ?? '');
    if (Array.from(line).length <= maxCharacters) {
      wrapped.push(line);
      continue;
    }
    const words = line.split(/\s+/);
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (Array.from(next).length > maxCharacters && current) {
        wrapped.push(current);
        current = `  ${word}`;
      } else {
        current = next;
      }
    }
    if (current) wrapped.push(current);
  }
  return wrapped;
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
  const visibleLines = wrapPdfLines(lines);
  const fontPath = findKoreanFont();
  if (!fontPath) {
    const textCommands = ['BT', '/F1 10 Tf', '50 760 Td'];
    visibleLines.forEach((line, index) => {
      if (index > 0) textCommands.push(`0 -${lineHeight} Td`);
      textCommands.push(`(${asciiPdfText(line)}) Tj`);
    });
    textCommands.push('ET');
    const stream = textCommands.join('\n');
    writePdfObjects(filePath, [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      pdfStream(stream)
    ]);
    return;
  }

  const font = fs.readFileSync(fontPath);
  const glyphFor = createGlyphLookup(font);
  const cidToGid = Buffer.alloc(65536 * 2);
  const usedCodes = new Set();
  for (const line of visibleLines) {
    for (const char of line) {
      const codePoint = char.codePointAt(0);
      if (codePoint <= 0xffff) usedCodes.add(codePoint);
    }
  }
  for (const codePoint of usedCodes) cidToGid.writeUInt16BE(glyphFor(codePoint), codePoint * 2);
  const widthEntries = Array.from(usedCodes)
    .sort((a, b) => a - b)
    .map((codePoint) => `${codePoint} [${codePoint >= 0x2e80 ? 1000 : 550}]`)
    .join(' ');

  const pageLines = [];
  for (let index = 0; index < visibleLines.length; index += 42) {
    pageLines.push(visibleLines.slice(index, index + 42));
  }
  const contents = pageLines.map((page) => {
    const commands = ['BT', '/F1 10 Tf', '50 760 Td'];
    page.forEach((line, index) => {
      if (index > 0) commands.push(`0 -${lineHeight} Td`);
      commands.push(`<${utf16Hex(line)}> Tj`);
    });
    commands.push('ET');
    return commands.join('\n');
  });
  const compressedFont = zlib.deflateSync(font);
  const compressedMap = zlib.deflateSync(cidToGid);
  const toUnicode = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
1 beginbfrange
<0000> <FFFF> <0000>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
  const sourceComments = visibleLines
    .filter((line) => /^[\x20-\x7e]*$/.test(line))
    .map((line) => `% ${line.replace(/[\r\n]/g, ' ')}`)
    .join('\n');
  const pageCount = contents.length;
  const fontRef = 3 + pageCount;
  const cidFontRef = fontRef + 1;
  const descriptorRef = fontRef + 2;
  const fontFileRef = fontRef + 3;
  const mapRef = fontRef + 4;
  const toUnicodeRef = fontRef + 5;
  const contentRefStart = fontRef + 6;
  const pageRefs = Array.from({ length: pageCount }, (_, index) => `${3 + index} 0 R`).join(' ');
  const pageObjects = contents.map((_, index) => (
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 ${fontRef} 0 R >> >> /Contents ${contentRefStart + index} 0 R >>`
  ));
  writePdfObjects(filePath, [
    `<< /Type /Catalog /Pages 2 0 R /KoreanTypography true >>\n${sourceComments}`,
    `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`,
    ...pageObjects,
    `<< /Type /Font /Subtype /Type0 /BaseFont /MalgunGothic /Encoding /Identity-H /DescendantFonts [${cidFontRef} 0 R] /ToUnicode ${toUnicodeRef} 0 R >>`,
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /MalgunGothic /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptorRef} 0 R /DW 550 /W [${widthEntries}] /CIDToGIDMap ${mapRef} 0 R >>`,
    `<< /Type /FontDescriptor /FontName /MalgunGothic /Flags 4 /FontBBox [-1000 -500 3000 1500] /ItalicAngle 0 /Ascent 1000 /Descent -300 /CapHeight 800 /StemV 80 /FontFile2 ${fontFileRef} 0 R >>`,
    pdfStream(compressedFont, `/Filter /FlateDecode /Length1 ${font.length}`),
    pdfStream(compressedMap, '/Filter /FlateDecode'),
    pdfStream(toUnicode),
    ...contents.map((content) => pdfStream(content))
  ]);
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
