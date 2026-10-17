'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { T } from '../lib/i18n';

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
    ['/', 'nav_search', '🔍'],
    ['/publier', 'nav_publish', '＋'],
    ['/compte', 'nav_account', '👤'],
  ];
  const active = (h) => (h === '/' ? path === '/' : path.startsWith(h));

  return (
    <Ctx.Provider value={{ lang, setLang, t, say }}>
      <header className="top">
        <Link href="/" className="logo">
          <img src="/icon-192.png" alt="" className="logo-img" /> {t('app')}
        </Link>
        <button className="lang" onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}>
          {lang === 'fr' ? 'عربي' : 'FR'}
        </button>
      </header>
      <main className="wrap">{children}</main>
      <nav className="bottom">
        {nav.map(([h, k, ic]) => (
          <Link key={h} href={h} className={active(h) ? 'on' : ''}>
            <span className="ic">{ic}</span>
            {t(k)}
          </Link>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </Ctx.Provider>
  );
}
