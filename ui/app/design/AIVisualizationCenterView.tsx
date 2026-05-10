import { useEffect, useMemo, useState } from 'react';
import {
  attachVisualizationResult,
  checkComfyUiHealth,
  createVisualizationBrief,
  decideVisualizationResult,
  generateVisualizationPrompts,
  getAIVisualizationCenterData,
  queueVisualizationJob,
  refreshComfyUiJobStatus,
  runComfyUiGeneration,
  saveComfyUiSettings,
  saveComfyUiWorkflowPreset,
  type AIVisualizationData
} from '../../services/design-service/visualizationService';

const emptyData: AIVisualizationData = {
  briefs: [],
  activeBrief: null,
  jobs: [],
  results: [],
  stats: {},
  comfyUi: {},
  floorplanCenterData: {},
  emptyState: true
};

function koStatus(status: unknown) {
  const value = String(status || '');
  const map: Record<string, string> = {
    DRAFT: '초안',
    QUEUED: '생성 대기',
    GENERATING: '생성 중',
    COMPLETED: '생성 완료',
    FAILED: '실패',
    CANCELLED: '취소',
    PENDING_REVIEW: '검토 대기',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
    REVISION_REQUIRED: '수정 필요'
  };
  return map[value] || value || '데이터 없음';
}

export function AIVisualizationCenterView() {
  const [data, setData] = useState<AIVisualizationData>(emptyData);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedBriefId, setSelectedBriefId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [promptType, setPromptType] = useState('PERSPECTIVE');
  const [imagePath, setImagePath] = useState('C:/manual/generated-image.png');
  const [reviewNote, setReviewNote] = useState('');
  const [messageKo, setMessageKo] = useState('먼저 공간 브리프를 생성하세요.');
  const [isBusy, setIsBusy] = useState(false);
  const [comfySettings, setComfySettings] = useState({ host: '127.0.0.1', port: 8188, defaultWorkflowId: '', isEnabled: true });
  const [workflowPreset, setWorkflowPreset] = useState({
    presetName: '기본 투시도 워크플로우',
    presetType: 'PERSPECTIVE',
    workflowJson: '{\n  "6": { "inputs": { "text": "" }, "class_type": "CLIPTextEncode" },\n  "7": { "inputs": { "text": "" }, "class_type": "CLIPTextEncode" }\n}',
    positivePromptNodeId: '6',
    negativePromptNodeId: '7',
    seedNodeId: '',
    widthNodeId: '',
    heightNodeId: '',
    outputNodeId: '',
    setDefault: true
  });
  const [briefForm, setBriefForm] = useState({
    estimateType: 'full_remodel',
    estimateId: 'MANUAL',
    projectName: '미지정 프로젝트',
    customerName: '미지정 고객',
    style: 'modern Korean interior',
    colorTone: 'warm neutral',
    materialKeywords: 'wood floor, porcelain tile, matte paint',
    lightingMood: 'soft indirect lighting',
    designNotes: 'floorplan consistency required'
  });
  const [promptSet, setPromptSet] = useState<Record<string, string>>({});

  async function refresh(payload: Record<string, unknown> = {}) {
    const next = await getAIVisualizationCenterData(payload);
    setData(next);
    const spaces = ((next.floorplanCenterData?.spaces || []) as Array<Record<string, unknown>>);
    const settings = (next.comfyUi as Record<string, unknown> | undefined)?.settings as Record<string, unknown> | undefined;
    if (settings) {
      setComfySettings({
        host: String(settings.host || '127.0.0.1'),
        port: Number(settings.port || 8188),
        defaultWorkflowId: String(settings.defaultWorkflowId || ''),
        isEnabled: settings.isEnabled !== false
      });
    }
    if (!selectedSpaceId && spaces[0]?.id) setSelectedSpaceId(String(spaces[0].id));
    if (!selectedBriefId && next.briefs[0]?.id) setSelectedBriefId(String(next.briefs[0].id));
    if (!selectedJobId && next.jobs[0]?.id) setSelectedJobId(String(next.jobs[0].id));
  }

  useEffect(() => {
    refresh().catch((error) => setMessageKo(error instanceof Error ? error.message : 'AI 시각화 데이터를 불러오지 못했습니다.'));
  }, []);

  const spaces = useMemo(() => ((data.floorplanCenterData?.spaces || []) as Array<Record<string, unknown>>), [data.floorplanCenterData]);
  const selectedSpace = spaces.find((space) => String(space.id) === selectedSpaceId);
  const activeBrief = data.briefs.find((brief) => String(brief.id) === selectedBriefId) || data.activeBrief;
  const activePrompt = promptType === 'ISOMETRIC' ? promptSet.isometricPrompt : promptType === 'MOODBOARD' ? promptSet.moodboardPrompt : promptSet.perspectivePrompt;
  const negativePrompt = promptSet.negativePrompt || '';

  async function handleCreateBrief() {
    setIsBusy(true);
    try {
      const result = await createVisualizationBrief({
        ...briefForm,
        spaceId: selectedSpaceId || undefined,
        floorplanId: selectedSpace?.floorplanId,
        spaceName: selectedSpace?.spaceName,
        spaceType: selectedSpace?.spaceType,
        areaM2: selectedSpace?.areaM2
      });
      setSelectedBriefId(String(result.briefId || ''));
      setPromptSet(result.prompts as Record<string, string>);
      setData(result.visualizationData as AIVisualizationData);
      setMessageKo('공간별 이미지 브리프가 생성되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '브리프 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGeneratePrompts() {
    if (!selectedBriefId) {
      setMessageKo('먼저 브리프를 선택하세요.');
      return;
    }
    setIsBusy(true);
    try {
      const result = await generateVisualizationPrompts({ briefId: selectedBriefId });
      setPromptSet(result.prompts as Record<string, string>);
      setMessageKo('투시도 / 아이소메트릭 / 무드보드 프롬프트가 생성되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '프롬프트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleQueueJob() {
    if (!selectedBriefId) {
      setMessageKo('먼저 브리프를 생성하세요.');
      return;
    }
    setIsBusy(true);
    try {
      const result = await queueVisualizationJob({
        briefId: selectedBriefId,
        promptType,
        prompt: activePrompt,
        negativePrompt,
        provider: 'MANUAL'
      });
      setSelectedJobId(String(result.jobId || ''));
      setData(result.visualizationData as AIVisualizationData);
      setMessageKo('MANUAL 생성 대기열에 등록되었습니다. 프롬프트를 복사해 외부 도구에서 생성한 뒤 이미지를 첨부하세요.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '생성 대기열 등록 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveComfySettings() {
    setIsBusy(true);
    try {
      const result = await saveComfyUiSettings(comfySettings);
      setData((current) => ({ ...current, comfyUi: result }));
      setMessageKo('ComfyUI 연결 설정이 저장되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : 'ComfyUI 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCheckComfyConnection() {
    setIsBusy(true);
    try {
      const result = await checkComfyUiHealth();
      setData((current) => ({ ...current, comfyUi: result.comfyUiData as Record<string, unknown> }));
      setMessageKo(result.ok ? 'ComfyUI 연결 성공' : 'ComfyUI가 실행 중이 아닙니다. ComfyUI를 실행한 뒤 다시 시도하세요.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : 'ComfyUI 연결 테스트 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveWorkflowPreset() {
    setIsBusy(true);
    try {
      const result = await saveComfyUiWorkflowPreset(workflowPreset);
      setData((current) => ({ ...current, comfyUi: result.comfyUiData as Record<string, unknown> }));
      setComfySettings((current) => ({ ...current, defaultWorkflowId: String(result.presetId || current.defaultWorkflowId) }));
      setMessageKo('ComfyUI 워크플로우 프리셋이 저장되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '워크플로우 JSON 또는 노드 ID를 확인하세요.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRunComfyUi() {
    let jobId = selectedJobId;
    setIsBusy(true);
    try {
      if (!jobId) {
        if (!selectedBriefId) throw new Error('먼저 브리프를 생성하세요.');
        const queued = await queueVisualizationJob({
          briefId: selectedBriefId,
          promptType,
          prompt: activePrompt,
          negativePrompt,
          provider: 'COMFYUI',
          workflowPresetId: comfySettings.defaultWorkflowId || undefined
        });
        jobId = String(queued.jobId || '');
        setSelectedJobId(jobId);
      }
      const result = await runComfyUiGeneration({ jobId, workflowPresetId: comfySettings.defaultWorkflowId || undefined });
      setData(result.visualizationData as AIVisualizationData);
      setMessageKo(result.ok ? 'ComfyUI 생성 요청이 전송되었습니다. 생성 상태를 확인하세요.' : String(result.errorMessage || 'ComfyUI가 실행 중이 아닙니다. ComfyUI를 실행한 뒤 다시 시도하세요.'));
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : 'ComfyUI 생성 요청 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRefreshComfyResult() {
    if (!selectedJobId) {
      setMessageKo('상태를 확인할 생성 작업을 선택하세요.');
      return;
    }
    setIsBusy(true);
    try {
      const result = await refreshComfyUiJobStatus({ jobId: selectedJobId });
      setData(result.visualizationData as AIVisualizationData);
      setMessageKo(result.ok ? 'ComfyUI 생성 상태를 확인했습니다.' : String(result.errorMessage || '결과 확인에 실패했습니다.'));
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : 'ComfyUI 결과 확인 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAttachResult() {
    if (!selectedJobId) {
      setMessageKo('이미지를 첨부할 생성 작업을 선택하세요.');
      return;
    }
    setIsBusy(true);
    try {
      const result = await attachVisualizationResult({ jobId: selectedJobId, imagePath, resultType: promptType });
      setData(result.visualizationData as AIVisualizationData);
      setMessageKo('생성 이미지 결과가 검토 대기 상태로 저장되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '이미지 첨부 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReview(resultId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'SET_PROPOSAL') {
    setIsBusy(true);
    try {
      const result = await decideVisualizationResult({ resultId, action, reviewNote });
      setData(result.visualizationData as AIVisualizationData);
      setMessageKo(action === 'SET_PROPOSAL' ? '계약 제안 이미지로 지정되었습니다.' : `이미지 검토 처리 완료: ${action}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '이미지 검토 처리 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCopyPrompt(text: string) {
    await navigator.clipboard?.writeText(text);
    setMessageKo('프롬프트가 클립보드에 복사되었습니다.');
  }

  function openBoardGenerationCenter() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'boardGeneration' }));
  }

  return (
    <div className="bathroom-wizard">
      <div className="wizard-hero">
        <div>
          <span className="eyebrow">AI VISUALIZATION</span>
          <h2>AI 투시도 생성</h2>
          <p>견적 + 평면도 + 무드보드 + 공간 데이터를 이미지 생성 브리프와 검토 워크플로로 연결합니다.</p>
        </div>
        <button className="primary-action" onClick={openBoardGenerationCenter}>디자인 보드 생성</button>
      </div>

      <div className="wizard-summary-grid visualization-stats">
        <div><span>생성 대기</span><strong>{String(data.stats.queued || 0)}</strong></div>
        <div><span>생성 중</span><strong>{String(data.stats.generating || 0)}</strong></div>
        <div><span>생성 완료</span><strong>{String(data.stats.completed || 0)}</strong></div>
        <div><span>승인 대기</span><strong>{String(data.stats.pendingReview || 0)}</strong></div>
        <div><span>승인됨</span><strong>{String(data.stats.approved || 0)}</strong></div>
        <div><span>실패</span><strong>{String(data.stats.failed || 0)}</strong></div>
        <div><span>수정 필요</span><strong>{String(data.stats.revisionRequired || 0)}</strong></div>
      </div>

      <div className="wizard-layout">
        <main className="wizard-main">
          <section className="drawer-block">
            <h3>공간별 이미지 브리프</h3>
            {spaces.length ? (
              <label>공간 선택
                <select value={selectedSpaceId} onChange={(event) => setSelectedSpaceId(event.target.value)}>
                  {spaces.map((space) => <option key={String(space.id)} value={String(space.id)}>{String(space.spaceName)} / {String(space.areaM2)}m2</option>)}
                </select>
              </label>
            ) : <p>먼저 Floorplan Center에서 공간을 생성하세요.</p>}
            <div className="form-grid">
              <label>프로젝트명<input value={briefForm.projectName} onChange={(event) => setBriefForm({ ...briefForm, projectName: event.target.value })} /></label>
              <label>고객명<input value={briefForm.customerName} onChange={(event) => setBriefForm({ ...briefForm, customerName: event.target.value })} /></label>
              <label>스타일<input value={briefForm.style} onChange={(event) => setBriefForm({ ...briefForm, style: event.target.value })} /></label>
              <label>컬러 톤<input value={briefForm.colorTone} onChange={(event) => setBriefForm({ ...briefForm, colorTone: event.target.value })} /></label>
              <label>자재 키워드<input value={briefForm.materialKeywords} onChange={(event) => setBriefForm({ ...briefForm, materialKeywords: event.target.value })} /></label>
              <label>조명 분위기<input value={briefForm.lightingMood} onChange={(event) => setBriefForm({ ...briefForm, lightingMood: event.target.value })} /></label>
            </div>
            <label>디자인 메모<textarea value={briefForm.designNotes} onChange={(event) => setBriefForm({ ...briefForm, designNotes: event.target.value })} /></label>
            <div className="button-row">
              <button onClick={handleCreateBrief} disabled={isBusy}>브리프 생성</button>
              <button onClick={handleGeneratePrompts} disabled={isBusy || !selectedBriefId}>프롬프트 생성</button>
            </div>
          </section>

          <section className="drawer-block">
            <h3>투시도 프롬프트</h3>
            <div className="button-row">
              <button className={promptType === 'PERSPECTIVE' ? 'active' : ''} onClick={() => setPromptType('PERSPECTIVE')}>투시도 프롬프트</button>
              <button className={promptType === 'ISOMETRIC' ? 'active' : ''} onClick={() => setPromptType('ISOMETRIC')}>아이소메트릭 프롬프트</button>
              <button className={promptType === 'MOODBOARD' ? 'active' : ''} onClick={() => setPromptType('MOODBOARD')}>무드보드 프롬프트</button>
            </div>
            <textarea className="prompt-output" value={activePrompt || '먼저 공간 브리프를 생성하세요.'} readOnly />
            <h4>Negative Prompt</h4>
            <textarea className="prompt-output compact" value={negativePrompt || '외부 이미지 생성 API는 아직 연결되지 않았습니다.'} readOnly />
            <div className="button-row">
              <button onClick={() => handleCopyPrompt(activePrompt || '')} disabled={!activePrompt}>프롬프트 복사</button>
              <button onClick={handleQueueJob} disabled={isBusy || !activePrompt}>생성 대기 등록</button>
            </div>
          </section>

          <section className="drawer-block">
            <h3>ComfyUI 연결 설정</h3>
            <div className="form-grid">
              <label>서버 주소<input value={comfySettings.host} onChange={(event) => setComfySettings({ ...comfySettings, host: event.target.value })} /></label>
              <label>포트<input type="number" value={comfySettings.port} onChange={(event) => setComfySettings({ ...comfySettings, port: Number(event.target.value) })} /></label>
              <label>기본 워크플로우<input value={comfySettings.defaultWorkflowId} onChange={(event) => setComfySettings({ ...comfySettings, defaultWorkflowId: event.target.value })} /></label>
              <label>연결 상태<input value={String(((data.comfyUi?.settings as Record<string, unknown> | undefined)?.lastHealthStatus) || 'NOT_CHECKED')} readOnly /></label>
            </div>
            <div className="button-row">
              <button onClick={handleSaveComfySettings} disabled={isBusy}>저장</button>
              <button onClick={handleCheckComfyConnection} disabled={isBusy}>연결 테스트</button>
            </div>
            <p>ComfyUI가 실행 중이 아니어도 MANUAL 프롬프트 복사와 이미지 첨부는 계속 사용할 수 있습니다.</p>
          </section>

          <section className="drawer-block">
            <h3>워크플로우 프리셋</h3>
            <div className="form-grid">
              <label>프리셋 이름<input value={workflowPreset.presetName} onChange={(event) => setWorkflowPreset({ ...workflowPreset, presetName: event.target.value })} /></label>
              <label>프리셋 유형
                <select value={workflowPreset.presetType} onChange={(event) => setWorkflowPreset({ ...workflowPreset, presetType: event.target.value })}>
                  <option value="PERSPECTIVE">PERSPECTIVE</option>
                  <option value="ISOMETRIC">ISOMETRIC</option>
                  <option value="MOODBOARD">MOODBOARD</option>
                  <option value="DETAIL">DETAIL</option>
                </select>
              </label>
              <label>Positive Prompt Node ID<input value={workflowPreset.positivePromptNodeId} onChange={(event) => setWorkflowPreset({ ...workflowPreset, positivePromptNodeId: event.target.value })} /></label>
              <label>Negative Prompt Node ID<input value={workflowPreset.negativePromptNodeId} onChange={(event) => setWorkflowPreset({ ...workflowPreset, negativePromptNodeId: event.target.value })} /></label>
              <label>Seed Node ID<input value={workflowPreset.seedNodeId} onChange={(event) => setWorkflowPreset({ ...workflowPreset, seedNodeId: event.target.value })} /></label>
              <label>Width / Height Node ID<input value={`${workflowPreset.widthNodeId}/${workflowPreset.heightNodeId}`} onChange={(event) => {
                const [widthNodeId = '', heightNodeId = ''] = event.target.value.split('/');
                setWorkflowPreset({ ...workflowPreset, widthNodeId, heightNodeId });
              }} /></label>
            </div>
            <label>Workflow JSON<textarea className="prompt-output compact" value={workflowPreset.workflowJson} onChange={(event) => setWorkflowPreset({ ...workflowPreset, workflowJson: event.target.value })} /></label>
            <div className="button-row">
              <button onClick={handleSaveWorkflowPreset} disabled={isBusy}>프리셋 추가 / 편집</button>
              <button onClick={handleRunComfyUi} disabled={isBusy || !activePrompt}>ComfyUI로 생성</button>
              <button onClick={handleRefreshComfyResult} disabled={isBusy || !selectedJobId}>생성 상태 확인</button>
            </div>
          </section>

          <section className="drawer-block">
            <h3>생성 대기열</h3>
            {data.jobs.length ? data.jobs.map((job) => (
              <button key={String(job.id)} className={selectedJobId === String(job.id) ? 'action-row active' : 'action-row'} onClick={() => setSelectedJobId(String(job.id))}>
                <span>{String(job.promptType)}</span>
                <div>
                  <strong>Provider: {String(job.provider)}</strong>
                  <p>{koStatus(job.status)} / {String(job.requestedAt)}</p>
                  {job.lastError || job.errorMessage ? <p>{String(job.lastError || job.errorMessage)}</p> : null}
                  {job.outputPath ? <p>Result file: {String(job.outputPath)}</p> : null}
                </div>
                <em>{String(job.id).slice(-6)}</em>
              </button>
            )) : <p>생성 대기 항목이 없습니다.</p>}
          </section>
        </main>

        <aside className="ai-estimate-assistant">
          <section className="drawer-block">
            <h3>무드보드 연결</h3>
            <p>Floorplan Center의 무드보드와 공간 메모가 브리프에 자동 반영됩니다.</p>
            <strong>{activeBrief ? `${String(activeBrief.spaceName)} / ${String(activeBrief.style)}` : '생성된 브리프가 없습니다.'}</strong>
          </section>

          <section className="drawer-block">
            <h3>생성 결과</h3>
            <label>이미지 경로<input value={imagePath} onChange={(event) => setImagePath(event.target.value)} /></label>
            <button onClick={handleAttachResult} disabled={isBusy || !selectedJobId}>이미지 첨부</button>
            <label>검토 메모<input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label>
            {data.results.length ? data.results.map((result) => (
              <div className="ai-list-item" key={String(result.id)}>
                <small>{String(result.resultType)} / {koStatus(result.status)}</small>
                <strong>{String(result.imagePath)}</strong>
                <p>{String(result.reviewNote || '검토 메모 없음')}</p>
                <div className="button-row">
                  <button onClick={() => handleReview(String(result.id), 'APPROVE')} disabled={isBusy}>승인</button>
                  <button onClick={() => handleReview(String(result.id), 'REJECT')} disabled={isBusy}>반려</button>
                  <button onClick={() => handleReview(String(result.id), 'REQUEST_REVISION')} disabled={isBusy}>수정 요청</button>
                  <button onClick={() => handleReview(String(result.id), 'SET_PROPOSAL')} disabled={isBusy}>계약 제안 이미지</button>
                </div>
              </div>
            )) : <p>생성된 이미지가 없습니다.</p>}
          </section>

          <section className="drawer-block">
            <h3>승인 / 반려</h3>
            <p>승인된 이미지는 고객용 견적서, 제안 문서, 포트폴리오 후보, 계약 보조 자료에 연결할 수 있습니다.</p>
            <p>ComfyUI가 켜져 있으면 실제 생성 요청을 보내고, 꺼져 있으면 수동 첨부 워크플로로 안전하게 전환합니다.</p>
          </section>
          <p className="assistant-message">{messageKo}</p>
        </aside>
      </div>
    </div>
  );
}
