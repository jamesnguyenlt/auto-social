import type { PlatformAdapter, PostDraft } from "../types";

export const threads: PlatformAdapter = {
  meta: {
    id: "threads",
    label: "Threads",
    supportsText: true,
    supportsImage: true,
    supportsVideo: true,
    composeUrl: "https://www.threads.net/intent/post",
  },
  async openCompose(draft: PostDraft) {
    const url = new URL("https://www.threads.net/intent/post");
    if (draft.text) url.searchParams.set("text", draft.text);
    await chrome.tabs.create({ url: url.toString() });
  },
};
