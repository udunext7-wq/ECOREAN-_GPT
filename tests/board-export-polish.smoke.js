const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-board-export-polish-${Date.now()}`);
const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => tempRoot
  }
});

const floorplan = service.saveFloorplanMetadata({
  estimateId: 'FULL-EST-BOARD-POLISH',
  projectId: 'PRJ-BOARD-POLISH',
  fileName: 'polish-floorplan.png',
  filePath: 'C:/mock/polish-floorplan.png',
  fileType: 'PNG',
  width: 1600,
  height: 1000
});

const living = service.createFloorplanSpace({
  floorplanId: floorplan.floorplanId,
  spaceName: '거실',
  spaceType: '거실',
  areaM2: 28,
  notes: 'premium living room proposal'
});

service.linkEstimateItemToSpace({
  spaceId: living.spaceId,
  estimateType: 'full_remodel',
  estimateId: 'FULL-EST-BOARD-POLISH',
  estimateItemId: 'ITEM-LIVING-001',
  itemName: '거실 마감',
  amount: 4200000,
  cost: 2600000,
  margin: 1600000
});

service.saveMoodboardProfile({
  floorplanId: floorplan.floorplanId,
  estimateId: 'FULL-EST-BOARD-POLISH',
  style: 'premium minimal',
  colorTone: 'warm white',
  primaryMaterials: 'oak wood, matte paint, porcelain tile',
  lightingMood: 'soft indirect lighting',
  referenceNotes: 'client proposal polish smoke'
});

const brief = service.createVisualizationBrief({
  estimateType: 'full_remodel',
  estimateId: 'FULL-EST-BOARD-POLISH',
  floorplanId: floorplan.floorplanId,
  spaceId: living.spaceId,
  projectName: 'Polished Board Project',
  customerName: 'Sensitive Client Name'
});
const job = service.queueVisualizationJob({ briefId: brief.briefId, promptType: 'PERSPECTIVE', provider: 'MANUAL' });
const attached = service.attachVisualizationResult({
  jobId: job.jobId,
  imagePath: 'C:/manual/polished-featured.png',
  resultType: 'PERSPECTIVE'
});
service.decideVisualizationResult({ resultId: attached.resultId, action: 'SET_PROPOSAL', reviewNote: 'featured image' });

const proposal = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  exportMode: 'CLIENT_PROPOSAL',
  templateId: 'TPL-PREMIUM-MINIMAL',
  title: '고객 제안서',
  subtitle: '프리미엄 거실 제안',
  projectId: 'PRJ-BOARD-POLISH',
  estimateId: 'FULL-EST-BOARD-POLISH',
  projectName: 'Polished Board Project',
  selectedImageIds: [attached.resultId],
  printFormat: 'A3_LANDSCAPE',
  imageFitMode: 'COVER',
  estimateSummary: {
    totalAmount: 4200000,
    scheduleDays: 14,
    processGroups: [{ processKo: '거실 마감', amount: 4200000, internalCost: 2600000, margin: 1600000, pceDecision: 'SCALE' }]
  }
});

assert.strictEqual(proposal.layout.exportMode, 'CLIENT_PROPOSAL', 'Proposal PDF layout data generated');
assert.strictEqual(proposal.layout.printSettings.format, 'A3_LANDSCAPE', 'A3 landscape setting works');
assert.ok(proposal.layout.coverPage, 'Cover page generated');
assert.ok(proposal.layout.pages.length >= 5, 'Section pages generated');
assert.ok(proposal.layout.visibilityPolicy.hiddenFields.includes('margin'), 'Client proposal hides internal financial data');
assert.strictEqual(proposal.layout.imageSettings.fitMode, 'COVER', 'Image fit settings are applied');
assert.strictEqual(proposal.layout.imageSettings.cropMode, 'COVER_CENTER', 'crop mode option is applied');

const proposalPdf = service.exportDesignBoardPdf({ boardId: proposal.boardId, exportMode: 'CLIENT_PROPOSAL' });
assert.ok(path.basename(proposalPdf.filePath).startsWith('proposal_board_PRJ-BOARD-POLISH_'), 'proposal export file path generated correctly');
assert.ok(fs.existsSync(proposalPdf.filePath), 'proposal PDF file exists');

const portfolio = service.createDesignBoard({
  boardType: 'PORTFOLIO_BOARD',
  exportMode: 'PORTFOLIO_BOARD',
  templateId: 'TPL-LUXURY-EDITORIAL',
  title: '포트폴리오 보드',
  projectId: 'PRJ-BOARD-POLISH',
  projectName: 'Portfolio Project Without Client Data',
  selectedImageIds: [attached.resultId],
  printFormat: 'A4_PORTRAIT',
  imageFitMode: 'CONTAIN'
});

assert.strictEqual(portfolio.layout.exportMode, 'PORTFOLIO_BOARD', 'Portfolio PDF layout data generated');
assert.strictEqual(portfolio.layout.printSettings.format, 'A4_PORTRAIT', 'A4 portrait setting works');
assert.ok(portfolio.layout.visibilityPolicy.hiddenFields.includes('customerPersonalData'), 'Portfolio hides customer personal data');
const portfolioPdf = service.exportDesignBoardPdf({ boardId: portfolio.boardId, exportMode: 'PORTFOLIO_BOARD' });
assert.ok(path.basename(portfolioPdf.filePath).startsWith('portfolio_board_PRJ-BOARD-POLISH_'), 'portfolio export file path generated correctly');

const missingImage = service.createDesignBoard({
  boardType: 'MATERIAL_BOARD',
  exportMode: 'MATERIAL_BOARD',
  templateId: 'TPL-CLEAN-COMMERCIAL',
  title: '자재 보드',
  projectId: 'PRJ-BOARD-POLISH',
  projectName: 'Material Board Project',
  selectedImageIds: [],
  manualImages: [],
  useApprovedImages: false,
  printFormat: 'A4_LANDSCAPE',
  imageFitMode: 'PRESERVE'
});
assert.strictEqual(missingImage.layout.printSettings.format, 'A4_LANDSCAPE', 'A4 landscape setting works');
assert.ok(missingImage.layout.imagePlacements[0].placeholder, 'Missing image placeholder works');
assert.strictEqual(missingImage.layout.imageSettings.fitMode, 'PRESERVE', 'preserve image fit works');
const materialPdf = service.exportDesignBoardPdf({ boardId: missingImage.boardId, exportMode: 'MATERIAL_BOARD' });
assert.ok(path.basename(materialPdf.filePath).startsWith('material_board_PRJ-BOARD-POLISH_'), 'material export file path generated correctly');

const spaceBoard = service.createDesignBoard({
  boardType: 'SPACE_BOARD',
  exportMode: 'SPACE_BOARD',
  templateId: 'TPL-ARCH-WHITE',
  title: '공간별 보드',
  projectId: 'PRJ-BOARD-POLISH',
  projectName: 'Space Board Project',
  printFormat: 'A3_LANDSCAPE',
  imageFitMode: 'AUTO'
});
const spacePdf = service.exportDesignBoardPdf({ boardId: spaceBoard.boardId, exportMode: 'SPACE_BOARD' });
assert.ok(path.basename(spacePdf.filePath).startsWith('space_board_PRJ-BOARD-POLISH_'), 'space board export file path generated correctly');

console.log(JSON.stringify({ ok: true, test: 'board-export-polish.smoke' }));
