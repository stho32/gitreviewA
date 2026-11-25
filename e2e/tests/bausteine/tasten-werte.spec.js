'use strict';
// Bausteintests ohne Browser der Tastenbelegung (R00030, B2901/B2903/B2904/B2906): die eine Tabelle Taste → Aktion, die
// Kontextentscheidung (Eingabefeld, Strg/Alt/Meta, AltGr, offener Dialog, Modus, nicht gebaute Aktion), der Abschnittswechsel,
// die Statuszeile und die Hinweise an den Bedienelementen. Nur Rechnung: kein DOM, kein `git`, kein Server.
const { test, expect } = require('@playwright/test');
const werte = require('../../../src/GitReviewA/web/tasten-werte.js');

const OHNE_MODIFIKATOREN = { strg: false, alt: false, meta: false, altGraph: false };

function lage(zusatz = {}) {
  return {
    feldImFokus: false,
    modifikatoren: { ...OHNE_MODIFIKATOREN },
    offenerDialog: false,
    modus: werte.ZUSAMMEN,
    vorhanden: [],
    ...zusatz,
  };
}

/** Alle Tasten, die die Schicht abfängt (die Feld-Tasten und das reine Esc gehören nicht dazu). */
const GLOBALE_TASTEN = werte.EINTRAEGE.filter(eintrag => !eintrag.imFeld && !eintrag.nurEbene);

test.describe('Baustein Tasten-Werte — Tastenbelegung und Kontext (B2901)', () => {
  test('soll jede Taste der Tabelle auf genau eine Aktion abbilden', () => {
    for (const eintrag of GLOBALE_TASTEN) {
      const anlage = lage({ modus: werte.EINZELN, vorhanden: ['anordnungWechseln', 'abgehakteAusblenden', 'suche'] });

      expect(werte.aktionFuer(eintrag.taste, anlage), `Taste ${eintrag.taste}`).toBe(eintrag.aktion);
    }
  });

  test('soll eine unbekannte Taste oder ein Browserkürzel dem Browser lassen', () => {
    for (const taste of ['q', 'F5', 'F1', 'Control', 'Shift', 'PageDown', 'Tab']) {
      expect(werte.aktionFuer(taste, lage()), `Taste ${taste}`).toBeNull();
    }
  });

  test('soll ohne Treffer und ohne verfügbare Aktion nichts auslösen', () => {
    expect(werte.aktionFuer('v', lage())).toBeNull();
    expect(werte.aktionFuer('/', lage())).toBeNull();
    expect(werte.aktionFuer('h', lage())).toBeNull();
    expect(werte.aktionFuer('v', lage({ vorhanden: ['anordnungWechseln'] }))).toBe('anordnungWechseln');
    expect(werte.aktionFuer('/', lage({ vorhanden: ['suche'] }))).toBe('suche');
    expect(werte.aktionFuer('h', lage({ vorhanden: ['abgehakteAusblenden'] }))).toBe('abgehakteAusblenden');
  });

  test('soll in einem Eingabefeld keine einzige Taste abfangen', () => {
    for (const taste of ['j', 'k', 'n', 'p', 'x', 'm', 's', 'v', 'w', 'h', 'u', '[', ']', 'Enter', 'a', 'e', '?']) {
      expect(werte.aktionFuer(taste, lage({ feldImFokus: true, modus: werte.EINZELN })), `Taste ${taste}`).toBeNull();
    }
  });

  test('soll Strg, Alt und Meta sperren und Shift erlauben', () => {
    for (const taste of ['j', 'x', '?', '/', 'n', 'Enter']) {
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, strg: true } })), `Strg+${taste}`).toBeNull();
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, alt: true } })), `Alt+${taste}`).toBeNull();
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, meta: true } })), `Meta+${taste}`).toBeNull();
    }
    expect(werte.aktionFuer('?', lage())).toBe('hilfe');
    expect(werte.aktionFuer('/', lage({ vorhanden: ['suche'] }))).toBe('suche');
  });

  test('soll AltGr für [ und ] von Strg+Alt unterscheiden', () => {
    const einzeln = { modus: werte.EINZELN };
    expect(werte.aktionFuer(']', lage({ ...einzeln, modifikatoren: { ...OHNE_MODIFIKATOREN, alt: true, altGraph: true } }))).toBe('commitWeiter');
    expect(werte.aktionFuer('[', lage({ ...einzeln, modifikatoren: { ...OHNE_MODIFIKATOREN, alt: true, altGraph: true } }))).toBe('commitZurueck');
    expect(werte.aktionFuer(']', lage({ ...einzeln, modifikatoren: { ...OHNE_MODIFIKATOREN, strg: true, alt: true } }))).toBeNull();
  });

  test('soll im offenen Dialog nur Esc und ? durchlassen', () => {
    const dialog = { offenerDialog: true, modus: werte.EINZELN, vorhanden: ['anordnungWechseln'] };
    expect(werte.aktionFuer('Escape', lage(dialog))).toBe('schliessen');
    expect(werte.aktionFuer('?', lage(dialog))).toBe('hilfe');
    for (const taste of ['j', 'k', 'x', 'm', 'n', 'Enter', 'e', 'v']) {
      expect(werte.aktionFuer(taste, lage(dialog)), `Taste ${taste}`).toBeNull();
    }
  });

  test('soll Esc ohne offenes Feld und ohne Dialog nichts tun lassen', () => {
    expect(werte.aktionFuer('Escape', lage())).toBeNull();
  });

  test('soll [ und ] nur in „Einzeln“ verfügbar machen', () => {
    expect(werte.aktionFuer(']', lage({ modus: werte.ZUSAMMEN }))).toBeNull();
    expect(werte.aktionFuer('[', lage({ modus: werte.ZUSAMMEN }))).toBeNull();
    expect(werte.aktionFuer(']', lage({ modus: werte.EINZELN }))).toBe('commitWeiter');
    expect(werte.aktionFuer('[', lage({ modus: werte.EINZELN }))).toBe('commitZurueck');
  });
});

test.describe('Baustein Tasten-Werte — Hilfe aus dem Katalog (B2901)', () => {
  test('soll die Hilfe nach Bereich gruppieren, in fester Reihenfolge', () => {
    const gruppen = werte.belegung(lage({ modus: werte.EINZELN }));

    expect(gruppen.map(gruppe => gruppe.titel)).toEqual(['Allgemein', 'Liste', 'Diff', 'Anmerkung']);
    for (const gruppe of gruppen) {
      expect(gruppe.eintraege.length, gruppe.titel).toBeGreaterThan(0);
      for (const eintrag of gruppe.eintraege) {
        expect(eintrag.text.length, `${gruppe.titel}/${eintrag.aktion}`).toBeGreaterThan(0);
        expect(eintrag.anzeige.length, `${gruppe.titel}/${eintrag.aktion}`).toBeGreaterThan(0);
      }
    }
  });

  test('soll im Modus nicht verfügbare Aktionen markieren', () => {
    const zusammen = werte.belegung(lage({ modus: werte.ZUSAMMEN }));
    const einzeln = werte.belegung(lage({ modus: werte.EINZELN }));

    const eintrag = (gruppen, aktion) => gruppen.flatMap(gruppe => gruppe.eintraege).find(e => e.aktion === aktion);
    expect(eintrag(zusammen, 'commitWeiter').verfuegbar).toBe(false);
    expect(eintrag(einzeln, 'commitWeiter').verfuegbar).toBe(true);
    expect(eintrag(zusammen, 'anordnungWechseln').verfuegbar).toBe(false);
    expect(eintrag(zusammen, 'abhaken').verfuegbar).toBe(true);
    expect(eintrag(zusammen, 'anmerkungSpeichern').verfuegbar).toBe(true);
  });
});

test.describe('Baustein Tasten-Werte — Abschnittswechsel (B2903)', () => {
  test('soll die Abschnittsanfänge aus den Zeilenarten lesen', () => {
    expect(werte.abschnittsanfaenge(['kopf', 'plus', 'kontext', 'kopf', 'minus'])).toEqual([1, 4]);
    expect(werte.abschnittsanfaenge(['plus', 'minus'])).toEqual([0]);
    expect(werte.abschnittsanfaenge(['kopf', 'kopf', 'plus'])).toEqual([2]);
    expect(werte.abschnittsanfaenge([])).toEqual([]);
  });

  test('soll vorwärts den nächsten Abschnitt nehmen und am letzten stehen bleiben', () => {
    const anfaenge = [1, 4];

    expect(werte.naechsterAbschnitt(anfaenge, 0, 1)).toBe(1);
    expect(werte.naechsterAbschnitt(anfaenge, 1, 1)).toBe(4);
    expect(werte.naechsterAbschnitt(anfaenge, 2, 1)).toBe(4);
    expect(werte.naechsterAbschnitt(anfaenge, 4, 1)).toBeNull();
  });

  test('soll rückwärts den vorigen Abschnitt nehmen und am ersten stehen bleiben', () => {
    const anfaenge = [1, 4];

    expect(werte.naechsterAbschnitt(anfaenge, 4, -1)).toBe(1);
    expect(werte.naechsterAbschnitt(anfaenge, 3, -1)).toBe(1);
    expect(werte.naechsterAbschnitt(anfaenge, 1, -1)).toBeNull();
    expect(werte.naechsterAbschnitt(anfaenge, 0, -1)).toBeNull();
  });

  test('soll ohne aktuelle Zeile am ersten Abschnitt beginnen und ohne Abschnitte nichts tun', () => {
    expect(werte.naechsterAbschnitt([1, 4], null, 1)).toBe(1);
    expect(werte.naechsterAbschnitt([1, 4], null, -1)).toBe(1);
    expect(werte.naechsterAbschnitt([], 2, 1)).toBeNull();
    expect(werte.naechsterAbschnitt(null, 2, 1)).toBeNull();
  });
});

test.describe('Baustein Tasten-Werte — Statuszeile und Hinweise (B2904/B2906)', () => {
  test('soll die wichtigsten Kürzel des Bereichs nennen und in „Einzeln“ zusätzlich den Commit', () => {
    const zusammen = werte.statuszeile(lage({ modus: werte.ZUSAMMEN }));
    const einzeln = werte.statuszeile(lage({ modus: werte.EINZELN }));
    const texte = zeilen => zeilen.map(zeile => zeile.text);

    expect(texte(zusammen)).toEqual(['Datei', 'Abschnitt', 'Zeile', 'anmerken', 'abhaken', 'nächste ungeprüfte', 'alle Kürzel']);
    expect(texte(einzeln)).toContain('Commit');
    const commit = einzeln.find(zeile => zeile.text === 'Commit');
    expect(commit.anzeige).toEqual(['[', ']']);
    expect(zusammen.find(zeile => zeile.text === 'alle Kürzel').rechts).toBe(true);
  });

  test('soll je Bedienelement den Hinweis mit Anzeige und ARIA-Schreibweise liefern', () => {
    const hinweise = werte.hinweise();
    const hinweis = selektor => hinweise.find(eintrag => eintrag.selektor === selektor);

    expect(hinweis('#datei-zeilen input.haken')).toEqual({ selektor: '#datei-zeilen input.haken', anzeige: ['x'], aria: 'x' });
    expect(hinweis('.kz-modus').aria).toBe('m');
    expect(hinweis('#naechste-ungepruefte').aria).toBe('u');
    expect(hinweis('#diff .sprung-knopf').aria).toBe('o');
    expect(hinweis('#commit-waehler').anzeige).toEqual(['[', ']']);
    expect(hinweis('#hilfe-knopf').aria).toBe('?');
  });
});