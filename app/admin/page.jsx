'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';
import { useApp } from '../../components/Providers';
import AuthForm from '../../components/AuthForm';
import { priceLabel } from '../../components/ListingCard';

const LSEL = 'id,title,status,transaction,price_dt,price_on_request,rent_period,owner_id,created_at,owner:profiles!listings_owner_id_fkey(display_name,phone,verified)';

export default function Admin() {
  const { t, say } = useApp();
  const session = useSession();
  const [admin, setAdmin] = useState(null);
  const [reports, setReports] = useState([]);
  const [listings, setListings] = useState([]);
  const [agents, setAgents] = useState([]);

  const load = useCallback(async () => {
    if (!session) return;
    const me = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
    const ok = !!me.data?.is_admin;
    setAdmin(ok);
    if (!ok) return;
    const [r, l, ag] = await Promise.all([
      supabase.from('reports').select('id,reason,details,created_at,listing:listings(id,title,status)').order('created_at', { ascending: false }),
      supabase.from('listings').select(LSEL).order('created_at', { ascending: false }).limit(60),
      supabase.from('profiles').select('id,display_name,agency_name,advertiser,phone,crm_enabled,crm_requested,created_at').order('crm_requested', { ascending: false }).order('created_at', { ascending: false }).limit(100),
    ]);
    setAgents(ag.data || []);
    setReports(r.data || []);
    setListings(l.data || []);
  }, [session]);
  useEffect(() => { load(); }, [load]);

  if (session === undefined) return <p>{t('loading')}</p>;
  if (!session) return <AuthForm />;
  if (admin === null) return <p>{t('loading')}</p>;
  if (!admin) return <p>Accès réservé à l’administrateur.</p>;

  const setStatus = async (id, status) => {
    const { error } = await supabase.from('listings').update({ status }).eq('id', id);
    say(error ? error.message : 'OK');
    load();
  };
  const dismiss = async (id) => { await supabase.from('reports').delete().eq('id', id); load(); };
  const verify = async (uid, val) => {
    const { error } = await supabase.rpc('admin_set_verified', { target: uid, val });
    say(error ? error.message : 'OK');
    load();
  };

  const setCrm = async (uid, val) => {
    const { error } = await supabase.rpc('admin_set_crm', { target: uid, val });
    say(error ? error.message : val ? 'CRM activé' : 'CRM désactivé');
    load();
  };

  return (
    <>
      <h2>Accès DarNa Pro (CRM) — {agents.filter((a) => a.crm_requested).length} demande(s)</h2>
      {agents.map((a) => (
        <div className="mine" key={a.id}>
          <b>{a.agency_name || a.display_name || 'Sans nom'}</b>{' '}
          <span className="pill">{a.advertiser}</span>{' '}
          {a.crm_enabled && <span className="pill" style={{ background: 'var(--ok)', color: '#fff' }}>CRM actif</span>}
          {a.crm_requested && !a.crm_enabled && <span className="pill" style={{ background: 'var(--sun)', color: '#2a1c00' }}>Demande en attente</span>}
          <div className="cmeta">{a.phone || 'Pas de téléphone'}</div>
          <div className="row">
            {a.crm_enabled
              ? <button className="btn danger" onClick={() => setCrm(a.id, false)}>Désactiver le CRM</button>
              : <button className="btn sea" onClick={() => setCrm(a.id, true)}>Activer le CRM</button>}
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 22 }}>Signalements ({reports.length})</h2>
      {reports.length === 0 && <p className="cmeta">Aucun signalement.</p>}
      {reports.map((r) => (
        <div className="mine" key={r.id}>
          <b>{t('r_' + r.reason)}</b>
          <div className="cmeta">{r.listing ? <Link href={`/annonce/${r.listing.id}`}>{r.listing.title}</Link> : 'Annonce supprimée'}</div>
          <div className="row">
            {r.listing && r.listing.status === 'publiee' && <button className="btn danger" onClick={() => setStatus(r.listing.id, 'refusee')}>Retirer l’annonce</button>}
            <button className="btn" onClick={() => dismiss(r.id)}>Ignorer</button>
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 22 }}>Dernières annonces</h2>
      {listings.map((l) => (
        <div className="mine" key={l.id}>
          <Link href={`/annonce/${l.id}`}><b>{l.title}</b></Link>
          <div className="cmeta">
            {priceLabel(l, t)} · <span className="pill">{t('st_' + l.status)}</span> · {l.owner?.display_name || '—'}{l.owner?.phone ? ` · ${l.owner.phone}` : ''}
          </div>
          <div className="row">
            {l.status === 'publiee' && <button className="btn danger" onClick={() => setStatus(l.id, 'refusee')}>Retirer</button>}
            {l.status === 'refusee' && <button className="btn" onClick={() => setStatus(l.id, 'publiee')}>Remettre en ligne</button>}
            <button className="btn" onClick={() => verify(l.owner_id, !l.owner?.verified)}>
              {l.owner?.verified ? 'Retirer le badge vérifié' : 'Vérifier l’annonceur'}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
