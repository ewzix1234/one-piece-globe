/**
 * Contrôle du jeu de données livré.
 *
 * L'idée : ne pas croire les positions sur parole, mais les confronter à des
 * signaux qu'elles n'ont pas servi à produire. Un désaccord entre deux
 * sources indépendantes signale une erreur ; un accord ne prouve rien mais
 * réduit fortement le champ des fautes possibles.
 *
 *   1. Région du wiki contre position de la carte — le contrôle principal.
 *      Deux sources sans rapport : un désaccord ne peut pas venir d'une
 *      erreur partagée.
 *   2. Ordre des sagas le long de la route        — les escales ne doivent
 *      pas remonter dans la chronologie.
 *   3. Mer déclarée contre quadrant calculé       — la mer vient de la carte,
 *      le quadrant se déduit de la latitude et de la longitude.
 *   4. Moitiés de Grand Line                      — Paradise et Nouveau Monde
 *      de part et d'autre de la Red Line.
 *   5. Progression le long de la route            — pas de retour en arrière
 *      inexpliqué entre deux escales.
 *   6. Cohérence interne                          — identifiants uniques,
 *      champs obligatoires, fiches non vides.
 *
 * Un contrôle a été écarté après coup : comparer l'ordre des escales au
 * numéro de « première apparition ». Une île entre dans le récit bien avant
 * qu'on y accoste — Alabasta paraît au chapitre 113 et se visite au 157 —
 * si bien que ce test signalait six escales correctes comme fautives.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RED_LINE_LNG } from "../src/texture.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const { islands } = JSON.parse(
  readFileSync(join(HERE, "..", "data", "islands.json"), "utf8"),
);

const problems = [];
const notes = [];
const flag = (list, island, check, detail) =>
  list.push({ name: island.name, check, detail });

/** Degrés parcourus vers l'est depuis la Red Line : le sens de navigation. */
const eastward = (lng) => {
  let d = lng - RED_LINE_LNG[1];
  while (d < 0) d += 360;
  while (d >= 360) d -= 360;
  return d;
};

/** Quadrant déduit de la position seule, sans consulter la mer déclarée. */
function quadrant(island) {
  // Les Calm Belts s'étendent jusqu'à 9,5° : la bande équatoriale les inclut.
  if (Math.abs(island.lat) <= 10) return "route";
  // Entre les deux méridiens de la Red Line se trouvent East et South Blue.
  const between = island.lng > RED_LINE_LNG[0] && island.lng < RED_LINE_LNG[1];
  if (island.lat > 0) return between ? "East Blue" : "North Blue";
  return between ? "South Blue" : "West Blue";
}

/* 1 — Région déclarée par le wiki contre position sur la carte ---------- */

// Le contrôle le plus solide : la région vient du wiki, la position de la
// carte d'Ohara. Les deux sources n'ont rien en commun, donc un désaccord
// ne peut pas venir d'une erreur partagée.
//
// À ne pas confondre avec un contrôle sur le numéro de chapitre : la
// « première apparition » est le moment où l'île entre dans le récit, pas
// celui où l'équipage y accoste. Alabasta paraît au chapitre 113 et se
// visite au 157 ; comparer les deux ne prouve rien.
const REGION_KEYS = [
  [/paradis/i, "Paradise"],
  [/nouveau monde|new world/i, "Nouveau Monde"],
  [/east blue/i, "East Blue"],
  [/west blue/i, "West Blue"],
  [/north blue/i, "North Blue"],
  [/south blue/i, "South Blue"],
  [/calm belt/i, "Calm Belt"],
  [/red line/i, "Red Line"],
];

for (const island of islands) {
  if (!island.wikiRegion) continue;
  const hit = REGION_KEYS.find(([re]) => re.test(island.wikiRegion));
  if (!hit) continue;
  const fromWiki = hit[1];

  // Les deux moitiés de Grand Line et les bandes qui la longent se
  // recouvrent : on ne compare que ce qui est comparable.
  const equivalent =
    fromWiki === island.sea ||
    (["Paradise", "Nouveau Monde", "Grand Line", "Calm Belt", "Red Line"].includes(fromWiki) &&
      ["Paradise", "Nouveau Monde", "Grand Line", "Calm Belt", "Red Line"].includes(island.sea));

  if (!equivalent) {
    flag(
      problems,
      island,
      "région wiki contre position",
      `le wiki dit « ${island.wikiRegion} », la carte place l'île en ${island.sea} (lat ${island.lat}°, lng ${island.lng}°)`,
    );
  }
}

const route = islands.filter((i) => i.step).sort((a, b) => a.step - b.step);

/* 1 bis — Les escales suivent l'ordre des sagas ------------------------- */

const SAGA_ORDER = [
  "east-blue", "alabasta", "skypiea", "water-seven", "thriller-bark",
  "summit-war", "fishman", "dressrosa", "whole-cake", "wano", "final", "lore",
];
const rank = (s) => SAGA_ORDER.indexOf(s);
for (let k = 1; k < route.length; k++) {
  if (rank(route[k].saga) < rank(route[k - 1].saga)) {
    flag(
      problems,
      route[k],
      "ordre des sagas",
      `escale ${route[k].step} rattachée à « ${route[k].saga} » après « ${route[k - 1].saga} »`,
    );
  }
}

/* 2 — Mer déclarée contre quadrant calculé ------------------------------ */

const ROUTE_SEAS = new Set([
  "Grand Line",
  "Paradise",
  "Nouveau Monde",
  "Red Line",
  "Calm Belt",
  "Ciel",
]);
for (const island of islands) {
  const q = quadrant(island);
  const declared = island.sea;
  if (q === "route") {
    if (!ROUTE_SEAS.has(declared)) {
      flag(
        problems,
        island,
        "mer contre position",
        `déclarée « ${declared} » mais posée sur l'équateur (lat ${island.lat}°)`,
      );
    }
  } else if (ROUTE_SEAS.has(declared)) {
    if (declared !== "Ciel" && declared !== "Calm Belt" && declared !== "Red Line") {
      flag(
        problems,
        island,
        "mer contre position",
        `déclarée « ${declared} » mais hors de l'équateur (lat ${island.lat}°, quadrant ${q})`,
      );
    }
  } else if (declared !== q) {
    flag(
      problems,
      island,
      "mer contre quadrant",
      `déclarée « ${declared} », le quadrant donne « ${q} »`,
    );
  }
}

/* 3 — Paradise et Nouveau Monde du bon côté de la Red Line -------------- */

for (const island of islands.filter((i) => i.sea === "Paradise")) {
  const inParadise =
    island.lng > RED_LINE_LNG[0] && island.lng < RED_LINE_LNG[1];
  if (!inParadise) {
    flag(
      problems,
      island,
      "moitié de Grand Line",
      `donnée en Paradise mais située du côté Nouveau Monde (lng ${island.lng}°)`,
    );
  }
}
for (const island of islands.filter((i) => i.sea === "Nouveau Monde")) {
  const inParadise =
    island.lng > RED_LINE_LNG[0] && island.lng < RED_LINE_LNG[1];
  if (inParadise) {
    flag(
      problems,
      island,
      "moitié de Grand Line",
      `donnée en Nouveau Monde mais située du côté Paradise (lng ${island.lng}°)`,
    );
  }
}

/* 4 — Progression le long de la route ----------------------------------- */

// Après l'Île des Hommes-Poissons, l'équipage avance vers l'est sans revenir.
const newWorldRoute = route.filter((i) => i.step >= 30);
for (let k = 1; k < newWorldRoute.length; k++) {
  const prev = newWorldRoute[k - 1];
  const here = newWorldRoute[k];
  const back = eastward(prev.lng) - eastward(here.lng);
  // Un lieu imbriqué dans le précédent recule un peu — Onigashima est
  // dans Wano, l'Île Cacao dans Totto Land. Un archipel fait une dizaine
  // de degrés : on ne signale qu'au-delà.
  if (back > 12) {
    flag(
      problems,
      here,
      "recul sur la route",
      `escale ${here.step} revient de ${back.toFixed(0)}° vers la Red Line par rapport à ${prev.name}`,
    );
  }
}

/* 5 — Cohérence interne -------------------------------------------------- */

const ids = new Set();
for (const island of islands) {
  if (ids.has(island.id)) flag(problems, island, "identifiant", "en double");
  ids.add(island.id);

  for (const field of ["name", "lat", "lng", "sea", "saga", "tag"]) {
    if (island[field] === undefined || island[field] === null) {
      flag(problems, island, "champ manquant", field);
    }
  }
  if (!island.summary && !island.note) {
    flag(problems, island, "fiche vide", "ni résumé ni note");
  }
  if (!island.image) flag(notes, island, "image", "absente");
  if (!island.chapter) flag(notes, island, "chapitre", "inconnu");
  if (Math.abs(island.lat) > 89 || Math.abs(island.lng) > 180) {
    flag(problems, island, "coordonnées", `lat ${island.lat}, lng ${island.lng}`);
  }
}

const steps = route.map((i) => i.step);
const expected = [...Array(steps.length).keys()].map((n) => n + 1);
if (steps.join(",") !== expected.join(",")) {
  problems.push({
    name: "(route)",
    check: "numérotation",
    detail: `les escales devraient aller de 1 à ${steps.length} sans trou : ${steps.join(",")}`,
  });
}

/* Rapport --------------------------------------------------------------- */

console.log(`${islands.length} îles contrôlées\n`);

if (problems.length) {
  console.log(`ANOMALIES (${problems.length})`);
  for (const p of problems) {
    console.log(`  ✗ ${p.name} — ${p.check}\n      ${p.detail}`);
  }
} else {
  console.log("Aucune anomalie.");
}

if (notes.length) {
  console.log(`\nLacunes tolérées (${notes.length})`);
  for (const n of notes) console.log(`  · ${n.name} — ${n.check} ${n.detail}`);
}

process.exit(problems.length ? 1 : 0);
