import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { trustedDeviceStorage } from './storage';

const DEVICE_TOKEN_KEY = 'talabatk_trusted_device_token_v1';

async function readDeviceToken() {
  return trustedDeviceStorage.getItem(DEVICE_TOKEN_KEY);
}

async function writeDeviceToken(value: string) {
  await trustedDeviceStorage.setItem(DEVICE_TOKEN_KEY, value);
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
  await trustedDeviceStorage.removeItem(DEVICE_TOKEN_KEY);
  return Number(data ?? 0);
}
