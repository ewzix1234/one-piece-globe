/**
 * Croise positions, curation et fiches wiki en un seul fichier livré
 * avec le site : data/islands.json.
 *
 * À lancer après extract-positions.mjs et fetch-wiki.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PLACES, SAGAS, PEOPLE } from "./curation.mjs";

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
function normaliseSea(raw, lat, lng) {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("new world") || s.includes("nouveau monde")) return "Nouveau Monde";
  if (s.includes("paradise") || s.includes("paradis")) return "Paradise";
  if (s.includes("east blue")) return "East Blue";
  if (s.includes("west blue")) return "West Blue";
  if (s.includes("north blue")) return "North Blue";
  if (s.includes("south blue")) return "South Blue";
  if (s.includes("red line")) return "Red Line";
  if (s.includes("calm belt")) return "Calm Belt";
  if (s.includes("grand line")) return "Grand Line";
  if (s.includes("sky")) return "Ciel";
  // Sans indication, on déduit du quadrant : l'équateur est Grand Line,
  // les méridiens de la Red Line séparent les paires de Blues.
  if (Math.abs(lat) < 8) return "Grand Line";
  const east = lng > -3.5 && lng < 176.5;
  if (lat > 0) return east ? "East Blue" : "North Blue";
  return east ? "South Blue" : "West Blue";
}

const errors = [];
const islands = [];

for (const place of PLACES) {
  const pos = place.src ? byName.get(place.src) : null;
  if (place.src && !pos) {
    errors.push(`position introuvable pour « ${place.src} » (${place.fr})`);
    continue;
  }

  const lat = pos ? pos.lat : place.lat;
  const lng = pos ? pos.lng : place.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    errors.push(`coordonnées manquantes pour « ${place.fr} »`);
    continue;
  }

  const w = wiki[place.wiki] ?? null;

  // Les noms se cherchent dans les deux langues : « Wano » doit trouver
  // « Pays des Wa », « Fishman » doit trouver « Île des Hommes-Poissons ».
  const aliases = [
    place.src,
    ...(place.alias ?? []),
    w?.title,
    w?.nameRomaji,
    w?.nameJp,
  ]
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.toLowerCase() !== place.fr.toLowerCase());
  // `ownNoteOnly` : la page du wiki est partagée avec un autre lieu, ou
  // ne parle pas vraiment de celui-ci. On ne garde alors que notre note.
  const summary = place.ownNoteOnly ? null : (w?.summary ?? null);

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
    nameJp: w?.nameJp ?? null,
    nameRomaji: w?.nameRomaji ?? null,
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
    sea: normaliseSea(pos?.location ?? place.location ?? w?.region, lat, lng),
    saga: place.saga,
    step: place.step,
    tag: place.tag,
    scale: pos?.scale ?? place.scale ?? 3,
    chapter: w?.chapter ?? null,
    episode: w?.episode ?? null,
    ruler: w?.ruler ?? null,
    affiliation: w?.affiliation ?? null,
    note: place.note ?? null,
    summary,
    image: images[place.wiki] ? `data/img/${images[place.wiki].file}` : null,
    wikiTitle: w?.title ?? null,
    wikiLang: w?.wikiId ?? null,
  });
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
  credits: {
    positions: {
      label: "The Library of Ohara — One Piece World Map",
      authors: "Artur & Ririjuro",
      url: "https://thelibraryofohara.com/one-piece-world-map/",
    },
    content: {
      label: "One Piece Encyclopédie (Fandom)",
      licence: "CC BY-SA 3.0",
      url: "https://onepiece.fandom.com/fr",
    },
  },
  islands,
};

writeFileSync(
  join(HERE, "..", "data", "islands.json"),
  JSON.stringify(payload, null, 1),
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
