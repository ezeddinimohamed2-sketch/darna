import { supabase } from './supabase';
import { shrink } from './photos';
import { fmt } from './data';

export const STATUS_BIEN = {
  prospect: ['Prospect', ''],
  mandat: ['Mandat signé', 'blue'],
  disponible: ['Disponible', 'green'],
  sous_offre: ['Sous offre', 'orange'],
  reserve: ['Réservé', 'orange'],
  vendu: ['Vendu', 'dark'],
  loue: ['Loué', 'dark'],
  retire: ['Retiré', ''],
};
export const ACTIVE_BIEN = ['mandat', 'disponible', 'sous_offre', 'reserve'];
export const KIND_CLIENT = { acheteur: 'Acheteur', vendeur: 'Vendeur', locataire: 'Locataire', bailleur: 'Bailleur', investisseur: 'Investisseur', autre: 'Autre' };
export const TX_LABEL = { vente: 'Vente', location: 'Location', location_saisonniere: 'Saisonnier' };
export const TYPE_LABEL = { appartement: 'Appartement', villa: 'Villa', maison: 'Maison', terrain: 'Terrain', ferme: 'Ferme', bureau: 'Bureau', local_commercial: 'Local commercial', fonds_de_commerce: 'Fonds de commerce', depot_garage: 'Dépôt / garage', immeuble: 'Immeuble', autre: 'Autre' };
export const DEED_LABEL = { titre_bleu: 'Titre bleu', titre_foncier_individuel: 'Titre foncier individuel', titre_arabe: 'Titre arabe', en_cours_immatriculation: 'En cours d’immatriculation', autre: 'Autre' };
export const MANDATE_LABEL = { exclusif: 'Exclusif', semi_exclusif: 'Semi-exclusif', simple: 'Simple', sans: 'Sans mandat' };
export const STAGES = [['nouveau', 'Nouveau'], ['visite', 'Visite'], ['offre', 'Offre'], ['negociation', 'Négociation'], ['promesse', 'Promesse'], ['signature', 'Signature'], ['conclu', 'Conclu'], ['perdu', 'Perdu']];
export const STAGE_LABEL = Object.fromEntries(STAGES);
export const OPEN_STAGES = ['nouveau', 'visite', 'offre', 'negociation', 'promesse', 'signature'];
export const VISIT_STATUS = { planifiee: ['Planifiée', 'blue'], confirmee: ['Confirmée', 'green'], faite: ['Faite', 'dark'], annulee: ['Annulée', ''], absent: ['Absent', 'red'] };
export const REQ_STATUS = { active: ['Active', 'green'], pause: ['En pause', 'orange'], satisfaite: ['Satisfaite', 'dark'], perdue: ['Perdue', ''] };
export const ACT_LABEL = { appel: 'Appel', whatsapp: 'WhatsApp', email: 'E-mail', rdv: 'Rendez-vous', note: 'Note', visite: 'Visite', offre: 'Offre' };
export const HOUSING = ['appartement', 'villa', 'maison'];
export const LAND = ['terrain', 'ferme'];

export const money = (n) => (n == null || n === '' ? '—' : `${fmt(Math.round(+n))} DT`);
export const dateFR = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : '');
export const dateLong = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
export const timeFR = (d) => (d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
export const dtFR = (d) => (d ? `${dateFR(d)} · ${timeFR(d)}` : '');
export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
export const daysFrom = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);

// <input type="datetime-local"> <-> ISO
export const toLocalInput = (d) => {
  const x = d ? new Date(d) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};
export const fromLocalInput = (v) => new Date(v).toISOString();

export const intl = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length === 8 ? '216' + d : d;
};
export const telHref = (p) => (p ? `tel:${p}` : undefined);
export const waHref = (p, text) => (intl(p) ? `https://wa.me/${intl(p)}${text ? '?text=' + encodeURIComponent(text) : ''}` : undefined);

export const gcalHref = (title, startISO, mins, details) => {
  const f = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(new Date(startISO).getTime() + (mins || 30) * 60000);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(startISO)}/${f(end)}&details=${encodeURIComponent(details || '')}`;
};

export function autoTitle(p, placeName) {
  const tx = p.transaction === 'vente' ? 'à vendre' : p.transaction === 'location_saisonniere' ? 'location saisonnière' : 'à louer';
  const rooms = p.rooms && HOUSING.includes(p.property) ? ` S+${Math.max(p.rooms - 1, 0)}` : '';
  return `${TYPE_LABEL[p.property] || 'Bien'}${rooms} ${tx}${p.surface_total_m2 ? ' ' + p.surface_total_m2 + ' m²' : ''}${placeName ? ' — ' + placeName : ''}`.slice(0, 160);
}

// Correspondance demande ↔ bien (null = ne correspond pas)
export function matchScore(r, p) {
  if (!r || !p) return null;
  if (!ACTIVE_BIEN.includes(p.status)) return null;
  if (p.transaction !== r.transaction) return null;
  let score = 0, max = 0;
  const why = [];
  if (r.property_types?.length) { max += 30; if (r.property_types.includes(p.property)) score += 30; else return null; }
  if (r.governorate_id) { max += 20; if (p.governorate_id === r.governorate_id) score += 20; else return null; }
  if (r.delegation_ids?.length) { max += 20; if (r.delegation_ids.includes(p.delegation_id)) score += 20; else return null; }
  if (!p.price_on_request && p.price_dt != null && (r.budget_min || r.budget_max)) {
    max += 30;
    const lo = +r.budget_min || 0, hi = +r.budget_max || Infinity;
    if (p.price_dt >= lo && p.price_dt <= hi) score += 30;
    else if (hi !== Infinity && p.price_dt > hi && p.price_dt <= hi * 1.1) { score += 15; why.push('≈ 10 % au-dessus du budget'); }
    else return null;
  }
  if (r.surface_min) { max += 10; if ((+p.surface_total_m2 || 0) >= +r.surface_min) score += 10; else return null; }
  if (r.rooms_min) { max += 10; if ((+p.rooms || 0) >= +r.rooms_min) score += 10; else return null; }
  return { pct: Math.round((100 * score) / Math.max(max, 1)), why };
}

export function reqSummary(r, govName) {
  const parts = [
    TX_LABEL[r.transaction],
    r.property_types?.length ? r.property_types.map((t) => TYPE_LABEL[t]).join(' / ') : 'Tout type',
    govName,
    r.budget_min || r.budget_max ? `${r.budget_min ? money(r.budget_min) : '0'} – ${r.budget_max ? money(r.budget_max) : '∞'}` : '',
    r.surface_min ? `≥ ${r.surface_min} m²` : '',
    r.rooms_min ? `≥ ${r.rooms_min} pièces` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

export async function logActivity({ kind = 'note', body, client_id = null, property_id = null, deal_id = null }) {
  return supabase.from('crm_activities').insert({ kind, body, client_id, property_id, deal_id });
}
export async function touchClient(id) {
  if (id) await supabase.from('crm_clients').update({ last_contact_at: new Date().toISOString() }).eq('id', id);
}

// ---------- photos ----------
export const crmPhotoUrl = (path) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`;

export async function uploadPropertyPhotos(uid, propertyId, files, startPos) {
  let err = '';
  const rows = [];
  let n = startPos;
  for (const f of files) {
    const blob = await shrink(f);
    const path = `${uid}/crm/${propertyId}/${Date.now()}-${n}.jpg`;
    const { error } = await supabase.storage.from('listing-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) err = error.message;
    else rows.push({ property_id: propertyId, storage_path: path, position: n++ });
  }
  if (rows.length) {
    const { error } = await supabase.from('crm_property_photos').insert(rows);
    if (error) err = error.message;
  }
  return err;
}

// ---------- publication sur DarNa ----------
export function listingProblems(p, hasPhotos) {
  const out = [];
  const title = (p.title || '').trim();
  if (title.length < 10) out.push('Le titre doit faire au moins 10 caractères.');
  if (/(\+?216)?[ .-]?[2-9][0-9]([ .-]?[0-9]{3}){2}/.test(title)) out.push('Le titre ne doit pas contenir de numéro de téléphone.');
  if (!p.governorate_id || !p.delegation_id) out.push('Choisissez le gouvernorat et la délégation.');
  if (!p.price_on_request && !(+p.price_dt > 0)) out.push('Indiquez le prix ou cochez « prix sur demande ».');
  if (HOUSING.includes(p.property) && p.rooms == null) out.push('Indiquez le nombre de pièces.');
  if (LAND.includes(p.property) && !(+p.surface_total_m2 > 0)) out.push('Indiquez la surface du terrain.');
  if (!hasPhotos) out.push('Ajoutez au moins une photo (fortement recommandé).');
  return out;
}

function listingRow(p, uid) {
  const rentPeriod = p.transaction === 'vente' ? null : p.rent_period || (p.transaction === 'location_saisonniere' ? 'nuit' : 'mois');
  return {
    transaction: p.transaction,
    property: p.property,
    title: p.title.trim(),
    description: p.description || null,
    governorate_id: p.governorate_id,
    delegation_id: p.delegation_id,
    neighborhood_id: p.neighborhood_id || null,
    price_on_request: !!p.price_on_request,
    price_dt: p.price_on_request ? null : p.price_dt,
    rent_period: rentPeriod,
    negotiable: !!p.negotiable,
    surface_total_m2: p.surface_total_m2 || null,
    surface_built_m2: p.surface_built_m2 || null,
    rooms: p.rooms ?? null,
    bathrooms: p.bathrooms ?? null,
    floor: p.floor ?? null,
    title_deed: p.transaction === 'vente' ? p.title_deed || null : null,
    furnished: !!p.furnished,
    has_parking: !!p.has_parking,
    has_elevator: !!p.has_elevator,
    has_pool: !!p.has_pool,
  };
}

async function syncListingPhotos(uid, listingId, photos) {
  await supabase.from('listing_photos').delete().eq('listing_id', listingId);
  const old = await supabase.storage.from('listing-photos').list(`${uid}/${listingId}`);
  if (old.data?.length) await supabase.storage.from('listing-photos').remove(old.data.map((o) => `${uid}/${listingId}/${o.name}`));
  const rows = [];
  let i = 0;
  for (const ph of [...photos].sort((a, b) => a.position - b.position)) {
    const dest = `${uid}/${listingId}/${i}.jpg`;
    const { error } = await supabase.storage.from('listing-photos').copy(ph.storage_path, dest);
    if (!error) rows.push({ listing_id: listingId, storage_path: dest, position: i++ });
  }
  if (rows.length) await supabase.from('listing_photos').insert(rows);
  return rows.length;
}

// publie ou met à jour l'annonce liée
export async function publishProperty(uid, p, photos) {
  const probs = listingProblems(p, photos.length > 0).filter((x) => !x.startsWith('Ajoutez au moins une photo'));
  if (probs.length) return { error: probs.join(' ') };
  const row = listingRow(p, uid);
  let listingId = p.listing_id;
  if (listingId) {
    const { error } = await supabase.from('listings').update({ ...row, status: 'publiee', published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60 * 864e5).toISOString() }).eq('id', listingId);
    if (error) return { error: error.code === '23505' ? 'Une annonce identique est déjà en ligne.' : error.message };
  } else {
    const { data, error } = await supabase.from('listings').insert({ ...row, owner_id: uid, lang: 'fr', status: 'publiee', published_at: new Date().toISOString() }).select('id').single();
    if (error) return { error: error.code === '23505' ? 'Une annonce identique est déjà en ligne (même type, lieu, surface et prix).' : error.message };
    listingId = data.id;
    const { error: e2 } = await supabase.from('crm_properties').update({ listing_id: listingId }).eq('id', p.id);
    if (e2) return { error: e2.message };
  }
  const n = await syncListingPhotos(uid, listingId, photos);
  return { listingId, photos: n };
}

export async function withdrawProperty(p) {
  if (!p.listing_id) return {};
  const { error } = await supabase.from('listings').update({ status: 'brouillon' }).eq('id', p.listing_id);
  return { error: error?.message };
}

// ---------- affaires ----------
export async function moveDeal(deal, stage, property, extra = {}) {
  const patch = { stage, ...extra };
  if (stage === 'conclu') patch.closed_at = new Date().toISOString();
  else if (stage !== 'perdu') patch.closed_at = null;
  const { error } = await supabase.from('crm_deals').update(patch).eq('id', deal.id);
  if (error) return { error: error.message };
  await logActivity({ kind: 'offre', body: `Affaire : ${STAGE_LABEL[stage]}${extra.lost_reason ? ' — ' + extra.lost_reason : ''}`, deal_id: deal.id, client_id: deal.client_id, property_id: deal.property_id });
  if (property) {
    if (stage === 'conclu') {
      await supabase.from('crm_properties').update({ status: property.transaction === 'vente' ? 'vendu' : 'loue' }).eq('id', property.id);
      if (property.listing_id) await supabase.from('listings').update({ status: 'vendue_louee' }).eq('id', property.listing_id);
    } else if (['offre', 'negociation', 'promesse', 'signature'].includes(stage) && ['disponible', 'mandat'].includes(property.status)) {
      await supabase.from('crm_properties').update({ status: 'sous_offre' }).eq('id', property.id);
    }
  }
  if (stage === 'conclu' && deal.request_id) await supabase.from('crm_requests').update({ status: 'satisfaite' }).eq('id', deal.request_id);
  return {};
}

export function suggestCommission(property, amount) {
  if (!property) return null;
  if (property.commission_fixed) return +property.commission_fixed;
  if (property.commission_pct && amount) return Math.round((+amount * +property.commission_pct) / 100);
  return null;
}
