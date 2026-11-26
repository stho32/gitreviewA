/* gitreviewA — Werte der Dialoge „Beenden“ und „Abbrechen“ (R00050, B4601): **die eine** Beschreibung aus Art und Lage.
   Anzeige, Fokus, Enter-Verhalten und Endzustand lesen alle dieselbe Beschreibung; es gibt keine zweite Stelle, die
   zwischen den beiden Arten unterscheidet. Dazu die eine Zählrechnung: Dateien über `fortschrittZusammen` (R00012), nie eine
   zweite; Anmerkungen und Haken kommen von den Serverquellen. Reine Funktionen, im Browser und in Node; ohne DOM, ohne Zustand. */
(function (ziel) {
  'use strict';

  const BEENDEN = 'beenden';
  const ABBRECHEN = 'abbrechen';

  const hakenWerte = typeof module !== 'undefined' ? require('./haken-werte.js') : null;
  const dateilisteWerte = typeof module !== 'undefined' ? require('./dateiliste-werte.js') : null;

  const fortschrittZusammen = hakenWerte ? hakenWerte.fortschrittZusammen : window.fortschrittZusammen;
  const stellenSchluessel = hakenWerte ? hakenWerte.stellenSchluessel : window.stellenSchluessel;
  const sichtbarerName = dateilisteWerte ? dateilisteWerte.sichtbarerName : window.sichtbarerName;

  const NICHT_BESTIMMT = {
    anmerkungen: 'Anmerkungen konnten nicht bestimmt werden',
    haken: 'Haken konnten nicht bestimmt werden',
    dateien: 'Dateien konnten nicht bestimmt werden',
  };

  /**
   * Der eine ehrliche Endzustand, wenn die Bestätigung keinen Server mehr erreicht (R00050, Kriterium 11): der Lauf ist
   * zu Ende, nur dieses Fenster weiß es noch nicht. Für beide Arten dieselbe Beschreibung — eine Fehlermeldung wäre falsch.
   */
  const BEREITS_ZU_ENDE = {
    titel: 'Der Lauf ist bereits zu Ende.',
    hinweis: 'Das Ergebnis steht im Terminal bzw. im anderen Fenster. Dieses Fenster kann geschlossen werden.',
  };

  function dialogBeschreibung(art, lage) {
    if (art === BEENDEN) {
      return beendenBeschreibung(lage || {});
    }
    if (art === ABBRECHEN) {
      return abbrechenBeschreibung(lage || {});
    }
    throw new Error(`unbekannte Dialogart: ${art}`);
  }

  function beendenBeschreibung(lage) {
    return {
      art: BEENDEN,
      titel: 'Review beenden und Ergebnis senden?',
      zeilen: [anmerkungszeile(lage), dateizeile(lage)],
      zurueck: 'Zurück (Esc)',
      bestaetigen: 'Beenden (Enter)',
      vorgabe: 'bestaetigen',
      endzustand: {
        titel: 'Review beendet',
        hinweis: 'Das Ergebnis steht in der Konsole. Dieses Fenster kann geschlossen werden.',
      },
      abschnitte: [],
    };
  }

  function abbrechenBeschreibung(lage) {
    return {
      art: ABBRECHEN,
      titel: 'Review abbrechen?',
      zeilen: verlustzeilen(lage),
      zurueck: 'Zurück (Esc)',
      bestaetigen: 'Abbrechen',
      vorgabe: 'zurueck',
      endzustand: {
        titel: 'Review abgebrochen',
        hinweis: 'Es gibt kein Ergebnis. Dieses Fenster kann geschlossen werden.',
      },
      abschnitte: [],
    };
  }

  /** n = 0 sagt, was die KI stattdessen erhält; n = 1 und n > 1 nennen Anmerkungen und ihre Dateien (Kriterien 1 und 3). */
  function anmerkungszeile(lage) {
    if (lage.anmerkungen === null || lage.anmerkungen === undefined) {
      return NICHT_BESTIMMT.anmerkungen;
    }
    const anmerkungen = lage.anmerkungen;
    if (anmerkungen === 0) {
      return 'Keine Anmerkungen: die KI erhält ‚Keine Anmerkungen.‘';
    }
    const dateien = lage.anmerkungsdateien;
    const anmerkungswort = einzahlOderMehrzahl(anmerkungen, '1 Anmerkung', `${anmerkungen} Anmerkungen`);
    const dateiwort = einzahlOderMehrzahl(dateien, '1 Datei', `${dateien} Dateien`);
    let verb = 'gehen';
    if (anmerkungen === 1) {
      verb = 'geht';
    }
    return `${anmerkungswort} in ${dateiwort} ${verb} auf stdout an die aufrufende KI.`;
  }

  function einzahlOderMehrzahl(anzahl, einzahl, mehrzahl) {
    if (anzahl === 1) {
      return einzahl;
    }
    return mehrzahl;
  }

  /** u = m − abgehakt; gesperrte Dateien zählen als ungeprüft und werden hinter u genannt (Kriterien 3 und 4). */
  function dateizeile(lage) {
    const dateien = lage.dateien;
    if (!dateien) {
      return NICHT_BESTIMMT.dateien;
    }
    if (dateien.gesamt === 0) {
      return 'Keine Dateien in der Auswahl.';
    }
    const offen = dateien.gesamt - dateien.abgehakt;
    if (offen === 0) {
      if (dateien.gesamt === 1) {
        return 'Alle 1 Datei ist abgehakt.';
      }
      return `Alle ${dateien.gesamt} Dateien sind abgehakt.`;
    }
    const offenwort = einzahlOderMehrzahl(offen, '1 von 1 Datei ist', `${offen} von ${dateien.gesamt} Dateien sind`);
    let gesperrt = '';
    if (dateien.nichtLesbar > 0) {
      gesperrt = ` (${dateien.nichtLesbar} nicht lesbar)`;
    }
    return `${offenwort} nicht abgehakt${gesperrt}.`;
  }

  /** Die Verlustzeile entfällt nur, wenn wirklich nichts verloren geht; eine unbekannte Quelle wird genannt (Kriterium 8). */
  function verlustzeilen(lage) {
    const zeilen = [];
    if (lage.anmerkungen === null || lage.anmerkungen === undefined) {
      zeilen.push(NICHT_BESTIMMT.anmerkungen);
    }
    if (lage.haken === null || lage.haken === undefined) {
      zeilen.push(NICHT_BESTIMMT.haken);
    }
    if (zeilen.length === 0 && (lage.anmerkungen > 0 || lage.haken > 0)) {
      const anmerkungswort = einzahlOderMehrzahl(lage.anmerkungen, '1 Anmerkung', `${lage.anmerkungen} Anmerkungen`);
      const hakenwort = einzahlOderMehrzahl(lage.haken, '1 Haken', `${lage.haken} Haken`);
      zeilen.push(`Alle ${anmerkungswort} und ${hakenwort} gehen verloren.`);
    }
    zeilen.push('Die KI erhält kein Ergebnis (stdout bleibt leer, Exit 130).');
    return zeilen;
  }

  /**
   * Die eine Zählung aus den drei Serverquellen (`GET /api/anmerkungen`, `/api/haken`, `/api/zusammen`).
   * Eine fehlende oder nicht lesbare Quelle ist `null` — nie 0, das wie „nichts“ aussähe. Dateien zählen über
   * `fortschrittZusammen` mit demselben Stand und derselben Sperrregel wie der Zähler im Kopf (R00012/R00014).
   */
  function lageAusQuellen(quellen) {
    const quellenlage = quellen || {};
    const anmerkungen = quellenlage.anmerkungen || null;
    const hakenstand = quellenlage.hakenstand || null;
    const zusammenstand = quellenlage.zusammenstand || null;
    let anzahlAnmerkungen = null;
    let anmerkungsdateien = null;
    if (anmerkungen) {
      anzahlAnmerkungen = anmerkungen.length;
      anmerkungsdateien = dateienDerAnmerkungen(anmerkungen);
    }
    let anzahlHaken = null;
    if (hakenstand && Number.isInteger(hakenstand.abgehakt)) {
      anzahlHaken = hakenstand.abgehakt;
    }
    return {
      anmerkungen: anzahlAnmerkungen,
      anmerkungsdateien,
      haken: anzahlHaken,
      dateien: zaehleDateien(hakenstand, zusammenstand),
    };
  }

  function dateienDerAnmerkungen(anmerkungen) {
    const dateien = new Set();
    for (const anmerkung of anmerkungen) {
      dateien.add(anmerkung.datei);
    }
    return dateien.size;
  }

  function zaehleDateien(hakenstand, zusammenstand) {
    if (!hakenstand || !Array.isArray(hakenstand.stellen) || !zusammenstand || !Array.isArray(zusammenstand.dateien)) {
      return null;
    }
    return fortschrittZusammen(zusammenstand.dateien, standAus(hakenstand.stellen), gesperrtAus(hakenstand.stellen));
  }

  /** Der bestätigte Stand in Anzeigenamen — derselbe Schlüssel wie die Netto-Liste (R00012, wie `haken.js`). */
  function standAus(stellen) {
    const stand = new Map();
    for (const stelle of stellen) {
      stand.set(stellenSchluessel(stelle.commit, sichtbarerName(stelle.datei)), stelle.abgehakt === true);
    }
    return stand;
  }

  /** Eine Datei ist gesperrt wie im Kopf: ihr eigener Sperrgrund oder der ihrer Stellen (R00014). */
  function gesperrtAus(stellen) {
    const gruende = new Map();
    for (const stelle of stellen) {
      gruende.set(stellenSchluessel(stelle.commit, sichtbarerName(stelle.datei)), stelle.sperrgrund || '');
    }
    return datei => {
      if (datei.sperrgrund) {
        return true;
      }
      return datei.stellen.some(stelle => Boolean(gruende.get(stellenSchluessel(stelle.commit, stelle.pfad))));
    };
  }

  Object.assign(ziel, { BEENDEN, ABBRECHEN, BEREITS_ZU_ENDE, dialogBeschreibung, lageAusQuellen });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaBeendenWerte = window.gitreviewaBeendenWerte || {}));