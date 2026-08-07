/**
 * Récupère les fiches d'îles depuis le wiki Fandom francophone,
 * avec repli sur l'anglophone quand une page manque.
 *
 * Contenu sous licence CC BY-SA 3.0 — l'attribution figure dans l'interface.
 * Le résultat est figé dans data/wiki.json : le site final ne fait aucun
 * appel réseau.
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  findTemplate,
  parseTemplate,
  toPlainText,
  parseFirstAppearance,
  extractIntro,
} from "./wikitext.mjs";
import { PLACES } from "./curation.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, "_wiki-cache.json");

const WIKIS = [
  { id: "fr", api: "https://onepiece.fandom.com/fr/api.php", infobox: "Îles Box|Ile Box|Île Box|Lieux Box|Pays Box" },
  { id: "en", api: "https://onepiece.fandom.com/api.php", infobox: "Islands Infobox|Location Infobox|Infobox Location" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Appel générique à l'API MediaWiki, avec trois tentatives. */
async function api(endpoint, params) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    format: "json",
    formatversion: "2",
    ...params,
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "one-piece-globe/1.0 (projet personnel)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.query ?? {};
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(500 * attempt);
    }
  }
  return {};
}

/**
 * Récupère un lot de titres et renvoie une table `titre demandé → page`.
 *
 * MediaWiki normalise et suit les redirections en silence : la page rendue
 * porte alors un autre titre que celui demandé (Hachinosu → Île de Ruche).
 * On rejoue donc les tables `normalized` et `redirects` pour retrouver
 * quel titre demandé a produit quelle page.
 */
async function fetchPages(endpoint, titles) {
  const query = await api(endpoint, {
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|"),
    redirects: "1",
  });

  // Chaîne demandé → normalisé → cible de redirection.
  const resolve = new Map();
  for (const { from, to } of query.normalized ?? []) resolve.set(from, to);
  for (const { from, to } of query.redirects ?? []) resolve.set(from, to);

  const byTitle = new Map();
  for (const page of query.pages ?? []) {
    if (!page.missing) byTitle.set(page.title, page);
  }

  const out = new Map();
  for (const asked of titles) {
    let title = asked;
    // Une redirection peut en chaîner une autre ; on borne pour éviter un cycle.
    for (let hop = 0; hop < 5 && resolve.has(title); hop++) title = resolve.get(title);
    const page = byTitle.get(title) ?? byTitle.get(asked);
    if (page) out.set(asked, page);
  }
  return out;
}

/** Cherche le titre de page le plus proche d'un nom donné. */
async function searchTitle(endpoint, term) {
  const query = await api(endpoint, {
    action: "query",
    list: "search",
    srsearch: term,
    srlimit: "3",
    srnamespace: "0",
  });
  return query.search?.[0]?.title ?? null;
}

/** Réduit une page brute aux champs qui nous intéressent. */
function readPage(page, infoboxPattern, wikiId) {
  const text = page?.revisions?.[0]?.slots?.main?.content;
  if (!text) return null;

  const body = findTemplate(text, infoboxPattern);
  const box = body ? parseTemplate(body) : {};

  const firstRaw = box["première"] ?? box["premiere"] ?? box["first"] ?? "";
  const { chapter, episode } = parseFirstAppearance(firstRaw);

  return {
    wikiId,
    title: page.title,
    nameJp: toPlainText(box.nomj ?? box.jname ?? "") || null,
    nameRomaji: toPlainText(box.nomr ?? box.rname ?? "") || null,
    region: toPlainText(box["région"] ?? box.region ?? "") || null,
    ruler: toPlainText(box.dirigeant ?? box.ruler ?? box["chef de l'île"] ?? "") || null,
    affiliation: toPlainText(box.affiliation ?? "") || null,
    chapter,
    episode,
    summary: extractIntro(text),
  };
}

async function run() {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const wanted = PLACES.filter((p) => !cache[p.wiki]);
  console.log(
    `${PLACES.length} lieux · ${PLACES.length - wanted.length} en cache · ${wanted.length} à récupérer`,
  );

  // Passe 1 : wiki francophone par titre supposé, lots de 20.
  let missing = [];
  for (let i = 0; i < wanted.length; i += 20) {
    const batch = wanted.slice(i, i + 20);
    const pages = await fetchPages(WIKIS[0].api, [
      ...new Set(batch.map((p) => p.wiki)),
    ]);
    for (const place of batch) {
      const parsed = readPage(pages.get(place.wiki), WIKIS[0].infobox, "fr");
      if (parsed) cache[place.wiki] = parsed;
      else missing.push(place);
    }
    process.stdout.write(`  fr ${Math.min(i + 20, wanted.length)}/${wanted.length}\r`);
    await sleep(200);
  }
  console.log(`\n  wiki FR par titre : ${wanted.length - missing.length} trouvés`);

  // Passe 2 : wiki francophone via recherche, pour les titres mal devinés.
  if (missing.length) {
    console.log(`  recherche FR pour ${missing.length} lieux…`);
    const stillMissing = [];
    for (const place of missing) {
      const found = await searchTitle(WIKIS[0].api, place.fr);
      const parsed = found
        ? readPage(
            (await fetchPages(WIKIS[0].api, [found])).get(found),
            WIKIS[0].infobox,
            "fr",
          )
        : null;
      if (parsed) {
        cache[place.wiki] = parsed;
        console.log(`    ${place.fr} → « ${parsed.title} »`);
      } else {
        stillMissing.push(place);
      }
      await sleep(200);
    }
    missing = stillMissing;
  }

  // Passe 3 : repli anglophone, par titre puis par recherche.
  if (missing.length) {
    console.log(`  repli EN pour ${missing.length} lieux…`);
    const stillMissing = [];
    for (const place of missing) {
      const guess = place.src ?? place.fr;
      let page = (await fetchPages(WIKIS[1].api, [guess])).get(guess);
      if (!page) {
        const found = await searchTitle(WIKIS[1].api, guess);
        if (found) page = (await fetchPages(WIKIS[1].api, [found])).get(found);
      }
      const parsed = readPage(page, WIKIS[1].infobox, "en");
      if (parsed) {
        cache[place.wiki] = parsed;
        console.log(`    ${place.fr} → EN « ${parsed.title} »`);
      } else {
        stillMissing.push(place);
      }
      await sleep(200);
    }
    missing = stillMissing;
  }

  writeFileSync(CACHE, JSON.stringify(cache, null, 1));

  const resolved = PLACES.filter((p) => cache[p.wiki]);
  const unresolved = PLACES.filter((p) => !cache[p.wiki]);
  console.log(`\n${resolved.length}/${PLACES.length} fiches récupérées`);
  if (unresolved.length) {
    console.log("sans fiche :");
    for (const p of unresolved) console.log(`  ✗ ${p.fr}  (wiki: ${p.wiki})`);
  }
  const withSummary = resolved.filter((p) => cache[p.wiki].summary);
  const withJp = resolved.filter((p) => cache[p.wiki].nameJp);
  console.log(`résumé : ${withSummary.length} · nom japonais : ${withJp.length}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
