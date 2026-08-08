/**
 * Contrôle des faits géographiques imposés par l'œuvre.
 *
 * Ces contraintes ne viennent d'aucune carte : elles sont énoncées ou
 * montrées dans le manga. Une carte qui les respecte toutes est fidèle sur
 * les points où la fidélité est vérifiable ; une carte qui en viole une est
 * fausse, quelle que soit la qualité de sa source.
 *
 * C'est le juge de paix du projet : ni la carte d'Ohara ni aucun relevé
 * tiers ne prime sur ce que le récit affirme.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RED_LINE_LNG, GRAND_LINE_HALF_WIDTH, CALM_BELT_OUTER } from "../src/texture.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const { islands } = JSON.parse(
  readFileSync(join(HERE, "..", "data", "islands.json"), "utf8"),
);

const get = (name) => {
  const island = islands.find((i) => i.name === name);
  assert.ok(island, `île absente du jeu de données : ${name}`);
  return island;
};

/** Distance angulaire entre deux points, en degrés d'arc. */
function arc(a, b) {
  const R = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * R) / 2) ** 2 +
    Math.cos(a.lat * R) *
      Math.cos(b.lat * R) *
      Math.sin(((b.lng - a.lng) * R) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / R;
}

/** Écart de longitude, en tenant compte de l'enroulement du globe. */
function lngGap(a, b) {
  let d = Math.abs(a.lng - b.lng);
  return d > 180 ? 360 - d : d;
}

/** Distance à la Red Line la plus proche, en degrés de longitude. */
const toRedLine = (island) =>
  Math.min(...RED_LINE_LNG.map((lng) => lngGap(island, { lng })));

/* ── Grand Line est l'équateur ────────────────────────────────────────── */

test("les îles de Grand Line se tiennent sur l'équateur", () => {
  const onRoute = islands.filter((i) =>
    ["Paradise", "Nouveau Monde", "Grand Line"].includes(i.sea),
  );
  assert.ok(onRoute.length > 40, "trop peu d'îles sur la route");
  for (const island of onRoute) {
    assert.ok(
      // La carte source étale les îles autour du trait pour qu'elles
      // restent lisibles : on tolère l'épaisseur des Calm Belts.
      Math.abs(island.lat) <= CALM_BELT_OUTER - 1.5,
      `${island.name} est à ${island.lat.toFixed(1)}° de latitude, hors de Grand Line`,
    );
  }
});

test("la Red Line coupe Grand Line en deux moitiés opposées", () => {
  // Deux méridiens séparés d'exactement un demi-tour.
  const gap = lngGap({ lng: RED_LINE_LNG[0] }, { lng: RED_LINE_LNG[1] });
  assert.equal(Math.round(gap), 180);
});

test("Paradise et le Nouveau Monde sont de part et d'autre de la Red Line", () => {
  const inParadiseHalf = (i) =>
    i.lng > RED_LINE_LNG[0] && i.lng < RED_LINE_LNG[1];
  for (const island of islands.filter((i) => i.sea === "Paradise")) {
    assert.ok(inParadiseHalf(island), `${island.name} donnée en Paradise mais du côté Nouveau Monde`);
  }
  for (const island of islands.filter((i) => i.sea === "Nouveau Monde")) {
    assert.ok(!inParadiseHalf(island), `${island.name} donnée en Nouveau Monde mais du côté Paradise`);
  }
});

/* ── Le carrefour de la Red Line ──────────────────────────────────────── */

test("Marie-Joie surplombe l'Île des Hommes-Poissons", () => {
  // L'île se trouve dix mille mètres sous la Terre Sainte, à l'aplomb.
  const gap = lngGap(get("Marie-Joie"), get("Île des Hommes-Poissons"));
  assert.ok(gap < 6, `${gap.toFixed(1)}° de longitude les séparent, elles devraient être à l'aplomb`);
});

test("Marie-Joie et l'Île des Hommes-Poissons sont sur la Red Line", () => {
  for (const name of ["Marie-Joie", "Île des Hommes-Poissons"]) {
    assert.ok(toRedLine(get(name)) < 6, `${name} est à ${toRedLine(get(name)).toFixed(1)}° de la Red Line`);
  }
});

test("Sabaody borde la Red Line, dernière escale avant la descente", () => {
  assert.ok(
    toRedLine(get("Archipel Sabaody")) < 15,
    "Sabaody est le dernier archipel avant la Red Line, pas dessus",
  );
});

test("Reverse Mountain est au croisement opposé", () => {
  const rm = get("Reverse Mountain");
  assert.ok(toRedLine(rm) < 6, "Reverse Mountain n'est pas sur la Red Line");
  assert.ok(Math.abs(rm.lat) < 8, "Reverse Mountain n'est pas sur Grand Line");
  // Le croisement opposé à celui de Marie-Joie.
  assert.ok(
    lngGap(rm, get("Marie-Joie")) > 150,
    "les deux croisements devraient être diamétralement opposés",
  );
});

test("le Cap des Jumeaux est au pied de Reverse Mountain", () => {
  assert.ok(
    arc(get("Cap des Jumeaux"), get("Reverse Mountain")) < 12,
    "Laboon attend à l'entrée de Grand Line, contre la montagne",
  );
});

/* ── Lieux imbriqués ──────────────────────────────────────────────────── */

const NESTED = [
  ["Onigashima", "Pays des Wa", 8, "Onigashima est au large de Wano"],
  ["Green Bit", "Dressrosa", 8, "Green Bit est reliée à Dressrosa par un pont"],
  ["Île Cacao", "Whole Cake Island", 12, "l'Île Cacao appartient à Totto Land"],
  ["Duché de Mokomo", "Zou", 6, "Mokomo est la cité sur le dos de Zunisha"],
  ["Royaume de Ryugu", "Île des Hommes-Poissons", 6, "Ryugu est le palais de l'île"],
  ["Mock Town", "Jaya", 8, "Mock Town est le port de Jaya"],
  ["Village de Fuchsia", "Dawn Island", 10, "Fuchsia est un village de Dawn"],
  ["Royaume de Goa", "Dawn Island", 10, "Goa occupe le sud de Dawn"],
  ["Village de Cocoyashi", "Arlong Park", 8, "le parc domine le village de Nami"],
];

for (const [inner, outer, tolerance, why] of NESTED) {
  test(`${inner} est contre ${outer}`, () => {
    const d = arc(get(inner), get(outer));
    assert.ok(d <= tolerance, `${d.toFixed(1)}° d'arc les séparent — ${why}`);
  });
}

/* ── Calm Belt ────────────────────────────────────────────────────────── */

test("Amazon Lily et Impel Down sont dans la Calm Belt", () => {
  // Deux des trois grandes puissances y siègent, hors d'atteinte des
  // navires ordinaires : c'est ce qui les rend imprenables.
  for (const name of ["Amazon Lily", "Impel Down"]) {
    const island = get(name);
    const lat = Math.abs(island.lat);
    assert.ok(
      lat >= GRAND_LINE_HALF_WIDTH && lat <= CALM_BELT_OUTER + 2,
      `${name} est à ${island.lat.toFixed(1)}° : hors de la ceinture (attendu entre ${GRAND_LINE_HALF_WIDTH}° et ${CALM_BELT_OUTER}°)`,
    );
  }
});

test("les trois grandes puissances forment un triangle autour de la Red Line", () => {
  // Marine Ford, Impel Down et Enies Lobby sont reliées par la Porte de la
  // Justice ; les trois se tiennent près du carrefour de la Red Line.
  for (const name of ["Marine Ford", "Impel Down", "Enies Lobby"]) {
    assert.ok(
      toRedLine(get(name)) < 35,
      `${name} est à ${toRedLine(get(name)).toFixed(0)}° de la Red Line, trop loin du carrefour`,
    );
  }
});

/* ── Îles du ciel ─────────────────────────────────────────────────────── */

test("Skypiea se trouve au-dessus de Jaya", () => {
  // La moitié de Jaya a été projetée dans le ciel par un courant ascendant :
  // l'île céleste est à l'aplomb de ce qu'il en reste.
  const d = arc(get("Skypiea"), get("Jaya"));
  assert.ok(d < 15, `${d.toFixed(1)}° d'arc les séparent — Skypiea devrait surplomber Jaya`);
});

/* ── Ordre de la traversée ────────────────────────────────────────────── */

test("la route de l'équipage progresse sans revenir en arrière", () => {
  // Après l'Île des Hommes-Poissons, on avance vers l'est jusqu'à refermer
  // la boucle. Un archipel s'étend sur une dizaine de degrés : au-delà,
  // c'est un vrai retour en arrière.
  const eastward = (lng) => {
    let d = lng - RED_LINE_LNG[1];
    while (d < 0) d += 360;
    return d;
  };
  const route = islands
    .filter((i) => i.step && i.step >= 30)
    .sort((a, b) => a.step - b.step);

  for (let k = 1; k < route.length; k++) {
    const back = eastward(route[k - 1].lng) - eastward(route[k].lng);
    assert.ok(
      back <= 12,
      `${route[k].name} (escale ${route[k].step}) revient de ${back.toFixed(0)}° par rapport à ${route[k - 1].name}`,
    );
  }
});

test("Laugh Tale vient après Lodestar, au bout de Grand Line", () => {
  const eastward = (lng) => {
    let d = lng - RED_LINE_LNG[1];
    while (d < 0) d += 360;
    return d;
  };
  const lodestar = eastward(get("Lodestar").lng);
  const laughTale = eastward(get("Laugh Tale").lng);
  assert.ok(
    laughTale > lodestar,
    `Laugh Tale est à ${laughTale.toFixed(0)}° et Lodestar à ${lodestar.toFixed(0)}° : l'île finale doit venir après`,
  );
  assert.ok(
    laughTale < 180,
    "Laugh Tale dépasse le tour complet de Grand Line",
  );
});
