import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Screen } from '@/src/components/ui';
import { useAuth } from '@/src/providers/AppProviders';

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <Screen><ActivityIndicator /></Screen>;
  return <Redirect href={session ? '/home' : '/login'} />;
}
