---
id: R00054
status: Neu
datum: 2026-11-27
---

# R00054: Commit-Texte zeigen unsichtbare Zeichen als Marke

## Beschreibung

Die Commit-Leiste zeigt unsichtbare und richtungsändernde Zeichen in Betreff, Autor und Message als sichtbare Marke `⟨U+202E⟩`, genau wie Dateinamen und der Streifen „Absicht der KI“ — statt sie still zu entfernen. Es gibt **eine** Zeichenliste für alle fremden Texte der Oberfläche: die von `sichtbarerName` (`web/dateiliste-werte.js`, dieselbe Klasse wie `Fremdtext/UnsichtbareZeichen` im Server). Die eigene Liste `ohneSteuerzeichen` in `web/commit-werte.js` entfällt.

Gekürzt wird weiter nach R00051 **vor** dem Markieren: Die Marke steht für **ein** Zeichen des Textes vom Server, die Schnittkante liegt zwischen zwei Zeichen des Rohtextes, eine Marke wird also nie halbiert.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (die Leiste zeigt, was die KI geschrieben hat, unverfälscht) und „fremder Text nur als Text“. Schließt die Lücke aus `Dokumentation/Sicherheit/angriffsmatrix-commit-leser.md`, Abschnitt „Nicht abgedeckt“ (Zeichenliste der Anzeige in `web/commit-werte.js`), und folgt PO-Entscheidung 2026-11-24 (#6, `AI-Team/po-entscheidungen.md` Zeile 31: Marke `⟨U+202E⟩` im Text wie in kanbanD) sowie Lehre #17 (`AI-Team/gelerntes.md`: jede Ausgabe fremder Namen mit derselben Klasse, keine zweite Liste).

Kein Glossar (`Dokumentation/Domaenenwissen/` fehlt). „Zeichen“ heißt wie in R00038 und R00051: Unicode-Codepunkt des Textes, wie ihn der Server liefert. „Marke“ heißt: `⟨U+` + Codepunkt in Großbuchstaben-Hex, mindestens vier Stellen + `⟩` (`⟨U+202E⟩`, `⟨U+000D⟩`, `⟨U+E0041⟩`).

## Geschäftlicher Nutzen

Heute entfernt die Leiste U+202E, U+2066 und ihre Verwandten aus Betreff, Autor und Message und lässt alle anderen unsichtbaren Zeichen (U+200B, U+E0041, U+0007, U+000D) ungesehen im Text stehen. Ein Mensch sieht so weder, dass ein Betreff ein Richtungszeichen trug, noch dass `Anna​Beispiel` zwei Wörter mit einem Nullbreitenzeichen sind. Der Streifen „Absicht der KI“ zeigt dieselbe Message dagegen mit Marken — zwei Anzeigen desselben Commits sagen Verschiedenes. Mit einer Zeichenliste für alles sieht der Mensch an jeder Stelle, dass ein Commit-Text Unsichtbares trägt, und Leiste und Streifen zeigen für dieselbe Message denselben Text.

## Funktionale Anforderungen

- Betreff, Autor und Message zeigen jedes Zeichen der einen Klasse als Marke: Steuerzeichen (`Cc`) außer Tab, Formatzeichen (`Cf`, darin U+202A–U+202E, U+2066–U+2069, U+200B–U+200F, U+061C, U+E0001 und U+E0020–U+E007F), Zeilentrenner U+2028 und Absatztrenner U+2029.
- Tab bleibt Tab (wie `sichtbarerName`). Nur in der Message bleibt LF ein Zeilenumbruch, jede Zeile wird für sich markiert (wie `markiert` im Streifen); in Betreff und Autor wird LF `⟨U+000A⟩`. Ein CR wird überall `⟨U+000D⟩` (PO Zeile 222).
- Die Marke ersetzt das Zeichen; das rohe Zeichen steht nicht mehr im angezeigten Text.
- Reihenfolge: erst kürzen nach R00051 (20 000 Zeichen des Rohtextes, Hinweis `… (n Zeichen nicht gezeigt)`), dann markieren. Eine Marke zählt in `n` und in der Grenze als **ein** Zeichen; der Hinweis selbst enthält keine Marke.
- Alle Wege der Leiste nehmen die markierten Werte: Zeile der Leiste (Betreff, Autor), ausgeklappte Message, Stand und Menü des Commit-Wählers in „Einzeln“, Abschnittskopf „ohne Kette“ (`betreffVon`) und die `title`-Texte, die aus diesen Elementen kopiert werden.
- Eine Message, die nur aus Zeichen der Klasse besteht (etwa ein einzelnes U+200B), hat einen Rumpf: Der Knopf „Message“ erscheint und zeigt die Marken. Eine leere Message bleibt ohne Knopf (R00003). Entschieden (product-owner 2026-11-27, `AI-Team/po-entscheidungen.md` Zeile 278): endgültig, `hatRumpf` ist der rohe Serverrumpf.
- Ersetzt den Teil von R00051, Kriterium 5, nach dem die Leiste das Richtungszeichen entfernt: Leiste und Streifen zeigen künftig **denselben** Text.
- Der Server bleibt unverändert: `GET /api/commits` liefert die Texte roh (Marken entstehen nur im Browser, beim Zeichnen).

## Nicht-funktionale Anforderungen

- Sicherheit: Commit-Texte nur über `textContent`, nie als HTML (unverändert). Eine Zeichenliste an einer Stelle der Oberfläche; im Quelltext von `web/` steht keine zweite Liste von Richtungs- oder Formatzeichen.
- Grenze je Feld: Höchstens 20 000 Zeichen des Rohtextes werden markiert; eine Marke ist höchstens 9 Zeichen lang (`⟨U+E007F⟩`), also trägt ein Feld im DOM höchstens 20 000 × 9 = 180 000 Zeichen und den Hinweis.
- Performance: keine neue Schranke; die groben Schranken aus R00051 (Leiste ≤ 5 s, keine Aufgabe > 2 s, R00047) gelten unverändert. Ausführungsort Browser, keine stderr-Zeile.
- Benutzerfreundlichkeit: keine neue Gestaltung; die Marke steht im Stil des umgebenden Textes wie im Streifen und in der Dateiliste (kanbanD).

## Akzeptanzkriterien

Vorbereitung: Repo U aus `user-stories/R00054.md` (Wegwerf-Ordner, Messages über `git commit -F` aus Dateien, die python3 schreibt; Autor über `git -c user.name=…`). „Die Leiste zeigt“ heißt `textContent` des Elements. Testebene je Kriterium in Klammern.

### Marke statt Entfernen (Abnahme-Probe der Karte)

- [ ] 1. Gegeben Commit `ubidi` mit Betreff `abc` U+202E `fed.exe` und Autor `Anna` U+200B `Beispiel`, wenn der Mensch gitreviewA mit `ubidi` startet, dann zeigt die Zeile der Leiste den Betreff `abc⟨U+202E⟩fed.exe` und den Autor `Anna⟨U+200B⟩Beispiel`, und im Text der Leiste steht weder U+202E noch U+200B; `GET /api/commits` liefert beide Texte roh (Gegenprobe, Server unverändert). (Unit `zeilenwerte`; Playwright einmal für die Leiste; Integration am Endpunkt)

### Alle Wege, Standardmodus zuerst (Pflichtpunkte 2 und 5)

- [ ] 2. Gegeben Commit `uwege` mit Betreff `Start` U+2066 `x` U+2069 und Message `a` U+202E `b` LF `c` U+200B `d` LF `e` U+E0041 Tab `f` CR `g`, wenn der Mensch in „Zusammen“ (Standard) die Message in der Leiste ausklappt und den Abschnittskopf „ohne Kette“ ansieht und danach nach „Einzeln“ wechselt, dann zeigt die Message drei Zeilen `a⟨U+202E⟩b`, `c⟨U+200B⟩d`, `e⟨U+E0041⟩`·Tab·`f⟨U+000D⟩g`, und Abschnittskopf, Stand des Commit-Wählers und sein Menüeintrag tragen `Start⟨U+2066⟩x⟨U+2069⟩`; der Streifen „Absicht der KI“ zeigt Betreff und Message mit demselben Text. (Unit `zeilenwerte`, `betreffVon`; Playwright ein Durchlauf, „Zusammen“ zuerst)
- [ ] 3. Gegeben jeder Codepunkt U+0000 bis U+10FFFF außer den Surrogaten, wenn er einzeln als Betreff und als Autor durch die Anzeigewerte der Leiste läuft, dann ist das Ergebnis gleich dem von `sichtbarerName` für denselben Codepunkt — abgetastet über die ganze Menge, nicht an Beispielen; und im Quelltext von `web/` findet die Suche nach `ohneSteuerzeichen` und nach einer Zeichenklasse mit `‪` oder `⁦` nichts außerhalb der einen Liste. (Unit, Allquantor; Suche als Sonde im Review)

### Kürzung und Marke (Pflichtpunkt 1)

- [ ] 4. Gegeben Commit `ukante` mit einer Message aus 19 998 × `a`, U+202E und `bb` (20 001 Zeichen), wenn die Message ausgeklappt ist, dann zeigt die Leiste 19 998 × `a`, `⟨U+202E⟩`, `b` und `… (1 Zeichen nicht gezeigt)` (Rechnung: 19 998 + 1 + 1 = 20 000 Zeichen gezeigt, 20 001 − 20 000 = 1); keine halbe Marke wie `⟨U`. Mutant „erst markieren, dann kürzen“ wird rot (er zeigt 19 998 × `a`, `⟨U` und `… (8 Zeichen nicht gezeigt)`). (Unit)
- [ ] 5. Gegeben Commit `kr` aus R00051 (Message 19 999 × `a`, U+202E, 10 × `b`), wenn der Mensch `k.txt` wählt und die Message in der Leiste und im Streifen „Absicht der KI“ ausklappt, dann zeigen beide denselben Text: 19 999 × `a`, `⟨U+202E⟩` und `… (10 Zeichen nicht gezeigt)`. Ersetzt die Leisten-Hälfte von R00051, Kriterium 5. (Unit über beide Anzeigewerte; Playwright einmal, bestehende Spec angepasst)
- [ ] 6. Gegeben Commit `uviele` mit einer Message aus 25 000 × U+200B, wenn die Leiste geladen ist, dann trägt der Rumpf im DOM — schon zugeklappt — 20 000 Marken `⟨U+200B⟩` (160 000 Zeichen) und `… (5000 Zeichen nicht gezeigt)`, nicht mehr; ausgeklappt liegt er im Rollbereich der Commit-Liste (höchstens 300 px hoch), und die Dateiliste darunter bleibt sichtbar und bedienbar. (Playwright, DOM-Länge und Lage)

### Leerfall

- [ ] 7. Gegeben Commit `unur` mit der Message U+200B allein und Commit `uleer` ohne Message, wenn die Leiste geladen ist, dann trägt `unur` den Knopf „Message“, der ausgeklappt `⟨U+200B⟩` zeigt, und `uleer` trägt keinen Knopf (R00003). Endgültig (product-owner 2026-11-27, `AI-Team/po-entscheidungen.md` Zeile 278): `hatRumpf` ist der rohe Serverrumpf. (Unit `hatRumpf`)

Grenz- und Leerfälle bedacht: leere Felder (7; Betreff und Autor leer zeigen weiter leer); Marke an der Schnittkante (4); längste Marke und dichtester Text (6); Tab und LF bleiben, CR wird Marke (2); Zeichen über U+FFFF (`⟨U+E0041⟩`, 2, 3). **Verworfen**: einzelne Surrogate in Commit-Texten — der Decoder des Servers macht aus ungültigem UTF-8 Bytemarken `⟨0xED⟩` (Angriffsmatrix F10), es kommt kein einzelnes Surrogat im Browser an; die eine Liste bleibt dafür unverändert. Datum und Kurz-Hash: nicht fremd gesetzt (`%aI`, Hex geprüft), nicht betroffen.

**Pflichtpunkte der Detailplanung**: 1 Grenzen je Einheit — je Feld 20 000 Zeichen des Rohtextes, höchstens 180 000 Zeichen nach dem Markieren (4, 6); stdout nicht betroffen (keine Commit-Angabe geht auf stdout, PO Zeile 257). 2 Anzeigeverfahren — „Zusammen“ zuerst (Zeile, Message, Abschnittskopf ohne Kette), dann „Einzeln“ (Wähler-Stand und Menü) (2); Diff-Ansichten, Umbruch, Suche zeigen keine Commit-Texte: nicht betroffen. 3 Festes Layout — die markierte Message bleibt im Rollbereich der Commit-Liste, die Dateiliste behält ihren Platz (6). 4 Ausführungsort — Browser, keine stderr-Zeile, keine neue Schranke (R00051 gilt). 5 Eine Unterscheidung, ein Ort — eine Zeichenliste (`sichtbarerName`) für Namen und Commit-Texte, alle Wege der Leiste über `zeilenwerte`/`betreffVon` (2, 3, 5).

## Betroffene Verzeichnisstruktur

- Oberfläche: `src/GitReviewA/web/commit-werte.js` (Anzeigewerte), `web/dateiliste-werte.js` (die eine Liste, `sichtbarerName`) bzw. ein gemeinsames Modul, wenn die Ladereihenfolge es verlangt; `web/index.html` nur für die Ladereihenfolge.
- Server: keine Änderung.
- Tests: `e2e/tests/bausteine/commit-werte.spec.js` (Bestandstests, die das Entfernen prüfen, werden auf Marken umgestellt), `e2e/tests/commit-leiste-nachricht.spec.js` (Kriterium 5 aus R00051), eine Spec für Repo U, Treiber unter `e2e/treiber/`.

## Technische Überlegungen

### Ablauf
1. **Eine Liste erreichbar machen** — `commit-werte.js` lädt in `index.html` vor `dateiliste-werte.js`; entweder holt es `sichtbarerName` beim Aufruf statt beim Laden, oder die Liste zieht verhaltensgleich in ein Modul, das beide (und `absicht-werte.js`) einbinden. Entscheidung beim Entwickler; keine Kopie der Liste.
2. **Anzeigewerte markieren** — `zeilenwerte(commit)`: `betreff`, `autor` = `sichtbarerName(nachrichtText(feld))`, `rumpf` = je Zeile markiert (wie `markiert` in `absicht-werte.js`, dieselbe Funktion), `hatRumpf` = Rumpf vom Server nicht leer; `betreffVon` ebenso; `ohneSteuerzeichen` entfällt.
3. **Leiste** — `commits.js` zeichnet weiter nur aus `zeilenwerte`; keine Änderung erwartet.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `zeilenwerte` und `betreffVon` in `commit-werte.js`; `sichtbarerName` in `dateiliste-werte.js`; `markiert` in `absicht-werte.js`.

- `sichtbarerName(text)` (Operation, rein; bestehend) — die eine Zeichenliste.
- `markiert(text)` (Operation, rein; bestehend) — je Zeile `sichtbarerName`, LF bleibt; wird von der Leiste mitbenutzt (ggf. an den Ort der Liste umgezogen).
- `zeilenwerte(commit)`, `betreffVon(commits, hash)` (Operationen, rein; bestehend) — liefern markierte, gekürzte Felder.

### Änderungen an bestehenden Klassen
- `web/commit-werte.js`: `ohneSteuerzeichen` gelöscht; `zeilenwerte`, `betreffVon`, `hatRumpf` wie oben.
- `web/dateiliste-werte.js` / `web/absicht-werte.js`: nur, wenn Liste oder `markiert` an einen gemeinsamen Ort ziehen — ohne Verhaltensänderung.

## Tests

Nach Skill `test-pyramide`; alles liegt im Browser: Unit für die Anzeigewerte (Node, `e2e/tests/bausteine/`), Playwright nur für die Wege durch die Oberfläche und die DOM-Länge, eine Integration am Endpunkt als Gegenprobe.

**Kandidaten für Unit Tests:** `zeilenwerte`/`betreffVon` (1, 2, 4, 5, 7), Abtastung aller Codepunkte gegen `sichtbarerName` (3), Mutanten „erst markieren, dann kürzen“, „Liste ohne `Cf`“, „Tab markiert“, „LF markiert“, „`hatRumpf` aus dem markierten bzw. bereinigten Text“.
**Integration:** `GET /api/commits` liefert U+202E und U+200B roh (1, Gegenprobe).
**E2E:** eine Spec für Repo U (Szenarien 1, 2, 4 der User Story; Kriterien 1, 2, 6), die bestehende Spec der Leiste für `kr` auf den gemeinsamen Text umgestellt (5).

## Abhängigkeiten
- Abhängig von: R00003 (Leiste), R00038 (Streifen, `markiert`), R00051 (Kürzung vor dem Markieren, I0051, auf main), R00048 (Commit-Angaben unverschoben).
- Blockiert: —

## Offene Fragen

Keine offenen. Der product-owner hat die Frage am 2026-11-27 entschieden (`AI-Team/po-entscheidungen.md` Zeile 278); die Antwort ist oben eingearbeitet:

1. **Message nur aus unsichtbaren Zeichen: Knopf „Message“ zeigen?** **Ja** — eine Message nur aus unsichtbaren Zeichen hat einen Rumpf (`hatRumpf` = der Rumpf vom Server ist roh nicht leer), die Leiste zeigt den Knopf „Message“, ausgeklappt mit den Marken (Kriterium 7); nur eine wirklich leere Message bleibt ohne Knopf (R00003).

## Manuelle Vorbereitungstätigkeiten
- keine

## Manuelle Nachbereitungstätigkeiten
- In der Angriffsmatrix (`Dokumentation/Sicherheit/angriffsmatrix-commit-leser.md`) den Punkt unter „Nicht abgedeckt“ nach der Abnahme als geschlossen führen (security-reviewer).

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: Ein fremdes Repo setzt U+202E in einen Betreff, damit `abc‮fed.exe` als `abcexe.def` erscheint, oder U+200B in einen Autor, der so wie ein bekannter Name aussieht. → Die Leiste ersetzt jedes Zeichen der einen Klasse durch seine Marke, nachdem sie gekürzt hat → der Mensch sieht `⟨U+202E⟩` bzw. `⟨U+200B⟩` an genau der Stelle, an der das Zeichen steht (1, 2), und erkennt den Eingriff → weil es dieselbe Liste wie bei Dateinamen und im Streifen ist (3, 5), zeigt keine Ansicht einen Commit-Text anders als eine andere, und die Kürzung bleibt exakt die aus R00051 (4).

## Notizen

- **Optionen** (Ort der einen Liste): (a) `sichtbarerName` aus `dateiliste-werte.js` mitbenutzen, ggf. in ein gemeinsames Modul ziehen — **gewählt**: eine Liste, schon gegen `UnsichtbareZeichen` im Server abgeglichen (Lehre #17); (b) `ohneSteuerzeichen` auf die volle Klasse erweitern und markieren lassen — zwei Listen an zwei Orten, verworfen (Pflichtpunkt 5); (c) Server liefert Commit-Texte schon markiert (`AlsMarken`) — ein Ort auch für den Server, aber `GET /api/commits` änderte seinen Vertrag, die Kürzung nach R00051 zählte dann die Marke mit 8–9 Zeichen statt einem, und der Streifen markierte doppelt; verworfen.
- Herkunft: `ohneSteuerzeichen` kam aus kanbanD `web/commits.js`; R00038 und R00048 (Notizen) haben die zweite Liste als eigene Karte benannt.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-27 | angelegt | Karte #64, planer, Lauf 64-planer-1 |
| 2026-11-27 | PO-Entscheidung eingearbeitet: Message nur aus unsichtbaren Zeichen hat einen Rumpf, Knopf „Message“ mit Marken; Vorbehalt „vorläufig“ entfällt (Kriterium 7 endgültig), Frage 1 geschlossen | Karte #64; PO `AI-Team/po-entscheidungen.md` Zeile 278 |
