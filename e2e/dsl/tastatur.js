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

  async function starten({ vorbereitung = 'Repo Z', commits, modus = 'zusammen', hakenStand = null } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    const auswahl = commits || art.commits;
    lauf = await gr.gitreviewAStarten(repo, auswahl.map(hash));
    if (hakenStand) {
      await page.route('**/api/haken', async route => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hakenStand(hash)) });
      });
    }
    await page.setViewportSize(FENSTER);
    await gr.oberflaecheOeffnen(page, lauf, modus);
    // Bereit, wenn Liste und Haken-Stand stehen (vorher ist „Nächste ungeprüfte“ gesperrt).
    await expect(page.locator('#kopf-fortschritt .haken-zaehler')).not.toHaveText('', { timeout: 5000 });
    await expect(page.locator('#datei-zeilen .datei-zeile').first()).toBeVisible({ timeout: 5000 });
  }

  /** Eine Datei wählen wie mit der Maus (Wahl samt Diff laden) und warten, bis ihr Diff steht. */
  async function dateiAnsehen(name) {
    await seite.dateiWaehlen(page, name);
    await tastatur.aufDiffWarten(page, name);
  }

  return {
    starten,
    dateiAnsehen,
    /** Wartet, bis der Diff dieser Datei gezeichnet steht (nach einer Wahl per Kürzel). */
    wartenAufDiff: pfad => tastatur.aufDiffWarten(page, pfad),
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
    statuszeileDom: () => tastatur.statuszeileDom(page),
    hilfeOffen: offen => tastatur.pruefeHilfeOffen(page, offen),
    hilfeGruppen: () => tastatur.hilfeGruppen(page),
    hilfeNichtVerfuegbar: text => tastatur.pruefeHilfeNichtVerfuegbar(page, text),
    fokusImDialog: () => tastatur.fokusImDialog(page),
    fokusAuf: selektor => tastatur.pruefeFokusAuf(page, selektor),
    hintergrundInert: () => tastatur.hintergrundInert(page),
    hinweis: selektor => tastatur.hinweis(page, selektor),
    fokusringPerTab: selektor => tastatur.fokusringPerTab(page, selektor),
    fokusringAktuell: () => tastatur.fokusringAktuell(page),
    ansage: text => tastatur.pruefeAnsage(page, text),
    keineAnsage: () => tastatur.pruefeAnsageLeer(page),
    diffZeilen: () => tastatur.diffZeilen(page),
    diffZeigt: erwartet => diffSeite.pruefeDiff(page, erwartet),
    fortschritt: text => seite.pruefeFortschritt(page, text),
    kopfZahlen: text => seite.pruefeKopfZahlen(page, text),
    anmerkungenUnter: (stelle, texte) => tastatur.pruefeAnmerkungstexteUnter(page, stelle, texte),
    feldOffenMitFokus: name => anmerkungSeite.pruefeFeldOffenMitFokus(page, name),
    feldZu: name => anmerkungSeite.pruefeFeldZu(page, name),
    keinFeld: () => anmerkungSeite.pruefeKeinFeld(page),
    fokusAufKopf: nummer => anmerkungSeite.pruefeFokusAufKopf(page, nummer),
    fokussiereKopf: nummer => page.locator(`#diff tr.anm[data-anmerkung="${nummer}"] .anm-kopf`).focus(),
    aenderungOeffnen: nummer => anmerkungSeite.aenderungOeffnen(page, nummer),
    aenderungsfeldMitText: text => tastatur.pruefeAenderungsfeld(page, text),
    aenderungsfelder: anzahl => tastatur.pruefeAenderungsfelder(page, anzahl),
    /** Die Dateiliste in den Fokus bringen (Tab landet auf dem ersten Kästchen). */
    inDieDateiliste: () => tastatur.inDieDateiliste(page),
    fokussiereAusserhalb: () => tastatur.fokusAufSeite(page),
    fokusAufLuecke: stelle => tastatur.pruefeFokusLuecke(page, stelle),
    /** Der Modus der Seite (`body[data-modus]`). */
    modus: async name => {
      await expect(page.locator('body')).toHaveAttribute('data-modus', name);
    },
    commit: name => tastatur.pruefeCommit(page, hash(name)),
    ansicht: wert => tastatur.pruefeAnsicht(page, wert),
    umbruch: an => tastatur.pruefeUmbruch(page, an),
    leerraum: an => tastatur.pruefeLeerraum(page, an),
    anordnung: wert => tastatur.pruefeAnordnung(page, wert),
    tippe: text => page.keyboard.type(text),
    fokussiere: selektor => page.locator(selektor).focus(),
    feldwert: () => tastatur.feldwert(page),
    fokussiereFeld: () => tastatur.fokussiereFeld(page),
    ohneWahl: () => tastatur.ohneWahl(page),
    zeileDa: pfad => tastatur.pruefeZeile(page, pfad, true),
    zeileFehlt: pfad => tastatur.pruefeZeile(page, pfad, false),
    ausblendenZaehler: text => tastatur.pruefeAusblendenZaehler(page, text),
    sperrgrund: (pfad, text) => tastatur.pruefeSperrgrund(page, pfad, text),
    contenteditableFokussieren: () => tastatur.contenteditableFokussieren(page),
    baueSchalterEin: kennung => tastatur.schalterEinbauen(page, kennung),
    schalterZustand: kennung => tastatur.schalterZustand(page, kennung),
    schalterAenderungen: () => tastatur.schalterAenderungen(page),
    /** Ein synthetisches Strg-/F5-Ereignis (kein echter Reload) — meldet, ob das Programm es verhindert hat. */
    drueckeMitStrg: taste => page.evaluate(name => {
      const ereignis = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ctrlKey: true });
      document.body.dispatchEvent(ereignis);
      return ereignis.defaultPrevented;
    }, taste),
    ladeSeiteNeu: () => page.reload(),
    klickeHilfeKnopf: () => page.locator('#hilfe-knopf').click(),
    klickeHilfeZu: () => page.locator('#hilfe-zu').click(),
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
      await gr.beendenBetaetigen(page);
      const exitCode = await gr.aufEndeWarten(lauf);
      return { exitCode, ergebnis: gr.ergebnis(lauf) };
    },
    stdoutBisher: () => gr.ergebnis(lauf),
    /** Zählt ab jetzt die Anfragen an `/api/` — für „kein neuer Serverweg“. */
    anfragenBeobachten: () => {
      const gesehen = [];
      page.on('request', anfrage => {
        const pfad = new URL(anfrage.url()).pathname;
        if (pfad.startsWith('/api/')) {
          gesehen.push(pfad);
        }
      });
      return () => gesehen.slice();
    },
    seite: () => page,
  };
}

const test = basis.extend({
  tast: async ({ gr, page }, verwenden) => {
    await verwenden(tastaturSprache(gr, page));
  },
});

module.exports = { test, expect };