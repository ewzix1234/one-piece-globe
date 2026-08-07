import test from "node:test";
import assert from "node:assert/strict";
import {
  findTemplate,
  parseTemplate,
  toPlainText,
  parseFirstAppearance,
  extractIntro,
} from "./wikitext.mjs";

// Extrait réel de la page Water Seven du wiki francophone.
const WATER_SEVEN = `{{Îles Box
| backcolor         = 5B92E5
| nom               = Water Seven
| image             = {{Manga-Anime
|[[Fichier:Water Seven Anime Infobox.png|300px]]
|[[Fichier:Water Seven Manga Infobox.png|300px]]
}}
| nomj              = ウォーターセブン
| nomr              = ''Wōtā Sebun''
| première          = [[Chapitre 323]] ; [[Épisode 229]]<br>
[[Chapitre 0]] ; [[Épisode 0]]{{Qref|nom = c0|chapitre = 0|texte=Water Seven apparaît.}}
| région            = [[Paradis]]
}}
'''Water Seven''' est une [[île]] située dans [[Grand Line]], plus précisément dans [[Paradis]]. Elle est surnommée la cité de l'eau et abrite les meilleurs charpentiers navals du monde connu.

==Histoire==
Un texte de section qui ne doit pas remonter dans le résumé.`;

test("findTemplate isole l'infobox malgré les modèles imbriqués", () => {
  const body = findTemplate(WATER_SEVEN, "Îles Box");
  assert.ok(body, "infobox introuvable");
  assert.ok(body.includes("nomj"));
  // Ne doit pas déborder sur la prose qui suit.
  assert.ok(!body.includes("cité de l'eau"));
});

test("parseTemplate lit les paramètres nommés", () => {
  const params = parseTemplate(findTemplate(WATER_SEVEN, "Îles Box"));
  assert.equal(params.nom, "Water Seven");
  assert.equal(params.nomj, "ウォーターセブン");
  assert.ok(params.région.includes("Paradis"));
});

test("parseTemplate ne coupe pas sur un | imbriqué", () => {
  const params = parseTemplate(findTemplate(WATER_SEVEN, "Îles Box"));
  // `image` contient {{Manga-Anime|[[Fichier:...|300px]]|...}} : les barres
  // internes ne doivent pas produire de paramètres fantômes.
  assert.ok(params.image.includes("Manga-Anime"));
  assert.ok(params.première.includes("Chapitre 323"));
});

test("toPlainText retire liens, gras et modèles de référence", () => {
  assert.equal(
    toPlainText("'''Water Seven''' est une [[île]] de [[Grand Line|la route]]."),
    "Water Seven est une île de la route.",
  );
  assert.equal(toPlainText("Texte{{Qref|nom=x|texte=note}} suite"), "Texte suite");
});

test("toPlainText survit à un wikitexte vide ou nul", () => {
  assert.equal(toPlainText(""), "");
  assert.equal(toPlainText(null), "");
  assert.equal(toPlainText(undefined), "");
});

test("parseFirstAppearance retient le premier chapitre et épisode", () => {
  const { chapter, episode } = parseFirstAppearance(
    "[[Chapitre 323]] ; [[Épisode 229]]",
  );
  assert.equal(chapter, 323);
  assert.equal(episode, 229);
});

test("parseFirstAppearance tolère l'absence d'épisode", () => {
  assert.deepEqual(parseFirstAppearance("[[Chapitre 1066]]"), {
    chapter: 1066,
    episode: null,
  });
  assert.deepEqual(parseFirstAppearance(""), { chapter: null, episode: null });
});

test("extractIntro prend la prose et s'arrête à la première section", () => {
  const intro = extractIntro(WATER_SEVEN);
  assert.ok(intro.startsWith("Water Seven est une île"));
  assert.ok(intro.includes("charpentiers navals"));
  assert.ok(
    !intro.includes("ne doit pas remonter"),
    "le contenu de section a fui dans le résumé",
  );
});

test("extractIntro ignore un bandeau posé avant l'infobox", () => {
  const intro = extractIntro(`{{Spoil}}\n${WATER_SEVEN}`);
  assert.ok(intro.startsWith("Water Seven est une île"));
});
