import { useEffect, useMemo, useState } from 'react';
import {
  createFloorplanSpace,
  generatePerspectivePrompt,
  getFloorplanCenterData,
  linkEstimateItemToSpace,
  saveFloorplanMetadata,
  saveMoodboardProfile,
  type FloorplanCenterData
} from '../../services/design-service/floorplanService';
import { PerspectivePromptGeneratorView } from './PerspectivePromptGeneratorView';

const spaceTypes = ['거실', '주방', '욕실', '침실', '현관', '복도', '발코니', '다용도실', '드레스룸', '팬트리', '기타'];

function money(value: unknown) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function percent(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

const emptyData: FloorplanCenterData = {
  floorplans: [],
  activeFloorplan: null,
  spaces: [],
  links: [],
  summaries: [],
  isometricPreview: { blocks: [] },
  prompts: [],
  moodboards: [],
  emptyState: true
};

export function FloorplanCenterView() {
  const [data, setData] = useState<FloorplanCenterData>(emptyData);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [messageKo, setMessageKo] = useState('평면도를 업로드하거나 공간을 직접 생성하세요.');
  const [isBusy, setIsBusy] = useState(false);
  const [spaceForm, setSpaceForm] = useState({ spaceName: '거실', spaceType: '거실', areaM2: 20, notes: '' });
  const [linkForm, setLinkForm] = useState({
    itemName: '바닥재',
    amount: 1200000,
    cost: 820000,
    margin: 380000,
    estimateType: 'manual',
    estimateId: 'MANUAL'
  });
  const [moodboard, setMoodboard] = useState({
    style: 'modern minimal',
    colorTone: 'warm neutral',
    primaryMaterials: 'wood, tile, paint',
    lightingMood: 'soft indirect lighting',
    referenceNotes: ''
  });
  const [promptText, setPromptText] = useState('');

  async function refresh(payload: Record<string, unknown> = {}) {
    const next = await getFloorplanCenterData(payload);
    setData(next);
    if (!selectedSpaceId && next.spaces[0]?.id) setSelectedSpaceId(String(next.spaces[0].id));
  }

  useEffect(() => {
    refresh().catch((error) => setMessageKo(error instanceof Error ? error.message : '평면도 데이터를 불러오지 못했습니다.'));
  }, []);

  const summaryMap = useMemo(() => new Map(data.summaries.map((summary) => [String(summary.spaceId), summary])), [data.summaries]);
  const selectedFloorplanId = String(data.activeFloorplan?.id || '');

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setIsBusy(true);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file));
      else setPreviewUrl('');

      const result = await saveFloorplanMetadata({
        fileName: file.name,
        filePath: file.name,
        fileType: file.name.split('.').pop()?.toUpperCase() || file.type,
        width: 0,
        height: 0
      });
      setData(result.floorplanCenterData as FloorplanCenterData);
      setMessageKo(`평면도 메타데이터 저장 완료: ${file.name}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '평면도 저장 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateSpace() {
    if (!selectedFloorplanId) {
      setMessageKo('먼저 평면도를 등록하세요.');
      return;
    }
    setIsBusy(true);
    try {
      const result = await createFloorplanSpace({ floorplanId: selectedFloorplanId, ...spaceForm });
      setData(result.floorplanCenterData as FloorplanCenterData);
      setSelectedSpaceId(String(result.spaceId || ''));
      setMessageKo(`공간 생성 완료: ${spaceForm.spaceName}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '공간 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLinkEstimateItem() {
    if (!selectedSpaceId) {
      setMessageKo('견적 항목을 연결할 공간을 선택하세요.');
      return;
    }
    setIsBusy(true);
    try {
      const result = await linkEstimateItemToSpace({ spaceId: selectedSpaceId, ...linkForm });
      setData(result.floorplanCenterData as FloorplanCenterData);
      setMessageKo(`공간별 견적 연결 완료: ${linkForm.itemName}`);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '견적 연결 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveMoodboard() {
    setIsBusy(true);
    try {
      const result = await saveMoodboardProfile({ floorplanId: selectedFloorplanId || undefined, ...moodboard });
      setData(result.floorplanCenterData as FloorplanCenterData);
      setMessageKo('무드보드 정보가 저장되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '무드보드 저장 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGeneratePrompt(promptType: string) {
    setIsBusy(true);
    try {
      const result = await generatePerspectivePrompt({
        floorplanId: selectedFloorplanId || undefined,
        spaceId: selectedSpaceId || undefined,
        promptType,
        ...moodboard
      });
      setPromptText(String(result.promptText || ''));
      setData(result.floorplanCenterData as FloorplanCenterData);
      setMessageKo('투시도 프롬프트가 생성되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '프롬프트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  function openAIVisualizationCenter() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'aiVisualization' }));
  }

  return (
    <div className="bathroom-wizard">
      <div className="wizard-hero">
        <div>
          <span className="eyebrow">FLOORPLAN CONNECTION</span>
          <h2>평면도 / 아이소메트릭</h2>
          <p>견적 데이터를 공간별로 연결하고, 아이소메트릭 블록과 투시도 프롬프트로 확장합니다.</p>
        </div>
        <button onClick={openAIVisualizationCenter}>AI 투시도 생성</button>
      </div>

      <div className="wizard-layout">
        <main className="wizard-main">
          <section className="drawer-block">
            <h3>평면도 업로드</h3>
            <input type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" onChange={(event) => handleFileChange(event.target.files?.[0] || null)} disabled={isBusy} />
            {data.emptyState ? <p>등록된 평면도가 없습니다. PNG/JPG/PDF 메타데이터를 먼저 저장하세요.</p> : <p>현재 평면도: {String(data.activeFloorplan?.fileName || '')}</p>}
            {previewUrl ? <img className="floorplan-preview-image" src={previewUrl} alt="평면도 미리보기" /> : <div className="floorplan-placeholder">이미지 미리보기 또는 PDF placeholder</div>}
          </section>

          <section className="drawer-block">
            <h3>공간 구역 설정</h3>
            <div className="form-grid">
              <label>공간명<input value={spaceForm.spaceName} onChange={(event) => setSpaceForm({ ...spaceForm, spaceName: event.target.value })} /></label>
              <label>공간 유형<select value={spaceForm.spaceType} onChange={(event) => setSpaceForm({ ...spaceForm, spaceType: event.target.value })}>{spaceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label>면적 m2<input type="number" value={spaceForm.areaM2} onChange={(event) => setSpaceForm({ ...spaceForm, areaM2: Number(event.target.value) })} /></label>
              <label>메모<input value={spaceForm.notes} onChange={(event) => setSpaceForm({ ...spaceForm, notes: event.target.value })} /></label>
            </div>
            <button onClick={handleCreateSpace} disabled={isBusy || !selectedFloorplanId}>공간 생성</button>
            <div className="button-row">
              {data.spaces.map((space) => <button key={String(space.id)} className={selectedSpaceId === String(space.id) ? 'active' : ''} onClick={() => setSelectedSpaceId(String(space.id))}>{String(space.spaceName)} / {String(space.areaM2)}m2</button>)}
            </div>
          </section>

          <section className="drawer-block">
            <h3>공간별 견적 연결</h3>
            <div className="form-grid">
              <label>항목명<input value={linkForm.itemName} onChange={(event) => setLinkForm({ ...linkForm, itemName: event.target.value })} /></label>
              <label>고객가<input type="number" value={linkForm.amount} onChange={(event) => setLinkForm({ ...linkForm, amount: Number(event.target.value) })} /></label>
              <label>원가<input type="number" value={linkForm.cost} onChange={(event) => setLinkForm({ ...linkForm, cost: Number(event.target.value) })} /></label>
              <label>마진<input type="number" value={linkForm.margin} onChange={(event) => setLinkForm({ ...linkForm, margin: Number(event.target.value) })} /></label>
            </div>
            <button onClick={handleLinkEstimateItem} disabled={isBusy || !selectedSpaceId}>선택 공간에 연결</button>
            <table className="data-table">
              <thead><tr><th>공간</th><th>고객가</th><th>원가</th><th>마진</th><th>마진율</th></tr></thead>
              <tbody>
                {data.spaces.map((space) => {
                  const summary = summaryMap.get(String(space.id));
                  return <tr key={String(space.id)}><td>{String(space.spaceName)}</td><td>{money(summary?.amount)}</td><td>{money(summary?.cost)}</td><td>{money(summary?.margin)}</td><td>{percent(summary?.marginRate)}</td></tr>;
                })}
              </tbody>
            </table>
          </section>

          <section className="drawer-block">
            <h3>아이소메트릭 보기</h3>
            <div className="isometric-canvas">
              {data.isometricPreview.blocks.length ? data.isometricPreview.blocks.map((block) => (
                <div
                  key={String(block.id)}
                  className="iso-block"
                  style={{ left: `${Number(block.x || 0)}px`, top: `${Number(block.y || 0)}px`, width: `${Number(block.width || 80)}px`, height: `${Number(block.depth || 60)}px` }}
                >
                  <strong>{String(block.labelKo)}</strong>
                  <span>{String(block.areaM2)}m2</span>
                  <em>{money(block.amount)}</em>
                </div>
              )) : <p>공간을 생성하면 단순 블록 아이소메트릭이 표시됩니다.</p>}
            </div>
          </section>
        </main>

        <aside className="ai-estimate-assistant">
          <section className="drawer-block">
            <h3>무드보드 연결</h3>
            <label>스타일<input value={moodboard.style} onChange={(event) => setMoodboard({ ...moodboard, style: event.target.value })} /></label>
            <label>컬러 톤<input value={moodboard.colorTone} onChange={(event) => setMoodboard({ ...moodboard, colorTone: event.target.value })} /></label>
            <label>주요 자재<input value={moodboard.primaryMaterials} onChange={(event) => setMoodboard({ ...moodboard, primaryMaterials: event.target.value })} /></label>
            <label>조명 분위기<input value={moodboard.lightingMood} onChange={(event) => setMoodboard({ ...moodboard, lightingMood: event.target.value })} /></label>
            <label>참고 이미지 메모<input value={moodboard.referenceNotes} onChange={(event) => setMoodboard({ ...moodboard, referenceNotes: event.target.value })} /></label>
            <button onClick={handleSaveMoodboard} disabled={isBusy}>무드보드 저장</button>
            <p className="assistant-message">무드보드 + 평면도 + 견적 데이터 = 투시도 프롬프트</p>
          </section>
          <PerspectivePromptGeneratorView promptText={promptText} onGenerate={handleGeneratePrompt} isBusy={isBusy} />
          <section className="drawer-block">
            <h3>프롬프트 생성 기록</h3>
            {data.prompts.length ? data.prompts.map((prompt) => <p key={String(prompt.id)}>{String(prompt.prompt_type)} / {String(prompt.created_at)}</p>) : <p>아직 생성된 프롬프트가 없습니다.</p>}
          </section>
          <p className="assistant-message">{messageKo}</p>
        </aside>
      </div>
    </div>
  );
}
