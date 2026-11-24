'use strict';
// Testsprache „Syntaxhervorhebung im Diff“ (R00007): Repos F und L heißen wie in der User Story; „wählen“ ist der Klick in der
// Dateiliste und wartet, bis die Färbung der Datei abgeschlossen ist. Rollen heißen wie in der Anforderung.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const farbe = require('../treiber/farb-oberflaeche.js');
const repos = require('../treiber/farb-repos.js');

const FENSTER = { width: 1280, height: 800 };
const ZEILE_FRIST_MS = 1000;

const VORBEREITUNGEN = {
  'Repo F': { anlegen: repos.repoF, commits: ['f', 'e'] },
  'Repo L': { anlegen: repos.repoL, commits: ['l'] },
};

/** Ausfälle der Färbung (Kriterium 6), je vor dem Laden der Seite eingerichtet. */
const AUSFAELLE = {
  'Prism nicht abrufbar': farbe.prismNichtAbrufbar,
  'ohne Worker': farbe.ohneWorker,
  'Färbung wirft': farbe.prismWirft,
  'Worker antwortet verzögert': farbe.workerAntwortenZurueckhalten,
};

function farbSprache(gr, page) {
  let lauf;
  let meldungen;
  let anfragen;
  let dialogePruefen;
  let ausfall = null;
  let gewaehlterPfad = null;

  /** Startet gitreviewA im Repo der Vorbereitung und öffnet die Seite (Fenster 1280 × 800); `ausfall` aus AUSFAELLE. */
  async function starten({ vorbereitung = 'Repo F', ausfall: gewaehlterAusfall = null } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    const repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    lauf = await gr.gitreviewAStarten(repo, art.commits.map(name => repo.hashes[name]));
    ausfall = gewaehlterAusfall;
    meldungen = await farbe.mitschriftEinrichten(page);
    anfragen = farbe.anfragenMitschreiben(page);
    if (ausfall) {
      await AUSFAELLE[ausfall](page);
    }
    await page.setViewportSize(FENSTER);
    dialogePruefen = seite.dialogeZaehlen(page);
    await gr.oberflaecheOeffnen(page, lauf);
  }

  async function waehlen(pfad) {
    await seite.dateiMitPfadWaehlen(page, pfad);
    gewaehlterPfad = pfad;
    return farbe.farbeAbwarten(page, pfad);
  }

  /** Ohne gewählte Datei gibt es nichts zu färben und nichts abzuwarten. */
  async function ansichtWaehlen(name) {
    await diffSeite.ansichtWaehlen(page, name);
    if (!gewaehlterPfad) {
      return null;
    }
    return farbe.farbeAbwarten(page, gewaehlterPfad);
  }

  return {
    starten,
    /** Wählt die Datei und wartet auf das Ende ihrer Färbung; liefert `ja` oder `nein`. */
    waehlen,
    /** Schaltet die Ansicht um und wartet auf das Ende der neuen Färbung. */
    ansichtWaehlen,
    ansichtIst: name => diffSeite.pruefeAnsicht(page, name),
    farbschema: schema => farbe.farbschemaSetzen(page, schema),

    /** `zeile` = `{kontext|plus|minus: text}`; `stelle` trägt die Rolle (alle ihre Zeichen). */
    traegt: (zeile, stelle, rolle, vorkommen) => farbe.pruefeRolle(page, zeile, stelle, rolle, vorkommen),
    traegtKeine: (zeile, stelle, vorkommen) => farbe.pruefeRolle(page, zeile, stelle, null, vorkommen),
    /** Kopf, Vorzeichen und Nummern tragen keine Rolle; Klassen nur aus den sieben Rollen. */
    nurDerTextTraegtRollen: () => farbe.pruefeRollenNurImText(page),
    istUngefaerbt: () => farbe.pruefeUngefaerbt(page),
    keineMeldung: () => farbe.pruefeKeineMeldung(page),
    textWieVorDerFarbe: () => farbe.pruefeTextWieVorDerFarbe(page),
    zeilentexte: () => farbe.zeilentexte(page),
    zeilenSind: anzahl => farbe.pruefeZeilenanzahl(page, anzahl),
    diffZeigt: erwartet => diffSeite.pruefeDiff(page, erwartet),

    /** Zählt ab hier, ob die Färbung neu läuft und endet. */
    farbeMitzaehlen: () => farbe.farbzustaendeLeeren(page),
    farbeLiefNeu: () => farbe.pruefeFarbeLiefNeu(page),

    rollenfarbenSindUnterscheidbar: async () => farbe.pruefeRollenfarben(await farbe.rollenfarbenMessen(page)),
    rollenfarbe: async (art, rolle) => (await farbe.rollenfarbenMessen(page))[art].rollen[rolle].farbe,

    seiteBleibtStill: async () => {
      farbe.pruefeKonsoleLeer(meldungen, ausfall === 'Prism nicht abrufbar');
      if (ausfall === 'ohne Worker') {
        await farbe.pruefeOhneWorker(page);
      }
    },
    nichtsFriertEin: () => farbe.pruefeKeineLangeAufgabeSeitText(page),
    fremderTextBleibtText: async () => {
      await farbe.pruefeKeinElement(page, ['img', 'b', 'script']);
      await seite.pruefeKeineFormatierung(page);
      await dialogePruefen();
    },
    keinPrismAufDerSeite: () => farbe.pruefeKeinPrismAufDerSeite(page),
    nurEigenerHost: () => farbe.pruefeNurEigenerHost(anfragen, lauf.adresse),
    umbruchUmschalten: () => diffSeite.umbruchUmschalten(page),

    /** Zeile `neu` binnen 1 s nach dem Klick auf `datei` (Kriterium 9); liefert den Messwert. */
    zeileRechtzeitigNachKlick: async (datei, erwartet) => {
      const dauerMs = await diffSeite.pruefeZeileBinnenNachKlick(page, () => seite.dateiMitPfadWaehlen(page, datei), erwartet, ZEILE_FRIST_MS);
      gewaehlterPfad = datei;
      return dauerMs;
    },
    farbeAbgeschlossen: () => farbe.farbeAbwarten(page, gewaehlterPfad),

    /** Mit „Worker antwortet verzögert“: wählen bzw. umschalten, ohne auf das Ende der Färbung zu warten. */
    waehlenOhneWarten: async pfad => {
      await seite.dateiMitPfadWaehlen(page, pfad);
      gewaehlterPfad = pfad;
    },
    ansichtWaehlenOhneWarten: name => diffSeite.ansichtWaehlen(page, name),
    antwortenGehalten: anzahl => farbe.gehalteneAntwortenAbwarten(page, anzahl),
    antwortFreigeben: nummer => farbe.antwortFreigeben(page, nummer),
    farbeLaeuftOhneRolle: () => farbe.pruefeFarbeLaeuftOhneRolle(page),
  };
}

const test = basis.extend({
  farbe: async ({ gr, page }, verwenden) => {
    await verwenden(farbSprache(gr, page));
  },
});

module.exports = { test, expect };
