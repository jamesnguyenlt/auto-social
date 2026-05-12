import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import type { PlatformId, PlatformConfig, AutomationState } from '@/lib/types';

interface PlatformData {
  id: PlatformId;
  adapter: any;
  config: PlatformConfig | null;
  state: AutomationState;
}

interface Props {
  platform: PlatformData;
  onBotAction: (id: PlatformId, action: 'start' | 'stop') => void;
}

export function PlatformCard({ platform, onBotAction }: Props) {
  const [config, setConfig] = useState<PlatformConfig | null>(platform.config);
  const [state, setState] = useState<AutomationState>(platform.state);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (config) {
      storage.savePlatformConfig(platform.id, config);
    }
  }, [config, platform.id]);

  useEffect(() => {
    setState(platform.state);
  }, [platform.state]);

  const ensureConfig = (cfg: PlatformConfig | null): PlatformConfig => {
    return cfg ?? {
      targets: { hashtags: [], users: [], threads: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, ratio: 1 },
      },
    };
  };

  const cfg = ensureConfig(config);

  const updateTargets = (field: 'hashtags' | 'users' | 'threads', value: string[]) => {
    setConfig(prev => {
      const c = ensureConfig(prev);
      return { ...c, targets: { ...c.targets, [field]: value } };
    });
  };

  const updateAuto = (key: 'reply' | 'like' | 'follow', updates: any) => {
    setConfig(prev => {
      const c = ensureConfig(prev);
      return { ...c, automations: { ...c.automations, [key]: { ...c.automations[key], ...updates } } };
    });
  };

  const handleBotAction = (action: 'start' | 'stop') => {
    setState(action === 'start' ? 'running' : 'idle');
    onBotAction(platform.id, action);
  };

  const label = platform.adapter?.meta.label || platform.id;
  const isRunning = state === 'running';

  return (
    <div className={`platform-card ${isRunning ? 'active' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <span className="card-icon">{label[0]}</span>
        <span className="card-name">{label}</span>
        <span className={`card-status ${state}`}>{state}</span>
        <button className="card-toggle">{expanded ? '−' : '+'}</button>
      </div>

      {expanded && (
        <div className="card-body">
          <div className="card-section">
            <div className="section-label">Targets</div>
            <input
              className="card-input"
              type="text"
              placeholder="#hashtag1 #hashtag2"
              value={cfg.targets.hashtags.join(' ')}
              onChange={(e) => updateTargets('hashtags', e.target.value.split(' ').filter(h => h.startsWith('#')))}
            />
            <input
              className="card-input"
              type="text"
              placeholder="@user1 @user2"
              value={cfg.targets.users.join(' ')}
              onChange={(e) => updateTargets('users', e.target.value.split(' ').filter(u => u.startsWith('@')))}
            />
          </div>

          <div className="card-section">
            <div className="section-label">Automation</div>
            <label className="card-toggle-row">
              <input
                type="checkbox"
                checked={cfg.automations.reply.enabled}
                onChange={(e) => updateAuto('reply', { enabled: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
              />
              <span>Auto-reply</span>
              <span className="card-value">{cfg.automations.reply.delay / 1000}s</span>
            </label>
            <label className="card-toggle-row">
              <input
                type="checkbox"
                checked={cfg.automations.like.enabled}
                onChange={(e) => updateAuto('like', { enabled: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
              />
              <span>Auto-like</span>
              <span className="card-value">{cfg.automations.like.count}</span>
            </label>
            <label className="card-toggle-row">
              <input
                type="checkbox"
                checked={cfg.automations.follow.enabled}
                onChange={(e) => updateAuto('follow', { enabled: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
              />
              <span>Auto-follow</span>
            </label>
          </div>

          <button
            className={`card-btn ${isRunning ? 'stop' : 'start'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleBotAction(isRunning ? 'stop' : 'start');
            }}
          >
            {isRunning ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>
      )}
    </div>
  );
}