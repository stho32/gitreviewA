(function () {
  'use strict';

  async function init() {
    const statusElement = document.getElementById('commit-status');
    const listeElement = document.getElementById('commit-liste');
    try {
      const commits = await commitsLaden();
      zeichneCommitListe(listeElement, commits);
      statusElement.textContent = '';
    } catch (fehler) {
      statusElement.textContent = `Commits ließen sich nicht laden: ${fehler.message}`;
      statusElement.classList.add('fehler');
    }
  }

  async function commitsLaden() {
    const antwort = await fetch('api/commits', { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  /** Fremder Text (Betreff) nur über textContent — nie als HTML. */
  function zeichneCommitListe(listeElement, commits) {
    const zeilen = commits.map(commitZeileElement);
    listeElement.replaceChildren(...zeilen);
  }

  function commitZeileElement(commit) {
    const zeileElement = document.createElement('li');
    zeileElement.className = 'commit-zeile';
    zeileElement.dataset.hash = commit.hash;
    zeileElement.append(textElement('kurz-hash mono', commit.kurzHash), textElement('betreff', commit.betreff));
    return zeileElement;
  }

  function textElement(klassen, text) {
    const element = document.createElement('span');
    element.className = klassen;
    element.textContent = text;
    return element;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
