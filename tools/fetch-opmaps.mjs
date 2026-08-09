/**
 * Récupère le relevé d'op-maps.com et le met en cache.
 *
 * Cette source publie, pour chaque île, une position dans un repère à elle
 * et — c'est ce qui la distingue — le contour du dessin. Contrairement à la
 * carte d'Ohara, son repère se laisse vérifier : voir `tools/opmaps.mjs`.
 *
 * À lancer avant build-data.mjs. Le cache est versionné avec le dépôt pour
 * que la construction reste possible hors ligne.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const API = "https://api.op-maps.com/islands";

const res = await fetch(API);
if (!res.ok) {
  console.error(`op-maps indisponible (HTTP ${res.status})`);
  process.exit(1);
}
const islands = await res.json();
if (!Array.isArray(islands) || islands.length < 100) {
  console.error("relevé inattendu : ", islands?.length);
  process.exit(1);
}

writeFileSync(join(HERE, "_opmaps.json"), JSON.stringify(islands, null, 1));
console.log(`tools/_opmaps.json écrit — ${islands.length} lieux`);
console.log(`  avec contour : ${islands.filter((i) => i.shape?.length > 2).length}`);
