import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../test-results/sidebar-toggle/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const records = [], tiles = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('../demo/sidebar.html', import.meta.url).href);
  const trigger = page.locator('#chat-scene-indicator');
  const panel = page.locator('#chat-session-panel');
  const away = () => page.mouse.move(750, 400);
  const settle = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await trigger.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  };
  const state = async expected => {
    await page.waitForFunction(value => {
      const panel = document.querySelector('#chat-session-panel');
      return (panel.dataset.open !== 'true' ? 'collapsed' : panel.dataset.peek === 'true' ? 'peek' : 'pinned') === value;
    }, expected);
    await settle();
    const value = await trigger.evaluate(el => ({
      label: el.getAttribute('aria-label'), expanded: el.ariaExpanded, pressed: el.ariaPressed,
      icon: el.querySelector('svg').innerHTML, fill: getComputedStyle(el.querySelector('svg')).fill,
      background: getComputedStyle(el).backgroundColor, transform: getComputedStyle(el).transform,
      focus: el.matches(':focus-visible'), outline: getComputedStyle(el).outlineStyle,
      rect: { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight },
    }));
    const expectedStates = {
      pinned: ['收起场景列表', 'true', 'true'],
      collapsed: ['展开场景列表', 'false', 'false'],
      peek: ['固定场景列表', 'true', 'false'],
    };
    assert.deepEqual([value.label, value.expanded, value.pressed], expectedStates[expected]);
    assert.equal(value.fill, 'none', 'Preserve the original outline icon');
    return value;
  };
  const capture = async (theme, name, expected) => {
    const value = await state(expected);
    records.push({ theme, name, ...value });
    const box = await trigger.boundingBox();
    const png = await page.screenshot({ path: `${output}/${theme}-${name}.png`, clip: { x: box.x - 8, y: box.y - 8, width: 48, height: 48 } });
    tiles.push({ theme, name, png });
    return value;
  };
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('外观', { exact: true }).selectOption(theme);
    await page.getByLabel('预览数据', { exact: true }).selectOption('default');
    await away();
    const pinned = await capture(theme, 'pinned', 'pinned');
    await trigger.hover();
    const hovered = await capture(theme, 'hover', 'pinned');
    assert.notEqual(hovered.background, pinned.background, 'Hover must have visible feedback');
    await page.mouse.down();
    const pressed = await capture(theme, 'pressed', 'pinned');
    assert.notEqual(pressed.background, hovered.background, 'Press must be distinct from hover');
    assert.match(pressed.transform, /0\.98/);
    await page.mouse.up(); await away();
    const collapsed = await capture(theme, 'collapsed', 'collapsed');
    await page.mouse.move(4, 400);
    await page.waitForFunction(() => document.querySelector('#chat-session-panel').dataset.peek === 'true');
    const peek = await capture(theme, 'peek', 'peek');
    assert.deepEqual(collapsed.rect, pinned.rect);
    assert.deepEqual(peek.rect, pinned.rect, 'Toggle cannot move when the panel changes mode');
    assert.equal(collapsed.icon, pinned.icon);
    assert.equal(peek.icon, pinned.icon, 'No alternate filled or dashed icon');
    await trigger.click(); await away();
    await state('pinned');
    assert.equal(await panel.getAttribute('data-pinned'), 'true', 'Clicking preview pins it');
    assert.equal(await panel.getAttribute('data-peek'), 'false');
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    assert.ok(await trigger.evaluate(el => el === document.activeElement));
    const focused = await capture(theme, 'focus', 'pinned');
    assert.ok(focused.focus); assert.equal(focused.outline, 'solid');
    await page.keyboard.press('Enter'); await state('collapsed');
    assert.equal(await trigger.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await page.keyboard.press('Space'); await state('pinned');
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await page.mouse.click(750, 400);
  }
  // Platform layouts are web simulations, not native window acceptance.
  for (const platform of ['web', 'darwin', 'win32']) {
    await page.getByLabel('窗口示意', { exact: true }).selectOption(platform);
    const pinned = await state('pinned');
    await trigger.click(); await away(); const collapsed = await state('collapsed');
    assert.deepEqual(pinned.rect, collapsed.rect);
    assert.equal(pinned.rect.x, platform === 'darwin' ? 88 : 16);
    await trigger.click(); await away(); await state('pinned');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.hover(); await page.mouse.down();
  assert.equal(await trigger.evaluate(el => getComputedStyle(el).transform), 'none');
  assert.equal(await trigger.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.mouse.up(); await state('collapsed');
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify(records, null, 2));

  // Contact sheet made from unmodified browser screenshots at 2× display size.
  const sheet = await browser.newPage({ viewport: { width: 900, height: 420 }, deviceScaleFactor: 1 });
  await sheet.setContent(`<html><meta charset="utf-8"><style>body{margin:0;background:#eee;font:13px system-ui}section{display:flex;gap:18px;padding:20px 24px}section.dark{background:#21251f;color:#eee}figure{margin:0;width:124px;text-align:center}img{display:block;margin:auto;width:96px;height:96px}figcaption{margin-top:10px}</style>${['light', 'dark'].map(theme => `<section class="${theme}">${tiles.filter(t => t.theme === theme).map(t => `<figure><img src="data:image/png;base64,${t.png.toString('base64')}"><figcaption>${({pinned:'固定展开',hover:'悬停',pressed:'按下',collapsed:'收起',peek:'悬浮预览',focus:'键盘焦点'})[t.name]}</figcaption></figure>`).join('')}</section>`).join('')}</html>`);
  await sheet.screenshot({ path: `${output}/state-matrix.png`, fullPage: true });
  console.log('Sidebar toggle passed: original outline icon, hover/press/focus feedback, collapsed/peek/pinned behavior, keyboard, reduced motion, fixed platform positions.');
} finally { await browser.close(); }
