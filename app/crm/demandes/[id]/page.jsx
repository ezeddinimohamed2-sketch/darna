'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useApp } from '../../../../components/Providers';
import Icon from '../../../../components/Icons';
import { Empty, Pill } from '../../../../components/crm/ui';
import { RequestForm, VisitForm, DealForm } from '../../../../components/crm/forms';
import { REQ_STATUS, TX_LABEL, TYPE_LABEL, money, reqSummary, matchScore, telHref, waHref, crmPhotoUrl } from '../../../../lib/crm';
import { priceLabel } from '../../../../components/ListingCard';

export default function DemandeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { say, t } = useApp();
  const [r, setR] = useState(undefined);
  const [props, setProps] = useState([]);
  const [pub, setPub] = useState([]);
  const [m, setM] = useState(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('crm_requests').select('*,client:crm_clients(id,full_name,phone,whatsapp),governorate:governorates(name_fr)').eq('id', id).maybeSingle(),
      supabase.from('crm_properties').select('id,title,status,transaction,property,governorate_id,delegation_id,price_dt,price_on_request,rent_period,surface_total_m2,rooms,listing_id,photos:crm_property_photos(storage_path,position)'),
    ]);
    setR(a.data || null);
    setProps(b.data || []);
    const req = a.data;
    if (req && req.status === 'active') {
      // annonces publiques de DarNa qui correspondent (hors biens du CRM)
      let q = supabase.from('listings').select('id,title,transaction,price_dt,price_on_request,rent_period,surface_total_m2,rooms,owner_id,delegation:delegations(name_fr)').eq('status', 'publiee').eq('transaction', req.transaction).limit(12).order('published_at', { ascending: false });
      if (req.property_types?.length) q = q.in('property', req.property_types);
      if (req.governorate_id) q = q.eq('governorate_id', req.governorate_id);
      if (req.delegation_ids?.length) q = q.in('delegation_id', req.delegation_ids);
      if (req.budget_min) q = q.gte('price_dt', req.budget_min);
      if (req.budget_max) q = q.lte('price_dt', req.budget_max);
      if (req.surface_min) q = q.gte('surface_total_m2', req.surface_min);
      if (req.rooms_min) q = q.gte('rooms', req.rooms_min);
      const { data } = await q;
      setPub(data || []);
    } else setPub([]);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (r === undefined) return <p className="box" style={{ padding: 16 }}>Chargement…</p>;
  if (r === null) return <div className="box" style={{ padding: 16 }}>Demande introuvable. <Link className="link" href="/crm/demandes">Retour</Link></div>;

  const own = props.map((p) => ({ p, m: matchScore(r, p) })).filter((x) => x.m).sort((a, b) => b.m.pct - a.m.pct);
  const ownListingIds = new Set(props.map((p) => p.listing_id).filter(Boolean));
  const pubOnly = pub.filter((l) => !ownListingIds.has(l.id));

  const remove = async () => {
    if (!confirm('Supprimer cette demande ?')) return;
    const { error } = await supabase.from('crm_requests').delete().eq('id', id);
    if (error) return say(error.message);
    router.push('/crm/demandes');
  };
  const c = r.client;
  const pitch = (title, price) => `Bonjour ${c?.full_name}, j’ai un bien qui pourrait vous intéresser : ${title}${price ? ' — ' + price : ''}.`;

  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <Link className="link" href="/crm/demandes">← Demandes</Link>
        <div className="row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => setM('edit')}>Modifier</button>
          <button className="btn danger" onClick={remove}>Supprimer</button>
        </div>
      </div>

      <section className="panel">
        <div className="hrow">
          <div>
            <h2 style={{ margin: 0 }}>{c?.full_name}</h2>
            <div className="cmeta" style={{ whiteSpace: 'normal' }}>{reqSummary(r, r.governorate?.name_fr)}</div>
          </div>
          <Pill tone={REQ_STATUS[r.status][1]}>{REQ_STATUS[r.status][0]}</Pill>
        </div>
        {r.must_have && <p style={{ marginBottom: 0 }}><b>Indispensable :</b> {r.must_have}</p>}
        {r.notes && <p style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>{r.notes}</p>}
        <div className="row">
          {c?.phone && <a className="btn sea" href={telHref(c.phone)}><Icon n="phone" size={18} /> Appeler</a>}
          <Link className="btn" href={`/crm/clients/${c?.id}`}>Fiche client</Link>
        </div>
      </section>

      <section className="panel">
        <h3>Vos biens qui correspondent ({own.length})</h3>
        {r.status !== 'active' && <Empty>La demande n’est pas active.</Empty>}
        {r.status === 'active' && own.length === 0 && <Empty>Aucun de vos biens ne correspond pour l’instant.</Empty>}
        {own.map(({ p, m: mm }) => {
          const ph = [...(p.photos || [])].sort((a, b) => a.position - b.position)[0];
          return (
            <div className="li" key={p.id} style={{ marginTop: 6 }}>
              <div className="th">{ph ? <img src={crmPhotoUrl(ph.storage_path)} alt="" /> : <Icon n="home" size={24} />}</div>
              <Link href={`/crm/biens/${p.id}`} className="mid">
                <div className="t">{p.title}</div>
                <div className="s">{p.price_on_request ? 'Sur demande' : money(p.price_dt)}{mm.why.length ? ` · ${mm.why.join(', ')}` : ''}</div>
              </Link>
              <Pill tone={mm.pct >= 80 ? 'green' : 'orange'}>{mm.pct} %</Pill>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {waHref(c?.whatsapp || c?.phone) && <a className="btn wa" style={{ minHeight: 34, padding: '4px 10px' }} target="_blank" rel="noopener noreferrer" href={waHref(c.whatsapp || c.phone, pitch(p.title, p.price_on_request ? '' : money(p.price_dt)))}>Proposer</a>}
                <button className="btn" style={{ minHeight: 34, padding: '4px 10px' }} onClick={() => setM({ visit: p.id })}>Visite</button>
                <button className="btn" style={{ minHeight: 34, padding: '4px 10px' }} onClick={() => setM({ deal: p })}>Affaire</button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h3>Annonces DarNa qui correspondent ({pubOnly.length})</h3>
        {r.status === 'active' && pubOnly.length === 0 && <Empty>Aucune annonce publique ne correspond.</Empty>}
        {pubOnly.map((l) => (
          <div className="li" key={l.id} style={{ marginTop: 6 }}>
            <Link href={`/annonce/${l.id}`} className="mid">
              <div className="t">{l.title}</div>
              <div className="s">{priceLabel(l, t)}{l.delegation?.name_fr ? ` · ${l.delegation.name_fr}` : ''}</div>
            </Link>
            {waHref(c?.whatsapp || c?.phone) && <a className="btn wa" style={{ minHeight: 34, padding: '4px 10px' }} target="_blank" rel="noopener noreferrer" href={waHref(c.whatsapp || c.phone, `${pitch(l.title)} https://darna-eight.vercel.app/annonce/${l.id}`)}>Partager</a>}
          </div>
        ))}
      </section>

      {m === 'edit' && <RequestForm initial={r} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
      {m?.visit && <VisitForm initial={{ property_id: m.visit, client_id: c.id, request_id: id }} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
      {m?.deal && <DealForm initial={{ property_id: m.deal.id, client_id: c.id, request_id: id, amount_dt: m.deal.price_dt }} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
    </>
  );
}
