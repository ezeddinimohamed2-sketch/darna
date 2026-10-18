'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useApp } from '../../../../components/Providers';
import Icon from '../../../../components/Icons';
import { Empty, Pill } from '../../../../components/crm/ui';
import { ClientForm, RequestForm, VisitForm, DealForm } from '../../../../components/crm/forms';
import Timeline from '../../../../components/crm/Timeline';
import Tasks from '../../../../components/crm/Tasks';
import { KIND_CLIENT, STATUS_BIEN, VISIT_STATUS, STAGE_LABEL, REQ_STATUS, money, dtFR, dateFR, reqSummary, telHref, waHref, touchClient } from '../../../../lib/crm';

export default function ClientDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { say } = useApp();
  const [c, setC] = useState(undefined);
  const [reqs, setReqs] = useState([]);
  const [props, setProps] = useState([]);
  const [visits, setVisits] = useState([]);
  const [deals, setDeals] = useState([]);
  const [m, setM] = useState(null); // modal

  const load = useCallback(async () => {
    const [a, b, d, e, f] = await Promise.all([
      supabase.from('crm_clients').select('*').eq('id', id).maybeSingle(),
      supabase.from('crm_requests').select('*,governorate:governorates(name_fr)').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('crm_properties').select('id,title,status,price_dt,price_on_request').eq('owner_client_id', id),
      supabase.from('crm_visits').select('id,starts_at,status,property:crm_properties(id,title)').eq('client_id', id).order('starts_at', { ascending: false }),
      supabase.from('crm_deals').select('id,stage,amount_dt,property:crm_properties(title)').eq('client_id', id).order('created_at', { ascending: false }),
    ]);
    setC(a.data || null);
    setReqs(b.data || []);
    setProps(d.data || []);
    setVisits(e.data || []);
    setDeals(f.data || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (c === undefined) return <p className="box" style={{ padding: 16 }}>Chargement…</p>;
  if (c === null) return <div className="box" style={{ padding: 16 }}>Client introuvable. <Link className="link" href="/crm/clients">Retour</Link></div>;

  const archive = async () => {
    await supabase.from('crm_clients').update({ archived: !c.archived }).eq('id', id);
    say(c.archived ? 'Client réactivé' : 'Client archivé');
    load();
  };
  const remove = async () => {
    if (!confirm('Supprimer ce client, ses demandes et son historique ? Irréversible.')) return;
    const { error } = await supabase.from('crm_clients').delete().eq('id', id);
    if (error) return say(error.message);
    router.push('/crm/clients');
  };

  const wa = c.whatsapp || c.phone;
  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <Link className="link" href="/crm/clients">← Clients</Link>
        <div className="row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => setM('edit')}>Modifier</button>
          <button className="btn" onClick={archive}>{c.archived ? 'Réactiver' : 'Archiver'}</button>
          <button className="btn danger" onClick={remove}>Supprimer</button>
        </div>
      </div>

      <section className="panel">
        <div className="hrow">
          <div>
            <h2 style={{ margin: 0 }}>{c.full_name}</h2>
            <div className="cmeta">{KIND_CLIENT[c.kind]}{c.source ? ` · source : ${c.source}` : ''}{c.last_contact_at ? ` · dernier contact ${dateFR(c.last_contact_at)}` : ''}</div>
          </div>
          {c.archived && <Pill>Archivé</Pill>}
        </div>
        <div className="row">
          {c.phone && <a className="btn sea" href={telHref(c.phone)} onClick={() => touchClient(id)}><Icon n="phone" size={18} /> {c.phone}</a>}
          {waHref(wa) && <a className="btn wa" href={waHref(wa)} target="_blank" rel="noopener noreferrer" onClick={() => touchClient(id)}><Icon n="chat" size={18} /> WhatsApp</a>}
          {c.email && <a className="btn" href={`mailto:${c.email}`}>✉ {c.email}</a>}
        </div>
        {(c.tags || []).length > 0 && <div className="row">{c.tags.map((t) => <Pill key={t} tone="blue">{t}</Pill>)}</div>}
        {c.notes && <p style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>{c.notes}</p>}
      </section>

      <div className="cols">
        <section className="panel">
          <div className="hrow"><h3>Demandes ({reqs.length})</h3><button className="btn" onClick={() => setM('req')}>Ajouter</button></div>
          {reqs.length === 0 && <Empty>Aucune demande.</Empty>}
          {reqs.map((r) => (
            <Link href={`/crm/demandes/${r.id}`} className="li" key={r.id} style={{ marginTop: 6 }}>
              <div className="mid"><div className="s" style={{ whiteSpace: 'normal' }}>{reqSummary(r, r.governorate?.name_fr)}</div></div>
              <Pill tone={REQ_STATUS[r.status][1]}>{REQ_STATUS[r.status][0]}</Pill>
            </Link>
          ))}
        </section>

        <section className="panel">
          <h3>Biens du client ({props.length})</h3>
          {props.length === 0 && <Empty>Ce client n’a pas de bien chez vous.</Empty>}
          {props.map((p) => (
            <Link href={`/crm/biens/${p.id}`} className="li" key={p.id} style={{ marginTop: 6 }}>
              <div className="mid"><div className="t">{p.title}</div><div className="s">{p.price_on_request ? 'Sur demande' : money(p.price_dt)}</div></div>
              <Pill tone={STATUS_BIEN[p.status][1]}>{STATUS_BIEN[p.status][0]}</Pill>
            </Link>
          ))}
        </section>

        <section className="panel">
          <div className="hrow"><h3>Visites ({visits.length})</h3><button className="btn" onClick={() => setM('visit')}>Planifier</button></div>
          {visits.length === 0 && <Empty>Aucune visite.</Empty>}
          {visits.map((v) => (
            <div className="li" key={v.id} style={{ marginTop: 6 }}>
              <div className="mid"><div className="t">{dtFR(v.starts_at)}</div><div className="s">{v.property?.title}</div></div>
              <Pill tone={VISIT_STATUS[v.status][1]}>{VISIT_STATUS[v.status][0]}</Pill>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="hrow"><h3>Affaires ({deals.length})</h3><button className="btn" onClick={() => setM('deal')}>Nouvelle</button></div>
          {deals.length === 0 && <Empty>Aucune affaire.</Empty>}
          {deals.map((x) => (
            <Link href="/crm/affaires" className="li" key={x.id} style={{ marginTop: 6 }}>
              <div className="mid"><div className="t">{x.property?.title || 'Bien supprimé'}</div><div className="s">{money(x.amount_dt)}</div></div>
              <Pill tone="blue">{STAGE_LABEL[x.stage]}</Pill>
            </Link>
          ))}
        </section>
      </div>

      <div className="cols">
        <section className="panel"><h3>Tâches</h3><Tasks filter={['client_id', id]} link={{ client_id: id }} /></section>
        <section className="panel"><h3>Historique</h3><Timeline filter={['client_id', id]} link={{ client_id: id }} /></section>
      </div>

      {m === 'edit' && <ClientForm initial={c} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
      {m === 'req' && <RequestForm initial={{ client_id: id, transaction: c.kind === 'locataire' ? 'location' : 'vente' }} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
      {m === 'visit' && <VisitForm initial={{ client_id: id }} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
      {m === 'deal' && <DealForm initial={{ client_id: id }} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
    </>
  );
}
