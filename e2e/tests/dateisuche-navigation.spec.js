'use strict';
// Spezifikation R00049 „Dateiliste durchsuchen“, Teil Navigation (B4505, Kriterium 6): die Liste führt die Tasten — `j`/`k`,
// `u` und „Nächste ungeprüfte“ springen nie auf eine nicht passende Datei, und die ausgeblendete gewählte Datei bleibt
// gewählt mit ihrem Diff. Ebene: Oberfläche gegen das laufende Programm (Repo P); die Tastatur selbst ist Browser-Eigenes
// (ein Fall Playwright).
const { test, expect } = require('../dsl/dateisuche.js');
const naechsteSeite = require('../treiber/naechste-oberflaeche.js');

test.describe('Navigation folgt der gezeigten Liste (B4505)', () => {
  test('soll j nur über die passenden Dateien führen (Kriterium 6)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.suchen('app');
    await dateisuche.aufZeilen(3);
    await dateisuche.dateiAnsehen('src/app.js');
    await dateisuche.gewaehlt('src/app.js');

    await dateisuche.druecke('j');
    await dateisuche.gewaehlt('src/data/app.sql');
    await dateisuche.druecke('j');
    await dateisuche.gewaehlt('tests/app.test.js');
    await dateisuche.druecke('j');
    await dateisuche.gewaehlt('src/app.js');
  });

  test('soll „Nächste ungeprüfte“ sperren und die verdeckten offenen Dateien nennen (Kriterium 6)', async ({ dateisuche, page }) => {
    await dateisuche.starten();
    await dateisuche.suchen('app');
    await dateisuche.aufZeilen(3);

    await dateisuche.abhaken('src/app.js');
    await dateisuche.abhaken('src/data/app.sql');
    await dateisuche.abhaken('tests/app.test.js');

    await naechsteSeite.pruefeKnopfNichtBedienbar(page);
    await naechsteSeite.pruefeMeldung(page, 'Alles Sichtbare abgehakt, 5 ausgeblendet');
  });

  test('soll eine gewählte Datei stehen lassen, die die Suche verdeckt, und den Hinweis zeigen (Kriterium 6)', async ({ dateisuche }) => {
    await dateisuche.starten();
    await dateisuche.dateiAnsehen('docs/api.md');
    await dateisuche.gewaehlt('docs/api.md');
    await dateisuche.hinweis('');

    await dateisuche.suchen('app');
    await dateisuche.aufZeilen(3);

    expect(await dateisuche.diffPfad()).toBe('docs/api.md');
    await dateisuche.hinweis('Die gewählte Datei ist ausgeblendet');

    await dateisuche.feldLeeren();
    await dateisuche.aufZeilen(8);
    await dateisuche.gewaehlt('docs/api.md');
    await dateisuche.hinweis('');
  });
});
