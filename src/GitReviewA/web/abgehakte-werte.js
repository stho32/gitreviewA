/* gitreviewA — Werte des Ausblendens Abgehakter (R00029): die Sicht aus den Einträgen der gezeigten Liste und dem Haken-Zustand,
   dem Muster-Abgleich (R00025) und dem Schalterzustand; dazu der Zählertext mit beiden Anteilen und die Meldung des Leerfalls.
   Reine Funktionen, im Browser und in Node. Kein git, kein Server; der Muster-Abgleich kommt aus `ausblenden-werte.js` (eine Regel).

   Ein Sichteintrag ist `{ pfad, abgehakt, gesperrt }`: in „Zusammen“ eine Datei (abgehakt, wenn alle ihre Stellen abgehakt sind),
   in „Einzeln“ eine Stelle (Commit und Datei). „abgehakt“ rechnet der Aufrufer mit `haken-werte.js`; gesperrte Stellen (R00014)
   sind nie abgehakt und werden hier nie per Haken ausgeblendet. */
(function (ziel) {
  'use strict';

  const musterWerte = typeof module !== 'undefined' ? require('./ausblenden-werte.js') : null;

  /** Die sichtbaren Einträge in der Reihenfolge der gezeigten Liste, dazu die Zahl je Ausblendgrund.
      Ein Eintrag, der mehrere Gründe trifft, wird einmal ausgeblendet und einmal gezählt — bei dem ersten Grund der Reihe
      **Muster, Suche, abgehakt** (PO 2026-11-26): das Muster wirkt schalterunabhängig, die Suche ist der flüchtige Text,
      der Haken zuletzt. `suche` ist `null` (keine Suche) oder die Menge der Pfade, die zum Suchtext passen. */
  function sicht(eintraege, muster, schalter, suche) {
    const sichtbare = [];
    let ausgeblendetAbgehakt = 0;
    let ausgeblendetMuster = 0;
    let ausgeblendetSuche = 0;
    for (const eintrag of eintraege) {
      if (trifftMuster(eintrag.pfad, muster)) {
        ausgeblendetMuster += 1;
        continue;
      }
      if (trifftSuche(eintrag.pfad, suche)) {
        ausgeblendetSuche += 1;
        continue;
      }
      if (schalter && eintrag.abgehakt && !eintrag.gesperrt) {
        ausgeblendetAbgehakt += 1;
        continue;
      }
      sichtbare.push(eintrag);
    }
    return { sichtbare, ausgeblendetAbgehakt, ausgeblendetMuster, ausgeblendetSuche };
  }

  function trifftSuche(pfad, suche) {
    return suche !== null && suche !== undefined && !suche.has(pfad);
  }

  function trifftMuster(pfad, muster) {
    return muster.some(einzelnes => passt(einzelnes, pfad));
  }

  function passt(muster, pfad) {
    if (musterWerte) {
      return musterWerte.passt(muster, pfad);
    }
    return window.passt(muster, pfad);
  }

  function anzahlAusgeblendet(ergebnis) {
    return ergebnis.ausgeblendetAbgehakt + ergebnis.ausgeblendetMuster + ergebnis.ausgeblendetSuche;
  }

  /** „n ausgeblendet, davon a abgehakt, b Muster, c Suche“; ein Anteil von 0 wird weggelassen, bei 0 Ausgeblendeten kein Zähler. */
  function zaehlertext(ergebnis) {
    const gesamt = anzahlAusgeblendet(ergebnis);
    if (gesamt === 0) {
      return '';
    }
    const anteile = [];
    if (ergebnis.ausgeblendetAbgehakt > 0) {
      anteile.push(`${ergebnis.ausgeblendetAbgehakt} abgehakt`);
    }
    if (ergebnis.ausgeblendetMuster > 0) {
      anteile.push(`${ergebnis.ausgeblendetMuster} Muster`);
    }
    if (ergebnis.ausgeblendetSuche > 0) {
      anteile.push(`${ergebnis.ausgeblendetSuche} Suche`);
    }
    return `${gesamt} ausgeblendet, davon ${anteile.join(', ')}`;
  }

  /** Der Leerfall (nichts sichtbar, aber Ausgeblendete) ist ein Zustand mit Ausweg; ohne Auswahl kein Zustand. Hat allein die
      Suche nichts übrig gelassen, sagt die Meldung das („Keine Datei passt zur Suche“); sind Muster oder Abgehakte beteiligt,
      bleibt es bei „Alle Dateien ausgeblendet“ (R00029). */
  function meldung(anzahlSichtbare, gesamt, gruende) {
    if (gesamt === 0) {
      return '';
    }
    if (anzahlSichtbare > 0) {
      return '';
    }
    if (gruende && gruende.ausgeblendetSuche > 0 && gruende.ausgeblendetMuster === 0 && gruende.ausgeblendetAbgehakt === 0) {
      return 'Keine Datei passt zur Suche';
    }
    return 'Alle Dateien ausgeblendet';
  }

  Object.assign(ziel, { sicht, zaehlertext, meldung });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaAbgehakteWerte = window.gitreviewaAbgehakteWerte || {}));
