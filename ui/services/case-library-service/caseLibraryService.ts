export type CaseLibrarySnapshot = {
  cases: Array<Record<string, unknown>>;
  defectPatterns: Array<Record<string, unknown>>;
  profitPatterns: Array<Record<string, unknown>>;
  rootCausePatterns: Array<Record<string, unknown>>;
  rootCauseLearningSuggestions: Array<Record<string, unknown>>;
  suggestions: Array<Record<string, unknown>>;
  autoUpdateCandidates: Array<Record<string, unknown>>;
};

export async function loadCaseLibrarySnapshot(): Promise<CaseLibrarySnapshot | null> {
  if (!window.ecorean?.bocDb?.getCaseLibrarySnapshot) return null;
  return window.ecorean.bocDb.getCaseLibrarySnapshot() as Promise<CaseLibrarySnapshot>;
}

export async function runLearningAnalysis() {
  if (!window.ecorean?.bocDb?.runCaseLearningAnalysis) return null;
  return window.ecorean.bocDb.runCaseLearningAnalysis({
    actor: 'CEO',
    reasonKo: '대표 화면에서 Case Library 반복 패턴 분석 실행'
  });
}
