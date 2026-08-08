/**
 * Contrôle mécanique du jeu de données livré.
 *
 * canon.test.mjs juge la géographie : ce que l'œuvre impose. Ce contrôle-ci
 * juge la cohérence interne — doublons, trous, champs contradictoires,
 * valeurs hors bornes. Il ne dit pas si une donnée est vraie, il dit si le
 * jeu se tient.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const { islands, sagas, kinds } = JSON.parse(
  readFileSync(join(HERE, "..", "data", "islands.json"), "utf8"),
);

const problems = [];
const notes = [];
const say = (list, name, detail) => list.push(`${name} — ${detail}`);

/* ── Unicité ──────────────────────────────────────────────────────────── */

const seen = new Map();
for (const i of islands) {
  if (seen.has(i.id)) say(problems, i.name, `identifiant en double : ${i.id}`);
  seen.set(i.id, i);
}

const byName = new Map();
for (const i of islands) {
  if (byName.has(i.name)) say(problems, i.name, "nom en double");
  byName.set(i.name, i);
}

// Un alias qui désigne deux îles rend la recherche ambiguë.
const aliasOwner = new Map();
for (const i of islands) {
  for (const a of i.aliases ?? []) {
    const key = a.toLowerCase();
    if (aliasOwner.has(key) && aliasOwner.get(key) !== i.name) {
      say(problems, i.name, `alias « ${a} » partagé avec ${aliasOwner.get(key)}`);
    }
    aliasOwner.set(key, i.name);
  }
  if ((i.aliases ?? []).some((a) => a.toLowerCase() === i.name.toLowerCase())) {
    say(problems, i.name, "alias identique au nom");
  }
}

/* ── Positions ────────────────────────────────────────────────────────── */

for (const i of islands) {
  if (!Number.isFinite(i.lat) || Math.abs(i.lat) > 90) say(problems, i.name, `latitude ${i.lat}`);
  if (!Number.isFinite(i.lng) || Math.abs(i.lng) > 180) say(problems, i.name, `longitude ${i.lng}`);
}

// Deux lieux distincts au même endroit se recouvrent sur la carte.
for (let a = 0; a < islands.length; a++) {
  for (let b = a + 1; b < islands.length; b++) {
    const A = islands[a];
    const B = islands[b];
    if (Math.abs(A.lat - B.lat) < 0.05 && Math.abs(A.lng - B.lng) < 0.05) {
      say(problems, A.name, `superposée à ${B.name}`);
    }
  }
}

/* ── Champs obligatoires et bornes ────────────────────────────────────── */

const SEAS = new Set([
  "East Blue", "West Blue", "North Blue", "South Blue",
  "Paradise", "Nouveau Monde", "Calm Belt", "Red Line", "Ciel",
]);
const TAGS = new Set(["crew", "story", "character"]);
const TERRAINS = new Set([
  "forest", "jungle", "desert", "snow", "city", "rock", "cake", "ash",
  "split", "mountain",
]);
const sagaIds = new Set(sagas.map((s) => s.id));

for (const i of islands) {
  if (!SEAS.has(i.sea)) say(problems, i.name, `mer inconnue : ${i.sea}`);
  if (!TAGS.has(i.tag)) say(problems, i.name, `rôle inconnu : ${i.tag}`);
  if (!sagaIds.has(i.saga)) say(problems, i.name, `saga inconnue : ${i.saga}`);
  if (!TERRAINS.has(i.terrain)) say(problems, i.name, `terrain inconnu : ${i.terrain}`);
  if (i.kind && !kinds[i.kind]) say(problems, i.name, `nature inconnue : ${i.kind}`);
  if (!(i.scale >= 1 && i.scale <= 8)) say(problems, i.name, `taille hors échelle : ${i.scale}`);
  if (i.days !== null && !["récit", "estimation"].includes(i.daysBasis)) {
    say(problems, i.name, "durée sans origine déclarée");
  }
  if (i.days === null && i.daysBasis !== null) {
    say(problems, i.name, "origine de durée sans durée");
  }
  if (i.step !== null && !i.deed) say(problems, i.name, `escale ${i.step} sans récit`);
  if (i.deed && i.deed.length < 40) say(problems, i.name, "récit trop court pour dire quoi que ce soit");
}

/* ── Route ────────────────────────────────────────────────────────────── */

const route = islands.filter((i) => i.step).sort((a, b) => a.step - b.step);
route.forEach((i, k) => {
  if (i.step !== k + 1) say(problems, i.name, `escale n° ${i.step} alors qu'on attend ${k + 1}`);
  if (i.tag !== "crew") say(problems, i.name, "escale de la route non marquée « crew »");
});

/* ── Cohérences croisées ──────────────────────────────────────────────── */

for (const i of islands) {
  // Une île du ciel dans une mer de surface, ou l'inverse.
  if (i.kind === "sky" && i.sea !== "Ciel") say(problems, i.name, `île céleste rangée en ${i.sea}`);
  if (i.sea === "Ciel" && i.kind !== "sky") say(problems, i.name, "mer du ciel sans nature céleste");
  // Un lieu qui n'est pas une terre ne peut pas porter un terrain de terre.
  if (["ship", "seafloor", "zone"].includes(i.kind) && i.terrain !== "forest") {
    say(notes, i.name, `terrain « ${i.terrain} » sur un lieu sans terre`);
  }
  // Un lieu jamais visité par l'équipage ne devrait pas porter de durée.
  if (i.days && i.tag === "story") say(notes, i.name, "durée sur un lieu de l'histoire, pas une escale");
}

/* ── Complétude ───────────────────────────────────────────────────────── */

const without = (field) => islands.filter((i) => !i[field]).map((i) => i.name);
const gaps = {
  "sans image": without("image"),
  "sans résumé": without("summary"),
  "sans chapitre": without("chapter"),
  "sans nom japonais": without("nameJp"),
};

/* ── Rapport ──────────────────────────────────────────────────────────── */

console.log(`${islands.length} lieux contrôlés\n`);
console.log(problems.length ? "PROBLÈMES" : "aucun problème");
for (const p of problems) console.log("  ✗ " + p);
if (notes.length) {
  console.log("\nÀ VÉRIFIER À L'ŒIL");
  for (const n of notes) console.log("  · " + n);
}
console.log("\nCOMPLÉTUDE");
for (const [label, list] of Object.entries(gaps)) {
  console.log(`  ${label} : ${list.length}${list.length && list.length <= 10 ? " — " + list.join(", ") : ""}`);
}
const basis = {};
for (const i of islands) if (i.days) basis[i.daysBasis] = (basis[i.daysBasis] ?? 0) + 1;
console.log("\nDURÉES");
console.log("  établies par le récit :", basis["récit"] ?? 0);
console.log("  estimées :", basis.estimation ?? 0);
console.log("  sans durée :", islands.filter((i) => !i.days).length);

process.exitCode = problems.length ? 1 : 0;
