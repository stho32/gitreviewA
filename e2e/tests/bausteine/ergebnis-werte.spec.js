'use strict';
// Bausteintests ohne Browser der Auffrischregel (R00037, B3601): höchstens eine Anfrage gleichzeitig, höchstens eine
// nachlaufende, die letzte Antwort gewinnt, nach „Beenden“ keine Anfrage mehr. Nur Rechnung: kein DOM, kein Server.
const { test, expect } = require('@playwright/test');
const { start, naechsteAnfrage } = require('../../../src/GitReviewA/web/ergebnis-werte.js');

/** Eine Änderung annehmen und den Zustand zurückgeben. */
function nachAenderung(zustand = start()) {
  return naechsteAnfrage(zustand, 'aenderung');
}

test.describe('Baustein Ergebnis-Werte — eine Anfrage je Änderung (B3601)', () => {
  test('soll eine Änderung zu genau einer Anfrage mit fortlaufender Fassung machen', () => {
    const entscheidung = nachAenderung();

    expect(entscheidung.art).toBe('anfragen');
    expect(entscheidung.fassung).toBe(1);
    expect(entscheidung.zustand.laeuft).toBe(true);
  });

  test('soll während einer laufenden Anfrage nur warten (zehn Änderungen, höchstens eine nachlaufende)', () => {
    let zustand = nachAenderung().zustand;
    let anfragen = 1;

    for (let nummer = 0; nummer < 10; nummer += 1) {
      const entscheidung = nachAenderung(zustand);
      expect(entscheidung.art).toBe('warten');
      zustand = entscheidung.zustand;
    }

    const antwort = naechsteAnfrage(zustand, { art: 'antwort', fassung: 1, erfolg: true });
    expect(antwort.art).toBe('anfragen');
    expect(antwort.fassung).toBe(2);
    expect(antwort.anwenden).toBe(true);
    anfragen += 1;

    expect(anfragen, 'zehn Änderungen ergeben höchstens zwei Anfragen').toBeLessThanOrEqual(2);
  });

  test('soll eine ältere Antwort nach einer neueren nicht mehr anwenden (Reihenfolge)', () => {
    let zustand = nachAenderung().zustand;
    zustand = naechsteAnfrage(zustand, { art: 'antwort', fassung: 1, erfolg: true }).zustand;
    zustand = nachAenderung(zustand).zustand;
    const neuere = naechsteAnfrage(zustand, { art: 'antwort', fassung: 2, erfolg: true });
    expect(neuere.anwenden).toBe(true);
    zustand = neuere.zustand;

    const aeltere = naechsteAnfrage(zustand, { art: 'antwort', fassung: 1, erfolg: true });
    expect(aeltere.anwenden, 'die ältere Antwort überschreibt die neuere nicht').toBe(false);
    expect(aeltere.art).toBe('nichts');
  });

  test('soll nach „Beenden“ keine Anfrage mehr starten und keine Antwort mehr anwenden', () => {
    const beendet = naechsteAnfrage(start(), 'beenden');
    expect(beendet.zustand.beendet).toBe(true);

    expect(naechsteAnfrage(beendet.zustand, 'aenderung').art).toBe('nichts');
    expect(naechsteAnfrage(beendet.zustand, { art: 'antwort', fassung: 1, erfolg: true }).art).toBe('nichts');
  });

  test('soll nach einer gescheiterten Antwort die nächste Änderung erneut anfragen', () => {
    let zustand = nachAenderung().zustand;
    const fehler = naechsteAnfrage(zustand, { art: 'antwort', fassung: 1, erfolg: false });

    expect(fehler.anwenden).toBe(false);
    expect(fehler.zustand.laeuft).toBe(false);
    zustand = fehler.zustand;

    const naechste = nachAenderung(zustand);
    expect(naechste.art).toBe('anfragen');
    expect(naechste.fassung).toBe(2);
  });
});
