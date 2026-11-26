'use strict';
// Testsprache „Seitenleiste bleibt stehen“ (R00033): Repos und Commits heißen wie in der User Story — Repo S mit `s1`/`s2`
// (200 Zeilen, 60 Dateien), Repo L mit `l2` (Lücken im Diff), Repo Z mit `z1`/`z3` (keine lückenlose Kette). „Rollbereich“ ist
// das Element, das scrollt (Dateiliste bzw. Diff-Bereich); „Seite scrollt nicht“ heißt: kein Überhang. Die Treiber darunter
// kennen Seite, Prozess, HTTP, git, Tasten und Selektoren.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const tastatur = require('../treiber/tastatur-oberflaeche.js');
const naechsteSeite = require('../treiber/naechste-oberflaeche.js');
const rahmen = require('../treiber/rahmen-oberflaeche.js');
const anmerkungen = require('../treiber/anmerkungen-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');

const FENSTER = { width: 1280, height: 800 };
/** Die Mediengrenze der Anforderung: darunter eine Spalte, ab 566 px zwei (PO 2026-11-25). */
const SCHMAL = { width: 560, height: 800 };
const ZWEI_SPALTEN_GENAU = { width: 566, height: 800 };

const VORBEREITUNGEN = {
  'Repo S': { anlegen: repos.repoS, commits: ['s1'] },
  'Repo S zwei Commits': { anlegen: repos.repoS, commits: ['s1', 's2'] },
  'Repo L': { anlegen: repos.repoL, commits: ['l2'] },
  'Repo Z': { anlegen: repos.repoZ, commits: ['z1', 'z3'] },
  'Repo U': { anlegen: repos.repoU, commits: ['u'] },
};

function seitenleisteSprache(gr, page) {
  let repo;
  let lauf;
  const hash = name => repo.hashes[name];

  async function starten({ vorbereitung = 'Repo S', commits, modus = 'zusammen', fenster = FENSTER } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    lauf = await gr.gitreviewAStarten(repo, (commits || art.commits).map(hash));
    await page.setViewportSize(fenster);
    await gr.oberflaecheOeffnen(page, lauf, modus);
    // Bereit, wenn Liste und Haken-Stand stehen (vorher ist „Nächste ungeprüfte“ gesperrt).
    await expect(page.locator('#kopf-fortschritt .haken-zaehler')).not.toHaveText('', { timeout: 5000 });
    await expect(page.locator('#datei-zeilen .datei-zeile').first()).toBeVisible({ timeout: 5000 });
  }

  /** Fenster in der Mitte des Laufs ändern (die Regeln gelten ohne Neuladen) und warten, bis der Aufbau die neue Größe
      trägt: der Browser meldet sie asynchron, und die Mediengrenze des CSS greift erst mit dem nächsten Zeichnen — sonst
      liest die nächste Prüfung den Zustand der alten Größe. */
  async function fensterSetzen(fenster) {
    await page.setViewportSize(fenster);
    await rahmen.warteAufAufbau(page, fenster.width);
  }

  /** Eine Datei wählen wie mit der Maus (Wahl samt Diff laden) und warten, bis ihr Diff steht. */
  async function dateiAnsehen(pfad) {
    await seite.dateiMitPfadWaehlen(page, pfad);
    await tastatur.aufDiffWarten(page, pfad);
  }

  async function druecke(taste) {
    await page.keyboard.press(taste);
  }

  return {
    starten, fensterSetzen, dateiAnsehen, druecke,
    hash,
    kurz: name => hash(name).slice(0, 7),
    lauf: () => lauf,

    /* ── Bildlauf und Geometrie ── */
    seitenstand: () => rahmen.seite(page),
    rollstand: selektor => rahmen.rollstand(page, selektor),
    listeStand: () => rahmen.rollstand(page, rahmen.LISTE),
    diffStand: () => rahmen.rollstand(page, rahmen.DIFF),
    setzeListenVersatz: wert => rahmen.setzeRollversatz(page, rahmen.LISTE, wert),
    setzeDiffVersatz: wert => rahmen.setzeRollversatz(page, rahmen.DIFF, wert),
    listeGanzUnten: async () => rahmen.setzeRollversatz(page, rahmen.LISTE, 1e6),
    listeGanzOben: () => rahmen.setzeRollversatz(page, rahmen.LISTE, 0),
    diffGanzUnten: async () => rahmen.setzeRollversatz(page, rahmen.DIFF, 1e6),
    standbild: () => rahmen.standbild(page),
    stehendeTeile: async () => rahmen.stehendeTeile(await rahmen.standbild(page)),
    lage: selektor => rahmen.lage(page, selektor),
    lageDerWahl: () => rahmen.lageDerWahl(page),
    wahlImRollbereich: () => rahmen.ganzImRollbereich(page, `${rahmen.DATEIZEILE}[aria-current="true"]`, rahmen.LISTE),
    abstandDerWahl: () => rahmen.abstandZumRand(page, `${rahmen.DATEIZEILE}[aria-current="true"]`, rahmen.LISTE),
    letzteLueckeInDenBlick: () => rahmen.letzteLueckeInDenBlick(page),
    abschnittWeiter: () => tastatur.taste(page, 'n'),

    /* ── Prüfungen ── */
    keinSeitenbildlauf: () => rahmen.pruefeKeinSeitenbildlauf(page),
    seitenbildlauf: () => rahmen.pruefeSeitenbildlauf(page),
    listeIstRollbereich: () => rahmen.pruefeRollbereich(page, rahmen.LISTE, 'Dateiliste'),
    diffIstRollbereich: () => rahmen.pruefeRollbereich(page, rahmen.DIFF, 'Diff-Bereich'),
    listeIstKeinRollbereich: () => rahmen.pruefeKeinRollbereich(page, rahmen.LISTE, 'Dateiliste'),
    diffIstKeinRollbereich: () => rahmen.pruefeKeinRollbereich(page, rahmen.DIFF, 'Diff-Bereich'),
    unveraendert: rahmen.pruefeUnveraendert,
    versatzGleich: rahmen.pruefeVersatzGleich,
    versatzGeaendert: rahmen.pruefeVersatzGeaendert,
    diffOben: () => rahmen.pruefeDiffOben(page),
    keinTrennerKeinEinklappen: () => rahmen.pruefeKeinTrennerKeinEinklappen(page),
    eineSpalte: () => rahmen.pruefeEineSpalte(page),
    zweiSpalten: () => rahmen.pruefeZweiSpalten(page),

    /* ── Viele Datei-Anmerkungen über dem Diff (Befund B1) ── */
    dateiAnmerkungenAnlegen: (anzahl, text) => anmerkungen.dateiAnmerkungenAnlegen(page, anzahl, text),
    masseDerAnmerkungen: () => rahmen.masseDerAnmerkungen(page),
    diffRollbereichBenutzbar: () => rahmen.pruefeDiffRollbereichBenutzbar(page),
    letzteAnmerkungImFenster: () => rahmen.pruefeLetzteAnmerkungImFenster(page),
    letzteAnmerkungErreichbar: () => rahmen.pruefeLetzteAnmerkungErreichbar(page),

    /* ── Wahl, Fokus und Sprünge ── */
    fokusAufDateizeile: pfad => tastatur.pruefeFokusDateizeile(page, pfad),
    fokusAufKnopf: () => naechsteSeite.pruefeFokusAufKnopf(page),
    gewaehlt: pfad => naechsteSeite.pruefeGewaehlt(page, pfad),
    naechsteUngepruefte: () => naechsteSeite.springen(page),
    diffZeigt: pfad => naechsteSeite.pruefeDiffGeladen(page, pfad),
    abhaken: pfad => seite.dateiMitPfadWaehlen(page, pfad),
    kaestchen: pfad => page.locator(`#datei-zeilen .datei-zeile[data-pfad="${pfad}"] input.haken`),
    abgehakt: (pfad, erwartet) => expect(page.locator(`#datei-zeilen .datei-zeile[data-pfad="${pfad}"] input.haken`)).toBeChecked({ checked: erwartet }),

    /* ── Anzeigeverfahren ── */
    ansicht: wert => diffSeite.menueWaehlen(page, wert === 'ganz' ? 'ganze Datei' : 'nur Änderungen'),
    anordnung: wert => diffSeite.menueWaehlen(page, wert),
    modus: wert => seite.modusWaehlen(page, wert),
    luecken: () => diffSeite.lueckenLesen(page),
    lueckeAufklappen: (nummer, ganz = false) => diffSeite.lueckeAufklappen(page, nummer, ganz),
    zeilenzahl: () => diffSeite.zeilenZaehlen(page),
    suchen: begriff => seite.sucheSuchen(page, begriff),
    sucheWeiter: () => seite.sucheWeiter(page),
    sucheMarken: () => seite.sucheMarkenLesen(page),
    diffZeilen: () => page.locator('#diff .df-sc tr[data-art]').count(),
    bloecke: () => page.locator('#diff .df-sc .dz-b').count(),
  };
}

const test = basis.extend({
  // eslint-disable-next-line no-empty-pattern
  seit: async ({ gr, page }, verwenden) => {
    await verwenden(seitenleisteSprache(gr, page));
  },
});

module.exports = { test, expect };
