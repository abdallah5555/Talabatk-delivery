import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DB_NAME = 'talabatk-secure-storage';
const STORE_NAME = 'key_value';
const memoryFallback = new Map<string, string>();
let dbPromise: Promise<any | null> | null = null;

function openWebDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const indexedDB = (globalThis as any).indexedDB;
    if (!indexedDB) return resolve(null);
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

async function webGetItem(key: string) {
  const db = await openWebDb();
  if (!db) return memoryFallback.get(key) ?? null;
  return new Promise<string | null>((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
      request.onerror = () => resolve(memoryFallback.get(key) ?? null);
    } catch {
      resolve(memoryFallback.get(key) ?? null);
    }
  });
}

async function webSetItem(key: string, value: string) {
  memoryFallback.set(key, value);
  const db = await openWebDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function webRemoveItem(key: string) {
  memoryFallback.delete(key);
  const db = await openWebDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const authStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return webGetItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') return webSetItem(key, value);
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') return webRemoveItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};

export const trustedDeviceStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return webGetItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') return webSetItem(key, value);
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') return webRemoveItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};
