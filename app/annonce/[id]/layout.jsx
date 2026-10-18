import { SITE_URL } from '../../../lib/site';

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ');

// Aperçu riche quand le lien est partagé (Facebook, Instagram, WhatsApp, Messenger…)
export async function generateMetadata({ params }) {
  const fallback = { title: 'Annonce — DarNa', description: "Annonces immobilières en Tunisie." };
  try {
    const sel = 'title,transaction,price_dt,price_on_request,rent_period,surface_total_m2,rooms,delegation:delegations(name_fr),governorate:governorates(name_fr),listing_photos(storage_path,position)';
    const res = await fetch(`${base}/rest/v1/listings?id=eq.${encodeURIComponent(params.id)}&status=eq.publiee&select=${encodeURIComponent(sel)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const [l] = await res.json();
    if (!l) return fallback;
    const per = l.transaction === 'vente' ? '' : l.rent_period === 'nuit' ? ' / nuit' : l.rent_period === 'an' ? ' / an' : ' / mois';
    const price = l.price_on_request || l.price_dt == null ? 'Prix sur demande' : `${fmt(l.price_dt)} DT${per}`;
    const place = [l.delegation?.name_fr, l.governorate?.name_fr].filter(Boolean).join(', ');
    const facts = [l.surface_total_m2 && `${l.surface_total_m2} m²`, l.rooms && `${l.rooms} pièces`].filter(Boolean).join(' · ');
    const description = [price, place, facts].filter(Boolean).join(' — ');
    const photo = [...(l.listing_photos || [])].sort((a, b) => a.position - b.position)[0];
    const image = photo ? `${base}/storage/v1/object/public/listing-photos/${photo.storage_path}` : `${SITE_URL}/logo.png`;
    const url = `${SITE_URL}/annonce/${params.id}`;
    return {
      title: `${l.title} — DarNa`,
      description,
      alternates: { canonical: url },
      openGraph: { type: 'website', siteName: 'DarNa', title: l.title, description, url, images: [{ url: image }], locale: 'fr_TN' },
      twitter: { card: 'summary_large_image', title: l.title, description, images: [image] },
    };
  } catch (e) {
    return fallback;
  }
}

export default function AnnonceLayout({ children }) {
  return children;
}
