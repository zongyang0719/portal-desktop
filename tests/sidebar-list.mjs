import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = fileURLToPath(new URL('../test-results/sidebar-demo/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('../demo/sidebar.html', import.meta.url).href);
  const rows = page.locator('.chat-session-row button[data-scene-id]');
  const input = page.locator('.chat-session-inline-editor input');
  const selected = () => page.locator('.chat-session-row[aria-selected=true] button').evaluateAll(items => items.map(item => item.dataset.sceneId));
  const ids = () => rows.evaluateAll(items => items.map(item => item.dataset.sceneId));
  const active = () => page.locator('[data-scene-id][aria-current=true]').getAttribute('data-scene-id');
  const reset = async () => { await page.getByRole('button', { name: '重置预览', exact: true }).click(); };
  const original = await ids();

  // Observe the shared highlight moving; keyboard/reduced-motion paths are instant.
  await rows.first().hover();
  const glide = page.locator('.chat-session-glide-highlight');
  await page.waitForFunction(() => document.querySelector('.chat-session-glide').dataset.glide === 'true');
  const frames = page.evaluate(async () => {
    const positions = [], started = performance.now();
    while (performance.now() - started < 400) {
      positions.push(document.querySelector('.chat-session-glide-highlight').getBoundingClientRect().top);
      await new Promise(requestAnimationFrame);
    }
    return positions;
  });
  await rows.last().hover();
  const positions = await frames;
  assert.ok(new Set(positions.map(value => Math.round(value))).size > 2, 'GlideMenu moves through intermediate positions');
  await rows.nth(1).focus();
  assert.equal(await glide.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await rows.nth(4).hover();
  assert.equal(await glide.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await rows.first().dblclick();
  await input.waitFor();
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Double-click edits in place');
  assert.deepEqual(await input.evaluate(el => [el.selectionStart, el.selectionEnd]), [0, (await input.inputValue()).length]);
  await input.fill('行内命名'); await input.press('Enter'); await input.waitFor({ state: 'hidden' });
  assert.equal(await rows.first().textContent(), '行内命名');
  assert.equal(await active(), original[0]);
  await rows.first().press('F2'); await input.fill('不保存'); await input.press('Escape');
  assert.equal(await rows.first().textContent(), '行内命名');
  await rows.first().press('F2'); await input.fill(''); await input.press('Enter');
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  await input.fill('输入法完成');
  await input.dispatchEvent('compositionstart'); await input.press('Enter');
  assert.equal(await input.count(), 1, 'IME confirmation must not submit rename');
  await input.dispatchEvent('compositionend');
  await page.screenshot({ path: `${output}/inline-rename.png`, animations: 'disabled' });
  await page.locator('#chat-view h1').click(); await input.waitFor({ state: 'hidden' });
  assert.equal(await rows.first().textContent(), '输入法完成', 'Blur commits the name');

  await page.getByLabel('保存失败模拟', { exact: true }).check();
  await rows.first().press('F2'); await input.fill('保留失败草稿'); await input.press('Enter');
  await page.locator('.chat-session-name-error').waitFor();
  assert.equal(await input.inputValue(), '保留失败草稿');
  assert.equal(await input.evaluate(el => el === document.activeElement), true);
  await input.press('Escape');
  assert.equal(await rows.first().textContent(), '输入法完成');
  await page.getByLabel('保存失败模拟', { exact: true }).uncheck();
  await reset();

  const initialActive = await active();
  await rows.nth(1).click({ modifiers: ['Meta'] });
  await rows.nth(4).click({ modifiers: ['Meta'] });
  assert.equal(await active(), initialActive, 'Modified clicks never open a scene');
  assert.equal((await selected()).length, 3);
  await rows.nth(4).click({ modifiers: ['Meta'] });
  assert.equal((await selected()).length, 2);
  await rows.first().click();
  await rows.nth(3).click({ modifiers: ['Shift'] });
  assert.deepEqual(await selected(), original.slice(0, 4));
  await rows.nth(1).click({ modifiers: ['Shift'] });
  assert.deepEqual(await selected(), original.slice(0, 2), 'Shrinking a range keeps its anchor');
  await rows.nth(1).press('Shift+ArrowDown');
  assert.deepEqual(await selected(), original.slice(0, 3));
  await page.keyboard.press('Escape'); assert.equal((await selected()).length, 1);
  await rows.first().focus(); await page.keyboard.press('Control+a');
  assert.equal((await selected()).length, original.length);
  await page.keyboard.press('Escape');

  // Non-contiguous items move as one block in their existing visual order.
  await rows.nth(1).click({ modifiers: ['Meta'] });
  await rows.nth(3).click({ modifiers: ['Meta'] });
  const moving = await selected(), beforeMoveActive = await active();
  await rows.nth(1).click({ button: 'right' });
  assert.equal(await page.getByRole('menuitem', { name: '重命名', exact: true }).count(), 0);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedIds = text; } } }); });
  await page.getByRole('menuitem', { name: '复制所选场景 ID', exact: true }).click();
  assert.equal(await page.evaluate(() => window.copiedIds), moving.join('\n'));
  // Dropping after an unselected gap must skip selected items when finding
  // the insertion anchor, rather than mistakenly treating it as a self-drop.
  await rows.nth(1).dragTo(rows.nth(2), { targetPosition: { x: 30, y: 33 } });
  await page.waitForFunction(id => document.querySelector('[data-scene-id]')?.getAttribute('data-scene-id') === id, original[2]);
  assert.deepEqual(await ids(), [original[2], ...moving, ...original.filter(id => id !== original[2] && !moving.includes(id))]);
  await rows.nth(1).dragTo(rows.last(), { targetPosition: { x: 30, y: 33 } });
  await page.waitForFunction(expected => [...document.querySelectorAll('[data-scene-id]')].slice(-expected.length).map(el => el.dataset.sceneId).join() === expected.join(), moving);
  assert.deepEqual(await ids(), [...original.filter(id => !moving.includes(id)), ...moving]);
  assert.equal(await active(), beforeMoveActive);
  assert.equal(await page.locator('.chat-session-status').count(), 8);
  await page.screenshot({ path: `${output}/multi-selection.png`, animations: 'disabled' });

  await page.getByLabel('保存失败模拟', { exact: true }).check();
  const stable = await ids();
  await rows.last().dragTo(rows.first(), { targetPosition: { x: 30, y: 3 } });
  await page.getByRole('alert').waitFor();
  assert.deepEqual(await ids(), stable, 'Failed group move restores the entire order');
  assert.deepEqual(new Set(await selected()), new Set(moving));
  await rows.last().click({ button: 'right' });
  await page.getByRole('menuitem', { name: /^删除 \d+ 个场景$/ }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await page.locator('#chat-session-delete [role=alert]').waitFor();
  assert.deepEqual(await ids(), stable, 'Failed batch delete removes nothing');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByLabel('保存失败模拟', { exact: true }).uncheck();
  await rows.last().press('Delete');
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await page.locator('#chat-session-delete').waitFor({ state: 'hidden' });
  assert.deepEqual(await ids(), stable.filter(id => !moving.includes(id)));

  await rows.first().focus(); await page.keyboard.press('Meta+a'); await page.keyboard.press('Delete');
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await page.locator('#chat-session-delete').waitFor({ state: 'hidden' });
  assert.equal(await rows.count(), 1, 'Deleting every entry leaves one usable new scene');
  assert.equal(await rows.first().textContent(), '新场景');
  assert.equal(await rows.first().evaluate(el => el === document.activeElement), true, 'Focus returns to the usable replacement scene');
  assert.deepEqual(errors, []);
  console.log('Sidebar list passed: inline rename/IME/cancel/failure, range and modifier selection, batch move/copy/delete, atomic rollback and empty-list recovery.');
} finally { await browser.close(); }
