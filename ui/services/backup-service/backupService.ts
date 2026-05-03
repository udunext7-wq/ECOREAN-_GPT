export type BackupStatus = {
  backupRoot: string;
  exportRoot: string;
  databaseList: Array<Record<string, unknown>>;
  backupLogs: Array<Record<string, unknown>>;
  restoreLogs: Array<Record<string, unknown>>;
  exportLogs: Array<Record<string, unknown>>;
};

export async function loadBackupStatus(): Promise<BackupStatus | null> {
  if (!window.ecorean?.bocDb?.getBackupStatus) return null;
  return window.ecorean.bocDb.getBackupStatus() as Promise<BackupStatus>;
}

export async function createFullBackup() {
  if (!window.ecorean?.bocDb?.createFullBackup) return null;
  return window.ecorean.bocDb.createFullBackup({ actor: 'CEO' });
}

export async function createDatabaseBackup(dbName: string) {
  if (!window.ecorean?.bocDb?.createDatabaseBackup) return null;
  return window.ecorean.bocDb.createDatabaseBackup({ dbName, actor: 'CEO' });
}

export async function previewRestore(backupPath: string) {
  if (!window.ecorean?.bocDb?.previewRestore) return null;
  return window.ecorean.bocDb.previewRestore({ backupPath });
}

export async function restoreBackup(backupPath: string, approvalConfirmed: boolean) {
  if (!window.ecorean?.bocDb?.restoreBackup) return null;
  return window.ecorean.bocDb.restoreBackup({
    backupPath,
    approvalConfirmed,
    actor: 'CEO',
    approvalReasonKo: '대표 승인 Restore'
  });
}

export async function exportJson(scope = 'ALL') {
  if (!window.ecorean?.bocDb?.exportJson) return null;
  return window.ecorean.bocDb.exportJson({ scope, actor: 'CEO' });
}

export async function exportExcel(scope = 'ALL') {
  if (!window.ecorean?.bocDb?.exportExcel) return null;
  return window.ecorean.bocDb.exportExcel({ scope, actor: 'CEO' });
}
