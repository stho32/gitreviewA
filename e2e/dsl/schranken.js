'use strict';
// Grobe Zeitschranken der E2E-Suite (R00047): die eine Stelle, die die Zahlen bestimmt — Specs, DSL und Treiber lesen sie.
// Die engen Ziele der früheren Zeitkriterien (ein 0,7-s-Messwert mit 30 % Abstand, 1,4 s, eine 150-ms-Long-Task-Grenze)
// sind abgelöst; es gibt keine dritte Zahl, kein „typisch“ und keine Abstandsregel. Strukturelle Grenzen (Zeilenzahl,
// Zeichen, Marken, DOM-Knoten, Treffer, MiB) sind keine Zeitkriterien und stehen darum nicht hier.
const { expect } = require('@playwright/test');

/** Anzeige-Schranke: nach einer auslösenden Handlung steht das erwartete Ergebnis spätestens dann — Millisekunden. */
const anzeigeSchrankeMs = 5000;
/** Einfrier-Schranke: keine einzelne Aufgabe des Hauptfadens dauert länger — Millisekunden. */
const einfrierSchrankeMs = 2000;

/** Die ereignisgenau gemessene Dauer `dauerMs` hat die Anzeige-Schranke gehalten. */
function erwarteBinnenAnzeigeSchranke(dauerMs, beschreibung) {
  expect(dauerMs, `${beschreibung} (Anzeige-Schranke ${anzeigeSchrankeMs} ms)`).toBeLessThanOrEqual(anzeigeSchrankeMs);
}

/** Die gemessene Dauer `dauerMs` hat die Einfrier-Schranke gehalten. */
function erwarteUnterEinfrierSchranke(dauerMs, beschreibung) {
  expect(dauerMs, `${beschreibung} (Einfrier-Schranke ${einfrierSchrankeMs} ms)`).toBeLessThanOrEqual(einfrierSchrankeMs);
}

module.exports = { anzeigeSchrankeMs, einfrierSchrankeMs, erwarteBinnenAnzeigeSchranke, erwarteUnterEinfrierSchranke };
