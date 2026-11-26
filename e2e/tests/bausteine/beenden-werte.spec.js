'use strict';
// Bausteintests (ohne Browser) der einen Dialogbeschreibung (R00050, B4601): Titel, Hinweiszeilen, Knöpfe, Vorgabe und
// Endzustand für „beenden“ und „abbrechen“; Grenzen 0/1/n, alle abgehakt, keine Dateien, gesperrt zählt als ungeprüft.
// Dazu die eine Zählrechnung: Dateien über `fortschrittZusammen`, Anmerkungen und Haken aus den Serverquellen.
const { test, expect } = require('@playwright/test');
const {
  dialogBeschreibung, lageAusQuellen, BEENDEN, ABBRECHEN,
} = require('../../../src/GitReviewA/web/beenden-werte.js');

function lage(zusatz = {}) {
  return {
    anmerkungen: 0,
    anmerkungsdateien: 0,
    haken: 0,
    dateien: { abgehakt: 3, gesamt: 3, nichtLesbar: 0 },
    ...zusatz,
  };
}

function anmerkung(datei) {
  return { nummer: 1, commit: 'a', datei, zeile: 1, text: 'x' };
}

function standStelle(commit, datei, abgehakt, sperrgrund = '') {
  return { commit, datei, abgehakt, sperrgrund };
}

function nettoDatei(pfad, stellen, sperrgrund = '') {
  return { pfad, stellen, sperrgrund };
}

test.describe('Baustein Beenden-Werte — Dialogbeschreibung (B4601)', () => {
  test('soll für „Beenden“ Titel, beide Zeilen, Knöpfe, Vorgabe und Endzustand liefern', () => {
    const beschreibung = dialogBeschreibung(BEENDEN, lage({ anmerkungen: 2, anmerkungsdateien: 2, dateien: { abgehakt: 1, gesamt: 3, nichtLesbar: 0 } }));

    expect(beschreibung.art).toBe(BEENDEN);
    expect(beschreibung.titel).toBe('Review beenden und Ergebnis senden?');
    expect(beschreibung.zeilen).toEqual([
      '2 Anmerkungen in 2 Dateien gehen auf stdout an die aufrufende KI.',
      '2 von 3 Dateien sind nicht abgehakt.',
    ]);
    expect(beschreibung.zurueck).toBe('Zurück (Esc)');
    expect(beschreibung.bestaetigen).toBe('Beenden (Enter)');
    expect(beschreibung.vorgabe).toBe('bestaetigen');
    expect(beschreibung.endzustand).toEqual({
      titel: 'Review beendet',
      hinweis: 'Das Ergebnis steht in der Konsole. Dieses Fenster kann geschlossen werden.',
    });
    expect(beschreibung.abschnitte).toEqual([]);
  });

  test('soll die Anmerkungszeile an den Grenzen 0/1/n und in Einzahl/Mehrzahl richtig schreiben (Kriterien 1 und 3)', () => {
    const zeile = (anmerkungen, dateien) => dialogBeschreibung(BEENDEN, lage({ anmerkungen, anmerkungsdateien: dateien })).zeilen[0];

    expect(zeile(0, 0)).toBe('Keine Anmerkungen: die KI erhält ‚Keine Anmerkungen.‘');
    expect(zeile(1, 1)).toBe('1 Anmerkung in 1 Datei geht auf stdout an die aufrufende KI.');
    expect(zeile(2, 1)).toBe('2 Anmerkungen in 1 Datei gehen auf stdout an die aufrufende KI.');
    expect(zeile(2, 2)).toBe('2 Anmerkungen in 2 Dateien gehen auf stdout an die aufrufende KI.');
  });

  test('soll die Zeile der ungeprüften Dateien an allen Grenzen schreiben (Kriterien 3 und 4)', () => {
    const dateizeile = dateien => dialogBeschreibung(BEENDEN, lage({ dateien })).zeilen[1];

    expect(dateizeile({ abgehakt: 0, gesamt: 0, nichtLesbar: 0 })).toBe('Keine Dateien in der Auswahl.');
    expect(dateizeile({ abgehakt: 3, gesamt: 3, nichtLesbar: 0 })).toBe('Alle 3 Dateien sind abgehakt.');
    expect(dateizeile({ abgehakt: 1, gesamt: 3, nichtLesbar: 0 })).toBe('2 von 3 Dateien sind nicht abgehakt.');
    expect(dateizeile({ abgehakt: 1, gesamt: 10, nichtLesbar: 3 })).toBe('9 von 10 Dateien sind nicht abgehakt (3 nicht lesbar).');
    expect(dateizeile({ abgehakt: 0, gesamt: 1, nichtLesbar: 0 })).toBe('1 von 1 Datei ist nicht abgehakt.');
  });

  test('soll für „Abbrechen“ warnen, „Zurück“ als Vorgabe setzen und den Endzustand nennen (Kriterien 8 und 9)', () => {
    const beschreibung = dialogBeschreibung(ABBRECHEN, lage({ anmerkungen: 2, haken: 1 }));

    expect(beschreibung.art).toBe(ABBRECHEN);
    expect(beschreibung.titel).toBe('Review abbrechen?');
    expect(beschreibung.zeilen).toEqual([
      'Alle 2 Anmerkungen und 1 Haken gehen verloren.',
      'Die KI erhält kein Ergebnis (stdout bleibt leer, Exit 130).',
    ]);
    expect(beschreibung.zurueck).toBe('Zurück (Esc)');
    expect(beschreibung.bestaetigen).toBe('Abbrechen');
    expect(beschreibung.vorgabe).toBe('zurueck');
    expect(beschreibung.endzustand).toEqual({
      titel: 'Review abgebrochen',
      hinweis: 'Es gibt kein Ergebnis. Dieses Fenster kann geschlossen werden.',
    });
    expect(beschreibung.abschnitte).toEqual([]);
  });

  test('soll die Verlustzeile bei 0 Anmerkungen und 0 Haken weglassen, sonst nennen', () => {
    const ohne = dialogBeschreibung(ABBRECHEN, lage({ anmerkungen: 0, haken: 0 }));
    const nurHaken = dialogBeschreibung(ABBRECHEN, lage({ anmerkungen: 0, haken: 1 }));
    const nurAnmerkungen = dialogBeschreibung(ABBRECHEN, lage({ anmerkungen: 1, haken: 0 }));

    expect(ohne.zeilen).toEqual(['Die KI erhält kein Ergebnis (stdout bleibt leer, Exit 130).']);
    expect(nurHaken.zeilen[0]).toBe('Alle 0 Anmerkungen und 1 Haken gehen verloren.');
    expect(nurAnmerkungen.zeilen[0]).toBe('Alle 1 Anmerkung und 0 Haken gehen verloren.');
  });

  test('soll nicht bestimmbare Quellen als „konnte nicht bestimmt werden“ nennen, ohne das Bestätigen zu sperren', () => {
    const beschreibung = dialogBeschreibung(BEENDEN, lage({ anmerkungen: null, anmerkungsdateien: null }));
    const abbrechen = dialogBeschreibung(ABBRECHEN, lage({ anmerkungen: null, haken: null }));

    expect(beschreibung.zeilen[0]).toBe('Anmerkungen konnten nicht bestimmt werden');
    expect(beschreibung.vorgabe).toBe('bestaetigen');
    expect(abbrechen.zeilen).toContain('Anmerkungen konnten nicht bestimmt werden');
    expect(abbrechen.zeilen).toContain('Haken konnten nicht bestimmt werden');
  });

  test('soll eine unbekannte Art ablehnen statt einen zweiten Dialog zu erfinden', () => {
    expect(() => dialogBeschreibung('loeschen', lage())).toThrow();
  });
});

test.describe('Baustein Beenden-Werte — die eine Zählrechnung (B4601)', () => {
  const HASH_P = 'p'.repeat(40);
  const HASH_Q = 'q'.repeat(40);

  test('soll Dateien über `fortschrittZusammen` zählen und gesperrte Dateien als ungeprüft mitnennen (Kriterium 4)', () => {
    const zusammenstand = {
      dateien: [
        nettoDatei('README.md', [{ commit: HASH_P, pfad: 'README.md' }]),
        nettoDatei('src/a.txt', [{ commit: HASH_P, pfad: 'src/a.txt' }]),
        nettoDatei('src/b.txt', [{ commit: HASH_Q, pfad: 'src/b.txt' }], 'Diff nicht lesbar: Name nicht eindeutig'),
      ],
    };
    const hakenstand = {
      abgehakt: 1,
      stellen: [
        standStelle(HASH_P, 'README.md', true),
        standStelle(HASH_P, 'src/a.txt', false),
        standStelle(HASH_Q, 'src/b.txt', false, 'Diff nicht lesbar: Name nicht eindeutig'),
      ],
    };

    const lageAus = lageAusQuellen({ anmerkungen: [], hakenstand, zusammenstand });

    expect(lageAus.dateien).toEqual({ abgehakt: 1, gesamt: 3, nichtLesbar: 1 });
  });

  test('soll Anmerkungen und ihre Dateien unterscheiden: zwei Rohbyte-Namen sind zwei Dateien (Kriterium 6)', () => {
    const lageAus = lageAusQuellen({
      anmerkungen: [anmerkung('f\u00ff.txt'), anmerkung('f\u00fe.txt')],
      hakenstand: { abgehakt: 0, stellen: [] },
      zusammenstand: { dateien: [] },
    });

    expect(lageAus.anmerkungen).toBe(2);
    expect(lageAus.anmerkungsdateien).toBe(2);
  });

  test('soll dieselbe Datei mehrerer Anmerkungen einmal zählen und Haken aus dem Serverstand nennen', () => {
    const lageAus = lageAusQuellen({
      anmerkungen: [anmerkung('src/a.txt'), anmerkung('src/a.txt'), anmerkung('README.md')],
      hakenstand: { abgehakt: 2, stellen: [] },
      zusammenstand: { dateien: [] },
    });

    expect([lageAus.anmerkungen, lageAus.anmerkungsdateien, lageAus.haken]).toEqual([3, 2, 2]);
  });

  test('soll eine fehlende Quelle als null führen — nie als 0, das wie „nichts“ aussähe', () => {
    const ohneAnmerkungen = lageAusQuellen({ anmerkungen: null, hakenstand: null, zusammenstand: null });

    expect(ohneAnmerkungen).toEqual({ anmerkungen: null, anmerkungsdateien: null, haken: null, dateien: null });
    expect(dialogBeschreibung(ABBRECHEN, ohneAnmerkungen).zeilen).not.toContain('Alle 0 Anmerkungen und 0 Haken gehen verloren.');
  });
});