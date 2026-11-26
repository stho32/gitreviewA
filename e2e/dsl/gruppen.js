'use strict';
// Testsprache „Dateiliste nach Gruppen“ (R00040): Repos und Commits heißen wie in der User Story — Repo G mit `g1`/`g2`
// (acht Dateien in drei Gruppen) und Repo N mit `v` (gesperrte Stellen). „Gruppen“ sind die Köpfe Code, Tests und Doku mit
// ihrem Fortschritt; „springen“ ist „Nächste ungeprüfte“, „drücke“ eine Taste. Treiber darunter kennen Seite, Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const hakenSeite = require('../treiber/haken-oberflaeche.js');
const naechsteSeite = require('../treiber/naechste-oberflaeche.js');
const gruppenSeite = require('../treiber/gruppen-oberflaeche.js');
const tastaturSeite = require('../treiber/tastatur-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');
const fremdeNamen = require('../treiber/fremde-namen-repo.js');

const FENSTER = { width: 1280, height: 800 };

const VORBEREITUNGEN = {
  'Repo G': { anlegen: ordner => repos.repoGruppen(ordner), commits: ['g1', 'g2'] },
  'Repo N mit v': { anlegen: ordner => fremdeNamen.repoNMitV(ordner), commits: ['n', 'v'] },
};

function gruppenSprache(gr, page) {
  let repo;
  let lauf;
  const hash = name => repo.hashes[name];
  const kurz = name => hash(name).slice(0, 7);

  async function starten({ vorbereitung = 'Repo G', commits, modus = 'zusammen', zusatz = [], ohneSeite = false } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    const auswahl = commits || art.commits;
    lauf = await gr.gitreviewAStarten({ ordner: repo.ordner }, auswahl.map(hash), { zusatz });
    if (!ohneSeite) {
      await page.setViewportSize(FENSTER);
      await gr.oberflaecheOeffnen(page, lauf, modus);
      await expect(page.locator('#kopf-fortschritt .haken-zaehler')).not.toHaveText('', { timeout: 5000 });
    }
    return lauf;
  }

  async function diffLaden(pfad) {
    await naechsteSeite.pruefeDiffGeladen(page, pfad);
  }

  return {
    starten,
    hash,
    kurz,
    /** Eine Datei wählen wie mit der Maus und warten, bis ihr Diff steht. */
    dateiAnsehen: async pfad => {
      await seite.dateiWaehlen(page, pfad);
      await diffLaden(pfad);
    },
    dateienWarten: anzahl => seite.aufDateizeilenWarten(page, anzahl),
    abhaken: pfad => hakenSeite.kaestchenMitPfadBetaetigen(page, pfad),
    fortschritt: text => hakenSeite.pruefeFortschritt(page, text),
    fortschrittLesen: () => page.locator('#kopf-fortschritt .haken-zaehler').textContent(),
    modusWaehlen: modus => seite.modusWaehlen(page, modus),
    darstellung: art => seite.darstellungWaehlen(page, art),
    musterEingeben: muster => seite.musterEingeben(page, muster),
    schalterBetatigen: () => seite.abgehakteSchalterBetatigen(page),
    dateilistenMeldung: text => seite.pruefeDateilistenMeldung(page, text),

    gruppen: () => gruppenSeite.gruppenLesen(page),
    gruppenPruefen: erwartet => gruppenSeite.pruefeGruppen(page, erwartet),
    gruppenKoepfePruefen: erwartet => gruppenSeite.pruefeGruppenKoepfe(page, erwartet),
    gruppenNamen: () => gruppenSeite.gruppenNamen(page),
    gruppenKoepfeLesen: () => gruppenSeite.gruppenKoepfe(page),
    gruppenNamenPruefen: erwartet => gruppenSeite.pruefeGruppenNamen(page, erwartet),
    keineGruppeMitNamen: name => gruppenSeite.pruefeKeineGruppeMitNamen(page, name),
    gesperrteJeGruppe: () => gruppenSeite.gesperrteJeGruppe(page),
    keineGruppen: () => gruppenSeite.pruefeKeineGruppen(page),
    ueberschriften: () => gruppenSeite.pruefeGruppenkoepfeAlsUeberschriften(page),
    dateizeilenReihe: erwartet => gruppenSeite.pruefeDateizeilenReihe(page, erwartet),

    springen: () => naechsteSeite.springen(page),
    druecke: taste => tastaturSeite.taste(page, taste),
    gewaehlt: pfad => naechsteSeite.pruefeGewaehlt(page, pfad),
    fokusAufDateizeile: pfad => tastaturSeite.pruefeFokusDateizeile(page, pfad),
    commitAnsehen: name => seite.commitWaehlen(page, kurz(name)),
    waehlerMenue: erwartet => seite.pruefeWaehlerMenue(page, erwartet),
    hakenUeberSchnittstelle: (commitName, pfad) => gr.hakenAnlegen(lauf, { commit: hash(commitName), datei: pfad, abgehakt: true }),
    anmerkungAnlegen: anmerkung => gr.anmerkungAnlegen(lauf, anmerkung),
    beendenAnfordern: () => gr.beendenAnfordern(lauf),
    aufEnde: () => gr.aufEndeWarten(lauf),
    beendenUndErgebnisLesen: async () => {
      await gr.beendenBetaetigen(page);
      const exitCode = await gr.aufEndeWarten(lauf);
      return { exitCode, ergebnis: gr.ergebnis(lauf) };
    },
    ergebnis: () => lauf.stdout,
    stderr: () => lauf.stderr,
    lauf: () => lauf,
  };
}

const test = basis.extend({
  gruppen: async ({ gr, page }, verwenden) => {
    await verwenden(gruppenSprache(gr, page));
  },
});

module.exports = { test, expect };
