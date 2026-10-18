'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useApp } from '../../../components/Providers';
import { useCrm } from '../../../components/crm/CrmContext';
import { Field } from '../../../components/crm/ui';
import { dtFR } from '../../../lib/crm';

export default function Reseaux() {
  const { say } = useApp();
  const { uid } = useCrm();
  const [conn, setConn] = useState(undefined);
  const [f, setF] = useState({ user_token: '', app_id: '', app_secret: '' });
  const [pages, setPages] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('crm_social').select('fb_page_id,fb_page_name,ig_user_id,ig_username,connected_at').eq('agent_id', uid).maybeSingle();
    setConn(data || null);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const search = async () => {
    setBusy(true); setErr(''); setPages(null);
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch('/api/social/connect', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error || 'Erreur');
    setPages(j.pages);
    setF({ ...f, user_token: '', app_secret: '' });
    if (!j.pages.length) setErr('Aucune page trouvée pour ce compte. Vérifiez les autorisations cochées.');
  };

  const choose = async (p) => {
    const { error } = await supabase.from('crm_social').upsert({
      agent_id: uid, fb_page_id: p.id, fb_page_name: p.name, fb_page_token: p.token,
      ig_user_id: p.ig?.id || null, ig_username: p.ig?.username || null, connected_at: new Date().toISOString(),
    });
    if (error) return say(error.message);
    setPages(null);
    say('Réseaux connectés ✓');
    load();
  };
  const disconnect = async () => {
    if (!confirm('Déconnecter Facebook et Instagram ?')) return;
    await supabase.from('crm_social').delete().eq('agent_id', uid);
    load();
  };

  return (
    <>
      <div className="hrow" style={{ padding: '4px 4px 0' }}><h2>Réseaux sociaux</h2></div>

      <section className="panel">
        <h3>Connexion</h3>
        {conn === undefined && <p className="cmeta">Chargement…</p>}
        {conn && (
          <>
            <p className="ok-box">Connecté{conn.connected_at ? ` le ${dtFR(conn.connected_at)}` : ''}</p>
            <dl className="kv">
              <dt>Page Facebook</dt><dd>{conn.fb_page_name || '—'}</dd>
              <dt>Instagram</dt><dd>{conn.ig_username ? '@' + conn.ig_username : 'Non lié à cette page'}</dd>
            </dl>
            <div className="row"><button className="btn danger" onClick={disconnect}>Déconnecter</button></div>
          </>
        )}
        {conn === null && <p className="cmeta" style={{ marginTop: 0 }}>Aucune connexion. Suivez les étapes ci-dessous (une seule fois).</p>}
      </section>

      <section className="panel">
        <h3>{conn ? 'Changer de page' : 'Connecter ma page Facebook et mon Instagram'}</h3>
        <Field label="Jeton d’accès (Graph API Explorer)"><textarea style={{ minHeight: 70 }} value={f.user_token} onChange={(e) => setF({ ...f, user_token: e.target.value })} placeholder="EAAB…" /></Field>
        <div className="g2">
          <Field label="Identifiant de l’app"><input type="text" inputMode="numeric" value={f.app_id} onChange={(e) => setF({ ...f, app_id: e.target.value })} /></Field>
          <Field label="Clé secrète de l’app"><input type="password" autoComplete="off" value={f.app_secret} onChange={(e) => setF({ ...f, app_secret: e.target.value })} /></Field>
        </div>
        <p className="cmeta">La clé secrète sert une seule fois à obtenir un accès durable et n’est pas enregistrée.</p>
        {err && <p className="msg">{err}</p>}
        <button className="btn primary" style={{ width: 'auto' }} disabled={busy || !f.user_token || !f.app_id || !f.app_secret} onClick={search}>{busy ? '…' : 'Chercher mes pages'}</button>
        {pages && pages.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span className="lbl">Choisissez la page à utiliser</span>
            {pages.map((p) => (
              <div className="li" key={p.id} style={{ marginTop: 6 }}>
                <div className="mid"><div className="t">{p.name}</div><div className="s">{p.ig ? `Instagram : @${p.ig.username}` : 'Pas d’Instagram lié'}</div></div>
                <button className="btn sea" onClick={() => choose(p)}>Choisir</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Comment obtenir ces informations (10 minutes, une fois)</h3>
        <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.6 }}>
          <li>Votre Instagram doit être un compte <b>professionnel</b> (Paramètres Instagram → Type de compte) et <b>lié à votre page Facebook</b>.</li>
          <li>Sur <b>developers.facebook.com</b>, connectez-vous avec le compte Facebook qui administre la page, puis <b>Mes apps → Créer une app</b> (type « Entreprise »). Gardez l’app en mode <b>Développement</b> : c’est suffisant pour vos propres comptes.</li>
          <li>Dans l’app : <b>Paramètres → Général</b> : copiez l’<b>identifiant de l’app</b> et la <b>clé secrète</b>.</li>
          <li>Ouvrez <b>Outils → Explorateur de l’API Graph</b>, choisissez votre app, puis « Générer un jeton d’accès utilisateur » en cochant : <i>pages_show_list, pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish, business_management</i>.</li>
          <li>Copiez le jeton, collez-le ci-dessus avec l’identifiant et la clé, puis « Chercher mes pages ».</li>
        </ol>
        <p className="cmeta" style={{ marginBottom: 0 }}>Les photos Instagram doivent avoir un ratio entre 4:5 et 1,91:1 (évitez les photos très panoramiques ou très verticales).</p>
      </section>
    </>
  );
}
