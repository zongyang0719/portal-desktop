import { buildComponentDemo } from "./build-component-demo.mjs";

await buildComponentDemo({ name: "workspace", title: "Being · 工作台组件预览", command: "npm run build:workspace-demo", watch: process.argv.includes("--watch") });
