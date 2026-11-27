'use strict';
// Bausteintests (ohne Browser) der reinen Anzeigefunktionen der Commit-Leiste.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test, expect } = require('@playwright/test');
const { datumText, zeilenwerte, betreffVon } = require('../../../src/GitReviewA/web/commit-werte.js');
const { sichtbarerName } = require('../../../src/GitReviewA/web/dateiliste-werte.js');

const WEB = path.resolve(__dirname, '../../../src/GitReviewA/web');

test.describe('Baustein Commit-Werte', () => {
  test('soll das Datum als TT.MM.JJJJ HH:MM in der Ortszeit zeigen', () => {
    const ortszeitVorher = process.env.TZ;
    try {
      process.env.TZ = 'Europe/Berlin';
      expect(datumText('2026-03-05T18:30:00+01:00')).toBe('05.03.2026 18:30');
      process.env.TZ = 'UTC';
      expect(datumText('2026-03-05T18:30:00+01:00')).toBe('05.03.2026 17:30');
      process.env.TZ = 'America/New_York';
      expect(datumText('2026-01-01T03:05:00+01:00')).toBe('31.12.2025 21:05');
    } finally {
      process.env.TZ = ortszeitVorher;
    }
  });

  test('soll einen Zeitpunkt, der keiner ist, unverändert zeigen', () => {
    expect(datumText('kein Datum')).toBe('kein Datum');
  });

  test('soll ein leeres Datum als „Datum nicht lesbar“ zeigen (R00048 Kriterium 11, L2)', () => {
    expect(datumText('')).toBe('Datum nicht lesbar');

    const werte = zeilenwerte({ kurzHash: 'a1b2c3d', autor: 'NUL Name', datum: '', betreff: 'NUL im Autorkopf', rumpf: '' });

    expect(werte.datum).toBe('Datum nicht lesbar');
    expect(werte.datumHinweis).toBe('');
    expect(werte.autor).toBe('NUL Name');
    expect(werte.betreff).toBe('NUL im Autorkopf');
  });

  test('soll je Commit Kurz-Hash, Betreff, Autor, Datum mit Hinweis und Rumpf liefern', () => {
    const werte = zeilenwerte({ hash: 'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6', kurzHash: 'c3d4e5f', autor: 'Bernd', datum: 'kein Datum', betreff: 'B', rumpf: 'R' });

    expect(werte).toEqual({ kurz: 'c3d4e5f', betreff: 'B', autor: 'Bernd', datum: 'kein Datum', datumHinweis: 'kein Datum', rumpf: 'R', hatRumpf: true });
    expect(zeilenwerte({ kurzHash: 'a', autor: '', datum: '', betreff: '', rumpf: '' }).hatRumpf).toBe(false);
  });

  test('soll Steuer- und Formatzeichen als Marke zeigen statt sie zu entfernen (R00054, Kriterium 1)', () => {
    const werte = zeilenwerte({ kurzHash: 'a', autor: 'A\u202Eb\u200F', datum: '', betreff: '\u2066x\u2069\u061C', rumpf: 'r\u202D\u200E' });

    expect([werte.autor, werte.betreff, werte.rumpf]).toEqual(['A⟨U+202E⟩b⟨U+200F⟩', '⟨U+2066⟩x⟨U+2069⟩⟨U+061C⟩', 'r⟨U+202D⟩⟨U+200E⟩']);
    expect(werte.autor).not.toContain('\u202E');
  });

  test('soll den Betreff eines Commits so liefern, wie die Zeile ihn zeigt (M1: nie roh)', () => {
    const commits = [{ hash: 'abc1234', kurzHash: 'abc1234', autor: '', datum: '', betreff: 'Start \u202Eoberflaeche\u2066', rumpf: '' }];

    expect(betreffVon(commits, 'abc1234')).toBe('Start ⟨U+202E⟩oberflaeche⟨U+2066⟩');
    expect(betreffVon(commits, 'abc1234')).not.toContain('\u202E');
    expect(betreffVon(commits, 'fedcba9')).toBe('');
  });

  test('Kriterium 7: Betreff, Autor und Rumpf werden auf 20 000 Zeichen gekürzt', () => {
    const werte = zeilenwerte({
      kurzHash: 'a',
      betreff: 'B'.repeat(25000),
      autor: 'A'.repeat(25000),
      rumpf: 'r'.repeat(25000),
      datum: '2026-01-01T00:00:00Z',
    });

    expect(werte.betreff).toBe(`${'B'.repeat(20000)}… (5000 Zeichen nicht gezeigt)`);
    expect(werte.autor).toBe(`${'A'.repeat(20000)}… (5000 Zeichen nicht gezeigt)`);
    expect(werte.rumpf).toBe(`${'r'.repeat(20000)}… (5000 Zeichen nicht gezeigt)`);
  });

  test('Kriterium 5: erst kürzen, dann markieren — die Zahl n zählt das Zeichen mit, die Marke steht ganz', () => {
    const werte = zeilenwerte({
      kurzHash: 'a',
      betreff: 'B',
      autor: 'A',
      rumpf: `${'a'.repeat(19999)}\u202E${'b'.repeat(10)}`,
      datum: '2026-01-01T00:00:00Z',
    });

    expect(werte.rumpf).toBe(`${'a'.repeat(19999)}⟨U+202E⟩… (10 Zeichen nicht gezeigt)`);
    expect(werte.rumpf).not.toContain('\u202E');
  });

  test('Kriterium 7: eine Message nur aus unsichtbaren Zeichen hat einen Rumpf und zeigt die Marke', () => {
    const werte = zeilenwerte({ kurzHash: 'a', betreff: 'B', autor: 'A', rumpf: '\u202E\u202D', datum: '2026-01-01T00:00:00Z' });

    expect(werte.hatRumpf).toBe(true);
    expect(werte.rumpf).toBe('⟨U+202E⟩⟨U+202D⟩');
    expect(zeilenwerte({ kurzHash: 'a', betreff: 'B', autor: 'A', rumpf: '', datum: '' }).hatRumpf).toBe(false);
  });

  test('Kriterium 7: betreffVon kürzt den Betreff und zeigt die Marke', () => {
    const commits = [{ hash: 'a', kurzHash: 'a', betreff: `${'B'.repeat(19999)}\u202E${'b'.repeat(10)}`, rumpf: 'r' }];

    expect(betreffVon(commits, 'a')).toBe(`${'B'.repeat(19999)}⟨U+202E⟩… (10 Zeichen nicht gezeigt)`);
  });
});

/**
 * Die Module der Oberfläche so laden, wie `index.html` sie lädt: ein gemeinsames Fenster, die Reihenfolge aus dem HTML.
 * Nur so fällt auf, dass `commit-werte.js` vor `dateiliste-werte.js` steht — im Browser bricht die Leiste sonst,
 * während ein Node-Test mit `require` grün bleibt (R00054, B5401).
 */
function werteModuleImBrowserLaden() {
  const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
  const reihenfolge = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(treffer => treffer[1]);
  const fenster = {};
  fenster.window = fenster;
  const sandkasten = vm.createContext(fenster);
  for (const name of reihenfolge.filter(eintrag => eintrag.endsWith('-werte.js'))) {
    vm.runInContext(fs.readFileSync(path.join(WEB, name), 'utf8'), sandkasten, { filename: name });
  }
  return { fenster, reihenfolge };
}

test.describe('Baustein Commit-Werte — die eine Zeichenliste (R00054)', () => {
  test('B5401: commit-werte erreicht sichtbarerName und markiert trotz seiner frühen Ladeposition', () => {
    const { fenster, reihenfolge } = werteModuleImBrowserLaden();

    // Positivkontrolle: die Falle steht noch, die Ladereihenfolge ist die des Problems.
    expect(reihenfolge.indexOf('commit-werte.js')).toBeLessThan(reihenfolge.indexOf('dateiliste-werte.js'));
    expect(typeof fenster.sichtbarerName).toBe('function');
    expect(typeof fenster.gitreviewaAbsichtWerte.markiert).toBe('function');

    const werte = fenster.zeilenwerte({
      kurzHash: 'a',
      betreff: 'abc\u202Efed.exe',
      autor: 'Anna\u200BBeispiel',
      rumpf: 'a\u202Eb\nc\u200Bd',
      datum: '2026-01-01T00:00:00Z',
    });

    expect(werte.betreff).toBe('abc⟨U+202E⟩fed.exe');
    expect(werte.autor).toBe('Anna⟨U+200B⟩Beispiel');
    expect(werte.rumpf).toBe('a⟨U+202E⟩b\nc⟨U+200B⟩d');

    // Auch die Diff-Anzeige holt ihre Klasse aus demselben Modul (sonst fehlt sie ihr im Browser genauso).
    expect(fenster.sichtbarTeile('a\u202Eb')).toEqual([{ text: 'a' }, { marke: 'bidi', code: 'U+202E', text: '⟨U+202E⟩' }, { text: 'b' }]);
  });

  test('Kriterium 3: Betreff und Autor tragen für jeden Codepunkt dieselbe Marke wie sichtbarerName', () => {
    const abweichungen = [];
    let anzahl = 0;
    for (let codepunkt = 0x0000; codepunkt <= 0x10FFFF; codepunkt += 1) {
      // Einzelne Surrogate kommen nicht im Browser an (der Decoder des Servers macht Bytemarken, Angriffsmatrix F10).
      if (codepunkt >= 0xD800 && codepunkt <= 0xDFFF) {
        continue;
      }
      const zeichen = String.fromCodePoint(codepunkt);
      const erwartet = sichtbarerName(zeichen);
      const werte = zeilenwerte({ kurzHash: 'a', betreff: zeichen, autor: zeichen, rumpf: '', datum: '' });
      if (werte.betreff !== erwartet || werte.autor !== erwartet) {
        anzahl += 1;
        if (abweichungen.length < 20) {
          abweichungen.push(`U+${codepunkt.toString(16).toUpperCase().padStart(4, '0')}`);
        }
      }
    }

    expect(anzahl, `Codepunkte mit anderem Ergebnis als sichtbarerName (erste: ${abweichungen.join(', ')})`).toBe(0);
  });

  test('Kriterium 3: web/ hat genau eine Zeichenliste, keine zweite für Commit-Texte', () => {
    const verbotene = [
      { name: 'ohneSteuerzeichen', muster: /ohneSteuerzeichen/ },
      { name: 'Zeichenklasse mit U+202E', muster: /\\u202[ABCDE]/i },
      { name: 'Zeichenklasse mit U+2066', muster: /\\u206[6-9]/i },
      { name: 'Zeichenklasse mit U+200B', muster: /\\u200[BCDEF]/i },
      { name: 'Zeichenklasse mit U+061C', muster: /\\u061C/i },
      { name: 'literales Format- oder Trennezeichen', muster: /[\p{Cf}\u2028\u2029]/u },
    ];
    const quellen = fs.readdirSync(WEB).filter(name => name.endsWith('.js')).map(name => ({ name, text: fs.readFileSync(path.join(WEB, name), 'utf8') }));
    const dateiliste = quellen.find(quelle => quelle.name === 'dateiliste-werte.js');
    const funde = [];
    for (const quelle of quellen) {
      if (quelle.name === 'dateiliste-werte.js') {
        continue;
      }
      for (const regel of verbotene) {
        if (regel.muster.test(quelle.text)) {
          funde.push(`${quelle.name}: ${regel.name}`);
        }
      }
    }

    // Positivkontrolle: die eine Liste steht da, die Suche greift.
    expect(dateiliste.text).toContain('UNSICHTBARE_ZEICHEN');
    expect(verbotene[0].muster.test(dateiliste.text)).toBe(false);
    expect(funde).toEqual([]);
  });
});
