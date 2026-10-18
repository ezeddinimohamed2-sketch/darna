'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/Icons';
import { Empty, Pill } from '../../../components/crm/ui';
import { PropertyForm } from '../../../components/crm/forms';
import { STATUS_BIEN, ACTIVE_BIEN, TX_LABEL, TYPE_LABEL, money, crmPhotoUrl, daysFrom } from '../../../lib/crm';

const SEL = 'id,reference,title,status,transaction,property,price_dt,price_on_request,rent_period,surface_total_m2,rooms,listing_id,mandate_end,governorate:governorates(name_fr),delegation:delegations(name_fr),owner:crm_clients(full_name),photos:crm_property_photos(storage_path,position)';

export default function Biens() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [st, setSt] = useState('actifs');
  const [tx, setTx] = useState('');
  const [add, setAdd] = useState(false);

  const load = useCallback(() => {
    supabase.from('crm_properties').select(SEL).order('created_at', { ascending: false }).then(({ data }) => setRows(data || []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = (rows || []).filter((p) => {
    if (st === 'actifs' && !ACTIVE_BIEN.includes(p.status)) return false;
    if (st === 'prospects' && p.status !== 'prospect') return false;
    if (st === 'clos' && !['vendu', 'loue'].includes(p.status)) return false;
    if (st === 'retires' && p.status !== 'retire') return false;
    if (tx && p.transaction !== tx) return false;
    if (q) {
      const hay = `${p.title} ${p.reference || ''} ${p.owner?.full_name || ''} ${p.delegation?.name_fr || ''} ${p.governorate?.name_fr || ''}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  const count = (k) => (rows || []).filter((p) => (k === 'actifs' ? ACTIVE_BIEN.includes(p.status) : k === 'prospects' ? p.status === 'prospect' : k === 'clos' ? ['vendu', 'loue'].includes(p.status) : k === 'retires' ? p.status === 'retire' : true)).length;

  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <h2>Biens {rows ? `(${rows.length})` : ''}</h2>
        <button className="btn sea" onClick={() => setAdd(true)}><Icon n="plus" size={18} /> Nouveau bien</button>
      </div>
      <div className="panel">
        <input className="search" type="search" placeholder="Rechercher (titre, référence, propriétaire, lieu)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips scroll" style={{ marginTop: 10 }}>
          {[['actifs', 'Actifs'], ['prospects', 'Prospects'], ['clos', 'Vendus / loués'], ['retires', 'Retirés'], ['tous', 'Tous']].map(([k, l]) => (
            <button key={k} className={'chip' + (st === k ? ' on' : '')} onClick={() => setSt(k)}>{l} {rows ? count(k) : ''}</button>
          ))}
        </div>
        <div className="chips scroll" style={{ marginTop: 8 }}>
          <button className={'chip' + (!tx ? ' on' : '')} onClick={() => setTx('')}>Toutes transactions</button>
          {Object.entries(TX_LABEL).map(([k, l]) => <button key={k} className={'chip' + (tx === k ? ' on' : '')} onClick={() => setTx(k)}>{l}</button>)}
        </div>
      </div>

      {rows === null && <p className="cmeta">Chargement…</p>}
      {rows && filtered.length === 0 && <div className="panel"><Empty>{rows.length === 0 ? 'Aucun bien pour le moment. Ajoutez votre premier bien ou mandat.' : 'Aucun bien ne correspond à ce filtre.'}</Empty></div>}
      <div className="list">
        {filtered.map((p) => {
          const ph = [...(p.photos || [])].sort((a, b) => a.position - b.position)[0];
          const [stLabel, stTone] = STATUS_BIEN[p.status] || [p.status, ''];
          return (
            <Link href={`/crm/biens/${p.id}`} className="li" key={p.id}>
              <div className="th">{ph ? <img src={crmPhotoUrl(ph.storage_path)} alt="" loading="lazy" /> : <Icon n="home" size={26} />}</div>
              <div className="mid">
                <div className="t">{p.title}</div>
                <div className="s">{[TYPE_LABEL[p.property], p.surface_total_m2 && `${p.surface_total_m2} m²`, p.delegation?.name_fr || p.governorate?.name_fr].filter(Boolean).join(' · ')}</div>
                <div className="s">{p.owner?.full_name ? `Propriétaire : ${p.owner.full_name}` : p.reference || ''}{p.mandate_end && daysFrom(p.mandate_end) <= 30 && ACTIVE_BIEN.includes(p.status) ? ' · mandat bientôt échu' : ''}</div>
              </div>
              <div className="r">
                <b>{p.price_on_request ? 'Sur demande' : money(p.price_dt)}</b>
                <div style={{ marginTop: 4, display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Pill tone={stTone}>{stLabel}</Pill>
                  {p.listing_id && <Pill tone="green">En ligne</Pill>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {add && <PropertyForm onClose={() => setAdd(false)} onSaved={(id) => router.push(`/crm/biens/${id}`)} />}
    </>
  );
}
