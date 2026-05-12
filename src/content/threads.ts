import type { PlatformConfig } from "@/lib/types";

console.debug("[auto-social] threads content script loaded");

let automationTimer: ReturnType<typeof setInterval> | null = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "START_AUTOMATION" && msg.config) {
    startAutomation(msg.config as PlatformConfig);
    sendResponse({ ok: true });
    return true;
  }

  if (msg?.type === "STOP_AUTOMATION") {
    stopAutomation();
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

function startAutomation(config: PlatformConfig) {
  console.debug("[auto-social] threads automation started", config);

  const delay = config.automations.reply.delay || 5000;

  automationTimer = setInterval(() => {
    if (config.automations.reply.enabled) {
      console.debug("[auto-social] threads: auto-reply triggered");
      // TODO: Find reply button, click, type message, send
    }
    if (config.automations.like.enabled) {
      console.debug("[auto-social] threads: auto-like triggered");
      // TODO: Click like button on visible post
    }
    if (config.automations.follow.enabled) {
      console.debug("[auto-social] threads: auto-follow triggered");
      // TODO: Click follow button
    }
  }, delay);
}

function stopAutomation() {
  if (automationTimer) {
    clearInterval(automationTimer);
    automationTimer = null;
    console.debug("[auto-social] threads automation stopped");
  }
}

export {};