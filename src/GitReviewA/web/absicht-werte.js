/* gitreviewA — Absicht der KI über dem Diff (R00038): die Commits der gewählten Datei und ihre Anzeigewerte. Reine Funktionen,
   im Browser und in Node. Die Marken sind die eine Zeichenklasse der Namen (`sichtbarerName`), keine zweite Liste. */
(function (ziel) {
  'use strict';

  const namensWerte = typeof module !== 'undefined' ? require('./dateiliste-werte.js') : window;
  const sichtbarerName = namensWerte.sichtbarerName;
  const nachrichtWerte = typeof module !== 'undefined' ? require('./nachricht-werte.js') : window.gitreviewaNachrichtWerte;
  const nachrichtText = nachrichtWerte.nachrichtText;
  const NACHRICHT_GRENZE = nachrichtWerte.NACHRICHT_GRENZE;

  /** Zugeklappt stehen höchstens fünf Commits; der Rest erscheint auf „k weitere“ (PO Zeile 195). */
  const SICHTBARE_COMMITS = 5;

  /** Die Stellen der gewählten Datei aus der Netto-Liste (`GET /api/zusammen`): dieselben Stellen, aus denen der Diff-Kopf
      seine Herkunft „netto aus …“ nennt (der Server verkettet sie über Umbenennungen, `StellenZu`). Ohne Eintrag leer —
      die Oberfläche rechnet keine Umbenennung nach. */
  function stellenDerDatei(dateien, pfad) {
    const eintrag = dateien.find(datei => datei.pfad === pfad);
    if (eintrag === undefined) {
      return [];
    }
    return eintrag.stellen;
  }

  /** Die Commits, die die Datei ändern, je einmal und in der Reihenfolge der Commit-Leiste: in „Zusammen“ die Commits der
      Stellen, in „Einzeln“ der gewählte Commit. Die Anzeigewerte (Betreff, Rumpf) kommen aus der Commit-Liste. */
  function commitsDerDatei(modus, wahl, stellen, commits) {
    if (modus !== 'zusammen') {
      return commits.filter(commit => commit.hash === wahl.commit);
    }
    const derDatei = new Set(stellen.map(stelle => stelle.commit));
    return commits.filter(commit => derDatei.has(commit.hash));
  }

  /** Die ersten `grenze` Commits und der Rest für den Knopf „k weitere“. */
  function sichtbare(commits, grenze = SICHTBARE_COMMITS) {
    return { sichtbar: commits.slice(0, grenze), weitere: commits.slice(grenze) };
  }

  /** Der Text mit den Marken der einen Zeichenklasse, je Zeile: der Zeilenumbruch bleibt Umbruch (R00038, Sicherheit). */
  function markiert(text) {
    return text.split('\n').map(sichtbarerName).join('\n');
  }

  Object.assign(ziel, { stellenDerDatei, commitsDerDatei, sichtbare, nachrichtText, markiert, SICHTBARE_COMMITS, NACHRICHT_GRENZE });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaAbsichtWerte = window.gitreviewaAbsichtWerte || {}));

