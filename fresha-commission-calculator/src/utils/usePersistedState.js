import { useState, useEffect } from 'react';

const PREFIX = 'fresha-calc-';

export function usePersistedState(key, defaultValue) {
    const storageKey = PREFIX + key;

  const [value, setValue] = useState(() => {
        try {
                const stored = localStorage.getItem(storageKey);
                if (stored !== null) {
                          return JSON.parse(stored);
                }
        } catch (e) {
                // ignore corrupt or missing data
        }
        return defaultValue;
  });

  useEffect(() => {
        try {
                localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (e) {
                // ignore quota errors
        }
  }, [storageKey, value]);

  return [value, setValue];
}
