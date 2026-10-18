import { createClient } from '@supabase/supabase-js';

export const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v23.0'}`;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// client Supabase agissant au nom de l'utilisateur (son jeton de session)
export function userClient(req) {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  return createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}

export async function graph(path, { method = 'GET', params = {} } = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && body.append(k, typeof v === 'string' ? v : JSON.stringify(v)));
  const opts = { method, cache: 'no-store' };
  let u = `${GRAPH}${path}`;
  if (method === 'GET') u += `?${body.toString()}`;
  else { opts.body = body; opts.headers = { 'content-type': 'application/x-www-form-urlencoded' }; }
  const r = await fetch(u, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error || {};
    throw new Error(e.error_user_msg || e.message || `Erreur Meta (${r.status})`);
  }
  return j;
}
