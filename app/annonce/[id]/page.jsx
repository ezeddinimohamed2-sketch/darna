'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase, photoUrl } from '../../../lib/supabase';
import { useSession } from '../../../lib/useSession';
import { useApp } from '../../../components/Providers';
import { priceLabel } from '../../../components/ListingCard';
import { nm, fmt, DEED_KEY } from '../../../lib/data';

const REASONS = ['arnaque', 'doublon', 'mauvaise_categorie', 'prix_faux', 'deja_vendu', 'autre'];

export default function Annonce() {
  const { id } = useParams();
  const { t, lang, say } = useApp();
  const session = useSession();
  const [l, setL] = useState(undefined);
  const [fav, setFav] = useState(false);
  const [rep, setRep] = useState(false);

  useEffect(() => {
    supabase
      .from('listings')
      .select('*,governorate:governorates(name_fr,name_ar),delegation:delegations(name_fr,name_ar),neighborhood:neighborhoods(name_fr,name_ar),owner:profiles!listings_owner_id_fkey(display_name,advertiser,phone,whatsapp,agency_name,verified),listing_photos(storage_path,position)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setL(data || null));
  }, [id]);

  useEffect(() => {
    if (!session) return setFav(false);
    supabase.from('favorites').select('listing_id').eq('listing_id', id).eq('user_id', session.user.id).maybeSingle().then(({ data }) => setFav(!!data));
  }, [session, id]);

  if (l === undefined) return <p>{t('loading')}</p>;
  if (l === null) return <p>{t('notFound')}</p>;

  const photos = [...(l.listing_photos || [])].sort((a, b) => a.position - b.position);
  const place = [nm(l.neighborhood, lang), nm(l.delegation, lang), nm(l.governorate, lang)].filter(Boolean).join(', ');
  const o = l.owner || {};
  const wa = (o.whatsapp || o.phone || '').replace(/\D/g, '');

  const toggleFav = async () => {
    if (!session) return say(t('loginNeeded'));
    if (fav) await supabase.from('favorites').delete().eq('listing_id', id).eq('user_id', session.user.id);
    else await supabase.from('favorites').insert({ listing_id: id, user_id: session.user.id });
    setFav(!fav);
  };
  const report = async (reason) => {
    if (!session) return say(t('loginNeeded'));
    const { error } = await supabase.from('reports').insert({ listing_id: id, reporter_id: session.user.id, reason });
    setRep(false);
    say(error ? error.message : t('reported'));
  };
  const share = () => {
    if (navigator.share) navigator.share({ title: l.title, url: location.href }).catch(() => {});
    else { navigator.clipboard?.writeText(location.href); say('✓'); }
  };

  const facts = [
    l.surface_total_m2 && `${l.surface_total_m2} ${t('m2')}`,
    l.price_per_m2 && l.transaction === 'vente' && `${fmt(Math.round(l.price_per_m2))} ${t('dt')}/${t('m2')}`,
    l.rooms && `${l.rooms} ${t('rooms').toLowerCase()}`,
    l.floor != null && `${t('floor')} ${l.floor === 0 ? t('ground') : l.floor}`,
    l.has_parking && t('parking'),
    l.has_elevator && t('elevator'),
    l.has_pool && t('pool'),
    l.furnished && t('furnished'),
    l.negotiable && t('nego'),
    l.title_deed && DEED_KEY[l.title_deed] && `${t('deed')} : ${t('d_' + DEED_KEY[l.title_deed])}`,
  ].filter(Boolean);

  return (
    <>
      {photos.length > 0 && (
        <div className="gal">{photos.map((p) => <img key={p.storage_path} src={photoUrl(p.storage_path)} alt="" />)}</div>
      )}
      <div className="cprice" style={{ fontSize: '1.5rem' }}>{priceLabel(l, t)}</div>
      <h1>{l.title}</h1>
      <p className="cplace">📍 {place}</p>
      <div className="facts">{facts.map((f) => <span className="fact" key={f}>{f}</span>)}</div>
      {l.description && <p style={{ whiteSpace: 'pre-line' }}>{l.description}</p>}

      <div className="mine">
        <b>{o.agency_name || o.display_name || t('seller')}</b>{' '}
        <span className="pill">{t(o.advertiser || 'particulier')}</span>{' '}
        {o.verified && <span className="pill" style={{ background: 'var(--ok)', color: '#fff' }}>✓ {t('verified')}</span>}
        <div className="cta">
          {o.phone && <a className="btn sea" href={`tel:${o.phone}`}>📞 {t('call')}</a>}
          {wa && <a className="btn" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">💬 {t('whatsapp')}</a>}
        </div>
      </div>

      <div className="row">
        <button className="btn" onClick={toggleFav}>{fav ? '❤️' : '🤍'} {t('fav')}</button>
        <button className="btn" onClick={share}>↗ {t('share')}</button>
        <button className="btn" onClick={() => setRep(!rep)}>⚑ {t('report')}</button>
      </div>
      {rep && (
        <>
          <span className="lbl">{t('reportWhy')}</span>
          <div className="chips">{REASONS.map((r) => <button key={r} className="chip" onClick={() => report(r)}>{t('r_' + r)}</button>)}</div>
        </>
      )}
      <p className="cmeta" style={{ marginTop: 16 }}>{t('publishedOn')} {l.published_at ? new Date(l.published_at).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-FR') : ''}</p>
    </>
  );
}
