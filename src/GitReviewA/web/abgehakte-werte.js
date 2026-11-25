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
      Ein Eintrag, der beide Gründe trifft, wird einmal ausgeblendet und einmal gezählt (als Muster, denn das Muster wirkt schalterunabhängig). */
  function sicht(eintraege, muster, schalter) {
    const sichtbare = [];
    let ausgeblendetAbgehakt = 0;
    let ausgeblendetMuster = 0;
    for (const eintrag of eintraege) {
      if (trifftMuster(eintrag.pfad, muster)) {
        ausgeblendetMuster += 1;
        continue;
      }
      if (schalter && eintrag.abgehakt && !eintrag.gesperrt) {
        ausgeblendetAbgehakt += 1;
        continue;
      }
      sichtbare.push(eintrag);
    }
    return { sichtbare, ausgeblendetAbgehakt, ausgeblendetMuster };
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
    return ergebnis.ausgeblendetAbgehakt + ergebnis.ausgeblendetMuster;
  }

  /** „n ausgeblendet, davon a abgehakt, b Muster“; ein Anteil von 0 wird weggelassen, bei 0 Ausgeblendeten kein Zähler. */
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
    return `${gesamt} ausgeblendet, davon ${anteile.join(', ')}`;
  }

  /** Der Leerfall (nichts sichtbar, aber Ausgeblendete) ist ein Zustand mit Ausweg; ohne Auswahl kein Zustand. */
  function meldung(anzahlSichtbare, gesamt) {
    if (gesamt === 0) {
      return '';
    }
    if (anzahlSichtbare === 0) {
      return 'Alle Dateien ausgeblendet';
    }
    return '';
  }

  Object.assign(ziel, { sicht, zaehlertext, meldung });
})(typeof module !== 'undefined' ? module.exports : window);
