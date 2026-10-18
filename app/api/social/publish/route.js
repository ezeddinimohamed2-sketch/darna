import { NextResponse } from 'next/server';
import { graph, userClient } from '../../../../lib/graph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PUBLIC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function publishFacebook({ page, token, caption, images, link }) {
  if (images.length === 0) {
    const r = await graph(`/${page}/feed`, { method: 'POST', params: { message: caption, link, access_token: token } });
    return r.id;
  }
  if (images.length === 1) {
    const r = await graph(`/${page}/photos`, { method: 'POST', params: { url: images[0], caption, access_token: token } });
    return r.post_id || r.id;
  }
  const ids = [];
  for (const u of images.slice(0, 10)) {
    const r = await graph(`/${page}/photos`, { method: 'POST', params: { url: u, published: 'false', access_token: token } });
    ids.push(r.id);
  }
  const attached = Object.fromEntries(ids.map((id, i) => [`attached_media[${i}]`, { media_fbid: id }]));
  const r = await graph(`/${page}/feed`, { method: 'POST', params: { message: caption, ...attached, access_token: token } });
  return r.id;
}

async function waitReady(id, token) {
  for (let i = 0; i < 20; i++) {
    const s = await graph(`/${id}`, { params: { fields: 'status_code', access_token: token } });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram a refusé l’image (format ou dimensions non acceptés : ratio entre 4:5 et 1,91:1).');
    await sleep(1500);
  }
  throw new Error('Instagram met trop de temps à traiter les images. Réessayez dans un instant.');
}

async function publishInstagram({ ig, token, caption, images }) {
  if (images.length === 0) throw new Error('Instagram exige au moins une photo.');
  let creation;
  if (images.length === 1) {
    const c = await graph(`/${ig}/media`, { method: 'POST', params: { image_url: images[0], caption, access_token: token } });
    creation = c.id;
  } else {
    const kids = [];
    for (const u of images.slice(0, 10)) {
      const c = await graph(`/${ig}/media`, { method: 'POST', params: { image_url: u, is_carousel_item: 'true', access_token: token } });
      kids.push(c.id);
    }
    for (const k of kids) await waitReady(k, token);
    const c = await graph(`/${ig}/media`, { method: 'POST', params: { media_type: 'CAROUSEL', children: kids.join(','), caption, access_token: token } });
    creation = c.id;
  }
  await waitReady(creation, token);
  const p = await graph(`/${ig}/media_publish`, { method: 'POST', params: { creation_id: creation, access_token: token } });
  return p.id;
}

export async function POST(req) {
  const sb = userClient(req);
  if (!sb) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const { property_id, network, caption, images = [], link } = await req.json().catch(() => ({}));
  if (!property_id || !['facebook', 'instagram'].includes(network) || !caption) return NextResponse.json({ error: 'Requête incomplète.' }, { status: 400 });
  if (caption.length > 2200) return NextResponse.json({ error: 'Texte trop long (2 200 caractères maximum).' }, { status: 400 });
  if (!Array.isArray(images) || images.some((u) => typeof u !== 'string' || !u.startsWith(PUBLIC_PREFIX))) return NextResponse.json({ error: 'Photos invalides.' }, { status: 400 });

  // le bien doit appartenir à l'utilisateur (les règles de sécurité le garantissent)
  const { data: prop } = await sb.from('crm_properties').select('id').eq('id', property_id).maybeSingle();
  if (!prop) return NextResponse.json({ error: 'Bien introuvable.' }, { status: 404 });

  const { data: conn } = await sb.rpc('crm_social_token');
  const c = conn?.[0];
  if (!c) return NextResponse.json({ error: 'Connectez d’abord vos réseaux (onglet Réseaux).' }, { status: 400 });

  try {
    let externalId;
    if (network === 'facebook') {
      if (!c.fb_page_id || !c.fb_page_token) throw new Error('Aucune page Facebook connectée.');
      externalId = await publishFacebook({ page: c.fb_page_id, token: c.fb_page_token, caption, images, link });
    } else {
      if (!c.ig_user_id || !c.fb_page_token) throw new Error('Aucun compte Instagram connecté.');
      externalId = await publishInstagram({ ig: c.ig_user_id, token: c.fb_page_token, caption, images });
    }
    await sb.from('crm_social_posts').insert({ property_id, network, external_id: String(externalId || '') });
    return NextResponse.json({ ok: true, id: externalId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
