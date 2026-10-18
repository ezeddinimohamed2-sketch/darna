'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../Providers';
import { Sheet, Field, Seg, Num, useGeo, useClients, ClientSelect, clean } from './ui';
import {
  KIND_CLIENT, TX_LABEL, TYPE_LABEL, DEED_LABEL, MANDATE_LABEL, STATUS_BIEN, STAGES, VISIT_STATUS, REQ_STATUS,
  HOUSING, autoTitle, toLocalInput, fromLocalInput, logActivity, suggestCommission, money,
} from '../../lib/crm';

const num = (v) => (v ? +v : null);

/* ---------- Client ---------- */
export function ClientForm({ initial, onClose, onSaved }) {
  const { say } = useApp();
  const [f, setF] = useState({ kind: 'acheteur', ...initial, tagsText: (initial?.tags || []).join(', ') });
  const [busy, setBusy] = useState(false);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const save = async () => {
    if ((f.full_name || '').trim().length < 2) return say('Indiquez le nom du client.');
    setBusy(true);
    const row = clean({
      full_name: f.full_name.trim(), phone: f.phone, whatsapp: f.whatsapp, email: f.email, kind: f.kind,
      source: f.source, notes: f.notes,
      tags: (f.tagsText || '').split(',').map((s) => s.trim()).filter(Boolean),
    });
    const q = f.id ? supabase.from('crm_clients').update(row).eq('id', f.id).select('id').single() : supabase.from('crm_clients').insert(row).select('id').single();
    const { data, error } = await q;
    setBusy(false);
    if (error) return say(error.message);
    say('Client enregistré');
    onSaved(data.id);
  };
  return (
    <Sheet title={f.id ? 'Modifier le client' : 'Nouveau client'} onClose={onClose}>
      <Field label="Nom complet *"><input type="text" value={f.full_name || ''} onChange={(e) => set({ full_name: e.target.value })} autoFocus /></Field>
      <div className="g2">
        <Field label="Téléphone"><input type="tel" inputMode="tel" value={f.phone || ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="WhatsApp (si différent)"><input type="tel" inputMode="tel" value={f.whatsapp || ''} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
      </div>
      <Field label="E-mail"><input type="email" value={f.email || ''} onChange={(e) => set({ email: e.target.value })} /></Field>
      <Field label="Type de client"><Seg value={f.kind} onChange={(v) => set({ kind: v })} options={Object.entries(KIND_CLIENT)} /></Field>
      <div className="g2">
        <Field label="Source"><input type="text" placeholder="DarNa, bouche-à-oreille, Facebook…" value={f.source || ''} onChange={(e) => set({ source: e.target.value })} /></Field>
        <Field label="Étiquettes (séparées par des virgules)"><input type="text" placeholder="VIP, investisseur…" value={f.tagsText} onChange={(e) => set({ tagsText: e.target.value })} /></Field>
      </div>
      <Field label="Notes"><textarea value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
      <button className="btn primary" style={{ marginTop: 16 }} disabled={busy} onClick={save}>{busy ? '…' : 'Enregistrer'}</button>
    </Sheet>
  );
}

/* ---------- Bien ---------- */
export function PropertyForm({ initial, onClose, onSaved }) {
  const { say } = useApp();
  const [f, setF] = useState({ transaction: 'vente', property: 'appartement', status: 'disponible', rent_period: 'mois', ...initial });
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const { govs, delegs, hoods } = useGeo(f.governorate_id);
  const [clients, reloadClients] = useClients();
  const [busy, setBusy] = useState(false);
  const [qc, setQc] = useState(null);
  const sale = f.transaction === 'vente';

  const addOwner = async () => {
    if ((qc.name || '').trim().length < 2) return say('Nom du propriétaire ?');
    const { data, error } = await supabase.from('crm_clients').insert(clean({ full_name: qc.name.trim(), phone: qc.phone, kind: sale ? 'vendeur' : 'bailleur', source: 'Mandat' })).select('id').single();
    if (error) return say(error.message);
    await reloadClients();
    set({ owner_client_id: data.id });
    setQc(null);
  };

  const save = async () => {
    setBusy(true);
    const gv = govs.find((g) => g.id === f.governorate_id);
    const dl = delegs.find((d) => d.id === f.delegation_id);
    const place = [dl?.name_fr, gv?.name_fr].filter(Boolean).join(', ');
    const title = (f.title || '').trim() || autoTitle(f, place);
    const row = clean({
      owner_client_id: f.owner_client_id || null, reference: f.reference, title,
      transaction: f.transaction, property: f.property,
      governorate_id: f.governorate_id || null, delegation_id: f.delegation_id || null, neighborhood_id: f.neighborhood_id || null,
      address: f.address,
      price_dt: f.price_on_request ? null : num(f.price_dt), price_on_request: !!f.price_on_request,
      rent_period: sale ? null : f.rent_period, negotiable: !!f.negotiable,
      surface_total_m2: num(f.surface_total_m2), surface_built_m2: num(f.surface_built_m2),
      rooms: f.rooms ?? null, bathrooms: f.bathrooms ?? null, floor: f.floor ?? null,
      furnished: !!f.furnished, has_parking: !!f.has_parking, has_elevator: !!f.has_elevator, has_pool: !!f.has_pool,
      title_deed: sale ? f.title_deed : null, description: f.description, status: f.status,
      mandate_type: f.mandate_type, mandate_start: f.mandate_start, mandate_end: f.mandate_end,
      commission_pct: f.commission_pct ?? null, commission_fixed: f.commission_fixed ?? null, private_notes: f.private_notes,
    });
    const q = f.id ? supabase.from('crm_properties').update(row).eq('id', f.id).select('id').single() : supabase.from('crm_properties').insert(row).select('id').single();
    const { data, error } = await q;
    setBusy(false);
    if (error) return say(error.message);
    say(f.listing_id ? 'Bien enregistré — pensez à mettre à jour l’annonce DarNa' : 'Bien enregistré');
    onSaved(data.id);
  };

  const equip = [['furnished', 'Meublé'], ['has_parking', 'Parking'], ['has_elevator', 'Ascenseur'], ['has_pool', 'Piscine']];

  return (
    <Sheet title={f.id ? 'Modifier le bien' : 'Nouveau bien'} onClose={onClose}>
      <Field label="Transaction"><Seg value={f.transaction} onChange={(v) => set({ transaction: v })} options={Object.entries(TX_LABEL)} /></Field>
      <div className="g2">
        <Field label="Type de bien">
          <select value={f.property} onChange={(e) => set({ property: e.target.value })}>
            {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select value={f.status} onChange={(e) => set({ status: e.target.value })}>
            {Object.entries(STATUS_BIEN).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Titre de l’annonce (laissez vide pour le générer)">
        <input type="text" value={f.title || ''} onChange={(e) => set({ title: e.target.value })} placeholder="Ex. Appartement S+2 vue mer — Sousse" />
      </Field>
      <div className="g2">
        <Field label="Référence interne"><input type="text" value={f.reference || ''} onChange={(e) => set({ reference: e.target.value })} placeholder="Ex. APP-0042" /></Field>
        <Field label="Propriétaire">
          <ClientSelect value={f.owner_client_id} onChange={(v) => set({ owner_client_id: v })} clients={clients} />
        </Field>
      </div>
      {qc ? (
        <div className="panel" style={{ marginTop: 8 }}>
          <div className="g2">
            <input type="text" placeholder="Nom du propriétaire" value={qc.name || ''} onChange={(e) => setQc({ ...qc, name: e.target.value })} />
            <input type="tel" placeholder="Téléphone" value={qc.phone || ''} onChange={(e) => setQc({ ...qc, phone: e.target.value })} />
          </div>
          <div className="row"><button type="button" className="btn sea" onClick={addOwner}>Ajouter</button><button type="button" className="btn" onClick={() => setQc(null)}>Annuler</button></div>
        </div>
      ) : (
        <button type="button" className="link" onClick={() => setQc({})}>＋ Nouveau propriétaire</button>
      )}

      <Field label="Gouvernorat">
        <select value={f.governorate_id || ''} onChange={(e) => set({ governorate_id: num(e.target.value), delegation_id: null, neighborhood_id: null })}>
          <option value="">—</option>{govs.map((g) => <option key={g.id} value={g.id}>{g.name_fr}</option>)}
        </select>
      </Field>
      {f.governorate_id && (
        <div className="g2">
          <Field label="Délégation">
            <select value={f.delegation_id || ''} onChange={(e) => set({ delegation_id: num(e.target.value) })}>
              <option value="">—</option>{delegs.map((d) => <option key={d.id} value={d.id}>{d.name_fr}</option>)}
            </select>
          </Field>
          <Field label="Quartier (facultatif)">
            <select value={f.neighborhood_id || ''} onChange={(e) => set({ neighborhood_id: num(e.target.value) })}>
              <option value="">—</option>{hoods.map((d) => <option key={d.id} value={d.id}>{d.name_fr}</option>)}
            </select>
          </Field>
        </div>
      )}
      <Field label="Adresse exacte (privée, jamais publiée)"><input type="text" value={f.address || ''} onChange={(e) => set({ address: e.target.value })} /></Field>

      <div className="g2">
        <Field label={sale ? 'Prix demandé (DT)' : 'Loyer (DT)'}>
          <Num value={f.price_dt} onChange={(v) => set({ price_dt: v })} disabled={f.price_on_request} />
        </Field>
        {!sale && (
          <Field label="Par">
            <select value={f.rent_period || 'mois'} onChange={(e) => set({ rent_period: e.target.value })}>
              <option value="mois">mois</option><option value="nuit">nuit</option><option value="an">an</option>
            </select>
          </Field>
        )}
      </div>
      <label className="chk"><input type="checkbox" checked={!!f.price_on_request} onChange={(e) => set({ price_on_request: e.target.checked })} /> Prix sur demande</label>
      <label className="chk"><input type="checkbox" checked={!!f.negotiable} onChange={(e) => set({ negotiable: e.target.checked })} /> Prix négociable</label>

      <div className="g3">
        <Field label="Surface (m²)"><Num value={f.surface_total_m2} onChange={(v) => set({ surface_total_m2: v })} /></Field>
        <Field label="Surface bâtie"><Num value={f.surface_built_m2} onChange={(v) => set({ surface_built_m2: v })} /></Field>
        <Field label="Étage"><Num value={f.floor} onChange={(v) => set({ floor: v })} /></Field>
      </div>
      <div className="g2">
        <Field label={HOUSING.includes(f.property) ? 'Pièces *' : 'Pièces'}><Num value={f.rooms} onChange={(v) => set({ rooms: v })} /></Field>
        <Field label="Salles de bain"><Num value={f.bathrooms} onChange={(v) => set({ bathrooms: v })} /></Field>
      </div>
      <div className="g2">{equip.map(([k, l]) => <label className="chk" key={k}><input type="checkbox" checked={!!f[k]} onChange={(e) => set({ [k]: e.target.checked })} /> {l}</label>)}</div>
      {sale && (
        <Field label="Titre foncier">
          <select value={f.title_deed || ''} onChange={(e) => set({ title_deed: e.target.value })}>
            <option value="">—</option>{Object.entries(DEED_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
      )}

      <h3 style={{ marginTop: 20 }}>Mandat et commission</h3>
      <div className="g2">
        <Field label="Type de mandat">
          <select value={f.mandate_type || ''} onChange={(e) => set({ mandate_type: e.target.value })}>
            <option value="">—</option>{Object.entries(MANDATE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <div className="g2">
          <Field label="Début"><input type="date" value={f.mandate_start || ''} onChange={(e) => set({ mandate_start: e.target.value })} /></Field>
          <Field label="Fin"><input type="date" value={f.mandate_end || ''} onChange={(e) => set({ mandate_end: e.target.value })} /></Field>
        </div>
      </div>
      <div className="g2">
        <Field label="Commission (%)"><Num value={f.commission_pct} onChange={(v) => set({ commission_pct: v })} step="0.1" /></Field>
        <Field label="ou montant fixe (DT)"><Num value={f.commission_fixed} onChange={(v) => set({ commission_fixed: v })} /></Field>
      </div>

      <Field label="Description publique (visible sur l’annonce)"><textarea value={f.description || ''} onChange={(e) => set({ description: e.target.value })} /></Field>
      <Field label="Notes privées (jamais publiées)"><textarea value={f.private_notes || ''} onChange={(e) => set({ private_notes: e.target.value })} /></Field>
      <button className="btn primary" style={{ marginTop: 16 }} disabled={busy} onClick={save}>{busy ? '…' : 'Enregistrer'}</button>
    </Sheet>
  );
}

/* ---------- Demande ---------- */
export function RequestForm({ initial, onClose, onSaved }) {
  const { say } = useApp();
  const [f, setF] = useState({ transaction: 'vente', property_types: [], delegation_ids: [], priority: 2, status: 'active', ...initial });
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const { govs, delegs } = useGeo(f.governorate_id);
  const [clients] = useClients();
  const [busy, setBusy] = useState(false);
  const toggleType = (t) => set({ property_types: f.property_types.includes(t) ? f.property_types.filter((x) => x !== t) : [...f.property_types, t] });

  const save = async () => {
    if (!f.client_id) return say('Choisissez le client.');
    setBusy(true);
    const row = clean({
      client_id: f.client_id, transaction: f.transaction, property_types: f.property_types,
      governorate_id: f.governorate_id || null, delegation_ids: f.governorate_id ? f.delegation_ids : [],
      budget_min: f.budget_min ?? null, budget_max: f.budget_max ?? null,
      surface_min: f.surface_min ?? null, rooms_min: f.rooms_min ?? null,
      must_have: f.must_have, notes: f.notes, priority: f.priority, status: f.status,
    });
    const q = f.id ? supabase.from('crm_requests').update(row).eq('id', f.id).select('id').single() : supabase.from('crm_requests').insert(row).select('id').single();
    const { data, error } = await q;
    setBusy(false);
    if (error) return say(error.message);
    if (!f.id) await logActivity({ kind: 'note', body: 'Nouvelle demande enregistrée', client_id: f.client_id });
    say('Demande enregistrée');
    onSaved(data.id);
  };

  return (
    <Sheet title={f.id ? 'Modifier la demande' : 'Nouvelle demande'} onClose={onClose}>
      <Field label="Client *"><ClientSelect value={f.client_id} onChange={(v) => set({ client_id: v })} clients={clients} none="— Choisir —" /></Field>
      <Field label="Recherche"><Seg value={f.transaction} onChange={(v) => set({ transaction: v })} options={Object.entries(TX_LABEL)} /></Field>
      <Field label="Types de bien (laisser vide = tous)">
        <div className="seg">
          {Object.entries(TYPE_LABEL).map(([k, l]) => (
            <button type="button" key={k} className={'chip' + (f.property_types.includes(k) ? ' on' : '')} onClick={() => toggleType(k)}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="Gouvernorat">
        <select value={f.governorate_id || ''} onChange={(e) => set({ governorate_id: num(e.target.value), delegation_ids: [] })}>
          <option value="">Toute la Tunisie</option>{govs.map((g) => <option key={g.id} value={g.id}>{g.name_fr}</option>)}
        </select>
      </Field>
      {f.governorate_id && (
        <Field label="Délégations (laisser vide = toutes)">
          <div className="seg">
            {delegs.map((d) => (
              <button type="button" key={d.id} className={'chip' + (f.delegation_ids.includes(d.id) ? ' on' : '')}
                onClick={() => set({ delegation_ids: f.delegation_ids.includes(d.id) ? f.delegation_ids.filter((x) => x !== d.id) : [...f.delegation_ids, d.id] })}>{d.name_fr}</button>
            ))}
          </div>
        </Field>
      )}
      <div className="g2">
        <Field label="Budget min (DT)"><Num value={f.budget_min} onChange={(v) => set({ budget_min: v })} /></Field>
        <Field label="Budget max (DT)"><Num value={f.budget_max} onChange={(v) => set({ budget_max: v })} /></Field>
      </div>
      <div className="g2">
        <Field label="Surface min (m²)"><Num value={f.surface_min} onChange={(v) => set({ surface_min: v })} /></Field>
        <Field label="Pièces min"><Num value={f.rooms_min} onChange={(v) => set({ rooms_min: v })} /></Field>
      </div>
      <Field label="Critères indispensables"><input type="text" value={f.must_have || ''} onChange={(e) => set({ must_have: e.target.value })} placeholder="Vue mer, parking, rez-de-chaussée…" /></Field>
      <Field label="Priorité"><Seg value={f.priority} onChange={(v) => set({ priority: v })} options={[[1, 'Haute'], [2, 'Normale'], [3, 'Basse']]} /></Field>
      {f.id && <Field label="Statut"><Seg value={f.status} onChange={(v) => set({ status: v })} options={Object.entries(REQ_STATUS).map(([k, [l]]) => [k, l])} /></Field>}
      <Field label="Notes"><textarea value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
      <button className="btn primary" style={{ marginTop: 16 }} disabled={busy} onClick={save}>{busy ? '…' : 'Enregistrer'}</button>
    </Sheet>
  );
}

/* ---------- Visite ---------- */
export function VisitForm({ initial, onClose, onSaved }) {
  const { say } = useApp();
  const [f, setF] = useState({ duration_min: 30, status: 'planifiee', ...initial, when: toLocalInput(initial?.starts_at || Date.now() + 864e5) });
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const [props, setProps] = useState([]);
  const [clients] = useClients();
  const [reqs, setReqs] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('crm_properties').select('id,title,status').not('status', 'in', '(vendu,loue,retire)').order('created_at', { ascending: false })
      .then(({ data }) => setProps(data || []));
  }, []);
  useEffect(() => {
    if (!f.client_id) return setReqs([]);
    supabase.from('crm_requests').select('id,transaction,property_types,budget_max').eq('client_id', f.client_id).eq('status', 'active').then(({ data }) => setReqs(data || []));
  }, [f.client_id]);

  const save = async () => {
    if (!f.property_id || !f.client_id) return say('Choisissez le bien et le client.');
    if (!f.when) return say('Choisissez la date et l’heure.');
    setBusy(true);
    const row = clean({
      property_id: f.property_id, client_id: f.client_id, request_id: f.request_id || null,
      starts_at: fromLocalInput(f.when), duration_min: f.duration_min, status: f.status,
      feedback: f.feedback, interest: f.interest || null,
    });
    const q = f.id ? supabase.from('crm_visits').update(row).eq('id', f.id).select('id').single() : supabase.from('crm_visits').insert(row).select('id').single();
    const { data, error } = await q;
    setBusy(false);
    if (error) return say(error.message);
    if (!f.id) await logActivity({ kind: 'visite', body: `Visite planifiée le ${new Date(row.starts_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}`, client_id: f.client_id, property_id: f.property_id });
    say('Visite enregistrée');
    onSaved(data.id);
  };

  return (
    <Sheet title={f.id ? 'Modifier la visite' : 'Planifier une visite'} onClose={onClose}>
      <Field label="Bien *">
        <select value={f.property_id || ''} onChange={(e) => set({ property_id: e.target.value || null })}>
          <option value="">— Choisir —</option>{props.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </Field>
      <Field label="Client *"><ClientSelect value={f.client_id} onChange={(v) => set({ client_id: v, request_id: null })} clients={clients} none="— Choisir —" /></Field>
      {reqs.length > 0 && (
        <Field label="Demande liée (facultatif)">
          <select value={f.request_id || ''} onChange={(e) => set({ request_id: e.target.value || null })}>
            <option value="">—</option>
            {reqs.map((r) => <option key={r.id} value={r.id}>{TX_LABEL[r.transaction]}{r.budget_max ? ` · max ${money(r.budget_max)}` : ''}</option>)}
          </select>
        </Field>
      )}
      <div className="g2">
        <Field label="Date et heure *"><input type="datetime-local" value={f.when} onChange={(e) => set({ when: e.target.value })} /></Field>
        <Field label="Durée">
          <select value={f.duration_min} onChange={(e) => set({ duration_min: +e.target.value })}>
            {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </Field>
      </div>
      {f.id && (
        <>
          <Field label="Statut"><Seg value={f.status} onChange={(v) => set({ status: v })} options={Object.entries(VISIT_STATUS).map(([k, [l]]) => [k, l])} /></Field>
          <Field label="Intérêt du client"><Seg value={f.interest} allowNone onChange={(v) => set({ interest: v || null })} options={[[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]} /></Field>
          <Field label="Compte rendu"><textarea value={f.feedback || ''} onChange={(e) => set({ feedback: e.target.value })} placeholder="Réactions, objections, prochaine étape…" /></Field>
        </>
      )}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={busy} onClick={save}>{busy ? '…' : 'Enregistrer'}</button>
    </Sheet>
  );
}

/* ---------- Affaire ---------- */
export function DealForm({ initial, onClose, onSaved }) {
  const { say } = useApp();
  const [f, setF] = useState({ stage: 'nouveau', ...initial });
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const [props, setProps] = useState([]);
  const [clients] = useClients();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from('crm_properties').select('id,title,status,transaction,listing_id,commission_pct,commission_fixed,price_dt').order('created_at', { ascending: false }).then(({ data }) => setProps(data || []));
  }, []);
  const prop = props.find((p) => p.id === f.property_id);

  const save = async () => {
    if (!f.property_id || !f.client_id) return say('Choisissez le bien et le client.');
    setBusy(true);
    const row = clean({
      property_id: f.property_id, client_id: f.client_id, request_id: f.request_id || null, stage: f.stage,
      amount_dt: f.amount_dt ?? null, commission_dt: f.commission_dt ?? null, expected_close: f.expected_close,
      lost_reason: f.stage === 'perdu' ? f.lost_reason : null, notes: f.notes,
      closed_at: f.stage === 'conclu' ? f.closed_at || new Date().toISOString() : null,
    });
    const q = f.id ? supabase.from('crm_deals').update(row).eq('id', f.id).select('id,client_id,property_id,request_id').single() : supabase.from('crm_deals').insert(row).select('id,client_id,property_id,request_id').single();
    const { data, error } = await q;
    if (error) { setBusy(false); return say(error.message); }
    if (!f.id) await logActivity({ kind: 'offre', body: 'Affaire créée', deal_id: data.id, client_id: f.client_id, property_id: f.property_id });
    // effets de bord quand l'affaire se conclut ici
    if (f.stage === 'conclu' && prop && (!initial || initial.stage !== 'conclu')) {
      await supabase.from('crm_properties').update({ status: prop.transaction === 'vente' ? 'vendu' : 'loue' }).eq('id', prop.id);
      if (prop.listing_id) await supabase.from('listings').update({ status: 'vendue_louee' }).eq('id', prop.listing_id);
      if (f.request_id) await supabase.from('crm_requests').update({ status: 'satisfaite' }).eq('id', f.request_id);
    }
    setBusy(false);
    say('Affaire enregistrée');
    onSaved(data.id);
  };

  return (
    <Sheet title={f.id ? 'Modifier l’affaire' : 'Nouvelle affaire'} onClose={onClose}>
      <Field label="Bien *">
        <select value={f.property_id || ''} onChange={(e) => {
          const p = props.find((x) => x.id === e.target.value);
          set({ property_id: e.target.value || null, amount_dt: f.amount_dt ?? p?.price_dt ?? null });
        }}>
          <option value="">— Choisir —</option>{props.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </Field>
      <Field label="Client (acquéreur / locataire) *"><ClientSelect value={f.client_id} onChange={(v) => set({ client_id: v })} clients={clients} none="— Choisir —" /></Field>
      <Field label="Étape"><Seg value={f.stage} onChange={(v) => set({ stage: v })} options={STAGES} /></Field>
      <div className="g2">
        <Field label="Montant de l’affaire (DT)"><Num value={f.amount_dt} onChange={(v) => set({ amount_dt: v })} /></Field>
        <Field label="Commission (DT)"><Num value={f.commission_dt} onChange={(v) => set({ commission_dt: v })} /></Field>
      </div>
      {prop && (prop.commission_pct || prop.commission_fixed) && (
        <button type="button" className="link" onClick={() => set({ commission_dt: suggestCommission(prop, f.amount_dt) })}>
          Calculer la commission du mandat ({prop.commission_fixed ? money(prop.commission_fixed) : prop.commission_pct + ' %'})
        </button>
      )}
      <Field label="Clôture prévue"><input type="date" value={f.expected_close || ''} onChange={(e) => set({ expected_close: e.target.value })} /></Field>
      {f.stage === 'perdu' && <Field label="Motif de la perte"><input type="text" value={f.lost_reason || ''} onChange={(e) => set({ lost_reason: e.target.value })} placeholder="Prix, financement, a trouvé ailleurs…" /></Field>}
      <Field label="Notes"><textarea value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
      <button className="btn primary" style={{ marginTop: 16 }} disabled={busy} onClick={save}>{busy ? '…' : 'Enregistrer'}</button>
    </Sheet>
  );
}
