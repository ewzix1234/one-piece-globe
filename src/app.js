import {
  drawWorldTexture,
  drawBumpTexture,
  RED_LINE_LNG,
  ZONES,
} from "./texture.js";

const GLOBE_RADIUS = 100; // unité interne de globe.gl
const $ = (id) => document.getElementById(id);

const state = {
  islands: [],
  sagas: [],
  kinds: {},
  credits: null,
  bySaga: new Map(),
  hiddenSagas: new Set(),
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
  state.credits = payload.credits;
  state.bySaga = new Map(payload.sagas.map((s) => [s.id, s]));
  state.route = payload.islands
    .filter((i) => i.step)
    .sort((a, b) => a.step - b.step);
}

const sagaColor = (island) => state.bySaga.get(island.saga)?.color ?? "#8fa9b4";
const isVisible = (island) => !state.hiddenSagas.has(island.saga);
const visibleIslands = () => state.islands.filter(isVisible);

/**
 * Ce que la mer d'appartenance veut dire.
 *
 * « Paradise » sonne comme une mer à part, alors que c'est la première
 * moitié de Grand Line : la route est une, la Red Line la coupe en deux.
 */
const SEA_NOTE = {
  Paradise: "première moitié de Grand Line",
  "Nouveau Monde": "seconde moitié de Grand Line",
  "Calm Belt": "ceinture sans vent qui borde Grand Line",
  "Red Line": "le continent qui ceint le globe",
  Ciel: "au-dessus des nuages",
};

/* ── Pictogrammes de nature ───────────────────────────────────────────── */

/**
 * Un lieu qui n'est pas une île de terre ne peut pas se contenter d'une
 * pastille : rien ne distinguerait le Royaume de Ryugu, qui est à dix
 * mille mètres de fond, d'un caillou en surface. Chaque nature reçoit donc
 * un dessin, tracé en SVG pour rester net à toutes les densités d'écran.
 */
const KIND_GLYPH = {
  sky: '<path d="M4 12.5h8.6a2.6 2.6 0 1 0-.7-5.1A3.9 3.9 0 0 0 4.4 8.6 2 2 0 0 0 4 12.5Z"/>',
  seafloor:
    '<path d="M3 6.5c1.6 0 1.6 1.6 3.2 1.6S7.8 6.5 9.4 6.5 11 8.1 12.6 8.1 14.2 6.5 15.8 6.5M3 11c1.6 0 1.6 1.6 3.2 1.6S7.8 11 9.4 11 11 12.6 12.6 12.6 14.2 11 15.8 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  living:
    '<path d="M4.5 13V9.4a4 4 0 0 1 8 0V13m-8 0h2m6 0h2M12.5 9.6c1.4 0 2-1.1 2-2.2M6.6 13v2.2m3.4-2.2v2.2"  fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ship: '<path d="M3.4 11.6h12.2l-1.9 3.6H5.3ZM9.5 11.2V3.6M9.5 4.2l4.6 2.4-4.6 2.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  summit:
    '<path d="M2.6 14.4 7.4 5l3.1 5.2L12 8.3l4.4 6.1Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  works:
    '<path d="M9.5 6.6a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm0-3.4v2m0 8.6v2m6.3-6.3h-2m-8.6 0h-2m10.8-4.5-1.4 1.4m-6.1 6.1-1.4 1.4m0-8.9 1.4 1.4m6.1 6.1 1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  zone: '<path d="M2.6 7.2c1.7 0 1.7 1.7 3.5 1.7S7.8 7.2 9.5 7.2s1.7 1.7 3.5 1.7 1.7-1.7 3.4-1.7M2.6 11.6c1.7 0 1.7 1.7 3.5 1.7s1.7-1.7 3.4-1.7 1.7 1.7 3.5 1.7 1.7-1.7 3.4-1.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  lost: '<path d="M5 5l9 9m0-9-9 9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
};

const kindLabel = (kind) => state.kinds[kind]?.label ?? "";

/** Marqueur DOM posé sur la sphère pour un lieu de nature particulière. */
function makeBadge(island) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `badge badge-${island.kind}`;
  el.title = `${island.name} — ${kindLabel(island.kind)}`;
  el.setAttribute("aria-label", el.title);
  el.innerHTML = `<svg viewBox="0 0 19 19" aria-hidden="true">${KIND_GLYPH[island.kind] ?? ""}</svg>`;
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    select(island, { fly: true });
  });
  return el;
}

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

function buildGlobe() {
  small = isHandheld();
  const world = drawWorldTexture(state.islands, small ? 2048 : 4096);
  const bump = drawBumpTexture(state.islands, small ? 1024 : 2048);

  globe = new Globe($("scene"), { animateIn: true })
    .globeImageUrl(null)
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true)
    .atmosphereColor("#4fa8c4")
    .atmosphereAltitude(0.17)
    .width(window.innerWidth)
    .height(window.innerHeight);

  // La texture est peinte localement : on la passe en data URL plutôt que
  // par une requête réseau, pour garder le site utilisable hors-ligne.
  const toUrl = (canvas) =>
    canvas.convertToBlob
      ? canvas.convertToBlob({ type: "image/png" }).then(URL.createObjectURL)
      : Promise.resolve(canvas.toDataURL("image/png"));

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

  // Marqueurs d'îles : posés au-dessus des terres peintes sur la texture.
  globe
    .pointsData(visibleIslands())
    .pointLat("lat")
    .pointLng("lng")
    .pointColor(sagaColor)
    .pointAltitude((d) => 0.016 + (d.scale ?? 3) * 0.004)
    .pointRadius((d) => 0.34 + (d.scale ?? 3) * 0.075)
    .pointLabel(
      (d) =>
        `<div class="tip"><strong>${escape(d.name)}</strong><span>${escape(d.sea)}${d.kind ? ` · ${escape(kindLabel(d.kind))}` : ""}${d.step ? ` · escale ${d.step}` : ""}</span></div>`,
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
  refreshBadges();

  // Étiquettes de zone : elles nomment les deux moitiés de Grand Line, les
  // Calm Belts, la Red Line et les quatre Blues directement sur la sphère.
  // Posées en filigrane, comme sur une carte marine : elles nomment le fond
  // sans masquer ce qui s'y trouve.
  const ZONE_COLOR = {
    route: "rgba(198,238,248,0.42)",
    belt: "rgba(128,166,186,0.45)",
    land: "rgba(232,176,146,0.5)",
    blue: "rgba(168,202,216,0.4)",
  };
  globe
    .labelsData(ZONES)
    .labelLat("lat")
    .labelLng("lng")
    .labelText("label")
    .labelColor((z) => ZONE_COLOR[z.kind])
    .labelSize((z) => z.size * (small ? 1.25 : 1))
    .labelDotRadius(0)
    .labelResolution(3)
    .labelAltitude(0.011)
    .labelIncludeDot(false);

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

const MIN_ALTITUDE = 0.32;
const MAX_ALTITUDE = 9; // le globe tient alors dans un tiers de l'écran

function zoomBy(factor) {
  const pov = globe.pointOfView();
  globe.pointOfView(
    { altitude: clamp(pov.altitude * factor, MIN_ALTITUDE, MAX_ALTITUDE) },
    320,
  );
}

function setupZoom() {
  $("zoom-in").addEventListener("click", () => zoomBy(1 / 1.55));
  $("zoom-out").addEventListener("click", () => zoomBy(1.55));
}

/* ── Pictogrammes sur la sphère ───────────────────────────────────────── */

const badges = new Map(); // id d'île → { lat, lng, alt, el }

function refreshBadges() {
  const wanted = visibleIslands().filter((i) => i.kind && KIND_GLYPH[i.kind]);
  for (const island of wanted) {
    if (!badges.has(island.id)) {
      badges.set(island.id, {
        lat: island.lat,
        lng: island.lng,
        alt: 0.028 + (island.scale ?? 3) * 0.004,
        el: makeBadge(island),
      });
    }
  }
  const keep = new Set(wanted.map((i) => i.id));
  const data = [];
  for (const [id, badge] of badges) if (keep.has(id)) data.push(badge);
  if (cine.ship) data.push(cine.ship);
  globe.htmlElementsData(data);
}

/* ── Sélection ────────────────────────────────────────────────────────── */

function select(island, { fly = false } = {}) {
  state.selected = island;
  globe.ringsData(island ? [island] : []);

  if (island && fly) {
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: island.lat, lng: island.lng, altitude: 1.7 }, 900);
  }

  renderRecord(island);
  updateVoyage();
}

/* ── Fiche ────────────────────────────────────────────────────────────── */

const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

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
  rows.push([
    "Coordonnées",
    `${Math.abs(island.lat).toFixed(1)}° ${island.lat >= 0 ? "N" : "S"} · ${Math.abs(island.lng).toFixed(1)}° ${island.lng >= 0 ? "E" : "O"}`,
  ]);

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
      ${island.note ? `<p class="record-note">${escape(island.note)}</p>` : ""}
      ${island.summary ? `<p class="record-summary">${escape(island.summary)}</p>` : ""}
    </div>
  `;
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
      // Une île masquée par un filtre doit redevenir visible si on la choisit.
      state.hiddenSagas.delete(island.saga);
      refreshFilters();
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

/* ── Filtres ──────────────────────────────────────────────────────────── */

function setupFilters() {
  const host = $("filters");
  for (const saga of state.sagas) {
    const count = state.islands.filter((i) => i.saga === saga.id).length;
    if (!count) continue;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.saga = saga.id;
    chip.setAttribute("aria-pressed", "true");
    chip.style.color = saga.color;
    chip.innerHTML = `<span class="chip-dot"></span><span>${escape(saga.label)}</span><span class="chip-count">${count}</span>`;
    chip.addEventListener("click", () => {
      state.hiddenSagas.has(saga.id)
        ? state.hiddenSagas.delete(saga.id)
        : state.hiddenSagas.add(saga.id);
      refreshFilters();
    });
    host.appendChild(chip);
  }
}

function refreshFilters() {
  for (const chip of document.querySelectorAll(".chip[data-saga]")) {
    chip.setAttribute(
      "aria-pressed",
      String(!state.hiddenSagas.has(chip.dataset.saga)),
    );
  }
  globe.pointsData(visibleIslands());
  refreshBadges();
  if (state.selected && !isVisible(state.selected)) select(null);
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
  state.hiddenSagas.delete(island.saga);
  refreshFilters();
  select(island, { fly: true });
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
  dinghy: {
    name: "Barque",
    svg: '<path d="M4 20h24l-4 7H8Z"/><path d="M16 19V7l8 5-8 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  },
  merry: {
    name: "Vogue Merry",
    svg: '<path d="M3 20h26l-4.5 8H7.5Z"/><path d="M16 19V5m0 1 9 5-9 4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17" r="3.1"/>',
  },
  sunny: {
    name: "Thousand Sunny",
    svg: '<path d="M2.5 19.5h27l-5 8.5H7.5Z"/><path d="M15 18.5V4m0 1 10 5.5-10 4.5M15 18.5 8 12.5l7-3.5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><circle cx="5.6" cy="16.4" r="3.4"/>',
  },
};

/** Coque en service au départ de l'escale n. */
function shipAtStep(step) {
  if (step <= 4) return "dinghy"; // avant que Kaya n'offre le Merry
  if (step <= 20) return "merry"; // jusqu'à Water Seven, où il brûle
  return "sunny";
}

const DWELL_MS = 1500; // temps d'arrêt à quai
const SAIL_MIN = 900;
const SAIL_MAX = 4200;
const sailDuration = (arc) => clamp(700 + arc * 55, SAIL_MIN, SAIL_MAX);

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
  el.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"></svg><span class="ship-wake"></span>`;
  return el;
}

function setHull(hull) {
  if (cine.hull === hull) return;
  cine.hull = hull;
  cine.ship.el.querySelector("svg").innerHTML = SHIPS[hull].svg;
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
  // Sur un élément projeté à l'écran, le cap géographique n'est pas un
  // angle d'écran : on se contente de retourner la coque du bon bord.
  cine.ship.el.classList.toggle("ship-west", heading > 180);
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

function cineHud(place, sub) {
  $("cine-place").textContent = place;
  $("cine-sub").textContent = sub;
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

  if (!cine.ship) {
    cine.ship = { lat: 0, lng: 0, alt: 0.05, el: makeShipElement() };
  }
  cine.hull = null;
  setHull(shipAtStep(1));

  // Tous les filtres reviennent : une escale masquée couperait la route.
  state.hiddenSagas.clear();
  refreshFilters();
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
  refreshBadges();
  refreshPaths();
  globe.ringsData([first]);
  globe.pointOfView({ lat: first.lat, lng: first.lng, altitude: FOLLOW_ALT() }, 1200);
  cineHud(first.name, `Escale 1 / ${state.route.length} — ${first.sea}`);

  // Mouvement réduit : on saute d'escale en escale sans animer la mer.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cine.speed = 4;
    $("cine-speed").textContent = "×4";
  }

  cine.last = performance.now();
  cine.raf = requestAnimationFrame(tickCine);
}

const FOLLOW_ALT = () => (small ? 2.1 : 1.65);

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
    if (cine.elapsed < DWELL_MS) return;
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
    cineHud(to.name, `Escale ${to.step} / ${route.length} — ${to.sea}`);
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

  // On s'arrête sur la dernière escale, sélectionnée : les flèches
  // reprennent la route à partir de là plutôt que depuis nulle part.
  const last = state.route[state.route.length - 1];
  select(last);
  cineHud("Voyage terminé", "Reprends la route à la main avec les flèches");
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
      refreshBadges();
    }
  }
}

function setupCine() {
  $("cine-start").addEventListener("click", startCine);
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
}

/* ── Sources ──────────────────────────────────────────────────────────── */

function setupAbout() {
  const toggle = $("about-toggle");
  const panel = $("about");
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  });
  document.addEventListener("click", (event) => {
    if (!panel.hidden && !event.target.closest(".about, .about-toggle")) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
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
    setupFilters();
    setupZoom();
    setupCine();
    updateVoyage();

    $("record-close").addEventListener("click", () => select(null));
    $("voyage-prev").addEventListener("click", () => stepBy(-1));
    $("voyage-next").addEventListener("click", () => stepBy(1));
    setupAbout();
    setupSheetDrag();
    document.addEventListener("keydown", (event) => {
      if (event.target.matches("input")) return;
      if (event.key === "Escape") select(null);
      if (event.key === "ArrowLeft") stepBy(-1);
      if (event.key === "ArrowRight") stepBy(1);
    });

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
