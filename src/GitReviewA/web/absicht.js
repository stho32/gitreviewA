/* gitreviewA — Absicht der KI über dem Diff (R00038): über dem Inhalt des Diffs stehen die Commits der gewählten Datei,
   je Commit Kurz-Hash und einzeiliger Betreff, der Rumpf erst auf „Nachricht“, ab sechs Commits die ersten fünf und
   „k weitere“. Die Commits kommen aus den Stellen des Netto-Eintrags (Zusammen) bzw. dem gewählten Commit (Einzeln) und
   der Commit-Liste der Leiste — kein neuer Weg zum Server. Betreff und Rumpf sind fremder Text: nur textContent,
   Unsichtbares als Marke der einen Zeichenklasse (`sichtbarerName`). */
(function () {
  'use strict';

  const werte = window.gitreviewaAbsichtWerte;

  /** Der Block gehört der Wahl, nicht dem Zeichnen: er wird beim Wechsel von Datei, Modus und Commit neu gebaut (offene
      Nachrichten sind danach zu) und beim Zeichnen des Diffs nur wieder als erstes Kind des Rollbereichs eingesetzt. */
  let wahl = null;
  let blockElement = null;

  function init() {
    document.addEventListener('datei-gewaehlt', ereignis => uebernimmWahl(ereignis.detail));
    document.addEventListener('wahl-aufgehoben', () => uebernimmWahl(null));
    document.addEventListener('diff-gezeichnet', haengeEin);
  }

  function uebernimmWahl(neueWahl) {
    wahl = neueWahl;
    blockElement = neueWahl === null ? null : baueBlock(commitsDerWahl(neueWahl));
    haengeEin();
  }

  function commitsDerWahl(wahl) {
    const commits = window.gitreviewaCommits ? window.gitreviewaCommits.hole() : [];
    return werte.commitsDerDatei(wahl.modus, wahl, stellenDerWahl(wahl), commits);
  }

  /** In „Zusammen“ die Stellen des Netto-Eintrags (dieselbe Quelle wie die Herkunft im Kopf); in „Einzeln“ gibt es keine. */
  function stellenDerWahl(wahl) {
    if (wahl.modus !== 'zusammen') {
      return [];
    }
    const stand = window.gitreviewaZusammen ? window.gitreviewaZusammen.hole() : null;
    return stand === null ? [] : werte.stellenDerDatei(stand.dateien, wahl.pfad);
  }

  /** Der Block ist der erste Inhalt des Rollbereichs; ein Zeichnen des Diffs setzt ihn wieder dorthin. Ohne Datei ist er weg. */
  function haengeEin() {
    const rollElement = document.querySelector('#diff .df-sc');
    if (!rollElement || blockElement === null) {
      return;
    }
    if (rollElement.firstElementChild === blockElement) {
      return;
    }
    rollElement.prepend(blockElement);
  }

  function baueBlock(commits) {
    if (commits.length === 0) {
      return null;
    }
    const blockElement = document.createElement('div');
    blockElement.className = 'absicht';
    blockElement.setAttribute('role', 'group');
    blockElement.setAttribute('aria-label', 'Absicht der KI');
    const listeElement = document.createElement('ol');
    listeElement.className = 'absicht-liste';
    const abschnitt = werte.sichtbare(commits);
    for (const commit of abschnitt.sichtbar) {
      listeElement.append(commitZeileElement(commit));
    }
    if (abschnitt.weitere.length > 0) {
      listeElement.append(mehrZeile(abschnitt.weitere, listeElement));
    }
    blockElement.append(listeElement);
    return blockElement;
  }

  function commitZeileElement(commit) {
    const zeileElement = document.createElement('li');
    zeileElement.className = 'absicht-zeile';
    zeileElement.dataset.hash = commit.hash;
    zeileElement.append(hashElement(commit.kurzHash), betreffElement(commit));
    const rumpf = werte.nachrichtText(commit.rumpf);
    if (rumpf) {
      zeileElement.append(nachrichtKnopf(commit.hash, rumpf));
    }
    return zeileElement;
  }

  function hashElement(kurzHash) {
    const element = document.createElement('span');
    element.className = 'absicht-hash mono';
    element.textContent = kurzHash;
    return element;
  }

  /** Der Betreff steht einzeilig und wird bei Platzmangel sichtbar gekürzt (CSS); der volle Text bleibt in `title` und im
      zugänglichen Namen — dieselbe Regel wie für die Herkunft im Kopf (R00039, PO Zeile 247). */
  function betreffElement(commit) {
    const element = document.createElement('span');
    element.className = 'absicht-betreff';
    setzeSichtbarenText(element, werte.markiert(werte.nachrichtText(commit.betreff)));
    return element;
  }

  function setzeSichtbarenText(element, text) {
    element.textContent = text;
    if (text) {
      element.setAttribute('title', text);
      element.setAttribute('aria-label', text);
      return;
    }
    element.removeAttribute('title');
    element.removeAttribute('aria-label');
  }

  /** Der Rumpf entsteht erst beim Aufklappen im DOM: zugeklappt trägt der Block nur Hash und Betreff. */
  function nachrichtKnopf(hash, rumpf) {
    const knopfElement = document.createElement('button');
    knopfElement.type = 'button';
    knopfElement.className = 'absicht-nachricht';
    knopfElement.textContent = 'Nachricht';
    knopfElement.setAttribute('aria-expanded', 'false');
    knopfElement.setAttribute('aria-controls', rumpfId(hash));
    knopfElement.addEventListener('click', () => schalteNachricht(knopfElement, hash, rumpf));
    return knopfElement;
  }

  function schalteNachricht(knopfElement, hash, rumpf) {
    const offenElement = document.getElementById(rumpfId(hash));
    if (offenElement) {
      offenElement.remove();
      knopfElement.setAttribute('aria-expanded', 'false');
      return;
    }
    knopfElement.setAttribute('aria-expanded', 'true');
    knopfElement.after(rumpfElement(hash, rumpf));
  }

  function rumpfElement(hash, rumpf) {
    const element = document.createElement('p');
    element.className = 'absicht-rumpf';
    element.id = rumpfId(hash);
    element.textContent = werte.markiert(rumpf);
    return element;
  }

  function rumpfId(hash) {
    return `absicht-rumpf-${hash}`;
  }

  /** Der Rest der Commits erscheint auf Wunsch; die Zeile mit dem Knopf wird durch die Commit-Zeilen ersetzt. */
  function mehrZeile(weitere, listeElement) {
    const zeileElement = document.createElement('li');
    zeileElement.className = 'absicht-mehr-zeile';
    const knopfElement = document.createElement('button');
    knopfElement.type = 'button';
    knopfElement.className = 'absicht-mehr';
    knopfElement.textContent = `${weitere.length} weitere`;
    knopfElement.addEventListener('click', () => {
      zeileElement.remove();
      for (const commit of weitere) {
        listeElement.append(commitZeileElement(commit));
      }
    });
    zeileElement.append(knopfElement);
    return zeileElement;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
