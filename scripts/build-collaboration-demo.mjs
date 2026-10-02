import { buildComponentDemo } from "./build-component-demo.mjs";
await buildComponentDemo({ name: "collaboration", title: "Being · 三栏协作预览", command: "npm run build:collaboration-demo", watch: process.argv.includes("--watch") });
