'use strict';
// Treiber git: ein `git` vorne in PATH, das seinen Start markiert und erst auf Freigabe das echte git ausführt.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ECHTES_GIT = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
const START_FRIST_MS = 5000;

function aufhaltendesGitAnlegen() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'gitreviewa-git-'));
  const marke = path.join(ordner, 'gestartet');
  const freigabe = path.join(ordner, 'weiter');
  const skript = `#!/bin/sh\ntouch '${marke}'\nwhile [ ! -e '${freigabe}' ]; do sleep 0.02; done\nexec '${ECHTES_GIT}' "$@"\n`;
  fs.writeFileSync(path.join(ordner, 'git'), skript, { mode: 0o755 });

  /** Wartet ereignisgenau auf die Marke; endet der Lauf vorher, ist das ein Fehler mit seinem stderr. */
  function aufGitStartWarten(lauf) {
    return new Promise((gestartet, fehlgeschlagen) => {
      const waechter = fs.watch(ordner);
      const frist = setTimeout(() => beenden(new Error(`git wurde nach ${START_FRIST_MS} ms nicht gestartet; stderr: ${lauf.stderr}`)), START_FRIST_MS);
      function beenden(fehler) {
        clearTimeout(frist);
        waechter.close();
        if (fehler) {
          fehlgeschlagen(fehler);
          return;
        }
        gestartet();
      }
      function pruefen() {
        if (fs.existsSync(marke)) {
          beenden();
        }
      }
      waechter.on('change', pruefen);
      lauf.beendet.then(code => beenden(new Error(`gitreviewA endete mit ${code} vor dem git-Start; stderr: ${lauf.stderr}`)));
      pruefen();
    });
  }

  function weiterlaufenLassen() {
    fs.writeFileSync(freigabe, '');
  }

  function entfernen() {
    weiterlaufenLassen();
    fs.rmSync(ordner, { recursive: true, force: true });
  }

  return { ordner, aufGitStartWarten, weiterlaufenLassen, entfernen };
}

module.exports = { aufhaltendesGitAnlegen };
