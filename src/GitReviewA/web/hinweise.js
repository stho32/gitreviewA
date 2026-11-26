/* gitreviewA — Tastenhinweise an Bedienelementen aus dem Katalog (R00030, R00039): **der eine Ort**, der `aria-keyshortcuts`
   und das sichtbare `<kbd>` setzt. Review (`tasten.js`) und Dateiansicht (`dateiansicht.js`) rufen ihn mit ihrer Laufart;
   welche Elemente gemeint sind, sagt der Katalog (`tasten-werte.js`, `hinweise(lage)`, Ziel je Laufart). Die Anzeige ist je
   Bedienelement (`data-tasten-hinweis`) gemerkt; fehlt eine Taste (der Diff-Rollbereich wird neu gezeichnet), wird sie
   nachgesetzt. */
(function () {
  'use strict';

  /** Setzt an jedes vom Katalog genannte Bedienelement seinen Hinweis: `aria-keyshortcuts` und je Taste ein verborgenes `<kbd>`. */
  function setzen(wurzel, hinweise) {
    for (const hinweis of hinweise) {
      for (const element of wurzel.querySelectorAll(hinweis.selektor)) {
        const behaelter = element.closest('label') || element;
        if (element.dataset.tastenHinweis === hinweis.aria && hatAlleTasten(behaelter, hinweis.anzeige)) {
          continue;
        }
        element.dataset.tastenHinweis = hinweis.aria;
        element.setAttribute('aria-keyshortcuts', hinweis.aria);
        for (const altesKbd of behaelter.querySelectorAll('kbd.hinweis-taste')) {
          altesKbd.remove();
        }
        for (const taste of hinweis.anzeige) {
          behaelter.append(tastenKbd(taste));
        }
      }
    }
  }

  function hatAlleTasten(behaelter, anzeige) {
    const tasten = [...behaelter.querySelectorAll('kbd.hinweis-taste')].map(kbd => kbd.textContent);
    return anzeige.every(taste => tasten.includes(taste)) && tasten.length === anzeige.length;
  }

  /** Je Taste ein `<kbd>`; für Screenreader verborgen, damit der zugängliche Name des Bedienelements unverändert bleibt. */
  function tastenKbd(taste) {
    const kbd = document.createElement('kbd');
    kbd.className = 'hinweis-taste';
    kbd.setAttribute('aria-hidden', 'true');
    kbd.textContent = taste;
    return kbd;
  }

  window.gitreviewaHinweise = { setzen };
}());
