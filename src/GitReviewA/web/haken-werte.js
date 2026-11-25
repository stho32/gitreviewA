/* gitreviewA — Werte des Abhakens: Fortschrittstext, Balkenanteil, Schlüssel einer Stelle, nächster Zielzustand, Name des Kästchens.
   Dazu die Rechnung je Modus (R00012): in „Zusammen“ zählt die Datei, in „Einzeln“ die Stelle; „teilweise“ heißt eine Datei mit
   mindestens einer abgehakten und mindestens einer offenen Stelle. Reine Funktionen, im Browser und in Node. */
(function (ziel) {
  'use strict';

  const DATEIEN = 'Dateien';
  const STELLEN = 'Stellen';

  /** Anzeige- und Lesetext zugleich: dieselben Worte stehen sichtbar und in der Live-Region. Gesperrte Stellen zählen in m, nie in n (R00014).
      `einheit` nennt, was gezählt wird: „Dateien“ in „Zusammen“, „Stellen“ in „Einzeln“ (R00012); ohne Einheit bleibt der alte Wortlaut. */
  function fortschrittText(abgehakt, gesamt, nichtLesbar, einheit) {
    if (gesamt === 0) {
      return 'Keine Dateien zum Abhaken';
    }
    const einheitsteil = einheit ? ` ${einheit}` : '';
    const zaehler = `${abgehakt} von ${gesamt}${einheitsteil} abgehakt`;
    const gibtEsGesperrteStellen = nichtLesbar > 0;
    if (gibtEsGesperrteStellen) {
      return `${zaehler} (${nichtLesbar} nicht lesbar)`;
    }
    return zaehler;
  }

  function balkenAnteil(abgehakt, gesamt) {
    if (gesamt === 0) {
      return 0;
    }
    return abgehakt / gesamt;
  }

  /** Eine Stelle ist Commit und Datei; der volle Hash hat feste Länge, deshalb ist der Schlüssel eindeutig. */
  function stellenSchluessel(commit, pfad) {
    return `${commit} ${pfad}`;
  }

  /** Ein Klick wünscht das Gegenteil des zuletzt Gewünschten — solange keine Antwort da ist, ist das noch nicht der bestätigte Zustand. */
  function naechsterZielzustand(istBestaetigtAbgehakt, letzterWunsch) {
    if (letzterWunsch === undefined) {
      return !istBestaetigtAbgehakt;
    }
    return !letzterWunsch;
  }

  function kaestchenBezeichnung(sichtbarerPfad, sperrgrund) {
    const bezeichnung = `Abgehakt: ${sichtbarerPfad}`;
    if (sperrgrund) {
      return `${bezeichnung} — ${sperrgrund}`;
    }
    return bezeichnung;
  }

  /**
   * Zustand einer Datei in „Zusammen“ aus ihren Stellen: `abgehakt` (alle Stellen abgehakt), `teilweise` (mindestens eine, aber nicht alle),
   * `offen` (keine). `stand` ist eine Map von Stellen-Schlüssel zu Wahrheitswert.
   */
  function dateiZustand(stellen, stand) {
    let abgehakt = 0;
    let offen = 0;
    for (const stelle of stellen) {
      if (stand.get(stellenSchluessel(stelle.commit, stelle.pfad)) === true) {
        abgehakt += 1;
      } else {
        offen += 1;
      }
    }
    if (abgehakt === 0) {
      return 'offen';
    }
    if (offen === 0) {
      return 'abgehakt';
    }
    return 'teilweise';
  }

  /** Zähler einer Datei in „Zusammen“: wie viele ihrer Stellen abgehakt sind. */
  function dateiZaehler(stellen, stand) {
    let abgehakt = 0;
    for (const stelle of stellen) {
      if (stand.get(stellenSchluessel(stelle.commit, stelle.pfad)) === true) {
        abgehakt += 1;
      }
    }
    return { abgehakt, gesamt: stellen.length };
  }

  /**
   * Zähler je Commit (R00012, Kriterium 8): seine abgehakten Stellen von seinen Stellen gesamt, als Zuordnung Commit → Zähler.
   * `stellen` sind die Stellen des Stands (`commit` und `datei`), `stand` ordnet den Stellen-Schlüssel den bestätigten Zustand zu;
   * ein Commit ohne Stelle fehlt in der Zuordnung.
   */
  function commitZaehler(stellen, stand) {
    const zaehler = new Map();
    for (const stelle of stellen) {
      const zaehlerDesCommits = zaehler.get(stelle.commit) || { abgehakt: 0, gesamt: 0 };
      zaehlerDesCommits.gesamt += 1;
      if (stand.get(stellenSchluessel(stelle.commit, stelle.datei)) === true) {
        zaehlerDesCommits.abgehakt += 1;
      }
      zaehler.set(stelle.commit, zaehlerDesCommits);
    }
    return zaehler;
  }

  /** Der Zusatz am Menüeintrag des Wählers und an der Commit-Zeile: „ · k von n“; ohne Zähler bleibt er leer. */
  function zaehlerZusatz(zaehler) {
    if (!zaehler) {
      return '';
    }
    return ` · ${zaehler.abgehakt} von ${zaehler.gesamt}`;
  }

  /** Zähler in „Zusammen“: Dateien abgehakt (nur vollständig), Dateien gesamt, Dateien mit einer gesperrten Stelle. */
  function fortschrittZusammen(dateien, stand, gesperrt) {
    let abgehakt = 0;
    let nichtLesbar = 0;
    for (const datei of dateien) {
      if (dateiZustand(datei.stellen, stand) === 'abgehakt') {
        abgehakt += 1;
      }
      if (gesperrt && gesperrt(datei)) {
        nichtLesbar += 1;
      }
    }
    return { abgehakt, gesamt: dateien.length, nichtLesbar };
  }

  /** Zähler in „Einzeln“: Stellen abgehakt, Stellen gesamt, gesperrte Stellen. */
  /**
   * Zähler in „Einzeln“: `stellen` sind die Stellen des Stands (mit `sperrgrund`), `abgehakt` und `gesamt` die vom Server
   * gemeldeten Zahlen. Die Zahlen kommen vom Server, weil zwei Stellen denselben Anzeigenamen tragen können (R00014) und die
   * Karte sie dann nicht unterscheiden könnte.
   */
  function fortschrittEinzeln(stellen, abgehakt, gesamt) {
    const nichtLesbar = stellen.filter(stelle => stelle.sperrgrund).length;
    return { abgehakt, gesamt, nichtLesbar };
  }

  Object.assign(ziel, {
    DATEIEN, STELLEN, fortschrittText, balkenAnteil, stellenSchluessel, naechsterZielzustand, kaestchenBezeichnung,
    dateiZustand, dateiZaehler, commitZaehler, zaehlerZusatz, fortschrittZusammen, fortschrittEinzeln,
  });
})(typeof module !== 'undefined' ? module.exports : window);
