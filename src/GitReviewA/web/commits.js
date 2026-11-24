/* gitreviewA — Commit-Leiste: Zeilen mit Kurz-Hash, Betreff, Autor, Datum und ausklappbarer Message; ein Commit ist gewählt.
   Die Wahl meldet das Ereignis `commit-gewaehlt` (detail: hash); die Dateiliste hört darauf. */
(function () {
  'use strict';

  async function init() {
    const statusElement = document.getElementById('commit-status');
    const listeElement = document.getElementById('commit-liste');
    let commits;
    try {
      commits = await commitsLaden();
    } catch (fehler) {
      statusElement.textContent = `Commits ließen sich nicht laden: ${fehler.message}`;
      statusElement.classList.add('fehler');
      return;
    }
    zeichneCommitListe(listeElement, commits);
    statusElement.textContent = '';
    listeElement.addEventListener('click', ereignis => bedieneLeiste(listeElement, ereignis));
    waehleErstenCommit(listeElement);
  }

  async function commitsLaden() {
    const antwort = await fetch('api/commits', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  /** Fremder Text (Autor, Betreff, Message) nur über textContent — nie als HTML. */
  function zeichneCommitListe(listeElement, commits) {
    const zeilen = commits.map(commitZeileElement);
    listeElement.replaceChildren(...zeilen);
  }

  function commitZeileElement(commit, index) {
    const werte = zeilenwerte(commit);
    const zeileElement = document.createElement('li');
    zeileElement.className = 'commit-zeile';
    zeileElement.dataset.hash = commit.hash;
    zeileElement.append(wahlknopfElement(werte));
    if (werte.hatRumpf) {
      const rumpfId = `rumpf-${index}`;
      zeileElement.append(messageSchalterElement(rumpfId), rumpfElement(rumpfId, werte.rumpf));
    }
    return zeileElement;
  }

  function wahlknopfElement(werte) {
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

  function rumpfElement(rumpfId, rumpf) {
    const element = textElement('div', 'rumpf', rumpf);
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
    const warAusgeklappt = schalterElement.getAttribute('aria-expanded') === 'true';
    schalterElement.setAttribute('aria-expanded', String(!warAusgeklappt));
    document.getElementById(schalterElement.getAttribute('aria-controls')).hidden = warAusgeklappt;
  }

  function waehleErstenCommit(listeElement) {
    const ersteZeileElement = listeElement.querySelector('.commit-zeile');
    if (ersteZeileElement) {
      waehleCommit(listeElement, ersteZeileElement);
    }
  }

  /** Erneutes Wählen des gewählten Commits liest nichts neu: ein Lesevorgang je Wahl. */
  function waehleCommit(listeElement, zeileElement) {
    const istSchonGewaehlt = zeileElement.getAttribute('aria-current') === 'true';
    if (istSchonGewaehlt) {
      return;
    }
    for (const gewaehltElement of listeElement.querySelectorAll('.commit-zeile[aria-current]')) {
      gewaehltElement.removeAttribute('aria-current');
    }
    zeileElement.setAttribute('aria-current', 'true');
    document.dispatchEvent(new CustomEvent('commit-gewaehlt', { detail: { hash: zeileElement.dataset.hash } }));
  }

  document.addEventListener('DOMContentLoaded', init);
}());
