const assert = require('assert');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

const requiredProcesses = ['철거', '폐기물 처리', '설비', '방수', '타일', '천장', '도기 설치', '실리콘', '청소', '검수', '인도'];

const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => path.join(__dirname, '..', 'storage', 'sqlite', `smoke-schedule-${Date.now()}`)
  }
});

const saved = service.saveBathroomEstimate({
  customerName: 'Schedule Customer',
  siteName: 'Schedule Site',
  bathroomCount: 1,
  bathroomAreaM2: 4.2,
  ceilingHeightMm: 2200,
  demolitionIncluded: true,
  constructionMethod: 'bond',
  waterproofMethod: 'liquid',
  tileWallType: 'ceramic_300x600',
  tileFloorType: 'porcelain_600',
  fixtureGrade: 'basic',
  options: {
    showerBooth: true,
    zenda: true,
    bathtub: false,
    slidingCabinet: false,
    ventilationFanReplace: true,
    lightingReplace: true,
    faucetReplace: true
  },
  customerPriceMultiplier: 1.05
});

const scheduleResult = service.generateBathroomSchedule({ estimateId: saved.estimateId, startDate: '2026-05-10' });
assert.ok(scheduleResult.scheduleId, 'GO estimate creates schedule');
const names = scheduleResult.schedule.items.map((item) => item.processName);
for (const name of requiredProcesses) {
  assert.ok(names.includes(name), `schedule contains ${name}`);
}
assert.ok(scheduleResult.schedule.items.every((item, index, rows) => index === 0 || item.startDate >= rows[index - 1].startDate), 'schedule order is valid');

console.log(JSON.stringify({ ok: true, test: 'schedule-generation.smoke', scheduleId: scheduleResult.scheduleId }));
