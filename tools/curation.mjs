/**
 * Sélection des lieux retenus pour le globe.
 *
 * Règle d'inclusion, dans cet ordre :
 *   crew      — l'équipage au Chapeau de Paille y a posé le pied
 *   story     — jamais visité, mais l'histoire y bascule
 *   character — repaire ou berceau d'un personnage majeur
 *
 * Écartés : les îlots traversés en une case, les royaumes cités sans être
 * montrés, les bases de la Marine numérotées, les lieux exclusifs à l'anime.
 *
 * `src`  : nom exact dans data/positions.json (null = position à fournir ici)
 * `wiki` : titre de la page sur fr.onepiece.fandom.com
 * `saga` : regroupement d'affichage
 * `step` : rang dans le voyage de l'équipage (null si jamais visité)
 */

export const SAGAS = [
  { id: "east-blue", label: "East Blue", color: "#4aa3df" },
  { id: "alabasta", label: "Alabasta", color: "#e0a458" },
  { id: "skypiea", label: "Skypiea", color: "#7ec8e3" },
  { id: "water-seven", label: "Water Seven", color: "#5b92e5" },
  { id: "thriller-bark", label: "Thriller Bark", color: "#8e7cc3" },
  { id: "summit-war", label: "Guerre au Sommet", color: "#d95f5f" },
  { id: "fishman", label: "Île des Hommes-Poissons", color: "#3fbfa0" },
  { id: "dressrosa", label: "Dressrosa", color: "#e57ba8" },
  { id: "whole-cake", label: "Whole Cake", color: "#f2a2c0" },
  { id: "wano", label: "Wano", color: "#c0392b" },
  { id: "final", label: "Saga finale", color: "#f1c40f" },
  { id: "lore", label: "Hors route", color: "#95a5a6" },
];

export const PLACES = [
  // ── East Blue ────────────────────────────────────────────────────────
  { src: "Foosha Village", fr: "Village de Fuchsia", wiki: "Fuchsia", saga: "east-blue", step: 1, tag: "crew", note: "Village natal de Luffy. Shanks lui confie son chapeau." },
  { src: "Dawn Island", fr: "Dawn Island", wiki: "Dawn", saga: "east-blue", step: 2, tag: "crew" },
  { src: "Goa Kingdom", fr: "Royaume de Goa", wiki: "Goa", saga: "east-blue", step: null, tag: "story", note: "Enfance de Luffy, Ace et Sabo. Le Gray Terminal y est incendié." },
  { src: "Shells Town", fr: "Shells Town", wiki: "Shells_Town", saga: "east-blue", step: 3, tag: "crew", note: "Luffy y libère Zoro de la base de Morgan." },
  { src: "Orange Town", fr: "Orange Town", wiki: "Orange_Town", saga: "east-blue", step: 4, tag: "crew", note: "Première confrontation avec Baggy." },
  { src: "Syrup Village", fr: "Village de Syrup", wiki: "Syrup", saga: "east-blue", step: 5, tag: "crew", note: "Village d'Usopp. L'équipage y reçoit le Vogue Merry." },
  { src: "Baratie", fr: "Baratie", wiki: "Baratie", saga: "east-blue", step: 6, tag: "crew", note: "Restaurant flottant de Zeff. Sanji y travaille." },
  { src: "Arlong Park", fr: "Arlong Park", wiki: "Arlong_Park", saga: "east-blue", step: 7, tag: "crew" },
  { src: "Cocoyasi Village", fr: "Village de Cocoyashi", wiki: "Cocoyashi", saga: "east-blue", step: 8, tag: "crew", note: "Village de Nami. Bellemère y est tuée par Arlong." },
  { src: "Loguetown", fr: "Loguetown", wiki: "Loguetown", saga: "east-blue", step: 9, tag: "crew", note: "Ville de naissance et d'exécution de Gol D. Roger." },
  { src: "Shimotsuki Village", fr: "Village de Shimotsuki", wiki: "Shimotsuki_(village)", saga: "east-blue", step: null, tag: "character", note: "Village natal de Zoro. Kuina y meurt." },

  // ── Entrée dans Grand Line ───────────────────────────────────────────
  //
  // Deux positions corrigées ici. La carte source dessine Reverse Mountain
  // une dizaine de degrés au nord de Grand Line, sans doute pour que le
  // sommet reste lisible par-dessus le trait du courant. Mais le récit est
  // formel : la montagne est au croisement même de la Red Line et de Grand
  // Line, et c'est par elle qu'on entre dans la route. On la ramène donc
  // sur l'intersection, et le Cap des Jumeaux à son pied, côté Paradise —
  // c'est là que Crocus veille sur Laboon.
  {
    src: "Reverse Mountain",
    fr: "Reverse Mountain",
    wiki: "Reverse_Mountain",
    lat: 0,
    lng: -3.5,
    saga: "alabasta",
    step: 10,
    tag: "crew",
    note: "Seule entrée navigable de Grand Line, au croisement de la Red Line.",
  },
  {
    src: "Twin Capes",
    fr: "Cap des Jumeaux",
    wiki: "Cap_des_Jumeaux",
    lat: 0.9,
    lng: 1.8,
    // Le wiki le range « Grand Line, Red Line » parce qu'il touche les deux ;
    // on navigue déjà dans Paradise quand on l'atteint.
    sea: "Paradise",
    saga: "alabasta",
    step: 11,
    tag: "crew",
    note: "Au pied de Reverse Mountain. Crocus y veille sur Laboon depuis cinquante ans.",
  },
  { src: "Whisky Peak", fr: "Whisky Peak", wiki: "Whisky_Peak", saga: "alabasta", step: 12, tag: "crew", note: "Ville de chasseurs de primes au service de Baroque Works." },
  { src: "Giant Island Little Garden", fr: "Little Garden", wiki: "Little_Garden", saga: "alabasta", step: 13, tag: "crew", note: "Île préhistorique. Duel sans fin de Dorry et Brogy." },
  { src: "Sakura Kingdom", fr: "Drum / Royaume de Sakura", wiki: "Drum", alias: ["Drum Island", "Sakura"], saga: "alabasta", step: 14, tag: "crew", note: "Île de Chopper et du docteur Kureha." },
    // Le résumé récupéré commence par « est un royaume… » : l'extraction a
  // mangé le sujet. On le réécrit plutôt que de livrer une phrase bancale.
  {
    src: "Sandy Island",
    fr: "Alabasta",
    wiki: "Alabasta",
    alias: ["Arabasta", "Alubarna"],
    saga: "alabasta",
    step: 15,
    tag: "crew",
    summary:
      "Alabasta est un royaume désertique de Grand Line, dont la capitale est Alubarna. Gouverné par la famille Nefertari depuis des siècles, il compte parmi les vingt royaumes fondateurs du Gouvernement Mondial — et la seule de ces familles à avoir refusé de monter à Marie-Joie. Une sécheresse de trois ans, provoquée par la Dance Powder de Crocodile, y a jeté le pays dans la guerre civile.",
    note: "Royaume de Vivi, déstabilisé par Crocodile.",
  },

  // ── Skypiea ──────────────────────────────────────────────────────────
  { src: "Jaya Island", fr: "Jaya", wiki: "Jaya", saga: "skypiea", step: 16, tag: "crew" },
  { src: "Mock Town", fr: "Mock Town", wiki: "Mock_Town", saga: "skypiea", step: 17, tag: "crew", note: "Bellamy y humilie Montblanc Cricket." },
  // La carte source ne donne pas de mer pour les îles du ciel : sans cette
  // précision, la déduction par quadrant les rangeait en East Blue.
  { src: "Godland Skypiea", fr: "Skypiea", wiki: "Skypiea", alias: ["Skypia", "Ile du ciel"], sea: "Ciel", saga: "skypiea", step: 18, tag: "crew", note: "Île céleste. Ener s'y proclame dieu." },
  { src: "Sky Sea", fr: "Mer Blanche", wiki: "Mer_Blanche", sea: "Ciel", saga: "skypiea", step: null, tag: "story" },
  { src: "Long Ring Long Land", fr: "Long Ring Long Land", wiki: "Long_Ring_Long_Land", saga: "skypiea", step: 19, tag: "crew", note: "Davy Back Fight contre Foxy. Aokiji y apparaît." },

  // ── Water Seven ──────────────────────────────────────────────────────
  { src: "Shipbuilding Island", fr: "Water Seven", wiki: "Water_Seven", alias: ["Water 7", "Cite sur l'Eau"], saga: "water-seven", step: 20, tag: "crew", note: "Cité des charpentiers navals. Franky y rejoint l'équipage." },
  { src: "Enies Lobby", fr: "Enies Lobby", wiki: "Enies_Lobby", saga: "water-seven", step: 21, tag: "crew", note: "Île judiciaire. L'équipage déclare la guerre au Gouvernement Mondial." },
  { src: "St. Poplar", fr: "St. Poplar", wiki: "St._Poplar", saga: "water-seven", step: null, tag: "story" },
  { src: "San Faldo", fr: "San Faldo", wiki: "San_Faldo", saga: "water-seven", step: null, tag: "story" },
  { src: "Ohara", fr: "Ohara", wiki: "Ohara", saga: "water-seven", step: null, tag: "story", note: "Île natale de Robin, rayée de la carte par un Buster Call." },

  // ── Thriller Bark ────────────────────────────────────────────────────
  { src: "Thriller Bark", fr: "Thriller Bark", wiki: "Thriller_Bark", saga: "thriller-bark", step: 22, tag: "crew", note: "Navire-île de Gecko Moria. Brook y récupère son ombre." },
  { src: "Florian Triangle", fr: "Triangle de Florian", wiki: "Triangle_Florian", saga: "thriller-bark", step: null, tag: "story" },

  // ── Guerre au Sommet ─────────────────────────────────────────────────
  { src: "Sabaody Archipelago", fr: "Archipel Sabaody", wiki: "Archipel_Sabaody", saga: "summit-war", step: 23, tag: "crew", note: "Dernière escale avant l'Île des Hommes-Poissons. Kuma y disperse l'équipage." },
  { src: "Amazon Lily Empire", fr: "Amazon Lily", wiki: "Amazon_Lily", saga: "summit-war", step: 24, tag: "crew", note: "Royaume des Kuja, gouverné par Boa Hancock." },
  { src: "Impel Down", fr: "Impel Down", wiki: "Impel_Down", saga: "summit-war", step: 25, tag: "crew", note: "Prison sous-marine à six niveaux." },
  { src: "Marineford", fr: "Marine Ford", wiki: "Marine_Ford", saga: "summit-war", step: 26, tag: "crew", note: "Ace y meurt. Barbe Blanche y tombe." },
  // La carte source la rattache à Paradise, mais le récit la situe dans la
  // Calm Belt, au nord-ouest d'Amazon Lily : c'est ce qui la rend déserte
  // et la peuple de bêtes féroces.
  { src: "Rusukaina", fr: "Rusukaina", wiki: "Rusukaina", sea: "Calm Belt", saga: "summit-war", step: 27, tag: "crew", note: "Île déserte de la Calm Belt. Luffy s'y entraîne deux ans avec Rayleigh." },
  { src: "Kuraigana Island", fr: "Kuraigana", wiki: "Kuraigana", alias: ["Obscuria", "Ile Obscuria", "Mihawk"], saga: "summit-war", step: null, tag: "crew", note: "Zoro s'y entraîne sous Mihawk. Perona y réside." },
  // Posé à 9,2° de latitude, soit en pleine Calm Belt. Le wiki ne lui
  // attribue aucune région, et l'archipel dérive au gré des courants sans
  // jamais figurer sur une route : la ceinture est le seul rattachement
  // que la position et le récit s'accordent à donner.
  { src: "Boin Island Chain", fr: "Archipel Boin", wiki: "Archipel_Boin", sea: "Calm Belt", saga: "summit-war", step: null, tag: "crew", note: "Quatre îles vivantes et carnivores. Usopp y grossit avant d'y devenir fort." },
  // Le wiki francophone ne fait qu'une page de Momoiro et du Royaume de
  // Kamabakka qu'elle abrite : on ne garde qu'un marqueur.
  { src: "Momoiro Island", fr: "Île Momoiro", wiki: "Momoiro", alias: ["Kamabakka", "Royaume de Kamabakka", "Rose Island"], saga: "summit-war", step: null, tag: "crew", note: "Royaume de Kamabakka, fief d'Emporio Ivankov. Sanji y apprend le Poing du Diable." },
  { src: "Karakuri Island", fr: "Karakuri", wiki: "Karakuri", saga: "summit-war", step: null, tag: "crew", note: "Île natale de Franky et de Vegapunk." },
  { src: "Weatheria", fr: "Weatheria", wiki: "Weatheria", sea: "Ciel", saga: "summit-war", step: null, tag: "crew", note: "Île du ciel où Nami étudie la météo." },
  { src: "Torino Kingdom", fr: "Royaume de Torino", wiki: "Torino", saga: "summit-war", step: null, tag: "crew", note: "Chopper y perfectionne sa médecine." },
  { src: "Namakura", fr: "Namakura", wiki: "Namakura", saga: "summit-war", step: null, tag: "crew", note: "Brook y est retenu comme attraction de cirque." },
  { src: "Banaro Island", fr: "Banaro", wiki: "Banaro", saga: "summit-war", step: null, tag: "story", note: "Ace y affronte Barbe Noire et est capturé." },
  { src: "Baltigo", fr: "Baltigo", wiki: "Baltigo", saga: "summit-war", step: null, tag: "character", note: "Ancien quartier général de l'Armée Révolutionnaire de Dragon." },

  // ── Île des Hommes-Poissons ──────────────────────────────────────────
  { src: "Fish-Man Island", fr: "Île des Hommes-Poissons", wiki: "Île_des_Hommes-Poissons", alias: ["Fishman Island", "Ile des Hommes Poissons"], saga: "fishman", step: 28, tag: "crew", note: "Dix mille mètres sous la surface, sous la Red Line." },
  // Le palais est dans l'île, et l'île est sous la Red Line : sa longitude
  // tombe du côté Nouveau Monde, mais elle n'appartient à aucune moitié.
  { src: "Ryugu Kingdom", fr: "Royaume de Ryugu", wiki: "Ryugu", sea: "Red Line", saga: "fishman", step: 29, tag: "crew", note: "Palais de Neptune et de la princesse Shirahoshi." },
  { src: "Holyland Mary Geoise", fr: "Marie-Joie", wiki: "Marie-Joie", alias: ["Mariejois", "Mary Geoise", "Terre Sainte"], saga: "fishman", step: null, tag: "story", note: "Capitale du Gouvernement Mondial, siège des Dragons Célestes et d'Imu." },

  // ── Dressrosa ────────────────────────────────────────────────────────
  { src: "Punk Hazard Island", fr: "Punk Hazard", wiki: "Punk_Hazard", saga: "dressrosa", step: 30, tag: "crew", note: "Île coupée en deux, feu et glace. Alliance avec Law." },
  { src: "Dress Rosa", fr: "Dressrosa", wiki: "Dressrosa", saga: "dressrosa", step: 31, tag: "crew", note: "Royaume des jouets, sous la coupe de Doflamingo." },
  { src: "Green Bit", fr: "Green Bit", wiki: "Green_Bit", saga: "dressrosa", step: 32, tag: "crew", note: "Île des Tontatta, reliée à Dressrosa par un pont de fer." },
  { src: "Zou", fr: "Zou", wiki: "Zou", saga: "dressrosa", step: 33, tag: "crew", note: "Île portée sur le dos d'un éléphant millénaire." },
  { src: "Mokomo Dukedom", fr: "Duché de Mokomo", wiki: "Mokomo", saga: "dressrosa", step: null, tag: "crew", note: "Cité des Minks, sur le dos de Zunisha." },

  // ── Whole Cake ───────────────────────────────────────────────────────
  { src: "Whole Cake Island", fr: "Whole Cake Island", wiki: "Whole_Cake_Island", saga: "whole-cake", step: 34, tag: "crew", note: "Territoire de Big Mom. Mariage manqué de Sanji." },
  { src: "Totto Land", fr: "Totto Land", wiki: "Totto_Land", saga: "whole-cake", step: null, tag: "story", note: "Archipel de trente-quatre îles gouverné par Big Mom." },
  { src: "Cacao Island", fr: "Île Cacao", wiki: "Île_Cacao", saga: "whole-cake", step: 35, tag: "crew" },

  // ── Wano ─────────────────────────────────────────────────────────────
  { src: "Wano Country", fr: "Pays des Wa", wiki: "Pays_des_Wa", alias: ["Wano", "Wano Kuni", "Wa no Kuni"], saga: "wano", step: 36, tag: "crew", note: "Pays fermé, sous la domination de Kaido et Orochi." },
  { src: "Onigashima", fr: "Onigashima", wiki: "Onigashima", saga: "wano", step: 37, tag: "crew", note: "Repaire de l'Équipage aux Cent Bêtes." },

  // ── Saga finale ──────────────────────────────────────────────────────
  { src: "Future Island Egghead", fr: "Egghead", wiki: "Egghead", saga: "final", step: 38, tag: "crew", note: "Île du futur, laboratoire de Vegapunk." },
  { src: "Elbaph Island", fr: "Elbaf", wiki: "Elbaf", alias: ["Elbaph", "Erbaf", "Warland"], saga: "final", step: 39, tag: "crew", note: "Terre des géants, patrie de Dorry et Brogy. Le Royaume de Warland s'y trouve." },
  { src: "Lulusia Kingdom", fr: "Royaume de Lulusia", wiki: "Lulusia", saga: "final", step: null, tag: "story", note: "Effacé de la carte par Imu depuis Marie-Joie." },
  { src: "Lode Star Island", fr: "Lodestar", wiki: "Lodestar", saga: "final", step: null, tag: "story", note: "Dernière île avant Laugh Tale que désigne le Log Pose." },
  { src: "Pirate Island Hachinosu", fr: "Hachinosu", wiki: "Hachinosu", alias: ["Ile de Ruche", "Pirate Island", "Barbe Noire"], saga: "final", step: null, tag: "character", note: "Île de la Ruche, repaire de Barbe Noire." },
  { src: "Sphinx", fr: "Sphinx", wiki: "Sphinx", saga: "final", step: null, tag: "character", note: "Village natal de Barbe Blanche, protégé par Marco." },
  { src: "Kari Bari-Island", fr: "Karai Bari", wiki: "Karai_Bari", alias: ["Kalai Bali", "Lacrahn-Ri", "Armee Revolutionnaire"], saga: "final", step: null, tag: "character", note: "Quartier général actuel de l'Armée Révolutionnaire." },
  // Partage la page du wiki avec l'ancien Marine Ford : on n'affiche que la note.
  { src: "New Marineford", fr: "Nouveau Marine Ford", wiki: "Marine_Ford", ownNoteOnly: true, saga: "final", step: null, tag: "story", note: "Après la guerre au sommet, la Marine abandonne Marine Ford et réinstalle son quartier général dans le Nouveau Monde, à l'emplacement de l'ancien G-1." },

  // ── Hors route : lieux clés jamais visités ───────────────────────────
  { src: "God Valley", fr: "God Valley", wiki: "God_Valley", saga: "lore", step: null, tag: "story", note: "Incident de God Valley : Roger et Garp contre l'Équipage de Rocks." },
  { src: "Flevance", fr: "Flevance", wiki: "Flevance", saga: "lore", step: null, tag: "story", note: "Pays du plomb ambré. Ville natale de Law, massacrée." },
  { src: "Minion Island", fr: "Île Minion", wiki: "Minion", saga: "lore", step: null, tag: "story", note: "Corazon y meurt pour sauver Law." },
  { src: "Germa Empire", fr: "Germa 66", wiki: "Germa_66", saga: "lore", step: null, tag: "character", note: "Royaume itinérant des Vinsmoke, famille de Sanji." },
  { src: "Baterilla", fr: "Baterilla", wiki: "Baterilla", saga: "lore", step: null, tag: "story", note: "Portgas D. Rouge y porte Ace vingt mois avant sa naissance." },
  { src: "Sorbet Kingdom", fr: "Royaume de Sorbet", wiki: "Sorbet", saga: "lore", step: null, tag: "character", note: "Royaume de Bartholomew Kuma et de Jewelry Bonney." },
  { src: "Lvneel Kingdom", fr: "Royaume de Lvneel", wiki: "Lvneel", saga: "lore", step: null, tag: "story", note: "Montblanc Noland y est exécuté pour mensonge." },
  { src: "Kano Country", fr: "Pays de Kano", wiki: "Kano", saga: "lore", step: null, tag: "character", note: "Wapol s'y refait un royaume après sa chute." },
  { src: "Vira", fr: "Vira", wiki: "Vira", ownNoteOnly: true, saga: "lore", step: null, tag: "story", note: "Île de Grand Line secouée par une révolution attribuée à Dragon. Le Gouvernement Mondial y voit la première main de l'Armée Révolutionnaire." },
  { src: "Foodvalten", fr: "Foodvalten", wiki: "Foodvalten", saga: "lore", step: null, tag: "story", note: "Territoire placé sous la protection de Barbe Blanche." },
  { src: "Raijin Island", fr: "Île Raijin", wiki: "Raijin", saga: "lore", step: null, tag: "story", note: "Île de la foudre perpétuelle, sur la route de Barbe Noire." },
  { src: "Marine HQ", fr: "QG de la Marine", wiki: "Marine", ownNoteOnly: true, saga: "lore", step: null, tag: "story", note: "Siège du haut commandement de la Marine, sous l'autorité du Gouvernement Mondial." },
  { src: "Prodence Kingdom", fr: "Royaume de Prodence", wiki: "Prodence", saga: "lore", step: null, tag: "story" },
  { src: "Mogaro Kingdom", fr: "Royaume de Mogaro", wiki: "Mogaro", saga: "lore", step: null, tag: "story" },
  { src: "Standing Kingdom", fr: "Royaume de Standing", wiki: "Standing", saga: "lore", step: null, tag: "story" },
  { src: "Tontatta Kingdom", fr: "Royaume Tontatta", wiki: "Tontatta", saga: "dressrosa", step: null, tag: "crew" },
  // Corkwood écarté : aucune page ne lui correspond sur les deux wikis,
  // la recherche ne renvoyait que la page générique de la planète.
  { src: "Red Port (W)", fr: "Red Port", wiki: "Red_Port", saga: "lore", step: null, tag: "story", note: "Port de la Red Line par lequel on accède à Marie-Joie." },
  { src: "Calm Belt", fr: "Calm Belt", wiki: "Calm_Belt", saga: "lore", step: null, tag: "story", note: "Deux ceintures sans vent ni courant, infestées de Rois des Mers." },

  // ── Positions absentes de la carte source ────────────────────────────
  //
  // Laugh Tale n'est marquée sur aucune carte : sa position est inconnue
  // dans l'œuvre. Le seul repère canon est qu'elle vient juste après
  // Lodestar, dernière île que désigne le Log Pose.
  //
  // En mesurant les longitudes vers l'est depuis la Red Line — le sens de
  // navigation de l'équipage — Lodestar est à 155° et la Red Line referme
  // la boucle à 180°. On place donc Laugh Tale à 170°, soit quinze degrés
  // après Lodestar et dix avant la fin du tour.
  {
    src: null,
    fr: "Laugh Tale",
    alias: ["Raftel", "Rafte", "One Piece"],
    wiki: "Laugh_Tale",
    saga: "final",
    step: 40,
    tag: "story",
    note: "Île finale de Grand Line, au-delà de Lodestar. Roger y trouve le One Piece.",
    lat: 0.8,
    lng: -13.5,
    scale: 4,
    location: "New World",
  },
];

/**
 * Personnages attachés à un lieu, indexés pour la recherche.
 *
 * Un lecteur cherche autant « zoro » que « Shimotsuki » : la table permet
 * de retrouver une île par qui l'habite, y est né ou y est mort. On s'en
 * tient à ceux dont le lien avec le lieu est un fait de l'histoire, pas à
 * la liste de tous les personnages qui y sont passés.
 */
export const PEOPLE = {
  "Village de Fuchsia": ["Luffy", "Shanks", "Makino"],
  "Royaume de Goa": ["Sabo", "Ace", "Dadan"],
  "Village de Shimotsuki": ["Zoro", "Kuina", "Koshiro"],
  "Village de Syrup": ["Usopp", "Kaya", "Merry"],
  Baratie: ["Sanji", "Zeff"],
  "Village de Cocoyashi": ["Nami", "Bellemère", "Nojiko", "Arlong"],
  "Arlong Park": ["Arlong"],
  Loguetown: ["Gol D. Roger", "Smoker", "Tashigi"],
  "Cap des Jumeaux": ["Crocus", "Laboon"],
  "Little Garden": ["Dorry", "Brogy"],
  "Drum / Royaume de Sakura": ["Chopper", "Kureha", "Hiluluk", "Wapol"],
  Alabasta: ["Vivi", "Crocodile", "Cobra", "Pell"],
  "Mock Town": ["Bellamy", "Montblanc Cricket"],
  Skypiea: ["Ener", "Gan Fall", "Wiper"],
  "Water Seven": ["Franky", "Iceburg", "Tom", "Paulie"],
  "Enies Lobby": ["Rob Lucci", "Spandam", "CP9"],
  Ohara: ["Nico Robin", "Olvia", "Clover"],
  "Thriller Bark": ["Brook", "Gecko Moria", "Perona"],
  "Archipel Sabaody": ["Rayleigh", "Kuma", "Kizaru"],
  "Amazon Lily": ["Boa Hancock", "Elder Nyon"],
  "Impel Down": ["Magellan", "Ivankov", "Bon Clay"],
  "Marine Ford": ["Ace", "Barbe Blanche", "Akainu", "Garp"],
  Rusukaina: ["Rayleigh", "Luffy"],
  Kuraigana: ["Mihawk", "Perona", "Zoro"],
  "Île Momoiro": ["Ivankov", "Sanji"],
  Karakuri: ["Franky", "Vegapunk"],
  Weatheria: ["Nami", "Haredas"],
  Baltigo: ["Monkey D. Dragon", "Sabo"],
  Banaro: ["Ace", "Barbe Noire"],
  "Île des Hommes-Poissons": ["Shirahoshi", "Neptune", "Hody Jones", "Jinbei"],
  "Marie-Joie": ["Imu", "Doflamingo", "Dragons Célestes"],
  "Punk Hazard": ["Law", "Caesar Clown", "Smoker"],
  Dressrosa: ["Doflamingo", "Rebecca", "Kyros", "Riku Doldo III"],
  "Green Bit": ["Tontatta", "Leo"],
  Zou: ["Raizo", "Inuarashi", "Nekomamushi", "Momonosuke"],
  "Whole Cake Island": ["Big Mom", "Katakuri", "Pudding", "Sanji"],
  "Pays des Wa": ["Kaido", "Oden", "Orochi", "Momonosuke", "Yamato"],
  Onigashima: ["Kaido", "King", "Queen", "Yamato"],
  Egghead: ["Vegapunk", "Bonney", "York"],
  Elbaf: ["Dorry", "Brogy", "Loki"],
  Hachinosu: ["Barbe Noire", "Marshall D. Teach"],
  Sphinx: ["Marco", "Barbe Blanche"],
  "Karai Bari": ["Sabo", "Dragon", "Ivankov"],
  "God Valley": ["Rocks D. Xebec", "Roger", "Garp"],
  Flevance: ["Law", "Trafalgar"],
  "Île Minion": ["Corazon", "Law", "Doflamingo"],
  "Germa 66": ["Sanji", "Judge", "Reiju", "Vinsmoke"],
  Baterilla: ["Portgas D. Rouge", "Ace", "Roger"],
  "Royaume de Sorbet": ["Kuma", "Jewelry Bonney"],
  "Royaume de Lvneel": ["Montblanc Noland"],
  "Pays de Kano": ["Wapol"],
  "Laugh Tale": ["Gol D. Roger", "Rayleigh", "Oden"],
  "Royaume de Lulusia": ["Imu"],
  "Île Raijin": ["Barbe Noire"],
};

/**
 * Nature du lieu, quand ce n'est pas une île de terre ordinaire.
 *
 * Une pastille de couleur ne dit rien d'un lieu qui n'est pas une île :
 * Skypiea flotte dans le ciel, l'Île des Hommes-Poissons est à dix mille
 * mètres de fond, Zou marche sur le dos d'un éléphant, la Calm Belt est
 * une ceinture de mer et non une terre. Ces lieux reçoivent un pictogramme
 * qui dit ce qu'ils sont ; les autres n'en ont pas besoin.
 *
 * `glyph` est dessiné en SVG dans src/app.js — aucune police d'icônes,
 * aucun émoji : le rendu doit être identique sur tous les appareils.
 */
export const KINDS = {
  sky: { label: "Île céleste", hint: "portée par un courant ascendant" },
  seafloor: { label: "Fond marin", hint: "sous la surface" },
  living: { label: "Île vivante", hint: "un être vivant porte la terre" },
  ship: { label: "Navire", hint: "flotte, ne tient pas au fond" },
  holy: { label: "Terre Sainte", hint: "au sommet de la Red Line" },
  port: { label: "Port", hint: "l'escale au pied de la Red Line" },
  settlement: { label: "Ville", hint: "posée sur une île plus grande" },
  works: { label: "Ouvrage", hint: "bâti de main d'homme" },
  zone: { label: "Zone maritime", hint: "une étendue de mer, pas une terre" },
  lost: { label: "Lieu détruit", hint: "rayé de la carte" },
};

/** Nature d'un lieu, indexée par son nom français. Absent = île ordinaire. */
export const PLACE_KIND = {
  // Le ciel : trois lieux, tous portés par des courants ascendants.
  Skypiea: "sky",
  "Mer Blanche": "sky",
  Weatheria: "sky",

  // Le fond : l'Île des Hommes-Poissons et son palais, sous la Red Line.
  "Île des Hommes-Poissons": "seafloor",
  "Royaume de Ryugu": "seafloor",

  // Zou seul est porté par un être vivant : Zunisha marche depuis mille
  // ans. Le Duché de Mokomo est la cité posée sur son dos — une ville, pas
  // un second éléphant.
  Zou: "living",
  "Duché de Mokomo": "settlement",

  // Des coques, pas des côtes.
  Baratie: "ship",
  "Thriller Bark": "ship",
  "Germa 66": "ship",

  // Le carrefour de la Red Line : trois lieux, trois rôles distincts.
  "Marie-Joie": "holy",
  "Red Port": "port",

  // Des villes posées sur une île déjà dessinée : les peindre en terre
  // ferait deux îles là où l'œuvre n'en montre qu'une.
  "Village de Fuchsia": "settlement",
  "Royaume de Goa": "settlement",
  "Mock Town": "settlement",
  "Village de Cocoyashi": "settlement",
  "Royaume Tontatta": "settlement",
  "Île Cacao": "settlement",

  // Construits, pas trouvés.
  Egghead: "works",
  "Impel Down": "works",
  "Enies Lobby": "works",
  "Arlong Park": "works",

  // De la mer nommée, sans terre.
  "Calm Belt": "zone",
  "Triangle de Florian": "zone",

  // Effacés du monde par un Buster Call, un Dragon Céleste ou une guerre.
  Ohara: "lost",
  "God Valley": "lost",
  "Royaume de Lulusia": "lost",
};

/**
 * Taille du lieu sur la carte, de 1 à 8.
 *
 * La carte source range les lieux par importance narrative, pas par
 * étendue : Elbaf, patrie des géants, y a le même rang que le village de
 * Fuchsia. Cette échelle-ci lit ce que l'œuvre montre, et son pas est
 * géométrique — sans quoi un pays et un îlot finissent voisins.
 *
 *   8  un continent    Elbaf, Wano
 *   7  un grand pays   Alabasta, Dressrosa, Totto Land
 *   6  une grande île  Water Seven, Punk Hazard, Skypiea
 *   5  une île notable Jaya, Little Garden, Dawn Island
 *   4  une île moyenne Kuraigana, Karakuri, Sorbet
 *   3  une petite île  Banaro, Lodestar, Green Bit
 *   2  un îlot         Whisky Peak, Île Minion
 *   1  un lieu-dit     les villes posées sur une autre île
 */
export const PLACE_SIZE = {
  // 8 — on met des jours à les traverser
  Elbaf: 8,
  "Pays des Wa": 8,

  // 7 — de grands royaumes, plusieurs villes et un désert ou une mer intérieure
  Alabasta: 7,
  Dressrosa: 7,
  "Whole Cake Island": 7,
  "Totto Land": 7,
  // Le massif déborde la Red Line de part et d'autre du croisement.
  "Reverse Mountain": 7,

  // 6 — grandes îles, reconnaissables de loin
  "Water Seven": 6,
  "Punk Hazard": 6,
  Skypiea: 6,
  Egghead: 6,
  "Île des Hommes-Poissons": 6,
  "Archipel Sabaody": 6,
  "Marine Ford": 6,
  "Laugh Tale": 6,
  "Drum / Royaume de Sakura": 6,
  Zou: 6,
  Onigashima: 6,


  // 5 — îles d'une journée de traversée
  "Dawn Island": 5,
  Jaya: 5,
  "Little Garden": 5,
  "Long Ring Long Land": 5,
  "Amazon Lily": 5,
  "Enies Lobby": 5,
  "Thriller Bark": 5,
  "Impel Down": 5,
  Ohara: 5,
  "God Valley": 5,
  "Pays de Kano": 5,
  "Royaume de Lvneel": 5,

  // 4 — îles moyennes
  Rusukaina: 4,
  Flevance: 4,
  Karakuri: 4,
  "Royaume de Torino": 4,
  Kuraigana: 4,
  Baterilla: 4,
  "Royaume de Sorbet": 4,
  "Germa 66": 4,
  Hachinosu: 4,
  "Île Momoiro": 4,
  "Royaume de Lulusia": 4,
  "Archipel Boin": 4,
  "Village de Shimotsuki": 4,
  Loguetown: 4,
  "Mer Blanche": 4,

  // 3 — petites îles
  "Shells Town": 3,
  "Orange Town": 3,
  "Village de Syrup": 3,
  "Green Bit": 3,
  "Karai Bari": 3,
  Banaro: 3,
  Baltigo: 3,
  Foodvalten: 3,
  "Île Raijin": 3,
  Lodestar: 3,
  Sphinx: 3,
  Namakura: 3,
  Vira: 3,
  "Royaume de Mogaro": 3,
  "Royaume de Prodence": 3,
  "Royaume de Standing": 3,
  "Île Minion": 3,
  Weatheria: 3,
  "Nouveau Marine Ford": 3,
  "QG de la Marine": 3,
  Baratie: 3,
  "Royaume de Ryugu": 3,

  // 2 — îlots, caps, zones
  "Whisky Peak": 2,
  "Cap des Jumeaux": 2,
  "St. Poplar": 2,
  "San Faldo": 2,
  "Triangle de Florian": 2,
  "Calm Belt": 2,
  "Arlong Park": 2,

  // 1 — ce qui tient sur une île déjà dessinée
  "Village de Fuchsia": 1,
  "Village de Cocoyashi": 1,
  "Mock Town": 1,
  "Royaume de Goa": 1,
  "Duché de Mokomo": 1,
  "Royaume Tontatta": 1,
  "Île Cacao": 1,
  "Marie-Joie": 1,
  "Red Port": 1,
};

/**
 * Terrain dominant : ce qu'on verrait en survolant l'île.
 *
 * Les quatre-vingt-trois lieux peints d'un même vert donnaient une carte
 * fausse — Alabasta est un désert, Drum une île de neige, Punk Hazard est
 * coupée en deux entre feu et glace. Absent de la table, un lieu est boisé.
 */
export const PLACE_TERRAIN = {
  desert: ["Alabasta", "Whisky Peak", "Royaume de Mogaro", "Baterilla"],
  snow: [
    "Drum / Royaume de Sakura",
    "Flevance",
    "Karakuri",
    "Île Minion",
    "Royaume de Lvneel",
    "Kuraigana",
  ],
  split: ["Punk Hazard"], // moitié brûlée, moitié gelée
  jungle: [
    "Archipel Boin",
    "Little Garden",
    "Jaya",
    "Green Bit",
    "Royaume de Torino",
    "Amazon Lily",
    "Rusukaina",
    "Elbaf",
  ],
  city: [
    "Water Seven",
    "Loguetown",
    "San Faldo",
    "St. Poplar",
    "Dressrosa",
    "Enies Lobby",
    "Royaume de Goa",
    "Shells Town",
    "Orange Town",
    "Nouveau Marine Ford",
    "QG de la Marine",
    "Marine Ford",
  ],
  rock: [
    "Onigashima",
    "Banaro",
    "Baltigo",
    "Lodestar",
    "Hachinosu",
    "Île Raijin",
    "Karai Bari",
    "God Valley",
  ],
  cake: ["Whole Cake Island", "Île Cacao", "Totto Land"],
  ash: ["Ohara", "Royaume de Lulusia"], // ce qu'il reste après l'effacement
  // Reverse Mountain n'est pas une île : c'est un massif à cheval sur la
  // Red Line, dessiné comme elle et non représenté par un pictogramme.
  mountain: ["Reverse Mountain"],
};

/** Lieux faits de plusieurs îlots, à dessiner en grappe. */
export const ARCHIPELAGOS = new Set([
  "Archipel Sabaody",
  "Totto Land",
  "Long Ring Long Land",
  "Royaume de Torino",
]);


/**
 * Ce que l'équipage a fait à chaque escale, et combien de temps il y est
 * resté.
 *
 * Les durées sont celles que la chronologie publiée de l'œuvre permet de
 * reconstituer : elles sont approchées, jamais données au jour près par le
 * récit, sauf quand un personnage les énonce — les deux ans de Rusukaina,
 * les cinquante ans de Laboon. Une escale sans durée connue reste vide
 * plutôt que d'être inventée.
 */
export const CREW_STOPS = {
  "Village de Fuchsia": {
    days: 1,
    deed: "Luffy y grandit sous l'œil de Makino, y avale le Gomu Gomu no Mi et reçoit le chapeau de paille de Shanks. Il quitte le village seul, dans un tonneau, à dix-sept ans.",
  },
  "Dawn Island": {
    days: 1,
    deed: "Point de départ. Luffy prend la mer depuis la côte de l'île où il a passé son enfance avec Ace et Sabo.",
  },
  "Shells Town": {
    days: 1,
    deed: "Luffy libère Zoro, ligoté depuis neuf jours dans la cour de la base, et abat le capitaine Morgan. Zoro devient le premier membre de l'équipage.",
  },
  "Orange Town": {
    days: 2,
    deed: "Nami vole la carte de Grand Line à Baggy le Clown ; Luffy le bat et la ville est rendue à ses habitants. Nami navigue avec l'équipage sans encore le rejoindre.",
  },
  "Village de Syrup": {
    days: 3,
    deed: "L'équipage déjoue le complot de Kuro contre Kaya. Usopp embarque, et Kaya leur offre le Vogue Merry.",
  },
  Baratie: {
    days: 5,
    deed: "Sanji sert au restaurant flottant de Zeff. Luffy repousse Don Krieg ; Zoro perd contre Mihawk et jure de devenir le meilleur épéiste. Sanji quitte le Baratie pour l'équipage.",
  },
  "Arlong Park": {
    days: 2,
    deed: "Luffy détruit la tour d'Arlong et brise la domination des hommes-poissons sur l'archipel de Conomi.",
  },
  "Village de Cocoyashi": {
    days: 3,
    deed: "L'équipage apprend le pacte de Nami avec Arlong et le prix payé par Bellemère. Nami rejoint l'équipage pour de bon et dessine sa première carte libre.",
  },
  Loguetown: {
    days: 1,
    deed: "Zoro achète Sandai Kitetsu et Yubashiri, Sanji fait ses provisions, Luffy monte sur l'échafaud de Roger et en réchappe. Smoker les prend en chasse ; Dragon couvre leur fuite.",
  },
  "Reverse Mountain": {
    days: 1,
    deed: "Le Vogue Merry gravit la montagne portée par les quatre courants et bascule dans Grand Line. Le mât est perdu à la descente.",
  },
  "Cap des Jumeaux": {
    days: 1,
    deed: "Luffy affronte Laboon puis lui promet de revenir après le tour du monde ; Crocus répare le navire et explique le Log Pose.",
  },
  "Whisky Peak": {
    days: 1,
    deed: "Zoro tient tête à cent chasseurs de primes de Baroque Works. Vivi et Igaram se révèlent, et l'équipage prend la route d'Alabasta.",
  },
  "Little Garden": {
    days: 1,
    deed: "L'équipage assiste au duel centenaire de Dorry et Brogy, échappe à Mr. 3 et à la cire, et Nami tombe malade en repartant.",
  },
  "Drum / Royaume de Sakura": {
    days: 2,
    deed: "Luffy escalade la falaise avec Nami sur le dos pour trouver la docteure Kureha. Chopper rejoint l'équipage ; Wapol est chassé et les cerisiers de Hiluluk fleurissent.",
  },
  Alabasta: {
    days: 5,
    deed: "L'équipage traverse le désert, brise le plan de Crocodile et arrête la guerre civile. Robin quitte Baroque Works et s'invite à bord ; Vivi reste reine et leur laisse sa marque.",
  },
  Jaya: {
    days: 2,
    deed: "Montblanc Cricket leur explique le courant ascendant et remet en état le Merry pour l'envol vers le ciel.",
  },
  "Mock Town": {
    days: 1,
    deed: "Luffy encaisse les moqueries de Bellamy sans riposter, achète une carte à prix d'or et repart.",
  },
  Skypiea: {
    days: 3,
    deed: "L'équipage franchit le Knock Up Stream, se trouve hors-la-loi au pays des Cieux, met fin au règne d'Ener et fait sonner la cloche d'or de Shandora.",
  },
  "Long Ring Long Land": {
    days: 2,
    deed: "Davy Back Fight contre Foxy : Chopper puis Robin sont perdus et regagnés. Aokiji apparaît et gèle Robin ; l'équipage comprend à qui il a affaire.",
  },
  "Water Seven": {
    days: 5,
    deed: "Le Merry est déclaré irréparable, Usopp quitte l'équipage, Robin disparaît avec le CP9. Franky et les charpentiers construisent le Thousand Sunny.",
  },
  "Enies Lobby": {
    days: 1,
    deed: "L'équipage brûle le drapeau du Gouvernement Mondial, bat le CP9 et reprend Robin. Le Merry vient les chercher une dernière fois avant ses funérailles.",
  },
  "Thriller Bark": {
    days: 2,
    deed: "Les ombres volées par Gecko Moria sont rendues. Brook récupère la sienne et rejoint l'équipage ; Zoro encaisse seul la douleur de Luffy devant Kuma.",
  },
  "Archipel Sabaody": {
    days: 3,
    deed: "Luffy frappe un Dragon Céleste et libère Kaimie. Rayleigh révèle le revêtement des navires ; Kuma disperse les neuf membres aux quatre coins du monde.",
  },
  "Amazon Lily": {
    days: 4,
    deed: "Luffy y atterrit seul, survit à l'île interdite aux hommes et gagne le concours de Boa Hancock, qui le conduit ensuite à Impel Down.",
  },
  "Impel Down": {
    days: 1,
    deed: "Luffy descend les six niveaux pour sauver Ace, échoue d'un étage, et ressort en menant l'évasion la plus massive de l'histoire de la prison.",
  },
  "Marine Ford": {
    days: 1,
    deed: "Luffy arrive au milieu de la guerre au sommet. Ace meurt dans ses bras, Barbe Blanche tombe. Jinbei et Trafalgar Law le tirent de là.",
  },
  Rusukaina: {
    days: 730,
    deed: "Deux ans d'entraînement avec Rayleigh sur une île déserte aux quarante-huit climats. Luffy y apprend à maîtriser les trois Haki.",
  },
  "Île des Hommes-Poissons": {
    days: 3,
    deed: "L'équipage se retrouve dix mille mètres sous la Red Line, bat Hody Jones et sauve l'île. Jinbei promet de les rejoindre plus tard.",
  },
  "Royaume de Ryugu": {
    days: 1,
    deed: "Luffy rencontre Shirahoshi, brise sa tour et lui fait voir la surface. Le roi Neptune scelle l'alliance avec l'équipage.",
  },
  "Punk Hazard": {
    days: 2,
    deed: "L'équipage libère les enfants de Caesar Clown et scelle l'alliance avec Trafalgar Law contre Doflamingo.",
  },
  Dressrosa: {
    days: 4,
    deed: "Luffy remporte le Colisée, brise le règne de Doflamingo et rend le royaume à la famille Riku. Sept capitaines jurent fidélité et forment la Grande Flotte.",
  },
  "Green Bit": {
    days: 1,
    deed: "Franky et Robin y découvrent le royaume Tontatta et l'usine de SMILE cachée sous Dressrosa.",
  },
  Zou: {
    days: 3,
    deed: "L'équipage retrouve les Minks sur le dos de Zunisha, apprend l'existence des Poneglyphes Rouges et se sépare en deux pour Whole Cake et Wano.",
  },
  "Whole Cake Island": {
    days: 3,
    deed: "Luffy vient chercher Sanji, empêche le mariage arrangé par Big Mom et détruit la salle des Poneglyphes. Jinbei quitte les Hommes-Poissons pour l'équipage.",
  },
  "Île Cacao": {
    days: 1,
    deed: "Sanji cuisine le gâteau qui calme Big Mom pendant que Luffy tient tête à Katakuri. L'équipage s'échappe de Totto Land.",
  },
  "Pays des Wa": {
    days: 30,
    deed: "L'équipage entre dans le pays fermé, retrouve Zoro et Sanji, s'allie aux samouraïs de Kozuki Oden et prépare le soulèvement contre Kaido et Orochi.",
  },
  Onigashima: {
    days: 2,
    deed: "La bataille de l'île : Kaido et Big Mom tombent, Momonosuke ouvre les frontières de Wano, et Luffy est proclamé Empereur.",
  },
  Egghead: {
    days: 3,
    deed: "L'équipage rencontre Vegapunk, apprend la vérité sur le Siècle Oublié et s'échappe sous le feu d'un Amiral et des Cinq Doyens.",
  },
  Elbaf: {
    days: null,
    deed: "L'équipage aborde la terre des géants, patrie de Dorry et Brogy — l'escale est en cours dans l'œuvre.",
  },
  "Laugh Tale": {
    days: null,
    deed: "Le bout de Grand Line, là où Roger a trouvé le One Piece. L'équipage n'y est pas encore arrivé.",
  },

  // ── Escales hors de la route principale ──────────────────────────────
  "Royaume de Goa": {
    days: null,
    deed: "Luffy, Ace et Sabo y grandissent chez les bandits de Dadan. Le Gray Terminal est incendié sur ordre du royaume.",
  },
  "Village de Shimotsuki": {
    days: null,
    deed: "Zoro y apprend le sabre au dojo de Koshiro et perd Kuina. Il en emporte le Wado Ichimonji.",
  },
  "Mer Blanche": {
    days: null,
    deed: "La mer de nuages traversée à l'aller comme au retour de Skypiea, à bord du Merry devenu navire volant.",
  },
  Kuraigana: {
    days: 730,
    deed: "Zoro s'entraîne deux ans sous Mihawk, dans le château hanté où réside Perona.",
  },
  "Île Momoiro": {
    days: 730,
    deed: "Sanji y est retenu deux ans au royaume de Kamabakka et en ressort avec le Poing du Diable.",
  },
  Karakuri: {
    days: 730,
    deed: "Franky passe deux ans dans le laboratoire de Vegapunk, sur son île natale, et en revient transformé.",
  },
  Weatheria: {
    days: 730,
    deed: "Nami étudie deux ans la météorologie auprès de Haredas et en rapporte le Clima Tact parfait.",
  },
  "Royaume de Torino": {
    days: 730,
    deed: "Chopper perfectionne sa médecine deux ans durant chez les habitants de l'île aux oiseaux.",
  },
  "Archipel Boin": {
    days: 730,
    deed: "Usopp échoue deux ans sur les îles carnivores, y grossit, puis s'entraîne au Pop Green auprès d'Heracles.",
  },
  Namakura: {
    days: 730,
    deed: "Brook est exhibé deux ans comme attraction de cirque, jusqu'à ce que sa musique fasse de lui une vedette mondiale.",
  },
  "Duché de Mokomo": {
    days: null,
    deed: "La cité des Minks sur le dos de Zunisha, où l'équipage retrouve Raizo et apprend l'histoire de Kozuki Oden.",
  },
  "Royaume Tontatta": {
    days: null,
    deed: "Usopp y devient le dieu Usoland des Tontatta après avoir brisé l'emprise de Sugar sur Dressrosa.",
  },
  "Totto Land": {
    days: null,
    deed: "L'archipel de Big Mom traversé pendant l'opération de sauvetage de Sanji.",
  },
  Baltigo: {
    days: null,
    deed: "Jamais visité par l'équipage : l'ancien quartier général de Dragon, rasé par Barbe Noire.",
  },
};

/** Table src → entrée, pour le croisement avec positions.json. */
export const BY_SOURCE = new Map(
  PLACES.filter((p) => p.src).map((p) => [p.src, p]),
);
