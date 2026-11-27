---
id: R00056
status: Neu
datum: 2026-11-27
ursprung: Bug-Report
---

# R00056: Dateinamen in schmaler Seitenleiste brechen an Trennern um

## Zusammenfassung

In der Dateiliste bekommt der Pfad eine Mindestbreite von 5rem, die Dateizeile darf umbrechen (Haken, Status, Balken und Zahlen rücken dann unter den Pfad), und der Pfad bricht an Trennern (`/`, `-`, `_`, `.`), mitten im Wort nur im Notfall. Gemessen bei 1280 × 800 (Seitenleiste 360 px) ist die Dateizeile 310 px breit, die festen Teile belegen 209 px; dem Pfad bleiben 101 px in Tiefe 0 und 85 px in Tiefe 1 — beide über der Basis 5rem (80 px), sodass die Zeile einzeilig bleibt, solange der Name in den Pfad passt. Heute schrumpft der Pfad neben fünf nicht schrumpfenden Geschwistern auf wenige Pixel und bricht Zeichen für Zeichen um. Kein neues Verhalten, nur Anzeige; die Entscheidungen stehen in `AI-Team/po-entscheidungen.md` Zeilen 279–281 (Option a, Karte #66).

Zahlt ein auf: [Vision](R00000-vision.md) — „Zusammen ist der Standard, die Dateien führen“ (die Seitenleiste lässt sich an den Inhalt anpassen; ein Name bleibt lesbar, auch wenn sie schmal ist).

## Ausgangssituation

- Bei 812 px Fenster und offener Ergebnis-Spalte ist die Seitenleiste 240 px breit (R00034, Mindestbreite 240; R00033, Zweispalt-Grenze 566 px). Belege: `Software-Factory/gemeinsam/scratchpad/etst-63/vergleich-812-offen-*.png`.
- `gitreviewa.css` Zeile 127: `.gr-dateien>li` ist `display:flex` ohne Umbruch; Zeile 136: `.datei-zeile .pfad{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}`; Status, Balken, Zahlen und Haken-Ziel sind `flex:none` (Zeilen 137–139, 287). Der Pfad bekommt, was übrig bleibt, und `anywhere` erlaubt den Bruch an jeder Stelle.
- Gemessen (2026-11-27, `gemeinsam/scratchpad/entw-66/befund.md`, `.factory/laeufe/66-entwickler-1.md`): bei 1280 × 800 ist die Dateizeile 310 px breit, die festen Teile belegen 209 px (Haken-Ziel 43 mit Tastenhinweis, Status 18, Balken 44, Zahlen 72, Lücken 32); dem Pfad bleiben 101 px (Tiefe 0) bzw. 85 px (Tiefe 1). Die frühere Rechnung aus CSS-Werten (190 px feste Teile, 19 px Rand) ließ die Seitenleisten-Polsterung (32 px) und den Tastenhinweis am Haken (19 px) aus; bei 812 px und offener Spalte (Seitenleiste 240 px) ist der Platz kleiner.
- Der Pfad kommt aus einem Ort: `listeneintragElement` in `dateiliste.js` (Datei und Ordner im Baum, `textElement('pfad', …)`), der Text aus `sichtbarerName` (Marken, R00011).

## Ziel

- **Mindestbreite**: `.datei-zeile .pfad` nimmt `flex:1 1 5rem` (Wert wie entschieden, PO Zeile 281).
- **Umbruch der Zeile**: `.gr-dateien>li` bekommt `flex-wrap:wrap`; was neben dem Pfad nicht mehr passt, steht in einer zweiten Zeile darunter. Gilt für Liste flach, mit Gruppen und im Baum.
- **Umbruch im Pfad**: `overflow-wrap:break-word` statt `anywhere`; Umbruchstellen nach `/`, `-`, `_`, `.`. Was ein Browser von sich aus nicht als Stelle anbietet, kommt über `<wbr>` (Hypothese: `_` und `.`; ungemessen — die Probe aus Kriterium 2 entscheidet, ob `<wbr>` nötig ist). `<wbr>` hat keinen Text: `textContent`, Kopieren und Marken bleiben, was sie sind (R00011).
- Ein Baustein, ein Ort: die Umbruchstellen setzt eine Funktion, die Datei- und Ordnerzeile gemeinsam nutzen; keine zweite Regel im Baum.
- Nicht verändert: der Abschnitt „Formularfelder im Rollbereich“ (R00055), das Suchfeld, der Diff-Kopf (Kürzung in der Mitte), die Seitenleistenbreite (R00034).

## Verifikation

Alle Specs bleiben grün, auch `dateiliste-gruppen-*.spec.js`, `dateisuche-*.spec.js` und `formularfelder-geometrie.spec.js`; die neue Messprobe (B5601) ist vor dem Umbau rot und danach grün.

## Akzeptanzkriterien

Testebene nach Projektregel: Playwright nur, weil Zeilenumbruch und Maße nur im Browser prüfbar sind; Kriterium 7 ist ein Unit-Test ohne Browser. Messfälle für 1–6: Repo N (siehe User Story), Fenster 812 × 800 mit offener Ergebnis-Spalte (Seitenleiste 240 px) und Fenster 1280 × 800 (Seitenleiste 360 px).

1. **Der Pfad hat 5rem** (Playwright). Gegeben Repo N bei 812 px und offener Ergebnis-Spalte, wenn man die Dateiliste betrachtet, dann ist die Breite jedes Pfad-Elements einer Dateizeile ≥ 5rem (80 px bei 16 px Schrift; die Probe liest 5rem aus der Wurzelschrift), in „Zusammen“ flach, mit Gruppen und im Baum; ist die Zeile umgebrochen und steht der Pfad allein, hat er die volle Zeilenbreite (bei 812 px ≥ 128 px).
2. **Kein Wort wird getrennt, das passt** (Playwright). Gegeben `db/001_anlegen.sql` und der lange Name aus Repo N, wenn die Zeile umbricht, dann fällt jeder Umbruch im Pfad direkt nach `/`, `-`, `_` oder `.`; mitten in einem Stück ohne Trenner bricht es nur, wenn dieses Stück allein breiter ist als der Pfad (Beispiel: ein Stück von 255 Zeichen). Messung: die Zeilenlage jedes Zeichens über `Range.getClientRects`.
3. **Nichts läuft über, mit dem längsten Inhalt und vorhandenem Zustand** (Playwright). Gegeben Repo N mit Datei von 255 Zeichen ohne Trenner (Grenze des Dateisystems, Hypothese: längster Fall), Umbenennung „neu ← alt“ mit langen Namen, Ordnername von 60 Zeichen im Baum, eine abgehakte Datei, eine gewählte Zeile, Status `A`, `M`, `D`, `R`, Zahlen mit fünf Stellen und eine Binärdatei, dann gilt für die Liste und jede Zeile `scrollWidth ≤ clientWidth`, kein waagerechter Bildlauf, und die rechte Kante jedes Kindes (Haken, Status, Balken, Zahlen) ≤ rechte Innenkante der Liste. Zeilen mit dem Sperrgrund des Hakens (`haken-grund`), soweit der Treiber sie herstellen kann, zählen mit.
4. **Haken und Zahlen bleiben bedienbar** (Playwright). Gegeben dieselben Fälle, wenn man bei einer umbrochenen Zeile das Haken-Kästchen anklickt, dann ist es ≥ 24 × 24 px groß und sichtbar im Rollbereich, der Kopf zeigt statt „0 von 8 abgehakt“ nun „1 von 8 abgehakt“, und ein Klick auf Pfad, Balken oder Zahlen wählt die Datei (`aria-current`); mit der Tastatur erreicht Tab das Kästchen, Leertaste setzt den Haken.
5. **Bei 1280 px bleibt die Zeile einzeilig, solange der Name in den Pfad passt** (Playwright). Gegeben Repo N bei 1280 × 800 mit Startbreite 360 px (kein Bildlaufbalken in der Liste, weil wenige Dateien), wenn man „Zusammen“ flach und im Baum betrachtet, dann bleibt eine Dateizeile der Tiefe 0 und 1, deren Name in den Pfad passt (`bild.bin`), ≤ 29 px hoch (eine Zeile, `--kd-row` 28 px), und Pfad, Status, Balken und Zahlen liegen auf gleicher Höhe; ein Name, der mehr als die Pfadbreite braucht (Tiefe 0 101 px, Tiefe 1 85 px), bricht im Pfad um und macht die Zeile höher. Messung (2026-11-27, `gemeinsam/scratchpad/entw-66/befund.md`): Zeile 310 px, feste Teile 209 px, Pfad Tiefe 0 101 px, Tiefe 1 85 px, beide ≥ Basis 5rem (80 px); mit 8rem (128 px) war die Zeile summiert 337 > 310 und `bild.bin` 52 px hoch. Reichweite (product-owner, PO Zeilen 280, 281): Kriterium 5 gilt für Tiefe 0 und 1 ohne Bildlaufleiste; tiefere Zeilen (Tiefe 2: 69 px) und Listen mit Bildlaufleiste dürfen umbrechen; die Kriterien 3 und 4 gelten für alle Tiefen. Weicht die Messung um mehr als 1 px ab, gilt die Messung.
6. **Alle Anzeigeverfahren** (Playwright, Pflichtpunkt 2). Kriterien 1–4 gelten im Standardmodus „Zusammen“ zuerst (netto), dann „Einzeln“ (Dateien je Commit), flach, mit Gruppen (R00040) und im Baum, mit einer aktiven Dateisuche (R00049, nur Treffer in der Liste) und einem Ausblendmuster (`--ignore`, R00025). Nicht betroffen: Umbruch und Lücken im Diff (andere Fläche), große Diffs (ändern den Diff, nicht die Liste).
7. **Der Text bleibt, wie er ist** (Unit und Playwright, R00011). Gegeben ein Pfad mit `⟨U+202E⟩` und `⟨0xFF⟩` und `a_b.c-d/e`, wenn die Umbruchstellen gesetzt sind, dann ist `textContent` des Pfad-Elements Zeichen für Zeichen der Anzeigename von vorher; die Funktion setzt keine Umbruchstelle in eine Marke `⟨…⟩` (eine Marke wird nie geteilt); im Browser liefert Markieren und Kopieren der Zeile denselben Text.

Nicht betroffen: Grenzen je Eingabe und Ausgabe (Pflichtpunkt 1; keine Grenze ändert sich, Kriterium 3 nutzt die Dateinamengrenze nur als längsten Fall, stdout bleibt unberührt); Festes Layout (Pflichtpunkt 3: die Liste ist selbst der Rollbereich, die Zeile wächst in der Höhe mit dem Namen; Kürzung ist nicht gewollt, PO Zeile 279); NFA zum Ausführungsort (Pflichtpunkt 4; reines Browser-Layout). Eine Unterscheidung, ein Ort (Pflichtpunkt 5): Mindestbreite und Umbruch stehen in je einer Regel für Datei- und Ordnerzeile, die Umbruchstellen in einer Funktion.

## Rollback-Strategie

Je Bubble ein Commit; zurück mit `git revert <sha>`. B5602 ändert nur CSS, B5603 nur die Funktion für die Umbruchstellen.

## Warum löst diese Anforderung das Problem?

Auslöser: Karte #66 (Entwicklertest #63), 812 px, `db/001_anlegen.sql` in 30 px Pfadbreite → ein Zeichen je Zeile. Mit Mindestbreite 5rem bekommt der Pfad Platz, die Zeile gibt den Rest nach unten ab, der Umbruch an Trennern lässt Namen als Wörter lesen. Der Mensch erkennt `001_anlegen.sql` von `002_aendern.sql` wieder, ohne die Seitenleiste zu verbreitern.

## Offene Fragen

Keine offenen. Der product-owner hat die Frage am 2026-11-27 entschieden (`AI-Team/po-entscheidungen.md` Zeile 280); die Antwort ist oben eingearbeitet:

1. **An den product-owner — Reichweite der Probe 5** („bei 1280 px einzeilig, auch im Baum“)? **Tiefe 0 und 1 ohne Bildlaufleiste.** Kriterium 5 gilt für Dateizeilen der Tiefe 0 und 1 in einer Liste ohne Bildlaufleiste (Repo N, 1280 × 800, Startbreite 360 px); tiefere Zeilen und Listen mit Bildlaufleiste dürfen umbrechen (Kriterien 3 und 4 gelten unverändert für alle Tiefen); weicht die Messung nach dem Bau um mehr als 1 px von der Rechnung ab, gilt die Messung. Die Alternative (`.zahlen` ohne feste 72 px Mindestbreite) ist verworfen.

## Notizen

- Quelle: Karte #66, PO Zeilen 279–281; R00034 Zeile 23 („Lange Pfade werden in der Liste umbrochen“) war nie geprüft; R00040 (Gruppen) und R00055 (Feldbreite, Suchfeld 96 px gehört dorthin) bleiben unberührt.
- Der Umbruch der Zeile richtet sich nach der Basisbreite 5rem, nicht nach der Länge des Namens: passen die festen Teile neben 5rem, bleibt die Zeile eine Flex-Zeile (der Name bricht bei Bedarf im Pfad um), sonst rücken Haken, Status, Balken und Zahlen unter den Pfad; kein Springen je Name.
- `.gr-dateien>li` trifft auch Gruppenkopf und Ordnerzeile; sie sind kurz und bleiben einzeilig, ein langer Ordnername bricht über Kriterium 3.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-27 | Angelegt | Karte #66, PO-Entscheidung Zeile 279 |
| 2026-11-27 | Kriterium 5 endgültig (Reichweite Tiefe 0/1 ohne Bildlaufleiste, Verweis PO Zeile 280), offene Frage geschlossen | Karte #66, PO-Entscheidung Zeile 280 |
| 2026-11-27 | Pfad-Basis 8rem → 5rem, Zusammenfassung, Ziel, Ausgangssituation und Kriterien 1 und 5 auf die Messwerte gezogen (Zeile 310 px, feste Teile 209 px, Pfad Tiefe 0 101 px, Tiefe 1 85 px), falsche Rechnung ersetzt | Karte #66, PO-Entscheidung Zeile 281 (Rückfrage des Entwicklers) |
