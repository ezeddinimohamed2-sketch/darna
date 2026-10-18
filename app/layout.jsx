import './globals.css';
import Providers from '../components/Providers';

import { SITE_URL } from '../lib/site';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { type: 'website', siteName: 'DarNa', title: 'DarNa — Annonces immobilières en Tunisie', description: 'Acheter, louer, vendre un bien en Tunisie.', images: [{ url: '/logo.png' }], locale: 'fr_TN' },
  title: 'DarNa — Annonces immobilières en Tunisie',
  appleWebApp: { capable: true, title: 'DarNa', statusBarStyle: 'default' },
  description: "Acheter, louer, vendre un bien en Tunisie : appartements, villas, terrains. Publiez en 1 minute, sans rien taper.",
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
