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

/** Die Aktionen, deren Bedienelement der Katalog nennt — in diesen Rechnungen „gebaut“. */
const GEBAUT = werte.EINTRAEGE.filter(eintrag => eintrag.ziel).map(eintrag => eintrag.aktion);

test.describe('Baustein Tasten-Werte — Tastenbelegung und Kontext (B2901)', () => {
  test('soll jede Taste der Tabelle auf genau eine Aktion abbilden', () => {
    for (const eintrag of GLOBALE_TASTEN) {
      const anlage = lage({ modus: werte.EINZELN, vorhanden: GEBAUT });

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
    for (const taste of ['j', 'k', 'n', 'p', 'x', 'm', 's', 'v', 'w', 'h', 'b', 'u', '[', ']', 'Enter', 'a', 'e', '1', '2', '3', '?']) {
      expect(werte.aktionFuer(taste, lage({ feldImFokus: true, modus: werte.EINZELN })), `Taste ${taste}`).toBeNull();
    }
  });

  test('soll Strg, Alt und Meta sperren und Shift erlauben', () => {
    for (const taste of ['j', 'x', '?', '/', 'n', 'Enter']) {
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, strg: true } })), `Strg+${taste}`).toBeNull();
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, alt: true } })), `Alt+${taste}`).toBeNull();
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, meta: true } })), `Meta+${taste}`).toBeNull();
    }
    expect(werte.aktionFuer('?', lage({ vorhanden: ['hilfe'] }))).toBe('hilfe');
    expect(werte.aktionFuer('/', lage({ vorhanden: ['suche'] }))).toBe('suche');
  });

  test('soll AltGr für [ und ] von Strg+Alt unterscheiden', () => {
    const einzeln = { modus: werte.EINZELN, vorhanden: GEBAUT };
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
    expect(werte.aktionFuer(']', lage({ modus: werte.EINZELN, vorhanden: GEBAUT }))).toBe('commitWeiter');
    expect(werte.aktionFuer('[', lage({ modus: werte.EINZELN, vorhanden: GEBAUT }))).toBe('commitZurueck');
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
    const zusammen = werte.belegung(lage({ modus: werte.ZUSAMMEN, vorhanden: ['commitWeiter', 'abhaken'] }));
    const einzeln = werte.belegung(lage({ modus: werte.EINZELN, vorhanden: ['commitWeiter', 'abhaken'] }));

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
    const zusammen = werte.statuszeile(lage({ modus: werte.ZUSAMMEN, vorhanden: GEBAUT }));
    const einzeln = werte.statuszeile(lage({ modus: werte.EINZELN, vorhanden: GEBAUT }));
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
    expect(hinweis('#ansicht-knopf')).toEqual({ selektor: '#ansicht-knopf', anzeige: ['s', 'v', 'w', 'l'], aria: 's v w l' });
    expect(hinweis('#suche-eingabe').aria).toBe('/');
  });
});
test.describe('Baustein Tasten-Werte — Tasten 1–3 (R00036)', () => {
  test('soll die Ziffern 1, 2, 3 auf je eine Anmerk-Aktion mit Eigenschaft abbilden', () => {
    const erwartet = { 1: 'zeileAnmerkenMuss', 2: 'zeileAnmerkenFrage', 3: 'zeileAnmerkenIdee' };

    for (const [taste, aktion] of Object.entries(erwartet)) {
      expect(werte.aktionFuer(taste, lage({ vorhanden: GEBAUT })), `Taste ${taste}`).toBe(aktion);
    }
  });

  test('soll 1–3 je genau einmal im Katalog führen, mit Ziel und dem Text „Zeile anmerken: <Art>“', () => {
    const erwartet = { 1: 'Zeile anmerken: Muss', 2: 'Zeile anmerken: Frage', 3: 'Zeile anmerken: Idee' };

    for (const [taste, text] of Object.entries(erwartet)) {
      const eintraege = werte.EINTRAEGE.filter(eintrag => eintrag.taste === taste);
      expect(eintraege, `Taste ${taste}`).toHaveLength(1);
      expect(eintraege[0].text).toBe(text);
      expect(eintraege[0].bereich).toBe('diff');
      expect(eintraege[0].ziel, `Taste ${taste} trägt ein Ziel`).toBeTruthy();
    }
  });

  test('soll Strg, Alt und Meta für 1–3 sperren', () => {
    for (const taste of ['1', '2', '3']) {
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, strg: true }, vorhanden: GEBAUT }))).toBeNull();
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, alt: true }, vorhanden: GEBAUT }))).toBeNull();
      expect(werte.aktionFuer(taste, lage({ modifikatoren: { ...OHNE_MODIFIKATOREN, meta: true }, vorhanden: GEBAUT }))).toBeNull();
    }
  });

  test('soll ohne gebauten Diff-Bereich 1–3 nicht abfangen', () => {
    expect(werte.aktionFuer('2', lage())).toBeNull();
  });

  test('soll die drei Ziffern in der Hilfe des Bereichs Diff zeigen, je einmal', () => {
    const diff = werte.belegung(lage({ vorhanden: GEBAUT })).find(gruppe => gruppe.kennung === 'diff');
    const ziffern = diff.eintraege.filter(eintrag => ['1', '2', '3'].includes(eintrag.anzeige[0]));

    expect(ziffern.map(eintrag => eintrag.text)).toEqual(['Zeile anmerken: Muss', 'Zeile anmerken: Frage', 'Zeile anmerken: Idee']);
    for (const eintrag of ziffern) {
      expect(eintrag.verfuegbar).toBe(true);
    }
  });
});

test.describe('Baustein Tasten-Werte — Katalog `b` der Seitenleiste (R00035, B3402)', () => {
  test('soll `b` genau einmal führen, mit der Aktion und dem Ziel des Ausklapp-Knopfes', () => {
    const eintraege = werte.EINTRAEGE.filter(eintrag => eintrag.taste === 'b');

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].aktion).toBe('seitenleisteEinklappen');
    expect(eintraege[0].text).toBe('Seitenleiste ein-/ausklappen');
    expect(eintraege[0].ziel).toBe('#einklappen');
    expect(eintraege[0].anzeige).toEqual(['b']);
    expect(eintraege[0].bereich).toBe('liste');
  });

  test('soll `b` betätigen lassen, sobald der Knopf gebaut ist, sonst nicht (enger Aufbau ohne Knopf)', () => {
    expect(werte.aktionFuer('b', lage({ vorhanden: GEBAUT }))).toBe('seitenleisteEinklappen');
    expect(werte.aktionFuer('b', lage({ vorhanden: [] }))).toBeNull();
  });

  test('soll den Hinweis an den Ausklapp-Knopf liefern (Hinweis und aria-keyshortcuts aus derselben Quelle)', () => {
    const hinweis = werte.hinweise().find(eintrag => eintrag.selektor === '#einklappen');

    expect(hinweis).toEqual({ selektor: '#einklappen', anzeige: ['b'], aria: 'b' });
  });

  test('soll die Aktion in der Hilfe nennen und beim gebauten Knopf als verfügbar zeigen', () => {
    const gruppen = werte.belegung(lage({ vorhanden: GEBAUT }));
    const eintraege = gruppen.flatMap(gruppe => gruppe.eintraege).filter(eintrag => eintrag.aktion === 'seitenleisteEinklappen');

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].text).toBe('Seitenleiste ein-/ausklappen');
    expect(eintraege[0].verfuegbar).toBe(true);
  });
});

test.describe('Baustein Tasten-Werte — Katalog `r` der Ergebnis-Spalte (R00037, B3604)', () => {
  test('soll `r` genau einmal fuehren, mit der Aktion und dem Ziel des Ausklapp-Knopfes (Kriterium 10)', () => {
    const eintraege = werte.EINTRAEGE.filter(eintrag => eintrag.taste === 'r');

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].aktion).toBe('ergebnisEinklappen');
    expect(eintraege[0].text).toBe('Ergebnis-Spalte ein-/ausklappen');
    expect(eintraege[0].ziel).toBe('#ergebnis-einklappen');
    expect(eintraege[0].anzeige).toEqual(['r']);
  });

  test('soll `r` betätigen lassen, sobald der Knopf gebaut ist, sonst nicht (Abriss am Rand)', () => {
    expect(werte.aktionFuer('r', lage({ vorhanden: GEBAUT }))).toBe('ergebnisEinklappen');
    expect(werte.aktionFuer('r', lage({ vorhanden: [] }))).toBeNull();
  });

  test('soll den Hinweis an den Knopf der Ergebnis-Spalte liefern', () => {
    const hinweis = werte.hinweise().find(eintrag => eintrag.selektor === '#ergebnis-einklappen');

    expect(hinweis).toEqual({ selektor: '#ergebnis-einklappen', anzeige: ['r'], aria: 'r' });
  });

  test('soll die Aktion in der Hilfe nennen und beim gebauten Knopf als verfügbar zeigen', () => {
    const gruppen = werte.belegung(lage({ vorhanden: GEBAUT }));
    const eintraege = gruppen.flatMap(gruppe => gruppe.eintraege).filter(eintrag => eintrag.aktion === 'ergebnisEinklappen');

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].text).toBe('Ergebnis-Spalte ein-/ausklappen');
    expect(eintraege[0].verfuegbar).toBe(true);
  });
});
