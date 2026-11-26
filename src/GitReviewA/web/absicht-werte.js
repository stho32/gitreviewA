/* gitreviewA — Absicht der KI über dem Diff (R00038): die Commits der gewählten Datei. Reine Funktionen, im Browser und in Node. */
(function (ziel) {
  'use strict';

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

  Object.assign(ziel, { stellenDerDatei, commitsDerDatei });
})(typeof module !== 'undefined' ? module.exports : window);
