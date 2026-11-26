/* gitreviewA — Werte des Meldens „angesehen“ (R00041, B4001): aus der gezeigten Stelle des Diff-Bereichs und dem Stand des
   Hakens die Stellen, die der Bereich gezeigt hat. In „Einzeln“ ist das die eine Stelle (Commit und Datei); in „Zusammen“
   sind es alle Stellen der Datei über die Commits — der Diff-Bereich zeigt dort die Datei, nicht einen Commit. Gesperrte
   Stellen (R00014) fallen heraus: ihr Diff ist nicht lesbar, sie gelten nie als angesehen.
   Reine Funktionen, im Browser und in Node; ohne DOM, ohne Zustand. */

const HOECHSTE_STELLEN = 200;

/** Die Stellen, die der Diff-Bereich gezeigt hat; leer ohne gezeigte Stelle. */
function gezeigteStellen(gezeigt, standStellen, sichtbarerName) {
  const stelle = gezeigteStelle(gezeigt);
  if (stelle === null) {
    return [];
  }
  const kandidaten = stellenDerDatei(stelle, standStellen, sichtbarerName);
  return kandidaten.filter(eintrag => sperrgrund(eintrag, standStellen) === '').slice(0, HOECHSTE_STELLEN);
}

function gezeigteStelle(gezeigt) {
  if (!gezeigt || !gezeigt.commit || !gezeigt.pfad) {
    return null;
  }
  return { commit: gezeigt.commit, datei: gezeigt.pfad, modus: gezeigt.modus };
}

/** In „Einzeln“ die gezeigte Stelle selbst; in „Zusammen“ alle Stellen des Stands mit demselben Anzeigenamen. */
function stellenDerDatei(stelle, standStellen, sichtbarerName) {
  if (stelle.modus !== 'zusammen') {
    return [{ commit: stelle.commit, datei: stelle.datei }];
  }
  const anzeige = sichtbarerName(stelle.datei);
  const treffer = standStellen
    .filter(eintrag => sichtbarerName(eintrag.datei) === anzeige)
    .map(eintrag => ({ commit: eintrag.commit, datei: eintrag.datei }));
  if (treffer.length === 0) {
    return [{ commit: stelle.commit, datei: stelle.datei }];
  }
  return treffer;
}

/** Der Sperrgrund der Stelle aus dem Stand; leer, wenn die Stelle lesbar ist oder der Stand sie nicht kennt. */
function sperrgrund(stelle, standStellen) {
  const eintrag = standStellen.find(gelesen => gelesen.commit === stelle.commit && gelesen.datei === stelle.datei);
  if (!eintrag) {
    return '';
  }
  return eintrag.sperrgrund || '';
}

const ziel = typeof module !== 'undefined' ? module.exports : (window.gitreviewaAngesehenWerte = window.gitreviewaAngesehenWerte || {});
Object.assign(ziel, { gezeigteStellen, HOECHSTE_STELLEN });
