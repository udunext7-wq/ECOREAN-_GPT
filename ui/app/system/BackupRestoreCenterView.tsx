import { useEffect, useState } from 'react';
import {
  createDatabaseBackup,
  createExportBackup,
  createFullBackup,
  createPreUpdateBackup,
  getBackupRestoreStatus,
  prepareRestorePlan,
  validateDatabase,
  verifyBackup,
  type BackupRecord,
  type BackupRestoreStatus
} from '../../services/system-service/backupRestoreService';

function formatBytes(value: number) {
  if (!value) return '0 B';
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value > 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function statusLabel(status: string) {
  if (status === 'SUCCESS' || status === 'OK') return '정상';
  if (status === 'VERIFY_FAILED' || status === 'ERROR') return '오류';
  return '확인 필요';
}

function statusClass(status: string) {
  if (status === 'SUCCESS' || status === 'OK') return 'complete';
  if (status === 'VERIFY_FAILED' || status === 'ERROR') return 'supplement';
  return 'active';
}

export function BackupRestoreCenterView() {
  const [data, setData] = useState<BackupRestoreStatus | null>(null);
  const [message, setMessage] = useState('');
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [restorePlan, setRestorePlan] = useState<Record<string, unknown> | null>(null);

  async function refresh() {
    try {
      const result = await getBackupRestoreStatus();
      setData(result);
      setSelectedBackup((current) => current || result.backups[0] || null);
      setMessage(result.recentStatusKo || '');
    } catch (error) {
      console.error('[Backup Restore Center] load failed', error);
      setMessage('백업 정보를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function runAction(action: () => Promise<Record<string, unknown>>, successMessage: string) {
    try {
      const result = await action();
      setMessage(`${successMessage}: ${String(result.backupId || result.statusKo || '완료')}`);
      await refresh();
    } catch (error) {
      console.error('[Backup Restore Center] action failed', error);
      setMessage('백업 작업을 완료하지 못했습니다.');
    }
  }

  async function runVerify(backup: BackupRecord) {
    const result = await verifyBackup({ backupId: backup.backupId });
    setMessage(`백업 검증: ${String(result.statusKo || '확인 완료')}`);
    await refresh();
  }

  async function runIntegrity() {
    const result = await validateDatabase();
    setMessage(`현재 DB 무결성 검사: ${String(result.statusKo || '확인 완료')}`);
    await refresh();
  }

  async function showRestorePlan(backup: BackupRecord) {
    const result = await prepareRestorePlan({ backupId: backup.backupId });
    setRestorePlan(result);
    setSelectedBackup(backup);
    setMessage('복구 계획을 생성했습니다. 자동 덮어쓰기는 수행하지 않습니다.');
  }

  const paths = data?.paths;
  const integrity = data?.integrity;

  return (
    <section className="view-stack">
      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">DATA SAFETY</span>
            <h2>백업 / 복구 센터</h2>
            <p>운영 DB와 출력 파일을 로컬 userData 안에서 백업하고, 복구 전 계획을 확인합니다.</p>
          </div>
          <span className={`status-pill ${statusClass(integrity?.status || 'NEEDS_REVIEW')}`}>{integrity?.statusKo || '확인 필요'}</span>
        </div>
        <div className="button-row">
          <button className="primary-action" onClick={() => runAction(createDatabaseBackup, 'DB 백업 생성')}>DB 백업 생성</button>
          <button onClick={() => runAction(createExportBackup, 'Export 백업 생성')}>Export 백업 생성</button>
          <button onClick={() => runAction(createFullBackup, '전체 백업 생성')}>전체 백업 생성</button>
          <button onClick={() => runAction(createPreUpdateBackup, '업데이트 전 백업 생성')}>업데이트 전 백업 생성</button>
          <button onClick={() => void runIntegrity()}>현재 DB 무결성 검사</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'initialMasterData' }))}>초기 기준 데이터 세팅</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realPriceCalibration' }))}>실제 단가 보정</button>
          <button onClick={() => void refresh()}>백업 목록 새로고침</button>
        </div>
        {message ? <p className="assistant-message">{message}</p> : null}
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">PATHS</span>
            <h3>운영 데이터 위치</h3>
          </div>
        </div>
        <div className="internal-kpi-grid">
          <article><span>userData</span><strong>{paths?.userDataRoot || '-'}</strong></article>
          <article><span>SQLite DB</span><strong>{paths?.databaseDir || '-'}</strong></article>
          <article><span>Export</span><strong>{paths?.exportRoot || '-'}</strong></article>
          <article><span>백업 위치</span><strong>{paths?.backupRoot || '-'}</strong></article>
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">INTEGRITY</span>
            <h3>무결성 검사</h3>
          </div>
          <strong>{integrity?.statusKo || '확인 필요'}</strong>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>DB</th><th>상태</th><th>테이블</th><th>메시지</th></tr>
            </thead>
            <tbody>
              {(integrity?.results || []).map((item) => (
                <tr key={String(item.dbName)}>
                  <td>{String(item.dbName)}</td>
                  <td><span className={`status-pill ${statusClass(String(item.status))}`}>{String(item.statusKo)}</span></td>
                  <td>{String(item.tableCount || 0)}</td>
                  <td>{String(item.message || item.integrity || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">HISTORY</span>
            <h3>백업 이력</h3>
          </div>
          <span className="small-note">백업 파일은 DB에 저장하지 않고 경로와 manifest만 기록합니다.</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>유형</th><th>백업 ID</th><th>상태</th><th>크기</th><th>생성일</th><th>작업</th></tr>
            </thead>
            <tbody>
              {(data?.backups || []).map((backup) => (
                <tr key={backup.backupId}>
                  <td>{backup.backupType}</td>
                  <td>{backup.backupId}</td>
                  <td><span className={`status-pill ${statusClass(backup.status)}`}>{statusLabel(backup.status)}</span></td>
                  <td>{formatBytes(backup.fileSize)}</td>
                  <td>{backup.createdAt}</td>
                  <td>
                    <div className="button-row">
                      <button onClick={() => void runVerify(backup)}>검증</button>
                      <button onClick={() => void showRestorePlan(backup)}>복구 계획 보기</button>
                      <button onClick={() => setSelectedBackup(backup)}>상세</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.backups?.length ? (
                <tr><td colSpan={6}>생성된 백업이 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">RESTORE</span>
            <h3>복구 안내</h3>
          </div>
        </div>
        <p className="assistant-message">복구는 현재 데이터를 덮어쓸 수 있으므로 자동 실행하지 않습니다. 복구 전 현재 데이터가 먼저 백업되어야 하며, RC-0.3.0에서는 수동 복구 계획을 제공합니다.</p>
        {selectedBackup ? (
          <div className="internal-kpi-grid">
            <article><span>선택 백업</span><strong>{selectedBackup.backupId}</strong></article>
            <article><span>Manifest</span><strong>{selectedBackup.manifestPath}</strong></article>
          </div>
        ) : null}
        {restorePlan ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>복구 계획</th><th>내용</th></tr></thead>
              <tbody>
                <tr><td>확인 문구</td><td>{String(restorePlan.requiresConfirmationText || '')}</td></tr>
                <tr><td>상태</td><td>{String(restorePlan.statusKo || '')}</td></tr>
                <tr><td>경고</td><td>{String(restorePlan.warningKo || '')}</td></tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}
