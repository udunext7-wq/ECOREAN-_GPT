export type PermissionAuditExportFormat = 'JSON' | 'CSV' | 'HTML';

export type PermissionAuditExportOptions = {
  formats: PermissionAuditExportFormat[];
  eventTypes: string[];
  riskLevels: string[];
  statuses: string[];
  redactionApplied: boolean;
  externalAuthentication: 'DISABLED';
};

export type PermissionAuditExportResult = {
  format: PermissionAuditExportFormat;
  mimeType: string;
  fileName: string;
  generatedAt: string;
  filters: Record<string, unknown>;
  recordCount: number;
  records: Record<string, unknown>[];
  content: string;
  redactionApplied: boolean;
  externalAuthentication: 'DISABLED';
};

export async function loadPermissionAuditExportOptions() {
  const api = window.ecorean?.bocDb;
  if (!api?.getPermissionAuditExportOptions) {
    return {
      formats: ['JSON', 'CSV', 'HTML'],
      eventTypes: [],
      riskLevels: ['LOW', 'MEDIUM', 'HIGH'],
      statuses: [],
      redactionApplied: true,
      externalAuthentication: 'DISABLED'
    } as PermissionAuditExportOptions;
  }
  return api.getPermissionAuditExportOptions() as Promise<PermissionAuditExportOptions>;
}

export async function generatePermissionAuditExport(
  format: PermissionAuditExportFormat,
  filters: Record<string, unknown>,
  actorId: string,
  actorRole: string
) {
  const api = window.ecorean?.bocDb;
  if (!api?.generatePermissionAuditExport) throw new Error('권한 감사 내보내기 API를 사용할 수 없습니다.');
  return api.generatePermissionAuditExport({
    format,
    filters,
    actorId,
    actorRole
  }) as Promise<PermissionAuditExportResult>;
}
