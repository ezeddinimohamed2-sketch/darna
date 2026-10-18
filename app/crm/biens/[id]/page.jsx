'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useApp } from '../../../../components/Providers';
import { useCrm } from '../../../../components/crm/CrmContext';
import Icon from '../../../../components/Icons';
import { Empty, Pill } from '../../../../components/crm/ui';
import { PropertyForm, VisitForm, DealForm } from '../../../../components/crm/forms';
import SharePanel from '../../../../components/crm/SharePanel';
import Timeline from '../../../../components/crm/Timeline';
import Tasks from '../../../../components/crm/Tasks';
import {
  STATUS_BIEN, TX_LABEL, TYPE_LABEL, DEED_LABEL, MANDATE_LABEL, VISIT_STATUS, STAGE_LABEL, ACTIVE_BIEN,
  money, dateLong, dtFR, crmPhotoUrl, uploadPropertyPhotos, publishProperty, withdrawProperty, listingProblems,
  matchScore, reqSummary, telHref, waHref, logActivity,
} from '../../../../lib/crm';

export default function BienDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { say } = useApp();
  const { uid, prof } = useCrm();
  const fileRef = useRef();
  const [p, setP] = useState(undefined);
  const [photos, setPhotos] = useState([]);
  const [visits, setVisits] = useState([]);
  const [deals, setDeals] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [edit, setEdit] = useState(false);
  const [visit, setVisit] = useState(false);
  const [deal, setDeal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b, c, d, e] = await Promise.all([
      supabase.from('crm_properties').select('*,governorate:governorates(name_fr),delegation:delegations(name_fr),neighborhood:neighborhoods(name_fr),owner:crm_clients(id,full_name,phone,whatsapp)').eq('id', id).maybeSingle(),
      supabase.from('crm_property_photos').select('id,storage_path,position').eq('property_id', id).order('position'),
      supabase.from('crm_visits').select('id,starts_at,status,interest,client:crm_clients(id,full_name)').eq('property_id', id).order('starts_at', { ascending: false }),
      supabase.from('crm_deals').select('id,stage,amount_dt,client:crm_clients(full_name)').eq('property_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_requests').select('*,client:crm_clients(id,full_name,phone,whatsapp)').eq('status', 'active'),
    ]);
    setP(a.data || null);
    setPhotos(b.data || []);
    setVisits(c.data || []);
    setDeals(d.data || []);
    setReqs(e.data || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (p === undefined) return <p className="box" style={{ padding: 16 }}>Chargement…</p>;
  if (p === null) return <div className="box" style={{ padding: 16 }}>Bien introuvable. <Link className="link" href="/crm/biens">Retour</Link></div>;

  const [stLabel, stTone] = STATUS_BIEN[p.status] || [p.status, ''];
  const place = [p.neighborhood?.name_fr, p.delegation?.name_fr, p.governorate?.name_fr].filter(Boolean).join(', ');
  const matches = reqs.map((r) => ({ r, m: matchScore(r, p) })).filter((x) => x.m).sort((a, b) => b.m.pct - a.m.pct);
  const problems = listingProblems(p, photos.length > 0);

  const addPhotos = async (files) => {
    const list = [...files].slice(0, 12);
    if (!list.length) return;
    setBusy(true);
    const err = await uploadPropertyPhotos(uid, id, list, photos.length);
    setBusy(false);
    if (err) say('Photos : ' + err);
    load();
  };
  const delPhoto = async (ph) => {
    await supabase.storage.from('listing-photos').remove([ph.storage_path]);
    await supabase.from('crm_property_photos').delete().eq('id', ph.id);
    load();
  };
  const mainPhoto = async (ph) => {
    const order = [ph, ...photos.filter((x) => x.id !== ph.id)];
    await Promise.all(order.map((x, i) => supabase.from('crm_property_photos').update({ position: i }).eq('id', x.id)));
    load();
  };

  const setStatus = async (status) => {
    const { error } = await supabase.from('crm_properties').update({ status }).eq('id', id);
    if (error) return say(error.message);
    if (p.listing_id && ['vendu', 'loue'].includes(status)) await supabase.from('listings').update({ status: 'vendue_louee' }).eq('id', p.listing_id);
    if (p.listing_id && status === 'retire') await withdrawProperty(p);
    await logActivity({ kind: 'note', body: `Statut : ${STATUS_BIEN[status][0]}`, property_id: id });
    load();
  };

  const publish = async () => {
    setBusy(true);
    const res = await publishProperty(uid, p, photos);
    setBusy(false);
    if (res.error) return say(res.error);
    await logActivity({ kind: 'note', body: p.listing_id ? 'Annonce DarNa mise à jour' : 'Publié sur DarNa', property_id: id });
    say(p.listing_id ? 'Annonce mise à jour' : 'Publié sur DarNa ✓');
    load();
  };
  const withdraw = async () => {
    if (!confirm('Retirer l’annonce de DarNa ? Le bien reste dans votre CRM.')) return;
    const res = await withdrawProperty(p);
    if (res.error) return say(res.error);
    say('Annonce retirée');
    load();
  };
  const remove = async () => {
    if (!confirm('Supprimer définitivement ce bien (et ses visites) ? Cette action est irréversible.')) return;
    if (p.listing_id) await supabase.from('listings').delete().eq('id', p.listing_id);
    if (photos.length) await supabase.storage.from('listing-photos').remove(photos.map((x) => x.storage_path));
    const { error } = await supabase.from('crm_properties').delete().eq('id', id);
    if (error) return say(error.message);
    router.push('/crm/biens');
  };

  const o = p.owner;
  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <Link className="link" href="/crm/biens">← Biens</Link>
        <div className="row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => setEdit(true)}>Modifier</button>
          <button className="btn danger" onClick={remove}>Supprimer</button>
        </div>
      </div>

      <section className="panel">
        <div className="hrow">
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0 }}>{p.title}</h2>
            <div className="cmeta">{[p.reference && `Réf. ${p.reference}`, TX_LABEL[p.transaction], TYPE_LABEL[p.property], place].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="cprice">{p.price_on_request ? 'Prix sur demande' : money(p.price_dt)}{p.transaction !== 'vente' && !p.price_on_request ? ` / ${p.rent_period || 'mois'}` : ''}</div>
            <Pill tone={stTone}>{stLabel}</Pill>
          </div>
        </div>
        <div className="row">
          <select style={{ width: 'auto' }} value={p.status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
            {Object.entries(STATUS_BIEN).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </section>

      <section className="panel">
        <h3>Publication sur DarNa</h3>
        {p.listing_id ? (
          <p className="ok-box">Ce bien est relié à une annonce DarNa. {ACTIVE_BIEN.includes(p.status) ? '' : 'Pensez à la retirer si le bien n’est plus disponible.'}</p>
        ) : (
          <p className="cmeta" style={{ marginTop: 0 }}>Publiez ce bien sur le site d’annonces en un geste. Les notes privées, l’adresse exacte, le mandat et la commission ne sont jamais publiés.</p>
        )}
        {problems.length > 0 && <div className="warn-box" style={{ marginBottom: 8 }}>{problems.map((x) => <div key={x}>• {x}</div>)}</div>}
        <div className="row">
          <button className="btn primary" style={{ width: 'auto' }} disabled={busy} onClick={publish}>{busy ? '…' : p.listing_id ? 'Mettre à jour l’annonce' : 'Publier sur DarNa'}</button>
          {p.listing_id && <Link className="btn" href={`/annonce/${p.listing_id}`}>Voir l’annonce</Link>}
          {p.listing_id && <button className="btn" onClick={withdraw}>Retirer de DarNa</button>}
        </div>
      </section>

      {p.listing_id && ACTIVE_BIEN.includes(p.status) && (
        <SharePanel p={p} place={place} photos={photos} phone={prof?.phone || ''} />
      )}

      <section className="panel">
        <div className="hrow">
          <h3>Photos ({photos.length})</h3>
          <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}><Icon n="plus" size={16} /> Ajouter</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
        </div>
        {photos.length === 0 ? <Empty>Aucune photo. Une bonne photo = beaucoup plus de contacts.</Empty> : (
          <div className="phs">
            {photos.map((ph, i) => (
              <div className="ph" key={ph.id}>
                <img src={crmPhotoUrl(ph.storage_path)} alt="" loading="lazy" />
                <button className="x" onClick={() => delPhoto(ph)} aria-label="Supprimer">✕</button>
                {i === 0 ? <span className="mainph">★</span> : <button className="star" onClick={() => mainPhoto(ph)} aria-label="Photo principale">★</button>}
              </div>
            ))}
          </div>
        )}
        <p className="cmeta" style={{ marginBottom: 0 }}>La première photo (★) est la photo principale. Après un changement, mettez l’annonce à jour.</p>
      </section>

      <div className="cols">
        <section className="panel">
          <h3>Détails</h3>
          <dl className="kv">
            <dt>Surface</dt><dd>{p.surface_total_m2 ? `${p.surface_total_m2} m²` : '—'}{p.surface_built_m2 ? ` (bâtie ${p.surface_built_m2} m²)` : ''}</dd>
            <dt>Pièces</dt><dd>{p.rooms ?? '—'}{p.bathrooms != null ? ` · ${p.bathrooms} SDB` : ''}</dd>
            <dt>Étage</dt><dd>{p.floor ?? '—'}</dd>
            <dt>Équipements</dt><dd>{[p.furnished && 'Meublé', p.has_parking && 'Parking', p.has_elevator && 'Ascenseur', p.has_pool && 'Piscine'].filter(Boolean).join(', ') || '—'}</dd>
            {p.transaction === 'vente' && <><dt>Titre foncier</dt><dd>{DEED_LABEL[p.title_deed] || '—'}</dd></>}
            <dt>Adresse (privée)</dt><dd>{p.address || '—'}</dd>
            <dt>Négociable</dt><dd>{p.negotiable ? 'Oui' : 'Non'}</dd>
          </dl>
          {p.description && <><span className="lbl">Description publique</span><p style={{ whiteSpace: 'pre-line', margin: 0 }}>{p.description}</p></>}
          {p.private_notes && <><span className="lbl">Notes privées</span><p style={{ whiteSpace: 'pre-line', margin: 0 }}>{p.private_notes}</p></>}
        </section>

        <section className="panel">
          <h3>Mandat et propriétaire</h3>
          <dl className="kv">
            <dt>Mandat</dt><dd>{MANDATE_LABEL[p.mandate_type] || '—'}</dd>
            <dt>Période</dt><dd>{p.mandate_start || p.mandate_end ? `${dateLong(p.mandate_start) || '…'} → ${dateLong(p.mandate_end) || '…'}` : '—'}</dd>
            <dt>Commission</dt><dd>{p.commission_fixed ? money(p.commission_fixed) : p.commission_pct ? `${p.commission_pct} %` : '—'}</dd>
            <dt>Propriétaire</dt><dd>{o ? <Link className="link" style={{ padding: 0 }} href={`/crm/clients/${o.id}`}>{o.full_name}</Link> : '—'}</dd>
          </dl>
          {o && (
            <div className="row">
              {o.phone && <a className="btn sea" href={telHref(o.phone)}><Icon n="phone" size={18} /> Appeler</a>}
              {waHref(o.whatsapp || o.phone) && <a className="btn wa" href={waHref(o.whatsapp || o.phone)} target="_blank" rel="noopener noreferrer"><Icon n="chat" size={18} /> WhatsApp</a>}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <h3>Clients intéressés ({matches.length})</h3>
        {matches.length === 0 && <Empty>Aucune demande active ne correspond à ce bien.</Empty>}
        {matches.map(({ r, m }) => (
          <div className="li" key={r.id} style={{ marginTop: 6 }}>
            <Link href={`/crm/demandes/${r.id}`} className="mid">
              <div className="t">{r.client?.full_name}</div>
              <div className="s">{reqSummary(r)}{m.why.length ? ` · ${m.why.join(', ')}` : ''}</div>
            </Link>
            <Pill tone={m.pct >= 80 ? 'green' : 'orange'}>{m.pct} %</Pill>
            {waHref(r.client?.whatsapp || r.client?.phone) && (
              <a className="btn wa" style={{ minHeight: 34, padding: '4px 10px' }} target="_blank" rel="noopener noreferrer"
                href={waHref(r.client.whatsapp || r.client.phone, `Bonjour ${r.client.full_name}, j’ai un bien qui pourrait vous intéresser : ${p.title}${p.price_on_request ? '' : ' — ' + money(p.price_dt)}.`)}>Proposer</a>
            )}
          </div>
        ))}
      </section>

      <div className="cols">
        <section className="panel">
          <div className="hrow"><h3>Visites ({visits.length})</h3><button className="btn" onClick={() => setVisit(true)}>Planifier</button></div>
          {visits.length === 0 && <Empty>Aucune visite.</Empty>}
          {visits.map((v) => (
            <div className="li" key={v.id} style={{ marginTop: 6 }}>
              <div className="mid"><div className="t">{dtFR(v.starts_at)}</div><div className="s">{v.client?.full_name}{v.interest ? ` · intérêt ${v.interest}/5` : ''}</div></div>
              <Pill tone={VISIT_STATUS[v.status][1]}>{VISIT_STATUS[v.status][0]}</Pill>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="hrow"><h3>Affaires ({deals.length})</h3><button className="btn" onClick={() => setDeal(true)}>Nouvelle</button></div>
          {deals.length === 0 && <Empty>Aucune affaire.</Empty>}
          {deals.map((x) => (
            <Link href="/crm/affaires" className="li" key={x.id} style={{ marginTop: 6 }}>
              <div className="mid"><div className="t">{x.client?.full_name}</div><div className="s">{money(x.amount_dt)}</div></div>
              <Pill tone="blue">{STAGE_LABEL[x.stage]}</Pill>
            </Link>
          ))}
        </section>
      </div>

      <div className="cols">
        <section className="panel"><h3>Tâches</h3><Tasks filter={['property_id', id]} link={{ property_id: id }} /></section>
        <section className="panel"><h3>Journal</h3><Timeline filter={['property_id', id]} link={{ property_id: id }} /></section>
      </div>

      {edit && <PropertyForm initial={p} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); load(); }} />}
      {visit && <VisitForm initial={{ property_id: id }} onClose={() => setVisit(false)} onSaved={() => { setVisit(false); load(); }} />}
      {deal && <DealForm initial={{ property_id: id, amount_dt: p.price_dt }} onClose={() => setDeal(false)} onSaved={() => { setDeal(false); load(); }} />}
    </>
  );
}
