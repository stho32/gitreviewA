'use strict';
// Testsprache „Dateinamen in schmaler Seitenleiste“ (R00056): Repo N mit `p1`/`p2` (Anlegen/Ändern), Fenster 812 × 800 mit
// offener Ergebnis-Spalte (Seitenleiste 240 px) oder 1280 × 800 (360 px). Fachwörter: messen, Zustand herstellen
// (abgehakte Zeile und gewählte Zeile), Ansicht wechseln, Datei suchen, Muster ausblenden. Treiber darunter kennen Seite,
// Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const trennerSeite = require('../treiber/trenner-oberflaeche.js');
const hakenSeite = require('../treiber/haken-oberflaeche.js');
const dateisucheSeite = require('../treiber/dateisuche-oberflaeche.js');
const dateinamenSeite = require('../treiber/dateinamen-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');

const SCHMAL = { width: 812, height: 800 };
const BREIT = { width: 1280, height: 800 };
const SCHMALE_LEISTE = 240;
const BREITE_LEISTE = 360;
const ANZAHL_DATEIEN = 8;

function dateinamenSprache(gr, page) {
  let repo;
  let lauf;
  let seitenfehler = [];
  const hash = name => repo.hashes[name];

  /** Ab jetzt Seitenfehler sammeln — vor dem Öffnen der Seite aufrufen (Konsole ohne `pageerror`). */
  function seitenfehlerSammeln() {
    seitenfehler = [];
    page.on('pageerror', fehler => seitenfehler.push(String(fehler)));
    return () => seitenfehler;
  }

  async function starten({ modus = 'zusammen', zusatz = [], dateien = ANZAHL_DATEIEN } = {}) {
    seitenfehlerSammeln();
    repo = repos.repoN(path.join(gr.eigenerOrdner(), 'repo'));
    lauf = await gr.gitreviewAStarten({ ordner: repo.ordner }, [hash('p1'), hash('p2')], { zusatz });
    await page.setViewportSize(SCHMAL);
    await gr.oberflaecheOeffnen(page, lauf, modus);
    await seite.aufDateizeilenWarten(page, dateien);
    return lauf;
  }

  /** Fenster 812 × 800 mit offener Ergebnis-Spalte: die Seitenleiste ist 240 px (R00034/R00042). */
  async function schmalOffen() {
    await page.setViewportSize(SCHMAL);
    await trennerSeite.warteAufSpalte(page);
    await trennerSeite.spaltenKnopfBetatigen(page);
    await trennerSeite.pruefeErgebnisSpalteSichtbar(page);
    await warteAufLeiste(SCHMALE_LEISTE);
  }

  /** Fenster 1280 × 800: die Ergebnis-Spalte startet offen, die Seitenleiste ist 360 px. */
  async function breit() {
    await page.setViewportSize(BREIT);
    await trennerSeite.warteAufSpalte(page);
    await warteAufLeiste(BREITE_LEISTE);
  }

  async function warteAufLeiste(ziel) {
    await expect.poll(() => trennerSeite.breiteDerSeitenleiste(page), `Breite der Seitenleiste ${ziel}`).toBe(ziel);
  }

  /** Den vorhandenen Zustand herstellen: `db/001_anlegen.sql` abgehakt, `src/app.js` gewählt (User Story R00056). */
  async function zustandHerstellen() {
    await dateinamenSeite.kaestchenMitPfadBetaetigen(page, 'db/001_anlegen.sql');
    await hakenSeite.pruefeFortschritt(page, '1 von 8 Dateien abgehakt');
    await seite.dateiMitPfadWaehlen(page, 'src/app.js');
    await expect.poll(async () => (await seite.gewaehlteDateien(page))).toContain('src/app.js');
  }

  return {
    starten,
    page,
    schmalOffen,
    breit,
    zustandHerstellen,
    hash,
    modus: name => seite.modusWaehlen(page, name),
    darstellung: art => seite.darstellungWaehlen(page, art),
    /** „Einzeln“ wählen und den Commit `name` aus der Liste ansehen (für Status A/M/D/R). */
    einzelnen: async name => {
      await seite.modusWaehlen(page, 'einzeln');
      await seite.commitWaehlen(page, hash(name).slice(0, 7));
    },
    dateiWaehlen: name => seite.dateiWaehlen(page, name),
    suchen: begriff => dateisucheSeite.sucheEingeben(page, begriff),
    musterAusblenden: muster => seite.musterEingeben(page, muster),
    abhaken: pfad => dateinamenSeite.kaestchenMitPfadBetaetigen(page, pfad),
    kaestchenMitPfadBetaetigen: pfad => dateinamenSeite.kaestchenMitPfadBetaetigen(page, pfad),
    perTastaturAbhaken: name => hakenSeite.perTastaturAbhaken(page, name),
    fortschritt: text => hakenSeite.pruefeFortschritt(page, text),
    fortschrittLesen: () => hakenSeite.zaehler(page).textContent(),
    messen: () => dateinamenSeite.messung(page),
    wurzelmasse: () => dateinamenSeite.wurzelmasse(page),
    pfadtexte: () => dateinamenSeite.pfadtexte(page),
    gewaehlteDateien: () => seite.gewaehlteDateien(page),
    dateilisteLesen: () => seite.dateilisteLesen(page),
    seitenfehler: () => seitenfehler,
    seitenfehlerSammeln,
    leisteBreite: () => trennerSeite.breiteDerSeitenleiste(page),
    aufDateizeilenWarten: anzahl => seite.aufDateizeilenWarten(page, anzahl),
    neuLaden: async () => {
      await seite.neuLaden(page, 'zusammen');
    },
    lauf: () => lauf,
    beendenUndErgebnisLesen: async () => {
      await gr.beendenBetaetigen(page);
      const exitCode = await gr.aufEndeWarten(lauf);
      return { exitCode, ergebnis: gr.ergebnis(lauf) };
    },
    beendenAnfordern: () => gr.beendenAnfordern(lauf),
  };
}

const test = basis.extend({
  namen: async ({ gr, page }, verwenden) => {
    await verwenden(dateinamenSprache(gr, page));
  },
});

module.exports = { test, expect, SCHMAL, BREIT, SCHMALE_LEISTE, BREITE_LEISTE, ANZAHL_DATEIEN };
