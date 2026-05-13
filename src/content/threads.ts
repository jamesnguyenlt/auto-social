import type { PlatformConfig, FollowModeConfig } from "@/lib/types";
import type { FollowModeState } from "@/lib/storage";

console.debug("[auto-social] threads content script loaded");

const THREADS_BASE = "https://www.threads.com";

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

function syncStateToStorage(forceActive?: boolean) {
  const isActive = forceActive === true || (followSession.mode !== 'idle' && !!automationTimer);
  const state: FollowModeState = {
    active: isActive,
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
  console.debug('[auto-social] syncStateToStorage:', { active: isActive, mode: followSession.mode, forceActive });
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
    // Force active=true BEFORE navigation so the new content script instance resumes
    syncStateToStorage(true);

    const listType = opts?.profileListType || 'followers';
    const profileUrl = `${THREADS_BASE}/@${encodeURIComponent(username)}${listType === 'following' ? '?following=1' : '?lg=1'}`;
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
  // Force active=true BEFORE navigation so the new content script instance resumes
  syncStateToStorage(true);

  const firstTarget = targets[0];
  const searchUrl = targetType === 'hashtags'
    ? `${THREADS_BASE}/search?q=%23${encodeURIComponent(firstTarget)}&serp_type=tags`
    : `${THREADS_BASE}/search?q=${encodeURIComponent(firstTarget)}&serp_type=top`;

  log(`Navigating to: ${searchUrl}`);
  window.location.href = searchUrl;
}

function isOnTargetPage(): boolean {
  const url = window.location.href;
  const isThreadsDomain = url.includes('threads.net') || url.includes('threads.com');
  if (!isThreadsDomain) return false;
  if (followSession.mode === 'profile') return url.includes('/@');
  if (followSession.mode === 'hashtags' || followSession.mode === 'keywords') return url.includes('/search');
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
    return `${THREADS_BASE}/@${encodeURIComponent(username)}${listType === 'following' ? '?following=1' : '?lg=1'}`;
  }
  if (followSession.mode === 'hashtags') {
    return `${THREADS_BASE}/search?q=%23${encodeURIComponent(target)}&serp_type=tags`;
  }
  return `${THREADS_BASE}/search?q=${encodeURIComponent(target)}&serp_type=top`;
}

const FOLLOW_LABELS = [
  'follow', 'theo dõi', 'seguir', 'siguiente', 'follow back',
  '追随', 'theo'
];

const ALREADY_FOLLOWING_LABELS = [
  'following', 'đang theo dõi', 'requested', 'đã yêu cầu',
  'siguiendo', 'solicitado',
];

function isFollowButton(btn: Element): boolean {
  const aria = (btn as HTMLElement).getAttribute('aria-label') || '';
  const title = (btn as HTMLElement).getAttribute('title') || '';
  const text = (btn as HTMLElement).innerText?.trim() || (btn as HTMLElement).textContent?.trim() || '';
  
  const lowerAria = aria.toLowerCase().trim();
  const lowerTitle = title.toLowerCase().trim();
  const lowerText = text.toLowerCase().trim();

  // Quick exclusion for non-buttons to save CPU
  if (btn.tagName !== 'BUTTON' && btn.getAttribute('role') !== 'button') return false;

  // Exclude known non-follow buttons
  const excludeExact = ['avatar', 'like', 'thích', 'reply', 'trả lời', 'share',
    'repost', 'đăng lại', 'bookmark', 'save', 'more', 'xem thêm', 'close', 'đóng'];
  if (excludeExact.includes(lowerAria) || excludeExact.includes(lowerTitle)) return false;

  // Exclude "Following" / "Đang theo dõi" buttons (already followed)
  if (ALREADY_FOLLOWING_LABELS.some(l => lowerAria.includes(l) || lowerTitle.includes(l) || lowerText.includes(l))) return false;

  // Match follow labels in aria-label, title OR innerText
  return FOLLOW_LABELS.some(l => 
    lowerAria.includes(l) || lowerAria === l || 
    lowerTitle.includes(l) || lowerTitle === l ||
    lowerText === l || lowerText.includes(l)
  );
}

/* ───── Hover-card based follow approach ───── */

function triggerHover(element: Element) {
  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y };

  element.dispatchEvent(new MouseEvent('mouseover', opts));
  element.dispatchEvent(new MouseEvent('mouseenter', { ...opts, bubbles: false }));
  element.dispatchEvent(new MouseEvent('mousemove', opts));
  // Also trigger pointer events for React
  element.dispatchEvent(new PointerEvent('pointerover', opts));
  element.dispatchEvent(new PointerEvent('pointerenter', { ...opts, bubbles: false }));
  element.dispatchEvent(new PointerEvent('pointermove', opts));
}

function dismissHover(element: Element) {
  const rect = element.getBoundingClientRect();
  const opts = { view: window, bubbles: true, cancelable: true, clientX: rect.left - 50, clientY: rect.top - 50 };
  element.dispatchEvent(new MouseEvent('mouseleave', { ...opts, bubbles: false }));
  element.dispatchEvent(new MouseEvent('mouseout', opts));
  element.dispatchEvent(new PointerEvent('pointerleave', { ...opts, bubbles: false }));
  element.dispatchEvent(new PointerEvent('pointerout', opts));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wait for a follow button to appear in the DOM (from hover card) */
async function waitForFollowButton(timeoutMs = 2000): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const allBtns = document.querySelectorAll('[role="button"]');
    for (const btn of allBtns) {
      if (isFollowButton(btn)) {
        // Ensure it's visible (not hidden off-screen)
        // For icon buttons (like the +), the text might be empty but we still want to click it.
        const rect = (btn as HTMLElement).getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return btn;
        }
      }
    }
    await sleep(150);
  }
  return null;
}

/** Get all profile links on the page that haven't been processed yet */
function getProfileLinks(): HTMLAnchorElement[] {
  const links = document.querySelectorAll('a[href*="/@"]');
  const seen = new Set<string>();
  const result: HTMLAnchorElement[] = [];

  for (const link of links) {
    const href = (link as HTMLAnchorElement).getAttribute('href') || '';
    // Only match profile links like /@username (not post links /@user/post/123)
    const match = href.match(/^\/@([^/?]+)\/?$/);
    if (!match) continue;
    const username = match[1].toLowerCase();
    if (seen.has(username)) continue;
    if ((link as HTMLElement).hasAttribute('data-auto-processed')) continue;
    seen.add(username);
    result.push(link as HTMLAnchorElement);
  }
  return result;
}

async function runFollowCycle() {
  if (!isOnTargetPage()) {
    log('SKIP: not on target page');
    return;
  }

  const opts = currentOpts || {};
  const maxPerTarget = opts?.maxPerTarget || 50;

  log(`--- CYCLE ---`);
  log(`URL: ${window.location.href.replace(/https:\/\/www\.threads\.(net|com)/, '').slice(0, 50)}`);
  log(`Progress: ${followSession.followedThisTarget}/${maxPerTarget} this target | ${followSession.totalFollowed} total`);

  if (followSession.followedThisTarget >= maxPerTarget) {
    const nextTarget = getNextTarget();
    if (nextTarget) {
      followSession.targetIndex++;
      followSession.currentTarget = nextTarget;
      followSession.followedThisTarget = 0;
      log(`Target complete — moving to: ${nextTarget}`);
      syncStateToStorage(true);
      window.location.href = getNextUrl(nextTarget);
    } else {
      log("DONE: All targets exhausted");
      stopAutomation();
    }
    return;
  }

  // Step 1: Try direct follow buttons first (visible on profile follower lists)
  const directBtns = Array.from(document.querySelectorAll('[role="button"]')).filter(isFollowButton);
  if (directBtns.length > 0) {
    log(`Found ${directBtns.length} direct follow button(s) — clicking`);
    for (const btn of directBtns) {
      if (followSession.followedThisTarget >= maxPerTarget) break;
      if (!document.body.contains(btn)) continue; // Skip if element was removed from DOM
      if (!isFollowButton(btn)) continue; // Skip if it already changed to 'Following' or similar

      const parent = btn.closest('[data-pressable-container="true"], article, [role="article"]');
      if (parent && parent.hasAttribute('data-auto-followed')) continue;
      if (parent) parent.setAttribute('data-auto-followed', 'true');

      const aria = btn.getAttribute('aria-label') || '';
      const title = btn.getAttribute('title') || '';
      const text = (btn as HTMLElement).innerText?.trim() || (btn as HTMLElement).textContent?.trim() || '';
      const label = aria || title || text || '?';

      (btn as HTMLElement).click();
      followSession.totalFollowed++;
      followSession.followedThisTarget++;
      log(`FOLLOWED #${followSession.totalFollowed} (${followSession.followedThisTarget}/${maxPerTarget}): "${label}"`);

      chrome.runtime.sendMessage({
        type: "UPDATE_STATS",
        stats: { replies: 0, likes: 0, follows: followSession.totalFollowed },
      });

      await sleep(opts?.delayBetweenFollows || 2000);
    }
    window.scrollBy(0, 400);
    syncStateToStorage();
    return;
  }

  // Step 2: Hover-card approach for search results / feed
  const profileLinks = getProfileLinks();
  log(`Profile links found: ${profileLinks.length}`);

  if (profileLinks.length === 0) {
    log('No unprocessed profile links — scrolling down');
    window.scrollBy(0, 600);
    await sleep(1500);
    syncStateToStorage();
    return;
  }

  let followed = 0;
  let skipped = 0;

  for (const link of profileLinks) {
    if (followSession.followedThisTarget >= maxPerTarget) break;
    if (!automationTimer) break; // stopped

    const username = link.getAttribute('href')?.replace('/@', '') || '?';
    link.setAttribute('data-auto-processed', 'true');

    // Scroll the link into view
    link.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);

    // Trigger hover to open the popover card
    triggerHover(link);
    log(`Hovering @${username}...`);

    // Wait for follow button to appear in the hover card
    const followBtn = await waitForFollowButton(2500);

    if (followBtn) {
      const aria = followBtn.getAttribute('aria-label') || '';
      const title = followBtn.getAttribute('title') || '';
      const text = (followBtn as HTMLElement).innerText?.trim() || (followBtn as HTMLElement).textContent?.trim() || '';
      const label = aria || title || text || '?';

      (followBtn as HTMLElement).click();
      followed++;
      followSession.totalFollowed++;
      followSession.followedThisTarget++;
      log(`FOLLOWED #${followSession.totalFollowed} @${username} (${followSession.followedThisTarget}/${maxPerTarget}): "${label}"`);

      chrome.runtime.sendMessage({
        type: "UPDATE_STATS",
        stats: { replies: 0, likes: 0, follows: followSession.totalFollowed },
      });
    } else {
      log(`SKIP @${username} — no follow button found (may already follow)`);
      skipped++;
    }

    // Dismiss the hover card
    dismissHover(link);
    await sleep(opts?.delayBetweenFollows || 2000);
  }

  // Scroll down to load more
  window.scrollBy(0, 500);
  log(`Cycle done — followed: ${followed}, skipped: ${skipped}`);
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

  const baseDelay = (currentOpts?.scrollDelay || 3000);
  log(`Starting follow loop — base delay ${baseDelay}ms between cycles`);

  // Use a dummy timer ID to signal "running" (checked by automationTimer !== null)
  automationTimer = setInterval(() => {}, 999999) as ReturnType<typeof setInterval>;

  // Run the async loop sequentially
  (async () => {
    while (automationTimer) {
      try {
        await runFollowCycle();
      } catch (err) {
        log(`ERROR in follow cycle: ${err}`);
      }
      // Wait between cycles
      await sleep(baseDelay);
    }
    log('Follow loop exited');
  })();
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

// Retry storage reads to handle race condition where background script
// may not have written pendingFollowMode yet when this content script loads
function tryResumeFromStorage(retries = 5, delayMs = 500) {
  chrome.storage.local.get(['followModeState', 'pendingFollowMode'], (result) => {
    const savedState = result.followModeState as FollowModeState | undefined;
    const pendingOpts = result.pendingFollowMode as FollowModeConfig | undefined;

    console.debug('[auto-social] Storage check:', {
      hasFollowModeState: !!savedState,
      stateActive: savedState?.active,
      hasOpts: !!savedState?.opts,
      hasPending: !!pendingOpts,
      retriesLeft: retries,
      url: window.location.href.slice(0, 80),
    });

    if (savedState?.active && savedState.opts) {
      log(`Resuming saved session — mode: ${savedState.mode}`);
      followSession = {
        totalFollowed: savedState.totalFollowed ?? 0,
        followedThisTarget: savedState.followedThisTarget ?? 0,
        currentTarget: savedState.targets?.[savedState.targetIndex] || savedState.profileUsername || '',
        targetIndex: savedState.targetIndex ?? 0,
        mode: savedState.mode,
        profileListType: savedState.profileListType,
        targets: savedState.targets ?? [],
        logs: [],
      };
      currentOpts = savedState.opts;
      waitForContentAndInit();
      return;
    }

    if (pendingOpts && !automationTimer) {
      log(`Starting from pending opts — mode: ${pendingOpts.targetType}`);
      currentOpts = pendingOpts;
      // Set up followSession from pending opts so isOnTargetPage() works
      const targetType = pendingOpts.targetType || 'hashtags';
      followSession = {
        totalFollowed: 0,
        followedThisTarget: 0,
        currentTarget: '',
        targetIndex: 0,
        mode: targetType as 'hashtags' | 'keywords' | 'profile',
        profileListType: pendingOpts.profileListType || 'followers',
        targets: [],
        logs: [],
      };
      if (targetType === 'profile') {
        const username = (pendingOpts.profileUsername || '').replace('@', '').trim();
        followSession.currentTarget = username;
        followSession.targets = [username];
      } else if (targetType === 'keywords') {
        followSession.targets = (pendingOpts.searchKeywords || []).filter((k: string) => k.trim().length > 0);
        followSession.currentTarget = followSession.targets[0] || '';
      } else {
        followSession.targets = (pendingOpts.hashtags || []).map((h: string) => h.replace('#', '')).filter((h: string) => h.length > 0);
        followSession.currentTarget = followSession.targets[0] || '';
      }
      waitForContentAndInit();
      return;
    }

    // Neither state found — retry if we have attempts left
    if (retries > 0) {
      console.debug(`[auto-social] No active state found, retrying in ${delayMs}ms...`);
      setTimeout(() => tryResumeFromStorage(retries - 1, delayMs), delayMs);
    } else {
      console.debug('[auto-social] No follow mode state found after retries — idle.');
    }
  });
}

tryResumeFromStorage();

export {};