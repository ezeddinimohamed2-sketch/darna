'use client';
import Link from 'next/link';
import { useApp } from './Providers';
import { photoUrl } from '../lib/supabase';
import { nm, fmt } from '../lib/data';

export function priceLabel(l, t) {
  if (l.price_on_request || l.price_dt == null) return t('onRequest');
  const per = l.transaction === 'vente' ? '' : l.rent_period === 'nuit' ? t('perNight') : l.rent_period === 'an' ? t('perYear') : t('perMonth');
  return `${fmt(l.price_dt)} ${t('dt')}${per}`;
}

export default function ListingCard({ l }) {
  const { t, lang } = useApp();
  const photos = [...(l.listing_photos || [])].sort((a, b) => a.position - b.position);
  const place = [nm(l.delegation, lang), nm(l.governorate, lang)].filter(Boolean).join(', ');
  return (
    <Link href={`/annonce/${l.id}`} className="card">
      <div className="thumb">
        {photos[0] ? <img src={photoUrl(photos[0].storage_path)} alt="" loading="lazy" /> : <span className="noimg">🏠</span>}
        {l.owner?.verified && <span className="badge">✓ {t('verified')}</span>}
      </div>
      <div className="cbody">
        <div className="cprice">{priceLabel(l, t)}</div>
        <div className="ctitle">{l.title}</div>
        <div className="cmeta">
          {l.surface_total_m2 ? `${l.surface_total_m2} ${t('m2')}` : ''}
          {l.rooms ? ` · ${l.rooms} ${t('rooms').toLowerCase()}` : ''}
        </div>
        <div className="cplace">📍 {place}</div>
      </div>
    </Link>
  );
}
