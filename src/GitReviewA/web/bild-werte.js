/* gitreviewA — Werte der Bildanzeige (R00024): welche Seiten eine Datei hat, ihre Beschriftung, der Dateiname und die Größe.
   Reine Funktionen, im Browser und in Node. Der neue Pfad führt, der alte steht daneben (PO 2026-11-25). */
(function (ziel) {
  'use strict';

  const EINHEITEN = [
    { grenze: 1024 * 1024, teiler: 1024 * 1024, name: 'MB' },
    { grenze: 1024, teiler: 1024, name: 'KB' },
  ];

  /** Welche Fassungen die gewählte Datei hat: neu (`A`) nur `nachher`, gelöscht (`D`) nur `vorher`, sonst beide. */
  function seitenFuer(status) {
    if (status === 'A') {
      return ['nachher'];
    }
    if (status === 'D') {
      return ['vorher'];
    }
    return ['vorher', 'nachher'];
  }

  function seitenText(seite) {
    return seite === 'vorher' ? 'vorher' : 'nachher';
  }

  /** Der Dateiname der Seite: `vorher` bei einer Umbenennung der alte Pfad, sonst der Pfad. */
  function seitenName(datei, seite) {
    if (seite === 'vorher' && datei.alterPfad) {
      return datei.alterPfad;
    }
    return datei.pfad;
  }

  /** Warum eine Seite fehlt: „neu“ (nur `nachher` bei `A`) oder „gelöscht“ (nur `vorher` bei `D`); sonst `null`. */
  function grundFuer(datei, seite) {
    if (datei.status === 'A' && seite === 'nachher') {
      return 'neu';
    }
    if (datei.status === 'D' && seite === 'vorher') {
      return 'gelöscht';
    }
    return null;
  }

  /** Bytes als Text in deutscher Schreibweise: „70 Byte“, „1,8 KB“, „2,0 MB“. */
  function groesseText(bytes) {
    for (const einheit of EINHEITEN) {
      if (bytes >= einheit.grenze) {
        return `${dezimal(bytes / einheit.teiler)} ${einheit.name}`;
      }
    }
    return `${bytes} Byte`;
  }

  function dezimal(wert) {
    return wert.toFixed(1).replace('.', ',');
  }

  Object.assign(ziel, { seitenFuer, seitenText, seitenName, grundFuer, groesseText });
})(typeof module !== 'undefined' ? module.exports : (window.gitreviewaBildWerte = window.gitreviewaBildWerte || {}));
