---
id: R00036
status: Neu
datum: 2026-11-25
---

# R00036: Art der Anmerkung

## Beschreibung

Der prüfende Mensch gibt jeder Anmerkung — an einer Zeile, einem Bereich oder einer Datei — eine **Art**: **Muss**, **Frage** oder **Idee**. Er wählt sie am Notizfeld, mit den Tasten 1–3 oder später beim Ändern. Die Art steht im Anmerkungskopf als Wort und im Ergebnis auf stdout als vorangestelltes `[Muss]`, `[Frage]` oder `[Idee]` am Anfang der Textzeile; alles andere am Ergebnis bleibt, wie R00002, R00011 und R00031 es festlegen. Ohne Art bleibt das Ergebnis Byte für Byte wie heute.

Zahlt ein auf: [Vision](R00000-vision.md) — „Art der Anmerkung“ (ergänzt 2026-11-25) und „Ergebnis als Rückkanal“ (direkt als Arbeitsauftrag lesbar).

Baut auf auf: [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat), [R00010](R00010-zeile-annotieren.md) (Zeilenanmerkung, Notizfeld), [R00022](R00022-datei-annotieren.md) (Dateianmerkung), [R00018](R00018-anmerkung-aendern.md) (Ändern über die Nummer), [R00031](R00031-zeilenbereich-annotieren.md) (Bereich), [R00030](R00030-tastaturbedienung.md) (Tastenkatalog).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt). „Art“ ist ein neuer Begriff: die Einordnung einer Anmerkung als Muss (muss geändert werden), Frage (die KI soll antworten oder begründen) oder Idee (Anregung, kein Auftrag).

## Geschäftlicher Nutzen

Heute liest die KI jede Anmerkung gleich: „Null-Prüfung fehlt“ und „vielleicht lieber eine Tabelle?“ stehen gleichrangig im Arbeitsauftrag. Die KI ändert dann entweder zu viel (Anregungen als Pflicht) oder zu wenig (Pflichten als Anregung). Mit der Art sagt der Mensch in einem Tastendruck, was er erwartet, und die KI kann Muss-Punkte abarbeiten, Fragen beantworten und Ideen abwägen. Der Vertrag bleibt lesbar für jeden, der die Art nicht kennt.

## Funktionale Anforderungen

- **Werte**: `muss`, `frage`, `idee` oder keine Art. Jeder andere Wert wird abgelehnt (400 „Art unbekannt“), die Anmerkung wird nicht angelegt bzw. nicht geändert. **Die eine Stelle**, die gültige Werte, das Wort und das Präfix bestimmt, ist die Operation `Anmerkungsart` auf dem Server; Anzeige, Ändern, Ergebnis, Kopieren (R00020) und die Ergebnis-Spalte (R00037) lesen von dort bzw. aus `GET /api/anmerkungen` und `GET /api/ergebnis`.
- **Anlegen und Ändern**: `POST /api/anmerkungen` und `POST /api/anmerkungen/{nummer}` tragen das Feld `art`. Beim Ändern kann die Art gesetzt, gewechselt oder entfernt werden; Nummer, Stelle und Position im Ergebnis bleiben. Sperre (R00014) und „Lauf beendet“ (409) gelten wie bisher.
- **Notizfeld**: vor dem Textfeld steht eine Gruppe „Art“ mit **ohne**, **Muss**, **Frage**, **Idee**; beim Anlegen ist „ohne“ gewählt, beim Ändern die gespeicherte Art. Gilt für Zeile, Bereich, Datei und Ändern.
- **Tasten 1–3** (Katalog aus R00030): außerhalb von Feldern bei gewählter Diff-Zeile öffnet `1`/`2`/`3` das Notizfeld wie `Enter`, mit Muss/Frage/Idee vorgewählt und dem Fokus im Textfeld; in der Art-Gruppe wählen `1`–`3` die Art; im Textfeld sind Ziffern Text.
- **Anzeige**: der Anmerkungskopf zeigt das Wort „Muss“, „Frage“ oder „Idee“ vor dem Text — als Wort, nicht nur als Farbe. Ohne Art steht dort nichts Zusätzliches.
- **Ergebnis**: die erste Textzeile des Zitats beginnt mit dem Präfix — `> [Muss] Null-Prüfung fehlt`; ist die erste Textzeile leer, steht `> [Muss]` ohne folgendes Leerzeichen. Weitere Textzeilen, Überschrift `## n. <Stelle>`, `Commit:`, das Zitat der Bereichszeilen (R00031), die Zeile `Anmerkungen: n` und der Abschnitt `## Dateien` bleiben unverändert. Ohne Art kein Präfix.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): die Art ist einer von drei festen Werten oder fehlt; ein Wert mit anderer Schreibung (`MUSS`, `muss `), ein leerer String, eine Zahl oder ein Text von 10 000 Zeichen wird abgelehnt. Das Präfix ist höchstens 8 Zeichen lang (`[Frage] `); das Ergebnis wächst damit höchstens um 8 Zeichen je Anmerkung. Die Textgrenze (10 000 Zeichen, R00002) und die Zitatgrenzen (20 Zeilen × 200 Zeichen, R00031) bleiben.
- **Performance**: „Beenden“ mit 500 Anmerkungen zu je 200 Zeichen, alle mit Art, bleibt ≤ 1 s (Lastprofil, R00002).
- **Sicherheit**: kein neuer Endpunkt; der Anfrageschutz von R00002 (Origin, nur POST, nur JSON) gilt für das neue Feld. Das Präfix entsteht nur aus dem geprüften Wert, nie aus Eingabetext.
- **Logging** (Pflichtpunkt 4: Server-Prozess): die Debug-Zeile beim Anlegen und Ändern nennt zusätzlich die Art als Wert (`art=muss`), nie den Text; die Oberfläche schreibt nichts auf stderr.
- **Benutzerfreundlichkeit**: die Gruppe „Art“ hat einen Namen für Screenreader und ist mit Tab und Pfeiltasten bedienbar; die Art ist nie nur Farbe (PO Zeile 121).

## Akzeptanzkriterien

Vorbereitung: **Repo Z** aus `user-stories/R00012.md` (Commits `z1`, `z2`, `z3`, lückenlose Kette) und **Repo R** aus `user-stories/R00031.md` (`r2`, `lang.txt`). Aufruf `gitreviewA <Hashes> --kein-browser`, Start in „Zusammen“. *Ebene* nennt, wo geprüft wird; „Integration“ heißt gegen den Interactor bzw. das Programm als Prozess.

### Ergebnis (Vertrag mit der KI)
- [ ] 1. Gegeben Repo Z in „Zusammen“ und drei Anmerkungen — `src/a.txt:2` „ZWEI groß?“ mit Art Frage, `src/b.txt` (ganze Datei) „Datei fehlt im Index“ mit Art Muss, `README.md:1` „Titel kürzen“ ohne Art —, wenn beendet wird, dann stehen unter `## 1. src/a.txt:2`, `## 2. src/b.txt (ganze Datei)` und `## 3. README.md:1` die Zeilen `> [Frage] ZWEI groß?`, `> [Muss] Datei fehlt im Index` und `> Titel kürzen`; Überschriften, `Commit:`-Zeilen und `Anmerkungen: 3` sind Byte für Byte wie ohne Art; Exit-Code 0. *Ebene: Unit (`ErgebnisFormatierer`) und Integration (Programm, stdout).*
- [ ] 2. Gegeben eine Anmerkung mit Art Idee und dem Text „\nzweite Zeile“ (erste Zeile leer), wenn beendet wird, dann stehen `> [Idee]` (ohne Leerzeichen am Ende) und `> zweite Zeile`; gegeben ein Bereich 3–7 in `lang.txt` (Repo R) mit Art Muss, dann steht das Präfix nur in der Textzeile, das Zitat der Bereichszeilen (`    3: z03` …) bleibt unverändert. *Ebene: Unit.*
- [ ] 3. Gegeben Repo Z mit zwei Anmerkungen ohne Art und einem Haken, wenn beendet wird, dann entspricht stdout Byte für Byte dem Ergebnis vor dieser Anforderung (R00002/R00011). *Ebene: Integration (Programm, stdout).*

### Werte und Ablehnung
- [ ] 4. Gegeben ein laufender Review, wenn eine Anmerkung mit `art` `"MUSS"`, `"muss "`, `""`, `7` oder einem Text von 10 000 Zeichen angelegt oder geändert werden soll, dann antwortet der Server 400 „Art unbekannt“, und nichts ist angelegt bzw. die Anmerkung ist unverändert; mit `"muss"`, `"frage"`, `"idee"` und ohne `art` wird angelegt. *Ebene: Unit (`Anmerkungsart`) und Integration (Interactor).*
- [ ] 5. Gegeben die Anmerkung Nummer 1 mit Art Muss, wenn man sie über ihre Nummer auf Frage und danach auf „ohne“ ändert, dann steht im Ergebnis zuerst `> [Frage] …`, danach `> …`; Nummer, Stelle und Position `## 1.` bleiben; nach „Beenden“ antwortet das Ändern 409. *Ebene: Integration (Interactor).*

### Bedienung
- [ ] 6. Gegeben Repo Z, `src/a.txt` gewählt und die Zeile 2 gewählt, wenn man die Taste `2` drückt, „Warum groß?“ tippt und speichert, dann öffnet sich das Notizfeld mit der Art Frage vorgewählt und dem Fokus im Textfeld, die Ziffern im Textfeld sind Text, und der Kopf der gespeicherten Anmerkung zeigt das Wort „Frage“. *Ebene: Playwright (Hot Path: Zeile annotieren; Tastatur).*
- [ ] 7. Gegeben ein offenes Notizfeld an einer Zeile, an einem Bereich und an der Datei, in „Zusammen“ und in „Einzeln“, wenn man in der Gruppe „Art“ mit Tab und Pfeiltasten oder `1`–`3` wählt und speichert, dann trägt die Anmerkung die gewählte Art; der Kopf zeigt sie als Wort in beiden Modi, in „nur Änderungen“ und „ganze Datei“, „untereinander“ und „nebeneinander“. *Ebene: Integration (Oberfläche gegen Fake), ein Fall Playwright (Gruppe per Tastatur).*
- [ ] 8. Gegeben die Hilfe (`?`), wenn man sie öffnet, dann stehen `1`, `2`, `3` je genau einmal im Katalog mit „Zeile anmerken: Muss / Frage / Idee“; es gibt keinen zweiten Katalog. *Ebene: Unit (Katalog, R00030).*

Grenz- und Leerfälle bedacht: keine Anmerkung (Kriterium 3 über R00002); leere erste Textzeile (2); unbekannter Wert und Grenzwerte (4); gesperrte Stelle — das Anlegen bleibt 400 wie R00014, die Art ändert daran nichts (kein eigenes Kriterium, derselbe Weg). Verworfen als Kriterium: Zählung je Art in der Zeile `Anmerkungen: n` (Format bliebe nicht gleich; offene Frage 3).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterium 4 und NFA „Grenzen“; 2 Anzeigeverfahren — Kriterium 7 (Standard „Zusammen“ zuerst); 3 festes Layout — nicht betroffen (das Notizfeld liegt im Diff-Rollbereich, die Gruppe „Art“ ist eine Zeile); 4 Ausführungsort — Logging nur aus dem Server-Prozess; 5 eine Unterscheidung, ein Ort — `Anmerkungsart` (Funktionale Anforderungen, erster Punkt), Wege Anzeige, Ändern, Ergebnis, Kopieren, Ergebnis-Spalte.

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Anmerkungen/` — `Anmerkungsart` (neu), Erweiterung von Prüfer, Speicher und Interactors für Anlegen/Ändern.
- `src/GitReviewA/Beenden/ErgebnisFormatierer.cs` — Präfix.
- `src/GitReviewA/web/anmerkungen.js`, `anmerkungen-werte.js`, `tasten-werte.js` — Gruppe „Art“, Kopf, Tasten 1–3.
- `tests/GitReviewA.Tests/` (Unit, Integration), `e2e/` (Hot Path mit Art).

## Technische Überlegungen

**Vorplanung** — die Bubbles B3501–B3507 in der WBS unter I0037 sind Entwurf; welche es werden, entscheidet der Entwickler. **Artboard**: „gitreviewA – Review-Fluss A/B“, Variante A (Anmerkungsfeld mit Art, Tasten 1–3); Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`) zeichnet keine Art — die Lücke füllt Material 3 (segmented button bzw. radio group).

### Ablauf

1. **Wählen** — Gruppe „Art“ oder Taste 1–3 (B3504, B3505).
2. **Senden** — `art` im JSON von Anlegen bzw. Ändern; Server prüft über `Anmerkungsart` (B3501, B3502).
3. **Zeigen** — `GET /api/anmerkungen` nennt `art`; der Kopf zeigt das Wort (B3506).
4. **Ausgeben** — `ErgebnisFormatierer` setzt das Präfix (B3503); stdout, Kopieren und Ergebnis-Spalte nutzen dieselbe Erzeugung.

### Grobentwurf

- `Anmerkungsart` (Operation, rein) — die drei Werte, Wort und Präfix; `static Pruefergebnis Pruefe(string? wert)`, `string? Praefix(Art? art)`.
- `Anmerkung` (DTO) — zusätzlich `Art? Art`.
- `ErgebnisFormatierer` — Präfix an der ersten Textzeile.

### Änderungen an bestehenden Klassen

`AnmerkungsPruefer`, Anmerkungsspeicher, die Interactors für Anlegen und Ändern, `ErgebnisFormatierer`; im Web `anmerkungen.js`, `anmerkungen-werte.js`, `tasten-werte.js`.

## Tests

**Unit:** `Anmerkungsart` (Werte, Ablehnungen), `ErgebnisFormatierer` (Präfix, leere erste Zeile, Bereich, ohne Art Byte für Byte), Katalog (1–3 je einmal).
**Integration:** Anlegen/Ändern mit Art gegen den Interactor, Programm als Prozess (stdout).
**E2E (Playwright):** Hot Path mit Taste `2` und „Beenden“; Gruppe „Art“ per Tastatur.

## Abhängigkeiten

- Abhängig von: I0017 Zeile annotieren (R00010, grün), I0018 Datei annotieren (R00022, grün), I0023 Anmerkung ändern (R00018, grün), I0032 Zeilenbereich annotieren (R00031, grün).
- Blockiert: nichts; I0038 (R00037) und I0042 (R00041) zeigen die Art mit, ohne sie zu brauchen.

## Offene Fragen

Empfehlungen gelten bis zur Antwort des product-owner:

1. **Art ohne Wahl**: Empfehlung „ohne“ — das Ergebnis bleibt ohne Zutun Byte für Byte wie heute, und eine Anmerkung ohne Art ist ehrlich keine Einordnung. Alternative: „Muss“ als Vorgabe (dann trägt fast jede Anmerkung ein Präfix, auch ungewollt).
2. **Tasten 1–3**: Empfehlung wie beschrieben (außerhalb von Feldern öffnen sie das Feld mit vorgewählter Art; im Textfeld Text). Alternative: nur in der Gruppe — dann bliebe der schnelle Weg aus dem Artboard aus. `Strg`/`Alt`+Ziffer sind im Browser belegt (Reiterwechsel) und schließt der Katalog aus (PO Zeile 158).
3. **Zählung je Art**: Empfehlung nein — `Anmerkungen: n` bleibt; eine Zeile `Muss: 2 · Frage: 1` wäre eine weitere Formatänderung, die die KI aus den Präfixen selbst zählen kann.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Der Director nimmt die Art in das Hot-Path-Beispiel und die README auf, sobald gebaut (PO Zeile 189).

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen): 7 Bubbles unterhalb I0037 (B3501–B3507), 4 klar (2 h) und 3 unklar (2–4 h) — 14–20 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist Richtung A des Betreibers: das Anmerkungsfeld trägt eine Art Muss/Frage/Idee mit den Tasten 1–3. Heute ist jede Anmerkung im Ergebnis gleichrangig, die KI muss aus dem Tonfall raten, ob sie ändern, antworten oder nur abwägen soll. Wenn die Art als festes Präfix am Anfang der Textzeile steht, liest die KI sie ohne Rätseln, und ein Leser, der sie nicht kennt, sieht nur ein Wort in Klammern im Zitat — Überschriften und Stellen, an denen er sich orientiert, bleiben gleich. Der Hebel ist das Ergebnis, nicht die Oberfläche: nur dort kommt die Einordnung bei der KI an. Die eine Stelle `Anmerkungsart` verhindert, dass Anzeige, Ergebnis und Kopie verschiedene Wörter benutzen.

## Missing-Docs

- Wie die aufrufenden KI-Agenten der Factory das Präfix lesen, ist nicht dokumentiert; ein Satz im Hilfetext von `--help` oder in der README sollte das Präfix nennen.

## Notizen

### Optionen (Form im Ergebnis)

| Option | Verträglichkeit mit heutigen Lesern | Kürze | Risiko |
|---|---|---|---|
| **1. Präfix `[Muss]` in der ersten Textzeile (gewählt)** | hoch: Überschriften und Stellen unverändert | 8 Zeichen | ein Text, der selbst mit `[Muss]` beginnt, sieht ohne Art gleich aus — die Art steht immer vorn, ein zweites `[…]` gehört zum Text |
| 2. Art in der Überschrift `## 1. [Muss] src/a.txt:2` | niedrig: bricht Leser, die `<Datei>:<Zeile>` aus der Überschrift lesen | kurz | Formatbruch |
| 3. eigene Zeile `Art: Muss` unter `Commit:` | mittel: neue Zeile im Abschnitt | eine Zeile | Leser, die nach `Commit:` das Zitat erwarten, stolpern |

Gewählt: 1 — Vorgabe des Auftrags („vorangestelltes `[Muss]` in der Textzeile, keine Formatänderung der Überschriften“).

### Verworfene Alternativen

- Freie Schlagwörter statt drei Arten: verworfen — der Betreiber nennt genau drei, und freie Wörter wären Eingabetext auf stdout.
- Gesamturteil aus den Arten ableiten („kein Muss = freigegeben“): verworfen — ausdrücklich nicht Ziel (Vision).
