import { useState, useEffect, useMemo } from 'react';
import { storage } from '@/lib/storage';
import type { PlatformId, PlatformConfig, AutomationState } from '@/lib/types';
import { adapters } from '@/lib/platforms';
import { PlatformCard } from './PlatformCard';

export function AutoSocialPanel() {
  const [configs, setConfigs] = useState<Record<PlatformId, PlatformConfig>>({} as Record<PlatformId, PlatformConfig>);
  const [botStates, setBotStates] = useState<Record<PlatformId, AutomationState>>({} as Record<PlatformId, AutomationState>);
  const [panelState, setPanelState] = useState<'expanded' | 'collapsed'>('expanded');

  useEffect(() => {
    const load = async () => {
      const cfgs = await storage.listPlatformConfigs();
      setConfigs(cfgs);
    };
    load();
  }, []);

  const platforms = useMemo(() => {
    return Object.keys(adapters).map((id) => ({
      id: id as PlatformId,
      adapter: adapters[id as PlatformId],
      config: configs[id as PlatformId] ?? null,
      state: botStates[id as PlatformId] ?? 'idle',
    }));
  }, [configs, botStates]);

  const handleBotAction = (platformId: PlatformId, action: 'start' | 'stop') => {
    setBotStates(prev => ({ ...prev, [platformId]: action === 'start' ? 'running' : 'idle' }));
    chrome.runtime.sendMessage({ type: action === 'start' ? 'START_BOT' : 'STOP_BOT', platformId });
  };

  if (panelState === 'collapsed') {
    return (
      <div className="minimized-dock" onClick={() => setPanelState('expanded')}>
        <span>A</span>
        <span>Auto-Social</span>
      </div>
    );
  }

  return (
    <div className="auto-social-panel glass-panel">
      <header className="panel-header">
        <div className="logo">
          <span className="logo-icon">A</span>
          <span className="logo-text">Auto-Social</span>
        </div>
        <button onClick={() => setPanelState('collapsed')}>−</button>
      </header>

      <div className="platform-sections">
        {platforms.map((p) => (
          <PlatformCard
            key={p.id}
            platform={p}
            onToggle={() => {}}
            onBotAction={handleBotAction}
          />
        ))}
      </div>

      <footer className="panel-footer">
        <button>Pause All</button>
        <span>Active: {Object.values(botStates).filter(s => s === 'running').length}</span>
      </footer>
    </div>
  );
}