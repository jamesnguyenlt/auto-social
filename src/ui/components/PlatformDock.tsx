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
  onToggle: () => void;
  onBotAction: (id: PlatformId, action: 'start' | 'stop') => void;
  onConfigUpdate: (id: PlatformId, config: PlatformConfig) => void;
}

const DEFAULT_CONFIG: PlatformConfig = {
  targets: { hashtags: [], users: [], threads: [] },
  automations: {
    reply: { enabled: false, delay: 5000 },
    like: { enabled: false, count: 10 },
    follow: { enabled: false, ratio: 1 },
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

export function PlatformDock({ platformId, config, state, expanded, onToggle, onBotAction, onConfigUpdate }: Props) {
  const [cfg, setCfg] = useState<PlatformConfig>(() => config ?? DEFAULT_CONFIG);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    setCfg(config ?? DEFAULT_CONFIG);
  }, [config]);

  useEffect(() => {
    onConfigUpdate(platformId, cfg);
  }, [cfg, platformId, onConfigUpdate]);

  const updateTarget = useCallback((field: 'hashtags' | 'users' | 'threads', value: string[]) => {
    setCfg(prev => ({ ...prev, targets: { ...prev.targets, [field]: value } }));
  }, []);

  const updateAuto = useCallback((key: 'reply' | 'like' | 'follow', updates: any) => {
    setCfg(prev => ({
      ...prev,
      automations: { ...prev.automations, [key]: { ...prev.automations[key], ...updates } },
    }));
  }, []);

  const isRunning = state === 'running';

  return (
    <div className={`platform-dock ${isRunning ? 'active' : ''}`}>
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
                  value={cfg.automations.reply.delay / 1000}
                  onChange={(e) => updateAuto('reply', { delay: Number(e.target.value) * 1000 })}
                  onClick={(e) => e.stopPropagation()}
                  className="auto-slider"
                />
                <span className="auto-range-val">30s</span>
                <span className="auto-val-badge">{cfg.automations.reply.delay / 1000}s</span>
                <label className="auto-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={cfg.automations.reply.enabled}
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
                  value={cfg.automations.like.count}
                  onChange={(e) => updateAuto('like', { count: Number(e.target.value) })}
                  onClick={(e) => e.stopPropagation()}
                  className="auto-slider"
                />
                <span className="auto-range-val">50</span>
                <span className="auto-val-badge">{cfg.automations.like.count}</span>
                <label className="auto-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={cfg.automations.like.enabled}
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
                <span className="auto-range-label">Ratio:</span>
                <span className="auto-range-val">1:0</span>
                <input
                  type="range" min="0" max="10" step="0.5"
                  value={cfg.automations.follow.ratio}
                  onChange={(e) => updateAuto('follow', { ratio: Number(e.target.value) })}
                  onClick={(e) => e.stopPropagation()}
                  className="auto-slider"
                />
                <span className="auto-range-val">1:10</span>
                <span className="auto-val-badge">1:{cfg.automations.follow.ratio}</span>
                <label className="auto-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={cfg.automations.follow.enabled}
                    onChange={(e) => updateAuto('follow', { enabled: e.target.checked })}
                  />
                  <span className="toggle-track"><span className="toggle-knob" /></span>
                </label>
              </div>
            </div>
          </div>

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

          {logsOpen && (
            <div className="dock-logs">
              <div className="log-entry">[10:32] Bot started for {PLATFORM_LABELS[platformId]}</div>
              <div className="log-entry">[10:33] Scanning for target hashtags...</div>
              <div className="log-entry">[10:34] Auto-like triggered on post #AI</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}