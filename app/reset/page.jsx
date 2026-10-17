'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';
import { useApp } from '../../components/Providers';

export default function Reset() {
  const { lang, say } = useApp();
  const router = useRouter();
  const session = useSession();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const ar = lang === 'ar';

  if (session === undefined) return <p>...</p>;
  if (!session) return <p>{ar ? 'الرابط غير صالح أو منتهي. اطلب رابطا جديدا.' : 'Lien invalide ou expir\u00e9. Demandez un nouveau lien.'}</p>;

  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return say(error.message);
    say(ar ? 'تم تغيير كلمة المرور' : 'Mot de passe modifi\u00e9');
    router.push('/compte');
  };

  return (
    <form onSubmit={go} className="auth">
      <h2>{ar ? 'كلمة مرور جديدة' : 'Nouveau mot de passe'}</h2>
      <input type="password" required minLength={6} placeholder={ar ? 'كلمة المرور (6 أحرف على الأقل)' : 'Mot de passe (6 caract\u00e8res min.)'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      <button className="btn primary" disabled={busy}>{ar ? 'حفظ' : 'Enregistrer'}</button>
    </form>
  );
}
