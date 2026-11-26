'use strict';
// Spezifikation R00035 „Seitenleiste ein- und ausklappen“ (I0036, B3404): der Fokus geht nie verloren (Einklappen aus der Liste
// auf den Knopf, Ausklappen bleibt dort), die eingeklappten Listenelemente sind nicht im Tab-Weg (Kopf → Streifen/Knopf → Diff →
// Statuszeile), und „Nächste ungeprüfte“ bleibt eingeklappt bedienbar — Taste `u`, j/k und der Knopf „Erste ungeprüfte öffnen“ im
// leeren Diff-Bereich, samt der Meldung aus R00028, wenn alles abgehakt ist. Browser-Eigenes (Fokus, Tab, Tastendruck); Repos S/Z.
const { test, expect } = require('../dsl/einklappen.js');

test.describe('Anschluss an Nächste ungeprüfte und Fokus (B3404)', () => {
  test('beim Einklappen wandert der Fokus aus der Dateiliste auf den Knopf, beim Ausklappen bleibt er dort (Szenario 3)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.dateiAnsehen('lang.txt');
    await einklappen.fokusAufDateizeile('lang.txt');

    await einklappen.tasteB();
    await einklappen.eingeklappt();
    await einklappen.fokusAufKnopf();
    await einklappen.seitenleisteVerborgen();

    await einklappen.tasteB();
    await einklappen.ausgeklappt();
    await einklappen.fokusAufKnopf();
    await einklappen.seitenleisteSichtbar();

    // Derselbe Weg mit der Maus: der Fokus stand in der Liste (die Wahl per Klick setzt ihn auf die Zeile), der Klick auf den
    // Knopf nimmt ihn mit.
    await einklappen.dateiAnsehen('lang.txt');
    await einklappen.fokusAufDateizeile('lang.txt');
    await einklappen.knopfBetatigen();
    await einklappen.eingeklappt();
    await einklappen.fokusAufKnopf();
  });

  test('der Fokus auf dem Trennzug geht beim Einklappen auf den Knopf (B1)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.fokussiereTrenner();
    await einklappen.tasteB();
    await einklappen.eingeklappt();
    await einklappen.fokusAufKnopf();

    const reihe = await einklappen.tabReihe(1);
    expect(reihe[0].inKopf, 'kein Feld im Kopf nach dem Knopf').toBe(false);
    expect(reihe[0].inDiff, 'der nächste Stopp liegt im Diff').toBe(true);
  });

  test('die eingeklappten Listenelemente sind nicht im Tab-Weg; die Reihenfolge bleibt Kopf → Knopf → Diff → Statuszeile (Szenario 3)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.dateiAnsehen('lang.txt');
    await einklappen.knopfBetatigen();

    await einklappen.tabVomKopf();
    await einklappen.fokusAufKnopf();

    const reihe = await einklappen.tabReihe(12);
    expect(reihe.filter(stopp => stopp.inLeiste), 'kein Tab-Stopp in der eingeklappten Liste').toEqual([]);
    expect(reihe[0].imStreifen, 'nach dem Kopf kommt der Streifen mit dem Knopf').toBe(false);
    expect(reihe.some(stopp => stopp.inDiff), 'der Diff-Bereich folgt dem Knopf').toBe(true);
    expect(reihe.some(stopp => stopp.rollbereich), 'der Diff-Rollbereich bleibt ein Tab-Stopp').toBe(true);
    expect(reihe.some(stopp => stopp.inKopf), 'der Kopf liegt davor').toBe(false);
  });

  test('die Taste `u` und j/k wirken eingeklappt: der Diff wechselt zur nächsten ungeprüften Stelle und beginnt oben (Szenario 4)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteVerborgen();

    await einklappen.druecke('u');
    await einklappen.diffZeigt('src/a.txt');
    await einklappen.diffOben();
    await einklappen.seitenleisteVerborgen();

    await einklappen.druecke('u');
    await einklappen.diffZeigt('src/b.txt');
    await einklappen.seitenleisteVerborgen();

    await einklappen.druecke('j');
    await einklappen.gewaehlt('README.md');
    await einklappen.seitenleisteVerborgen();
  });

  test('„Erste ungeprüfte öffnen“ im leeren Diff-Bereich ist eingeklappt bedienbar (Kriterium 4)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteVerborgen();

    await einklappen.ersteUngepruefteOeffnen();

    await einklappen.diffZeigt('src/a.txt');
    await einklappen.seitenleisteVerborgen();
    await einklappen.eingeklappt();
  });

  test('sind alle Lesbaren abgehakt, bleibt der Diff stehen und die Meldung aus R00028 erscheint (Szenario 4)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await einklappen.knopfBetatigen();
    await einklappen.druecke('u');
    await einklappen.diffZeigt('src/a.txt');
    const pfadVorher = await einklappen.diffPfad();

    await einklappen.alleHakenSetzen();
    await einklappen.naechsteMeldung();

    await einklappen.druecke('u');
    expect(await einklappen.diffPfad(), 'der Diff bleibt bei der gewählten Stelle stehen').toBe(pfadVorher);
    await einklappen.seitenleisteVerborgen();
  });

  test('die Meldung aus R00028 ist auch eingeklappt sichtbar und angesagt (Befund S4)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteVerborgen();

    // Eingeklappt, alles abgehakt: die Meldung darf nicht in der verborgenen Leiste verschwinden.
    await einklappen.alleHakenSetzen();
    await einklappen.naechsteMeldung();
    await einklappen.meldungSichtbar('Alles abgehakt');

    // Ausgeklappt bleibt es wie bisher: die Meldung steht in der Leiste, außerhalb steht nichts.
    await einklappen.knopfBetatigen();
    await einklappen.seitenleisteSichtbar();
    await einklappen.meldungInDerLeiste('Alles abgehakt');
  });

  test('auch die übrigen Meldungen der Leiste stehen eingeklappt sichtbar (Muster-Suche zum Befund S4)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo Z', modus: 'zusammen' });
    await einklappen.knopfBetatigen();
    await einklappen.alleHakenSetzen();

    // `h` blendet alle abgehakten Dateien aus: die Leiste meldet es, der Mensch soll es auch eingeklappt sehen.
    await einklappen.druecke('h');
    await einklappen.meldungSichtbar('Alles abgehakt · Alle Dateien ausgeblendet');

    // Unter 590 px fällt der Aufbau auf eine Spalte zurück: die Leiste steht sichtbar, die Meldung bleibt in ihr.
    await einklappen.fensterSetzen({ width: 560, height: 800 });
    await einklappen.seitenleisteSichtbar();
    await einklappen.meldungInDerLeiste('Alles abgehakt');

    // Wieder zweispaltig: die Leiste ist weiterhin eingeklappt, die Meldung steht wieder draußen.
    await einklappen.fensterSetzen({ width: 1280, height: 800 });
    await einklappen.seitenleisteVerborgen();
    await einklappen.meldungSichtbar('Alles abgehakt · Alle Dateien ausgeblendet');
  });
});