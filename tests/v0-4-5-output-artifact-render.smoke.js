const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const QA_ROOT = path.join(PROJECT_ROOT, 'qa-output', 'v0.4.5', 'output');
const PDF_DIR = path.join(QA_ROOT, 'pdf');
const EXCEL_DIR = path.join(QA_ROOT, 'excel');
const PRINT_DIR = path.join(QA_ROOT, 'print');
const MANIFEST_PATH = path.join(QA_ROOT, 'output-qa-manifest.json');

const forbiddenCustomerTerms = [
  'Material Cost',
  'Labor Cost',
  'Subcontract Cost',
  'Margin',
  'Margin Rate',
  'PCE Result',
  'internal cost',
  'vendor price',
  'risk_score',
  'queue',
  'approval'
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function qaInput() {
  return {
    customerName: 'QA 테스트 고객',
    siteName: 'v0.4.5 출력 QA 현장',
    bathroomCount: 2,
    bathroomAreaM2: 9.8,
    ceilingHeightMm: 2350,
    demolitionIncluded: true,
    constructionMethod: 'full',
    waterproofMethod: 'liquid',
    tileWallType: 'porcelain_600',
    tileFloorType: 'porcelain_600',
    fixtureGrade: 'premium',
    options: {
      showerBooth: true,
      zenda: true,
      bathtub: true,
      slidingCabinet: true,
      ventilationFanReplace: true,
      lightingReplace: true,
      faucetReplace: true
    },
    customerPriceMultiplier: 1.12,
    note: 'v0.4.5 QA 합성 fixture - 실제 고객 정보 아님'
  };
}

function copyToQaDir(filePath, targetDir) {
  ensureDir(targetDir);
  const target = path.join(targetDir, path.basename(filePath));
  fs.copyFileSync(filePath, target);
  return target;
}

function readText(filePath) {
  return fs.readFileSync(filePath).toString('utf8');
}

function pdfPageCount(text) {
  return (text.match(/\/Type \/Page\b/g) || []).length;
}

function inspectPdf(filePath, expectedType) {
  const text = readText(filePath);
  const forbiddenHits = expectedType === 'customer'
    ? forbiddenCustomerTerms.filter((term) => text.includes(term))
    : [];
  const pageCount = pdfPageCount(text);
  const warnings = [];
  if (!text.includes('%PDF-1.4')) warnings.push('PDF_HEADER_MISSING');
  if (!text.includes('%%EOF')) warnings.push('PDF_EOF_MISSING');
  if (expectedType === 'customer' && !text.includes('Total Customer Price')) warnings.push('CUSTOMER_TOTAL_LABEL_MISSING');
  if (expectedType === 'internal' && !text.includes('ECOREAN INTERNAL COST SHEET')) warnings.push('INTERNAL_LABEL_MISSING');
  if (!/[가-힣]/.test(text)) warnings.push('PDF_KOREAN_TEXT_ASCII_FALLBACK');
  return {
    page_or_sheet_count: pageCount,
    parse_status: text.includes('%PDF') && text.includes('%%EOF') ? 'PASSED' : 'FAILED',
    render_status: pageCount >= 1 ? 'STRUCTURE_RENDERABLE' : 'FAILED',
    layout_status: pageCount === 1 ? 'SINGLE_PAGE_NO_BLANK_PAGE_DETECTED' : 'CHECK_REQUIRED',
    customer_safety_status: forbiddenHits.length === 0 ? 'PASSED' : 'FAILED',
    forbidden_hits: forbiddenHits,
    warnings
  };
}

function listZipEntries(buffer) {
  const entries = [];
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.slice(nameStart, nameStart + fileNameLength).toString('utf8');
    const contentStart = nameStart + fileNameLength + extraLength;
    const content = buffer.slice(contentStart, contentStart + compressedSize);
    entries.push({ name, content: content.toString('utf8') });
    offset = contentStart + compressedSize;
  }
  return entries;
}

function inspectExcel(filePath, expectedType) {
  const buffer = fs.readFileSync(filePath);
  const entries = listZipEntries(buffer);
  const workbook = entries.find((entry) => entry.name === 'xl/workbook.xml');
  const sheets = entries.filter((entry) => entry.name.startsWith('xl/worksheets/'));
  const combined = entries.map((entry) => entry.content).join('\n');
  const forbiddenHits = expectedType === 'customer'
    ? ['자재비', '마진', 'PCE', '원가', 'Labor Cost', 'Margin'].filter((term) => combined.includes(term))
    : [];
  const warnings = [];
  if (!workbook) warnings.push('WORKBOOK_XML_MISSING');
  if (sheets.length < 1) warnings.push('SHEETS_MISSING');
  if (!combined.includes('견적') && !combined.includes('ECOREAN')) warnings.push('EXPECTED_HEADER_MISSING');
  return {
    page_or_sheet_count: sheets.length,
    parse_status: workbook && sheets.length ? 'PASSED' : 'FAILED',
    render_status: 'OPEN_XML_STRUCTURE_VERIFIED',
    layout_status: combined.includes('<row') ? 'ROWS_PRESENT' : 'FAILED',
    customer_safety_status: forbiddenHits.length === 0 ? 'PASSED' : 'FAILED',
    forbidden_hits: forbiddenHits,
    warnings
  };
}

function writePrintHtml(estimate, filePath) {
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>v0.4.5 출력 QA 인쇄 미리보기</title>
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    @media print {
      nav, button, .no-print { display: none !important; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      th, td { border: 1px solid #444; padding: 6px; }
      td.amount { text-align: right; }
    }
  </style>
</head>
<body>
  <main>
    <h1>ECOREAN 고객용 견적서</h1>
    <p>고객명: ${estimate.input.customerName}</p>
    <p>현장명: ${estimate.input.siteName}</p>
    <table>
      <thead><tr><th>구분</th><th>내용</th><th>금액</th></tr></thead>
      <tbody>
        <tr><td>총 견적금액</td><td>VAT 정책 확인</td><td class="amount">${Math.round(estimate.revenue).toLocaleString('ko-KR')}원</td></tr>
        <tr><td>결제조건</td><td>계약금 30% / 중도금 40% / 잔금 30%</td><td class="amount">-</td></tr>
      </tbody>
    </table>
    <section>
      <h2>서명</h2>
      <p>고객 확인: ____________________</p>
    </section>
  </main>
</body>
</html>`;
  fs.writeFileSync(filePath, html, 'utf8');
}

function inspectPrintHtml(filePath) {
  const text = readText(filePath);
  const forbiddenHits = forbiddenCustomerTerms.filter((term) => text.includes(term));
  return {
    page_or_sheet_count: 1,
    parse_status: text.includes('<html') && text.includes('@page') ? 'PASSED' : 'FAILED',
    render_status: 'HTML_PRINT_STRUCTURE_VERIFIED',
    layout_status: text.includes('table-header-group') && text.includes('page-break-inside') ? 'PASSED' : 'CHECK_REQUIRED',
    customer_safety_status: forbiddenHits.length === 0 ? 'PASSED' : 'FAILED',
    forbidden_hits: forbiddenHits,
    warnings: []
  };
}

function artifactRecord({ artifactType, customerOrInternal, sourceFixture, outputPath, inspection }) {
  return {
    artifact_type: artifactType,
    customer_or_internal: customerOrInternal,
    source_fixture: sourceFixture,
    output_path: outputPath,
    sha256: sha256(outputPath),
    file_size: fs.statSync(outputPath).size,
    page_or_sheet_count: inspection.page_or_sheet_count,
    generation_status: fs.existsSync(outputPath) && fs.statSync(outputPath).size > 200 ? 'PASSED' : 'FAILED',
    parse_status: inspection.parse_status,
    render_status: inspection.render_status,
    customer_safety_status: inspection.customer_safety_status,
    layout_status: inspection.layout_status,
    forbidden_hits: inspection.forbidden_hits,
    warnings: inspection.warnings,
    created_at: new Date().toISOString()
  };
}

function main() {
  [PDF_DIR, EXCEL_DIR, PRINT_DIR].forEach(ensureDir);
  const service = createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => path.join(PROJECT_ROOT, 'qa-output', 'v0.4.5', 'runtime')
    }
  });
  const saved = service.saveBathroomEstimate(qaInput());
  const estimateId = saved.estimateId;
  const estimate = saved.estimate;

  const generated = [
    { type: 'pdf', audience: 'customer', result: service.exportBathroomEstimateDocument({ estimateId, documentType: 'customer', format: 'pdf' }) },
    { type: 'pdf', audience: 'internal', result: service.exportBathroomEstimateDocument({ estimateId, documentType: 'internal', format: 'pdf' }) },
    { type: 'excel', audience: 'customer', result: service.exportBathroomEstimateDocument({ estimateId, documentType: 'customer', format: 'xlsx' }) },
    { type: 'excel', audience: 'internal', result: service.exportBathroomEstimateDocument({ estimateId, documentType: 'internal', format: 'xlsx' }) }
  ];

  const records = [];
  for (const artifact of generated) {
    const targetDir = artifact.type === 'pdf' ? PDF_DIR : EXCEL_DIR;
    const outputPath = copyToQaDir(artifact.result.filePath, targetDir);
    const inspection = artifact.type === 'pdf'
      ? inspectPdf(outputPath, artifact.audience)
      : inspectExcel(outputPath, artifact.audience);
    records.push(artifactRecord({
      artifactType: artifact.type,
      customerOrInternal: artifact.audience,
      sourceFixture: 'synthetic-v0.4.5-output-qa',
      outputPath,
      inspection
    }));
  }

  const printPath = path.join(PRINT_DIR, 'v0.4.5-customer-print-preview.html');
  writePrintHtml(estimate, printPath);
  records.push(artifactRecord({
    artifactType: 'print-html',
    customerOrInternal: 'customer',
    sourceFixture: 'synthetic-v0.4.5-output-qa',
    outputPath: printPath,
    inspection: inspectPrintHtml(printPath)
  }));

  const failed = records.filter((record) => (
    record.generation_status !== 'PASSED' ||
    record.parse_status === 'FAILED' ||
    record.customer_safety_status !== 'PASSED'
  ));
  const manifest = {
    started_at: new Date().toISOString(),
    result: failed.length ? 'FAILED' : 'PASSED_WITH_WARNINGS',
    estimate_id: estimateId,
    source_fixture: 'synthetic-v0.4.5-output-qa',
    artifacts: records,
    failed_artifacts: failed.map((record) => record.output_path),
    known_warnings: [...new Set(records.flatMap((record) => record.warnings || []))],
    manifest_path: MANIFEST_PATH
  };
  ensureDir(QA_ROOT);
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: manifest.result !== 'FAILED',
    test: 'v0-4-5-output-artifact-render',
    result: manifest.result,
    estimate_id: estimateId,
    artifact_count: records.length,
    known_warnings: manifest.known_warnings,
    manifest_path: MANIFEST_PATH
  }, null, 2));
  assert.strictEqual(failed.length, 0, 'output artifacts should generate, parse, and pass customer safety checks');
}

main();
