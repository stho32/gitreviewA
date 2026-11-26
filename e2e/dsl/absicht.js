'use strict';
// Testsprache „Absicht der KI über dem Diff“ (R00038): Commits und Repos heißen wie in der Vorbereitung der Anforderung
// (Repo Z mit `z1`, `z2`, `z3`; Repo M mit `m1` … `m6`; Umbenennung mit `n1`, `n2`); die Sprache kennt ihre Hashes,
// die Treiber darunter kennen Seite, Prozess, HTTP und git.
const path = require('path');
const { test: basis, expect } = require('./gitreviewa.js');
const seite = require('../treiber/oberflaeche.js');
const blockSeite = require('../treiber/absicht-oberflaeche.js');
const repos = require('../treiber/diff-repos.js');

const FENSTER = { width: 1280, height: 800 };

const VORBEREITUNGEN = {
  'Repo Z': { anlegen: repos.repoZ, commits: ['z1', 'z2', 'z3'] },
};

function absichtSprache(gr, page) {
  let repo;
  let lauf;

  const hash = name => repo.hashes[name];
  const kurz = name => hash(name).slice(0, 7);

  /** Startet gitreviewA im Repo der Vorbereitung und öffnet die Seite; `modus` wählt den Startmodus. */
  async function starten({ vorbereitung = 'Repo Z', commits, modus = 'zusammen', seiteOeffnen = true } = {}) {
    const art = VORBEREITUNGEN[vorbereitung];
    repo = art.anlegen(path.join(gr.eigenerOrdner(), 'repo'));
    const namen = commits || art.commits;
    lauf = await gr.gitreviewAStarten(repo, namen.map(hash));
    if (seiteOeffnen) {
      await page.setViewportSize(FENSTER);
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
    blockIstErstesKind: () => blockSeite.blockIstErstesKind(page),
    blockStehtUeberDerErstenZeile: () => blockSeite.blockStehtUeberDerErstenZeile(page),
    mehrKnopfText: () => blockSeite.mehrText(page),
    weitereAufklappen: () => blockSeite.mehrBetatigen(page),
    nachrichtAufklappen: commit => blockSeite.nachrichtAufklappen(page, kurz(commit)),
    nachrichtZuklappen: commit => blockSeite.nachrichtZuklappen(page, kurz(commit)),
    nachrichtIst: (commit, offen) => blockSeite.nachrichtZustand(page, kurz(commit), offen),
    rumpfStehtImDom: commit => blockSeite.rumpfStehtImDom(page, kurz(commit)),
    rumpf: commit => blockSeite.rumpfText(page, kurz(commit)),
    betreffTitel: commit => blockSeite.betreffTitel(page, kurz(commit)),
    betreffmass: commit => blockSeite.betreffmass(page, kurz(commit)),
    masse: () => blockSeite.masseLesen(page),
    bildlaufSetzen: versatz => blockSeite.bildlaufSetzen(page, versatz),
  };
}

const test = basis.extend({
  absicht: async ({ gr, page }, verwenden) => {
    await verwenden(absichtSprache(gr, page));
  },
});

module.exports = { test, expect };
