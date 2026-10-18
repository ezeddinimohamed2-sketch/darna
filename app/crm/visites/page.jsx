'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useApp } from '../../../components/Providers';
import Icon from '../../../components/Icons';
import { Empty, Pill } from '../../../components/crm/ui';
import { VisitForm } from '../../../components/crm/forms';
import { VISIT_STATUS, dateLong, timeFR, dtFR, sameDay, telHref, waHref, gcalHref, logActivity, touchClient } from '../../../lib/crm';

export default function Visites() {
  const { say } = useApp();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('avenir');
  const [m, setM] = useState(null);

  const load = useCallback(() => {
    supabase.from('crm_visits').select('*,property:crm_properties(id,title,address),client:crm_clients(id,full_name,phone,whatsapp)').order('starts_at', { ascending: true }).limit(300)
      .then(({ data }) => setRows(data || []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const startToday = new Date(new Date().toDateString()).getTime();
  const isOpen = (v) => ['planifiee', 'confirmee'].includes(v.status);
  let list = rows || [];
  if (tab === 'avenir') list = list.filter((v) => isOpen(v) && new Date(v.starts_at).getTime() >= startToday);
  else if (tab === 'cloturer') list = list.filter((v) => isOpen(v) && new Date(v.starts_at).getTime() < startToday);
  else if (tab === 'passees') list = list.filter((v) => !isOpen(v)).reverse();
  const toClose = (rows || []).filter((v) => isOpen(v) && new Date(v.starts_at).getTime() < startToday).length;

  const setStatus = async (v, status) => {
    const { error } = await supabase.from('crm_visits').update({ status }).eq('id', v.id);
    if (error) return say(error.message);
    if (status === 'faite') { await touchClient(v.client_id); await logActivity({ kind: 'visite', body: `Visite effectuée : ${v.property?.title}`, client_id: v.client_id, property_id: v.property_id }); setM({ edit: { ...v, status } }); }
    load();
  };

  // regroupement par jour
  const groups = [];
  list.forEach((v) => {
    const k = new Date(v.starts_at).toDateString();
    const g = groups.find((x) => x.k === k);
    g ? g.items.push(v) : groups.push({ k, d: v.starts_at, items: [v] });
  });

  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <h2>Visites</h2>
        <button className="btn sea" onClick={() => setM({ add: true })}><Icon n="plus" size={18} /> Planifier</button>
      </div>
      <div className="panel">
        <div className="chips scroll">
          {[['avenir', 'À venir'], ['cloturer', `À clôturer${toClose ? ` (${toClose})` : ''}`], ['passees', 'Historique']].map(([k, l]) => (
            <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      {rows === null && <p className="cmeta">Chargement…</p>}
      {rows && list.length === 0 && <div className="panel"><Empty>{tab === 'avenir' ? 'Aucune visite à venir.' : tab === 'cloturer' ? 'Rien à clôturer. 👌' : 'Aucune visite dans l’historique.'}</Empty></div>}
      {groups.map((g) => (
        <section className="panel" key={g.k}>
          <h3>{sameDay(g.d, now) ? 'Aujourd’hui' : dateLong(g.d)}</h3>
          {g.items.map((v) => {
            const c = v.client;
            const [sl, st] = VISIT_STATUS[v.status];
            return (
              <div className="li" key={v.id} style={{ marginTop: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 54, fontWeight: 700 }}>{timeFR(v.starts_at)}<div className="cmeta">{v.duration_min} min</div></div>
                <div className="mid">
                  <Link href={`/crm/biens/${v.property?.id}`} className="t" style={{ display: 'block' }}>{v.property?.title}</Link>
                  <Link href={`/crm/clients/${c?.id}`} className="s" style={{ display: 'block' }}>{c?.full_name}{c?.phone ? ` · ${c.phone}` : ''}</Link>
                  {v.property?.address && <div className="s">📍 {v.property.address}</div>}
                  {v.feedback && <div className="s" style={{ whiteSpace: 'normal' }}>« {v.feedback} »{v.interest ? ` — intérêt ${v.interest}/5` : ''}</div>}
                </div>
                <Pill tone={st}>{sl}</Pill>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%' }}>
                  {isOpen(v) && (
                    <>
                      {waHref(c?.whatsapp || c?.phone) && <a className="btn wa" style={{ minHeight: 34, padding: '4px 10px' }} target="_blank" rel="noopener noreferrer" onClick={() => v.status === 'planifiee' && setStatus(v, 'confirmee')}
                        href={waHref(c.whatsapp || c.phone, `Bonjour ${c.full_name}, je vous confirme notre visite de « ${v.property?.title} » le ${dtFR(v.starts_at)}.`)}>Confirmer</a>}
                      {c?.phone && <a className="btn" style={{ minHeight: 34, padding: '4px 10px' }} href={telHref(c.phone)}>Appeler</a>}
                      <button className="btn" style={{ minHeight: 34, padding: '4px 10px' }} onClick={() => setStatus(v, 'faite')}>✓ Faite</button>
                      <button className="btn" style={{ minHeight: 34, padding: '4px 10px' }} onClick={() => setStatus(v, 'absent')}>Absent</button>
                      <button className="btn" style={{ minHeight: 34, padding: '4px 10px' }} onClick={() => setStatus(v, 'annulee')}>Annuler</button>
                      <a className="btn" style={{ minHeight: 34, padding: '4px 10px' }} target="_blank" rel="noopener noreferrer" href={gcalHref(`Visite : ${v.property?.title}`, v.starts_at, v.duration_min, `Client : ${c?.full_name} ${c?.phone || ''}`)}><Icon n="calendar" size={16} /> Agenda</a>
                    </>
                  )}
                  <button className="btn" style={{ minHeight: 34, padding: '4px 10px' }} onClick={() => setM({ edit: v })}>Modifier</button>
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {m?.add && <VisitForm onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
      {m?.edit && <VisitForm initial={m.edit} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
    </>
  );
}
