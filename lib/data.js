export const TX_MAP = { vente: 'vente', location: 'location', saison: 'location_saisonniere' };
export const DEED_MAP = {
  bleu: 'titre_bleu',
  tfi: 'titre_foncier_individuel',
  arabe: 'titre_arabe',
  cours: 'en_cours_immatriculation',
};
export const DEED_KEY = Object.fromEntries(Object.entries(DEED_MAP).map(([k, v]) => [v, k]));

export const PUB_TYPES = ['appartement', 'villa', 'terrain', 'bureau', 'local_commercial'];

export const SPEC = {
  appartement: { def: 90, step: 10, quick: [50, 70, 90, 120, 160], rooms: true, floor: true, tg: ['parking', 'elevator', 'furnished', 'pool'] },
  villa: { def: 300, step: 10, quick: [150, 250, 350, 500], rooms: true, floor: false, tg: ['parking', 'pool', 'furnished'] },
  terrain: { def: 400, step: 50, quick: [200, 300, 400, 600, 1000], rooms: false, floor: false, tg: [] },
  bureau: { def: 80, step: 10, quick: [40, 80, 120, 200], rooms: false, floor: true, tg: ['parking', 'elevator', 'furnished'] },
  local_commercial: { def: 60, step: 10, quick: [30, 60, 100, 200], rooms: false, floor: false, tg: ['parking'] },
};
export const TG_COL = { parking: 'has_parking', elevator: 'has_elevator', pool: 'has_pool', furnished: 'furnished' };

export const nm = (o, lang) => (o ? (lang === 'ar' && o.name_ar) || o.name_fr : '');
export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ');
