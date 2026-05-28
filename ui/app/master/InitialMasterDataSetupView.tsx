import { useEffect, useMemo, useState } from 'react';
import {
  createInitialMasterDataBackup,
  getInitialMasterDataStatus,
  resetInitialSeedStatus,
  runInitialMasterDataSetup,
  seedBathroomDefaultPackage,
  seedFullRemodelingDefaultPackage,
  seedInitialEquipmentMaster,
  seedInitialLaborMaster,
  seedInitialMaterialMaster,
  seedInitialProcessMaster,
  seedInitialStandardEstimateItems,
  seedKitchenDefaultPackage,
  validateInitialMasterData,
  type InitialMasterDataStatus
} from '../../services/master-data-service/initialMasterDataService';

const actionList = [
  { label: '공정 기본값 생성', action: seedInitialProcessMaster },
  { label: '자재 기본값 생성', action: seedInitialMaterialMaster },
  { label: '인력/노무 기본값 생성', action: seedInitialLaborMaster },
  { label: '장비 기본값 생성', action: seedInitialEquipmentMaster },
  { label: '표준 품목 생성', action: seedInitialStandardEstimateItems },
  { label: '욕실 기본 세트 생성', action: seedBathroomDefaultPackage },
  { label: '주방 기본 세트 생성', action: seedKitchenDefaultPackage },
  { label: '전체 리모델링 세트 생성', action: seedFullRemodelingDefaultPackage }
];

function asNumber(value: unknown) {
  return Number(value || 0);
}

function formatCount(value: unknown) {
  return `${asNumber(value).toLocaleString('ko-KR')}건`;
}

function resultText(result: Record<string, unknown> | undefined) {
  if (!result) return '실행 결과 없음';
  const inserted = asNumber(result.insertedCount);
  const skipped = asNumber(result.skippedCount);
  const updated = asNumber(result.updatedCount);
  return `inserted ${inserted} / skipped ${skipped} / updated ${updated}`;
}

export function InitialMasterDataSetupView() {
  const [data, setData] = useState<InitialMasterDataStatus | null>(null);
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [messageKo, setMessageKo] = useState('');
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setData(await getInitialMasterDataStatus());
  }

  useEffect(() => {
    refresh();
  }, []);

  const summary = data?.summary || {};
  const logs = useMemo(() => data?.latestLogs || [], [data]);

  async function runAction(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    try {
      const result = await action();
      setLastResult(result as Record<string, unknown>);
      setMessageKo(`${label} 완료`);
      await refresh();
    } catch (error) {
      setMessageKo(`${label} 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleFullSetup() {
    await runAction('백업 후 초기 세팅', () => runInitialMasterDataSetup({ createBackup: true }));
  }

  async function handleValidate() {
    setBusy(true);
    try {
      const result = await validateInitialMasterData();
      setValidation(result as Record<string, unknown>);
      setMessageKo(`데이터 검증 완료: ${String((result as Record<string, unknown>)?.statusKo || '확인 필요')}`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="drawer-block">초기 기준 데이터 세팅 로딩 중...</div>;

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">RC-0.3.0 MASTER DATA</span>
          <h2>초기 기준 데이터 세팅</h2>
          <p>공정, 자재, 노무, 장비, 표준 견적 품목과 기본 견적 세트를 한 번에 준비합니다.</p>
        </div>
        <strong className={data.status === 'COMPLETED' ? 'green-kpi' : 'red-kpi'}>{data.statusKo || '초기 데이터 세팅 필요'}</strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <strong>운영 전 확인</strong>
        <p>{data.warningKo}</p>
        <p>모든 단가는 기본값, 추정값, 수정 필요 상태로 시작합니다. 실제 업체 조건에 맞게 반드시 수정해야 합니다.</p>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>공정 기본값</span><strong>{formatCount(summary.processCount)}</strong></div>
        <div><span>자재 기본값</span><strong>{formatCount(summary.materialCount)}</strong></div>
        <div><span>표준 견적 품목</span><strong>{formatCount(summary.standardItemCount)}</strong></div>
        <div><span>수정 필요 단가</span><strong>{formatCount(summary.priceUpdateRequiredCount)}</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">ACTIONS</span>
            <h3>초기 세팅 실행</h3>
          </div>
          <button disabled={busy} onClick={() => void refresh()}>현재 상태 확인</button>
        </div>
        <div className="button-row">
          <button className="command command-approve" disabled={busy} onClick={() => void handleFullSetup()}>백업 후 실행</button>
          <button disabled={busy} onClick={() => void runAction('초기 백업', createInitialMasterDataBackup)}>초기 백업</button>
          <button disabled={busy} onClick={() => void handleValidate()}>데이터 검증</button>
          <button disabled={busy} onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realPriceCalibration' }))}>실제 단가 보정</button>
          <button disabled={busy} onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'priceWorkbookImport' }))}>단가표 일괄 가져오기</button>
          <button disabled={busy} onClick={() => void runAction('세팅 로그 초기화', resetInitialSeedStatus)}>세팅 로그 초기화</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">SEED BY AREA</span>
            <h3>개별 기본값 생성</h3>
          </div>
        </div>
        <div className="action-command-grid">
          {actionList.map((item) => (
            <button key={item.label} className="command" disabled={busy} onClick={() => void runAction(item.label, item.action)}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>인력/노무 기본값</span><strong>{formatCount(summary.laborCount)}</strong></div>
        <div><span>장비 기본값</span><strong>{formatCount(summary.equipmentCount)}</strong></div>
        <div><span>기본 패키지</span><strong>{formatCount(summary.packageCount)}</strong></div>
        <div><span>세팅 로그</span><strong>{formatCount(summary.seedLogCount)}</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">VALIDATION</span>
            <h3>데이터 검증</h3>
          </div>
        </div>
        {validation ? (
          <div className="today-action-list">
            <div className="action-row">
              <span>{String(validation.statusKo)}</span>
              <div>
                <strong>경고 {formatCount(validation.warningCount)}</strong>
                <p>단가 수정 필요 {formatCount(validation.priceUpdateRequiredCount)}</p>
              </div>
              <em>RC-0.3.0</em>
            </div>
            {((validation.warnings as Array<Record<string, unknown>>) || []).map((warning) => (
              <div key={String(warning.code)} className={`action-row ${warning.severity === 'CRITICAL' ? 'warning-row' : ''}`}>
                <span>{String(warning.severity)}</span>
                <div>
                  <strong>{String(warning.code)}</strong>
                  <p>{String(warning.messageKo)}</p>
                </div>
                <em>{formatCount(warning.count)}</em>
              </div>
            ))}
          </div>
        ) : <p className="empty-state">아직 데이터 검증을 실행하지 않았습니다.</p>}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">LAST RESULT</span>
            <h3>최근 실행 결과</h3>
          </div>
        </div>
        {lastResult ? <pre>{JSON.stringify(lastResult, null, 2)}</pre> : <p className="empty-state">아직 실행 결과가 없습니다.</p>}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">SEED LOG</span>
            <h3>세팅 로그 보기</h3>
          </div>
        </div>
        {logs.length === 0 ? <p className="empty-state">세팅 로그가 없습니다.</p> : (
          <div className="cost-table-wrapper">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>유형</th>
                  <th>상태</th>
                  <th>삽입</th>
                  <th>건너뜀</th>
                  <th>수정</th>
                  <th>시간</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={`${String(log.seed_key)}-${String(log.created_at)}`}>
                    <td>{String(log.seed_type)}</td>
                    <td>{String(log.status)}</td>
                    <td>{String(log.inserted_count)}</td>
                    <td>{String(log.skipped_count)}</td>
                    <td>{String(log.updated_count)}</td>
                    <td>{String(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
