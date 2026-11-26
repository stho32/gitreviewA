'use strict';
// Spezifikation R00040 „Dateiliste nach Gruppen“: das Ergebnis auf stdout (Kriterium 7). Die Gruppen sind eine Sicht der
// Liste; der Vertrag mit der KI bleibt unverändert — Reihenfolge der Übersicht, ohne Gruppennamen. Ebene: Integration
// (Programm, stdout) ohne Seite; der Test hält die Ausgabe Byte für Byte fest.
const { test, expect } = require('../dsl/gruppen.js');

test.describe('Ergebnis unverändert', () => {
  test('Kriterium 7: zwei Haken und eine Anmerkung in Repo G — stdout Byte für Byte wie ohne Gruppen', async ({ gruppen }) => {
    await gruppen.starten({ vorbereitung: 'Repo G', ohneSeite: true });
    await gruppen.hakenUeberSchnittstelle('g1', 'README.md');
    await gruppen.hakenUeberSchnittstelle('g1', 'src/a.txt');
    await gruppen.anmerkungAnlegen({ commit: gruppen.hash('g2'), datei: 'src/app.js', zeile: 1, text: 'Bitte die Tests nachziehen' });

    await gruppen.beendenAnfordern();
    const exitCode = await gruppen.aufEnde();

    const g1 = gruppen.hash('g1');
    const g2 = gruppen.hash('g2');
    const erwartet = [
      '# Ergebnis manueller Review', '',
      'Anmerkungen: 1', '',
      '## 1. src/app.js:1', '', `Commit: ${g2}`, '', '> Bitte die Tests nachziehen', '',
      '## Dateien', '',
      'Abgehakt: 2 von 10', '',
      `- README.md (Commit ${g1})`,
      `- src/a.txt (Commit ${g1})`, '',
      'Ungeprüft: 8 von 10', '',
      `- docs/api.md (Commit ${g1})`,
      `- src/Contest.cs (Commit ${g1})`,
      `- src/app.js (Commit ${g1})`,
      `- tests/README.md (Commit ${g1})`,
      `- tests/app.test.js (Commit ${g1})`,
      `- web/haken-werte.spec.js (Commit ${g1})`,
      `- docs/api.md (Commit ${g2})`,
      `- src/app.js (Commit ${g2})`, '',
    ].join('\n');

    expect(exitCode).toBe(0);
    expect(gruppen.ergebnis()).toBe(erwartet);
    // Keine Gruppennamen und keine Gruppenköpfe im Ergebnis (die Sicht bleibt in der Oberfläche).
    expect(gruppen.ergebnis()).not.toMatch(/^(Code|Tests|Doku)\b/m);
    // Das Gruppieren ist rein Browser: nichts darüber auf stderr (NFA Logging).
    expect(gruppen.stderr()).not.toMatch(/^(Code|Tests|Doku)\b/m);
  });
});
