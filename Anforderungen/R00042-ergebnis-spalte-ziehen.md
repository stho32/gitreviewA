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

- **Trenner rechts**: wie der Trenner links (R00034) — Ziehen mit der Maus (Breite folgt live), Tab erreichbar, Pfeil links verbreitert und Pfeil rechts verschmälert die Spalte um je 16 px (die Spalte wächst nach links, APG „Window Splitter“), Pos1/Ende auf Mindest-/Höchstbreite, Doppelklick auf 320 px. `role="separator"`, `aria-orientation="vertical"`, `aria-controls` auf die Ergebnis-Spalte, `aria-valuenow/-min/-max` (Breite der Spalte, 240, tatsächliche Höchstbreite), Name „Breite der Ergebnis-Spalte“. Er sitzt zwischen Diff und Spalte an der Stelle, an der heute der Streifen mit dem Knopf liegt (wie links); ist die Spalte eingeklappt, gibt es ihn nicht. Gebaut mit derselben Trenner-Mechanik je Seite (Zustand, Element, Zug, Tasten, Doppelklick, `aria-*`), keine Kopie.
- **Breitenregel für drei Bereiche** (Pflichtpunkt 5: die eine Stelle): eine reine Rechnung bestimmt beide gezeigten Breiten und die Stellung der Spalte — je Seite 240–640 px, der Diff mindestens 320 px, zwei Trenner je 6 px; eine eingeklappte Seite belegt nur ihren Streifen (24 px). Ziehen, Tastatur, Doppelklick, Ein- und Ausklappen (R00035, R00037), Fenster-Änderung, `aria-valuemax` und die Sperre des Ausklapp-Knopfs lesen nur diese Rechnung; es gibt keine zweite Rechnung für „passt die Spalte noch?“ (heute: `ergebnisBreite` und die feste Grenze 812 px in `einklappen.js`). Die Rechnung kennt zwei Arten von Grenzen: **beim Ziehen** gibt die andere Seite nicht nach — die Grenze einer Seite ist Fenster − 320 − 6 − Belegung der anderen Seite (je Seite höchstens 640); **bei Fensteränderung und Ausklappen** gilt die Reihenfolge unten. Rechenbeispiel: Fenster 1280, links 360, Spalte offen → Höchstbreite rechts = min(640, 1280 − 360 − 320 − 12) = 588; Höchstbreite links bei Spalte 320 = min(640, 1280 − 320 − 12 − 320) = 628 (heutiges Verhalten bleibt).
- **Schrumpfendes Fenster** (PO Zeile 199): reicht die Breite nicht mehr für Diff ≥ 320, wird zuerst die Ergebnis-Spalte schmaler (bis 240), dann klappt sie selbständig ein, erst danach wird die linke Seitenleiste schmaler (bis 240, R00034). Wächst das Fenster wieder, kommen die zuletzt gewählten Breiten zurück, soweit sie passen; die selbständig eingeklappte Spalte bleibt eingeklappt, bis man sie ausklappt (heute kommt sie beim Wachsen von selbst zurück — das ändert sich). Unter 812 px (drei Mindestbreiten) ist sie eingeklappt und nicht ausklappbar (Knopf gesperrt, Grund „Fenster zu schmal“, R00037); unter 566 px gilt eine Spalte (R00033).
- **Ausklappen im engen Fenster** (Empfehlung, offene Frage 1): Klappt der Mensch die Spalte ab 812 px aus, obwohl die gewählten Breiten nicht passen (R00037 Kriterium 8: „ausklappbar, Diff danach ≥ 320 px“), gibt die linke Seitenleiste nach (bis 240), dann die Spalte (bis 240); die Spalte klappt nicht wieder von selbst ein. Dieser Vorrang gilt, bis die gewählten Breiten wieder alle passen oder der Mensch die Spalte einklappt oder die Seitenleiste ausdrücklich ausklappt (dann gilt wieder die Reihenfolge oben). Die gewählten Breiten bleiben dabei als Wunsch erhalten.
- **Seitenleiste eingeklappt** (I0036): eine eingeklappte Seitenleiste belegt nur ihren Streifen, deshalb bleibt rechts mehr Platz (Rechenbeispiel: Fenster 900, links eingeklappt, Spalte 320 → Diff = 900 − 24 − 6 − 320 = 550; die Spalte klappt nicht ein). Der rechte Trenner arbeitet unverändert; seine Höchstbreite rechnet den Streifen statt der Seitenleiste ein.
- **Fokus**: klappt die Spalte selbständig ein (Fenster schmaler) und stand der Fokus im rechten Trenner oder in der Spalte, steht er danach auf dem Ausklapp-Knopf (nie ins Leere, Lehre aus I0036).
- **Drei Rollbereiche**: Seitenleiste, Diff und Ergebnis-Spalte scrollen je für sich; Kopf und Statuszeile behalten Ort und Höhe; die Seite selbst scrollt nicht (R00033).
- **Zustand**: Breiten sind Seitenzustand (nur RAM), bleiben bei Datei-, Commit-, Modus-, Ansichts- und Anordnungswechsel; nach dem Neuladen gelten 360 px links und 320 px rechts (bzw. der Start nach Fensterbreite aus R00037).
- **Ohne Neuzeichnen**: Ziehen ändert eine CSS-Variable am Rahmen; Diff und Ergebnis werden nicht neu gezeichnet, offenes Notizfeld, Markierung, Suchtreffer und alle drei Bildlaufpositionen bleiben.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): jede Breite ist eine Spanne 240–640 px; Werte außerhalb werden geklemmt, nie verworfen; ein Ziehen über die Fensterkante klemmt auf die Höchstbreite. Je Einheit: Zeilen im Ergebnis sind nicht gekürzt (R00037, Zeilen bis 5 000 Zeichen und mehr) und werden umbrochen — auch bei der schmalsten Spalte (240 px) gibt es keinen waagerechten Bildlauf.
- **Performance** (grobe Schranke nach R00047, Betreiber 2026-11-26): Ziehen friert die Oberfläche nie länger als **2 s** ein (Einfrier-Schranke) bei 20 000 Diff-Zeilen und 500 Anmerkungen in der Spalte; keine engeren Ziele; **keine künstliche Last** in den Proben (`AI-Team/gelerntes.md`).
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
- [ ] 6. Gegeben ein offenes Notizfeld mit Text, ein Suchtreffer und drei Bildlaufpositionen, wenn man beide Trenner zieht, dann bleiben Feld, Text, Fokus, Treffer und Positionen; es gibt keine neue Diff- und keine neue Ergebnis-Anfrage, und beim Ziehen über 20 000 Zeilen friert keine Aufgabe die Oberfläche länger als 2 s ein (grobe Schranke R00047; Absenzprobe mit Knotenzähler als Positivkontrolle wie R00017). *Ebene: Playwright (Browser-Eigenes, Anfragen gezählt).*

- [ ] 7. Gegeben Fenster 1280 px, links 360, Spalte 320, wenn man das Fenster auf 900 px verkleinert (Spalte klappt ein, Seitenleiste 360), die Spalte ausklappt und danach das Fenster auf 1280 px vergrößert, dann ist die Spalte nach dem Ausklappen 320 px und die Seitenleiste 248 px breit (Diff 320 px), und bei 1280 px sind es wieder 360 und 320 px; verkleinert man danach auf 1000 px, ist es wieder die Reihenfolge von Kriterium 4 (Spalte 308, Seitenleiste 360), nicht die der Ausnahme. Rechnung: 900 − 6 − 320 − 6 − 320 = 248 ≥ 240; bei 850 px gibt zusätzlich die Spalte nach (Seitenleiste 240, Spalte 278: 850 − 240 − 12 − 320). Unter 812 px klappt die Spalte in jedem Fall ein, der Knopf ist gesperrt. *Ebene: Unit (Breitenregel inklusive Vorrang, Mutanten „Vorrang nie zurückgesetzt“, „Spalte klappt wieder ein“) und Playwright.*
- [ ] 8. Gegeben Fenster 900 px, die Seitenleiste eingeklappt und die Spalte offen (320 px), wenn man die Seitenleiste ausklappt (360 px), dann klappt die Spalte ein (Rechnung: 360 + 6 + 240 + 6 + 320 = 932 > 900) und der Diff ist 900 − 360 − 6 − 24 = 510 px breit; klappt man die Seitenleiste wieder ein, bleibt die Spalte eingeklappt. Bei 1280 px mit eingeklappter Seitenleiste ist die Höchstbreite der Spalte min(640, 1280 − 24 − 6 − 320) = 640. *Ebene: Unit (Breitenregel) und Playwright (Zusammenspiel mit I0036).*
- [ ] 9. Gegeben der Fokus auf dem rechten Trenner, wenn man das Fenster so verkleinert, dass die Spalte selbständig einklappt, dann steht der Fokus auf dem Ausklapp-Knopf (nicht auf `body`), und der Tab-Weg führt weiter zum Statuszeilenende, ohne einen unsichtbaren Stopp. *Ebene: Playwright (Browser-Eigenes: Fokus, Tab-Weg).*
- [ ] 10. Gegeben Repo Z in „Zusammen“ mit einer Datei, einer Anmerkung mit einer Zeile aus 5 000 Zeichen, wenn man die Spalte auf 588 px verbreitert (Diff 320 px) und danach auf 240 px verschmälert (Diff 668 px), dann gilt in beiden Stellungen und in beiden Anordnungen (untereinander, nebeneinander), mit Umbruch an und aus und in beiden Modi („Zusammen“ zuerst, dann „Einzeln“): der Diff-Kopf ist bei 668 px eine Zeile und bei 320 px höchstens zwei Zeilen hoch (R00039 Kriterium 1/5), ohne waagerechten Überlauf des Kopfs; die Herkunft ist, wenn sie nicht ganz sichtbar ist, mit „…“ gekürzt und steht ganz in `title` und im Namen (PO Zeile 247); die Spalte hat bei 240 px keinen waagerechten Bildlauf; die Seite selbst hat keinen Bildlauf. *Ebene: Playwright (Darstellung, gemessene Höhe und Breite; Messhilfen aus R00039 wiederverwenden).*

Grenz- und Leerfälle bedacht: Grenzen 240/640/Diff 320 (Kriterien 1, 2); schmales Fenster (4, 7; unter 812 und 566 px gilt R00037/R00033); eingeklappte Seite (4, 8); Fokus bei selbständigem Einklappen (9); lange Zeile in der schmalsten Spalte und schmaler Diff (10); keine Datei gewählt (Trenner bedienbar, kein eigenes Kriterium). Verworfen: Breiten über das Neuladen behalten (Vision „Nichts wird gespeichert“, PO Zeile 173).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 1, 2, 4, 7, 8 und 10 (Länge je Zeile in der schmalsten Spalte); 2 Anzeigeverfahren — Kriterium 5 („Zusammen“ zuerst, „Einzeln“, Ansicht, Anordnung) und 10 (beide Anordnungen, Umbruch, beide Modi bei Diff 320 px); 3 festes Layout — Kriterium 3 (drei Rollbereiche, Kopf und Statuszeile stehen) und 10 (Diff-Kopf wächst nie über zwei Zeilen); 4 Ausführungsort — nur Browser; 5 eine Stelle — die Breitenregel für drei Bereiche: sie bestimmt Breiten, Stellung der Spalte (selbständig eingeklappt), Zuggrenzen, `aria-valuemax` und die Sperre des Knopfs; Wege, die sie nutzen — Zug, Tasten, Doppelklick, Fenster, Ausklappen links und rechts (Kriterien 1, 4, 7, 8).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/trenner-werte.js` (Breitenregel für drei Bereiche), `trenner.js` (Mechanik je Seite, ein gemeinsamer Zustand), `einklappen.js` und `einklappen-werte.js` (Ausklappen und selbständiges Einklappen fragen die Regel), `index.html`, `gitreviewa.css`.
- `tests/` gibt es für diese Dateien nicht; Unit-Specs laufen unter `e2e/tests/bausteine/` (Node), Browser-Specs unter `e2e/tests/`, Treiber unter `e2e/treiber/` und `e2e/dsl/`.

## Technische Überlegungen

**Detailplanung** (Stand 2026-11-26) — Bubbles B4101–B4106 unter I0043. **Artboard**: Variante A (drei Spalten); die Trenner zeichnet weder das Artboard noch Entwurf Fassung 2 — Standard aus Material 3 und APG wie R00034.

**Abgleich mit dem Code (I0034–I0038, auf `main`)** — wo Anforderung und Bestand auseinanderliegen:

1. `trenner-werte.js`: `ergebnisBreite(fenster)` ist eine Funktion allein der Fensterbreite (320, nur nahe 812 px bis 240), und `hoechsteBreite(fenster, ergebnisBreiteJetzt)` lässt die **linke** Seite zuerst nachgeben — das Gegenteil von PO Zeile 199. Die Anforderung bleibt, der Code wird umgebaut (B4101); `ergebnisBreite` und der Test `hoechsteBreite(900, 320) = 248` entfallen bzw. werden ersetzt.
2. `einklappen.js`: die sichtbare Stellung ist `zustand.eingeklappt || !ausklappbar()` — abgeleitet, also **klebt** das Einklappen im schmalen Fenster nicht: beim Wachsen kommt die Spalte von selbst zurück. R00042 Kriterium 4 verlangt „bleibt eingeklappt“. Die Anforderung bleibt, der Code folgt (B4104). Die feste Grenze `ERGEBNIS_AUSKLAPPBAR = 812` bleibt als Untergrenze (Summe der drei Mindestbreiten), wird aber Teil der einen Rechnung.
3. `trenner.js` ist **einmalig**: ein Zustand, ein Element, `window.gitreviewaBreite`, die CSS-Variable `--gr-leiste-breite`, das Ereignis `breite-geaendert`. „Je Seite, keine Kopie“ verlangt dieselbe Form wie `einklappen.js` (`anlegen(seite)`), mit **einem gemeinsamen Breitenzustand** (die Regel braucht beide Wünsche). Die bestehenden Specs `trenner-*.spec.js` und `breite-seitenleiste.spec.js` bleiben die Probe für die linke Seite (B4102, Charakterisierung zuerst).
4. `gitreviewa.css`: Spalte 4 des Rasters ist 6 px (`--gr-ergebnis-trenner-breite`) und trägt heute nur den Streifen mit dem Knopf (Knopf `pointer-events:auto`, Streifen `none`) — dieselbe Doppelbelegung wie links Spalte 2; der rechte Trenner kommt in Spalte 4. `.gr-ergebnis` hat zusätzlich `border-inline-start`; zwei Linien nebeneinander werden zu einer (B4103).
5. `setzeDiffBreite` im Treiber `e2e/treiber/diff-oberflaeche.js` setzt Fenster = Diff + 972 (640 + 320 + 12) und klappt die Spalte aus; das stimmt mit der neuen Regel überein (Wünsche passen) und bleibt unverändert.
6. Die Anforderung nannte „keine Aufgabe über 150 ms“; die grobe Schranke ist seit R00047 (Betreiber 2026-11-26) 2 s — angepasst.

### Ablauf

1. Zug/Taste/Doppelklick am rechten Trenner → Wunschbreite → Breitenregel (B4101, B4103).
2. Fensteränderung, Ausklappen, Einklappen → Breitenregel → gezeigte Breiten, Stellung der Spalte, `aria-valuemax`, Sperre des Knopfs (B4104).
3. Breiten → CSS-Variablen am Rahmen, ohne Neuzeichnen (B4105).

### Grobentwurf

- `trenner-werte.js` (rein) — `anzeige(fenster, wunsch, stellung)` → `{links, rechts, rechtsEin, vorrang}` mit `wunsch = {links, rechts}`, `stellung = {linksEin, rechtsEin, vorrang}`; `hoechstLinks(fenster, gezeigt)` und `hoechstRechts(fenster, gezeigt)` für Zug und Tasten (die andere Seite gibt beim Ziehen nicht nach); `breiteNachZug`/`breiteNachTaste` je Seite mit Richtung.
- `trenner.js` — `anlegen(seite)` mit `seite = {rechts, id, klasse, name, steuert, variable, ereignis, start}`; ein Breitenzustand `{wunsch, gezeigt, vorrang}` für beide Seiten; `window.gitreviewaBreite` bleibt für links, `window.gitreviewaErgebnisBreite` für rechts.
- `einklappen.js` — `anlegen(seite)` bleibt; die Stellung der Spalte kommt aus der Regel, das selbständige Einklappen schreibt in den Zustand (klebend), der Fokus wird dabei gerettet.

### Änderungen an bestehenden Klassen

`trenner-werte.js`/`trenner.js` aus R00034 (verallgemeinert), `einklappen.js` (Ausklappen und selbständiges Einklappen fragen die Regel), `index.html`, `gitreviewa.css`.

## Tests

**Unit** (Node, `e2e/tests/bausteine/trenner-werte.spec.js`): Breitenregel — Spannen beider Seiten, Diff 320, Reihenfolge beim Schrumpfen, Vorrang, Zuggrenzen, Seitenleiste eingeklappt; Mutanten „zu groß“, „zu klein“, „fest/ignoriert“, „linke Seite gibt zuerst nach“, „Vorrang nie zurückgesetzt“.
**Integration/E2E (Playwright)**: Ziehen, Tastatur, drei Rollbereiche, Fenster ändern (schrumpfen, wachsen, ausklappen), Zusammenspiel mit Einklappen links, Fokus, Wechsel und Neuladen, offenes Feld, Diff-Kopf bei schmalem Diff — Browser-Eigenes, nicht Hot Path. Die bisherigen Specs der linken Seite bleiben unverändert grün (Charakterisierung); geändert werden nur die Erwartungen der alten Reihenfolge (`trenner-werte.spec.js`, ggf. `ergebnis-spalte.spec.js` zu Fenstergrößen).

## Abhängigkeiten

- Abhängig von: I0035 Breite der Seitenleiste ziehen (R00034, grün), I0038 Ergebnis-Spalte live (R00037, grün); berührt I0036 (Einklappen, grün).
- Blockiert: nichts.

## Offene Fragen

Entschieden: Wer gibt beim Schrumpfen zuerst nach — die Ergebnis-Spalte (PO Zeile 199, am 2026-11-25).

1. **Wer gibt nach, wenn der Mensch im engen Fenster eine Seite ausdrücklich ausklappt?** (Antwort des product-owners steht aus; die Anforderung folgt der Empfehlung.) Die Reihenfolge der Entscheidung (Spalte zuerst) gilt für das Schrumpfen; R00037 verlangt zugleich „ausklappbar ab 812 px“. Optionen: (A) die zuletzt ausdrücklich ausgeklappte Seite behält ihren Platz, die andere gibt nach, bis alle gewählten Breiten wieder passen (**Empfehlung**; die Wünsche gehen nie verloren, ein Ausklappen wirkt immer); (B) das Ausklappen senkt die Wunschbreite der anderen Seite dauerhaft; (C) die Spalte lässt sich in engen Fenstern nur ausklappen, wenn die Wünsche passen (verwirft R00037 Kriterium 8, „ausklappbar ab 812 px“). Beispiel zu A: Fenster 900, links 360, Spalte aus → ausklappen ergibt links 248, Spalte 320; dagegen klappt das Ausklappen der Seitenleiste bei offener Spalte die Spalte wieder ein.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- `/wireframe verfeinern D0002` anbieten (zwei Trenner nachzeichnen), keine Sperre (PO Zeile 180).

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 6 Bubbles unterhalb I0043 (B4101–B4106), 1 klar (2 h), 5 unklar (2–4 h) — 12–22 h Richtwert (Hypothese, ungemessen). Keine Ausbaustufen. Der Schnitt gegenüber der Vorplanung (4 Bubbles) trennt die Wiederverwendung der Trenner-Mechanik (B4102) vom neuen Trenner (B4103) und das Zusammenspiel mit dem Einklappen (B4104) vom Layout (B4105), weil beides der Befund aus dem Abgleich mit dem Code ist.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist der Satz des Betreibers „die Sidebars müssen vom Inhalt entkoppelt sein, ähnlich wie ein Texteditor“. Die linke Seite kann das nach I0034–I0036 schon (eigener Bildlauf, ziehen, einklappen); die neue rechte Spalte nur einklappen. Wenn die rechte Seite denselben Trenner bekommt und eine Regel beide Breiten gegen den Diff abwägt, verhalten sich beide Seiten wie die Seitenleisten eines Editors, und der Diff behält immer seine Mindestbreite. Der Hebel ist die eine Breitenregel: ohne sie würden zwei Trenner und zwei Einklapp-Knöpfe gegeneinander rechnen.

## Missing-Docs

- Keine.

## Notizen

### Verworfene Alternativen

- Ergebnis-Spalte unter den Diff statt daneben (horizontaler Trenner): verworfen — Richtung A zeigt sie rechts.
- Eigene Trenner-Implementierung für rechts: verworfen — dieselbe Mechanik je Seite (keine Kopie).
- Beide Seiten gleichzeitig anteilig nachgeben lassen: verworfen (PO Zeile 199) — die Spalte gibt zuerst nach.
- Breiten über das Neuladen behalten (`localStorage`): verworfen — Vision „Nichts wird gespeichert“ (PO Zeile 173).
- Zwei getrennte Rechnungen („passt die Spalte?“ im Einklappen, Breiten im Trenner): verworfen — Pflichtpunkt 5, es bleibt die eine Breitenregel.
- Diff-Kopf bei schmalem Diff zwingend einzeilig: nicht möglich ohne Verlust von Bedienelementen; es gilt R00039 Kriterium 1 (ab 600 px eine Zeile, darunter höchstens zwei) und PO Zeile 247 (Herkunft gekürzt, nie still).
