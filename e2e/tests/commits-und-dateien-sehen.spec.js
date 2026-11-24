'use strict';
// Spezifikation R00003 „Commits und Dateien sehen“ (User Story Szenarien 1–14). Commits heißen wie in der Vorbereitung der Anforderung.
const { test, AUTOR_MIT_HTML, PFAD_MIT_RICHTUNGSZEICHEN } = require('../dsl/commits-und-dateien.js');

const DATEIEN_VON_P = {
  summe: '4 Dateien · +11 −0',
  eintraege: [
    { status: 'A', name: 'README.md', zahlen: '+2 −0' },
    { status: 'A', name: 'alt.txt', zahlen: '+4 −0' },
    { status: 'A', name: 'src/a.txt', zahlen: '+3 −0' },
    { status: 'A', name: 'src/b.txt', zahlen: '+2 −0' },
  ],
};
const DATEIEN_VON_Q = {
  summe: '4 Dateien · +2 −5',
  reihenfolgeEgal: true,
  eintraege: [
    { status: 'M', name: 'src/b.txt', zahlen: '+2 −1' },
    { status: 'D', name: 'alt.txt', zahlen: '+0 −4' },
    { status: 'R', name: 'LIESMICH.md', zahlen: '+0 −0' },
    { status: 'A', name: 'logo.bin', zahlen: '–' },
  ],
};

test.describe('Commits überblicken', () => {
  for (const [zeitzone, datumQ, datumP] of [['Europe/Berlin', '05.03.2026 18:30', '04.03.2026 09:15'], ['UTC', '05.03.2026 17:30', '04.03.2026 08:15']]) {
    test.describe(`im Browser mit Zeitzone ${zeitzone}`, () => {
      test.use({ timezoneId: zeitzone });

      test('soll die Commits in Aufrufreihenfolge mit Kurz-Hash, Autor und Datum in Ortszeit zeigen', async ({ review }) => {
        await review.starten({ commits: ['r', 'q', 'p'] });

        await review.leisteZeigt([
          { commit: 'r', betreff: 'Nichts' },
          { commit: 'q', betreff: 'Dateien ändern', autor: 'Bernd Beispiel', datum: datumQ, zeitpunkt: '2026-03-05T18:30:00+01:00' },
          { commit: 'p', betreff: 'Start', autor: 'Anna Beispiel', datum: datumP, zeitpunkt: '2026-03-04T09:15:00+01:00' },
        ]);
      });
    });
  }

  test('soll die Message erst auf Wunsch zeigen und wieder verbergen', async ({ review }) => {
    await review.starten({ commits: ['r', 'q', 'p'] });

    await review.messageVerborgen('q');
    await review.messageUmschalten('q');
    await review.messageZeigt('q', 'Zeile eins\nZeile zwei');
    await review.messageUmschalten('q');
    await review.messageVerborgen('q');
  });

  test('soll nur bei einem Commit mit Rumpf eine Message anbieten', async ({ review }) => {
    await review.starten({ commits: ['r', 'q', 'p'] });

    await review.bietetMessage('q');
    await review.bietetKeineMessage('p');
    await review.bietetKeineMessage('r');
  });

  test('soll Autor, Betreff und Message mit HTML als Text zeigen', async ({ review }) => {
    await review.starten({ vorbereitung: 'fremder Text', commits: ['s'] });

    await review.messageUmschalten('s');

    await review.leisteZeigt([{ commit: 's', autor: AUTOR_MIT_HTML, betreff: '<script>alert(1)</script>' }]);
    await review.messageZeigt('s', '<b>fett</b>');
    await review.fremderTextBleibtText();
  });
});

test.describe('Dateien eines Commits sehen', () => {
  test('soll beim Start den ersten Commit mit seinen Dateien in git-Reihenfolge zeigen', async ({ review }) => {
    await review.starten({ commits: ['p', 'q', 'r'] });

    await review.commitGewaehlt('p');
    await review.dateienZeigen(DATEIEN_VON_P);
  });

  test('soll geänderte, gelöschte, umbenannte und binäre Dateien mit Summe ohne Binärdatei zeigen', async ({ review }) => {
    await review.starten({ commits: ['p', 'q', 'r'] });

    await review.commitAnsehen('q');

    await review.commitGewaehlt('q');
    await review.dateienZeigen(DATEIEN_VON_Q);
  });

  test('soll bei einem leeren Commit „Keine Dateien geändert“ melden', async ({ review }) => {
    await review.starten({ commits: ['p', 'q', 'r'] });

    await review.commitAnsehen('r');

    await review.dateilisteMeldet('Keine Dateien geändert');
  });

  test('soll Pfade mit Umlaut, Leerzeichen und spitzen Klammern als Text zeigen', async ({ review }) => {
    await review.starten({ vorbereitung: 'Sonderzeichen', commits: ['t'] });

    await review.dateienZeigen({
      summe: '2 Dateien · +2 −0',
      reihenfolgeEgal: true,
      eintraege: [{ status: 'A', name: 'ä ö.txt', zahlen: '+1 −0' }, { status: 'A', name: '<b>fett</b>.txt', zahlen: '+1 −0' }],
    });
    await review.fremderTextBleibtText();
  });

  test('soll richtungsändernde Zeichen in Pfaden flach und im Baum als Marke zeigen und die Datei mit ihrem echten Pfad melden', async ({ review }) => {
    await review.starten({ vorbereitung: 'Richtungszeichen', commits: ['v'] });
    await review.dateiwahlenMitschreiben();

    await review.dateienZeigen({
      summe: '2 Dateien · +2 −0',
      reihenfolgeEgal: true,
      eintraege: [{ status: 'A', name: 'a⟨U+202E⟩b⟨U+2066⟩c⟨U+200F⟩.txt' }, { status: 'A', name: 'o⟨U+202E⟩r/ä ö.txt' }],
    });
    await review.richtungszeichenNurAlsMarke();
    await review.dateiAnsehen('a⟨U+202E⟩b⟨U+2066⟩c⟨U+200F⟩.txt');
    await review.gewaehlteDateien(['a⟨U+202E⟩b⟨U+2066⟩c⟨U+200F⟩.txt']);

    await review.alsBaumZeigen();
    await review.dateienZeigen({
      summe: '2 Dateien · +2 −0',
      eintraege: [{ ordner: true, name: 'o⟨U+202E⟩r', tiefe: 0 }, { name: 'ä ö.txt', tiefe: 1 }, { name: 'a⟨U+202E⟩b⟨U+2066⟩c⟨U+200F⟩.txt', tiefe: 0 }],
    });
    await review.richtungszeichenNurAlsMarke();
    await review.gewaehlteDateien(['a⟨U+202E⟩b⟨U+2066⟩c⟨U+200F⟩.txt']);
    await review.dateiAnsehen('ä ö.txt');

    await review.dateiwahlenWaren([
      { commit: 'v', pfad: PFAD_MIT_RICHTUNGSZEICHEN, status: 'A' },
      { commit: 'v', pfad: 'o\u202Er/ä ö.txt', status: 'A' },
    ]);
  });

  test('soll aus einem Unterordner gestartet alle Dateien des Commits mit Pfad ab der Wurzel zeigen', async ({ review }) => {
    await review.starten({ vorbereitung: 'Start im Unterordner', commits: ['w'] });

    await review.dateienZeigen({
      summe: '2 Dateien · +2 −0',
      reihenfolgeEgal: true,
      eintraege: [{ status: 'A', name: 'a.txt', zahlen: '+1 −0' }, { status: 'A', name: 'unten/b.txt', zahlen: '+1 −0' }],
    });
  });

  test('soll die Dateien als Baum mit Ordnern vor Dateien zeigen und die Darstellung beim Commit-Wechsel behalten', async ({ review }) => {
    await review.starten({ commits: ['p', 'q', 'r'] });
    await review.commitAnsehen('q');
    await review.dateienZeigen(DATEIEN_VON_Q);

    await review.alsBaumZeigen();
    await review.dateienZeigen({
      summe: DATEIEN_VON_Q.summe,
      eintraege: [
        { ordner: true, name: 'src', tiefe: 0 }, { name: 'b.txt', tiefe: 1 }, { name: 'alt.txt', tiefe: 0 }, { name: 'LIESMICH.md', tiefe: 0 }, { name: 'logo.bin', tiefe: 0 },
      ],
    });

    await review.commitAnsehen('p');
    await review.dateienZeigen({
      summe: DATEIEN_VON_P.summe,
      eintraege: [{ ordner: true, name: 'src', tiefe: 0 }, { name: 'a.txt', tiefe: 1 }, { name: 'b.txt', tiefe: 1 }, { name: 'alt.txt', tiefe: 0 }, { name: 'README.md', tiefe: 0 }],
    });

    await review.flachZeigen();
    await review.dateienZeigen(DATEIEN_VON_P);
  });

  test('soll genau die angesehene Datei gewählt halten und die Wahl beim Commit-Wechsel aufheben', async ({ review }) => {
    await review.starten({ commits: ['p', 'q', 'r'] });
    await review.commitAnsehen('q');
    await review.dateienZeigen(DATEIEN_VON_Q);
    await review.dateiwahlenMitschreiben();

    await review.dateiAnsehen('src/b.txt');
    await review.gewaehlteDateien(['src/b.txt']);
    await review.dateiAnsehen('LIESMICH.md');
    await review.gewaehlteDateien(['LIESMICH.md']);
    await review.commitAnsehen('p');
    await review.dateienZeigen(DATEIEN_VON_P);
    await review.gewaehlteDateien([]);

    await review.dateiwahlenWaren([
      { commit: 'q', pfad: 'src/b.txt', status: 'M' },
      { commit: 'q', pfad: 'LIESMICH.md', status: 'R', alterPfad: 'README.md' },
    ]);
  });

  test('soll auch im Baum genau die angesehene Datei gewählt halten', async ({ review }) => {
    await review.starten({ commits: ['p'] });
    await review.dateienZeigen(DATEIEN_VON_P);
    await review.alsBaumZeigen();

    await review.dateiAnsehen('b.txt');

    await review.gewaehlteDateien(['b.txt']);
  });

  test('soll die Dateien des zuletzt gewählten Commits zeigen, auch wenn eine frühere Antwort später kommt', async ({ review }) => {
    await review.starten({ commits: ['p', 'q'] });
    await review.dateienZeigen(DATEIEN_VON_P);
    const antwortFuerQFreigeben = await review.antwortFuerDateienZurueckhalten('q');

    await review.commitAnsehen('q');
    await review.commitAnsehen('p');
    await review.dateienZeigen(DATEIEN_VON_P);
    await antwortFuerQFreigeben();

    await review.commitGewaehlt('p');
    await review.dateienZeigen(DATEIEN_VON_P);
  });
});

test.describe('Dateilisten nur auf Anfrage lesen', () => {
  test('soll die Dateiliste eines Commits erst bei seiner Wahl lesen, einmal je Wahl', async ({ review }) => {
    await review.starten({ commits: ['p', 'q', 'r'], verbose: true });
    await review.dateienZeigen(DATEIEN_VON_P);
    await review.dateilistenGelesen({ p: 1, q: 0, r: 0 });

    await review.commitAnsehen('q');
    await review.dateienZeigen(DATEIEN_VON_Q);
    await review.commitAnsehen('q');
    await review.dateienZeigen(DATEIEN_VON_Q);

    await review.dateilistenGelesen({ p: 1, q: 1, r: 0 });
  });

  test('soll Anfragen ohne vollen Hash der Auswahl abweisen, ohne git zu starten', async ({ review }) => {
    await review.starten({ commits: ['p'] });
    await review.gitAufrufe({ log: 1, show: 1 });

    for (const fremd of ['HEAD', '--output=pwn', review.hash('q'), review.hash('p').slice(0, 7)]) {
      await review.dateienAnfrageAbgewiesen(fremd);
    }

    await review.gitAufrufe({ log: 1, show: 1 });
    review.keineDateiAngelegt('pwn');
    await review.dateienAnfrageBeantwortet('p');
    await review.gitAufrufe({ show: 2 });
  });

  test('soll eine nicht lesbare Dateiliste melden und die Leiste bedienbar lassen', async ({ review }) => {
    await review.starten({ commits: ['p', 'q'] });
    await review.dateienZeigen(DATEIEN_VON_P);
    review.commitObjektEntfernen('q');

    await review.commitAnsehen('q');
    await review.dateilisteMeldet('Dateien konnten nicht gelesen werden');
    await review.commitAnsehen('p');
    await review.dateienZeigen(DATEIEN_VON_P);
    await review.neuLaden();

    await review.leisteZeigt([{ commit: 'p' }, { commit: 'q' }]);
    review.fehlerProtokolliertFuer('q');
    review.ergebnisBleibtLeer();
  });
});

test.describe('Große Reviews', () => {
  test('soll 200 Commits mit Autor und Rumpf spätestens 2 s nach dem Start zeigen, gelesen mit einem git-Aufruf', async ({ review }) => {
    await review.starten({ vorbereitung: '200 Commits', alleCommits: true });

    const dauerMs = await review.leisteRechtzeitigVollstaendig();

    test.info().annotations.push({ type: 'Messwert', description: `200 Zeilen nach ${dauerMs} ms (Grenze 2000 ms)` });
    await review.leisteZeigt([...Array(199).fill({}).map((_, index) => ({ commit: `c${index + 1}` })), { commit: 'c200', betreff: 'Commit Nummer 200', autor: 'Autor 200' }]);
    await review.gitAufrufe({ log: 1 });
  });

  test('soll 2 000 Dateien spätestens 1 s nach dem Klick zeigen', async ({ review }) => {
    await review.starten({ vorbereitung: '2000 Dateien', commits: ['p', 'u'] });
    await review.dateienZeigen({ summe: '1 Datei · +1 −0', eintraege: [{ status: 'A', name: 'README.md' }] });

    const dauerMs = await review.dateienRechtzeitigNachKlick('u', 2000);

    test.info().annotations.push({ type: 'Messwert', description: `2000 Dateizeilen nach ${dauerMs} ms (Grenze 1000 ms)` });
    await review.dateienZeigen({ summe: '2000 Dateien · +2000 −0', eintraege: Array(2000).fill({ status: 'A', zahlen: '+1 −0' }) });
  });
});
