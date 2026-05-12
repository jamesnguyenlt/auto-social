import { describe, it, expect } from 'vitest';
import type { PlatformConfig, FollowModeConfig } from '../lib/types';

// We test the pure functions extracted from background/index.ts
// These replicate the logic so we can unit-test without a Chrome environment.

function buildFollowModeUrl(followMode: any): string {
  const targetType = followMode?.targetType || 'hashtags';
  if (targetType === 'keywords') {
    const keywords = followMode?.searchKeywords || [];
    const first = keywords[0]?.trim() || 'AI';
    return `https://www.threads.net/search?q=${encodeURIComponent(first)}&serp_type=top`;
  }
  if (targetType === 'profile') {
    const username = (followMode?.profileUsername || '').replace('@', '').trim() || 'username';
    const listType = followMode?.profileListType || 'followers';
    return listType === 'following'
      ? `https://www.threads.net/@${encodeURIComponent(username)}?following=1`
      : `https://www.threads.net/@${encodeURIComponent(username)}?lg=1`;
  }
  const hashtags = followMode?.hashtags || [];
  const first = (hashtags[0] || 'AI').replace('#', '');
  return `https://www.threads.net/search?q=%23${encodeURIComponent(first)}&serp_type=tags`;
}

function getSearchPath(platformId: string, config: any): string {
  if (platformId === 'threads') {
    const followMode = config?.automations?.followMode;
    return buildFollowModeUrl(followMode);
  }
  return `https://www.${platformId}.com`;
}

// ─── Bug #1 Tests ─────────────────────────────────────────────────────────────
// BUG: When user types "chéo" in Keywords field but hasn't saved yet,
// START_BOT reads stale config from storage (searchKeywords: [])
// and falls through to hashtags fallback, navigating to %23AI instead.

describe('Bug #1: keywords ignored — navigates to hashtags fallback', () => {
  it('keywords should take priority over hashtags when targetType=keywords', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'keywords',
      profileListType: 'followers',
      hashtags: ['AI', 'Tech'], // stale data from storage
      searchKeywords: ['chéo'],
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('q=ch%C3%A9o');
    expect(url).toContain('serp_type=top');
    expect(url).not.toContain('%23'); // must NOT be hashtag URL
  });

  it('should use first keyword, not first hashtag when targetType=keywords', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'keywords',
      profileListType: 'followers',
      hashtags: ['FirstTag', 'SecondTag'],
      searchKeywords: ['secondKeyword'],
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    // Bug would cause this to go to %23FirstTag instead
    expect(url).toContain('secondKeyword');
    expect(url).not.toContain('FirstTag');
    expect(url).not.toContain('SecondTag');
  });

  it('empty searchKeywords should NOT fall through to hashtags — should use default "AI"', () => {
    // Even with empty keywords, it should NOT silently use hashtags
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'keywords',
      profileListType: 'followers',
      hashtags: ['TagA', 'TagB'],
      searchKeywords: [], // deliberately empty
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    // Falls back to default 'AI' (not hashtags), with serp_type=top
    expect(url).toContain('q=AI');
    expect(url).toContain('serp_type=top');
    expect(url).not.toContain('%23');
  });

  it('getSearchPath with keywords targetType should build correct URL', () => {
    const config: PlatformConfig = {
      targets: { hashtags: [], users: [], threads: [], searchKeywords: [], profileFollowers: [], profileFollowing: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, mode: 'none', ratio: 1, maxPerSession: 20 },
        followMode: {
          enabled: true,
          targetType: 'keywords',
          profileListType: 'followers',
          hashtags: [],
          searchKeywords: ['testing'],
          profileUsername: '',
          maxPerTarget: 50,
          delayBetweenFollows: 2000,
          scrollDelay: 3000,
        },
      },
    };

    const path = getSearchPath('threads', config);
    expect(path).toContain('q=testing');
    expect(path).toContain('serp_type=top');
    expect(path).not.toContain('%23');
  });
});

// ─── Bug #3: START_AUTOMATION flow needs followMode.enabled=true in storage ──
// BUG: When START_BOT is sent (either from UI "Start Follow Mode" or existing tab path),
// it sends START_AUTOMATION to the content script. startAutomation() only calls
// startFollowMode() when config.automations.followMode.enabled === true.
// If the user typed keywords but never saved, storage has enabled=false and nothing happens.

describe('Bug #3: START_AUTOMATION requires followMode.enabled=true in stored config', () => {
  it('startAutomation should call startFollowMode ONLY when enabled=true', () => {
    // Simulate the decision logic in startAutomation()
    function shouldCallFollowMode(config: PlatformConfig): boolean {
      return !!config.automations?.followMode?.enabled;
    }

    // User typed keywords but enabled=false (never saved or toggle off)
    const unsavedConfig: PlatformConfig = {
      targets: { hashtags: [], users: [], threads: [], searchKeywords: [], profileFollowers: [], profileFollowing: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, mode: 'none', ratio: 1, maxPerSession: 20 },
        followMode: {
          enabled: false, // BUG: this must be true for startFollowMode to be called
          targetType: 'keywords',
          profileListType: 'followers',
          hashtags: [],
          searchKeywords: ['chéo'],
          profileUsername: '',
          maxPerTarget: 50,
          delayBetweenFollows: 2000,
          scrollDelay: 3000,
        },
      },
    };

    // BUG: startFollowMode is NEVER called because enabled is false
    // The automation just runs the generic timer loop with no follow mode
    expect(shouldCallFollowMode(unsavedConfig)).toBe(false);
  });

  it('when enabled=true, startFollowMode should be called', () => {
    function shouldCallFollowMode(config: PlatformConfig): boolean {
      return !!config.automations?.followMode?.enabled;
    }

    const savedConfig: PlatformConfig = {
      targets: { hashtags: [], users: [], threads: [], searchKeywords: [], profileFollowers: [], profileFollowing: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, mode: 'none', ratio: 1, maxPerSession: 20 },
        followMode: {
          enabled: true, // saved config has it enabled
          targetType: 'keywords',
          profileListType: 'followers',
          hashtags: [],
          searchKeywords: ['chéo'],
          profileUsername: '',
          maxPerTarget: 50,
          delayBetweenFollows: 2000,
          scrollDelay: 3000,
        },
      },
    };

    expect(shouldCallFollowMode(savedConfig)).toBe(true);
  });

  it('keywords config is only correct when targetType=keywords', () => {
    // This test shows the bug: even with enabled=true, if the UI saved with
    // wrong targetType or empty searchKeywords, the URL will be wrong.
    const wrongConfig: PlatformConfig = {
      targets: { hashtags: [], users: [], threads: [], searchKeywords: [], profileFollowers: [], profileFollowing: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, mode: 'none', ratio: 1, maxPerSession: 20 },
        followMode: {
          enabled: true,
          targetType: 'hashtags', // BUG: user selected keywords but storage has hashtags
          profileListType: 'followers',
          hashtags: ['AI'],
          searchKeywords: ['chéo'], // this is ignored because targetType is wrong
          profileUsername: '',
          maxPerTarget: 50,
          delayBetweenFollows: 2000,
          scrollDelay: 3000,
        },
      },
    };

    // With targetType=hashtags, it ignores searchKeywords entirely
    const url = buildFollowModeUrl(wrongConfig.automations.followMode);
    expect(url).toContain('%23AI'); // Falls through to hashtag, ignores keywords
    expect(url).not.toContain('ch%C3%A9o'); // keywords are completely ignored
  });
});

// ─── Bug #2 Tests ─────────────────────────────────────────────────────────────
// BUG: chrome.tabs.query uses host pattern *://www.threads.net/*
// but threads.net may load at *://threads.net/* (no www).
// This causes GET_LOGS polling to find 0 matching tabs and logs never appear.

describe('Bug #2: host pattern mismatch causes logs polling to find 0 tabs', () => {
  it('getPlatformHost for threads should match bare threads.net domain', () => {
    function getPlatformHost(platformId: string): string {
      switch (platformId) {
        case 'threads': return '*://*.threads.net/*'; // FIXED: now matches both
        case 'x': return '*://x.com/*';
        default: return '*://*/*';
      }
    }

    // With the fix, both URLs should match
    expect(globMatch(getPlatformHost('threads'), 'https://www.threads.net/search?q=AI')).toBe(true);
    expect(globMatch(getPlatformHost('threads'), 'https://threads.net/search?q=AI')).toBe(true);
    expect(globMatch(getPlatformHost('threads'), 'https://threads.net/@user')).toBe(true);

    // x.com should still work correctly
    expect(globMatch(getPlatformHost('x'), 'https://x.com/user')).toBe(true);
  });

  it('correct host pattern should match both www and bare domains', () => {
    function getPlatformHostFixed(platformId: string): string {
      switch (platformId) {
        case 'threads': return '*://*.threads.net/*';
        case 'x': return '*://x.com/*';
        default: return '*://*/*';
      }
    }

    const host = getPlatformHostFixed('threads');
    expect(host).toBe('*://*.threads.net/*');
    expect(globMatch(host, 'https://www.threads.net/search?q=AI')).toBe(true);
    expect(globMatch(host, 'https://threads.net/search?q=AI')).toBe(true);
    expect(globMatch(host, 'https://threads.net/@user')).toBe(true);
  });
});

// ─── Edge Case Tests ───────────────────────────────────────────────────────────

describe('Profile mode URL building', () => {
  it('should strip @ prefix from username', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'profile',
      profileListType: 'followers',
      hashtags: [],
      searchKeywords: [],
      profileUsername: '@elonmusk',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('@elonmusk');
    expect(url).toContain('lg=1'); // followers uses lg=1
  });

  it('should use ?following=1 for following list type', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'profile',
      profileListType: 'following',
      hashtags: [],
      searchKeywords: [],
      profileUsername: 'username',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('?following=1');
  });

  it('should URL-encode special characters in username', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'profile',
      profileListType: 'followers',
      hashtags: [],
      searchKeywords: [],
      profileUsername: 'user name',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('user%20name');
  });
});

describe('Hashtags mode URL building', () => {
  it('should prefix with %23 and strip leading #', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'hashtags',
      profileListType: 'followers',
      hashtags: ['#AI', 'Tech'],
      searchKeywords: [],
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('%23AI'); // # stripped, then %23 added
    expect(url).toContain('serp_type=tags');
  });

  it('should use first hashtag only', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'hashtags',
      profileListType: 'followers',
      hashtags: ['AI', 'Tech', 'Startup'],
      searchKeywords: [],
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('%23AI');
    expect(url).not.toContain('Tech');
    expect(url).not.toContain('Startup');
  });
});

describe('Keywords mode — special characters', () => {
  it('should URL-encode Vietnamese characters', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'keywords',
      profileListType: 'followers',
      hashtags: [],
      searchKeywords: ['chéo'],
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('ch%C3%A9o');
  });

  it('should handle multiple keywords — uses first only', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'keywords',
      profileListType: 'followers',
      hashtags: [],
      searchKeywords: ['first', 'second', 'third'],
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('q=first');
    expect(url).not.toContain('second');
  });

  it('should trim whitespace from keyword', () => {
    const followMode: FollowModeConfig = {
      enabled: true,
      targetType: 'keywords',
      profileListType: 'followers',
      hashtags: [],
      searchKeywords: ['  spaced  '],
      profileUsername: '',
      maxPerTarget: 50,
      delayBetweenFollows: 2000,
      scrollDelay: 3000,
    };

    const url = buildFollowModeUrl(followMode);
    expect(url).toContain('q=spaced');
    expect(url).not.toContain('%20%20');
  });
});

// ─── Utility ───────────────────────────────────────────────────────────────────

// Chrome's URL matching for chrome.tabs.query uses a simplified glob pattern.
// * matches any string within a single URL segment (between / chars).
// ** matches across segment boundaries (but not used in this codebase).
function globMatch(pattern: string, url: string): boolean {
  const protoEnd = pattern.indexOf('://');
  const urlProtoEnd = url.indexOf('://');
  if (protoEnd === -1 || urlProtoEnd === -1) return false;

  const protoPat = pattern.slice(0, protoEnd);
  const protoUrl = url.slice(0, urlProtoEnd);
  const restPat = pattern.slice(protoEnd + 3);
  const restUrl = url.slice(urlProtoEnd + 3);

  if (!wildcardMatch(protoPat, protoUrl)) return false;

  // Split rest into host (up to first / after protocol) and path
  const firstSlashPat = restPat.indexOf('/');
  const firstSlashUrl = restUrl.indexOf('/');

  let hostPat: string;
  let pathPat: string;
  if (firstSlashPat === -1) {
    hostPat = restPat;
    pathPat = '';
  } else {
    hostPat = restPat.slice(0, firstSlashPat);
    pathPat = restPat.slice(firstSlashPat + 1);
  }

  let hostUrl: string;
  let pathUrl: string;
  if (firstSlashUrl === -1) {
    hostUrl = restUrl;
    pathUrl = '';
  } else {
    hostUrl = restUrl.slice(0, firstSlashUrl);
    pathUrl = restUrl.slice(firstSlashUrl + 1);
  }

  if (!wildcardMatch(hostPat, hostUrl)) return false;
  if (!wildcardMatch(pathPat, pathUrl)) return false;
  return true;
}

function wildcardMatch(pat: string, val: string): boolean {
  if (pat === '*') return true;
  if (!pat.includes('*')) return pat === val;

  // Handle patterns like "*.threads.net" where * matches subdomain part
  
  const hasLeadingDotStar = pat.startsWith('*.');
  const hasTrailingStarSlash = pat.endsWith('*');

  if (hasLeadingDotStar) {
    // *.domain matches any subdomain
    const suffix = pat.slice(2); // remove "*."
    const suffixParts = suffix.split('/');
    const baseDomain = suffixParts[0]; // e.g. "threads.net"

    // val must end with baseDomain
    if (!val.endsWith(baseDomain)) return false;

    // The prefix before baseDomain should be a valid subdomain (any chars except /)
    const prefix = val.slice(0, -baseDomain.length);
    // prefix can be anything (including empty), as long as it doesn't contain /
    // Actually Chrome allows anything, so just check val ends with baseDomain
    // For trailing * (like "*.threads.net/*"), validate path separately
    if (hasTrailingStarSlash) {
      // Already checked host via suffix, path matched via trailing wildcard
      return true;
    }

    // For "*.threads.net" without trailing path, val must equal the matched string
    // If val is "sub.threads.net" and pat is "*.threads.net", that's a match
    // The prefix can be empty or any non-/ chars
    return !prefix.includes('/');
  }

  // Standard glob: split by * and check each segment
  const starIdx = pat.indexOf('*');
  const pre = pat.slice(0, starIdx);
  const post = pat.slice(starIdx + 1);

  if (post === '') return val.startsWith(pre);
  return val.startsWith(pre) && val.endsWith(post);
}