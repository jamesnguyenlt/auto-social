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
  onToggle: (id: PlatformId) => void;
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

  if (!config) {
    const defaultConfig: PlatformConfig = {
      targets: { hashtags: [], users: [], threads: [] },
      automations: {
        reply: { enabled: false, delay: 5000 },
        like: { enabled: false, count: 10 },
        follow: { enabled: false, ratio: 1 },
      },
    };
    setConfig(defaultConfig);
    return null;
  }

  const updateTargets = (field: 'hashtags' | 'users' | 'threads', value: string[]) => {
    setConfig(prev => prev ? { ...prev, targets: { ...prev.targets, [field]: value } } : null);
  };

  const updateAutomation = (key: 'reply' | 'like' | 'follow', updates: any) => {
    setConfig(prev => prev ? {
      ...prev,
      automations: { ...prev.automations, [key]: { ...prev.automations[key], ...updates } },
    } : null);
  };

  const startBot = () => {
    setState('running');
    onBotAction(platform.id, 'start');
  };

  const stopBot = () => {
    setState('idle');
    onBotAction(platform.id, 'stop');
  };

  const label = platform.adapter?.meta.label || platform.id;

  return (
    <div className={`platform-card ${state === 'running' ? 'active-glow' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <span className="platform-icon">{label[0]}</span>
        <span className="platform-name">{label}</span>
        <div className={`status-dot ${state}`}></div>
        <button className="toggle-btn">{expanded ? '−' : '+'}</button>
      </div>

      {expanded && (
        <div className="card-body slide-in">
          <div className="targets-section">
            <h4>Targets</h4>
            <input
              type="text"
              placeholder="#hashtag1 #hashtag2"
              value={config.targets.hashtags.join(' ')}
              onChange={(e) => updateTargets('hashtags', e.target.value.split(' ').filter(h => h.startsWith('#')))}
            />
            <input
              type="text"
              placeholder="@user1 @user2"
              value={config.targets.users.join(' ')}
              onChange={(e) => updateTargets('users', e.target.value.split(' ').filter(u => u.startsWith('@')))}
            />
          </div>

          <div className="automation-section">
            <h4>Automation</h4>
            <label>
              <input type="checkbox" checked={config.automations.reply.enabled}
                onChange={(e) => updateAutomation('reply', { enabled: e.target.checked })} />
              Auto-reply (delay: {config.automations.reply.delay / 1000}s)
            </label>
            <label>
              <input type="checkbox" checked={config.automations.like.enabled}
                onChange={(e) => updateAutomation('like', { enabled: e.target.checked })} />
              Auto-like (count: {config.automations.like.count})
            </label>
            <label>
              <input type="checkbox" checked={config.automations.follow.enabled}
                onChange={(e) => updateAutomation('follow', { enabled: e.target.checked })} />
              Auto-follow
            </label>
          </div>

          <div className="card-actions">
            <button onClick={state === 'running' ? stopBot : startBot}>
              {state === 'running' ? 'Stop Bot' : 'Start Bot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}