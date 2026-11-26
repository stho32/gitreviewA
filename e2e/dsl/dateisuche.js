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
const trenner = require('../treiber/trenner-oberflaeche.js');
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
    /* ── Lage des Feldes im Kopf der Seitenleiste (R00052, Kriterien 1–3) ── */
    /** Feld, Suchzeile, Feldzeile, Knopf und Seitenleisten-Innenkante mit `getBoundingClientRect`, der Treffer an der rechten
        Feldkante mit `elementFromPoint`. */
    lage: () => suchSeite.lage(page),
    klickAnDieRechteFeldkante: () => suchSeite.klickAnDieRechteFeldkante(page),
    /** „Fenster“ setzt die Größe des Browsers und wartet, bis der Aufbau sie trägt (die Mediengrenze greift beim Zeichnen). */
    fensterSetzen: async fenster => {
      await page.setViewportSize(fenster);
      await trenner.warteAufGroesse(page);
      await trenner.warteAufSpalte(page);
    },
    /** Die Breite der Seitenleiste, wie der Trennzug sie führt (R00034). */
    seitenleistenBreite: async () => Number((await trenner.trennerAngaben(page)).jetzt),
    /** Zieht den Trenner auf die Ziobreite (240–640 px, R00034) und wartet, bis der Trennzug sie führt. */
    seitenleisteZiehenAuf: async ziel => {
      const jetzt = Number((await trenner.trennerAngaben(page)).jetzt);
      await trenner.ziehen(page, ziel - jetzt);
      await expect.poll(async () => Number((await trenner.trennerAngaben(page)).jetzt), `Breite der Seitenleiste ${ziel}`).toBe(ziel);
    },
    /** Die Ergebnis-Spalte einklappen (R00037/R00042) — sie gibt sonst bei 1280 px die breiteste Seitenleiste nicht frei. */
    ergebnisSpalteEinklappen: () => trenner.spaltenKnopfBetatigen(page),
    ergebnisSpalteVerborgen: () => trenner.pruefeErgebnisSpalteVerborgen(page),
    /** `aria-expanded` des Einklapp-Knopfes (R00035): „true“ = die Seitenleiste ist ausgeklappt. */
    einklappKnopfErweitert: () => einkl.knopfAngaben(page).then(angaben => angaben.erweitert),
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
    protokollzeilen: () => gr.stderrZeilen(lauf),
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
