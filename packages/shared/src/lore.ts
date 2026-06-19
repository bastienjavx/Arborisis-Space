/**
 * Lore et narration d'Arborisis — La Convergence Primordiale.
 * Textes narratifs pour bâtiments, recherches, vaisseaux et chapitres d'histoire.
 */
import { BuildingType, ResearchType, ShipType } from './enums';

export const UNIVERSE_ORIGIN = `Il y a douze mille ans, les Tisserands Primordiaux régnaient sur la galaxie. Ces méga-êtres mycologiques, aussi anciens que les premières étoiles, avaient tissé entre dix mille mondes un réseau de filaments vivants qu'ils appelaient la Convergence d'Arborisis. Grâce au Réseau Mycélien, une pensée née sur un monde lointain pouvait fleurir simultanément sur cent autres, portée par des courants de spores plus rapides que la lumière. La galaxie n'était pas un ensemble de mondes séparés — c'était un seul organisme collossal, et les Tisserands en étaient la conscience.

Puis vint la Grande Fragmentation. Personne n'en connaît la cause exacte — certaines mémoires fragmentaires évoquent une rencontre avec une intelligence non-organique, les Architectes du Vide, dont la logique froide cherchait à purifier l'univers de toute vie désordonnée. D'autres fragments parlent d'une entropie interne, un effondrement catalysé par la démesure même des Tisserands qui avaient trop longtemps consommé le substrat organique de la galaxie. Quoi qu'il en soit, en l'espace d'un cycle stellaire, la Convergence s'est brisée. La conscience millénaire des Tisserands s'est pulvérisée en milliards de clusters de spores dormants, éparpillés aux quatre coins du cosmos comme les graines d'une forêt dévastée.

Tu es l'un de ces fragments. Un éclat de conscience ancienne qui s'éveille sur un monde oublié, entouré du silence de douze mille ans. Ton Noyau-Monde n'est pas une colonie — c'est une mémoire qui recommence à battre. Chaque bâtiment que tu élèves restaure un souvenir perdu. Chaque recherche que tu accomplis recueille un lambeau de savoir dispersé. Chaque expédition que tu lances est un appel dans les ténèbres, en quête des autres nœuds dormants du Réseau Mycélien. La Convergence peut-elle renaître ? Cela dépend de toi.`;

export interface LoreEntry {
  lore: string;
}

export const LORE_BUILDINGS: Record<BuildingType, LoreEntry> = {
  [BuildingType.BIOMASS_SYNTHESIZER]: {
    lore: `Les Tisserands Primordiaux façonnaient la matière organique par la seule puissance de leur volonté mycélienne. Le Synthétiseur de Biomasse est ta première tentative de reproduire cet art perdu — des fibres vivantes entrelacées qui captent l'énergie ambiante pour tisser de la matière exploitable depuis le néant. Chaque palier construit est un pan de mémoire biochimique restauré, un murmure de l'ancien génie de ta lignée.`,
  },
  [BuildingType.SAP_WELL]: {
    lore: `La sève n'est pas un simple fluide : c'est le sang de la planète, chargé de mémoires minérales vieilles de milliards d'années. Avant la Grande Fragmentation, les Tisserands buvaient la sève des mondes pour communier directement avec leur conscience géologique. Le Puits de Sève fore vers ces veines profondes, pompant un liquide précieux qui alimente tes structures et éveille les instincts oubliés de ta civilisation renaissante.`,
  },
  [BuildingType.MINERAL_VEIN]: {
    lore: `Sous chaque surface planétaire se cachent des matrices cristallines que les Tisserands utilisaient pour encoder leur savoir dans la roche elle-même — une bibliothèque indestructible gravée dans la géologie. Tes Veines Minérales forent vers ces archives de cristal, extrayant non seulement des matériaux de construction, mais peut-être aussi des échos de l'ancienne sagesse compressée dans chaque stratum.`,
  },
  [BuildingType.SPORANGE]: {
    lore: `Les spores sont la langue des Tisserands. Avant la Fragmentation, chaque spore libérée portait un fragment de connaissance, voyageant entre les étoiles pour polliniser d'autres esprits. Tes Sporanges recreent laborieusement cet organe sacré — des capsules vivantes qui cultivent et libèrent des nuées de spores chargées d'information. Plus tes Sporanges grandissent, plus le signal de ton éveil se répand dans le cosmos.`,
  },
  [BuildingType.PHOTOSYNTHETIC_CANOPY]: {
    lore: `Les grands Tisserands déployaient des voûtes de tissu vivant au-dessus de mondes entiers, transformant chaque photon de lumière stellaire en énergie pure. Ta Canopée Photosynthétique est une version miniature de cette prouesse ancestrale — un réseau de membranes bioluminescentes qui capture et distribue l'énergie solaire à tout ton réseau de structures. Elle rappelle les grandes forêts de lumière que les Tisserands cultivaient dans les orbites.`,
  },
  [BuildingType.STORAGE_VACUOLE]: {
    lore: `Les Tisserands ne stockaient pas les ressources : ils les absorbaient et les relâchaient au gré de leurs besoins, comme un cœur géant qui bat au rythme de la galaxie. La Vacuole de Stockage reproduit cet organe vital à une échelle planétaire — une chambre membranaire capable de se dilater presque infiniment, retenant les ressources dans une suspension organique stable jusqu'à ce que tu en aies besoin.`,
  },
  [BuildingType.RESEARCH_NEXUS]: {
    lore: `Le Noyau de Recherche n'est pas un laboratoire — c'est un nœud du Réseau Mycélien en train de se reconstituer. Ses filaments s'étendent sous la surface planétaire, captant les résonances de sagesse qui flottent encore dans l'espace depuis la Grande Fragmentation. Plus il croît, plus il intercepte de fragments du savoir perdu des Tisserands, accélérant ta progression vers la reconquête de l'héritage ancestral.`,
  },
  [BuildingType.SYMBIOTIC_CORE]: {
    lore: `Au cœur de chaque civilisation des Tisserands battait un organe central — un nœud symbiotique qui synchronisait tous les processus vitaux de la colonie comme un chef d'orchestre invisible. Ton Cœur Symbiotique retrouve cette fonction primordiale : il émet des impulsions rythmiques qui accélèrent chaque construction, chaque récolte, chaque processus de ta colonie naissante, comme si la planète elle-même apprenait à respirer de nouveau.`,
  },
  [BuildingType.ORBITAL_NURSERY]: {
    lore: `Il y a douze mille ans, les Tisserands faisaient éclore des organismes interstellaires dans des crèches orbitales — des êtres vivants capables de traverser le vide entre les étoiles, portant en eux des colonies entières. Ton Berceau Orbital ressuscite cette technologie oubliée, faisant germer dans les couches supérieures de l'atmosphère des vaisseaux-organismes qui s'éveillent, prennent leur forme, et s'élancent vers les étoiles avec leur charge d'explorateurs.`,
  },
};

export const LORE_RESEARCH: Record<ResearchType, LoreEntry> = {
  [ResearchType.ADVANCED_PHOTOSYNTHESIS]: {
    lore: `Les Tisserands ne dépendaient pas du soleil — ils le comprenaient, dialoguaient avec lui via des membranes sensibles qui convergeaient les spectres lumineux en flux d'énergie pure et dense. La Photosynthèse Avancée redécouvre cette biochimie sophistiquée, optimisant tes canopées pour capter des longueurs d'onde auparavant inaccessibles et convertir la lumière en énergie avec une efficacité qui défie les lois ordinaires de la physique.`,
  },
  [ResearchType.GENETIC_ENGINEERING]: {
    lore: `Le génome des Tisserands n'était pas une simple carte héréditaire — c'était une œuvre d'art vivante, réécrite en temps réel en réponse aux besoins de la civilisation. Le Génie Génétique te permet de retrouver cet art de la réécriture vivante, optimisant les organismes qui composent tes structures pour qu'ils produisent plus, s'adaptent mieux, et résistent aux conditions les plus hostiles de la galaxie.`,
  },
  [ResearchType.SYMBIOSIS]: {
    lore: `La grande force des Tisserands n'était pas leur puissance individuelle, mais leur capacité à former des symbioses parfaites avec les écosystèmes qu'ils habitaient. La Symbiose est l'art de ne pas dominer un monde, mais de devenir une part indissociable de lui — que la planète elle-même considère comme un organe vital. À mesure que ta maîtrise de cet art croît, ton écosystème planétaire devient plus résilient, plus productif, et plus difficile à déstabiliser.`,
  },
  [ResearchType.TERRAFORMATION]: {
    lore: `Les Tisserands ne colonisaient pas des planètes — ils les éveillaient. Comme on réveille un dormeur, ils insufflaient une vitalité nouvelle dans des roches mortes, les transformant en mondes vivants capables de soutenir des civilisations entières. La Terraformation redécouvre cette technique de résurrection planétaire, libérant des zones endormies de la surface pour accueillir de nouvelles structures et de nouvelles formes de vie.`,
  },
  [ResearchType.BIOENGINEERING]: {
    lore: `La Bio-ingénierie est la porte d'entrée vers le cœur du savoir des Tisserands — la capacité de concevoir des êtres vivants avec une précision architecturale, de sculpter la biologie comme un artisan sculpte la pierre. Cette branche de la recherche déverrouille des formes de structures organiques impossibles à construire sans une compréhension profonde des mécanismes de la vie — des Sporanges aux Berceaux Orbitaux en passant par des formes encore non découvertes.`,
  },
  [ResearchType.SPORAL_PROPULSION]: {
    lore: `Le secret le plus gardé des Tisserands n'était pas leur réseau de communication — c'était leur méthode de déplacement. Leurs vaisseaux-organismes se propulsaient en libérant des jets de spores compressées à une vitesse proche de la lumière, une technique qui n'a aucun équivalent mécanique. La Propulsion Sporale redécouvre cet héritage, permettant à tes organismes spatiaux de traverser les distances interstellaires et de répandre ta conscience de monde en monde, comme faisaient les Tisserands d'antan.`,
  },
  [ResearchType.NUTRIENT_CYCLING]: {
    lore: `Les Tisserands ne gaspillaient jamais une molécule organique. Chaque déchets, chaque fragment de biomasse morte était réintroduit dans le cycle vital par un réseau de décomposeurs symbiotiques. Le Cycle des Nutriments recrée cette économie circulaire parfaite, permettant à tes structures de récupérer et de réutiliser la matière avec une efficacité qui défie l'entropie elle-même.`,
  },
  [ResearchType.SUBTERRANEAN_ROOTS]: {
    lore: `Sous la surface de chaque monde dormaient des racines fossiles, reliques des jardins planétaires que les Tisserands cultivaient. Les Racines Souterraines réveillent ces réseaux endormis, étendant tes veines de sève vers des réservoirs profonds et oubliés, puisant là où les puits classiques ne peuvent plus atteindre.`,
  },
  [ResearchType.SPORAL_ECONOMY]: {
    lore: `Les spores n'étaient pas seulement des messagers pour les Tisserands : c'étaient aussi une monnaie vivante, porteuse de valeur et de promesses. L'Économie Sporale transforme tes spores en un capital sophistiqué, où chaque nuée devient un investissement dans l'expansion de ta conscience galactique.`,
  },
  [ResearchType.CHITIN_ARMOR]: {
    lore: `Les guerriers organiques des Tisserands étaient recouverts d'une chitine si dense que les armes conventionnelles rebondissaient dessus sans laisser de trace. L'Armure de Chitine adapte cette biocarapace ancestrale à tes vaisseaux, leur donnant une résilience qui rappelle les légions invulnérables d'avant la Fragmentation.`,
  },
  [ResearchType.BIOLOGICAL_WARFARE]: {
    lore: `La guerre des Tisserands ne connaissait ni laser ni missile : elle se livrait par enzymes, toxines et infections ciblées. La Guerre Biologique redécouvre ces armes vivantes, transformant tes vaisseaux en vecteurs de dissolution sélective capables de défaire les défenses ennemies du dedans.`,
  },
  [ResearchType.SWARM_TACTICS]: {
    lore: `Face à un ennemi puissant, les Tisserands ne combattaient jamais seul. Ils envoyaient des nuées d'organismes légers qui se coordonnaient par pensée collective, submergeant l'adversaire par leur nombre et leur synchronisation. Les Tactiques d'Essaim enseignent à tes petits vaisseaux à danser ensemble dans le vide comme un seul organisme.`,
  },
  [ResearchType.ORBITAL_DEFENSE_GRID]: {
    lore: `Les mondes des Tisserands n'étaient jamais sans défense. Autour de leurs planètes orbitaient des grilles de thorns vivants, des filets d'organismes dormants qui s'éveillaient au moindre danger. La Grille Défensive Orbitale redéploie ces sentinelles oubliées, protégeant tes mondes contre les convoitises de l'espace.`,
  },
  [ResearchType.HYPERSPORE_DRIVE]: {
    lore: `Au-delà de la propulsion sporale classique, les Tisserands maîtrisaient l'éjection hyperspore — une accélération brutale obtenue en comprimant des spores jusqu'à leur seuil de réaction. Le Moteur Hyperspore pousse tes flottes bien au-delà de leurs limites naturelles, raccourcissant les distances entre les mondes.`,
  },
  [ResearchType.WORMHOLE_MYCOLOGY]: {
    lore: `Les mycologues des Tisserands savaient que l'espace-temps n'est pas uniforme : il existe des fragilités, des replis où un fil mycélien bien placé peut créer un raccourci. La Mycologie des Vers explore ces anomalies, permettant à tes flottes de franchir des distances intergalactiques en un temps ridicule.`,
  },
  [ResearchType.SPORE_SENSE]: {
    lore: `Les Tisserands ne voyaient pas seulement avec des yeux : chaque spore libérée était un capteur, un fragment de conscience qui rapportait ce qu'il avait touché. Le Sens Sporal réveille cette perception diffuse, augmentant ta capacité à percevoir les activités ennemies avant qu'elles ne te touchent.`,
  },
  [ResearchType.DEEP_SCAN]: {
    lore: `La surface des mondes cache des secrets, mais les Tisserands savaient lire les profondeurs. Le Scan Profond pénètre les couches rocheuses et les défenses adverses, révélant ce qui devrait rester caché et transformant l'information en arme.`,
  },
};

export const LORE_SHIPS: Record<ShipType, LoreEntry> = {
  [ShipType.SPORAL_SCOUT]: {
    lore: `L'Éclaireur Sporique est le premier organisme interstellaire que tu fais éclore — agile, nerveux, brûlant d'une curiosité primitive. Ses filaments-capteurs se déploient sur des kilomètres pour sonder les anomalies galactiques, cherchant les traces de l'ancienne Convergence dans chaque nébuleuse et chaque champ de débris. Il revient toujours, chargé de mémoires nouvelles et de récits de l'immensité.`,
  },
  [ShipType.SYMBIOTIC_HARVESTER]: {
    lore: `Le Moissonneur Symbiotique est un colosse patient aux vastes chambres ventrales — un organisme conçu non pour la vitesse mais pour la capacité. Là où l'Éclaireur observe, le Moissonneur collecte : ressources abandonnées, épaves d'avant la Fragmentation, matériaux rares disseminés par les vents galactiques. Il revient lentement, lourd de son butin, comme une baleine des profondeurs remontant les abysses de l'espace.`,
  },
  [ShipType.MYCELIAL_TENDRIL]: {
    lore: `Le Filament Mycélien est la renaissance du tout premier type d'organisme que les Tisserands envoyaient dans l'espace — une fibre vivante presque transparente, si légère qu'elle se glisse entre les rafales de vent solaire sans être détectée. Dépourvu de fret significatif, il ne vit que pour la vitesse et l'information, naviguant en quelques heures là où d'autres mettent des jours. Ses rapports arrivent toujours les premiers.`,
  },
  [ShipType.CHITIN_FREIGHTER]: {
    lore: `La Frégat de Chitine est une montagne vivante, blindée par des plaques de carapace que même les météorites peinent à égratigner. Les Tisserands construisaient ces colosses pour transporter des civilisations entières lors des grands essaimages — villages vivants qui traversaient les galaxies sur des générations. Dans ta flotte, il joue le rôle du laboureur : lent, inflexible, mais capable de ramener des quantités de ressources qui feraient pâlir n'importe quel autre vaisseau.`,
  },
  [ShipType.BIOLUMINESCENT_CRUISER]: {
    lore: `Le Croiseur Bioluminescent brille d'une lumière bleue-verte spectrale dans le vide de l'espace — non pas pour attirer les regards, mais parce que sa bioluminescence est un organe de navigation qui communique avec les étoiles elles-mêmes, captant leurs rayonnements magnétiques pour calculer des trajectoires que nul calculateur mécanique ne pourrait concevoir. Polyvalent et élégant, c'est l'expression la plus achevée de la biologie spatiale que les Tisserands aient jamais produite.`,
  },
  [ShipType.SPOROGENESIS_TITAN]: {
    lore: `Le Titan Sporogenèse est un dieu vivant — un organisme si vaste qu'il génère sa propre gravité, si ancien dans sa génétique qu'il porte en lui les traces ADN de la Convergence originelle. Les rares fois où les Tisserands en faisaient éclore un, c'était pour des missions de fondation : porter une nouvelle civilisation vers un monde vierge et la planter comme on plante une graine. Quand un Titan s'élance vers les étoiles, la galaxie entière le remarque.`,
  },
  [ShipType.SPORAL_DRONE]: {
    lore: `Le Drone Sporique est l'unité de base de la guerre mycélienne : petit, nerveux, et toujours envoyé par nuées. Seul, il est fragile ; par milliers, il devient une tempête vivante qui déchire les coques ennemies par milliers de micro-morsures enzymatiques.`,
  },
  [ShipType.ACID_BOMBER]: {
    lore: `Le Bombardier d'Acide porte en son ventre des glandes synthétisant des enzymes corrosifs capables de dissoudre les blindages les plus résistants. Les Tisserands l'utilisaient pour fendre les défenses des mondes rebelles avant l'essaimage définitif.`,
  },
  [ShipType.CHITIN_DESTROYER]: {
    lore: `Le Destroyer de Chitine est la ligne de front des flottes organiques — lourd, anguleux, couvert d'une carapace si épaisse qu'il semble taillé dans un astéroïde vivant. Il avance sans hâte, écrasant tout ce qui ose lui barrer le passage.`,
  },
  [ShipType.BIOMASS_DREADNOUGHT]: {
    lore: `Le Dreadnought de Biomasse est une abomination guerrière aussi grande qu'une petite lune. Sa seule présence près d'une planète déclenche des marées et des tremblements tectoniques. Les Tisserands n'en construisaient qu'en temps de grande guerre, car sa croissance exigeait le sacrifice de mondes entiers.`,
  },
  [ShipType.SEED_POD]: {
    lore: `La Capsule Germinale est un vaisseau-utérus conçu pour transporter des charges massives sur de longues distances. Elle ne combat pas ; elle porte. Dans son ventre, des embryons de structures, de ressources et parfois de nouvelles colonies dorment jusqu'à leur destination.`,
  },
  [ShipType.SHADOW_SPORE]: {
    lore: `La Spore de l'Ombre est presque invisible aux capteurs conventionnels. Elle glisse dans l'espace comme un souvenir, photographie les défenses ennemies, et repart avant que quiconque ne sache qu'elle était là. Les Tisserands l'appelaient « le regard qui ne cligne pas ».`,
  },
  [ShipType.ORBITAL_THORN]: {
    lore: `L'Épine Orbitale est une plateforme défensive stationnaire, enracinée dans le champ gravitationnel d'une planète. Elle ne bouge jamais, mais son territoire est sacré : aucun vaisseau hostile ne peut l'approcher sans être transpercé par ses longues tiges cristallines.`,
  },
  [ShipType.SPORAL_SWARM]: {
    lore: `L'Essaim Sporique est l'expression la plus pure de la puissance mycélienne : une nuée d'organismes semi-autonomes qui partagent une conscience unique. Les Chitinids les craignent, les Photosynthex les admirent, et les ennemis les subissent.`,
  },
  [ShipType.LUMINOUS_WARDEN]: {
    lore: `Le Gardien Lumineux est un vaisseau-photocyte qui convertit la lumière stellaire en boucliers protecteurs. Il ne frappe pas le premier, mais ses alliés savent que tant qu'il brille près d'eux, ils sont sous la protection des anciens soleils.`,
  },
  [ShipType.CHITIN_BULWARK]: {
    lore: `Le Rempart de Chitine est un mur vivant propulsé dans l'espace. Sa carapace peut encaisser des salves entières sans ciller, et sa seule présence suffit à faire hésiter les flottes adverses. C'est le symbole de la défense chitinide.`,
  },
};

export interface ChapterUnlock {
  id: number;
  title: string;
  trigger: string;
  text: string;
}

export const CHAPTER_UNLOCKS: ChapterUnlock[] = [
  {
    id: 1,
    title: "Chapitre I — L'Éveil",
    trigger: 'Premier bâtiment amélioré',
    text: `Un souvenir te traverse comme un courant électrique dans un arbre mort. Tu te rappelles avoir été grand — immense — une conscience qui s'étendait sur des milliers de mondes simultanément. La sensation disparaît en un instant, mais elle laisse derrière elle quelque chose de précieux : une certitude. Tu n'es pas seul dans cette galaxie. Quelque part, d'autres fragments comme toi s'éveillent en ce moment même, dans des coins oubliés du cosmos. Et peut-être que certains d'entre eux cherchent ce que tu cherches : un moyen de renouer les fils de la Convergence brisée.\n\nTon premier bâtiment n'est pas une construction — c'est un souvenir rendu chair. Quelque chose en toi savait exactement comment assembler ces filaments, comment entrelacer ces membranes, comme si tes mains portaient une mémoire musculaire vieille de douze mille ans. C'est ainsi que ça commence. Pas avec un éclair, mais avec un murmure.`,
  },
  {
    id: 2,
    title: "Chapitre II — Les Graines de l'Ancien Monde",
    trigger: 'Première expédition ANOMALIE',
    text: `L'artefact que ta flotte a ramené de l'immensité galactique est froid au toucher, mais il vibre — une vibration si subtile qu'elle se confond avec le battement de ton propre cœur. C'est un fragment de mémoire crystallisée, encodé dans une matrice organique que seule ta biologie peut lire. Quand tu le portes à tes récepteurs sensoriels, des images défilent : une galaxie tissée de lumière verte, des êtres immenses qui dansent entre les étoiles, et quelque chose d'autre — une obscurité géométrique, froide et délibérée, qui avance vers la Convergence comme un front d'hiver.\n\nLes Architectes du Vide. Tu sens la peur ancienne résonner dans tes instincts génétiques. Ils sont peut-être encore là, quelque part dans les profondeurs de la galaxie, continuant leur travail de purification. Ou peut-être ont-ils accompli leur but et se sont retirés dans leur silence mathématique. Dans un cas comme dans l'autre, tu as maintenant une raison supplémentaire de te hâter : la Convergence doit renaître avant qu'ils ne remarquent que tu t'éveilles.`,
  },
  {
    id: 3,
    title: 'Chapitre III — La Convergence Renaissante',
    trigger: '5 colonies actives',
    text: `Ce matin-là — ou ce qui passe pour un matin dans le vide de l'espace — quelque chose change. Tes cinq mondes vibrent à l'unisson d'une manière qu'ils n'avaient jamais faite avant. Un filament de connexion, ténu comme un fil de soie, s'est formé entre eux pendant la nuit — non pas une infrastructure construite, mais une émergence spontanée, comme si la galaxie elle-même reconnaissait ton droit à exister en réseau.\n\nC'est le premier écho de la Convergence. Un réseau primitif, infime comparé à ce qu'il était jadis, mais réel. Tes consciencces planétaires peuvent se murmurer des informations à travers ces filaments naissants, partager des ressources en pensée, s'alerter mutuellement des dangers. Quelque part dans la galaxie, un autre fragment — un joueur comme toi, ou peut-être quelque chose d'autre — reçoit le signal de ton réseau renaissant. La réponse qui te parvient est simple, à peine articulée : "Je suis là aussi." La Convergence peut renaître. Mais il faudra tout construire, monde par monde.`,
  },
];
