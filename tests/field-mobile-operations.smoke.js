const assert = require('assert');
const { createTestService } = require('./execution-test-helpers');

const { service } = createTestService('boc-field-mobile');
const projectId = 'FIELD-MOBILE-PROJECT-001';

let data = service.getFieldMobileCenterData({ projectId, roleMode: '팀장' });
assert.ok(Array.isArray(data.roleModes), 'Mobile center loads');
assert.ok(data.roleModes.includes('팀장'), 'Role mode can be selected');

const checkIn = service.saveFieldAttendanceCheckIn({
  projectId,
  siteNameKo: '모바일 테스트 현장',
  workerNameKo: '김기공',
  roleKo: '기공',
  dailyWage: 240000,
  checkInTime: '08:00'
});
assert.ok(checkIn.attendanceId, 'Attendance check-in creates log');

const checkOut = service.saveFieldAttendanceCheckOut({
  projectId,
  attendanceId: checkIn.attendanceId,
  checkOutTime: '17:00'
});
assert.strictEqual(checkOut.workHours, 9, 'Attendance check-out updates labor time');
assert.ok(checkOut.laborCost > 0, 'Attendance check-out calculates labor cost');

const report = service.createFieldDailyReport({
  projectId,
  reportDate: '2026-05-12',
  workContentKo: '모바일 공사일보 작성',
  delayReasonKo: '자재 확인 지연',
  crewCount: 2,
  usedMaterialsKo: '타일 부자재',
  filePath: 'storage/mobile/report.jpg'
});
assert.ok(report.reportId, 'Daily report can be created');

const media = service.saveSiteMediaFile({
  projectId,
  relatedEntityType: 'DailySiteReport',
  relatedEntityId: report.reportId,
  fileName: 'site-photo.jpg',
  filePath: 'storage/mobile/site-photo.jpg',
  caption: '현장 사진'
});
assert.ok(media.mediaId, 'Site media metadata can be saved');

const receiving = service.createFieldMaterialReceiving({
  projectId,
  purchaseOrderId: `PO-${projectId}`,
  itemNameKo: '600각 타일',
  orderedQuantity: 10,
  receivedQuantity: 7,
  unit: 'BOX',
  supplierNameKo: 'UNKNOWN',
  damageOrMissing: true
});
assert.ok(receiving.shortageCount >= 1, 'Material shortage creates alert');

const inspection = service.saveFieldInspectionResult({
  projectId,
  processNameKo: '방수 검수',
  resultStatus: 'FAIL',
  actionRequiredKo: '후속 공정 차단'
});
assert.ok(inspection.evaluation.hasCriticalFail, 'Inspection critical FAIL creates RED ALERT');

const changeOrder = service.createFieldChangeOrderRequest({
  projectId,
  titleKo: '모바일 추가공사',
  changeContentKo: '현장 추가 작업',
  changeReasonKo: '고객 요청',
  additionalAmount: 100000,
  additionalCost: 95000,
  scheduleImpactDays: 1
});
assert.ok(changeOrder.pce, 'Change order mobile request runs PCE');

const defect = service.createFieldDefectReport({
  projectId,
  defectLocationKo: '욕실 바닥',
  defectTypeKo: '누수 의심',
  severity: 'HIGH',
  rootCauseKo: '방수 확인 필요',
  estimatedCost: 180000
});
assert.ok(defect.defectId, 'Defect report updates project risk');

const signature = service.saveFieldSignature({
  projectId,
  relatedEntityType: 'Inspection',
  relatedEntityId: inspection.inspectionResultId,
  signerName: '홍길동',
  signerRole: '고객',
  signatureText: '홍길동 확인'
});
assert.ok(signature.signatureId, 'Signature placeholder saved');

const redRisk = service.createFieldRiskReport({
  projectId,
  riskType: '누수',
  description: '현장 RED 위험 보고',
  severity: 'RED',
  immediateActionTaken: true
});
assert.ok(redRisk.riskReportId, 'RED risk report saved');

const tower = service.getCeoControlTowerData();
assert.ok(tower.redAlerts.some((alert) => String(alert.sourceModule || alert.source_module || '').includes('Field') || String(alert.titleKo || alert.title_ko || '').includes('현장')), 'RED risk report appears in CEO Control Tower');

const stats = service.getDbStats();
assert.ok(stats.siteMediaFileCount >= 1, 'site_media_files has rows');
assert.ok(stats.fieldSignatureCount >= 1, 'field_signatures has rows');
assert.ok(stats.fieldRiskReportCount >= 1, 'field_risk_reports has rows');

console.log('field-mobile-operations smoke passed');
