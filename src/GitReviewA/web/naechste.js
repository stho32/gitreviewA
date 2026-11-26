/* gitreviewA — Nächste ungeprüfte (R00028): der Knopf in der Werkzeugzeile der Dateiliste springt von der aktuellen Wahl zur
   nächsten ungeprüften Stelle — in „Zusammen“ je Datei, in „Einzeln“ je Stelle (Commit und Datei), über Commits hinweg, mit Umlauf;
   abgehakte und gesperrte Stellen werden übersprungen, ausgeblendete Dateien (R00025) sind keine Einträge und werden nie ein Ziel, und
   die Meldung nennt sie als „n ausgeblendet“. Die gefundene Zeile wird gewählt (derselbe Weg wie ein Klick: `datei-gewaehlt`
   lädt den Diff, in „Einzeln“ wechselt vorher der Commit mit), sie kommt in den Blick; der Fokus bleibt auf dem Knopf, damit ein
   weiterer Druck weitergeht. Gelesen wird nur die schon geladene Liste (`dateiliste-gezeichnet`), die Sicht des Ausblendens und der
   Stand des Hakens — kein neuer Serverweg, kein neuer `git`-Aufruf, kein Nachladen. Die Suche selbst rechnet `naechste-werte.js`. */
(function () {
  'use strict';

  /** `sicht`: die zuletzt gezeichnete Liste mit Modus und Commit; `ausstehend`: das Ziel, dessen Commit erst noch gezeigt werden muss. */
  const zustand = { sicht: null, ausstehend: null };

  function init() {
    for (const knopf of [document.getElementById('naechste-ungepruefte'), document.querySelector('#diff .erste-ungepruefte')]) {
      if (knopf) {
        knopf.addEventListener('click', springen);
      }
    }
    document.addEventListener('dateiliste-gezeichnet', ereignis => {
      zustand.sicht = { modus: ereignis.detail.modus, commit: ereignis.detail.commit, dateien: ereignis.detail.dateien };
      springeAusstehend();
      zeigeZustand();
    });
    for (const ereignis of ['haken-stand-geladen', 'haken-geaendert', 'datei-gewaehlt', 'wahl-aufgehoben', 'diff-geleert', 'diff-gezeichnet']) {
      document.addEventListener(ereignis, zeigeZustand);
    }
    document.addEventListener('modus-gewechselt', () => {
      zustand.ausstehend = null;
      zeigeZustand();
    });
    document.addEventListener('diff-geleert', zeigeLeerenDiffKnopf);
    document.addEventListener('diff-gezeichnet', zeigeLeerenDiffKnopf);
    zeigeZustand();
    zeigeLeerenDiffKnopf();
  }

  /* ── Knopf und Meldung (B2704) ── */

  /** Ist keine ungeprüfte Stelle mehr erreichbar, ist der Knopf nicht bedienbar und die Meldung nennt den Grund (R00014, R00028). */
  function zeigeZustand() {
    const knopf = document.getElementById('naechste-ungepruefte');
    const meldung = document.getElementById('naechste-meldung');
    if (!knopf || !meldung) {
      return;
    }
    const eintraege = eintraegeJetzt();
    if (eintraege === null) {
      knopf.disabled = true;
      meldung.textContent = '';
      return;
    }
    knopf.disabled = naechsteWerte().naechster(eintraege, aktuelleStelle()) === naechsteWerte().KEINE;
    const hatAussage = eintraege.length > 0 || ausgeblendeteZahl() > 0;
    if (knopf.disabled && hatAussage) {
      meldung.textContent = meldungstext(eintraege);
    } else {
      meldung.textContent = '';
    }
  }

  /** `k nicht lesbar` zählt die gesperrten Einträge (in „Zusammen“ Dateien, in „Einzeln“ Stellen) — dieselbe Klasse wie R00014;
      `n ausgeblendet` zählt die verdeckten offenen Dateien (R00025, Szenario 6). */
  function meldungstext(eintraege) {
    const werte = naechsteWerte();
    return werte.meldung({
      nichtLesbar: eintraege.filter(eintrag => eintrag.zustand === werte.GESPERRT).length,
      ausgeblendet: ausgeblendeteZahl(),
    });
  }

  /** Zahl der ausgeblendeten Dateien, die noch offen sind — die verdeckten Einträge der Sicht, in der Rechnung des Modus (R00025). */
  function ausgeblendeteZahl() {
    const haken = window.gitreviewaHaken;
    if (!haken || !haken.istLesbar()) {
      return 0;
    }
    const werte = naechsteWerte();
    const stand = standJetzt(haken);
    if (window.gitreviewaModus.istZusammen()) {
      const sicht = zustand.sicht;
      if (sicht === null || sicht.modus !== window.gitreviewaModusWerte.ZUSAMMEN) {
        return 0;
      }
      return werte.ausgeblendeteOffene(window.gitreviewaModusWerte.ZUSAMMEN, verdeckteListe(sicht.dateien), stand);
    }
    return werte.ausgeblendeteOffene(window.gitreviewaModusWerte.EINZELN, verdeckteStellen(haken.stellen()), stand);
  }

  /** Derselbe Weg im leeren Diff-Bereich („Erste ungeprüfte öffnen“), solange keine Datei gewählt ist. */
  function zeigeLeerenDiffKnopf() {
    const knopf = document.querySelector('#diff .erste-ungepruefte');
    if (!knopf) {
      return;
    }
    const pfad = document.querySelector('#diff .diff-pfad');
    knopf.hidden = !(pfad === null || pfad.textContent === '');
  }

  /* ── Der Sprung ── */

  function springen() {
    const eintraege = eintraegeJetzt();
    const index = eintraege === null ? -1 : naechsteWerte().naechster(eintraege, aktuelleStelle());
    if (index === -1) {
      return;
    }
    springeZu(eintraege[index]);
  }

  function springeZu(ziel) {
    if (ziel.art !== 'stelle') {
      waehleZeile(ziel.pfad);
      return;
    }
    if (ziel.commit !== (zustand.sicht ? zustand.sicht.commit : null)) {
      zustand.ausstehend = { commit: ziel.commit, pfad: ziel.pfad };
      wechsleCommit(ziel.commit);
      return;
    }
    waehleZeile(ziel.pfad);
  }

  /**
   * Die nächste Zeile wartet auf ihre Liste: der Commit ist gewechselt, gezeichnet wird sie erst danach. Der Klick kommt erst nach dem
   * laufenden Zeichnen — `dateiliste.js` hebt nach dem Zeichnen die Wahl auf (`wahl-aufgehoben`), die sonst gerade diese Wahl samt
   * laufender Diff-Ladung wieder verwerfen würde.
   */
  function springeAusstehend() {
    const ausstehend = zustand.ausstehend;
    if (ausstehend === null || zustand.sicht.commit !== ausstehend.commit) {
      return;
    }
    zustand.ausstehend = null;
    queueMicrotask(() => waehleZeile(ausstehend.pfad));
  }

  /** Die Wahl über den vorhandenen Weg: ein Klick auf die Zeile der Dateiliste (I0027) — keine zweite Wahl-Logik. */
  function waehleZeile(pfad) {
    const zeile = zeileFuer(pfad);
    if (zeile === null) {
      return;
    }
    zeile.click();
    zeile.scrollIntoView({ block: 'nearest' });
  }

  function zeileFuer(pfad) {
    for (const zeile of document.querySelectorAll('#datei-zeilen .datei-zeile')) {
      if (zeile.dataset.pfad === pfad) {
        return zeile;
      }
    }
    return null;
  }

  /** In „Einzeln“ trägt jede Stelle ihren Commit; er wechselt über die vorhandene Commit-Leiste (I0027, B1104). */
  function wechsleCommit(hash) {
    for (const zeile of document.querySelectorAll('#commit-liste .commit-zeile')) {
      if (zeile.dataset.hash === hash) {
        zeile.querySelector('.commit-wahl').click();
        return;
      }
    }
  }

  /* ── Einträge und Stand ── */

  /** Die Einträge der Sicht mit Zustand; `null`, solange Liste oder Stand noch fehlen. Gelesen wird die **sichtbare** Liste (R00025). */
  function eintraegeJetzt() {
    const sicht = zustand.sicht;
    const haken = window.gitreviewaHaken;
    if (!haken || !haken.istLesbar()) {
      return null;
    }
    const stand = standJetzt(haken);
    if (window.gitreviewaModus.istZusammen()) {
      if (sicht === null || sicht.modus !== window.gitreviewaModusWerte.ZUSAMMEN) {
        return null;
      }
      return geordnet(naechsteWerte().eintraege(window.gitreviewaModusWerte.ZUSAMMEN, sichtbareListe(sicht.dateien), stand));
    }
    // In „Einzeln“ sind die Stellen des Stands die Einträge — alle Stellen der Auswahl, also über Commits hinweg, aber nur die sichtbaren Dateien.
    return geordnet(naechsteWerte().eintraege(window.gitreviewaModusWerte.EINZELN, sichtbareStellen(haken.stellen()), stand));
  }

  /**
   * Die Suche folgt der **gezeigten** Reihenfolge (R00040): Gruppe für Gruppe (Code, Tests, Doku), innerhalb einer Gruppe die
   * Reihenfolge von Zeile 66 (Commits wie in der Leiste, je Commit die Reihenfolge von `git`). Die Regel selbst steht in
   * `gruppen-werte.js` — hier nur der Anschluss.
   */
  function geordnet(eintraege) {
    const werte = window.gitreviewaGruppenWerte;
    if (!werte) {
      return eintraege;
    }
    const mitNamen = eintraege.map(eintrag => ({ ...eintrag, anzeigename: sichtbarerName(eintrag.pfad) }));
    return werte.nachGruppen(mitNamen).flatMap(gruppe => gruppe.eintraege);
  }

  function sichtbarerName(pfad) {
    return window.sichtbarerName ? window.sichtbarerName(pfad) : pfad;
  }

  /** Der bestätigte Zustand je Stelle — dieselbe Auskunft für die Einträge der Suche und für die verdeckten Dateien der Meldung. */
  function standJetzt(haken) {
    return {
      istAbgehakt: (commit, pfad) => haken.istAbgehakt(commit, pfad),
      istGesperrt: (commit, pfad) => haken.sperrgrund(commit, pfad) !== '',
    };
  }

  /** Ausblenden (R00025) und Suche (R00049) sind Sichten auf dieselbe Liste: hier gilt dieselbe wie in der Dateiliste —
      kein eigener Filter, nur `gitreviewaAusblenden` und der Suchlauf aus `dateisuche.js`. */
  function istSichtbar(pfad) {
    if (!passtZurSuche(pfad)) {
      return false;
    }
    return !window.gitreviewaAusblenden || window.gitreviewaAusblenden.istSichtbar(pfad);
  }

  /** Ob der Pfad zum Suchtext passt; ohne Suche (`null`) passt jeder. */
  function passtZurSuche(pfad) {
    const suche = window.gitreviewaDateisuche;
    const treffer = suche ? suche.treffer() : null;
    return treffer === null || treffer.has(pfad);
  }

  function sichtbareListe(dateien) {
    return dateien.filter(datei => istSichtbar(datei.pfad));
  }

  function sichtbareStellen(stellen) {
    return stellen.filter(stelle => istSichtbar(stelle.datei));
  }

  /** Die verdeckten Einträge: sie sind keine Ziele, zählen aber als „n ausgeblendet“, solange sie offen sind. */
  function verdeckteListe(dateien) {
    return dateien.filter(datei => !istSichtbar(datei.pfad));
  }

  function verdeckteStellen(stellen) {
    return stellen.filter(stelle => !istSichtbar(stelle.datei));
  }

  /** Die Stelle der aktuellen Wahl; ohne Wahl `null` (dann beginnt die Suche beim ersten Eintrag). */
  function aktuelleStelle() {
    const liste = window.gitreviewaDateiliste;
    const wahl = liste ? liste.gewaehlt() : null;
    return wahl === null ? null : { pfad: wahl.pfad, commit: wahl.commit };
  }

  function naechsteWerte() {
    return window.gitreviewaNaechsteWerte;
  }

  document.addEventListener('DOMContentLoaded', init);
}());
