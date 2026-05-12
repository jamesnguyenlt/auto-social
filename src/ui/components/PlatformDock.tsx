import { useState, useEffect, useCallback } from 'react';
import type { PlatformId, PlatformConfig, AutomationState, PlatformAdapter } from '@/lib/types';
import './PlatformDock.css';

interface Props {
  platformId: PlatformId;
  adapter: PlatformAdapter;
  config: PlatformConfig | null;
  state: AutomationState;
  expanded: boolean;
  sharedTargets: boolean;
  threadsLogs?: string[];
  threadsStats?: { followed: number; thisTarget: number; max: number } | null;
  onToggle: () => void;
  onBotAction: (id: PlatformId, action: 'start' | 'stop', mode?: string) => void;
  onConfigUpdate: (id: PlatformId, config: PlatformConfig) => void;
}

const DEFAULT_CONFIG: PlatformConfig = {
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
    },
  },
};

const PLATFORM_ICONS: Record<PlatformId, string> = {
  x: '𝕏',
  threads: '◎',
  instagram: '◉',
  tiktok: '♪',
  facebook: 'f',
};

const PLATFORM_LABELS: Record<PlatformId, string> = {
  x: 'X / Twitter',
  threads: 'Threads',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

export function PlatformDock({ platformId, config, state, expanded, onToggle, onBotAction, onConfigUpdate, threadsLogs = [], threadsStats = null }: Props) {
  const [cfg, setCfg] = useState<PlatformConfig>(() => config ?? DEFAULT_CONFIG);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    setCfg(config ?? DEFAULT_CONFIG);
  }, [config]);

  useEffect(() => {
    onConfigUpdate(platformId, cfg);
  }, [cfg, platformId, onConfigUpdate]);

  const updateTarget = useCallback((field: 'hashtags' | 'users' | 'threads' | 'searchKeywords', value: string[]) => {
    setCfg(prev => {
      const c = prev ?? DEFAULT_CONFIG;
      return { ...c, targets: { ...c.targets, [field]: value } };
    });
  }, []);

  const updateAuto = useCallback((key: 'reply' | 'like' | 'follow', updates: any) => {
    setCfg(prev => {
      const c = prev ?? DEFAULT_CONFIG;
      return { ...c, automations: { ...c.automations, [key]: { ...c.automations[key], ...updates } } };
    });
  }, []);

  const updateFollowMode = useCallback((updates: any) => {
    setCfg(prev => {
      const c = prev ?? DEFAULT_CONFIG;
      return { ...c, automations: { ...c.automations, followMode: { ...c.automations.followMode, ...updates } } };
    });
  }, []);

  const isRunning = state === 'running';
  const isThreads = platformId === 'threads';

  return (
    <div className={`platform-dock ${expanded ? 'expanded' : ''} ${isRunning ? 'active' : ''}`}>
      <div className="dock-row header" onClick={onToggle}>
        <button className="dock-checkbox" onClick={(e) => { e.stopPropagation(); onBotAction(platformId, isRunning ? 'stop' : 'start'); }}>
          <span className={`check ${isRunning ? 'on' : 'off'}`}>{isRunning ? '◉' : '○'}</span>
        </button>
        <span className="dock-platform-icon">{PLATFORM_ICONS[platformId]}</span>
        <span className="dock-platform-name">{PLATFORM_LABELS[platformId]}</span>
        <div className={`dock-state-badge ${state}`}>
          <span className="state-dot" />
          <span className="state-text">{state === 'running' ? 'Active' : state === 'idle' ? 'Idle' : state}</span>
        </div>
        <button className="dock-expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {expanded ? '⌃' : '⌄'}
        </button>
      </div>

      {expanded && (
        <div className="dock-body">
          {/* ===== Follow Mode (Threads only) ===== */}
          {isThreads && (
            <div className="dock-section">
              <div className="section-header">FOLLOW MODE</div>
              <div className="auto-row">
                <div className="auto-label">
                  <span className="auto-icon">👥</span>
                  <span>Auto-follow users from targets</span>
                </div>
                <label className="auto-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={cfg.automations.followMode?.enabled ?? false}
                    onChange={(e) => updateFollowMode({ enabled: e.target.checked })}
                  />
                  <span className="toggle-track"><span className="toggle-knob" /></span>
                </label>
              </div>

              {cfg.automations.followMode?.enabled && (
                <>
                  {/* Target Type Selector */}
                  <div className="target-type-selector">
                    {(['hashtags', 'keywords', 'profile'] as const).map((type) => (
                      <button
                        key={type}
                        className={`target-type-btn ${cfg.automations.followMode?.targetType === type ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); updateFollowMode({ targetType: type }); }}
                      >
                        {type === 'hashtags' && '🏷 #Hashtags'}
                        {type === 'keywords' && '🔍 Keywords'}
                        {type === 'profile' && '👤 Profile'}
                      </button>
                    ))}
                  </div>

                  {/* Hashtags Mode */}
                  {cfg.automations.followMode?.targetType === 'hashtags' && (
                    <div className="target-box wide">
                      <div className="target-label">#Hashtags to follow</div>
                      <input
                        className="target-input"
                        type="text"
                        placeholder="#AI #Tech #Startup"
                        value={(cfg.automations.followMode?.hashtags || []).join(' ')}
                        onChange={(e) => updateFollowMode({ hashtags: e.target.value.split(' ').filter(h => h.startsWith('#')) })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="target-add" onClick={(e) => e.stopPropagation()}>+</button>
                    </div>
                  )}

                  {/* Keywords Mode */}
                  {cfg.automations.followMode?.targetType === 'keywords' && (
                    <div className="target-box wide">
                      <div className="target-label">Search keywords</div>
                      <input
                        className="target-input"
                        type="text"
                        placeholder="AI tools productivity automation"
                        value={(cfg.automations.followMode?.searchKeywords || []).join(' ')}
                        onChange={(e) => updateFollowMode({ searchKeywords: e.target.value.split(' ').filter(k => k.length > 0 && !k.startsWith('#')) })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button className="target-add" onClick={(e) => e.stopPropagation()}>+</button>
                    </div>
                  )}

                  {/* Profile Mode */}
                  {cfg.automations.followMode?.targetType === 'profile' && (
                    <div className="profile-target-section">
                      <div className="target-box wide">
                        <div className="target-label">@Username</div>
                        <input
                          className="target-input"
                          type="text"
                          placeholder="@username"
                          value={cfg.automations.followMode?.profileUsername || ''}
                          onChange={(e) => {
                            let val = e.target.value.trim();
                            if (!val.startsWith('@')) val = '@' + val;
                            updateFollowMode({ profileUsername: val.replace(/\s/g, '') });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button className="target-add" onClick={(e) => e.stopPropagation()}>+</button>
                      </div>
                      <div className="profile-list-type-row">
                        <span className="profile-list-label">List:</span>
                        <div className="profile-list-toggle">
                          {(['followers', 'following'] as const).map((listType) => (
                            <button
                              key={listType}
                              className={`profile-list-btn ${cfg.automations.followMode?.profileListType === listType ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); updateFollowMode({ profileListType: listType }); }}
                            >
                              {listType === 'followers' ? 'Followers' : 'Following'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="follow-mode-params">
                    <div className="param-row">
                      <span className="param-label">Max per target</span>
                      <input
                        type="number"
                        className="param-input"
                        min="5"
                        max="200"
                        value={cfg.automations.followMode?.maxPerTarget ?? 50}
                        onChange={(e) => updateFollowMode({ maxPerTarget: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="param-row">
                      <span className="param-label">Delay between follows</span>
                      <input
                        type="number"
                        className="param-input"
                        min="500"
                        max="10000"
                        step="500"
                        value={cfg.automations.followMode?.delayBetweenFollows ?? 2000}
                        onChange={(e) => updateFollowMode({ delayBetweenFollows: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="param-unit">ms</span>
                    </div>
                    <div className="param-row">
                      <span className="param-label">Scroll delay</span>
                      <input
                        type="number"
                        className="param-input"
                        min="1000"
                        max="10000"
                        step="500"
                        value={cfg.automations.followMode?.scrollDelay ?? 3000}
                        onChange={(e) => updateFollowMode({ scrollDelay: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="param-unit">ms</span>
                    </div>
                  </div>

                  <button
                    className={`dock-start-btn ${isRunning ? 'stop' : 'start'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRunning) {
                        onBotAction(platformId, 'stop');
                      } else {
                        onBotAction(platformId, 'start', 'follow-mode');
                      }
                    }}
                  >
                    {isRunning ? '⏹ Stop Follow Mode' : '▶ Start Follow Mode'}
                  </button>

                  {isRunning && (
                    <button className="dock-logs-btn" onClick={(e) => { e.stopPropagation(); setLogsOpen(!logsOpen); }}>
                      Logs {logsOpen ? '▲' : '▼'}
                    </button>
                  )}

                  {isRunning && threadsStats && (
                    <div className="dock-bot-status">
                      <span className="status-dot running" />
                      <span className="status-label">{threadsStats.followed}/{threadsStats.max}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== Targets ===== */}
          {!isThreads && (
            <div className="dock-section">
              <div className="section-header">TARGETS</div>
              <div className="targets-grid">
                <div className="target-box">
                  <div className="target-label">#Hashtags</div>
                  <input
                    className="target-input"
                    type="text"
                    placeholder="#AI #Tech"
                    value={cfg.targets.hashtags.join(' ')}
                    onChange={(e) => updateTarget('hashtags', e.target.value.split(' ').filter(h => h.startsWith('#')))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button className="target-add" onClick={(e) => e.stopPropagation()}>+</button>
                </div>
                <div className="target-box">
                  <div className="target-label">@Users</div>
                  <input
                    className="target-input"
                    type="text"
                    placeholder="@elonmusk"
                    value={cfg.targets.users.join(' ')}
                    onChange={(e) => updateTarget('users', e.target.value.split(' ').filter(u => u.startsWith('@')))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button className="target-add" onClick={(e) => e.stopPropagation()}>+</button>
                </div>
                <div className="target-box wide">
                  <div className="target-label">Thread URLs</div>
                  <input
                    className="target-input"
                    type="text"
                    placeholder="Paste Thread URL"
                    value={cfg.targets.threads.join(' ')}
                    onChange={(e) => updateTarget('threads', e.target.value.split(' ').filter(t => t.includes('threads.net')))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button className="target-add" onClick={(e) => e.stopPropagation()}>+</button>
                </div>
              </div>
            </div>
          )}

          {!isThreads && (
            <div className="dock-section">
              <div className="section-header">AUTOMATIONS</div>

              <div className="auto-row">
                <div className="auto-label">
                  <span className="auto-icon">💬</span>
                  <span>Auto-reply on scroll</span>
                </div>
                <div className="auto-controls">
                  <span className="auto-range-label">Delay:</span>
                  <span className="auto-range-val">5s</span>
                  <input
                    type="range" min="1" max="30"
                    value={(cfg.automations.reply.delay ?? 5000) / 1000}
                    onChange={(e) => updateAuto('reply', { delay: Number(e.target.value) * 1000 })}
                    onClick={(e) => e.stopPropagation()}
                    className="auto-slider"
                  />
                  <span className="auto-range-val">30s</span>
                  <span className="auto-val-badge">{((cfg.automations.reply.delay ?? 5000) / 1000).toFixed(0)}s</span>
                  <label className="auto-toggle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={cfg.automations.reply.enabled ?? false}
                      onChange={(e) => updateAuto('reply', { enabled: e.target.checked })}
                    />
                    <span className="toggle-track"><span className="toggle-knob" /></span>
                  </label>
                </div>
              </div>

              <div className="auto-row">
                <div className="auto-label">
                  <span className="auto-icon">❤️</span>
                  <span>Auto-like</span>
                </div>
                <div className="auto-controls">
                  <span className="auto-range-label">Per session:</span>
                  <span className="auto-range-val">10</span>
                  <input
                    type="range" min="1" max="50"
                    value={cfg.automations.like.count ?? 10}
                    onChange={(e) => updateAuto('like', { count: Number(e.target.value) })}
                    onClick={(e) => e.stopPropagation()}
                    className="auto-slider"
                  />
                  <span className="auto-range-val">50</span>
                  <span className="auto-val-badge">{cfg.automations.like.count ?? 10}</span>
                  <label className="auto-toggle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={cfg.automations.like.enabled ?? false}
                      onChange={(e) => updateAuto('like', { enabled: e.target.checked })}
                    />
                    <span className="toggle-track"><span className="toggle-knob" /></span>
                  </label>
                </div>
              </div>

              <div className="auto-row">
                <div className="auto-label">
                  <span className="auto-icon">👤</span>
                  <span>Auto-follow</span>
                </div>
                <div className="auto-controls">
                  <span className="auto-range-label">Max:</span>
                  <span className="auto-range-val">10</span>
                  <input
                    type="range" min="5" max="100"
                    value={cfg.automations.follow.maxPerSession ?? 20}
                    onChange={(e) => updateAuto('follow', { maxPerSession: Number(e.target.value) })}
                    onClick={(e) => e.stopPropagation()}
                    className="auto-slider"
                  />
                  <span className="auto-range-val">100</span>
                  <span className="auto-val-badge">{cfg.automations.follow.maxPerSession ?? 20}</span>
                  <label className="auto-toggle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={cfg.automations.follow.enabled ?? false}
                      onChange={(e) => updateAuto('follow', { enabled: e.target.checked })}
                    />
                    <span className="toggle-track"><span className="toggle-knob" /></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          {!isThreads && (
            <div className="dock-action-row">
              <button
                className={`dock-start-btn ${isRunning ? 'stop' : 'start'}`}
                onClick={(e) => { e.stopPropagation(); onBotAction(platformId, isRunning ? 'stop' : 'start'); }}
              >
                {isRunning ? '⏹ Stop Bot' : `▶ Start ${PLATFORM_LABELS[platformId].split(' ')[0]} Bot`}
              </button>
              <div className="dock-bot-status">
                <span className={`status-dot ${state}`} />
                <span className="status-label">Status: {state}</span>
              </div>
              <button className="dock-logs-btn" onClick={(e) => { e.stopPropagation(); setLogsOpen(!logsOpen); }}>
                Logs {logsOpen ? '▲' : '▼'}
              </button>
            </div>
          )}

          {logsOpen && threadsLogs.length > 0 ? (
            <div className="dock-logs">
              {threadsLogs.slice().reverse().map((entry, i) => {
                const isFollowed = entry.includes('FOLLOWED');
                const isError = entry.includes('ERROR') || entry.includes('DONE') || entry.includes('SKIP');
                const isCycle = entry.includes('--- CYCLE ---');
                return (
                  <div
                    key={i}
                    className={`log-entry ${isFollowed ? 'success' : ''} ${isError ? 'error' : ''} ${isCycle ? 'separator' : ''}`}
                  >
                    {entry}
                  </div>
                );
              })}
            </div>
          ) : logsOpen && threadsLogs.length === 0 && (
            <div className="dock-logs">
              <div className="log-entry">[Waiting for logs...]</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}