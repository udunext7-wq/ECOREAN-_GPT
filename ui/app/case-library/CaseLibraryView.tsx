import { useEffect, useState } from 'react';
import { loadCaseLibrarySnapshot, runLearningAnalysis, type CaseLibrarySnapshot } from '../../services/case-library-service/caseLibraryService';
import { LearningSuggestionView } from './LearningSuggestionView';
import { PatternDetectionView } from './PatternDetectionView';

function categoryText(categories: unknown) {
  if (!Array.isArray(categories)) return '-';
  return categories.map((category) => {
    if (typeof category === 'object' && category && 'displayNameKo' in category) {
      return String((category as { displayNameKo: unknown }).displayNameKo);
    }
    return String(category);
  }).join(', ');
}

export function CaseLibraryView() {
  const [snapshot, setSnapshot] = useState<CaseLibrarySnapshot | null>(null);
  const [messageKo, setMessageKo] = useState('Case Library를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadCaseLibrarySnapshot();
    setSnapshot(next);
    setMessageKo(next ? `Case ${next.cases.length}건 / 제안 ${next.suggestions.length}건` : 'Electron DB 연결 없음');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAnalyze() {
    await runLearningAnalysis();
    setMessageKo('반복 패턴 분석을 다시 실행했습니다.');
    await refresh();
  }

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">CASE LIBRARY + LEARNING FLOW</span>
          <h4>Case Library</h4>
        </div>
        <button onClick={handleAnalyze}>패턴 분석 실행</button>
      </div>

      <p className="small-note">{messageKo}</p>

      <div className="estimate-preview-card">
        <h5>완료 프로젝트 Case</h5>
        {snapshot?.cases.length ? snapshot.cases.map((caseItem) => (
          <div className="case-row" key={String(caseItem.caseId)}>
            <strong>{String(caseItem.caseId)}</strong>
            <span>{categoryText(caseItem.categories)} / {String(caseItem.learningStatus)}</span>
            <p>
              실제 원가, 실제 공기, 하자, 클레임, 추가공사, 최종 마진이 연결되어 저장됩니다.
            </p>
          </div>
        )) : <p className="small-note">완료 처리된 프로젝트가 아직 Case로 등록되지 않았습니다.</p>}
      </div>

      <PatternDetectionView
        defectPatterns={snapshot?.defectPatterns ?? []}
        profitPatterns={snapshot?.profitPatterns ?? []}
      />
      <div className="estimate-preview-card">
        <h5>반복 원가 누수 원인 TOP</h5>
        {snapshot?.rootCausePatterns?.length ? snapshot.rootCausePatterns.map((pattern) => (
          <div className="case-row" key={String(pattern.patternId)}>
            <strong>{String(pattern.rootCauseNameKo)}</strong>
            <span>{String(pattern.occurrenceCount)}건 / {String(pattern.severity)}</span>
            <p>{String(pattern.detectionRuleKo)}</p>
          </div>
        )) : <p className="small-note">반복 원가 누수 원인 패턴이 아직 없습니다.</p>}
      </div>
      <LearningSuggestionView
        suggestions={snapshot?.suggestions ?? []}
        candidates={snapshot?.autoUpdateCandidates ?? []}
      />
    </section>
  );
}
