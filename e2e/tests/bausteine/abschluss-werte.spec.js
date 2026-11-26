'use strict';
// Bausteintest (ohne Browser) des Abschlussschritts (R00041, B4002): die nicht angesehenen Einträge je Modus, in der
// Reihenfolge der gezeigten Liste, gesperrte Stellen und Dateien ausgenommen (R00014), ausgeblendete mit Vermerk; dazu die
// Grenze 20 Einträge mit „… und k weitere“ (Kriterium 6).
const { test, expect } = require('@playwright/test');
const { nichtAngesehen, abschnitt, gezeigteReihenfolge, HOECHSTENS_EINTRAEGE } = require('../../../src/GitReviewA/web/abschluss-werte.js');

const schluessel = (commit, pfad) => `${commit} ${pfad}`;
const nieGesperrt = () => false;
const nieAusgeblendet = () => false;

function datei(pfad, stellen, zusatz = {}) {
  return { pfad, schluessel: pfad, stellen: stellen.map(([commit, stelle]) => ({ commit, pfad: stelle })), ...zusatz };
}

function stelle(commit, pfad, zusatz = {}) {
  return { pfad, schluessel: pfad, commit, ...zusatz };
}

test.describe('Baustein Abschluss-Werte — nicht angesehene Stellen (B4002)', () => {
  test('Kriterium 1: in „Zusammen“ fehlt jede Datei ohne angesehene Stelle, in der Reihenfolge der Liste', () => {
    const liste = [datei('README.md', [['z1', 'README.md']]), datei('src/a.txt', [['z1', 'src/a.txt'], ['z2', 'src/a.txt'], ['z3', 'src/a.txt']]), datei('src/b.txt', [['z2', 'src/b.txt'], ['z3', 'src/b.txt']])];
    const stand = new Set([schluessel('z3', 'src/a.txt')]);

    const eintraege = nichtAngesehen('zusammen', liste, stand, nieGesperrt, nieAusgeblendet);

    expect(eintraege.map(eintrag => eintrag.pfad)).toEqual(['README.md', 'src/b.txt']);
    expect(eintraege.every(eintrag => eintrag.commit === null)).toBe(true);
  });

  test('Kriterium 3: in „Einzeln“ zählt jede Stelle, auch die eines anderen Commits', () => {
    const liste = [
      stelle('z1', 'README.md'), stelle('z1', 'src/a.txt'),
      stelle('z2', 'src/a.txt'), stelle('z2', 'src/b.txt'),
      stelle('z3', 'src/a.txt'), stelle('z3', 'src/b.txt'),
    ];
    const stand = new Set([schluessel('z3', 'src/a.txt'), schluessel('z3', 'src/b.txt')]);

    const eintraege = nichtAngesehen('einzeln', liste, stand, nieGesperrt, nieAusgeblendet);

    expect(eintraege.map(eintrag => [eintrag.commit, eintrag.pfad])).toEqual([
      ['z1', 'README.md'], ['z1', 'src/a.txt'], ['z2', 'src/a.txt'], ['z2', 'src/b.txt'],
    ]);
  });

  test('Kriterium 3, zweite Hälfte: in „Zusammen“ bleibt nur die Datei ohne angesehene Stelle', () => {
    const liste = [datei('README.md', [['z1', 'README.md']]), datei('src/a.txt', [['z1', 'src/a.txt'], ['z3', 'src/a.txt']]), datei('src/b.txt', [['z2', 'src/b.txt'], ['z3', 'src/b.txt']])];
    const stand = new Set([schluessel('z3', 'src/a.txt'), schluessel('z3', 'src/b.txt')]);

    const eintraege = nichtAngesehen('zusammen', liste, stand, nieGesperrt, nieAusgeblendet);

    expect(eintraege.map(eintrag => eintrag.pfad)).toEqual(['README.md']);
  });

  test('Kriterium 5: eine gesperrte Stelle oder Datei steht nicht im Abschnitt', () => {
    const liste = [datei('gesperrt.txt', [['z1', 'gesperrt.txt']]), datei('offen.txt', [['z1', 'offen.txt']])];
    const gesperrt = punkt => punkt.pfad === 'gesperrt.txt';

    const zusammen = nichtAngesehen('zusammen', liste, new Set(), gesperrt, nieAusgeblendet);
    const einzeln = nichtAngesehen('einzeln', [stelle('z1', 'gesperrt.txt'), stelle('z1', 'offen.txt')], new Set(), gesperrt, nieAusgeblendet);

    expect(zusammen.map(eintrag => eintrag.pfad)).toEqual(['offen.txt']);
    expect(einzeln.map(eintrag => eintrag.pfad)).toEqual(['offen.txt']);
  });

  test('Kriterium 5: eine ausgeblendete Datei bleibt im Abschnitt und trägt den Vermerk', () => {
    const liste = [datei('versteckt.txt', [['z1', 'versteckt.txt']]), datei('offen.txt', [['z1', 'offen.txt']])];
    const ausgeblendet = punkt => punkt.pfad === 'versteckt.txt';

    const eintraege = nichtAngesehen('zusammen', liste, new Set(), nieGesperrt, ausgeblendet);

    expect(eintraege).toEqual([
      { pfad: 'versteckt.txt', schluessel: 'versteckt.txt', commit: null, ausgeblendet: true },
      { pfad: 'offen.txt', schluessel: 'offen.txt', commit: null, ausgeblendet: false },
    ]);
  });

  test('soll den Weg zur Datei über den Listenschlüssel führen (in „Einzeln“ der rohe Pfad)', () => {
    const liste = [{ pfad: 'x\u202E.txt', schluessel: 'x\u202E.txt', commit: 'z1' }];

    const eintraege = nichtAngesehen('einzeln', liste, new Set(), nieGesperrt, nieAusgeblendet);

    expect(eintraege).toEqual([{ pfad: 'x\u202E.txt', schluessel: 'x\u202E.txt', commit: 'z1', ausgeblendet: false }]);
  });

  test('Kriterium 3/Leerfall: n = 0 liefert keine Einträge', () => {
    const stand = new Set([schluessel('z1', 'a.txt')]);

    const eintraege = nichtAngesehen('zusammen', [datei('a.txt', [['z1', 'a.txt']])], stand, nieGesperrt, nieAusgeblendet);

    expect(eintraege).toEqual([]);
  });

  test('Kriterium 6: 2 000 Einträge ergeben 20 Zeilen und 1 980 weitere', () => {
    const liste = [];
    for (let nummer = 0; nummer < 2000; nummer += 1) {
      liste.push(stelle('g', `datei-${nummer}.txt`));
    }

    const ergebnis = abschnitt(nichtAngesehen('einzeln', liste, new Set(), nieGesperrt, nieAusgeblendet));

    expect(HOECHSTENS_EINTRAEGE).toBe(20);
    expect(ergebnis.anzahl).toBe(2000);
    expect(ergebnis.eintraege).toHaveLength(20);
    expect(ergebnis.eintraege[0].pfad).toBe('datei-0.txt');
    expect(ergebnis.eintraege[19].pfad).toBe('datei-19.txt');
    expect(ergebnis.weitere).toBe(1980);
  });

  test('soll knapp unter und über der Grenze stimmen (19, 20, 21 Einträge)', () => {
    const mitAnzahl = anzahl => abschnitt(Array.from({ length: anzahl }, (_, nummer) => stelle('g', `d-${nummer}.txt`)));

    expect([mitAnzahl(19).weitere, mitAnzahl(20).weitere, mitAnzahl(21).weitere]).toEqual([0, 0, 1]);
    expect([mitAnzahl(19).eintraege.length, mitAnzahl(21).eintraege.length]).toEqual([19, 20]);
  });

  // PO 272 (#50, Zeile 272): die Einträge folgen der gezeigten Liste; die Gruppenordnung (Code vor Tests vor Doku) ist
  // dieselbe eine Stelle, die die Dateiliste zeichnet (`gruppen-werte.nachGruppen`, R00040).
  test('PO 272: in „Zusammen“ ordnet die gezeigte Liste — Code vor Doku', () => {
    const liste = [datei('README.md', [['z1', 'README.md']]), datei('src/a.txt', [['z1', 'src/a.txt']]), datei('docs/x.md', [['z1', 'docs/x.md']]), datei('src/b.txt', [['z1', 'src/b.txt']])];

    const geordnet = gezeigteReihenfolge('zusammen', liste);

    expect(geordnet.map(eintrag => eintrag.pfad)).toEqual(['src/a.txt', 'src/b.txt', 'README.md', 'docs/x.md']);
  });

  test('PO 272: in „Einzeln“ je Commit in Reihenfolge der Liste, darin Code vor Doku', () => {
    const liste = [
      stelle('z1', 'README.md'), stelle('z1', 'src/a.txt'),
      stelle('z2', 'src/a.txt'), stelle('z2', 'src/b.txt'),
    ];

    const geordnet = gezeigteReihenfolge('einzeln', liste);

    expect(geordnet.map(eintrag => [eintrag.commit, eintrag.pfad])).toEqual([
      ['z1', 'src/a.txt'], ['z1', 'README.md'],
      ['z2', 'src/a.txt'], ['z2', 'src/b.txt'],
    ]);
  });
});
