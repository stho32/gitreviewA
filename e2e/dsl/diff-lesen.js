'use strict';
// Testsprache „Diff einer Datei lesen“ (R00004, R00013): Commits und Repos heißen wie in der User Story (A mit p, q, s; M mit m; U mit u; N mit b, n, w);
// die Sprache kennt ihre Hashes, die Treiber darunter kennen Seite, Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const schnittstelle = require('../treiber/diff-schnittstelle.js');
const beobachtung = require('../treiber/beobachtung.js');
const repos = require('../treiber/diff-repos.js');
const fremdeNamen = require('../treiber/fremde-namen-repo.js');

const FENSTER = { width: 1280, height: 800 };
const ZEILE_FRIST_MS = 1000;

const VORBEREITUNGEN = {
  'Repo A': { anlegen: repos.repoA, commits: ['q', 'p'] },
  'Diff-Programme': { anlegen: repos.repoAMitDiffProgrammen, commits: ['q', 'p'] },
  'fremde Einstellungen': { anlegen: repos.repoAMitFremdenEinstellungen, commits: ['q', 'p'] },
  'Start im Unterordner src': { anlegen: repos.repoAAusUnterordner, commits: ['q', 'p'] },
  'Submodul als Log': { anlegen: repos.repoMitSubmodulAlsLog, commits: ['n'] },
  'versteckter Code': { anlegen: repos.repoMitVerstecktemCode, commits: ['v'] },
  'Binärausgabe des Repos': { anlegen: repos.repoMitBinaerausgabe, commits: ['w'] },
  Merge: { anlegen: repos.repoM, commits: ['m'] },
  'Bidi im Dateinamen': { anlegen: repos.repoMitBidiPfad, commits: ['b'] },
  'große Binärdateien': { anlegen: repos.repoK, commits: ['k'] },
  '20 000 Zeilen': { anlegen: repos.repoU, commits: ['u'] },
  '20 000 Zeilen, eine geändert': { anlegen: repos.repoUMitV, commits: ['v'] },
  'Große Diffs': { anlegen: repos.repoGross, commits: ['w'] },
  'Repo N': { anlegen: fremdeNamen.repoN, commits: ['n', 'b'] },
  // R00026: `w2` ändert Leerraum und entfernte Stellen, `w1` legt an — die Auswahl ist `w2` zuerst.
  'Repo W': { anlegen: repos.repoW, commits: ['w2', 'w1'] },
  // R00026-Nacharbeit (B1): `c2` ändert in `code.js`/`code.txt` die Zeilen 5 und 35 — gefärbt bzw. ungefärbt.
  'Repo C': { anlegen: repos.repoC, commits: ['c2', 'c1'] },
};

function diffSprache(gr, page) {
  let repo;
  let lauf;
  let zaehler;
  let dialogePruefen;
  let anfragen = [];
  const hash = name => repo.hashes[name];
  const kurz = name => hash(name).slice(0, 7);

  /** Startet gitreviewA im Repo der Vorbereitung und öffnet die Seite (Fenster 1280 × 800). */
  async function starten({ vorbereitung = 'Repo A', commits, verbose = false, seiteOeffnen = true } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    zaehler = beobachtung.gitZaehlerAnlegen(gr.eigenerOrdner());
    let namen = commits;
    if (!namen) {
      namen = art.commits;
    }
    const zusatz = [];
    if (verbose) {
      zusatz.push('--verbose');
    }
    lauf = await gr.gitreviewAStarten(repo, namen.map(hash), { zusatz, pfadVorne: zaehler.ordner });
    if (seiteOeffnen) {
      await page.setViewportSize(FENSTER);
      dialogePruefen = seite.dialogeZaehlen(page);
      await gr.oberflaecheOeffnen(page, lauf);
    }
  }

  /** `kennung`: Name eines Commits, `q kurz` für dessen erste 7 Zeichen oder ein Revisionsausdruck wie `HEAD`; Standard ist `q`. */
  function kennungAlsText(kennung) {
    if (kennung === 'q kurz') {
      return kurz('q');
    }
    if (kennung in repo.hashes) {
      return hash(kennung);
    }
    return kennung;
  }

  return {
    starten,
    commitGewaehlt: commit => seite.pruefeGewaehlterCommit(page, kurz(commit)),
    commitAnsehen: commit => seite.commitWaehlen(page, kurz(commit)),
    dateiAnsehen: name => seite.dateiWaehlen(page, name),
    /** Die `nummer`-te Zeile (ab 0) mit genau diesem Pfad, auch wenn zwei Zeilen ihn tragen oder er unsichtbare Zeichen enthält (R00013). */
    dateizeileAnsehen: (pfad, nummer = 0) => seite.dateizeileMitPfadWaehlen(page, pfad, nummer),
    diffNichtLesbar: text => diffSeite.pruefeFehlerOhneZeilen(page, text),
    dateienSind: async namen => {
      await expect.poll(async () => (await seite.dateilisteLesen(page)).map(eintrag => eintrag.name).sort()).toEqual([...namen].sort());
    },

    diffZeigt: erwartet => diffSeite.pruefeDiff(page, erwartet),
    /** Der Diff des Submoduls `pfad` zeigt den Wechsel seines Zeigers vom Commit `von` auf den Commit `nach`. */
    submodulWechselZeigt: (pfad, von, nach) => diffSeite.pruefeDiff(page, {
      pfad,
      zeilen: [{ kopf: '@@ -1 +1 @@' }, { minus: `Subproject commit ${hash(von)}`, alt: 1 }, { plus: `Subproject commit ${hash(nach)}`, neu: 1 }],
    }),
    binaerMeldet: (pfad, grund) => diffSeite.pruefeBinaer(page, pfad, grund),
    alsTextZeigen: () => diffSeite.alsTextZeigen(page),
    zugeklappt: (pfad, meldung) => diffSeite.pruefeZugeklappt(page, pfad, meldung),
    trotzdemLaden: () => diffSeite.trotzdemLaden(page),
    /** Wählt `datei` und misst vom Klick bis zum Zuklapphinweis `meldung`; liefert den Messwert. */
    zugeklapptNachKlick: (datei, pfad, meldung, fristMs = 1000) => diffSeite.zugeklapptRechtzeitigNachKlick(page, () => seite.dateiWaehlen(page, datei), pfad, meldung, fristMs),
    /** Schaltet auf `ansicht` und misst bis zum Zuklapphinweis `meldung`; liefert den Messwert. */
    zugeklapptNachUmschalten: (ansicht, pfad, meldung, fristMs = 1000) => diffSeite.zugeklapptRechtzeitigNachAktion(page, () => diffSeite.ansichtWaehlen(page, ansicht), pfad, meldung, fristMs),
    zeileZeigt: (neu, text) => diffSeite.pruefeZeile(page, neu, text),
    alsTextGelesen: anzahl => schnittstelle.pruefeTextAufrufe(zaehler, anzahl),
    diffMeldet: (pfad, text) => diffSeite.pruefeMeldung(page, pfad, text, false),
    diffMeldetFehler: (pfad, text) => diffSeite.pruefeMeldung(page, pfad, text, true),
    fordertZurWahlAuf: () => diffSeite.pruefeAufforderungZurWahl(page),
    umbruchUmschalten: () => diffSeite.umbruchUmschalten(page),
    /** Umschalter „Leerraum“ (R00026): klicken, per Tastatur umschalten, die Stellung prüfen. */
    leerraumUmschalten: () => diffSeite.leerraumUmschalten(page),
    leerraumPerTastaturUmschalten: () => diffSeite.leerraumPerTastaturUmschalten(page),
    leerraumIst: stellung => diffSeite.pruefeLeerraumStellung(page, stellung),
    /** Merkt jede Diff-Anfrage; `anfragenEnthalten` prüft, dass eine mit diesen Werten dabei war (R00026). */
    anfragenBeobachten: async () => {
      anfragen = await diffSeite.diffAnfragenBeobachten(page);
    },
    anfragenEnthalten: async erwartet => {
      await expect.poll(() => anfragen.filter(anfrage => anfrage.pfad === erwartet.pfad && anfrage.leerraum === erwartet.leerraum).length).toBeGreaterThan(0);
    },
    /** Beantwortet die Diff-Anfrage in der Stellung `leerraum` mit einem Ersatz-Patch (oder einem Fehler), wahlweise verzögert. */
    antwortErsetzen: optionen => diffSeite.diffAntwortErsetzen(page, optionen),
    /** Beantwortet die erste Anfrage `umfang=ganz` für `pfad` mit `status`, jede weitere mit `patch` (Fehlerpfad, R00026). */
    ganzErstScheitern: (pfad, status, patch) => diffSeite.ganzDateiErstScheitern(page, pfad, status, patch),
    /** Die Lücken der gezeigten Ansicht (R00026), ihr Betätigen, ihre Meldung und die gezeichneten Zeilen. */
    luecken: () => diffSeite.lueckenLesen(page),
    lueckeAufklappen: (nummer, ganz = false, perTastatur = false) => diffSeite.lueckeAufklappen(page, nummer, ganz, perTastatur),
    lueckeMeldet: (nummer, text) => diffSeite.lueckeMeldet(page, nummer, text),
    /** Jede Zeile mit Nummer neu `von`…`bis` trägt ihren eigenen Text und ihren eigenen VS-Code-Link (R00021/R00026). */
    zeilenMitEigenemLink: (von, bis, text) => diffSeite.pruefeZeilenMitEigenemLink(page, von, bis, text),
    zeilenzahl: () => diffSeite.zeilenZaehlen(page),
    hatZeile: neu => diffSeite.zeileVorhanden(page, neu),
    zeilentext: neu => diffSeite.zeilentextLesen(page, neu),
    anfragenGezaehlt: () => anfragen,
    /** Lädt die Seite neu (Browser-Eigenes): die Wahl von „Umbruch“, „Ansicht“ und „Leerraum“ lebt nur im Speicher. */
    neuLaden: () => page.reload(),
    langeZeileEinzeilig: (neu, text) => diffSeite.pruefeEinzeilig(page, neu, text),
    langeZeileUmbrochen: (neu, text) => diffSeite.pruefeUmbrochen(page, neu, text),
    fremderTextBleibtText: async () => {
      await seite.pruefeKeineFormatierung(page);
      await dialogePruefen();
    },
    antwortVerzoegern: pfad => diffSeite.diffAntwortVerzoegern(page, pfad),
    ganzeDateiVerzoegern: pfad => diffSeite.diffAntwortVerzoegern(page, pfad, 'ganz'),
    /** Der Server meldet für `pfad` den Ausgang „zu groß“ mit `meldung` (über der Ausgabegrenze); `umfang` grenzt ein. */
    antwortZuGross: (pfad, meldung, umfang = null) => diffSeite.diffAntwortZuGross(page, pfad, meldung, umfang),
    /** Knotenzahl je Block des gezeigten Diffs. */
    blockKnoten: () => diffSeite.blockKnoten(page),
    warteAufFarbe: () => diffSeite.warteAufFarbe(page),
    /** Aufgaben des Hauptfadens über 150 ms beim Scrollen durch den gezeigten Diff. */
    langeAufgabenBeimScrollen: (schritte = 24) => diffSeite.langeAufgabenBeimScrollen(page, schritte),

    /** Ansicht „nur Änderungen“ oder „ganze Datei“ (R00008). */
    ansichtWaehlen: name => diffSeite.ansichtWaehlen(page, name),
    ansichtPerTastaturWechseln: () => diffSeite.ansichtPerTastaturWechseln(page),
    ansichtIst: name => diffSeite.pruefeAnsicht(page, name),
    dateiGewaehlt: name => seite.pruefeGewaehlteDateien(page, [name]),
    zeilenfarben: () => diffSeite.zeilenfarbenLesen(page),
    zeilenfarbenSind: farben => diffSeite.pruefeZeilenfarben(page, farben),
    /** Kontextzeile binnen 1 s nach dem Umschalten auf `ansicht` bzw. nach dem Klick auf `datei`; liefert den Messwert. */
    kontextzeileRechtzeitigNachUmschalten: (ansicht, erwartet) => diffSeite.pruefeKontextzeileBinnen(page, () => diffSeite.ansichtWaehlen(page, ansicht), erwartet, ZEILE_FRIST_MS),
    kontextzeileRechtzeitigNachKlick: (datei, erwartet) => diffSeite.pruefeKontextzeileBinnen(page, () => seite.dateiWaehlen(page, datei), erwartet, ZEILE_FRIST_MS),

    diffsGelesen: (commit, anzahl) => schnittstelle.pruefeDiffsGelesen(lauf, hash(commit), anzahl),
    commitObjektEntfernen: commit => gr.commitObjektEntfernen(repo, hash(commit)),
    fehlerProtokolliertFuer: (commit, pfad) => schnittstelle.pruefeFehlerzeileMit(lauf, hash(commit), pfad),
    ergebnisBleibtLeer: () => beobachtung.pruefeStdoutLeer(lauf),

    keinDiffProgrammGelaufen: () => {
      expect(repos.markerVorhanden(repo.ordner), 'Markerdateien der Diff-Programme').toEqual([]);
      repos.diffProgrammOhneSchutzStarten(repo.ordner, hash('q'));
      expect(repos.markerVorhanden(repo.ordner), 'Kontrolle: git show ohne Schutz startet textconv').toContain('marker-textconv');
    },

    diffAnfrageAbgewiesen: ({ kennung = 'q', pfad }) => schnittstelle.pruefeDiffAntwort(lauf, { hash: kennungAlsText(kennung), pfad, status: 404 }),
    diffAnfrageOhnePfadAbgewiesen: () => schnittstelle.pruefeDiffAntwort(lauf, { hash: hash('q'), pfad: undefined, status: 400 }),
    diffAnfrageBeantwortet: async ({ pfad }) => {
      await schnittstelle.pruefeDiffAntwort(lauf, { hash: hash('q'), pfad, status: 200 });
      schnittstelle.pruefeEinDiffAufruf(zaehler);
    },
    keinDiffGelesen: () => schnittstelle.pruefeKeinDiffAufruf(zaehler),
    keineDateiAngelegt: name => beobachtung.pruefeDateiFehlt(repo.ordner, name),

    /** Die Seite ist `fristMs` nach dem Klick auf „Als Text zeigen“ bedienbar: Zeilen oder „Trotzdem laden“ stehen, und ein Klick auf `andereDatei` wirkt. */
    alsTextBleibtBedienbar: (datei, andereDatei, fristMs) => diffSeite.pruefeBedienbarNachAlsText(page, name => seite.dateiWaehlen(page, name), datei, andereDatei, fristMs),
    /** Zeile `neu` binnen 1 s nach dem Klick auf `datei`; liefert den Messwert. */
    zeileRechtzeitigNachKlick: (datei, erwartet) => diffSeite.pruefeZeileBinnenNachKlick(page, () => seite.dateiWaehlen(page, datei), erwartet, ZEILE_FRIST_MS),
  };
}

const test = basis.extend({
  diff: async ({ gr, page }, verwenden) => {
    await verwenden(diffSprache(gr, page));
  },
});

module.exports = { test, expect };
