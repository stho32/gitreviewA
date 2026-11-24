---
name: factory
projekt: /home/shoff/Projekte/gitreviewA
kanband:
  ordner: /home/shoff/Projekte/Kanban-Boards/gitreviewA-Kanbanboard
  board: gitreviewa
chat:
  ordner: ~/Projekte/Kanban-Boards/Fabriken-Chat
  channel: fabriken
betreiber: st
director: dir
empfaenger: betreiber
anwendung: gra
realist: vorschlagen
last:
  grenze_prozent: 75
transkripte:
  ohne:
angelegt: 2026-11-24
---

# Fabrik

Die eine Konfiguration dieser Fabrik (R00012). `/factory start` kopiert die Vorlage nach `<projekt>/AI-Team/factory.md`.
Der Director liest sie ganz; die Skripte lesen nur das Frontmatter, die Tabellen „Rollen“ und „Spalten“ und den
Stichpunkt „Gate“. Prüfen: `python3 werkzeuge/fabrik.py pruefen AI-Team/factory.md` · einen Abschnitt zeigen:
`python3 werkzeuge/fabrik.py zeige AI-Team/factory.md Ablauf <Spalte>`.

Im Frontmatter steht keine Adresse: Die kanbanD-Instanz zum Board-Ordner und die gemeinsame localchatA-Instanz zum
Chat-Ordner finden oder starten die Skripte selbst.

`transkripte.ohne`: Rollen, durch Komma getrennt, deren Transkripte `board.py beende` nicht an der Karte ablegt —
etwa prüfende Rollen, deren Protokolle Auszüge echter Personendaten enthalten können. Leer: alle Rollen.

## Auftrag

Aktiviert über `/factory start` aus der Software-Factory. Ein Director, ein Projekt.

**Ziel**: Ein Kommandozeilenwerkzeug, mit dem ein Mensch ausgewählte Commits im Browser durchsieht, abhakt und annotiert und das Ergebnis manueller Review als Rückkanal an die aufrufende KI auf stdout ausgibt.

## Umgebung

Wie die Dienste des Projekts starten und geprüft werden. Gilt für den Director und jede Rolle.

- **Gate**: `dotnet build -warnaserror && dotnet test && (cd e2e && npx playwright test)`
- **Installieren**: .NET-SDK 10.0.100 unter `/usr/lib/dotnet` (vorhanden); E2E: `cd e2e && npm install && npx playwright install chromium` — existiert erst nach dem Gerüst (I0001), bis dahin besteht das Gate aus `dotnet build -warnaserror && dotnet test`
- **Dienste starten**: `gitreviewA <hash…> --port <frei> --kein-browser` in einem Wegwerf-Repo (Skill `freier-port`); nie im Projekt-Repo selbst prüfen, das die Rollen gerade ändern. Name der Optionen legt die erste Anforderung fest
- **Health-Check**: offen — legt die erste Anforderung fest (Vorschlag `GET /api/zustand`)
- **Auslieferung** (Betreiber 2026-11-24): genau **eine ausführbare Datei** je Plattform, kein Ordner, frameworkabhängig (braucht installierte .NET-10-Runtime) — `dotnet publish -c Release -r <rid> --self-contained false -p:PublishSingleFile=true`; Weboberfläche als eingebettete Ressource, keine losen Dateien neben der Exe
- **Testdaten**: Integration und E2E legen ihre Git-Repos selbst in einem Temp-Ordner an und räumen sie weg; keine echten fremden Repositories
- **Pfade**: `/usr/lib/dotnet`; Board der Factory `http://127.0.0.1:48051`, Ordner `/home/shoff/Projekte/Kanban-Boards/gitreviewA-Kanbanboard`
- **Remotes**: `origin` GitNAS, `github` (public); gepusht wird nur auf ausdrückliche Ansage des Betreibers

## Rechnerlast

- Höchstens etwa 75 % Systemlast, immer; vor jedem Start einer Rolle, eines Builds oder des Gates prüfen.
- Tagbetrieb 8–21 Uhr: 1 bauende Rolle, 2 prüfende Rollen gleichzeitig.
- Nachtbetrieb 21–8 Uhr: 1 bauende Rolle, 1 prüfende Rolle; Builds mit `nice`.
- Last- und Dauerproben nur auf ausdrücklichen Auftrag des Betreibers, nie nachts.

## Wissen

### Lastprofil

Aus der Vision (Leitplanke „Lastprofil“, Betreiber 2026-11-24): ein Mensch und ein aufrufender Prozess je Lauf. Flüssig bis 200 Commits, 2 000 geänderte Dateien, 20 000 Diff-Zeilen je Datei (darüber zugeklappt mit „trotzdem laden“), 500 Annotationen. Ziele: Oberfläche ≤ 2 s nach Aufruf, Dateiwechsel ≤ 200 ms typisch und ≤ 1 s an der Obergrenze, „Beenden“ bis Ausgabe ≤ 1 s; Diffs je Datei bei Bedarf laden.

### Logging-Konzept

Aus der Vision (Betreiber 2026-11-24): **stdout gehört allein dem Ergebnis manueller Review.** Logging nur auf stderr; Standardstufe Warning, `--verbose` Debug, `--quiet` nur Error und Exception; je Eintrag Zeit, Stufe und Kontext (Commit, Datei, Endpunkt); keine Logdatei, keine Rotation. Eine Zeile Log auf stdout ist ein Muss-Befund — sie landet sonst als Feedback bei der aufrufenden KI.

### Sicherheit

Angriffsfläche: Aufruf von `git` mit Argumenten aus der Befehlszeile, stdin und der Oberfläche (Argument-Injection, Pfade außerhalb des Repos), der lokale HTTP-Server (nur 127.0.0.1, fremde Origins und DNS-Rebinding), Annotationstexte in der Oberfläche (XSS), `vscode://`-Links mit Pfaden aus dem Repo.

### Durchsatz (Betreiber 2026-11-24: „kleine schnelle Factory, Ergebnis zügig“)

- Ein volles Gate je Karte: im Worktree nur die betroffenen Tests, das volle Gate einmal in der Merge-Wache auf `main`.
- Muss ist nur, was ein Nutzer bemerkt oder eine Sicherheitsgrenze verletzt; ein wörtlich verletztes Kriterium ohne sichtbare Wirkung geht an den product-owner.
- Kostendeckel 30 $ je Karte (Regel wie „Kostendeckel“ unter „Ablauf“).
- Aufträge an prüfende Rollen nennen, was schon belegt ist und nicht wiederholt wird.

## Rollen

Treiber `claude` läuft als Subagent des Directors. Ein leeres Modell nimmt das Modell aus dem Kopf der Rolle.

| Rolle | Kürzel | Treiber | Modell | Einsatz |
|---|---|---|---|---|
| planer | plan | claude | sonnet | Interaction bis Bubble verfeinern, Anforderung schreiben, Labels setzen |
| entwickler | entw | claude | | bauen, Test zuerst, im Worktree der Karte; Sonnet, Opus nur bei schwierigen Karten nach der Prüfliste des Directors |
| code-reviewer | crev | claude | sonnet | Korrektheit, Tests, Wartbarkeit je Arbeitspaket |
| security-reviewer | srev | claude | sonnet | Angriffsfläche nach „Wissen/Sicherheit“, mit Probe; kurz bei Karten ohne neue Grenze |
| entwicklertester | etst | claude | sonnet | User Story wörtlich im echten Programm, in einem Wegwerf-Repo |
| product-owner | po | claude | sonnet | Rückfragen der Rollen im Sinne der Vision entscheiden, Protokoll `AI-Team/po-entscheidungen.md` |
| realist-consultant | real | claude | sonnet | nur als Vorschlag, wenn die Schleifenbremse greift (`realist: vorschlagen`) |

## Spalten

In der Reihenfolge des Boards. In Spalten der Art Mensch bewegt die Fabrik nie eine Karte; sie legt höchstens etwas hinein.

| Spalte | Art | Beschreibung |
|---|---|---|
| Ohne Mensch nicht lösbar | Mensch | Schleifen, Entscheidungen und offene Fragen; bearbeitet nur der Betreiber |
| Backlog | Mensch | Sammlung; der Betreiber gibt frei, indem er Karten nach „Detailplanung“ legt |
| Detailplanung | Team | Interaction bis Bubble verfeinern, Anforderung schreiben, Labels setzen |
| Entwicklung | Team | bauen, Test zuerst, im Worktree nur die betroffenen Tests; volles Gate einmal in der Merge-Wache auf `main` |
| Nacharbeit | Team | Muss-Befunde an der Karte beheben, danach zurück in die prüfende Spalte |
| Reviews | Team | code-reviewer und security-reviewer parallel, je Rolle eine Teilaufgabe; Muss-Befunde führen in die Nacharbeit |
| Entwicklertest | Team | User Story wörtlich im echten Programm |
| Abnahme | Mensch | der Betreiber nimmt am Board gegen die Akzeptanzkriterien ab |
| Erledigt | Mensch | letzte Spalte |

## Ablauf

Je Team-Spalte: was ausgelöst wird, wenn eine Karte sie betritt, und wie danach entschieden wird. Für alle Spalten
gilt, ohne dass es je Spalte wiederholt wird:

- **Frage einer Rolle** → product-owner entscheidet (höchstens 2 Runden); nur Richtungsweisendes und danach noch
  Offenes → „Ohne Mensch nicht lösbar“ mit Signal `frage`.
- **Schleifenbremse**: steht bei einer Entscheidung „höchstens n×“, geht die Karte danach nach „Ohne Mensch nicht
  lösbar“ — vorher ein Vorschlag des realist-consultant auf die Karte.
- **Ein Worktree je Karte** für alle Phasen (`board.py beginne` legt ihn an und nennt ihn im Auftragskopf).
- **Zusammenführen** heißt immer: Merge-Wache des Directors (`rollen/director/regeln.md`) — Dokumente nach der
  Detailplanung ohne Gate, Code einmal am Ende, das volle Gate danach auf `main`; ist es rot, geht `main` zurück und
  die Karte in die Nacharbeit.
- **Muss-Schwelle**: Muss ist nur, was ein Nutzer bemerkt (falsches Verhalten, irreführende Bedienung, falsches oder
  verschmutztes Ergebnis auf stdout) oder eine Sicherheitsgrenze verletzt. Der Director stuft gemeldete Muss danach
  ein und nennt die Einstufung im Kommentar.
- **Kostendeckel 30 $ je Karte**: darüber keine neuen Review-, Test- oder Nacharbeitsläufe; die Karte geht in die
  Merge-Wache, grün → Abnahme mit Vermerk „Kostendeckel“ und Liste der offenen Befunde; bei Problemen ungemergt nach
  „Ohne Mensch nicht lösbar“. Der Director prüft das Preisetikett nach jedem `beende`.
- **Rechnerlast**: über der Grenze beginnt kein Lauf; die Karte trägt dann „Wartet auf Systemressourcen“.
- **Störung des Treibers** (Anmeldung, Kontingent, Dienst) ist kein Ergebnis der Rolle: der Lauf hält an, die Karte
  bleibt, wo sie ist.
- **Push** nur auf ausdrückliche Ansage des Betreibers; Karten dürfen ungepusht in die Abnahme.

### Detailplanung
- **Betritt die Karte die Spalte**: planer verfeinert bis Bubble, schreibt die Anforderung und setzt Labels
  (`sicherheit` bei neuem Endpunkt, neuer Eingabe an `git`, Links oder Ausgabe fremder Inhalte in der Oberfläche).
- **Entscheidung**
  - bestanden → Dokumente auf `main` übernehmen → Entwicklung
  - Muss an der Planung → planer arbeitet ein, bleibt in der Spalte; höchstens 2×

### Entwicklung
- **Betritt die Karte die Spalte**: entwickler baut im Worktree der Karte, Test zuerst, und fährt dort nur die
  betroffenen Tests samt Build mit `-warnaserror`.
- **Entscheidung**
  - bestanden (betroffene Tests grün, Befehle und Zahlen im Bericht) → Reviews
  - Build oder betroffene Tests rot → entwickler arbeitet weiter, bleibt in der Spalte; höchstens 2×

### Nacharbeit
- **Betritt die Karte die Spalte**: entwickler behebt nur die Muss-Befunde, die wörtlich auf der Karte stehen, im
  Worktree der Karte.
- **Entscheidung**
  - bestanden → zurück in die Spalte, aus der die Karte kam — dort prüfen nur die Rollen nach, die das Muss gemeldet
    haben
  - kleiner Fix mit automatischem Test (vorher rot, jetzt grün) → der Director prüft am Diff selbst nach, ohne
    erneuten Lauf der Rolle
  - betroffene Tests nach der Nacharbeit rot → Ohne Mensch nicht lösbar

### Reviews
- **Betritt die Karte die Spalte**: parallel am Stand des Kartenzweigs (Diff `main...karte/<nr>`, im Worktree nur
  lesend), je Rolle eine Teilaufgabe, abgehakt, wenn sie bestanden hat
  - code-reviewer immer
  - security-reviewer immer; ohne Label `sicherheit` nur ein kurzer Blick auf die Angriffsfläche
- **Entscheidung**
  - alle bestanden → Entwicklertest
  - Muss nach der Muss-Schwelle → Nacharbeit; höchstens 2×
  - `anforderung_falsch` oder `kriterium_fehlt` → Detailplanung
  - Sollte und Optionales → nie Karte, bleibt im Phasenkommentar und hält nichts auf

### Entwicklertest
- **Betritt die Karte die Spalte**: entwicklertester fährt die User Story wörtlich im echten Programm in einem
  Wegwerf-Repo; prüft dabei, dass stdout nur das Ergebnis trägt.
- **Entscheidung**
  - bestanden → Merge-Wache → Abnahme
  - Muss → Nacharbeit; höchstens 2×
