'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/Icons';
import { Empty, Pill } from '../../../components/crm/ui';
import { RequestForm } from '../../../components/crm/forms';
import { REQ_STATUS, reqSummary, matchScore, dateFR } from '../../../lib/crm';

export default function Demandes() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [props, setProps] = useState([]);
  const [st, setSt] = useState('active');
  const [add, setAdd] = useState(false);

  const load = useCallback(() => {
    supabase.from('crm_requests').select('*,client:crm_clients(id,full_name,phone),governorate:governorates(name_fr)').order('priority').order('created_at', { ascending: false }).then(({ data }) => setRows(data || []));
    supabase.from('crm_properties').select('id,status,transaction,property,governorate_id,delegation_id,price_dt,price_on_request,surface_total_m2,rooms').then(({ data }) => setProps(data || []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = (rows || []).filter((r) => !st || r.status === st);
  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}>
        <h2>Demandes {rows ? `(${rows.length})` : ''}</h2>
        <button className="btn sea" onClick={() => setAdd(true)}><Icon n="plus" size={18} /> Nouvelle demande</button>
      </div>
      <div className="panel">
        <div className="chips scroll">
          <button className={'chip' + (!st ? ' on' : '')} onClick={() => setSt('')}>Toutes</button>
          {Object.entries(REQ_STATUS).map(([k, [l]]) => <button key={k} className={'chip' + (st === k ? ' on' : '')} onClick={() => setSt(k)}>{l}</button>)}
        </div>
      </div>
      {rows === null && <p className="cmeta">Chargement…</p>}
      {rows && filtered.length === 0 && <div className="panel"><Empty>Aucune demande.</Empty></div>}
      <div className="list">
        {filtered.map((r) => {
          const n = props.filter((p) => matchScore(r, p)).length;
          return (
            <Link href={`/crm/demandes/${r.id}`} className="li" key={r.id}>
              <div className="mid">
                <div className="t">{r.client?.full_name}{r.priority === 1 ? ' ★' : ''}</div>
                <div className="s">{reqSummary(r, r.governorate?.name_fr)}</div>
                <div className="s">Ajoutée le {dateFR(r.created_at)}{r.must_have ? ` · ${r.must_have}` : ''}</div>
              </div>
              <div className="r">
                <Pill tone={REQ_STATUS[r.status][1]}>{REQ_STATUS[r.status][0]}</Pill>
                {r.status === 'active' && <div style={{ marginTop: 4 }}><Pill tone={n ? 'green' : ''}>{n} bien(s)</Pill></div>}
              </div>
            </Link>
          );
        })}
      </div>
      {add && <RequestForm onClose={() => setAdd(false)} onSaved={(id) => router.push(`/crm/demandes/${id}`)} />}
    </>
  );
}
