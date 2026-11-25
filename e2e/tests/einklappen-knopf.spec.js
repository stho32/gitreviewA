'use strict';
// Spezifikation R00035 „Seitenleiste ein- und ausklappen“ (I0036, B3402): der Knopf am Trenner — Rolle, Name, `aria-expanded`,
// `aria-controls`, sichtbare Pfeilrichtung, Kataloghinweis `b` (`aria-keyshortcuts` und `<kbd>`) und die Hilfe aus derselben
// Quelle; per Tab erreichbar mit sichtbarem Fokusring; `b` wirkt nur außerhalb von Textfeldern. Browser-Eigenes (Darstellung,
// Name, Fokus, Tastendruck); Vorbereitung Repo S, Fenster 1280 × 800.
const { test, expect } = require('../dsl/einklappen.js');

test.describe('Ausklapp-Knopf (B3402)', () => {
  test('trägt Namen, Zustand, Pfeilrichtung und den Hinweis `b`; die Hilfe nennt `b` aus derselben Quelle (Szenario 7)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.knopfPruefen({ eingeklappt: false });
    await einklappen.knopfAnDerGrenze();

    await einklappen.knopfBetatigen();
    await einklappen.knopfPruefen({ eingeklappt: true });

    await einklappen.hilfeOeffnen();
    const eintraege = (await einklappen.hilfeEintraege()).flatMap(gruppe => gruppe.eintraege);
    const mitB = eintraege.filter(eintrag => eintrag.tasten.includes('b'));
    expect(mitB, '`b` steht genau einmal in der Hilfe').toHaveLength(1);
    expect(mitB[0].text).toBe('Seitenleiste ein-/ausklappen');
    expect(mitB[0].verfuegbar, 'eingeklappt bleibt die Aktion verfügbar').toBe(true);
  });

  test('betätigt mit der Taste `b` denselben Knopf (der Zustand wechselt in beide Richtungen)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.ausgeklappt();

    await einklappen.tasteB();
    await einklappen.knopfPruefen({ eingeklappt: true });

    await einklappen.tasteB();
    await einklappen.knopfPruefen({ eingeklappt: false });
  });

  test('ist per Tab erreichbar und trägt einen sichtbaren Fokusring (R00030, B2907)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.fokusVorgaengerDesTrenners();
    await einklappen.fokusAufKnopf();
    await einklappen.fokusringPruefen();
  });

  test('wirkt nur außerhalb von Textfeldern: `b` tippt im Suchfeld und klappt nicht ein (Szenario 6)', async ({ einklappen }) => {
    await einklappen.starten({ vorbereitung: 'Repo S' });
    await einklappen.sucheFokussieren();
    await einklappen.druecke('b');

    await einklappen.ausgeklappt();
    expect(await einklappen.suchfeldWert()).toBe('b');
  });
});