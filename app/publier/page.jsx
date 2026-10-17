'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';
import { useApp } from '../../components/Providers';
import AuthForm from '../../components/AuthForm';
import { TX_MAP, DEED_MAP, SPEC, TG_COL, PUB_TYPES, nm, fmt } from '../../lib/data';
import { shrink } from '../../lib/photos';

const PRICES = {
  vente: [80000, 150000, 250000, 400000, 600000, 1000000],
  location: [300, 500, 800, 1200, 2000],
  saison: [80, 150, 250, 400],
};
const PRICE_STEP = { vente: 10000, location: 50, saison: 10 };
const INIT = { tx: '', type: '', gov: '', deleg: '', hood: '', surface: 0, rooms: 0, floor: null, tg: {}, deed: '', price: 0, onReq: false, nego: false, period: 'mois', photos: [] };

export default function Publier() {
  const { t, lang, say } = useApp();
  const router = useRouter();
  const session = useSession();
  const [d, setD] = useState(INIT);
  const [i, setI] = useState(0);
  const [govs, setGovs] = useState([]);
  const [delegs, setDelegs] = useState([]);
  const [hoods, setHoods] = useState([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const fileRef = useRef();

  // brouillon (sans les photos)
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem('darna-draft') || 'null');
      if (s) { setD({ ...INIT, ...s.d, photos: [] }); setI(s.i || 0); }
    } catch (e) {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      const { photos, ...rest } = d;
      sessionStorage.setItem('darna-draft', JSON.stringify({ d: rest, i }));
    } catch (e) {}
  }, [d, i, ready]);

  useEffect(() => {
    supabase.from('governorates').select('id,name_fr,name_ar').order('name_fr').then(({ data }) => setGovs(data || []));
  }, []);
  useEffect(() => {
    if (!d.gov) { setDelegs([]); setHoods([]); return; }
    supabase.from('delegations').select('id,name_fr,name_ar').eq('governorate_id', d.gov).order('name_fr').then(({ data }) => setDelegs(data || []));
    supabase.from('neighborhoods').select('id,name_fr,name_ar').eq('governorate_id', d.gov).order('name_fr').then(({ data }) => setHoods(data || []));
  }, [d.gov]);

  const set = (p) => setD((x) => ({ ...x, ...p }));
  const sp = SPEC[d.type];
  const isSale = d.tx === 'vente';
  // étapes : 0 tx,1 type,2 où,3 détails,4 titre (vente),5 prix,6 photos,7 récap
  const steps = useMemo(() => [0, 1, 2, 3, ...(isSale ? [4] : []), 5, 6, 7], [isSale]);
  const cur = steps[Math.min(i, steps.length - 1)];
  const pct = ((Math.min(i, steps.length - 1) + 1) / steps.length) * 100;

  const gv = govs.find((g) => String(g.id) === String(d.gov));
  const dl = delegs.find((g) => String(g.id) === String(d.deleg));
  const place = [nm(dl, lang), nm(gv, lang)].filter(Boolean).join(', ');
  const per = d.tx === 'vente' ? '' : d.period === 'nuit' ? t('perNight') : d.period === 'an' ? t('perYear') : t('perMonth');

  const title = d.type && d.tx
    ? `${t('p_' + d.type)} ${d.tx === 'vente' ? (lang === 'ar' ? 'للبيع' : 'à vendre') : d.tx === 'saison' ? (lang === 'ar' ? 'للكراء الموسمي' : 'location saisonnière') : (lang === 'ar' ? 'للكراء' : 'à louer')}${d.surface ? ' ' + d.surface + ' ' + t('m2') : ''}${place ? ' — ' + place : ''}`.slice(0, 160)
    : '';
  const desc = [
    d.rooms ? `${t('rooms')} : ${d.rooms}` : '',
    d.floor != null && sp?.floor ? `${t('floor')} : ${d.floor === 0 ? t('ground') : d.floor}` : '',
    ...Object.keys(d.tg).filter((k) => d.tg[k]).map((k) => t(k)),
    d.deed ? `${t('deed')} : ${t('d_' + d.deed)}` : '',
    d.nego ? t('nego') : '',
  ].filter(Boolean).join('\n');

  const can = () => {
    if (cur === 0) return !!d.tx;
    if (cur === 1) return !!d.type;
    if (cur === 2) return !!d.gov && !!d.deleg;
    if (cur === 3) return d.surface > 0 && (!sp?.rooms || d.rooms > 0);
    if (cur === 4) return !!d.deed;
    if (cur === 5) return d.onReq || d.price > 0;
    return true;
  };

  const pick = (k, v) => { set({ [k]: v }); };
  const chooseType = (p) => set({ type: p, surface: SPEC[p].def, rooms: 0, floor: null, tg: {}, deed: '' });

  const addFiles = async (files) => {
    const list = [...files].slice(0, 8 - d.photos.length);
    const out = [];
    for (const f of list) {
      const blob = await shrink(f);
      out.push({ blob, url: URL.createObjectURL(blob) });
    }
    set({ photos: [...d.photos, ...out] });
  };

  const publish = async () => {
    if (!session) return;
    setBusy(true);
    const uid = session.user.id;
    const row = {
      owner_id: uid,
      transaction: TX_MAP[d.tx],
      property: d.type,
      title: title.length >= 10 ? title : title.padEnd(10, '.'),
      description: desc || null,
      lang,
      governorate_id: +d.gov,
      delegation_id: +d.deleg,
      neighborhood_id: d.hood ? +d.hood : null,
      price_on_request: d.onReq,
      price_dt: d.onReq ? null : d.price,
      rent_period: d.tx === 'vente' ? null : d.tx === 'saison' ? 'nuit' : d.period,
      negotiable: d.nego,
      surface_total_m2: d.surface,
      rooms: sp?.rooms ? d.rooms : null,
      floor: sp?.floor && d.floor != null ? d.floor : null,
      title_deed: isSale && d.deed ? DEED_MAP[d.deed] : null,
      furnished: !!d.tg.furnished,
      has_parking: !!d.tg.parking,
      has_elevator: !!d.tg.elevator,
      has_pool: !!d.tg.pool,
    };
    const { data, error } = await supabase.from('listings').insert(row).select('id').single();
    if (error) {
      setBusy(false);
      return say(error.code === '23505' ? t('dupMsg') : `${t('pubErr')} : ${error.message}`);
    }
    const id = data.id;
    const rowsPh = [];
    let upErr = '';
    for (let n = 0; n < d.photos.length; n++) {
      const path = `${uid}/${id}/${n}.jpg`;
      const { error: e2 } = await supabase.storage.from('listing-photos').upload(path, d.photos[n].blob, { contentType: 'image/jpeg', upsert: true });
      if (!e2) rowsPh.push({ listing_id: id, storage_path: path, position: n });
      else upErr = e2.message;
    }
    if (rowsPh.length) await supabase.from('listing_photos').insert(rowsPh);
    try { sessionStorage.removeItem('darna-draft'); } catch (e) {}
    say(upErr ? `${t('pubOk')} (photos : ${upErr})` : t('pubOk'));
    router.push(`/annonce/${id}`);
  };

  const Chips = ({ items, value, onPick }) => (
    <div className="chips">
      {items.map(([k, label]) => (
        <button key={String(k)} className={'chip' + (value === k ? ' on' : '')} onClick={() => onPick(k)}>{label}</button>
      ))}
    </div>
  );
  const Stepper = ({ value, step, min = 0, onChange, unit }) => (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <b>{fmt(value)} {unit}</b>
      <button onClick={() => onChange(value + step)}>+</button>
    </div>
  );

  if (!ready) return null;

  return (
    <>
      <div className="progress"><i style={{ width: pct + '%' }} /></div>

      {cur === 0 && (<>
        <h2>{t('s_tx')}</h2>
        <div className="chips">
          {[['vente', '🏷️', 'tx_sell'], ['location', '🔑', 'tx_rent'], ['saison', '🌴', 'tx_season']].map(([k, ic, lb]) => (
            <button key={k} className={'tile' + (d.tx === k ? ' on' : '')} onClick={() => { set({ tx: k, price: 0 }); }}><span className="big">{ic}</span>{t(lb)}</button>
          ))}
        </div>
      </>)}

      {cur === 1 && (<>
        <h2>{t('s_type')}</h2>
        <div className="chips">
          {PUB_TYPES.map((p) => (
            <button key={p} className={'tile' + (d.type === p ? ' on' : '')} onClick={() => chooseType(p)}>{t('p_' + p)}</button>
          ))}
        </div>
      </>)}

      {cur === 2 && (<>
        <h2>{t('s_where')}</h2>
        <span className="lbl">{t('gov')}</span>
        <select value={d.gov} onChange={(e) => set({ gov: e.target.value, deleg: '', hood: '' })}>
          <option value="">—</option>
          {govs.map((g) => <option key={g.id} value={g.id}>{nm(g, lang)}</option>)}
        </select>
        {d.gov && (<>
          <span className="lbl">{t('deleg')}</span>
          <div className="chips">
            {delegs.map((x) => (
              <button key={x.id} className={'chip' + (String(d.deleg) === String(x.id) ? ' on' : '')} onClick={() => set({ deleg: String(x.id) })}>{nm(x, lang)}</button>
            ))}
          </div>
        </>)}
        {d.deleg && hoods.length > 0 && (<>
          <span className="lbl">{t('hood')}</span>
          <div className="chips">
            {hoods.map((x) => (
              <button key={x.id} className={'chip' + (String(d.hood) === String(x.id) ? ' on' : '')} onClick={() => set({ hood: String(d.hood) === String(x.id) ? '' : String(x.id) })}>{nm(x, lang)}</button>
            ))}
          </div>
        </>)}
      </>)}

      {cur === 3 && sp && (<>
        <h2>{t('s_specs')}</h2>
        <span className="lbl">{t('surface')}</span>
        <Chips items={sp.quick.map((q) => [q, q + ' ' + t('m2')])} value={d.surface} onPick={(v) => set({ surface: v })} />
        <Stepper value={d.surface} step={sp.step} min={sp.step} unit={t('m2')} onChange={(v) => set({ surface: v })} />
        {sp.rooms && (<>
          <span className="lbl">{t('rooms')}</span>
          <Chips items={[1, 2, 3, 4, 5, 6].map((n) => [n, n === 6 ? '6+' : String(n)])} value={d.rooms} onPick={(v) => set({ rooms: v })} />
        </>)}
        {sp.floor && (<>
          <span className="lbl">{t('floor')}</span>
          <Chips items={[[0, t('ground')], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5+']]} value={d.floor} onPick={(v) => set({ floor: v })} />
        </>)}
        {sp.tg.length > 0 && (
          <div className="chips" style={{ marginTop: 14 }}>
            {sp.tg.map((k) => (
              <button key={k} className={'chip' + (d.tg[k] ? ' on' : '')} onClick={() => set({ tg: { ...d.tg, [k]: !d.tg[k] } })}>{t(k)}</button>
            ))}
          </div>
        )}
      </>)}

      {cur === 4 && (<>
        <h2>{t('s_deed')}</h2>
        <div className="chips">
          {Object.keys(DEED_MAP).map((k) => (
            <button key={k} className={'tile' + (d.deed === k ? ' on' : '')} onClick={() => set({ deed: k })}>{t('d_' + k)}</button>
          ))}
        </div>
      </>)}

      {cur === 5 && (<>
        <h2>{t('s_price')}</h2>
        {d.tx === 'location' && (<>
          <span className="lbl">{t('period')}</span>
          <Chips items={[['mois', t('pm')], ['an', t('py')]]} value={d.period} onPick={(v) => set({ period: v })} />
        </>)}
        {!d.onReq && (<>
          <span className="lbl">{t('price')}</span>
          <Chips items={PRICES[d.tx].map((p) => [p, fmt(p)])} value={d.price} onPick={(v) => set({ price: v })} />
          <Stepper value={d.price} step={PRICE_STEP[d.tx]} unit={t('dt') + per} onChange={(v) => set({ price: v })} />
          {d.price > 0 && d.surface > 0 && isSale && <p className="cmeta">{t('pricePerM2')} : {fmt(Math.round(d.price / d.surface))} {t('dt')}/{t('m2')}</p>}
        </>)}
        <div className="chips" style={{ marginTop: 14 }}>
          <button className={'chip' + (d.nego ? ' on' : '')} onClick={() => set({ nego: !d.nego })}>{t('nego')}</button>
          <button className={'chip' + (d.onReq ? ' on' : '')} onClick={() => set({ onReq: !d.onReq })}>{t('askPrice')}</button>
        </div>
      </>)}

      {cur === 6 && (<>
        <h2>{t('s_photos')}</h2>
        <p className="cmeta">{t('photosHint')}</p>
        <div className="photos">
          {d.photos.map((p, n) => (
            <div className="ph" key={n}>
              <img src={p.url} alt="" />
              <button className="x" aria-label={t('removePhoto')} onClick={() => set({ photos: d.photos.filter((_, j) => j !== n) })}>×</button>
            </div>
          ))}
          {d.photos.length < 8 && <button className="addph" onClick={() => fileRef.current.click()}>＋</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        {d.photos.length === 0 && <p className="msg">{t('noPhotoWarn')}</p>}
      </>)}

      {cur === 7 && (<>
        <h2>{t('s_recap')}</h2>
        <div className="recap">
          <h3>{title}</h3>
          <div className="cprice">{d.onReq ? t('onRequest') : `${fmt(d.price)} ${t('dt')}${per}`}</div>
          <p>{desc}</p>
          {d.photos.length > 0 && <div className="photos">{d.photos.slice(0, 3).map((p, n) => <div className="ph" key={n}><img src={p.url} alt="" /></div>)}</div>}
        </div>
        {session === undefined ? null : session ? (
          <button className="btn primary" style={{ marginTop: 16 }} disabled={busy} onClick={publish}>{busy ? t('publishing') : t('publish')}</button>
        ) : (
          <>
            <p className="lbl">{t('loginToPublish')}</p>
            <AuthForm />
          </>
        )}
      </>)}

      <div className="foot">
        {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>{t('back')}</button>}
        {cur !== 7 && <button className="btn sea" disabled={!can()} onClick={() => setI(i + 1)}>{t('next')}</button>}
      </div>
    </>
  );
}
