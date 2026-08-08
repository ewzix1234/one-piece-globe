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
  land: "#3f7a4f",
  landHigh: "#5c9a63",
  sand: "#c9a86a",
  ice: "#cfe3ea",
  ash: "#5b5f55", // ce qu'il reste d'une île rayée de la carte
};

/**
 * Un lieu ne pose une terre sur la carte que s'il en est une.
 *
 * Peindre un continent pour la Calm Belt, une côte pour le Baratie ou une
 * île pour le Royaume de Ryugu — qui est à dix mille mètres de fond —
 * rendrait la carte fausse à l'endroit précis où elle prétend informer.
 * Ces lieux gardent leur marqueur et leur pictogramme, sans relief.
 */
const NO_LAND = new Set(["zone", "seafloor", "ship"]);
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

/** Dessine une île : un contour irrégulier, plus une frange de sable. */
function paintIsland(ctx, x, y, radius, tint) {
  const points = 14;
  const trace = (r, rng) => {
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const jitter = 0.62 + rng() * 0.72;
      const px = x + Math.cos(angle) * r * jitter;
      const py = y + Math.sin(angle) * r * jitter * 0.82;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  // Le tirage aléatoire doit être identique pour les deux passes, sinon
  // le sable ne suit pas le contour de la terre.
  const seed = Math.floor(x * 7919 + y * 104729);
  const sandRand = makeRandom(seed);
  const landRand = makeRandom(seed);

  ctx.fillStyle = PALETTE.sand;
  trace(radius * 1.22, sandRand);
  ctx.fill();

  ctx.fillStyle = tint ?? PALETTE.land;
  trace(radius, landRand);
  ctx.fill();
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

  for (const island of islands) {
    if (!DRAWS_LAND(island)) continue;
    const x = lngToX(island.lng, w);
    const y = latToY(island.lat, h);
    const radius = (2.6 + (island.scale ?? 3) * 1.9) * (w / 4096) * 3.2;
    const tint =
      island.kind === "sky" || island.sea === "Ciel"
        ? PALETTE.ice
        : island.kind === "lost"
          ? PALETTE.ash
          : undefined;
    // Enroulement : une île près du méridien 180 doit apparaître des deux côtés.
    for (const offset of [-w, 0, w]) {
      if (x + offset > -radius * 3 && x + offset < w + radius * 3) {
        paintIsland(ctx, x + offset, y, radius, tint);
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
    const radius = (2.6 + (island.scale ?? 3) * 1.9) * (w / 4096) * 3.2;
    for (const offset of [-w, 0, w]) {
      ctx.beginPath();
      ctx.ellipse(x + offset, y, radius, radius * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas;
}
