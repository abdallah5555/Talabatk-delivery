import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/ui';
import { useAuth } from '@/src/providers/AppProviders';
import { getMyRoles } from '@/src/lib/api';

export default function Index(){
  const {session,loading}=useAuth();
  const roles=useQuery({queryKey:['roles'],queryFn:getMyRoles,enabled:!!session?.user?.id});
  if(loading||roles.isLoading)return <Screen><ActivityIndicator/></Screen>;
  if(!session)return <Redirect href="/login"/>;
  const values=roles.data??[];
  if(values.includes('admin'))return <Redirect href="/admin"/>;
  if(values.includes('merchant'))return <Redirect href="/role/merchant"/>;
  if(values.includes('driver'))return <Redirect href="/role/driver"/>;
  return <Redirect href="/home"/>;
}
