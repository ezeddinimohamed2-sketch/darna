'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';
import { useApp } from '../../components/Providers';
import AuthForm from '../../components/AuthForm';
import ListingCard, { priceLabel } from '../../components/ListingCard';

const SEL = 'id,title,status,transaction,price_dt,price_on_request,rent_period,surface_total_m2,rooms,governorate:governorates(name_fr,name_ar),delegation:delegations(name_fr,name_ar),owner:profiles!listings_owner_id_fkey(verified),listing_photos(storage_path,position)';

export default function Compte() {
  const { t, say, lang } = useApp();
  const [newPw, setNewPw] = useState('');
  const session = useSession();
  const [p, setP] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [phone, setPhone] = useState('');
  const [adv, setAdv] = useState('particulier');
  const [mine, setMine] = useState([]);
  const [favs, setFavs] = useState([]);

  const load = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;
    const [a, b, c] = await Promise.all([
      supabase.from('profiles').select('phone,whatsapp,advertiser,is_admin').eq('id', uid).maybeSingle(),
      supabase.from('listings').select(SEL).eq('owner_id', uid).order('created_at', { ascending: false }),
      supabase.from('favorites').select('listing:listings(' + SEL + ')').eq('user_id', uid),
    ]);
    setP(a.data || {});
    setIsAdmin(!!a.data?.is_admin);
    setPhone((a.data?.phone || '').replace('+216', ''));
    setAdv(a.data?.advertiser || 'particulier');
    setMine(b.data || []);
    setFavs((c.data || []).map((x) => x.listing).filter(Boolean));
  }, [session]);
  useEffect(() => { load(); }, [load]);

  if (session === undefined) return <p>{t('loading')}</p>;
  if (!session) return <AuthForm />;

  const save = async () => {
    if (phone && !/^[0-9]{8}$/.test(phone)) return say(t('phoneBad'));
    const full = phone ? '+216' + phone : null;
    const { error } = await supabase.from('profiles').update({ phone: full, whatsapp: full, advertiser: adv }).eq('id', session.user.id);
    say(error ? error.message : t('saved'));
  };
  const changePw = async () => {
    if (newPw.length < 6) return say(lang === 'ar' ? '6 أحرف على الأقل' : '6 caract\u00e8res minimum');
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (!error) setNewPw('');
    say(error ? error.message : lang === 'ar' ? 'تم تغيير كلمة المرور' : 'Mot de passe modifi\u00e9');
  };
  const setStatus = async (id, status) => { await supabase.from('listings').update({ status }).eq('id', id); load(); };
  const del = async (id) => {
    if (!confirm(t('confirmDel'))) return;
    await supabase.from('listings').delete().eq('id', id);
    load();
  };

  return (
    <>
      <h2>{t('myProfile')}</h2>
      <div className="mine">
        <p className="cmeta" style={{ margin: 0 }}>{session.user.email}</p>
        <span className="lbl">{t('phone')}</span>
        <input type="tel" inputMode="numeric" maxLength={8} placeholder="98 123 456" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
        <span className="lbl">{t('iAm')}</span>
        <div className="chips">
          {['particulier', 'agence', 'promoteur'].map((k) => (
            <button key={k} className={'chip' + (adv === k ? ' on' : '')} onClick={() => setAdv(k)}>{t(k)}</button>
          ))}
        </div>
        <span className="lbl">{lang === 'ar' ? 'تغيير كلمة المرور' : 'Changer le mot de passe'}</span>
        <div className="row" style={{ marginTop: 0 }}>
          <input type="password" style={{ flex: 1 }} autoComplete="new-password" placeholder={lang === 'ar' ? 'كلمة مرور جديدة' : 'Nouveau mot de passe'} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <button className="btn" onClick={changePw}>OK</button>
        </div>
        <div className="row">
          <button className="btn sea" onClick={save}>{t('save')}</button>
          <button className="btn" onClick={() => supabase.auth.signOut()}>{t('logout')}</button>
        </div>
      </div>

      {isAdmin && <Link href="/admin" className="btn sea" style={{ display: 'block', textAlign: 'center', marginTop: 14 }}>Administration</Link>}

      <h2 style={{ marginTop: 22 }}>{t('myListings')}</h2>
      {mine.length === 0 && <p className="cmeta">{t('none')} — <Link href="/publier" className="link">{t('nav_publish')}</Link></p>}
      {mine.map((l) => (
        <div className="mine" key={l.id}>
          <Link href={`/annonce/${l.id}`}><b>{l.title}</b></Link>
          <div className="cmeta">{priceLabel(l, t)} · <span className="pill">{t('st_' + l.status)}</span></div>
          <div className="row">
            {l.status === 'publiee' && <button className="btn" onClick={() => setStatus(l.id, 'vendue_louee')}>{t('markSold')}</button>}
            {(l.status === 'vendue_louee' || l.status === 'expiree') && <button className="btn" onClick={() => setStatus(l.id, 'publiee')}>{t('republish')}</button>}
            <button className="btn danger" onClick={() => del(l.id)}>{t('del')}</button>
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 22 }}>{t('myFavs')}</h2>
      {favs.length === 0 && <p className="cmeta">{t('none')}</p>}
      <div className="grid">{favs.map((l) => <ListingCard key={l.id} l={l} />)}</div>
    </>
  );
}
