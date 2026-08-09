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

/* ── Cohérence des zones affichées ────────────────────────────────────── */

test("aucune île ne reste dans un « Grand Line » indéterminé", () => {
  // Grand Line n'est pas une zone : c'est la route entière. Une fiche qui
  // l'affiche ne dit ni Paradise ni Nouveau Monde, donc ne dit rien.
  const vague = islands.filter((i) => i.sea === "Grand Line");
  assert.equal(
    vague.length,
    0,
    `à moitié situées : ${vague.map((i) => i.name).join(", ")}`,
  );
});

test("les mers affichées font partie du jeu attendu", () => {
  const KNOWN = new Set([
    "East Blue",
    "West Blue",
    "North Blue",
    "South Blue",
    "Paradise",
    "Nouveau Monde",
    "Calm Belt",
    "Red Line",
    "Ciel",
  ]);
  for (const island of islands) {
    assert.ok(KNOWN.has(island.sea), `mer inconnue pour ${island.name} : ${island.sea}`);
  }
});

test("les îles du ciel sont dans le ciel, pas dans un Blue", () => {
  for (const name of ["Skypiea", "Mer Blanche", "Weatheria"]) {
    assert.equal(get(name).sea, "Ciel", `${name} n'est pas rangée dans le ciel`);
  }
});

test("chaque nature de lieu correspond à une entrée de la table", () => {
  const { kinds } = JSON.parse(
    readFileSync(join(HERE, "..", "data", "islands.json"), "utf8"),
  );
  for (const island of islands) {
    if (island.kind === null) continue;
    assert.ok(kinds[island.kind], `nature inconnue pour ${island.name} : ${island.kind}`);
  }
});

test("les lieux qui ne sont pas des îles portent une nature", () => {
  // Sans pictogramme, une ceinture de mer, une île céleste ou un navire
  // se lisent comme n'importe quelle terre : c'est faux et c'est trompeur.
  const MUST_HAVE = [
    ["Skypiea", "sky"],
    ["Mer Blanche", "sky"],
    ["Weatheria", "sky"],
    ["Île des Hommes-Poissons", "seafloor"],
    ["Royaume de Ryugu", "seafloor"],
    ["Zou", "living"],
    // La cité sur le dos de Zunisha est une ville, pas un second éléphant.
    ["Duché de Mokomo", "settlement"],
    ["Thriller Bark", "ship"],
    ["Baratie", "ship"],
    ["Calm Belt", "zone"],
    ["Triangle de Florian", "zone"],
    ["Marie-Joie", "holy"],
    ["Ohara", "lost"],
  ];
  for (const [name, kind] of MUST_HAVE) {
    assert.equal(get(name).kind, kind, `${name} devrait être de nature « ${kind} »`);
  }
});

/* ── La route de l'équipage est jouable d'un bout à l'autre ───────────── */

test("les escales se suivent sans trou ni doublon", () => {
  // La lecture cinématique enchaîne les escales dans l'ordre : un numéro
  // manquant coupe le voyage en deux, un doublon le fait bégayer.
  const steps = islands
    .filter((i) => i.step)
    .map((i) => i.step)
    .sort((a, b) => a - b);
  assert.equal(new Set(steps).size, steps.length, "deux escales portent le même numéro");
  for (let k = 0; k < steps.length; k++) {
    assert.equal(steps[k], k + 1, `l'escale n° ${k + 1} manque`);
  }
});

test("un seul lieu porte l'éléphant", () => {
  // Zunisha marche seule : deux éléphants côte à côte sur la carte
  // laisseraient croire à deux îles vivantes voisines.
  const living = islands.filter((i) => i.kind === "living");
  assert.deepEqual(living.map((i) => i.name), ["Zou"]);
});

test("les villes posées sur une autre île ne dessinent pas de terre", () => {
  // Fuchsia est sur Dawn, Mock Town sur Jaya, Mokomo sur Zou : leur peindre
  // une côte ferait deux îles là où l'œuvre n'en montre qu'une.
  const NESTED_TOWNS = [
    "Village de Fuchsia",
    "Royaume de Goa",
    "Mock Town",
    "Duché de Mokomo",
    "Royaume Tontatta",
  ];
  for (const name of NESTED_TOWNS) {
    assert.equal(get(name).kind, "settlement", `${name} devrait être une ville`);
  }
});

test("les tailles couvrent toute l'échelle, sans trou en haut", () => {
  const sizes = islands.map((i) => i.scale);
  assert.ok(Math.max(...sizes) >= 8, "aucun lieu n'atteint la taille d'un continent");
  assert.ok(Math.min(...sizes) <= 1, "aucun lieu n'est un simple lieu-dit");
  // Un pays doit écraser un îlot : le rapport doit rester lisible.
  const elbaf = get("Elbaf").scale;
  const banaro = get("Banaro").scale;
  assert.ok(elbaf - banaro >= 4, "Elbaf et Banaro se ressemblent trop");
});

test("chaque escale de la route dit ce que l'équipage y a fait", () => {
  for (const island of islands.filter((i) => i.step)) {
    assert.ok(
      island.deed && island.deed.length > 40,
      `escale n° ${island.step} sans récit : ${island.name}`,
    );
  }
});

test("les durées d'escale connues sont plausibles", () => {
  // Une escale ne dure ni zéro jour ni plus des deux ans d'entraînement,
  // qui sont la plus longue halte que le récit énonce explicitement.
  for (const island of islands) {
    if (island.days === null) continue;
    assert.ok(island.days >= 1, `${island.name} : durée nulle ou négative`);
    assert.ok(island.days <= 730, `${island.name} : ${island.days} jours, plus long que Rusukaina`);
  }
  assert.equal(get("Rusukaina").days, 730, "les deux ans d'entraînement sont un fait du récit");
});

test("Reverse Mountain est peinte, pas représentée par un pictogramme", () => {
  const rm = get("Reverse Mountain");
  assert.equal(rm.kind, null, "un pictogramme la remplacerait par un dessin");
  assert.equal(rm.terrain, "mountain", "le massif a son propre terrain");
});

test("aucune mention de source ne subsiste dans les données livrées", () => {
  const payload = JSON.parse(
    readFileSync(join(HERE, "..", "data", "islands.json"), "utf8"),
  );
  assert.equal(payload.credits, undefined, "les crédits sont encore livrés");
});

/* ── Ce que les données prétendent savoir ─────────────────────────────── */

test("chaque durée dit d'où elle vient", () => {
  // Une estimation affichée comme un fait est une erreur, même juste. Seules
  // les durées énoncées dans l'œuvre portent la mention « récit ».
  for (const island of islands) {
    if (!island.days) {
      assert.equal(island.daysBasis, null, `${island.name} : origine sans durée`);
      continue;
    }
    assert.ok(
      ["récit", "estimation"].includes(island.daysBasis),
      `${island.name} : durée sans origine déclarée`,
    );
  }
});

test("les seules durées établies sont les deux ans de la séparation", () => {
  const stated = islands.filter((i) => i.daysBasis === "récit");
  assert.ok(stated.length > 0, "aucune durée n'est rattachée au récit");
  for (const island of stated) {
    assert.equal(
      island.days,
      730,
      `${island.name} donne ${island.days} jours comme un fait du récit`,
    );
  }
});

test("la route s'arrête là où l'œuvre en est", () => {
  // Laugh Tale n'est pas une escale : personne de l'équipage n'y est allé.
  assert.equal(get("Laugh Tale").step, null, "Laugh Tale comptée comme escale");
  const route = islands.filter((i) => i.step).sort((a, b) => a.step - b.step);
  assert.equal(route[route.length - 1].name, "Elbaf");
  for (const stop of route) {
    assert.equal(stop.tag, "crew", `${stop.name} est une escale sans être visitée`);
  }
});

test("aucun alias ne désigne deux lieux à la fois", () => {
  const owner = new Map();
  for (const island of islands) {
    for (const alias of island.aliases ?? []) {
      const key = alias.toLowerCase();
      assert.ok(
        !owner.has(key) || owner.get(key) === island.name,
        `« ${alias} » désigne ${owner.get(key)} et ${island.name}`,
      );
      owner.set(key, island.name);
    }
  }
});

test("aucune terre de Grand Line ne déborde sur la Calm Belt", async () => {
  // La ceinture est réputée infranchissable : une île de la route qui y
  // trempe sa côte affirme le contraire.
  const { paintedHalfHeight } = await import("../src/texture.js");
  const PAINTS_NO_LAND = ["zone", "seafloor", "ship", "sky", "settlement"];
  const road = islands.filter(
    (i) =>
      ["Paradise", "Nouveau Monde"].includes(i.sea) &&
      !PAINTS_NO_LAND.includes(i.kind),
  );
  assert.ok(road.length > 30, "trop peu d'îles contrôlées");
  for (const island of road) {
    const reach = Math.abs(island.lat) + paintedHalfHeight(island.scale);
    assert.ok(
      reach <= GRAND_LINE_HALF_WIDTH + 0.02,
      `${island.name} atteint ${reach.toFixed(1)}° alors que la route s'arrête à ${GRAND_LINE_HALF_WIDTH}°`,
    );
  }
});

test("les îles de la Calm Belt tiennent dans la ceinture", async () => {
  const { paintedHalfHeight } = await import("../src/texture.js");
  for (const island of islands.filter((i) => i.sea === "Calm Belt" && i.kind !== "zone")) {
    const half = paintedHalfHeight(island.scale);
    const near = Math.abs(island.lat) - half;
    const far = Math.abs(island.lat) + half;
    assert.ok(near >= GRAND_LINE_HALF_WIDTH - 0.02, `${island.name} mord sur Grand Line`);
    assert.ok(far <= CALM_BELT_OUTER + 0.02, `${island.name} sort de la ceinture`);
  }
});
