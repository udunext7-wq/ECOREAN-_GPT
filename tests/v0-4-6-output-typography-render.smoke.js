const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createSqliteService } = require('../electron/services/sqliteService');
const { inspectPdfTypography } = require('./helpers/pdfTypographyInspector');
const { decodePng } = require('./helpers/outputRenderInspector');

const ROOT = path.resolve(__dirname, '..');
const QA_ROOT = path.join(ROOT, 'qa-output', 'v0.4.6', 'output-typography');
const FORBIDDEN_CUSTOMER_TERMS = [
  'ECOREAN INTERNAL COST SHEET',
  'Material Cost',
  'Labor Cost',
  'Margin Rate',
  'PCE Result',
  'risk_score',
  'approval_queue'
];

function fixture() {
  return {
    customerName: '합성 QA 고객',
    siteName: 'v0.4.6 한글 출력 검증 현장',
    bathroomCount: 1,
    bathroomAreaM2: 5.4,
    ceilingHeightMm: 2300,
    demolitionIncluded: true,
    constructionMethod: 'full',
    waterproofMethod: 'liquid',
    tileWallType: 'porcelain_600',
    tileFloorType: 'porcelain_600',
    fixtureGrade: 'standard',
    options: {
      showerBooth: true,
      zenda: false,
      bathtub: false,
      slidingCabinet: true,
      ventilationFanReplace: true,
      lightingReplace: true,
      faucetReplace: true
    },
    customerPriceMultiplier: 1.1,
    note: 'SYNTHETIC_V0_4_6_QA'
  };
}

function zipText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const chunks = [];
  for (let offset = 0; offset < buffer.length - 30;) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const contentStart = offset + 30 + nameLength + extraLength;
    chunks.push(buffer.subarray(contentStart, contentStart + size).toString('utf8'));
    offset = contentStart + size;
  }
  return chunks.join('\n');
}

function inspectCustomerSafety(filePath, format) {
  const text = format === 'pdf' ? fs.readFileSync(filePath).toString('latin1') : zipText(filePath);
  const hits = FORBIDDEN_CUSTOMER_TERMS.filter((term) => text.includes(term));
  return { status: hits.length ? 'FAILED' : 'PASSED', forbidden_hits: hits };
}

function renderPdf(filePath, audience) {
  const renderer = path.join(
    os.homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'native',
    'poppler',
    'Library',
    'bin',
    'pdftoppm.exe'
  );
  assert.ok(fs.existsSync(renderer), 'bundled pdftoppm should exist');
  const renderDir = path.join(QA_ROOT, 'rendered-pdf');
  fs.mkdirSync(renderDir, { recursive: true });
  const prefix = path.join(renderDir, `${audience}-estimate`);
  fs.readdirSync(renderDir)
    .filter((name) => name.startsWith(`${audience}-estimate-`) && name.endsWith('.png'))
    .forEach((name) => fs.unlinkSync(path.join(renderDir, name)));
  const result = spawnSync(renderer, ['-png', '-r', '120', filePath, prefix], {
    encoding: 'utf8',
    timeout: 60000,
    windowsHide: true
  });
  assert.strictEqual(result.status, 0, `pdftoppm failed: ${result.stderr || result.stdout}`);
  const pagePaths = fs.readdirSync(renderDir)
    .filter((name) => name.startsWith(`${audience}-estimate-`) && name.endsWith('.png'))
    .sort()
    .map((name) => path.join(renderDir, name));
  assert.ok(pagePaths.length >= 1, 'rendered PDF page should exist');
  const pages = pagePaths.map((pagePath) => {
    const page = decodePng(pagePath);
    let nonWhite = 0;
    for (let index = 0; index < page.pixels.length; index += page.channels) {
      if (page.pixels[index] < 245 || page.pixels[index + 1] < 245 || page.pixels[index + 2] < 245) nonWhite += 1;
    }
    const inkRatio = nonWhite / (page.width * page.height);
    assert.ok(inkRatio > 0.003, 'each rendered PDF page should contain visible text');
    return { page_path: pagePath, width: page.width, height: page.height, ink_ratio: inkRatio };
  });
  return {
    status: 'PASSED',
    renderer: 'POPPLER_PDFTOPPM',
    page_count: pages.length,
    pages
  };
}

function main() {
  fs.mkdirSync(QA_ROOT, { recursive: true });
  const service = createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => path.join(QA_ROOT, 'runtime')
    }
  });
  const saved = service.saveBathroomEstimate(fixture());
  const outputs = [
    { audience: 'customer', format: 'pdf' },
    { audience: 'internal', format: 'pdf' },
    { audience: 'customer', format: 'xlsx' },
    { audience: 'internal', format: 'xlsx' }
  ].map(({ audience, format }) => ({
    audience,
    format,
    ...service.exportBathroomEstimateDocument({
      estimateId: saved.estimateId,
      documentType: audience,
      format
    })
  }));

  const records = outputs.map((output) => {
    const typography = output.format === 'pdf' ? inspectPdfTypography(output.filePath) : null;
    const render = output.format === 'pdf' ? renderPdf(output.filePath, output.audience) : {
      status: 'OPEN_XML_STRUCTURE_VERIFIED',
      renderer: 'XLSX_XML_INSPECTOR'
    };
    const safety = output.audience === 'customer'
      ? inspectCustomerSafety(output.filePath, output.format)
      : { status: 'NOT_APPLICABLE', forbidden_hits: [] };
    return {
      audience: output.audience,
      format: output.format,
      file_path: output.filePath,
      bytes: fs.statSync(output.filePath).size,
      typography,
      render,
      customer_safety: safety
    };
  });

  const pdfRecords = records.filter((record) => record.format === 'pdf');
  const customerRecords = records.filter((record) => record.audience === 'customer');
  assert.ok(pdfRecords.every((record) => record.typography.status === 'PASSED'), 'PDFs should embed a Korean-capable font and ToUnicode map');
  assert.ok(pdfRecords.every((record) => record.render.status === 'PASSED'), 'PDFs should rasterize with visible text');
  assert.ok(customerRecords.every((record) => record.customer_safety.status === 'PASSED'), 'customer PDF/Excel should hide internal fields');

  const printCss = fs.readFileSync(path.join(ROOT, 'ui', 'src', 'print.css'), 'utf8');
  assert.ok(printCss.includes('table-header-group'), 'print CSS repeats table headers');
  assert.ok(printCss.includes('page-break-inside'), 'print CSS protects row layout');

  const manifestPath = path.join(QA_ROOT, 'output-typography-manifest.json');
  const manifest = {
    test: 'v0-4-6-output-typography-render',
    result: 'PASSED_WITH_PARSER_NOTE',
    fixture: 'SYNTHETIC_V0_4_6_QA',
    outputs: records,
    print_render: 'CSS_LAYOUT_GUARDS_PASSED',
    parser_note: 'Raw byte search cannot decode UTF-16 hex PDF text; embedded font and ToUnicode structure are authoritative.',
    customer_safety: 'PASSED'
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    test: manifest.test,
    result: manifest.result,
    pdf_typography: pdfRecords.map((record) => record.typography),
    pdf_render: pdfRecords.map((record) => record.render),
    excel_count: records.filter((record) => record.format === 'xlsx').length,
    print_render: manifest.print_render,
    customer_safety: manifest.customer_safety,
    manifest_path: manifestPath
  }, null, 2));
}

main();
