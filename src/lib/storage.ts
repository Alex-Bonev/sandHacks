import { openDB, type DBSchema } from 'idb';

interface SettingsDB extends DBSchema {
  settings: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'llm-dev-assistant';
const STORE_NAME = 'settings';

// Helper to prevent SSR crashes
const isBrowser = typeof window !== 'undefined';

export const getSetting = async (key: string): Promise<string | null> => {
  if (!isBrowser) return null;

  try {
    const db = await openDB<SettingsDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
    return (await db.get(STORE_NAME, key)) || null;
  } catch (error) {
    console.warn('Error reading from IDB:', error);
    return null;
  }
};

export const saveSetting = async (key: string, value: string): Promise<void> => {
  if (!isBrowser) return;

  try {
    const db = await openDB<SettingsDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
    await db.put(STORE_NAME, value, key);
  } catch (error) {
    console.error('Error saving to IDB:', error);
  }
};