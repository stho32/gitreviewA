'use strict';
// R00024 Bild vorher/nachher — nur Browser-Eigenes: das sichtbare Bild, die Anordnung, „neu“/„gelöscht“, „zu groß“, die
// verworfene späte Antwort und die DOM-Sicherheit. Die Endpunkt-Bytes kommen als Fake (der echte Endpunkt ist in B2306/B2308 geprüft).
const { test, expect } = require('../dsl/diff-lesen.js');
const oberflaeche = require('../treiber/diff-oberflaeche.js');

const PNG_1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_2 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** Die je Seite angefragten Fassungen ohne Doppelte: der Bereich fragt jede Seite einmal zum Messen und einmal als `img`-Quelle. */
function seitenAnfragen(anfragen) {
  return [...new Set(anfragen.map(anfrage => anfrage.seite))];
}

test.describe('Bild vorher/nachher (R00024)', () => {
  test('soll zwei Bilder mit Beschriftung, Dateiname und Größe zeigen und nur `img` im Bildbereich', async ({ diff, page }) => {
    await diff.starten();
    await oberflaeche.diffAntwortErsetzen(page, { pfad: 'logo.bin', art: 'binaer', dateiStatus: 'M', patch: '' });
    await oberflaeche.bildAntwortErsetzen(page, { pfad: 'logo.bin', seite: 'vorher', base64: PNG_1 });
    await oberflaeche.bildAntwortErsetzen(page, { pfad: 'logo.bin', seite: 'nachher', base64: PNG_2 });

    await diff.dateiAnsehen('logo.bin');

    const bilder = await oberflaeche.bilderLesen(page);
    expect(bilder).toHaveLength(2);
    expect(bilder.map(bild => bild.beschriftung)).toEqual(['vorher · logo.bin · 70 Byte', 'nachher · logo.bin · 68 Byte']);
    expect(bilder.every(bild => bild.naturbreite > 0), 'beide Bilder geladen').toBe(true);
    expect(bilder[0].src).not.toBe(bilder[1].src);
    expect(await oberflaeche.bildTitel(page)).toBe('logo.bin');
    await oberflaeche.pruefeNurImgImBildbereich(page);
  });

  test('soll bei einer neuen Datei nur „nachher“ mit „neu“ zeigen und „vorher“ gar nicht anfragen', async ({ diff, page }) => {
    await diff.starten();
    await oberflaeche.diffAntwortErsetzen(page, { pfad: 'logo.bin', art: 'binaer', dateiStatus: 'A', patch: '' });
    const anfragen = await oberflaeche.bildAnfragenBeobachten(page);
    await oberflaeche.bildAntwortErsetzen(page, { pfad: 'logo.bin', seite: 'nachher', base64: PNG_1 });

    await diff.dateiAnsehen('logo.bin');

    const bilder = await oberflaeche.bilderLesen(page);
    expect(seitenAnfragen(anfragen)).toEqual(['nachher']);
    expect(bilder).toHaveLength(1);
    expect(bilder[0].beschriftung).toBe('nachher · neu · logo.bin · 70 Byte');
  });

  test('soll bei einer gelöschten Datei nur „vorher“ mit „gelöscht“ zeigen', async ({ diff, page }) => {
    await diff.starten();
    await oberflaeche.diffAntwortErsetzen(page, { pfad: 'logo.bin', art: 'binaer', dateiStatus: 'D', patch: '' });
    const anfragen = await oberflaeche.bildAnfragenBeobachten(page);
    await oberflaeche.bildAntwortErsetzen(page, { pfad: 'logo.bin', seite: 'vorher', base64: PNG_1 });

    await diff.dateiAnsehen('logo.bin');

    const bilder = await oberflaeche.bilderLesen(page);
    expect(seitenAnfragen(anfragen)).toEqual(['vorher']);
    expect(bilder[0].beschriftung).toBe('vorher · gelöscht · logo.bin · 70 Byte');
  });

  test('soll über der Grenze „zu groß“ mit der Grenze und kein Bild zeigen', async ({ diff, page }) => {
    await diff.starten();
    await oberflaeche.diffAntwortErsetzen(page, { pfad: 'logo.bin', art: 'binaer', dateiStatus: 'A', patch: '' });
    await oberflaeche.bildAntwortErsetzen(page, {
      pfad: 'logo.bin',
      seite: 'nachher',
      status: 413,
      koerper: { meldung: 'Bild zu groß — die Ausgabe von git überschreitet die Grenze von 100 Byte' },
    });

    await diff.dateiAnsehen('logo.bin');

    await expect(page.locator('#diff .diff-meldung')).toHaveText('Bild zu groß — die Ausgabe von git überschreitet die Grenze von 100 Byte');
    await expect(page.locator('#diff .bild-paar')).toHaveCount(0);
    await expect(page.locator('#diff .bild-paar img')).toHaveCount(0);
  });

  test('soll die späte Antwort einer früheren Wahl verwerfen', async ({ diff, page }) => {
    await diff.starten();
    await oberflaeche.diffAntwortErsetzen(page, { pfad: 'logo.bin', art: 'binaer', dateiStatus: 'A', patch: '' });
    const spaete = await oberflaeche.bildAntwortErsetzen(page, { pfad: 'logo.bin', seite: 'nachher', base64: PNG_1, verzoegerungMs: 1500 });

    await diff.dateiAnsehen('logo.bin');
    await diff.dateiAnsehen('src/b.txt');
    await spaete.eingetroffen();

    await expect(page.locator('#diff .bild-paar')).toHaveCount(0);
    await expect(page.locator('#diff .diff-pfad')).toHaveText('src/b.txt');
    await expect(page.locator('#diff .dz tr[data-art]').first()).toBeVisible();
  });
});
