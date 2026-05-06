export type PaymentCenterData = {
  snapshotDate: string;
  summary: Record<string, number | string>;
  customerPayments: Array<Record<string, unknown>>;
  vendorPayments: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  communicationData: Record<string, unknown>;
};

const emptyPaymentCenterData: PaymentCenterData = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  summary: {
    dataStatus: 'EMPTY',
    displayStatusKo: '데이터 없음'
  },
  customerPayments: [],
  vendorPayments: [],
  transactions: [],
  alerts: [],
  communicationData: {}
};

export async function loadPaymentCenterData(): Promise<PaymentCenterData> {
  if (!window.ecorean?.bocDb?.getPaymentCenterData) return emptyPaymentCenterData;
  return (await window.ecorean.bocDb.getPaymentCenterData()) as PaymentCenterData;
}

export async function markCustomerPaymentReceived(paymentId: string, amount?: number) {
  if (!window.ecorean?.bocDb?.markCustomerPaymentReceived) return null;
  return window.ecorean.bocDb.markCustomerPaymentReceived({ paymentId, amount, actor: 'CEO' });
}

export async function markVendorPaymentPaid(paymentId: string, amount?: number) {
  if (!window.ecorean?.bocDb?.markVendorPaymentPaid) return null;
  return window.ecorean.bocDb.markVendorPaymentPaid({ paymentId, amount, actor: 'CEO' });
}

export async function createPaymentRequestMessage(paymentId: string) {
  if (!window.ecorean?.bocDb?.createPaymentRequestMessage) return null;
  return window.ecorean.bocDb.createPaymentRequestMessage({ paymentId, actor: 'CEO' });
}

export async function requestVendorPaymentApproval(paymentId: string) {
  if (!window.ecorean?.bocDb?.requestVendorPaymentApproval) return null;
  return window.ecorean.bocDb.requestVendorPaymentApproval({ paymentId, actor: 'CEO' });
}
