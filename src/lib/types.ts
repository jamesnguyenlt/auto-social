export type PlatformId = "x" | "instagram" | "threads" | "tiktok" | "facebook";

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  supportsText: boolean;
  supportsImage: boolean;
  supportsVideo: boolean;
  composeUrl?: string;
  searchUrl?: string;
}

export type PostStatus = "draft" | "queued" | "opened" | "posted" | "skipped";

export interface PostDraft {
  id: string;
  text: string;
  mediaDataUrls: string[];
  targets: PlatformId[];
  createdAt: number;
  scheduledAt?: number;
  status: PostStatus;
  notes?: string;
}

export interface PlatformAdapter {
  meta: PlatformMeta;
  openCompose(draft: PostDraft): Promise<void>;
}

export interface Targets {
  hashtags: string[];
  users: string[];
  threads: string[];
  searchKeywords: string[];
  profileFollowers: string[];
  profileFollowing: string[];
}

export interface ReplyConfig {
  enabled: boolean;
  delay: number;
}

export interface LikeConfig {
  enabled: boolean;
  count: number;
}

export interface FollowConfig {
  enabled: boolean;
  mode: "none" | "follow" | "follow-unfollow";
  ratio: number;
  maxPerSession: number;
}

export interface FollowModeConfig {
  enabled: boolean;
  targetType: 'hashtags' | 'keywords' | 'profile';
  profileListType: 'followers' | 'following';
  hashtags: string[];
  searchKeywords: string[];
  profileUsername: string;
  maxPerTarget: number;
  delayBetweenFollows: number;
  scrollDelay: number;
}

export interface AutomationConfig {
  reply: ReplyConfig;
  like: LikeConfig;
  follow: FollowConfig;
  followMode: FollowModeConfig;
}

export interface PlatformConfig {
  targets: Targets;
  automations: AutomationConfig;
}

export type AutomationState = "idle" | "running" | "paused" | "error";

export interface GlobalState {
  platformConfigs: Record<PlatformId, PlatformConfig>;
  sharedTargetsEnabled: boolean;
  panelState: "expanded" | "collapsed";
  botStates: Record<PlatformId, AutomationState>;
}