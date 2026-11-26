'use strict';
// Sonde der Ablösung (R00047, B4302): kein Spec und keine Frist der E2E-Suite prüft mehr eine abgelöste Zahl. Die
// Erwartungen heißen seit R00047 `anzeigeSchrankeMs` bzw. `einfrierSchrankeMs` aus `dsl/schranken.js`; die früheren
// engen Ziele (ein 0,7-s-Messwert mit Abstandsregel, 1,4-s-Messwert, 150-ms-Long-Task, die 1-s- und 2-s-Fristen als
// eigene Zahl) sind ersatzlos entfallen. Die Muster stehen als Regex-Quellen mit `\\s`, damit diese Datei sich nicht
// selbst findet. Strukturelle Grenzen (DOM-Knoten, Zeilen, Zeichen, Treffer, MiB) sind ausdrücklich nicht betroffen.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const WURZEL = path.resolve(__dirname, '../..');
const UEBERSPRUNGEN = new Set(['node_modules', 'test-results', 'playwright-report']);

/** Abgelöste Zeiten mit ihrem Anlass: Regex-Quelle und, was sie im Klartext bedeutet. */
const ABGELOEST = [
  ['eine Frist-Konstante mit einem abgelösten Millisekundenwert', 'FRIST_MS\\s*=\\s*(?:700|1000|150|2000)\\b'],
  ['eine Erwartung mit einem abgelösten Millisekundenwert', '≤\\s*(?:0,7|1,4|150|1000|2000)\\b'],
  ['eine Aufschrift mit dem alten Zielwert', 'Ziel\\s*≤?\\s*(?:700|1400)\\b'],
  ['eine Aufschrift mit der alten Grenze', 'Grenze\\s+(?:1000|2000|150)\\b'],
  ['ein Long Task mit abgelöster Zahl', 'über\\s+150\\s+ms'],
  ['die alte Abstandsregel', '30\\s*%'],
  ['das alte Ziel in Prosa', '(?:0,7|1,4)\\s*s\\b'],
  ['eine abgelöste Frist als letztes Argument', '(?:zugeklapptNachKlick|zugeklapptNachUmschalten|zugeklapptNachAktion|BinnenNachKlick|paarBinnen|alsTextBleibtBedienbar|BedienbarNachAlsText|anmerkungenRechtzeitigNachKlick|zeileRechtzeitigNachKlick)\\([^\\n]*, (?:700|1000|1400|2000)\\)'],
  ['eine abgelöste Frist von 2 s als Zahl', '(?:sekunden|Sekunden)[^\\n]*toBe(?:LessThan|LessThanOrEqual)\\(2\\)'],
  ['eine abgelöste Frist in Millisekunden als Zahl', 'toBe(?:LessThan|LessThanOrEqual)\\((?:150|700|1000|1400|2000)\\)'],
  ['eine Aufschrift mit der alten Startfrist', '(?:spätestens|höchstens|binnen) 2 s'],
];

function jsDateien(ordner) {
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap(eintrag => {
    if (UEBERSPRUNGEN.has(eintrag.name)) {
      return [];
    }
    const pfad = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) {
      return jsDateien(pfad);
    }
    return eintrag.name.endsWith('.js') ? [pfad] : [];
  });
}

function fundstellen() {
  const funde = [];
  for (const datei of jsDateien(WURZEL)) {
    const zeilen = fs.readFileSync(datei, 'utf8').split('\n');
    zeilen.forEach((zeile, index) => {
      for (const [anlass, quelle] of ABGELOEST) {
        if (new RegExp(quelle).test(zeile)) {
          funde.push(`${path.relative(WURZEL, datei)}:${index + 1} ${anlass}: ${zeile.trim()}`);
        }
      }
    });
  }
  return funde;
}

test.describe('Baustein Schranken-Sonde — keine abgelöste Zahl in der E2E-Suite (R00047, B4302)', () => {
  test('soll in e2e/ keine abgelöste Zeit-Erwartung mehr finden', () => {
    expect(fundstellen()).toEqual([]);
  });
});
