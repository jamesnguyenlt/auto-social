import type { PlatformAdapter, PostDraft } from "../types";

export const instagram: PlatformAdapter = {
  meta: {
    id: "instagram",
    label: "Instagram",
    supportsText: false,
    supportsImage: true,
    supportsVideo: true,
  },
  async openCompose(draft: PostDraft) {
    const tab = await chrome.tabs.create({ url: "https://www.instagram.com/" });
    if (!tab.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_COMPOSE", draft }).catch(() => {});
  },
};
