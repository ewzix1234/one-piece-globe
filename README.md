# Blue Star

Globe interactif du monde de One Piece. 83 îles posées sur la sphère à leur
position canon, de Fuchsia à Elbaf.

Tourne à la souris, zoome à la molette, clique une île pour ouvrir sa fiche.
Le Log Pose en bas à gauche donne le cap d'une escale vers la suivante.

Chaque île porte une image de paysage, sa fiche, ses personnages et sa
position exacte. Le globe distingue Paradise du Nouveau Monde de part et
d'autre de la Red Line, et fait ressortir les Calm Belts.

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

`fetch-wiki.mjs` garde un cache : relancé, il ne redemande que les fiches absentes.

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
  app.js        globe, sélection, recherche, filtres, Log Pose
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
