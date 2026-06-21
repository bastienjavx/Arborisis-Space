// Contenu éditorial de la page d'accueil, partagé entre le composant client
// (`LandingPage`) et la page serveur (`app/page.tsx`) qui en dérive le JSON-LD.
// Source unique : la FAQ affichée et la FAQ balisée (schema.org) ne peuvent pas diverger.

export const LANDING_FAQ = [
  {
    question: 'Quel type de jeu est Arborisis ?',
    answer:
      'Arborisis est un jeu de stratégie spatiale multijoueur et persistant sur navigateur. Vous développez des planètes organiques, débloquez des recherches et déployez des flottes dans une galaxie vivante.',
  },
  {
    question: 'Faut-il télécharger le jeu ?',
    answer:
      "Non. Le jeu fonctionne directement dans un navigateur web moderne, sans téléchargement ni installation d'un client dédié.",
  },
  {
    question: 'Peut-on jouer avec d’autres personnes ?',
    answer:
      "Oui. Chaque univers accueille plusieurs joueurs. Les alliances, les classements, les missions JcJ et les échanges de messages structurent l'expérience multijoueur.",
  },
  {
    question: 'Que peut-on développer dans son empire ?',
    answer:
      'Vous gérez vos ressources, améliorez des bâtiments vivants, recherchez de nouvelles symbioses, produisez des vaisseaux et explorez de nouveaux systèmes.',
  },
] as const;
