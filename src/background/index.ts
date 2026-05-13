import { adapters } from "@/lib/platforms";
import { storage } from "@/lib/storage";
import type { PostDraft, PlatformId, PlatformConfig } from "@/lib/types";

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
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "START_AUTOMATION", config });
} else {
            const searchPath = getSearchPath(platformId, config);
            chrome.tabs.create({ url: searchPath }, (newTab) => {
              if (newTab.id !== undefined) {
                const tabId = newTab.id;
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabId, { type: "START_AUTOMATION", config });
                }, 3000);
              }
            });
          }
        storage.setBotState(platformId, "running").then(() => sendResponse({ ok: true }));
      });
    });
    return true;
  }

  if (msg?.type === "START_FOLLOW_MODE" && msg.platformId) {
    const platformId = msg.platformId as PlatformId;
    const config = msg.config as PlatformConfig;
    const followMode = config?.automations?.followMode;
    const searchUrl = buildFollowModeUrl(followMode);
    // Save config first, then also write pendingFollowMode, THEN create a new tab.
    // This ensures the content script on the new page can always find the state.
    storage.savePlatformConfig(platformId, config).then(() => {
      chrome.storage.local.set({ pendingFollowMode: followMode }, () => {
        console.log('[auto-social] pendingFollowMode written to storage', followMode);
        // Always create a new tab to ensure fresh start with clean state
        chrome.tabs.create({ url: searchUrl }, (newTab) => {
          if (newTab.id !== undefined) {
            console.log('[auto-social] Created new tab for follow mode:', newTab.id);
          }
          storage.setBotState(platformId, "running").then(() => sendResponse({ ok: true }));
        });
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
    });
    chrome.storage.local.remove(['followModeState', 'pendingFollowMode']);
    storage.setBotState(platformId, "idle").then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg?.type === "UPDATE_STATS") {
    storage.setBotStats(msg.stats).then(() => sendResponse({ ok: true }));
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
    case "threads": return "*://*.threads.com/*";
    case "tiktok": return "*://www.tiktok.com/*";
    case "facebook": return "*://www.facebook.com/*";
    default: return "*://*/*";
  }
}

function getSearchPath(platformId: PlatformId, config: any): string {
  if (platformId === "threads") {
    const followMode = config?.automations?.followMode;
    return buildFollowModeUrl(followMode);
  }
  return adapters[platformId]?.meta.composeUrl || "https://www.threads.com";
}

function buildFollowModeUrl(followMode: any): string {
  const base = "https://www.threads.com";
  const targetType = followMode?.targetType || 'hashtags';
  if (targetType === 'keywords') {
    const keywords = followMode?.searchKeywords || [];
    const first = keywords[0]?.trim() || 'AI';
    return `${base}/search?q=${encodeURIComponent(first)}&serp_type=top`;
  }
  if (targetType === 'profile') {
    const username = (followMode?.profileUsername || '').replace('@', '').trim() || 'username';
    const listType = followMode?.profileListType || 'followers';
    return listType === 'following'
      ? `${base}/@${encodeURIComponent(username)}?following=1`
      : `${base}/@${encodeURIComponent(username)}?lg=1`;
  }
  const hashtags = followMode?.hashtags || [];
  const first = (hashtags[0] || 'AI').replace('#', '');
  return `${base}/search?q=%23${encodeURIComponent(first)}&serp_type=tags`;
}