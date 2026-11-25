/* gitreviewA — Lücken-Rechnung für „nur Änderungen“ (R00026): aus den Zeilen einer Diff-Ansicht die Lücken vor dem ersten,
   zwischen zwei und nach dem letzten Abschnitt — Zahl der verborgenen Zeilen und Nummernspanne alt/neu. Reine Funktionen,
   im Browser und in Node; fremder Text geht hier nie durch. Die Zeilen einer Lücke selbst kommen aus der Ansicht „ganze Datei“ (B2506). */
(function (ziel) {
  'use strict';

  /** Schrittweite je Betätigung des Lücken-Bedienelements (Entscheidung des product-owners 2026-11-25). */
  const SCHRITT = 20;

  const ABSCHNITTSKOPF = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

  /** `zeilen` der Ansicht „nur Änderungen“ (`patchZeilen`), `gesamt` die Zahl der Zeilen der ganzen Datei oder null →
      die Lücken in Reihenfolge. `stelle` ist der Index der Zeile, **vor** der die Lücke steht; `zeilen.length` heißt:
      nach dem letzten Abschnitt. Die letzte Lücke braucht die Gesamtzeilenzahl — ohne sie fehlt sie (R00026, Missing-Docs). */
  function luecken(zeilen, gesamt) {
    const koepfe = koepfeMitSpanne(zeilen);
    const gefunden = [];
    if (koepfe.length === 0) {
      return gefunden;
    }
    const erster = koepfe[0];
    merke(gefunden, 0, 1, erster.spanne.altVon - 1, 1, erster.spanne.neuVon - 1);
    for (let nummer = 1; nummer < koepfe.length; nummer += 1) {
      const vorher = endeVon(koepfe[nummer - 1].spanne);
      const jetzt = koepfe[nummer].spanne;
      merke(gefunden, koepfe[nummer].stelle, vorher.alt + 1, jetzt.altVon - 1, vorher.neu + 1, jetzt.neuVon - 1);
    }
    if (gesamt !== null && gesamt !== undefined) {
      const letzter = endeVon(koepfe[koepfe.length - 1].spanne);
      const zahl = gesamt - letzter.neu;
      merke(gefunden, zeilen.length, letzter.alt + 1, letzter.alt + zahl, letzter.neu + 1, gesamt);
    }
    return gefunden;
  }

  function koepfeMitSpanne(zeilen) {
    const koepfe = [];
    zeilen.forEach((zeile, stelle) => {
      if (zeile.art !== 'kopf') {
        return;
      }
      const spanne = spanneAus(zeile.text);
      if (spanne) {
        koepfe.push({ stelle, spanne });
      }
    });
    return koepfe;
  }

  /** `@@ -a[,b] +c[,d] @@` → die Spannen alt/neu; ohne Zahl gilt 1 (git lässt sie bei genau einer Zeile weg). */
  function spanneAus(kopfText) {
    const treffer = ABSCHNITTSKOPF.exec(kopfText);
    if (!treffer) {
      return null;
    }
    return { altVon: Number(treffer[1]), altZahl: zahlOderEins(treffer[2]), neuVon: Number(treffer[3]), neuZahl: zahlOderEins(treffer[4]) };
  }

  function zahlOderEins(text) {
    if (text === undefined) {
      return 1;
    }
    return Number(text);
  }

  /** Die letzte Nummer des Abschnitts je Seite; ein leerer Bereich (`-0,0`) endet vor der ersten Zeile. */
  function endeVon(spanne) {
    return { alt: spanne.altVon + spanne.altZahl - 1, neu: spanne.neuVon + spanne.neuZahl - 1 };
  }

  /** In einer Lücke stehen nur unveränderte Zeilen: alt und neu decken dieselbe Zahl ab. Sonst wird nichts angekündigt. */
  function merke(gefunden, stelle, altVon, altBis, neuVon, neuBis) {
    const zahl = neuBis - neuVon + 1;
    const istLeer = zahl < 1 || altBis - altVon + 1 !== zahl;
    if (istLeer) {
      return;
    }
    gefunden.push({ stelle, altVon, altBis, neuVon, neuBis, zahl });
  }

  /** Wie viele Zeilen der Lücke noch verborgen sind. */
  function rest(luecke, aufgedeckt) {
    return luecke.zahl - aufgedeckt;
  }

  /** Die Zahl der aufgedeckten Zeilen nach einer weiteren Betätigung: 20 mehr, höchstens die ganze Lücke. */
  function naechsterSchritt(luecke, aufgedeckt) {
    return Math.min(luecke.zahl, aufgedeckt + SCHRITT);
  }

  /** Die aufgedeckten Zeilen einer Lücke: die ersten `anzahl` Zeilen ihrer Spanne, geholt aus den Zeilen der ganzen Datei
      über die Nummer neu — Text und Nummern sind dieselben wie in „ganze Datei“ (R00026), es gibt keine zweite Rechnung. */
  function aufgedeckt(luecke, anzahl, ganzeZeilen) {
    const zeilen = [];
    const bis = luecke.neuVon + anzahl - 1;
    for (const zeile of ganzeZeilen) {
      const inDerSpanne = Number.isInteger(zeile.neu) && zeile.neu >= luecke.neuVon && zeile.neu <= bis;
      if (inDerSpanne) {
        zeilen.push({ art: zeile.art, alt: zeile.alt, neu: zeile.neu, text: zeile.text });
      }
    }
    return zeilen;
  }

  /** Die Gesamtzeilenzahl der Datei im Stand nach dem Commit: die größte Nummer neu der Ansicht „ganze Datei“ — die Ansicht
      trägt auch entfernte Zeilen, ihre Zeilenzahl ist also nicht die der Datei. */
  function gesamtzeilen(ganzeZeilen) {
    let groesste = 0;
    for (const zeile of ganzeZeilen) {
      if (Number.isInteger(zeile.neu) && zeile.neu > groesste) {
        groesste = zeile.neu;
      }
    }
    return groesste;
  }

  Object.assign(ziel, { luecken, rest, naechsterSchritt, aufgedeckt, gesamtzeilen, spanneAus, SCHRITT });
})(typeof module !== 'undefined' ? module.exports : window);
