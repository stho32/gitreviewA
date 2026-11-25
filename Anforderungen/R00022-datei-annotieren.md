---
id: R00022
status: Neu
datum: 2026-11-25
---

# R00022: Datei annotieren

## Beschreibung

Der prüfende Mensch merkt eine **Datei als Ganzes** an — ohne Zeilenbezug —, wenn der Befund nicht an einer Zeile hängt („diese Datei gehört nicht ins Repository", „der ganze Ansatz ist falsch", „die Lizenz fehlt"). Er betätigt „Datei anmerken" im Kopf des Diff-Bereichs (oder am Hinweis einer entfernten Zeile), schreibt in das Notizfeld und speichert. Die Anmerkung steht danach über den Diff-Zeilen der Datei, bleibt beim Wechsel von Datei und Commit und nach dem Neuladen sichtbar und erscheint beim „Beenden" im Ergebnis als `<Datei> (ganze Datei)` ([R00002](R00002-beenden-mit-ergebnis.md), Ergebnisformat). Sie folgt denselben Regeln wie die Zeilenanmerkung ([R00010](R00010-zeile-annotieren.md)): dieselbe Textregel, dieselbe Sperre je Stelle ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)), mehrere je Datei, Marken für unsichtbare Zeichen. Ändern und Löschen sind die eigenen Interactions I0023 ([R00018](R00018-anmerkung-aendern.md)) und I0024 ([R00019](R00019-anmerkung-loeschen.md)) und gelten dort schon für Dateianmerkungen.

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen" (Notizen an Zeilen **oder Dateien**) und „Ergebnis als Rückkanal" (die Stelle `<Datei> (ganze Datei)` ist direkt als Arbeitsauftrag lesbar).

Baut auf auf: [R00010](R00010-zeile-annotieren.md) (Anlegen, Anzeige am Diff, `Anmerkungstext`, `GET /api/anmerkungen`, stabile Nummer), [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat `<Datei> (ganze Datei)`, Anfrageschutz, Anlegen-Schnittstelle), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Sperre je Stelle), [R00018](R00018-anmerkung-aendern.md) und [R00019](R00019-anmerkung-loeschen.md) (Ändern und Löschen der Dateianmerkung).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Anmerkung, Stelle (`Datei:Zeile` bzw. `<Datei> (ganze Datei)`), Nummer (stabil, von der Position im Ergebnis verschieden) und Ergebnis sind die von R00002 und R00010.

## Geschäftlicher Nutzen

Nicht jeder Befund hängt an einer Zeile: „diese Datei gehört nicht hierher", „der ganze Ansatz ist falsch", „die Lizenz fehlt" treffen die Datei als Ganzes. Ohne die Dateianmerkung müsste der Mensch sie an eine beliebige Zeile hängen (die KI sucht dann an der falschen Stelle) oder in eine Zeilenanmerkung schreiben, die nur zufällig passt. Mit der Dateianmerkung bekommt die KI eine Stelle, die sie ohne Rückfrage findet: die Datei als Ganzes. Sie teilt Textregel, Sperre und Adressierung mit der Zeilenanmerkung — kein zweiter Weg, der etwas anderes prüft.

## Funktionale Anforderungen

- **Anmerken**: „Datei anmerken" im Kopf des Diff-Bereichs (Entwurf Fassung 2) und am Hinweis einer entfernten Zeile („Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei") öffnet ein Notizfeld; „Speichern" (Strg+Enter) legt die Anmerkung an, „Abbrechen" (Esc) schließt ohne Wirkung.
- **Stelle**: die Anmerkung gehört zu Commit und Datei, ohne Zeile. Sie wird über `POST /api/anmerkungen` **ohne `zeile`** angelegt — dieselbe Schnittstelle wie die Zeilenanmerkung (R00002/R00010); im Ergebnis steht `<Datei> (ganze Datei)` (R00002).
- **Text**: dieselben Regeln wie beim Anlegen einer Zeilenanmerkung (nicht leer und nicht nur Leerraum, höchstens 10 000 Zeichen, keine Steuer- und Richtungszeichen; Tab, LF, CRLF, Umlaute und Emoji bleiben erlaubt) — dieselbe Funktion `Anmerkungstext` (R00010), kein zweiter Prüfweg.
- **Sperre** (R00014): eine Dateianmerkung an einer gesperrten Stelle (Commit, Name) wird abgelehnt (400, Sperrgrund) — dieselbe **eine** Regel wie beim Haken und bei der Zeilenanmerkung; die Oberfläche bietet an einer gesperrten Datei keinen Weg an (der Diff ist dort nicht lesbar, R00013).
- **Mehrere je Datei**: mehrere Dateianmerkungen an derselben Datei sind erlaubt (R00010, Entscheidung des product-owner), in Anlegereihenfolge.
- **Anzeige**: die Dateianmerkungen der gezeigten Datei stehen **über** den Diff-Zeilen, jede mit ihrem Anmerkungskopf (stabile Nummer, „Ändern", „Löschen") und dem Text als reinem Text (`textContent`, nie HTML); sie tragen kein `data-art`, `data-alt`, `data-neu` und stören die Zeilenzählung und die Farbauflage (R00004/R00007/R00008) nicht.
- **Bleibt sichtbar**: eine Dateianmerkung (Commit, Datei) erscheint in jedem Diff dieses Commits und dieser Datei — in „nur Änderungen" und „ganze Datei", mit und ohne Umbruch, nach Wechsel von Datei und Commit und zurück, nach Neuladen der Seite; sie erscheint nie an einer anderen Datei oder einem anderen Commit.
- **Ändern und Löschen**: über die Anmerkungsköpfe wie bei der Zeilenanmerkung (I0023/I0024, R00018/R00019); Stelle und Position bleiben, das Ergebnis bleibt Byte für Byte wie R00002/R00010.
- **Liste**: `GET /api/anmerkungen` liefert Dateianmerkungen wie Zeilenanmerkungen (`nummer`, `commit`, `datei`, `zeile: null`, `text`) in Anlegereihenfolge; Quelle der Wahrheit ist der Server.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): die Anzeige der Dateianmerkungen ist eine Suche über höchstens 500 Anmerkungen; die Lastprofil-Messungen aus R00010 (500 Anmerkungen, Dateiwechsel ≤ 1 s, Messwert ≤ 0,7 s) und R00002 („Beenden" ≤ 1 s) bleiben unverändert. Eine neue Messung ist nicht nötig.
- **Sicherheit** (Label `sicherheit`): Pfad und Text sind fremder Text bzw. Eingabe des Menschen; nur `textContent` und Attributwerte, kein `innerHTML`, kein Markdown. Unsichtbare und richtungsändernde Zeichen im Namen erscheinen als Marke `⟨U+202E⟩` (dieselbe Klasse wie R00011/R00012, keine zweite Zeichenliste). Der Endpunkt liegt hinter demselben Anfrageschutz und derselben Host-Prüfung wie das Anlegen; Abweisungen nennen nie den Wortlaut.
- **Logging**: stdout bleibt bis „Beenden" leer; Anlegen und Ablehnung je eine Debug-Zeile mit Nummer und Textlänge bzw. Grund, nie der Text.
- **Benutzerfreundlichkeit**: Entwurf Fassung 2 (`.diff-kopf .rechts`, Hinweis) mit Vorrang, sonst kanbanD/Material 3; das Feld ist per Tastatur bedienbar und trägt einen Namen für Screenreader; Fehlermeldungen als `role="alert"`.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (Commits `p`, `q`, `s`) wie in [R00004](R00004-diff-einer-datei-lesen.md) und `user-stories/R00010.md`: `q` ändert `lang.txt` (20 Zeilen, `z19` ist **Zeile 18**) und `src/b.txt` (`eins` 1/1, `−zwei`, `+ZWEI` neu 2, `+drei` neu 3). Aufruf `gitreviewA $q $p --kein-browser`; „wählen" = Klick in der Dateiliste; „Datei anmerken" = Knopf im Diff-Kopf (oder am Hinweis einer entfernten Zeile), Text schreiben, „Speichern" (Strg+Enter). Eine Anmerkung „über die Schnittstelle anlegen" = `curl -X POST -H 'Content-Type: application/json' -d '{"commit":"<voller Hash>","datei":"…","text":"…"}' http://127.0.0.1:<port>/api/anmerkungen` (ohne `zeile`). Die Angabe „Ebene" nennt, wo das Kriterium geprüft wird: **Integration** heißt NUnit gegen den Interactor oder den Endpunkt bzw. das Programm als Prozess mit echtem `git` im Wegwerf-Repo; **E2E** ist die einzige Playwright-Ebene (Bedienweg und Browser-Eigenes); **Unit** sind reine Funktionen (C# und `web/`-JS).

### Datei anmerken
- [ ] 1. Gegeben `q` und `lang.txt` gewählt, wenn man „Datei anmerken" betätigt, den Text „Abschnitt fehlt" schreibt und „Speichern" betätigt, dann steht die Anmerkung über den Diff-Zeilen (Kopf „Anmerkung 1", Stelle `lang.txt (ganze Datei)`), und nach „Beenden" nennt stdout `Anmerkungen: 1`, `## 1. lang.txt (ganze Datei)`, `Commit: <voller Hash von q>` und `> Abschnitt fehlt` bei Exit-Code 0. *Ebene: Integration (Interactor, Endpunkt, Programm für stdout) und E2E (Bedienweg).*
- [ ] 2. Gegeben `q` und `lang.txt` mit zwei Dateianmerkungen (Nummern 1 und 2) und einer Zeilenanmerkung an Zeile 18 (Nummer 3), wenn die Datei gezeigt wird, dann stehen die beiden Dateianmerkungen in Anlegereihenfolge über den Zeilen und die Zeilenanmerkung unter `z19`; nach „Beenden" nennt stdout `Anmerkungen: 3` mit `## 1. lang.txt (ganze Datei)`, `## 2. lang.txt (ganze Datei)` und `## 3. lang.txt:18` in dieser Reihenfolge. Rechnung: Position = Reihenfolge des Anlegens. *Ebene: Unit (Stand) und Integration (Programm).*
- [ ] 3. Gegeben eine Dateianmerkung an `q`, `lang.txt`, wenn man `src/b.txt` wählt, dann `lang.txt` wieder, dann den Commit `p` und dort `lang.txt`, dann `q` und `lang.txt` und die Seite neu lädt, dann steht die Anmerkung wieder über den Zeilen von `lang.txt` in `q`, nicht in `p` und nicht in `src/b.txt`; nach dem Neuladen steht sie wieder da. *Ebene: Unit (Stand) und E2E (Datei-/Commitwechsel, Neuladen — Browser-Eigenes).*
- [ ] 4. Gegeben eine Dateianmerkung über den Zeilen, wenn man am Anmerkungskopf „Ändern" betätigt und den Text ändert, dann steht der neue Text an derselben Stelle (über den Zeilen) und im Ergebnis (R00018); betätigt man „Löschen", verschwindet die Anmerkung aus Anzeige und Ergebnis (R00019). *Ebene: E2E (Bedienweg) und Integration (Programm).*

### Text, Sperre und Grenzen
- [ ] 5. Gegeben eine Datei, wenn nacheinander ein Text von 10 001 Zeichen, ein leerer Text, ein Text aus nur Leerzeichen und ein Text mit U+001B angelegt werden soll, dann wird jedes Mal abgelehnt (400 mit „Text ist länger als 10000 Zeichen", „Text fehlt" bzw. „Text enthält Steuer- oder Richtungszeichen") und nichts gespeichert; ein Text aus drei Zeilen (erste „Prüfen", zweite leer, dritte „größer ≥ 3") mit Tab, CRLF, Umlaut und einem Emoji mit U+200D wird angenommen und steht nach „Beenden" als Zitat (`> Prüfen`, `>`, `> größer ≥ 3`). *Ebene: Unit (Textregel, bestehend) und Integration (Interactor, Programm).*
- [ ] 6. Gegeben eine Datei an einer gesperrten Stelle (Übersicht meldet „Name nicht eindeutig"; über eine Fake-Übersicht — in der Anwendung nicht erreichbar, weil der Diff dort nicht lesbar ist), wenn eine Dateianmerkung angelegt werden soll, dann wird sie abgelehnt (400, „Diff nicht lesbar: Name nicht eindeutig") und nichts gespeichert; an einer lesbaren Stelle wird sie angenommen. *Ebene: Integration (Interactor, Wächter mit Fake-Übersicht).*
- [ ] 7. Gegeben ein beendeter Lauf, wenn eine Dateianmerkung angelegt werden soll, dann wird sie abgelehnt (409) wie die Zeilenanmerkung und erscheint nicht im Ergebnis. *Ebene: Integration (Interactor und Endpunkt).*

### Anzeige und Bedienung
- [ ] 8. Gegeben ein offenes Feld, wenn der Server mit 400, 409 oder 500 antwortet oder gar nicht, dann steht die Meldung des Servers (400, 409) bzw. „Anmerkung konnte nicht gespeichert werden" (5xx, Netz) im Feld, das Feld bleibt offen, der Text bleibt; „Speichern" ist während der Anfrage gesperrt, ein zweiter Klick sendet nicht erneut; ist die Antwort um 1,5 s verzögert und wechselt man währenddessen die Datei und zurück, steht die Anmerkung danach über den Zeilen der richtigen Datei. *Ebene: E2E (Fehlerpfade per `route`, verzögerter Fake — Browser-Eigenes).*
- [ ] 9. Gegeben eine Datei, deren Name U+202E, U+200B und U+E0041 trägt (herstellbar mit `printf`), wenn man sie anmerkt und beendet, dann steht der Name in der Anzeige (Kopf und Stelle) und im Ergebnis mit Marken `⟨U+202E⟩`, `⟨U+200B⟩`, `⟨U+E0041⟩`; ein Text `<img src=x onerror=alert(1)>` steht als sichtbarer Text da (spitze Klammern sichtbar, kein Dialog, kein `img`) und auf stdout unverändert als Zitat. *Ebene: E2E (DOM-Sicherheit, Browser-Eigenes) und Integration (Ergebnis).*

Grenz- und Leerfälle bedacht: keine Dateianmerkung (die Anzeige bleibt leer, das Ergebnis wie R00002); die letzte Anmerkung löschen (R00019 Kriterium 11); eine Datei ohne Zeilenänderung (R00002/R00008: der Diff zeigt „Keine Zeilenänderungen", die Datei ist wählbar und anmerkbar); ein Wurzel-, Merge- und leerer Commit laufen über dieselbe Stelle wie beim Anlegen. Verworfen als eigene Kriterien: eine Zeitmessung für die Dateianmerkung (die Lastprofil-Messungen aus R00010/R00002 gelten unverändert); eine Kennzeichnung „ganze Datei" im Ergebnis (R00002 hat sie schon); das Tastenkürzel `a` (I0015).

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (Themenordner in `src/GitReviewA/`, Oberfläche unter `web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Anmerkungen/` — kein neuer Interactor: die Dateianmerkung ist derselbe Request ohne `zeile` (`ZeileAnnotierenInteractor`, `AnmerkungsPruefer`, `Anmerkungstext`, `Stellensperre`, `Anmerkungsspeicher` unverändert).
- `web/` — `anmerkungen-werte.js` (rein: Dateianmerkungen der Datei), `anmerkungen.js` (Anzeige über den Zeilen, „Datei anmerken", Feld), `index.html` (Knopf im Diff-Kopf), `gitreviewa.css`.
- `tests/GitReviewA.Tests/Akzeptanz/` — Treiber und Sprache wie `ZeileAnnotierenTests`; `e2e/` — ein Spec, DSL und Treiber erweitert.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Datei anmerken** (Oberfläche) — Klick auf „Datei anmerken" im Diff-Kopf oder am Hinweis → Notizfeld mit Namen „Anmerkung zu <Datei> (ganze Datei)".
2. **Speichern** — `POST /api/anmerkungen` mit Commit, Datei, Text (ohne `zeile`); „Speichern" gesperrt bis zur Antwort.
   - 2.1 Server: Anfrageschutz (R00002) → `ZeileAnnotierenInteractor.LegeAn` → Textregel, Auswahl, Datei → Sperre (R00014) → Speicher (409 nach Beenden).
   - 2.2 201: die Oberfläche nimmt die Anmerkung in ihren Stand auf und zeichnet sie über den Zeilen, nur wenn (Commit, Pfad) noch die gewählte Datei sind.
   - 2.3 400/409/500/Netz: Meldung im Feld, Feld bleibt offen, Text bleibt.
3. **Zeigen** — nach jedem `diff-gezeichnet` (Commit, Pfad, Ansicht) die Dateianmerkungen der Datei über den Zeilen einfügen.
4. **Start/Neuladen** — `GET /api/anmerkungen` füllt den Stand.

### Grobentwurf

**Einstiegsstellen:** `web/anmerkungen.js` (Anzeige und Feld), `index.html` (Knopf im Diff-Kopf), `web/anmerkungen-werte.js` (reine Funktion); Server unverändert.

- JS `dateianmerkungen(anmerkungen, commit, datei)` (rein) — die Anmerkungen ohne Zeile dieser Stelle in Anlegereihenfolge.
- `anmerkungen.js` (Adapter, erweitert) — zeichnet die Dateianmerkungen über den Zeilen; „Datei anmerken" öffnet ein Feld mit `zeile: null`; die Antwort nimmt die Anmerkung auf.
- `index.html` — Knopf „Datei anmerken" im `.diff-kopf` (Entwurf Fassung 2).

### Änderungen an bestehenden Klassen

- `web/anmerkungen-werte.js`: neue reine Funktion `dateianmerkungen`; `anmerkungsstand` bleibt für die Zeilenanmerkungen unverändert.
- `web/anmerkungen.js`: `zeigeAnmerkungen` zeichnet zusätzlich die Dateianmerkungen über den Zeilen; `oeffneFeld` bekommt den Fall „ohne Zeile"; der Knopf im Diff-Kopf und der Knopf am Hinweis.
- `index.html`: Knopf „Datei anmerken" im Diff-Kopf.
- Unverändert (bewusst): `ZeileAnnotierenInteractor`, `AnmerkungsPruefer`, `Anmerkungstext`, `Stellensperre`, `Anmerkungsspeicher`, `ErgebnisFormatierer`, `AnmerkungsEndpunkt`.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction; Akzeptanzkriterien als NUnit-Integration gegen den Interactor und den Endpunkt (Treiber in-process, echtes `git` im Wegwerf-Repo); Playwright nur für den Bedienweg der Dateianmerkung und Browser-Eigenes — **kein** Hot-Path-Fall, die Dateianmerkung liegt nicht auf dem Hot Path (`AI-Team/factory.md`, „Testbarkeit").

**Unit (rein):** JS `dateianmerkungen` (keine, eine, drei; gemischt mit Zeilenanmerkungen; anderer Commit, andere Datei; Name mit Marke); `Anmerkungstext` (bestehende Tabelle, unverändert).
**Integration:** die Kriterien 1 bis 7 gegen `ZeileAnnotierenInteractor` und den Endpunkt (201 ohne `zeile`; 400/409; Sperre per Fake-Übersicht; Textregeln) und das Programm als Prozess (Ergebnis Byte für Byte auf stdout). Mutanten: Anzeige der Dateianmerkung aus → Kriterium 1 rot; Sperrprüfung aus → Kriterium 6 rot; Textprüfung aus → Kriterium 5 rot.
**E2E (Playwright headless, über DSL und Treiber):** ein Spec — der Bedienweg (Datei sichtbar → „Datei anmerken" → Speichern → Anmerkung über den Zeilen) und Browser-Eigenes (Fokus, Tastatur, Fehlerpfade per `route`, DOM-Sicherheit, verzögerte Antwort, Neuladen); Wegwerf-Repo A.

## Abhängigkeiten
- Abhängig von: I0017 Zeile annotieren (R00010, grün; Anlegen-Schnittstelle, Anzeige, `Anmerkungstext`, stabile Nummer), I0019 Beenden mit Ergebnis (R00002, grün; Ergebnisformat, Anfrageschutz), I0023 Anmerkung ändern (R00018, grün) und I0024 Anmerkung löschen (R00019, grün) — beide gelten schon für Dateianmerkungen, I0018 baut nur den Weg dorthin.
- Blockiert: keine (I0027 zeichnet „Datei anmerken", sobald diese Karte grün ist).

Nicht Teil dieser Anforderung: Ändern und Löschen (I0023/I0024), das Tastenkürzel `a` (I0015), die Anmerkungszahl je Datei in der Liste (Ausbaustufe, I0027), Speichern auf Platte, Markdown im Text, eine eigene Anmerkungsart „Commit" (nur Zeile und Datei).

## Offene Fragen

1. **Ort der Anzeige der Dateianmerkung**: über den Diff-Zeilen (Empfehlung) oder unter dem Diff? Empfehlung: über den Zeilen, damit sie ohne Scrollen sichtbar ist und die Zeilen nicht verschiebt. Gilt bis zur Antwort.
2. **Feldname**: „Anmerkung zu <Datei> (ganze Datei)" (Empfehlung, unterscheidet sie von der Zeilenanmerkung) oder „Anmerkung zu <Datei>" (wie die vorhandene Funktion `feldnameDerAnmerkung`)? Empfehlung: mit dem Zusatz, damit Screenreader-Nutzer die beiden Arten unterscheiden.
3. **Gesperrte Datei**: soll der Knopf „Datei anmerken" an einer gesperrten Stelle nicht bedienbar sein und den Grund nennen (Empfehlung, wie der Haken in R00014), oder bleibt er bedienbar und der Server lehnt ab? Empfehlung: nicht bedienbar mit Grund.
4. **Einstiege**: Diff-Kopf und Hinweis einer entfernten Zeile (Empfehlung, Entwurf Fassung 2) oder nur der Diff-Kopf? Empfehlung: beide.

## Manuelle Vorbereitungstätigkeiten
- Keine.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 5 Bubbles unterhalb I0018 (B2101–B2105), davon 1 Standard (2 h) und 3 unklar (2–4 h) — Untergrenze 8 h, obere Schätzung 14 h; B2104 (Serverweg) ist `bestehend` und zählt nicht. Enthalten: nur I0018; I0023 und I0024 sind eigene Karten und nicht gezählt. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; mit einem gemessenen Slice rechne ich noch nicht um.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: Der Mensch sieht, dass eine ganze Datei nicht stimmt (falscher Ort, falscher Ansatz, fehlende Lizenz), und hat keinen Weg, das der aufrufenden KI so zu sagen, dass sie die Datei und nicht eine Zeile findet; er hängt den Befund an eine beliebige Zeile und schickt die KI damit an die falsche Stelle. Das Zielbild ist ein Rückkanal, der jede Beobachtung an der Stelle abgibt, an der sie hingehört — auch an der Datei als Ganzes. Kette: Der Diff-Kopf bekommt „Datei anmerken" → das Feld schickt den Text über `POST /api/anmerkungen` **ohne `zeile`** (Kriterium 1) → der Server prüft denselben Text und dieselbe Sperre wie beim Anlegen einer Zeilenanmerkung, der Speicher hängt sie an (Kriterien 5, 6, 7) → die Oberfläche zeichnet sie über den Zeilen, wo sie über Datei- und Commitwechsel und Neuladen bleibt und über die vorhandenen Anmerkungsköpfe änderbar und löschbar ist (Kriterien 2, 3, 4) → „Beenden" nennt sie als `<Datei> (ganze Datei)` (Kriterium 1). Der Hebel ist die **Stelle** (Commit, Datei) ohne Zeile: sie ist derselbe Request wie die Zeilenanmerkung, nur ohne `zeile`, und deshalb teilt I0018 Textregel, Sperre, Speicher und Ergebnisformat mit R00010/R00002 — kein zweiter Weg, der etwas anderes prüft, und Ändern und Löschen (I0023/I0024) funktionieren ohne Neubau, sobald die Anzeige die Dateianmerkung zeichnet.

## Missing-Docs

- Der Knopf „Datei anmerken" und das Notizfeld ohne Zeile im Entwurf Fassung 2 (`.diff-kopf .rechts`, `.btn-text`, `.anm-kopf`) — mit einem kleinen Versuch vor dem Bauen belegen (Fokus beim Öffnen, Rückkehr des Fokus, Tab-Reihenfolge innerhalb der Anmerkungszeile).
- Ob die vorhandene Anzeige (`anmerkungen.js`) die Dateianmerkung ohne Umbau aufnimmt (sie findet die Anmerkungszeile über `tr.anm[data-anmerkung]` und rendert die Stelle über `stelleDer`) — beim Bauen prüfen.

## Notizen

### Optionen (Ort der Dateianmerkung in der Oberfläche)

| Option | Wirkung | Risiko/Aufwand |
|---|---|---|
| A. Eigene Zeile über den Diff-Zeilen (gewählt) | die Anmerkung steht am Kopf der Datei, ohne die Zeilen zu verschieben | klein: eine Zeile mehr im Bereich |
| B. Unter dem Diff | sichtbar erst nach dem Scrollen | klein, aber versteckt |
| C. In der Dateiliste | die Anmerkung hängt nicht am Diff | die Liste zeigt nur die Datei, nicht den Text |

Gewählt: A.

### Verworfene Alternativen
- Eigener Endpunkt für die Dateianmerkung — verworfen: derselbe Request ohne `zeile` (R00002/R00010), kein zweiter Weg.
- Eigener Interactor — verworfen: die Anfrage ist identisch; `ZeileAnnotierenInteractor` nimmt den Fall ohne Zeile schon (R00018/R00019 nutzen ihn).
- Dateianmerkung als Zeilenanmerkung an Zeile 1 — verworfen: verfälscht die Stelle.
- Playwright für jede Bedienaussage — verworfen: die Dateianmerkung liegt nicht auf dem Hot Path; ein Spec für Bedienweg und Browser-Eigenes genügt.
