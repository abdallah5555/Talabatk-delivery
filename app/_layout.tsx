import { Stack } from 'expo-router';
import { I18nManager, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/src/providers/AppProviders';
import { AppGate } from '@/src/components/AppGate';
import { OtaUpdateBanner } from '@/src/components/OtaUpdateBanner';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  return (
    <AppProviders>
      <AppGate>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <OtaUpdateBanner />
          <Stack screenOptions={{ headerTitleAlign: 'center', headerBackTitle: 'رجوع' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
          </Stack>
        </View>
      </AppGate>
    </AppProviders>
  );
}
