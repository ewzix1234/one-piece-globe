# Blue Star

Globe interactif du monde de One Piece. 83 îles posées sur la sphère à leur
position canon, de Fuchsia à Elbaf.

Tourne à la souris, zoome à la molette ou au pincement — on peut reculer
jusqu'à voir la planète entière. Clique une île pour ouvrir sa fiche, ou
suis la route de l'équipage escale par escale avec les flèches.

**Revivre le voyage** rejoue la traversée de bout en bout : le Vogue Merry
puis, à partir d'Enies Lobby, le Thousand Sunny suivent la route, marquent un
temps d'arrêt à chaque escale et laissent une trace en pointillés rouges. À
la fin, les flèches reprennent la main.

Aucune pastille de couleur n'est posée sur la carte : ce qu'on voit est
l'île elle-même. Sa taille suit une échelle de huit rangs, du continent
(Elbaf, Wano) au lieu-dit, et son terrain dit sa nature : désert pour
Alabasta, neige pour Drum, toits pour Water Seven, feu et glace pour Punk
Hazard.

Ce qui n'est pas une île n'en reçoit pas le dessin : Zou est un éléphant,
Reverse Mountain une montagne à quatre courants, Marie-Joie une couronne,
Red Port une ancre, la Calm Belt deux vagues. Les villes posées sur une île
plus grande — Fuchsia sur Dawn, Mock Town sur Jaya, Mokomo sur le dos de
Zunisha — sont des toits, pas une seconde côte.

Chaque île porte une image de paysage, sa fiche, ses personnages et sa
position exacte. Grand Line est nommée pour ce qu'elle est : une seule route,
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
node tools/extract-positions.mjs   # carte source → data/positions.json
node tools/fetch-wiki.mjs          # wiki Fandom → tools/_wiki-cache.json
node tools/fetch-images.mjs        # paysages    → data/img/*.webp
node tools/build-data.mjs          # croisement  → data/islands.json
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

## Sources et crédits

- **Positions** — [The Library of Ohara — One Piece World Map](https://thelibraryofohara.com/one-piece-world-map/),
  par Artur & Ririjuro. Seules les positions sont reprises, converties en
  coordonnées sphériques. Ni leurs textes ni leurs images.
- **Fiches et images** — [One Piece Encyclopédie](https://onepiece.fandom.com/fr).
  Les textes sont sous CC BY-SA 3.0. Les images d'infobox illustrent l'œuvre
  d'Eiichiro Oda et de la Toei : usage personnel uniquement.
- **Rendu** — [globe.gl](https://github.com/vasturiano/globe.gl) 2.46.1 (three.js inclus).

Projet de fan, sans lien avec Eiichiro Oda ni Shueisha.

La conception détaillée, la calibration de la projection et son contrôle sont
dans `docs/superpowers/specs/2026-08-07-one-piece-globe-design.md`.
