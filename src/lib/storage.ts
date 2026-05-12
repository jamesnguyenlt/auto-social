import type { PostDraft, PlatformConfig, PlatformId, AutomationState, FollowModeConfig } from "./types";

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
    return (r[key] as PlatformConfig) ?? this.defaultConfig();
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
      result[id] = (r[key] as PlatformConfig | undefined) ?? this.defaultConfig();
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

  async setFollowModeState(state: FollowModeState | null): Promise<void> {
    if (state === null) {
      await chrome.storage.local.remove("followModeState");
    } else {
      await chrome.storage.local.set({ followModeState: state });
    }
  },

  async getFollowModeState(): Promise<FollowModeState | null> {
    const r = await chrome.storage.local.get("followModeState");
    return (r.followModeState as FollowModeState | undefined) ?? null;
  },

  defaultConfig(): PlatformConfig {
    return {
      targets: { hashtags: [], users: [], threads: [], searchKeywords: [], profileFollowers: [], profileFollowing: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, mode: "none", ratio: 1, maxPerSession: 20 },
        followMode: {
          enabled: false,
          targetType: 'hashtags',
          profileListType: 'followers',
          hashtags: [],
          searchKeywords: [],
          profileUsername: '',
          maxPerTarget: 50,
          delayBetweenFollows: 2000,
          scrollDelay: 3000,
        } as FollowModeConfig,
      },
    };
  },
};

export interface FollowModeState {
  active: boolean;
  mode: 'hashtags' | 'keywords' | 'profile';
  profileListType: 'followers' | 'following';
  targets: string[];
  profileUsername: string;
  opts: FollowModeConfig;
  followedThisTarget: number;
  totalFollowed: number;
  targetIndex: number;
  pageUrl: string;
}