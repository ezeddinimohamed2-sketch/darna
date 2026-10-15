'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from './Providers';

export default function AuthForm() {
  const { t } = useApp();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(t('authErr'));
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg(t('checkMail'));
    }
    setBusy(false);
  };

  return (
    <form onSubmit={go} className="auth">
      <input type="email" required placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <input type="password" required minLength={6} placeholder={t('password')} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      {msg && <p className="msg">{msg}</p>}
      <button className="btn primary" disabled={busy}>{mode === 'login' ? t('login') : t('signup')}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? `${t('noAcc')} ${t('signup')}` : t('haveAcc')}
      </button>
    </form>
  );
}
