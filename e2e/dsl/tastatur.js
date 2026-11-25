'use strict';
// Testsprache „Tastaturbedienung“ (R00030): Repos heißen wie in der User Story (Z mit z1..z3, W mit w2), Aktionen wie die
// Kürzel („drückeBuchstabe('j')“, „geheInDenDiff()“). Die Treiber darunter kennen Tasten, Selektoren und berechnete Stile.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const anmerkungSeite = require('../treiber/anmerkungen-oberflaeche.js');
const tastatur = require('../treiber/tastatur-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');

const FENSTER = { width: 1280, height: 800 };

const VORBEREITUNGEN = {
  'Repo Z': { anlegen: repos.repoZ, commits: ['z1', 'z2', 'z3'] },
  // R00026: `w2` ändert `weit.txt` an zwei Stellen — zwei Abschnitte im selben Diff.
  'Repo W': { anlegen: repos.repoW, commits: ['w2'] },
};

function tastaturSprache(gr, page) {
  let repo;
  let lauf;
  const hash = name => repo.hashes[name];

  async function starten({ vorbereitung = 'Repo Z', commits, modus = 'zusammen' } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    const auswahl = commits || art.commits;
    lauf = await gr.gitreviewAStarten(repo, auswahl.map(hash));
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, modus);
  }

  /** Eine Datei wählen wie mit der Maus (Wahl samt Diff laden) und warten, bis ihr Diff steht. */
  async function dateiAnsehen(name) {
    await seite.dateiWaehlen(page, name);
    await tastatur.aufDiffWarten(page, name);
  }

  return {
    starten,
    dateiAnsehen,
    hash,
    lauf: () => lauf,
    druecke: name => tastatur.taste(page, name),
    /** Die Taste ohne Strg/Alt/Meta — der Weg der User Story. */
    drueckeBuchstabe: name => tastatur.taste(page, name),
    geheInDenDiff: () => tastatur.inDenDiffGehen(page),
    inDenDiffTabben: () => anmerkungSeite.inDenDiffTabben(page),
    pfeilAbBis: neu => anmerkungSeite.pfeilAbBis(page, neu),
    fokus: () => tastatur.fokus(page),
    fokusAufDiffzeile: neu => tastatur.pruefeFokusDiffzeile(page, neu),
    fokusAufDateizeile: pfad => tastatur.pruefeFokusDateizeile(page, pfad),
    fokusImFeld: name => tastatur.pruefeFokusFeld(page, name),
    gewaehlt: pfad => tastatur.pruefeGewaehlt(page, pfad),
    haken: (pfad, erwartet) => tastatur.pruefeHaken(page, pfad, erwartet),
    statuszeile: (text, tasten) => tastatur.pruefeStatuszeile(page, text, tasten),
    statuszeileOhne: text => tastatur.pruefeKeinStatuszeilenEintrag(page, text),
    statuszeilenTexte: () => tastatur.statuszeileTexte(page),
    hilfeOffen: offen => tastatur.pruefeHilfeOffen(page, offen),
    hilfeGruppen: () => tastatur.hilfeGruppen(page),
    hilfeNichtVerfuegbar: text => tastatur.pruefeHilfeNichtVerfuegbar(page, text),
    hinweis: selektor => tastatur.hinweis(page, selektor),
    fokusring: selektor => tastatur.fokusring(page, selektor),
    ansage: text => tastatur.pruefeAnsage(page, text),
    keineAnsage: () => tastatur.pruefeAnsageLeer(page),
    diffZeilen: () => tastatur.diffZeilen(page),
    diffZeigt: erwartet => diffSeite.pruefeDiff(page, erwartet),
    fortschritt: text => seite.pruefeFortschritt(page, text),
    kopfZahlen: text => seite.pruefeKopfZahlen(page, text),
    anmerkungenUnter: (stelle, texte) => anmerkungSeite.pruefeAnmerkungenUnter(page, stelle, texte),
    feldOffenMitFokus: name => anmerkungSeite.pruefeFeldOffenMitFokus(page, name),
    feldZu: name => anmerkungSeite.pruefeFeldZu(page, name),
    keinFeld: () => anmerkungSeite.pruefeKeinFeld(page),
    fokusAufKopf: nummer => anmerkungSeite.pruefeFokusAufKopf(page, nummer),
    aenderungOeffnen: nummer => anmerkungSeite.aenderungOeffnen(page, nummer),
    inVsCodeHref: () => page.locator('#diff .sprung-knopf').getAttribute('href'),
    /** Installiert einen Zähler für Klicks auf VS-Code-Verweise — kein Test startet VS Code. */
    vsCodeKlickZaehlen: () => page.evaluate(() => {
      window.__vsCodeKlicks = [];
      const echtesKlicken = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (String(this.href).startsWith('vscode:')) {
          window.__vsCodeKlicks.push(this.href);
          return;
        }
        return echtesKlicken.call(this);
      };
    }),
    vsCodeKlicks: () => page.evaluate(() => window.__vsCodeKlicks.slice()),
    /** Beobachtet jedes `keydown` der Seite nach dem Abfangen: ob das Programm es verhindert hat. */
    tastenBeobachten: () => page.evaluate(() => {
      window.__tasten = [];
      window.addEventListener('keydown', ereignis => {
        window.__tasten.push({ taste: ereignis.key, verhindert: ereignis.defaultPrevented });
      });
    }),
    beobachteteTasten: () => page.evaluate(() => window.__tasten.slice()),
    /** Ein echtes `keydown` mit AltGr-Merker, den Playwrights Tastatur nicht setzen kann (deutsche Tastatur). */
    drueckeMitAltGr: taste => page.evaluate(name => {
      const ereignis = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, altKey: true });
      Object.defineProperty(ereignis, 'getModifierState', { value: merkmal => merkmal === 'AltGraph' });
      document.body.dispatchEvent(ereignis);
      return ereignis.defaultPrevented;
    }, taste),
    drueckeMitStrgAlt: taste => page.evaluate(name => {
      const ereignis = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, altKey: true, ctrlKey: true });
      document.body.dispatchEvent(ereignis);
      return ereignis.defaultPrevented;
    }, taste),
    luecken: () => diffSeite.lueckenLesen(page),
    beendenUndErgebnisLesen: async () => {
      const { exitCode, ergebnis } = await gr.beendenUndErgebnisLesen(lauf);
      return { exitCode, ergebnis };
    },
    stdoutBisher: () => gr.ergebnis(lauf),
  };
}

const test = basis.extend({
  tast: async ({ gr, page }, verwenden) => {
    await verwenden(tastaturSprache(gr, page));
  },
});

module.exports = { test, expect };