const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-board-generation-${Date.now()}`);
const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => tempRoot
  }
});

const emptyData = service.getBoardGenerationCenterData();
assert.strictEqual(emptyData.emptyState, true, 'Empty board state renders correctly');
assert.ok(emptyData.templates.length >= 5, 'Board templates are seeded');

const floorplan = service.saveFloorplanMetadata({
  estimateId: 'FULL-EST-BOARD-SMOKE',
  projectId: 'PRJ-BOARD-SMOKE',
  fileName: 'board-floorplan.png',
  filePath: 'C:/mock/board-floorplan.png',
  fileType: 'PNG',
  width: 1400,
  height: 1000
});

const living = service.createFloorplanSpace({
  floorplanId: floorplan.floorplanId,
  spaceName: '거실',
  spaceType: '거실',
  areaM2: 24,
  notes: 'feature wall and warm indirect light'
});

service.linkEstimateItemToSpace({
  spaceId: living.spaceId,
  estimateType: 'full_remodel',
  estimateId: 'FULL-EST-BOARD-SMOKE',
  estimateItemId: 'ITEM-FLOOR-001',
  itemName: '거실 바닥재',
  amount: 2500000,
  cost: 1700000,
  margin: 800000
});

service.saveMoodboardProfile({
  floorplanId: floorplan.floorplanId,
  estimateId: 'FULL-EST-BOARD-SMOKE',
  style: 'premium minimal',
  colorTone: 'warm white and soft gray',
  primaryMaterials: 'wood floor, porcelain tile, matte paint',
  lightingMood: 'soft indirect light',
  referenceNotes: 'premium apartment proposal board'
});

const brief = service.createVisualizationBrief({
  estimateType: 'full_remodel',
  estimateId: 'FULL-EST-BOARD-SMOKE',
  floorplanId: floorplan.floorplanId,
  spaceId: living.spaceId,
  projectName: 'Board Smoke Project',
  customerName: 'Smoke Client'
});
const job = service.queueVisualizationJob({ briefId: brief.briefId, promptType: 'PERSPECTIVE', provider: 'MANUAL' });
const attached = service.attachVisualizationResult({
  jobId: job.jobId,
  imagePath: 'C:/manual/board-approved-perspective.png',
  resultType: 'PERSPECTIVE'
});
const approved = service.decideVisualizationResult({ resultId: attached.resultId, action: 'SET_PROPOSAL', reviewNote: 'proposal cover image' });
assert.strictEqual(approved.result.status, 'APPROVED', 'Approved visualization images are selectable');

const proposal = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  templateId: 'TPL-PREMIUM-MINIMAL',
  title: '고객 제안 보드',
  subtitle: '프리미엄 거실 제안',
  projectId: 'PRJ-BOARD-SMOKE',
  estimateId: 'FULL-EST-BOARD-SMOKE',
  projectName: 'Board Smoke Project',
  selectedImageIds: [attached.resultId],
  printFormat: 'A3_LANDSCAPE'
});

assert.ok(proposal.boardId, 'Proposal board can be created');
assert.strictEqual(proposal.board.boardType, 'CLIENT_PROPOSAL', 'Proposal board type is stored');
assert.ok(proposal.layout.sections.length >= 5, 'Layout JSON is generated');
assert.strictEqual(proposal.layout.template.templateName, 'Premium Minimal', 'Template settings apply');
assert.ok(proposal.layout.sections.some((section) => section.sectionType === 'ESTIMATE_SUMMARY'), 'Estimate summary appears');

const pdf = service.exportDesignBoardPdf({ boardId: proposal.boardId });
assert.ok(fs.existsSync(pdf.filePath), 'PDF export structure generated');
assert.ok(fs.statSync(pdf.filePath).size > 0, 'PDF file is not empty');

const portfolioBoard = service.createDesignBoard({
  boardType: 'PORTFOLIO_BOARD',
  templateId: 'TPL-LUXURY-EDITORIAL',
  title: '포트폴리오 보드',
  projectId: 'PRJ-BOARD-SMOKE',
  projectName: 'Board Smoke Portfolio',
  selectedImageIds: [attached.resultId],
  manualImages: [{ imagePath: 'C:/manual/manual-board-image.png', resultType: 'DETAIL' }]
});
assert.strictEqual(portfolioBoard.board.boardType, 'PORTFOLIO_BOARD', 'Portfolio board can be created');
assert.ok(portfolioBoard.layout.imagePlacements.some((image) => image.imagePath === 'C:/manual/manual-board-image.png'), 'Manual image upload works');

const candidate = service.createPortfolioCandidate({
  boardId: portfolioBoard.boardId,
  projectId: 'PRJ-BOARD-SMOKE',
  featuredProject: 'Board Smoke Portfolio',
  featuredSpace: '거실',
  featuredImage: 'C:/manual/board-approved-perspective.png',
  finalMarginRate: 0.38,
  hasMajorDefect: false,
  hasSevereClientComplaint: false
});
assert.strictEqual(candidate.recommended, true, 'Portfolio candidate recommendation works');
assert.strictEqual(candidate.candidate.recommendationStatus, 'RECOMMENDED', 'candidate status is recommended');

const data = service.getBoardGenerationCenterData({ boardId: proposal.boardId });
assert.ok(data.boards.length >= 1, 'Board Generation Center returns boards');
assert.ok(data.approvedImages.length >= 1, 'approved images are returned');
assert.ok(data.portfolioCandidates.length >= 1, 'portfolio candidates are returned');

const stats = service.getDbStats();
assert.ok(stats.designBoardCount >= 2, 'design board table has rows');
assert.ok(stats.designBoardSectionCount >= 1, 'board sections are stored');
assert.ok(stats.portfolioCandidateCount >= 1, 'portfolio candidate table has row');

console.log(JSON.stringify({ ok: true, test: 'board-generation.smoke' }));
