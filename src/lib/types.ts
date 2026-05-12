export type PlatformId = "x" | "instagram" | "threads" | "tiktok" | "facebook";

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  supportsText: boolean;
  supportsImage: boolean;
  supportsVideo: boolean;
  composeUrl?: string;
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
