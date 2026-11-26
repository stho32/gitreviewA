/* gitreviewA — Dateiansicht (R00043): Kopf und Rollbereich, Zeilen mit Nummern, Färbung aus dem Worker und Umbruch.
   Fremder Name und fremder Inhalt gehen nur als `textContent` ins DOM; Marken entstehen aus `dateiansicht-werte.js`.
   Kein Nachladen: die Seite zeigt den Stand, den der Server beim Start gelesen hat. */
(function () {
  'use strict';

  const ZUGEKLAPPT_AB_ZEILEN = 20001;
  const BLOCK_ZEILEN = 500;
  const NAME_NICHT_GELESEN = 'Datei konnte nicht geladen werden';
  const ZWISCHENABLAGE_VERWEIGERT = 'Zwischenablage verweigert — Strg+C kopiert die Datei';
  const VERWEIGERT_BEREICH = 'Zwischenablage verweigert — Strg+C kopiert den Bereich';
  const DATEIANSICHT = 'dateiansicht';

  const zustand = {
    dateien: [],
    gewaehlt: -1,
    ladung: 0,
    stand: null,
    text: '',
    zeilen: null,
    umbruch: 'an',
    sprache: null,
    stuecke: null,
    aufgedeckt: false,
    bereich: null,
    anker: null,
    ziehen: null,
    ziehenBehandelt: false,
  };

  function werte() {
    return window.gitreviewaDateiansichtWerte;
  }

  /** Die reine Bereichs-Rechnung aus `bereich-werte.js` (R00044, B4221): `bereich`, `ausschnitt`, `bereichsangabe`. */
  function bereichWerte() {
    return window;
  }

  function umbruchWerte() {
    return window.gitreviewaUmbruchWerte;
  }

  function tasten() {
    return window.gitreviewaTastenWerte;
  }

  function init() {
    zustand.umbruch = umbruchWerte().startstellung();
    document.addEventListener('keydown', beiTaste);
    document.getElementById('schliessen').addEventListener('click', schliesse);
    document.getElementById('da-umbruch').addEventListener('change', () => schalteUmbruch());
    document.getElementById('datei-kopieren').addEventListener('click', () => kopiere('datei'));
    document.getElementById('bereich-kopieren').addEventListener('click', () => kopiere('bereich'));
    const inhalt = document.getElementById('da-inhalt');
    inhalt.addEventListener('mousedown', beginneZiehen);
    inhalt.addEventListener('mousemove', zieheWeiter);
    inhalt.addEventListener('click', waehleZeilePerKlick);
    document.addEventListener('mouseup', beendeZiehen);
    document.getElementById('da-dateien').addEventListener('click', beiLeistenklick);
    zeichneHinweise();
    hilfeLageAnmelden();
    sucheAnmelden();
    window.gitreviewaKopieren.zielQuelle(bereichsziel);
    lade();
  }

  /** Die Aktionen, deren Bedienelement diese Laufart gebaut hat — Verfügbarkeit und Hinweis kommen aus dem Katalog (R00030).
      Der Einklapp-Knopf der Seitenleiste entsteht erst in `einklappen.js` (R00035); er zählt nur, wenn er wirklich gebaut ist. */
  function vorhandeneAktionen() {
    const aktionen = ['dateiKopieren', 'bereichKopieren', 'umbruchWechseln', 'suche', 'hilfe'];
    if (document.getElementById('einklappen')) {
      aktionen.push('seitenleisteEinklappen');
    }
    return aktionen;
  }

  async function lade() {
    try {
      const liste = await holeJson('api/dateiansicht');
      zustand.dateien = liste.dateien;
      if (zustand.dateien.length === 0) {
        zeigeMeldung(NAME_NICHT_GELESEN);
        return;
      }
      zeichneLeiste();
      await waehle(0);
    } catch (fehler) {
      zeigeMeldung(`${NAME_NICHT_GELESEN}: ${fehler.message}`);
    }
  }

  /** Die Datei über ihre Nummer laden; eine späte Antwort einer früheren Wahl wird verworfen (R00045, Kriterium 5).
      Markierung und Suchtreffer gehören der Datei, der Umbruch bleibt: der Inhalt wird für die neue Datei neu gezeichnet. */
  async function waehle(nummer) {
    const ladung = (zustand.ladung += 1);
    zustand.gewaehlt = nummer;
    markiereGewaehlt();
    try {
      const inhalt = await holeJson(`api/dateiansicht/${nummer}`);
      if (ladung !== zustand.ladung) {
        return;
      }
      zustand.stand = zustand.dateien[nummer];
      zustand.text = inhalt.text;
      zustand.zeilen = null;
      zustand.stuecke = null;
      zustand.aufgedeckt = false;
      zustand.sprache = window.spracheZuPfad(zustand.stand.echterPfad);
      zeichneKopf(zustand.stand);
      zeichneInhalt();
      faerbe();
    } catch (fehler) {
      if (ladung === zustand.ladung) {
        zeigeMeldung(`${NAME_NICHT_GELESEN}: ${fehler.message}`);
      }
    }
  }

  /** Klick oder `j`/`k` wählen eine andere Datei; die Nummer läuft um (R00045, Kriterien 1 und 2). */
  function schritt(richtung) {
    const anzahl = zustand.dateien.length;
    if (anzahl === 0) {
      return;
    }
    const von = zustand.gewaehlt < 0 ? (richtung > 0 ? -1 : anzahl) : zustand.gewaehlt;
    const ziel = (von + richtung + anzahl) % anzahl;
    if (ziel === zustand.gewaehlt) {
      return;
    }
    waehle(ziel);
    fokussiereZeile(ziel);
  }

  function beiLeistenklick(ereignis) {
    const zeile = ereignis.target.closest('.da-datei');
    if (!zeile) {
      return;
    }
    const nummer = Number(zeile.dataset.nummer);
    if (nummer === zustand.gewaehlt) {
      return;
    }
    waehle(nummer);
  }

  /** Je Datei eine Zeile: Anzeigename (Marken aus dem Server, in der Mitte gekürzt, voll im zugänglichen Namen) und Zeilenzahl. */
  function zeichneLeiste() {
    document.getElementById('da-dateien').replaceChildren(...zustand.dateien.map(dateiElement));
  }

  function dateiElement(datei) {
    const zeile = document.createElement('li');
    zeile.className = 'datei-zeile da-datei';
    zeile.dataset.nummer = String(datei.nummer);
    zeile.tabIndex = -1;
    zeile.setAttribute('aria-current', String(datei.nummer === zustand.gewaehlt));
    zeile.setAttribute('aria-label', datei.anzeigename);
    const name = document.createElement('span');
    name.className = 'da-datei-name';
    name.textContent = werte().pfadKuerzen(datei.anzeigename, 100);
    name.setAttribute('title', datei.anzeigename);
    const anzahl = document.createElement('span');
    anzahl.className = 'da-datei-zeilen';
    anzahl.textContent = werte().zeilenWort(datei.zeilen);
    zeile.append(name, anzahl);
    return zeile;
  }

  /** Die Markierung der Liste folgt der Wahl sofort — auch bevor der Text geladen ist. */
  function markiereGewaehlt() {
    for (const zeile of document.querySelectorAll('#da-dateien .da-datei')) {
      zeile.setAttribute('aria-current', String(Number(zeile.dataset.nummer) === zustand.gewaehlt));
    }
  }

  function fokussiereZeile(nummer) {
    const zeile = document.querySelector(`#da-dateien .da-datei[data-nummer="${nummer}"]`);
    if (zeile) {
      zeile.focus({ preventScroll: true });
      zeile.scrollIntoView({ block: 'nearest' });
    }
  }

  async function holeJson(pfad) {
    const antwort = await fetch(pfad, { headers: { Accept: 'application/json' } });
    if (!antwort.ok) {
      throw new Error(`Antwort ${antwort.status}`);
    }
    return antwort.json();
  }

  /** Angabe, echter Pfad (in der Mitte gekürzt, ganz im zugänglichen Namen), Größe · Zeilen · Kodierung · Zeilenende. */
  function zeichneKopf(stand) {
    document.title = `${stand.anzeigename} — gitreviewA`;
    document.getElementById('da-name').textContent = stand.anzeigename;
    const pfad = document.getElementById('da-pfad');
    const gekuerzt = werte().pfadKuerzen(stand.echterPfad, 100);
    pfad.textContent = gekuerzt;
    pfad.setAttribute('aria-label', stand.echterPfad);
    pfad.setAttribute('title', stand.echterPfad);
    const werteText = `${stand.groesse} Bytes · ${werte().zeilenWort(stand.zeilen)} · ${stand.kodierung} · ${stand.zeilenende}`;
    document.getElementById('da-werte').textContent = werteText;
    const hinweis = document.getElementById('da-hinweis');
    hinweis.textContent = stand.gekuerzteZeilen > 0
      ? `${stand.gekuerzteZeilen === 1 ? '1 Zeile' : `${werte().zahl(stand.gekuerzteZeilen)} Zeilen`} nur gekürzt gezeigt`
      : '';
    const kopieren = document.getElementById('datei-kopieren');
    const istLeer = stand.zeilen === 0 && zustand.text === '';
    kopieren.disabled = istLeer;
    kopieren.setAttribute('title', istLeer ? 'Datei ist leer' : '');
  }

  /** Die Zeilen erst beim Zeichnen bilden: eine zugeklappte Datei mit 8 Mio. Zeilen wird nie als Liste gehalten (G7). */
  function zeilenFuerAnzeige() {
    if (zustand.zeilen === null) {
      zustand.zeilen = werte().zeilenVon(zustand.text);
    }
    return zustand.zeilen;
  }

  function zeichneInhalt() {
    const inhalt = document.getElementById('da-inhalt');
    inhalt.replaceChildren();
    if (zustand.stand.zeilen === 0 && zustand.text === '') {
      const leer = document.createElement('p');
      leer.className = 'da-leer';
      leer.textContent = 'Datei ist leer';
      inhalt.append(leer);
      meldeGezeichnet();
      return;
    }
    if (zustand.stand.zeilen >= ZUGEKLAPPT_AB_ZEILEN && !zustand.aufgedeckt) {
      inhalt.append(zugeklapptElement());
      meldeGezeichnet();
      return;
    }
    zeichneZeilen(inhalt, zeilenFuerAnzeige(), 0, meldeGezeichnet);
  }

  /** Nach jedem vollständigen Zeichnen: die Suche trägt ihre Treffer erneut auf (die Färbung baut die Zeilen neu, R00044). */
  function meldeGezeichnet() {
    document.dispatchEvent(new CustomEvent('da-gezeichnet'));
  }

  /** Über 20 000 Zeilen: zugeklappt mit der Zahl und „Trotzdem laden“ (R00043, R00017); kopiert wird trotzdem alles. */
  function zugeklapptElement() {
    const bereich = document.createElement('div');
    bereich.className = 'da-zugeklappt';
    const text = document.createElement('p');
    text.textContent = `${werte().zahl(zustand.stand.zeilen)} Zeilen — zugeklappt`;
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'btn trotzdem-laden';
    knopf.textContent = 'Trotzdem laden';
    knopf.addEventListener('click', () => {
      zustand.aufgedeckt = true;
      zeichneInhalt();
    });
    bereich.append(text, knopf);
    return bereich;
  }

  /** Zeilen in Blöcken zeichnen (content-visibility), damit eine sehr lange Datei die Seite nicht blockiert. */
  function zeichneZeilen(inhalt, zeilen, ab, fertig) {
    const bis = Math.min(ab + BLOCK_ZEILEN, zeilen.length);
    const block = document.createElement('div');
    block.className = 'da-block';
    for (let nummer = ab; nummer < bis; nummer += 1) {
      block.append(zeileElement(nummer + 1, zeilen[nummer]));
    }
    inhalt.append(block);
    if (bis < zeilen.length) {
      requestAnimationFrame(() => zeichneZeilen(inhalt, zeilen, bis, fertig));
      return;
    }
    if (fertig) {
      fertig();
    }
  }

  function zeileElement(nummer, text) {
    const zeile = document.createElement('div');
    zeile.className = 'da-zeile';
    zeile.dataset.nummer = String(nummer);
    if (istMarkiert(nummer)) {
      zeile.classList.add('da-markiert');
    }
    const nummerElement = document.createElement('span');
    nummerElement.className = 'da-nr';
    nummerElement.setAttribute('aria-hidden', 'true');
    nummerElement.textContent = String(nummer);
    const textElement = document.createElement('span');
    textElement.className = 'da-text';
    textElement.append(...teileElemente(text, stueckeDerZeile(nummer - 1)));
    textElement.dataset.gezeigt = String(gezeigtLaenge(text));
    zeile.append(nummerElement, textElement);
    return zeile;
  }

  /** Die Länge des gezeigten Textes einer Zeile (Marken eingerechnet): Treffer jenseits davon zählt die Suche nur (L5). */
  function gezeigtLaenge(text) {
    return werte().alsMarken(werte().kuerzeZeile(text).gezeigt).length;
  }

  function stueckeDerZeile(index) {
    if (!zustand.stuecke) {
      return [];
    }
    return zustand.stuecke.get(index) || [];
  }

  /** Rohtext → Teile: erst die Kürzung (10 000 Zeichen), dann die Farbstücke, dann die Marken je Teil. */
  function teileElemente(text, stuecke) {
    const gekuerzt = werte().kuerzeZeile(text);
    const beschraenkt = beschraenkeStuecke(stuecke, gekuerzt.gezeigt.length);
    const teile = window.farbteile([{ text: gekuerzt.gezeigt }], beschraenkt);
    const knoten = teile.map(teil => {
      const element = document.createElement('span');
      if (teil.klasse) {
        element.className = teil.klasse;
      }
      element.textContent = werte().alsMarken(teil.text);
      return element;
    });
    if (knoten.length === 0) {
      knoten.push(document.createTextNode(werte().alsMarken(gekuerzt.gezeigt)));
    }
    if (gekuerzt.weitere > 0) {
      const kuerzung = document.createElement('span');
      kuerzung.className = 'da-kuerzung';
      kuerzung.textContent = `… (${werte().zahl(gekuerzt.weitere)} weitere Zeichen)`;
      knoten.push(kuerzung);
    }
    return knoten;
  }

  function beschraenkeStuecke(stuecke, laenge) {
    const beschraenkt = [];
    for (const stueck of stuecke) {
      if (stueck.von >= laenge) {
        continue;
      }
      beschraenkt.push({ von: stueck.von, bis: Math.min(stueck.bis, laenge), klasse: stueck.klasse });
    }
    return beschraenkt;
  }

  /** Syntaxfarben erst nach dem Zeichnen, nur innerhalb der Grenzen aus R00007; ohne Worker bleibt die Datei ungefärbt. */
  function faerbe() {
    const inhalt = zustand.text;
    if (!zustand.sprache || !window.faerbbar(inhalt)) {
      return;
    }
    if (zustand.stand.zeilen >= ZUGEKLAPPT_AB_ZEILEN && !zustand.aufgedeckt) {
      return;
    }
    const schlange = window.farbschlange({ workerAnlegen: () => new Worker('faerben.js') });
    const zeilen = zeilenFuerAnzeige().map(text => ({ art: 'kontext', text }));
    schlange.stellen({
      sprache: zustand.sprache,
      zeilen,
      aktuell: () => true,
      fertig: antwort => {
        if (!antwort) {
          return;
        }
        zustand.stuecke = window.stueckeJeZeile(antwort);
        zeichneInhalt();
      },
    });
  }

  function schalteUmbruch() {
    zustand.umbruch = umbruchWerte().umschalten(zustand.umbruch);
    zeichneUmbruch();
  }

  function zeichneUmbruch() {
    const umbrochen = umbruchWerte().umbrochen(zustand.umbruch);
    document.getElementById('da-umbruch').checked = umbrochen;
    document.getElementById('da-inhalt').classList.toggle('umbr', umbrochen);
  }

  /* ── Bereich markieren (R00044, B4222): Gesten aus I0032 — Klick, Umschalt-Klick, Ziehen, Umschalt+↑/↓, Esc ── */

  function zeilenzahl() {
    return zustand.stand ? zustand.stand.zeilen : 0;
  }

  function istMarkiert(nummer) {
    return Boolean(zustand.bereich) && zustand.bereich.bis >= 1 && nummer >= zustand.bereich.von && nummer <= zustand.bereich.bis;
  }

  /** Setzt den markierten Bereich und zeichnet Markierung, Werkzeugleiste und Knopf nach. */
  function setzeBereich(neu) {
    zustand.bereich = neu;
    markiere();
  }

  /** Trägt die Markierung auf die gezeichneten Zeilen auf (beim Neuzeichnen trägt sie jede Zeile selbst). */
  function markiere() {
    for (const zeile of document.querySelectorAll('#da-inhalt .da-zeile')) {
      zeile.classList.toggle('da-markiert', istMarkiert(Number(zeile.dataset.nummer)));
    }
    zeichneMarkierung();
  }

  /** Die Werkzeugleiste nennt „Zeilen 3–7 markiert“ und schaltet „Bereich kopieren“ frei (R00044, Pflichtpunkt 3). */
  function zeichneMarkierung() {
    const bereich = zustand.bereich;
    const vorhanden = Boolean(bereich) && bereich.bis >= 1;
    document.getElementById('da-markierung').textContent = vorhanden ? `${bereichWerte().bereichsangabe(bereich.von, bereich.bis)} markiert` : '';
    document.getElementById('bereich-kopieren').disabled = !vorhanden;
  }

  /** Die Zeilennummer unter dem Zeiger oder null (nur die Nummernspalte zählt, ein Klick in den Text markiert nichts). */
  function nummerAus(ereignis) {
    if (!ereignis.target || typeof ereignis.target.closest !== 'function') {
      return null;
    }
    const zeile = ereignis.target.closest('.da-zeile');
    return zeile && zeile.dataset.nummer ? Number(zeile.dataset.nummer) : null;
  }

  /** Ein Druck auf eine Nummer beginnt ein Ziehen; erst eine Bewegung erweitert (sonst bleibt es der Klick). */
  function beginneZiehen(ereignis) {
    if (ereignis.button !== 0 || !ereignis.target.closest || !ereignis.target.closest('.da-nr')) {
      return;
    }
    const nummer = nummerAus(ereignis);
    if (nummer === null) {
      return;
    }
    ereignis.preventDefault();
    zustand.ziehen = { anker: nummer, bewegt: false };
  }

  function zieheWeiter(ereignis) {
    if (!zustand.ziehen) {
      return;
    }
    const nummer = nummerAus(ereignis);
    if (nummer === null) {
      return;
    }
    zustand.ziehen.bewegt = true;
    setzeBereich(bereichWerte().bereich(zustand.ziehen.anker, nummer, zeilenzahl()));
  }

  /** Am Ende eines Zugs steht der Anker am erreichten Ende; der folgende Klick wird nicht mehr als Zeilenklick gewertet. */
  function beendeZiehen() {
    if (!zustand.ziehen) {
      return;
    }
    const bewegt = zustand.ziehen.bewegt;
    zustand.ziehen = null;
    if (bewegt) {
      zustand.ziehenBehandelt = true;
      zustand.anker = zustand.bereich ? zustand.bereich.bis : null;
    }
  }

  /** Klick auf eine Nummer setzt den Anker (einzeiliger Bereich); Umschalt-Klick erweitert auf von…bis (R00044). */
  function waehleZeilePerKlick(ereignis) {
    if (zustand.ziehenBehandelt) {
      zustand.ziehenBehandelt = false;
      return;
    }
    if (!ereignis.target.closest || !ereignis.target.closest('.da-nr')) {
      return;
    }
    const nummer = nummerAus(ereignis);
    if (nummer === null) {
      return;
    }
    if (ereignis.shiftKey && zustand.anker !== null) {
      setzeBereich(bereichWerte().bereich(zustand.anker, nummer, zeilenzahl()));
      return;
    }
    zustand.anker = nummer;
    setzeBereich(bereichWerte().bereich(nummer, nummer, zeilenzahl()));
  }

  /** Umschalt+↑/↓ erweitert den Bereich um die Nachbarzeile (nach oben bzw. unten), Esc hebt ihn auf. */
  function beiBereichstaste(ereignis) {
    if (ereignis.key === 'Escape') {
      zustand.anker = null;
      setzeBereich(null);
      return true;
    }
    if (!ereignis.shiftKey || (ereignis.key !== 'ArrowUp' && ereignis.key !== 'ArrowDown')) {
      return false;
    }
    const bereich = zustand.bereich;
    if (!bereich || bereich.bis < 1) {
      return false;
    }
    const neu = ereignis.key === 'ArrowDown'
      ? bereichWerte().bereich(bereich.von, bereich.bis + 1, zeilenzahl())
      : bereichWerte().bereich(bereich.von - 1, bereich.bis, zeilenzahl());
    setzeBereich(neu);
    return true;
  }

  function beiTaste(ereignis) {
    if (ereignis.defaultPrevented || ereignis.isComposing) {
      return;
    }
    const offenerDialog = Boolean(window.gitreviewaHilfe && window.gitreviewaHilfe.istOffen());
    const aktion = tasten().aktionFuer(ereignis.key, {
      laufart: DATEIANSICHT,
      feldImFokus: imEingabefeld(ereignis.target),
      modifikatoren: {
        strg: ereignis.ctrlKey,
        alt: ereignis.altKey,
        meta: ereignis.metaKey,
        altGraph: typeof ereignis.getModifierState === 'function' && ereignis.getModifierState('AltGraph'),
      },
      offenerDialog,
      vorhanden: vorhandeneAktionen(),
    });
    if (aktion === 'dateiKopieren') {
      ereignis.preventDefault();
      kopiere('datei');
      return;
    }
    if (aktion === 'bereichKopieren') {
      ereignis.preventDefault();
      kopiere('bereich');
      return;
    }
    if (aktion === 'umbruchWechseln') {
      ereignis.preventDefault();
      schalteUmbruch();
      return;
    }
    if (aktion === 'dateiWeiter') {
      ereignis.preventDefault();
      schritt(1);
      return;
    }
    if (aktion === 'dateiZurueck') {
      ereignis.preventDefault();
      schritt(-1);
      return;
    }
    if (aktion === 'seitenleisteEinklappen') {
      ereignis.preventDefault();
      klappeSeitenleiste();
      return;
    }
    if (aktion === 'suche') {
      ereignis.preventDefault();
      fokussiereSuche();
      return;
    }
    if (aktion === 'hilfe') {
      ereignis.preventDefault();
      window.gitreviewaHilfe.oeffnen();
      return;
    }
    if (aktion === 'schliessen') {
      window.gitreviewaHilfe.schliessen();
      return;
    }
    if (imEingabefeld(ereignis.target)) {
      return;
    }
    if (beiBereichstaste(ereignis)) {
      ereignis.preventDefault();
    }
  }

  /** `b` betätigt den Ausklapp-Knopf an der Grenze über denselben Weg wie die Maus (R00035). */
  function klappeSeitenleiste() {
    const knopf = document.getElementById('einklappen');
    if (knopf) {
      knopf.click();
    }
  }

  function imEingabefeld(ziel) {
    if (!ziel || typeof ziel.closest !== 'function') {
      return false;
    }
    return ziel.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]') !== null;
  }

  /** Das Kopierziel (Datei oder Bereich) → `{text, bestaetigung}`: die **eine** Stelle, die den Kopiertext bestimmt
      (R00044, Pflichtpunkt 5). `null`, wenn es nichts zu kopieren gibt. */
  function zieltext(art) {
    if (art === 'bereich') {
      const bereich = zustand.bereich;
      if (!bereich || bereich.bis < 1) {
        return null;
      }
      return {
        text: bereichWerte().ausschnitt(zustand.text, bereich.von, bereich.bis),
        bestaetigung: `${bereichWerte().bereichsangabe(bereich.von, bereich.bis)} kopiert`,
      };
    }
    if (!zustand.text) {
      return null;
    }
    return { text: zustand.text, bestaetigung: bestaetigungstext() };
  }

  /** Die Bedienelemente und die Meldung des Ersatzwegs je Kopierziel. */
  function kopieroptionen(art) {
    const bereich = art === 'bereich';
    return {
      knopf: document.getElementById(bereich ? 'bereich-kopieren' : 'datei-kopieren'),
      status: document.getElementById('da-status'),
      ansage: document.getElementById('da-ansage'),
      kopierziel: document.getElementById('da-inhalt'),
      verweigert: bereich ? VERWEIGERT_BEREICH : ZWISCHENABLAGE_VERWEIGERT,
    };
  }

  /** Jede Geste kopiert erneut und bestätigt erneut (R00043, Kriterium 8): kein Merker, der Knopf bleibt bedienbar. */
  function kopiere(art) {
    const ziel = zieltext(art);
    if (!ziel) {
      return;
    }
    const optionen = kopieroptionen(art);
    if (!window.gitreviewaKopieren) {
      optionen.status.textContent = optionen.verweigert;
      return;
    }
    window.gitreviewaKopieren.kopiere(ziel.text, ziel.bestaetigung, optionen);
  }

  /** Das Kopierziel für Strg+C: der markierte Bereich (den Ersatzweg nach einer Verweigerung hält `kopieren.js`). */
  function bereichsziel() {
    if (!zustand.bereich || zustand.bereich.bis < 1) {
      return null;
    }
    const ziel = zieltext('bereich');
    if (!ziel) {
      return null;
    }
    return { text: ziel.text, bestaetigung: ziel.bestaetigung, optionen: kopieroptionen('bereich') };
  }

  function bestaetigungstext() {
    return werte().kopierbestaetigung(zustand.stand.zeilen, zustand.stand.gekuerzteZeilen);
  }

  async function schliesse() {
    const knopf = document.getElementById('schliessen');
    knopf.disabled = true;
    try {
      const antwort = await fetch('api/schliessen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: '{}',
      });
      if (!antwort.ok) {
        throw new Error(`Antwort ${antwort.status}`);
      }
      zeigeGeschlossen();
    } catch (fehler) {
      knopf.disabled = false;
      document.getElementById('da-status').textContent = `Schließen ist gescheitert: ${fehler.message}`;
    }
  }

  /** Nach dem Schließen antwortet der Server nicht mehr; die Seite sagt den Ausgang und lässt sich gefahrlos zumachen. */
  function zeigeGeschlossen() {
    const haupt = document.querySelector('.da-haupt');
    const meldung = document.createElement('p');
    meldung.className = 'da-geschlossen';
    meldung.setAttribute('role', 'status');
    meldung.textContent = 'Dateiansicht geschlossen';
    haupt.replaceChildren(meldung);
    document.getElementById('datei-kopieren').disabled = true;
    document.getElementById('bereich-kopieren').disabled = true;
    document.getElementById('schliessen').disabled = true;
  }

  /** Hinweis und `aria-keyshortcuts` am Bedienelement aus dem Katalog (R00030), gerendert an der einen Stelle (`hinweise.js`)
      mit der Laufart „Dateiansicht“ — das Kürzel `w` steht hier am Umbruch-Schalter (R00039, B3), `/` am Suchfeld (R00044). */
  function zeichneHinweise() {
    window.gitreviewaHinweise.setzen(document, tasten().hinweise({ laufart: tasten().DATEIANSICHT }));
  }

  /** Die Lage der Kürzel-Übersicht für diese Laufart (R00030, R00044): der Katalog liefert daraus die Zeilen. */
  function hilfeLageAnmelden() {
    window.gitreviewaHilfeLage = () => ({ laufart: DATEIANSICHT, vorhanden: vorhandeneAktionen() });
  }

  /** Die Suche an die Dateiansicht anschließen (R00044, B4224): dieselbe Suche wie im Diff (`suche.js`), kein zweiter Bau.
      Gesucht wird über den **vollen** Text der Zeilen (Marken auffindbar); Treffer jenseits des gezeigten Teils zählt sie nur. */
  function sucheAnmelden() {
    window.gitreviewaSuche.anlegen({
      bereich: document.getElementById('da-inhalt'),
      eingabe: document.getElementById('da-suche'),
      zaehler: document.querySelector('.da-suche-zaehler'),
      fehler: document.getElementById('da-suche-fehler'),
      zellen: () => [...document.getElementById('da-inhalt').querySelectorAll('.da-text')],
      texte: () => (zustand.zeilen ? zustand.zeilen.map(text => werte().alsMarken(text)) : []),
      sichtbar: zelle => Number(zelle.dataset.gezeigt) || 0,
      zeichnenEreignis: 'da-gezeichnet',
    });
  }

  function fokussiereSuche() {
    const feld = document.getElementById('da-suche');
    feld.focus();
    feld.select();
  }

  function zeigeMeldung(text) {
    document.getElementById('da-meldung').textContent = text;
  }

  document.addEventListener('DOMContentLoaded', init);
}());