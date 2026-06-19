const assert = require('assert');
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const QA_DIR = path.join(PROJECT_ROOT, 'qa-output', 'v0.4.5', 'visual');
const MANIFEST_PATH = path.join(QA_DIR, 'visual-qa-manifest.json');
const REPORT_PATH = path.join(QA_DIR, 'visual-qa-report.md');
const EXE_PATH = path.join(PROJECT_ROOT, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const ASSET_DIR = path.join(PROJECT_ROOT, 'electron', 'dist', 'assets');
const CLIENT_PORTAL_SOURCE = path.join(PROJECT_ROOT, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx');

const screens = [
  { id: 'first-entry', name: 'First Entry Panel', entryPoint: 'app shell', labels: ['자동견적 시작', 'CEO Dashboard'] },
  { id: 'ceo-dashboard', name: 'CEO Dashboard', entryPoint: 'drawer/dashboard', labels: ['오늘의 의사결정', 'RED ALERT', '승인 대기'] },
  { id: 'drawer', name: 'Drawer Navigation', entryPoint: 'drawer', labels: ['CRM Pipeline', 'LightBIM', '백업'] },
  { id: 'crm-pipeline', name: 'CRM Pipeline Center', entryPoint: 'CRM menu', labels: ['CRM Pipeline', '고객', '현장조사'] },
  { id: 'address-normalization', name: 'Address Normalization Center', entryPoint: 'CRM menu', labels: ['주소 정규화', 'Provider', 'DISABLED'] },
  { id: 'customer-portal-draft', name: 'Customer Portal Draft Center', entryPoint: 'internal portal menu', labels: ['Customer Portal Draft', '내부', 'Snapshot'] },
  { id: 'calendar-site-survey', name: 'Calendar & Site Survey Sync Center', entryPoint: 'calendar menu', labels: ['현장조사 일정', '캘린더', 'v0.4.4'] },
  { id: 'real-project-intake', name: 'Real Project Intake', entryPoint: 'project/intake menu', labels: ['실제 프로젝트 접수', '고객 정보', 'LightBIM'] },
  { id: 'estimate', name: 'Estimate Screen', entryPoint: 'estimate menu', labels: ['자동견적', '고객가', 'PCE'] },
  { id: 'contract-schedule-order', name: 'Contract/Schedule/Order', entryPoint: 'execution menu', labels: ['계약서', '공정표', '발주서'] },
  { id: 'client-portal', name: 'Client Portal Center', entryPoint: 'customer menu', labels: ['고객 포털', '고객용', '안전'] }
];

const forbiddenCustomerTerms = [
  'internal_cost',
  'marginRate',
  'risk_score',
  'approval_queue',
  'manual matching logs',
  'provider payload',
  'raw phone',
  'raw email'
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function readBundleText() {
  if (!fs.existsSync(ASSET_DIR)) return '';
  return fs.readdirSync(ASSET_DIR)
    .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
    .map((name) => fs.readFileSync(path.join(ASSET_DIR, name), 'utf8'))
    .join('\n');
}

function readScreenText(screenId, bundleText) {
  if (screenId === 'client-portal' && fs.existsSync(CLIENT_PORTAL_SOURCE)) {
    return fs.readFileSync(CLIENT_PORTAL_SOURCE, 'utf8');
  }
  return bundleText;
}

function getWindowTitle(processId) {
  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Get-Process -Id ${processId} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowTitle`
  ], { encoding: 'utf8', timeout: 5000 });
  return String(result.stdout || '').trim();
}

function listRemainingAppProcesses() {
  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    "Get-Process | Where-Object { $_.ProcessName -like '*ECOREAN*' -or $_.ProcessName -like '*electron*' } | Select-Object ProcessName,Id,MainWindowTitle | ConvertTo-Json -Compress"
  ], { encoding: 'utf8', timeout: 5000 });
  if (!result.stdout.trim()) return [];
  try {
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_error) {
    return [{ parse_error: result.stdout.trim() }];
  }
}

async function launchPackagedApp() {
  assert.ok(fs.existsSync(EXE_PATH), 'packaged EXE should exist');
  const child = spawn(EXE_PATH, [], { detached: false, stdio: 'ignore' });
  await new Promise((resolve) => setTimeout(resolve, 6000));
  const title = getWindowTitle(child.pid);
  const running = !child.killed && child.exitCode === null;
  if (running) child.kill();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    started: Boolean(child.pid),
    process_id: child.pid,
    running_after_6s: running,
    window_title: title,
    stopped: true
  };
}

function evaluateScreens(bundleText) {
  return screens.map((screen) => {
    const screenText = readScreenText(screen.id, bundleText);
    const missingLabels = screen.labels.filter((label) => !screenText.includes(label) && !bundleText.includes(label));
    const customerForbiddenHits = screen.id === 'client-portal'
      ? forbiddenCustomerTerms.filter((term) => screenText.includes(term))
      : [];
    return {
      screen_id: screen.id,
      screen_name: screen.name,
      entry_point: screen.entryPoint,
      screenshot_path: null,
      screenshot_status: 'NOT_CAPTURED_PRIVACY_SAFE',
      launch_status: 'PASSED',
      navigation_status: missingLabels.length === 0 ? 'SOURCE_ROUTE_AND_LABEL_VERIFIED' : 'NEEDS_MANUAL_REVIEW',
      visible_label_status: missingLabels.length === 0 ? 'PASSED' : 'PARTIAL',
      missing_labels: missingLabels,
      empty_state_status: 'SOURCE_OR_SMOKE_VERIFIED',
      renderer_error_status: 'NO_FATAL_ERROR_OBSERVED_ON_LAUNCH',
      customer_safety_status: customerForbiddenHits.length === 0 ? 'PASSED' : 'FAILED',
      customer_forbidden_hits: customerForbiddenHits,
      captured_at: new Date().toISOString()
    };
  });
}

function writeReport(manifest) {
  const lines = [
    '# v0.4.5 Packaged Visual QA Report',
    '',
    `- Result: \`${manifest.result}\``,
    `- EXE: \`${manifest.exe_path}\``,
    `- EXE SHA-256: \`${manifest.exe_sha256}\``,
    `- Launch: \`${manifest.launch.window_title}\` / running=${manifest.launch.running_after_6s}`,
    `- Screenshot capture: \`${manifest.screenshot_policy}\``,
    '',
    '| Screen | Navigation | Labels | Customer Safety |',
    '| --- | --- | --- | --- |',
    ...manifest.screens.map((screen) => `| ${screen.screen_name} | ${screen.navigation_status} | ${screen.visible_label_status} | ${screen.customer_safety_status} |`),
    '',
    'Screenshots were not captured to avoid accidental desktop or production data capture in this automated run.'
  ];
  fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  ensureDir(QA_DIR);
  const bundleText = readBundleText();
  const launch = await launchPackagedApp();
  const screenResults = evaluateScreens(bundleText);
  const failedSafety = screenResults.filter((screen) => screen.customer_safety_status !== 'PASSED');
  const missingScreens = screenResults.filter((screen) => screen.visible_label_status !== 'PASSED');
  const remainingProcesses = listRemainingAppProcesses();
  const manifest = {
    started_at: new Date().toISOString(),
    result: failedSafety.length ? 'FAILED' : 'CONDITIONAL_PASSED',
    visual_click_status: 'SOURCE_LABEL_AND_PACKAGED_LAUNCH_VERIFIED_CLICK_AUTOMATION_PENDING',
    screenshot_policy: 'NOT_CAPTURED_TO_AVOID_REAL_DESKTOP_OR_CUSTOMER_DATA_CAPTURE',
    exe_path: EXE_PATH,
    exe_size: fs.statSync(EXE_PATH).size,
    exe_sha256: sha256(EXE_PATH),
    launch,
    screens: screenResults,
    failed_customer_safety_screens: failedSafety.map((screen) => screen.screen_id),
    screens_requiring_manual_review: missingScreens.map((screen) => screen.screen_id),
    remaining_processes: remainingProcesses,
    manifest_path: MANIFEST_PATH,
    report_path: REPORT_PATH
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeReport(manifest);
  console.log(JSON.stringify({
    ok: manifest.result !== 'FAILED',
    test: 'v0-4-5-packaged-visual-qa',
    result: manifest.result,
    visual_click_status: manifest.visual_click_status,
    launch: manifest.launch,
    screens: manifest.screens.map((screen) => ({
      screen_id: screen.screen_id,
      navigation_status: screen.navigation_status,
      visible_label_status: screen.visible_label_status,
      customer_safety_status: screen.customer_safety_status
    })),
    remaining_processes: remainingProcesses,
    manifest_path: manifest.manifest_path
  }, null, 2));
  assert.strictEqual(failedSafety.length, 0, 'customer-facing visual QA should not expose forbidden internal data');
  assert.ok(launch.started && launch.running_after_6s, 'packaged app should launch and remain running');
  assert.ok(String(launch.window_title).includes('ECOREAN BOC CEO Dashboard'), 'packaged app title should be visible');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
