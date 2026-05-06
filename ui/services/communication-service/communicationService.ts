export type CommunicationMessage = {
  id: string;
  message_type: string;
  target_type: 'CLIENT' | 'VENDOR' | 'INTERNAL';
  target_name: string;
  target_contact: string;
  related_entity_type: string;
  related_entity_id: string;
  title: string;
  body: string;
  status: 'DRAFT' | 'READY' | 'SENT' | 'FAILED' | 'CANCELLED';
  created_at: string;
  sent_at?: string | null;
};

export type CommunicationCenterData = {
  snapshotDate: string;
  summary: {
    totalMessages: number;
    draftCount: number;
    readyCount: number;
    sentCount: number;
    failedCount: number;
    cancelledCount: number;
    templateCount: number;
  };
  messages: CommunicationMessage[];
  sendLogs: Array<Record<string, unknown>>;
  templates: Array<Record<string, unknown>>;
};

const emptyData: CommunicationCenterData = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  summary: {
    totalMessages: 0,
    draftCount: 0,
    readyCount: 0,
    sentCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    templateCount: 0
  },
  messages: [],
  sendLogs: [],
  templates: []
};

export async function loadCommunicationCenterData(): Promise<CommunicationCenterData> {
  if (!window.ecorean?.bocDb?.getCommunicationCenterData) return emptyData;
  return (await window.ecorean.bocDb.getCommunicationCenterData()) as CommunicationCenterData;
}

export async function generateCommunicationMessage(payload: Record<string, unknown>) {
  if (!window.ecorean?.bocDb?.generateCommunicationMessage) return null;
  return window.ecorean.bocDb.generateCommunicationMessage(payload);
}

export async function markCommunicationMessageSent(messageId: string) {
  if (!window.ecorean?.bocDb?.markCommunicationMessageSent) return null;
  return window.ecorean.bocDb.markCommunicationMessageSent({ messageId, channel: 'COPY_MANUAL', actor: 'CEO' });
}

export async function cancelCommunicationMessage(messageId: string) {
  if (!window.ecorean?.bocDb?.cancelCommunicationMessage) return null;
  return window.ecorean.bocDb.cancelCommunicationMessage({ messageId, actor: 'CEO', reasonKo: '커뮤니케이션 센터에서 취소' });
}
