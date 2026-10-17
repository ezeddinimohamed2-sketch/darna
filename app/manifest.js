export default function manifest() {
  return {
    name: 'DarNa — Annonces immobilières en Tunisie',
    short_name: 'DarNa',
    description: 'Acheter, louer, vendre un bien en Tunisie.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f4ef',
    theme_color: '#0B5C7A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
