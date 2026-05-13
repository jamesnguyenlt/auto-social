import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import type { PlatformId, PlatformConfig, AutomationState } from '@/lib/types';
import { adapters } from '@/lib/platforms';
import { PlatformDock } from './PlatformDock';
import './AutoSocialDock.css';

export function AutoSocialDock() {
  const [configs, setConfigs] = useState<Record<PlatformId, PlatformConfig>>({} as Record<PlatformId, PlatformConfig>);
  const [botStates, setBotStates] = useState<Record<PlatformId, AutomationState>>({} as Record<PlatformId, AutomationState>);
  const [sharedTargets, setSharedTargets] = useState(false);
  const [expandedId, setExpandedId] = useState<PlatformId | null>('x');
  const [saving, setSaving] = useState(false);
  const [threadsLogs, setThreadsLogs] = useState<string[]>([]);
  const [threadsStats, setThreadsStats] = useState({ followed: 0, thisTarget: 0, max: 50 });

  useEffect(() => {
    const load = async () => {
      const cfgs = await storage.listPlatformConfigs();
      setConfigs(cfgs);
      const ids: PlatformId[] = ["x", "instagram", "threads", "tiktok", "facebook"];
      const statesArr = await Promise.all(ids.map(id => storage.getBotState(id)));
      const statesMap: Record<PlatformId, AutomationState> = {} as Record<PlatformId, AutomationState>;
      ids.forEach((id, i) => { statesMap[id] = statesArr[i] || 'idle'; });
      setBotStates(statesMap);
      const shared = await chrome.storage.local.get('sharedTargets');
      setSharedTargets(shared.sharedTargets ?? false);
    };
    load();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      chrome.tabs.query({ url: '*://*.threads.com/*' }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_LOGS' }, (res) => {
            if (res?.logs && res.logs.length > 0) {
              setThreadsLogs(res.logs.slice(0, 30));
            }
          });
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (res) => {
            if (res) {
              setThreadsStats(s => ({
                ...s,
                followed: res.totalFollowed ?? 0,
                thisTarget: res.followedThisTarget ?? 0,
              }));
            }
          });
        }
      });
      chrome.storage.local.get('followModeState', (r) => {
        if (r.followModeState?.opts?.maxPerTarget) {
          setThreadsStats(s => ({ ...s, max: r.followModeState.opts.maxPerTarget }));
        }
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleBotAction = useCallback((platformId: PlatformId, action: 'start' | 'stop', mode?: string) => {
    setBotStates(prev => ({ ...prev, [platformId]: action === 'start' ? 'running' : 'idle' }));
    if (action === 'start' && mode === 'follow-mode') {
      chrome.runtime.sendMessage({ type: 'START_FOLLOW_MODE', platformId, config: configs[platformId] });
    } else {
      chrome.runtime.sendMessage({ type: action === 'start' ? 'START_BOT' : 'STOP_BOT', platformId });
    }
  }, [configs]);

  const handleConfigUpdate = useCallback((platformId: PlatformId, config: PlatformConfig) => {
    setConfigs(prev => ({ ...prev, [platformId]: config }));
  }, []);

  const saveAll = async () => {
    setSaving(true);
    await Promise.all(
      (Object.keys(configs) as PlatformId[]).map(id => storage.savePlatformConfig(id, configs[id]))
    );
    await chrome.storage.local.set({ sharedTargets });
    setTimeout(() => setSaving(false), 1000);
  };

  const pauseAll = () => {
    (Object.keys(botStates) as PlatformId[]).forEach(id => {
      if (botStates[id] === 'running') {
        handleBotAction(id, 'stop');
      }
    });
  };

  const platforms: PlatformId[] = ["x", "threads", "instagram", "tiktok", "facebook"];
  const totalReplies = 124;
  const totalLikes = 89;

  return (
    <div className="dock-container">
      {/* Header */}
      <header className="dock-header">
        <div className="dock-logo-area">
          <div className="dock-logo-icon">A</div>
          <span className="dock-logo-text">Auto-Social Pro</span>
        </div>
        <div className="dock-header-actions">
          <button className="dock-action-btn" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button className="dock-action-btn save" onClick={saveAll}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {saving ? 'Saved!' : 'Save'}
          </button>
        </div>
      </header>

      {/* Shared Targets Toggle */}
      <div className="dock-shared-toggle">
        <span className="dock-shared-label">Shared Targets For All Platforms</span>
        <button
          className={`dock-toggle ${sharedTargets ? 'active' : ''}`}
          onClick={() => setSharedTargets(!sharedTargets)}
        >
          <span className="dock-toggle-knob" />
        </button>
      </div>

      {/* Platform List */}
      <div className="dock-content">
        {platforms.map((id) => (
          <PlatformDock
            key={id}
            platformId={id}
            adapter={adapters[id]}
            config={configs[id] ?? null}
            state={botStates[id] ?? 'idle'}
            expanded={expandedId === id}
            sharedTargets={sharedTargets}
            onToggle={() => setExpandedId(expandedId === id ? null : id)}
            onBotAction={handleBotAction}
            onConfigUpdate={handleConfigUpdate}
            threadsLogs={id === 'threads' ? threadsLogs : []}
            threadsStats={id === 'threads' ? threadsStats : null}
          />
        ))}

        {/* Add Custom Platform */}
        <button className="dock-add-platform">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Custom Platform
        </button>
      </div>

      {/* Footer */}
      <footer className="dock-footer">
        <button className="dock-footer-btn pause" onClick={pauseAll}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          Pause All
        </button>
        <div className="dock-footer-stats">
          <span className="stats-label">Today's Stats</span>
          <span className="stats-value">{totalReplies} replies · {totalLikes} likes today</span>
        </div>
        <button className="dock-footer-btn compose">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span>→</span>
        </button>
      </footer>
    </div>
  );
}