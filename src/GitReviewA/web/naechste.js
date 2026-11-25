/* gitreviewA — Nächste ungeprüfte (R00028): der Knopf in der Werkzeugzeile der Dateiliste springt von der aktuellen Wahl zur
   nächsten ungeprüften Stelle — in „Zusammen“ je Datei, in „Einzeln“ je Stelle (Commit und Datei), über Commits hinweg, mit Umlauf;
   abgehakte und gesperrte Stellen werden übersprungen. Die gefundene Zeile wird gewählt (derselbe Weg wie ein Klick: `datei-gewaehlt`
   lädt den Diff, in „Einzeln“ wechselt vorher der Commit mit), sie kommt in den Blick; der Fokus bleibt auf dem Knopf, damit ein
   weiterer Druck weitergeht. Gelesen wird nur die schon geladene Liste (`dateiliste-gezeichnet`) und der Stand des Hakens — kein
   neuer Serverweg, kein neuer `git`-Aufruf, kein Nachladen. Die Suche selbst rechnet `naechste-werte.js`. */
(function () {
  'use strict';

  /** `sicht`: die zuletzt gezeichnete Liste mit Modus und Commit; `ausstehend`: das Ziel, dessen Commit erst noch gezeigt werden muss. */
  const zustand = { sicht: null, ausstehend: null };

  function init() {
    const knopf = document.getElementById('naechste-ungepruefte');
    if (knopf) {
      knopf.addEventListener('click', springen);
    }
    document.addEventListener('dateiliste-gezeichnet', ereignis => {
      zustand.sicht = { modus: ereignis.detail.modus, commit: ereignis.detail.commit, dateien: ereignis.detail.dateien };
      springeAusstehend();
    });
    document.addEventListener('modus-gewechselt', () => {
      zustand.ausstehend = null;
    });
  }

  /* ── Der Sprung ── */

  function springen() {
    const eintraege = eintraegeJetzt();
    const index = eintraege === null ? -1 : naechsteWerte().naechster(eintraege, aktuelleStelle());
    if (index === -1) {
      return;
    }
    springeZu(eintraege[index]);
  }

  function springeZu(ziel) {
    if (ziel.art !== 'stelle') {
      waehleZeile(ziel.pfad);
      return;
    }
    if (ziel.commit !== (zustand.sicht ? zustand.sicht.commit : null)) {
      zustand.ausstehend = { commit: ziel.commit, pfad: ziel.pfad };
      wechsleCommit(ziel.commit);
      return;
    }
    waehleZeile(ziel.pfad);
  }

  /**
   * Die nächste Zeile wartet auf ihre Liste: der Commit ist gewechselt, gezeichnet wird sie erst danach. Der Klick kommt erst nach dem
   * laufenden Zeichnen — `dateiliste.js` hebt nach dem Zeichnen die Wahl auf (`wahl-aufgehoben`), die sonst gerade diese Wahl samt
   * laufender Diff-Ladung wieder verwerfen würde.
   */
  function springeAusstehend() {
    const ausstehend = zustand.ausstehend;
    if (ausstehend === null || zustand.sicht.commit !== ausstehend.commit) {
      return;
    }
    zustand.ausstehend = null;
    queueMicrotask(() => waehleZeile(ausstehend.pfad));
  }

  /** Die Wahl über den vorhandenen Weg: ein Klick auf die Zeile der Dateiliste (I0027) — keine zweite Wahl-Logik. */
  function waehleZeile(pfad) {
    const zeile = zeileFuer(pfad);
    if (zeile === null) {
      return;
    }
    zeile.click();
    zeile.scrollIntoView({ block: 'nearest' });
  }

  function zeileFuer(pfad) {
    for (const zeile of document.querySelectorAll('#datei-zeilen .datei-zeile')) {
      if (zeile.dataset.pfad === pfad) {
        return zeile;
      }
    }
    return null;
  }

  /** In „Einzeln“ trägt jede Stelle ihren Commit; er wechselt über die vorhandene Commit-Leiste (I0027, B1104). */
  function wechsleCommit(hash) {
    for (const zeile of document.querySelectorAll('#commit-liste .commit-zeile')) {
      if (zeile.dataset.hash === hash) {
        zeile.querySelector('.commit-wahl').click();
        return;
      }
    }
  }

  /* ── Einträge und Stand ── */

  /** Die Einträge der Sicht mit Zustand; `null`, solange Liste oder Stand noch fehlen. */
  function eintraegeJetzt() {
    const sicht = zustand.sicht;
    const haken = window.gitreviewaHaken;
    if (!haken || !haken.istLesbar()) {
      return null;
    }
    const stand = {
      istAbgehakt: (commit, pfad) => haken.istAbgehakt(commit, pfad),
      istGesperrt: (commit, pfad) => haken.sperrgrund(commit, pfad) !== '',
    };
    if (window.gitreviewaModus.istZusammen()) {
      if (sicht === null || sicht.modus !== window.gitreviewaModusWerte.ZUSAMMEN) {
        return null;
      }
      return naechsteWerte().eintraege(window.gitreviewaModusWerte.ZUSAMMEN, sicht.dateien, stand);
    }
    // In „Einzeln“ sind die Stellen des Stands die Einträge — alle Stellen der Auswahl, also über Commits hinweg.
    return naechsteWerte().eintraege(window.gitreviewaModusWerte.EINZELN, haken.stellen(), stand);
  }

  /** Die Stelle der aktuellen Wahl; ohne Wahl `null` (dann beginnt die Suche beim ersten Eintrag). */
  function aktuelleStelle() {
    const liste = window.gitreviewaDateiliste;
    const wahl = liste ? liste.gewaehlt() : null;
    return wahl === null ? null : { pfad: wahl.pfad, commit: wahl.commit };
  }

  function naechsteWerte() {
    return window.gitreviewaNaechsteWerte;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
