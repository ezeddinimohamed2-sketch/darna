'use client';
import Link from 'next/link';
import { useApp } from './Providers';
import Icon from './Icons';
import { photoUrl } from '../lib/supabase';
import { nm, fmt } from '../lib/data';

export function priceLabel(l, t) {
  if (l.price_on_request || l.price_dt == null) return t('onRequest');
  const per = l.transaction === 'vente' ? '' : l.rent_period === 'nuit' ? t('perNight') : l.rent_period === 'an' ? t('perYear') : t('perMonth');
  return `${fmt(l.price_dt)} ${t('dt')}${per}`;
}

// « il y a 3 jours » / « منذ 3 أيام »
export function ago(d, lang) {
  if (!d) return '';
  try {
    const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'fr', { numeric: 'auto' });
    const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.345, 'week'], [12, 'month'], [Infinity, 'year']];
    let v = (new Date(d).getTime() - Date.now()) / 1000;
    for (const [k, u] of steps) {
      if (Math.abs(v) < k) return rtf.format(Math.round(v), u);
      v /= k;
    }
  } catch (e) {}
  return '';
}

export default function ListingCard({ l, fav, onFav }) {
  const { t, lang, say } = useApp();
  const photos = [...(l.listing_photos || [])].sort((a, b) => a.position - b.position);
  const place = [nm(l.delegation, lang), nm(l.governorate, lang)].filter(Boolean).join(', ');
  const o = l.owner || {};
  const name = o.agency_name || o.display_name || t('seller');
  const href = `/annonce/${l.id}`;
  const meta = [
    l.surface_total_m2 ? `${l.surface_total_m2} ${t('m2')}` : '',
    l.rooms ? `${l.rooms} ${t('rooms').toLowerCase()}` : '',
  ].filter(Boolean).join(' · ');

  const share = () => {
    const url = `${location.origin}${href}`;
    if (navigator.share) navigator.share({ title: l.title, url }).catch(() => {});
    else { navigator.clipboard?.writeText(url); say('✓'); }
  };

  return (
    <article className="post">
      <div className="phead">
        <div className="av">{(name || '?').trim().charAt(0).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div className="pname">
            <span>{name}</span>
            {o.verified && <i className="vtick" title={t('verified')}><Icon n="check" size={11} sw={3.5} /></i>}
          </div>
          <div className="psub">{ago(l.published_at, lang)}</div>
        </div>
      </div>
      <Link href={href} className="ptext">{l.title}</Link>
      <Link href={href} className="pimg">
        {photos[0]
          ? <img src={photoUrl(photos[0].storage_path)} alt="" loading="lazy" />
          : <span className="noimg"><Icon n="home" size={44} /></span>}
        {o.verified && <span className="badge">✓ {t('verified')}</span>}
      </Link>
      <Link href={href} className="pstrip">
        <div className="cplace">{place}</div>
        <div className="cprice">{priceLabel(l, t)}</div>
        {meta && <div className="cmeta">{meta}</div>}
      </Link>
      <div className="pacts">
        {onFav && (
          <button className={'pact' + (fav ? ' on' : '')} onClick={() => onFav(l.id)}>
            <Icon n="heart" size={20} fill={!!fav} /> {t('fav')}
          </button>
        )}
        {o.phone
          ? <a className="pact call" href={`tel:${o.phone}`}><Icon n="phone" size={20} /> {t('call')}</a>
          : <Link className="pact call" href={href}><Icon n="search" size={20} /> {t('view')}</Link>}
        <button className="pact" onClick={share}><Icon n="share" size={20} /> {t('share')}</button>
      </div>
    </article>
  );
}
