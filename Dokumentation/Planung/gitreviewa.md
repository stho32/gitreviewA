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
| I0001 | Interaction | D0001 | Mit Commit-Hashes aufrufen | rot | `gitreviewA <hash…>` im Repo startet auf freiem localhost-Port, öffnet den Browser mit den Commits, der Prozess wartet | | | | | | aus Vision, kein Requirement; Gerüst |
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
| I0019 | Interaction | D0004 | Beenden mit Ergebnis | rot | „Beenden“ gibt „Ergebnis manueller Review“ mit allen Anmerkungen und Stellenangaben (Commit, Datei, Zeile) auf stdout aus und beendet den Prozess mit Exit-Code 0 | | | | I0001 | | aus Vision, kein Requirement; Gerüst-Partner von I0001 |
| I0020 | Interaction | D0004 | Befunde kopieren | rot | Knopf kopiert dasselbe Ergebnis als Markdown in die Zwischenablage, ohne den Lauf zu beenden | | | | I0019 | | aus Vision, kein Requirement |

## Offene Fragen

- Oberfläche ohne Wireframes: Design aus kanbanD (Betreiber 2026-11-24).
- Vision, Offene Richtungsfragen: Gesamturteil/Exit-Code, Lauf ohne „Beenden“ (Tab zu, Abbruch), Ergebnisformat Markdown/JSON, Anbindung an kanbanD — je nach Entscheidung neue Interactions unter D0004 bzw. D0001.
- Phasen nach der Abnahme: im Modus `still` nur das Standardmodell.
- Reihenfolge der ersten Pakete: Gerüst I0001 + I0019 (Aufruf → Beenden → stdout), dann I0005, I0006, I0017 — der kleinste durchgehende Rückkanal.

## Notizen / Quellen

- Anforderungen/R00000-vision.md (Zielbild, Leitplanken, Lastprofil)
