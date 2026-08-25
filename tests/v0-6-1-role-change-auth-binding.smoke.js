const assert = require('assert');
const { createV061AuthHarness } = require('./helpers/v061AuthHarness');

(async () => {
  const h = createV061AuthHarness('boc-v061-role-change-');
  await h.coordinator.initialize();
  await h.coordinator.signIn({ email: 'user-a@example.invalid', password: 'synthetic-password' });
  const request = h.roleChanges.createRoleChangeRequest({ requestedRole: 'MANAGER', reasonKo: '현재 인증 Identity 역할 변경' });
  assert.strictEqual(request.requestedByIdentityId, 'IDN-AUTH-A');
  await h.coordinator.signIn({ email: 'user-b@example.invalid', password: 'synthetic-password' });
  assert.throws(() => h.roleChanges.approveRoleChangeRequest(request.requestId, { actorIdentityId: 'IDN-AUTH-A' }), /mismatch/);
  const approved = h.roleChanges.approveRoleChangeRequest(request.requestId, { noteKo: '현재 인증 관리자 승인' });
  assert.strictEqual(approved.approvedByIdentityId, 'IDN-AUTH-B');
  const applied = h.roleChanges.applyApprovedRoleChange(request.requestId, {});
  assert.strictEqual(applied.status, 'APPLIED');
  assert.strictEqual(h.assignments.listRoleAssignments('IDN-AUTH-A')[0].roleId, 'MANAGER');
  console.log(JSON.stringify({ ok: true, test: 'v0-6-1-role-change-auth-binding', requesterBoundToSession: 'PASSED', forgedActor: 'BLOCKED', approverBoundToSession: 'PASSED', apply: 'PASSED' }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
