import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors = { bg: '#fff8f2', card: '#ffffff', primary: '#e8590c', text: '#25160f', muted: '#78645b', border: '#eadbd2', danger: '#b42318' };

export function Screen({ children }: PropsWithChildren) { return <View style={s.screen}>{children}</View>; }
export function Card({ children }: PropsWithChildren) { return <View style={s.card}>{children}</View>; }
export function Title({ children }: PropsWithChildren) { return <Text style={s.title}>{children}</Text>; }
export function Muted({ children }: PropsWithChildren) { return <Text style={s.muted}>{children}</Text>; }
export function Field(props: TextInputProps) { return <TextInput placeholderTextColor="#9b877d" {...props} style={[s.field, props.style]} />; }
export function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, disabled && { opacity: 0.5 }]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 18, gap: 14, direction: 'rtl' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, gap: 10 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right' },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'right' },
  field: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, textAlign: 'right' },
  button: { backgroundColor: colors.primary, padding: 14, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
