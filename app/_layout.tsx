import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AppState, I18nManager, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/src/providers/AppProviders';
import { AppGate } from '@/src/components/AppGate';
import { OtaUpdateBanner } from '@/src/components/OtaUpdateBanner';
import { refreshAdhkarReminderScheduleIfNeeded } from '@/src/lib/adhkar';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  useEffect(()=>{
    void refreshAdhkarReminderScheduleIfNeeded().catch(()=>undefined);
    const subscription=AppState.addEventListener('change',state=>{
      if(state==='active')void refreshAdhkarReminderScheduleIfNeeded().catch(()=>undefined);
    });
    return()=>subscription.remove();
  },[]);
  return (
    <AppProviders>
      <AppGate>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <OtaUpdateBanner />
          <Stack screenOptions={{ headerTitleAlign: 'center', headerBackTitle: 'رجوع', headerShadowVisible:false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="home" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ title:'البحث الشامل' }} />
            <Stack.Screen name="assistant" options={{ title:'مساعد طلباتك' }} />
            <Stack.Screen name="order-chat/[id]" options={{ title:'شات الطلب' }} />
            <Stack.Screen name="rewards" options={{ title:'النقاط والمكافآت' }} />
            <Stack.Screen name="account" options={{ title:'حسابي' }} />
            <Stack.Screen name="profile" options={{ title:'ملفي الشخصي' }} />
            <Stack.Screen name="applications" options={{ title:'الانضمام للعمل' }} />
            <Stack.Screen name="onboarding" options={{ title:'استكمال البيانات' }} />
            <Stack.Screen name="adhkar" options={{ title:'الأذكار' }} />
            <Stack.Screen name="orders" options={{ title:'طلباتي' }} />
            <Stack.Screen name="addresses" options={{ title:'عناويني' }} />
            <Stack.Screen name="favorites" options={{ title:'المفضلة' }} />
            <Stack.Screen name="notifications" options={{ title:'الإشعارات' }} />
            <Stack.Screen name="privacy" options={{ title:'بياناتي والخصوصية' }} />
            <Stack.Screen name="security" options={{ title:'الأمان وكلمة المرور' }} />
          </Stack>
        </View>
      </AppGate>
    </AppProviders>
  );
}
