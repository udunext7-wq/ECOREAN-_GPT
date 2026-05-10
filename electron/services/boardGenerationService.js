const fs = require('fs');
const path = require('path');

const BOARD_TEMPLATES = [
  {
    id: 'TPL-PREMIUM-MINIMAL',
    templateName: 'Premium Minimal',
    typography: { heading: 'Modern Sans', body: 'Clean Sans', scale: 1 },
    spacing: { pageMarginMm: 14, sectionGap: 24 },
    gridStyle: 'two_column_editorial',
    imageRatio: '4:3',
    sectionOrdering: ['cover', 'moodboard', 'floorplan', 'isometric', 'perspective', 'materials', 'estimateSummary'],
    backgroundStyle: 'white'
  },
  {
    id: 'TPL-LUXURY-EDITORIAL',
    templateName: 'Luxury Editorial',
    typography: { heading: 'Editorial Serif', body: 'Modern Sans', scale: 1.08 },
    spacing: { pageMarginMm: 16, sectionGap: 28 },
    gridStyle: 'large_feature_image',
    imageRatio: '3:2',
    sectionOrdering: ['cover', 'perspective', 'moodboard', 'materials', 'floorplan', 'estimateSummary'],
    backgroundStyle: 'warm_white'
  },
  {
    id: 'TPL-ARCH-PRESENTATION',
    templateName: 'Architectural Presentation',
    typography: { heading: 'Architectural Sans', body: 'Technical Sans', scale: 0.96 },
    spacing: { pageMarginMm: 12, sectionGap: 18 },
    gridStyle: 'technical_grid',
    imageRatio: '16:9',
    sectionOrdering: ['cover', 'floorplan', 'isometric', 'perspective', 'materials', 'estimateSummary'],
    backgroundStyle: 'clean_white'
  },
  {
    id: 'TPL-DARK-LUXURY',
    templateName: 'Dark Luxury',
    typography: { heading: 'Premium Sans', body: 'Clean Sans', scale: 1 },
    spacing: { pageMarginMm: 15, sectionGap: 22 },
    gridStyle: 'dark_gallery',
    imageRatio: '4:3',
    sectionOrdering: ['cover', 'perspective', 'isometric', 'materials', 'estimateSummary'],
    backgroundStyle: 'dark'
  },
  {
    id: 'TPL-CLEAN-WHITE-PROPOSAL',
    templateName: 'Clean White Proposal',
    typography: { heading: 'Clean Sans', body: 'Clean Sans', scale: 1 },
    spacing: { pageMarginMm: 13, sectionGap: 20 },
    gridStyle: 'proposal_grid',
    imageRatio: '4:3',
    sectionOrdering: ['cover', 'moodboard', 'floorplan', 'perspective', 'estimateSummary'],
    backgroundStyle: 'white'
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

function createBasicPdf(filePath, lines, page = { width: 595, height: 842 }) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lineHeight = 16;
  const visibleLines = lines.slice(0, 46);
  const textCommands = ['BT', '/F1 10 Tf', `48 ${page.height - 54} Td`];
  visibleLines.forEach((line, index) => {
    if (index > 0) textCommands.push(`0 -${lineHeight} Td`);
    textCommands.push(`(${asciiPdfText(line)}) Tj`);
  });
  textCommands.push('ET');
  const stream = textCommands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
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
  for (let index = 1; index <= objects.length; index += 1) chunks.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  fs.writeFileSync(filePath, chunks.join(''));
}

function normalizeTemplate(templateId) {
  return BOARD_TEMPLATES.find((template) => template.id === templateId) || BOARD_TEMPLATES[0];
}

function buildBoardLayout(input = {}) {
  const template = normalizeTemplate(input.templateId);
  const boardType = input.boardType || 'CLIENT_PROPOSAL';
  const spaces = input.spaces || [];
  const images = input.images || [];
  const moodboard = input.moodboard || {};
  const floorplan = input.floorplan || {};
  const estimateSummary = input.estimateSummary || {};
  const printFormat = input.printFormat || 'A3_LANDSCAPE';

  const sectionMap = {
    cover: {
      sectionType: 'COVER',
      titleKo: input.title || 'ECOREAN Interior Proposal',
      subtitleKo: input.subtitle || '프리미엄 인테리어 제안 보드',
      projectName: input.projectName || '미지정 프로젝트',
      keywords: [moodboard.style, moodboard.colorTone, moodboard.primaryMaterials].filter(Boolean)
    },
    moodboard: {
      sectionType: 'MOODBOARD',
      titleKo: '무드보드',
      colorTone: moodboard.colorTone || '데이터 없음',
      materials: moodboard.primaryMaterials || '데이터 없음',
      lightingMood: moodboard.lightingMood || '데이터 없음'
    },
    floorplan: {
      sectionType: 'FLOORPLAN',
      titleKo: '평면도',
      filePath: floorplan.filePath || '',
      descriptionKo: `${spaces.length}개 공간 구역 연결`
    },
    isometric: {
      sectionType: 'ISOMETRIC',
      titleKo: '아이소메트릭',
      images: images.filter((image) => image.resultType === 'ISOMETRIC')
    },
    perspective: {
      sectionType: 'PERSPECTIVE',
      titleKo: 'AI 투시도',
      featuredImage: images.find((image) => image.resultType === 'PROPOSAL') || images[0] || null,
      images: images.filter((image) => ['PERSPECTIVE', 'PROPOSAL', 'DETAIL'].includes(image.resultType))
    },
    materials: {
      sectionType: 'MATERIAL_BOARD',
      titleKo: '자재 보드',
      items: input.materialSelections || [
        { categoryKo: '타일', valueKo: '선택 자재 기준' },
        { categoryKo: '바닥재', valueKo: '선택 자재 기준' },
        { categoryKo: '조명', valueKo: '선택 사양 기준' },
        { categoryKo: '가구 마감', valueKo: '선택 사양 기준' }
      ]
    },
    estimateSummary: {
      sectionType: 'ESTIMATE_SUMMARY',
      titleKo: '견적 요약',
      totalAmount: estimateSummary.totalAmount || 0,
      scheduleDays: estimateSummary.scheduleDays || 0,
      processGroups: estimateSummary.processGroups || []
    }
  };

  const sections = template.sectionOrdering
    .filter((key) => sectionMap[key])
    .map((key, index) => ({
      id: `SECTION-${String(index + 1).padStart(2, '0')}`,
      sortOrder: index + 1,
      ...sectionMap[key]
    }));

  return {
    boardType,
    template,
    printSettings: {
      format: printFormat,
      orientation: printFormat === 'A4_PORTRAIT' ? 'portrait' : 'landscape',
      marginMm: template.spacing.pageMarginMm,
      output: 'PDF'
    },
    typography: template.typography,
    spacing: template.spacing,
    gridStyle: template.gridStyle,
    backgroundStyle: template.backgroundStyle,
    imagePlacements: images.map((image, index) => ({
      imageId: image.id,
      imagePath: image.imagePath,
      role: index === 0 ? 'FEATURED' : 'SUPPORTING',
      ratio: template.imageRatio,
      order: index + 1
    })),
    textPlacements: sections.map((section) => ({
      sectionId: section.id,
      titleKo: section.titleKo,
      style: section.sectionType === 'COVER' ? 'hero' : 'section'
    })),
    sections
  };
}

function buildBoardPdfLines(board, layout) {
  const lines = [
    'ECOREAN DESIGN BOARD',
    `Board ID: ${board.id || ''}`,
    `Board Type: ${board.boardType || layout.boardType}`,
    `Title: ${board.title || ''}`,
    `Project: ${board.projectName || ''}`,
    `Template: ${layout.template.templateName}`,
    `Print: ${layout.printSettings.format}`,
    ''
  ];
  for (const section of layout.sections || []) {
    lines.push(`[${section.sectionType}] ${section.titleKo}`);
    if (section.sectionType === 'ESTIMATE_SUMMARY') {
      lines.push(`Total Estimate: ${money(section.totalAmount)}`);
      lines.push(`Schedule Days: ${section.scheduleDays}`);
    }
    if (section.sectionType === 'PERSPECTIVE' && section.featuredImage) {
      lines.push(`Featured Image: ${section.featuredImage.imagePath}`);
    }
    if (section.sectionType === 'MOODBOARD') {
      lines.push(`Color: ${section.colorTone}`);
      lines.push(`Materials: ${section.materials}`);
    }
    lines.push('');
  }
  return lines;
}

function exportBoardPdf({ board, layout, exportDir, timestamp = Date.now() }) {
  fs.mkdirSync(exportDir, { recursive: true });
  const projectId = board.projectId || board.estimateId || 'manual';
  const filePath = path.join(exportDir, `board_${projectId}_${timestamp}.pdf`);
  const page = layout.printSettings.format === 'A4_PORTRAIT'
    ? { width: 595, height: 842 }
    : { width: 1191, height: 842 };
  createBasicPdf(filePath, buildBoardPdfLines(board, layout), page);
  return { filePath, fileName: path.basename(filePath) };
}

function shouldRecommendPortfolioCandidate(input = {}) {
  return Number(input.finalMarginRate || 0) >= 0.35
    && !input.hasMajorDefect
    && !input.hasSevereClientComplaint;
}

module.exports = {
  BOARD_TEMPLATES,
  buildBoardLayout,
  exportBoardPdf,
  shouldRecommendPortfolioCandidate
};
