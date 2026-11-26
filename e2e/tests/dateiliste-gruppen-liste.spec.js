'use strict';
// Spezifikation R00040 „Dateiliste nach Gruppen“: Liste, Gruppenköpfe und Fortschritt je Gruppe (Kriterien 2 bis 5).
// Ebene: Integration der Oberfläche gegen das laufende Programm (Repo G aus der User Story); die Regel und die Zähler selbst
// prüfen die Bausteintests e2e/tests/bausteine/gruppen-werte.spec.js. Die Navigation prüft
// dateiliste-gruppen-navigation.spec.js, das Ergebnis dateiliste-gruppen-ergebnis.spec.js.
const { test, expect } = require('../dsl/gruppen.js');

const datei = (name, tiefe = 0) => ({ art: 'datei', name, tiefe });
const ordner = (name, tiefe = 0) => ({ art: 'ordner', name, tiefe });

/** Die acht Dateien von Repo G (g1 g2) in der gezeigten Reihenfolge: Code, Tests, Doku. */
const REPO_G_GRUPPEN = [
  { name: 'Code', zaehler: '0 von 3 abgehakt', eintraege: [datei('src/Contest.cs'), datei('src/a.txt'), datei('src/app.js')] },
  { name: 'Tests', zaehler: '0 von 3 abgehakt', eintraege: [datei('tests/README.md'), datei('tests/app.test.js'), datei('web/haken-werte.spec.js')] },
  { name: 'Doku', zaehler: '0 von 2 abgehakt', eintraege: [datei('README.md'), datei('docs/api.md')] },
];

test.describe('Liste und Fortschritt in „Zusammen“', () => {
  test('Kriterium 2: drei Gruppen mit Fortschritt, die Summe ist der Kopf', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });
    await gruppen.ueberschriften();

    await gruppen.gruppenPruefen(REPO_G_GRUPPEN);
    await gruppen.fortschritt('0 von 8 Dateien abgehakt');

    await gruppen.abhaken('src/app.js');
    await gruppen.abhaken('tests/app.test.js');

    await gruppen.gruppenKoepfePruefen([
      { name: 'Code', zaehler: '1 von 3 abgehakt' },
      { name: 'Tests', zaehler: '1 von 3 abgehakt' },
      { name: 'Doku', zaehler: '0 von 2 abgehakt' },
    ]);
    await gruppen.fortschritt('2 von 8 Dateien abgehakt');
    await gruppen.dateizeilenReihe([
      'src/Contest.cs', 'src/a.txt', 'src/app.js', 'tests/README.md', 'tests/app.test.js', 'web/haken-werte.spec.js', 'README.md', 'docs/api.md',
    ]);
  });

  test('Kriterium 2: der Zähler folgt jedem Haken ohne Neuladen (Positivkontrolle des Neuzeichnens)', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });

    await gruppen.abhaken('docs/api.md');
    await gruppen.gruppenKoepfePruefen([
      { name: 'Code', zaehler: '0 von 3 abgehakt' },
      { name: 'Tests', zaehler: '0 von 3 abgehakt' },
      { name: 'Doku', zaehler: '1 von 2 abgehakt' },
    ]);

    await gruppen.abhaken('docs/api.md');
    await gruppen.gruppenKoepfePruefen([
      { name: 'Code', zaehler: '0 von 3 abgehakt' },
      { name: 'Tests', zaehler: '0 von 3 abgehakt' },
      { name: 'Doku', zaehler: '0 von 2 abgehakt' },
    ]);
    await gruppen.fortschritt('0 von 8 Dateien abgehakt');
  });
});

test.describe('Einzeln zählt die Stellen des gewählten Commits', () => {
  test('Kriterium 3: nur die betroffenen Gruppen, die Summe ist der Zähler des Commits', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G', modus: 'einzeln' });
    await gruppen.commitAnsehen('g2');

    await gruppen.gruppenPruefen([
      { name: 'Code', zaehler: '0 von 1 abgehakt', eintraege: [datei('src/app.js')] },
      { name: 'Doku', zaehler: '0 von 1 abgehakt', eintraege: [datei('docs/api.md')] },
    ]);
    await gruppen.gruppenKoepfePruefen([
      { name: 'Code', zaehler: '0 von 1 abgehakt' },
      { name: 'Doku', zaehler: '0 von 1 abgehakt' },
    ]);

    // Die Summe der Gruppen (1 + 1 = 2) ist der Zähler von `g2` im Commit-Wähler; `g1` bleibt bei seinen acht Stellen.
    await gruppen.waehlerMenue([
      `1/2 · ${gruppen.kurz('g1')} · Anlegen · 0 von 8`,
      `2/2 · ${gruppen.kurz('g2')} · Ändern · 0 von 2`,
    ]);

    await gruppen.abhaken('src/app.js');
    await gruppen.gruppenKoepfePruefen([
      { name: 'Code', zaehler: '1 von 1 abgehakt' },
      { name: 'Doku', zaehler: '0 von 1 abgehakt' },
    ]);
    await gruppen.waehlerMenue([
      `1/2 · ${gruppen.kurz('g1')} · Anlegen · 0 von 8`,
      `2/2 · ${gruppen.kurz('g2')} · Ändern · 1 von 2`,
    ]);
  });
});

test.describe('Ausblenden lässt die Zähler stehen', () => {
  test('Kriterium 4: Muster ausblenden, Abgehakte ausblenden, Baum — je Gruppe ein eigener Baum', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });

    // Muster `docs/**`: `docs/api.md` fehlt, zählt aber in der Gruppe Doku weiter (0 von 2).
    await gruppen.musterEingeben('docs/**');
    await gruppen.dateizeilenReihe([
      'src/Contest.cs', 'src/a.txt', 'src/app.js', 'tests/README.md', 'tests/app.test.js', 'web/haken-werte.spec.js', 'README.md',
    ]);
    await gruppen.gruppenKoepfePruefen([
      { name: 'Code', zaehler: '0 von 3 abgehakt' },
      { name: 'Tests', zaehler: '0 von 3 abgehakt' },
      { name: 'Doku', zaehler: '0 von 2 abgehakt' },
    ]);

    // „Abgehakte ausblenden“ an, Baum: abgehakte Dateien verschwinden aus ihrer Gruppe, die Zähler bleiben.
    await gruppen.schalterBetatigen();
    await gruppen.darstellung('baum');
    await gruppen.abhaken('README.md');

    await gruppen.gruppenPruefen([
      {
        name: 'Code', zaehler: '0 von 3 abgehakt',
        eintraege: [ordner('src'), datei('a.txt', 1), datei('app.js', 1), datei('Contest.cs', 1)],
      },
      {
        name: 'Tests', zaehler: '0 von 3 abgehakt',
        eintraege: [ordner('tests'), datei('app.test.js', 1), datei('README.md', 1), ordner('web'), datei('haken-werte.spec.js', 1)],
      },
    ]);
    await gruppen.fortschritt('1 von 8 Dateien abgehakt');
  });

  test('Kriterium 4: eine Gruppe, deren Einträge alle ausgeblendet sind, hat keinen Kopf', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G' });

    await gruppen.schalterBetatigen();
    await gruppen.musterEingeben('docs/**');
    await gruppen.abhaken('README.md');

    await gruppen.gruppenNamenPruefen(['Code', 'Tests']);
    await gruppen.keineGruppeMitNamen('Doku');
  });

  test('Kriterium 4: alle ausgeblendet — der Leerfall-Hinweis bleibt (R00029)', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G', zusatz: ['--ignore', '*'] });

    await gruppen.dateilistenMeldung('Alle Dateien ausgeblendet');
    await gruppen.keineGruppen();
  });
});

test.describe('Gesperrte Stellen je Gruppe', () => {
  test('Kriterium 5: jede Gruppe mit gesperrten Dateien nennt „ (k nicht lesbar)“, die Summe ist das k im Kopf', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo N mit v' });

    const kopf = await gruppen.fortschrittLesen();
    const kImKopf = Number((/\((\d+) nicht lesbar\)/.exec(kopf) || [0, 0])[1]);
    const koepfe = await gruppen.gruppenKoepfeLesen();
    const gesperrtJeGruppe = await gruppen.gesperrteJeGruppe();
    const kDerGruppe = text => Number((/\((\d+) nicht lesbar\)/.exec(text) || [0, 0])[1]);

    expect(kImKopf, `k im Kopf („${kopf}“)`).toBeGreaterThan(0);
    expect(koepfe.length, 'es stehen Gruppenköpfe').toBeGreaterThan(0);
    for (const [stelle, kopfEintrag] of koepfe.entries()) {
      expect(kDerGruppe(kopfEintrag.zaehler), `${kopfEintrag.name}: Zusatz passt zu den gesperrten Zeilen der Gruppe`).toBe(gesperrtJeGruppe[stelle].gesperrt);
    }
    expect(koepfe.reduce((summeBisher, eintrag) => summeBisher + kDerGruppe(eintrag.zaehler), 0), 'Summe der k').toBe(kImKopf);
  });
});
