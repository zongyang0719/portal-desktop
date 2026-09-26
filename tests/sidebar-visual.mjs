import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'test-results/sidebar-visual');
const temporary = await mkdtemp(join(tmpdir(), 'sidebar-visual-'));
await mkdir(output, { recursive: true });
// Change only mock activity, while the sidebar and transcript use their real
// production components. A static eight-state gallery cannot expose stale tips.
const built = await build({ absWorkingDir: root, entryPoints: ['demo/sidebar.tsx'], bundle: true, write: false,
  outfile: join(temporary, 'sidebar.js'), format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'live-mock-activity', setup(b) {
    b.onLoad({ filter: /demo\/sidebar\.tsx$/ }, async ({ path }) => ({ loader: 'tsx', contents:
      (await readFile(path, 'utf8')).replace('const [revision, setRevision]', `const [overrides, setOverrides] = useState({});
        const liveActivity = {...activity, ...overrides};
        (globalThis as any).__setVisualStatus = (id: string, status: any) => setOverrides(values => ({...values, [id]: status}));
        const [revision, setRevision]`)
        .replace('const status = activity[selectedId]', 'const status = liveActivity[selectedId]')
        .replace('activity={activity}', 'activity={liveActivity}') }));
  } }] });
const html = join(temporary, 'sidebar.html');
await writeFile(html, `<html lang="zh-CN"><meta charset="utf-8"><style>${built.outputFiles.find(f => f.path.endsWith('.css')).text}</style><div id="root"></div><script>${built.outputFiles.find(f => f.path.endsWith('.js')).text.replaceAll('</script', '<\\/script')}</script></html>`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(html).href);
  const rows = page.locator('.chat-session-row button[data-scene-id]');
  const tip = page.getByRole('tooltip');
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const settleRows = () => rows.evaluateAll(items => Promise.all(items.flatMap(el => el.getAnimations()).map(animation => animation.finished.catch(() => {}))));
  const setStatus = async status => {
    await page.evaluate(status => window.__setVisualStatus('demo-status-thinking', status || undefined), status);
    await frames();
  };
  const row = page.locator('[data-scene-id="demo-status-thinking"]');
  await row.locator('.chat-session-status').hover(); await tip.waitFor();
  const transitions = [];
  for (const [status, label] of [['queued', '排队中'], ['thinking', '思考中'], ['working', '执行中'], ['waiting', '等待回复'], ['replying', '回复中'], ['done', '已回复'], ['error', '出错了'], ['stopped', '已停止']]) {
    await setStatus(status);
    assert.equal(await tip.textContent(), label, 'An open tooltip must track live phase changes');
    assert.equal(await row.locator('[role=img]').getAttribute('aria-label'), label);
    assert.match(await row.getAttribute('data-sidebar-focus-hint'), new RegExp(label));
    const title = await row.locator('span').first().boundingBox();
    transitions.push({ status, label, titleWidth: title.width, rowHeight: (await row.boundingBox()).height });
  }
  await setStatus(null); await tip.waitFor({ state: 'hidden' });
  assert.equal(await row.locator('[role=img]').count(), 0);
  assert.equal(await row.getAttribute('aria-describedby'), null, 'Idle must not describe a removed status');
  assert.equal((await row.locator('span').first().boundingBox()).width, transitions[0].titleWidth, 'Idle reserves the same title width');
  assert.equal(new Set(transitions.map(item => item.titleWidth)).size, 1);
  assert.equal(new Set(transitions.map(item => item.rowHeight)).size, 1);
  await page.screenshot({ path: join(output, 'idle-no-stale-tip.png'), animations: 'disabled' });

  await setStatus('thinking');
  await row.locator('.activity-spinner').evaluate(el => { window.__phaseSpinner = el; window.__phaseAnimation = el.getAnimations()[0]; });
  await setStatus('working');
  assert.ok(await row.locator('.activity-spinner').evaluate(el => el === window.__phaseSpinner && el.getAnimations()[0] === window.__phaseAnimation), 'A progress-phase change never restarts the shared spinner');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await row.locator('.activity-spinner').evaluate(el => getComputedStyle(el).animationName), 'none');
  await setStatus('queued');
  assert.equal(await row.locator('.activity-queued path').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await setStatus('thinking');

  // Full labels do not need repetition; truncated labels use the same tooltip
  // as icons, with a warm handoff to the next target (Radix's 300ms window).
  await page.mouse.move(700, 700); await rows.first().hover();
  await page.waitForTimeout(760); assert.equal(await tip.count(), 0);
  await page.getByLabel('预览数据', { exact: true }).selectOption('default');
  await rows.last().hover(); await tip.waitFor();
  assert.equal(await tip.textContent(), await rows.last().textContent());
  assert.equal(await rows.last().getAttribute('title'), null);
  const started = performance.now();
  await rows.nth(1).locator('.chat-session-status').hover();
  await page.waitForFunction(() => document.querySelector('[role=tooltip]')?.textContent === '执行中', null, { timeout: 400 });
  const handoffMs = performance.now() - started;
  assert.ok(handoffMs < 400, 'Adjacent hints should not repeat the initial 700ms delay');
  await page.keyboard.press('Escape');

  await rows.first().click(); await rows.nth(1).click({ modifiers: ['Meta'] });
  await rows.nth(1).locator('.chat-session-status').hover(); await tip.waitFor();
  assert.equal(await tip.textContent(), '执行中', 'Multiselect still allows phase lookup');
  await page.keyboard.press('Escape');
  assert.equal(await tip.count(), 0);
  assert.equal(await page.locator('.chat-session-row[aria-selected=true]').count(), 1, 'A tooltip cannot consume multiselect cancellation');
  await page.locator('#bind-chat-session').hover(); await tip.waitFor();
  assert.equal(await tip.textContent(), '绑定已有场景'); await page.keyboard.press('Escape');

  // Contrast measurements use rendered computed colors, ancestor backgrounds
  // and opacity. This is a targeted check, not a full accessibility claim.
  const measurements = [];
  const measure = async (name, selectors, minimum) => {
    const values = await page.evaluate(({ name, selectors, minimum }) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      const luminance = c => c.map(x => { const v = x / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
      return selectors.flatMap(selector => [...document.querySelectorAll(selector.replace('::placeholder', ''))].map(element => {
        const style = getComputedStyle(element, selector.endsWith('::placeholder') ? '::placeholder' : null), ancestors = [];
        for (let parent = element; parent; parent = parent.parentElement) ancestors.unshift(parent);
        let opacity = 1; context.fillStyle = '#fff'; context.fillRect(0, 0, 1, 1);
        for (const parent of ancestors) {
          const s = getComputedStyle(parent); opacity *= Number(s.opacity); context.fillStyle = s.backgroundColor; context.fillRect(0, 0, 1, 1);
          // The shared GlideMenu background is a sibling layer, not an ancestor.
          if (parent.classList.contains('chat-session-glide')) {
            const layer = parent.querySelector('.chat-session-glide-highlight'), rect = layer.getBoundingClientRect();
            const row = element.closest('.chat-session-row').getBoundingClientRect(), middle = row.top + row.height / 2;
            if (middle >= rect.top && middle <= rect.bottom) {
              const layerStyle = getComputedStyle(layer); context.globalAlpha = Number(layerStyle.opacity);
              context.fillStyle = layerStyle.backgroundColor; context.fillRect(0, 0, 1, 1); context.globalAlpha = 1;
            }
          }
        }
        const bg = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
        context.globalAlpha = opacity; context.fillStyle = style.color; context.fillRect(0, 0, 1, 1); context.globalAlpha = 1;
        const fg = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3), a = luminance(fg), b = luminance(bg);
        return { name, theme: document.documentElement.dataset.theme, selector, text: element.textContent, selected: element.closest('.chat-session-row')?.getAttribute('aria-selected'), color: style.color, background: bg, opacity, font: style.fontSize, lineHeight: style.lineHeight, minimum, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
      }));
    }, { name, selectors, minimum });
    measurements.push(...values);
    await writeFile(join(output, 'results.json'), JSON.stringify({ transitions, handoffMs, measurements }, null, 2));
    for (const selector of selectors) assert.ok(values.some(value => value.selector === selector), `Missing contrast target: ${selector}`);
    for (const value of values) assert.ok(value.ratio >= value.minimum, `${value.name} ${value.theme} ${value.selector}: ${value.ratio.toFixed(2)} < ${value.minimum}`);
  };
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('外观', { exact: true }).selectOption(theme);
    await page.getByLabel('预览数据', { exact: true }).selectOption('statuses');
    await row.click(); await page.mouse.move(700, 700); await settleRows();
    await measure('normal-and-current', ['.chat-session-status'], 3);
    await measure('text', ['.chat-session-row button[data-scene-id]', '.chat-session-context-toggle', '.chat-scene-label', '#new-chat-session'], 5.5);
    await page.screenshot({ path: join(output, `overview-${theme}.png`), animations: 'disabled' });
    await rows.nth(1).hover(); await settleRows();
    await measure('hover-text', ['.chat-session-row button[data-scene-id]:hover'], 4.5);
    await measure('hover-state', ['.chat-session-row button[data-scene-id]:hover .chat-session-status'], 3);
    await page.mouse.down(); await settleRows();
    await measure('pressed-text', ['.chat-session-row button[data-scene-id]:active'], 4.5);
    await page.mouse.up();
    await page.locator('#new-chat-session').hover(); await settleRows(); await page.waitForTimeout(180);
    await measure('new-hover', ['#new-chat-session'], 4.5);
    await page.mouse.down(); await page.waitForTimeout(180);
    await measure('new-pressed', ['#new-chat-session'], 4.5);
    // Release away from the button so this probe doesn't open a dialog.
    await page.mouse.move(700, 700); await page.mouse.up();
    await rows.first().focus(); await page.keyboard.press('Control+a'); await settleRows();
    await measure('multiselect', ['.chat-session-status'], 3);
    await measure('multiselect-text', ['.chat-session-row button[data-scene-id]'], 4.5);
    await page.screenshot({ path: join(output, `multiselect-${theme}.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await rows.first().click({ button: 'right' });
    await measure('menu-copy', ['.chat-session-context-menu button', '.chat-session-context-menu kbd'], 4.5);
    await page.getByRole('menuitem', { name: '重命名' }).hover();
    await measure('menu-hover', ['.chat-session-context-menu button:focus', '.chat-session-context-menu kbd'], 4.5);
    await page.keyboard.press('Escape');
    await page.locator('#bind-chat-session').click();
    await measure('bind-help', ['.chat-session-hint', '#chat-session-editor .utility-subtitle', '#chat-session-editor .chat-session-field', '#chat-session-editor input::placeholder'], 5.5);
    await page.keyboard.press('Escape');
    await page.locator('#chat-scene-details-trigger').click(); await measure('info-labels', ['.chat-scene-details dt', '#chat-scene-dialog .utility-subtitle'], 5.5);
    await page.keyboard.press('Escape');
    await page.getByLabel('预览数据', { exact: true }).selectOption('disconnected');
    await measure('offline-readable-content', ['.chat-session-row button[data-scene-id]'], 5.5);
    assert.ok(await rows.first().isDisabled()); assert.ok(await page.locator('#new-chat-session').isDisabled());
    await rows.first().hover(); await tip.waitFor();
    assert.match(await tip.textContent(), /未连接，暂时无法切换场景/);
    await page.keyboard.press('Escape'); await page.mouse.move(700, 700);
    await page.screenshot({ path: join(output, `offline-${theme}.png`), animations: 'disabled' });
  }
  await page.getByLabel('预览数据', { exact: true }).selectOption('default');
  const separator = page.getByRole('separator', { name: '场景列表宽度' });
  await separator.focus(); await page.keyboard.press('Home');
  await rows.last().hover(); await tip.waitFor();
  const tipBox = await tip.boundingBox();
  assert.ok(tipBox.x >= 0 && tipBox.x + tipBox.width <= 1280);
  await page.screenshot({ path: join(output, 'narrow-long-title.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await separator.focus(); await page.keyboard.press('End');
  await rows.first().hover(); await page.waitForTimeout(760);
  assert.equal(await tip.count(), 0);
  await writeFile(join(output, 'results.json'), JSON.stringify({ transitions, handoffMs, measurements }, null, 2));
  assert.deepEqual(errors, []);
  console.log('Sidebar visual passed: live phases/idle cleanup, stable title width, uninterrupted spinner, reduced motion, truncated titles, warm tooltip handoff, multi-selection hints, readable light/dark/offline states and narrow layout.');
} finally { await browser.close(); await rm(temporary, { recursive: true, force: true }); }
