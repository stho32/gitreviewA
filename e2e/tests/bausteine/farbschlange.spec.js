'use strict';
// Integrationstests (ohne Browser) der Farbschlange (R00007): Fake-Worker und injizierte Uhr statt Zeit; ein Auftrag zur Zeit, Frist,
// veraltete Aufträge, Ladefehler, Ausnahme, kein Worker.
const { test, expect } = require('@playwright/test');
const { farbschlange, FRIST_MS } = require('../../../src/GitReviewA/web/farbschlange.js');

/** Ein Worker, der nur auf Anweisung des Tests antwortet; merkt sich Nachrichten und `terminate`. */
function fakeWorker() {
  const worker = {
    nachrichten: [],
    beendet: false,
    postMessage(nachricht) {
      worker.nachrichten.push(nachricht);
    },
    terminate() {
      worker.beendet = true;
    },
    antworten: daten => worker.onmessage({ data: daten }),
    bereitMelden: () => worker.antworten({ bereit: true }),
    fehlerMelden: () => {
      const ereignis = { verhindert: false, preventDefault: () => { ereignis.verhindert = true; } };
      worker.onerror(ereignis);
      return ereignis;
    },
    auftraege: () => worker.nachrichten.filter(nachricht => nachricht.art !== 'bereit'),
  };
  return worker;
}

/** Uhr, die nur auf `vorstellen` läuft. */
function testUhr() {
  let jetzt = 0;
  let nummer = 0;
  const wecker = new Map();
  return {
    setTimeout(aufgabe, ms) {
      nummer += 1;
      wecker.set(nummer, { faelligUm: jetzt + ms, aufgabe });
      return nummer;
    },
    clearTimeout(id) {
      wecker.delete(id);
    },
    vorstellen(ms) {
      jetzt += ms;
      for (const [id, { faelligUm, aufgabe }] of [...wecker]) {
        if (faelligUm <= jetzt && wecker.has(id)) {
          wecker.delete(id);
          aufgabe();
        }
      }
    },
  };
}

function aufbau() {
  const worker = [];
  const uhr = testUhr();
  const schlange = farbschlange({
    workerAnlegen: () => {
      const neu = fakeWorker();
      worker.push(neu);
      return neu;
    },
    uhr,
  });
  return { worker, uhr, schlange };
}

function auftrag(sprache = 'javascript') {
  const ergebnis = { sprache, zeilen: [{ art: 'plus', text: 'var a;' }], gezeigt: true, antworten: [] };
  ergebnis.aktuell = () => ergebnis.gezeigt;
  ergebnis.fertig = antwort => ergebnis.antworten.push(antwort);
  return ergebnis;
}

const ANTWORT = Int32Array.from([0, 0, 3, 0]);

test.describe('Baustein Farbschlange', () => {
  test('soll den Auftrag erst nach „bereit“ übergeben und die Antwort zustellen', () => {
    const { worker, schlange } = aufbau();
    const a = auftrag();

    schlange.stellen(a);
    expect(worker[0].nachrichten).toEqual([{ art: 'bereit' }]);
    worker[0].bereitMelden();
    expect(worker[0].auftraege()).toEqual([{ sprache: 'javascript', zeilen: a.zeilen }]);
    worker[0].antworten(ANTWORT);

    expect(a.antworten).toEqual([ANTWORT]);
  });

  test('soll nach der Antwort keine Frist mehr laufen lassen: der Worker bleibt für den nächsten Auftrag', () => {
    const { worker, uhr, schlange } = aufbau();
    schlange.stellen(auftrag());
    worker[0].bereitMelden();
    worker[0].antworten(ANTWORT);

    uhr.vorstellen(FRIST_MS * 2);
    schlange.stellen(auftrag('rust'));

    expect(worker[0].beendet).toBe(false);
    expect(worker).toHaveLength(1);
    expect(worker[0].auftraege().map(nachricht => nachricht.sprache)).toEqual(['javascript', 'rust']);
  });

  test('soll einen Auftrag zur Zeit rechnen und denselben Worker weiter nutzen', () => {
    const { worker, schlange } = aufbau();
    const erster = auftrag();
    const zweiter = auftrag('rust');
    schlange.stellen(erster);
    worker[0].bereitMelden();

    schlange.stellen(zweiter);
    expect(worker[0].auftraege()).toHaveLength(1);
    worker[0].antworten(ANTWORT);

    expect(erster.antworten).toEqual([ANTWORT]);
    expect(worker[0].auftraege().map(nachricht => nachricht.sprache)).toEqual(['javascript', 'rust']);
    expect(worker).toHaveLength(1);
  });

  test('soll nach der Frist von 1 000 ms den Worker beenden, ohne Farbe enden und den nächsten mit neuem Worker rechnen (Kriterium 7)', () => {
    const { worker, uhr, schlange } = aufbau();
    const teuer = auftrag('markdown');
    const gut = auftrag('rust');
    schlange.stellen(teuer);
    worker[0].bereitMelden();

    uhr.vorstellen(FRIST_MS - 1);
    expect(teuer.antworten).toEqual([]);
    expect(worker[0].beendet).toBe(false);
    uhr.vorstellen(1);
    expect(teuer.antworten).toEqual([null]);
    expect(worker[0].beendet).toBe(true);
    schlange.stellen(gut);
    worker[1].bereitMelden();
    worker[1].antworten(ANTWORT);

    expect(FRIST_MS).toBe(1000);
    expect(gut.antworten).toEqual([ANTWORT]);
  });

  test('soll die Frist erst ab der Übergabe zählen, das Laden hat eine eigene', () => {
    const { worker, uhr, schlange } = aufbau();
    const a = auftrag();
    schlange.stellen(a);

    uhr.vorstellen(900);
    worker[0].bereitMelden();
    uhr.vorstellen(900);
    expect(a.antworten).toEqual([]);
    uhr.vorstellen(100);

    expect(a.antworten).toEqual([null]);
  });

  test('soll ohne Farbe enden, wenn ein neuer Worker nicht bereit wird', () => {
    const { worker, uhr, schlange } = aufbau();
    const a = auftrag();
    schlange.stellen(a);

    uhr.vorstellen(FRIST_MS);

    expect(a.antworten).toEqual([null]);
    expect(worker[0].beendet).toBe(true);
  });

  test('soll eine Antwort für eine nicht mehr gezeigte Datei verwerfen und deren Worker beim Aufräumen beenden', () => {
    const { worker, schlange } = aufbau();
    const alt = auftrag();
    schlange.stellen(alt);
    worker[0].bereitMelden();

    alt.gezeigt = false;
    schlange.aufraeumen();
    worker[0].antworten(ANTWORT);

    expect(alt.antworten).toEqual([]);
    expect(worker[0].beendet).toBe(true);
  });

  test('soll eine späte Antwort des beendeten Workers nicht dem neuen Auftrag zustellen (Kriterium 13)', () => {
    const { worker, schlange } = aufbau();
    const alt = auftrag();
    const neu = auftrag();
    schlange.stellen(alt);
    worker[0].bereitMelden();
    alt.gezeigt = false;
    schlange.aufraeumen();
    schlange.stellen(neu);
    worker[1].bereitMelden();

    worker[0].antworten(Int32Array.from([9, 9, 9, 9]));
    expect(neu.antworten).toEqual([]);
    worker[1].antworten(ANTWORT);

    expect(neu.antworten).toEqual([ANTWORT]);
    expect(alt.antworten).toEqual([]);
  });

  test('soll wartende Aufträge nicht mehr gezeigter Dateien überspringen', () => {
    const { worker, schlange } = aufbau();
    const laufend = auftrag();
    const veraltet = auftrag('rust');
    const aktuell = auftrag('python');
    schlange.stellen(laufend);
    worker[0].bereitMelden();
    schlange.stellen(veraltet);
    schlange.stellen(aktuell);
    veraltet.gezeigt = false;

    worker[0].antworten(ANTWORT);
    worker[0].antworten(ANTWORT);

    expect(worker[0].auftraege().map(nachricht => nachricht.sprache)).toEqual(['javascript', 'python']);
    expect(veraltet.antworten).toEqual([]);
    expect(aktuell.antworten).toEqual([ANTWORT]);
  });

  test('soll bei einer Ausnahme in der Färbung ohne Farbe enden (Kriterium 6c)', () => {
    const { worker, schlange } = aufbau();
    const a = auftrag();
    schlange.stellen(a);
    worker[0].bereitMelden();

    worker[0].antworten({ fehler: true });

    expect(a.antworten).toEqual([null]);
  });

  test('soll bei einem Ladefehler des Workers still ohne Farbe enden und den Worker ersetzen (Kriterium 6a)', () => {
    const { worker, schlange } = aufbau();
    const a = auftrag();
    const danach = auftrag();
    schlange.stellen(a);

    const ereignis = worker[0].fehlerMelden();
    schlange.stellen(danach);

    expect(ereignis.verhindert).toBe(true);
    expect(a.antworten).toEqual([null]);
    expect(worker[0].beendet).toBe(true);
    expect(worker).toHaveLength(2);
  });

  test('soll ohne Worker jeden Auftrag ohne Farbe beenden (Kriterium 6b)', () => {
    const ohne = farbschlange({ workerAnlegen: () => null, uhr: testUhr() });
    const wirft = farbschlange({ workerAnlegen: () => { throw new Error('kein Worker'); }, uhr: testUhr() });
    const a = auftrag();
    const b = auftrag();

    ohne.stellen(a);
    wirft.stellen(b);

    expect(a.antworten).toEqual([null]);
    expect(b.antworten).toEqual([null]);
  });
});
