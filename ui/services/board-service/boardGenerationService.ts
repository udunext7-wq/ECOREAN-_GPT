const fallbackBoardData = {
  templates: [],
  boards: [],
  activeBoard: null,
  activeSections: [],
  approvedImages: [],
  portfolioCandidates: [],
  stats: {
    boardCount: 0,
    approvedImageCount: 0,
    portfolioCandidateCount: 0,
    exportedBoardCount: 0
  },
  emptyState: true
};

export async function getBoardGenerationCenterData(payload: Record<string, unknown> = {}) {
  if (!window.ecorean?.bocDb?.getBoardGenerationCenterData) return fallbackBoardData;
  return window.ecorean.bocDb.getBoardGenerationCenterData(payload);
}

export async function createDesignBoard(payload: Record<string, unknown>) {
  if (!window.ecorean?.bocDb?.createDesignBoard) throw new Error('Board generation service is not available.');
  return window.ecorean.bocDb.createDesignBoard(payload);
}

export async function exportDesignBoardPdf(payload: Record<string, unknown>) {
  if (!window.ecorean?.bocDb?.exportDesignBoardPdf) throw new Error('Board PDF export service is not available.');
  return window.ecorean.bocDb.exportDesignBoardPdf(payload);
}

export async function createPortfolioCandidate(payload: Record<string, unknown>) {
  if (!window.ecorean?.bocDb?.createPortfolioCandidate) throw new Error('Portfolio candidate service is not available.');
  return window.ecorean.bocDb.createPortfolioCandidate(payload);
}
