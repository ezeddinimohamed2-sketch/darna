'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';
import { useApp } from '../../components/Providers';
import AuthForm from '../../components/AuthForm';
import { CrmCtx } from '../../components/crm/CrmContext';

const TABS = [
  ['/crm', 'Tableau de bord'],
  ['/crm/biens', 'Biens'],
  ['/crm/clients', 'Clients'],
  ['/crm/demandes', 'Demandes'],
  ['/crm/visites', 'Visites'],
  ['/crm/affaires', 'Affaires'],
  ['/crm/reseaux', 'Réseaux'],
];

export default function CrmLayout({ children }) {
  const session = useSession();
  const { say } = useApp();
  const path = usePathname();
  const [prof, setProf] = useState(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from('profiles').select('display_name,agency_name,advertiser,phone,whatsapp,crm_enabled,crm_requested').eq('id', session.user.id).maybeSingle();
    setProf(data || {});
  }, [session]);
  useEffect(() => { load(); }, [load]);

  if (session === undefined || (session && prof === null)) return <p className="box" style={{ padding: 16 }}>Chargement…</p>;
  if (!session) {
    return (
      <div className="box" style={{ padding: 16 }}>
        <h2>DarNa Pro — le CRM des agents immobiliers</h2>
        <p className="cmeta">Connectez-vous pour accéder à votre espace professionnel.</p>
        <AuthForm />
      </div>
    );
  }
  if (!prof.crm_enabled) {
    const ask = async () => {
      const { error } = await supabase.rpc('request_crm_access');
      say(error ? error.message : 'Demande envoyée');
      load();
    };
    return (
      <div className="box" style={{ padding: 16 }}>
        <h2>DarNa Pro — le CRM des agents immobiliers</h2>
        <p>Gérez vos biens, vos clients, vos demandes, vos visites et vos affaires au même endroit, et publiez vos biens sur DarNa en un geste.</p>
        <p className="cmeta">L’accès est réservé aux agences et agents validés par DarNa.</p>
        {prof.crm_requested
          ? <p className="ok-box">Votre demande est enregistrée. Nous vous activons l’accès très bientôt.</p>
          : <button className="btn primary" onClick={ask}>Demander l’accès</button>}
      </div>
    );
  }

  const on = (h) => (h === '/crm' ? path === '/crm' : path.startsWith(h));
  return (
    <CrmCtx.Provider value={{ uid: session.user.id, prof, reloadProfile: load }}>
      <nav className="crmnav">
        {TABS.map(([h, l]) => <Link key={h} href={h} className={on(h) ? 'on' : ''}>{l}</Link>)}
      </nav>
      {children}
    </CrmCtx.Provider>
  );
}
