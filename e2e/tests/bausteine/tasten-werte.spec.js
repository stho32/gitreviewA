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
    for (const taste of ['F5', 'F1', 'Control', 'Shift', 'PageDown', 'Tab']) {
      expect(werte.aktionFuer(taste, lage()), `Taste ${taste}`).toBeNull();
    }
    // `q` ist seit R00050 im Katalog (Dialog „Beenden“) und deshalb hier keine unbekannte Taste mehr.
    expect(werte.aktionFuer('q', lage({ vorhanden: [] }))).toBeNull();
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
    for (const taste of ['j', 'k', 'n', 'p', 'x', 'm', 's', 'v', 'w', 'h', 'b', 'u', '[', ']', 'Enter', 'a', 'e', 'q', '1', '2', '3', '?']) {
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
    const dialog = { offenerDialog: true, modus: werte.EINZELN, vorhanden: ['anordnungWechseln', 'beendenDialog'] };
    expect(werte.aktionFuer('Escape', lage(dialog))).toBe('schliessen');
    expect(werte.aktionFuer('?', lage(dialog))).toBe('hilfe');
    for (const taste of ['j', 'k', 'x', 'm', 'n', 'Enter', 'e', 'v', 'q']) {
      expect(werte.aktionFuer(taste, lage(dialog)), `Taste ${taste}`).toBeNull();
    }
  });

  // R00050 „Bedienung“: der modale Beenden-Dialog fängt die Kürzel ganz — auch `?` öffnet die Hilfe nicht darüber.
  test('soll im modalen Beenden-Dialog nur Esc durchlassen — `?` öffnet die Hilfe nicht darüber', () => {
    const dialog = { offenerDialog: true, modalerDialog: true, modus: werte.EINZELN, vorhanden: ['beendenDialog'] };
    expect(werte.aktionFuer('Escape', lage(dialog))).toBe('schliessen');
    expect(werte.aktionFuer('?', lage(dialog)), '? über dem Dialog').toBeNull();
    for (const taste of ['j', 'k', 'x', 'm', 'n', 'Enter', 'e', 'v', 'q']) {
      expect(werte.aktionFuer(taste, lage(dialog)), `Taste ${taste}`).toBeNull();
    }
  });

  test('soll die Hilfe im Offen-Zustand weiter schließen lassen (Hilfe-Overlay: Esc und ?)', () => {
    const hilfe = { offenerDialog: true, modalerDialog: false, vorhanden: [] };
    expect(werte.aktionFuer('Escape', lage(hilfe))).toBe('schliessen');
    expect(werte.aktionFuer('?', lage(hilfe))).toBe('hilfe');
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
    expect(hinweis('#diff-suche').aria).toBe('/');
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

test.describe('Baustein Tasten-Werte — Katalogeintrag je Laufart (R00044, Karte #52)', () => {
  const DATEIANSICHT = werte.DATEIANSICHT;
  const dateiansichtLage = (zusatz = {}) => lage({ laufart: DATEIANSICHT, vorhanden: GEBAUT, ...zusatz });
  const reviewLage = (zusatz = {}) => lage({ laufart: werte.REVIEW, vorhanden: GEBAUT, ...zusatz });

  test('soll `y` genau einmal als „Bereich kopieren“ der Dateiansicht führen', () => {
    const eintraege = werte.EINTRAEGE.filter(eintrag => eintrag.taste === 'y');

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].aktion).toBe('bereichKopieren');
    expect(eintraege[0].text).toBe('Bereich kopieren');
    expect(eintraege[0].ziel).toBe('#bereich-kopieren');
    expect(eintraege[0].anzeige).toEqual(['y']);
    expect(eintraege[0].laufart).toBe(DATEIANSICHT);
  });

  test('soll `y` und `c` nur in der Dateiansicht abfangen, im Review nicht', () => {
    expect(werte.aktionFuer('y', dateiansichtLage())).toBe('bereichKopieren');
    expect(werte.aktionFuer('c', dateiansichtLage())).toBe('dateiKopieren');
    expect(werte.aktionFuer('y', reviewLage())).toBeNull();
    expect(werte.aktionFuer('c', reviewLage())).toBeNull();
  });

  test('soll nur die Kürzel der jeweiligen Laufart in der Hilfe zeigen', () => {
    const dateiansicht = werte.belegung(dateiansichtLage()).flatMap(gruppe => gruppe.eintraege);
    const review = werte.belegung(reviewLage()).flatMap(gruppe => gruppe.eintraege);
    const aktionen = eintraege => eintraege.map(eintrag => eintrag.aktion);

    expect(aktionen(dateiansicht).sort()).toEqual([
      'bereichKopieren', 'dateiKopieren', 'dateiWeiter', 'dateiZurueck', 'hilfe', 'schliessen', 'seitenleisteEinklappen', 'suche', 'umbruchWechseln',
    ]);
    for (const eintrag of dateiansicht) {
      expect(eintrag.verfuegbar, `${eintrag.text} ist in der Dateiansicht verfügbar`).toBe(true);
    }
    // Die Seitenleiste der Dateiansicht (R00045) trägt dieselben Listenkürzel wie der Review: `j`/`k` wählen, `b` klappt ein.
    for (const geteilt of ['dateiWeiter', 'dateiZurueck', 'seitenleisteEinklappen']) {
      expect(aktionen(dateiansicht), `${geteilt} gehört in die Dateiansicht`).toContain(geteilt);
      expect(aktionen(review), `${geteilt} gehört in den Review`).toContain(geteilt);
    }
    for (const fremd of ['abhaken', 'ansichtWechseln', 'zeileAnmerken', 'dateiAnmerken']) {
      expect(aktionen(dateiansicht), `${fremd} gehört nicht in die Dateiansicht`).not.toContain(fremd);
      expect(aktionen(review), `${fremd} gehört in den Review`).toContain(fremd);
    }
  });

  test('soll Ziel und Text je Laufart überschreiben (/, Esc)', () => {
    expect(werte.zielFuer(werte.eintragFuerTaste('/'), dateiansichtLage())).toBe('#da-suche');
    expect(werte.zielFuer(werte.eintragFuerTaste('/'), reviewLage())).toBe('#diff-suche');
    expect(werte.textFuer(werte.eintragFuerTaste('/'), dateiansichtLage())).toBe('In der Datei suchen');
    expect(werte.textFuer(werte.eintragFuerTaste('/'), reviewLage())).toBe('Suche im Diff');
    expect(werte.textFuer(werte.eintragFuerTaste('Escape'), dateiansichtLage())).toBe('Markierung aufheben, Übersicht schließen');
    expect(werte.textFuer(werte.eintragFuerTaste('Escape'), reviewLage())).toBe('Notizfeld verwerfen, Ebene schließen');
  });

  test('soll die Hinweise je Laufart an das richtige Bedienelement liefern', () => {
    const dateiansicht = werte.hinweise(dateiansichtLage());
    const selektoren = dateiansicht.map(hinweis => hinweis.selektor);

    expect(selektoren).toEqual(expect.arrayContaining(['#datei-kopieren', '#bereich-kopieren', '#da-suche', '#hilfe-knopf', '#da-umbruch']));
    for (const fremd of ['#diff .df-sc', '#naechste-ungepruefte', '.anordnung-wahl', '#diff .sprung-knopf']) {
      expect(selektoren, `${fremd} gehört nicht in die Dateiansicht`).not.toContain(fremd);
    }
    expect(dateiansicht.find(hinweis => hinweis.selektor === '#bereich-kopieren').aria).toBe('y');
    expect(dateiansicht.find(hinweis => hinweis.selektor === '#da-suche').aria).toBe('/');
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

// R00039 (B3803): die vier Anzeigeverfahren hängen am Menüknopf „Ansicht ▾“ — ihr `ziel` nennt den sichtbaren Ort, die Hilfe
// denselben Ort im Text.
test.describe('Baustein Tasten-Werte — Menü „Ansicht ▾“ (R00039)', () => {
  test('soll s, v, w, l mit dem Ziel des Menüknopfes führen', () => {
    for (const taste of ['s', 'v', 'w', 'l']) {
      const eintraege = werte.EINTRAEGE.filter(eintrag => eintrag.taste === taste);
      expect(eintraege, `Taste ${taste}`).toHaveLength(1);
      expect(eintraege[0].ziel, `Taste ${taste}`).toBe('#ansicht-knopf');
    }
  });

  test('soll den Hinweis aller vier Kürzel am Menüknopf bündeln', () => {
    const hinweis = werte.hinweise().find(eintrag => eintrag.selektor === '#ansicht-knopf');

    expect(hinweis).toEqual({ selektor: '#ansicht-knopf', anzeige: ['s', 'v', 'w', 'l'], aria: 's v w l' });
  });

  test('soll in der Hilfe „Ansicht ▾“ als Ort der vier Anzeigeverfahren nennen', () => {
    const diff = werte.belegung(lage({ vorhanden: GEBAUT })).find(gruppe => gruppe.kennung === 'diff');
    for (const aktion of ['ansichtWechseln', 'anordnungWechseln', 'umbruchWechseln', 'leerraumWechseln']) {
      const eintrag = diff.eintraege.find(kandidat => kandidat.aktion === aktion);
      expect(eintrag, aktion).toBeTruthy();
      expect(eintrag.text, `${aktion} nennt Ansicht ▾`).toContain('Ansicht ▾');
    }
  });
});

// R00039 (B3): dasselbe Kürzel `w` steht in beiden Laufarten an einem anderen Bedienelement — Review im Menüknopf,
// Dateiansicht am Umbruch-Schalter. Das `ziel` des Katalogs muss je Laufart das vorhandene Element nennen.
test.describe('Baustein Tasten-Werte — Ziel je Laufart (R00039)', () => {
  const UMBRUCH = werte.EINTRAEGE.find(eintrag => eintrag.aktion === 'umbruchWechseln');

  test('soll das Ziel eines Eintrags je Laufart nennen — Review Menüknopf, Dateiansicht Umbruch-Schalter', () => {
    expect(werte.zielFuer(UMBRUCH, lage({ laufart: werte.REVIEW })), 'Review').toBe('#ansicht-knopf');
    expect(werte.zielFuer(UMBRUCH, lage({ laufart: werte.DATEIANSICHT })), 'Dateiansicht').toBe('#da-umbruch');
    expect(werte.zielFuer(UMBRUCH, lage()), 'ohne Laufart der Review-Ort').toBe('#ansicht-knopf');
  });

  test('soll die Hinweise je Laufart an das vorhandene Element binden', () => {
    const review = werte.hinweise({ laufart: werte.REVIEW });
    const menu = review.find(hinweis => hinweis.selektor === '#ansicht-knopf');
    expect(menu, 'Review: Hinweis am Menüknopf').toBeTruthy();
    expect(menu.anzeige).toEqual(['s', 'v', 'w', 'l']);
    expect(review.some(hinweis => hinweis.selektor === '#da-umbruch'), 'Review kennt den Umbruch-Schalter nicht').toBe(false);

    const datei = werte.hinweise({ laufart: werte.DATEIANSICHT });
    const schalter = datei.find(hinweis => hinweis.selektor === '#da-umbruch');
    expect(schalter, 'Dateiansicht: Hinweis am Umbruch-Schalter').toEqual({ selektor: '#da-umbruch', anzeige: ['w'], aria: 'w' });
  });
});

test.describe('Baustein Tasten-Werte — Katalog `f` der Dateisuche (R00049, B4506)', () => {
  test('soll `f` genau einmal führen, im Bereich Liste, mit dem Suchfeld als Ziel', () => {
    const eintraege = werte.EINTRAEGE.filter(eintrag => eintrag.taste === 'f');

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].aktion).toBe('dateiSuchen');
    expect(eintraege[0].text).toBe('Dateien suchen');
    expect(eintraege[0].ziel).toBe('#dateiliste-suche');
    expect(eintraege[0].anzeige).toEqual(['f']);
    expect(eintraege[0].bereich).toBe('liste');
    expect(eintraege[0].laufart).toBe(werte.REVIEW);
  });

  test('soll `f` nur wirken lassen, wenn das Suchfeld gebaut ist, und nie in der Dateiansicht', () => {
    expect(werte.aktionFuer('f', lage({ vorhanden: GEBAUT }))).toBe('dateiSuchen');
    expect(werte.aktionFuer('f', lage({ vorhanden: [] }))).toBeNull();
    expect(werte.aktionFuer('f', lage({ vorhanden: GEBAUT, laufart: werte.DATEIANSICHT }))).toBeNull();
  });

  test('soll `f` im Feld als Text lassen (das Feld fängt es selbst ab)', () => {
    expect(werte.aktionFuer('f', lage({ vorhanden: GEBAUT, feldImFokus: true }))).toBeNull();
  });

  test('soll den Hinweis am Suchfeld liefern (Kriterium 9)', () => {
    const hinweis = werte.hinweise({ laufart: werte.REVIEW }).find(eintrag => eintrag.selektor === '#dateiliste-suche');

    expect(hinweis.anzeige).toEqual(['f']);
    expect(hinweis.aria).toBe('f');
  });
});

// R00050 (B4604): `q` öffnet nur den Dialog „Beenden“ und beendet nie selbst; „Abbrechen“ hat kein Kürzel.
test.describe('Baustein Tasten-Werte — Katalog `q` des Beenden-Dialogs (R00050, B4604)', () => {
  test('soll `q` genau einmal führen, Bereich Allgemein, Laufart Review, mit dem Ziel des Beenden-Knopfes', () => {
    const eintraege = werte.EINTRAEGE.filter(eintrag => eintrag.taste === 'q');

    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].aktion).toBe('beendenDialog');
    expect(eintraege[0].bereich).toBe('allgemein');
    expect(eintraege[0].laufart).toBe(werte.REVIEW);
    expect(eintraege[0].ziel).toBe('#beenden');
    expect(eintraege[0].anzeige).toEqual(['q']);
  });

  test('soll `q` nur abfangen, wenn der Beenden-Knopf gebaut ist, und nie in der Dateiansicht', () => {
    expect(werte.aktionFuer('q', lage({ vorhanden: GEBAUT }))).toBe('beendenDialog');
    expect(werte.aktionFuer('q', lage({ vorhanden: [] }))).toBeNull();
    expect(werte.aktionFuer('q', lage({ vorhanden: GEBAUT, laufart: werte.DATEIANSICHT }))).toBeNull();
  });

  test('soll den Hinweis `q` am Beenden-Knopf tragen (Hinweis und aria-keyshortcuts aus derselben Quelle)', () => {
    const hinweis = werte.hinweise({ laufart: werte.REVIEW }).find(eintrag => eintrag.selektor === '#beenden');

    expect(hinweis).toEqual({ selektor: '#beenden', anzeige: ['q'], aria: 'q' });
  });

  test('soll in der Hilfe `q` bei „Beenden“ nennen und „Abbrechen“ ohne Eintrag lassen', () => {
    const allgemein = werte.belegung(lage({ vorhanden: GEBAUT })).find(gruppe => gruppe.kennung === 'allgemein');
    const q = allgemein.eintraege.find(eintrag => eintrag.anzeige.includes('q'));
    const abbrechen = werte.EINTRAEGE.filter(eintrag => /abbrechen/i.test(eintrag.text) || /abbrechen/i.test(eintrag.aktion));

    expect(q.text).toContain('Beenden');
    expect(q.verfuegbar).toBe(true);
    expect(abbrechen).toHaveLength(0);
  });
});
