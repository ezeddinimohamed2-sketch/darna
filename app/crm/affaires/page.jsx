'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { useApp } from '../../../components/Providers';
import Icon from '../../../components/Icons';
import { DealForm } from '../../../components/crm/forms';
import { STAGES, OPEN_STAGES, money, dateFR, moveDeal, suggestCommission } from '../../../lib/crm';

const ORDER = ['nouveau', 'visite', 'offre', 'negociation', 'promesse', 'signature', 'conclu'];

export default function Affaires() {
  const { say } = useApp();
  const [rows, setRows] = useState(null);
  const [m, setM] = useState(null);
  const [showLost, setShowLost] = useState(false);

  const load = useCallback(() => {
    supabase.from('crm_deals').select('*,property:crm_properties(id,title,status,transaction,listing_id,commission_pct,commission_fixed),client:crm_clients(id,full_name,phone)').order('updated_at', { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const move = async (d, dir) => {
    const i = ORDER.indexOf(d.stage) + dir;
    if (i < 0 || i >= ORDER.length) return;
    const stage = ORDER[i];
    if (stage === 'conclu' && !confirm(`Conclure l’affaire ? Le bien sera marqué ${d.property?.transaction === 'vente' ? 'vendu' : 'loué'} et son annonce DarNa retirée.`)) return;
    const extra = {};
    if (stage === 'conclu' && d.commission_dt == null) {
      const c = suggestCommission(d.property, d.amount_dt);
      if (c != null) extra.commission_dt = c;
    }
    const res = await moveDeal(d, stage, d.property, extra);
    if (res.error) return say(res.error);
    load();
  };
  const lose = async (d) => {
    const reason = prompt('Motif de la perte (prix, financement, a trouvé ailleurs…) ?');
    if (reason === null) return;
    const res = await moveDeal(d, 'perdu', null, { lost_reason: reason || null });
    if (res.error) return say(res.error);
    load();
  };
  const reopen = async (d) => { await moveDeal(d, 'nouveau', null, { lost_reason: null }); load(); };

  const open = (rows || []).filter((d) => OPEN_STAGES.includes(d.stage));
  const pipeline = open.reduce((s, d) => s + (+d.amount_dt || 0), 0);
  const expected = open.reduce((s, d) => s + (+d.commission_dt || 0), 0);
  const lost = (rows || []).filter((d) => d.stage === 'perdu');

  const Card = ({ d }) => (
    <div className="kcard">
      <button className="link" style={{ padding: 0, textAlign: 'left', color: 'var(--ink)' }} onClick={() => setM({ edit: d })}>
        <span className="t">{d.property?.title || 'Bien supprimé'}</span>
      </button>
      <div className="cmeta"><Link href={`/crm/clients/${d.client?.id}`}>{d.client?.full_name || '—'}</Link></div>
      <div style={{ marginTop: 4 }}><b>{money(d.amount_dt)}</b>{d.commission_dt ? <span className="cmeta"> · com. {money(d.commission_dt)}</span> : null}</div>
      {d.expected_close && <div className="cmeta">Clôture prévue {dateFR(d.expected_close)}</div>}
      {d.lost_reason && <div className="cmeta">Motif : {d.lost_reason}</div>}
      {OPEN_STAGES.includes(d.stage) && (
        <div className="kmove">
          <button className="btn" disabled={d.stage === 'nouveau'} onClick={() => move(d, -1)} aria-label="Étape précédente">◀</button>
          <button className="btn" onClick={() => lose(d)}>Perdu</button>
          <button className="btn sea" onClick={() => move(d, 1)} aria-label="Étape suivante">▶</button>
        </div>
      )}
      {d.stage === 'perdu' && <div className="kmove"><button className="btn" onClick={() => reopen(d)}>Rouvrir</button></div>}
    </div>
  );

  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <h2>Affaires</h2>
        <button className="btn sea" onClick={() => setM({ add: true })}><Icon n="plus" size={18} /> Nouvelle affaire</button>
      </div>
      <div className="stats">
        <div className="stat"><b>{open.length}</b><span>Affaires en cours</span></div>
        <div className="stat"><b>{money(pipeline)}</b><span>Valeur du pipeline</span></div>
        <div className="stat"><b>{money(expected)}</b><span>Commissions attendues</span></div>
      </div>
      {rows === null && <p className="cmeta">Chargement…</p>}
      {rows && (
        <div className="kan">
          {STAGES.filter(([k]) => k !== 'perdu').map(([k, l]) => {
            const col = rows.filter((d) => d.stage === k);
            const total = col.reduce((s, d) => s + (+d.amount_dt || 0), 0);
            return (
              <div className="kcol" key={k}>
                <h4><span>{l} ({col.length})</span><span className="cmeta">{total ? money(total) : ''}</span></h4>
                {col.length === 0 && <div className="cmeta" style={{ padding: 6 }}>—</div>}
                {col.map((d) => <Card key={d.id} d={d} />)}
              </div>
            );
          })}
        </div>
      )}
      {lost.length > 0 && (
        <section className="panel">
          <button className="link" style={{ padding: 0 }} onClick={() => setShowLost(!showLost)}>{showLost ? '▾' : '▸'} Affaires perdues ({lost.length})</button>
          {showLost && <div style={{ marginTop: 8 }}>{lost.map((d) => <Card key={d.id} d={d} />)}</div>}
        </section>
      )}
      {m?.add && <DealForm onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
      {m?.edit && <DealForm initial={m.edit} onClose={() => setM(null)} onSaved={() => { setM(null); load(); }} />}
    </>
  );
}
