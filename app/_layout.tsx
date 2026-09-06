import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/src/providers/AppProviders';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  return <AppProviders><StatusBar style="dark" /><Stack screenOptions={{ headerTitleAlign: 'center', headerBackTitle: 'رجوع' }} /></AppProviders>;
}
