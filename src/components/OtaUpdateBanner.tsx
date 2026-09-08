import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

type State = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

export function OtaUpdateBanner() {
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (Platform.OS === 'web' || !Updates.isEnabled) return;
    let mounted = true;
    const timer = setTimeout(() => {
      setState('checking');
      void Updates.checkForUpdateAsync()
        .then(result => {
          if (!mounted) return;
          setState(result.isAvailable ? 'available' : 'idle');
        })
        .catch(() => {
          if (mounted) setState('idle');
        });
    }, 1800);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  async function install() {
    try {
      setState('downloading');
      const result = await Updates.fetchUpdateAsync();
      if (!result.isNew) {
        setState('idle');
        return;
      }
      setState('ready');
      await Updates.reloadAsync();
    } catch {
      setState('error');
    }
  }

  if (Platform.OS === 'web' || !Updates.isEnabled || state === 'idle' || state === 'checking') return null;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.textWrap}>
        <Text style={styles.title}>{state === 'error' ? 'تعذر تنزيل التحديث' : 'تحديث جديد متاح'}</Text>
        <Text style={styles.sub}>
          {state === 'error'
            ? 'اتأكد من اتصال الإنترنت وحاول مرة أخرى.'
            : state === 'downloading'
              ? 'جاري تنزيل التحديث الصغير…'
              : state === 'ready'
                ? 'تم تنزيل التحديث. جاري تشغيل النسخة الجديدة…'
                : 'نزّل آخر تحسينات طلباتك من غير ما تعيد تثبيت التطبيق.'}
        </Text>
      </View>
      {state === 'downloading' || state === 'ready' ? (
        <ActivityIndicator />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => void install()} style={styles.button}>
          <Text style={styles.buttonText}>{state === 'error' ? 'إعادة المحاولة' : 'تحديث الآن'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  textWrap: { flex: 1, gap: 3 },
  title: { textAlign: 'right', fontWeight: '900', color: '#9a3412', fontSize: 15 },
  sub: { textAlign: 'right', color: '#7c2d12', fontSize: 12, lineHeight: 18 },
  button: { backgroundColor: '#e8590c', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});
