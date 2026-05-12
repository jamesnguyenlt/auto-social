import type { PostDraft, PlatformConfig, PlatformId, AutomationState } from "./types";

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

  async getPlatformConfig(id: PlatformId): Promise<PlatformConfig> {
    const key = `config_${id}`;
    const r = await chrome.storage.local.get(key);
    return (r[key] as PlatformConfig) ?? {
      targets: { hashtags: [], users: [], threads: [], followHashtags: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, mode: "none", ratio: 1, maxPerSession: 20 },
        followMode: {
          enabled: false,
          hashtags: [],
          maxPerHashtag: 50,
          delayBetweenFollows: 2000,
          scrollDelay: 3000,
        },
      },
    };
  },

  async savePlatformConfig(id: PlatformId, config: PlatformConfig): Promise<void> {
    const key = `config_${id}`;
    await chrome.storage.local.set({ [key]: config });
  },

  async listPlatformConfigs(): Promise<Record<PlatformId, PlatformConfig>> {
    const ids: PlatformId[] = ["x", "instagram", "threads", "tiktok", "facebook"];
    const keys = ids.map((i) => `config_${i}`);
    const r = await chrome.storage.local.get(keys);
    const result: Record<PlatformId, PlatformConfig> = {} as any;
    ids.forEach((id) => {
      const key = `config_${id}`;
      result[id] = (r[key] as PlatformConfig) ?? {
        targets: { hashtags: [], users: [], threads: [], followHashtags: [] },
        automations: {
          reply: { enabled: false, delay: 5000 },
          like: { enabled: false, count: 10 },
          follow: { enabled: false, mode: "none", ratio: 1, maxPerSession: 20 },
          followMode: {
            enabled: false,
            hashtags: [],
            maxPerHashtag: 50,
            delayBetweenFollows: 2000,
            scrollDelay: 3000,
          },
        },
      };
    });
    return result;
  },

  async setBotState(id: PlatformId, state: AutomationState): Promise<void> {
    const key = `bot_${id}`;
    await chrome.storage.local.set({ [key]: state });
  },

  async getBotState(id: PlatformId): Promise<AutomationState> {
    const key = `bot_${id}`;
    const r = await chrome.storage.local.get(key);
    return (r[key] as AutomationState) ?? "idle";
  },

  async setBotStats(stats: { replies: number; likes: number; follows: number }) {
    await chrome.storage.local.set({ botStats: stats });
  },

  async getBotStats(): Promise<{ replies: number; likes: number; follows: number }> {
    const r = await chrome.storage.local.get("botStats");
    return r.botStats ?? { replies: 0, likes: 0, follows: 0 };
  },
};