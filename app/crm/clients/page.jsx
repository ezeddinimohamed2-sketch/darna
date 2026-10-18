'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/Icons';
import { Empty, Pill } from '../../../components/crm/ui';
import { ClientForm } from '../../../components/crm/forms';
import { KIND_CLIENT, dateFR, telHref, waHref } from '../../../lib/crm';

export default function Clients() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [arch, setArch] = useState(false);
  const [add, setAdd] = useState(false);

  const load = useCallback(() => {
    supabase.from('crm_clients').select('id,full_name,phone,whatsapp,kind,last_contact_at,archived,tags,requests:crm_requests(count),properties:crm_properties(count)').order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = (rows || []).filter((c) => {
    if (c.archived !== arch) return false;
    if (kind && c.kind !== kind) return false;
    if (q && !`${c.full_name} ${c.phone || ''} ${(c.tags || []).join(' ')}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <h2>Clients {rows ? `(${rows.filter((c) => !c.archived).length})` : ''}</h2>
        <button className="btn sea" onClick={() => setAdd(true)}><Icon n="plus" size={18} /> Nouveau client</button>
      </div>
      <div className="panel">
        <input className="search" type="search" placeholder="Rechercher (nom, téléphone, étiquette)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips scroll" style={{ marginTop: 10 }}>
          <button className={'chip' + (!kind ? ' on' : '')} onClick={() => setKind('')}>Tous</button>
          {Object.entries(KIND_CLIENT).map(([k, l]) => <button key={k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{l}</button>)}
          <button className={'chip' + (arch ? ' on' : '')} onClick={() => setArch(!arch)}>Archivés</button>
        </div>
      </div>
      {rows === null && <p className="cmeta">Chargement…</p>}
      {rows && filtered.length === 0 && <div className="panel"><Empty>{rows.length === 0 ? 'Aucun client. Ajoutez votre premier contact.' : 'Aucun client ne correspond.'}</Empty></div>}
      <div className="list">
        {filtered.map((c) => (
          <div className="li" key={c.id}>
            <Link href={`/crm/clients/${c.id}`} className="mid" style={{ display: 'block' }}>
              <div className="t">{c.full_name}</div>
              <div className="s">{c.phone || 'Pas de téléphone'} · {c.last_contact_at ? `contacté ${dateFR(c.last_contact_at)}` : 'jamais contacté'}</div>
              <div className="s">{c.requests?.[0]?.count || 0} demande(s) · {c.properties?.[0]?.count || 0} bien(s){(c.tags || []).length ? ' · ' + c.tags.join(', ') : ''}</div>
            </Link>
            <Pill tone="blue">{KIND_CLIENT[c.kind]}</Pill>
            <div style={{ display: 'flex', gap: 6 }}>
              {c.phone && <a className="btn" style={{ minHeight: 36, padding: '6px 10px' }} href={telHref(c.phone)} aria-label="Appeler"><Icon n="phone" size={18} /></a>}
              {waHref(c.whatsapp || c.phone) && <a className="btn wa" style={{ minHeight: 36, padding: '6px 10px' }} href={waHref(c.whatsapp || c.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon n="chat" size={18} /></a>}
            </div>
          </div>
        ))}
      </div>
      {add && <ClientForm onClose={() => setAdd(false)} onSaved={(id) => router.push(`/crm/clients/${id}`)} />}
    </>
  );
}
