const { assertExecutableEstimate } = require('./contractService');

function addDays(dateText, days) {
  const date = dateText ? new Date(dateText) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const supplierByCategory = {
  '타일': '타일 거래처 미정',
  '방수': '방수재 거래처 미정',
  '설비': '욕실 도기 거래처 미정',
  '천장/전기': '전기/천장 자재 거래처 미정',
  '옵션': '전문 시공/자재 거래처 미정',
  '마감': '마감 부자재 거래처 미정'
};

function isPurchasable(item) {
  const text = `${item.category} ${item.itemName}`;
  return ['타일', '방수', '부자재', '줄눈', '양변기', '세면기', '수전', '배수', '천장', '조명', '환풍기', '샤워부스', '욕조', '슬라이딩장', '실리콘'].some((keyword) => text.includes(keyword));
}

function buildPurchaseOrderFromEstimate({ estimate, items, contractId = null, requiredDate }) {
  assertExecutableEstimate(estimate);
  const date = requiredDate || addDays(new Date().toISOString().slice(0, 10), 2);
  const orderItems = items
    .filter(isPurchasable)
    .map((item) => ({
      itemName: item.itemName,
      specification: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expectedUnitPrice: item.materialCost > 0 && item.quantity > 0 ? Math.round(item.materialCost / item.quantity) : item.customerUnitPrice,
      expectedTotal: item.materialCost > 0 ? item.materialCost : item.customerTotal,
      supplierName: supplierByCategory[item.category] || '거래처 미정',
      orderStatus: 'NEEDS_ORDER',
      requiredDate: date,
      notes: '견적 기반 자동 생성. 실제 공급가 확인 필요.'
    }));

  return {
    estimateId: estimate.id,
    contractId,
    orderNumber: `PO-${estimate.id}`,
    supplierName: '복수 거래처',
    totalAmount: orderItems.reduce((sum, item) => sum + Number(item.expectedTotal || 0), 0),
    status: 'DRAFT',
    requiredDate: date,
    items: orderItems
  };
}

module.exports = {
  buildPurchaseOrderFromEstimate
};
