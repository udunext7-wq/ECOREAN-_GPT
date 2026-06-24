const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { saveViewportScreenshot } = require('./safeScreenshotCapture');
const { inspectLayoutSnapshot, pixelDifference } = require('./outputRenderInspector');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const EXE_PATH = path.join(PROJECT_ROOT, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const QA_ROOT = path.join(PROJECT_ROOT, 'qa-output', 'v0.4.6', 'visual-click');
const USER_DATA_ROOT = path.join(QA_ROOT, 'synthetic-user-data');
const FIXTURE_MARKER = 'SYNTHETIC_V0_4_6_QA';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForDebugTarget(port, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch (_error) {
      // The packaged renderer is still starting.
    }
    await wait(250);
  }
  throw new Error('PACKAGED_CDP_TARGET_TIMEOUT');
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PACKAGED_CDP_CONNECT_TIMEOUT')), 10000);
      this.socket.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.socket.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('PACKAGED_CDP_CONNECT_FAILED'));
      }, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) throw new Error('PACKAGED_CDP_EVALUATION_FAILED');
    return result.result ? result.result.value : undefined;
  }

  close() {
    if (this.socket && this.socket.readyState < 2) this.socket.close();
  }
}

function stopProcessTree(pid) {
  if (!pid) return;
  spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10000
  });
}

async function createPackagedHarness() {
  if (!fs.existsSync(EXE_PATH)) throw new Error('PACKAGED_EXE_MISSING');
  fs.mkdirSync(USER_DATA_ROOT, { recursive: true });
  const port = await getFreePort();
  const child = spawn(EXE_PATH, [`--remote-debugging-port=${port}`], {
    cwd: path.dirname(EXE_PATH),
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      APPDATA: USER_DATA_ROOT,
      LOCALAPPDATA: path.join(USER_DATA_ROOT, 'local'),
      ECOREAN_QA_FIXTURE: FIXTURE_MARKER
    }
  });
  let target;
  try {
    target = await waitForDebugTarget(port, 30000);
  } catch (error) {
    stopProcessTree(child.pid);
    throw error;
  }
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.evaluate(`document.documentElement.dataset.qaFixture = '${FIXTURE_MARKER}'`);
  await wait(1200);

  async function visibleText() {
    return cdp.evaluate(`document.body ? document.body.innerText : ''`);
  }

  async function clickButton(label) {
    const position = await cdp.evaluate(`(() => {
      const expected = ${JSON.stringify(label)};
      const candidates = Array.from(document.querySelectorAll('button'));
      const visible = candidates.filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth
          && rect.bottom > 0 && rect.top < window.innerHeight;
      });
      const target = visible.find((button) => button.textContent.trim() === expected)
        || visible.find((button) => button.textContent.includes(expected))
        || candidates.find((button) => button.textContent.trim() === expected)
        || candidates.find((button) => button.textContent.includes(expected));
      if (!target) return null;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const inViewport = x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight;
      if (!inViewport) {
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
      return {
        x,
        y,
        text: target.textContent.trim(),
        method: inViewport ? 'CDP_MOUSE_INPUT' : 'DOM_MOUSE_EVENT_OFFSCREEN_FALLBACK'
      };
    })()`);
    if (!position) throw new Error(`PACKAGED_CLICK_TARGET_NOT_FOUND:${label}`);
    if (position.method === 'CDP_MOUSE_INPUT') {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: position.x, y: position.y, button: 'left', clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: position.x, y: position.y, button: 'left', clickCount: 1 });
    }
    await wait(900);
    return position;
  }

  async function layoutSnapshot() {
    return cdp.evaluate(`(() => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const selectors = ['.detail-drawer', '.section-header', 'h1', 'h2', 'h3', 'button'];
      const elements = Array.from(document.querySelectorAll(selectors.join(',')))
        .filter((node) => {
          if (node.closest('.floating-actions')) return false;
          const rect = node.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < viewport.height && rect.right > 0 && rect.left < viewport.width;
        })
        .slice(0, 160)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            tag: node.tagName,
            text: (node.textContent || '').trim().slice(0, 80),
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          };
        });
      return { viewport, elements, scrollWidth: document.documentElement.scrollWidth };
    })()`);
  }

  async function capture(name) {
    const domText = await visibleText();
    const screenshot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    const outputPath = path.join(QA_ROOT, `${name}.png`);
    const saved = saveViewportScreenshot({
      base64: screenshot.data,
      outputPath,
      userDataPath: USER_DATA_ROOT,
      fixtureMarker: FIXTURE_MARKER,
      domText
    });
    const layout = inspectLayoutSnapshot(await layoutSnapshot());
    return { ...saved, layout, dom_text_length: domText.length };
  }

  async function runClickScenario({ id, clickLabel, expectedText }) {
    const before = await capture(`${id}-before`);
    const click = await clickButton(clickLabel);
    const text = await visibleText();
    if (!text.includes(expectedText)) throw new Error(`PACKAGED_EXPECTED_TEXT_MISSING:${expectedText}`);
    const after = await capture(`${id}-after`);
    const pixels = pixelDifference(before.output_path, after.output_path);
    if (pixels.status !== 'PASSED' || pixels.changed_pixel_ratio < 0.005) {
      throw new Error(`PACKAGED_PIXEL_CHANGE_TOO_SMALL:${id}`);
    }
    return {
      id,
      click_label: clickLabel,
      clicked_text: click.text,
      click_method: click.method,
      expected_text: expectedText,
      expected_text_visible: true,
      before,
      after,
      pixel_comparison: pixels
    };
  }

  async function closeDrawer() {
    const text = await visibleText();
    if (text.includes('DRILL DOWN')) await clickButton('닫기');
  }

  return {
    exePath: EXE_PATH,
    qaRoot: QA_ROOT,
    userDataPath: USER_DATA_ROOT,
    fixtureMarker: FIXTURE_MARKER,
    child,
    cdp,
    visibleText,
    clickButton,
    capture,
    runClickScenario,
    closeDrawer,
    async close() {
      cdp.close();
      stopProcessTree(child.pid);
      await wait(500);
    }
  };
}

module.exports = {
  PROJECT_ROOT,
  EXE_PATH,
  QA_ROOT,
  USER_DATA_ROOT,
  FIXTURE_MARKER,
  createPackagedHarness
};
