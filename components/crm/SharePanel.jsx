'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useApp } from '../Providers';
import Icon from '../Icons';
import { SITE_URL } from '../../lib/site';
import { money, TX_LABEL, TYPE_LABEL, crmPhotoUrl, dtFR } from '../../lib/crm';

const tag = (s) => '#' + String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

export function buildCaption(p, place, phone, url) {
  const per = p.transaction === 'vente' ? '' : p.rent_period === 'nuit' ? ' / nuit' : p.rent_period === 'an' ? ' / an' : ' / mois';
  const price = p.price_on_request || p.price_dt == null ? 'Prix sur demande' : money(p.price_dt) + per;
  const lines = [
    `🏡 ${p.title}`,
    '',
    `💰 ${price}`,
    place ? `📍 ${place}` : '',
    [p.surface_total_m2 && `📐 ${p.surface_total_m2} m²`, p.rooms && `🛏 ${p.rooms} pièces`].filter(Boolean).join('   '),
    '',
    phone ? `📞 ${phone}` : '',
    `👉 Toutes les photos et détails : ${url}`,
  ].filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0));
  const tags = [
    '#immobilier', '#tunisie', '#darna',
    p.transaction === 'vente' ? '#avendre' : '#alouer',
    tag(TYPE_LABEL[p.property]),
    ...place.split(',').map((x) => tag(x.trim())),
  ].filter((t) => t.length > 2);
  return lines.join('\n') + '\n\n' + [...new Set(tags)].join(' ');
}

export default function SharePanel({ p, place, photos, phone }) {
  const { say } = useApp();
  const url = `${SITE_URL}/annonce/${p.listing_id}`;
  const initial = useMemo(() => buildCaption(p, place, phone, url), [p, place, phone, url]);
  const [caption, setCaption] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [conn, setConn] = useState(undefined);
  const [posts, setPosts] = useState([]);
  const [pub, setPub] = useState('');

  const loadSocial = () => {
    supabase.from('crm_social').select('fb_page_id,fb_page_name,ig_user_id,ig_username').maybeSingle().then(({ data }) => setConn(data || null));
    supabase.from('crm_social_posts').select('id,network,posted_at').eq('property_id', p.id).order('posted_at', { ascending: false }).then(({ data }) => setPosts(data || []));
  };
  useEffect(loadSocial, [p.id]); // eslint-disable-line

  const publishTo = async (network) => {
    const name = network === 'facebook' ? `la page « ${conn.fb_page_name} »` : `@${conn.ig_username}`;
    const already = posts.find((x) => x.network === network);
    if (!confirm(`${already ? 'Ce bien a déjà été publié ici. Publier à nouveau' : 'Publier maintenant'} sur ${name} ?`)) return;
    setPub(network);
    const { data: { session } } = await supabase.auth.getSession();
    const text = network === 'instagram' ? caption.replace(/^👉.*$/m, '👉 Lien dans la bio') : caption;
    const r = await fetch('/api/social/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ property_id: p.id, network, caption: text, images: photos.slice(0, 10).map((x) => crmPhotoUrl(x.storage_path)), link: url }),
    });
    const j = await r.json().catch(() => ({}));
    setPub('');
    if (!r.ok) return say(j.error || 'Publication impossible');
    say(network === 'facebook' ? 'Publié sur Facebook ✓' : 'Publié sur Instagram ✓');
    loadSocial();
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(caption); say('Texte copié ✓'); return true; } catch (e) { say('Copie impossible : sélectionnez le texte à la main.'); return false; }
  };

  const loadFiles = async (max = 10) => {
    const out = [];
    for (const [i, ph] of photos.slice(0, max).entries()) {
      const r = await fetch(crmPhotoUrl(ph.storage_path));
      const b = await r.blob();
      out.push(new File([b], `${(p.reference || 'bien').replace(/\W+/g, '-')}-${i + 1}.jpg`, { type: 'image/jpeg' }));
    }
    return out;
  };

  // Feuille de partage du téléphone : choisir Instagram, Facebook, Messenger, WhatsApp…
  const nativeShare = async () => {
    setBusy(true);
    try {
      const files = await loadFiles();
      if (files.length && navigator.canShare?.({ files })) {
        await copy();
        await navigator.share({ files, text: caption });
      } else if (navigator.share) {
        await navigator.share({ text: caption, url });
      } else {
        await copy();
        say('Partage direct indisponible ici : texte copié, utilisez « Télécharger les photos ».');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') say('Partage impossible : ' + (e?.message || ''));
    }
    setBusy(false);
  };

  const download = async () => {
    setBusy(true);
    try {
      const files = await loadFiles(12);
      files.forEach((f, i) => setTimeout(() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, i * 250));
      await copy();
    } catch (e) { say('Téléchargement impossible.'); }
    setBusy(false);
  };

  const fb = () => {
    copy();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
  };
  const ig = async () => {
    await copy();
    say(photos.length ? 'Texte copié. Ajoutez les photos dans Instagram, puis collez le texte.' : 'Texte copié.');
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="panel">
      <h3>Publier sur Facebook et Instagram</h3>
      <p className="cmeta" style={{ marginTop: 0 }}>Le texte est prêt (modifiable). Les boutons colorés publient directement. « Partager (téléphone) » ouvre vos applications avec les photos et le texte.</p>
      <textarea style={{ minHeight: 190 }} value={caption} onChange={(e) => setCaption(e.target.value)} />
      <div className="row">
        <button className="btn" style={{ background: '#1877F2', color: '#fff' }} disabled={!!pub || !conn?.fb_page_id} onClick={() => publishTo('facebook')}>{pub === 'facebook' ? 'Publication…' : 'Publier sur ma page Facebook'}</button>
        <button className="btn" style={{ background: 'linear-gradient(45deg,#f09433,#dc2743,#bc1888)', color: '#fff' }} disabled={!!pub || !conn?.ig_user_id || !photos.length} onClick={() => publishTo('instagram')}>{pub === 'instagram' ? 'Publication…' : 'Publier sur mon Instagram'}</button>
      </div>
      {conn === null && <p className="warn-box" style={{ marginTop: 8 }}>Pour publier en un clic, <Link className="link" style={{ padding: 0 }} href="/crm/reseaux">connectez votre page Facebook et votre Instagram</Link> (une seule fois).</p>}
      {conn && !conn.ig_user_id && <p className="cmeta">Aucun Instagram lié à cette page : seul Facebook est disponible.</p>}
      {conn?.ig_user_id && !photos.length && <p className="cmeta">Instagram exige au moins une photo.</p>}
      {posts.length > 0 && <p className="cmeta">{posts.map((x) => `${x.network === 'facebook' ? 'Facebook' : 'Instagram'} : publié ${dtFR(x.posted_at)}`).join(' · ')}</p>}
      <div className="row">
        <button className="btn primary" style={{ width: 'auto' }} disabled={busy} onClick={nativeShare}><Icon n="share" size={18} /> {busy ? '…' : 'Partager (téléphone)'}</button>
        <button className="btn" onClick={fb}>Facebook (manuel)</button>
        <button className="btn" onClick={ig}>Instagram (manuel)</button>
      </div>
      <div className="row">
        <button className="btn" onClick={copy}>Copier le texte</button>
        <button className="btn" disabled={busy || !photos.length} onClick={download}>Télécharger les photos</button>
        <button className="btn" onClick={() => setCaption(initial)}>Réinitialiser</button>
      </div>
      <p className="cmeta" style={{ marginBottom: 0 }}>Facebook affiche automatiquement la photo, le titre et le prix du lien DarNa. Instagram n’accepte pas de lien cliquable dans une publication : mettez-le dans votre bio.</p>
    </section>
  );
}
