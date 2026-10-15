'use client';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return session;
}
