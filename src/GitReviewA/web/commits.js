/* gitreviewA — Commit-Leiste: Zeilen mit Kurz-Hash, Betreff, Datum, Message; eine Zeile ist gewählt. Die Wahl meldet das Ereignis
   `commit-gewaehlt` (detail: hash); die Dateiliste hört darauf. R00012: Die Leiste sitzt in einer schmalen Commit-Zeile über der
   Dateiliste; zugeklappt trägt sie die Zusammenfassung, aufgeklappt (Modus „Einzeln“) die Zeilen. Im Modus „Einzeln“ führt der
   Commit-Wähler durch die Auswahl; er zeigt Stellung, Kurz-Hash, Betreff, Autor, Zeit und je Commit den Haken-Stand. */
(function () {
  'use strict';

  const zustand = { commits: [], gewaehlt: null, zusammen: null, zusammenFehler: false, zusammenGrund: '' };

  async function init() {
    const statusElement = document.getElementById('commit-status');
    const listeElement = document.getElementById('commit-liste');
    // Der Startzustand der Zeile gehört vor das Laden: öffnet der Mensch sie während der Ladung, bleibt sie offen
    // (ein späteres `zeigeModus` würde seine Wahl überschreiben).
    zeigeModus();
    // Vor dem Warten auf die Commits angemeldet: die Zusammen-Ansicht und der Hakenstand können antworten, während die Leiste lädt.
    document.addEventListener('modus-gewechselt', () => {
      zeigeModus();
      zeichneWaehler();
    });
    document.addEventListener('zusammen-geladen', ereignis => {
      zustand.zusammen = ereignis.detail;
      zustand.zusammenFehler = false;
      zustand.zusammenGrund = '';
      zeichneZusammenfassung();
      zeichneKopfZahlen();
    });
    document.addEventListener('zusammen-fehler', ereignis => {
      zustand.zusammenFehler = true;
      zustand.zusammenGrund = (ereignis && ereignis.detail && ereignis.detail.meldung) || '';
      zeichneZusammenfassung();
    });
    document.addEventListener('haken-stand-geladen', zeichneWaehler);
    document.addEventListener('haken-geaendert', zeichneWaehler);
    document.addEventListener('dateiliste-gezeichnet', ereignis => {
      zustand.dateienAnzahl = ereignis.detail.anzahl;
      zeichneKopfZahlen();
    });
    let commits;
    try {
      commits = await commitsLaden();
    } catch (fehler) {
      statusElement.textContent = `Commit-Leiste konnte nicht gelesen werden: ${fehler.message}`;
      statusElement.classList.add('fehler');
      return;
    }
    zustand.commits = commits;
    zeichneLeiste(listeElement);
    statusElement.textContent = '';
    listeElement.addEventListener('click', ereignis => bedieneLeiste(listeElement, ereignis));
    waehleErsten(listeElement);
    zeichneKopfZahlen();
    zeichneZusammenfassung();
    baueWaehler();
  }

  async function commitsLaden() {
    const antwort = await fetch('api/commits', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  /** Fremder Text (Betreff, Autor, Message) nur über textContent — nie als HTML. */
  function zeichneLeiste(listeElement) {
    listeElement.replaceChildren(...zustand.commits.map(commitZeileElement));
  }

  function commitZeileElement(commit, index) {
    const werte = zeilenwerte(commit);
    const zeileElement = document.createElement('li');
    zeileElement.className = 'commit-zeile';
    zeileElement.dataset.hash = commit.hash;
    zeileElement.append(wahlElement(werte));
    if (werte.hatRumpf) {
      const rumpfId = `rumpf-${index}`;
      zeileElement.append(messageSchalterElement(rumpfId), rumpfElement(werte.rumpf, rumpfId));
    }
    return zeileElement;
  }

  function wahlElement(werte) {
    const knopfElement = document.createElement('button');
    knopfElement.type = 'button';
    knopfElement.className = 'commit-wahl';
    const metaElement = textElement('span', 'commit-meta muted', '');
    const datumElement = textElement('time', 'datum', werte.datum);
    datumElement.dateTime = werte.datumHinweis;
    datumElement.title = werte.datumHinweis;
    metaElement.append(textElement('span', 'autor', werte.autor), datumElement);
    knopfElement.append(textElement('span', 'kurz-hash mono', werte.kurz), textElement('span', 'betreff', werte.betreff), metaElement);
    return knopfElement;
  }

  function messageSchalterElement(rumpfId) {
    const schalterElement = textElement('button', 'message-schalter', 'Message');
    schalterElement.type = 'button';
    schalterElement.setAttribute('aria-expanded', 'false');
    schalterElement.setAttribute('aria-controls', rumpfId);
    return schalterElement;
  }

  function rumpfElement(text, rumpfId) {
    const element = textElement('p', 'rumpf', text);
    element.id = rumpfId;
    element.hidden = true;
    return element;
  }

  function textElement(tag, klassen, text) {
    const element = document.createElement(tag);
    element.className = klassen;
    element.textContent = text;
    return element;
  }

  function bedieneLeiste(listeElement, ereignis) {
    const schalterElement = ereignis.target.closest('.message-schalter');
    if (schalterElement) {
      schalteMessage(schalterElement);
      return;
    }
    const wahlElement = ereignis.target.closest('.commit-wahl');
    if (wahlElement) {
      waehleCommit(listeElement, wahlElement.closest('.commit-zeile'));
    }
  }

  function schalteMessage(schalterElement) {
    const rumpfElement = document.getElementById(schalterElement.getAttribute('aria-controls'));
    const warAufgeklappt = schalterElement.getAttribute('aria-expanded') === 'true';
    schalterElement.setAttribute('aria-expanded', String(!warAufgeklappt));
    rumpfElement.hidden = warAufgeklappt;
  }

  function waehleErsten(listeElement) {
    const ersteZeile = listeElement.querySelector('.commit-zeile');
    if (ersteZeile) {
      waehleCommit(listeElement, ersteZeile);
    }
  }

  /** Erneutes Wählen derselben Zeile löst kein Ereignis aus (ein Lesevorgang je Wahl). */
  function waehleCommit(listeElement, zeileElement) {
    if (zeileElement.getAttribute('aria-current') === 'true') {
      return;
    }
    for (const element of listeElement.querySelectorAll('.commit-zeile[aria-current]')) {
      element.removeAttribute('aria-current');
    }
    zeileElement.setAttribute('aria-current', 'true');
    zustand.gewaehlt = zeileElement.dataset.hash;
    document.dispatchEvent(new CustomEvent('commit-gewaehlt', { detail: { hash: zustand.gewaehlt } }));
    zeichneWaehler();
  }

  /* ── Zusammenfassung, Kopfzahlen, Wähler ── */

  function istZusammen() {
    return Boolean(window.gitreviewaModus && window.gitreviewaModus.istZusammen());
  }

  function kurzVon(hash) {
    const commit = zustand.commits.find(eintrag => eintrag.hash === hash);
    return commit ? commit.kurzHash : '';
  }

  function zeichneKopfZahlen() {
    const element = document.getElementById('kopf-zahlen');
    if (!element) {
      return;
    }
    const anzahl = zustand.dateienAnzahl;
    if (anzahl === undefined) {
      element.textContent = `${zustand.commits.length} Commits`;
      element.title = element.textContent;
      return;
    }
    element.textContent = window.gitreviewaModusWerte.kopfZahlen(zustand.commits.length, anzahl);
    // Bei Platzmangel kürzt das CSS sichtbar mit „…“; der volle Text steht im Namen (R00050, Kriterium 15).
    element.title = element.textContent;
  }

  function zeichneZusammenfassung() {
    const element = document.getElementById('commit-summary');
    if (!element) {
      return;
    }
    if (zustand.commits.length === 0) {
      element.textContent = 'Keine Commits';
      return;
    }
    const beschriftung = window.gitreviewaModusWerte.kettenbeschriftung(zustand.zusammen, zustand.zusammenFehler, zustand.zusammenGrund);
    const erster = zustand.commits[0].kurzHash;
    const letzter = zustand.commits[zustand.commits.length - 1].kurzHash;
    element.textContent = window.gitreviewaModusWerte.commitZeileText(zustand.commits.length, erster, letzter, beschriftung);
  }

  function baueWaehler() {
    const zurueck = document.getElementById('waehler-zurueck');
    const weiter = document.getElementById('waehler-weiter');
    const wahl = document.getElementById('waehler-auswahl');
    if (zurueck) {
      zurueck.addEventListener('click', () => waehleNachbar(-1));
    }
    if (weiter) {
      weiter.addEventListener('click', () => waehleNachbar(1));
    }
    if (wahl) {
      wahl.addEventListener('change', () => waehleHash(wahl.value));
    }
    zeichneWaehler();
  }

  function waehleNachbar(schritt) {
    const stelle = zustand.commits.findIndex(commit => commit.hash === zustand.gewaehlt);
    const ziel = stelle + schritt;
    if (ziel < 0 || ziel >= zustand.commits.length) {
      return;
    }
    waehleHash(zustand.commits[ziel].hash);
  }

  function waehleHash(hash) {
    const zeileElement = document.querySelector(`#commit-liste .commit-zeile[data-hash="${hash}"]`);
    if (zeileElement) {
      waehleCommit(document.getElementById('commit-liste'), zeileElement);
    }
  }

  /** Zähler je Commit aus dem Stand des Hakens, den haken.js führt (R00012, Kriterium 8) — keine zweite Kopie des Stands. */
  function zaehlerStand() {
    if (!window.gitreviewaHaken) {
      return new Map();
    }
    return window.gitreviewaHaken.zaehlerJeCommit();
  }

  /** Der Zusatz am Menüeintrag: „abgehakt von gesamt“; Commits ohne Stelle in der Auswahl bleiben ohne Zusatz. */
  function hakenZusatz(zaehler, commit) {
    return zaehlerZusatz(zaehler.get(commit));
  }

  function zeichneWaehler() {
    const waehler = document.getElementById('commit-waehler');
    if (!waehler) {
      return;
    }
    const zusammen = istZusammen();
    waehler.hidden = zusammen;
    if (zusammen) {
      return;
    }
    const stelle = zustand.commits.findIndex(commit => commit.hash === zustand.gewaehlt);
    const stand = document.getElementById('waehler-stand');
    const wahl = document.getElementById('waehler-auswahl');
    if (stand) {
      const werte = stelle < 0 ? null : zeilenwerte(zustand.commits[stelle]);
      stand.textContent = werte ? `${stelle + 1}/${zustand.commits.length} · ${werte.kurz} · ${werte.betreff} · ${werte.autor} · ${werte.datum}` : '—/—';
    }
    if (wahl) {
      const zaehler = zaehlerStand();
      wahl.replaceChildren(...zustand.commits.map((commit, index) => {
        const werte = zeilenwerte(commit);
        const option = document.createElement('option');
        option.value = commit.hash;
        option.textContent = `${index + 1}/${zustand.commits.length} · ${werte.kurz} · ${werte.betreff}${hakenZusatz(zaehler, commit.hash)}`;
        option.selected = commit.hash === zustand.gewaehlt;
        return option;
      }));
    }
    const zurueck = document.getElementById('waehler-zurueck');
    const weiter = document.getElementById('waehler-weiter');
    if (zurueck) {
      zurueck.disabled = stelle <= 0;
    }
    if (weiter) {
      weiter.disabled = stelle < 0 || stelle >= zustand.commits.length - 1;
    }
  }

  /** In „Zusammen“ ist die Commit-Zeile zugeklappt, in „Einzeln“ aufgeklappt. */
  function zeigeModus() {
    const zeile = document.getElementById('commit-zeile');
    if (zeile) {
      zeile.open = !istZusammen();
    }
    document.body.dataset.modus = istZusammen() ? 'zusammen' : 'einzeln';
  }

  window.gitreviewaCommits = {
    hole: () => zustand.commits,
    gewaehlt: () => zustand.gewaehlt,
    kurzVon,
    /** Einen Commit wählen, ohne auf einen Klick zu warten (R00041, B4004: der Eintrag führt zu seiner Stelle). */
    waehle: waehleHash,
    /** Der Betreff in der Anzeigeform der Commit-Zeile (gekürzt, unsichtbare Zeichen als Marke), nie roh. */
    betreffVon: hash => window.betreffVon(zustand.commits, hash),
  };

  document.addEventListener('DOMContentLoaded', init);
}());
