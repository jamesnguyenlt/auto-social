import type { PlatformAdapter, PostDraft } from "../types";

export const facebook: PlatformAdapter = {
  meta: {
    id: "facebook",
    label: "Facebook",
    supportsText: true,
    supportsImage: true,
    supportsVideo: true,
    composeUrl: "https://www.facebook.com/sharer/sharer.php",
  },
  async openCompose(draft: PostDraft) {
    const url = new URL("https://www.facebook.com/sharer/sharer.php");
    if (draft.text) url.searchParams.set("quote", draft.text);
    url.searchParams.set("u", "https://www.facebook.com");
    await chrome.tabs.create({ url: url.toString() });
  },
};
