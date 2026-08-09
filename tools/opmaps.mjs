/**
 * Conversion du repère d'op-maps vers la sphère.
 *
 * Leur carte est une projection équirectangulaire tournée d'un quart de
 * tour : la longitude court le long de `y`, la latitude le long de `x`.
 * Trois faits le prouvent, et ce sont les mêmes que ceux qu'impose l'œuvre.
 *
 *   — Reverse Mountain et l'Île des Hommes-Poissons, les deux croisements
 *     de la Red Line, tombent à 180,00° l'un de l'autre.
 *   — L'Archipel Sabaody se retrouve à moins de cinq degrés de l'Île des
 *     Hommes-Poissons, qui est juste en dessous.
 *   — Les quatre Blues occupent les quatre quadrants découpés par ces deux
 *     axes, chacun du bon côté.
 *
 * La période en `y` vaut 3786 et non l'étendue brute du relevé : c'est la
 * valeur qui rend l'écart des deux croisements exactement égal à un demi-
 * tour, et elle replace Sabaody au bon endroit. Les positions au-delà se
 * lisent modulo cette période — la carte s'enroule.
 */
import { RED_LINE_LNG } from "../src/texture.js";

export const OP_PERIOD_Y = 3786; // un tour du monde, en unités de leur carte
export const OP_SPAN_X = 1936; // un pôle à l'autre
export const OP_EQUATOR_X = OP_SPAN_X / 2;

// Décalage qui amène Reverse Mountain sur le méridien de la Red Line.
const REVERSE_MOUNTAIN_Y = 1986;
const LNG_SHIFT =
  RED_LINE_LNG[0] - ((REVERSE_MOUNTAIN_Y / OP_PERIOD_Y) * 360 - 180);

/** Longitude d'une abscisse `y` de leur carte, en degrés. */
export function opLng(y) {
  const raw = ((((y % OP_PERIOD_Y) + OP_PERIOD_Y) % OP_PERIOD_Y) / OP_PERIOD_Y) * 360 - 180;
  let lng = raw + LNG_SHIFT;
  while (lng > 180) lng -= 360;
  while (lng <= -180) lng += 360;
  return lng;
}

/** Latitude d'une ordonnée `x` de leur carte, en degrés. */
export const opLat = (x) => ((x - OP_EQUATOR_X) / OP_SPAN_X) * 180;

/** Position sphérique d'un lieu de leur relevé. */
export const opPosition = ([x, y]) => ({ lat: opLat(x), lng: opLng(y) });
