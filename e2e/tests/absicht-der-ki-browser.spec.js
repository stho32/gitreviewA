'use strict';
// Browser-Eigenes der Absicht der KI über dem Diff (R00038, B3704): DOM-Sicherheit von Rumpf und Betreff, das Stehenbleiben
// des Blocks beim Umschalten mit gezählten Anfragen und die Darstellung bei 320 px Diff-Breite (590 × 800).
// Ebene: Playwright — nur im Browser prüfbar (DOM, Darstellung), nicht der Hot Path.
const { test, expect } = require('../dsl/absicht.js');

const LANGER_BETREFF = `Schritt 2 ${'x'.repeat(390)}`;

test.describe('Absicht der KI: DOM-Sicherheit', () => {
  test('Kriterium 5: der Rumpf bleibt Text — spitze Klammern, Marken der einen Zeichenklasse, kein Element, kein Dialog', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M' });

    await absicht.dateiAnsehen('x.txt');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);

    expect(await absicht.rumpfStehtImDom('m4'), 'Rumpf vor dem Aufklappen im DOM').toBe(0);

    await absicht.nachrichtAufklappen('m4');

    await absicht.nachrichtIst('m4', true);
    expect(await absicht.rumpf('m4')).toBe('<b>fett</b> <img src=x onerror=alert(1)>\na⟨U+202E⟩b⟨U+200B⟩c⟨U+E0041⟩d');
    expect(await absicht.fremdElementeImBlock(), 'kein Element aus fremdem Text').toBe(0);
    await absicht.keineDialoge();
  });

  test('Kriterium 5: der Betreff von m2 (400 Zeichen) steht in einer Zeile mit „…“ und ganz in `title`', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M' });

    await absicht.dateiAnsehen('x.txt');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);

    const lang = await absicht.betreffmass('m2');
    const kurz = await absicht.betreffmass('m1');
    expect(lang.whiteSpace, 'kein Umbruch').toBe('nowrap');
    expect(lang.textOverflow, 'sichtbare Kürzung').toBe('ellipsis');
    expect(lang.ueberlaeuft, 'der lange Betreff wird gekürzt').toBe(true);
    expect(lang.hoehe, 'eine Zeile hoch wie der kurze Betreff').toBeLessThanOrEqual(kurz.hoehe * 1.5);
    expect(await absicht.betreffTitel('m2')).toBe(LANGER_BETREFF);
    expect(await absicht.betreffTitel('m2')).toHaveLength(400);
  });

  test('ohne Rumpf gibt es keinen Knopf „Nachricht“', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M' });

    await absicht.dateiAnsehen('x.txt');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);

    expect(await absicht.nachrichtKnopfAnzahl('m1'), 'm1 ohne Rumpf').toBe(0);
    expect(await absicht.nachrichtKnopfAnzahl('m4'), 'm4 mit Rumpf').toBe(1);
  });
});

test.describe('Absicht der KI: Stehenbleiben beim Umschalten', () => {
  test('Kriterium 6: Umschalten und Suchen lassen den Block und die offene Nachricht stehen, ohne Anfrage', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M' });
    await absicht.dateiAnsehen('x.txt');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);
    await absicht.nachrichtAufklappen('m4');
    await absicht.nachrichtIst('m4', true);
    await absicht.bildlaufSetzen(120);
    const anfragen = absicht.anfragenSammeln();
    const vorher = anfragen.length;

    await absicht.ansichtWaehlen('ganze Datei');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);
    await absicht.nachrichtIst('m4', true);

    await absicht.anordnungWaehlen('nebeneinander');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);
    await absicht.nachrichtIst('m4', true);

    await absicht.umbruchUmschalten();
    await absicht.leerraumUmschalten();
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);
    await absicht.nachrichtIst('m4', true);

    await absicht.suchen('m3');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);
    await absicht.nachrichtIst('m4', true);

    expect(anfragen.slice(vorher).filter(pfad => pfad === '/api/commits' || pfad === '/api/zusammen'), 'der Block löst keine Anfrage aus').toEqual([]);

    await absicht.bildlaufSetzen(0);
    await absicht.blockStehtUeberDerErstenZeile();
  });

  test('Kriterium 6: in „Einzeln“ bleibt der Block beim Aufklappen der Lücke; nach Dateiwechsel und zurück ist die Nachricht zu', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M', commits: ['m6'], modus: 'einzeln' });

    await absicht.dateiAnsehen('x.txt');
    await absicht.blockZeigt(['m6']);
    await absicht.nachrichtAufklappen('m6');
    await absicht.nachrichtIst('m6', true);

    await absicht.lueckeAufklappen(1);

    await absicht.blockZeigt(['m6']);
    await absicht.nachrichtIst('m6', true);

    await absicht.dateiAnsehen('bild.bin');
    await absicht.blockZeigt(['m6']);

    await absicht.dateiAnsehen('x.txt');

    await absicht.blockZeigt(['m6']);
    await absicht.nachrichtIst('m6', false);
  });
});

test.describe('Absicht der KI: schmaler Diff (590 × 800)', () => {
  test('Kriterium 8: jede Blockzeile einzeilig, die erste Diff-Zeile sichtbar, der Block wächst nur im Rollbereich', async ({ absicht }) => {
    await absicht.starten({ vorbereitung: 'Repo M', fenster: { width: 590, height: 800 } });

    await absicht.dateiAnsehen('x.txt');
    await absicht.blockZeigt(['m1', 'm2', 'm3', 'm4', 'm5']);

    const zeilen = await absicht.zeilenmasse();
    expect(zeilen, 'fünf Commits und die Zeile „1 weitere“').toHaveLength(6);
    const betreffshoehen = zeilen.filter(zeile => zeile.betreffHoehe !== null).map(zeile => zeile.betreffHoehe);
    expect(Math.max(...betreffshoehen), 'jeder Betreff einzeilig').toBeLessThan(Math.min(...betreffshoehen) * 1.5);

    expect(await absicht.ersteDiffzeileSichtbar(), 'erste Diff-Zeile ohne Bildlauf sichtbar').toBe(true);

    const vorher = await absicht.masse();

    await absicht.weitereAufklappen();
    await absicht.nachrichtAufklappen('m4');
    await absicht.nachrichtIst('m4', true);

    const nachher = await absicht.masse();
    expect(nachher.kopfHoehe, 'Höhe des Diff-Kopfs').toBe(vorher.kopfHoehe);
    expect(nachher.rollHoehe, 'Höhe des Rollbereichs').toBe(vorher.rollHoehe);
    expect(nachher.blockHoehe, 'der Block wächst').toBeGreaterThan(vorher.blockHoehe);
  });
});
