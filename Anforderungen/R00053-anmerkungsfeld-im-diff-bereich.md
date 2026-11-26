---
id: R00053
status: Neu
datum: 2026-11-26
ursprung: Bug-Report
ursprungslauf: R00042
---

# R00053: Behebung von „Anmerkungsfeld ragt über den rechten Diff-Rand“

## Beschreibung

Das Notizfeld einer Anmerkung (`anm-eingabe`, [R00010](R00010-zeile-annotieren.md) / [R00018](R00018-anmerkung-aendern.md)) ist 576 px breit (`min(72ch, 100vw − 220px)`) und damit breiter als der Diff-Bereich, sobald die Ergebnis-Spalte ([R00037](R00037-ergebnis-spalte-live.md), [R00042](R00042-ergebnis-spalte-ziehen.md)) offen ist. Es ragt über den rechten Rand des Diffs hinaus, wird abgeschnitten, und der Diff-Rollbereich bekommt keinen waagerechten Bildlauf (`scrollLeft` bleibt 0) — der Anfang der Anmerkung lässt sich schreiben, das Ende des Feldes nicht sehen.

Nachgestellt und belegt am echten Programm (Entwicklertest `.factory/laeufe/63-entwicklertester-1.md`, Punkt 2, Bildschirmfotos in `gemeinsam/scratchpad/etst-63/beleg.md`):

| Fenster | Ergebnis-Spalte | Feld rechts | Diff rechts | Rollbereich rechts | Befund |
|---|---|---|---|---|---|
| 1280 × 800 | offen | 1077 | 954 | 938 | 123 px über dem Diff-Rand, 139 px abgeschnitten, kein Bildlauf |
| 1280 × 800 | zu | −179 px | 954 | — | passt |
| 812 × 800 | offen | 1077 | 954 | 938 | 289 px abgeschnitten |
| 812 × 800 | zu | — | — | — | ebenfalls abgeschnitten (feste 576 px) |

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (der Diff ist ein eigener Bereich mit eigenem Bildlauf) und „Anmerkungen an Stellen“ (die Anmerkung ist der Rückkanal an die KI und muss ganz schreibbar sein).

## Ursachenanalyse

### Root Cause

`src/GitReviewA/web/gitreviewa.css:249` — `.anm-eingabe{display:block;inline-size:min(72ch,calc(100vw - 220px));height:auto;min-block-size:72px;…}` rechnet die Breite aus dem **Viewport**: bei der Standardschrift sind 72ch ≈ 576 px, und `100vw − 220px` berücksichtigt nur die linke Seitenleiste — es stammt aus der Zeit **vor** der Ergebnis-Spalte (R00037/R00042) und kennt die dritte Spalte (320 px) nicht. Bei 1280 px ist der Diff-Bereich ~588 px breit (Spalte 3 der Rasterspalten `360 | 6 | 1fr | 6 | 320`, Z. 378), sein Inhaltsbereich um die Polsterung schmaler; das 576-px-Feld beginnt bei ~501 und endet bei 1077, während der Diff bei 954 endet. `min(72ch, …)` wählt immer 576 px, weil `100vw − 220px` bei 1280 und 812 px größer ist. Das Feld liegt im Rollbereich `.df-sc` (Z. 180, `overflow-x:auto`), aber die feste Breite erzeugt keinen Bildlauf, weil kein Element breiter als der Rollbereich werden **darf** — es wird abgeschnitten.

Die frühere Regel steht Zeile 246 (`.anm-eingabe{inline-size:100%;box-sizing:border-box;min-inline-size:0}`) und wird von Zeile 249 (gleicher Selektor, später) überschrieben. Ausgeschlossen: die Zeilenzahl- und Blocklogik des Diffs (der Fehler tritt auch bei „ganze Datei“ auf) und der Server (die Anzeige ist reines CSS).

### Betroffene Komponenten

- `src/GitReviewA/web/gitreviewa.css` — `.anm-eingabe` (Z. 249, überschreibt Z. 246).
- Wirkt auf jedes Notizfeld, weil `anmerkungen.js:773` für alle Anmerkungen dieselbe Klasse `inp anm-eingabe` setzt: Zeilen-, Bereichs- und Dateianmerkung sowie „Ändern“ (I0017, I0018, I0023, I0032).
- Kein Serverweg, kein `git`-Aufruf, kein C#-Code.

## Lösungsvorschlag

### Optionen

| Option | Komplexität | Testbarkeit | Rever­sibilität | Risiko |
|---|---|---|---|---|
| 1. **Lokal (Empfehlung):** Feld an den Behälter binden — `inline-size:100%` mit Obergrenze `max-inline-size:72ch` (Z. 246 trägt es, Z. 249 wird zur Obergrenze) | gering | gut (CSS-Regel, Messprobe) | hoch (eine Regel) | Feld wird schmaler, wenn der Diff schmal ist — erwünscht (R00042: die Spalten geben nach) |
| 2. Komponente: eine gemeinsame Regel „Formularfeld in einem Rollbereich nimmt die Behälterbreite, gedeckelt durch eine `ch`-Obergrenze“ für `.anm-eingabe` und `.dateisuche-eingabe` (R00052) und künftige Felder | mittel | gut | mittel | berührt R00052 mit; eine Regel mehr, aber eine Stelle für alle Felder |
| 3. Architektur: das Notizfeld als Überlagerung/Dialog außerhalb des Rollbereichs rendern | hoch | mittel | mittel | ändert R00010/R00018 (Anzeige am Diff, offenes Feld übersteht Neuzeichnen, Lehre #23) — mehr Umfang als der Befund |

### Langfristige Lösung

Option 1. Die Breite des Feldes hängt am **Behälter** (`.df-sc`) statt am Viewport, mit `max-inline-size:72ch` als ergonomischer Obergrenze für breite Fenster. Damit gilt derselbe Satz für beide Fensterbreiten und beide Zustände der Ergebnis-Spalte; die Obergrenze bleibt nah an der bisherigen Lesbarkeit. Option 2 ist die spätere Aufräumkarte (siehe Bericht, Frage 1).

### Alternative Ansätze

- Option 2: verallgemeinert die Regel, ist aber mehr Umfang als der Befund und berührt R00052 mit.
- Option 3: löst das Problem, ändert aber die Interaktion der Anmerkung (Feld am Diff) und ist Risiko ohne Not.
- Den Diff-Bereich waagerecht scrollen lassen (`scrollLeft` ≠ 0): behebt das Abschneiden, aber der Mensch müsste zum Schreiben des Feldendes horizontal scrollen — schlechter als die Behälterbindung.

## Test-Strategie

### Test zur Bug-Reproduktion (zuerst rot)

- Playwright `anmerkungen.spec` (Browser-Eigenes): Zeile anklicken → Enter, dann `anm-eingabe` und `#diff`/`.df-sc` mit `getBoundingClientRect` messen: `anm-eingabe.right ≤ #diff.right` **und** ≤ `.df-sc` right, rechte Kante sichtbar. Heute rot (1077 > 954). Varianten: Ergebnis-Spalte zu (grün), 812 px (rot).

### Code-Extraktion für isoliertes Testing

Keine: die Regel ist eine CSS-Deklaration; die Messprobe ist der Test.

### Regressionstests

- Playwright: beide Fensterbreiten (1280, 812) × Ergebnis-Spalte offen/zu (vier Fälle, Kriterien 1–3); die Anmerkungsarten Zeile, Bereich, Datei und „Ändern“ (dieselbe Regel, Kriterien 4).
- Bestehende Tests von R00010/R00018/R00031 (Anlegen, Ändern, Bereich) und R00037/R00042 bleiben grün; keine Anfrage, kein `git`-Aufruf, nichts auf stderr.

## Akzeptanzkriterien

Vorbereitung: **Ordner/Repo** aus `user-stories/R00053.md`, Aufruf `gitreviewA <p1> <p2> --kein-browser`; im Browser 1280 × 800 und 812 × 800, Ergebnis-Spalte offen und zu. „Mitte“ heißt: senkrechte Mitte des Feldes.

- [ ] 1. **Abnahme-Probe des Entwicklertesters (wörtlich):** Zeile anklicken → Enter → `anm-eingabe.right ≤ #diff.right` **und** ≤ `.df-sc` right, rechte Kante sichtbar. Heute rot (1077 > 954). Varianten: Spalte zu (grün), 812 px (rot). *Ebene: Playwright (Browser-Eigenes).*
- [ ] 2. Gegeben 1280 px und die Ergebnis-Spalte offen, wenn man in das Feld tippt, dann ist das Ende des Feldes sichtbar (die rechte Kante liegt im Diff-Bereich), und der Diff-Rollbereich hat keinen waagerechten Bildlauf (`scrollLeft = 0`). *Ebene: Playwright.*
- [ ] 3. Gegeben 812 px, wenn man eine Zeile anmerkt (Ergebnis-Spalte offen und zu), dann gilt Kriterium 1 in beiden Fällen; die Anmerkungs-Spalte gibt zuerst nach (R00042), das Notizfeld passt sich an. *Ebene: Playwright.*
- [ ] 4. Gegeben eine Zeilen-, eine Bereichs- und eine Dateianmerkung sowie eine geänderte Anmerkung, wenn man jede öffnet, dann gilt Kriterium 1 für jede (dieselbe Klasse `anm-eingabe`, eine Regel). *Ebene: Playwright und Oberfläche gegen Fake.*
- [ ] 5. Gegeben der Diff wird nach dem Anlegen neu gezeichnet (R00030/R00010, Lehre #23), wenn das Feld offen bleibt, dann liegt es weiter im Diff-Bereich, und sein Text ist unverändert. *Ebene: Playwright.*
- [ ] 6. Kein Serverweg: das Öffnen, Tippen und Messen erzeugt keine zusätzliche Anfrage, keinen `git`-Aufruf und keine Zeile auf stderr (nur der eine Anlege-`POST`). *Ebene: Integration (Aufrufzählung).*
- [ ] 7. Der Reproduktionstest ist ohne Fix rot und mit Fix grün, der ursprüngliche Fehler tritt in den Szenarien der User Story nicht mehr auf, und alle Tests aller Ebenen sind grün.

Grenz- und Leerfälle bedacht: schmalstes Fenster (812 px, Kriterium 3), Ergebnis-Spalte offen/zu (1, 3), alle vier Anmerkungsarten (4), Neuzeichnen bei offenem Feld (5). Verworfen: den Rollbereich scrollen lassen (Nutzbarkeit schlechter).

**Pflichtpunkte der Detailplanung** (`AI-Team/planer.md`):
1. *Grenzen je Ein- und Ausgabe:* Das Feld bekommt eine **Obergrenze** (`max-inline-size:72ch`) und die **Behälterbreite** als eigentliche Breite — Kriterien 1–3. Die Textgrenze von 10 000 Zeichen je Anmerkung bleibt (R00010/R00018, unverändert) und geht als Zitat ins Ergebnis (stdout, nicht betroffen).
2. *Anzeigeverfahren, Standard zuerst:* „Zusammen“ ist Standard und wird in Kriterium 1 zuerst gemessen; „Einzeln“ je Commit und die Ansicht „ganze Datei“ nutzen dasselbe Feld (Kriterium 4). Anordnung und Leerraum sind nicht betroffen.
3. *Festes Layout:* Genau der Anlass aus `AI-Team/planer.md` („Datei-Anmerkungen drücken den Diff auf 0 px“): ein Element liegt über/neben einem Rollbereich und muss darin liegen. Die Behebung bindet das Feld an `.df-sc` (Kriterien 1–3).
4. *NFA am Ausführungsort:* Nur Browser und CSS; keine Prozess-stderr-Zeile (Kriterium 6).
5. *Eine Unterscheidung, ein Ort:* Die **eine** Breitenregel `.anm-eingabe` bestimmt die Feldbreite für alle vier Anmerkungsarten und beide Zustände; niemand rechnet die Breite ein zweites Mal.

## Implementierungshinweise

1. `.anm-eingabe` (Z. 249): `inline-size:min(72ch,calc(100vw - 220px))` ersetzen durch `inline-size:100%` und `max-inline-size:72ch` ergänzen; die Regel Z. 246 (`inline-size:100%;box-sizing:border-box;min-inline-size:0`) bleibt die Grundlage und kann mit Z. 249 zusammengeführt werden.
2. Keine zweite Breitenrechnung in `anmerkungen.js`; das Feld bleibt ein Kind des Rollbereichs.

### Grobentwurf

Kein neuer Baustein. Zwei CSS-Deklarationen in `src/GitReviewA/web/gitreviewa.css`; ein Playwright-Spec.

## Offene Fragen

1. An das Team (nicht an den product-owner — Wortlaut und Verhalten ändern sich nicht): **Soll dieselbe Regel allgemein gelten** (Option 2, „Formularfeld nimmt die Behälterbreite, gedeckelt durch `ch`“) und R00052 mitnehmen? Empfehlung: **später** als eigene kleine Karte, nicht in diesem Bug — der Befund verlangt nur das Anmerkungsfeld, und R00052 behebt denselben Fehlertyp an seiner Stelle. Bis zur Antwort gilt Option 1.

## Warum löst diese Anforderung das Problem?

Auslöser: der Entwicklertest der Karte #63 (Punkt 2) — bei offener Ergebnis-Spalte ist das Notizfeld 123 px zu breit und wird abgeschnitten. Wenn die Feldbreite am Diff-Rollbereich hängt, bleibt das Feld in seinem Bereich und die rechte Kante ist sichtbar; weil die Ergebnis-Spalte zuerst nachgibt (R00042), passt sich das Feld an, ohne den Diff zu drücken. Der Hebel ist dieselbe Behälterbindung wie in R00052: eine Regel statt einer Rechnung je Fensterbreite und Spaltenzustand.

## Notizen

- Priorität: Hoch (die Anmerkung ist der Rückkanal an die KI; ein abgeschnittenes Feld erschwert das Schreiben).
- Betroffene Nutzer/Systeme: der prüfende Mensch an jeder Anmerkung in jeder Ansicht.
- Workaround: keiner im Feld; die Ergebnis-Spalte einklappen (Anmerkung des Entwicklertesters) — kein Ersatz bei 812 px.
- Nicht Teil dieser Anforderung: die feste Breite des Suchfeldes der Dateiliste (R00052); ein allgemeines Formularfeld-Raster (Option 2, eigene Karte).
- Herkunft: Befundkarte #63, Befund 2, `.factory/laeufe/63-entwicklertester-1.md`.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-26 | Angelegt | Karte #63, Befund 2 des Entwicklertests (`.factory/laeufe/63-entwicklertester-1.md`) |
