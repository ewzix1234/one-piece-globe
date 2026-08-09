# Blue Star

Globe interactif du monde de One Piece. 83 lieux posés sur la sphère à leur
position canon, de Fuchsia à Elbaf.

Tourne à la souris, zoome à la molette ou au pincement — on peut reculer
jusqu'à voir la planète entière. Clique une île pour ouvrir sa fiche. Les
flèches suivent la route de l'équipage escale par escale sans recouvrir le
globe : elles ouvrent un bandeau court, la fiche complète reste à un clic.
L'adresse suit l'île choisie, `…/#alabasta` s'ouvre directement dessus.

**Revivre le voyage** rejoue la traversée de bout en bout : le Vogue Merry
puis, à partir d'Enies Lobby, le Thousand Sunny suivent la route et laissent
une trace en pointillés rouges. L'arrêt à chaque escale dure à la mesure du
temps que l'équipage y a passé, le bandeau raconte ce qu'il y a fait et
compte les jours depuis le départ de Fuchsia. On met en pause à l'espace, on
saute d'escale en escale aux flèches ou en cliquant la réglette, on rejoue à
la fin. Ensuite, les flèches reprennent la route à la main.

Rien n'est posé sur la carte : ni pastille, ni pictogramme, ni légende, ni
filtre. Tout est peint, jusqu'aux noms — leurs lettres tombent toutes sur le
même parallèle, si bien qu'un nom d'océan épouse la courbure du globe au
lieu de le barrer. La sphère se lit comme un relevé — graticule tous les quinze
degrés, hauts-fonds autour des terres, ombre
portée sous chaque côte — et chaque lieu prend la forme de ce qu'il est : Zou est un
éléphant qui porte une forêt, Skypiea un banc de nuages, l'Île des
Hommes-Poissons une bulle sous la surface, le Baratie une coque avec son
sillage, Marie-Joie une cité murée, Reverse Mountain un massif en courbes de
niveau que quatre canaux gravissent — le long de la Red Line, jamais à
travers la Calm Belt : c'est parce qu'on ne peut pas franchir la ceinture
que la montagne est la seule entrée.

Ce qu'on voit est l'île elle-même. Sa taille suit une échelle de huit rangs, du continent
(Elbaf, Wano) au lieu-dit, et son terrain dit sa nature : désert pour
Alabasta, neige pour Drum, toits pour Water Seven, feu et glace pour Punk
Hazard.

Ce qui n'est pas une île n'en reçoit pas le dessin : Zou est un éléphant,
Reverse Mountain une montagne à quatre courants, Marie-Joie une couronne,
Red Port une ancre, la Calm Belt deux vagues. Les villes posées sur une île
plus grande — Fuchsia sur Dawn, Mock Town sur Jaya, Mokomo sur le dos de
Zunisha — sont des toits, pas une seconde côte.

Chaque fiche dit tout ce qu'on sait du lieu : son image, son nom japonais et
ses autres noms, sa mer et ce qu'elle est, son étendue et son terrain, son
quadrant et son écart à la Red Line, l'escale d'où l'on vient avec la
distance et le cap, celle où l'on va, ses figures, sa première apparition,
ce que l'équipage y a fait et le temps qu'il y a passé — d'un jour à
Loguetown aux deux ans de Rusukaina. Grand Line est nommée pour ce qu'elle est : une seule route,
coupée en deux par la Red Line, Paradise d'un côté et le Nouveau Monde de
l'autre. Les Calm Belts la bordent. Les lieux qui ne sont pas des îles de
terre — le ciel, le fond marin, une île vivante, un navire, un ouvrage, une
zone de mer, un lieu détruit — portent un pictogramme qui dit leur nature.

Site statique, fonctionne hors-ligne, aucun appel réseau à l'exécution.

## Lancer en local

```sh
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Reconstruire les données

Quatre étapes, à lancer dans l'ordre. Rien n'est nécessaire pour simplement
consulter le site : `data/islands.json` est livré prêt à l'emploi.

```sh
node tools/fetch-opmaps.mjs        # relevé op-maps → tools/_opmaps.json
node tools/extract-positions.mjs   # carte de repli → data/positions.json
node tools/fetch-wiki.mjs          # wiki Fandom → tools/_wiki-cache.json
node tools/fetch-images.mjs        # paysages    → data/img/*.webp
node tools/build-data.mjs          # croisement  → data/islands.json
node tools/data-audit.mjs          # cohérence du jeu livré
```

`fetch-wiki.mjs` et `fetch-images.mjs` gardent un cache : relancés, ils ne
redemandent que ce qui manque.

## Contrôle du jeu de données

```sh
node tools/audit.mjs                  # cohérence du jeu de données
node --test "tools/**/*.test.mjs"    # lecteur wikitexte + faits canon
```

Deux contrôles complémentaires.

`audit.mjs` croise la région déclarée par le wiki avec la position issue de
la carte — deux sources sans rapport — puis vérifie l'ordre des sagas, les
quadrants, les moitiés de Grand Line et la cohérence interne.

`canon.test.mjs` confronte les données aux faits que le récit impose :
Marie-Joie à l'aplomb de l'Île des Hommes-Poissons, Reverse Mountain au
croisement de la Red Line et de Grand Line, Amazon Lily et Impel Down dans
la Calm Belt, Onigashima au large de Wano, Skypiea au-dessus de Jaya,
Laugh Tale après Lodestar. Aucune carte ne prime sur ces contraintes : une
carte qui en viole une est fausse, quelle que soit sa source.

## Tests

```sh
node --test "tools/**/*.test.mjs"
```

## Ajouter une île

Ouvrir `tools/curation.mjs`, ajouter une ligne au tableau `PLACES` :

```js
{ src: "Nom exact dans data/positions.json",
  fr: "Nom affiché",
  wiki: "Titre_de_la_page_wiki",
  saga: "east-blue",   // voir SAGAS en haut du fichier
  step: null,          // rang dans le voyage, ou null
  tag: "story",        // crew | story | character
  note: "Une phrase de contexte." }
```

Puis relancer `fetch-wiki.mjs` et `build-data.mjs`.

Si l'île n'existe pas dans la carte source, mettre `src: null` et fournir
`lat`, `lng` et `location` à la main — c'est ce qui est fait pour Laugh Tale,
dont la position est inconnue dans l'œuvre.

## Structure

```
index.html
src/
  app.js        globe, sélection, recherche, filtres, lecture du voyage
  texture.js    peint la sphère en canvas équirectangulaire
  style.css
data/
  islands.json  jeu de données livré
  positions.json
tools/          pipeline hors ligne, jamais chargé par le navigateur
vendor/
  globe.gl.min.js
```

## Provenance

Le site n'affiche aucune mention de source : elles ont été retirées de
l'interface à la demande. Elles restent consignées ici, parce que la chaîne
de fabrication en dépend et qu'une licence CC BY-SA les impose à qui
redistribue le contenu.

- **Positions et contours** — [op-maps.com](https://www.op-maps.com/fr).
  Leur relevé publie, pour cent quarante-cinq îles, une position et le
  contour du dessin. Son repère est une projection équirectangulaire tournée
  d'un quart de tour, et il se vérifie : les deux croisements de la Red Line
  y tombent à 180,00° l'un de l'autre, Sabaody à six degrés d'arc de l'Île
  des Hommes-Poissons qu'elle surplombe, et les quatre Blues occupent chacun
  le bon quadrant. Soixante-quatre de nos lieux en viennent, contour et
  étendue compris ; les dix-neuf autres — des villes prises dans une île,
  des étendues de mer — sont rattachés à celui qui les porte.
- **Positions de repli** — [The Library of Ohara](https://thelibraryofohara.com/one-piece-world-map/),
  par Artur & Ririjuro, pour les lieux qu'op-maps ne liste pas.
- **Fiches et images** — [One Piece Encyclopédie](https://onepiece.fandom.com/fr).
  Les textes sont sous CC BY-SA 3.0. Les images d'infobox illustrent l'œuvre
  d'Eiichiro Oda et de la Toei : usage personnel uniquement.
- **Rendu** — [globe.gl](https://github.com/vasturiano/globe.gl) 2.46.1 (three.js inclus).
- **Durées d'escale** — l'œuvre ne compte presque jamais les jours. Chaque
  durée déclare son origine : `récit` quand elle est énoncée dans l'œuvre —
  les deux ans de la séparation, et rien d'autre — et `estimation` quand elle
  est reconstituée d'après ce que l'arc montre. Huit sont établies,
  trente-sept estimées, trente-huit lieux n'en portent aucune. L'interface
  affiche la mention.
- **Récits d'escale** — écrits à la main, limités à ce que l'œuvre montre.

Projet de fan, sans lien avec Eiichiro Oda ni Shueisha.

La conception détaillée, la calibration de la projection et son contrôle sont
dans `docs/superpowers/specs/2026-08-07-one-piece-globe-design.md`.
