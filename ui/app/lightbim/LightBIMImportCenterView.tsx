import { useMemo, useState } from 'react';
import {
  createEstimateFromLightBIM,
  importLightBIMJSON,
  importLightBIMPayload,
  selectLightBIMJSONFile,
  storeLightBIMDraft,
  type LightBIMImportResult
} from '../../services/lightbim-import-service/lightBimImportService';
import type { ViewKey } from '../../src/types/dashboard';

const estimateTypeKo: Record<string, string> = {
  BATHROOM: '욕실 리모델링',
  KITCHEN: '주방 리모델링',
  FULL_REMODELING: '전체 리모델링'
};

function formatNumber(value: unknown, unit = '') {
  const numeric = Number(value || 0);
  return `${numeric.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
}

function resolveTargetView(type?: string): ViewKey {
  if (type === 'BATHROOM') return 'bathroomEstimate';
  if (type === 'KITCHEN') return 'kitchenEstimate';
  return 'fullRemodelingEstimate';
}

export function LightBIMImportCenterView() {
  const [importResult, setImportResult] = useState<LightBIMImportResult | null>(null);
  const [estimateResult, setEstimateResult] = useState<LightBIMImportResult | null>(null);
  const [messageKo, setMessageKo] = useState('LightBIM JSON 파일을 선택하세요. 기존 수동 입력 방식은 계속 사용할 수 있습니다.');
  const [isBusy, setIsBusy] = useState(false);

  const summary = useMemo(() => {
    return (estimateResult?.summary || importResult?.summary || importResult?.draft?.['summary'] || {}) as Record<string, unknown>;
  }, [importResult, estimateResult]);
  const estimateType = String(estimateResult?.estimateType || summary.detectedEstimateType || importResult?.draft?.['estimateType'] || '');
  const spaces = Array.isArray(summary.spaces) ? summary.spaces as Array<Record<string, unknown>> : [];

  async function handleElectronPick() {
    setIsBusy(true);
    try {
      const selected = await selectLightBIMJSONFile();
      if (selected.canceled) {
        setMessageKo('파일 선택이 취소되었습니다.');
        return;
      }
      const result = await importLightBIMJSON(String(selected.filePath || ''));
      setImportResult(result);
      setEstimateResult(null);
      setMessageKo(result.ok ? 'LightBIM 도면 데이터를 불러왔습니다.' : String(result.errorMessage || 'LightBIM JSON 형식이 올바르지 않습니다.'));
    } catch (error) {
      console.error('[LightBIM] file import failed', error);
      setMessageKo('LightBIM JSON 형식이 올바르지 않습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleBrowserFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsBusy(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as Record<string, unknown>;
      const result = await importLightBIMPayload(payload, file.name);
      setImportResult(result);
      setEstimateResult(null);
      setMessageKo(result.ok ? 'LightBIM 도면 데이터를 불러왔습니다.' : String(result.errorMessage || 'LightBIM JSON 형식이 올바르지 않습니다.'));
    } catch (error) {
      console.error('[LightBIM] browser file import failed', error);
      setMessageKo('LightBIM JSON 형식이 올바르지 않습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateDraft(typeOverride?: string) {
    if (!importResult?.ok && !importResult?.importId) {
      setMessageKo('먼저 LightBIM JSON 파일을 선택하세요.');
      return;
    }
    setIsBusy(true);
    try {
      const finalResult = await createEstimateFromLightBIM({ importId: importResult.importId, estimateTypeOverride: typeOverride });
      setEstimateResult(finalResult);
      storeLightBIMDraft(finalResult);
      setMessageKo(finalResult.ok ? '견적 초안이 생성되었습니다. 견적 Wizard로 이동할 수 있습니다.' : String(finalResult.errorMessage || '견적 초안 생성에 실패했습니다.'));
    } catch (error) {
      console.error('[LightBIM] estimate draft failed', error);
      setMessageKo('견적 초안 생성에 실패했습니다.');
    } finally {
      setIsBusy(false);
    }
  }

  function openWizard(type = estimateType) {
    const targetView = resolveTargetView(type);
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: targetView }));
  }

  return (
    <section className="drawer-stack">
      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">LIGHTBIM IMPORT</span>
            <h3>LightBIM 도면 가져오기</h3>
            <p>MiniCAD의 exportLightBIMJSON 결과를 BOC 견적 초안으로 연결합니다.</p>
          </div>
          <button onClick={handleElectronPick} disabled={isBusy}>JSON 파일 선택</button>
        </div>
        <div className="button-row">
          <label className="secondary-button">
            JSON 파일 선택
            <input type="file" accept="application/json,.json" onChange={handleBrowserFile} style={{ display: 'none' }} />
          </label>
          <button onClick={() => handleCreateDraft()} disabled={isBusy || !importResult?.ok}>추천 견적 초안 생성</button>
        </div>
        <p className="assistant-message">{messageKo}</p>
      </section>

      <section className="drawer-block">
        <h3>도면 정보</h3>
        {!importResult ? <p className="empty-state">아직 가져온 LightBIM JSON이 없습니다.</p> : (
          <div className="internal-kpi-grid">
            <div><span>프로젝트명</span><strong>{String(summary.projectName || '미입력')}</strong></div>
            <div><span>공간 개수</span><strong>{formatNumber(summary.spaceCount, '개')}</strong></div>
            <div><span>총 면적</span><strong>{formatNumber(summary.totalAreaM2, '㎡')}</strong></div>
            <div><span>욕실 수</span><strong>{formatNumber(summary.bathroomCount, '개')}</strong></div>
            <div><span>주방 여부</span><strong>{summary.kitchenExists ? '있음' : '없음'}</strong></div>
            <div><span>추천 견적 유형</span><strong>{estimateTypeKo[estimateType] || '판단 대기'}</strong></div>
          </div>
        )}
      </section>

      <section className="drawer-block">
        <h3>수량 요약</h3>
        <div className="internal-kpi-grid">
          <div><span>바닥 면적</span><strong>{formatNumber(summary.totalAreaM2, '㎡')}</strong></div>
          <div><span>벽 면적</span><strong>{formatNumber(summary.totalWallAreaM2, '㎡')}</strong></div>
          <div><span>천장 면적</span><strong>{formatNumber(summary.totalCeilingAreaM2, '㎡')}</strong></div>
          <div><span>둘레</span><strong>{formatNumber(summary.totalPerimeterM, 'm')}</strong></div>
          <div><span>문</span><strong>{formatNumber(summary.doorCount, '개')}</strong></div>
          <div><span>창</span><strong>{formatNumber(summary.windowCount, '개')}</strong></div>
        </div>
      </section>

      <section className="drawer-block">
        <h3>공간 목록</h3>
        {!spaces.length ? <p className="empty-state">공간 정보가 없습니다.</p> : (
          <div className="simple-table">
            <div className="simple-table-row simple-table-head"><span>공간명</span><span>유형</span><span>면적</span></div>
            {spaces.map((space, index) => (
              <div className="simple-table-row" key={`${String(space.id || space.name || index)}`}>
                <span>{String(space.name || 'Space')}</span>
                <span>{String(space.type || 'OTHER')}</span>
                <span>{formatNumber(space.areaM2, '㎡')}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="drawer-block">
        <h3>견적 초안 생성</h3>
        <div className="button-row">
          <button onClick={() => handleCreateDraft('BATHROOM')} disabled={isBusy || !importResult?.ok}>욕실 견적 초안 생성</button>
          <button onClick={() => handleCreateDraft('KITCHEN')} disabled={isBusy || !importResult?.ok}>주방 견적 초안 생성</button>
          <button onClick={() => handleCreateDraft('FULL_REMODELING')} disabled={isBusy || !importResult?.ok}>전체 리모델링 견적 초안 생성</button>
        </div>
        {estimateResult?.ok ? (
          <div className="estimate-preview-card">
            <h5>견적 유형 판단</h5>
            <strong>{estimateTypeKo[String(estimateResult.estimateType)] || String(estimateResult.estimateType)}</strong>
            <p>PCE 결과: {String((estimateResult.preview?.['pce'] as Record<string, unknown> | undefined)?.decision || '계산 완료')}</p>
            <button onClick={() => openWizard(String(estimateResult.estimateType))}>견적 Wizard 열기</button>
          </div>
        ) : null}
      </section>

      <section className="drawer-block">
        <h3>오류 검증</h3>
        <p className={importResult?.ok === false ? 'danger-text' : 'assistant-message'}>
          {importResult?.ok === false ? String(importResult.errorMessage || 'LightBIM JSON 형식이 올바르지 않습니다.') : '검증 오류가 없습니다.'}
        </p>
      </section>
    </section>
  );
}
