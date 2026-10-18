'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="ovl" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheetbox" role="dialog" aria-label={title}>
        <div className="sheethead">
          <h3>{title}</h3>
          <button type="button" className="xbtn" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => (
  <div>
    <span className="lbl" style={{ marginTop: 12 }}>{label}</span>
    {children}
  </div>
);

export const Pill = ({ tone = '', children }) => <span className={'pill ' + tone}>{children}</span>;

export const Empty = ({ children }) => <p className="cmeta" style={{ padding: '8px 0' }}>{children}</p>;

export function Seg({ value, onChange, options, allowNone }) {
  return (
    <div className="seg">
      {options.map(([k, l]) => (
        <button type="button" key={k} className={'chip' + (value === k ? ' on' : '')} onClick={() => onChange(allowNone && value === k ? '' : k)}>{l}</button>
      ))}
    </div>
  );
}

// nombre saisi comme texte pour éviter les 0 forcés
export function Num({ value, onChange, ...rest }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : +e.target.value)}
      {...rest}
    />
  );
}

export function useGeo(gov) {
  const [govs, setGovs] = useState([]);
  const [delegs, setDelegs] = useState([]);
  const [hoods, setHoods] = useState([]);
  useEffect(() => {
    supabase.from('governorates').select('id,name_fr').order('name_fr').then(({ data }) => setGovs(data || []));
  }, []);
  useEffect(() => {
    if (!gov) { setDelegs([]); setHoods([]); return; }
    supabase.from('delegations').select('id,name_fr').eq('governorate_id', gov).order('name_fr').then(({ data }) => setDelegs(data || []));
    supabase.from('neighborhoods').select('id,name_fr').eq('governorate_id', gov).order('name_fr').then(({ data }) => setHoods(data || []));
  }, [gov]);
  return { govs, delegs, hoods };
}

export function useClients() {
  const [clients, setClients] = useState([]);
  const reload = () => supabase.from('crm_clients').select('id,full_name,phone,whatsapp,email,kind,archived').order('full_name').then(({ data }) => setClients(data || []));
  useEffect(() => { reload(); }, []);
  return [clients, reload];
}

export function ClientSelect({ value, onChange, clients, none = '— Aucun —' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{none}</option>
      {clients.filter((c) => !c.archived || c.id === value).map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
    </select>
  );
}

export const clean = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));
