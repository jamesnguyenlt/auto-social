import type { PlatformConfig } from "@/lib/types";

console.debug("[auto-social] threads content script loaded");

let automationTimer: ReturnType<typeof setInterval> | null = null;
let followSession = {
  totalFollowed: 0,
  followedThisHashtag: 0,
  currentHashtag: "",
  logs: [] as string[],
};

function log(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${msg}`;
  followSession.logs.unshift(entry);
  if (followSession.logs.length > 50) followSession.logs.pop();
  console.debug("[auto-social] threads:", msg);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "START_AUTOMATION" && msg.config) {
    startAutomation(msg.config as PlatformConfig);
    sendResponse({ ok: true });
    return true;
  }

  if (msg?.type === "STOP_AUTOMATION") {
    stopAutomation();
    sendResponse({ ok: true });
    return true;
  }

  if (msg?.type === "GET_LOGS") {
    sendResponse({ logs: followSession.logs });
    return true;
  }

  if (msg?.type === "START_FOLLOW_MODE") {
    const config = msg.config as PlatformConfig;
    const hashtags = msg.hashtags || config.automations?.followMode?.hashtags || config.targets?.followHashtags || [];
    startFollowMode(hashtags, config.automations?.followMode);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

function startAutomation(config: PlatformConfig) {
  log("Automation started");
  log(`Config: ${JSON.stringify(config.automations)}`);

  const followMode = config.automations?.followMode;
  if (followMode?.enabled && (followMode.hashtags?.length || 0) > 0) {
    startFollowMode(followMode.hashtags || [], followMode);
    return;
  }

  const delay = config.automations?.reply?.delay || 5000;
  automationTimer = setInterval(() => {
    if (config.automations?.reply?.enabled) {
      log("Auto-reply triggered");
    }
    if (config.automations?.like?.enabled) {
      log("Auto-like triggered");
      simulateLike();
    }
    if (config.automations?.follow?.enabled) {
      log("Auto-follow triggered");
      simulateFollow();
    }
  }, delay);
}

function startFollowMode(hashtags: string[], opts: any) {
  log(`Follow Mode STARTED for hashtags: ${hashtags.join(", ")}`);
  followSession = {
    totalFollowed: 0,
    followedThisHashtag: 0,
    currentHashtag: "",
    logs: [],
  };

  const maxPerHashtag = opts?.maxPerHashtag || 50;
  const delayBetweenFollows = opts?.delayBetweenFollows || 2000;
  const scrollDelay = opts?.scrollDelay || 3000;

  if (hashtags.length > 0) {
    const firstHashtag = hashtags[0].replace("#", "");
    const searchUrl = `https://www.threads.com/search?q=%23${encodeURIComponent(firstHashtag)}&serp_type=tags`;
    followSession.currentHashtag = firstHashtag;
    log(`Navigating to: ${searchUrl}`);
    window.location.href = searchUrl;
  }

  const followLoop = setInterval(() => {
    const maxTotal = maxPerHashtag * hashtags.length;
    if (followSession.totalFollowed >= maxTotal) {
      log("Follow session complete - max reached");
      clearInterval(followLoop);
      stopAutomation();
      return;
    }

    const followButtons = document.querySelectorAll('[role="button"]');
    let followed = 0;

    followButtons.forEach((btn) => {
      const text = (btn as HTMLElement).innerText?.trim().toLowerCase() || "";
      const isFollowing = text === "following" || text === "requested";
      const isFollow = text === "follow";

      if (isFollow && !isFollowing) {
        const parent = btn.closest('[role="button"], article, div');
        if (parent && !parent.hasAttribute("data-followed")) {
          parent.setAttribute("data-followed", "true");
          (btn as HTMLElement).click();
          followed++;
          followSession.totalFollowed++;
          followSession.followedThisHashtag++;
          log(`Followed user (${followSession.totalFollowed}): ${text}`);

          chrome.runtime.sendMessage({
            type: "UPDATE_STATS",
            stats: { replies: 0, likes: 0, follows: followSession.totalFollowed },
          });
        }
      }
    });

    window.scrollBy(0, 500);
    log(`Scrolled, followed ${followed} users. Total: ${followSession.totalFollowed}`);

  }, delayBetweenFollows + scrollDelay);

  automationTimer = followLoop;
}

function simulateLike() {
  const likeButtons = document.querySelectorAll('[role="button"]');
  likeButtons.forEach((btn) => {
    const text = (btn as HTMLElement).innerText?.trim() || "";
    if (text.includes("like") || text.includes("♥")) {
      (btn as HTMLElement).click();
    }
  });
}

function simulateFollow() {
  const followButtons = document.querySelectorAll('[role="button"]');
  followButtons.forEach((btn) => {
    const text = (btn as HTMLElement).innerText?.trim().toLowerCase() || "";
    if (text === "follow") {
      (btn as HTMLElement).click();
    }
  });
}

function stopAutomation() {
  if (automationTimer) {
    clearInterval(automationTimer);
    automationTimer = null;
    log(`Automation STOPPED. Total follows: ${followSession.totalFollowed}`);
  }
}

export {};