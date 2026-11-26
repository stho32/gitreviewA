/* gitreviewA — Werte des Abschlussschritts (R00041, B4002/B4003): welche Stellen der Mensch nie angesehen hat, und daraus der
   Abschnitt des Dialogs. „Angesehen“ ist die Beobachtung des Werkzeugs (der Diff-Bereich hat die Stelle gezeigt), nicht der
   Haken — das ist die Aussage des Menschen (R00041, Domänenbezug). Eine gesperrte Stelle (R00014) steht schon als ungeprüft
   im Kopf und im Ergebnis und gehört darum nicht in den Abschnitt. Reine Funktionen, im Browser und in Node.

   Ein Eintrag der Liste ist je Modus:
   - „Zusammen“ eine Datei `{ pfad, schluessel, stellen: [{ commit, pfad }] }` – der Pfad in Anzeigeform (mit Marken),
   - „Einzeln“ eine Stelle `{ pfad, schluessel, commit }`.
   `schluessel` ist der Name, unter dem die gezeigte Liste die Zeile führt (in „Einzeln“ der rohe Pfad, in „Zusammen“ der
   Anzeigename) — der Weg zur Datei wählt über ihn. `stand` ist die Menge der Schlüssel der angesehenen Stellen (in
   Anzeigeform, wie die Liste sie nennt); `gesperrt` und `ausgeblendet` entscheiden je Eintrag. */
(function (ziel) {
  'use strict';

  const HOECHSTENS_EINTRAEGE = 20;
  const ZUSAMMEN = 'zusammen';

  const hakenWerte = typeof module !== 'undefined' ? require('./haken-werte.js') : null;
  const stellenSchluessel = hakenWerte ? hakenWerte.stellenSchluessel : window.stellenSchluessel;
  const gruppenWerte = typeof module !== 'undefined' ? require('./gruppen-werte.js') : null;

  /** Die nicht angesehenen Einträge in der Reihenfolge der gezeigten Liste. */
  function nichtAngesehen(modus, liste, stand, gesperrt, ausgeblendet) {
    const eintraege = [];
    for (const punkt of liste) {
      if (gesperrt(punkt)) {
        continue;
      }
      if (istAngesehen(modus, punkt, stand)) {
        continue;
      }
      eintraege.push(eintrag(punkt, modus, ausgeblendet(punkt)));
    }
    return eintraege;
  }

  /** In „Zusammen“ gilt eine Datei als angesehen, sobald eine ihrer Stellen es ist; in „Einzeln“ zählt die Stelle selbst. */
  function istAngesehen(modus, punkt, stand) {
    if (modus === ZUSAMMEN) {
      return punkt.stellen.some(stelle => stand.has(stellenSchluessel(stelle.commit, stelle.pfad)));
    }
    return stand.has(stellenSchluessel(punkt.commit, punkt.pfad));
  }

  function eintrag(punkt, modus, ausgeblendet) {
    let commit = null;
    if (modus !== ZUSAMMEN) {
      commit = punkt.commit;
    }
    return { pfad: punkt.pfad, schluessel: punkt.schluessel, commit, ausgeblendet };
  }

  /** Der Abschnitt aus den Einträgen: höchstens zwanzig Zeilen, der Rest als Zahl („… und k weitere“, R00041). */
  function abschnitt(eintraege) {
    const weitere = Math.max(0, eintraege.length - HOECHSTENS_EINTRAEGE);
    return { anzahl: eintraege.length, eintraege: eintraege.slice(0, HOECHSTENS_EINTRAEGE), weitere };
  }

  /** Die Reihenfolge, in der die Dateiliste die Einträge zeigt (PO 2026-11-26, Zeile 272): dieselbe eine Gruppenordnung,
      die auch `dateiliste.js` zeichnet (`gruppen-werte.nachGruppen`, R00040) — Code vor Tests vor Doku; in „Einzeln“ je
      Commit in der Reihenfolge der Liste, darin die Dateien der gezeigten Liste. */
  function gezeigteReihenfolge(modus, liste) {
    if (!Array.isArray(liste)) {
      return [];
    }
    if (modus === ZUSAMMEN) {
      return nachGezeigterGruppe(liste);
    }
    const jeCommit = new Map();
    for (const eintrag of liste) {
      if (!jeCommit.has(eintrag.commit)) {
        jeCommit.set(eintrag.commit, []);
      }
      jeCommit.get(eintrag.commit).push(eintrag);
    }
    const geordnet = [];
    for (const eintraege of jeCommit.values()) {
      for (const eintrag of nachGezeigterGruppe(eintraege)) {
        geordnet.push(eintrag);
      }
    }
    return geordnet;
  }

  function nachGezeigterGruppe(eintraege) {
    const verpackt = eintraege.map(eintrag => ({ eintrag, anzeigename: eintrag.pfad }));
    const geordnet = [];
    for (const gruppe of nachGruppen(verpackt)) {
      for (const eintrag of gruppe.eintraege) {
        geordnet.push(eintrag.eintrag);
      }
    }
    return geordnet;
  }

  function nachGruppen(eintraege) {
    if (gruppenWerte) {
      return gruppenWerte.nachGruppen(eintraege);
    }
    return window.gitreviewaGruppenWerte.nachGruppen(eintraege);
  }

  Object.assign(ziel, { HOECHSTENS_EINTRAEGE, nichtAngesehen, abschnitt, gezeigteReihenfolge });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaAbschlussWerte = window.gitreviewaAbschlussWerte || {}));
