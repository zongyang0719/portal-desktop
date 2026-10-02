import { mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const output = path.resolve("desktop/generated");
await mkdir(output, { recursive: true });
// All chat UI is compiled from React; the HTML file is only its document entry.
await build({
  entryPoints: ["desktop/renderer/chat/main.tsx"],
  bundle: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  minify: true,
  outfile: path.join(output, "chat.js"),
});
// Keep CSS imported by shared React components when adding the legacy chat stylesheet.
const componentStyles = await readFile(path.join(output, "chat.css"), "utf8");
await copyFile("loom.html", path.join(output, "loom.html"));
// Remove the retired DOM adapters from development and packaged public assets.
for (const asset of [
  "loom.css",
  "vendor.js",
  "chat-index.js",
  "chat-activity.js",
  "chat-scene.js",
])
  await rm(path.join(output, asset), { force: true });
await writeFile(
  path.join(output, "highlight.css"),
  `.hljs{color:var(--text)}
.hljs-comment,.hljs-quote{color:var(--text-muted);font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-section{color:var(--text);font-weight:600}
.hljs-string,.hljs-attr,.hljs-template-variable{color:var(--text-dim)}
.hljs-title,.hljs-number,.hljs-built_in,.hljs-type,.hljs-meta{color:var(--text-dim)}
.hljs-addition,.hljs-deletion{color:var(--text);background:var(--surface-tint)}\n`,
);
await writeFile(path.join(output, "chat.css"),
  await readFile("desktop/renderer/chat/styles.css", "utf8") + "\n" +
  await readFile("desktop/renderer/shared/model-settings.css", "utf8") + "\n" +
  await readFile("desktop/renderer/shared/activity.css", "utf8") + "\n" + componentStyles);
const notices = [];
for (const [name, file] of [
  ["marked", "LICENSE.md"],
  ["highlight.js", "LICENSE"],
  ["react", "LICENSE"],
  ["react-dom", "LICENSE"],
  ["scheduler", "LICENSE"],
  ["@codemirror/state", "LICENSE"],
  ["@codemirror/view", "LICENSE"],
  ["@codemirror/commands", "LICENSE"],
  ["@codemirror/language", "LICENSE"],
  ["@lezer/common", "LICENSE"],
  ["@lezer/highlight", "LICENSE"],
  ["@lezer/lr", "LICENSE"],
  ["lucide-react", "LICENSE"],
]) {
  notices.push(
    `${name}\n${await readFile(path.join("node_modules", name, file), "utf8")}`,
  );
}
await writeFile(
  path.join(output, "THIRD-PARTY-LICENSES.txt"),
  notices.join("\n\n---\n\n"),
);
console.log("Built React chat assets in desktop/generated.");
await build({
  entryPoints: ["desktop/renderer/chat/client-context.ts"], bundle: true,
  format: "iife", platform: "browser", minify: true,
  outfile: path.join(output, "client-context.js"),
});
await writeFile(path.join(output, "client-context.html"), '<!doctype html><meta charset="utf-8"><script src="client-context.js"></script>');

// Match the chat iframe's top-level site so Chromium uses the same storage key.
await writeFile(path.join(output, "client-context-host.html"), '<!doctype html><meta charset="utf-8"><iframe src="beings://chat/client-context.html"></iframe>');
