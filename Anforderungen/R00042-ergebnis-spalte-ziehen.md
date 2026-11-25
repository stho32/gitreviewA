---
id: R00042
status: Neu
datum: 2026-11-25
---

# R00042: Ergebnis-Spalte ziehen — drei Bereiche wie im Texteditor

## Beschreibung

Zwischen Diff und Ergebnis-Spalte steht ein zweiter senkrechter Trenner. Er lässt sich mit der Maus ziehen und per Tastatur verstellen, ein Doppelklick setzt die Startbreite zurück. Damit sind beide Seitenleisten wie in einem Texteditor vom Inhalt entkoppelt: drei Bereiche mit eigenem Bildlauf, jede Seite in der Breite ziehbar und einklappbar, Kopf und Statuszeile stehen. Wird das Fenster schmaler, gibt zuerst die Ergebnis-Spalte nach.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (Betreiber 2026-11-25: „die Sidebars müssen vom Inhalt entkoppelt sein, ähnlich wie ein Texteditor“).

Baut auf auf: [R00033](R00033-seitenleiste-bleibt-stehen.md) (Rollbereiche, schmales Fenster), [R00034](R00034-breite-der-seitenleiste-ziehen.md) (Trenner links, Breitenregel, Tastenschritt), [R00035](R00035-seitenleiste-ein-und-ausklappen.md) (Einklappen links), [R00037](R00037-ergebnis-spalte-live.md) (Ergebnis-Spalte, einklappbar, Breite 320 px).

### Domänenbezug

Kein Glossar. „Bereich“: Seitenleiste links, Diff in der Mitte, Ergebnis-Spalte rechts.

## Geschäftlicher Nutzen

Mit der Ergebnis-Spalte teilen sich drei Bereiche die Breite. Wer eine Datei mit langen Zeilen liest, will den Diff breit; wer am Ende das Ergebnis durchgeht, will die Spalte breit. Ohne Trenner bleibt nur Ein- oder Ausklappen. Wie im Texteditor stellt der Mensch die Breiten so, wie er gerade arbeitet, ohne dass ein Bereich den anderen mitscrollt.

## Funktionale Anforderungen

- **Trenner rechts**: wie der Trenner links (R00034) — Ziehen mit der Maus (Breite folgt live), Tab erreichbar, Pfeil links/rechts je 16 px, Pos1/Ende auf Mindest-/Höchstbreite, Doppelklick auf 320 px. `role="separator"`, `aria-orientation="vertical"`, `aria-controls` auf die Ergebnis-Spalte, `aria-valuenow/-min/-max`, Name „Breite der Ergebnis-Spalte“. Gebaut mit derselben Trenner-Mechanik je Seite, keine Kopie.
- **Breitenregel für drei Bereiche** (Pflichtpunkt 5: die eine Stelle): eine reine Rechnung klemmt beide Breiten — je Seite 240–640 px, der Diff mindestens 320 px, zwei Trenner je 6 px; eine eingeklappte Seite belegt nur ihren Streifen. Ziehen, Tastatur, Ausklappen (R00035, R00037) und Fenster-Änderung nutzen nur diese Rechnung. Rechenbeispiel: Fenster 1280, links 360 → Höchstbreite rechts = min(640, 1280 − 360 − 320 − 12) = 588.
- **Schrumpfendes Fenster**: reicht die Breite nicht mehr für Diff ≥ 320, wird zuerst die Ergebnis-Spalte schmaler (bis 240), dann klappt sie ein, erst danach wird die linke Seitenleiste schmaler (R00034). Wächst das Fenster wieder, kommen die zuletzt gewählten Breiten zurück, soweit sie passen; die eingeklappte Spalte bleibt eingeklappt, bis man sie ausklappt.
- **Drei Rollbereiche**: Seitenleiste, Diff und Ergebnis-Spalte scrollen je für sich; Kopf und Statuszeile behalten Ort und Höhe; die Seite selbst scrollt nicht (R00033).
- **Zustand**: Breiten sind Seitenzustand (nur RAM), bleiben bei Datei-, Commit-, Modus-, Ansichts- und Anordnungswechsel; nach dem Neuladen gelten 360 px links und 320 px rechts (bzw. der Start nach Fensterbreite aus R00037).
- **Ohne Neuzeichnen**: Ziehen ändert eine CSS-Variable am Rahmen; Diff und Ergebnis werden nicht neu gezeichnet, offenes Notizfeld, Markierung, Suchtreffer und alle drei Bildlaufpositionen bleiben.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): jede Breite ist eine Spanne 240–640 px; Werte außerhalb werden geklemmt, nie verworfen; ein Ziehen über die Fensterkante klemmt auf die Höchstbreite.
- **Performance**: Ziehen bleibt flüssig (keine Aufgabe über 150 ms) bei 20 000 Diff-Zeilen und 500 Anmerkungen in der Spalte; **keine künstliche Last** in den Proben (`AI-Team/gelerntes.md`).
- **Sicherheit**: unverändert — kein neuer Anfrageweg.
- **Logging** (Pflichtpunkt 4): nur Browser — nichts auf stderr.
- **Benutzerfreundlichkeit**: APG „Window Splitter“ wie R00034; Fokusring sichtbar.

## Akzeptanzkriterien

Vorbereitung: **Repo S** (`user-stories/R00033.md`, 60 Dateien, 200 Zeilen) und **Repo U** (`gross.txt`, 20 000 Zeilen, `user-stories/R00010.md`). Aufruf `gitreviewA <Hashes> --kein-browser`, 1280 × 800, Start in „Zusammen“, Ergebnis-Spalte ausgeklappt.

- [ ] 1. Gegeben links 360 px und die Ergebnis-Spalte 320 px, wenn man den rechten Trenner 200 px nach links zieht, dann ist die Spalte 520 px breit und der Diff 388 px; zieht man weiter bis an die Seitenleiste, bleibt die Spalte bei 588 px stehen (Diff 320 px). Rechnung: 1280 − 360 − 520 − 12 = 388; Höchstbreite min(640, 1280 − 360 − 320 − 12) = 588. *Ebene: Unit (Breitenregel, Spanne mit Mutanten zu groß/zu klein/fest) und Playwright (Ziehen).*
- [ ] 2. Gegeben der Fokus auf dem rechten Trenner, wenn man dreimal Pfeil links, dann Pos1, dann Ende drückt und danach doppelklickt, dann ist die Breite 368, 240, 588 und wieder 320 px; `aria-valuenow` folgt, `aria-controls` zeigt auf die Ergebnis-Spalte. Rechnung: 320 + 3 × 16 = 368 (Pfeil links verbreitert die rechte Spalte). *Ebene: Playwright (Browser-Eigenes: Tastatur, `aria-*`).*
- [ ] 3. Gegeben Repo U mit `gross.txt` gewählt, die Seitenleiste in der Mitte gescrollt und die Ergebnis-Spalte in der Mitte gescrollt, wenn man den Diff bis Zeile 10 000 scrollt, dann bewegen sich Seitenleiste und Spalte nicht; Kopf und Statuszeile stehen an Ort und Höhe; die Seite selbst hat keinen Bildlauf. *Ebene: Playwright (Darstellung).*
- [ ] 4. Gegeben links 360 px und rechts 320 px, wenn man das Fenster auf 1100, 1000 und 900 px verkleinert und danach wieder auf 1280 px vergrößert, dann ist die Spalte bei 1100 px 320 px breit (Diff 408), bei 1000 px 308 px (Diff 320), bei 900 px eingeklappt (Diff ≥ 320), und bei 1280 px bleibt sie eingeklappt, bis man sie ausklappt, dann wieder 320 px. Rechnung: 1000 − 360 − 320 − 12 = 308 ≥ 240; 900 − 360 − 320 − 12 = 208 < 240 → einklappen. *Ebene: Unit (Breitenregel) und Playwright.*
- [ ] 5. Gegeben beide Breiten gezogen (links 480, rechts 400), wenn man Datei, Commit, Modus, Ansicht und Anordnung wechselt und danach die Seite neu lädt, dann bleiben die Breiten bei allen Wechseln und sind nach dem Neuladen 360 und 320 px. *Ebene: Playwright (Browser-Eigenes).*
- [ ] 6. Gegeben ein offenes Notizfeld mit Text, ein Suchtreffer und drei Bildlaufpositionen, wenn man beide Trenner zieht, dann bleiben Feld, Text, Fokus, Treffer und Positionen; es gibt keine neue Diff- und keine neue Ergebnis-Anfrage, und beim Ziehen über 20 000 Zeilen entsteht keine Aufgabe über 150 ms (Absenzprobe mit Knotenzähler als Positivkontrolle wie R00017). *Ebene: Playwright (Browser-Eigenes, Anfragen gezählt).*

Grenz- und Leerfälle bedacht: Grenzen 240/640/Diff 320 (Kriterien 1, 2); schmales Fenster (4; unter 812 und 566 px gilt R00037/R00033); eingeklappte Seite (4); keine Datei gewählt (Trenner bedienbar, kein eigenes Kriterium). Verworfen: Breiten über das Neuladen behalten (Vision „Nichts wird gespeichert“, PO Zeile 173).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 1, 2, 4; 2 Anzeigeverfahren — Kriterium 5 („Zusammen“ zuerst, „Einzeln“, Ansicht, Anordnung) und 6; 3 festes Layout — Kriterium 3 (drei Rollbereiche, Kopf und Statuszeile stehen); 4 Ausführungsort — nur Browser; 5 eine Stelle — die Breitenregel für drei Bereiche (Kriterien 1, 4).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/trenner-werte.js` (Regel für drei Bereiche), `trenner.js` (je Seite), `index.html`, `gitreviewa.css`.
- `tests/` (Node-Unit), `e2e/`.

## Technische Überlegungen

**Vorplanung** — Bubbles B4101–B4104 unter I0043. **Artboard**: Variante A (drei Spalten); die Trenner zeichnet weder das Artboard noch Entwurf Fassung 2 — Standard aus Material 3 und APG wie R00034.

### Ablauf

1. Zug/Taste/Doppelklick am rechten Trenner → Wunschbreite → Breitenregel (B4101, B4102).
2. Fensteränderung → Breitenregel → rechte Seite gibt zuerst nach (B4101).
3. Breiten → CSS-Variablen am Rahmen, ohne Neuzeichnen (B4103).

### Grobentwurf

- `trenner-werte.js` (rein) — `breiten(fenster, wunschLinks, wunschRechts, eingeklappt)` → `{links, rechts, rechtsEingeklappt}`.
- `trenner.js` — Seite als Parameter.

### Änderungen an bestehenden Klassen

`trenner-werte.js`/`trenner.js` aus R00034 (verallgemeinert), `einklappen.js` (Ausklappen fragt die Regel), `index.html`, `gitreviewa.css`.

## Tests

**Unit:** Breitenregel (Spannen beider Seiten, Diff 320, Schrumpfen in Reihenfolge, Mutanten).
**E2E (Playwright):** Ziehen, Tastatur, drei Rollbereiche, Fenster ändern, Wechsel und Neuladen, offenes Feld — Browser-Eigenes, nicht Hot Path.

## Abhängigkeiten

- Abhängig von: I0035 Breite der Seitenleiste ziehen (R00034, rot, Karte #37), I0038 Ergebnis-Spalte live (R00037, rot).
- Blockiert: nichts.

## Offene Fragen

1. **Wer gibt beim Schrumpfen zuerst nach**: Empfehlung die Ergebnis-Spalte (rechts), weil Liste und Diff die Arbeit tragen und die Spalte eine Begleitung ist (Material 3 „supporting pane“ weicht zuerst). Alternative: beide Seiten anteilig.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- `/wireframe verfeinern D0002` anbieten (zwei Trenner nachzeichnen), keine Sperre (PO Zeile 180).

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 4 Bubbles unterhalb I0043 (B4101–B4104), 1 klar (2 h), 3 unklar (2–4 h) — 8–14 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist der Satz des Betreibers „die Sidebars müssen vom Inhalt entkoppelt sein, ähnlich wie ein Texteditor“. Die linke Seite kann das nach I0034–I0036 schon (eigener Bildlauf, ziehen, einklappen); die neue rechte Spalte nur einklappen. Wenn die rechte Seite denselben Trenner bekommt und eine Regel beide Breiten gegen den Diff abwägt, verhalten sich beide Seiten wie die Seitenleisten eines Editors, und der Diff behält immer seine Mindestbreite. Der Hebel ist die eine Breitenregel: ohne sie würden zwei Trenner und zwei Einklapp-Knöpfe gegeneinander rechnen.

## Missing-Docs

- Keine.

## Notizen

### Verworfene Alternativen

- Ergebnis-Spalte unter den Diff statt daneben (horizontaler Trenner): verworfen — Richtung A zeigt sie rechts.
- Eigene Trenner-Implementierung für rechts: verworfen — dieselbe Mechanik je Seite (keine Kopie).
