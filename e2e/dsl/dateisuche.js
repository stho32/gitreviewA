'use strict';
// Testsprache „Dateiliste durchsuchen“ (R00049): Repo P mit `p1`/`p2` aus der User Story, dazu der Fake mit den zusätzlichen
// Dateien `fremd<b>.txt` und `ab⟨U+202E⟩.sql`. Fachwörter: „suchen“ trägt den Text ins Feld (die Liste folgt ohne
// Bestätigung), „Feld leeren“ nimmt ihn zurück, „Leerfall“ ist „Keine Datei passt zur Suche“, „Zähler“ ist der Grund-Zähler
// im Kopf, „Fortschritt“ der Haken-Zähler. Die Treiber darunter kennen Seite, Prozess, HTTP, Tasten und git.
const fs = require('fs');
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const hakenSeite = require('../treiber/haken-oberflaeche.js');
const naechsteSeite = require('../treiber/naechste-oberflaeche.js');
const suchSeite = require('../treiber/dateisuche-oberflaeche.js');
const tastaturSeite = require('../treiber/tastatur-oberflaeche.js');
const einkl = require('../treiber/einklappen-oberflaeche.js');
const beobachtung = require('../treiber/beobachtung.js');
const diffRepos = require('../treiber/diff-repos.js');
const { git, dateiSchreiben, commitAnlegen } = require('../treiber/wegwerf-repo.js');

const FENSTER = { width: 1280, height: 800 };

/** Repo P plus die zwei Dateien des Fakes: `fremd<b>.txt` (HTML-artiger Name) und `ab⟨U+202E⟩.sql` (unsichtbares Zeichen). */
function repoPMitFremdtext(ordner) {
  return diffRepos.repoP(ordner, { 'fremd<b>.txt': 'fremd\n', 'ab\u202E.sql': 'bidi\n' });
}

/** Repo „Groß“ (Kriterium 11): `p` „Start“ legt `README.md` an, `u` „2000 Dateien“ legt 2 000 Dateien mit je ~55 Zeichen
    langem Namen an — zusammen mit einem 200 Zeichen langen Muster überschreitet der Suchlauf das Aufwandsbudget. */
function repoGross(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  git(ordner, 'init', '-q', '-b', 'main');
  dateiSchreiben(ordner, 'README.md', 'Start\n');
  const p = commitAnlegen(ordner, { betreff: 'Start' });
  for (let nummer = 1; nummer <= 2000; nummer += 1) {
    dateiSchreiben(ordner, `viele/datei-${String(nummer).padStart(4, '0')}-${'x'.repeat(40)}.txt`, `Zeile ${nummer}\n`);
  }
  const u = commitAnlegen(ordner, { betreff: '2000 Dateien' });
  return { ordner, hashes: { p, u } };
}

const VORBEREITUNGEN = {
  P: { anlegen: ordner => diffRepos.repoP(ordner), commits: ['p1', 'p2'] },
  'P mit Fremdtext': { anlegen: ordner => repoPMitFremdtext(ordner), commits: ['p1', 'p2'] },
  'Groß': { anlegen: ordner => repoGross(ordner), commits: ['p', 'u'], zeilen: 2001 },
};

function dateisucheSprache(gr, page) {
  let repo;
  let lauf;
  let hashes;
  let zaehlerGit;
  const hash = name => hashes[name];

  async function starten({ vorbereitung = 'P', commits, modus = 'zusammen', zusatz = [], zaehlen = false, zeilen = 8 } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    hashes = repo.hashes;
    const auswahl = commits || art.commits;
    const erwarteteZeilen = art.zeilen || zeilen;
    if (zaehlen) {
      zaehlerGit = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    }
    lauf = await gr.gitreviewAStarten({ ordner: repo.ordner }, auswahl.map(hash), { zusatz, pfadVorne: zaehlerGit ? zaehlerGit.ordner : undefined });
    if (page) {
      await page.setViewportSize(FENSTER);
      await gr.oberflaecheOeffnen(page, lauf, modus);
      await seite.aufDateizeilenWarten(page, erwarteteZeilen);
      // Der Anfangslauf ist durch: der Haken-Stand ist gelesen (die späteste Anfrage der Ladung) — erst danach zählt
      // eine Aufrufzählung wirklich nur noch, was das Suchen selbst auslöst.
      await expect(page.locator('#kopf-fortschritt .haken-zaehler')).not.toHaveText('', { timeout: 5000 });
    }
    return lauf;
  }

  async function dateinamen() {
    const eintraege = await gr.dateilisteLesen(page);
    return eintraege.filter(eintrag => !eintrag.ordner).map(eintrag => eintrag.name);
  }

  async function ordnernamen() {
    const eintraege = await gr.dateilisteLesen(page);
    return eintraege.filter(eintrag => eintrag.ordner).map(eintrag => eintrag.name);
  }

  return {
    starten,
    hash,
    kurz: name => hash(name).slice(0, 7),
    dateinamen,
    ordnernamen,
    /** Die Namen der Zeilen in Anzeigereihenfolge (Ordnerzeilen mit `ordner:` gekennzeichnet). */
    listenEintraege: async () => (await gr.dateilisteLesen(page)).map(eintrag => (eintrag.ordner ? `ordner:${eintrag.name}` : eintrag.name)),
    suchen: text => suchSeite.sucheEingeben(page, text),
    feldLeeren: () => suchSeite.sucheLeeren(page),
    feldInhalt: () => suchSeite.sucheInhalt(page),
    sucheMeldung: text => suchSeite.pruefeSucheMeldung(page, text),
    leerfall: text => suchSeite.pruefeLeerfall(page, text),
    zaehler: text => suchSeite.pruefeZaehler(page, text),
    zaehlerText: () => suchSeite.zaehlerText(page),
    hinweis: text => suchSeite.pruefeHinweis(page, text),
    feldbeschriftung: () => suchSeite.pruefeFeldbeschriftung(page),
    kuerzelHinweis: () => suchSeite.pruefeKuerzelHinweis(page),
    fokusImSuchfeld: () => suchSeite.pruefeFokusImSuchfeld(page),
    fokusAufDateizeile: pfad => suchSeite.pruefeFokusAufDateizeile(page, pfad),
    fortschritt: text => hakenSeite.pruefeFortschritt(page, text),
    abhaken: pfad => hakenSeite.kaestchenMitPfadBetaetigen(page, pfad),
    schalterBetatigen: () => seite.abgehakteSchalterBetatigen(page),
    dateiAnsehen: async pfad => {
      await seite.dateiMitPfadWaehlen(page, pfad);
      await naechsteSeite.pruefeDiffGeladen(page, pfad);
    },
    gewaehlt: pfad => naechsteSeite.pruefeGewaehlt(page, pfad),
    diffPfad: () => page.locator('#diff .diff-pfad').getAttribute('aria-label'),
    druecke: taste => tastaturSeite.taste(page, taste),
    modusWaehlen: modus => seite.modusWaehlen(page, modus),
    darstellung: art => seite.darstellungWaehlen(page, art),
    commitAnsehen: name => seite.commitWaehlen(page, hash(name).slice(0, 7)),
    neuLaden: () => seite.neuLaden(page),
    einklappen: () => einkl.betatigen(page),
    eingeklappt: () => einkl.pruefeZustand(page, true),
    ausgeklappt: () => einkl.pruefeZustand(page, false),
    seitenleisteVerborgen: () => einkl.pruefeSeitenleisteVerborgen(page),
    anfragenZaehlen: () => suchSeite.anfragenZaehlen(page),
    commitZaehler: text => suchSeite.pruefeCommitZaehler(page, text),
    zeitBisSuchmeldung: (text, startMs) => suchSeite.zeitBisSuchmeldung(page, text, startMs),
    aufZeilen: anzahl => seite.aufDateizeilenWarten(page, anzahl),
    gitAufrufe: () => (zaehlerGit ? zaehlerGit.aufrufe() : []),
    beendenAnfordern: () => gr.beendenAnfordern(lauf),
    beendenUndErgebnisLesen: async () => {
      await gr.beendenBetaetigen(page);
      const exitCode = await gr.aufEndeWarten(lauf);
      return { exitCode, ergebnis: gr.ergebnis(lauf) };
    },
    aufEnde: () => gr.aufEndeWarten(lauf),
    ergebnis: () => lauf.stdout,
    stderr: () => lauf.stderr,
    lauf: () => lauf,
    adresse: () => lauf.adresse,
  };
}

const test = basis.extend({
  dateisuche: async ({ gr, page }, verwenden) => {
    await verwenden(dateisucheSprache(gr, page));
  },
  /** Dieselbe Sprache ohne Seite: Programm als Prozess (stdout, Aufrufzählung). */
  dateisucheProgramm: async ({ gr }, verwenden) => {
    await verwenden(dateisucheSprache(gr, null));
  },
});

module.exports = { test, expect, FENSTER };
