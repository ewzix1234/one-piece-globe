/**
 * Dessine la texture du globe dans un canvas, en projection équirectangulaire.
 *
 * Rien n'est chargé depuis le réseau : la carte est peinte au trait à partir
 * des coordonnées des îles. La géographie canon impose trois invariants —
 * Grand Line sur l'équateur, la Red Line sur deux méridiens opposés, et les
 * Calm Belts qui bordent Grand Line de part et d'autre.
 */

export const RED_LINE_LNG = [-3.5, 176.5];
export const GRAND_LINE_HALF_WIDTH = 3.2; // degrés de latitude
export const CALM_BELT_OUTER = 9.5;

/**
 * Zones du monde, pour les étiquettes posées sur la sphère.
 *
 * Les longitudes des deux moitiés de Grand Line sont les milieux des arcs
 * délimités par les méridiens de la Red Line ; celles des quatre Blues
 * viennent de la position moyenne de leurs îles.
 */
const PARADISE_LNG = 86.5; // milieu de l'arc entre les deux Red Lines
const NEW_WORLD_LNG = -93.5; // milieu de l'arc opposé
const CALM_BELT_MID = (GRAND_LINE_HALF_WIDTH + CALM_BELT_OUTER) / 2;

export const ZONES = [
  // « Paradise » seul se lit comme une mer à part, alors que c'est la
  // première moitié de Grand Line. Les deux étiquettes portent donc le nom
  // de la route avant celui de la moitié.
  { label: "GRAND LINE · PARADISE", lat: 0, lng: PARADISE_LNG, size: 2.7, kind: "route" },
  { label: "GRAND LINE · NOUVEAU MONDE", lat: 0, lng: NEW_WORLD_LNG, size: 2.7, kind: "route" },
  { label: "CALM BELT", lat: CALM_BELT_MID, lng: 130, size: 2.2, kind: "belt" },
  { label: "CALM BELT", lat: -CALM_BELT_MID, lng: -50, size: 2.2, kind: "belt" },
  // La Red Line fait deux fois le tour du globe par les pôles : une seule
  // étiquette en laisserait la moitié anonyme.
  { label: "RED LINE", lat: 44, lng: RED_LINE_LNG[0], size: 2.6, kind: "land" },
  { label: "RED LINE", lat: -44, lng: RED_LINE_LNG[1], size: 2.6, kind: "land" },
  // Les quatre Blues sont les quadrants découpés par Grand Line et la Red
  // Line : leurs étiquettes sont posées au centre géométrique de chacun,
  // pas sur la moyenne des îles connues, qui n'en couvre qu'une part.
  { label: "EAST BLUE", lat: 45, lng: PARADISE_LNG, size: 3.2, kind: "blue" },
  { label: "SOUTH BLUE", lat: -45, lng: PARADISE_LNG, size: 3.2, kind: "blue" },
  { label: "NORTH BLUE", lat: 45, lng: NEW_WORLD_LNG, size: 3.2, kind: "blue" },
  { label: "WEST BLUE", lat: -45, lng: NEW_WORLD_LNG, size: 3.2, kind: "blue" },
];

const PALETTE = {
  deep: "#04202f",
  ocean: "#0a3d55",
  shallow: "#12607f",
  paradise: "#1e8fae", // première moitié de Grand Line, plus claire
  newWorld: "#155f80", // seconde moitié, plus profonde
  calmBelt: "#08293a", // ni vent ni courant : un aplat mat
  redLine: "#8c4a35",
  redLineHigh: "#b4674c",
};

/**
 * Terrains.
 *
 * `low` est la masse de l'île, `high` la face éclairée, `shore` la frange
 * de littoral, `mark` la touche qui dit le terrain d'un coup d'œil : les
 * bosquets d'une forêt, les dunes d'un désert, les toits d'une ville.
 */
const TERRAIN = {
  forest: { low: "#3d7b4d", high: "#5fa168", shore: "#c9a86a", mark: "#2b5c39" },
  jungle: { low: "#2d6a3d", high: "#4f9a53", shore: "#cbb277", mark: "#1d4c2c" },
  desert: { low: "#c9a25c", high: "#e3c684", shore: "#eadaae", mark: "#a97f42" },
  snow: { low: "#cfe0e8", high: "#f2fafd", shore: "#a9c2ce", mark: "#9fb8c6" },
  city: { low: "#8a8272", high: "#aaa08b", shore: "#c9b98f", mark: "#6d4f3d" },
  rock: { low: "#655d52", high: "#867c6c", shore: "#8d8371", mark: "#3f3a33" },
  cake: { low: "#e2a2b8", high: "#f7cddb", shore: "#f0e0c2", mark: "#c4738f" },
  ash: { low: "#565a51", high: "#6d7166", shore: "#787264", mark: "#3a3d37" },
  sky: { low: "#cfe3ea", high: "#f0f9fd", shore: "#b3ccd8", mark: "#a8c3d1" },
  // Punk Hazard : la moitié brûlée. L'autre moitié emprunte la neige.
  ember: { low: "#7d4132", high: "#a85a3c", shore: "#8c6552", mark: "#4d2620" },
  // Le massif de Reverse Mountain : la matière de la Red Line, en plus clair.
  mountain: { low: "#a05a41", high: "#c37f5e", shore: "#8c4a35", mark: "#6f3826" },
};

/**
 * Rayon de base d'un lieu, par taille de 1 à 6.
 *
 * L'écart doit se voir : un pays comme Elbaf ne peut pas avoir la même
 * empreinte qu'un village de pêcheurs. Le pas est géométrique, pas
 * linéaire, sinon les grandes îles n'écrasent jamais les petites.
 */
const SIZE_RADIUS = { 1: 2.4, 2: 3.4, 3: 4.8, 4: 6.6, 5: 9, 6: 12.2, 7: 16.4, 8: 22 };

/**
 * Un lieu ne pose une terre sur la carte que s'il en est une.
 *
 * Peindre un continent pour la Calm Belt, une côte pour le Baratie ou une
 * île pour le Royaume de Ryugu — qui est à dix mille mètres de fond —
 * rendrait la carte fausse à l'endroit précis où elle prétend informer.
 * Ces lieux gardent leur pictogramme, sans relief.
 */
const NO_LAND = new Set([
  "zone",
  "seafloor",
  "ship",
  "living",
  // Le carrefour de la Red Line est déjà peint : la montagne, la Terre
  // Sainte et le port sont dessus, pas à côté.
  "reverse",
  "holy",
  "port",
  // Une ville posée sur une île plus grande ne double pas sa côte.
  "settlement",
]);
const DRAWS_LAND = (island) => !NO_LAND.has(island.kind);

/** Générateur pseudo-aléatoire déterministe : la carte doit être reproductible. */
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const lngToX = (lng, w) => ((lng + 180) / 360) * w;
export const latToY = (lat, h) => ((90 - lat) / 180) * h;

/** Peint un fond d'océan : dégradé de profondeur plus un grain léger. */
function paintOcean(ctx, w, h) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, PALETTE.deep);
  gradient.addColorStop(0.28, PALETTE.ocean);
  gradient.addColorStop(0.5, PALETTE.shallow);
  gradient.addColorStop(0.72, PALETTE.ocean);
  gradient.addColorStop(1, PALETTE.deep);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Moutonnement : des traînées courtes et ondulantes cassent l'aspect
  // dégradé pur. Des bandes traversant tout le globe formeraient des
  // anneaux de latitude bien visibles — l'effet inverse de celui voulu.
  const rand = makeRandom(20260807);
  ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const y = rand() * h;
    const x = rand() * w;
    const length = w * (0.02 + rand() * 0.06);
    ctx.globalAlpha = 0.018 + rand() * 0.022;
    ctx.strokeStyle = rand() > 0.45 ? "#9fd6e8" : "#03151f";
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + length * 0.33,
      y + (rand() - 0.5) * 6,
      x + length * 0.66,
      y + (rand() - 0.5) * 6,
      x + length,
      y,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Trace les Calm Belts et Grand Line.
 *
 * Trois faits canon à rendre lisibles :
 *   — Grand Line est coupée en deux par la Red Line. La première moitié
 *     est Paradise, la seconde le Nouveau Monde. Les deux reçoivent des
 *     teintes distinctes.
 *   — Les Calm Belts bordent Grand Line. Sans vent ni courant, elles ne
 *     portent aucun moutonnement : c'est ce qui les rend reconnaissables.
 *   — Le courant de Grand Line file au centre exact de la bande.
 */
function paintGrandLine(ctx, w, h) {
  const yOf = (lat) => latToY(lat, h);
  const belt = (latFrom, latTo) => {
    const y1 = yOf(Math.max(latFrom, latTo));
    const y2 = yOf(Math.min(latFrom, latTo));
    return [y1, y2 - y1];
  };

  // Calm Belts : aplat mat, sans relief, bordé d'un liseré net.
  for (const [from, to] of [
    [GRAND_LINE_HALF_WIDTH, CALM_BELT_OUTER],
    [-CALM_BELT_OUTER, -GRAND_LINE_HALF_WIDTH],
  ]) {
    const [y, height] = belt(from, to);
    // Aplat opaque : aucun moutonnement ne doit transparaître.
    ctx.fillStyle = PALETTE.calmBelt;
    ctx.fillRect(0, y, w, height);
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = "#1d5570";
    ctx.lineWidth = Math.max(1, h / 1100);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.moveTo(0, y + height);
    ctx.lineTo(w, y + height);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Grand Line, teintée par moitié. Les deux méridiens de la Red Line
  // découpent la bande : entre eux c'est Paradise, au-delà le Nouveau Monde.
  const [gy, gh] = belt(-GRAND_LINE_HALF_WIDTH, GRAND_LINE_HALF_WIDTH);
  const xA = lngToX(RED_LINE_LNG[0], w);
  const xB = lngToX(RED_LINE_LNG[1], w);

  ctx.globalAlpha = 0.88;
  ctx.fillStyle = PALETTE.newWorld;
  ctx.fillRect(0, gy, w, gh);
  ctx.fillStyle = PALETTE.paradise;
  ctx.fillRect(xA, gy, xB - xA, gh);
  ctx.globalAlpha = 1;

  // Fil de courant au centre exact de Grand Line.
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "#7fe0f2";
  ctx.lineWidth = Math.max(1, h / 850);
  ctx.beginPath();
  ctx.moveTo(0, yOf(0));
  ctx.lineTo(w, yOf(0));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Trace la Red Line : deux méridiens opposés, du pôle nord au pôle sud.
 * Les bords sont irréguliers pour éviter l'aspect ruban.
 */
function paintRedLine(ctx, w, h) {
  const rand = makeRandom(1522);
  const halfWidth = (w / 360) * 3.1;

  for (const lng of RED_LINE_LNG) {
    const cx = lngToX(lng, w);
    // La bande peut déborder du canvas : on la dessine aussi décalée d'une
    // largeur de monde pour que l'enroulement soit continu.
    for (const offset of [-w, 0, w]) {
      ctx.beginPath();
      const steps = 90;
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * h;
        const wobble = (rand() - 0.5) * halfWidth * 0.5;
        const x = cx + offset - halfWidth + wobble;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const y = (i / steps) * h;
        const wobble = (rand() - 0.5) * halfWidth * 0.5;
        ctx.lineTo(cx + offset + halfWidth + wobble, y);
      }
      ctx.closePath();
      ctx.fillStyle = PALETTE.redLine;
      ctx.fill();

      // Arête éclairée sur le flanc gauche : donne du relief au continent.
      ctx.save();
      ctx.clip();
      ctx.fillStyle = PALETTE.redLineHigh;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(cx + offset - halfWidth, 0, halfWidth * 0.55, h);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Contour d'une île : une courbe fermée et lisse, pas un polygone.
 *
 * Un tracé en segments droits donne une étoile ; ce qu'on veut est une
 * côte. On passe donc une courbe quadratique par les milieux des rayons
 * tirés au sort, ce qui referme le contour sans angle vif.
 */
function traceCoast(ctx, x, y, radius, points, rng, squash = 0.84) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const jitter = 0.7 + rng() * 0.55;
    pts.push([
      x + Math.cos(angle) * radius * jitter,
      y + Math.sin(angle) * radius * jitter * squash,
    ]);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  let from = mid(pts[pts.length - 1], pts[0]);
  ctx.moveTo(from[0], from[1]);
  for (let i = 0; i < pts.length; i++) {
    const next = mid(pts[i], pts[(i + 1) % pts.length]);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], next[0], next[1]);
  }
  ctx.closePath();
}

/**
 * Les marques qui disent le terrain d'un coup d'œil.
 *
 * Peu de traits, jamais de détail : à l'échelle du globe, une île tient
 * dans quelques dizaines de pixels. Ce qui doit passer, c'est la nature
 * du sol — sable, forêt, toits, roche, neige.
 */
function paintTerrainMarks(ctx, x, y, radius, terrain, rng) {
  const paint = TERRAIN[terrain] ?? TERRAIN.forest;
  ctx.save();
  ctx.fillStyle = paint.mark;
  ctx.strokeStyle = paint.mark;

  if (terrain === "desert") {
    // Trois crêtes de dunes, couchées dans le sens du vent.
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1, radius * 0.09);
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const dy = (i - 1) * radius * 0.36;
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.55, y + dy);
      ctx.quadraticCurveTo(x, y + dy - radius * 0.24, x + radius * 0.55, y + dy);
      ctx.stroke();
    }
  } else if (terrain === "city") {
    // Des toits : de petits blocs serrés, alignés comme une ville portuaire.
    ctx.globalAlpha = 0.72;
    const n = Math.max(3, Math.round(radius / 2.2));
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * radius * 0.62;
      const s = radius * (0.13 + rng() * 0.12);
      ctx.fillRect(x + Math.cos(a) * d - s / 2, y + Math.sin(a) * d - s / 2, s, s * 1.3);
    }
  } else if (terrain === "snow") {
    // Deux sommets : c'est ce qui distingue Drum d'une plaine gelée.
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 2; i++) {
      const cx = x + (i ? radius * 0.3 : -radius * 0.28);
      const s = radius * (i ? 0.42 : 0.55);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.7, y + s * 0.45);
      ctx.lineTo(cx, y - s * 0.6);
      ctx.lineTo(cx + s * 0.7, y + s * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  } else if (terrain === "rock" || terrain === "ash") {
    // Des facettes anguleuses : de la pierre, pas de la végétation.
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * radius * 0.5;
      const s = radius * (0.22 + rng() * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d - s);
      ctx.lineTo(x + Math.cos(a) * d + s, y + Math.sin(a) * d + s * 0.6);
      ctx.lineTo(x + Math.cos(a) * d - s * 0.8, y + Math.sin(a) * d + s * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  } else if (terrain === "cake") {
    // Des cerises : Totto Land se reconnaît à ses rondeurs sucrées.
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 4; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * radius * 0.58;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, radius * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (terrain !== "sky") {
    // Bosquets : la marque par défaut d'une terre boisée.
    ctx.globalAlpha = 0.42;
    const n = Math.max(3, Math.round(radius / 1.8));
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * radius * 0.66;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(a) * d,
        y + Math.sin(a) * d,
        radius * (0.09 + rng() * 0.07),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Peint une île : littoral, masse de terre, face éclairée, marques.
 *
 * Le tirage aléatoire est refait à l'identique pour chaque passe : sans
 * cela, la frange de littoral ne suivrait pas le contour de la terre.
 */
function paintIsland(ctx, x, y, radius, island) {
  const seed = Math.floor(Math.abs(x) * 7919 + Math.abs(y) * 104729) || 7;
  const points = radius > 11 ? 16 : radius > 6 ? 13 : 10;
  const terrain =
    island.kind === "sky" ? "sky" : (island.terrain ?? "forest");
  const paint = TERRAIN[terrain] ?? TERRAIN.forest;

  // Littoral : une frange un peu plus large que la terre.
  ctx.fillStyle = paint.shore;
  traceCoast(ctx, x, y, radius * 1.17, points, makeRandom(seed));
  ctx.fill();

  // Masse de terre.
  ctx.fillStyle = paint.low;
  traceCoast(ctx, x, y, radius, points, makeRandom(seed));
  ctx.fill();

  // Punk Hazard est coupée en deux : brûlée d'un côté, gelée de l'autre.
  // Le partage se fait à l'intérieur du contour, pas à côté.
  if (island.terrain === "split") {
    ctx.save();
    traceCoast(ctx, x, y, radius, points, makeRandom(seed));
    ctx.clip();
    ctx.fillStyle = TERRAIN.ember.low;
    ctx.fillRect(x - radius * 1.4, y - radius * 1.4, radius * 1.4, radius * 2.8);
    ctx.fillStyle = TERRAIN.snow.low;
    ctx.fillRect(x, y - radius * 1.4, radius * 1.4, radius * 2.8);
    ctx.restore();
  }

  // Face éclairée : la même côte, décalée vers le nord-ouest et rognée.
  ctx.save();
  traceCoast(ctx, x, y, radius, points, makeRandom(seed));
  ctx.clip();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = island.terrain === "split" ? "#ffffff" : paint.high;
  traceCoast(
    ctx,
    x - radius * 0.16,
    y - radius * 0.18,
    radius * 0.86,
    points,
    makeRandom(seed + 11),
  );
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  if (radius > 4) {
    paintTerrainMarks(
      ctx,
      x,
      y,
      radius,
      island.terrain === "split" ? "rock" : terrain,
      makeRandom(seed + 31),
    );
  }
}

/**
 * Reverse Mountain : un massif à cheval sur la Red Line, pas une île.
 *
 * La montagne appartient au continent-barrière et le déborde de part et
 * d'autre du croisement avec Grand Line. Les quatre courants qui la
 * gravissent — un par Blue — se rejoignent au bassin du sommet, d'où le
 * cinquième redescend dans Grand Line. C'est cette forme-là qu'on peint,
 * dans la matière de la Red Line, et non un pictogramme posé dessus.
 */
function paintReverseMountain(ctx, x, y, radius) {
  const paint = TERRAIN.mountain;
  const seed = 5150;

  // Le pied du massif : plus large que la bande de la Red Line.
  ctx.fillStyle = paint.shore;
  traceCoast(ctx, x, y, radius * 1.16, 17, makeRandom(seed), 1.05);
  ctx.fill();
  ctx.fillStyle = paint.low;
  traceCoast(ctx, x, y, radius, 17, makeRandom(seed), 1.05);
  ctx.fill();

  ctx.save();
  traceCoast(ctx, x, y, radius, 15, makeRandom(seed), 1);
  ctx.clip();

  // Les versants éclairés, en couronne autour du sommet.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = paint.high;
  traceCoast(ctx, x - radius * 0.1, y - radius * 0.12, radius * 0.64, 13, makeRandom(seed + 7), 1);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Les quatre courants. Ils serpentent : un tracé droit donnerait une
  // croix géométrique là où l'œuvre montre des rivières.
  ctx.strokeStyle = "rgba(206,234,244,0.6)";
  ctx.lineWidth = Math.max(1, radius * 0.062);
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const bend = radius * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * radius * 1.1, y + Math.sin(angle) * radius * 1.1);
    ctx.bezierCurveTo(
      x + Math.cos(angle) * radius * 0.72 + nx * bend,
      y + Math.sin(angle) * radius * 0.72 + ny * bend,
      x + Math.cos(angle) * radius * 0.3 - nx * bend * 0.7,
      y + Math.sin(angle) * radius * 0.3 - ny * bend * 0.7,
      x,
      y,
    );
    ctx.stroke();
  }
  ctx.restore();

  // Le bassin du sommet, où les quatre courants se rencontrent avant que le
  // cinquième ne redescende dans Grand Line.
  ctx.fillStyle = "rgba(222,242,249,0.8)";
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.5, radius * 0.13), 0, Math.PI * 2);
  ctx.fill();
}

/** Un archipel : une grappe d'îlots plutôt qu'une seule masse. */
function paintCluster(ctx, x, y, radius, island) {
  const rng = makeRandom(Math.floor(Math.abs(x) * 31 + Math.abs(y) * 17) || 3);
  const count = 5 + Math.floor(rng() * 3);
  paintIsland(ctx, x, y, radius * 0.52, island);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng();
    const d = radius * (0.62 + rng() * 0.5);
    paintIsland(
      ctx,
      x + Math.cos(a) * d,
      y + Math.sin(a) * d * 0.8,
      radius * (0.26 + rng() * 0.22),
      island,
    );
  }
}

/** Rayon d'un lieu en pixels, pour une texture de largeur `w`. */
const islandRadius = (island, w) =>
  (SIZE_RADIUS[island.scale] ?? SIZE_RADIUS[3]) * (w / 4096) * 3.2;

/**
 * Peint la texture complète.
 * @param {Array<{lat:number,lng:number,scale:number,sea:string}>} islands
 * @param {number} width  largeur en pixels (hauteur = width / 2)
 */
export function drawWorldTexture(islands, width = 4096) {
  const w = width;
  const h = width / 2;
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = canvas.getContext("2d");

  paintOcean(ctx, w, h);
  paintGrandLine(ctx, w, h);
  paintRedLine(ctx, w, h);

  // Calottes polaires : la planète est décrite comme tempérée aux pôles,
  // mais un blanchiment léger aide à lire la rotation.
  for (const [from, to] of [
    [90, 78],
    [-78, -90],
  ]) {
    const y1 = latToY(Math.max(from, to), h);
    const y2 = latToY(Math.min(from, to), h);
    const g = ctx.createLinearGradient(0, y1, 0, y2);
    const edge = from > 0 ? 0 : 1;
    g.addColorStop(edge, "rgba(207,227,234,0.55)");
    g.addColorStop(1 - edge, "rgba(207,227,234,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y1, w, y2 - y1);
  }

  // Les grandes îles en premier : une petite posée dessus doit rester
  // lisible, l'inverse la ferait disparaître.
  const drawn = islands
    .filter(DRAWS_LAND)
    .slice()
    .sort((a, b) => (b.scale ?? 3) - (a.scale ?? 3));

  for (const island of drawn) {
    const x = lngToX(island.lng, w);
    const y = latToY(island.lat, h);
    const radius = islandRadius(island, w);
    const draw =
      island.terrain === "mountain"
        ? paintReverseMountain
        : island.archipelago
          ? paintCluster
          : paintIsland;
    // Enroulement : une île près du méridien 180 doit apparaître des deux côtés.
    for (const offset of [-w, 0, w]) {
      if (x + offset > -radius * 3 && x + offset < w + radius * 3) {
        draw(ctx, x + offset, y, radius, island);
      }
    }
  }

  return canvas;
}

/** Carte de relief : la Red Line et les îles ressortent du niveau de la mer. */
export function drawBumpTexture(islands, width = 2048) {
  const w = width;
  const h = width / 2;
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  const halfWidth = (w / 360) * 3.1;
  ctx.fillStyle = "#ffffff";
  for (const lng of RED_LINE_LNG) {
    const cx = lngToX(lng, w);
    for (const offset of [-w, 0, w]) {
      ctx.fillRect(cx + offset - halfWidth, 0, halfWidth * 2, h);
    }
  }

  ctx.fillStyle = "#9a9a9a";
  for (const island of islands) {
    if (!DRAWS_LAND(island)) continue;
    const x = lngToX(island.lng, w);
    const y = latToY(island.lat, h);
    const radius = islandRadius(island, w);
    for (const offset of [-w, 0, w]) {
      ctx.beginPath();
      ctx.ellipse(x + offset, y, radius, radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}
