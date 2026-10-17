'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { useApp } from '../components/Providers';
import ListingCard from '../components/ListingCard';
import { TX_MAP, PUB_TYPES, nm, fmt } from '../lib/data';

const BUDGETS = {
  vente: [150000, 300000, 500000, 800000, 1500000],
  location: [400, 700, 1000, 1500, 2500],
  saison: [100, 200, 350, 600],
};

export default function Home() {
  const { t, lang, say } = useApp();
  const session = useSession();
  const [tx, setTx] = useState('vente');
  const [type, setType] = useState('');
  const [gov, setGov] = useState('');
  const [deleg, setDeleg] = useState('');
  const [max, setMax] = useState(0);
  const [govs, setGovs] = useState([]);
  const [delegs, setDelegs] = useState([]);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    supabase.from('governorates').select('id,name_fr,name_ar').order('name_fr').then(({ data }) => setGovs(data || []));
  }, []);
  useEffect(() => {
    setDeleg('');
    if (!gov) return setDelegs([]);
    supabase.from('delegations').select('id,name_fr,name_ar').eq('governorate_id', gov).order('name_fr').then(({ data }) => setDelegs(data || []));
  }, [gov]);

  useEffect(() => {
    let alive = true;
    setRows(null);
    let q = supabase
      .from('listings')
      .select('id,title,transaction,property,price_dt,price_on_request,rent_period,surface_total_m2,rooms,governorate:governorates(name_fr,name_ar),delegation:delegations(name_fr,name_ar),owner:profiles!listings_owner_id_fkey(verified),listing_photos(storage_path,position)')
      .eq('status', 'publiee')
      .eq('transaction', TX_MAP[tx])
      .order('published_at', { ascending: false })
      .limit(40);
    if (type) q = q.eq('property', type);
    if (gov) q = q.eq('governorate_id', gov);
    if (deleg) q = q.eq('delegation_id', deleg);
    if (max) q = q.lte('price_dt', max);
    q.then(({ data }) => alive && setRows(data || []));
    return () => { alive = false; };
  }, [tx, type, gov, deleg, max]);

  const setTxReset = (k) => { setTx(k); setMax(0); };

  const alert = async () => {
    if (!session) return say(t('alertLogin'));
    const filters = { transaction: TX_MAP[tx], property: type || null, governorate_id: gov ? +gov : null, delegation_id: deleg ? +deleg : null, max_price: max || null };
    const { error } = await supabase.from('saved_searches').insert({ user_id: session.user.id, filters });
    say(error ? error.message : t('alertOk'));
  };

  return (
    <>
      <section className="hero">
        <h1>{t('app')}</h1>
        <p>{t('tag')}</p>
      </section>

      <div className="chips">
        {['vente', 'location', 'saison'].map((k) => (
          <button key={k} className={'chip' + (tx === k ? ' on' : '')} onClick={() => setTxReset(k)}>{t('tx_' + k)}</button>
        ))}
      </div>

      <span className="lbl">{t('nav_search')}</span>
      <div className="chips">
        <button className={'chip' + (!type ? ' on' : '')} onClick={() => setType('')}>{t('all')}</button>
        {PUB_TYPES.map((p) => (
          <button key={p} className={'chip' + (type === p ? ' on' : '')} onClick={() => setType(p)}>{t('p_' + p)}</button>
        ))}
      </div>

      <span className="lbl">{t('gov')}</span>
      <select value={gov} onChange={(e) => setGov(e.target.value)}>
        <option value="">{t('allGov')}</option>
        {govs.map((g) => <option key={g.id} value={g.id}>{nm(g, lang)}</option>)}
      </select>
      {gov && (
        <select style={{ marginTop: 8 }} value={deleg} onChange={(e) => setDeleg(e.target.value)}>
          <option value="">{t('allDeleg')}</option>
          {delegs.map((d) => <option key={d.id} value={d.id}>{nm(d, lang)}</option>)}
        </select>
      )}

      <span className="lbl">{t('budget')}</span>
      <div className="chips">
        <button className={'chip' + (!max ? ' on' : '')} onClick={() => setMax(0)}>{t('any')}</button>
        {BUDGETS[tx].map((b) => (
          <button key={b} className={'chip' + (max === b ? ' on' : '')} onClick={() => setMax(b)}>≤ {fmt(b)}</button>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>{rows ? t('results', rows.length) : t('loading')}</h2>
      {rows && rows.length === 0 && (
        <div className="empty">
          <div className="big">🏡</div>
          <h3>{t('emptyT')}</h3>
          <p>{t('emptyD')}</p>
          <Link href="/publier" className="btn primary" style={{ display: 'block' }}>{t('emptyCta')}</Link>
        </div>
      )}
      <div className="grid">{(rows || []).map((l) => <ListingCard key={l.id} l={l} />)}</div>
      <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={alert}>🔔 {t('alertBtn')}</button>
    </>
  );
}
