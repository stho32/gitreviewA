'use strict';
// Spezifikation R00032 „Umbruch standardmäßig an“: der Startzustand (Kriterien 1 und 2). Browser-Eigenes (Darstellung, Tastatur,
// Neuladen), die übrigen Kriterien und die Leistungsprobe folgen in eigenen Abschnitten. Die Werte des Umschalters prüft
// bausteine/umbruch-werte.spec.js.
const { test } = require('../dsl/diff-lesen.js');

const LANGE_ZEILE = '0123456789'.repeat(30);

test.describe('Startzustand (R00032)', () => {
  test('Kriterium 1: ohne gewählte Datei steht der Umschalter „an“; die lange Zeile ist umbrochen und der Bereich scrollt nicht waagerecht', async ({ diff }) => {
    await diff.starten();

    await diff.umbruchIst('an');

    await diff.dateiAnsehen('breit.txt');
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
  });

  test('Kriterium 2: der Umschalter bleibt bedienbar — auf „aus“ einzeilig mit waagerechtem Scrollen, wieder auf „an“ umbrochen, Text unverändert', async ({ diff }) => {
    await diff.starten();
    await diff.dateiAnsehen('breit.txt');

    await diff.umbruchUmschalten();
    await diff.langeZeileEinzeilig(2, LANGE_ZEILE);

    await diff.umbruchUmschalten();
    await diff.langeZeileUmbrochen(2, LANGE_ZEILE);
  });
});
