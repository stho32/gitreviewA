'use strict';
// Testsprache „Nebeneinander-Ansicht“ (R00023): Commits und Repos heißen wie in der User Story (G mit g1, g2, g3; A mit p, q),
// die Sprache kennt ihre Hashes, die Treiber darunter kennen Seite, Prozess und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const nebenSeite = require('../treiber/nebeneinander-oberflaeche.js');
const anmerkungSeite = require('../treiber/anmerkungen-oberflaeche.js');
const farbe = require('../treiber/farb-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');

const FENSTER = { width: 1280, height: 800 };

const VORBEREITUNGEN = {
  'Repo G': { anlegen: repos.repoG, commits: ['g2'] },
  'Repo A': { anlegen: repos.repoA, commits: ['q', 'p'] },
  'Repo C': { anlegen: repos.repoC, commits: ['c2', 'c1'] },
  'Repo W': { anlegen: repos.repoW, commits: ['w2', 'w1'] },
  'Repo U': { anlegen: repos.repoU, commits: ['u'] },
  'Repo Klammern': { anlegen: repos.repoKlammern, commits: ['h2'] },
  'Große Diffs': { anlegen: repos.repoGross, commits: ['w'] },
  'Eine Zeile in 20 000': { anlegen: repos.repoUMitV, commits: ['v'] },
};

function nebenSprache(gr, page) {
  let repo;
  let lauf;
  let meldungen;
  const hash = name => repo.hashes[name];

  /** Startet gitreviewA im Repo der Vorbereitung und öffnet die Seite; `anordnung` ist der Startwert der Seite. */
  async function starten({ vorbereitung = 'Repo G', commits, anordnung = null, modus = null } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    const namen = commits || art.commits;
    lauf = await gr.gitreviewAStarten(repo, namen.map(hash), {});
    await page.setViewportSize(FENSTER);
    meldungen = { konsole: [], seitenfehler: [] };
    page.on('console', nachricht => meldungen.konsole.push(nachricht.text()));
    page.on('pageerror', fehler => meldungen.seitenfehler.push(String(fehler)));
    if (anordnung) {
      await page.addInitScript(wert => { window.gitreviewaStartAnordnung = wert; }, anordnung);
    }
    await gr.oberflaecheOeffnen(page, lauf, modus);
  }

  return {
    starten,
    hash: name => hash(name),
    commitAnsehen: name => seite.commitWaehlen(page, hash(name).slice(0, 7)),
    dateiAnsehen: async name => {
      await seite.dateiWaehlen(page, name);
      await nebenSeite.warteAufZeichnung(page);
    },
    anordnungWaehlen: wert => nebenSeite.anordnungWaehlen(page, wert),
    anordnungPerTastatur: wert => nebenSeite.anordnungPerTastatur(page, wert),
    gruppe: () => nebenSeite.pruefeGruppe(page),
    anordnungIst: wert => nebenSeite.pruefeAnordnung(page, wert),
    zeilenPaareSind: erwartet => nebenSeite.pruefeZeilenPaare(page, erwartet),
    spaltenkoepfeSind: () => nebenSeite.pruefeSpaltenkoepfe(page),
    kontextEinmalGelesen: () => nebenSeite.pruefeKontextEinmalGelesen(page),
    umfangWaehlen: name => diffSeite.ansichtWaehlen(page, name),
    umfangIst: name => diffSeite.pruefeAnsicht(page, name),
    fordertZurWahlAuf: () => diffSeite.pruefeAufforderungZurWahl(page),
    neuLaden: () => page.reload(),
    farbeFertig: () => diffSeite.warteAufFarbe(page),
    farbRollen: () => nebenSeite.farbeRollenLesen(page),
    farbRollenMitText: () => nebenSeite.farbRollenMitTextLesen(page),
    /** Konsole und Seitenfehler der Seite sind leer (kein Fehler beim Zeichnen und Färben). */
    seiteBleibtStill: () => farbe.pruefeKonsoleLeer(meldungen, false),
    blockKnoten: () => diffSeite.blockKnoten(page),
    zugeklappt: (pfad, meldung) => diffSeite.pruefeZugeklappt(page, pfad, meldung),
    trotzdemLaden: () => diffSeite.trotzdemLaden(page),
    zustand: (pfad, text, fehler = false) => diffSeite.pruefeMeldung(page, pfad, text, fehler),
    hinweisZurWahl: () => diffSeite.pruefeAufforderungZurWahl(page),
    linksSeiteAnklicken: alt => nebenSeite.linksTextzelleAnklicken(page, alt),
    rechtsSeiteAnklicken: neu => nebenSeite.rechtsTextzelleAnklicken(page, neu),
    feldOffenMitFokus: name => anmerkungSeite.pruefeFeldOffenMitFokus(page, name),
    textSchreiben: (name, text) => anmerkungSeite.textSchreiben(page, name, text),
    speichern: name => anmerkungSeite.speichern(page, name),
    anmerkungenUnter: (ziel, erwartet) => anmerkungSeite.pruefeAnmerkungenUnter(page, ziel, erwartet),
    entferntHinweis: () => nebenSeite.entferntHinweis(page),
    fremderTextBleibtText: () => seite.pruefeKeineFormatierung(page),
    hatPaar: (links, rechts) => nebenSeite.hatZeilenpaar(page, links, rechts),
    breiteUndUmbruch: neu => nebenSeite.pruefeBreiteUndUmbruch(page, neu),
    spaltenbreiten: neu => nebenSeite.spaltenbreitenLesen(page, neu),
    /** Der Umschalter „Umbruch“ (R00032): umschalten und die Stellung prüfen. */
    umbruchUmschalten: () => diffSeite.umbruchUmschalten(page),
    umbruchIst: stellung => diffSeite.pruefeUmbruchStellung(page, stellung),
    sprungzeile: (neu, name) => nebenSeite.pruefeSprungzeile(page, neu, name),
    sprungzeileImVerborgenen: neu => nebenSeite.sprungzeileLiegtImVerborgenen(page, neu),
    sprunglinks: () => nebenSeite.sprunglinksZaehlen(page),
    anordnungKlicken: wert => nebenSeite.anordnungKlicken(page, wert),
    paarBinnen: (links, rechts, fristMs) => nebenSeite.pruefePaarBinnen(page, () => nebenSeite.anordnungKlicken(page, 'nebeneinander'), links, rechts, fristMs),
    /** Lücken von „nur Änderungen“ (R00026, Nacharbeit I0007) und die aufgedeckten Zeilen in beiden Spalten. */
    luecken: () => diffSeite.lueckenLesen(page),
    lueckeAufklappen: (nummer, ganz = false, perTastatur = false) => diffSeite.lueckeAufklappen(page, nummer, ganz, perTastatur),
    lueckeMeldet: (nummer, text) => diffSeite.lueckeMeldet(page, nummer, text),
    antwortErsetzen: optionen => diffSeite.diffAntwortErsetzen(page, optionen),
    hatZeile: neu => diffSeite.zeileVorhanden(page, neu),
    zeilentext: neu => diffSeite.zeilentextLesen(page, neu),
    /** Das Paar der Tabellenzeile mit Nummer neu `neu` (links die alte, rechts die neue Seite) — auch aufgedeckter Kontext. */
    paarMitZeile: (neu, erwartet) => nebenSeite.pruefePaarMitZeile(page, neu, erwartet),
  };
}

const test = basis.extend({
  neben: async ({ gr, page }, verwenden) => {
    await verwenden(nebenSprache(gr, page));
  },
});

module.exports = { test, expect };
