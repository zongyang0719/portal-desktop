import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../test-results/sidebar-demo/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, colorScheme: "light" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(new URL("../demo/sidebar.html", import.meta.url).href);
  await page.getByLabel("预览数据", { exact: true }).selectOption("default");
  const panel = page.locator("#chat-session-panel");
  const trigger = page.locator("#chat-scene-indicator");
  const isOpen = () => panel.getAttribute("data-open");
  const waitOpen = async value => {
    try {
      await page.waitForFunction(value => document.querySelector("#chat-session-panel").dataset.open === String(value), value, { timeout: 5000 });
    } catch (error) {
      console.error("Sidebar state at timeout", await page.evaluate(() => ({
        state: { ...document.querySelector("#chat-session-panel").dataset },
        focused: document.hasFocus(), active: document.activeElement?.tagName,
        activeLabel: document.activeElement?.getAttribute("aria-label"),
        panelHover: document.querySelector("#chat-session-panel").matches(":hover"),
        triggerHover: document.querySelector("#chat-scene-indicator").matches(":hover"),
        dialogs: document.querySelectorAll("dialog[open]").length,
      })));
      throw error;
    }
  };
  const away = () => page.mouse.move(750, 400);
  const edge = () => page.mouse.move(4, 400);
  const openPeek = async () => { await away(); await edge(); await waitOpen(true); };
  const unpin = async () => {
    await trigger.click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector("#chat-view")).marginLeft === "0px");
    await waitOpen(false);
  };
  await trigger.waitFor();
  assert.equal(await trigger.getAttribute("aria-pressed"), "true");
  await unpin();
  assert.equal(await page.locator(".chat-sidebar-edge").evaluate(element => element.getBoundingClientRect().width), 8);
  assert.equal(await panel.evaluate(element => element.offsetWidth), 224);
  await page.waitForFunction(() => getComputedStyle(document.querySelector("#chat-session-panel")).visibility === "hidden");
  assert.equal(await panel.evaluate(element => element.inert), true);
  assert.equal(await panel.evaluate(element => getComputedStyle(element).boxShadow), "none");
  await trigger.focus();
  await page.keyboard.press("Tab");
  assert.equal(await panel.evaluate(element => element.contains(document.activeElement)), false, "Hidden tree must not enter the Tab order");
  // Tab can leave this document for the browser toolbar; explicitly reactivate it.
  await page.mouse.click(750, 400);
  assert.equal(await page.evaluate(() => document.hasFocus()), true);

  // A pass across the edge must not open it later.
  await edge();
  await page.waitForTimeout(80);
  assert.equal(await isOpen(), "false");
  await away();
  await page.waitForTimeout(350);
  assert.equal(await isOpen(), "false");

  // Record the whole hover cycle, not just before/after positions.
  await page.evaluate(() => {
    window.sidebarEvidence = { positions: [], pinWrites: [], openedAfter: null, start: performance.now(), recording: true };
    const panel = document.querySelector("#chat-session-panel");
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.attributeName === "data-pinned") window.sidebarEvidence.pinWrites.push(panel.dataset.pinned);
        if (record.attributeName === "data-open" && panel.dataset.open === "true") window.sidebarEvidence.openedAfter = performance.now() - window.sidebarEvidence.start;
      }
    });
    observer.observe(panel, { attributes: true, attributeFilter: ["data-pinned", "data-open"] });
    window.sidebarObserver = observer;
    const sample = () => {
      const rect = document.querySelector("#chat-view").getBoundingClientRect();
      const heading = document.querySelector("#chat-view h1").getBoundingClientRect();
      window.sidebarEvidence.positions.push([rect.x, rect.y, rect.width, rect.height, heading.x, heading.y]);
      if (window.sidebarEvidence.recording) requestAnimationFrame(sample);
    };
    sample();
  });
  await edge();
  await page.waitForTimeout(120);
  assert.equal(await isOpen(), "false");
  await waitOpen(true);
  assert.equal(await panel.getAttribute("data-peek"), "true");
  assert.equal(await trigger.getAttribute("aria-pressed"), "false");
  await page.mouse.move(130, 350);
  await page.waitForTimeout(350);
  assert.equal(await isOpen(), "true", "Crossing into the panel must keep it open");
  await page.screenshot({ path: `${output}/peek.png`, animations: "disabled" });
  await away();
  await page.waitForTimeout(100);
  assert.equal(await isOpen(), "true", "Leaving grants a close grace period");
  await page.mouse.move(130, 350);
  await page.waitForTimeout(350);
  assert.equal(await isOpen(), "true", "Re-entry cancels closing");
  await away();
  await waitOpen(false);
  const evidence = await page.evaluate(() => {
    window.sidebarEvidence.recording = false;
    window.sidebarObserver.disconnect();
    return window.sidebarEvidence;
  });
  assert.ok(evidence.positions.length > 20);
  assert.ok(evidence.openedAfter >= 300, `Opened too early: ${evidence.openedAfter}ms`);
  for (const position of evidence.positions) assert.deepEqual(position, evidence.positions[0], "Peek must never move or resize main content");
  assert.deepEqual(evidence.pinWrites, [], "Hover must not write pin state");
  await writeFile(`${output}/peek-evidence.json`, JSON.stringify(evidence, null, 2));

  // Escape is immediate and a stationary pointer cannot reopen the panel.
  await openPeek();
  await page.keyboard.press("Escape");
  assert.equal(await isOpen(), "false");
  assert.equal(await panel.evaluate(element => getComputedStyle(element).visibility), "hidden");
  await page.mouse.move(5, 400);
  await page.waitForTimeout(400);
  assert.equal(await isOpen(), "false");
  await openPeek();
  await page.locator('.chat-session-activity[data-status="working"]').hover();
  const hint = page.getByRole('tooltip');
  await hint.waitFor();
  assert.equal(await hint.textContent(), '执行中');
  const hintBox = await hint.boundingBox();
  await page.mouse.move(hintBox.x + hintBox.width - 3, hintBox.y + hintBox.height / 2);
  await page.waitForTimeout(350);
  assert.equal(await isOpen(), 'true', 'Moving onto the tooltip must retain peek');
  await page.screenshot({ path: `${output}/state-tooltip.png`, animations: "disabled" });
  await page.keyboard.press('Escape');
  assert.equal(await hint.count(), 0);
  assert.equal(await isOpen(), 'true', 'First Escape dismisses tooltip, not its containing peek');
  await away(); await waitOpen(false);
  await openPeek();
  // The sole pin control commits the current preview; Escape no longer unpins.
  await trigger.click();
  assert.equal(await panel.getAttribute("data-pinned"), "true");
  await away(); await page.waitForTimeout(350);
  await page.keyboard.press("Escape");
  assert.equal(await isOpen(), "true");
  await unpin();

  // Pointer presses, active text selection, touch and inactive documents do not summon it.
  await away(); await page.mouse.down(); await edge(); await page.waitForTimeout(350);
  assert.equal(await isOpen(), "false");
  await page.mouse.up(); await away();
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(".demo-message"));
    getSelection().removeAllRanges(); getSelection().addRange(range);
  });
  await edge(); await page.waitForTimeout(350); assert.equal(await isOpen(), "false");
  await page.evaluate(() => getSelection().removeAllRanges());
  await away();
  await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: 4, clientY: 400, bubbles: true })));
  await page.waitForTimeout(350); assert.equal(await isOpen(), "false");
  await page.evaluate(() => Object.defineProperty(document, "hasFocus", { configurable: true, value: () => false }));
  await edge(); await page.waitForTimeout(350); assert.equal(await isOpen(), "false");
  await page.evaluate(() => delete document.hasFocus);
  await openPeek();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(await isOpen(), "false");
  await page.mouse.move(5, 400); await page.waitForTimeout(350); assert.equal(await isOpen(), "false");

  // Keyboard and child menus extend the interactive region without changing pin.
  await openPeek();
  await trigger.focus(); await page.keyboard.press("Tab");
  assert.equal(await panel.evaluate(element => element.contains(document.activeElement)), true);
  await away(); await page.waitForTimeout(350); assert.equal(await isOpen(), "true");
  await page.getByRole("button", { name: "切换到场景：今天，慢慢来", exact: true }).click({ button: "right" });
  await away(); await page.waitForTimeout(350); assert.equal(await isOpen(), "true");
  await page.getByRole("menuitem", { name: "重命名", exact: true }).click();
  await away(); await page.waitForTimeout(350); assert.equal(await isOpen(), "true");
  await page.getByRole("textbox", { name: "场景名称", exact: true }).fill("保留编辑中的浮层");
  await page.locator(".chat-session-inline-editor input").press("Enter");
  await page.locator(".chat-session-inline-editor").waitFor({ state: "hidden" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await waitOpen(false);

  // Same mounted list retains its scroll position across peek cycles.
  await page.getByLabel("预览数据", { exact: true }).selectOption("long");
  const list = page.locator(".chat-session-list");
  await list.evaluate(element => { element.scrollTop = 450; });
  const scroll = await list.evaluate(element => element.scrollTop);
  await unpin(); await openPeek();
  assert.equal(await list.evaluate(element => element.scrollTop), scroll);
  await page.getByLabel("外观", { exact: true }).selectOption("dark");
  await away(); await waitOpen(false); await openPeek();
  await page.screenshot({ path: `${output}/peek-dark.png`, animations: "disabled" });
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPeek();
  assert.equal(await panel.evaluate(element => getComputedStyle(element).transitionDuration), "0s");
  await page.keyboard.press("Escape");
  await trigger.focus(); await page.keyboard.press("Enter");
  assert.equal(await panel.getAttribute("data-pinned"), "true");
  assert.equal(await panel.evaluate(element => getComputedStyle(element).transitionDuration), "0s");
  // The real desktop chat is an iframe: an edge that only observes the parent
  // document cannot receive pointermove events over that embedded document.
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.id = "fixture-frame";
    frame.srcdoc = '<button style="margin:200px">模拟聊天内容</button>';
    frame.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0";
    document.querySelector("#chat-view").append(frame);
  });
  await unpin(); await openPeek();
  await page.mouse.move(130, 350);
  await away(); await waitOpen(false);
  assert.deepEqual(errors, []);
  console.log(`Sidebar peek passed: ${evidence.positions.length} identical layout frames, no pin writes, delays, re-entry, dismissal, input guards, keyboard, menus and retained scroll.`);
} finally {
  await browser.close();
}
