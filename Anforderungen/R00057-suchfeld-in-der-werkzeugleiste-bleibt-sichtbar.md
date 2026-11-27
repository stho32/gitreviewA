---
id: R00057
status: Neu
datum: 2026-11-27
ursprung: Bug-Report
ursprungslauf: R00055
---

# R00057: Das Suchfeld der Diff-Werkzeugleiste bleibt sichtbar und bedienbar

## Zusammenfassung

In der Werkzeugleiste über dem Diff schrumpft das Feld „Im Diff suchen“, sobald Platz fehlt, bis auf wenige Pixel; der Zähler („1 von 1“) und der Knopf „Ansicht ▾“ stehen dann über ihm. Gemessen am echten Programm (Chromium, Repo P, Stand `fd7c365`): bei 1280 × 800 mit offener Ergebnis-Spalte und Standard-Seitenleiste (360 px) sind 2 px des Feldes sichtbar (mit Zähler „1 von 1“ 3 px, mit „keine Treffer“ 0 px). Nach dieser Anforderung ist das Feld in jedem Fenster- und Spaltenfall mindestens 3rem (48 px) breit sichtbar, nichts in der Leiste überdeckt etwas anderes, und die Breite des Feldes steht weiter nur an der einen Stelle aus R00055. Kein neues Verhalten der Suche.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (jeder Bereich bleibt bedienbar, ein Werkzeug verschwindet nicht, wenn der Nachbar wächst) und „Lesbare Diffs“ (Suche im Diff, R00027).

**Entschieden** (product-owner, `AI-Team/po-entscheidungen.md` Zeile 286): Das Feld bekommt seinen Platz, indem die Leiste umbricht — Option 1, wie empfohlen. Die Kriterien unten gelten für **Option 1 (Leiste umbrechen)**, weil nur sie mit den Messwerten erreichbar ist; die Optionen mit Messfolge stehen unter „Optionen“.

## Ausgangssituation

- `gitreviewa.css` Zeile 161: `.diff-werkzeuge{display:flex;flex-wrap:nowrap;flex:1 1 8rem;min-width:0}` — die Werkzeugleiste (Suchfeld mit Beschriftung, Zähler, Fehlermeldung, „Ansicht ▾“) bricht nicht um und schrumpft als Ganzes auf den Rest der Kopfzeile: gemessen 138–294 px bei Diff-Bereichen von 320–1010 px, mit offener Spalte 153–193 px.
- Davon belegen fest: Beschriftung „Suchen“ 43 px, „Ansicht ▾“ 104 px, Zähler 42 px („1 von 1“) bis 114 px („10000 von 10000+“), Lücken 8 px. Das Feld nimmt den Rest, `.diff-suche` hat `flex:1 1 3rem` (Zeile 314), und seit R00055 gilt `.formularfeld{min-inline-size:0}` — es schrumpft ohne Untergrenze. R00055 prüft nur „rechte Kante im Bereich“ (Feld mit 10 px besteht); eine Breite verlangte keine Anforderung.
- R00039 Zeile 30 verspricht das Gegenteil des Gebauten: „darunter höchstens zwei Zeilen (die Suche rückt in die zweite)“. Gebaut rückt nichts; das Feld wird zusammengedrückt. Deshalb Bug-Form (wie R00056).
- Gemessen (2026-11-27, Chromium headless, Repo P, `src/app.js` gewählt, „Zusammen“; Programm aus Kopie von `fd7c365`; Rohdaten und Messprogramm in `Software-Factory/gemeinsam/scratchpad/plan-69/`, Läufe `messung-roh*.json`, `messwerte.md`). Sichtbare Feldbreite = Pixel entlang der Feldmitte, an denen `elementFromPoint` das Feld liefert. Zählerzustände: leer (keine Suche) / „1 von 1“ / „keine Treffer“ / „10000 von 10000+“ (Text gesetzt, 114 px breit) / Fehlermeldung (Suchbegriff 201 Zeichen):

| Fall (Fenster, Ergebnis-Spalte, Seitenleiste) | Diff-Bereich | Leiste (Breite) | Feld px im Bestand (leer / 1 von 1 / keine / 10000 / Fehler) | Kopfhöhe im Bestand (px, leer … Fehler) |
|---|---|---|---|---|
| 1280, offen, 360 (Karte) | 588 | 153 | 2 / 3 / 0 / 0 / 0 | 30 … 120 |
| 1280, offen, 240 | 708 | 193 | 25 / 0 / 0 / 0 / 0 | 30 … 120 |
| 1280, zu, 360 | 890 | 254 | 85 / 39 / 9 / 0 / 9 | 30 … 104 |
| 1280, zu, 240 | 1010 | 294 | 125 / 79 / 49 / 9 / 15 | 30 … 72 |
| 1280, zu, 640 | 610 | 160 | 9 / 4 / 0 / 0 / 0 (ein weiterer Lauf: 51 im Zustand leer) | 30 … 120 |
| 812, offen, 240 (Standard) | 320 | 190 | 22 / 0 / 0 / 0 / 0 | 62 … 154 |
| 812, zu, 360 | 422 | 390 | 222 / 176 / 146 / 104 / 57 | 62 … 90 |
| 812, zu, 240 | 542 | 138 | 0 / 2 / 0 / 0 / 0 | 30 … 120 |

  Nur 1 der 8 Fälle (812, zu, 360) hält alle Zählerzustände ≥ 32 px. Bei 812 px mit offener Spalte ist die Seitenleiste 240 px, Standard und 240 sind derselbe Fall. In 23 der 40 Fall × Zustand-Paare (6 von 8 Fällen) liegt das Feld ganz oder zum Teil unter dem Zähler oder dem Knopf „Ansicht ▾“, in 13 Paaren (5 Fälle) ragt die Leiste aus dem Diff-Bereich.
- Nebenbefund: die Fehlermeldung der Suche („Der Suchbegriff darf höchstens 200 Zeichen haben.“) macht die Leiste im Bestand 72–154 px hoch (bis 5 Zeilen), obwohl R00039 „nie über zwei Zeilen“ sagt. Gehört nicht in diese Anforderung (siehe „Notizen“).
- Belege der Karte: `Software-Factory/gemeinsam/scratchpad/etst-65/` (`bericht-review.json`: `diff-suche` 10 px, `kanteTrifftFeld: false`).

## Ziel

Gilt für Option 1 (entschieden, PO-Zeile 286); die Werte stammen aus der Messreihe „Leiste 14rem, Feld 7rem“ (unten „Optionen“):

- **Das Feld bekommt seinen Platz vom Behälter**: `.diff-werkzeuge` hat eine Basisbreite (Richtwert 14rem) und bricht um (`flex-wrap:wrap`); die Zeile mit Beschriftung und Feld hat eine eigene Basis (Richtwert 7rem). Zähler, Meldung und „Ansicht ▾“ rücken unter das Feld, wenn sie nicht daneben passen. Die Richtwerte darf der Entwickler anpassen, solange die Messprobe grün bleibt.
- **Eine Feldbreite, ein Ort** (R00055): `.diff-suche` trägt weder eine Breite noch ein eigenes `flex` oder `min-inline-size`; die Breite kommt aus `.formularfeld`, der Mindestplatz vom Behälter. Der Quelltext-Wächter aus R00055 (B5506) zählt künftig auch `flex` und `flex-basis` an Feld-Selektoren.
- Nicht verändert: Verhalten der Suche (R00027), Tastenkürzel `/` und `Esc` (R00030), Inhalt des Menüs „Ansicht ▾“ (R00039), die Kürzung des Pfades in der Mitte, die Dateiansicht (`.da-suche`, R00055 B5505) und die Seitenleiste.

## Optionen

Messfolge: dieselbe Messung (8 Fälle × 5 Zustände, Tabelle oben) mit je einer Option als zusätzlichem Stil im echten Programm eingeschleust; „im Bereich“ heißt rechte Kante von Feld und „Ansicht ▾“ ≤ rechte Kante des Diff-Bereichs, kein waagerechter Bildlauf. Rohdaten: `Software-Factory/gemeinsam/scratchpad/plan-69/messung-roh.json`, `messung-roh-umbruch.json`, `messung-roh-option1-final.json`.

| | Änderung | Feld px (leer / 1 von 1 / keine / 10000 / Fehler), kleinster Wert über 8 Fälle | im Bereich | Kosten |
|---|---|---|---|---|
| **1. Leiste umbrechen** (Empfehlung) | `.diff-werkzeuge{flex:1 1 14rem;flex-wrap:wrap}`, `.suche-feld{flex:1 1 7rem}` | **56** über alle 40 Paare ohne Fehler, 85 mit Fehlermeldung; 1280/offen/360 (Karte): 256 / 256 / 256 / 256 / 85 | ja, alle 40 | Leiste höher: mit aktiver Suche 2 Zeilen (56 px) bei Diff 610–708 px, 1 Zeile (30 px) bei 890–1010 px (ausser längster Zähler bei 890 px: 56 px); bei Diff 320 px 3–4 Zeilen (94–122 px, mit Fehlermeldung 166 px); Rollbereich darunter bleibt ≥ 526 px hoch (Bestand ≥ 538 px). R00039 Zeile 30 (≤ 2 Zeilen) muss gelockert werden |
| 2. Feld mit Mindestbreite | `.diff-suche{min-inline-size:8rem}`, Leiste unverändert | 3–4 px bei „keine Treffer“ und längerem Zähler in 5 von 8 Fällen; kleinster Wert 2; ≥ 32 px mit jedem Zähler nur in 1 von 8 Fällen; Karte (1280/offen/360): 9 / 9 / 4 / 4 / 4 | nein: Überlauf in 5 von 8 Fällen (in 3 davon in jedem Zustand) | reicht allein nicht, weil die Leiste selbst nur 138–219 px breit ist; zusätzlich Umbruch nötig (dann Option 1); `min-inline-size` ist ein zweiter Ort der Feldbreite neben R00055 |
| 3. Zähler ins Feld | Zähler absolut über dem rechten Feldrand, Leiste unverändert | unverändert zum Zustand „leer“: 2 / 25 / 85 / 125 / 9 / 22 / 222 / 0 je Fall; Karte (1280/offen/360): 2 | ja (außer Fehlermeldung in 3 Fällen) | reicht allein nicht, weil das Feld ohne Zähler im selben Platz bleibt; zusätzlich Text im Feld und Zähler kollidieren bei breitem Zähler (114 px) |
| Zusatzprobe: Beschriftung „Suchen“ nur für Screenreader | `.suche-label` visuell versteckt, Leiste unverändert | kleinster Wert 3; Karte: 32 / 4 / 4 / 4 / 4 | nein in 5 von 8 Fällen | gewinnt 51 px, reicht allein nicht; mit Umbruch (Option 1) Feld 124–256 px |

**Entschieden (PO-Zeile 286): Option 1** (Empfehlung des planers). Sie ist die einzige, deren Messwerte die Probe der Karte („Feldmitte = Feld, mindestens 32 px“) in allen Fällen erfüllen; 2 und 3 allein erreichen sie bei 1280 mit offener Spalte nicht (2–25 px). Option 1 ist zugleich das, was R00039 Zeile 30 schon sagt (die Suche rückt in die nächste Zeile). Kosten: Leiste höher mit aktiver Suche und bei Diff unter 400 px.

## Verifikation

Alle Specs bleiben grün, besonders `formularfelder-geometrie.spec.js`, `im-diff-suchen*.spec.js`, `leiste-feste-hoehe.spec.js`, `werkzeugleiste-einzeilig.spec.js`, `dateisuche-geometrie.spec.js`, `anmerkungen-geometrie.spec.js` und `ergebnis-bereiche.spec.js`; die neue Messprobe (B5701) ist vor dem Umbau rot (Bestand 0–25 px bei offener Spalte) und danach grün.

## Akzeptanzkriterien

Testebene nach Projektregel: Playwright, weil Maße und Überdeckung nur im Browser prüfbar sind; Kriterium 6 ist ein Unit-Test ohne Browser. Messfälle: Repo P (siehe User Story), die 8 Fälle der Tabelle oben (Fenster 1280 × 800 und 812 × 800, Ergebnis-Spalte offen und zu, Seitenleiste Standard, 240 und, nur 1280 mit zugeklappter Spalte, 640 px), Zählerzustände leer, „1 von 1“, „keine Treffer“ und längster Zähler. Messwerte stammen aus der Option-1-Reihe; weicht die Messung nach dem Bau um mehr als 1 px ab, gilt die Messung.

1. **Das Suchfeld ist sichtbar und anklickbar** (Playwright, Hauptprobe der Karte). Gegeben Repo P mit `src/app.js` gewählt in jedem der 8 Fälle, wenn man die Werkzeugleiste in jedem Zählerzustand (leer, „1 von 1“, „keine Treffer“, „10000 von 10000+“) und mit der Fehlermeldung der Suche betrachtet, dann ist das Feld an seiner Mitte das oberste Element (`elementFromPoint`), und entlang der Feldmitte sind mindestens 3rem (48 px bei 16 px Schrift; die Probe liest 3rem aus der Wurzelschrift) des Feldes sichtbar. Messung Option 1: kleinster Wert 56 px (1280, zu, 640, leer), im Fall der Karte (1280, offen, 360) 256 px; Bestand im Fall der Karte 0–3 px. Für die Karte ausdrücklich: bei 1280 × 800 mit offener Spalte und Standard-Seitenleiste ≥ 32 px (die Probe der Karte), hier gemessen 256 px. Hypothese, ungemessen: ein Pfad aus 300 Zeichen mit `⟨U+202E⟩` (R00039 Kriterium 5) ändert nichts, weil der Pfad zuerst schrumpft (`flex:1 1 4rem`, `min-inline-size:0`); die Probe entscheidet.
2. **Nichts läuft über, nichts überdeckt etwas** (Playwright). Gegeben dieselben Fälle und Zustände, dann liegen die rechten Kanten von Feld, Zähler, Meldung und „Ansicht ▾“ im Diff-Bereich (≤ rechte Innenkante), `#diff` hat keinen waagerechten Bildlauf (`scrollWidth ≤ clientWidth`), und die Rechtecke von Feld, Zähler, Meldung und „Ansicht ▾“ schneiden sich nicht (Schnittfläche 0). Bestand: Überdeckung in 23 von 40 Fall × Zustand-Paaren, Leiste aus dem Bereich in 13; Option 1: 0 von 40 (Messung der Überdeckung: Abtastung mit `elementFromPoint`, Überschneidung der Rechtecke noch nicht gemessen — B5701).
3. **Bedienbar** (Playwright). Gegeben Repo P, 1280 × 800, Ergebnis-Spalte offen, Standard-Seitenleiste (der Fall der Karte), wenn man in die Mitte des Feldes klickt, `app` tippt und Enter drückt, dann steht der Fokus im Feld, das Feld zeigt `app`, und der Zähler zeigt „1 von 1“ (gemessen, Repo P); die Taste `/` im Diff-Bereich setzt den Fokus wieder ins Feld (R00027, R00030); ein Klick auf „Ansicht ▾“ öffnet das Menü, und sein erster Eintrag ist ganz sichtbar und anklickbar.
4. **Alle Anzeigeverfahren** (Playwright, Pflichtpunkt 2). Kriterien 1–3 gelten im Standardmodus „Zusammen“ (netto) zuerst, dann „Einzeln“, mit „Nur Änderungen“ und „Ganze Datei“, untereinander und nebeneinander, mit Umbruch an und aus. Nicht betroffen: Lücken und große Diffs (die Leiste hängt nicht vom Inhalt des Diffs ab), die Dateiansicht (eigene Leiste, R00055 B5505) und Binärdateien oder keine gewählte Datei (Leiste ohne Pfad: das Feld bleibt, es hat dann mehr Platz).
5. **Die Leiste wächst nur bis zu einer Obergrenze** (Playwright, Pflichtpunkt 3 festes Layout). Gegeben dieselben Fälle, dann gilt: ohne aktive Suche ist die Leiste ab 610 px Diff-Breite eine Zeile (30 px; die Grenze kommt aus PO-Zeile 289 und löst die 600 px der PO-Zeile 196 für diese Leiste ab), von 400 bis 609 px höchstens zwei Zeilen und darunter höchstens drei (gemessen 94 px bei 320 px); mit aktiver Suche ab 600 px höchstens zwei Zeilen (gemessen 56 px), darunter höchstens vier (gemessen 122 px); mit Fehlermeldung höchstens 170 px (gemessen 166 px, Bestand 154 px); der Rollbereich des Diffs darunter bleibt in jedem Fall mindestens 480 px hoch (gemessen ≥ 526 px bei 800 px Fenster). **Entschieden (PO-Zeilen 287, 289)**: Für die Leiste mit aktiver Suche und bei Diff unter 400 px ersetzt dieses Kriterium die Höhenregel aus R00039 Zeile 30 („nie über zwei Zeilen“, „ab 600 px eine Zeile“); für die Leiste ohne Suche ist die Grenze nach PO-Zeile 289 die gemessene 610 px (nicht mehr 600 px). R00039 selbst bleibt unverändert.
6. **Eine Feldbreite, ein Ort** (Unit ohne Browser, Pflichtpunkt 5). Gegeben `gitreviewa.css` und `dateiansicht.css`, dann steht an Feld-Selektoren (`input`, `textarea`, `select`, Klassen der Felder) keine Breite, kein `flex`, kein `flex-basis` und kein `min-inline-size` außerhalb des Abschnitts `eine-Feldbreite`; die Mutation `.diff-suche{flex:0 0 20rem}` macht den Test rot, und der Bestand (`.diff-suche{… flex:1 1 3rem …}`) ist heute rot (negative Kontrolle gegen den heutigen Stand).

Nicht betroffen: Grenzen je Eingabe und Ausgabe (Pflichtpunkt 1; keine Grenze ändert sich, der längste Zählertext, die Meldung und der lange Pfad gehen als Fälle in die Kriterien 1 und 2); NFA zum Ausführungsort (Pflichtpunkt 4; reines Browser-Layout). Zeitkriterien: keine.

## Rollback-Strategie

Je Bubble ein Commit; zurück mit `git revert <sha>`. B5702 ändert nur CSS, B5704 nur den Quelltext-Test.

## Warum löst diese Anforderung das Problem?

Auslöser: Karte #69, Entwicklertest #65, Anmerkung A1: bei 1280 × 800 mit offener Ergebnis-Spalte ragen Zähler und „Ansicht ▾“ über das Suchfeld, 0 px sind sichtbar. Wer im Diff suchen will, trifft das Feld nicht oder sieht nicht, was er tippt. Mit einer Basisbreite der Leiste, die umbricht statt zu schrumpfen, bekommt das Feld Platz, und der Mensch sieht sein Suchwort und den Zähler. Dass es ein Messproblem war, zeigt die Reihe: 2 px bei der Karte, 256 px nach dem Umbau.

## Offene Fragen

Keine offenen. Der product-owner hat die zwei Fragen am 2026-11-27 entschieden (`AI-Team/po-entscheidungen.md` Zeilen 286–288); je Frage wurde die Empfehlung übernommen und ist oben eingearbeitet:

1. **Wie bekommt das Suchfeld seinen Platz?** — **entschieden, PO-Zeile 286: Option 1 (Leiste umbrechen)** — die Leiste bricht um und gibt dem Feld Platz; kleinster sichtbarer Feldwert 56 px in allen Fällen (Optionen 2 und 3 allein: 0–25 px bei offener Spalte, siehe Tabelle „Optionen“). Verworfen: (2) Feld mit Mindestbreite, (3) Zähler ins Feld.
2. **Höhenregel der Leiste lockern?** — **entschieden, PO-Zeilen 287 und 289: ja, gelockert wie in Kriterium 5** — R00039 Zeile 30 („ab 600 px eine Zeile, darunter höchstens zwei, nie mehr als zwei“) lässt sich mit Option 1 bei aktiver Suche und bei Diff unter 400 px nicht halten (gemessen bis 4 Zeilen bei 320 px). Für die Leiste ohne Suche ist die Grenze nach PO-Zeile 289 die gemessene 610 px (ab 610 px eine Zeile, von 400 bis 609 px höchstens zwei Zeilen), statt der 600 px aus PO-Zeile 196; die Grenze für die aktive Suche bleibt 600 px. R00039 selbst bleibt unverändert.

## Notizen

- Quelle: Karte #69, Anmerkung A1 des Entwicklertests #65 (Lauf 65-entwicklertester-1), Bestand, kein Rückschritt: auf `main` vor #65 war es genauso (Beleg der Karte); R00055 hat die Mindestbreite `2rem` des Feldes entfernt (Selektor `.diff-suche`, vorher `min-inline-size:2rem`), die Überdeckung bestand schon vorher.
- Messlücken, die B5701 schließt: der echte Zählertext „10000 von 10000+“ (hier gesetzt, nicht gesucht; echte Suche braucht Repo Y mit `gross`), der Pfad aus 300 Zeichen, die Anzeigeverfahren außer „Zusammen“ (Kriterium 4), und die Schwankung eines Falls (1280, zu, 640, Zustand leer: 9 bzw. 51 px in zwei Läufen).
- Nebenbefund: die Fehlermeldung der Suche macht die Leiste im Bestand bis 154 px hoch (R00039 Zeile 30, „nie über zwei Zeilen“, Pflichtpunkt 3) — entschieden: eigene Karte #71, Obergrenze 170 px hier (PO-Zeile 288); R00057 behebt die Meldung nicht (Vorschlag dort: Meldung im Feld-Behälter begrenzen oder als Tooltip).
- Das Glossar fehlt im Projekt (kein `Dokumentation/Domaenenwissen/`); Begriffe nach R00027 und R00039 (Werkzeugleiste, Zähler, „Ansicht ▾“).

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-27 | Angelegt | Karte #69, Messreihe des planers; Frage der Karte offen beim product-owner |
| 2026-11-27 | Offene Fragen geschlossen (PO-Entscheidungen 286–288, alle Empfehlungen übernommen); Vorbehalte „offen, bis der product-owner entscheidet“ / „bis zur Antwort“ entfernt; Nebenbefund als eigene Karte #71 vermerkt | Karte #69, planer, Lauf 69-planer-2 |
| 2026-11-27 | Kriterium 5 und Offene Frage 2 auf die gemessene Grenze 610 px fortgeschrieben (ohne Suche ab 610 px eine Zeile, 400–609 px höchstens zwei); die 600 px aus PO-Zeile 196 für diese Leiste abgelöst, R00039 unverändert | Karte #69, PO-Entscheidung Zeile 289 (Rückfrage des entwicklers), Lauf 69-planer-3 |
