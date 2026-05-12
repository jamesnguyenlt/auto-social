import type { PlatformConfig, FollowModeConfig } from "@/lib/types";
import type { FollowModeState } from "@/lib/storage";

console.debug("[auto-social] threads content script loaded");

let automationTimer: ReturnType<typeof setInterval> | null = null;
let currentOpts: any = null;

let followSession = {
  totalFollowed: 0,
  followedThisTarget: 0,
  currentTarget: "",
  targetIndex: 0,
  mode: "idle" as "idle" | "hashtags" | "keywords" | "profile",
  profileListType: "followers" as "followers" | "following",
  targets: [] as string[],
  logs: [] as string[],
};

const MAX_LOG = 50;

function log(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = `[${timestamp}] ${msg}`;
  followSession.logs.unshift(entry);
  if (followSession.logs.length > MAX_LOG) followSession.logs.pop();
  console.debug("[auto-social] threads:", msg);
  syncStateToStorage();
}

function syncStateToStorage() {
  const state: FollowModeState = {
    active: followSession.mode !== 'idle' && !!automationTimer,
    mode: followSession.mode as 'hashtags' | 'keywords' | 'profile',
    profileListType: followSession.profileListType,
    targets: followSession.targets,
    profileUsername: currentOpts?.profileUsername || '',
    opts: currentOpts as FollowModeConfig,
    followedThisTarget: followSession.followedThisTarget,
    totalFollowed: followSession.totalFollowed,
    targetIndex: followSession.targetIndex,
    pageUrl: window.location.href,
  };
  chrome.storage.local.set({ followModeState: state });
}

function clearStorageState() {
  chrome.storage.local.remove("followModeState");
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

  if (msg?.type === "GET_STATS") {
    sendResponse({
      totalFollowed: followSession.totalFollowed,
      followedThisTarget: followSession.followedThisTarget,
      mode: followSession.mode,
      active: followSession.mode !== 'idle' && !!automationTimer,
      currentTarget: followSession.currentTarget,
      targetIndex: followSession.targetIndex,
    });
    return true;
  }

  if (msg?.type === "START_FOLLOW_MODE") {
    const config = msg.config as PlatformConfig;
    startFollowMode(config.automations?.followMode);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

function startAutomation(config: PlatformConfig) {
  log("Automation started");
  const followMode = config.automations?.followMode;
  if (followMode?.enabled) {
    startFollowMode(followMode);
    return;
  }
  const delay = config.automations?.reply?.delay || 5000;
  automationTimer = setInterval(() => {
    if (config.automations?.reply?.enabled) log("Auto-reply triggered");
    if (config.automations?.like?.enabled) simulateLike();
    if (config.automations?.follow?.enabled) simulateFollow();
  }, delay);
}

function startFollowMode(opts: FollowModeConfig) {
  currentOpts = opts;
  const targetType = opts?.targetType || 'hashtags';
  log(`Follow Mode STARTED — type: ${targetType}`);

  if (targetType === 'profile') {
    const username = (opts?.profileUsername || '').replace('@', '').trim();
    if (!username) {
      log("ERROR: No username provided for profile target");
      return;
    }
    log(`Profile mode — @${username}, list: ${opts?.profileListType || 'followers'}`);
    followSession = {
      totalFollowed: 0,
      followedThisTarget: 0,
      currentTarget: username,
      targetIndex: 0,
      mode: 'profile',
      profileListType: opts?.profileListType || 'followers',
      targets: [username],
      logs: [],
    };
    syncStateToStorage();

    const listType = opts?.profileListType || 'followers';
    const profileUrl = `https://www.threads.net/@${encodeURIComponent(username)}${listType === 'following' ? '?following=1' : '?lg=1'}`;
    log(`Navigating to: ${profileUrl}`);
    window.location.href = profileUrl;
    return;
  }

  const targets = targetType === 'keywords'
    ? (opts?.searchKeywords || []).filter((k: string) => k.trim().length > 0)
    : (opts?.hashtags || []).map((h: string) => h.replace('#', '')).filter((h: string) => h.length > 0);

  if (targets.length === 0) {
    log("ERROR: No targets provided");
    return;
  }

  followSession = {
    totalFollowed: 0,
    followedThisTarget: 0,
    currentTarget: targets[0],
    targetIndex: 0,
    mode: targetType as 'hashtags' | 'keywords',
    profileListType: 'followers',
    targets,
    logs: [],
  };
  syncStateToStorage();

  const firstTarget = targets[0];
  const searchUrl = targetType === 'hashtags'
    ? `https://www.threads.net/search?q=%23${encodeURIComponent(firstTarget)}&serp_type=tags`
    : `https://www.threads.net/search?q=${encodeURIComponent(firstTarget)}&serp_type=top`;

  log(`Navigating to: ${searchUrl}`);
  window.location.href = searchUrl;
}

function isOnTargetPage(): boolean {
  const url = window.location.href;
  if (followSession.mode === 'profile') return url.includes('threads.net/@');
  if (followSession.mode === 'hashtags' || followSession.mode === 'keywords') return url.includes('threads.net/search');
  return false;
}

function getNextTarget(): string | null {
  const nextIndex = followSession.targetIndex + 1;
  if (nextIndex >= followSession.targets.length) return null;
  return followSession.targets[nextIndex];
}

function getNextUrl(target: string): string {
  if (followSession.mode === 'profile') {
    const username = target.replace('@', '');
    const listType = followSession.profileListType;
    return `https://www.threads.net/@${encodeURIComponent(username)}${listType === 'following' ? '?following=1' : '?lg=1'}`;
  }
  if (followSession.mode === 'hashtags') {
    return `https://www.threads.net/search?q=%23${encodeURIComponent(target)}&serp_type=tags`;
  }
  return `https://www.threads.net/search?q=${encodeURIComponent(target)}&serp_type=top`;
}

const FOLLOW_LABELS = [
  'follow', 'theo dõi', 'seguir', 'siguiente', 'follow back',
  '追随', 'theo'
];

function isFollowButton(btn: Element): boolean {
  const aria = (btn as HTMLElement).getAttribute('aria-label') || '';
  const lower = aria.toLowerCase().trim();
  if (lower === 'avatar' || lower === 'like' || lower === 'thích' ||
      lower === 'reply' || lower === 'trả lời' || lower === 'share' ||
      lower === 'repost' || lower === 'đăng lại' || lower === 'bookmark' ||
      lower === 'save' || lower === 'more' || lower === 'xem thêm') return false;
  return FOLLOW_LABELS.some(l => lower === l || lower.includes(l));
}

function runFollowCycle() {
  if (!isOnTargetPage()) {
    log('SKIP: not on target page');
    return;
  }

  const opts = currentOpts || {};
  const maxPerTarget = opts?.maxPerTarget || 50;

  log(`--- CYCLE ---`);
  log(`URL: ${window.location.href.replace('https://www.threads.net', '').slice(0, 50)}`);
  log(`Progress: ${followSession.followedThisTarget}/${maxPerTarget} this target | ${followSession.totalFollowed} total`);

  const allBtns = document.querySelectorAll('[role="button"]');
  log(`Total [role=button] elements: ${allBtns.length}`);

  const candidates = Array.from(allBtns).filter(isFollowButton);
  log(`Follow candidates: ${candidates.length}`);
  if (candidates.length > 0 && candidates.length <= 10) {
    candidates.forEach((btn, i) => {
      const aria = btn.getAttribute('aria-label') || '';
      const txt = (btn as HTMLElement).innerText?.trim() || '';
      log(`  [${i+1}] aria="${aria}" text="${txt}"`);
    });
  }

  if (followSession.followedThisTarget >= maxPerTarget) {
    const nextTarget = getNextTarget();
    if (nextTarget) {
      followSession.targetIndex++;
      followSession.currentTarget = nextTarget;
      followSession.followedThisTarget = 0;
      log(`Target complete — moving to: ${nextTarget}`);
      window.location.href = getNextUrl(nextTarget);
    } else {
      log("DONE: All targets exhausted");
      stopAutomation();
    }
    return;
  }

  let followed = 0;
  let skippedAlready = 0;
  let skippedParent = 0;

  for (const btn of candidates) {
    if (followSession.followedThisTarget >= maxPerTarget) break;

    const parent = btn.closest('[data-pressable-container="true"], article, [role="article"]');
    if (parent && parent.hasAttribute('data-auto-followed')) {
      skippedParent++;
      continue;
    }

    const innerText = (btn as HTMLElement).innerText?.trim().toLowerCase() || '';
    if (innerText === 'following' || innerText === 'requested') {
      skippedAlready++;
      continue;
    }

    if (parent) parent.setAttribute('data-auto-followed', 'true');
    (btn as HTMLElement).click();
    followed++;
    followSession.totalFollowed++;
    followSession.followedThisTarget++;

    const aria = btn.getAttribute('aria-label') || '';
    log(`FOLLOWED (${followSession.totalFollowed}/${followSession.followedThisTarget}/${maxPerTarget}): aria="${aria}"`);

    chrome.runtime.sendMessage({
      type: "UPDATE_STATS",
      stats: { replies: 0, likes: 0, follows: followSession.totalFollowed },
    });
  }

  window.scrollBy(0, 500);
  log(`Cycle done — followed: ${followed}, already following: ${skippedAlready}, parent marked: ${skippedParent}`);
  syncStateToStorage();
}

function simulateLike() {
  const buttons = document.querySelectorAll('[role="button"]');
  let count = 0;
  for (const btn of buttons) {
    const aria = (btn as HTMLElement).getAttribute('aria-label') || '';
    if (aria.toLowerCase() === 'like' || aria.toLowerCase() === 'thích') {
      (btn as HTMLElement).click();
      count++;
    }
  }
  if (count > 0) log(`Auto-liked ${count} posts`);
}

function simulateFollow() {
  const buttons = document.querySelectorAll('[role="button"]');
  let count = 0;
  for (const btn of buttons) {
    if (isFollowButton(btn)) {
      (btn as HTMLElement).click();
      count++;
    }
  }
  if (count > 0) log(`Auto-followed ${count} users`);
}

function stopAutomation() {
  if (automationTimer) {
    clearInterval(automationTimer);
    automationTimer = null;
  }
  log(`STOPPED — total followed: ${followSession.totalFollowed}`);
  followSession = {
    totalFollowed: 0,
    followedThisTarget: 0,
    currentTarget: "",
    targetIndex: 0,
    mode: 'idle',
    profileListType: 'followers',
    targets: [],
    logs: [...followSession.logs],
  };
  clearStorageState();
  chrome.runtime.sendMessage({
    type: "UPDATE_STATS",
    stats: { replies: 0, likes: 0, follows: 0 },
  });
}

function initFollowLoop() {
  if (automationTimer) {
    clearInterval(automationTimer);
    automationTimer = null;
  }

  if (!isOnTargetPage()) {
    log(`Skip init — not on target page. URL: ${window.location.href.slice(0, 60)}`);
    return;
  }

  const delay = (currentOpts?.delayBetweenFollows || 2000) + (currentOpts?.scrollDelay || 3000);
  log(`Starting follow loop — cycle every ${delay}ms`);
  automationTimer = setInterval(runFollowCycle, delay);
}

function waitForContentAndInit() {
  const maxWait = 10000;
  const startTime = Date.now();

  const tryInit = () => {
    const allBtns = document.querySelectorAll('[role="button"]');
    log(`Content check — ${allBtns.length} [role=button] found, waited ${Date.now() - startTime}ms`);

    if (allBtns.length > 5) {
      log("Content loaded — ready to follow");
      initFollowLoop();
      return true;
    }

    if (Date.now() - startTime > maxWait) {
      log("Max wait time reached — starting anyway");
      initFollowLoop();
      return true;
    }

    return false;
  };

  if (tryInit()) return;

  const observer = new MutationObserver(() => {
    const body = document.querySelector('[role="main"], body');
    if (body && tryInit()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    observer.disconnect();
    if (!automationTimer) {
      log("Timeout — forcing init");
      initFollowLoop();
    }
  }, maxWait);
}

chrome.storage.local.get(['followModeState', 'pendingFollowMode'], (result) => {
  const savedState = result.followModeState as FollowModeState | undefined;
  const pendingOpts = result.pendingFollowMode as FollowModeConfig | undefined;

  if (savedState?.active && savedState.opts) {
    log(`Resuming saved session — mode: ${savedState.mode}`);
    followSession = {
      totalFollowed: savedState.totalFollowed,
      followedThisTarget: savedState.followedThisTarget,
      currentTarget: savedState.targets[savedState.targetIndex] || savedState.profileUsername || '',
      targetIndex: savedState.targetIndex,
      mode: savedState.mode,
      profileListType: savedState.profileListType,
      targets: savedState.targets,
      logs: [],
    };
    currentOpts = savedState.opts;
    waitForContentAndInit();
  } else if (pendingOpts && !automationTimer) {
    log(`Starting from pending opts — mode: ${pendingOpts.targetType}`);
    currentOpts = pendingOpts;
    waitForContentAndInit();
  }
});

export {};