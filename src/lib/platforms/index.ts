import type { PlatformAdapter, PlatformId } from "../types";
import { x } from "./x";
import { instagram } from "./instagram";
import { threads } from "./threads";
import { tiktok } from "./tiktok";
import { facebook } from "./facebook";

export const adapters: Record<PlatformId, PlatformAdapter> = {
  x,
  instagram,
  threads,
  tiktok,
  facebook,
};

export const allPlatforms: PlatformAdapter[] = Object.values(adapters);
