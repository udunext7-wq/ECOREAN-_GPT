'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release', 'RC-0.4.4');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_4_4.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const asarPath = path.join(root, 'electron', 'release', 'win-unpacked', 'resources', 'app.asar');
const distIndex = path.join(root, 'electron', 'dist', 'index.html');
const internalCalendarServicePath = path.join(root, 'electron', 'services', 'internalCalendarService.js');
const siteSurveySyncServicePath = path.join(root, 'electron', 'services', 'siteSurveyScheduleSyncService.js');
const providerAdapterPath = path.join(root, 'electron', 'services', 'calendarProviderAdapter.js');
const centerViewPath = path.join(root, 'ui', 'app', 'calendar', 'CalendarSiteSurveySyncCenterView.tsx');
const clientPortalPath = path.join(root, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx');
const featureSmoke = path.join(root, 'tests', 'rc-0-4-4-calendar-site-survey-sync.smoke.js');
const stabilizationSmoke = path.join(root, 'tests', 'rc-0-4-4-branch-stabilization.smoke.js');
const customerSafetySmoke = path.join(root, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');

const tagTarget = execFileSync('git', ['rev-list', '-n', '1', 'v0.4.4-rc'], {
  cwd: root,
  encoding: 'utf8'
}).trim();
assert.ok(tagTarget.startsWith('06b92be'), '1. v0.4.4-rc points to source/document commit 06b92be');
assert.strictEqual(execFileSync('git', ['tag', '--list', 'v0.4.4-rc-packaged'], {
  cwd: root,
  encoding: 'utf8'
}).trim(), '', '40. no packaged baseline tag yet');

[
  releaseDir,
  manifestPath,
  readmePath,
  reportPath,
  exePath,
  asarPath,
  distIndex,
  internalCalendarServicePath,
  siteSurveySyncServicePath,
  providerAdapterPath,
  centerViewPath,
  featureSmoke,
  stabilizationSmoke,
  customerSafetySmoke
].forEach((target) => assert.ok(fs.existsSync(target), `${target} exists`));
assert.ok(fs.statSync(exePath).size > 0, '7. packaged EXE exists and is non-empty');
assert.ok(fs.statSync(asarPath).size > 0, '8. app.asar exists and is non-empty');

const asar = require(path.join(root, 'electron', 'node_modules', '@electron', 'asar'));
const packageFiles = asar.listPackage(asarPath);
const uiAsset = packageFiles.find((file) => /\\dist\\assets\\index-.*\.js$/i.test(file));
assert.ok(packageFiles.includes('\\services\\internalCalendarService.js'), '10. app.asar includes internalCalendarService');
assert.ok(packageFiles.includes('\\services\\siteSurveyScheduleSyncService.js'), '11. app.asar includes siteSurveyScheduleSyncService');
assert.ok(packageFiles.includes('\\services\\calendarProviderAdapter.js'), '12. app.asar includes calendarProviderAdapter');
assert.ok(packageFiles.includes('\\main.js') && packageFiles.includes('\\preload.js'), 'app.asar includes Electron bridge');
assert.ok(uiAsset, '9. production UI asset exists in app.asar');

const extract = (asarRelativePath) => asar.extractFile(asarPath, asarRelativePath).toString('utf8');
const internalCalendarText = extract('services/internalCalendarService.js');
const surveySyncText = extract('services/siteSurveyScheduleSyncService.js');
const providerText = extract('services/calendarProviderAdapter.js');
const mainText = extract('main.js');
const preloadText = extract('preload.js');
const uiText = extract(uiAsset.replace(/^\\/, ''));

[
  'internal_calendar_events',
  'calendar_event_reminders',
  'calendar_event_audit_history'
].forEach((tableName) => assert.ok(internalCalendarText.includes(tableName), `packaged internal calendar service includes ${tableName}`));
assert.ok(surveySyncText.includes('site_survey_schedule_links'), 'packaged survey sync service includes site_survey_schedule_links');
assert.ok(providerText.includes('DISABLED'), '28. Provider DISABLED/NOT_READY state is packaged');
assert.ok(providerText.includes('external_call_performed') && providerText.includes('false'), '29. external_call_performed false is packaged');
assert.ok(providerText.includes('NOT_CONFIGURED'), 'external authentication remains NOT_CONFIGURED');
assert.ok(mainText.includes('boc:calendar') && mainText.includes('boc:site-survey-sync'), 'Calendar Event IPC handlers are packaged');
assert.ok(
  preloadText.includes('createCalendarEvent') &&
  preloadText.includes('createSurveyScheduleLink') &&
  preloadText.includes('syncSurveyToCalendar') &&
  preloadText.includes('syncCalendarToSurvey'),
  'preload bridge includes calendar/survey APIs'
);
assert.ok(uiText.includes('캘린더 / 현장조사 Sync'), '13. packaged UI includes CalendarSiteSurveySyncCenterView label');
assert.ok(uiText.includes('calendarSiteSurveySync'), 'app.asar production bundle includes calendar types/routes');
assert.ok(uiText.includes('DISABLED'), 'packaged UI includes Provider DISABLED state');

const featureOutput = execFileSync(process.execPath, [featureSmoke], { cwd: root, encoding: 'utf8' });
[
  '"provider": "DISABLED"',
  '"customerSafety": "PASSED"',
  '"decision": "MERGE_READY"'
].forEach((value) => assert.ok(featureOutput.includes(value), `RC-0.4.4 feature smoke verifies ${value}`));

const stabilizationOutput = execFileSync(process.execPath, [stabilizationSmoke], { cwd: root, encoding: 'utf8' });
[
  '"provider": "DISABLED"',
  '"customerSafety": "PASSED"',
  '"externalApi": "DISABLED"',
  '"decision": "MERGE_READY"'
].forEach((value) => assert.ok(stabilizationOutput.includes(value), `RC-0.4.4 stabilization verifies ${value}`));

const customerOutput = execFileSync(process.execPath, [customerSafetySmoke], { cwd: root, encoding: 'utf8' });
assert.ok(customerOutput.includes('"ok":true'), '33. customer safety regression passes');

const sourceBundle = [
  internalCalendarText,
  surveySyncText,
  providerText,
  fs.readFileSync(internalCalendarServicePath, 'utf8'),
  fs.readFileSync(siteSurveySyncServicePath, 'utf8'),
  fs.readFileSync(providerAdapterPath, 'utf8')
].join('\n').toLowerCase();
[
  'googleapis',
  'graph.microsoft',
  'icloud',
  'caldav',
  'client_secret',
  'api_key',
  'https://www.googleapis.com',
  'login.microsoftonline'
].forEach((forbidden) => assert.ok(!sourceBundle.includes(forbidden), `30. external API/OAuth/invitation absent marker: ${forbidden}`));

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.4.4');
assert.strictEqual(manifest.tag, 'v0.4.4-rc');
assert.strictEqual(manifest.base_tag, 'v0.4.3-rc-packaged');
assert.strictEqual(manifest.source_commit, '06b92be');
assert.strictEqual(manifest.merge_commit, 'ee78a2c');
assert.strictEqual(manifest.implementation_commit, '8f92eb1');
assert.strictEqual(manifest.stabilization_commit, '91e41cc');
assert.strictEqual(manifest.packaged_launch_status, 'PASSED');
assert.strictEqual(manifest.window_title_status, 'PASSED');
assert.strictEqual(manifest.responsiveness_status, 'PASSED');
assert.strictEqual(manifest.dev_server_required, false);
[
  'calendar_lifecycle_status',
  'timezone_status',
  'survey_linkage_status',
  'survey_to_calendar_status',
  'calendar_to_survey_status',
  'mismatch_status',
  'original_data_protection_status',
  'conflict_detection_status',
  'automatic_change_prevention_status',
  'reminder_status',
  'crm_action_duplicate_prevention_status',
  'audit_history_status',
  'customer_safe_payload_status',
  'customer_safety_status',
  'customer_screen_isolation_status'
].forEach((field) => assert.strictEqual(manifest[field], 'PASSED', `manifest ${field} is PASSED`));
assert.strictEqual(manifest.provider_status, 'DISABLED');
assert.strictEqual(manifest.external_call_performed, false);
assert.strictEqual(manifest.external_authentication_status, 'NOT_CONFIGURED');
assert.strictEqual(manifest.external_invitation_status, 'DISABLED');
assert.ok(String(manifest.internal_entry_points_status).includes('PASSED'), '34. seven internal entry points verified');
assert.ok(String(manifest.visual_click_qa_status).includes('NOT_PERFORMED'), '38. manifest visual QA status recorded as not performed');
assert.ok(manifest.executable_size > 0 && manifest.app_asar_size > 0, 'manifest records executable and app.asar size');

const entryFiles = [
  ['First Entry Panel', 'ui/app/estimate/EstimateEntryPanel.tsx'],
  ['CEO Dashboard', 'ui/app/dashboard/CeoControlTowerView.tsx'],
  ['Drawer', 'ui/components/modals/DetailDrawer.tsx'],
  ['CRM Lead detail', 'ui/app/crm/CrmPipelineCenterView.tsx'],
  ['Site Survey detail', 'ui/app/crm/CrmPipelineCenterView.tsx'],
  ['Project detail', 'ui/app/projects/ProjectDetailView.tsx'],
  ['Customer Portal Draft detail', 'ui/app/customer-portal/CustomerPortalDraftCenterView.tsx']
];
entryFiles.forEach(([name, file]) => {
  assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('calendarSiteSurveySync'), `35. ${name} internal entry exists`);
});
const clientPortal = fs.readFileSync(clientPortalPath, 'utf8');
assert.ok(!clientPortal.includes('calendarSiteSurveySync'), '35. customer screen internal entry absent');

const report = fs.readFileSync(reportPath, 'utf8');
assert.ok(report.includes('RC-0.4.4 Desktop Release Package 사용 가능'), 'report records final package decision');
assert.ok(report.includes('Visual click QA: NOT_PERFORMED'), 'report does not overstate visual click QA');
const readme = fs.readFileSync(readmePath, 'utf8');
assert.ok(readme.includes('외부 Calendar Provider는 `DISABLED`'), 'README records provider disabled principle');
const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.4.4 Desktop Release Package'), '39. RELEASE_NOTES package section exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-4-packaged-release.smoke',
  tag: manifest.tag,
  tagTarget: tagTarget.slice(0, 7),
  sourceCommit: manifest.source_commit,
  mergeCommit: manifest.merge_commit,
  exePath,
  exeSize: fs.statSync(exePath).size,
  asarPath,
  asarSize: fs.statSync(asarPath).size,
  packagedLaunch: manifest.packaged_launch_status,
  calendarLifecycle: manifest.calendar_lifecycle_status,
  timezone: manifest.timezone_status,
  surveyLinkage: manifest.survey_linkage_status,
  provider: manifest.provider_status,
  externalCallPerformed: manifest.external_call_performed,
  customerSafety: manifest.customer_safety_status,
  visualClickQa: manifest.visual_click_qa_status,
  packagedBaselineTag: 'ABSENT',
  decision: 'RC-0.4.4 Desktop Release Package 사용 가능'
}, null, 2));
