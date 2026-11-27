'use strict';
// B5801 (R00058, Kriterium 2): die eine Klasse unsichtbarer Zeichen ist ihre gemeinsame Tabelle im Repo
// (`tests/GitReviewA.Tests/Fremdtext/unsichtbare-klasse.txt`). Dieser Bausteintest tastet jeden Codepunkt U+0000–U+10FFFF
// ohne Surrogate einzeln durch `sichtbarerName`/`UNSICHTBARER_TEXT` der Oberfläche und vergleicht mit der Tabelle.
// Dieselbe Datei liest die NUnit-Abtastung (Server) und die Abtastung im Browser (Dateiliste lädt dieselbe Klasse).
const { test, expect } = require('@playwright/test');
const { sichtbarerName, UNSICHTBARER_TEXT } = require('../../../src/GitReviewA/web/dateiliste-werte.js');
const tabelle = require('../../treiber/unsichtbare-klasse-tabelle.js');

const ERWARTETE_ANZAHL = 4273;

test.describe('Baustein Unsichtbare Klasse — Abtastung über alle Codepunkte (R00058, B5801)', () => {
  test('Kriterium 2: sichtbarerName markiert genau die Codepunkte der Tabelle', () => {
    const bereiche = tabelle.bereicheLesen();
    expect(tabelle.anzahlDerBereiche(bereiche), 'die Tabelle trägt heute 4273 Codepunkte').toBe(ERWARTETE_ANZAHL);
    const abweichungen = [];
    for (let codepunkt = 0x0000; codepunkt <= 0x10FFFF; codepunkt += 1) {
      // Einzelne Surrogate kommen nicht im Browser an (der Decoder des Servers macht Bytemarken, Angriffsmatrix F10).
      if (codepunkt >= 0xD800 && codepunkt <= 0xDFFF) {
        continue;
      }
      const zeichen = String.fromCodePoint(codepunkt);
      const erwartet = tabelle.inBereichen(codepunkt, bereiche);
      const wirdMarkiert = sichtbarerName(zeichen) !== zeichen;
      // `UNSICHTBARER_TEXT` trägt `\p{Cc}` mit, also auch das Tab; die Aufrufer entfernen Tab vorher (`traegtUnsichtbares`).
      const textTrifftErwartet = codepunkt === 0x0009 ? true : erwartet;
      const textTrifft = UNSICHTBARER_TEXT.test(zeichen);
      if (wirdMarkiert !== erwartet || textTrifft !== textTrifftErwartet) {
        if (abweichungen.length < 20) {
          abweichungen.push(`U+${codepunkt.toString(16).toUpperCase().padStart(4, '0')}`);
        }
      }
    }

    expect(abweichungen, `Codepunkte mit anderem Ergebnis als die Tabelle (erste: ${abweichungen.join(', ')})`).toEqual([]);
  });

  test('Kriterium 2: die Ränder der Bereiche stimmen', () => {
    const markiert = codepunkt => sichtbarerName(String.fromCodePoint(codepunkt)) !== String.fromCodePoint(codepunkt);
    const markierteRaender = [0xFE00, 0xFE0F, 0xE0000, 0xE0FFF, 0x2800, 0x3164].filter(codepunkt => !markiert(codepunkt));
    const markierteNachbarn = [0xFDFF, 0xFE10, 0xE1000, 0x2801, 0x3163, 0x1161].filter(codepunkt => markiert(codepunkt));

    expect(markierteRaender, 'diese Ränder müssen markiert sein').toEqual([]);
    expect(markierteNachbarn, 'diese Nachbarn dürfen nicht markiert sein').toEqual([]);
  });

  test('Kriterium 2: das Tab bleibt unverändert', () => {
    expect(sichtbarerName('a\tb')).toBe('a\tb');
  });
});
