import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const DEVICE_TOKEN_KEY = 'talabatk_trusted_device_token_v1';

async function readDeviceToken() {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(DEVICE_TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
}

async function writeDeviceToken(value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(DEVICE_TOKEN_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function getOrCreateDeviceToken() {
  const existing = await readDeviceToken();
  if (existing) return existing;
  const token = `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
  await writeDeviceToken(token);
  return token;
}

export async function getSecurityStatus() {
  const token = await readDeviceToken();
  const { data, error } = await supabase.rpc('get_security_status', { p_device_token: token });
  if (error) throw error;
  return data as { has_pin: boolean; locked_until: string | null; last_pin_verified_at: string | null; device_trusted: boolean; trusted_until: string | null };
}

export async function setPin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('الرقم السري لازم يكون من 4 إلى 8 أرقام.');
  const { data, error } = await supabase.rpc('set_pin', { p_pin: pin });
  if (error) throw error;
  return data;
}

export async function verifyPin(pin: string, trustDevice = true) {
  const token = trustDevice ? await getOrCreateDeviceToken() : null;
  const { data, error } = await supabase.rpc('verify_pin', {
    p_pin: pin,
    p_device_token: token,
    p_device_label: Platform.OS === 'web' ? 'Web/PWA' : 'Android',
  });
  if (error) throw error;
  return data as { ok: boolean; locked_until?: string | null; trusted_until?: string | null; last_pin_verified_at?: string | null };
}

export async function revokeTrustedDevices() {
  const { data, error } = await supabase.rpc('revoke_trusted_devices');
  if (error) throw error;
  return Number(data ?? 0);
}
