/**
 * Lecture du wikitexte MediaWiki : juste ce qu'il faut pour les fiches d'îles.
 *
 * On ne cherche pas à rendre du wikitexte quelconque — seulement à extraire
 * proprement les champs de l'infobox {{Îles Box}} et le paragraphe d'introduction.
 */

/**
 * Découpe le contenu d'un modèle en paramètres nommés, en respectant
 * l'imbrication : un `|` à l'intérieur d'un {{...}} ou d'un [[...]] ne sépare rien.
 */
function splitParams(body) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth++;
      current += two;
      i++;
      continue;
    }
    if (two === "}}" || two === "]]") {
      depth--;
      current += two;
      i++;
      continue;
    }
    if (body[i] === "|" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += body[i];
  }
  parts.push(current);
  return parts;
}

/** Extrait le corps du premier modèle dont le nom correspond. */
export function findTemplate(wikitext, namePattern) {
  const re = new RegExp(`\\{\\{\\s*(${namePattern})\\s*[|}]`, "i");
  const start = wikitext.search(re);
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext.slice(i, i + 2) === "{{") {
      depth++;
      i++;
    } else if (wikitext.slice(i, i + 2) === "}}") {
      depth--;
      i++;
      if (depth === 0) return wikitext.slice(start + 2, i - 1);
    }
  }
  return null;
}

/** Transforme le corps d'un modèle en objet { paramètre: valeur brute }. */
export function parseTemplate(body) {
  const [, ...params] = splitParams(body);
  const out = {};
  for (const p of params) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const key = p.slice(0, eq).trim().toLowerCase();
    if (key) out[key] = p.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Réduit du wikitexte à du texte lisible.
 *
 * `separator` remplace les retours à la ligne HTML. Dans un paragraphe une
 * espace suffit ; dans un champ d'infobox qui énumère des affiliations, il
 * faut un vrai séparateur, sinon les entrées se collent les unes aux autres.
 */
export function toPlainText(wikitext, { separator = " " } = {}) {
  if (!wikitext) return "";
  let s = wikitext;

  // Modèles de référence et d'habillage : on les supprime, contenu compris.
  for (let pass = 0; pass < 6; pass++) {
    const before = s;
    s = s.replace(
      /\{\{\s*(Qref|Ref|Réf|Spoil|Manga-Anime|Citation nécessaire)[^{}]*\}\}/gi,
      "",
    );
    // Modèle simple restant : on garde son dernier paramètre, souvent le libellé.
    s = s.replace(/\{\{([^{}|]*)\|([^{}]*)\}\}/g, (_, __, args) => {
      const parts = args.split("|");
      return parts[parts.length - 1] ?? "";
    });
    s = s.replace(/\{\{([^{}]*)\}\}/g, "");
    if (s === before) break;
  }

  // Liens internes : [[Cible|Libellé]] → Libellé, [[Cible]] → Cible
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]|]*)\]\]/g, "$1");
  // Fichiers et images : rien à en tirer ici.
  s = s.replace(/\[\[?(?:Fichier|File|Image):[^\]]*\]?\]/gi, "");
  // Liens externes : [url libellé] → libellé
  s = s.replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, "$1");
  s = s.replace(/\[https?:\/\/\S+\]/g, "");
  // Balises HTML résiduelles.
  s = s.replace(/<ref[^>]*\/>/gi, "");
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  // Le retour à la ligne est marqué, puis rétabli après l'écrasement des
  // espaces, qui l'effacerait sinon.
  const BREAK = "\u0001";
  s = s.replace(/<br\s*\/?>/gi, BREAK);
  s = s.replace(/<[^>]+>/g, "");
  // Gras et italique.
  s = s.replace(/'''''|'''|''/g, "");
  // Espaces, marqueur préservé.
  s = s.replace(/&nbsp;/g, " ").replace(/[ \t\r\n\f\v]+/g, " ").trim();
  // Ponctuation orpheline laissée par les suppressions.
  s = s.replace(/ +([,.;:!?])/g, "$1").replace(/\(\s*\)/g, "");
  // Marqueurs doublés ou en bordure : un séparateur unique, jamais aux bouts.
  return s
    .split(BREAK)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator)
    .trim();
}

/** Récupère les numéros de chapitre et d'épisode d'une première apparition. */
export function parseFirstAppearance(raw) {
  if (!raw) return { chapter: null, episode: null };
  const chapter = raw.match(/Chapitre\s+(\d+)/i) ?? raw.match(/Chapter\s+(\d+)/i);
  const episode = raw.match(/[ÉE]pisode\s+(\d+)/i);
  return {
    chapter: chapter ? Number(chapter[1]) : null,
    episode: episode ? Number(episode[1]) : null,
  };
}

/**
 * Isole le paragraphe d'introduction : le premier bloc de prose situé
 * après l'infobox et avant la première section.
 */
export function extractIntro(wikitext) {
  let s = wikitext;

  // Retire les modèles de tête (infobox, bandeaux) en comptant l'imbrication.
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i).replace(/^\s+/, "");
    const skipped = s.length - rest.length - i;
    i += skipped;
    if (s.slice(i, i + 2) !== "{{") break;
    let depth = 0;
    let j = i;
    for (; j < s.length - 1; j++) {
      if (s.slice(j, j + 2) === "{{") {
        depth++;
        j++;
      } else if (s.slice(j, j + 2) === "}}") {
        depth--;
        j++;
        if (depth === 0) break;
      }
    }
    i = j + 1;
  }
  s = s.slice(i);

  // S'arrête à la première section.
  const heading = s.search(/\n\s*={2,}/);
  if (heading !== -1) s = s.slice(0, heading);

  const paragraphs = s
    .split(/\n{2,}/)
    .map((p) => toPlainText(p))
    .filter((p) => p.length > 60);

  return paragraphs.slice(0, 2).join(" ").trim() || null;
}
