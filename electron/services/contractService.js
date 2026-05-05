const fs = require('fs');
const path = require('path');
const { createBasicPdf } = require('./estimateExportService');

function addDays(dateText, days) {
  const date = dateText ? new Date(dateText) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function money(value) {
  return Math.round(Number(value || 0));
}

function assertExecutableEstimate(estimate) {
  if (estimate.pceDecision === 'BLOCK') {
    throw new Error('수익성 검증 BLOCK 상태에서는 계약/공정표/발주서를 생성할 수 없습니다.');
  }
  if (estimate.pceDecision === 'MODIFY') {
    throw new Error('수정 필요 상태입니다. 견적 수정 후 계약서를 생성하세요.');
  }
}

function buildContractFromEstimate({ estimate, items, startDate }) {
  assertExecutableEstimate(estimate);
  const durationDays = estimate.options?.showerBooth || estimate.options?.zenda ? 7 : 5;
  const contractAmount = money(estimate.revenue);
  return {
    contractNumber: `CON-${estimate.id}`,
    estimateId: estimate.id,
    customerName: estimate.customerName || '미입력',
    siteName: estimate.siteName || '미입력',
    projectName: '욕실 단독 리모델링 공사',
    contractAmount,
    depositAmount: money(contractAmount * 0.3),
    progressPaymentAmount: money(contractAmount * 0.4),
    balanceAmount: money(contractAmount * 0.3),
    startDate: startDate || new Date().toISOString().slice(0, 10),
    endDate: addDays(startDate, durationDays),
    durationDays,
    scopeSummaryKo: Array.from(new Set(items.map((item) => item.category))).join(', '),
    paymentTerms: '계약금 30% / 중도금 40% / 잔금 30%',
    warrantyTerms: '준공 후 통상 하자보수 기준에 따라 처리하며, 고객 사용상 과실 및 추가 변경분은 별도 협의합니다.',
    cancellationTerms: '계약 해지는 착공 전 서면 합의 기준으로 처리하며, 발주 완료 자재 및 선투입 비용은 정산 대상입니다.',
    specialTerms: '배관 대수선, 누수 보수, 구조 보강, 고객 추가 요청, 현장 변수 발생분은 별도 협의합니다.',
    status: 'DRAFT'
  };
}

function buildContractPdfLines(contract) {
  return [
    'ECOREAN',
    'Customer Construction Contract',
    `Contract Number: ${contract.contractNumber}`,
    `Estimate Number: ${contract.estimateId}`,
    `Customer: ${contract.customerName}`,
    `Site: ${contract.siteName}`,
    `Project: ${contract.projectName}`,
    `Scope: ${contract.scopeSummaryKo}`,
    `Contract Amount: ${contract.contractAmount} KRW`,
    `Deposit: ${contract.depositAmount} KRW`,
    `Progress Payment: ${contract.progressPaymentAmount} KRW`,
    `Balance: ${contract.balanceAmount} KRW`,
    `Start Date: ${contract.startDate}`,
    `End Date: ${contract.endDate}`,
    `Duration: ${contract.durationDays} days`,
    `Payment Terms: ${contract.paymentTerms}`,
    `Warranty Terms: ${contract.warrantyTerms}`,
    `Cancellation Terms: ${contract.cancellationTerms}`,
    `Special Terms: ${contract.specialTerms}`,
    '',
    'Customer Signature: ____________________',
    'Company Signature: ____________________'
  ];
}

function exportContractPdf({ contract, outputDir }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `contract_${contract.contractNumber}.pdf`);
  createBasicPdf(filePath, buildContractPdfLines(contract));
  return {
    filePath,
    fileName: path.basename(filePath),
    bytes: fs.statSync(filePath).size
  };
}

module.exports = {
  buildContractFromEstimate,
  assertExecutableEstimate,
  exportContractPdf
};
