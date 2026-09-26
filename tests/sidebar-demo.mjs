import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../test-results/sidebar-demo/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, colorScheme: "light" });
  const errors = [], network = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route(/^https?:/, route => {
    network.push(route.request().url());
    return route.abort();
  });
  await page.goto(new URL("../demo/sidebar.html", import.meta.url).href);
  const panel = page.getByRole("complementary", { name: "场景列表" });
  const heading = page.locator("#chat-view h1");
  await panel.waitFor();
  assert.equal(await page.evaluate(() => typeof window.beings), "undefined");
  assert.equal(await page.getByLabel("预览数据", { exact: true }).inputValue(), 'statuses');
  assert.equal(await page.locator('.chat-session-status').count(), 8, 'Initial preview must retain every state');
  assert.equal(await page.locator('.chat-session-options').count(), 0, 'Conversation actions must not hide in the footer');
  const createBox = await page.locator('#new-chat-session').boundingBox();
  const bindBox = await page.locator('#bind-chat-session').boundingBox();
  assert.equal(createBox.y + createBox.height / 2, bindBox.y + bindBox.height / 2);
  assert.ok(bindBox.x >= createBox.x + createBox.width);
  assert.equal(await page.locator('.chat-scene-heading #chat-scene-details-trigger').count(), 1);
  await page.screenshot({ path: `${output}/overview.png`, animations: "disabled" });
  await page.getByLabel("预览数据", { exact: true }).selectOption("default");
  assert.equal(await page.locator(".chat-session-row button[data-scene-id]").count(), 5);
  assert.equal(await page.locator('.chat-session-panel-heading,.chat-session-caption,.chat-session-row button[data-scene-id]>svg').count(),0);
  assert.equal(await page.locator('.chat-session-activity').allTextContents().then(values => values.join('')), '');
  assert.equal(await page.locator('.activity-spinner').count(),2);

  await page.screenshot({ path: `${output}/light.png`, animations: "disabled" });

  // Queued, in-progress, completed, stopped and error have distinct marks;
  // the four in-progress phases retain their exact descriptions.
  await page.getByLabel("预览数据", { exact: true }).selectOption("statuses");
  const statuses = { queued: "排队中", thinking: "思考中", replying: "回复中", working: "执行中",
    waiting: "等待回复", done: "已回复", error: "出错了", stopped: "已停止" };
  assert.equal(await page.locator('.chat-session-status').count(), Object.keys(statuses).length);
  assert.equal(await page.locator('[data-scene-id="demo-idle"] .chat-session-status').count(), 0, 'Idle reserves space without an activity mark');
  const shapes = new Set();
  for (const [status, label] of Object.entries(statuses)) {
    const badge = page.locator(`#chat-session-panel .chat-session-status[data-status="${status}"]`);
    const pending = ['thinking', 'replying', 'working', 'waiting'].includes(status);
    assert.ok(await badge.isVisible(), `${status} must remain visible`);
    assert.equal(await badge.getAttribute('aria-label'), label);
    assert.equal(await badge.getAttribute('data-sidebar-hint'), label);
    const row = page.locator(`[data-scene-id="demo-status-${status}"]`);
    assert.equal(await row.getAttribute('aria-describedby'), await badge.getAttribute('id'));
    assert.equal(await badge.locator('.activity-spinner').count(), pending ? 1 : 0);
    await row.click();
    if (status !== 'queued') assert.equal(await page.locator('.run-label').textContent(), label);
    const transcriptSpinner = page.locator('#chat-view .activity-spinner');
    assert.equal(await transcriptSpinner.count(), pending ? 1 : 0);
    if (status === 'stopped') {
      const mark = badge.locator('.activity-stopped');
      const transcriptMark = page.locator('.run-icon .activity-stopped');
      assert.equal(await mark.count(), 1);
      assert.equal(await transcriptMark.count(), 1, 'Stopping has a visible mark in both locations');
      const metrics = element => {
        const style = getComputedStyle(element);
        return [style.width, style.height, style.borderRadius, style.animationName];
      };
      assert.deepEqual(await mark.evaluate(metrics), ['8px', '8px', '2px', 'none']);
      assert.deepEqual(await transcriptMark.evaluate(metrics), await mark.evaluate(metrics));
      assert.equal(await badge.locator('svg').count(), 0, 'The stopped square has no enclosing icon ring');
    }
    if (status === 'done') {
      const transcriptMark = page.locator('.run-icon > svg');
      assert.equal(await transcriptMark.count(), 1, 'done must have a visible transcript mark');
      assert.equal(await transcriptMark.innerHTML(), await badge.locator('svg').innerHTML(), 'Sidebar and transcript use the same symbol');
      assert.equal(await transcriptMark.evaluate(element => getComputedStyle(element).animationName), 'none');
    }
    if (status === 'queued') {
      const hand = badge.locator('svg path');
      const metrics = element => {
        const style = getComputedStyle(element);
        return [style.animationName, style.animationDuration, style.animationTimingFunction];
      };
      assert.deepEqual(await hand.evaluate(metrics), ['activity-spin', '1s', 'linear']);
      assert.equal(await badge.locator('svg circle').evaluate(element => getComputedStyle(element).animationName), 'none', 'The queue clock face stays still');
      const before = await hand.evaluate(element => getComputedStyle(element).transform);
      await page.waitForTimeout(100);
      assert.notEqual(await hand.evaluate(element => getComputedStyle(element).transform), before, 'Only the clock hands turn while queued');
    }
    if (pending) {
      const metrics = element => {
        const style = getComputedStyle(element);
        return [style.width, style.height, style.borderTopWidth, style.animationName, style.animationDuration, style.animationTimingFunction];
      };
      assert.deepEqual(await badge.locator('.activity-spinner').evaluate(metrics), await transcriptSpinner.evaluate(metrics));
      const before = await badge.locator('.activity-spinner').evaluate(element => getComputedStyle(element).transform);
      await page.waitForTimeout(100);
      assert.notEqual(await badge.locator('.activity-spinner').evaluate(element => getComputedStyle(element).transform), before, 'A pending mark actually rotates');
    }
    shapes.add(await badge.locator(':scope > *').evaluate(element => element.outerHTML));
    await badge.hover();
    try { await page.getByRole('tooltip').waitFor(); }
    catch (error) {
      console.error('Tooltip state', status, await row.evaluate(element => ({
        hint: element.dataset.sidebarHint, focused: document.hasFocus(), hovered: element.matches(':hover'),
      })));
      throw error;
    }
    assert.equal(await page.getByRole('tooltip').textContent(), label);
    if (status === 'working') {
      await badge.evaluate(element => { element.dataset.sidebarHint = '执行中 · 后台任务'; });
      await page.getByRole('tooltip', { name: '执行中 · 后台任务', exact: true }).waitFor();
      await badge.evaluate(element => { element.dataset.sidebarHint = '执行中'; });
      await page.getByRole('tooltip', { name: '执行中', exact: true }).waitFor();
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('tooltip').count(), 0);
  }
  assert.equal(shapes.size, 5, 'Queued, in-progress, done, stopped and error have distinct marks');
  const stoppedRow = page.locator('[data-scene-id="demo-status-stopped"]');
  await page.mouse.move(600, 600);
  await page.locator('[data-scene-id="demo-status-error"]').focus();
  await page.keyboard.press('ArrowDown');
  assert.ok(await stoppedRow.evaluate(element => element === document.activeElement));
  await page.getByRole('tooltip').waitFor();
  assert.match(await page.getByRole('tooltip').textContent(), /已停止/);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.ok((await page.locator('.activity-spinner,.activity-queued path').evaluateAll(elements =>
    elements.map(element => getComputedStyle(element).animationName))).every(name => name === 'none'));
  await page.screenshot({ path: `${output}/all-statuses-light.png`, animations: "disabled" });
  await page.getByLabel("外观", { exact: true }).selectOption("dark");
  await page.screenshot({ path: `${output}/all-statuses-dark.png`, animations: "disabled" });
  await page.getByLabel("外观", { exact: true }).selectOption("light");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.move(600, 600);
  const waitingRow = page.locator('[data-scene-id="demo-status-waiting"]');
  await waitingRow.focus();
  await page.getByRole('tooltip').waitFor();
  assert.match(await page.getByRole('tooltip').textContent(), /等待回复/);
  await page.keyboard.press('Escape');
  assert.ok(await waitingRow.evaluate(element => element === document.activeElement));
  await page.locator('#bind-chat-session').focus();
  await page.getByRole('tooltip').waitFor();
  assert.equal(await page.getByRole('tooltip').textContent(), '绑定已有场景');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', { name: '绑定已有场景' }).waitFor();
  assert.ok(await page.getByLabel('场景 ID', { exact: true }).evaluate(element => element === document.activeElement));
  await page.screenshot({ path: `${output}/bind-dialog.png`, animations: "disabled" });
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#bind-chat-session').evaluate(element => element === document.activeElement));
  await page.getByLabel("预览数据", { exact: true }).selectOption("default");

  await page.getByRole("button", { name: "收起场景列表", exact: true }).click();
  assert.equal(await panel.count(), 0);
  await page.screenshot({ path: `${output}/collapsed.png`, animations: "disabled" });
  await page.keyboard.press('Tab');
  assert.ok(await page.locator('#chat-scene-details-trigger').evaluate(element => element === document.activeElement));
  await page.getByRole('tooltip').waitFor();
  await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('tooltip').count(), 0, 'Activating a hinted control dismisses its tooltip');
  await page.getByRole('dialog', { name: '场景信息' }).waitFor();
  await page.screenshot({ path: `${output}/details-dialog.png`, animations: "disabled" });
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#chat-scene-details-trigger').evaluate(element => element === document.activeElement));
  await page.getByRole("button", { name: "展开场景列表", exact: true }).click();
  await page.getByRole("button", { name: "切换到场景：一个安静的工作空间", exact: true }).click();
  assert.equal(await heading.textContent(), "一个安静的工作空间");

  await page.getByRole("button", { name: "新建场景", exact: false }).click();
  await page.screenshot({ path: `${output}/create-dialog.png`, animations: "disabled" });
  await page.getByRole("textbox", { name: "场景名称", exact: true }).fill("浏览器里的一次对话");
  await page.getByRole("button", { name: "创建并进入", exact: true }).click();
  await page.locator("#chat-session-editor").waitFor({ state: "hidden" });
  assert.equal(await heading.textContent(), "浏览器里的一次对话");

  await page.getByRole("button", { name: "切换到场景：浏览器里的一次对话", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "重命名", exact: true }).click();
  await page.screenshot({ path: `${output}/rename-inline.png`, animations: "disabled" });
  await page.getByRole("textbox", { name: "场景名称", exact: true }).fill("已经改名的对话");
  await page.locator(".chat-session-inline-editor input").press("Enter");
  await page.locator(".chat-session-inline-editor").waitFor({ state: "hidden" });
  assert.equal(await heading.textContent(), "已经改名的对话");

  await page.getByRole("button", { name: "切换到场景：已经改名的对话", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "删除场景", exact: true }).click();
  await page.screenshot({ path: `${output}/delete-dialog.png`, animations: "disabled" });
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await page.locator("#chat-session-delete").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".chat-session-row button[data-scene-id]").count(), 5);
  assert.equal(await heading.textContent(), "关于窗边那束光，以及一个很长很长还没有说完的故事");

  await page.getByLabel("显示全部场景上下文").check();
  assert.equal(await page.locator(".demo-eyebrow").textContent(), "全部场景上下文");
  await page.getByRole("button", { name: "绑定已有场景", exact: true }).click();
  await page.getByLabel("场景 ID", { exact: true }).fill("bound-demo-scene");
  await page.getByRole("textbox", { name: "场景名称", exact: true }).fill("绑定的对话");
  await page.getByRole("button", { name: "绑定并进入", exact: true }).click();
  await page.locator("#chat-session-editor").waitFor({ state: "hidden" });
  assert.equal(await heading.textContent(), "绑定的对话");

  await page.getByLabel("预览数据", { exact: true }).selectOption("long");
  await page.getByLabel("外观", { exact: true }).selectOption("dark");
  assert.equal(await page.locator(".chat-session-row button[data-scene-id]").count(), 40);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.ok(await page.locator(".chat-session-list").evaluate(element => element.scrollHeight > element.clientHeight));
  await page.getByRole("button", { name: "切换到场景：场景记录 35 · 留给下一次的想法", exact: true }).click();
  assert.equal(await heading.textContent(), "场景记录 35 · 留给下一次的想法");
  await page.screenshot({ path: `${output}/dark-long.png`, animations: "disabled" });

  await page.getByLabel("预览数据", { exact: true }).selectOption("empty");
  assert.equal(await page.locator(".chat-session-row button[data-scene-id]").count(), 0);
  assert.equal(await heading.textContent(), "还没有场景");
  await page.getByLabel("预览数据", { exact: true }).selectOption("disconnected");
  assert.ok(await page.locator("#new-chat-session").isDisabled());
  assert.ok(await page.locator(".chat-session-row button[data-scene-id]").first().isDisabled());

  await page.getByLabel("预览数据", { exact: true }).selectOption("default");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await panel.evaluate(element => getComputedStyle(element).animationName), "none");
  await page.locator(".chat-session-row button[data-scene-id]").first().focus();
  await page.keyboard.press("Escape");
  assert.equal(await panel.count(), 1, "Escape must not unpin a pinned sidebar");
  await page.getByRole("button", { name: "收起场景列表", exact: true }).click();
  assert.equal(await panel.count(), 0);
  await page.getByRole("button", { name: "重置预览", exact: true }).click();
  await panel.waitFor();
  assert.equal(await page.locator(".chat-session-row button[data-scene-id]").count(), 5);
  assert.equal(await heading.textContent(), "今天，慢慢来");
  await page.getByLabel("窗口示意", { exact: true }).selectOption("darwin");
  const iconBox = await page.locator("#chat-scene-indicator").boundingBox();
  const lightBox = await page.locator(".demo-traffic-lights").boundingBox();
  assert.equal(iconBox.y + iconBox.height / 2, lightBox.y + lightBox.height / 2);
  assert.equal(await page.locator(".demo-traffic-lights i").count(), 3);
  await page.getByLabel("外观", { exact: true }).selectOption("light");
  await page.screenshot({ path: `${output}/macos-layout.png`, animations: "disabled" });
  await page.getByLabel("右侧面板", { exact: true }).check();
  const geometry = await page.evaluate(() => {
    const box = selector => { const r=document.querySelector(selector).getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}; };
    return {stage:box('.workspace-stage'),sidebar:box('#chat-session-panel'),header:box('.topbar'),chat:box('#chat-view'),right:box('.demo-inspector')};
  });
  assert.equal(geometry.sidebar.y,geometry.stage.y,'Sidebar includes its top control band');
  assert.equal(geometry.sidebar.bottom,geometry.stage.bottom);
  assert.equal(geometry.header.x,geometry.sidebar.right,'Center header belongs to the center pane');
  assert.equal(geometry.chat.x,geometry.sidebar.right);
  assert.equal(geometry.chat.right,geometry.right.x);
  await page.screenshot({ path: `${output}/macos-three-panes.png`, animations: "disabled" });
  await page.getByLabel("窗口示意", { exact: true }).selectOption("win32");
  await page.screenshot({ path: `${output}/windows-three-panes.png`, animations: "disabled" });
  assert.equal(await page.locator('.demo-window-buttons i').count(),3);
  await page.getByLabel("右侧面板", { exact: true }).uncheck();
  await page.getByLabel("窗口示意", { exact: true }).selectOption("web");
  assert.equal(await page.locator(".demo-traffic-lights").count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(network, [], "Standalone demo must not require HTTP resources or APIs");
  console.log("Sidebar demo passed: file:// offline loading, shared component interactions, fixtures, themes, keyboard and reduced motion.");
} finally {
  await browser.close();
}
