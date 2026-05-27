const fs = require('fs');
const path = require('path');

const PAGE_FORMATS = {
  A4_PORTRAIT: { labelKo: 'A4 세로', width: 595, height: 842, orientation: 'portrait', safeMarginMm: 12 },
  A4_LANDSCAPE: { labelKo: 'A4 가로', width: 842, height: 595, orientation: 'landscape', safeMarginMm: 12 },
  A3_LANDSCAPE: { labelKo: 'A3 가로', width: 1191, height: 842, orientation: 'landscape', safeMarginMm: 14 }
};

const EXPORT_MODES = {
  CLIENT_PROPOSAL: {
    labelKo: '고객 제안서 PDF',
    filePrefix: 'proposal_board',
    coverTitleKo: '디자인 제안서',
    hiddenFields: ['internalCost', 'margin', 'pceDecision', 'riskScores', 'internalNotes'],
    visibleBlocks: ['designConcept', 'approvedVisuals', 'spaceSummary', 'materialDirection', 'constructionScope', 'customerEstimateSummary', 'paymentCondition', 'signature']
  },
  PORTFOLIO_BOARD: {
    labelKo: '포트폴리오 PDF',
    filePrefix: 'portfolio_board',
    coverTitleKo: '포트폴리오 보드',
    hiddenFields: ['customerPersonalData', 'internalMargin', 'financialDetails'],
    visibleBlocks: ['projectConcept', 'beforeAfter', 'featuredVisuals', 'designPoints', 'materials', 'spaceTransformation', 'completionQuality']
  },
  MATERIAL_BOARD: {
    labelKo: '자재 보드 PDF',
    filePrefix: 'material_board',
    coverTitleKo: '자재 제안서',
    hiddenFields: ['internalCost', 'margin', 'pceDecision', 'supplierPrice'],
    visibleBlocks: ['materialDirection', 'approvedVisuals', 'materialBoard', 'notes']
  },
  SPACE_BOARD: {
    labelKo: '공간별 보드 PDF',
    filePrefix: 'space_board',
    coverTitleKo: '공간별 제안서',
    hiddenFields: ['internalCost', 'margin', 'riskScores'],
    visibleBlocks: ['spaceSummary', 'floorplan', 'isometric', 'perspectiveGallery', 'constructionScope']
  }
};

const BOARD_TEMPLATES = [
  {
    id: 'TPL-PREMIUM-MINIMAL',
    templateName: 'Premium Minimal',
    typography: { fontFamily: 'system-ui, Segoe UI, Arial, sans-serif', headingScale: 1, bodyScale: 1, sectionTitleStyle: 'thin_rule' },
    spacing: { pageMarginMm: 14, sectionGap: 24, blockGap: 12 },
    gridStyle: 'two_column_editorial',
    imageRatio: '4:3',
    tableStyle: 'minimal_lines',
    imageBorderStyle: 'hairline',
    sectionOrdering: ['conceptOverview', 'moodboard', 'floorplan', 'isometric', 'perspectiveGallery', 'materialBoard', 'estimateSummary', 'constructionScope', 'closingSignature'],
    backgroundStyle: 'white'
  },
  {
    id: 'TPL-LUXURY-EDITORIAL',
    templateName: 'Luxury Editorial',
    typography: { fontFamily: 'Georgia, Segoe UI, Arial, sans-serif', headingScale: 1.12, bodyScale: 1, sectionTitleStyle: 'editorial_caps' },
    spacing: { pageMarginMm: 16, sectionGap: 30, blockGap: 14 },
    gridStyle: 'large_feature_image',
    imageRatio: '3:2',
    tableStyle: 'soft_grid',
    imageBorderStyle: 'soft_shadow',
    sectionOrdering: ['conceptOverview', 'perspectiveGallery', 'moodboard', 'materialBoard', 'floorplan', 'estimateSummary', 'closingSignature'],
    backgroundStyle: 'warm_white'
  },
  {
    id: 'TPL-ARCH-WHITE',
    templateName: 'Architectural White',
    typography: { fontFamily: 'Segoe UI, Arial, sans-serif', headingScale: 0.98, bodyScale: 0.95, sectionTitleStyle: 'technical_rule' },
    spacing: { pageMarginMm: 12, sectionGap: 18, blockGap: 10 },
    gridStyle: 'technical_grid',
    imageRatio: '16:9',
    tableStyle: 'technical_lines',
    imageBorderStyle: 'thin_gray',
    sectionOrdering: ['conceptOverview', 'floorplan', 'isometric', 'perspectiveGallery', 'materialBoard', 'constructionScope', 'estimateSummary', 'closingSignature'],
    backgroundStyle: 'architectural_white'
  },
  {
    id: 'TPL-DARK-LUXURY',
    templateName: 'Dark Luxury',
    typography: { fontFamily: 'Segoe UI, Arial, sans-serif', headingScale: 1.04, bodyScale: 1, sectionTitleStyle: 'metal_rule' },
    spacing: { pageMarginMm: 15, sectionGap: 24, blockGap: 12 },
    gridStyle: 'dark_gallery',
    imageRatio: '4:3',
    tableStyle: 'dark_lines',
    imageBorderStyle: 'metal_edge',
    sectionOrdering: ['conceptOverview', 'perspectiveGallery', 'isometric', 'materialBoard', 'closingSignature'],
    backgroundStyle: 'dark_luxury'
  },
  {
    id: 'TPL-CLEAN-COMMERCIAL',
    templateName: 'Clean Commercial',
    typography: { fontFamily: 'Segoe UI, Arial, sans-serif', headingScale: 1, bodyScale: 0.98, sectionTitleStyle: 'bold_left' },
    spacing: { pageMarginMm: 13, sectionGap: 20, blockGap: 10 },
    gridStyle: 'commercial_proposal_grid',
    imageRatio: '4:3',
    tableStyle: 'commercial_table',
    imageBorderStyle: 'clean_card',
    sectionOrdering: ['conceptOverview', 'moodboard', 'floorplan', 'perspectiveGallery', 'estimateSummary', 'constructionScope', 'closingSignature'],
    backgroundStyle: 'clean_white'
  }
];

function money(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')} KRW`;
}

function asciiPdfText(value) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()\\]/g, (match) => `\\${match}`);
}

function mmToPt(mm) {
  return Number(mm || 0) * 2.83465;
}

function normalizePageFormat(format) {
  return PAGE_FORMATS[format] ? format : 'A3_LANDSCAPE';
}

function normalizeExportMode(mode, boardType) {
  const candidate = String(mode || boardType || 'CLIENT_PROPOSAL').toUpperCase();
  if (EXPORT_MODES[candidate]) return candidate;
  if (candidate === 'BEFORE_AFTER_BOARD' || candidate === 'CONCEPT_BOARD') return 'PORTFOLIO_BOARD';
  return 'CLIENT_PROPOSAL';
}

function normalizeTemplate(templateId) {
  if (templateId === 'TPL-ARCH-PRESENTATION') return BOARD_TEMPLATES.find((template) => template.id === 'TPL-ARCH-WHITE');
  if (templateId === 'TPL-CLEAN-WHITE-PROPOSAL') return BOARD_TEMPLATES.find((template) => template.id === 'TPL-CLEAN-COMMERCIAL');
  return BOARD_TEMPLATES.find((template) => template.id === templateId) || BOARD_TEMPLATES[0];
}

function normalizeImageFitMode(mode) {
  const value = String(mode || 'CONTAIN').toUpperCase();
  if (['AUTO', 'CONTAIN', 'COVER', 'PRESERVE'].includes(value)) return value;
  return 'CONTAIN';
}

function imageFitLabelKo(mode) {
  const map = {
    AUTO: '이미지 맞춤',
    PRESERVE: '비율 유지',
    COVER: '꽉 채우기',
    CONTAIN: '여백 포함'
  };
  return map[normalizeImageFitMode(mode)];
}

function createTextPageStream({ page, lines, pageNumber, pageCount, projectTitle, sectionTitle, backgroundStyle }) {
  const margin = mmToPt(page.safeMarginMm);
  const top = page.height - margin;
  const lineHeight = 17;
  const isDark = backgroundStyle === 'dark_luxury' || backgroundStyle === 'dark';
  const commands = [];
  commands.push(isDark ? '0.05 0.055 0.065 rg' : '1 1 1 rg');
  commands.push(`0 0 ${page.width} ${page.height} re f`);
  commands.push(isDark ? '0.85 0.86 0.88 RG' : '0.12 0.14 0.16 RG');
  commands.push(`${margin} ${margin} ${page.width - margin * 2} ${page.height - margin * 2} re S`);
  commands.push('BT');
  commands.push('/F1 8 Tf');
  commands.push(isDark ? '0.78 0.80 0.84 rg' : '0.32 0.35 0.38 rg');
  commands.push(`${margin} ${page.height - margin + 6} Td`);
  commands.push(`(${asciiPdfText(projectTitle || 'ECOREAN')}) Tj`);
  commands.push('ET');
  commands.push('BT');
  commands.push('/F2 14 Tf');
  commands.push(isDark ? '0.95 0.95 0.92 rg' : '0.08 0.09 0.1 rg');
  commands.push(`${margin} ${top - 24} Td`);
  commands.push(`(${asciiPdfText(sectionTitle || 'Section')}) Tj`);
  commands.push('ET');
  commands.push('BT');
  commands.push('/F1 9 Tf');
  commands.push(isDark ? '0.86 0.87 0.88 rg' : '0.12 0.13 0.14 rg');
  commands.push(`${margin} ${top - 58} Td`);
  lines.slice(0, 35).forEach((line, index) => {
    if (index > 0) commands.push(`0 -${lineHeight} Td`);
    commands.push(`(${asciiPdfText(line)}) Tj`);
  });
  commands.push('ET');
  commands.push('BT');
  commands.push('/F1 8 Tf');
  commands.push(isDark ? '0.65 0.67 0.7 rg' : '0.42 0.45 0.49 rg');
  commands.push(`${margin} ${margin - 18} Td`);
  commands.push(`(ECOREAN BOC | ${asciiPdfText(sectionTitle)} | ${pageNumber}/${pageCount}) Tj`);
  commands.push('ET');
  return commands.join('\n');
}

function createPolishedPdf(filePath, pdfPages, pageFormat) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const page = PAGE_FORMATS[normalizePageFormat(pageFormat)];
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pdfPages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pdfPages.length} >>`
  ];
  pdfPages.forEach((pdfPage, index) => {
    const stream = createTextPageStream({
      page,
      lines: pdfPage.lines,
      pageNumber: index + 1,
      pageCount: pdfPages.length,
      projectTitle: pdfPage.projectTitle,
      sectionTitle: pdfPage.sectionTitle,
      backgroundStyle: pdfPage.backgroundStyle
    });
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${3 + pdfPages.length * 2} 0 R /F2 ${4 + pdfPages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join('')));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xrefOffset = Buffer.byteLength(chunks.join(''));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objects.length; index += 1) chunks.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  fs.writeFileSync(filePath, chunks.join(''));
}

function buildImagePlacement(image, index, template, imageFitMode) {
  const normalizedFit = normalizeImageFitMode(image.fitMode || imageFitMode);
  return {
    imageId: image.id || `IMAGE-${index + 1}`,
    imagePath: image.imagePath || '',
    resultType: image.resultType || 'PERSPECTIVE',
    role: index === 0 ? 'FEATURED' : 'SUPPORTING',
    ratio: image.ratio || template.imageRatio,
    order: index + 1,
    fitMode: normalizedFit,
    fitModeKo: imageFitLabelKo(normalizedFit),
    preserveAspectRatio: normalizedFit !== 'COVER',
    cropMode: normalizedFit === 'COVER' ? 'COVER_CENTER' : 'NONE',
    placeholder: !image.imagePath,
    layoutRole: index === 0 ? 'featured_image_large' : 'gallery_grid'
  };
}

function buildSection({ id, sortOrder, sectionType, titleKo, descriptionKo, images = [], table = [], notes = [], visibility = {} }) {
  return {
    id,
    sortOrder,
    sectionType,
    titleKo,
    descriptionKo,
    imageArea: {
      mode: images.length > 1 ? 'GALLERY_GRID' : 'FEATURED',
      images,
      missingImagePlaceholderKo: images.length === 0 ? '이미지 준비 중' : ''
    },
    tableArea: { rows: table },
    notes,
    visibility
  };
}

function customerSafeEstimateSummary(summary = {}) {
  return {
    totalAmount: Number(summary.totalAmount || 0),
    scheduleDays: Number(summary.scheduleDays || 0),
    paymentConditionKo: String(summary.paymentConditionKo || '계약 시 협의'),
    processGroups: (summary.processGroups || []).map((group) => ({
      processKo: String(group.processKo || group.category || '공정'),
      amount: Number(group.amount || group.customerTotal || 0)
    }))
  };
}

function safeMapGeometry(geometry = {}) {
  return {
    vertices: (geometry.vertices || []).map((vertex) => ({ id: String(vertex.id || ''), x: Number(vertex.x || 0), y: Number(vertex.y || 0) })),
    walls: (geometry.walls || []).map((wall) => ({ id: String(wall.id || ''), v1Id: String(wall.v1Id || ''), v2Id: String(wall.v2Id || '') })),
    openings: (geometry.openings || []).map((opening) => ({
      id: String(opening.id || ''),
      type: String(opening.type || 'opening'),
      spaceId: String(opening.spaceId || ''),
      x: Number(opening.x || 0),
      y: Number(opening.y || 0)
    }))
  };
}

function customerMapPageLayout(printFormat) {
  if (printFormat === 'A4_PORTRAIT') {
    return { composition: 'MAP_THEN_TABLE', mapWidthPercent: 100, tableWidthPercent: 100, imagePosition: 'AFTER_TABLE' };
  }
  if (printFormat === 'A4_LANDSCAPE') {
    return { composition: 'MAP_IMAGE_SPLIT', mapWidthPercent: 52, tableWidthPercent: 48, imagePosition: 'SIDE' };
  }
  return { composition: 'MAP_LEFT_SCOPE_RIGHT', mapWidthPercent: 58, tableWidthPercent: 42, imagePosition: 'LOWER_STRIP' };
}

function createCustomerProposalMapSection(customerMap = {}, options = {}) {
  const safeMap = customerMap || {};
  const spaces = (safeMap.spaces || []).map((space) => ({
    id: String(space.id || ''),
    name: String(space.name || '공간'),
    type: String(space.type || 'ETC'),
    areaM2: Number(space.areaM2 || 0),
    constructionScope: (space.constructionScope || []).map(String),
    finishDirectionKo: (space.finishDirectionKo || []).map(String),
    progressStatusKo: String(space.progressStatusKo || '공사 예정'),
    approvedImages: (space.approvedImages || []).map((image) => ({
      id: String(image.id || ''),
      imagePath: String(image.imagePath || ''),
      resultType: String(image.resultType || 'PERSPECTIVE')
    }))
  }));
  if (!spaces.length) return null;
  const approvedImages = (safeMap.approvedImages || []).map((image) => ({
    id: String(image.id || ''),
    imagePath: String(image.imagePath || ''),
    resultType: String(image.resultType || 'PERSPECTIVE'),
    spaceId: String(image.spaceId || ''),
    spaceName: String(image.spaceName || '')
  }));
  const designDirection = {
    style: String(safeMap.designDirection?.style || ''),
    colorTone: String(safeMap.designDirection?.colorTone || ''),
    primaryMaterials: String(safeMap.designDirection?.primaryMaterials || ''),
    lightingMood: String(safeMap.designDirection?.lightingMood || ''),
    designKeywords: String(safeMap.designDirection?.designKeywords || '')
  };
  const estimateSummary = customerSafeEstimateSummary(options.estimateSummary);
  const mapPayload = {
    renderMode: 'SVG',
    geometry: safeMapGeometry(safeMap.geometry),
    layout: customerMapPageLayout(options.printFormat),
    safeScaleMode: 'CONTAIN'
  };
  const images = approvedImages.map((image, index) => ({
    imageId: image.id || `CUSTOMER-MAP-IMAGE-${index + 1}`,
    imagePath: image.imagePath,
    resultType: image.resultType,
    role: index === 0 ? 'FEATURED' : 'SUPPORTING',
    fitMode: 'CONTAIN',
    preserveAspectRatio: true
  }));
  const section = buildSection({
    id: 'SECTION-CUSTOMER-MAP',
    sortOrder: options.sortOrder || 3,
    sectionType: 'CUSTOMER_PROPOSAL_MAP',
    titleKo: '공간 제안 맵',
    descriptionKo: '도면 구성과 공간별 공사 범위, 디자인 방향, 승인된 제안 이미지를 함께 안내합니다.',
    images,
    table: spaces.map((space) => ({
      labelKo: space.name,
      valueKo: `${space.constructionScope.join(' / ') || '공사 범위 협의'} | ${space.finishDirectionKo.join(', ') || '디자인 협의'} | ${space.progressStatusKo}`
    })),
    notes: (safeMap.publicScopeSummary || []).map(String),
    visibility: { customerSafe: true }
  });
  return {
    ...section,
    section_type: 'CUSTOMER_PROPOSAL_MAP',
    customer_safe: true,
    mapArea: mapPayload,
    map_payload: mapPayload,
    spaces,
    scope_summary: (safeMap.publicScopeSummary || []).map(String),
    design_direction: designDirection,
    approved_images: approvedImages,
    customer_estimate_summary: estimateSummary,
    safe_empty_state: '표시할 공간 정보가 없습니다.'
  };
}

function createCustomerScopeTableSection(mapSection, sortOrder = 4) {
  if (!mapSection) return null;
  return buildSection({
    id: 'SECTION-CUSTOMER-SCOPE',
    sortOrder,
    sectionType: 'CUSTOMER_SPACE_SCOPE',
    titleKo: '공간별 공사 범위',
    descriptionKo: '공간별 시공 범위와 디자인 방향, 현재 진행 상태를 고객 안내 기준으로 정리합니다.',
    table: mapSection.spaces.map((space) => ({
      labelKo: space.name,
      valueKo: `${space.constructionScope.join(' / ')} | ${space.finishDirectionKo.join(', ') || '디자인 방향 협의'} | ${space.progressStatusKo} | ${space.approvedImages.length ? '제안 이미지 연결' : '제안 이미지 준비 중'}`
    })),
    notes: ['세부 사양과 일정은 계약 확정 후 안내드립니다.'],
    visibility: { customerSafe: true }
  });
}

function createCustomerSafePdfPayload(layout) {
  const allowedSections = (layout.sections || []).map((section) => ({
    section_type: section.sectionType,
    title: section.titleKo,
    description: section.descriptionKo,
    rows: (section.tableArea?.rows || []).map((row) => ({
      label: String(row.labelKo || ''),
      value: String(row.valueKo || '')
    })),
    images: (section.imageArea?.images || []).map((image) => ({
      image_path: String(image.imagePath || ''),
      fit_mode: String(image.fitMode || 'CONTAIN')
    })),
    ...(section.sectionType === 'CUSTOMER_PROPOSAL_MAP' ? {
      map_payload: section.map_payload,
      spaces: section.spaces,
      scope_summary: section.scope_summary,
      design_direction: section.design_direction,
      approved_images: section.approved_images,
      estimate_summary: section.customer_estimate_summary
    } : {})
  }));
  return {
    customer_safe: true,
    project_name: String(layout.coverPage?.projectName || ''),
    document_title: String(layout.coverPage?.titleKo || ''),
    print_settings: {
      format: layout.printSettings.format,
      orientation: layout.printSettings.orientation,
      print_safe_inset_mm: layout.printSettings.safeMarginMm,
      prevent_overflow: true,
      preserve_image_ratio: true,
      safe_page_breaks: true
    },
    sections: allowedSections
  };
}

function buildBoardLayout(input = {}) {
  const template = normalizeTemplate(input.templateId);
  const boardType = input.boardType || 'CLIENT_PROPOSAL';
  const exportMode = normalizeExportMode(input.exportMode, boardType);
  const exportConfig = EXPORT_MODES[exportMode];
  const spaces = input.spaces || [];
  const images = input.images || [];
  const moodboard = input.moodboard || {};
  const floorplan = input.floorplan || {};
  const estimateSummary = input.estimateSummary || {};
  const printFormat = normalizePageFormat(input.printFormat || 'A3_LANDSCAPE');
  const pageFormat = PAGE_FORMATS[printFormat];
  const imageFitMode = normalizeImageFitMode(input.imageFitMode);
  const generatedAt = input.generatedAt || new Date().toISOString();
  const imagePlacements = images.length
    ? images.map((image, index) => buildImagePlacement(image, index, template, imageFitMode))
    : [buildImagePlacement({ id: 'MISSING-FEATURED', imagePath: '', resultType: 'PLACEHOLDER' }, 0, template, imageFitMode)];
  const featuredImage = imagePlacements.find((image) => image.role === 'FEATURED') || imagePlacements[0];
  const conceptKeywords = [moodboard.style, moodboard.colorTone, moodboard.primaryMaterials].filter(Boolean);
  const areaM2 = Number(input.areaM2 || spaces.reduce((sum, space) => sum + Number(space.areaM2 || 0), 0));
  const publicEstimateSummary = customerSafeEstimateSummary(estimateSummary);
  const customerMapSection = createCustomerProposalMapSection(input.customerProposalMap, {
    estimateSummary: publicEstimateSummary,
    printFormat,
    sortOrder: 3
  });
  const customerScopeSection = input.includeCustomerScopeTable !== false
    ? createCustomerScopeTableSection(customerMapSection, 4)
    : null;

  const coverPage = {
    id: 'PAGE-COVER',
    pageType: 'COVER',
    titleKo: exportConfig.coverTitleKo,
    projectName: input.projectName || 'ECOREAN Project',
    spaceTypeKo: input.spaceTypeKo || (spaces.length === 1 ? spaces[0].spaceType : '전체 공간'),
    areaM2,
    conceptKeywords,
    featuredImage,
    createdAt: generatedAt,
    logoPlaceholder: 'ECOREAN',
    pageNumber: 1
  };

  const sectionMap = {
    conceptOverview: buildSection({
      id: 'SECTION-CONCEPT',
      sortOrder: 1,
      sectionType: 'CONCEPT_OVERVIEW',
      titleKo: 'Concept Overview',
      descriptionKo: '프로젝트 컨셉, 공간 방향성, 핵심 키워드를 한 페이지에서 정리합니다.',
      images: [featuredImage],
      table: [
        { labelKo: '프로젝트명', valueKo: input.projectName || 'ECOREAN Project' },
        { labelKo: '공간 유형', valueKo: coverPage.spaceTypeKo },
        { labelKo: '면적', valueKo: `${areaM2 || 0} m2` },
        { labelKo: '컨셉 키워드', valueKo: conceptKeywords.join(', ') || '미지정' }
      ],
      notes: exportMode === 'CLIENT_PROPOSAL'
        ? ['공간 구성과 디자인 방향, 공사 범위를 중심으로 구성한 고객용 제안 자료입니다.']
        : []
    }),
    moodboard: buildSection({
      id: 'SECTION-MOODBOARD',
      sortOrder: 2,
      sectionType: 'MOODBOARD',
      titleKo: 'Moodboard',
      descriptionKo: '컬러 톤, 주요 자재, 조명 분위기를 정리합니다.',
      table: [
        { labelKo: '스타일', valueKo: moodboard.style || '미지정' },
        { labelKo: '컬러 톤', valueKo: moodboard.colorTone || '미지정' },
        { labelKo: '주요 자재', valueKo: moodboard.primaryMaterials || '미지정' },
        { labelKo: '조명 분위기', valueKo: moodboard.lightingMood || '미지정' }
      ]
    }),
    floorplan: buildSection({
      id: 'SECTION-FLOORPLAN',
      sortOrder: 3,
      sectionType: 'FLOORPLAN',
      titleKo: 'Floorplan',
      descriptionKo: `${spaces.length}개 공간 구역과 견적 연결 정보를 표시합니다.`,
      images: floorplan.filePath ? [buildImagePlacement({ id: floorplan.id || 'FLOORPLAN', imagePath: floorplan.filePath }, 0, template, 'CONTAIN')] : [],
      table: spaces.map((space) => ({ labelKo: space.spaceName, valueKo: `${space.spaceType} / ${space.areaM2 || 0} m2` }))
    }),
    isometric: buildSection({
      id: 'SECTION-ISOMETRIC',
      sortOrder: 4,
      sectionType: 'ISOMETRIC',
      titleKo: 'Isometric',
      descriptionKo: '공간 구조를 아이소메트릭 기준으로 설명합니다.',
      images: imagePlacements.filter((image) => image.imageId.includes('ISOMETRIC') || image.resultType === 'ISOMETRIC')
    }),
    perspectiveGallery: buildSection({
      id: 'SECTION-PERSPECTIVE',
      sortOrder: 5,
      sectionType: 'PERSPECTIVE_GALLERY',
      titleKo: 'Perspective Gallery',
      descriptionKo: '승인된 AI 투시도와 제안 이미지를 갤러리로 구성합니다.',
      images: imagePlacements,
      notes: ['승인된 이미지 또는 수동 첨부 이미지만 표시됩니다.']
    }),
    materialBoard: buildSection({
      id: 'SECTION-MATERIAL',
      sortOrder: 6,
      sectionType: 'MATERIAL_BOARD',
      titleKo: 'Material Board',
      descriptionKo: '타일, 바닥재, 도장, 필름, 조명, 가구 마감 방향을 정리합니다.',
      table: input.materialSelections?.length ? input.materialSelections : [
        { labelKo: '타일', valueKo: '선택 자재 기준' },
        { labelKo: '바닥재', valueKo: '선택 자재 기준' },
        { labelKo: '도장 / 필름', valueKo: '선택 사양 기준' },
        { labelKo: '조명', valueKo: '선택 사양 기준' },
        { labelKo: '가구 마감', valueKo: '선택 사양 기준' }
      ]
    }),
    estimateSummary: buildSection({
      id: 'SECTION-ESTIMATE',
      sortOrder: 7,
      sectionType: 'ESTIMATE_SUMMARY',
      titleKo: 'Estimate Summary',
      descriptionKo: '고객용 공정별 합계와 총 견적금액을 표시합니다.',
      table: [
        { labelKo: '총 견적금액', valueKo: money(publicEstimateSummary.totalAmount) },
        { labelKo: '예상 공기', valueKo: `${publicEstimateSummary.scheduleDays} days` },
        { labelKo: '결제 조건', valueKo: publicEstimateSummary.paymentConditionKo },
        ...publicEstimateSummary.processGroups.map((group) => ({ labelKo: group.processKo, valueKo: money(group.amount) }))
      ],
      visibility: { hideInternalCost: true, hideMargin: true, hidePce: true }
    }),
    constructionScope: buildSection({
      id: 'SECTION-SCOPE',
      sortOrder: 8,
      sectionType: 'CONSTRUCTION_SCOPE',
      titleKo: 'Construction Scope',
      descriptionKo: '시공 범위와 별도 협의 항목을 정리합니다.',
      table: input.constructionScope?.length ? input.constructionScope : [
        { labelKo: '시공 범위', valueKo: '견적서 기준 공정 포함' },
        { labelKo: '별도 협의', valueKo: '현장 추가 변경 및 미확정 옵션' },
        { labelKo: '결제 조건', valueKo: '계약 시 협의' }
      ]
    }),
    customerProposalMap: customerMapSection,
    customerScopeTable: customerScopeSection,
    closingSignature: buildSection({
      id: 'SECTION-SIGNATURE',
      sortOrder: 9,
      sectionType: 'CLOSING_SIGNATURE',
      titleKo: 'Closing / Signature Page',
      descriptionKo: '제안서 확인과 서명란을 포함합니다.',
      table: [
        { labelKo: '고객 확인', valueKo: '서명 ____________________' },
        { labelKo: 'ECOREAN 확인', valueKo: '서명 ____________________' },
        { labelKo: '작성일', valueKo: generatedAt.slice(0, 10) }
      ]
    })
  };

  let sections = template.sectionOrdering
    .filter((key) => sectionMap[key])
    .map((key, index) => ({
      ...sectionMap[key],
      sortOrder: index + 1
    }));
  if (sectionMap.customerProposalMap && exportMode === 'CLIENT_PROPOSAL') {
    sections = ['conceptOverview', 'customerProposalMap', 'customerScopeTable', 'moodboard', 'perspectiveGallery', 'estimateSummary', 'constructionScope', 'closingSignature']
      .filter((key) => sectionMap[key])
      .map((key, index) => ({ ...sectionMap[key], sortOrder: index + 1 }));
  } else if (sectionMap.customerProposalMap) {
    const insertionIndex = Math.max(0, sections.findIndex((section) => section.sectionType === 'FLOORPLAN') + 1);
    sections.splice(insertionIndex, 0, sectionMap.customerProposalMap);
    if (sectionMap.customerScopeTable) sections.splice(insertionIndex + 1, 0, sectionMap.customerScopeTable);
    sections = sections.map((section, index) => ({ ...section, sortOrder: index + 1 }));
  }

  const pages = [
    coverPage,
    ...sections.map((section, index) => ({
      id: `PAGE-${section.sectionType}`,
      pageType: 'SECTION',
      sectionType: section.sectionType,
      titleKo: section.titleKo,
      descriptionKo: section.descriptionKo,
      section,
      pageNumber: index + 2
    }))
  ];

  const layout = {
    boardType,
    exportMode,
    exportModeKo: exportConfig.labelKo,
    template,
    visibilityPolicy: {
      hiddenFields: exportConfig.hiddenFields,
      visibleBlocks: exportConfig.visibleBlocks
    },
    printSettings: {
      format: printFormat,
      formatKo: pageFormat.labelKo,
      orientation: pageFormat.orientation,
      safeMarginMm: pageFormat.safeMarginMm,
      marginMm: template.spacing.pageMarginMm,
      pageWidth: pageFormat.width,
      pageHeight: pageFormat.height,
      output: 'PDF',
      footer: 'ECOREAN BOC',
      preventOverflow: true,
      preserveImageAspectRatio: true,
      safePageBreaks: true
    },
    imageSettings: {
      fitMode: imageFitMode,
      fitModeKo: imageFitLabelKo(imageFitMode),
      preserveAspectRatio: imageFitMode !== 'COVER',
      cropMode: imageFitMode === 'COVER' ? 'COVER_CENTER' : 'NONE',
      missingImagePlaceholderKo: '이미지 준비 중'
    },
    typography: template.typography,
    spacing: template.spacing,
    gridStyle: template.gridStyle,
    tableStyle: template.tableStyle,
    imageBorderStyle: template.imageBorderStyle,
    backgroundStyle: template.backgroundStyle,
    coverPage,
    pages,
    imagePlacements,
    textPlacements: sections.map((section) => ({
      sectionId: section.id,
      titleKo: section.titleKo,
      style: section.sectionType === 'CONCEPT_OVERVIEW' ? 'hero' : 'section'
    })),
    sections,
    exportMetadata: {
      includes_lightbim_customer_map: Boolean(customerMapSection),
      space_count: customerMapSection?.spaces?.length || 0,
      approved_image_count: customerMapSection?.approved_images?.length || 0,
      customer_safe_checked: exportMode === 'CLIENT_PROPOSAL',
      includesLightbimCustomerMap: Boolean(customerMapSection),
      spaceCount: customerMapSection?.spaces?.length || 0,
      approvedImageCount: customerMapSection?.approved_images?.length || 0,
      customerSafeChecked: exportMode === 'CLIENT_PROPOSAL'
    }
  };
  layout.customerPdfPayload = exportMode === 'CLIENT_PROPOSAL' ? createCustomerSafePdfPayload(layout) : null;
  return layout;
}

function linesForPage(board, layout, page) {
  if (page.pageType === 'COVER') {
    return [
      `Logo: ${page.logoPlaceholder}`,
      `Document: ${page.titleKo}`,
      `Project: ${page.projectName}`,
      `Space Type: ${page.spaceTypeKo}`,
      `Area: ${page.areaM2 || 0} m2`,
      `Concept: ${(page.conceptKeywords || []).join(', ') || 'not specified'}`,
      `Featured Image: ${page.featuredImage?.imagePath || layout.imageSettings.missingImagePlaceholderKo}`,
      `Created: ${page.createdAt?.slice(0, 10)}`,
      '',
      `Style Preset: ${layout.template.templateName}`,
      `Image Fit: ${layout.imageSettings.fitModeKo}`,
      `Format: ${layout.printSettings.formatKo}`
    ];
  }
  const section = page.section || {};
  const lines = [
    section.descriptionKo || '',
    `Image Area: ${section.imageArea?.mode || 'NONE'}`,
    `Images: ${(section.imageArea?.images || []).length || section.imageArea?.missingImagePlaceholderKo || 0}`,
    ''
  ];
  (section.tableArea?.rows || []).slice(0, 18).forEach((row) => {
    lines.push(`${row.labelKo || row.categoryKo || 'Item'}: ${row.valueKo || row.value || row.amount || ''}`);
  });
  if (section.sectionType === 'CUSTOMER_PROPOSAL_MAP') {
    lines.push('');
    lines.push(`Map Layout: ${section.map_payload?.layout?.composition || 'MAP'}`);
    lines.push(`Approved Images: ${(section.approved_images || []).length}`);
    lines.push(`Design Style: ${section.design_direction?.style || 'not specified'}`);
    lines.push(`Color Tone: ${section.design_direction?.colorTone || 'not specified'}`);
  }
  if (section.notes?.length) {
    lines.push('');
    section.notes.forEach((note) => lines.push(`Note: ${note}`));
  }
  return lines;
}

function exportBoardPdf({ board, layout, exportDir, timestamp = Date.now(), exportMode = null }) {
  const mode = normalizeExportMode(exportMode || layout.exportMode, board.boardType || layout.boardType);
  const config = EXPORT_MODES[mode];
  const pageFormat = normalizePageFormat(layout.printSettings?.format);
  fs.mkdirSync(exportDir, { recursive: true });
  const projectId = board.projectId || board.estimateId || 'manual';
  const filePath = path.join(exportDir, `${config.filePrefix}_${projectId}_${timestamp}.pdf`);
  const pages = (layout.pages || []).map((page) => ({
    sectionTitle: page.titleKo || page.sectionType || config.coverTitleKo,
    projectTitle: board.projectName || layout.coverPage?.projectName || 'ECOREAN',
    backgroundStyle: layout.backgroundStyle,
    lines: linesForPage(board, layout, page)
  }));
  createPolishedPdf(filePath, pages.length ? pages : [{ sectionTitle: config.coverTitleKo, projectTitle: board.projectName, backgroundStyle: layout.backgroundStyle, lines: ['No layout data'] }], pageFormat);
  return { filePath, fileName: path.basename(filePath), exportMode: mode, pageFormat };
}

function shouldRecommendPortfolioCandidate(input = {}) {
  return Number(input.finalMarginRate || 0) >= 0.35
    && !input.hasMajorDefect
    && !input.hasSevereClientComplaint;
}

module.exports = {
  BOARD_TEMPLATES,
  EXPORT_MODES,
  PAGE_FORMATS,
  buildBoardLayout,
  createCustomerProposalMapSection,
  createCustomerSafePdfPayload,
  exportBoardPdf,
  normalizeExportMode,
  normalizePageFormat,
  shouldRecommendPortfolioCandidate
};
