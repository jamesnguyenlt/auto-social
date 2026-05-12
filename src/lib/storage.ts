import type { PostDraft } from "./types";

const KEY_DRAFTS = "drafts";

export const storage = {
  async listDrafts(): Promise<PostDraft[]> {
    const r = await chrome.storage.local.get(KEY_DRAFTS);
    return (r[KEY_DRAFTS] as PostDraft[] | undefined) ?? [];
  },
  async saveDraft(draft: PostDraft): Promise<void> {
    const drafts = await this.listDrafts();
    const idx = drafts.findIndex((d) => d.id === draft.id);
    if (idx === -1) drafts.unshift(draft);
    else drafts[idx] = draft;
    await chrome.storage.local.set({ [KEY_DRAFTS]: drafts });
  },
  async deleteDraft(id: string): Promise<void> {
    const drafts = await this.listDrafts();
    await chrome.storage.local.set({ [KEY_DRAFTS]: drafts.filter((d) => d.id !== id) });
  },
};
