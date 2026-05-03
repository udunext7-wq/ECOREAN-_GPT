import { useEffect, useState } from 'react';
import {
  createDatabaseBackup,
  createFullBackup,
  loadBackupStatus,
  previewRestore,
  restoreBackup,
  type BackupStatus
} from '../../services/backup-service/backupService';

const dbNames = ['project', 'approval', 'master', 'logs'];

export function BackupRestoreView() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [messageKo, setMessageKo] = useState('백업 상태를 불러오는 중입니다.');
  const [restorePath, setRestorePath] = useState('');
  const [restorePreview, setRestorePreview] = useState<Record<string, unknown> | null>(null);
  const [approvalChecked, setApprovalChecked] = useState(false);

  async function refresh() {
    const next = await loadBackupStatus();
    setStatus(next);
    setMessageKo(next ? `백업 폴더: ${next.backupRoot}` : 'Electron DB 연결 없음');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runFullBackup() {
    const result = await createFullBackup();
    setMessageKo(`전체 백업 생성 완료: ${String(result?.backupPath ?? '-')}`);
    await refresh();
  }

  async function runDbBackup(dbName: string) {
    const result = await createDatabaseBackup(dbName);
    setMessageKo(`${dbName}.db 백업 생성 완료: ${String(result?.backupPath ?? '-')}`);
    await refresh();
  }

  async function runPreview() {
    const result = await previewRestore(restorePath);
    setRestorePreview(result);
    setMessageKo(`Restore Preview 완료: checksum ${result?.allChecksPassed ? '정상' : '실패'}`);
  }

  async function runRestore() {
    const result = await restoreBackup(restorePath, approvalChecked);
    setMessageKo(`Restore 완료. 사전 백업: ${String(result?.preRestoreBackupPath ?? '-')}`);
    await refresh();
  }

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">BACKUP / RESTORE</span>
          <h4>DB 백업 / 복구</h4>
        </div>
        <button onClick={runFullBackup}>전체 백업 생성</button>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>DB별 백업</h5>
          {dbNames.map((dbName) => (
            <div className="case-row" key={dbName}>
              <strong>{dbName}.db</strong>
              <span>{String(status?.databaseList.find((item) => item.dbName === dbName)?.checksum ?? 'CHECKING')}</span>
              <button onClick={() => runDbBackup(dbName)}>{dbName}.db 백업</button>
            </div>
          ))}
        </div>

        <div className="estimate-preview-card">
          <h5>Restore Preview / 승인</h5>
          <label className="backup-input">
            <span>Backup Folder Path</span>
            <input value={restorePath} onChange={(event) => setRestorePath(event.target.value)} placeholder=".../storage/sqlite/backups/BACKUP-..." />
          </label>
          <div className="button-row">
            <button onClick={runPreview} disabled={!restorePath}>Preview</button>
            <button className="approval-action approval-reject" onClick={runRestore} disabled={!restorePreview || !approvalChecked}>
              Restore 실행
            </button>
          </div>
          <label className="completion-checkbox">
            <input type="checkbox" checked={approvalChecked} onChange={(event) => setApprovalChecked(event.target.checked)} />
            <span>대표 Restore 승인 확인</span>
          </label>
          {restorePreview ? (
            <div className="case-row">
              <strong>Checksum 검증</strong>
              <span>{String(restorePreview.allChecksPassed ? '정상' : '실패')}</span>
              <p>Restore 전 현재 DB는 자동으로 사전 백업됩니다.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
