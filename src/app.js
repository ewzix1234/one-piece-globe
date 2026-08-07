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
  credits: null,
  bySaga: new Map(),
  hiddenSagas: new Set(),
  selected: null,
  origin: null, // l'île d'où l'on vient : c'est elle qui donne le cap
  route: [],
};

/* ── Géodésie ─────────────────────────────────────────────────────────── */

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

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

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
const cardinal = (deg) => CARDINALS[Math.round(deg / 22.5) % 16];

/* ── Données ──────────────────────────────────────────────────────────── */

async function loadData() {
  const res = await fetch("data/islands.json");
  if (!res.ok) throw new Error(`données indisponibles (HTTP ${res.status})`);
  const payload = await res.json();
  state.islands = payload.islands;
  state.sagas = payload.sagas;
  state.credits = payload.credits;
  state.bySaga = new Map(payload.sagas.map((s) => [s.id, s]));
  state.route = payload.islands
    .filter((i) => i.step)
    .sort((a, b) => a.step - b.step);
}

const sagaColor = (island) => state.bySaga.get(island.saga)?.color ?? "#8fa9b4";
const isVisible = (island) => !state.hiddenSagas.has(island.saga);
const visibleIslands = () => state.islands.filter(isVisible);

/* ── Globe ────────────────────────────────────────────────────────────── */

let globe;

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

function buildGlobe() {
  const small = isHandheld();
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
  globe
    .pathsData([
      { points: redLineRing(0.009), color: "#c98460", stroke: 1.5 },
      { points: grandLineRing(0.005), color: "#6fd4e8", stroke: 0.5 },
    ])
    .pathPoints("points")
    .pathPointLat((p) => p[0])
    .pathPointLng((p) => p[1])
    .pathPointAlt((p) => p[2])
    .pathColor((path) => path.color)
    .pathStroke((path) => path.stroke)
    .pathTransitionDuration(0);

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
        `<div class="tip"><strong>${escape(d.name)}</strong><span>${escape(d.sea)}${d.step ? ` · escale ${d.step}` : ""}</span></div>`,
    )
    .onPointClick((d) => select(d, { fly: true }))
    .onPointHover((d) => {
      document.body.style.cursor = d ? "pointer" : "";
    })
    .pointsTransitionDuration(260);

  // Étiquettes de zone : elles nomment Paradise, le Nouveau Monde, les
  // Calm Belts et les quatre Blues directement sur la sphère. Posées en
  // filigrane, comme sur une carte marine : elles nomment le fond sans
  // masquer ce qui s'y trouve.
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
  controls.minDistance = GLOBE_RADIUS * 1.32;
  controls.maxDistance = GLOBE_RADIUS * 4.2;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
  });

  // Poignée de mise au point : permet de piloter la caméra depuis la
  // console ou depuis les tests de bout en bout.
  window.blueStar = { globe, state };

  // Sur un écran étroit, la sphère déborde en largeur : on recule.
  globe.pointOfView({ lat: 12, lng: 60, altitude: small ? 3.7 : 2.6 }, 0);

  // Sur mobile, la densité de pixels native fait tripler le nombre de
  // fragments à calculer pour un gain invisible. On la plafonne à 2.
  const renderer = globe.renderer?.();
  if (renderer?.setPixelRatio) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2));
  }

  const resize = () => globe.width(window.innerWidth).height(window.innerHeight);
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 150));
}

/* ── Sélection ────────────────────────────────────────────────────────── */

function select(island, { fly = false } = {}) {
  // Le cap se prend depuis l'escale précédente sur la route de l'équipage ;
  // hors route, depuis la dernière île consultée.
  if (island) {
    const index = state.route.findIndex((i) => i.id === island.id);
    state.origin =
      index > 0
        ? state.route[index - 1]
        : state.selected && state.selected.id !== island.id
          ? state.selected
          : null;
  } else {
    state.origin = null;
  }

  state.selected = island;
  globe.ringsData(island ? [island] : []);

  if (island && fly) {
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: island.lat, lng: island.lng, altitude: 1.7 }, 900);
  }

  renderRecord(island);
  updateVoyage();
  updateLogPose();
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
  rows.push(["Mer", island.sea]);
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

/* ── Log Pose ─────────────────────────────────────────────────────────── */

function updateLogPose() {
  const needle = $("logpose-needle");
  const fromEl = $("logpose-from");
  const target = $("logpose-target");
  const readout = $("logpose-bearing");
  const point = (deg) =>
    (needle.style.transform = `translateY(-100%) rotate(${deg}deg)`);

  if (!state.selected) {
    point(0);
    fromEl.hidden = true;
    target.textContent = "Aucun cap";
    readout.textContent = "Choisis une île";
    return;
  }

  target.textContent = state.selected.name;
  target.title = state.selected.name;

  if (!state.origin) {
    // Première île consultée : aucune escale de départ, donc pas de cap.
    point(0);
    fromEl.hidden = true;
    readout.textContent = "Cap enregistré";
    return;
  }

  const angle = bearing(state.origin, state.selected);
  const arc = angularDistance(state.origin, state.selected);
  point(angle.toFixed(1));
  fromEl.hidden = false;
  fromEl.textContent = `depuis ${state.origin.name}`;
  fromEl.title = state.origin.name;
  readout.textContent = `${cardinal(angle)} ${Math.round(angle)}° · ${arc.toFixed(1)}° d'arc`;
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
  if (state.selected && !isVisible(state.selected)) select(null);
}

/* ── Route de l'équipage ──────────────────────────────────────────────── */

function stepIndex() {
  if (!state.selected?.step) return -1;
  return state.route.findIndex((i) => i.id === state.selected.id);
}

function updateVoyage() {
  const label = $("voyage-step");
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
  const index = stepIndex();
  const next = index === -1 ? (delta > 0 ? 0 : state.route.length - 1) : index + delta;
  const island = state.route[Math.max(0, Math.min(state.route.length - 1, next))];
  if (!island) return;
  state.hiddenSagas.delete(island.saga);
  refreshFilters();
  select(island, { fly: true });
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
