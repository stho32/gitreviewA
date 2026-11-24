/* gitreviewA — Schlange des Färbe-Workers (R00007): ein Worker, beim ersten Bedarf angelegt, ein Auftrag zur Zeit, Frist ab Übergabe mit
   Abbruch, veraltete Aufträge und Antworten verworfen, Fehler still. Im Browser und in Node (Bausteintests mit Fake-Worker).
   Herkunft: kanbanD web/farbschlange.js (R00217, ADR-0040 Punkt 4; MIT). */
(function (ziel) {
  'use strict';

  /** So lange darf der Worker an einem Auftrag rechnen, gezählt ab der Übergabe; ebenso lange darf ein neuer Worker zum Laden brauchen. */
  const FRIST_MS = 1000;
  const BEREIT_NACHFRAGE = { art: 'bereit' };
  const ECHTE_UHR = { setTimeout: (aufgabe, ms) => setTimeout(aufgabe, ms), clearTimeout: wecker => clearTimeout(wecker) };

  /** `workerAnlegen()` liefert einen Worker oder `null` (dann bleibt jede Datei ohne Farbe); `frist` und `uhr` sind für Tests injizierbar.
      Ein Auftrag ist `{sprache, zeilen, aktuell(), fertig(antwort | null)}`: `aktuell()` sagt, ob die Datei noch so gezeigt wird; `fertig`
      bekommt das `Int32Array` oder `null` (ohne Farbe) und wird für einen veralteten Auftrag nie gerufen. */
  function farbschlange({ workerAnlegen, frist = FRIST_MS, uhr = ECHTE_UHR }) {
    const wartend = [];
    let worker = null;
    let bereit = false;
    let laufend = null;
    let wecker = null;

    function stellen(auftrag) {
      wartend.push(auftrag);
      naechster();
    }

    /** Wird die laufende Datei nicht mehr gezeigt, endet ihr Auftrag sofort statt erst mit der Frist. */
    function aufraeumen() {
      if (!laufend || laufend.aktuell()) {
        return;
      }
      verwerfen();
      beenden(null);
    }

    /** Der zuletzt gestellte zuerst; Aufträge nicht mehr gezeigter Dateien fallen heraus. */
    function naechster() {
      if (laufend) {
        return;
      }
      let auftrag = wartend.pop();
      while (auftrag && !auftrag.aktuell()) {
        auftrag = wartend.pop();
      }
      if (!auftrag) {
        return;
      }
      if (!worker && !anlegen()) {
        auftrag.fertig(null);
        naechster();
        return;
      }
      laufend = auftrag;
      if (!bereit) {
        wecker = uhr.setTimeout(fristAbgelaufen, frist);
      }
      uebergeben();
    }

    function anlegen() {
      try {
        worker = workerAnlegen();
      } catch {
        worker = null;
      }
      if (!worker) {
        return false;
      }
      const dieser = worker;
      const nurVomAktuellen = behandeln => ereignis => {
        if (dieser === worker) {
          behandeln(ereignis);
        }
      };
      dieser.onmessage = nurVomAktuellen(nachrichtBehandeln);
      dieser.onmessageerror = nurVomAktuellen(() => beenden(null));
      // Lade- und Laufzeitfehler des Workers nicht in die Konsole: der Worker wird ersetzt, die Datei bleibt ohne Farbe
      dieser.onerror = ereignis => {
        ereignis.preventDefault();
        if (dieser === worker) {
          verwerfen();
          beenden(null);
        }
      };
      bereit = false;
      dieser.postMessage(BEREIT_NACHFRAGE);
      return true;
    }

    function nachrichtBehandeln(ereignis) {
      const meldetBereit = !bereit && ereignis.data && ereignis.data.bereit === true;
      if (meldetBereit) {
        bereit = true;
        uebergeben();
        return;
      }
      if (ereignis.data instanceof Int32Array) {
        beenden(ereignis.data);
        return;
      }
      beenden(null);
    }

    /** Den laufenden Auftrag an einen bereiten Worker geben; die Frist zählt ab hier. */
    function uebergeben() {
      if (!laufend || !bereit) {
        return;
      }
      uhr.clearTimeout(wecker);
      wecker = uhr.setTimeout(fristAbgelaufen, frist);
      worker.postMessage({ sprache: laufend.sprache, zeilen: laufend.zeilen });
    }

    function fristAbgelaufen() {
      verwerfen();
      beenden(null);
    }

    function verwerfen() {
      if (worker) {
        worker.terminate();
      }
      worker = null;
      bereit = false;
    }

    /** Ende des laufenden Auftrags: Ergebnis an die Datei, wenn sie noch gezeigt wird, dann der nächste. */
    function beenden(antwort) {
      const auftrag = laufend;
      laufend = null;
      uhr.clearTimeout(wecker);
      wecker = null;
      try {
        if (auftrag && auftrag.aktuell()) {
          auftrag.fertig(antwort);
        }
      } finally {
        naechster();
      }
    }

    return { stellen, aufraeumen };
  }

  Object.assign(ziel, { farbschlange, FRIST_MS });
})(typeof module !== 'undefined' ? module.exports : window);
