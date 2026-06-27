# Audit visuel des assets gameplay Arborisis

Ce document inventorie la premiere passe d'assets statiques IA branchee au jeu.
Source canonique: `@arborisis/shared` (`BUILDINGS`, `SHIPS`, `ITEMS`, `COMMANDERS`, `NPC_ENCOUNTER_CONFIGS`, `MOON_BUILDINGS`, `DEFENSES`).

Direction artistique: concept art organique sci-fi bioluminescent, format carre 1:1, sans texte dans l'image, lisible en miniature.
Source image: planches IA conservees dans `tools/ai-asset-sheets/`, decoupees par `tools/slice_ai_asset_sheets.py` vers `apps/web/public/images/game/`.

## buildings

| Priorite | Cle                     | Nom                      | Surface UI         | Asset                                               | Intention                                                                                                                                              |
| -------- | ----------------------- | ------------------------ | ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | `BIOMASS_SYNTHESIZER`   | Synthétiseur de Biomasse | /buildings, /codex | `/images/game/buildings/biomass-synthesizer.webp`   | Les Tisserands Primordiaux façonnaient la matière organique par la seule puissance de leur volonté mycélienne. Le Synthétiseur de Biomasse est ta p... |
| P0       | `SAP_WELL`              | Puits de Sève            | /buildings, /codex | `/images/game/buildings/sap-well.webp`              | La sève n'est pas un simple fluide : c'est le sang de la planète, chargé de mémoires minérales vieilles de milliards d'années. Avant la Grande Frag... |
| P0       | `MINERAL_VEIN`          | Veine Minérale           | /buildings, /codex | `/images/game/buildings/mineral-vein.webp`          | Sous chaque surface planétaire se cachent des matrices cristallines que les Tisserands utilisaient pour encoder leur savoir dans la roche elle-même... |
| P0       | `SPORANGE`              | Sporanges                | /buildings, /codex | `/images/game/buildings/sporange.webp`              | Les spores sont la langue des Tisserands. Avant la Fragmentation, chaque spore libérée portait un fragment de connaissance, voyageant entre les éto... |
| P0       | `PHOTOSYNTHETIC_CANOPY` | Canopée Photosynthétique | /buildings, /codex | `/images/game/buildings/photosynthetic-canopy.webp` | Les grands Tisserands déployaient des voûtes de tissu vivant au-dessus de mondes entiers, transformant chaque photon de lumière stellaire en énergi... |
| P0       | `STORAGE_VACUOLE`       | Vacuole de Stockage      | /buildings, /codex | `/images/game/buildings/storage-vacuole.webp`       | Les Tisserands ne stockaient pas les ressources : ils les absorbaient et les relâchaient au gré de leurs besoins, comme un cœur géant qui bat au ry... |
| P0       | `RESEARCH_NEXUS`        | Noyau de Recherche       | /buildings, /codex | `/images/game/buildings/research-nexus.webp`        | Le Noyau de Recherche n'est pas un laboratoire — c'est un nœud du Réseau Mycélien en train de se reconstituer. Ses filaments s'étendent sous la sur... |
| P0       | `SYMBIOTIC_CORE`        | Cœur Symbiotique         | /buildings, /codex | `/images/game/buildings/symbiotic-core.webp`        | Au cœur de chaque civilisation des Tisserands battait un organe central — un nœud symbiotique qui synchronisait tous les processus vitaux de la col... |
| P0       | `ORBITAL_NURSERY`       | Berceau Orbital          | /buildings, /codex | `/images/game/buildings/orbital-nursery.webp`       | Il y a douze mille ans, les Tisserands faisaient éclore des organismes interstellaires dans des crèches orbitales — des êtres vivants capables de t... |

## moon-buildings

| Priorite | Cle                | Nom               | Surface UI               | Asset                                               | Intention                                                                                      |
| -------- | ------------------ | ----------------- | ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P1       | `LUNAR_CORE`       | Noyau Lunaire     | Lunes organiques, /codex | `/images/game/moon-buildings/lunar-core.webp`       | Hub central de la lune organique. Requis pour tout autre bâtiment.                             |
| P1       | `SPORE_PHALANX`    | Phalange Sporale  | Lunes organiques, /codex | `/images/game/moon-buildings/spore-phalanx.webp`    | Réseau de détection qui révèle les flottes ennemies dans des systèmes voisins.                 |
| P1       | `BIO_JUMP_GATE`    | Bio-Porte de Saut | Lunes organiques, /codex | `/images/game/moon-buildings/bio-jump-gate.webp`    | Téléporte instantanément une flotte depuis cette lune vers une autre lune équipée d'une porte. |
| P1       | `LUNAR_NURSERY`    | Nid Lunaire       | Lunes organiques, /codex | `/images/game/moon-buildings/lunar-nursery.webp`    | Produit des vaisseaux depuis la sécurité de la lune.                                           |
| P1       | `CRYSTALLINE_SILO` | Silo Cristallin   | Lunes organiques, /codex | `/images/game/moon-buildings/crystalline-silo.webp` | Stockage souterrain lunaire, invisible aux espions.                                            |

## ships

| Priorite | Cle                      | Nom                     | Surface UI                | Asset                                            | Intention                                                                                                                                              |
| -------- | ------------------------ | ----------------------- | ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | `SPORAL_SCOUT`           | Éclaireur sporique      | /fleets, missions, /codex | `/images/game/ships/sporal-scout.webp`           | L'Éclaireur Sporique est le premier organisme interstellaire que tu fais éclore — agile, nerveux, brûlant d'une curiosité primitive. Ses filaments-... |
| P0       | `SYMBIOTIC_HARVESTER`    | Moissonneur symbiotique | /fleets, missions, /codex | `/images/game/ships/symbiotic-harvester.webp`    | Le Moissonneur Symbiotique est un colosse patient aux vastes chambres ventrales — un organisme conçu non pour la vitesse mais pour la capacité. Là...  |
| P0       | `MYCELIAL_TENDRIL`       | Filament Mycélial       | /fleets, missions, /codex | `/images/game/ships/mycelial-tendril.webp`       | Le Filament Mycélien est la renaissance du tout premier type d'organisme que les Tisserands envoyaient dans l'espace — une fibre vivante presque tr... |
| P0       | `CHITIN_FREIGHTER`       | Frégat de Chitine       | /fleets, missions, /codex | `/images/game/ships/chitin-freighter.webp`       | La Frégat de Chitine est une montagne vivante, blindée par des plaques de carapace que même les météorites peinent à égratigner. Les Tisserands con... |
| P0       | `BIOLUMINESCENT_CRUISER` | Croiseur Bioluminescent | /fleets, missions, /codex | `/images/game/ships/bioluminescent-cruiser.webp` | Le Croiseur Bioluminescent brille d'une lumière bleue-verte spectrale dans le vide de l'espace — non pas pour attirer les regards, mais parce que s... |
| P0       | `SPOROGENESIS_TITAN`     | Titan Sporogenèse       | /fleets, missions, /codex | `/images/game/ships/sporogenesis-titan.webp`     | Le Titan Sporogenèse est un dieu vivant — un organisme si vaste qu'il génère sa propre gravité, si ancien dans sa génétique qu'il porte en lui les...  |
| P0       | `SPORAL_DRONE`           | Drone sporique          | /fleets, missions, /codex | `/images/game/ships/sporal-drone.webp`           | Le Drone Sporique est l'unité de base de la guerre mycélienne : petit, nerveux, et toujours envoyé par nuées. Seul, il est fragile ; par milliers,...  |
| P0       | `ACID_BOMBER`            | Bombardier d'acide      | /fleets, missions, /codex | `/images/game/ships/acid-bomber.webp`            | Le Bombardier d'Acide porte en son ventre des glandes synthétisant des enzymes corrosifs capables de dissoudre les blindages les plus résistants. L... |
| P0       | `CHITIN_DESTROYER`       | Destroyer de chitine    | /fleets, missions, /codex | `/images/game/ships/chitin-destroyer.webp`       | Le Destroyer de Chitine est la ligne de front des flottes organiques — lourd, anguleux, couvert d'une carapace si épaisse qu'il semble taillé dans...  |
| P0       | `BIOMASS_DREADNOUGHT`    | Dreadnought de biomasse | /fleets, missions, /codex | `/images/game/ships/biomass-dreadnought.webp`    | Le Dreadnought de Biomasse est une abomination guerrière aussi grande qu'une petite lune. Sa seule présence près d'une planète déclenche des marées... |
| P0       | `SEED_POD`               | Capsule germinale       | /fleets, missions, /codex | `/images/game/ships/seed-pod.webp`               | La Capsule Germinale est un vaisseau-utérus conçu pour transporter des charges massives sur de longues distances. Elle ne combat pas ; elle porte....  |
| P0       | `SHADOW_SPORE`           | Spore de l'ombre        | /fleets, missions, /codex | `/images/game/ships/shadow-spore.webp`           | La Spore de l'Ombre est presque invisible aux capteurs conventionnels. Elle glisse dans l'espace comme un souvenir, photographie les défenses ennem... |
| P0       | `ORBITAL_THORN`          | Épine orbitale          | /fleets, missions, /codex | `/images/game/ships/orbital-thorn.webp`          | L'Épine Orbitale est une plateforme défensive stationnaire, enracinée dans le champ gravitationnel d'une planète. Elle ne bouge jamais, mais son te... |
| P0       | `SPORAL_SWARM`           | Essaim sporique         | /fleets, missions, /codex | `/images/game/ships/sporal-swarm.webp`           | L'Essaim Sporique est l'expression la plus pure de la puissance mycélienne : une nuée d'organismes semi-autonomes qui partagent une conscience uniq... |
| P0       | `LUMINOUS_WARDEN`        | Gardien lumineux        | /fleets, missions, /codex | `/images/game/ships/luminous-warden.webp`        | Le Gardien Lumineux est un vaisseau-photocyte qui convertit la lumière stellaire en boucliers protecteurs. Il ne frappe pas le premier, mais ses al... |
| P0       | `CHITIN_BULWARK`         | Rempart de chitine      | /fleets, missions, /codex | `/images/game/ships/chitin-bulwark.webp`         | Le Rempart de Chitine est un mur vivant propulsé dans l'espace. Sa carapace peut encaisser des salves entières sans ciller, et sa seule présence su... |
| P0       | `BIO_RECYCLER`           | Bio-recycleur           | /fleets, missions, /codex | `/images/game/ships/bio-recycler.webp`           | Le Bio-recycleur est une créature ingénieuse façonnée pour absorber les débris de guerre. Ses organes internes décomposent la chitine brisée et le...  |

## items

| Priorite | Cle                  | Nom                  | Surface UI                                          | Asset                                        | Intention                                                                                                    |
| -------- | -------------------- | -------------------- | --------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P0       | `MYCELIAL_FIBER`     | Fibre Mycéliale      | /inventory, /market, /crafting, /production, /codex | `/images/game/items/mycelial-fiber.webp`     | Filament organique récolté sur des parasites sporaux. Matière première polyvalente.                          |
| P0       | `BIOLUMINESCENT_GEL` | Gel Bioluminescent   | /inventory, /market, /crafting, /production, /codex | `/images/game/items/bioluminescent-gel.webp` | Substance visqueuse extraite de créatures luminescentes. Propriétés caustiques.                              |
| P0       | `CHITIN_SHARD`       | Éclat de Chitine     | /inventory, /market, /crafting, /production, /codex | `/images/game/items/chitin-shard.webp`       | Fragment d'exosquelette de gardien cristallin. Matériau résistant utilisé en armurerie.                      |
| P0       | `SPORE_ESSENCE`      | Essence Sporale      | /inventory, /market, /crafting, /production, /codex | `/images/game/items/spore-essence.webp`      | Concentré de spores primordiales récupéré lors d'expéditions. Rare et précieux.                              |
| P0       | `VOID_CRYSTAL`       | Cristal du Vide      | /inventory, /market, /crafting, /production, /codex | `/images/game/items/void-crystal.webp`       | Cristal né dans les failles interdimensionnelles. Extrêmement rare, propriétés énergétiques exceptionnelles. |
| P0       | `ANCIENT_FRAGMENT`   | Fragment Ancien      | /inventory, /market, /crafting, /production, /codex | `/images/game/items/ancient-fragment.webp`   | Débris d'une civilisation disparue. Seule la Sentinelle Ancienne en possède encore.                          |
| P0       | `REINFORCED_CHITIN`  | Chitine Renforcée    | /inventory, /market, /crafting, /production, /codex | `/images/game/items/reinforced-chitin.webp`  | Plaques d'exosquelette traitées et consolidées. Utilisée pour les blindages avancés.                         |
| P0       | `CRYSTALLIZED_SAP`   | Sève Cristallisée    | /inventory, /market, /crafting, /production, /codex | `/images/game/items/crystallized-sap.webp`   | Sève solidifiée par un cristal du vide. Conducteur énergétique de haute performance.                         |
| P0       | `NEURAL_MATRIX`      | Matrice Neurale      | /inventory, /market, /crafting, /production, /codex | `/images/game/items/neural-matrix.webp`      | Réseau mycélial amplifié par des spores. Accélère les processus cognitifs organiques.                        |
| P0       | `VOID_ALLOY`         | Alliage du Vide      | /inventory, /market, /crafting, /production, /codex | `/images/game/items/void-alloy.webp`         | Fusion de cristaux du vide et de minéraux purs. Le matériau le plus résistant connu.                         |
| P0       | `MYCOTOXIN_VIAL`     | Fiole de Mycotoxine  | /inventory, /market, /crafting, /production, /codex | `/images/game/items/mycotoxin-vial.webp`     | Concentration de toxines bioluminescentes. Arme chimique d'usage militaire.                                  |
| P0       | `CONVERGENCE_SHARD`  | Éclat de Convergence | /inventory, /market, /crafting, /production, /codex | `/images/game/items/convergence-shard.webp`  | Artefact ultime forgé à partir de fragments anciens. Symbole de maîtrise absolue.                            |

## commanders

| Priorite | Cle                | Nom                      | Surface UI  | Asset                                           | Intention                                                                                          |
| -------- | ------------------ | ------------------------ | ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P0       | `MYCO_WARLORD`     | Seigneur Mycélien        | /commanders | `/images/game/commanders/myco-warlord.webp`     | Un général fongique issu des sous-bois de la Convergence. Sa horde est implacable.                 |
| P0       | `CHITIN_GUARDIAN`  | Gardien Chitinide        | /commanders | `/images/game/commanders/chitin-guardian.webp`  | Colosse défensif dont l'armure chitineuse a résisté à mille batailles.                             |
| P0       | `VOID_REAPER`      | Faucheur du Vide         | /commanders | `/images/game/commanders/void-reaper.webp`      | Chasseur solitaire qui frappe depuis les failles du Vide avec une précision mortelle.              |
| P0       | `SPORE_STORM`      | Tempête Sporale          | /commanders | `/images/game/commanders/spore-storm.webp`      | Commandant de flotte spécialisé dans les raids éclair et les retraites stratégiques.               |
| P0       | `SYMBIONT_SAGE`    | Sage Symbiotique         | /commanders | `/images/game/commanders/symbiont-sage.webp`    | Érudit millénaire dont la mémoire encode toutes les connaissances des Tisserands.                  |
| P0       | `ROOT_WEAVER`      | Tisseuse de Racines      | /commanders | `/images/game/commanders/root-weaver.webp`      | Génie agricole qui tisse les racines planétaires pour maximiser les récoltes.                      |
| P0       | `FUNGAL_MERCHANT`  | Marchand Fongique        | /commanders | `/images/game/commanders/fungal-merchant.webp`  | Commerçant légendaire dont les routes commerciales s'étendent aux confins de la galaxie.           |
| P0       | `CANOPY_ARCHITECT` | Architecte de la Canopée | /commanders | `/images/game/commanders/canopy-architect.webp` | Maître bâtisseur qui ériger des structures vivantes en un temps record.                            |
| P0       | `VOID_NAVIGATOR`   | Navigatrice du Vide      | /commanders | `/images/game/commanders/void-navigator.webp`   | Exploratrice qui a cartographié des centaines de systèmes inexplorés.                              |
| P0       | `SPORE_ORACLE`     | Oracle Sporique          | /commanders | `/images/game/commanders/spore-oracle.webp`     | Maître de l'espionnage dont les spores invisibles infiltrent les empires ennemis.                  |
| P0       | `HIVE_HERALD`      | Héraut de la Ruche       | /commanders | `/images/game/commanders/hive-herald.webp`      | Diplomate et stratège d'alliance dont la présence galvanise chaque membre.                         |
| P0       | `ANCIENT_SYMBIONT` | Symbionte Ancien         | /commanders | `/images/game/commanders/ancient-symbiont.webp` | Entité primordiale survivante de la Convergence originelle. Ses pouvoirs défient la compréhension. |

## npc

| Priorite | Cle                    | Nom                 | Surface UI           | Asset                                        | Intention                                                                           |
| -------- | ---------------------- | ------------------- | -------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| P0       | `VOID_RIFT`            | Fissure du Vide     | /pve, combat reports | `/images/game/npc/void-rift.webp`            | Une déchirure dans le tissu galactique. En émerge quelque chose de sombre.          |
| P0       | `MYCOXIN_NEST`         | Nid de Mycoxine     | /pve, combat reports | `/images/game/npc/mycoxin-nest.webp`         | Une colonie de champignons toxiques qui empoisonne l'espace local.                  |
| P0       | `ABANDONED_DERELICT`   | Épave Abandonnée    | /pve, combat reports | `/images/game/npc/abandoned-derelict.webp`   | Vaisseau-monde défunt, réanimé par une IA corrompue.                                |
| P0       | `FUNGAL_HIVEMIND`      | Essaim Fongique     | /pve, combat reports | `/images/game/npc/fungal-hivemind.webp`      | Une intelligence collective mycéliale hostile à toute civilisation organique.       |
| P0       | `VOID_LEVIATHAN`       | Léviathan du Vide   | /pve, combat reports | `/images/game/npc/void-leviathan.webp`       | Titan organique d'une dimension inconnue. Évitez si possible.                       |
| P0       | `CRYSTALLINE_GUARDIAN` | Gardien Cristallin  | /pve, combat reports | `/images/game/npc/crystalline-guardian.webp` | Entité minérale ancienne protégeant un gisement de ressources rares.                |
| P0       | `BIOMASS_CORRUPTED`    | Biomasse Corrompue  | /pve, combat reports | `/images/game/npc/biomass-corrupted.webp`    | Amas de matière organique corrompue par le Vide.                                    |
| P0       | `ANCIENT_SENTINEL`     | Sentinelle Ancienne | /pve, combat reports | `/images/game/npc/ancient-sentinel.webp`     | Gardien ultime de la Convergence. Seules les armadas les plus puissantes survivent. |
| P0       | `CHITIN_WARLORD`       | Seigneur de Chitine | /pve, combat reports | `/images/game/npc/chitin-warlord.webp`       | Un colosse chitineux évolué qui étend son territoire.                               |
| P0       | `SPORAL_PARASITE`      | Parasite Sporal     | /pve, combat reports | `/images/game/npc/sporal-parasite.webp`      | Un parasite fongique de faible envergure qui infeste les routes commerciales.       |
| P0       | `MYCOSPORE_SWARM`      | Nuée Mycosporale    | /pve, combat reports | `/images/game/npc/mycospore-swarm.webp`      | Des milliards de spores mortelles organisées en essaim prédateur.                   |

## defenses

| Priorite | Cle                 | Nom                    | Surface UI                | Asset                                          | Intention                                                                            |
| -------- | ------------------- | ---------------------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| P0       | `ION_CANNON`        | Canon Ionique          | /defenses, combat reports | `/images/game/defenses/ion-cannon.webp`        | Structure défensive polyvalente qui tire des salves d'ions chargés.                  |
| P0       | `SPORE_NET`         | Filet Sporale          | /defenses, combat reports | `/images/game/defenses/spore-net.webp`         | Nuage de spores collantes qui ralentit les flottes d'assaut et les endommage.        |
| P0       | `SHIELD_MEMBRANE`   | Membrane Bouclier      | /defenses, combat reports | `/images/game/defenses/shield-membrane.webp`   | Membrane organique semi-perméable qui absorbe les 10 premiers % de dégâts.           |
| P0       | `MYCELIAL_TURRET`   | Tourelle Mycélienne    | /defenses, combat reports | `/images/game/defenses/mycelial-turret.webp`   | Tourelle organique à haute cadence de tir, idéale contre les petits vaisseaux.       |
| P0       | `VOID_LANCE`        | Lance du Vide          | /defenses, combat reports | `/images/game/defenses/void-lance.webp`        | Arme anti-capitaux qui perce les blindages lourds avec un rayon de Vide focalisé.    |
| P0       | `ORBITAL_THORN_BED` | Lit d'Épines Orbitales | /defenses, combat reports | `/images/game/defenses/orbital-thorn-bed.webp` | Champ d'épines cristallines qui inflige des dégâts à toute flotte passant en orbite. |

## Verification

- Chaque cle de la passe prioritaire a un fichier `.webp` attendu sous `apps/web/public/images/game/`.
- Le composant `GameAssetImage` conserve un fallback iconique si une image est absente ou invalide.
- Les assets restent cote web uniquement et ne modifient aucune logique de gameplay serveur.
