import { adapters } from "@/lib/platforms";
import { storage } from "@/lib/storage";
import type { PostDraft, PlatformId } from "@/lib/types";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[auto-social] installed");
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "OPEN_COMPOSE_ALL") {
    handleOpenComposeAll(msg.draft as PostDraft).then(
      (r) => sendResponse({ ok: true, result: r }),
      (e) => sendResponse({ ok: false, error: String(e) }),
    );
    return true;
  }

  if (msg?.type === "START_BOT" && msg.platformId) {
    const platformId = msg.platformId as PlatformId;
    storage.getPlatformConfig(platformId).then((config) => {
      const host = getPlatformHost(platformId);
      chrome.tabs.query({ url: host }, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "START_AUTOMATION", config });
        }
        storage.setBotState(platformId, "running").then(() => sendResponse({ ok: true }));
      });
    });
    return true;
  }

  if (msg?.type === "STOP_BOT" && msg.platformId) {
    const platformId = msg.platformId as PlatformId;
    const host = getPlatformHost(platformId);
    chrome.tabs.query({ url: host }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "STOP_AUTOMATION" });
      }
      storage.setBotState(platformId, "idle").then(() => sendResponse({ ok: true }));
    });
    return true;
  }

  return false;
});

async function handleOpenComposeAll(draft: PostDraft) {
  const results: Record<PlatformId, "opened" | "error"> = {} as Record<PlatformId, "opened" | "error">;
  for (const target of draft.targets) {
    const adapter = adapters[target];
    if (!adapter) continue;
    try {
      await adapter.openCompose(draft);
      results[target] = "opened";
    } catch (err) {
      console.error(`[auto-social] ${target} compose failed`, err);
      results[target] = "error";
    }
  }
  return results;
}

function getPlatformHost(platformId: PlatformId): string {
  switch (platformId) {
    case "x": return "*://x.com/*";
    case "instagram": return "*://www.instagram.com/*";
    case "threads": return "*://www.threads.net/*";
    case "tiktok": return "*://www.tiktok.com/*";
    case "facebook": return "*://www.facebook.com/*";
    default: return "*://*/*";
  }
}