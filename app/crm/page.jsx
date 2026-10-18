'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useCrm } from '../../components/crm/CrmContext';
import { Empty, Pill } from '../../components/crm/ui';
import Tasks from '../../components/crm/Tasks';
import { ACTIVE_BIEN, OPEN_STAGES, STAGES, STAGE_LABEL, money, dateFR, dtFR, timeFR, sameDay, daysFrom, telHref, waHref } from '../../lib/crm';

export default function Dashboard() {
  const { prof } = useCrm();
  const [d, setD] = useState(null);

  useEffect(() => {
    const today = new Date(new Date().toDateString()).toISOString();
    Promise.all([
      supabase.from('crm_properties').select('id,title,status,mandate_end,listing_id'),
      supabase.from('crm_clients').select('id,full_name,phone,whatsapp,last_contact_at,archived,created_at').eq('archived', false),
      supabase.from('crm_requests').select('id,client_id').eq('status', 'active'),
      supabase.from('crm_visits').select('id,starts_at,status,property:crm_properties(title),client:crm_clients(full_name,phone,whatsapp)').gte('starts_at', today).in('status', ['planifiee', 'confirmee']).order('starts_at').limit(30),
      supabase.from('crm_deals').select('id,stage,amount_dt,commission_dt,closed_at,property:crm_properties(title),client:crm_clients(full_name)'),
    ]).then(([p, c, r, v, de]) => setD({ props: p.data || [], clients: c.data || [], reqs: r.data || [], visits: v.data || [], deals: de.data || [] }));
  }, []);

  if (!d) return <p className="box" style={{ padding: 16 }}>Chargement…</p>;

  const activeProps = d.props.filter((p) => ACTIVE_BIEN.includes(p.status));
  const online = d.props.filter((p) => p.listing_id && ACTIVE_BIEN.includes(p.status)).length;
  const openDeals = d.deals.filter((x) => OPEN_STAGES.includes(x.stage));
  const pipeline = openDeals.reduce((s, x) => s + (+x.amount_dt || 0), 0);
  const expected = openDeals.reduce((s, x) => s + (+x.commission_dt || 0), 0);
  const year = new Date().getFullYear();
  const earned = d.deals.filter((x) => x.stage === 'conclu' && x.closed_at && new Date(x.closed_at).getFullYear() === year).reduce((s, x) => s + (+x.commission_dt || 0), 0);
  const weekEnd = Date.now() + 7 * 864e5;
  const weekVisits = d.visits.filter((v) => new Date(v.starts_at).getTime() <= weekEnd);
  const todayVisits = d.visits.filter((v) => sameDay(v.starts_at, new Date()));

  const mandates = d.props.filter((p) => ACTIVE_BIEN.includes(p.status) && p.mandate_end && daysFrom(p.mandate_end) <= 30).sort((a, b) => a.mandate_end.localeCompare(b.mandate_end));
  const withReq = new Set(d.reqs.map((r) => r.client_id));
  const stale = d.clients
    .filter((c) => withReq.has(c.id) && (!c.last_contact_at || Date.now() - new Date(c.last_contact_at).getTime() > 10 * 864e5))
    .slice(0, 6);

  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <h2>Bonjour{prof.display_name ? `, ${prof.display_name}` : ''}</h2>
        <span className="cmeta">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      <div className="stats">
        <Link href="/crm/biens" className="stat"><b>{activeProps.length}</b><span>Biens actifs · {online} en ligne sur DarNa</span></Link>
        <Link href="/crm/demandes" className="stat"><b>{d.reqs.length}</b><span>Demandes actives</span></Link>
        <Link href="/crm/visites" className="stat"><b>{weekVisits.length}</b><span>Visites cette semaine</span></Link>
        <Link href="/crm/affaires" className="stat"><b>{openDeals.length}</b><span>Affaires en cours · {money(pipeline)}</span></Link>
        <div className="stat"><b>{money(expected)}</b><span>Commissions attendues</span></div>
        <div className="stat"><b>{money(earned)}</b><span>Commissions {year} (conclues)</span></div>
      </div>

      <div className="cols">
        <section className="panel">
          <div className="hrow"><h3>Agenda</h3><Link className="link" href="/crm/visites">Tout voir</Link></div>
          {d.visits.length === 0 && <Empty>Aucune visite planifiée.</Empty>}
          {d.visits.slice(0, 6).map((v) => (
            <div className="li" key={v.id} style={{ marginTop: 6 }}>
              <div className="mid">
                <div className="t">{sameDay(v.starts_at, new Date()) ? `Aujourd’hui ${timeFR(v.starts_at)}` : dtFR(v.starts_at)}</div>
                <div className="s">{v.property?.title} — {v.client?.full_name}</div>
              </div>
              {waHref(v.client?.whatsapp || v.client?.phone) && <a className="btn wa" style={{ minHeight: 34, padding: '4px 10px' }} href={waHref(v.client.whatsapp || v.client.phone, `Bonjour ${v.client.full_name}, je vous confirme notre visite ${dtFR(v.starts_at)}.`)} target="_blank" rel="noopener noreferrer">Confirmer</a>}
            </div>
          ))}
          {todayVisits.length > 0 && <p className="cmeta" style={{ marginBottom: 0 }}>{todayVisits.length} visite(s) aujourd’hui.</p>}
        </section>

        <section className="panel">
          <h3>Tâches</h3>
          <Tasks />
        </section>

        <section className="panel">
          <h3>À relancer</h3>
          {stale.length === 0 && <Empty>Tous vos clients actifs ont été contactés récemment.</Empty>}
          {stale.map((c) => (
            <div className="li" key={c.id} style={{ marginTop: 6 }}>
              <Link href={`/crm/clients/${c.id}`} className="mid">
                <div className="t">{c.full_name}</div>
                <div className="s">{c.last_contact_at ? `Dernier contact ${dateFR(c.last_contact_at)}` : 'Jamais contacté'}</div>
              </Link>
              {c.phone && <a className="btn sea" style={{ minHeight: 34, padding: '4px 10px' }} href={telHref(c.phone)}>Appeler</a>}
            </div>
          ))}
        </section>

        <section className="panel">
          <h3>Mandats à renouveler (30 jours)</h3>
          {mandates.length === 0 && <Empty>Aucun mandat n’arrive à échéance.</Empty>}
          {mandates.map((p) => (
            <Link href={`/crm/biens/${p.id}`} className="li" key={p.id} style={{ marginTop: 6 }}>
              <div className="mid"><div className="t">{p.title}</div><div className="s">Échéance {dateFR(p.mandate_end)}</div></div>
              <Pill tone={daysFrom(p.mandate_end) < 0 ? 'red' : 'orange'}>{daysFrom(p.mandate_end) < 0 ? 'Expiré' : `${daysFrom(p.mandate_end)} j`}</Pill>
            </Link>
          ))}
        </section>

        <section className="panel">
          <div className="hrow"><h3>Affaires par étape</h3><Link className="link" href="/crm/affaires">Ouvrir</Link></div>
          {openDeals.length === 0 && <Empty>Aucune affaire en cours.</Empty>}
          {STAGES.filter(([k]) => OPEN_STAGES.includes(k)).map(([k, l]) => {
            const n = d.deals.filter((x) => x.stage === k).length;
            return n ? <div className="hrow" key={k} style={{ padding: '4px 0' }}><span>{l}</span><b>{n}</b></div> : null;
          })}
        </section>
      </div>
    </>
  );
}
