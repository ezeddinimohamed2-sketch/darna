import './globals.css';
import Providers from '../components/Providers';

export const metadata = {
  title: 'DarNa — Annonces immobilières en Tunisie',
  description: "Acheter, louer, vendre un bien en Tunisie : appartements, villas, terrains. Publiez en 1 minute, sans rien taper.",
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B5C7A' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Cairo:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
