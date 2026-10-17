'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from './Providers';

export default function AuthForm() {
  const { t, lang } = useApp();
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

  const forgot = async () => {
    if (!email) return setMsg(lang === 'ar' ? 'أدخل بريدك الإلكتروني أولا' : 'Entrez d\u2019abord votre e-mail');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset` });
    setMsg(error ? error.message : lang === 'ar' ? 'تم إرسال رابط إعادة التعيين إلى بريدك' : 'Lien envoy\u00e9 : v\u00e9rifiez votre e-mail (et les spams).');
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
      {mode === 'login' && (
        <button type="button" className="link" onClick={forgot} disabled={busy}>
          {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Mot de passe oubli\u00e9 ?'}
        </button>
      )}
    </form>
  );
}
