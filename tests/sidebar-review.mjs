import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'test-results/sidebar-review');
const temporary = await mkdtemp(join(tmpdir(), 'sidebar-review-'));
await mkdir(output, { recursive: true });
// Only the mock transport is instrumented. Render the real shared components
// and control request completion explicitly, without adding test hooks to them.
const built = await build({ absWorkingDir: root, entryPoints: ['demo/sidebar.tsx'], bundle: true, write: false,
  outfile: join(temporary, 'sidebar.js'), format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'controlled-mock-latency', setup(b) {
    b.onLoad({ filter: /demo\/sidebar\.tsx$/ }, async ({ path }) => ({ loader: 'tsx', contents:
      (await readFile(path, 'utf8')).replace('if (!connected) throw', 'await (globalThis as any).__reviewWait?.(operation); if (!connected) throw') }));
  } }] });
const html = join(temporary, 'sidebar.html');
await writeFile(html, `<html lang="zh-CN"><meta charset="utf-8"><style>${built.outputFiles.find(f => f.path.endsWith('.css')).text}</style><div id="root"></div><script>${built.outputFiles.find(f => f.path.endsWith('.js')).text.replaceAll('</script', '<\\/script')}</script></html>`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(html).href);
  const rows = page.locator('.chat-session-row button[data-scene-id]');
  const input = page.locator('.chat-session-inline-editor input');
  const menu = page.getByRole('menu', { name: '场景操作' });
  const items = page.getByRole('menuitem');
  const reset = () => page.getByRole('button', { name: '重置预览', exact: true }).click();
  const active = () => page.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id');
  const focused = locator => locator.evaluate(el => el === document.activeElement);
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const contrast = (selector, minimum) => page.evaluate(({ selector, minimum }) => {
    const element = document.querySelector(selector), canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1; const context = canvas.getContext('2d');
    const rgb = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const luminance = color => color.map(x => { const v = x / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const color = getComputedStyle(element).color, foreground = rgb(color), ancestors = [];
    for (let parent = element; parent; parent = parent.parentElement) ancestors.unshift(parent);
    context.fillStyle = '#fff'; context.fillRect(0, 0, 1, 1);
    for (const parent of ancestors) { context.fillStyle = getComputedStyle(parent).backgroundColor; context.fillRect(0, 0, 1, 1); }
    const background = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    const a = luminance(foreground), b = luminance(background);
    return { theme: document.documentElement.dataset.theme, selector, color, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), minimum };
  }, { selector, minimum });
  const gate = operation => page.evaluate(operation => {
    window.__pending = [];
    window.__reviewWait = op => op === operation ? new Promise((resolve, reject) => window.__pending.push({ resolve, reject })) : Promise.resolve();
  }, operation);
  const release = async (error = false) => {
    await page.waitForFunction(() => window.__pending.length > 0);
    await page.evaluate(error => { const request = window.__pending.shift(); error ? request.reject(new Error('测试保存失败')) : request.resolve(); }, error);
    await frames();
  };

  // Pointer menus start without an arbitrary highlighted action. Moving the
  // pointer updates the keyboard target; no two items are highlighted at once.
  await rows.first().click({ button: 'right' });
  assert.ok(await focused(menu));
  assert.equal(await items.locator(':scope:focus').count(), 0);
  await page.keyboard.press('ArrowUp'); assert.ok(await focused(items.last()));
  await page.keyboard.press('Escape'); assert.ok(await focused(rows.first()));
  await rows.first().press('Shift+F10'); assert.ok(await focused(items.first()));
  await page.getByRole('menuitem', { name: '复制场景 ID', exact: true }).hover();
  assert.ok(await focused(items.nth(2)));
  await page.waitForFunction(() => [...document.querySelectorAll('[role=menuitem]')].filter(el => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)').length === 1);
  await page.keyboard.press('ArrowUp');
  assert.ok(await focused(items.nth(1)));
  await page.waitForFunction(() => [...document.querySelectorAll('[role=menuitem]')].filter(el => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)').length === 1);
  await page.screenshot({ path: join(output, 'menu.png'), animations: 'disabled' });
  await page.keyboard.press('Tab');
  assert.equal(await menu.count(), 0);
  assert.ok(await focused(page.getByRole('separator', { name: '场景列表宽度' })), 'Tab continues after the source row');
  await rows.first().press('Shift+F10'); await page.keyboard.press('Shift+Tab');
  assert.ok(await focused(page.locator('#bind-chat-session')), 'Shift+Tab continues before the list');
  await rows.first().press('Shift+F10');
  await page.locator('#new-chat-session').click();
  assert.ok(await focused(page.locator('#chat-session-editor input')), 'Outside clicks keep the destination focus');
  await page.keyboard.press('Escape');
  await rows.first().press('Shift+F10');
  await page.locator('#chat-view h1').click();
  await frames();
  assert.ok(await focused(rows.first()), 'Dismissing on empty content retains a usable keyboard focus');
  await rows.first().press('Shift+F10'); await page.setViewportSize({ width: 1180, height: 820 });
  await menu.waitFor({ state: 'hidden' }); assert.ok(await focused(rows.first()));
  await page.setViewportSize({ width: 1280, height: 860 });

  await page.getByLabel('预览数据', { exact: true }).selectOption('empty');
  assert.equal(await page.locator('#new-chat-session').isDisabled(), false);
  assert.equal(await page.locator('#bind-chat-session').isDisabled(), false);
  assert.equal(await page.locator('.chat-session-caption').textContent(), '还没有场景，点击上方新建');
  await page.screenshot({ path: join(output, 'empty.png'), animations: 'disabled' });
  await page.locator('#new-chat-session').click();
  await page.getByRole('textbox', { name: '场景名称', exact: true }).fill('第一个场景');
  await page.getByRole('button', { name: '创建并进入', exact: true }).click();
  await rows.first().waitFor(); assert.equal(await rows.first().textContent(), '第一个场景');
  await page.getByLabel('预览数据', { exact: true }).selectOption('disconnected');
  assert.ok(await page.locator('#new-chat-session').isDisabled());
  assert.ok(await page.locator('#bind-chat-session').isDisabled());
  await page.getByLabel('预览数据', { exact: true }).selectOption('statuses');

  // A -> B -> A must honor A even while B is still pending.
  await gate('select'); await rows.nth(1).click(); await rows.first().click();
  await release(); await release(); assert.equal(await active(), 'demo-idle');
  // Repeated ids in a longer queue must not clear the latest pending request.
  await rows.nth(1).click(); await rows.nth(2).click(); await rows.nth(1).click();
  await release(); await rows.nth(2).click();
  await release(); await release(); await release();
  assert.equal(await active(), 'demo-status-thinking');
  await page.evaluate(() => { window.__reviewWait = undefined; }); await reset();

  await gate('rename'); await rows.first().press('F2'); await input.fill('保存后的名称'); await input.press('Enter');
  await page.waitForFunction(() => window.__pending.length > 0);
  assert.equal(await input.getAttribute('aria-busy'), 'true');
  assert.ok(await rows.first().isDisabled());
  await rows.first().dblclick({ force: true });
  assert.equal(await input.inputValue(), '保存后的名称', 'A pending edit cannot be replaced by another row');
  await release(); await input.waitFor({ state: 'hidden' });
  assert.equal(await rows.first().textContent(), '保存后的名称');
  await rows.nth(1).press('F2'); await input.fill('失败仍保留草稿'); await input.press('Enter');
  await release(true);
  assert.equal(await input.inputValue(), '失败仍保留草稿');
  assert.ok(await focused(input)); assert.equal(await input.getAttribute('aria-busy'), 'false');
  await rows.nth(1).dblclick({ force: true });
  assert.equal(await input.inputValue(), '失败仍保留草稿', 'A failed draft survives a second rename attempt');
  // Blur has retried the pending save; finish it and then allow a fresh edit.
  await release(); await input.waitFor({ state: 'hidden' });
  await page.evaluate(() => { window.__reviewWait = undefined; });
  await rows.nth(2).press('F2'); await input.fill('新的独立改名'); await input.press('Enter');
  await input.waitFor({ state: 'hidden' });
  assert.equal(await rows.nth(2).textContent(), '新的独立改名');
  await reset();

  await rows.nth(2).click(); await rows.nth(2).press('Delete');
  assert.ok(await focused(page.getByRole('button', { name: '取消', exact: true })), 'Destructive confirmation starts on Cancel');
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await page.locator('#chat-session-delete').waitFor({ state: 'hidden' });
  assert.equal(await active(), 'demo-status-replying', 'Demo deletion selects the same nearest survivor as production');

  // Inspect overflow and clipping at a compact viewport in both themes. All
  // states, long names, menus and keyboard access remain reachable.
  await page.getByLabel('预览数据', { exact: true }).selectOption('long');
  await page.setViewportSize({ width: 640, height: 430 });
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('外观', { exact: true }).selectOption(theme);
    await rows.last().focus(); await rows.last().press('Shift+F10');
    const box = await menu.boundingBox();
    assert.ok(box.x >= 8 && box.y >= 8 && box.x + box.width <= 632 && box.y + box.height <= 422, 'Menu stays within the viewport');
    await page.screenshot({ path: join(output, `compact-${theme}.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.getByLabel('预览数据', { exact: true }).selectOption('statuses');
  const measurements = [];
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('外观', { exact: true }).selectOption(theme);
    await rows.first().click({ button: 'right' });
    for (const [selector, minimum] of [['.chat-session-context-menu .danger', 4.5], ['.chat-session-context-menu kbd', 4.5], ['.chat-session-context-toggle', 4.5], ['.chat-session-status[data-status=error]', 3]]) {
      measurements.push(await contrast(selector, minimum));
    }
    await page.getByRole('menuitem', { name: '删除场景', exact: true }).hover();
    measurements.push(await contrast('.chat-session-context-menu .danger', 4.5));
    await page.keyboard.press('Escape');
    await page.screenshot({ path: join(output, `overview-${theme}.png`), animations: 'disabled' });
  }
  await writeFile(join(output, 'contrast.json'), JSON.stringify(measurements, null, 2));
  for (const value of measurements) assert.ok(value.ratio >= value.minimum, `${value.theme} ${value.selector} contrast ${value.ratio.toFixed(2)} < ${value.minimum}`);
  await page.screenshot({ path: join(output, 'overview-dark.png'), animations: 'disabled' });
  assert.deepEqual(errors, []);
  console.log('Sidebar review passed: menu focus/pointer/Tab/edge containment, empty-state recovery, delayed navigation, rename draft retention, nearest deletion and compact light/dark layouts.');
} finally { await browser.close(); await rm(temporary, { recursive: true, force: true }); }
