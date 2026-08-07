/**
 * Télécharge une image de paysage par île depuis le wiki Fandom.
 *
 * L'infobox de chaque page porte un ou deux fichiers : la version anime,
 * en couleur, et la version manga, en noir et blanc. On préfère l'anime —
 * c'est un vrai paysage, pas une case.
 *
 * Les images sont redimensionnées par la CDN de Fandom, qui accepte
 * `/scale-to-width-down/<px>` et `&format=webp` dans l'URL.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { findTemplate, parseTemplate } from "./wikitext.mjs";
import { PLACES } from "./curation.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "data", "img");
const INDEX = join(HERE, "..", "data", "images.json");
const WIDTH = 720;

const FR_API = "https://onepiece.fandom.com/fr/api.php";
const EN_API = "https://onepiece.fandom.com/api.php";
const UA = { "User-Agent": "one-piece-globe/1.0 (projet personnel)" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(endpoint, params) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const url = new URL(endpoint);
      url.search = new URLSearchParams({
        action: "query",
        format: "json",
        formatversion: "2",
        ...params,
      });
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Sous charge, Fandom renvoie une page d'erreur HTML au lieu du JSON.
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("json")) throw new Error(`réponse ${type || "inconnue"}`);
      return (await res.json()).query ?? {};
    } catch (err) {
      if (attempt === 3) {
        console.warn(`\n  requête abandonnée (${err.message})`);
        return {};
      }
      await sleep(700 * attempt);
    }
  }
  return {};
}

/**
 * Liste les fichiers cités dans l'infobox, l'anime d'abord.
 * Le champ `image` peut contenir un modèle {{Manga-Anime|...}} avec les deux.
 */
function imageCandidates(wikitext) {
  const body = findTemplate(wikitext, "Îles Box|Ile Box|Île Box|Islands Infobox|Location Infobox");
  const box = body ? parseTemplate(body) : {};
  const field = [box.image, box.image2, box.img].filter(Boolean).join(" ");
  const files = [
    ...field.matchAll(/\[\[(?:Fichier|File|Image):([^\]|]+)/gi),
  ].map((m) => m[1].trim());

  const score = (name) => {
    const n = name.toLowerCase();
    if (n.includes("manga")) return 2; // noir et blanc : dernier recours
    if (n.includes("anime")) return 0;
    return 1;
  };
  return [...new Set(files)].sort((a, b) => score(a) - score(b));
}

/** URL de la version redimensionnée servie par la CDN. */
function scaled(rawUrl) {
  const [path, qs = ""] = rawUrl.split("?");
  if (!path.includes("/revision/")) return rawUrl;
  return `${path.replace("/revision/latest", `/revision/latest/scale-to-width-down/${WIDTH}`)}?${qs}&format=webp`;
}

async function resolveFileUrl(endpoint, filename, prefix) {
  const { pages = [] } = await api(endpoint, {
    titles: `${prefix}:${filename}`,
    prop: "imageinfo",
    iiprop: "url",
  });
  return pages[0]?.imageinfo?.[0]?.url ?? null;
}

async function run() {
  mkdirSync(OUT, { recursive: true });
  const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};

  const wikiCache = JSON.parse(
    readFileSync(join(HERE, "_wiki-cache.json"), "utf8"),
  );

  const todo = PLACES.filter((p) => !index[p.wiki]);
  console.log(`${PLACES.length} lieux · ${PLACES.length - todo.length} déjà en cache · ${todo.length} à traiter`);

  let done = 0;
  const failed = [];

  for (const place of todo) {
    const entry = wikiCache[place.wiki];
    if (!entry) {
      failed.push([place.fr, "pas de fiche wiki"]);
      continue;
    }

    const isFr = entry.wikiId === "fr";
    const endpoint = isFr ? FR_API : EN_API;
    const prefix = isFr ? "Fichier" : "File";

    // Récupère le wikitexte de la page pour lire son infobox.
    const { pages = [] } = await api(endpoint, {
      titles: entry.title,
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      redirects: "1",
    });
    const text = pages[0]?.revisions?.[0]?.slots?.main?.content;
    if (!text) {
      failed.push([place.fr, "page illisible"]);
      continue;
    }

    let candidates = imageCandidates(text);
    if (!candidates.length) {
      // Baratie et Thriller Bark sont des navires : leur page emploie un
      // gabarit différent. On retombe sur l'image de tête de la page.
      const { pages: lead = [] } = await api(endpoint, {
        titles: entry.title,
        prop: "pageimages",
        piprop: "original|name",
        redirects: "1",
      });
      const name = lead[0]?.pageimage;
      if (name) candidates = [name.replace(/_/g, " ")];
    }
    if (!candidates.length) {
      failed.push([place.fr, "aucune image trouvée"]);
      continue;
    }

    let saved = null;
    for (const filename of candidates) {
      const raw = await resolveFileUrl(endpoint, filename, prefix);
      if (!raw) continue;
      const res = await fetch(scaled(raw), { headers: UA });
      if (!res.ok) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      // Une réponse trop courte est une page d'erreur, pas une image.
      if (bytes.byteLength < 3000) continue;

      const id = place.fr
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const file = `${id}.webp`;
      writeFileSync(join(OUT, file), bytes);
      saved = { file, source: filename, kb: Math.round(bytes.byteLength / 1024) };
      break;
    }

    if (saved) {
      index[place.wiki] = saved;
      done++;
      process.stdout.write(`  ${done}/${todo.length} ${place.fr.padEnd(28)}\r`);
    } else {
      failed.push([place.fr, "téléchargement échoué"]);
    }
    await sleep(150);
  }

  writeFileSync(INDEX, JSON.stringify(index, null, 1));

  const total = Object.values(index).reduce((n, v) => n + v.kb, 0);
  console.log(`\n${Object.keys(index).length}/${PLACES.length} images · ${(total / 1024).toFixed(1)} Mo au total`);
  if (failed.length) {
    console.log("sans image :");
    for (const [name, why] of failed) console.log(`  ✗ ${name} — ${why}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
