import { buildComponentDemo } from "./build-component-demo.mjs";
await buildComponentDemo({ name: "scenes", title: "Being · 对话与小镇", command: "npm run build:scenes-demo", watch: process.argv.includes("--watch") });
