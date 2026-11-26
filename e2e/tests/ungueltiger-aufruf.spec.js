'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { test, expect } = require('../dsl/gitreviewa.js');
const { programmStarten } = require('../treiber/programm.js');
const verlauf = require('../treiber/verlauf-repo.js');
const { anzeigeSchrankeMs } = require('../dsl/schranken.js');

const GIT_UMGEBUNG = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'Testperson',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Testperson',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
};

function git(ordner, ...argumente) {
  return execFileSync('git', ['-C', ordner, ...argumente], { encoding: 'utf8', env: GIT_UMGEBUNG }).trim();
}

function eigenerOrdner(praefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), praefix));
}

async function laufEnde(lauf, fristMs = 5000) {
  let frist;
  const abgelaufen = new Promise((_, ab) => {
    frist = setTimeout(() => ab(new Error(`gitreviewA lief nach ${fristMs} ms noch; stderr: ${lauf.stderr}`)), fristMs);
  });
  try {
    return await Promise.race([lauf.beendet, abgelaufen]);
  } finally {
    clearTimeout(frist);
    if (lauf.exitCode === null) {
      lauf.kind.kill('SIGKILL');
    }
  }
}

function stderrZeilen(lauf) {
  return lauf.stderr.split('\n').filter(zeile => zeile.length > 0);
}

function ersteZeile(lauf) {
  return stderrZeilen(lauf)[0] ?? '';
}

function sekundenNachStart(lauf) {
  return (Date.now() - lauf.gestartetUmMs) / 1000;
}

test.describe('Ungültiger Aufruf (I0003, R00016)', () => {
  test('Szenario 1: leerer Bereich b..b endet ohne Server mit Exit 2 und „leer“', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const b = repo.hashes[1];

    const lauf = gr.gitreviewAAufrufen(repo, [`${b}..${b}`]);
    const exitCode = await laufEnde(lauf);

    expect(exitCode).toBe(2);
    expect(lauf.stderr).toContain('leer');
    expect(lauf.stderr).not.toContain('http://127.0.0.1');
    expect(lauf.stdout).toBe('');
    expect(ersteZeile(lauf)).toContain('FEHLER [');
    expect(ersteZeile(lauf)).not.toContain('fatal:');
  });

  test('Szenario 1: HEAD..HEAD endet ebenfalls ohne Server mit Exit 2', async ({ gr }) => {
    const repo = gr.repoMitCommits();

    const lauf = gr.gitreviewAAufrufen(repo, ['HEAD..HEAD']);
    const exitCode = await laufEnde(lauf);

    expect(exitCode).toBe(2);
    expect(lauf.stderr).toContain('leer');
    expect(lauf.stderr).not.toContain('http://127.0.0.1');
    expect(lauf.stdout).toBe('');
  });

  test('Szenario 1/6: leere stdin endet ohne Server mit Exit 2', async ({ gr }) => {
    const repo = gr.repoMitCommits();

    const lauf = programmStarten(repo.ordner, ['-', '--kein-browser'], {}, { text: '' });
    const exitCode = await laufEnde(lauf);

    expect(exitCode).toBe(2);
    expect(lauf.stderr).toContain('leer');
    expect(lauf.stderr).not.toContain('http://127.0.0.1');
    expect(lauf.stdout).toBe('');
  });

  test('Szenario 2: kein Repository endet ohne Server mit Exit 2 und nennt „Repository“', async ({ gr }) => {
    const ordner = eigenerOrdner('gitreviewa-kein-repo-');
    try {
      const lauf = gr.gitreviewAAufrufen({ ordner }, ['deadbeefdeadbeef']);
      const exitCode = await laufEnde(lauf);

      expect(exitCode).toBe(2);
      expect(lauf.stderr).toContain('Repository');
      expect(lauf.stderr).not.toContain('http://127.0.0.1');
      expect(lauf.stdout).toBe('');
      expect(ersteZeile(lauf)).not.toContain('fatal:');
    } finally {
      fs.rmSync(ordner, { recursive: true, force: true });
    }
  });

  test('Szenario 3: nacktes Repository endet ohne Server mit Exit 2 und nennt den fehlenden Arbeitsbaum', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const ordner = eigenerOrdner('gitreviewa-nackt-');
    try {
      git(ordner, 'init', '--bare', '-q');

      const lauf = gr.gitreviewAAufrufen({ ordner }, [repo.hashes[0]]);
      const exitCode = await laufEnde(lauf);

      expect(exitCode).toBe(2);
      expect(lauf.stderr).toContain('Arbeitsbaum');
      expect(lauf.stderr).not.toContain('http://127.0.0.1');
      expect(lauf.stdout).toBe('');
    } finally {
      fs.rmSync(ordner, { recursive: true, force: true });
    }
  });

  test('Szenario 4: ohne git im Suchpfad endet ohne Server mit Exit 2 und nennt „git“', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const leer = eigenerOrdner('gitreviewa-ohne-git-');
    try {
      const lauf = programmStarten(repo.ordner, [repo.hashes[0], '--kein-browser'], { PATH: leer });
      const exitCode = await laufEnde(lauf);

      expect(exitCode).toBe(2);
      expect(lauf.stderr).toContain('git');
      expect(lauf.stderr).not.toContain('http://127.0.0.1');
      expect(lauf.stdout).toBe('');
      expect(sekundenNachStart(lauf)).toBeLessThanOrEqual(anzeigeSchrankeMs / 1000);
    } finally {
      fs.rmSync(leer, { recursive: true, force: true });
    }
  });

  test('Szenario 5: unbekannter Hash, fremder Hash und beschädigtes Objekt enden mit Exit 2', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const fremd = gr.repoMitCommits(['Fremdes Repo']);
    const beschaedigt = gr.repoMitCommits(['Beschaedigt A', 'Beschaedigt B', 'Beschaedigt C']);
    gr.commitObjektEntfernen(beschaedigt, beschaedigt.hashes[0]);

    const faelle = [
      [`${repo.ordner}`, 'deadbeefdeadbeef'],
      [`${repo.ordner}`, fremd.hashes[0]],
      [`${beschaedigt.ordner}`, beschaedigt.hashes[0]],
    ];
    for (const [ordner, hash] of faelle) {
      const lauf = gr.gitreviewAAufrufen({ ordner }, [hash]);
      const exitCode = await laufEnde(lauf);

      expect(exitCode, `Aufruf in ${ordner} mit ${hash}`).toBe(2);
      expect(lauf.stderr, `Aufruf in ${ordner}`).toContain('auflösen');
      expect(lauf.stderr, `Aufruf in ${ordner}`).not.toContain('http://127.0.0.1');
      expect(lauf.stdout, `Aufruf in ${ordner}`).toBe('');
    }
  });

  test('Szenario 7: alle Läufe tragen Exit 2 und die erste stderr-Zeile ist eine FEHLER-Zeile ohne fatal:', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const fremd = gr.repoMitCommits(['Fremdes Repo']);
    const b = repo.hashes[1];

    const kandidaten = [
      gr.gitreviewAAufrufen(repo, [`${b}..${b}`]),
      gr.gitreviewAAufrufen(repo, ['HEAD..HEAD']),
      gr.gitreviewAAufrufen(repo, ['deadbeefdeadbeef']),
      gr.gitreviewAAufrufen(repo, [fremd.hashes[0]]),
    ];
    for (const lauf of kandidaten) {
      expect(await laufEnde(lauf)).toBe(2);

      expect(ersteZeile(lauf)).toContain('FEHLER [');
      expect(ersteZeile(lauf)).not.toContain('fatal:');
    }
  });

  test('Szenario 7: --verbose zeigt den rohen git-Text als Debug-Zeile, --quiet nicht', async ({ gr }) => {
    const ordner = eigenerOrdner('gitreviewa-kein-repo-');
    try {
      const laut = gr.gitreviewAAufrufen({ ordner }, ['deadbeefdeadbeef', '--verbose']);
      expect(await laufEnde(laut)).toBe(2);
      const debugZeilen = stderrZeilen(laut).filter(zeile => zeile.includes(' DEBUG '));
      expect(debugZeilen).toHaveLength(1);
      expect(debugZeilen[0]).toContain('fatal:');

      const still = gr.gitreviewAAufrufen({ ordner }, ['deadbeefdeadbeef', '--quiet']);
      expect(await laufEnde(still)).toBe(2);
      expect(still.stderr).toContain('FEHLER [');
      expect(still.stderr).not.toContain(' DEBUG ');
    } finally {
      fs.rmSync(ordner, { recursive: true, force: true });
    }
  });

  test('Szenario 5: teilweise auflösbare Auswahl nennt den unbekannten Hash', async ({ gr }) => {
    const repo = gr.repoMitCommits(['a', 'b', 'c']);
    const lauf = gr.gitreviewAAufrufen(repo, [repo.hashes[0], 'deadbeefdeadbeef']);
    const exitCode = await laufEnde(lauf);

    expect(exitCode).toBe(2);
    expect(lauf.stderr).not.toContain('kein genannter Commit');
    expect(lauf.stderr).toContain('deadbeefdeadbeef');
    expect(lauf.stderr).toContain('auflösen');
    expect(lauf.stdout).toBe('');
    expect(lauf.stderr).not.toContain('http://127.0.0.1');
    expect(ersteZeile(lauf)).toContain('FEHLER [');
  });

  test('Szenario 5: Hash aus einem anderen Repo in gemischter Auswahl wird genannt', async ({ gr }) => {
    const repo = gr.repoMitCommits(['a', 'b', 'c']);
    const fremd = gr.repoMitCommits(['x']);
    const lauf = gr.gitreviewAAufrufen(repo, [repo.hashes[0], fremd.hashes[0]]);
    const exitCode = await laufEnde(lauf);

    expect(exitCode).toBe(2);
    expect(lauf.stderr).toContain(fremd.hashes[0]);
    expect(lauf.stderr).not.toContain('kein genannter Commit');
    expect(lauf.stderr).not.toContain('http://127.0.0.1');
  });

  test('Szenario 5: zwei gültige Hashes starten den Server', async ({ gr }) => {
    const repo = gr.repoMitCommits(['a', 'b', 'c']);
    const lauf = await gr.gitreviewAStarten(repo, [repo.hashes[0], repo.hashes[1]]);
    try {
      expect(lauf.adresse).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
      expect((await gr.zustandAbfragen(lauf)).status).toBe(200);
    } finally {
      await gr.laufAbbrechen(lauf);
    }
  });

  test('Szenario 8: Positivkontrolle — gültiger Aufruf im Wurzelordner und im Unterordner startet den Server', async ({ gr }) => {
    const repo = gr.repoMitCommits();
    const unterordner = path.join(repo.ordner, 'unten');
    fs.mkdirSync(unterordner, { recursive: true });
    const a = repo.hashes[0];

    const ausWurzel = await gr.gitreviewAStarten(repo, [a]);
    const ausUnterordner = await gr.gitreviewAStarten({ ordner: unterordner }, [a]);
    try {
      for (const lauf of [ausWurzel, ausUnterordner]) {
        expect(lauf.adresse).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
        expect((await gr.zustandAbfragen(lauf)).status).toBe(200);
        expect(lauf.stderr).not.toContain('FEHLER [');
      }
    } finally {
      await gr.laufAbbrechen(ausWurzel);
      await gr.laufAbbrechen(ausUnterordner);
    }
  });

  test('Szenario 9: fremde Konfiguration startet kein Programm — leerer Bereich Exit 2, gültiger Aufruf startet', async ({ gr }) => {
    const marker = verlauf.verlaufMitSignaturMarkerAnlegen();
    try {
      const leer = gr.gitreviewAAufrufen({ ordner: marker.ordner }, [`${marker.a}..${marker.a}`]);
      expect(await laufEnde(leer)).toBe(2);
      expect(leer.stderr).toContain('leer');
      expect(marker.markerExistiert()).toBe(false);

      const gueltig = await gr.gitreviewAStarten({ ordner: marker.ordner }, [marker.a]);
      try {
        expect((await gr.zustandAbfragen(gueltig)).status).toBe(200);
        expect(marker.markerExistiert()).toBe(false);
        marker.signaturMitGitPruefen();
        expect(marker.markerExistiert()).toBe(true);
      } finally {
        await gr.laufAbbrechen(gueltig);
      }
    } finally {
      fs.rmSync(marker.ordner, { recursive: true, force: true });
    }
  });
});
