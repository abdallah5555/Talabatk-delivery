import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

type State = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export function OtaUpdateBanner() {
  const [state, setState] = useState<State>('idle');
  const updates = Updates.useUpdates();
  const progress = useMemo(() => {
    if (state === 'ready') return 1;
    if (state !== 'downloading') return 0;
    return Math.max(0.08, Math.min(0.98, updates.downloadProgress ?? 0.08));
  }, [state, updates.downloadProgress]);

  async function checkAndDownload() {
    if (Platform.OS === 'web' || !Updates.isEnabled) return;
    try {
      setState('checking');
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setState('idle');
        return;
      }
      setState('downloading');
      const fetched = await Updates.fetchUpdateAsync();
      if (!fetched.isNew) {
        setState('idle');
        return;
      }
      // Keep startup safe: never force reloadAsync from inside the running app.
      // The freshly downloaded OTA is applied on the next normal cold launch.
      setState('ready');
    } catch {
      setState('error');
    }
  }

  useEffect(() => {
    if (Platform.OS === 'web' || !Updates.isEnabled) return;
    const timer = setTimeout(() => {
      void checkAndDownload();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  if (Platform.OS === 'web' || !Updates.isEnabled || state === 'idle' || state === 'checking') return null;

  const downloading = state === 'downloading';
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {state === 'error' ? 'تعذر تنزيل التحديث' : state === 'ready' ? 'التحديث جاهز' : 'جاري تنزيل التحديث'}
        </Text>
        <Text style={styles.sub}>
          {state === 'error'
            ? 'اتأكد من اتصال الإنترنت واضغط إعادة المحاولة.'
            : downloading
              ? `بننزّل آخر تحسينات طلباتك تلقائيًا… ${Math.round(progress * 100)}%`
              : 'تم تنزيل التحديث بالكامل. اقفل التطبيق بالكامل وافتحه مرة تانية عشان النسخة الجديدة تشتغل.'}
        </Text>
        {downloading ? <View style={styles.track}><View style={[styles.fill,{width:`${Math.round(progress*100)}%`}]} /></View> : null}
      </View>
      {downloading ? (
        <ActivityIndicator color="#e8590c" />
      ) : state === 'ready' ? (
        <Text style={styles.done}>✓</Text>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => void checkAndDownload()} style={styles.button}>
          <Text style={styles.buttonText}>إعادة المحاولة</Text>
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
  button: { backgroundColor:'#e8590c',paddingHorizontal:14,paddingVertical:10,borderRadius:12 },
  buttonText: { color:'#fff',fontWeight:'900',fontSize:12 },
  done:{fontSize:22,fontWeight:'900',color:'#15803d'},
});
