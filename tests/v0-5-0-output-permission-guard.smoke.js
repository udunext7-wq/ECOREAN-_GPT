const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v050-output-guard-'));
const service = createRolePermissionService({ databasePath: path.join(tmp, 'logs.db') });
const payload = {
  project_name: '출력 권한 테스트',
  customer_total: 15000000,
  internal_cost: 10000000,
  margin: 5000000,
  pce: 'GO',
  vendor_price: 2500000,
  customer_phone: '010-0000-0000',
  detailed_address: '테스트 상세주소'
};

const staffCustomer = service.sanitizeOutputForRole({
  roleId: 'STAFF',
  outputType: 'CUSTOMER',
  payload
});
assert.strictEqual(staffCustomer.ok, true, 'staff can generate customer output');
assert.strictEqual(staffCustomer.customerSafe, true, 'customer output is explicitly safe');
const customerJson = JSON.stringify(staffCustomer.payload);
['internal_cost', 'margin', 'pce', 'vendor_price', 'customer_phone', 'detailed_address'].forEach((term) => {
  assert.ok(!customerJson.includes(term), `customer output hides ${term}`);
});

const clientGenerate = service.sanitizeOutputForRole({
  roleId: 'CLIENT_VIEWER',
  outputType: 'CUSTOMER',
  payload
});
assert.strictEqual(clientGenerate.ok, false, 'client viewer cannot generate output');
assert.strictEqual(clientGenerate.blocked, true, 'client viewer generation is blocked');

const staffInternal = service.sanitizeOutputForRole({
  roleId: 'STAFF',
  outputType: 'INTERNAL',
  payload
});
assert.strictEqual(staffInternal.ok, false, 'staff cannot generate internal output');

const managerInternal = service.sanitizeOutputForRole({
  roleId: 'MANAGER',
  outputType: 'INTERNAL',
  payload
});
assert.strictEqual(managerInternal.ok, true, 'manager can generate internal output');
assert.strictEqual(managerInternal.payload.internal_cost, payload.internal_cost, 'authorized internal cost remains');
assert.strictEqual(managerInternal.payload.margin, payload.margin, 'authorized margin remains');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-0-output-permission-guard',
  customerOutput: 'PASSED',
  internalOutput: 'PASSED',
  customerSafety: 'PASSED'
}, null, 2));
