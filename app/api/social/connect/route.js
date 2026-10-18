import { NextResponse } from 'next/server';
import { graph, userClient } from '../../../../lib/graph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Échange le jeton Facebook contre un jeton longue durée et liste les pages (+ Instagram lié).
// L'identifiant et le secret de l'app ne sont jamais enregistrés.
export async function POST(req) {
  const sb = userClient(req);
  if (!sb) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const { data: ok } = await sb.rpc('crm_ok');
  if (!ok) return NextResponse.json({ error: 'Accès CRM requis' }, { status: 403 });

  const { user_token, app_id, app_secret } = await req.json().catch(() => ({}));
  if (!user_token || !app_id || !app_secret) return NextResponse.json({ error: 'Jeton, identifiant et secret de l’app requis.' }, { status: 400 });
  try {
    const long = await graph('/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: String(app_id).trim(), client_secret: String(app_secret).trim(), fb_exchange_token: String(user_token).trim() },
    });
    const accounts = await graph('/me/accounts', {
      params: { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 25, access_token: long.access_token },
    });
    const pages = (accounts.data || []).map((p) => ({
      id: p.id, name: p.name, token: p.access_token,
      ig: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username } : null,
    }));
    return NextResponse.json({ pages });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
