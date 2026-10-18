'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../Providers';
import { Empty, Seg } from './ui';
import { ACT_LABEL, dtFR, touchClient } from '../../lib/crm';

// filter = ['client_id', id] ; link = ids enregistrés avec la note
export default function Timeline({ filter, link }) {
  const { say } = useApp();
  const [rows, setRows] = useState([]);
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('note');
  const [fk, fv] = filter;

  const load = useCallback(() => {
    supabase.from('crm_activities').select('id,kind,body,created_at').eq(fk, fv).order('created_at', { ascending: false }).limit(60).then(({ data }) => setRows(data || []));
  }, [fk, fv]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!body.trim()) return;
    const { error } = await supabase.from('crm_activities').insert({ kind, body: body.trim(), ...link });
    if (error) return say(error.message);
    if (link.client_id && ['appel', 'whatsapp', 'email', 'rdv'].includes(kind)) await touchClient(link.client_id);
    setBody('');
    load();
  };
  const del = async (id) => {
    await supabase.from('crm_activities').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <Seg value={kind} onChange={setKind} options={Object.entries(ACT_LABEL).filter(([k]) => ['note', 'appel', 'whatsapp', 'email', 'rdv'].includes(k))} />
      <div className="row" style={{ alignItems: 'stretch' }}>
        <input type="text" style={{ flex: 1, minWidth: 0 }} placeholder="Ajouter une note, un appel…" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn sea" onClick={add}>Ajouter</button>
      </div>
      {rows.length === 0 ? <Empty>Aucune activité pour le moment.</Empty> : (
        <div className="tl">
          {rows.map((r) => (
            <div className="ev" key={r.id}>
              <div className="when">{ACT_LABEL[r.kind] || r.kind} · {dtFR(r.created_at)} <button className="link" style={{ padding: 0, fontSize: '.75rem', color: 'var(--mut)' }} onClick={() => del(r.id)}>supprimer</button></div>
              <div style={{ whiteSpace: 'pre-line' }}>{r.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
