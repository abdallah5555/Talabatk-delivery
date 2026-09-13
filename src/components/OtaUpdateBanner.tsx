import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

type State = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

export function OtaUpdateBanner() {
  const [state, setState] = useState<State>('idle');
  const updates = Updates.useUpdates();
  const progress = useMemo(() => {
    if (state === 'ready') return 1;
    if (state !== 'downloading') return 0;
    return Math.max(0.08, Math.min(0.98, updates.downloadProgress ?? 0.08));
  }, [state, updates.downloadProgress]);

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
      await new Promise(resolve => setTimeout(resolve, 450));
      await Updates.reloadAsync({
        reloadScreenOptions: {
          backgroundColor: '#f8f9fa',
          image: require('../../assets/app-icon.png'),
          imageResizeMode: 'contain',
          spinner: { enabled: true, color: '#e8590c', size: 'large' },
          fade: true,
        },
      });
    } catch {
      setState('error');
    }
  }

  if (Platform.OS === 'web' || !Updates.isEnabled || state === 'idle' || state === 'checking') return null;

  const busy = state === 'downloading' || state === 'ready';
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.textWrap}>
        <Text style={styles.title}>{state === 'error' ? 'تعذر تنزيل التحديث' : busy ? 'جاري تحديث طلباتك' : 'تحديث جديد متاح'}</Text>
        <Text style={styles.sub}>
          {state === 'error'
            ? 'اتأكد من اتصال الإنترنت وحاول مرة أخرى.'
            : state === 'downloading'
              ? `جاري تنزيل التحديث… ${Math.round(progress * 100)}%`
              : state === 'ready'
                ? 'تم التنزيل. جاري تشغيل النسخة الجديدة بشكل آمن…'
                : 'نزّل آخر تحسينات طلباتك من غير ما تعيد تثبيت التطبيق.'}
        </Text>
        {busy ? <View style={styles.track}><View style={[styles.fill,{width:`${Math.round(progress*100)}%`}]} /></View> : null}
      </View>
      {busy ? (
        <ActivityIndicator color="#e8590c" />
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
  textWrap: { flex: 1, gap: 6 },
  title: { textAlign: 'right', fontWeight: '900', color: '#9a3412', fontSize: 15 },
  sub: { textAlign: 'right', color: '#7c2d12', fontSize: 12, lineHeight: 18 },
  track:{height:6,borderRadius:999,backgroundColor:'#ffedd5',overflow:'hidden'},
  fill:{height:'100%',borderRadius:999,backgroundColor:'#e8590c'},
  button: { backgroundColor: '#e8590c', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});
