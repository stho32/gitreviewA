---
application: gitreviewA
system: gitreviewA
vision: Anforderungen/R00000-vision.md
wireframes: keine — Gestaltung und Review-Seite aus kanbanD übernommen (web/kd-*.css, diff.js, review-uebersicht.js); Betreiber 2026-11-24
sprache: de
zuletzt: 2026-11-24
---

# WBS — gitreviewA

## Knoten

| ID | Ebene | Eltern | Name | Status | Fertig-Kriterium | Eingabe → Ausgabe | Aufwand | Ausbaustufe | Braucht | Requirement | Notiz |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A0001 | Application | — | gitreviewA | rot | alle Dialogs gruen | | | | | | Leitplanken aus R00000: .NET 10, nur localhost, nur RAM, git-CLI, stdout = Ergebnis, Logging stderr, Lastprofil |
| D0001 | Dialog | A0001 | Lauf starten | rot | alle Interactions gruen | | | | | | CLI-Aufruf bis zur offenen Oberfläche |
| I0001 | Interaction | D0001 | Mit Commit-Hashes aufrufen | rot | `gitreviewA <hash…>` im Repo startet auf freiem localhost-Port, öffnet den Browser mit den Commits, der Prozess wartet | | | | | R00001 | aus Vision; Gerüst; kein Feature noetig; Bubbles Hypothese 20-28 h ungemessen |
| B0001 | Bubble | I0001 | Lösungsgerüst | rot | | — → `gitreviewA.sln`, `src/GitReviewA` (net10.0), `tests/GitReviewA.Tests` (NUnit), `Directory.Build.props` (warnaserror); `dotnet build -warnaserror` und `dotnet test` grün | 2 | | | |  |
| B0002 | Bubble | I0001 | Wegwerf-Repo für Tests | rot | | Commit-Betreffe → Temp-Repo mit Commits (`WegwerfRepo`: Hashes, Pfad, Aufräumen) | 2 | | | | Hilfsklasse für Integration und Vorlage für E2E |
| B0003 | Bubble | I0001 | Aufruf lesen | rot | | `string[] args` → `Aufruf` (Hashes, Port, KeinBrowser, Stufe) oder Aufrufsfehler; Hash gegen 4–64 Hexziffern | 2 | | | | Operation, rein; Sicherheit |
| B0004 | Bubble | I0001 | Protokoll auf stderr | rot | | `Protokollstufe` + Meldung + Kontext → Zeile (Zeit, Stufe, Kontext) auf stderr, nie stdout | 2 | | | | Logging-Konzept |
| B0005 | Bubble | I0001 | Commits lesen | rot | | `Aufruf.Hashes` + Arbeitsordner → `Commitzeilen` (voller Hash, Kurz-Hash 7 Zeichen, Betreff) in Aufrufreihenfolge; ein `git log --no-walk=unsorted`-Aufruf mit Argumentliste | 2-4 | | | | Ressourcenzugriff; Sicherheit |
| B0006 | Bubble | I0001 | Oberfläche eingebettet | rot | | kanbanD `kd-*.css`, Fonts, `commits.js` + neue `index.html` → `EmbeddedResource` → Abruf per Ressourcenname; Liste als Text (kein HTML) gerendert | 2-4 | | | | Übernahme aus kanbanD, Herkunft im Commit; Ausgabeordner ohne lose Oberflächendateien |
| B0007 | Bubble | I0001 | Server mit Host-Prüfung | rot | | `Aufruf` + `Commitzeilen` + Ressourcen → laufender Host auf `127.0.0.1:<Port>` mit `GET /`, `/api/commits`, `/api/zustand`; fremder `Host` → 4xx; Adresse | 2-4 | | | | Integration; Sicherheit; Port 0 = frei |
| B0008 | Bubble | I0001 | Browser öffnen | rot | | Adresse → Prozessstart `GITREVIEWA_BROWSER` bzw. Plattformöffner mit der Adresse als einzigem Argument; Fehler → Warnung | 2 | | | | Ressourcenzugriff; Vorbild kanbanD `src/` |
| B0009 | Bubble | I0001 | Hauptablauf | rot | | `args` → Aufruf lesen → Commits lesen → Server → Startzeile (stderr) → Browser → warten; Fehler → Meldung + Exit-Code ≠ 0 | 2 | | | | Integration (`Program.Main`) |
| B0010 | Bubble | I0001 | E2E-Gerüst | rot | | Wegwerf-Repo + gestartetes Programm (freier Port, `--kein-browser`) → Playwright-Test headless; `e2e/package.json`, `playwright.config.ts`, 1 Test „Commit-Liste“ | 2-4 | | | | Gate-Teil `cd e2e && npx playwright test` |
| I0002 | Interaction | D0001 | Bereiche und stdin | rot | `a..b` und `-` (Hashes über stdin) ergeben dieselbe Commit-Liste wie `git rev-list` | | | | I0001 | | aus Vision, kein Requirement |
| I0003 | Interaction | D0001 | Ungültiger Aufruf | rot | kein Repo, unbekannter Hash oder leere Auswahl: Fehlermeldung auf stderr, Exit-Code ≠ 0, kein Server | | | | I0001 | | aus Vision, kein Requirement |
| I0004 | Interaction | D0001 | Als eine Datei veröffentlichen | rot | `dotnet publish` erzeugt je Plattform genau eine ausführbare Datei ohne Begleitdateien (frameworkabhängig, Oberfläche eingebettet), die mit installierter .NET-10-Runtime startet | | | | I0001 | | aus Vision, kein Requirement; Betreiber 2026-11-24 |
| D0002 | Dialog | A0001 | Commits durchsehen | rot | alle Interactions gruen | | | | | | Hauptansicht |
| I0005 | Interaction | D0002 | Commits und Dateien sehen | rot | Commit-Leiste (Hash, Autor, Datum, Betreff, Message) und Dateiliste mit A/M/D/R und +/− je gewähltem Commit | | | | I0001 | | aus Vision, kein Requirement |
| I0006 | Interaction | D0002 | Diff einer Datei lesen | rot | Datei wählen zeigt unified Diff wie `git show`, Zeilenumbruch umschaltbar, Diff wird erst bei Auswahl geladen | | | | I0005 | | aus Vision, kein Requirement |
| I0007 | Interaction | D0002 | Nebeneinander-Ansicht | rot | Umschalter zeigt denselben Diff zweispaltig alt/neu | | | | I0006 | | aus Vision, kein Requirement |
| I0008 | Interaction | D0002 | Syntaxhervorhebung | rot | Diff-Zeilen bekannter Sprachen farbig hervorgehoben | | | | I0006 | | aus Vision, kein Requirement |
| I0009 | Interaction | D0002 | Whitespace und Kontext | rot | Whitespace-Änderungen ausblendbar (`-w`); Kontext je Hunk per Klick erweiterbar | | | | I0006 | | aus Vision, kein Requirement |
| I0010 | Interaction | D0002 | Zusammen-Ansicht | rot | Umschalter Einzeln/Zusammen: lückenlose Kette als Netto-Diff, sonst Hunks je Datei mit Commit beschriftet; Fall wird erkannt und angezeigt | | | | I0006 | | aus Vision, kein Requirement |
| I0011 | Interaction | D0002 | In VS Code springen | rot | Link je Hunk und Zeile öffnet `vscode://file/<pfad>:<zeile>`; Hinweis, wenn die Datei seit dem Commit geändert wurde | | | | I0006 | | aus Vision, kein Requirement |
| I0012 | Interaction | D0002 | Umbenennung, Bild, Binärdatei | rot | Umbenennung als R mit altem Pfad; Bilder vorher/nachher; Binärdateien nur benannt | | | | I0006 | | aus Vision, kein Requirement |
| I0013 | Interaction | D0002 | Ausblenden und Suchen | rot | `--ignore <muster>` und Muster in der Oberfläche blenden Dateien aus; Textsuche springt zu Treffern im Diff | | | | I0005 | | aus Vision, kein Requirement |
| I0014 | Interaction | D0002 | Große Diffs | rot | Datei über 20 000 Diff-Zeilen zugeklappt mit „trotzdem laden“; Dateiwechsel an der Obergrenze ≤ 1 s | | | | I0006 | | aus Vision, kein Requirement; Lastprofil |
| I0015 | Interaction | D0002 | Tastaturbedienung | rot | j/k Datei, n/p Hunk, x abhaken, w Umbruch, s Ansicht, o VS Code, ? Hilfe | | | | I0016 | | aus Vision, kein Requirement |
| D0003 | Dialog | A0001 | Prüfen und anmerken | rot | alle Interactions gruen | | | | | | |
| I0016 | Interaction | D0003 | Datei abhaken | rot | Haken je Datei (Einzeln: je Commit×Datei), Fortschritt „n von m“, Abgehakte zuklappen, „nächste ungeprüfte“ | | | | I0006 | | aus Vision, kein Requirement; nur RAM |
| I0017 | Interaction | D0003 | Zeile annotieren | rot | Klick auf Diff-Zeile öffnet Notizfeld; Anmerkung bleibt sichtbar an der Stelle, änderbar und löschbar | | | | I0006 | | aus Vision, kein Requirement; nur RAM |
| I0018 | Interaction | D0003 | Datei annotieren | rot | Anmerkung an einer Datei ohne Zeilenbezug, änderbar und löschbar | | | | I0017 | | aus Vision, kein Requirement |
| D0004 | Dialog | A0001 | Lauf beenden | rot | alle Interactions gruen | | | | | | Rückkanal Mensch → KI |
| I0019 | Interaction | D0004 | Beenden mit Ergebnis | rot | „Beenden“ gibt „Ergebnis manueller Review“ mit allen Anmerkungen und Stellenangaben (Commit, Datei, Zeile) auf stdout aus und beendet den Prozess mit Exit-Code 0 | | | | I0001 | | R00002 | aus Vision; Gerüst-Partner von I0001; kein Feature noetig; Ergebnisformat, Speicher und Beenden-Ablauf hier festgelegt |
| B0101 | Bubble | I0019 | Anmerkungsspeicher | rot | | Neue Anmerkung (Commit, Datei, Zeile?, Text) → Anmerkung mit Nummer; Schnappschuss → Liste in Anlegereihenfolge | 2 | | | | Operation, thread-sicher, nur RAM |
| B0102 | Bubble | I0019 | Anmerkung prüfen | rot | | Neue Anmerkung + Auswahl des Laufs → gültig oder Ablehnungsgrund (Hash nicht in Auswahl oder gekürzt, Datei leer oder mit Zeilenumbruch, Zeile < 1, Text leer oder > 10 000 Zeichen) | 2 | | | | Operation, rein |
| B0103 | Bubble | I0019 | Ergebnis formatieren | rot | | Liste von Anmerkungen → Markdown-Text (Überschrift, Anzahl, je Anmerkung Abschnitt mit Zitat; Leerfall „Keine Anmerkungen.“) | 2-4 | | | | Operation, rein; Format siehe R00002 |
| B0104 | Bubble | I0019 | Endpunkt Anmerkung anlegen | rot | | POST /api/anmerkungen (JSON) → 201 mit Nummer, oder 400 mit Meldung, oder 409 nach Beenden | 2 | | | | Integration |
| B0105 | Bubble | I0019 | Anfrageschutz | rot | | Anfragekopf (Host, Origin, Methode, Inhaltstyp) + eigener Port → zulassen, oder 403, oder 405, oder 415 | 2 | | | | Operation rein, als Middleware für beide Endpunkte; sicherheit |
| B0106 | Bubble | I0019 | Beenden-Ablauf | rot | | POST /api/beenden → Einmal-Schalter, Antwort 200, Ergebnis nach stdout (UTF-8 ohne BOM, Flush), Host stoppen, Exit-Code 0 | 2-4 | | | | Integration; stdout nur Ergebnis; sicherheit |
| B0107 | Bubble | I0019 | Beenden in der Oberfläche | rot | | Betätigung von „Beenden“ → Anforderung an den Server → Meldung „Review beendet“ statt Bedienung | 2 | | | | Integration; Stil kanbanD |
| I0020 | Interaction | D0004 | Befunde kopieren | rot | Knopf kopiert dasselbe Ergebnis als Markdown in die Zwischenablage, ohne den Lauf zu beenden | | | | I0019 | | aus Vision, kein Requirement |

## Offene Fragen

- Oberfläche ohne Wireframes: Design aus kanbanD (Betreiber 2026-11-24).
- Vision, Offene Richtungsfragen: Gesamturteil/Exit-Code, Lauf ohne „Beenden“ (Tab zu, Abbruch), Ergebnisformat Markdown/JSON, Anbindung an kanbanD — je nach Entscheidung neue Interactions unter D0004 bzw. D0001.
- I0019 (R00002): Gesamturteil/Exit-Code, Lauf ohne „Beenden“, Markdown/JSON bleiben offen (Vision); zusätzlich: Dateiliste (abgehakt/ungeprüft) ab I0016 im Ergebnis, Commit-Kontext im Ergebnis — Fragen an den product-owner.
- Phasen nach der Abnahme: im Modus `still` nur das Standardmodell.
- Reihenfolge der ersten Pakete: Gerüst I0001 + I0019 (Aufruf → Beenden → stdout), dann I0005, I0006, I0017 — der kleinste durchgehende Rückkanal.

## Notizen / Quellen

- Anforderungen/R00000-vision.md (Zielbild, Leitplanken, Lastprofil)
