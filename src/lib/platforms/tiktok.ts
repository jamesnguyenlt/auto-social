import type { PlatformAdapter, PostDraft } from "../types";

export const tiktok: PlatformAdapter = {
  meta: {
    id: "tiktok",
    label: "TikTok",
    supportsText: false,
    supportsImage: true,
    supportsVideo: true,
    composeUrl: "https://www.tiktok.com/upload",
  },
  async openCompose(_draft: PostDraft) {
    await chrome.tabs.create({ url: "https://www.tiktok.com/upload" });
  },
};
