/* gitreviewA — Umbruchstellen der Dateinamen (R00056, Karte #66): die eine Stelle, die aus dem Anzeigenamen eines Pfades die
   Abschnitte macht, an denen ein `<wbr>` stehen darf — nach `/`, `-`, `_` und `.`, nie innerhalb einer Marke `⟨…⟩` (R00011:
   eine Marke wird nie geteilt, `textContent` bleibt Zeichen für Zeichen unverändert). Reine Funktion, im Browser und in Node.
   Datei- und Ordnerzeile der Dateiliste bauen ihr Pfad-Element aus denselben Abschnitten. */
(function (ziel) {
  'use strict';

  /** Die Zeichen, nach denen der Pfad brechen darf (PO Zeile 279): `/` und `-` kennt der Browser von sich aus, `_` und `.`
      bietet er nicht als Umbruchstelle an — dort setzt die Oberfläche ein `<wbr>`. */
  const TRENNER = '/-_.';

  /** Die Klammern der Anzeigenamen-Marke (R00011): `⟨U+202E⟩`, `⟨0xFF⟩`. */
  const MARKE_AUF = '⟨';
  const MARKE_ZU = '⟩';

  /** Zerlegt `anzeigename` an den Trennern in Abschnitte; `umbruchDanach` sagt, ob hinter dem Abschnitt ein `<wbr>` steht.
      Die Texte aneinandergefügt sind Zeichen für Zeichen der Anzeigename; in einer Marke `⟨…⟩` entsteht keine Umbruchstelle. */
  function abschnitte(anzeigename) {
    const teile = [];
    let inMarke = false;
    let puffer = '';
    for (const zeichen of anzeigename) {
      puffer += zeichen;
      if (zeichen === MARKE_AUF) {
        inMarke = true;
      } else if (zeichen === MARKE_ZU) {
        inMarke = false;
      } else if (!inMarke && TRENNER.includes(zeichen)) {
        teile.push({ text: puffer, umbruchDanach: true });
        puffer = '';
      }
    }
    if (puffer !== '') {
      teile.push({ text: puffer, umbruchDanach: false });
    }
    return teile;
  }

  Object.assign(ziel, { abschnitte });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaUmbruchStellen = window.gitreviewaUmbruchStellen || {}));
