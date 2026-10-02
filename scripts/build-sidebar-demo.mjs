import { buildComponentDemo } from "./build-component-demo.mjs";

await buildComponentDemo({ name: "sidebar", title: "Portal · Sidebar 预览", command: "npm run build:demo", watch: process.argv.includes("--watch") });
