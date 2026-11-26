'use strict';
// Spezifikation R00049 „Dateiliste durchsuchen“, Teil Zustand, Tastatur, Ergebnis und Grenzen (B4507, Kriterien 8, 10 und
// 11): der Suchtext bleibt beim Wechsel von Datei, Commit, Modus und Darstellung, wirkt auch bei eingeklappter Seitenleiste
// und ist nach dem Neuladen leer; das Ergebnis auf stdout kennt die Suche nicht (Byte für Byte wie ohne Suche); das
// Eintippen erzeugt keine Serveranfrage und keinen git-Aufruf; über dem Aufwandsbudget bricht der Lauf ab, meldet am Feld
// und lässt die Liste stehen. Ebene: Playwright (Neuladen, Einklappen, Tastatur, stdout-Vergleich) und Integration.
const { test, expect } = require('../dsl/dateisuche.js');

const SQL_DATEIEN = ['db/001_anlegen.sql', 'db/002_aendern.sql', 'src/data/app.sql'];

test.describe('Zustand, Tastatur, Ergebnis und Grenzen (B4507)', () => {
  test('soll den Suchtext über Datei-, Commit-, Modus- und Darstellungswechsel halten (Kriterium 8)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);

    await dateisuche.dateiAnsehen('src/data/app.sql');
    expect(await dateisuche.feldInhalt()).toBe('*.sql');
    expect(await dateisuche.dateinamen()).toEqual(SQL_DATEIEN);

    await dateisuche.darstellung('baum');
    expect(await dateisuche.feldInhalt()).toBe('*.sql');
    expect(await dateisuche.dateinamen()).toEqual(['001_anlegen.sql', '002_aendern.sql', 'app.sql']);

    await dateisuche.modusWaehlen('einzeln');
    await dateisuche.darstellung('flach');
    await dateisuche.commitAnsehen('p2');
    await dateisuche.aufZeilen(1);
    expect(await dateisuche.feldInhalt()).toBe('*.sql');
    expect(await dateisuche.dateinamen()).toEqual(['db/002_aendern.sql']);

    await dateisuche.commitAnsehen('p1');
    await dateisuche.aufZeilen(3);
    expect(await dateisuche.feldInhalt()).toBe('*.sql');
    await dateisuche.zaehler('5 ausgeblendet, davon 5 Suche');
  });

  test('soll bei eingeklappter Seitenleiste den Zähler zeigen und die Tasten bei den Treffern halten (Kriterium 8)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);
    await dateisuche.dateiAnsehen('db/001_anlegen.sql');
    await dateisuche.gewaehlt('db/001_anlegen.sql');

    await dateisuche.einklappen();
    await dateisuche.eingeklappt();
    await dateisuche.seitenleisteVerborgen();

    await dateisuche.zaehler('5 ausgeblendet, davon 5 Suche');
    await dateisuche.druecke('j');
    await dateisuche.gewaehlt('db/002_aendern.sql');
    await dateisuche.druecke('j');
    await dateisuche.gewaehlt('src/data/app.sql');
  });

  test('soll nach dem Neuladen ein leeres Feld und die ganze Liste zeigen (Kriterium 8)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);

    await dateisuche.neuLaden();

    await dateisuche.aufZeilen(8);
    expect(await dateisuche.feldInhalt()).toBe('');
    await dateisuche.zaehler('');
  });

  test('soll das Ergebnis auf stdout nicht kennen (Kriterium 10)', async ({ dateisuche }) => {
    await dateisuche.starten({ commits: ['p1'] });
    await dateisuche.abhaken('README.md');
    await dateisuche.fortschritt('1 von 8 Dateien abgehakt');
    const ohneSuche = await dateisuche.beendenUndErgebnisLesen();

    await dateisuche.starten({ commits: ['p1'] });
    await dateisuche.abhaken('README.md');
    await dateisuche.fortschritt('1 von 8 Dateien abgehakt');
    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);
    const mitSuche = await dateisuche.beendenUndErgebnisLesen();

    expect(mitSuche.exitCode).toBe(0);
    expect(mitSuche.ergebnis).toBe(ohneSuche.ergebnis);
    expect(mitSuche.ergebnis).toContain('Abgehakt: 1 von 8');
    expect(mitSuche.ergebnis).toContain('Ungeprüft: 7 von 8');
    expect(mitSuche.ergebnis).toContain(`docs/api.md (Commit ${dateisuche.hash('p1')})`);
  });

  test('soll beim Eintippen keine Serveranfrage und keinen git-Aufruf erzeugen (Kriterium 11)', async ({ dateisuche }) => {
    await dateisuche.starten({ zaehlen: true });
    const gitVorher = dateisuche.gitAufrufe().length;
    const stderrVorher = dateisuche.stderr();
    const anfragenZaehlen = dateisuche.anfragenZaehlen();
    const anfragenVorher = anfragenZaehlen();

    await dateisuche.suchen('*.sql');
    await dateisuche.aufZeilen(3);
    await dateisuche.feldLeeren();
    await dateisuche.aufZeilen(8);

    expect(anfragenZaehlen(), 'Serveranfragen beim Tippen').toBe(anfragenVorher);
    expect(dateisuche.gitAufrufe().length, 'git-Aufrufe beim Tippen').toBe(gitVorher);
    expect(dateisuche.stderr(), 'stderr beim Tippen').toBe(stderrVorher);
  });

  test('soll über dem Aufwandsbudget abbrechen, melden und die Liste stehen lassen (Kriterium 11)', async ({ dateisuche }) => {
    await dateisuche.starten({ vorbereitung: 'Groß' });
    await dateisuche.suchen('*.txt');
    await dateisuche.aufZeilen(2000);

    const beginn = Date.now();
    await dateisuche.suchen('?'.repeat(200));
    const dauerMs = await dateisuche.zeitBisSuchmeldung('Suche zu aufwendig — Text kürzen', beginn);

    expect(dauerMs, `Abbruch nach ${dauerMs} ms`).toBeLessThanOrEqual(2000);
    expect(await dateisuche.dateinamen()).toHaveLength(2000);
    await dateisuche.zaehler('1 ausgeblendet, davon 1 Suche');
  });

});
