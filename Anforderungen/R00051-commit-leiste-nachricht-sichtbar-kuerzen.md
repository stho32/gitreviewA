---
id: R00051
status: Neu
datum: 2026-11-26
---

# R00051: Commit-Leiste kürzt lange Nachrichten sichtbar

## Beschreibung

Die Commit-Leiste zeigt die ausgeklappte Message eines Commits höchstens mit 20 000 Zeichen; was darüber liegt, endet sichtbar mit „… (n Zeichen nicht gezeigt)“ und wird nie still weggelassen. Es gilt **dieselbe Kürzungsregel** wie im Streifen „Absicht der KI“ (R00038, PO Zeile 250): gleiche Grenze, gleiche Zählung, gleicher Hinweis, ein Baustein. Dieselbe Regel gilt für Betreff und Autor in allen Anzeigen, die ihre Werte aus der Leiste nehmen (Leiste, Commit-Wähler in „Einzeln“ samt Menü, Abschnittskopf „ohne Kette“).

Zahlt ein auf: [Vision](R00000-vision.md) — Leitplanke Lastprofil („keine Aufgabe friert die Oberfläche ein“) und „fremder Text nur als Text“; Folge aus R00048 (eine Message bis 8 MiB kommt durch).

Kein Glossar (`Dokumentation/Domaenenwissen/` fehlt). „Zeichen“ heißt hier wie in R00038: Unicode-Codepunkt des Textes, wie ihn der Server liefert (ein Emoji außerhalb der BMP ist ein Zeichen, obwohl es zwei UTF-16-Einheiten belegt; `ä` ist ein Zeichen, obwohl es zwei Bytes UTF-8 belegt), gezählt **vor** dem Entfernen oder Markieren der Richtungszeichen.

## Geschäftlicher Nutzen

Seit R00048 startet ein Lauf auch mit einer Commit-Message von mehreren Megabyte (bis zur Gesamtgrenze von 8 MiB). Die Leiste legt diese Message heute ganz ins DOM, schon zugeklappt (`hidden`), und beim Ausklappen muss der Browser Megabyte an Text umbrechen und setzen — die Seitenleiste friert, und der Mensch kann die Prüfung nicht weiterführen. Der Streifen „Absicht der KI“ schützt sich bereits mit 20 000 Zeichen; die Leiste zeigt dieselbe Nachricht heute ungebremst. Mit einer Regel für beide sieht der Mensch an beiden Orten denselben Text und dieselbe Zahl, und ein feindliches Repo kann die Oberfläche über die Leiste nicht mehr lahmlegen.

## Funktionale Anforderungen

- Die ausgeklappte Message der Commit-Leiste zeigt höchstens 20 000 Zeichen; ist sie länger, folgen unmittelbar auf das 20 000. Zeichen der Hinweis `… (n Zeichen nicht gezeigt)` mit `n` = Zeichenzahl der Message − 20 000, als Dezimalzahl ohne Tausendertrenner (wie R00038).
- Eine Message bis einschließlich 20 000 Zeichen steht ganz und ohne Hinweis da.
- Die Schnittkante liegt zwischen zwei Codepunkten: nie zwischen den beiden Hälften eines Surrogatpaars, nie mitten in einem Mehrbyte-Zeichen.
- Dieselbe Regel gilt für Betreff und Autor eines Commits überall, wo die Leiste sie liefert: Zeile der Leiste, Stand und Menü des Commit-Wählers in „Einzeln“, Abschnittskopf „ohne Kette“ (`betreffVon`).
- Gekürzt wird der Text, wie ihn der Server liefert; erst danach entfernt die Leiste die Richtungszeichen (heute `ohneSteuerzeichen`). So nennen Leiste und Streifen „Absicht der KI“ für dieselbe Message dieselbe Zahl `n`.
- Grenze, Zählung und Hinweistext stehen an **einer** Stelle der Oberfläche (heute `nachrichtText` und `NACHRICHT_GRENZE` in `web/absicht-werte.js`); Leiste und Streifen rufen sie, keine zweite Kürzung.
- Der Server bleibt unverändert: `GET /api/commits` liefert die Message weiter ganz, begrenzt nur durch die Gesamtgrenze je Lesung aus R00048 (8 MiB; PO Zeile 257: keine eigene Grenze je Message am Server).

## Nicht-funktionale Anforderungen

- Sicherheit: Message, Betreff und Autor sind fremder Text — nur über `textContent`, nie als HTML; eine an der Kante abgeschnittene Auszeichnung (`<b`, `<img src=x onerror=…`) bleibt sichtbarer Text, es entsteht kein Element. Die Grenze greift **vor dem DOM**: auch zugeklappt liegt je Feld höchstens der gekürzte Text im DOM, nie die ganze Message. Der Transport ist durch R00048 begrenzt (8 MiB je Lesung, darüber startet der Lauf nicht).
- Performance (grobe Schranke nach R00047, keine enge Marge): Mit einer Message von 8 000 000 Zeichen steht die Leiste ≤ 5 s nach dem Laden, und keine Aufgabe des Browsers blockiert beim Laden oder Ausklappen länger als 2 s. Ausführungsort ist der Browser; keine stderr-Zeile (Pflichtpunkt 4).
- Benutzerfreundlichkeit: Die ausgeklappte Message bleibt im Rollbereich der Commit-Liste (höchstens 300 px, eigener Bildlauf, Entwurf Fassung 2); die Dateiliste darunter behält ihren Platz. Keine neue Gestaltung; Hinweis im Stil des Textes (kanbanD).

## Akzeptanzkriterien

Vorbereitung: Repo K aus `user-stories/R00051.md` (Wegwerf-Ordner, Messages über `git commit -F` aus Dateien, die python3 schreibt). „Die Leiste zeigt“ heißt: Text des ausgeklappten Rumpfs (`textContent`). Testebene je Kriterium in Klammern.

### Grenze und Zählung (Abnahme-Probe der Karte)

- [ ] 1. Gegeben Commit `k25` mit einer Message aus 25 000 Zeichen `x` (Betreff `Lang`, Rumpf 25 000 × `x`), wenn der Mensch in der Leiste die Message von `k25` ausklappt, dann zeigt sie genau 20 000 × `x` und danach `… (5000 Zeichen nicht gezeigt)` (Rechnung: 25 000 − 20 000 = 5 000). (Unit `nachrichtText`; Playwright einmal für die Leiste)
- [ ] 2. Gegeben die Rümpfe mit 19 999, 20 000 und 20 001 Zeichen `x` (`k19999`, `k20000`, `k20001`), wenn sie ausgeklappt sind, dann zeigen die ersten beiden ihren Rumpf ganz und ohne Hinweis, der dritte 20 000 × `x` und `… (1 Zeichen nicht gezeigt)`. (Unit)
- [ ] 3. Gegeben ein Rumpf aus 19 999 × `a`, dann `😀` (U+1F600) und `b` (20 001 Zeichen, 20 002 UTF-16-Einheiten), wenn er ausgeklappt ist, dann zeigt die Leiste 19 999 × `a`, das ganze `😀` und `… (1 Zeichen nicht gezeigt)` — kein einzelnes Surrogat, kein `�`. Ein Rumpf aus 19 999 × `a` und `😀` (20 000 Zeichen, 20 001 Einheiten) steht ganz und ohne Hinweis (Mutant „zählt UTF-16-Einheiten“ wird rot). (Unit)
- [ ] 4. Gegeben ein Rumpf aus 20 001 × `ä` (40 002 Bytes UTF-8), wenn er ausgeklappt ist, dann zeigt die Leiste 20 000 × `ä` und `… (1 Zeichen nicht gezeigt)` (Mutant „zählt Bytes“ würde bei 10 000 schneiden). (Unit)

### Eine Regel für beide Anzeigen (Pflichtpunkt 5)

- [ ] 5. Gegeben Commit `kr` mit einem Rumpf aus 19 999 × `a`, dann U+202E und 10 × `b` (20 010 Zeichen), wenn der Mensch die Datei `k.txt` wählt und die Message sowohl in der Leiste als auch im Streifen „Absicht der KI“ ausklappt, dann nennen beide `… (10 Zeichen nicht gezeigt)`; die Leiste zeigt davor 19 999 × `a` ohne das Richtungszeichen, der Streifen 19 999 × `a` und `⟨U+202E⟩`. (Unit über beide Anzeigewerte; Playwright einmal)
- [ ] 6. Gegeben der Quelltext der Oberfläche (`web/`), wenn man nach der Grenze 20 000 und dem Hinweistext „Zeichen nicht gezeigt“ sucht, dann stehen beide genau einmal (im Kürzungsbaustein); Leiste (`commit-werte.js`) und Streifen (`absicht-werte.js`) rufen denselben Baustein. (Unit: derselbe Funktionswert aus beiden Modulen; Suche als Sonde im Review)
- [ ] 7. Gegeben ein Commit mit Betreff aus 25 000 × `B` und Autor aus 25 000 × `A`, wenn die Leiste geladen ist und der Mensch nach „Einzeln“ wechselt, dann tragen Zeile der Leiste, Stand des Commit-Wählers und sein Menüeintrag je 20 000 Zeichen und `… (5000 Zeichen nicht gezeigt)`; der Abschnittskopf „ohne Kette“ trägt den gekürzten Betreff. Vorläufig, bis der product-owner Frage 1 entschieden hat. (Unit `zeilenwerte`, `betreffVon`)

### Sicherheit

- [ ] 8. Gegeben ein Rumpf aus 19 997 × `x`, dann `<b>fett</b><img src=x onerror=alert(1)>`, wenn er ausgeklappt ist, dann zeigt die Leiste 19 997 × `x`, den Text `<b>` und `… (36 Zeichen nicht gezeigt)` (Rechnung: 19 997 + 3 = 20 000; Rest `fett</b><img src=x onerror=alert(1)>` = 36 Zeichen); im Rumpf entsteht kein Element `b` oder `img`, kein Dialog. (Playwright, DOM)
- [ ] 9. Gegeben Commit `kgross` mit einem Rumpf aus 8 000 000 × `x` (unter der Gesamtgrenze von 8 MiB, der Lauf startet nach R00048), wenn die Leiste geladen ist, dann enthält der Rumpf von `kgross` im DOM höchstens 20 000 Zeichen und den Hinweis — **schon zugeklappt** —, und `GET /api/commits` liefert die Message weiter ganz (8 000 000 Zeichen; Gegenprobe, Server unverändert). (Playwright, DOM-Länge; Integration am Endpunkt)
- [ ] 10. Gegeben derselbe Lauf, wenn der Mensch die Message von `kgross` aus- und wieder einklappt, dann steht die Leiste ≤ 5 s nach dem Laden, keine Aufgabe blockiert länger als 2 s (R00047), und die ausgeklappte Message liegt im Rollbereich der Commit-Liste (höchstens 300 px hoch), die Dateiliste bleibt sichtbar und bedienbar. (Playwright, Schranken aus `e2e/dsl/`, keine künstliche Last)

### Anzeigeverfahren (Pflichtpunkt 2)

- [ ] 11. Gegeben `k25`, wenn der Mensch in „Zusammen“ (Standard) die Commit-Zeile aufklappt und die Message ausklappt, und danach in „Einzeln“ (Commit-Zeile offen) dasselbe tut, dann zeigt die Leiste in beiden Modi denselben gekürzten Text wie Kriterium 1. (Playwright, ein Durchlauf)

Grenz- und Leerfälle bedacht: Rumpf leer (kein Ausklappen, R00003 unverändert); genau 20 000 (Kriterium 2); Surrogatpaar und Mehrbyte an der Kante (3, 4); Richtungszeichen an der Kante (5); Auszeichnung an der Kante (8); größte startbare Message (9, 10); Message über 8 MiB (Start abgewiesen, R00048 Kriterium 4 — nicht hier). **Verworfen**: Kürzen nach Graphem-Clustern (`e` + U+0301 kann an der Kante getrennt werden; R00038 zählt Codepunkte, eine Regel für beide); Tausendertrenner in `n` (R00038 schreibt keinen).

**Pflichtpunkte der Detailplanung**: 1 Grenzen je Einheit — Message, Betreff, Autor je 20 000 Zeichen (1–4, 7, 9); stdout nicht betroffen (keine Commit-Angabe geht auf stdout, PO Zeile 257). 2 Anzeigeverfahren — „Zusammen“ zuerst, „Einzeln“, Commit-Wähler, Abschnittskopf ohne Kette (7, 11); Diff-Ansichten (Umbruch, Anordnung, Suche) zeigen keine Commit-Message: nicht betroffen. 3 Festes Layout — die Message liegt im Rollbereich der Commit-Liste (10). 4 Ausführungsort — Browser, Schranken aus R00047, keine stderr-Zeile (10). 5 Eine Unterscheidung, ein Ort — ein Kürzungsbaustein für Leiste und Streifen, alle Wege der Leiste über `zeilenwerte`/`betreffVon` (5, 6, 7).

## Betroffene Verzeichnisstruktur

- Oberfläche: `src/GitReviewA/web/` — Kürzungsbaustein (heute `absicht-werte.js`), Anzeigewerte der Leiste `commit-werte.js`; `commits.js` nur, falls der Rumpf dort nicht schon aus `zeilenwerte` kommt (er kommt daher).
- Server: keine Änderung.
- Tests: `e2e/tests/bausteine/` (Unit der Regel und der Anzeigewerte), `e2e/tests/` (eine Spec der Leiste), Treiber für Repo K unter `e2e/treiber/`.

## Technische Überlegungen

### Ablauf
1. **Kürzungsbaustein teilen** — `nachrichtText(text, grenze)` ist die eine Regel; `commit-werte.js` ruft sie (über `require` bzw. das Fensterobjekt, wie `absicht-werte.js` heute `dateiliste-werte.js` einbindet) oder beide rufen ein gemeinsames Modul, wenn das die Ladereihenfolge in `index.html` verlangt. Entscheidung beim Entwickler; kein Kopieren der Funktion.
   - 1.1 Zählen ohne Kopie des ganzen Textes, wenn die Messung es zeigt: `Array.from` einer Message mit 8 000 000 Zeichen legt ein Feld mit 8 Mio. Einträgen an (Hypothese: spürbarer Speicher und einige hundert Millisekunden; messen, nicht annehmen). Verhalten und Hinweis bleiben gleich; die bestehende Unit von R00038 bleibt grün.
2. **Anzeigewerte der Leiste kürzen** — `zeilenwerte(commit)`: `rumpf`, `betreff`, `autor` = `ohneSteuerzeichen(nachrichtText(feld))`; `hatRumpf` aus dem ungekürzten Rumpf (ein Rumpf aus Richtungszeichen allein bleibt wie heute); `betreffVon` ebenso.
3. **Leiste** — zeichnet weiter aus `zeilenwerte` (Rumpf, Wähler-Stand, Menü); keine eigene Kürzung in `commits.js`.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `zeilenwerte` und `betreffVon` in `commit-werte.js` (alle Wege der Leiste); `nachrichtText` in `absicht-werte.js`.

- `nachrichtText(text, grenze = NACHRICHT_GRENZE)` (Operation, rein; bestehend) — die eine Kürzungsregel; erhält höchstens eine schonendere Zählung.
- `zeilenwerte(commit)` (Operation, rein; bestehend) — liefert gekürzte Felder.
- `betreffVon(commits, hash)` (Operation, rein; bestehend) — liefert den gekürzten Betreff.

### Änderungen an bestehenden Klassen
- `web/commit-werte.js`: `zeilenwerte`, `betreffVon` rufen die Kürzung vor `ohneSteuerzeichen`.
- `web/absicht-werte.js`: `nachrichtText` bleibt der Ort der Regel (oder zieht in ein gemeinsames Modul um, dann ohne Verhaltensänderung).
- `web/index.html`: Ladereihenfolge, falls `commit-werte.js` den Baustein braucht.

## Tests

Nach Skill `test-pyramide`; Standard wäre ein Integrationstest gegen den Interactor, hier liegt alles im Browser: Unit für die Regel (Node), Playwright nur für DOM, Rollbereich und Schranke.

**Kandidaten für Unit Tests:** `nachrichtText` (Kriterien 1–4, Mutanten „UTF-16-Einheiten“, „Bytes“, „Grenze ± 1“, „Hinweis fehlt“), `zeilenwerte`/`betreffVon` (5, 7), Gleichheit der Funktion aus beiden Modulen (6).
**Integration:** `GET /api/commits` liefert den 8 000 000-Zeichen-Rumpf ganz (9, Gegenprobe).
**E2E:** eine Spec `commit-leiste-kuerzen.spec.js` mit Szenarien 1, 3, 4 und 5 der User Story (Kriterien 1, 5, 8, 9, 10, 11); Schranken aus den Konstanten von R00047, ereignisgenau, keine künstliche Last.

## Abhängigkeiten
- Abhängig von: R00003 (Leiste), R00038 (Kürzungsbaustein, I0039), R00048 (Gesamtgrenze, I0049), R00047 (Schranken).
- Blockiert: —

## Offene Fragen
1. **Betreff und Autor in der Leiste mitkürzen?** Die Karte nennt die Message. Empfehlung: ja, mit derselben Regel (Kriterium 7) — der Betreff kann nach R00048 ebenso Megabyte lang sein und landet heute dreimal im DOM (Zeile, Wähler-Stand, jeder Menüeintrag); der Streifen „Absicht der KI“ kürzt den Betreff bereits mit derselben Regel. Alternative: nur die Message, Betreff und Autor als eigene Karte. Gilt vorläufig nach Empfehlung.

## Manuelle Vorbereitungstätigkeiten
- keine

## Manuelle Nachbereitungstätigkeiten
- keine

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: Nach R00048 startet ein Lauf mit einer Message bis knapp 8 MiB, und `commits.js` legt sie ganz ins DOM (zugeklappt `hidden`). → Die Leiste kürzt jedes fremde Feld vor dem DOM auf 20 000 Zeichen mit sichtbarem Rest → der Browser setzt höchstens 20 000 Zeichen je Feld statt Megabyte und friert beim Ausklappen nicht ein (Kriterien 9, 10) → der Mensch sieht in Leiste und Streifen denselben Text mit derselben Zahl (5), weiß, dass etwas fehlt (nie still), und prüft weiter. Weil es derselbe Baustein ist (6), kann die Regel nicht an einem Ort anders wirken als am anderen.

## Notizen

- **Optionen** (Ort der Grenze): (a) Browser, ein Baustein für beide Anzeigen, vor dem DOM — **gewählt**: folgt PO Zeile 257 (keine Server-Grenze je Message) und Zeile 258 (eigene Karte, Commit-Leiste), nutzt die vorhandene Kürzung, Transport ist durch R00048 begrenzt; (b) Server kürzt in `GET /api/commits` und liefert die Zahl `n` mit — ein Ort für alle Anzeigen und weniger Transport, aber gegen PO Zeile 257, der Streifen müsste umgebaut werden, und die Gesamtgrenze (8 MiB) bleibt trotzdem nötig; (c) beides — zwei Regeln an zwei Orten, verworfen (Pflichtpunkt 5).
- Nicht Teil dieser Anforderung: die zweite Zeichenliste `ohneSteuerzeichen` in `commit-werte.js` (entfernt Richtungszeichen statt sie wie `sichtbarerName` zu markieren; Angriffsmatrix R00048, „Nicht abgedeckt“, eigene Karte).
