/**
 * Dessine la texture du globe dans un canvas, en projection équirectangulaire.
 *
 * Rien n'est chargé depuis le réseau : la carte est peinte au trait à partir
 * des coordonnées des îles. La géographie canon impose trois invariants —
 * Grand Line sur l'équateur, la Red Line sur deux méridiens opposés, et les
 * Calm Belts qui bordent Grand Line de part et d'autre.
 */

export const RED_LINE_LNG = [-3.5, 176.5];

/**
 * Largeurs relevées sur la carte de référence d'op-maps.
 *
 * Trois choses y sont mesurables, et le projet les avait toutes fausses :
 *
 *   — La Red Line n'est pas un trait mais un continent large de quarante-
 *     quatre degrés de longitude à l'équateur. Elle en faisait six.
 *   — Grand Line est une bande sombre de vingt-deux degrés de latitude, pas
 *     treize.
 *   — Les Calm Belts qui la bordent sont plus CLAIRES que l'océan, et non
 *     plus sombres. C'est ce contresens qui faisait lire le globe comme un
 *     ballon rayé de noir.
 *
 * La Red Line est ramenée à vingt-huit degrés : à quarante-quatre, elle
 * avalait Sabaody, Marine Ford et Enies Lobby, qui la bordent sans être
 * dessus.
 */
export const RED_LINE_HALF_WIDTH = 14; // degrés de longitude
export const GRAND_LINE_HALF_WIDTH = 11; // degrés de latitude
export const CALM_BELT_OUTER = 18;

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
  { label: "GRAND LINE · PARADISE", lat: 0, lng: PARADISE_LNG, size: 3.6, kind: "route" },
  { label: "GRAND LINE · NOUVEAU MONDE", lat: 0, lng: NEW_WORLD_LNG, size: 3.6, kind: "route" },
  { label: "CALM BELT", lat: CALM_BELT_MID, lng: 130, size: 3.2, kind: "belt" },
  { label: "CALM BELT", lat: -CALM_BELT_MID, lng: -50, size: 3.2, kind: "belt" },
  // La Red Line fait deux fois le tour du globe par les pôles : une seule
  // étiquette en laisserait la moitié anonyme.
  { label: "RED LINE", lat: 30, lng: RED_LINE_LNG[0], size: 3, kind: "land" },
  { label: "RED LINE", lat: -30, lng: RED_LINE_LNG[1], size: 3, kind: "land" },
  // Les quatre Blues sont les quadrants découpés par Grand Line et la Red
  // Line : leurs étiquettes sont posées au centre géométrique de chacun.
  { label: "EAST BLUE", lat: 46, lng: PARADISE_LNG, size: 4.4, kind: "blue" },
  { label: "SOUTH BLUE", lat: -46, lng: PARADISE_LNG, size: 4.4, kind: "blue" },
  { label: "NORTH BLUE", lat: 46, lng: NEW_WORLD_LNG, size: 4.4, kind: "blue" },
  { label: "WEST BLUE", lat: -46, lng: NEW_WORLD_LNG, size: 4.4, kind: "blue" },
];

/**
 * Couleurs relevées sur la carte de référence, à la pipette.
 *
 * L'océan y est un bleu d'ardoise mat, les terres un vert d'olive, la Red
 * Line une brique sourde. Rien de saturé : c'est un relevé imprimé, pas une
 * photographie satellite — et c'est ce qui manquait le plus.
 */
const PALETTE = {
  deep: "#3f6d7c",
  ocean: "#528694",
  shallow: "#5f96a4",
  paradise: "#41707f", // Grand Line, moitié Paradise : un cran plus claire
  newWorld: "#3a6475", // moitié Nouveau Monde : un cran plus sombre
  calmBelt: "#70a9b6", // sans vent ni courant : une eau pâle, pas un abîme
  redLine: "#8e3d3b",
  redLineHigh: "#a4514c",
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
 * Rayon de base d'un lieu, par taille de 1 à 8.
 *
 * L'écart doit se voir : un pays comme Elbaf ne peut pas avoir la même
 * empreinte qu'un village de pêcheurs. Le pas est géométrique, pas
 * linéaire, sinon les grandes îles n'écrasent jamais les petites.
 */
const SIZE_RADIUS = { 1: 2.4, 2: 3.4, 3: 4.8, 4: 6.6, 5: 9, 6: 12.2, 7: 16.4, 8: 22 };

/**
 * Demi-hauteur peinte d'un lieu, en degrés de latitude.
 *
 * Sert à vérifier qu'une île tient dans la bande où elle est censée être :
 * une terre de Grand Line qui déborde sur la Calm Belt raconte une chose
 * que l'œuvre dit fausse. Le calcul suit exactement celui du tracé — rayon
 * de la taille, frange de littoral, écrasement vertical du contour.
 */
/**
 * Encombrement d'un lieu en degrés de latitude.
 *
 * Quand le contour vient d'un relevé, c'est lui qui décide — le rayon est
 * mesuré, plus jugé. On le plafonne tout de même : la source dessine
 * Reverse Mountain sur dix-huit degrés, ce qui recouvrirait la moitié de
 * Grand Line et les deux Calm Belts avec.
 */
export const MAX_MEASURED_RADIUS = 4.2;

export const measuredHalfHeight = (island) =>
  island.radius != null
    ? Math.min(island.radius, MAX_MEASURED_RADIUS)
    : paintedHalfHeight(island.scale);

export function paintedHalfHeight(scale) {
  const radiusPx = (SIZE_RADIUS[scale] ?? SIZE_RADIUS[3]) * 3.2 * 1.16 * 0.84;
  return (radiusPx / 2048) * 180;
}

/**
 * Quels lieux sortent du relief de la sphère.
 *
 * Seules les vraies terres bosselent la carte de relief : ni la bulle du
 * fond marin, ni un banc de nuages, ni une coque, ni la brume.
 */
const NO_RELIEF = new Set(["zone", "seafloor", "ship", "sky", "settlement"]);
const HAS_RELIEF = (island) => !NO_RELIEF.has(island.kind);

/**
 * Exécute un tracé en élargissant l'horizontale autour d'un point.
 *
 * C'est la correction de projection : ce qui est peint ici est comprimé
 * d'un facteur cos(latitude) une fois enroulé sur la sphère. On dessine
 * donc élargi de l'inverse, et la forme retrouve ses proportions. Un cercle
 * peint sur le parallèle 60 devient sinon une ellipse deux fois plus large
 * que haute.
 */
function withStretch(ctx, x, y, stretch, draw) {
  if (!stretch || Math.abs(stretch - 1) < 0.02) return draw();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(stretch, 1);
  ctx.translate(-x, -y);
  draw();
  ctx.restore();
}

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
  gradient.addColorStop(0.24, "#0d4460");
  gradient.addColorStop(0.44, PALETTE.ocean);
  gradient.addColorStop(0.56, PALETTE.shallow);
  gradient.addColorStop(0.76, "#0d4460");
  gradient.addColorStop(1, PALETTE.deep);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Moutonnement : des traînées courtes et ondulantes cassent l'aspect
  // dégradé pur. Des bandes traversant tout le globe formeraient des
  // anneaux de latitude bien visibles — l'effet inverse de celui voulu.
  const rand = makeRandom(20260807);
  ctx.lineCap = "round";
  for (let i = 0; i < 620; i++) {
    const y = rand() * h;
    const x = rand() * w;
    const length = w * (0.02 + rand() * 0.06);
    ctx.globalAlpha = 0.014 + rand() * 0.018;
    ctx.strokeStyle = rand() > 0.45 ? "#8fbcc7" : "#2f5c68";
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
 * Graticule : parallèles et méridiens, à l'encre pâle.
 *
 * C'est le seul trait qui dit « carte » plutôt que « planète ». Sans lui,
 * la sphère se lit comme un ballon peint ; avec lui, comme un relevé. Les
 * lignes maîtresses — équateur, tropiques, méridiens de la Red Line — sont
 * un cran plus marquées que les autres, comme sur un relevé imprimé.
 */
function paintGraticule(ctx, w, h) {
  const ink = (alpha) => `rgba(240,250,252,${alpha})`;
  ctx.lineWidth = Math.max(1, h / 2200);

  for (let lat = -75; lat <= 75; lat += 15) {
    const major = lat === 0 || Math.abs(lat) === 30 || Math.abs(lat) === 60;
    ctx.strokeStyle = ink(major ? 0.1 : 0.055);
    const y = latToY(lat, h);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let lng = -180; lng < 180; lng += 15) {
    ctx.strokeStyle = ink(0.055);
    const x = lngToX(lng, w);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
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
    // Aplat opaque et pâle : sans vent ni courant, l'eau y est lisse et
    // claire. Aucun moutonnement ne doit transparaître.
    ctx.fillStyle = PALETTE.calmBelt;
    ctx.fillRect(0, y, w, height);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#3d7f92";
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

  ctx.fillStyle = PALETTE.newWorld;
  ctx.fillRect(0, gy, w, gh);
  ctx.fillStyle = PALETTE.paradise;
  ctx.fillRect(xA, gy, xB - xA, gh);

  // Fil de courant au centre exact de Grand Line.
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = "#a9dbe6";
  ctx.lineWidth = Math.max(1, h / 900);
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
  const halfWidth = (w / 360) * RED_LINE_HALF_WIDTH;

  for (const lng of RED_LINE_LNG) {
    const cx = lngToX(lng, w);
    // La bande peut déborder du canvas : on la dessine aussi décalée d'une
    // largeur de monde pour que l'enroulement soit continu.
    for (const offset of [-w, 0, w]) {
      // Une côte de continent : des golfes larges et arrondis, comme sur
      // la carte de référence. Un tirage par pas donnait une scie ; on
      // tire moins de points et on passe une courbe entre eux.
      const steps = 22;
      const side = (sign) => {
        const pts = [];
        for (let i = 0; i <= steps; i++) {
          const y = (i / steps) * h;
          const wobble = (rand() - 0.5) * halfWidth * 0.5;
          pts.push([cx + offset + sign * halfWidth + wobble, y]);
        }
        return pts;
      };
      const left = side(-1);
      const right = side(1).reverse();
      const all = [...left, ...right];
      ctx.beginPath();
      ctx.moveTo(all[0][0], all[0][1]);
      for (let i = 1; i < all.length - 1; i++) {
        const [x1, y1] = all[i];
        const [x2, y2] = all[i + 1];
        ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
      }
      ctx.closePath();
      ctx.fillStyle = PALETTE.redLine;
      ctx.fill();

      // Arête éclairée sur le flanc gauche : donne du relief au continent.
      ctx.save();
      ctx.clip();
      ctx.fillStyle = PALETTE.redLineHigh;
      ctx.globalAlpha = 0.32;
      ctx.fillRect(cx + offset - halfWidth, 0, halfWidth * 0.5, h);
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
/**
 * Trace un contour relevé sur la carte source.
 *
 * Le polygone est stocké centré et à l'échelle 1 ; il suffit de le
 * multiplier par le rayon voulu. On adoucit les angles par une courbe
 * passant par les milieux, comme pour les contours tirés au sort : à
 * l'échelle du globe, un polygone de quarante points reste anguleux.
 */
function traceOutline(ctx, x, y, radius, outline, grow = 1) {
  const pts = outline.map(([dx, dy]) => [
    x + dx * radius * grow,
    y + dy * radius * grow,
  ]);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  const start = mid(pts[pts.length - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < pts.length; i++) {
    const next = mid(pts[i], pts[(i + 1) % pts.length]);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], next[0], next[1]);
  }
  ctx.closePath();
}

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
/**
 * Hauts-fonds : l'eau claire qui borde une terre.
 *
 * Sur une carte de navigation, la profondeur est une information, pas un
 * dégradé décoratif. Ce halo dit où le fond remonte, et il détache l'île
 * du bleu du large.
 */
function paintShallows(ctx, x, y, radius) {
  const shelf = ctx.createRadialGradient(x, y, radius * 0.9, x, y, radius * 2.2);
  shelf.addColorStop(0, "rgba(126,177,190,0.42)");
  shelf.addColorStop(0.45, "rgba(104,158,172,0.2)");
  shelf.addColorStop(1, "rgba(82,134,148,0)");
  ctx.fillStyle = shelf;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 2.2, radius * 2.2 * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintIsland(ctx, x, y, radius, island, env = { stretch: 1, marks: 1 }) {
  const seed = Math.floor(Math.abs(x) * 7919 + Math.abs(y) * 104729) || 7;
  const points = radius > 11 ? 16 : radius > 6 ? 13 : 10;
  const terrain =
    island.kind === "sky" ? "sky" : (island.terrain ?? "forest");
  const paint = TERRAIN[terrain] ?? TERRAIN.forest;

  // Un contour relevé est la forme que l'île a vraiment sur la carte
  // source ; il passe avant tout tracé inventé.
  const coast = island.outline
    ? (grow) => traceOutline(ctx, x, y, radius, island.outline, grow)
    : null;
  if (coast) return paintOutlinedIsland(ctx, x, y, radius, island, paint, coast, env);

  paintShallows(ctx, x, y, radius);

  // Ombre portée : sans elle, la terre est peinte sur la mer ; avec elle,
  // elle est posée dessus.
  ctx.fillStyle = "rgba(30,58,66,0.22)";
  traceCoast(ctx, x + radius * 0.12, y + radius * 0.16, radius * 1.14, points, makeRandom(seed));
  ctx.fill();

  // Littoral : une frange un peu plus large que la terre.
  ctx.fillStyle = paint.shore;
  traceCoast(ctx, x, y, radius * 1.17, points, makeRandom(seed));
  ctx.fill();

  // Masse de terre, cernée d'un trait d'encre : c'est ce qui donne à une
  // carte gravée sa netteté, et ce qui manque à un aplat.
  ctx.fillStyle = paint.low;
  traceCoast(ctx, x, y, radius, points, makeRandom(seed));
  ctx.fill();
  ctx.strokeStyle = "rgba(38,62,46,0.55)";
  ctx.lineWidth = Math.max(0.7, radius * 0.045);
  ctx.stroke();

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

  // La signature du lieu passe après le terrain : c'est elle qu'on doit
  // voir en premier quand elle existe.
  if (radius > 4 && ISLAND_SIGNATURE[island.name]) {
    ISLAND_SIGNATURE[island.name](ctx, x, y, radius);
  } else if (radius > 4) {
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
 * Reverse Mountain, telle que la carte de référence la dessine.
 *
 * J'en avais fait un massif à courbes de niveau avec de gros canaux bleus.
 * La carte source est infiniment plus sobre : un point sur le continent, et
 * quatre traits fins qui en partent en diagonale jusqu'au bord des Calm
 * Belts — les quatre courants, tracés comme des routes maritimes et non
 * comme des fleuves.
 *
 * Ces traits courent dans la Red Line, qui est de la terre à ces
 * latitudes : ils ne franchissent jamais l'eau morte de la ceinture. C'est
 * tout l'intérêt de la montagne, et c'est ce que la sobriété du trait rend
 * enfin lisible.
 */
function paintReverseMountain(ctx, x, y, radius, island, env) {
  const { w, h } = env;
  const reachY = (CALM_BELT_OUTER / 180) * h;
  const reachX = (RED_LINE_HALF_WIDTH * 0.62 / 360) * w;

  // Les quatre courants, en trait fin.
  ctx.strokeStyle = "rgba(226,240,244,0.5)";
  ctx.lineWidth = Math.max(1, h / 1400);
  ctx.lineCap = "round";
  for (const dx of [-reachX, reachX]) {
    for (const dy of [-reachY, reachY]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // Le sommet : un petit relief clair, à peine plus large que le trait.
  const r = Math.max(3, radius * 0.55);
  ctx.fillStyle = "#c0705f";
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8f4f7";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Signatures d'îles : le trait qui fait reconnaître un lieu sans le nommer.
 *
 * Un contour irrégulier et un terrain suffisent à dire « une île de sable »,
 * pas à dire « Alabasta ». Les lieux dont l'œuvre montre une forme propre
 * la reçoivent : le fleuve Sandora qui coupe le royaume, la couronne d'eau
 * de Water Seven, les étages du gâteau de Big Mom, le crâne d'Onigashima.
 * Peu de traits, jamais de détail — à l'échelle du globe, une île tient
 * dans quelques dizaines de pixels.
 */
const ISLAND_SIGNATURE = {
  // Alabasta : le Sandora traverse le désert du sud-ouest au nord-est, et
  // les oasis marquent les rares points d'eau.
  Alabasta(ctx, x, y, r) {
    ctx.save();
    // Le Sandora serpente et s'affine vers l'amont, comme un fleuve.
    ctx.strokeStyle = "rgba(84,142,158,0.85)";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, r * 0.085);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.66, y + r * 0.46);
    ctx.bezierCurveTo(
      x - r * 0.3, y + r * 0.34,
      x - r * 0.12, y - r * 0.02,
      x + r * 0.2, y - r * 0.12,
    );
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + r * 0.2, y - r * 0.12);
    ctx.quadraticCurveTo(x + r * 0.42, y - r * 0.2, x + r * 0.6, y - r * 0.4);
    ctx.stroke();
    // Les rares points d'eau, en vert sur le sable.
    ctx.fillStyle = "#6f9a52";
    for (const [dx, dy] of [[-0.36, -0.28], [0.26, 0.38], [0.5, 0.04]]) {
      ctx.beginPath();
      ctx.arc(x + r * dx, y + r * dy, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // Water Seven : une cité en couronne autour d'une fontaine centrale, les
  // canaux rayonnant vers la mer.
  "Water Seven"(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = "#3f8fa8";
    ctx.lineWidth = Math.max(1.2, r * 0.085);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5 * 0.85);
      ctx.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95 * 0.85);
      ctx.stroke();
    }
    ctx.fillStyle = "#8fe4f5";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // Whole Cake Island : un gâteau à étages, vu du dessus — des cercles
  // concentriques de plus en plus clairs, et la cerise au sommet.
  "Whole Cake Island"(ctx, x, y, r) {
    ctx.save();
    const tiers = ["#f0b6c8", "#f7cddb", "#fce4ec"];
    tiers.forEach((tint, i) => {
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.ellipse(x, y, r * (0.72 - i * 0.19), r * (0.72 - i * 0.19) * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#c4506e";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // Onigashima : l'île est un crâne d'oni, cornes comprises.
  Onigashima(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = "#2f2b26";
    // Les deux orbites et la mâchoire, réduites à trois taches.
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * 0.12, r * 0.19, r * 0.24, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.28, y - r * 0.12, r * 0.19, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.42, r * 0.3, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Les cornes, qui débordent du contour.
    ctx.strokeStyle = "#867c6c";
    ctx.lineWidth = Math.max(1.4, r * 0.13);
    ctx.lineCap = "round";
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sign * r * 0.5, y - r * 0.5);
      ctx.quadraticCurveTo(x + sign * r * 0.95, y - r * 0.85, x + sign * r * 0.82, y - r * 1.18);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Punk Hazard : la ligne de partage entre le feu et la glace.
  "Punk Hazard"(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.setLineDash([r * 0.16, r * 0.12]);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.95);
    ctx.lineTo(x, y + r * 0.95);
    ctx.stroke();
    ctx.restore();
  },

  // Enies Lobby : la tour de justice et sa cour, plan carré au milieu de
  // l'eau — l'ouvrage se reconnaît à sa géométrie.
  "Enies Lobby"(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = "#e8dcc4";
    ctx.fillRect(x - r * 0.14, y - r * 0.62, r * 0.28, r * 1.05);
    ctx.strokeStyle = "#6d4f3d";
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeRect(x - r * 0.5, y - r * 0.36, r, r * 0.85);
    ctx.restore();
  },
};

/** Peint une île dont on possède le contour exact. */
function paintOutlinedIsland(ctx, x, y, radius, island, paint, coast, env) {
  withStretch(ctx, x, y, env?.marks ?? 1, () => paintShallows(ctx, x, y, radius));

  ctx.fillStyle = "rgba(30,58,66,0.22)";
  traceOutline(ctx, x + radius * 0.12, y + radius * 0.16, radius, island.outline, 1.1);
  ctx.fill();

  ctx.fillStyle = paint.shore;
  coast(1.14);
  ctx.fill();

  ctx.fillStyle = paint.low;
  coast(1);
  ctx.fill();

  // Punk Hazard est coupée en deux : le partage se fait à l'intérieur du
  // contour, jamais à côté.
  if (island.terrain === "split") {
    ctx.save();
    coast(1);
    ctx.clip();
    ctx.fillStyle = TERRAIN.ember.low;
    ctx.fillRect(x - radius * 1.6, y - radius * 1.6, radius * 1.6, radius * 3.2);
    ctx.fillStyle = TERRAIN.snow.low;
    ctx.fillRect(x, y - radius * 1.6, radius * 1.6, radius * 3.2);
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(38,62,46,0.55)";
  ctx.lineWidth = Math.max(0.7, radius * 0.045);
  ctx.stroke();

  ctx.save();
  coast(1);
  ctx.clip();
  ctx.globalAlpha = 0.5;
  // Sur une île coupée en deux, une lumière verte reverdirait la moitié
  // brûlée : on éclaire alors en blanc, qui ne teinte ni l'un ni l'autre.
  ctx.fillStyle = island.terrain === "split" ? "#ffffff" : paint.high;
  traceOutline(ctx, x - radius * 0.14, y - radius * 0.16, radius, island.outline, 0.82);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (radius > 4) {
    // Le contour porte déjà la déformation de la projection ; ce qu'on
    // dessine dedans, non. On l'élargit à part.
    withStretch(ctx, x, y, env?.marks ?? 1, () => {
      if (ISLAND_SIGNATURE[island.name]) ISLAND_SIGNATURE[island.name](ctx, x, y, radius);
      else
        paintTerrainMarks(
          ctx,
          x,
          y,
          radius,
          island.terrain === "split" ? "rock" : (island.kind === "sky" ? "sky" : island.terrain),
          makeRandom(Math.floor(Math.abs(x) * 31 + Math.abs(y) * 17) || 5),
        );
    });
  }
  ctx.restore();
}

/** Un archipel : une grappe d'îlots plutôt qu'une seule masse. */
function paintCluster(ctx, x, y, radius, island, env) {
  const rng = makeRandom(Math.floor(Math.abs(x) * 31 + Math.abs(y) * 17) || 3);
  const count = 5 + Math.floor(rng() * 3);
  paintIsland(ctx, x, y, radius * 0.52, island, env);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng();
    const d = radius * (0.62 + rng() * 0.5);
    paintIsland(
      ctx,
      x + Math.cos(a) * d,
      y + Math.sin(a) * d * 0.8,
      radius * (0.26 + rng() * 0.22),
      island,
      env,
    );
  }
}



/* ── Lettrage de la carte ─────────────────────────────────────────────── */

/**
 * Les noms de zone, peints à même la texture.
 *
 * Posés en relief par le moteur 3D, ils restaient droits : un nom d'océan
 * barrait la sphère comme une réglette. Peints sur la texture, tous leurs
 * caractères tombent sur le même parallèle — le nom épouse alors la
 * courbure du globe, comme sur une carte gravée.
 *
 * La projection équirectangulaire étire l'horizontale à mesure qu'on monte
 * en latitude : sans correction, « NORTH BLUE » se lirait comprimé sur la
 * sphère. On dessine donc le texte élargi de 1/cos(latitude), ce qui le
 * rétablit exactement une fois enroulé.
 */
const LABEL_STYLE = {
  route: { fill: "rgba(222,246,253,0.66)", track: 0.3, weight: 500 },
  belt: { fill: "rgba(163,198,215,0.6)", track: 0.4, weight: 500 },
  land: { fill: "rgba(248,206,180,0.68)", track: 0.36, weight: 500 },
  blue: { fill: "rgba(200,228,241,0.56)", track: 0.46, weight: 400 },
};

const LABEL_FONT =
  'Futura, "Avenir Next", "Century Gothic", "Trebuchet MS", sans-serif';

function paintZoneLabel(ctx, w, h, zone) {
  const style = LABEL_STYLE[zone.kind] ?? LABEL_STYLE.blue;
  const stretch = 1 / Math.max(0.25, Math.cos((zone.lat * Math.PI) / 180));
  // `size` est une hauteur de lettre en degrés de latitude : le nom garde
  // la même présence quel que soit le format de la texture.
  const fontPx = (zone.size / 180) * h;
  const track = fontPx * style.track;

  ctx.save();
  ctx.font = `${style.weight} ${fontPx}px ${LABEL_FONT}`;
  ctx.textBaseline = "middle";

  const letters = [...zone.label];
  const widths = letters.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (letters.length - 1);

  // Le nom est peint trois fois, décalé d'un tour de monde : celui qui
  // chevauche le méridien 180 ne doit pas être coupé en deux.
  for (const offset of [-w, 0, w]) {
    let x = lngToX(zone.lng, w) + offset - (total * stretch) / 2;
    if (x > w + total * stretch || x + total * stretch < -total * stretch) continue;
    const y = latToY(zone.lat, h);
    for (let i = 0; i < letters.length; i++) {
      ctx.save();
      ctx.translate(x + (widths[i] * stretch) / 2, y);
      ctx.scale(stretch, 1);
      // Un liseré sombre décolle la lettre du fond sans l'alourdir.
      ctx.strokeStyle = "rgba(4,26,38,0.5)";
      ctx.lineWidth = fontPx * 0.055;
      ctx.lineJoin = "round";
      ctx.textAlign = "center";
      ctx.strokeText(letters[i], 0, 0);
      ctx.fillStyle = style.fill;
      ctx.fillText(letters[i], 0, 0);
      ctx.restore();
      x += (widths[i] + track) * stretch;
    }
  }
  ctx.restore();
}

/* ── Lieux qui ne sont pas des îles, peints à même la carte ───────────── */

/**
 * Aucun de ces lieux n'est une terre ordinaire, et aucun ne reçoit de
 * pictogramme : ils sont peints, comme le reste de la carte. Un signe posé
 * par-dessus demanderait une légende ; une forme dessinée se lit seule.
 */

/** Zou : l'île est sur le dos de Zunisha, qui marche dans la mer. */
function paintLiving(ctx, x, y, radius, island) {
  const grey = { body: "#8d8f92", shade: "#6f7276", light: "#a9acb0" };
  const r = radius;

  // Le corps, vu de profil : c'est ainsi que l'œuvre le montre.
  const body = (cx, cy, w, h) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.fillStyle = grey.shade;
  body(x - r * 0.12, y + r * 0.16, r * 0.82, r * 0.56); // masse
  ctx.fillStyle = grey.body;
  body(x - r * 0.12, y + r * 0.1, r * 0.78, r * 0.5);
  body(x + r * 0.62, y - r * 0.02, r * 0.34, r * 0.34); // tête
  ctx.fillStyle = grey.shade;
  body(x + r * 0.5, y - r * 0.08, r * 0.2, r * 0.26); // oreille

  // Les quatre colonnes qui le portent.
  ctx.fillStyle = grey.shade;
  for (const dx of [-0.6, -0.24, 0.16, 0.44]) {
    ctx.fillRect(x + r * dx, y + r * 0.4, r * 0.17, r * 0.62);
  }

  // La trompe, tournée vers la mer.
  ctx.strokeStyle = grey.body;
  ctx.lineWidth = Math.max(1.4, r * 0.15);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + r * 0.92, y + r * 0.06);
  ctx.quadraticCurveTo(x + r * 1.15, y + r * 0.4, x + r * 1.02, y + r * 0.8);
  ctx.stroke();

  // Et sur son dos, la forêt : c'est elle, l'île.
  const paint = TERRAIN.jungle;
  ctx.fillStyle = paint.low;
  traceCoast(ctx, x - r * 0.14, y - r * 0.48, r * 0.62, 12, makeRandom(4242), 0.5);
  ctx.fill();
  ctx.fillStyle = paint.high;
  ctx.globalAlpha = 0.6;
  traceCoast(ctx, x - r * 0.2, y - r * 0.56, r * 0.42, 11, makeRandom(4243), 0.45);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Une île du ciel : un banc de nuages, pas une côte. */
function paintSky(ctx, x, y, radius) {
  const lobes = [
    [-0.5, 0.12, 0.48],
    [0.02, -0.16, 0.62],
    [0.52, 0.06, 0.44],
    [-0.16, 0.28, 0.42],
    [0.28, 0.3, 0.38],
  ];
  ctx.fillStyle = "rgba(190,216,228,0.55)";
  for (const [dx, dy, r] of lobes) {
    ctx.beginPath();
    ctx.arc(x + radius * dx, y + radius * (dy + 0.12), radius * r * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#eef8fc";
  for (const [dx, dy, r] of lobes) {
    ctx.beginPath();
    ctx.arc(x + radius * dx, y + radius * dy, radius * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Un lieu du fond marin : une lueur sous la surface, pas une terre. */
function paintSeafloor(ctx, x, y, radius) {
  const halo = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 1.25);
  halo.addColorStop(0, "rgba(120,226,244,0.5)");
  halo.addColorStop(0.55, "rgba(60,150,190,0.28)");
  halo.addColorStop(1, "rgba(20,70,100,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.25, 0, Math.PI * 2);
  ctx.fill();

  // Deux cercles concentriques : la bulle qui contient l'île.
  ctx.strokeStyle = "rgba(180,240,252,0.7)";
  ctx.lineWidth = Math.max(1, radius * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Une coque, pas une côte : le Baratie, Thriller Bark, Germa 66. */
function paintShipMark(ctx, x, y, radius) {
  const r = Math.max(radius, 3);
  // Le sillage, qui dit que la chose flotte et se déplace.
  ctx.strokeStyle = "rgba(200,232,242,0.4)";
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + r * 1.9, y + r * 0.25);
  ctx.quadraticCurveTo(x + r * 0.9, y + r * 0.55, x - r * 0.2, y + r * 0.3);
  ctx.stroke();

  ctx.fillStyle = "#4b3524";
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x, y + r * 0.72, x + r, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e6dcc4";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y - r * 0.05);
  ctx.lineTo(x - r * 0.1, y - r * 1.15);
  ctx.lineTo(x + r * 0.72, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}

/** Marie-Joie : la cité murée, au sommet de la Red Line. */
function paintHoly(ctx, x, y, radius) {
  ctx.fillStyle = "#d9cdb4";
  traceCoast(ctx, x, y, radius, 14, makeRandom(777), 1);
  ctx.fill();
  ctx.strokeStyle = "#8d7f63";
  ctx.lineWidth = Math.max(1, radius * 0.09);
  for (const k of [0.78, 0.52]) {
    ctx.beginPath();
    ctx.arc(x, y, radius * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#f4e9cd";
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.26, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Red Port : un bassin ouvert sur la mer, fermé par deux môles.
 *
 * C'est la seule porte du continent côté Paradise : elle doit se trouver du
 * premier coup d'œil, sans quoi on cherche par où l'on monte à Marie-Joie.
 */
function paintPort(ctx, x, y, radius) {
  const r = Math.max(radius, 4);
  const quay = "#7f6d55";

  // Le quai, adossé au continent.
  ctx.fillStyle = quay;
  traceCoast(ctx, x - r * 0.35, y, r * 0.95, 11, makeRandom(31337), 1.1);
  ctx.fill();

  // Le bassin, creusé dedans et ouvert vers l'est.
  ctx.fillStyle = "#12607f";
  ctx.beginPath();
  ctx.moveTo(x + r * 1.1, y - r * 0.62);
  ctx.quadraticCurveTo(x - r * 0.15, y - r * 0.52, x - r * 0.15, y);
  ctx.quadraticCurveTo(x - r * 0.15, y + r * 0.52, x + r * 1.1, y + r * 0.62);
  ctx.closePath();
  ctx.fill();

  // Les deux môles qui referment la passe.
  ctx.strokeStyle = quay;
  ctx.lineWidth = Math.max(1.4, r * 0.22);
  ctx.lineCap = "round";
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + r * 1.05, y + sign * r * 0.62);
    ctx.lineTo(x + r * 0.35, y + sign * r * 0.34);
    ctx.stroke();
  }

  // Les entrepôts alignés le long du quai.
  ctx.fillStyle = "#5c4a37";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - r * (0.95 - i * 0.26), y - r * 0.16, r * 0.18, r * 0.32);
  }
}

/** Une ville posée sur une île déjà peinte : quelques toits, rien de plus. */
function paintSettlement(ctx, x, y, radius) {
  const rng = makeRandom(Math.floor(Math.abs(x) * 13 + Math.abs(y) * 29) || 11);
  const r = Math.max(radius, 2.4);
  ctx.fillStyle = "#6d4f3d";
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r * 0.9;
    const s = r * (0.3 + rng() * 0.22);
    ctx.fillRect(x + Math.cos(a) * d - s / 2, y + Math.sin(a) * d - s / 2, s, s * 1.25);
  }
  ctx.fillStyle = "rgba(233,214,176,0.85)";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

/** Un ouvrage : la régularité d'un plan, là où une île est irrégulière. */
function paintWorks(ctx, x, y, radius, island) {
  const paint = TERRAIN[island.terrain] ?? TERRAIN.rock;
  const sides = 7;
  const ring = (r, fill) => {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r * 0.9;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ring(radius * 1.12, paint.shore);
  ring(radius, paint.low);
  ring(radius * 0.66, paint.high);
  ctx.fillStyle = paint.mark;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

/** Le Triangle de Florian : une nappe de brume, sans côte. */
function paintFog(ctx, x, y, radius) {
  const fog = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius * 1.6);
  fog.addColorStop(0, "rgba(196,208,216,0.34)");
  fog.addColorStop(1, "rgba(150,168,180,0)");
  ctx.fillStyle = fog;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * La Calm Belt est déjà peinte : ce sont les deux bandes mates qui bordent
 * Grand Line. Elle n'a donc rien à recevoir de plus.
 */
const paintNothing = () => {};

const KIND_PAINTER = {
  living: paintLiving,
  sky: paintSky,
  seafloor: paintSeafloor,
  ship: paintShipMark,
  holy: paintHoly,
  port: paintPort,
  settlement: paintSettlement,
  works: paintWorks,
};

/** Choisit la façon de peindre un lieu selon ce qu'il est. */
function painterFor(island) {
  if (island.name === "Calm Belt") return paintNothing;
  if (island.kind === "zone") return paintFog;
  if (island.terrain === "mountain") return paintReverseMountain;
  // Un ouvrage reste une terre : quand on possède son contour relevé, il
  // vaut mieux que le plan régulier qu'on lui inventait — Enies Lobby et
  // Egghead y perdaient leur forme au profit d'un heptagone.
  if (island.kind === "works" && island.outline) return paintIsland;
  if (KIND_PAINTER[island.kind]) return KIND_PAINTER[island.kind];
  if (island.outline) return paintIsland;
  return island.archipelago ? paintCluster : paintIsland;
}

/**
 * Rayon d'un lieu en pixels de texture.
 *
 * Un contour relevé donne son étendue en degrés : on la convertit. Sinon on
 * retombe sur l'échelle en huit rangs, pour les lieux que la source ne
 * connaît pas.
 */
function islandRadius(island, w) {
  if (island.radius != null) {
    return (Math.min(island.radius, MAX_MEASURED_RADIUS) / 180) * (w / 2);
  }
  return (SIZE_RADIUS[island.scale] ?? SIZE_RADIUS[3]) * (w / 4096) * 3.2;
}

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
  paintGraticule(ctx, w, h);

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
    g.addColorStop(edge, "rgba(226,238,242,0.4)");
    g.addColorStop(1 - edge, "rgba(226,238,242,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y1, w, y2 - y1);
  }

  // Le lettrage passe sous les terres : un nom d'océan qui court derrière
  // une côte se lit encore, un nom qui la barre ne se lit plus.
  for (const zone of ZONES) paintZoneLabel(ctx, w, h, zone);

  // Les grandes îles en premier : une petite posée dessus doit rester
  // lisible, l'inverse la ferait disparaître.
  const drawn = islands
    .slice()
    .sort((a, b) => (b.scale ?? 3) - (a.scale ?? 3));

  for (const island of drawn) {
    const x = lngToX(island.lng, w);
    const y = latToY(island.lat, h);
    const radius = islandRadius(island, w);
    const draw = painterFor(island);
    // La projection écrase l'horizontale à mesure qu'on monte en latitude :
    // un cercle peint ici devient une ellipse couchée une fois la sphère
    // enroulée. On l'élargit d'autant, exactement comme pour le lettrage.
    // Les contours relevés, eux, viennent d'une carte de même projection :
    // ils portent déjà la déformation, il ne faut pas la leur ajouter.
    const env = {
      w,
      h,
      stretch: island.outline
        ? 1
        : Math.min(4, 1 / Math.max(0.25, Math.cos((island.lat * Math.PI) / 180))),
      marks: Math.min(4, 1 / Math.max(0.25, Math.cos((island.lat * Math.PI) / 180))),
    };
    // Enroulement : une île près du méridien 180 doit apparaître des deux côtés.
    for (const offset of [-w, 0, w]) {
      if (x + offset > -radius * 4 && x + offset < w + radius * 4) {
        withStretch(ctx, x + offset, y, env.stretch, () =>
          draw(ctx, x + offset, y, radius, island, env),
        );
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

  const halfWidth = (w / 360) * RED_LINE_HALF_WIDTH;
  ctx.fillStyle = "#ffffff";
  for (const lng of RED_LINE_LNG) {
    const cx = lngToX(lng, w);
    for (const offset of [-w, 0, w]) {
      ctx.fillRect(cx + offset - halfWidth, 0, halfWidth * 2, h);
    }
  }

  ctx.fillStyle = "#9a9a9a";
  for (const island of islands) {
    if (!HAS_RELIEF(island)) continue;
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
