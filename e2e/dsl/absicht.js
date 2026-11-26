'use strict';
// Testsprache „Absicht der KI über dem Diff“ (R00038): Commits und Repos heißen wie in der Vorbereitung der Anforderung
// (Repo Z mit `z1`, `z2`, `z3`; Repo M mit `m1` … `m6`; Umbenennung mit `n1`, `n2`); die Sprache kennt ihre Hashes,
// die Treiber darunter kennen Seite, Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const diffSeite = require('../treiber/diff-oberflaeche.js');
const blockSeite = require('../treiber/absicht-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');

const FENSTER = { width: 1280, height: 800 };

const VORBEREITUNGEN = {
  'Repo Z': { anlegen: repos.repoZ, commits: ['z1', 'z2', 'z3'] },
  Rumpf: { anlegen: repos.repoMitRumpf, commits: ['p', 'q', 'r'] },
  'Repo A': { anlegen: repos.repoA, commits: ['q', 'p'] },
  'Große Diffs': { anlegen: repos.repoGross, commits: ['w'] },
  'Repo M': { anlegen: repos.repoAbsicht, commits: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] },
  Umbenennung: { anlegen: repos.repoUmbenennung, commits: ['n1', 'n2'] },
};

function absichtSprache(gr, page) {
  let repo;
  let lauf;
  let dialogePruefen;
  const seitenfehler = [];

  const hash = name => repo.hashes[name];
  const kurz = name => hash(name).slice(0, 7);

  /** Startet gitreviewA im Repo der Vorbereitung und öffnet die Seite; `modus` wählt den Startmodus, `fenster` die Größe. */
  async function starten({ vorbereitung = 'Repo Z', commits, modus = 'zusammen', seiteOeffnen = true, fenster = FENSTER } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    const namen = commits || art.commits;
    lauf = await gr.gitreviewAStarten(repo, namen.map(hash));
    if (seiteOeffnen) {
      await page.setViewportSize(fenster);
      dialogePruefen = seite.dialogeZaehlen(page);
      page.on('pageerror', fehler => seitenfehler.push(fehler.message));
      await gr.oberflaecheOeffnen(page, lauf, modus);
    }
    return lauf;
  }

  /** Die Zeilen des Blocks: Kurz-Hashes der genannten Commits in dieser Reihenfolge. */
  const blockZeigt = namen => blockSeite.zeilenSindKurz(page, namen.map(kurz));

  return {
    starten,
    lauf: () => lauf,
    hash: name => hash(name),
    kurz,
    dateiAnsehen: name => seite.dateiWaehlen(page, name),
    modusWaehlen: modus => seite.modusWaehlen(page, modus),
    commitAnsehen: commit => seite.commitWaehlen(page, kurz(commit)),

    blockZeigt,
    blockZeigtMitBetreff: erwartet => blockSeite.zeilenSind(page, erwartet),
    keinBlock: () => blockSeite.keinBlock(page),
    rollbereichVerborgen: () => blockSeite.rollbereichVerborgen(page),
    blockIstErstesKind: () => blockSeite.blockIstErstesKind(page),
    blockStehtUeberDerErstenZeile: () => blockSeite.blockStehtUeberDerErstenZeile(page),
    mehrKnopfText: () => blockSeite.mehrText(page),
    weitereAufklappen: () => blockSeite.mehrBetatigen(page),
    nachrichtAufklappen: commit => blockSeite.nachrichtAufklappen(page, kurz(commit)),
    nachrichtKnopfAnzahl: commit => blockSeite.nachrichtKnopfAnzahl(page, kurz(commit)),
    nachrichtZuklappen: commit => blockSeite.nachrichtZuklappen(page, kurz(commit)),
    nachrichtIst: (commit, offen) => blockSeite.nachrichtZustand(page, kurz(commit), offen),
    rumpfStehtImDom: commit => blockSeite.rumpfStehtImDom(page, kurz(commit)),
    rumpf: commit => blockSeite.rumpfText(page, kurz(commit)),
    betreffTitel: commit => blockSeite.betreffTitel(page, kurz(commit)),
    betreffmass: commit => blockSeite.betreffmass(page, kurz(commit)),
    masse: () => blockSeite.masseLesen(page),
    bildlaufSetzen: versatz => blockSeite.bildlaufSetzen(page, versatz),
    blockStehtUeberDemInhalt: () => blockSeite.blockStehtUeberDemInhalt(page),
    fremdElementeImBlock: () => blockSeite.fremdElementeImBlock(page),
    zeilenmasse: () => blockSeite.zeilenmasse(page),
    ersteDiffzeileSichtbar: () => blockSeite.ersteDiffzeileSichtbar(page),
    diffFakeStellen: pfad => blockSeite.diffFakeStellen(page, pfad),
    zustand: () => blockSeite.zustandLesen(page),
    /** Der Browser hat keinen Dialog geöffnet (DOM-Sicherheit, R00038 Kriterium 5). */
    keineDialoge: () => dialogePruefen(),
    /** Die Konsole der Seite hat keinen Fehler gemeldet (`pageerror`, Auftrag). */
    keineSeitenfehler: () => expect(seitenfehler, 'Seitenfehler der Konsole').toEqual([]),

    /** Die Herkunft im Diff-Kopf (R00012): „netto aus …“ bzw. „je Commit, nicht netto — …“. */
    herkunft: text => diffSeite.pruefeHerkunft(page, text),
    /** Der Diff meldet `text` (Meldungszustand) bzw. als Fehler. */
    diffMeldet: (pfad, text) => diffSeite.pruefeMeldung(page, pfad, text, false),
    diffMeldetFehler: (pfad, text) => diffSeite.pruefeMeldung(page, pfad, text, true),
    /** Wartet, bis die Dateiliste steht (die Dateien des Commits gelesen sind). */
    dateilisteWarten: () => page.locator('#datei-zeilen .datei-zeile').first().waitFor(),
    commitObjektEntfernen: name => gr.commitObjektEntfernen(repo, hash(name)),
    /** Antworten des Diffs und der Bilder als Fake (Meldungs- und Bildzustände). */
    diffAntwortErsetzen: optionen => diffSeite.diffAntwortErsetzen(page, optionen),
    bildAntwortErsetzen: optionen => diffSeite.bildAntwortErsetzen(page, optionen),
    bilderLesen: () => diffSeite.bilderLesen(page),
    /** Anzeige-Wechsel (R00008/R00023/R00026/R00032/R00027) und Lücken aufklappen (R00026). */
    ansichtWaehlen: name => diffSeite.ansichtWaehlen(page, name),
    anordnungWaehlen: name => diffSeite.menueWaehlen(page, name),
    umbruchUmschalten: () => diffSeite.umbruchUmschalten(page),
    leerraumUmschalten: () => diffSeite.leerraumUmschalten(page),
    suchen: text => seite.sucheSuchen(page, text),
    luecken: () => diffSeite.lueckenLesen(page),
    lueckeAufklappen: (nummer, ganz = false) => diffSeite.lueckeAufklappen(page, nummer, ganz),
    /** Zählt die Anfragen der Seite je Pfad — für „der Block löst keine Anfrage aus“ (R00038). */
    anfragenSammeln: () => {
      const gezaehlt = [];
      page.on('request', anfrage => gezaehlt.push(new URL(anfrage.url()).pathname));
      return gezaehlt;
    },
  };
}

const test = basis.extend({
  absicht: async ({ gr, page }, verwenden) => {
    await verwenden(absichtSprache(gr, page));
  },
});

module.exports = { test, expect };
