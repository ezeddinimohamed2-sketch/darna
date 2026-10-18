'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../Providers';
import { Empty } from './ui';
import { dateFR } from '../../lib/crm';

// filter = ['client_id', id] (facultatif) ; link = ids rattachés aux nouvelles tâches
export default function Tasks({ filter, link = {}, onChange }) {
  const { say } = useApp();
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const fk = filter?.[0], fv = filter?.[1];

  const load = useCallback(() => {
    let q = supabase.from('crm_tasks').select('id,title,due_at,done,priority,client:crm_clients(full_name),property:crm_properties(title)').order('done').order('due_at', { nullsFirst: false }).limit(80);
    if (fk) q = q.eq(fk, fv);
    q.then(({ data }) => { setRows(data || []); onChange?.(data || []); });
  }, [fk, fv]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from('crm_tasks').insert({ title: title.trim(), due_at: due ? new Date(due + 'T09:00:00').toISOString() : null, ...link });
    if (error) return say(error.message);
    setTitle(''); setDue('');
    load();
  };
  const toggle = async (t) => {
    await supabase.from('crm_tasks').update({ done: !t.done, done_at: !t.done ? new Date().toISOString() : null }).eq('id', t.id);
    load();
  };
  const del = async (id) => { await supabase.from('crm_tasks').delete().eq('id', id); load(); };

  const open = rows.filter((t) => !t.done);
  const done = rows.filter((t) => t.done).slice(0, 5);
  const late = (t) => t.due_at && new Date(t.due_at) < new Date(new Date().toDateString());

  const Row = ({ t }) => (
    <div className={'tk' + (t.done ? ' done' : '')}>
      <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
      <div className="tt">
        {t.title}
        <div className="cmeta">
          {t.due_at && <span className={late(t) && !t.done ? 'late' : ''}>{dateFR(t.due_at)}</span>}
          {t.client?.full_name ? ` · ${t.client.full_name}` : ''}{t.property?.title ? ` · ${t.property.title}` : ''}
        </div>
      </div>
      <button className="link" style={{ color: 'var(--mut)' }} onClick={() => del(t.id)} aria-label="Supprimer">✕</button>
    </div>
  );

  return (
    <div>
      <div className="row" style={{ alignItems: 'stretch', marginTop: 0 }}>
        <input type="text" style={{ flex: 1, minWidth: 140 }} placeholder="Nouvelle tâche (rappeler, relancer…)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input type="date" style={{ width: 150 }} value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn sea" onClick={add}>Ajouter</button>
      </div>
      {open.length === 0 && <Empty>Aucune tâche en cours.</Empty>}
      {open.map((t) => <Row key={t.id} t={t} />)}
      {done.length > 0 && <div style={{ marginTop: 8, opacity: .75 }}>{done.map((t) => <Row key={t.id} t={t} />)}</div>}
    </div>
  );
}
