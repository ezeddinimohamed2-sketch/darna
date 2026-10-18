'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { T } from '../lib/i18n';
import Icon from './Icons';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function Providers({ children }) {
  const [lang, setLangState] = useState('fr');
  const [toast, setToast] = useState('');
  const path = usePathname();

  useEffect(() => {
    try {
      const l = localStorage.getItem('darna-lang');
      if (l === 'ar' || l === 'fr') setLangState(l);
    } catch (e) {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem('darna-lang', l); } catch (e) {}
  };
  const say = useCallback((m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  }, []);
  const t = (k, ...a) => {
    const v = T[lang][k] ?? T.fr[k] ?? k;
    return typeof v === 'function' ? v(...a) : v;
  };

  const nav = [
    ['/', 'nav_search', 'home'],
    ['/publier', 'nav_publish', 'plus'],
    ['/crm', 'nav_pro', 'briefcase'],
    ['/compte', 'nav_account', 'user'],
  ];
  const active = (h) => (h === '/' ? path === '/' : path.startsWith(h));

  return (
    <Ctx.Provider value={{ lang, setLang, t, say }}>
      <header className="top">
        <Link href="/" className="logo">
          <img src="/icon-192.png" alt="" className="logo-img" /> {t('app')}
        </Link>
        <button className="lang" onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}>
          <Icon n="globe" size={18} />
          {lang === 'fr' ? 'عربي' : 'FR'}
        </button>
      </header>
      <main className={'wrap ' + (path === '/' || path.startsWith('/annonce') ? 'feed' : path.startsWith('/crm') ? 'feed crm' : 'sheet')}>{children}</main>
      <nav className="bottom">
        {nav.map(([h, k, ic]) => (
          <Link key={h} href={h} className={active(h) ? 'on' : ''}>
            <Icon n={ic} size={24} fill={active(h) && ic === 'home'} />
            {t(k)}
          </Link>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </Ctx.Provider>
  );
}
