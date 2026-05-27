import { useEffect, useMemo, useState } from 'react';
import {
  createDesignBoard,
  createPortfolioCandidate,
  exportDesignBoardPdf,
  getBoardGenerationCenterData
} from '../../services/board-service/boardGenerationService';

type BoardData = {
  templates?: Array<Record<string, any>>;
  boards?: Array<Record<string, any>>;
  activeBoard?: Record<string, any> | null;
  activeSections?: Array<Record<string, any>>;
  approvedImages?: Array<Record<string, any>>;
  portfolioCandidates?: Array<Record<string, any>>;
  stats?: Record<string, any>;
  emptyState?: boolean;
};

const boardTypes = [
  ['CLIENT_PROPOSAL', '고객 제안 보드'],
  ['PORTFOLIO_BOARD', '포트폴리오 보드'],
  ['MATERIAL_BOARD', '자재 보드'],
  ['SPACE_BOARD', '공간별 보드'],
  ['CONCEPT_BOARD', '컨셉 보드'],
  ['BEFORE_AFTER_BOARD', 'Before / After 보드']
];

const printFormats = [
  ['A3_LANDSCAPE', 'A3 가로'],
  ['A4_LANDSCAPE', 'A4 가로'],
  ['A4_PORTRAIT', 'A4 세로']
];

const exportModes = [
  ['CLIENT_PROPOSAL', '고객 제안서 PDF'],
  ['PORTFOLIO_BOARD', '포트폴리오 PDF'],
  ['MATERIAL_BOARD', '자재 보드 PDF'],
  ['SPACE_BOARD', '공간별 보드 PDF']
];

const imageFitModes = [
  ['AUTO', '이미지 맞춤'],
  ['PRESERVE', '비율 유지'],
  ['COVER', '꽉 채우기'],
  ['CONTAIN', '여백 포함']
];

const money = (value: unknown) => `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
const percent = (value: unknown) => `${(Number(value || 0) * 100).toFixed(1)}%`;

export function BoardGenerationCenterView() {
  const [data, setData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    boardType: 'CLIENT_PROPOSAL',
    templateId: 'TPL-PREMIUM-MINIMAL',
    title: 'ECOREAN 인테리어 제안 보드',
    subtitle: '프리미엄 공간 제안서',
    projectName: '고객 상담 프로젝트',
    projectId: '',
    estimateId: '',
    exportMode: 'CLIENT_PROPOSAL',
    printFormat: 'A3_LANDSCAPE',
    imageFitMode: 'CONTAIN',
    manualImagePath: '',
    includeCustomerProposalMap: true,
    finalMarginRate: '0.35',
    hasMajorDefect: false,
    hasSevereClientComplaint: false
  });
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const next = await getBoardGenerationCenterData();
      setData(next as BoardData);
      const templates = (next as BoardData).templates || [];
      if (templates.length > 0 && !templates.some((template) => template.id === form.templateId)) {
        setForm((current) => ({ ...current, templateId: templates[0].id }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeBoard = data?.activeBoard || null;
  const templates = data?.templates || [];
  const approvedImages = data?.approvedImages || [];
  const activeSections = data?.activeSections || [];

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === form.templateId),
    [templates, form.templateId]
  );

  const handleCreateBoard = async () => {
    const manualImages = form.manualImagePath
      ? [{ imagePath: form.manualImagePath, resultType: 'PERSPECTIVE', status: 'APPROVED' }]
      : [];
    const result = await createDesignBoard({
      boardType: form.boardType,
      templateId: form.templateId,
      title: form.title,
      subtitle: form.subtitle,
      projectName: form.projectName,
      projectId: form.projectId || undefined,
      estimateId: form.estimateId || undefined,
      exportMode: form.exportMode,
      printFormat: form.printFormat,
      imageFitMode: form.imageFitMode,
      includeCustomerProposalMap: form.includeCustomerProposalMap,
      selectedImageIds,
      manualImages,
      estimateSummary: {
        totalAmount: 0,
        scheduleDays: 0,
        processGroups: []
      }
    });
    setData((result as Record<string, any>).boardData as BoardData);
    setMessage('보드가 생성되었습니다.');
  };

  const handleExportPdf = async () => {
    if (!activeBoard?.id) {
      setMessage('먼저 보드를 생성하세요.');
      return;
    }
    const result = await exportDesignBoardPdf({ boardId: activeBoard.id, exportMode: form.exportMode });
    setData((result as Record<string, any>).boardData as BoardData);
    setMessage(`PDF 출력 완료: ${(result as Record<string, any>).filePath}`);
  };

  const handleCreatePortfolioCandidate = async () => {
    if (!activeBoard?.id) {
      setMessage('포트폴리오 후보로 등록할 보드가 없습니다.');
      return;
    }
    const result = await createPortfolioCandidate({
      boardId: activeBoard.id,
      projectId: form.projectId || activeBoard.projectId,
      featuredProject: form.projectName || activeBoard.projectName,
      featuredSpace: '대표 공간',
      finalMarginRate: Number(form.finalMarginRate || 0),
      hasMajorDefect: form.hasMajorDefect,
      hasSevereClientComplaint: form.hasSevereClientComplaint
    });
    setData((result as Record<string, any>).boardData as BoardData);
    setMessage((result as Record<string, any>).recommended ? '포트폴리오 후보로 추천 등록되었습니다.' : '검토 필요 후보로 등록되었습니다.');
  };

  const toggleImage = (imageId: string) => {
    setSelectedImageIds((current) => current.includes(imageId)
      ? current.filter((id) => id !== imageId)
      : [...current, imageId]);
  };

  if (isLoading) {
    return (
      <section className="wizard-shell">
        <div className="section-header">
          <div>
            <span className="eyebrow">DESIGN BOARD</span>
            <h2>디자인 보드 생성</h2>
          </div>
        </div>
        <p className="muted">보드 데이터를 불러오는 중입니다.</p>
      </section>
    );
  }

  return (
    <section className="wizard-shell">
      <div className="section-header">
        <div>
          <span className="eyebrow">PROPOSAL / PORTFOLIO</span>
          <h2>디자인 보드 생성</h2>
          <p>견적, 평면도, 무드보드, 승인된 AI 투시도를 연결해 고객 제안 보드와 포트폴리오 보드를 생성합니다.</p>
        </div>
        <button className="primary-action" onClick={handleCreateBoard}>보드 생성</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>생성 보드</span>
          <strong>{data?.stats?.boardCount ?? 0}</strong>
          <p>저장된 제안/포트폴리오 보드</p>
        </div>
        <div className="kpi-card">
          <span>승인 이미지</span>
          <strong>{data?.stats?.approvedImageCount ?? 0}</strong>
          <p>보드에 사용할 수 있는 이미지</p>
        </div>
        <div className="kpi-card">
          <span>포트폴리오 후보</span>
          <strong>{data?.stats?.portfolioCandidateCount ?? 0}</strong>
          <p>35% 이상 고마진 후보 중심</p>
        </div>
      </div>

      {message ? <div className="alert-line info">{message}</div> : null}

      <div className="wizard-grid two-column">
        <div className="drawer-block">
          <div className="section-header compact">
            <div>
              <span className="eyebrow">BOARD SETUP</span>
              <h3>제안 보드 생성</h3>
            </div>
          </div>

          <div className="form-grid">
            <label>
              보드 유형
              <select value={form.boardType} onChange={(event) => setForm({ ...form, boardType: event.target.value })}>
                {boardTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              PDF 모드
              <select value={form.exportMode} onChange={(event) => setForm({ ...form, exportMode: event.target.value })}>
                {exportModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              템플릿
              <select value={form.templateId} onChange={(event) => setForm({ ...form, templateId: event.target.value })}>
                {templates.map((template) => <option key={template.id} value={template.id}>{template.templateName}</option>)}
              </select>
            </label>
            <label>
              제목
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              부제
              <input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
            </label>
            <label>
              프로젝트명
              <input value={form.projectName} onChange={(event) => setForm({ ...form, projectName: event.target.value })} />
            </label>
            <label>
              출력 설정
              <select value={form.printFormat} onChange={(event) => setForm({ ...form, printFormat: event.target.value })}>
                {printFormats.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              이미지 처리
              <select value={form.imageFitMode} onChange={(event) => setForm({ ...form, imageFitMode: event.target.value })}>
                {imageFitModes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              수동 이미지 경로
              <input value={form.manualImagePath} onChange={(event) => setForm({ ...form, manualImagePath: event.target.value })} placeholder="선택 이미지가 없으면 경로 입력" />
            </label>
            <label>
              최종 마진율
              <input value={form.finalMarginRate} onChange={(event) => setForm({ ...form, finalMarginRate: event.target.value })} />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-action" onClick={handleCreateBoard}>보드 생성</button>
            <button onClick={handleExportPdf}>PDF 출력</button>
            <button onClick={handleCreatePortfolioCandidate}>포트폴리오 등록</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimCustomerMap' }))}>공간 제안 맵 보기</button>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={form.includeCustomerProposalMap} onChange={(event) => setForm({ ...form, includeCustomerProposalMap: event.target.checked })} />
            고객용 공간 제안 맵 포함
          </label>
        </div>

        <div className="drawer-block">
          <div className="section-header compact">
            <div>
              <span className="eyebrow">TEMPLATE</span>
              <h3>템플릿 설정</h3>
            </div>
          </div>
          <p><strong>{selectedTemplate?.templateName || '템플릿 없음'}</strong></p>
          <p className="muted">그리드: {selectedTemplate?.gridStyle || '-'} / 이미지 비율: {selectedTemplate?.imageRatio || '-'}</p>
          <div className="tag-row">
            {(selectedTemplate?.sectionOrdering || []).map((section: string) => <span className="status-pill" key={section}>{section}</span>)}
          </div>
        </div>
      </div>

      <div className="drawer-block">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">APPROVED IMAGES</span>
            <h3>투시도 연결</h3>
            <p>승인된 AI 시각화 결과만 보드 이미지로 선택됩니다.</p>
          </div>
        </div>
        {approvedImages.length === 0 ? (
          <p className="empty-state">승인된 이미지가 없습니다. 수동 이미지 경로를 입력하거나 AI 투시도 승인 후 다시 생성하세요.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>선택</th>
                  <th>유형</th>
                  <th>이미지 경로</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {approvedImages.map((image) => (
                  <tr key={image.id}>
                    <td><input type="checkbox" checked={selectedImageIds.includes(image.id)} onChange={() => toggleImage(image.id)} /></td>
                    <td>{image.resultType}</td>
                    <td>{image.imagePath}</td>
                    <td>{image.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="wizard-grid two-column">
        <div className="drawer-block">
          <div className="section-header compact">
            <div>
              <span className="eyebrow">PREVIEW</span>
              <h3>미리보기</h3>
            </div>
          </div>
          {!activeBoard ? (
            <p className="empty-state">생성된 보드가 없습니다.</p>
          ) : (
            <>
              <p><strong>{activeBoard.title}</strong></p>
              <p>{activeBoard.subtitle}</p>
              <p className="muted">상태: {activeBoard.status} / 출력: {activeBoard.printFormat} / 모드: {activeBoard.boardLayout?.exportModeKo || activeBoard.boardLayout?.exportMode}</p>
              <p className="muted">이미지 처리: {activeBoard.boardLayout?.imageSettings?.fitModeKo || '-'} / 안전 여백: {activeBoard.boardLayout?.printSettings?.safeMarginMm || '-'}mm</p>
              <div className="tag-row">
                {activeSections.map((section) => <span className="status-pill" key={section.id}>{section.sectionTitle}</span>)}
              </div>
              {activeBoard.exportPath ? <p className="muted">PDF: {activeBoard.exportPath}</p> : null}
            </>
          )}
        </div>

        <div className="drawer-block">
          <div className="section-header compact">
            <div>
              <span className="eyebrow">PORTFOLIO</span>
              <h3>포트폴리오 후보</h3>
            </div>
          </div>
          <div className="toggle-row">
            <label><input type="checkbox" checked={form.hasMajorDefect} onChange={(event) => setForm({ ...form, hasMajorDefect: event.target.checked })} /> 중대 하자 있음</label>
            <label><input type="checkbox" checked={form.hasSevereClientComplaint} onChange={(event) => setForm({ ...form, hasSevereClientComplaint: event.target.checked })} /> 중대 클레임 있음</label>
          </div>
          {(data?.portfolioCandidates || []).slice(0, 5).map((candidate) => (
            <div className="mini-card" key={candidate.id}>
              <strong>{candidate.featuredProject}</strong>
              <span>{candidate.recommendationStatus} / 마진율 {percent(candidate.finalMarginRate)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="drawer-block">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">ESTIMATE SUMMARY</span>
            <h3>공간별 금액 요약</h3>
          </div>
        </div>
        {activeBoard?.boardLayout?.sections?.find((section: Record<string, any>) => section.sectionType === 'ESTIMATE_SUMMARY') ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>항목</th>
                  <th>금액</th>
                  <th>예상 공기</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>총 견적금액</td>
                  <td>{money(activeBoard.boardLayout.sections.find((section: Record<string, any>) => section.sectionType === 'ESTIMATE_SUMMARY')?.totalAmount)}</td>
                  <td>{activeBoard.boardLayout.sections.find((section: Record<string, any>) => section.sectionType === 'ESTIMATE_SUMMARY')?.scheduleDays || 0}일</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">견적 요약 데이터가 아직 연결되지 않았습니다.</p>
        )}
      </div>
    </section>
  );
}
