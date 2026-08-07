/**
 * Extrait les positions des lieux depuis les données de la carte Leaflet
 * de The Library of Ohara, et les convertit en coordonnées sphériques.
 *
 * Source : https://onepieceworldmap.com/ (Artur & Ririjuro)
 * Seules les positions sont reprises. Descriptions et métadonnées
 * proviennent du wiki Fandom (voir fetch-wiki.mjs).
 *
 * La carte source est en projection équirectangulaire : Grand Line = équateur,
 * Red Line = deux méridiens opposés. Constantes calibrées sur ces invariants —
 * voir verify-projection.mjs pour le contrôle.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// --- Calibration de la projection ---------------------------------------
// MAP_WIDTH : largeur du monde en unités carte. Fixée pour que les deux
// méridiens de la Red Line (x≈34800 et x≈70300) tombent à 180° d'écart.
export const MAP_WIDTH = 71000;
// EQUATOR_Y : ordonnée de Grand Line, moyenne des îles de Paradise/New World.
export const EQUATOR_Y = 25200;
// POLE_SPAN : distance en unités carte entre l'équateur et un pôle.
export const POLE_SPAN = 22500;

/** Convertit une coordonnée carte en longitude/latitude sphérique. */
export function toLatLng(x, y) {
  let lng = (x / MAP_WIDTH) * 360 - 180;
  // Le monde s'enroule : on ramène dans [-180, 180].
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  const lat = ((y - EQUATOR_Y) / POLE_SPAN) * 90;
  return { lat: Math.max(-89.5, Math.min(89.5, lat)), lng };
}

// Couches à l'échelle du monde. Les couches `data<Taille><Île>` sont des plans
// de détail en coordonnées locales — elles n'ont pas de sens ici.
const WORLD_LAYERS = [
  "dataMini",
  "dataTiny",
  "dataSmall",
  "dataMiddle",
  "dataGiant",
  "dataUnkown",
  "dataUnkownTiny",
  "dataNoExist",
  "dataNoExistTiny",
  "dataSpecialWCI",
  "dataSpecialOnigashima",
  "dataSpecialWano",
  "dataSpecialWaterSeven",
  "dataSpecialZou",
  "dataSpecialSkypea",
  "dataSpecialEgghead",
  "dataSpecialPunkHazard",
  "dataSpecialEnieslobby",
  "dataSpecialSabaody",
  "dataSpecialFishman",
  "dataSpecialMarygeoise",
  "dataSpecialDressrosa",
  "dataSpecialElbaph",
  "dataSpecialDrum",
  "dataSpecialImpeldown",
  "dataSpecialThrillerbark",
  "dataSpecialMarineford",
  "dataSpecialArabasta",
];

// Tailles de marqueur héritées de la carte source, utiles pour hiérarchiser
// l'affichage : une île géante mérite un point plus gros qu'un hameau.
const LAYER_SCALE = {
  dataMini: 1,
  dataTiny: 2,
  dataSmall: 3,
  dataMiddle: 4,
  dataGiant: 5,
  dataUnkown: 2,
  dataUnkownTiny: 1,
  dataNoExist: 3,
  dataNoExistTiny: 2,
};

const flattenCoords = (a) =>
  Array.isArray(a[0]) ? a.flatMap(flattenCoords) : [a];

/** Nettoie le HTML résiduel des libellés de la carte source. */
function stripHtml(s) {
  return String(s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractPositions(sourcePath) {
  const src = readFileSync(sourcePath, "utf8");
  const declared = [...src.matchAll(/^const (data[A-Za-z0-9_]+)/gm)].map(
    (m) => m[1],
  );
  const wanted = WORLD_LAYERS.filter((l) => declared.includes(l));
  const missing = WORLD_LAYERS.filter((l) => !declared.includes(l));
  if (missing.length) {
    console.warn(`  couches absentes de la source : ${missing.join(", ")}`);
  }

  // La source est un script de déclarations `const`. On l'évalue puis on
  // récupère les collections nommées. Pas d'accès réseau ni de fs dedans.
  const collections = new Function(`${src}\n;return {${wanted.join(",")}};`)();

  const out = [];
  for (const [layer, fc] of Object.entries(collections)) {
    for (const feature of fc?.features ?? []) {
      const geom = feature.geometry;
      const props = feature.properties ?? {};
      if (!geom) continue;

      const points = (
        geom.type === "Point" ? [geom.coordinates] : flattenCoords(geom.coordinates)
      ).filter((c) => Array.isArray(c) && typeof c[0] === "number");
      if (!points.length) continue;

      // Un polygone est ramené à son centre : c'est là que se posera le marqueur.
      const x = points.reduce((s, c) => s + c[0], 0) / points.length;
      const y = points.reduce((s, c) => s + c[1], 0) / points.length;

      const name = stripHtml(props.Name || props.Label);
      if (!name) continue;

      out.push({
        name,
        nameJp: stripHtml(props.japName) || null,
        location: stripHtml(props.location) || null,
        layer,
        scale: LAYER_SCALE[layer] ?? 4,
        x: Math.round(x),
        y: Math.round(y),
        ...toLatLng(x, y),
      });
    }
  }

  // Doublons : la source répète certains lieux sur plusieurs couches.
  // On garde l'occurrence de la plus grande échelle.
  const byName = new Map();
  for (const place of out) {
    const seen = byName.get(place.name);
    if (!seen || place.scale > seen.scale) byName.set(place.name, place);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

const SOURCE_URL = "https://onepieceworldmap.com/js/data.js";

/**
 * Le fichier source n'est pas versionné : c'est le jeu de données complet de
 * The Library of Ohara, textes et images compris, et on n'en reprend que les
 * positions. On le récupère à la demande.
 */
async function ensureSource(path) {
  if (existsSync(path)) return path;
  console.log(`source absente, téléchargement depuis ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "one-piece-globe/1.0 (projet personnel)" },
  });
  if (!res.ok) {
    throw new Error(
      `téléchargement impossible (HTTP ${res.status}). Récupère ${SOURCE_URL} à la main et enregistre-le en ${path}`,
    );
  }
  writeFileSync(path, await res.text());
  return path;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = await ensureSource(join(HERE, "_source-map-data.js"));
  const places = extractPositions(source);
  const dest = join(HERE, "..", "data", "positions.json");
  writeFileSync(dest, JSON.stringify(places, null, 1));
  console.log(`${places.length} lieux extraits → data/positions.json`);
  const bySea = {};
  for (const p of places) {
    const sea = (p.location ?? "?").split(",").pop().trim();
    bySea[sea] = (bySea[sea] ?? 0) + 1;
  }
  console.log(
    Object.entries(bySea)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([s, n]) => `  ${s}: ${n}`)
      .join("\n"),
  );
}
