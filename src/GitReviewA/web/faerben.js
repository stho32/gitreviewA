/* gitreviewA — Syntaxfarben (R00007): Prism läuft nur hier, im Dedicated Worker, nie auf der Seite. Als Worker antwortet die Datei je
   Auftrag nur mit Zahlen; unter Node liefert sie die reine Rechnung für die Bausteintests.
   Herkunft: kanbanD web/faerben.js (R00217, ADR-0037, ADR-0040; MIT). */
(function () {
  'use strict';

  const imWorker = typeof module === 'undefined' && typeof importScripts === 'function';

  /** Prism-`type`/`alias` → Rolle; die Antwort trägt nur den Index (0 Schlüsselwort … 6 Makro, Reihenfolge wie `ROLLEN_KLASSEN` der Seite). */
  const ROLLE_JE_NAME = new Map([
    ['keyword', 0],
    ['string', 1], ['char', 1], ['template-string', 1], ['regex', 1], ['attr-value', 1], ['url', 1],
    ['comment', 2], ['prolog', 2], ['doctype', 2], ['cdata', 2],
    ['number', 3], ['boolean', 3],
    ['function', 4],
    ['class-name', 5],
    ['macro', 6], ['attr-name', 6],
  ]);
  const KEINE_ROLLE = -1;

  /** Zeilen `{art, text}` + Grammatik → `Int32Array` aus Viererpaaren `[Index der Zeile, von, bis, Rolle]` in UTF-16-Versätzen des
      Zeilentexts. Je Abschnitt zwei Seiten: alt = Kontext + entfernt, neu = Kontext + hinzugefügt; entfernte Zeilen nehmen die alte
      Seite, Kontext und hinzugefügte die neue. Ein Hunk-Kopf beginnt einen neuen Abschnitt; er und `\ No newline` gehören zu keiner Seite.
      Ohne Kopf (Ansicht „ganze Datei“) sind alle Zeilen ein Abschnitt. */
  function hunkTokens(zeilen, grammatik, prism) {
    const stuecke = [];
    let abschnitt = [];
    for (let index = 0; index < zeilen.length; index += 1) {
      const art = zeilen[index].art;
      if (art === 'kopf') {
        abschnittFaerben(zeilen, abschnitt, grammatik, prism, stuecke);
        abschnitt = [];
      } else if (art !== 'hinweis') {
        abschnitt.push(index);
      }
    }
    abschnittFaerben(zeilen, abschnitt, grammatik, prism, stuecke);
    return Int32Array.from(stuecke);
  }

  function abschnittFaerben(zeilen, abschnitt, grammatik, prism, stuecke) {
    const alteSeite = abschnitt.filter(index => zeilen[index].art !== 'plus');
    const neueSeite = abschnitt.filter(index => zeilen[index].art !== 'minus');
    const nurEntfernte = alteSeite.map(index => zeilen[index].art === 'minus');
    seiteFaerben(zeilen, alteSeite, nurEntfernte, grammatik, prism, stuecke);
    seiteFaerben(zeilen, neueSeite, neueSeite.map(() => true), grammatik, prism, stuecke);
  }

  /** Eine Seite als ein Text tokenisieren und die Stücke an `\n` auf ihre Zeilen legen; `nimmt[k]`: die k-te Zeile bekommt ihre Farbe von hier. */
  function seiteFaerben(zeilen, seite, nimmt, grammatik, prism, stuecke) {
    if (seite.length === 0) {
      return;
    }
    const stelle = { zeile: 0, spalte: 0 };
    const ablegen = (text, rolle) => {
      const teile = text.split('\n');
      teile.forEach((teil, nummer) => {
        if (nummer > 0) {
          stelle.zeile += 1;
          stelle.spalte = 0;
        }
        const hatFarbe = teil.length > 0 && rolle !== KEINE_ROLLE && nimmt[stelle.zeile];
        if (hatFarbe) {
          stuecke.push(seite[stelle.zeile], stelle.spalte, stelle.spalte + teil.length, rolle);
        }
        stelle.spalte += teil.length;
      });
    };
    const text = seite.map(index => zeilen[index].text).join('\n');
    tokenGehen(prism.tokenize(text, grammatik), KEINE_ROLLE, ablegen);
  }

  /** Bei verschachtelten Tokens gewinnt die innerste Rolle; ohne eigene Rolle gilt die des umgebenden Tokens. */
  function tokenGehen(strom, aussen, ablegen) {
    for (const token of strom) {
      if (typeof token === 'string') {
        ablegen(token, aussen);
        continue;
      }
      const rolle = rolleVon(token, aussen);
      if (typeof token.content === 'string') {
        ablegen(token.content, rolle);
      } else {
        tokenGehen([].concat(token.content), rolle, ablegen);
      }
    }
  }

  function rolleVon(token, aussen) {
    if (ROLLE_JE_NAME.has(token.type)) {
      return ROLLE_JE_NAME.get(token.type);
    }
    for (const alias of [].concat(token.alias || [])) {
      if (ROLLE_JE_NAME.has(alias)) {
        return ROLLE_JE_NAME.get(alias);
      }
    }
    return aussen;
  }

  if (!imWorker) {
    module.exports = { hunkTokens, prism: require('./vendor/prism.js') };
    return;
  }

  /* ── Im Worker ── */

  /** Der eingebaute Nachrichten-Hörer von Prism (JSON rein, `highlight`-HTML raus) wird vor dem Laden abgeschaltet. Ein Ladefehler lässt
      `prism` leer: jeder Auftrag wird dann mit `{fehler}` beantwortet, die Datei bleibt ohne Farbe. */
  function prismLaden() {
    self.Prism = { disableWorkerMessageHandler: true };
    try {
      importScripts('vendor/prism.js');
      return self.Prism;
    } catch {
      return null;
    }
  }

  const prism = prismLaden();

  /** Auftrag `{sprache, zeilen}` → das `Int32Array` (übertragen) oder `{fehler}`; die Nachfrage `{art: 'bereit'}` → `{bereit: true}`.
      Alles andere (fremde Nachrichten) bleibt ohne Antwort. */
  function auftragBeantworten(ereignis) {
    const auftrag = ereignis.data;
    if (auftrag && auftrag.art === 'bereit') {
      self.postMessage({ bereit: true });
      return;
    }
    const istAuftrag = auftrag && typeof auftrag.sprache === 'string' && Array.isArray(auftrag.zeilen);
    if (!istAuftrag) {
      return;
    }
    try {
      const stuecke = hunkTokens(auftrag.zeilen, grammatikVon(auftrag.sprache), prism);
      self.postMessage(stuecke, [stuecke.buffer]);
    } catch {
      self.postMessage({ fehler: true });
    }
  }

  function grammatikVon(sprache) {
    const bekannt = prism && Object.prototype.hasOwnProperty.call(prism.languages, sprache);
    if (!bekannt) {
      throw new Error('keine Grammatik');
    }
    return prism.languages[sprache];
  }

  self.addEventListener('message', auftragBeantworten);
}());
