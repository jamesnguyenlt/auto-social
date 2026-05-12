import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Auto-Social Manager",
  version: pkg.version,
  description: pkg.description,
  action: { default_popup: "src/popup/index.html", default_title: "Auto-Social" },
  options_page: "src/options/index.html",
  side_panel: { default_path: "src/sidepanel/index.html" },
  background: { service_worker: "src/background/index.ts", type: "module" },
  permissions: ["storage", "tabs", "sidePanel", "scripting"],
  host_permissions: [
    "https://x.com/*",
    "https://twitter.com/*",
    "https://www.instagram.com/*",
    "https://www.threads.net/*",
    "https://threads.net/*",
    "https://www.tiktok.com/*",
    "https://www.facebook.com/*",
    "https://m.facebook.com/*",
  ],
  content_scripts: [
    { matches: ["https://x.com/*", "https://twitter.com/*"], js: ["src/content/x.ts"], run_at: "document_idle" },
    { matches: ["https://www.instagram.com/*"], js: ["src/content/instagram.ts"], run_at: "document_idle" },
    { matches: ["https://www.threads.net/*", "https://threads.net/*"], js: ["src/content/threads.ts"], run_at: "document_idle" },
    { matches: ["https://www.tiktok.com/*"], js: ["src/content/tiktok.ts"], run_at: "document_idle" },
    { matches: ["https://www.facebook.com/*", "https://m.facebook.com/*"], js: ["src/content/facebook.ts"], run_at: "document_idle" },
  ],
  icons: { 16: "src/assets/icon-16.png", 48: "src/assets/icon-48.png", 128: "src/assets/icon-128.png" },
});
