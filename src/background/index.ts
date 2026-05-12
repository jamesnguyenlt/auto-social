import { adapters } from "@/lib/platforms";
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
