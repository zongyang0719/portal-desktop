import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('../demo/sidebar.html', import.meta.url).href);
  const rows = page.locator('.chat-session-row button[data-scene-id]');
  const ids = () => rows.evaluateAll(elements => elements.map(element => element.dataset.sceneId));
  const width = () => page.locator('.chat-sidebar-resizer').getAttribute('aria-valuenow').then(Number);
  const splitter = page.getByRole('separator', { name: '场景列表宽度' });
  const original = await ids();
  assert.equal(await width(), 224);
  const edge = await splitter.boundingBox();
  await page.mouse.move(edge.x + 3, edge.y + 60);
  await page.mouse.down(); await page.mouse.move(edge.x + 83, edge.y + 60, { steps: 10 });
  assert.equal(await width(), 304);
  await page.mouse.up();
  await page.reload();
  assert.equal(await width(), 304, 'Width must survive a reload');
  await splitter.focus(); await page.keyboard.press('ArrowLeft');
  assert.equal(await width(), 296);
  await page.keyboard.press('Home'); assert.equal(await width(), 200);
  await page.keyboard.press('End'); assert.equal(await width(), 400);
  const box = await splitter.boundingBox();
  await page.mouse.move(box.x + 3, box.y + 60); await page.mouse.down();
  await page.mouse.move(box.x - 80, box.y + 60, { steps: 6 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  assert.equal(await width(), 400, 'Escape restores the pre-drag width');
  await splitter.dblclick(); assert.equal(await width(), 224);

  await page.getByLabel('显示全部场景上下文', { exact: true }).check();
  const selected = await page.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id');
  // Native pointer drag: move last above first; no selection or state loss.
  await rows.last().dragTo(rows.first(), { targetPosition: { x: 40, y: 3 } });
  await page.waitForFunction(first => document.querySelector('[data-scene-id]')?.getAttribute('data-scene-id') === first, original.at(-1));
  assert.deepEqual(await ids(), [original.at(-1), ...original.slice(0, -1)]);
  assert.equal(await page.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id'), selected);
  assert.equal(await page.locator('.chat-session-status').count(), 8, 'Reordering preserves all eight states');
  assert.ok(await page.getByLabel('显示全部场景上下文', { exact: true }).isChecked());

  await rows.first().focus(); await page.keyboard.press('Alt+Shift+ArrowDown');
  await page.waitForFunction(id => document.querySelectorAll('[data-scene-id]')[1]?.getAttribute('data-scene-id') === id, original.at(-1));
  await page.waitForFunction(id => document.activeElement?.getAttribute('data-scene-id') === id, original.at(-1));
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-scene-id')), original.at(-1));
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menu').waitFor();
  assert.equal(await page.getByRole('menuitem', { name: /调整顺序/ }).count(), 0);
  await page.keyboard.press('Escape');
  await rows.nth(1).dragTo(rows.last(), { targetPosition: { x: 40, y: 33 } });
  await page.waitForFunction(id => [...document.querySelectorAll('[data-scene-id]')].at(-1)?.getAttribute('data-scene-id') === id, original.at(-1));
  assert.deepEqual(await ids(), original);

  await rows.first().hover();
  assert.equal(await page.locator('.chat-session-row button').count(), await rows.count(), 'Each row has just one control, including on hover');
  // The preceding drag releases the row's scale(.98) press feedback; measure
  // stable layout after that transition, not its in-flight transform.
  await page.waitForFunction(() => [...document.querySelectorAll('.chat-session-row button[data-scene-id]')]
    .every(element => getComputedStyle(element).transform === 'none'));
  const statusBoxes = await page.locator('.chat-session-status').evaluateAll(elements => elements.map(element => {
    const { x, width } = element.getBoundingClientRect(); return { x, width };
  }));
  await rows.nth(1).hover();
  assert.deepEqual(await page.locator('.chat-session-status').evaluateAll(elements => elements.map(element => {
    const { x, width } = element.getBoundingClientRect(); return { x, width };
  })), statusBoxes, 'Hover never displaces the status indicators');
  await page.screenshot({ path: fileURLToPath(new URL('../test-results/sidebar-demo/rows-without-more.png', import.meta.url)), animations: 'disabled' });
  await rows.first().click({ button: 'right' });
  assert.equal(await page.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id'), selected, 'Right-click does not switch scenes');
  assert.deepEqual(await page.getByRole('menuitem').allTextContents().then(labels => labels.map(label => label.replace('F2', '').trim())),
    ['重命名', '查看场景信息', '复制场景 ID', '删除场景']);
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '删除场景');
  await page.screenshot({ path: fileURLToPath(new URL('../test-results/sidebar-demo/row-menu.png', import.meta.url)), animations: 'disabled' });
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-scene-id')), original[0]);
  await page.keyboard.press('ContextMenu');
  await page.getByRole('menu').waitFor();
  await page.keyboard.press('Escape');
  await rows.nth(1).locator('.chat-session-status').click({ button: 'right' });
  await page.getByRole('menu').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-scene-id')), original[1], 'Right-click works on the status end of the row too');
  await rows.first().focus();

  // Inspect/copy another scene without navigating away from the active one.
  await page.evaluate(() => {
    window.copiedSceneIds = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async id => { window.copiedSceneIds.push(id); },
    } });
  });
  const activeTitle = await page.locator('#chat-view h1').textContent();
  const inspectedName = await rows.first().locator(':scope > span').first().textContent();
  assert.notEqual(original[0], selected);
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: '查看场景信息', exact: true }).click();
  const info = page.getByRole('dialog', { name: '场景信息', exact: true });
  await info.waitFor();
  assert.equal(await info.locator('#chat-scene-id').textContent(), original[0]);
  assert.equal(await info.locator('.chat-scene-name').textContent(), inspectedName);
  assert.equal(await info.locator('dd').last().textContent(), '暂无活动');
  assert.equal(await page.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id'), selected);
  assert.equal(await page.locator('#chat-view h1').textContent(), activeTitle);
  assert.ok(await page.getByLabel('显示全部场景上下文', { exact: true }).isChecked());
  await info.getByRole('button', { name: '复制场景 ID', exact: true }).click();
  await page.waitForFunction(id => window.copiedSceneIds[0] === id, original[0]);
  await page.screenshot({ path: fileURLToPath(new URL('../test-results/sidebar-demo/other-scene-info.png', import.meta.url)), animations: 'disabled' });
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-scene-id')), original[0]);
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: '复制场景 ID', exact: true }).click();
  await page.waitForFunction(id => window.copiedSceneIds[1] === id, original[0]);
  assert.equal(await page.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id'), selected);
  await page.locator('#chat-scene-details-trigger').click();
  await info.waitFor();
  assert.equal(await info.locator('#chat-scene-id').textContent(), selected, 'The titlebar still opens the current scene');
  assert.equal(await info.locator('dd').last().textContent(), '思考中');
  await info.getByRole('button', { name: '关闭场景信息' }).click();
  await rows.first().focus();
  await page.keyboard.press('F2');
  await page.locator('.chat-session-inline-editor input').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-scene-id')), original[0]);

  await page.getByLabel('保存失败模拟', { exact: true }).check();
  await rows.first().focus(); await page.keyboard.press('Alt+Shift+ArrowDown');
  await page.getByRole('alert').waitFor();
  assert.deepEqual(await ids(), original, 'A rejected save restores the original order');
  assert.match(await page.getByRole('alert').textContent(), /保存失败/);
  await page.getByLabel('保存失败模拟', { exact: true }).uncheck();

  // A rejected pointer drag also restores order and focuses its original row.
  await page.getByLabel('保存失败模拟', { exact: true }).check();
  await rows.first().dragTo(rows.last(), { targetPosition: { x: 40, y: 33 } });
  await page.getByRole('alert').waitFor();
  assert.deepEqual(await ids(), original);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-scene-id')), original[0]);
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Sorting never opens a dialog');
  await page.getByLabel('保存失败模拟', { exact: true }).uncheck();

  // Cancel or drop outside: neither changes order nor activates another scene.
  for (const cancel of [true, false]) {
    const start = await rows.first().boundingBox();
    await page.mouse.move(start.x + 40, start.y + 18); await page.mouse.down();
    await page.mouse.move(start.x + 42, start.y + 65, { steps: 5 });
    if (cancel) await page.keyboard.press('Escape');
    else await page.mouse.move(700, 400, { steps: 8 });
    await page.mouse.up();
    assert.deepEqual(await ids(), original);
  }
  await page.getByLabel('预览数据', { exact: true }).selectOption('long');
  const list = page.locator('.chat-session-list'), listBox = await list.boundingBox();
  const start = await rows.first().boundingBox();
  await page.mouse.move(start.x + 40, start.y + 18); await page.mouse.down();
  await page.mouse.move(start.x + 42, start.y + 65, { steps: 5 });
  await page.mouse.move(start.x + 42, listBox.y + listBox.height - 6, { steps: 12 });
  await page.waitForFunction(() => document.querySelector('.chat-session-list').scrollTop > 100);
  await page.keyboard.press('Escape'); await page.mouse.up();
  assert.equal((await ids())[0], 'demo-latest');

  // Resizing in peek must not pin or displace the main content.
  await page.getByRole('button', { name: '收起场景列表', exact: true }).click();
  await page.waitForTimeout(320);
  const content = await page.locator('#chat-view').boundingBox();
  const stage = await page.locator('.workspace-stage').boundingBox();
  // Leave the collapse trigger before re-entering the edge, as in the peek
  // suite. Teleporting straight to the edge keeps the dismissal guard active.
  await page.mouse.move(700, 400);
  await page.mouse.move(stage.x + 2, stage.y + 200);
  await page.waitForFunction(() => document.querySelector('#chat-session-panel').dataset.peek === 'true');
  await page.waitForTimeout(300);
  const peekEdge = await splitter.boundingBox();
  await page.mouse.move(peekEdge.x + 3, peekEdge.y + 70); await page.mouse.down();
  await page.mouse.move(peekEdge.x + 63, peekEdge.y + 70, { steps: 8 }); await page.mouse.up();
  assert.equal(await width(), 284);
  assert.equal(await page.locator('#chat-session-panel').getAttribute('data-pinned'), 'false');
  assert.deepEqual(await page.locator('#chat-view').boundingBox(), content);
  await splitter.press('Enter');
  assert.equal(await page.locator('#chat-session-panel').getAttribute('data-open'), 'false');
  assert.equal(await page.locator('#chat-session-panel').getAttribute('data-pinned'), 'false', 'Enter on the splitter must never pin a peek');
  await page.mouse.move(700, 400); await page.mouse.move(stage.x + 2, stage.y + 200);
  await page.waitForFunction(() => document.querySelector('#chat-session-panel').dataset.peek === 'true');
  await page.getByRole('button', { name: '固定场景列表', exact: true }).click();
  await page.getByLabel('右侧面板', { exact: true }).check();
  await page.setViewportSize({ width: 850, height: 700 });
  await page.waitForFunction(() => Number(document.querySelector('.chat-sidebar-resizer').getAttribute('aria-valuenow')) < 284);
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.waitForFunction(() => Number(document.querySelector('.chat-sidebar-resizer').getAttribute('aria-valuenow')) === 284);
  await page.screenshot({ path: fileURLToPath(new URL('../test-results/sidebar-demo/resized-three-panes.png', import.meta.url)), animations: 'disabled' });
  assert.deepEqual(errors, []);

  // Exercise actual touch input, including the browser's native contextmenu event.
  const touchPage = await browser.newPage({ viewport: { width: 1280, height: 860 }, hasTouch: true });
  touchPage.on('pageerror', error => errors.push(error.message));
  await touchPage.goto(new URL('../demo/sidebar.html', import.meta.url).href);
  const touchRows = touchPage.locator('.chat-session-row button[data-scene-id]');
  const touchSelected = () => touchPage.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id');
  const initialTouchScene = await touchSelected();
  const touchBox = await touchRows.first().boundingBox();
  const touchPoint = { x: touchBox.x + 50, y: touchBox.y + touchBox.height / 2 };
  const cdp = await touchPage.context().newCDPSession(touchPage);
  const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [touchPoint]);
  await touchPage.getByRole('menu').waitFor();
  await touch('touchEnd');
  assert.equal(await touchSelected(), initialTouchScene, 'Long press must not activate another scene');
  assert.equal(await touchPage.locator('.chat-session-row button').count(), await touchRows.count(), 'Touch also needs no more button');
  await touchPage.getByRole('menuitem', { name: '查看场景信息', exact: true }).tap();
  await touchPage.getByRole('dialog', { name: '场景信息', exact: true }).waitFor();
  assert.equal(await touchPage.locator('#chat-scene-id').textContent(), original[0]);
  await touchPage.getByRole('button', { name: '关闭场景信息', exact: true }).tap();
  await touchPage.waitForTimeout(800);
  assert.equal(await touchPage.getByRole('menu').count(), 0, 'No delayed second menu after a native long press');

  // Scroll gestures and cancelled touches must not leave a delayed menu behind.
  await touch('touchStart', [touchPoint]);
  await touch('touchMove', [{ ...touchPoint, y: touchPoint.y + 45 }]);
  await touchPage.waitForTimeout(800);
  await touch('touchEnd');
  assert.equal(await touchPage.getByRole('menu').count(), 0);
  await touch('touchStart', [touchPoint]);
  await touch('touchCancel');
  await touchPage.waitForTimeout(800);
  assert.equal(await touchPage.getByRole('menu').count(), 0);
  await touchRows.first().tap();
  assert.equal(await touchSelected(), original[0], 'A normal tap still activates the scene');
  await touchPage.waitForTimeout(800);
  assert.equal(await touchPage.getByRole('menu').count(), 0, 'A short tap never opens the menu');
  await touchPage.close();
  assert.deepEqual(errors, []);
  console.log('Sidebar interactions passed: persistent resize, drag + keyboard order, right-click + keyboard + touch menus, rollback, autoscroll and peek isolation.');
} finally { await browser.close(); }
