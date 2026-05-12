import type { PlatformAdapter, PostDraft } from "../types";

export const x: PlatformAdapter = {
  meta: {
    id: "x",
    label: "X (Twitter)",
    supportsText: true,
    supportsImage: true,
    supportsVideo: true,
    composeUrl: "https://x.com/intent/post",
  },
  async openCompose(draft: PostDraft) {
    const url = new URL("https://x.com/intent/post");
    if (draft.text) url.searchParams.set("text", draft.text);
    await chrome.tabs.create({ url: url.toString() });
  },
};
