import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { registerPushForCurrentUser, subscribeToInAppNotifications } from '@/src/lib/pushNotifications';
import { CartProvider } from '@/src/state/cart';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 2 }, mutations: { retry: 0 } } });
type AuthValue = { session: Session | null; loading: boolean };
const AuthContext = createContext<AuthValue>({ session: null, loading: true });
export function useAuth() { return useContext(AuthContext); }

export function AppProviders({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session?.user?.id) return;
    void registerPushForCurrentUser().catch(() => undefined);
    return subscribeToInAppNotifications(session.user.id);
  }, [session?.user?.id]);
  const auth = useMemo(() => ({ session, loading }), [session, loading]);
  return <QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}><CartProvider>{children}</CartProvider></AuthContext.Provider></QueryClientProvider>;
}
