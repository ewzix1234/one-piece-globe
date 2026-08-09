/**
 * Croise positions, curation et fiches wiki en un seul fichier livré
 * avec le site : data/islands.json.
 *
 * À lancer après extract-positions.mjs et fetch-wiki.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PLACES,
  SAGAS,
  PEOPLE,
  KINDS,
  PLACE_KIND,
  PLACE_SIZE,
  PLACE_TERRAIN,
  ARCHIPELAGOS,
  CREW_STOPS,
} from "./curation.mjs";
import {
  RED_LINE_LNG,
  GRAND_LINE_HALF_WIDTH,
  CALM_BELT_OUTER,
  paintedHalfHeight,
} from "../src/texture.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const positions = read(join(HERE, "..", "data", "positions.json"));
const cachePath = join(HERE, "_wiki-cache.json");
if (!existsSync(cachePath)) {
  console.error("data wiki absente — lance d'abord : node tools/fetch-wiki.mjs");
  process.exit(1);
}
const wiki = read(cachePath);
const imagesPath = join(HERE, "..", "data", "images.json");
const images = existsSync(imagesPath) ? read(imagesPath) : {};
const byName = new Map(positions.map((p) => [p.name, p]));

/** Normalise la mer d'appartenance en une poignée de valeurs affichables. */
/**
 * Moitié de Grand Line où tombe une longitude.
 *
 * « Grand Line » n'est pas une zone qu'on peut afficher : c'est la route
 * entière, et elle est coupée en deux par la Red Line. Entre les deux
 * méridiens on est dans Paradise, au-delà dans le Nouveau Monde. Laisser
 * « Grand Line » sur une fiche revient à ne rien dire.
 */
const grandLineHalf = (lng) =>
  lng > RED_LINE_LNG[0] && lng < RED_LINE_LNG[1] ? "Paradise" : "Nouveau Monde";

function normaliseSea(raw, lat, lng, name) {
  // « Calm Belt » désigne la ceinture elle-même, pas Grand Line qu'elle borde.
  if (name === "Calm Belt") return "Calm Belt";
  const s = (raw ?? "").toLowerCase();
  // Le ciel se lit avant tout le reste : « Nomad, Sky » ne doit pas être
  // ramené au quadrant qu'il survole.
  if (s.includes("sky")) return "Ciel";
  // « Red Line/Paradise » désigne le continent, pas la mer qu'il borde :
  // le contrôle passe avant celui des deux moitiés de Grand Line.
  if (s.includes("red line")) return "Red Line";
  if (s.includes("new world") || s.includes("nouveau monde")) return "Nouveau Monde";
  if (s.includes("paradise") || s.includes("paradis")) return "Paradise";
  if (s.includes("east blue")) return "East Blue";
  if (s.includes("west blue")) return "West Blue";
  if (s.includes("north blue")) return "North Blue";
  if (s.includes("south blue")) return "South Blue";
  if (s.includes("calm belt")) return "Calm Belt";
  if (s.includes("grand line")) return grandLineHalf(lng);
  // Sans indication, on déduit du quadrant : l'équateur est Grand Line,
  // les méridiens de la Red Line séparent les paires de Blues.
  if (Math.abs(lat) < 8) return grandLineHalf(lng);
  const east = lng > RED_LINE_LNG[0] && lng < RED_LINE_LNG[1];
  if (lat > 0) return east ? "East Blue" : "North Blue";
  return east ? "South Blue" : "West Blue";
}

/**
 * Ramène un lieu dans la bande qui lui revient.
 *
 * La carte source écarte les îles de l'équateur pour qu'on lise leurs noms.
 * Peintes à leur vraie taille, les plus grandes débordaient alors sur la
 * Calm Belt — trente-huit sur quarante-neuf — et la carte affirmait qu'on
 * peut accoster Wano dans une ceinture réputée infranchissable.
 *
 * On corrige la latitude, pas la taille : un lieu garde son étendue, et
 * c'est son centre qui recule assez pour que sa côte reste dans sa bande.
 * Les petites îles gardent presque tout leur écart ; seules les plus
 * grandes viennent se poser sur la route, ce qui est d'ailleurs ce que
 * l'œuvre montre.
 */
function fitToBand(lat, sea, scale) {
  const half = paintedHalfHeight(scale);
  const sign = lat < 0 ? -1 : 1;

  if (sea === "Paradise" || sea === "Nouveau Monde") {
    const room = Math.max(0, GRAND_LINE_HALF_WIDTH - half);
    return sign * Math.min(Math.abs(lat), room);
  }
  if (sea === "Calm Belt") {
    const inner = GRAND_LINE_HALF_WIDTH + half;
    const outer = Math.max(inner, CALM_BELT_OUTER - half);
    return sign * Math.min(outer, Math.max(inner, Math.abs(lat)));
  }
  return lat;
}

/** Table inverse du terrain : un lieu → son terrain. */
const TERRAIN_BY_PLACE = new Map();
for (const [terrain, names] of Object.entries(PLACE_TERRAIN)) {
  for (const name of names) TERRAIN_BY_PLACE.set(name, terrain);
}

const errors = [];
const islands = [];
const regions = new Map();

for (const place of PLACES) {
  const pos = place.src ? byName.get(place.src) : null;
  if (place.src && !pos) {
    errors.push(`position introuvable pour « ${place.src} » (${place.fr})`);
    continue;
  }

  // Une position peut être reprise à la carte source, ou fixée ici quand
  // le récit impose un emplacement que la carte rend approximativement.
  // L'override est toujours motivé en commentaire dans curation.mjs.
  const lat = place.lat ?? pos?.lat;
  const lng = place.lng ?? pos?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    errors.push(`coordonnées manquantes pour « ${place.fr} »`);
    continue;
  }

  const w = wiki[place.wiki] ?? null;

  // Les noms se cherchent dans les deux langues : « Wano » doit trouver
  // « Pays des Wa », « Fishman » doit trouver « Île des Hommes-Poissons ».
  // Quand la page du wiki est partagée avec un autre lieu, ses noms
  // appartiennent à l'autre : les reprendre rendrait la recherche ambiguë —
  // « Marinfōdo » renvoyait à la fois Marine Ford et le Nouveau Marine Ford.
  const aliases = [
    place.src,
    ...(place.alias ?? []),
    ...(place.ownNoteOnly ? [] : [w?.title, w?.nameRomaji, w?.nameJp]),
  ]
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.toLowerCase() !== place.fr.toLowerCase());
  // `ownNoteOnly` : la page du wiki est partagée avec un autre lieu, ou
  // ne parle pas vraiment de celui-ci. On ne garde alors que notre note.
  // Un résumé peut être réécrit dans la curation quand celui de la source
  // est tronqué ou bancal.
  const summary = place.summary ?? (place.ownNoteOnly ? null : (w?.summary ?? null));

  const scale = PLACE_SIZE[place.fr] ?? pos?.scale ?? place.scale ?? 3;
  const sea =
    place.sea ??
    normaliseSea(pos?.location ?? place.location ?? w?.region, lat, lng, place.fr);
  // Les lieux sans terre peinte n'ont pas à être recadrés : une bulle, un
  // banc de nuages ou une coque ne prétendent pas être une côte.
  const painted = !["zone", "seafloor", "ship", "sky", "settlement"].includes(
    PLACE_KIND[place.fr],
  );
  const fitted = painted ? fitToBand(lat, sea, scale) : lat;

  islands.push({
    id: place.fr
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    name: place.fr,
    aliases: [...new Set(aliases)],
    people: PEOPLE[place.fr] ?? [],
    nameJp: place.ownNoteOnly ? null : (w?.nameJp ?? null),
    nameRomaji: place.ownNoteOnly ? null : (w?.nameRomaji ?? null),
    lat: Number(fitted.toFixed(4)),
    lng: Number(lng.toFixed(4)),
    sea,
    saga: place.saga,
    step: place.step,
    tag: place.tag,
    // Nature du lieu quand ce n'est pas une île de terre ordinaire.
    kind: PLACE_KIND[place.fr] ?? null,
    // Ce que l'équipage y a fait, et combien de temps il y est resté.
    deed: CREW_STOPS[place.fr]?.deed ?? null,
    days: CREW_STOPS[place.fr]?.days ?? null,
    // « récit » : la durée est énoncée dans l'œuvre. « estimation » : elle
    // est reconstituée d'après l'arc. La distinction est affichée.
    daysBasis: CREW_STOPS[place.fr]?.days
      ? (CREW_STOPS[place.fr].daysBasis ?? "estimation")
      : null,
    // La taille vient de ce que l'œuvre montre, pas du rang de l'arc dans
    // la carte source ; à défaut, on retombe sur le rang.
    scale,
    terrain: TERRAIN_BY_PLACE.get(place.fr) ?? "forest",
    archipelago: ARCHIPELAGOS.has(place.fr) || undefined,
    chapter: w?.chapter ?? null,
    episode: w?.episode ?? null,
    ruler: w?.ruler ?? null,
    affiliation: w?.affiliation ?? null,
    // Quand l'escale a son récit, la note d'une ligne le redisait en plus
    // court juste en dessous : on garde le récit et on laisse tomber l'écho.
    note: CREW_STOPS[place.fr]?.deed ? null : (place.note ?? null),
    summary,
    image: images[place.wiki] ? `data/img/${images[place.wiki].file}` : null,
  });
  // Région déclarée par la source, gardée hors du fichier livré : elle sert
  // au contrôle de placement, pas à l'affichage.
  regions.set(place.fr, w?.region ?? null);
}

// Une nature attribuée à un nom qui n'existe pas ne se verrait jamais :
// la faute de frappe passerait pour un lieu ordinaire.
for (const name of Object.keys(PLACE_KIND)) {
  if (!islands.some((i) => i.name === name)) {
    errors.push(`nature attribuée à un lieu inconnu : « ${name} »`);
  }
}
for (const [name, kind] of Object.entries(PLACE_KIND)) {
  if (!KINDS[kind]) errors.push(`nature inconnue « ${kind} » pour ${name}`);
}
// Une taille, un terrain ou une grappe attribués à un nom qui n'existe pas
// resteraient invisibles : la faute de frappe passerait inaperçue.
const known = new Set(islands.map((i) => i.name));
for (const name of Object.keys(PLACE_SIZE)) {
  if (!known.has(name)) errors.push(`taille attribuée à un lieu inconnu : « ${name} »`);
}
for (const name of TERRAIN_BY_PLACE.keys()) {
  if (!known.has(name)) errors.push(`terrain attribué à un lieu inconnu : « ${name} »`);
}
for (const name of ARCHIPELAGOS) {
  if (!known.has(name)) errors.push(`grappe attribuée à un lieu inconnu : « ${name} »`);
}
for (const name of Object.keys(CREW_STOPS)) {
  if (!known.has(name)) errors.push(`escale attribuée à un lieu inconnu : « ${name} »`);
}
// Une escale de la route sans récit laisserait un trou au milieu du voyage.
// Une durée sans origine déclarée passerait pour un fait.
for (const island of islands) {
  if (island.days && !["récit", "estimation"].includes(island.daysBasis)) {
    errors.push(`durée sans origine pour « ${island.name} »`);
  }
}
for (const island of islands) {
  if (island.step && !CREW_STOPS[island.name]) {
    errors.push(`escale n° ${island.step} sans récit : « ${island.name} »`);
  }
}
for (const island of islands) {
  if (!PLACE_SIZE[island.name]) errors.push(`taille manquante pour « ${island.name} »`);
}

if (errors.length) {
  console.error("erreurs :");
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}

islands.sort((a, b) => {
  if (a.step && b.step) return a.step - b.step;
  if (a.step) return -1;
  if (b.step) return 1;
  return a.name.localeCompare(b.name, "fr");
});

const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  sagas: SAGAS,
  kinds: KINDS,
  islands,
};

writeFileSync(
  join(HERE, "..", "data", "islands.json"),
  JSON.stringify(payload, null, 1),
);

// Table de contrôle, jamais chargée par le site.
writeFileSync(
  join(HERE, "_regions.json"),
  JSON.stringify(Object.fromEntries(regions), null, 1),
);

const stats = {
  total: islands.length,
  visitées: islands.filter((i) => i.tag === "crew").length,
  "étapes du voyage": islands.filter((i) => i.step).length,
  "avec résumé": islands.filter((i) => i.summary || i.note).length,
  "avec nom japonais": islands.filter((i) => i.nameJp).length,
  "avec chapitre": islands.filter((i) => i.chapter).length,
};
console.log("data/islands.json écrit");
for (const [k, v] of Object.entries(stats)) console.log(`  ${k} : ${v}`);
const bySea = {};
for (const i of islands) bySea[i.sea] = (bySea[i.sea] ?? 0) + 1;
console.log("  par mer :", bySea);
