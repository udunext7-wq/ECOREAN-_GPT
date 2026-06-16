function requireDb() {
  const api = window.ecorean?.bocDb;
  if (!api) throw new Error('Electron DB 연결이 필요합니다.');
  return api;
}

export const customerPortalDraftService = {
  create(payload: Record<string, unknown>) {
    return requireDb().createPortalDraft(payload);
  },
  update(payload: Record<string, unknown>) {
    return requireDb().updatePortalDraft(payload);
  },
  list(payload: Record<string, unknown> = {}) {
    return requireDb().listPortalDrafts(payload);
  },
  detail(payload: Record<string, unknown>) {
    return requireDb().getPortalDraftDetail(payload);
  },
  archive(payload: Record<string, unknown>) {
    return requireDb().archivePortalDraft(payload);
  },
  restore(payload: Record<string, unknown>) {
    return requireDb().restorePortalDraft(payload);
  },
  snapshot(payload: Record<string, unknown>) {
    return requireDb().createPortalSnapshot(payload);
  },
  requestReview(payload: Record<string, unknown>) {
    return requireDb().requestPortalDraftReview(payload);
  },
  approve(payload: Record<string, unknown>) {
    return requireDb().approvePortalDraftInternal(payload);
  },
  reject(payload: Record<string, unknown>) {
    return requireDb().rejectPortalDraftInternal(payload);
  },
  revokeApproval(payload: Record<string, unknown>) {
    return requireDb().revokePortalDraftApproval(payload);
  },
  preview(payload: Record<string, unknown>) {
    return requireDb().createInternalPreviewSession(payload);
  },
  revokePreview(payload: Record<string, unknown>) {
    return requireDb().revokeInternalPreviewSession(payload);
  },
  previewPayload(payload: Record<string, unknown>) {
    return requireDb().getInternalPreviewPayload(payload);
  },
  linkLead(payload: Record<string, unknown>) {
    return requireDb().linkPortalDraftToLead(payload);
  },
  linkProject(payload: Record<string, unknown>) {
    return requireDb().linkPortalDraftToProject(payload);
  },
  linkEstimate(payload: Record<string, unknown>) {
    return requireDb().linkPortalDraftToEstimate(payload);
  },
  linkContract(payload: Record<string, unknown>) {
    return requireDb().linkPortalDraftToContract(payload);
  },
  summary() {
    return requireDb().getPortalDraftSummary();
  },
  report(payload: Record<string, unknown> = {}) {
    return requireDb().createPortalDraftAuditReport(payload);
  }
};
