import { useState, useEffect } from 'react';

export function useStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await chrome.storage.local.get(key);
        if (r[key]) {
          setValue(r[key] as T);
        }
      } catch {
        // Fallback to initial value
      }
    };
    load();
  }, [key]);

  const setGlobalState = async (updater: (prev: T) => T) => {
    const newValue = updater(value);
    setValue(newValue);
    await chrome.storage.local.set({ [key]: newValue });
  };

  return [value, setGlobalState] as const;
}

export function usePlatformStorage(platformId: string) {
  return useStorage(`config_${platformId}`, {
    targets: { hashtags: [], users: [], threads: [] },
    automations: {
      reply: { enabled: false, delay: 5000 },
      like: { enabled: false, count: 10 },
      follow: { enabled: false, ratio: 1 },
    },
  });
}