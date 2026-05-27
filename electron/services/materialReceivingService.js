function buildReceivingRows({ purchaseOrder, items = [], receivedAt }) {
  const date = receivedAt || new Date().toISOString().slice(0, 10);
  return items.map((item) => {
    const orderedQuantity = Math.max(0, Number(item.orderedQuantity ?? item.quantity ?? 0));
    const receivedQuantity = Math.max(0, Number(item.receivedQuantity ?? orderedQuantity));
    const missingQuantity = Math.max(0, Number((orderedQuantity - receivedQuantity).toFixed(3)));
    const expectedQuantitySource = item.expectedQuantitySource || item.expected_quantity_source || item.quantity_source || 'ESTIMATE';
    const expectedQuantityBasisKey = item.expectedQuantityBasisKey || item.expected_quantity_basis_key || item.quantity_basis_key || '';
    const lightBimBaseline = ['USER_REVIEW', 'LIGHTBIM_REVIEWED', 'LIGHTBIM'].includes(expectedQuantitySource);
    return {
      purchaseOrderId: purchaseOrder?.purchase_order_id || item.purchaseOrderId || 'UNKNOWN_PO',
      itemNameKo: item.itemNameKo || item.item_name || item.itemName || '자재',
      specificationKo: item.specificationKo || item.specification || '규격 확인',
      orderedQuantity,
      receivedQuantity,
      missingQuantity,
      unit: item.unit || 'EA',
      receivedAt: date,
      supplierNameKo: item.supplierNameKo || purchaseOrder?.supplier_name || 'NEEDS_RESEARCH',
      inspectionStatus: missingQuantity > 0 ? 'SHORTAGE' : 'PASS',
      damageOrMissing: missingQuantity > 0,
      notesKo: item.notesKo || (lightBimBaseline ? 'LightBIM 도면 수량 기준 발주' : ''),
      expectedQuantitySource,
      expectedQuantityBasisKey,
      lightBimBaseline
    };
  });
}

module.exports = {
  buildReceivingRows
};
