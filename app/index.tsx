import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/ui';
import { useAuth } from '@/src/providers/AppProviders';
import { getLandingRoute } from '@/src/lib/landing';

export default function Index(){
  const {session,loading}=useAuth();
  const landing=useQuery({queryKey:['landing-route',session?.user?.id],queryFn:getLandingRoute,enabled:!!session?.user?.id});
  if(loading||landing.isLoading)return <Screen><ActivityIndicator/></Screen>;
  if(!session)return <Redirect href="/login"/>;
  if(landing.isError)return <Redirect href="/home"/>;
  return <Redirect href={landing.data??'/home'}/>;
}
