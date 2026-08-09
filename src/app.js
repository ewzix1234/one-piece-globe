import { drawWorldTexture, drawBumpTexture, RED_LINE_LNG } from "./texture.js";

const GLOBE_RADIUS = 100; // unité interne de globe.gl
const $ = (id) => document.getElementById(id);

const state = {
  islands: [],
  sagas: [],
  kinds: {},
  bySaga: new Map(),
  selected: null,
  route: [],
};

/* ── Géodésie ─────────────────────────────────────────────────────────── */

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Relèvement initial du grand cercle allant de a vers b, en degrés. */
function bearing(a, b) {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Distance angulaire entre deux points, en degrés d'arc. */
function angularDistance(a, b) {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δφ = φ2 - φ1;
  const Δλ = toRad(b.lng - a.lng);
  const h =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return toDeg(2 * Math.asin(Math.min(1, Math.sqrt(h))));
}

/**
 * Point à la fraction `t` du grand cercle allant de a vers b.
 *
 * Une interpolation linéaire des latitudes et longitudes ferait passer le
 * navire à côté de la route : sur une sphère, le chemin le plus court n'est
 * pas une droite sur la carte plate. On interpole donc les vecteurs.
 */
function along(a, b, t) {
  const d = toRad(angularDistance(a, b));
  if (d < 1e-9) return { lat: a.lat, lng: a.lng };
  const φ1 = toRad(a.lat);
  const λ1 = toRad(a.lng);
  const φ2 = toRad(b.lat);
  const λ2 = toRad(b.lng);
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return {
    lat: toDeg(Math.atan2(z, Math.hypot(x, y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

/* ── Données ──────────────────────────────────────────────────────────── */

async function loadData() {
  const res = await fetch("data/islands.json");
  if (!res.ok) throw new Error(`données indisponibles (HTTP ${res.status})`);
  const payload = await res.json();
  state.islands = payload.islands;
  state.sagas = payload.sagas;
  state.kinds = payload.kinds ?? {};
  state.bySaga = new Map(payload.sagas.map((s) => [s.id, s]));
  state.route = payload.islands
    .filter((i) => i.step)
    .sort((a, b) => a.step - b.step);
}


/**
 * Ce que la mer d'appartenance veut dire.
 *
 * « Paradise » sonne comme une mer à part, alors que c'est la première
 * moitié de Grand Line : la route est une, la Red Line la coupe en deux.
 */
/** Ce que dit la taille, du continent au lieu-dit. */
const SIZE_LABEL = {
  8: "un continent",
  7: "un grand royaume",
  6: "une très grande île",
  5: "une grande île",
  4: "une île",
  3: "une petite île",
  2: "un îlot",
  1: "un lieu-dit",
};

/** Ce que dit le terrain, tel qu'il est peint sur la carte. */
const TERRAIN_LABEL = {
  forest: "boisé",
  jungle: "jungle",
  desert: "désert",
  snow: "neige et glace",
  city: "urbanisé",
  rock: "roche nue",
  cake: "sucre et pâtisserie",
  ash: "cendres",
  split: "feu d'un côté, glace de l'autre",
  mountain: "massif de la Red Line",
};

const SEA_NOTE = {
  Paradise: "première moitié de Grand Line",
  "Nouveau Monde": "seconde moitié de Grand Line",
  "Calm Belt": "ceinture sans vent qui borde Grand Line",
  "Red Line": "le continent qui ceint le globe",
  Ciel: "au-dessus des nuages",
};

/* ── Globe ────────────────────────────────────────────────────────────── */

let globe;
let small = false;

/**
 * Points d'un grand cercle, au format [lat, lng, altitude].
 * L'altitude est portée par le point lui-même : l'accesseur de globe.gl
 * ne reçoit que le point, jamais le chemin auquel il appartient.
 */
function redLineRing(alt) {
  const points = [];
  for (let lat = -90; lat <= 90; lat += 2) points.push([lat, RED_LINE_LNG[0], alt]);
  for (let lat = 90; lat >= -90; lat -= 2) points.push([lat, RED_LINE_LNG[1], alt]);
  points.push(points[0]);
  return points;
}

function grandLineRing(alt) {
  const points = [];
  for (let lng = -180; lng <= 180; lng += 2) points.push([0, lng, alt]);
  return points;
}

/**
 * Le téléphone n'a ni la mémoire graphique ni la bande passante d'un
 * ordinateur : on divise la texture par deux et on plafonne la densité
 * de pixels, sans quoi Safari abandonne le contexte WebGL.
 */
const isHandheld = () =>
  window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;

/**
 * Chemins permanents : Red Line et Grand Line.
 *
 * Les deux anneaux sont calculés une fois pour toutes. La trace du voyage
 * s'y ajoute et se redessine dix fois par seconde pendant la lecture :
 * recalculer les anneaux au même rythme serait du gaspillage pur.
 */
let BASE_PATHS = null;
const basePaths = () =>
  (BASE_PATHS ??= [
    { id: "red-line", points: redLineRing(0.009), color: "#c98460", stroke: 1.5 },
    { id: "grand-line", points: grandLineRing(0.005), color: "#6fd4e8", stroke: 0.5 },
  ]);

function refreshPaths() {
  const paths = [...basePaths()];
  if (cine.trail.length > 1) paths.push(cine.trailPath());
  globe.pathsData(paths);
}

/**
 * La texture est peinte localement : on la passe en data URL plutôt que par
 * une requête réseau, pour garder le site utilisable hors-ligne.
 */
const toUrl = (canvas) =>
  canvas.convertToBlob
    ? canvas.convertToBlob({ type: "image/png" }).then(URL.createObjectURL)
    : Promise.resolve(canvas.toDataURL("image/png"));

function buildGlobe() {
  small = isHandheld();
  const world = drawWorldTexture(state.islands, small ? 2048 : 4096);
  const bump = drawBumpTexture(state.islands, small ? 1024 : 2048);

  globe = new Globe($("scene"), { animateIn: true })
    .globeImageUrl(null)
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true)
    .atmosphereColor("#59b6cf")
    .atmosphereAltitude(0.15)
    .width(window.innerWidth)
    .height(window.innerHeight);

  Promise.all([toUrl(world), toUrl(bump)]).then(([worldUrl, bumpUrl]) => {
    globe.globeImageUrl(worldUrl).bumpImageUrl(bumpUrl);
  });

  // Red Line et Grand Line : deux grands cercles perpendiculaires, en relief.
  // Le troisième chemin, absent au départ, est la trace du voyage rejoué.
  globe
    .pathPoints("points")
    .pathPointLat((p) => p[0])
    .pathPointLng((p) => p[1])
    .pathPointAlt((p) => p[2])
    .pathColor((path) => path.color)
    .pathStroke((path) => path.stroke)
    .pathDashLength((path) => path.dashLength ?? 1)
    .pathDashGap((path) => path.dashGap ?? 0)
    .pathDashAnimateTime((path) => path.dashAnimate ?? 0)
    .pathTransitionDuration(0);
  refreshPaths();

  // La route de l'équipage, escale après escale. Les arcs rasent la surface :
  // une route maritime se lit au ras de l'eau, pas en pointes vers le ciel.
  const legs = state.route.slice(0, -1).map((from, i) => ({
    from,
    to: state.route[i + 1],
    step: from.step,
  }));
  globe
    .arcsData(legs)
    .arcStartLat((d) => d.from.lat)
    .arcStartLng((d) => d.from.lng)
    .arcEndLat((d) => d.to.lat)
    .arcEndLng((d) => d.to.lng)
    .arcColor(() => ["rgba(217,79,48,0.18)", "rgba(240,140,90,0.85)"])
    .arcStroke(0.32)
    .arcAltitude(0.012)
    .arcDashLength(0.4)
    .arcDashGap(0.18)
    .arcDashAnimateTime(6500)
    .arcsTransitionDuration(0);

  // Zones sensibles : les îles peintes sur la texture sont ce qu'on voit et
  // ce qu'on clique. Ces cylindres transparents ne servent qu'à recevoir le
  // pointeur — une pastille de couleur par-dessus chaque terre encombrerait
  // la carte sans rien dire de plus.
  globe
    .pointsData(state.islands)
    .pointLat("lat")
    .pointLng("lng")
    .pointColor(() => "rgba(0,0,0,0)")
    .pointAltitude(0.02)
    .pointRadius((d) => 0.5 + (d.scale ?? 3) * 0.28)
    .pointLabel(
      (d) =>
        `<div class="tip"><strong>${escape(d.name)}</strong><span>${escape(d.sea)}${d.kind && state.kinds[d.kind] ? ` · ${escape(state.kinds[d.kind].label)}` : ""}${d.step ? ` · escale ${d.step}` : ""}</span></div>`,
    )
    .onPointClick((d) => select(d, { fly: true }))
    .onPointHover((d) => {
      document.body.style.cursor = d ? "pointer" : "";
    })
    .pointsTransitionDuration(260);

  // Couche HTML : les pictogrammes de nature, et le navire de la lecture
  // cinématique. Une seule couche existe, ils la partagent.
  globe
    .htmlElementsData([])
    .htmlLat("lat")
    .htmlLng("lng")
    .htmlAltitude((d) => d.alt ?? 0.03)
    .htmlElement((d) => d.el)
    .htmlTransitionDuration(0)
    // Un pictogramme situé de l'autre côté du globe ne doit pas flotter
    // par-dessus la face qu'on regarde.
    .htmlElementVisibilityModifier((el, visible) => {
      el.style.opacity = visible ? "" : "0";
      el.style.pointerEvents = visible ? "" : "none";
    });
  refreshShipLayer();

  // Anneau de sélection.
  globe
    .ringsData([])
    .ringLat("lat")
    .ringLng("lng")
    .ringColor(() => (t) => `rgba(242,181,68,${1 - t})`)
    .ringMaxRadius(4.5)
    .ringPropagationSpeed(2.2)
    .ringRepeatPeriod(1100);

  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.28;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // On peut désormais reculer jusqu'à voir la planète entière et le vide
  // autour : c'est la seule façon de lire d'un coup les deux moitiés de
  // Grand Line et les quatre Blues.
  controls.minDistance = GLOBE_RADIUS * (1 + MIN_ALTITUDE);
  controls.maxDistance = GLOBE_RADIUS * (1 + MAX_ALTITUDE);
  controls.addEventListener("start", () => {
    if (!cine.active) controls.autoRotate = false;
  });

  // Poignée de mise au point : permet de piloter la caméra depuis la
  // console ou depuis les tests de bout en bout.
  window.blueStar = { globe, state, cine };

  // Sur un écran étroit, la sphère déborde en largeur : on recule.
  globe.pointOfView({ lat: 12, lng: 60, altitude: small ? 3.7 : 2.6 }, 0);

  // Sur mobile, la densité de pixels native fait tripler le nombre de
  // fragments à calculer pour un gain invisible. On la plafonne à 2.
  // Une carte n'a pas de reflet. Le matériau par défaut de globe.gl est
  // brillant : il posait une tache spéculaire au milieu de l'océan, qui
  // faisait lire la sphère comme une boule de plastique.
  const material = globe.globeMaterial?.();
  if (material) {
    material.shininess = 1.5;
    material.specular?.setHex(0x0a2733);
    material.bumpScale = 3.5;
    material.needsUpdate = true;
  }

  // La scène par défaut de globe.gl est réglée pour une photo satellite,
  // sombre par nature. Une carte à l'encre doit être lisible d'un bout à
  // l'autre du globe, y compris là où le soleil ne tape pas.
  for (const light of globe.lights?.() ?? []) {
    light.intensity *= light.isAmbientLight ? 1.75 : 1.15;
  }

  const renderer = globe.renderer?.();
  if (renderer?.setPixelRatio) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2));
  }

  // Le redimensionnement doit aussi rebasculer entre les deux réglages de
  // densité : passer en paysage sur tablette double la surface à peindre.
  const resize = () => globe.width(window.innerWidth).height(window.innerHeight);
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 150));
}

/* ── Éloignement ──────────────────────────────────────────────────────── */

// Molette et pincement suffisent : on garde seulement les bornes, assez
// larges pour reculer jusqu'à voir la planète entière.
const MIN_ALTITUDE = 0.32;
const MAX_ALTITUDE = 9;

/* ── Couche HTML : le navire de la lecture ────────────────────────────── */

/**
 * La couche ne porte plus qu'un objet, le navire du voyage rejoué. Tout le
 * reste — les îles, les nuages, la bulle du fond marin, les coques, la cité
 * murée — est peint sur la sphère, où il n'a besoin d'aucune légende.
 */
function refreshShipLayer() {
  globe.htmlElementsData(cine.ship ? [cine.ship] : []);
}

/* ── Sélection ────────────────────────────────────────────────────────── */

function select(island, { fly = false, quiet = false, panel = true } = {}) {
  state.selected = island;
  // L'adresse suit la sélection : on peut envoyer une île à quelqu'un.
  if (!quiet) {
    const hash = island ? `#${island.id}` : "";
    if (location.hash !== hash) {
      history.replaceState(null, "", hash || location.pathname + location.search);
    }
  }
  globe.ringsData(island ? [island] : []);

  if (island && fly) {
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: island.lat, lng: island.lng, altitude: 1.7 }, 900);
  }

  if (panel) {
    renderStopCard(null);
    renderRecord(island);
  } else {
    renderRecord(null);
    renderStopCard(island);
  }
  updateVoyage();
}

/**
 * Bandeau d'escale, pour la navigation aux flèches.
 *
 * Ouvrir la fiche pleine à chaque flèche revenait à recouvrir le globe
 * qu'on est en train de parcourir — sur téléphone, elle prenait les deux
 * tiers de l'écran. Le bandeau dit l'essentiel et laisse voir la carte ; la
 * fiche complète reste à un clic.
 */
function renderStopCard(island) {
  const card = $("stopcard");
  if (!island) {
    card.hidden = true;
    document.body.classList.remove("card-open");
    return;
  }
  const bits = [];
  if (island.step) bits.push(`Escale ${island.step} / ${state.route.length}`);
  bits.push(island.sea);
  if (island.days) bits.push(shortDays(island.days));
  $("stopcard-name").textContent = island.name;
  $("stopcard-meta").textContent = bits.filter(Boolean).join(" · ");
  const deed = $("stopcard-deed");
  deed.textContent = island.deed ?? "";
  deed.hidden = !island.deed;
  card.hidden = false;
  document.body.classList.add("card-open");
}

/* ── Fiche ────────────────────────────────────────────────────────────── */

const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/**
 * Durée d'une escale, en clair.
 *
 * Les deux ans d'entraînement ne se lisent pas en « 730 jours », et une
 * escale d'un jour ne se lit pas « 1 jours ».
 */
function formatDays(days) {
  if (days >= 365) {
    const years = Math.round(days / 365);
    return years === 1 ? "un an" : `${years} ans`;
  }
  if (days >= 28) return `environ ${Math.round(days / 7)} semaines`;
  return days === 1 ? "un jour" : `environ ${days} jours`;
}

/**
 * Résumé de la fiche, écourté quand il est long.
 *
 * Dix fiches dépassent six cents signes et noyaient le récit d'escale sous
 * une notice. On coupe à la fin d'une phrase, jamais au milieu d'un mot, et
 * on laisse dérouler le reste à la demande.
 */
const SUMMARY_LIMIT = 340;

function renderSummary(summary) {
  if (!summary) return "";
  if (summary.length <= SUMMARY_LIMIT) {
    return `<p class="record-summary">${escape(summary)}</p>`;
  }
  // On cherche la dernière fin de phrase avant la limite ; à défaut, le
  // dernier espace, pour ne jamais couper un mot en deux.
  const head = summary.slice(0, SUMMARY_LIMIT);
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf(" ; "));
  const cut = sentence > SUMMARY_LIMIT * 0.5 ? sentence + 1 : head.lastIndexOf(" ");
  return `<div class="record-summary">
    <p>${escape(summary.slice(0, cut).trim())}</p>
    <p class="record-more" hidden>${escape(summary.slice(cut).trim())}</p>
    <button type="button" class="record-unfold">Lire la suite</button>
  </div>`;
}

/** Le quadrant du monde où tombe un lieu. */
function quadrant(island) {
  const east = island.lng > RED_LINE_LNG[0] && island.lng < RED_LINE_LNG[1];
  const north = island.lat >= 0;
  return `hémisphère ${east ? "est" : "ouest"}, ${north ? "nord" : "sud"}`;
}

/** Écart de longitude au méridien de Red Line le plus proche, en degrés. */
function toRedLine(island) {
  return Math.min(
    ...RED_LINE_LNG.map((lng) => {
      const d = Math.abs(island.lng - lng);
      return d > 180 ? 360 - d : d;
    }),
  );
}

function renderRecord(island) {
  const host = $("record-scroll");
  if (!island) {
    document.body.classList.remove("panel-open");
    return;
  }

  const saga = state.bySaga.get(island.saga);
  const tagLabel = {
    crew: "Escale de l'équipage",
    story: "Lieu de l'histoire",
    character: "Repaire d'un personnage",
  }[island.tag];

  const rows = [];
  if (island.step) rows.push(["Escale", `n° ${island.step} du voyage`]);
  if (island.days) {
    // L'origine de la durée est dite, pas sous-entendue : une estimation
    // affichée comme un fait est une erreur, même quand elle est juste.
    const basis = island.daysBasis === "récit" ? "établi par le récit" : "estimation";
    rows.push(["Temps sur place", `${formatDays(island.days)} — ${basis}`]);
  }
  const note = SEA_NOTE[island.sea];
  rows.push(["Mer", note ? `${island.sea} — ${note}` : island.sea]);
  if (island.kind && state.kinds[island.kind]) {
    const { label, hint } = state.kinds[island.kind];
    rows.push(["Nature", hint ? `${label} — ${hint}` : label]);
  }
  if (saga) rows.push(["Saga", saga.label]);
  if (island.chapter) {
    const first = [`chapitre ${island.chapter}`];
    if (island.episode) first.push(`épisode ${island.episode}`);
    rows.push(["Première apparition", first.join(" · ")]);
  }
  if (island.ruler) rows.push(["Dirigeant", island.ruler]);
  if (island.affiliation) rows.push(["Affiliation", island.affiliation]);
  if (island.people?.length) rows.push(["Figures", island.people.join(", ")]);

  // Ce que la carte montre du lieu, mis en mots.
  const size = SIZE_LABEL[island.scale];
  const terrain = TERRAIN_LABEL[island.terrain];
  if (size) rows.push(["Étendue", terrain ? `${size}, ${terrain}` : size]);

  // Où l'on se trouve dans le monde, et par rapport à ce qui le structure.
  rows.push([
    "Coordonnées",
    `${Math.abs(island.lat).toFixed(1)}° ${island.lat >= 0 ? "N" : "S"} · ${Math.abs(island.lng).toFixed(1)}° ${island.lng >= 0 ? "E" : "O"} — ${quadrant(island)}`,
  ]);
  rows.push(["De la Red Line", `${toRedLine(island).toFixed(0)}° de longitude`]);

  // La route : d'où l'on vient, où l'on va, et à quel cap.
  const index = state.route.findIndex((i) => i.id === island.id);
  if (index > 0) {
    const from = state.route[index - 1];
    rows.push([
      "Depuis l'escale précédente",
      `${from.name} — ${angularDistance(from, island).toFixed(1)}° d'arc, cap au ${Math.round(bearing(from, island))}°`,
    ]);
  }
  if (index >= 0 && index < state.route.length - 1) {
    rows.push(["Escale suivante", state.route[index + 1].name]);
  }

  // Les autres noms sous lesquels le lieu circule : traduction, translittération, surnom.
  const others = (island.aliases ?? []).filter(
    (a) => a !== island.nameJp && a !== island.nameRomaji,
  );
  if (others.length) rows.push(["Autres noms", others.slice(0, 6).join(", ")]);

  host.innerHTML = `
    ${
      island.image
        ? `<figure class="record-hero">
             <img src="${escape(island.image)}" alt="${escape(island.name)}" loading="lazy" decoding="async" width="720" height="400" />
           </figure>`
        : ""
    }
    <div class="record-body">
      <p class="record-eyebrow">${escape(tagLabel)}</p>
      <h2>${escape(island.name)}</h2>
      ${island.nameJp ? `<p class="record-jp">${escape(island.nameJp)}${island.nameRomaji ? ` · ${escape(island.nameRomaji)}` : ""}</p>` : ""}
      <dl class="record-meta">
        ${rows.map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join("")}
      </dl>
      ${
        island.deed
          ? `<section class="record-deed">
               <h3>Ce que l'équipage y a fait</h3>
               <p>${escape(island.deed)}</p>
             </section>`
          : ""
      }
      ${island.note ? `<p class="record-note">${escape(island.note)}</p>` : ""}
      ${renderSummary(island.summary)}
    </div>
  `;
  host.querySelector(".record-unfold")?.addEventListener("click", (event) => {
    event.currentTarget.previousElementSibling.hidden = false;
    event.currentTarget.remove();
  });
  host.scrollTop = 0;
  document.body.classList.add("panel-open");
}

/* ── Recherche ────────────────────────────────────────────────────────── */

const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function setupSearch() {
  const input = $("search-input");
  const list = $("search-results");

  const close = () => {
    list.innerHTML = "";
  };

  input.addEventListener("input", () => {
    const q = fold(input.value.trim());
    if (q.length < 1) return close();

    // Un nom trouvé par son alias est affiché avec l'alias, sinon on ne
    // comprend pas pourquoi « wano » renvoie « Pays des Wa ».
    const hits = [];
    for (const island of state.islands) {
      if (fold(island.name).includes(q)) {
        hits.push({ island, via: null, rank: 0 });
        continue;
      }
      const alias = (island.aliases ?? []).find((a) => fold(a).includes(q));
      if (alias) {
        hits.push({ island, via: alias, rank: 1 });
        continue;
      }
      const person = (island.people ?? []).find((p) => fold(p).includes(q));
      if (person) {
        hits.push({ island, via: person, rank: 2 });
        continue;
      }
      if (fold(island.sea).includes(q)) {
        hits.push({ island, via: island.sea, rank: 3 });
        continue;
      }
      // « Kuina », « Buster Call », « ombre » : ce que l'équipage y a fait
      // est souvent le seul souvenir qu'on garde d'une île.
      if (q.length >= 3 && island.deed && fold(island.deed).includes(q)) {
        hits.push({ island, via: "dans le récit de l'escale", rank: 4 });
      }
    }
    hits.sort((a, b) => a.rank - b.rank || a.island.name.localeCompare(b.island.name, "fr"));

    list.innerHTML = hits
      .slice(0, 8)
      .map(
        ({ island, via }) =>
          `<li role="option"><button type="button" data-id="${escape(island.id)}">
            <span>${escape(island.name)}</span>
            <span class="result-sea">${escape(via ?? island.sea)}</span>
          </button></li>`,
      )
      .join("");
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    const island = state.islands.find((i) => i.id === button.dataset.id);
    if (island) {
      select(island, { fly: true });
    }
    input.value = "";
    close();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      input.value = "";
      close();
    }
    if (event.key === "Enter") {
      list.querySelector("button")?.click();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search")) close();
  });
}

/* ── Route de l'équipage, à la main ───────────────────────────────────── */

function stepIndex() {
  if (!state.selected?.step) return -1;
  return state.route.findIndex((i) => i.id === state.selected.id);
}

function updateVoyage() {
  const label = $("voyage-step");
  // Pendant la lecture, la barre est masquée et les flèches inertes : deux
  // pilotes sur la même route se marcheraient dessus.
  if (cine.active) {
    label.textContent = "Lecture en cours";
    $("voyage-prev").disabled = true;
    $("voyage-next").disabled = true;
    return;
  }
  const index = stepIndex();
  if (index === -1) {
    label.textContent = "Route de l'équipage";
    $("voyage-prev").disabled = false;
    $("voyage-next").disabled = false;
    return;
  }
  label.textContent = `Escale ${index + 1} / ${state.route.length}`;
  $("voyage-prev").disabled = index === 0;
  $("voyage-next").disabled = index === state.route.length - 1;
}

function stepBy(delta) {
  if (cine.active) return;
  const index = stepIndex();
  const next = index === -1 ? (delta > 0 ? 0 : state.route.length - 1) : index + delta;
  const island = state.route[clamp(next, 0, state.route.length - 1)];
  if (!island) return;
  select(island, { fly: true, panel: false });
}

/* ── Lecture cinématique du voyage ────────────────────────────────────── */

/**
 * Le voyage rejoué de bout en bout : un navire suit la route escale après
 * escale, marque un temps d'arrêt à chaque terre, et laisse derrière lui
 * une trace en pointillés rouges.
 *
 * Trois coques se succèdent, comme dans le récit : la barque des débuts
 * jusqu'à Syrup, le Vogue Merry jusqu'à Enies Lobby, le Thousand Sunny
 * ensuite. Le navire est un élément HTML posé sur la sphère : le dessin
 * reste net à toutes les densités d'écran, sans texture à charger.
 */
const SHIPS = {
  merry: { name: "Vogue Merry", image: "data/ship/vogue-merry.webp" },
  sunny: { name: "Thousand Sunny", image: "data/ship/thousand-sunny.webp" },
};

/** Coque en service au départ de l'escale n. */
function shipAtStep(step) {
  // Le Merry mène l'équipage jusqu'à Water Seven, où il brûle ; le Sunny
  // prend la suite à partir d'Enies Lobby.
  return step <= 20 ? "merry" : "sunny";
}

/**
 * Temps d'arrêt à quai, réglé sur le temps que l'équipage y a passé.
 *
 * L'échelle est logarithmique : les deux ans de Rusukaina ne peuvent pas
 * durer sept cents fois l'escale d'un jour, mais ils doivent se sentir.
 */
const dwellDuration = (days) =>
  clamp(900 + Math.log2(1 + (days ?? 1)) * 620, 1100, 4600);

const SAIL_MIN = 900;
const SAIL_MAX = 4200;
const sailDuration = (arc) => clamp(700 + arc * 55, SAIL_MIN, SAIL_MAX);

/** Durée d'escale en clair, pour le bandeau de lecture. */
function shortDays(days, basis) {
  if (!days) return null;
  const mark = basis === "estimation" ? " ≈" : "";
  void mark;
  if (days >= 365) {
    const years = Math.round(days / 365);
    return years === 1 ? "un an à terre" : `${years} ans à terre`;
  }
  if (days >= 28) return `≈ ${Math.round(days / 7)} semaines à terre`;
  return days === 1 ? "≈ 1 jour à terre" : `≈ ${days} jours à terre`;
}

const cine = {
  active: false,
  paused: false,
  finished: false,
  speed: 1,
  leg: 0, // escale de départ, index dans state.route
  phase: "dwell", // "dwell" à quai, "sail" en mer
  elapsed: 0,
  raf: null,
  last: 0,
  trail: [], // [lat, lng, alt] déjà parcourus
  lastTrailPush: 0,
  dayCount: 0, // jours cumulés depuis le départ de Fuchsia
  ship: null, // datum de la couche HTML
  hull: null,

  /** Le chemin en pointillés rouges, redessiné à mesure qu'il s'allonge. */
  trailPath() {
    // Le motif de tirets de globe.gl est une fraction du chemin entier :
    // sans compensation, les points s'étireraient à mesure que la trace
    // s'allonge. On règle donc le motif sur la longueur réelle.
    const arc = Math.max(1, this.trailArc);
    const dots = clamp(Math.round(arc / 2.2), 8, 900);
    return {
      id: "cine-trail",
      points: this.trail,
      color: "#ff5237",
      stroke: 0.62,
      dashLength: 0.55 / dots,
      dashGap: 0.45 / dots,
    };
  },
  trailArc: 0,
};

function makeShipElement() {
  const el = document.createElement("div");
  el.className = "ship";
  el.innerHTML = `<img alt="" decoding="async" /><span class="ship-wake"></span>`;
  return el;
}

function setHull(hull) {
  if (cine.hull === hull) return;
  cine.hull = hull;
  const image = cine.ship.el.querySelector("img");
  image.src = SHIPS[hull].image;
  image.alt = SHIPS[hull].name;
  cine.ship.el.dataset.hull = hull;
  cine.ship.el.title = SHIPS[hull].name;
}

/** Place le navire sans repasser par un cycle complet de la couche HTML. */
function moveShip(lat, lng, heading) {
  cine.ship.lat = lat;
  cine.ship.lng = lng;
  const object = cine.ship.__threeObjHtml;
  if (object && globe.getCoords) {
    Object.assign(object.position, globe.getCoords(lat, lng, cine.ship.alt));
  }
  // Les deux dessins ont la proue tournée vers la gauche : on retourne la
  // coque quand la route file vers l'est. Sur un élément projeté à l'écran,
  // le cap géographique n'est pas un angle d'écran — le bord suffit.
  cine.ship.el.classList.toggle("ship-east", heading < 180);
}

/**
 * Reconstruit la trace du départ jusqu'à l'escale d'indice `index`.
 *
 * Sans cela, sauter au milieu du voyage laisserait une carte vierge
 * derrière le navire, comme s'il venait d'apparaître là.
 */
function buildTrailTo(index) {
  cine.trail = [];
  cine.trailArc = 0;
  const first = state.route[0];
  pushTrail(first.lat, first.lng, true);
  for (let k = 0; k < index; k++) {
    const from = state.route[k];
    const to = state.route[k + 1];
    const steps = Math.max(2, Math.round(angularDistance(from, to) / 1.2));
    for (let n = 1; n <= steps; n++) {
      const at = along(from, to, n / steps);
      pushTrail(at.lat, at.lng, n === steps);
    }
  }
}

/** Jours cumulés du départ jusqu'à l'escale d'indice `index`, incluse. */
const daysUpTo = (index) =>
  state.route.slice(0, index + 1).reduce((total, s) => total + (s.days ?? 0), 0);

/** Place la lecture à une escale donnée, à quai. */
function jumpToLeg(index) {
  const target = clamp(index, 0, state.route.length - 1);
  const stop = state.route[target];
  cine.leg = target;
  cine.phase = "dwell";
  cine.elapsed = 0;
  cine.dayCount = daysUpTo(target);
  buildTrailTo(target);
  refreshPaths();
  setHull(shipAtStep(stop.step));
  moveShip(stop.lat, stop.lng, 90);
  globe.ringsData([stop]);
  globe.pointOfView({ lat: stop.lat, lng: stop.lng, altitude: FOLLOW_ALT() }, 700);
  cineHud(stop.name, hudStopLine(stop, stop.step), stop.deed);
}

function pushTrail(lat, lng, force = false) {
  const last = cine.trail[cine.trail.length - 1];
  if (last) {
    const gap = angularDistance({ lat: last[0], lng: last[1] }, { lat, lng });
    if (!force && gap < 0.35) return;
    cine.trailArc += gap;
  }
  cine.trail.push([lat, lng, 0.014]);
}

/**
 * Ligne d'information d'une escale : son rang, le temps que l'équipage y a
 * passé, et le jour du voyage auquel on se trouve.
 */
function hudStopLine(stop, rank) {
  const parts = [`Escale ${rank} / ${state.route.length}`];
  const stay = shortDays(stop.days, stop.daysBasis);
  if (stay) parts.push(stay);
  if (cine.dayCount > 0) parts.push(`jour ${cine.dayCount}`);
  else parts.push(stop.sea);
  return parts.join(" · ");
}

function cineHud(place, sub, deed = null) {
  $("cine-place").textContent = place;
  $("cine-sub").textContent = sub;
  const story = $("cine-deed");
  story.textContent = deed ?? "";
  story.hidden = !deed;
  const done = (cine.leg + (cine.phase === "sail" ? 0.5 : 0)) / (state.route.length - 1);
  $("cine-progress").style.transform = `scaleX(${clamp(done, 0, 1)})`;
}

function startCine() {
  if (cine.active) return;
  stopCineDecor(false);

  cine.active = true;
  cine.paused = false;
  cine.finished = false;
  cine.leg = 0;
  cine.phase = "dwell";
  cine.elapsed = 0;
  cine.trail = [];
  cine.trailArc = 0;
  cine.dayCount = first0Days();

  if (!cine.ship) {
    cine.ship = { lat: 0, lng: 0, alt: 0.05, el: makeShipElement() };
  }
  cine.hull = null;
  setHull(shipAtStep(1));

  select(null);

  document.body.classList.add("cine-on");
  updateVoyage();
  $("cine-hud").hidden = false;
  $("cine-pause").textContent = "❚❚";
  $("cine-pause").setAttribute("aria-label", "Mettre en pause");

  // Pendant la lecture, la route permanente s'efface : c'est la trace en
  // pointillés qui raconte, et deux tracés superposés se brouillent.
  globe.arcsData([]);
  const controls = globe.controls();
  controls.autoRotate = false;
  controls.enabled = false;

  const first = state.route[0];
  moveShip(first.lat, first.lng, 90);
  pushTrail(first.lat, first.lng, true);
  refreshShipLayer();
  refreshPaths();
  globe.ringsData([first]);
  globe.pointOfView({ lat: first.lat, lng: first.lng, altitude: FOLLOW_ALT() }, 1200);
  cineHud(first.name, hudStopLine(first, 1), first.deed);

  // Mouvement réduit : on saute d'escale en escale sans animer la mer.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cine.speed = 4;
    $("cine-speed").textContent = "×4";
  }

  cine.last = performance.now();
  cine.raf = requestAnimationFrame(tickCine);
}

const FOLLOW_ALT = () => (small ? 2.1 : 1.65);

/** Jours passés à la première escale, comptés dès le départ. */
const first0Days = () => state.route[0]?.days ?? 0;

/** Total des jours connus sur l'ensemble de la route. */
const routeDays = () =>
  state.route.reduce((total, stop) => total + (stop.days ?? 0), 0);

function tickCine(now) {
  cine.raf = requestAnimationFrame(tickCine);
  const dt = Math.min(80, now - cine.last) * (cine.paused ? 0 : cine.speed);
  cine.last = now;
  if (!dt) return;

  const route = state.route;
  const from = route[cine.leg];
  const to = route[cine.leg + 1];
  cine.elapsed += dt;

  if (cine.phase === "dwell") {
    if (cine.elapsed < dwellDuration(from?.days)) return;
    if (!to) return finishCine();
    cine.phase = "sail";
    cine.elapsed = 0;
    setHull(shipAtStep(from.step));
    globe.ringsData([]);
    cineHud(
      `${from.name} → ${to.name}`,
      `Cap au ${Math.round(bearing(from, to))}° · ${angularDistance(from, to).toFixed(1)}° d'arc`,
    );
    return;
  }

  // En mer.
  const arc = angularDistance(from, to);
  const t = clamp(cine.elapsed / sailDuration(arc), 0, 1);
  // Départ et arrivée en douceur : un navire ne démarre pas à pleine allure.
  const eased = t * t * (3 - 2 * t);
  const at = along(from, to, eased);
  moveShip(at.lat, at.lng, bearing(from, to));
  pushTrail(at.lat, at.lng);
  globe.pointOfView({ lat: at.lat, lng: at.lng, altitude: FOLLOW_ALT() }, 0);

  // La trace n'est redessinée que dix fois par seconde : reconstruire la
  // géométrie du chemin à chaque image coûterait plus que l'animation.
  if (now - cine.lastTrailPush > 100) {
    cine.lastTrailPush = now;
    refreshPaths();
  }

  if (t >= 1) {
    pushTrail(to.lat, to.lng, true);
    refreshPaths();
    cine.leg += 1;
    cine.phase = "dwell";
    cine.elapsed = 0;
    globe.ringsData([to]);
    cine.dayCount += to.days ?? 0;
    cineHud(to.name, hudStopLine(to, to.step), to.deed);
  }
}

function finishCine() {
  cancelAnimationFrame(cine.raf);
  cine.raf = null;
  cine.active = false;
  cine.finished = true;

  const controls = globe.controls();
  controls.enabled = true;
  document.body.classList.remove("cine-on");
  document.body.classList.add("cine-done");

  $("cine-progress").style.transform = "scaleX(1)";
  $("cine-pause").hidden = true;
  $("cine-speed").hidden = true;
  $("cine-skip").hidden = true;
  $("cine-replay").hidden = false;

  // On s'arrête sur la dernière escale, sélectionnée : les flèches
  // reprennent la route à partir de là plutôt que depuis nulle part.
  const last = state.route[state.route.length - 1];
  select(last, { panel: false });
  const total = routeDays();
  cineHud(
    "Voyage terminé",
    `${state.route.length} escales · ≈ ${total.toLocaleString("fr-FR")} jours à terre, estimation`,
    "Les flèches reprennent la route à la main, escale par escale.",
  );
}

/** Remet la scène dans son état de repos. */
function stopCineDecor(restoreArcs = true) {
  cancelAnimationFrame(cine.raf);
  cine.raf = null;
  cine.active = false;
  cine.finished = false;
  cine.trail = [];
  cine.trailArc = 0;
  document.body.classList.remove("cine-on", "cine-done");
  $("cine-hud").hidden = true;
  $("cine-pause").hidden = false;
  $("cine-speed").hidden = false;
  $("cine-skip").hidden = false;
  $("cine-replay").hidden = true;
  globe.controls().enabled = true;
  if (restoreArcs) {
    const legs = state.route.slice(0, -1).map((from, i) => ({
      from,
      to: state.route[i + 1],
      step: from.step,
    }));
    globe.arcsData(legs);
    refreshPaths();
    if (cine.ship) {
      cine.ship = null;
      refreshShipLayer();
    }
  }
}

function setupCine() {
  $("cine-start").addEventListener("click", startCine);
  $("cine-replay").addEventListener("click", startCine);

  // Sauter à l'escale suivante sans attendre la traversée.
  $("cine-skip").addEventListener("click", () => {
    if (cine.active) jumpToLeg(cine.leg + 1);
  });

  // La barre de progression est une réglette : on clique où l'on veut aller.
  const track = $("cine-track");
  const seek = (event) => {
    if (!cine.active) return;
    const box = track.getBoundingClientRect();
    const ratio = clamp((event.clientX - box.left) / box.width, 0, 1);
    jumpToLeg(Math.round(ratio * (state.route.length - 1)));
  };
  track.addEventListener("click", seek);
  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") jumpToLeg(cine.leg + 1);
    if (event.key === "ArrowLeft") jumpToLeg(cine.leg - 1);
  });
  $("cine-stop").addEventListener("click", () => {
    stopCineDecor();
    globe.ringsData(state.selected ? [state.selected] : []);
    updateVoyage();
  });
  $("cine-pause").addEventListener("click", () => {
    cine.paused = !cine.paused;
    const button = $("cine-pause");
    button.textContent = cine.paused ? "▶" : "❚❚";
    button.setAttribute("aria-label", cine.paused ? "Reprendre" : "Mettre en pause");
    // À l'arrêt, on rend la main sur la caméra.
    globe.controls().enabled = cine.paused;
  });
  $("cine-speed").addEventListener("click", () => {
    cine.speed = cine.speed >= 4 ? 1 : cine.speed * 2;
    $("cine-speed").textContent = `×${cine.speed}`;
  });

  // Au clavier : espace met en pause, les flèches sautent d'escale en
  // escale, Échap arrête. Ce sont les touches d'un lecteur, pas d'une carte.
  document.addEventListener("keydown", (event) => {
    if (!cine.active || event.target.matches("input")) return;
    if (event.code === "Space") {
      event.preventDefault();
      $("cine-pause").click();
    }
    if (event.key === "ArrowRight") jumpToLeg(cine.leg + 1);
    if (event.key === "ArrowLeft") jumpToLeg(cine.leg - 1);
  });
}

/* ── Lien partageable ─────────────────────────────────────────────────── */

/** Ouvre l'île nommée dans l'adresse, au chargement comme au retour arrière. */
function openFromHash({ fly = true } = {}) {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!id) return false;
  const island = state.islands.find((i) => i.id === id);
  if (!island) return false;
  select(island, { fly, quiet: true });
  return true;
}

/* ── Feuille glissante (mobile) ───────────────────────────────────────── */

/**
 * Sur téléphone, la fiche est une feuille qui monte du bas. On doit
 * pouvoir la refermer d'un geste vers le bas, comme partout ailleurs.
 * Le glissement ne démarre que depuis la poignée ou en haut du contenu,
 * sinon on empêcherait le défilement de la fiche.
 */
function setupSheetDrag() {
  const sheet = $("record");
  const scroll = $("record-scroll");
  let startY = null;
  let delta = 0;

  const canDrag = (event) =>
    event.target.closest(".record-grip") !== null || scroll.scrollTop <= 0;

  sheet.addEventListener(
    "touchstart",
    (event) => {
      if (!isHandheld() || event.touches.length !== 1 || !canDrag(event)) return;
      startY = event.touches[0].clientY;
      delta = 0;
      sheet.style.transition = "none";
    },
    { passive: true },
  );

  sheet.addEventListener(
    "touchmove",
    (event) => {
      if (startY === null) return;
      delta = Math.max(0, event.touches[0].clientY - startY);
      sheet.style.transform = `translateY(${delta}px)`;
    },
    { passive: true },
  );

  const end = () => {
    if (startY === null) return;
    sheet.style.transition = "";
    sheet.style.transform = "";
    // Au-delà du quart de la hauteur, le geste vaut fermeture.
    if (delta > sheet.offsetHeight * 0.25) select(null);
    startY = null;
    delta = 0;
  };
  sheet.addEventListener("touchend", end, { passive: true });
  sheet.addEventListener("touchcancel", end, { passive: true });
}

/* ── Démarrage ────────────────────────────────────────────────────────── */

async function start() {
  const note = $("loader-note");
  try {
    await loadData();
    note.textContent = "Tracé de la carte…";
    // Un souffle avant de peindre la texture : le message doit s'afficher.
    await new Promise((r) => setTimeout(r, 30));
    buildGlobe();
    setupSearch();
    setupCine();
    updateVoyage();

    $("record-close").addEventListener("click", () => select(null));
    $("stopcard-close").addEventListener("click", () => select(null));
    $("stopcard-open").addEventListener("click", () => {
      if (state.selected) select(state.selected, { panel: true });
    });
    $("voyage-prev").addEventListener("click", () => stepBy(-1));
    $("voyage-next").addEventListener("click", () => stepBy(1));
    setupSheetDrag();
    document.addEventListener("keydown", (event) => {
      if (event.target.matches("input")) return;
      if (event.key === "Escape") {
        if (cine.active) return $("cine-stop").click();
        select(null);
      }
      if (event.key === "ArrowLeft") stepBy(-1);
      if (event.key === "ArrowRight") stepBy(1);
    });

    window.addEventListener("hashchange", () => {
      if (!openFromHash()) select(null);
    });
    openFromHash({ fly: true });

    const loader = $("loader");
    loader.classList.add("done");
    setTimeout(() => loader.setAttribute("hidden", ""), 600);
  } catch (err) {
    note.textContent = `Impossible de charger la carte : ${err.message}`;
    console.error(err);
  }
}

start();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* hors-ligne indisponible : le site fonctionne quand même */
    });
  });
}
