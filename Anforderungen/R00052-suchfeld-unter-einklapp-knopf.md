---
id: R00052
status: Neu
datum: 2026-11-26
ursprung: Bug-Report
ursprungslauf: R00049
---

# R00052: Behebung von „Suchfeld der Dateiliste ragt unter den Einklapp-Knopf“

## Beschreibung

Das Suchfeld „Dateien suchen“ ([R00049](R00049-dateiliste-durchsuchen.md), I0050) ist 256 px (`16rem`) breit und an den Viewport gebunden, nicht an seinen Behälter. Neben der Beschriftung ist es breiter als die Seitenleiste: es ragt ~10 px über deren rechte Kante in die 6-px-Trennspalte, in der der 24-px-Streifen mit dem Einklapp-Knopf ([R00035](R00035-seitenleiste-ein-und-ausklappen.md), I0036) in die Ränder beider Nachbarn hineinragt. Folge: die rechte Feldkante wird nicht gezeichnet, und ein Klick auf den rechten Feldrand trifft `span.gr-einklappen-text` und klappt die Seitenleiste ein statt das Feld zu fokussieren.

Nachgestellt und belegt am echten Programm (Entwicklertest `.factory/laeufe/63-entwicklertester-1.md`, Punkt 1, Bildschirmfotos in `gemeinsam/scratchpad/etst-63/beleg.md`):

| Fenster | Suchfeld x | Knopf x | Überdeckung | Klick bei feld.rechts − 4 trifft |
|---|---|---|---|---|
| 1280 × 800 | 105…361 | 351…375 | 10 px | `span.gr-einklappen-text` (klappt ein) |
| 812 × 800 | 105…361 | 351…375 | 10 px | `span.gr-einklappen-text` (klappt ein) |

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (jede Seitenleiste ist ein eigener Bereich) und „Anmerkungen an Stellen“ („Ausblendmuster und Suche helfen, das Wesentliche zu finden“; das Suchfeld muss ganz bedienbar sein).

## Ursachenanalyse

### Root Cause

`src/GitReviewA/web/gitreviewa.css:102` — `.dateisuche-eingabe{font:inherit;font-size:13px;inline-size:16rem;max-inline-size:60vw;…}` bindet die Breite des Feldes an den **Viewport** (`60vw`), nicht an seinen Behälter. `16rem` = 256 px fest; die Beschriftung `.dateisuche-label` (Z. 101, „Dateien suchen“, 12 px, `white-space:nowrap`) kommt dazu, die Kette `.dateisuche` (Z. 99) / `.dateisuche-feld` (Z. 100) hat kein `min-width:0` und keinen `max-inline-size`. Die Seitenleiste ist die Rasterspalte 1 (`--gr-leiste-breite`, 360 px), ihr Inhaltsbereich ist um die Polsterung schmaler: 88 px Beschriftung + 8 px Abstand + 256 px Feld ≈ 352 px > ~336 px zur Verfügung. Das Feld läuft aus seiner Spalte heraus.

Der Einklapp-Knopf liegt in der 6-px-Trennspalte (Spalte 2, `.gr-streifen`, Z. 416) mit `justify-self:center; inline-size:24px` (Z. 453) und ragt je ~9 px in beide Nachbarn hinein; `pointer-events:auto` am Knopf, `z-index:2` am Streifen nehmen den Zeiger. Die Absicht im CSS-Kommentar Z. 416/417 („er deckt keinen Inhalt“) trifft nicht zu, sobald das Suchfeld in die Spalte hineinragt.

Ausgeschlossen: der Knopf selbst (seine Geometrie ist nach R00035 gewollt und wird hier nicht geändert); die Beschriftung (sie bleibt innerhalb). Der Fehler entsteht allein aus der **ungebundenen Feldbreite**.

### Betroffene Komponenten

- `src/GitReviewA/web/gitreviewa.css` — `.dateisuche-eingabe` (Z. 102), `.dateisuche` / `.dateisuche-feld` (Z. 99/100).
- Kein Serverweg, kein `git`-Aufruf, kein C#-Code; nur Browser und CSS.

## Lösungsvorschlag

### Optionen

| Option | Komplexität | Testbarkeit | Reversibilität | Risiko |
|---|---|---|---|---|
| 1. **Lokal (Empfehlung):** Feld an den Behälter binden — `inline-size:16rem;max-inline-size:100%`, dazu `min-width:0` an der Polsterkette und `flex:1 1 12rem` | gering | gut (CSS-Regel, Messprobe) | hoch (eine Regel) | Feld wird schmaler als 256 px, wenn die Seitenleiste gezogen wird — erwünscht (R00034: 240–640 px) |
| 2. Komponente: ein Kopfzeilen-Raster für alle Werkzeuge der Dateiliste (Suche, Muster, Schalter) mit festen Spalten und `min-width:0` für jedes Kind | mittel | gut | mittel | ändert auch Musterfeld und Schalter, mehr Fläche als der Befund verlangt |
| 3. Architektur: den Einklapp-Knopf aus dem Überhang nehmen (Streifen in der Seitenleiste statt überlappend) | mittel | gut | mittel | ändert R00035/I0036 (Trenner-Mechanik, Tastatur, `aria-expanded`); größerer Eingriff als nötig |

### Langfristige Lösung

Option 1. Die Breite des Feldes steht an **einer** Stelle und hängt am **Behälter** statt am Viewport: `.dateisuche-eingabe{inline-size:16rem;max-inline-size:100%}`, `.dateisuche-feld{min-width:0;width:100%}` (und `flex:1 1 12rem` am Feld), damit die Kette aus Flex-Elementen mitschrumpft. Damit gilt für jede Seitenleistenbreite (240–640 px, R00034) und jede Fensterbreite derselbe Satz. Option 2 ist eine spätere Aufräumkarte, kein Teil dieses Bugs.

### Alternative Ansätze

- Option 2: löst die Regel allgemein, ist aber mehr Umfang als der Befund; als Notiz vermerkt.
- Option 3: behebt die Überdeckung an der Ursache des **Knopfes** statt des Feldes und lässt das Feld weiter aus der Spalte laufen — die rechte Feldkante bliebe ungezeichnet, das Feld reichte dann in den Diff.
- Nur `max-inline-size:60vw` kleiner wählen: heilt die eine Fensterbreite, nicht das Ziehen der Seitenleiste.

## Test-Strategie

### Test zur Bug-Reproduktion (zuerst rot)

- Playwright `dateisuche.spec` (Browser-Eigenes): bei 1280 × 800 und 812 × 800 `#dateiliste-suche` und `.gr-streifen .gr-einklappen` mit `getBoundingClientRect` messen: `feld.right ≤ knopf.left`; `elementFromPoint(feld.right − 4, Mitte)` ist das Feld (`#dateiliste-suche`), nicht `span.gr-einklappen-text`. Heute rot (10 px; Knopf).

### Code-Extraktion für isoliertes Testing

Keine: die Regel ist eine CSS-Deklaration; die Messprobe ist der Test.

### Regressionstests

- Playwright: die Seitenleiste auf 240, 360 und 640 px ziehen (R00034, `role="separator"`) — das Feld bleibt in der Seitenleiste; beide Modi („Zusammen“/„Einzeln“), flach und Baum, Gruppe aktiv; eingeklappte Seitenleiste unverändert (R00035).
- Integration (Oberfläche gegen Fake): Tippen im Feld nach einem Klick auf den rechten Feldrand filtert die Liste (R00049 Kriterium 3 unverändert grün); keine Zeile auf stderr.
- Bestehende Tests von R00049/I0050 und R00035/I0036 bleiben grün.

## Akzeptanzkriterien

Vorbereitung: **Repo P** aus `user-stories/R00049.md` (acht Dateien), Aufruf `gitreviewA <p1> <p2> --kein-browser`; im Browser 1280 × 800 und 812 × 800. „Mitte“ heißt: senkrechte Mitte des Feldes.

- [ ] 1. **Abnahme-Probe des Entwicklertesters (wörtlich):** Bei 1280 und 812 px `#dateiliste-suche` und `.gr-streifen .gr-einklappen` messen: `feld.right ≤ knopf.left`, und `elementFromPoint(feld.right−4, Mitte)` ist das Feld. Heute rot (10 px; Knopf). *Ebene: Playwright (Browser-Eigenes).*
- [ ] 2. Gegeben 1280 px, wenn man auf den rechten Feldrand klickt, dann steht der Fokus im Feld, die Seitenleiste bleibt ausgeklappt (`aria-expanded` des Knopfes unverändert), und die rechte Kante des Feldes ist als Rahmen sichtbar. Tippt man danach `*.sql`, zeigt die Liste nur die drei SQL-Dateien (R00049 Kriterium 3). *Ebene: Playwright.*
- [ ] 3. Gegeben die Seitenleiste wird per Trenner auf 240, 360 und 640 px gezogen, wenn man nach jeder Breite das Feld und den Knopf misst, dann gilt Kriterium 1 bei jeder Breite, und das Feld ist nie breiter als der Inhaltsbereich der Seitenleiste. *Ebene: Playwright (Ziehen, R00034).*
- [ ] 4. Gegeben „Einzeln“ und der Baum, wenn man das Feld misst, dann gilt Kriterium 1 auch dort (die Werkzeugzeile ist in jeder Darstellung dieselbe). *Ebene: Playwright und Oberfläche gegen Fake.*
- [ ] 5. Gegeben die Seitenleiste ist eingeklappt (Knopf aus R00035), wenn man ausklappt, dann steht das Feld wieder ganz in der Seitenleiste, und `f` fokussiert es (R00049 Kriterium 9). *Ebene: Playwright.*
- [ ] 6. Kein Serverweg: das Ziehen der Seitenleiste und das Messen erzeugen keine Anfrage, keinen `git`-Aufruf und keine Zeile auf stderr. *Ebene: Integration (Aufrufzählung).*
- [ ] 7. Der Reproduktionstest ist ohne Fix rot und mit Fix grün, der ursprüngliche Fehler tritt in den Szenarien der User Story nicht mehr auf, und alle Tests aller Ebenen sind grün.

Grenz- und Leerfälle bedacht: schmalste (240 px) und breiteste (640 px) Seitenleiste (Kriterium 3), 812 px (1), beide Modi und beide Darstellungen (4), eingeklappt (5), Polsterung/Beschriftungslänge (Deutsch unverändert). Verworfen: den Knopf verschieben (Option 3).

**Pflichtpunkte der Detailplanung** (`AI-Team/planer.md`):
1. *Grenzen je Ein- und Ausgabe:* Das Feld bekommt eine **Obergrenze** (die Breite des Behälters) und einen **Startwert** (16rem) — Kriterien 1 und 3. Die Textlänge des Suchfeldes bleibt bei 200 Zeichen (R00049, unverändert). Nichts geht auf stdout.
2. *Anzeigeverfahren, Standard zuerst:* „Zusammen“ ist Standard und wird in Kriterium 1 zuerst gemessen; „Einzeln“, flach und Baum in Kriterium 4. Die Diff-Verfahren (Anordnung, Umbruch, Lücken) sind nicht betroffen — das Feld liegt im Kopf der Dateiliste.
3. *Festes Layout:* Genau der Anlass: ein Element im Kopf der Seitenleiste verlässt seinen Rollbereich (R00033) und liegt unter dem Knopf. Die Behebung gibt jedem Element der Kopfzeile eine Obergrenze im Behälter (Kriterien 1–3).
4. *NFA am Ausführungsort:* Nur Browser und CSS; keine Prozess-stderr-Zeile (Kriterium 6).
5. *Eine Unterscheidung, ein Ort:* Die **eine** Breitenregel `.dateisuche-eingabe` bestimmt die Feldbreite für jede Seitenleistenbreite; die Geometrie des Knopfes bleibt an der einen Stelle aus R00035. Das Feld prüft niemand doppelt.

## Implementierungshinweise

1. `.dateisuche-eingabe` (Z. 102): `inline-size:16rem` behalten, `max-inline-size:60vw` durch `max-inline-size:100%` ersetzen.
2. `.dateisuche` bzw. `.dateisuche-feld` (Z. 99/100): `min-width:0` ergänzen, Feld `flex:1 1 12rem`, damit die Flex-Kette mitschrumpft.
3. Die Kopfzeile braucht keine zweite Messung; die Breitenregel und die Messprobe genügen.

### Grobentwurf

Kein neuer Baustein. Eine CSS-Deklaration in `src/GitReviewA/web/gitreviewa.css`; ein Playwright-Spec.

## Offene Fragen

Keine an den product-owner. Der Befund ist ein Baufehler an einer gebauten und abgenommenen Zusage (R00049, R00035); die Behebung ändert keinen Wortlaut.

## Warum löst diese Anforderung das Problem?

Auslöser: der Entwicklertest der Karte #63 (Punkt 1) — ein Klick auf den rechten Rand des Suchfelds klappt die Seitenleiste ein. Wenn die Feldbreite am Behälter statt am Viewport hängt, bleibt das Feld samt rechter Kante im Kopf der Seitenleiste, der Knopf überdeckt keinen Inhalt mehr, und jeder Klick auf das Feld fokussiert es. Der Hebel ist die eine Breitenregel: dieselbe Stelle trägt jede Seitenleistenbreite (Ziehen) und jede Fensterbreite, statt für jeden Fall eine eigene Rechnung zu brauchen.

## Notizen

- Priorität: Hoch (Klickfläche des Suchfelds ist dem Knopf ausgeliefert; die rechte Kante ist nicht sichtbar).
- Betroffene Nutzer/Systeme: der prüfende Mensch am Suchfeld der Dateiliste.
- Workaround: die Seitenleiste breiter ziehen (≥ 380 px), dann passt das Feld (Anmerkung des Entwicklertesters) — kein Ersatz.
- Nicht Teil dieser Anforderung: ein gemeinsames Kopfzeilen-Raster (Option 2); das Musterfeld „Muster ausblenden“ (R00025) bleibt unberührt (es hat keine feste Breite).
- Herkunft: Befundkarte #63, Befund 1, `.factory/laeufe/63-entwicklertester-1.md`.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-26 | Angelegt | Karte #63, Befund 1 des Entwicklertests (`.factory/laeufe/63-entwicklertester-1.md`) |
