---
id: R00014
status: Neu
datum: 2026-11-24
---

# R00014: Haken und Anmerkung bei nicht lesbarem Diff sperren

## Beschreibung

Ein Haken heißt „gesehen“. Kann der Diff einer Datei nicht gelesen werden — [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md) kennt dafür die Ausgänge „Name nicht eindeutig“ (zwei Dateien eines Commits tragen denselben Namen, etwa `f⟨0xFF⟩.txt` neben `f\xFF.txt`) und „Name nicht übergebbar“ (Zeilenumbruch oder Wagenrücklauf neben einem ungültigen Byte im Namen, etwa `z\n\xFF.txt`) —, dann hat der Mensch ihren Inhalt nie gesehen, und ein Haken daran wäre dieselbe Täuschung wie der leere Diff aus R00013, nur eine Stufe später: das Ergebnis an die KI nennte die Datei „abgehakt“. Deshalb sind für eine solche **Stelle** (Commit und Datei) der Haken und die Anmerkung **gesperrt**: die Oberfläche zeigt den Grund an der Zeile, das Setzen wird abgelehnt, und das Ergebnis führt die Stelle unter „Ungeprüft“ mit dem Grund. Dieselbe Datei in einem anderen Commit, in dem ihr Diff lesbar ist, bleibt bedienbar — die Sperre gilt je Stelle, nicht je Name.

Was schon steht: Die Ablehnung beim Setzen für das Doppelgänger-Paar („Datei ist im Commit nicht eindeutig“, 400) kam mit der Nacharbeit zu R00011 (Karte #16) in den Code, ohne Anzeige und ohne Grund im Ergebnis. Neu sind: der zweite Fall (nicht übergebbar), **eine** gemeinsame Entscheidung für Diff und Haken, die Sperre im Stand und in der Oberfläche, der Grund im Ergebnis, der Zähler und die Anmerkung.

Zahlt ein auf: [Vision](R00000-vision.md) — „Der prüfende Mensch“ (sieht, was die KI geändert hat) und „Ergebnis als Rückkanal“ („Beenden“ nennt die Dateien, die ungeprüft bleiben; die KI erfährt, was der Mensch nicht lesen konnte).

Ändert [R00011](R00011-datei-abhaken.md) (Datei abhaken) und [R00010](R00010-zeile-annotieren.md) (Zeile annotieren); beide Dateien bleiben unverändert, die Änderungen stehen hier (Tabelle unter „Funktionale Anforderungen“). Setzt [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md) voraus (Karte #28, Ausgänge und Rohbytes der Namen). Gewählt ist die Form „sperren“ (Optionen unter „Notizen“); Entscheidung des product-owner 2026-11-24, `AI-Team/po-entscheidungen.md`, Zeile 85. Die fünf offenen Fragen und die Anmerkung bei unlesbarer Übersicht hat der product-owner am 2026-11-24 entschieden (Zeilen 87–92, Commit 02e432e; Übersicht unter „Entscheidungen des product-owner“); die Ergänzungen: „ (k nicht lesbar)“ nur bei k ≥ 1, auch in „Zusammen“ (R00012); bei einem abgelehnten Stapel-Haken bleiben die lesbaren Stellen in „Einzeln“ abhakbar.

## Geschäftlicher Nutzen

Der Angreifer ist der Autor des geprüften Commits: ein Name, der sich nicht an `git` übergeben lässt, versteckt den Inhalt einer Datei. R00013 macht daraus eine Meldung statt eines leeren Diffs. Ohne diese Anforderung bleibt der letzte Schritt offen: der Mensch sieht „Diff dieser Datei nicht lesbar“, hakt die Datei trotzdem ab (die Liste im Kopf zu führen ist genau, was der Haken ihm abnehmen soll), und die KI liest im Ergebnis „Abgehakt“ an einer Datei, die niemand angesehen hat. Mit der Sperre kann das Ergebnis die Datei nur als ungeprüft mit Grund nennen — die ehrliche Aussage.

## Funktionale Anforderungen

- **Sperrgründe** (genau zwei, Wortlaut fest): „Diff nicht lesbar: Name nicht eindeutig“ und „Diff nicht lesbar: Name nicht übergebbar“. Die Entscheidung trifft **dieselbe Regel** wie der Diff-Ausgang aus R00013 (Ablauf 2 dort: Treffer des Namens im Commit, Rohbytes mit LF oder CR, bei einer Umbenennung neuer **oder** alter Name); Diff und Sperre dürfen nie auseinanderlaufen. Sie ergibt sich allein aus der Übersicht der Dateien (R00011), nicht aus einem Lesen des Diffs — `git` wird für die Sperre nicht gestartet.
- **Je Stelle**: gesperrt ist (Commit, Name) nur dort, wo die Regel greift. Der Name `f⟨0xFF⟩.txt` ist in einem Commit mit dem Paar gesperrt und in einem Commit, der nur die wörtlich so benannte Datei ändert, bedienbar. Die Ablehnung eines Namens, der in dem Commit nicht vorkommt (auch `f�.txt`), bleibt wie in R00011.
- **Haken** (ändert R00011): Jede Anforderung zu einer gesperrten Stelle — setzen und entnehmen — wird abgelehnt (400, Meldung mit dem Sperrgrund, nichts gespeichert); sie nennt nie den Wortlaut der Anfrage. Der Stand (`GET /api/haken`) nennt je Stelle, ob sie gesperrt ist, und den Grund. Der bisherige Text „Datei ist im Commit nicht eindeutig“ weicht dem Sperrgrund.
- **Zähler** (ändert R00011): Eine gesperrte Stelle zählt in m, nie in n („Nicht lesbar“ ist nicht „gesehen“; „10 von 10“ wäre sonst nicht erreichbar oder falsch). Sind k ≥ 1 Stellen gesperrt, steht hinter dem Zähler „ (k nicht lesbar)“, etwa „1 von 10 abgehakt (3 nicht lesbar)“; bei k = 0 bleibt der Text wie in R00011. Dieselbe Ergänzung gilt, ebenfalls nur bei k ≥ 1, für den Zähler in „Zusammen“ (R00012: Wortlaut und Ort löst R00012 ab, die Ergänzung gilt dort mit; Zeile 88).
- **Ergebnis** (ändert R00011, Abschnitt `## Dateien`): Eine gesperrte Stelle steht immer unter „Ungeprüft“, nie unter „Abgehakt“, in der Zeile `- <Pfad> (Commit <voller Hash>) — <Sperrgrund>` (Gedankenstrich mit je einem Leerzeichen davor und danach; der Sperrgrund wörtlich, etwa „Diff nicht lesbar: Name nicht eindeutig“). Zeilen ohne Sperre bleiben Byte für Byte wie in R00011; ein Ergebnis ohne gesperrte Stelle ist unverändert. Der Abschnitt erscheint weiter erst ab dem ersten Haken (Entscheidung 2026-11-24, Zeile 63; Frage 1). Pfade stehen mit Marken wie dort.
- **Anmerkung** (ändert R00010): Das Anlegen einer Anmerkung an eine gesperrte Stelle wird abgelehnt (400, Meldung mit dem Sperrgrund, nichts gespeichert, keine Nummer verbraucht): eine Anmerkung `Datei:Zeile` an einem Namen, der zwei Dateien meint, würde die KI an die falsche Datei schicken. Die Prüfung nutzt dieselbe Übersicht wie der Haken und liest keine zweite. Lässt sich die Übersicht nicht lesen, bleibt das Anlegen wie bisher möglich (der Hot Path hängt nicht an ihr; die Oberfläche bietet an einer gesperrten Stelle ohnehin keine Zeile an, weil es keinen Diff gibt, R00013). Der Haken bleibt in diesem Fall fail-closed („Fortschritt konnte nicht gelesen werden“, Kriterium 7); entschieden in Zeile 92.
- **Oberfläche** (ändert R00011): In der Dateiliste ist das Kästchen einer gesperrten Stelle nicht bedienbar (Klick und Leertaste ändern nichts); neben der Zeile steht der Sperrgrund als Text, und der zugängliche Name des Kästchens beginnt weiter mit „Abgehakt: <Pfad>“ und nennt den Grund (Beschreibung). Die Datei bleibt wählbar (ihr Diff zeigt den Text aus R00013). Die übrigen Kästchen, Commit-Leiste und Diff bleiben bedienbar. Beim Wechsel von Commit und beim Neuladen gilt dieselbe Sperre aus dem Stand.
- **Grenze, ehrlich**: Die Sperre schließt aus, was nicht lesbar **ist**; sie weiß nicht, was der Mensch tatsächlich angesehen hat — eine lesbare Datei lässt sich weiter abhaken, ohne dass ihr Diff je geöffnet wurde (Haken ist die Aussage des Menschen, nicht des Programms). Endet das Lesen eines Diffs zur Laufzeit mit „nicht lesbar“ (500 aus der Zählprüfung, R00013 Kriterium 9), ist die Stelle nicht gesperrt und der Haken dort bedienbar (Frage 4, Zeile 90).

### Änderungen an R00010 und R00011 (Überblick)

| Stelle in der Vorgabe | Bisher | Neu |
|---|---|---|
| R00011, Funktionale Anforderung 2: „Jede Datei der Dateiliste ist abhakbar“ | ohne Ausnahme (im Code ausgenommen: das Paar) | außer einer gesperrten Stelle |
| R00011, Zähler „n von m abgehakt“ | nur n und m | bei k ≥ 1 gesperrten Stellen „ (k nicht lesbar)“ |
| R00011, Ergebnisformat `## Dateien`, Zeile je Stelle | `- <Pfad> (Commit <Hash>)` | bei gesperrter Stelle zusätzlich ` — <Sperrgrund>`; sonst gleich |
| R00011, „Abgelehnte Stellen“ (400) | Commit außerhalb der Auswahl, gekürzter Hash, Datei nicht im Commit, leere Eingabe | zusätzlich: gesperrte Stelle |
| R00010, Speichern (`POST /api/anmerkungen`) | Ablehnung nur nach Form, Auswahl, Zeile, Text | zusätzlich: gesperrte Stelle (400) |
| R00011, Kriterium 12 (Haken fällt bei 500 zurück) | gilt für jede Stelle | unverändert; eine gesperrte Stelle erreicht den Server nie (Kästchen gesperrt) |

### Vorgaben für Folgekarten (nicht Abnahme dieser Karte)

Diese Karte baut die Sperre vor den Stapel-Haken; die Folgekarten erben sie und tragen ihre eigenen Kriterien.

- **I0010 Zusammen: Logik und Server** — der Stapel-Haken über alle Stellen einer Datei geht durch dieselbe Prüfung wie der einzelne Haken. Enthält die Datei **irgendeine** gesperrte Stelle, wird der Stapel **ganz** abgelehnt, nichts wird gesetzt, der Grund wird genannt (atomar, Entscheidung Zeile 69; Frage 5, Zeile 91); die lesbaren Stellen der Datei bleiben in „Einzeln“ einzeln abhakbar. Beispiel für die Anforderung zu I0010: Aufruf `gitreviewA $n $v` aus der User Story; die Datei `f⟨0xFF⟩.txt` hat drei Stellen (zwei in `n` gesperrt, eine in `v` lesbar); der Stapel über die Datei ändert keinen Haken und nennt den Grund; `v` allein lässt sich in „Einzeln“ abhaken. Der Netto-Diff und die Zuordnung einer Anmerkung (jüngster Commit der Auswahl, der die Datei ändert) nehmen dieselbe Regel: ist die gewählte Stelle gesperrt, entsteht keine Anmerkung an die „falsche“ Datei. Der Netto-Diff selbst liest über den Weg aus R00013.
- **I0027 Oberfläche** — der Zähler in „Zusammen“ trägt bei k ≥ 1 „ (k nicht lesbar)“ (k Dateien; bei k = 0 ohne Zusatz, Zeile 88); der Haken im Diff-Kopf ist an einer gesperrten Datei ebenso gesperrt wie in der Liste (ein Zustand, ein Grund); ein abgelehnter Stapel-Haken nennt den Grund und lässt die lesbaren Stellen in „Einzeln“ bedienbar (Zeile 91).
- **I0025 / I0026** — „nächste ungeprüfte“ überspringt gesperrte Stellen (der Mensch kann sie nicht abhaken) und sagt am Ende „Alles Lesbare abgehakt, k nicht lesbar“, statt endlos auf ihnen zu landen; „Abgehakte zuklappen“ blendet sie nie aus (sie sind nie abgehakt).
- **I0018 Datei anmerken** — eine Datei-Anmerkung (`(ganze Datei)`) an einer gesperrten Stelle wird wie die Zeilenanmerkung abgelehnt.

## Nicht-funktionale Anforderungen

- Performance (Lastprofil der Vision): Die Sperre entsteht beim einmaligen Lesen der Übersicht und kostet je Anfrage eine Suche im Speicher; die Grenzen aus R00011 (Übersicht ≤ 2 s, Zähler ≤ 1 s nach dem Klick, „Beenden“ ≤ 1 s mit 2 000 Stellen) und R00010 (500 Anmerkungen) gelten unverändert; kein zusätzlicher `git`-Aufruf. Neuer Messwert ist nicht nötig; der Entwickler prüft, dass die Messungen aus R00011 Kriterium 15 und R00010 Lastprofil im Gesamtlauf grün bleiben.
- Sicherheit: Die Sperrgründe sind feste Texte und nennen nie den Namen aus der Anfrage; der Name im Ergebnis, in der Oberfläche und auf stderr steht mit Marken (`⟨0xFF⟩`, `⟨U+000A⟩`) wie in R00011 — dieselbe Funktion, keine zweite Zeichenliste (`AI-Team/gelerntes.md`, #17). Die Sperre lässt sich über die Schnittstelle nicht umgehen: jeder Weg, der einen Haken oder eine Anmerkung speichert, geht durch die Prüfung (Mutationsprobe unter „Tests“). Die Sperre ändert nichts an Anfrageschutz, Host-Prüfung und 409 nach „Beenden“.
- Benutzerfreundlichkeit: Gestaltung aus kanbanD und Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`), keine eigenen Vorgaben; der Grund steht als Text, nie nur als Farbe oder Symbol; die Sperre wird nicht „weggeklickt“ (kein Dialog, kein Ausweg in der Anwendung; den Diff im Terminal mit `git show` zu lesen steht nicht in der Oberfläche — bewusst, siehe Option D); die Datei bleibt wählbar, und der Diff-Bereich sagt, was los ist (R00013).
- Logging: je abgelehntem Haken und je abgelehnter Anmerkung eine Debug-Zeile auf stderr mit dem Grund (ohne Namen, wie bisher); kein neuer Fehlerpfad.

## Akzeptanzkriterien

Vorbereitung: **Repo N** aus [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md) (`user-stories/R00013.md`) um einen Commit `v` ergänzt (Skript in `user-stories/R00014.md`): `v` ändert nur die wörtlich so benannte Datei `f⟨0xFF⟩.txt` (zweite Zeile `literal2`); im Commit `v` steht diese Datei einmal in der Liste. Aufruf, wo nichts anderes steht: `gitreviewA $n $v --kein-browser`. Stellen: `n` 9 (`a⟨0xFF⟩.sh`, `b⟨0xFF⟩.bin`, `f⟨0xFF⟩.txt` wörtlich, `f⟨0xFF⟩.txt` mit Byte, `g.txt`, `in.txt`, `r⟨0xFF⟩.txt`, `t⟨0xFE⟩.txt`, `z⏎⟨0xFF⟩.txt`) und `v` 1 (`f⟨0xFF⟩.txt`), zusammen m = 10, davon **3 gesperrt**: das Paar in `n` („Name nicht eindeutig“) und `z⏎⟨0xFF⟩.txt` („Name nicht übergebbar“). Die Kriterien 1 bis 7 sind Integrationstests gegen den `DateiAbhakenInteractor` und den `ZeileAnnotierenInteractor` (Treiber in-process, echtes `git` im Wegwerf-Repo); Kriterium 8 ist die einzige Browser-Probe (Anzeige). Datei abhaken liegt nicht auf dem Hot Path.

### Sperren und Stand
- [ ] 1. (Abnahme-Probe des product-owner, wörtlich.) Gegeben Repo N, wenn der Mensch bei `f⟨0xFF⟩.txt` (Doppelgänger-Paar in `n`) oder bei `z⏎⟨0xFF⟩.txt` den Haken setzen will, dann ist das nicht möglich (abgelehnt, Meldung „Diff nicht lesbar: Name nicht eindeutig“ bzw. „… Name nicht übergebbar“, Zähler „0 von 10“), und das Ergebnis führt die Datei unter „Dateien“ als ungeprüft mit Grund (Kriterium 4; der Abschnitt steht, sobald ein Haken gesetzt ist, Frage 1); `a⟨0xFF⟩.sh` (nach R00013 lesbar) lässt sich abhaken („1 von 10“), ebenso `f⟨0xFF⟩.txt` in `v` („2 von 10“), und die Anforderung zum Entnehmen einer gesperrten Stelle (`abgehakt: false`) wird ebenfalls abgelehnt. *Ebene: Integration gegen den Interactor (Ausgang und Meldung; Endpunkt: 400).*
- [ ] 2. Gegeben Repo N und nichts abgehakt, wenn der Stand gelesen wird, dann nennt er 10 Stellen, `n` und `v` in dieser Reihenfolge, davon genau drei mit Sperrgrund — die beiden Zeilen des Paares „Name nicht eindeutig“, `z⏎⟨0xFF⟩.txt` „Name nicht übergebbar“ —, sieben ohne, und Abgehakt 0, Gesamt 10 (Rechnung: 9 + 1 = 10 Stellen, 2 + 1 = 3 gesperrt, 10 − 3 = 7 bedienbar). *Ebene: Integration gegen den Interactor.*
- [ ] 3. Gegeben Repo N, wenn man **jede** der zehn Stellen sowohl als Diff (Interactor `DiffLesen`) als auch im Stand ansieht, dann ist eine Stelle genau dann gesperrt, wenn der Diff mit dem Fehlerausgang „Name nicht eindeutig“ bzw. „Name nicht übergebbar“ endet, und der Grund stimmt überein; `b⟨0xFF⟩.bin` (binär) und `t⟨0xFE⟩.txt` (umbenannt) sind lesbar und nicht gesperrt (Abtastung der ganzen Menge, kein Beispiel). Gegeben eine Umbenennung, deren **alter** Name einen Zeilenumbruch und ein ungültiges Byte trägt und deren neuer Name lesbar ist, dann ist die Stelle gesperrt („nicht übergebbar“) — die Umbenennung entkommt der Sperre nicht über den neuen Namen. *Ebene: Integration (Abtastung über beide Interactors) und Unit (die gemeinsame Regel: Trefferzahl, Rohbytes neuer und alter Name).*

### Ergebnis
- [ ] 4. Gegeben Repo N mit `g.txt` in `n` abgehakt und ohne Anmerkung, wenn beendet wird, dann entspricht stdout Byte für Byte dem Beispiel unten (volle Hashes `n` und `v`) und der Prozess endet mit Exit-Code 0; keine gesperrte Stelle steht unter „Abgehakt“, jede Zeile einer gesperrten Stelle trägt ihren Grund, die anderen tragen keinen. Rechnung: 1 abgehakt, 3 gesperrt + 6 offene = 9 ungeprüft, 1 + 9 = 10. *Ebene: Unit (Formatierer mit dem Beispiel, dazu ein gesperrter Name mit U+202E, U+200B und U+E0041 steht mit Marken in genau einer Zeile) und Integration (Programm: Haken per Schnittstelle, Beenden, stdout).*
- [ ] 5. Gegeben Repo N und kein Haken gesetzt — ebenso ein gesetzter und wieder entnommener —, wenn beendet wird, dann entspricht stdout genau dem Ergebnis aus R00002 („Keine Anmerkungen.“ ohne Abschnitt „Dateien“), obwohl gesperrte Stellen vorkommen (entschieden, Zeile 87). *Ebene: Integration.*

```
## Dateien

Abgehakt: 1 von 10

- g.txt (Commit <n>)

Ungeprüft: 9 von 10

- a⟨0xFF⟩.sh (Commit <n>)
- b⟨0xFF⟩.bin (Commit <n>)
- f⟨0xFF⟩.txt (Commit <n>) — Diff nicht lesbar: Name nicht eindeutig
- f⟨0xFF⟩.txt (Commit <n>) — Diff nicht lesbar: Name nicht eindeutig
- in.txt (Commit <n>)
- r⟨0xFF⟩.txt (Commit <n>)
- t⟨0xFE⟩.txt (Commit <n>)
- z⟨U+000A⟩⟨0xFF⟩.txt (Commit <n>) — Diff nicht lesbar: Name nicht übergebbar
- f⟨0xFF⟩.txt (Commit <v>)
```

(Davor `# Ergebnis manueller Review`, Leerzeile, `Keine Anmerkungen.`, Leerzeile; Abschnitte durch genau eine Leerzeile getrennt, Ende mit einem Zeilenumbruch, Regeln aus R00011.)

### Anmerkung
- [ ] 6. Gegeben Repo N, wenn eine Anmerkung an `f⟨0xFF⟩.txt` in `n` (Zeile 1) angelegt werden soll, dann wird sie abgelehnt (400, Meldung „Diff nicht lesbar: Name nicht eindeutig“), die Liste der Anmerkungen bleibt leer und die nächste Nummer ist 1; eine Anmerkung an `a⟨0xFF⟩.sh` in `n` (Zeile 1) bekommt die Nummer 1 und eine an `f⟨0xFF⟩.txt` in `v` (Zeile 2) die Nummer 2; nach „Beenden“ nennt das Ergebnis genau `a⟨0xFF⟩.sh:1` und `f⟨0xFF⟩.txt:2`. Eine Anmerkung an `z⏎⟨0xFF⟩.txt` in `n` wird ebenfalls abgelehnt (400). *Ebene: Integration gegen den `ZeileAnnotierenInteractor` und Endpunkt (Statuscodes).*
- [ ] 7. Gegeben die Übersicht lässt sich nicht lesen (Fake der Übersichtsquelle wirft), wenn man `g.txt` in `n` annotiert und einen Haken setzen will, dann ist die Anmerkung angelegt (Nummer 1), der Haken wird mit „Fortschritt konnte nicht gelesen werden“ abgelehnt wie in R00011 Kriterium 13, und auf stderr steht die Fehlerzeile mit Kontext; „Beenden“ liefert das Ergebnis mit der Anmerkung und ohne Abschnitt „Dateien“. *Ebene: Integration (Fehlerpfad durch beide Interactors).*

### Anzeige
- [ ] 8. Gegeben Repo N im Browser, `n` gewählt, wenn man die Dateiliste ansieht, dann sind die Kästchen beider Zeilen `f⟨0xFF⟩.txt` und das von `z⏎⟨0xFF⟩.txt` nicht bedienbar (Klick und Leertaste ändern nichts), neben ihnen steht „Diff nicht lesbar: Name nicht eindeutig“ bzw. „… Name nicht übergebbar“, ihr zugänglicher Name beginnt mit „Abgehakt: “ und nennt den Grund, und über der Liste steht „0 von 10 abgehakt (3 nicht lesbar)“; wenn man `g.txt` abhakt, dann steht „1 von 10 abgehakt (3 nicht lesbar)“; wenn man zu `v` wechselt, dann ist `f⟨0xFF⟩.txt` dort bedienbar, und zurück in `n` sowie nach dem Neuladen sind die drei Kästchen wieder gesperrt; die Dateien bleiben wählbar (der Diff zeigt den Text aus R00013, nie „Keine Zeilenänderungen“), Commit-Leiste und Diff bleiben bedienbar. Bei `gitreviewA $b` (fünf Stellen, keine gesperrt) steht der Zähler ohne Zusatz („0 von 5 abgehakt“). *Ebene: E2E (Browser-Eigenes: Darstellung, Fokus, Wechsel und Neuladen; kein Hot-Path-Fall).*

Grenz- und Leerfälle bedacht: Wurzel-, Merge- und leerer Commit, Name mit `-` vorn und Leerzeichen laufen durch dieselbe Übersicht wie in R00011 und bleiben dort gedeckt; ein Name aus gültigem UTF-8 mit Zeilenumbruch (`y` aus R00011, Kriterium 7) bleibt abhakbar, denn sein Diff ist lesbar (Argument, R00013 Ablauf 3) — die bestehenden Tests dazu bleiben grün; „kein Doppelgänger, aber ungültiges Byte“ (`a⟨0xFF⟩.sh`) bleibt abhakbar (Kriterium 1). Verworfen als eigenes Kriterium: mehrere ungültige Bytes im Namen (derselbe Weg wie Kriterium 3); Sperre und „Beenden“ ≤ 1 s (Messung aus R00011 Kriterium 15 gilt unverändert); Haken nach „Beenden“ (409, R00011) für eine gesperrte Stelle (die Sperre kommt zuerst, derselbe Status 400 wie ohne Beenden — ein einziger Test beim Bauen genügt).

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) (Themenordner in `src/GitReviewA/`, Oberfläche unter `web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Haken/` — die gemeinsame Regel (Lesbarkeit je Stelle), `Dateiuebersicht` und `Stellenstand` erweitert, `HakenPruefer` und `DateiAbhakenInteractor`.
- `Anmerkungen/` — `ZeileAnnotierenInteractor` fragt die Übersicht.
- `Beenden/` — `ErgebnisFormatierer` (Zeile mit Grund).
- `Diff/` — nur Anschluss an die gemeinsame Regel (aus R00013).
- `web/` — Kästchen und Zählertext (`haken.js`, `haken-werte.js`, `dateiliste.js`), Stil nach `gitreviewa.css`.
- `tests/GitReviewA.Tests/Akzeptanz/` — Treiber und Sprache wie `DateiAbhakenFremdeBytesTests`; `e2e/` — ein Spec für Kriterium 8, Wegwerf-Repo N um `v` erweitert.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden und wie die Klassen heißen, entscheidet der Entwickler beim Bauen; die Namen aus R00013 (`Namensfall`, Rohbytes an der Dateiänderung) sind Vorplanung und gelten, wie sie dort gebaut werden.

### Ablauf

1. **Eine Regel für „lesbar“** (neu, rein): Trefferzahl des Namens im Commit, Rohbytes des neuen und alten Namens → `Lesbar` | `NameNichtEindeutig` | `NameNichtUebergebbar`. Der Diff-Ausgang (R00013 Ablauf 2) und die Übersicht rufen sie auf; wo R00013 die Regel schon als `Namensfall` gebaut hat, wird sie erweitert, nicht verdoppelt.
2. **Übersicht** trägt je Stelle die Lesbarkeit (aus den Rohbytes, die der gemeinsame Teilparser behält, R00013 B1201); gelesen einmal, im Speicher.
3. **Haken** (`POST /api/haken`): Form prüfen → Stelle gegen die Übersicht → bei gesperrter Stelle ablehnen (Ausgang `Ungueltig`, 400, Sperrgrund) → sonst wie bisher. Entnehmen und Setzen gehen durch denselben Weg.
4. **Stand** (`GET /api/haken`): je Stelle Commit, Datei, abgehakt und Sperrgrund (leer oder Text); Abgehakt und Gesamt wie bisher.
5. **Anmerkung** (`POST /api/anmerkungen`): nach der Formprüfung die Stelle in der gemerkten Übersicht nachschlagen; gesperrt → 400 mit Sperrgrund; Übersicht nicht lesbar → wie bisher anlegen (Kriterium 7).
6. **Ergebnis**: der Stand liefert den Sperrgrund je Stelle; der Formatierer hängt ihn an die Zeile unter „Ungeprüft“.
7. **Oberfläche**: die Dateiliste liest den Stand (R00011), zeichnet gesperrte Kästchen mit Grund und trägt „ (k nicht lesbar)“ an den Zähler.

### Grobentwurf

**Einstiegsstellen:** `DateiAbhakenInteractor` (Haken und Stand), `ZeileAnnotierenInteractor` (Anmerkung), `ErgebnisFormatierer` (Zeile), Dateiliste und Fortschrittszeile in `web/`.

- `Lesbarkeit` (Operation, rein) — die Regel aus Ablauf 1; `Stellenlesbarkeit Beurteile(int trefferImCommit, Rohname neu, Rohname? alt)`; ein Ort, den Diff und Haken teilen.
- `Dateiuebersicht` (benannte Collection, erweitert) — `Stellenlesbarkeit Lesbarkeit(Stelle stelle)`; ersetzt `IstEindeutig`.
- `Stellenstand` (DTO, immutable, erweitert) — um `Sperrgrund` (leer, wenn lesbar).
- `DateiAbhakenInteractor` (Interactor, erweitert) — `Setze` lehnt eine gesperrte Stelle ab; `Stand`, `Ergebnisstand` tragen den Grund; stellt der `ZeileAnnotierenInteractor` die Frage „ist diese Stelle gesperrt?“ über eine schmale Schnittstelle (`IStellenpruefung`), nicht über den ganzen Interactor.
- `ZeileAnnotierenInteractor` (Interactor, erweitert) — `LegeAn` fragt `IStellenpruefung`; Ausfall der Übersicht → keine Sperre (Kriterium 7).
- `ErgebnisFormatierer` (Operation, rein, erweitert) — Zeile mit ` — Diff nicht lesbar: <Grund>` für Stellen mit Sperrgrund.
- JS: `haken-werte.js` (rein: Zähltext mit „ (k nicht lesbar)“), `haken.js` und `dateiliste.js` (Kästchen gesperrt, Grund als Text und Beschreibung).

### Änderungen an bestehenden Klassen

`Dateiuebersicht` (`IstEindeutig` geht in die Regel auf), `HakenPruefer.GehoertZurAuswahl` (Grund aus der Regel), `Dateienstand.Aus` (Sperrgrund je Stelle), `HakenstandAntwort` und `Stellenstand` (neues Feld), `ErgebnisFormatierer.DateiAbschnitte`, `ZeileAnnotierenInteractor`-Konstruktor (Prüfung der Stelle), Host-Aufbau (beide Interactors teilen eine gemerkte Übersicht; `GemerkteUebersicht` wird geteilt, nicht doppelt gelesen), `haken-werte.js`, `haken.js`, `dateiliste.js`, `gitreviewa.css`. Der bestehende Test `DateiAbhakenFremdeBytesTests.Wenn_ein_Name_woertlich_wie_die_Bytemarke_heisst…` ändert seine Erwartung (Meldung und Zeile mit Grund) — ausdrücklich Teil dieser Anforderung, kein Rückschritt.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction, Akzeptanzkriterien als NUnit-Integration gegen den Interactor (Treiber in-process); Playwright nur für die Anzeige der Sperre (Kriterium 8, Browser-Eigenes, kein Hot Path).

**Unit (rein):** die gemeinsame Regel (Trefferzahl 0, 1, 2; Rohbytes ohne und mit LF oder CR; alter Name mit LF und lesbarer neuer Name), `ErgebnisFormatierer` (Beispiel aus Kriterium 4, Zeile mit Grund, ohne Sperre unverändert, gesperrter Name mit U+202E, U+200B, U+E0041), `haken-werte.js` (Zähltext bei k = 0, 1, 3).
**Integration:** Kriterien 1 bis 7 gegen die Interactors mit echtem `git` im Wegwerf-Repo N plus `v`; Endpunkte (400 für Haken und Anmerkung); Programm als Prozess (Beenden mit Sperre, stdout/stderr getrennt). Mutanten: Sperrprüfung im Haken aus → Kriterium 1 rot; Sperrprüfung in der Anmerkung aus → Kriterium 6 rot; Sperrgrund im Formatierer aus → Kriterium 4 rot; Regel „nicht übergebbar“ nur auf den neuen Namen → Kriterium 3 rot; Regel der Übersicht weicht von der des Diffs ab (zwei Kopien, eine geändert) → Kriterium 3 rot — deshalb **eine** Regel, nicht zwei.
**E2E:** ein Spec für Kriterium 8; Wegwerf-Repo N (gebaut mit `git` und `python3`/`printf`, nur Linux) um `v` erweitert; Fehlerpfad „Stand nicht lesbar“ bleibt in R00011 Kriterium 13.

## Abhängigkeiten

- Abhängig von: I0016 Datei abhaken (R00011, grün), I0017 Zeile annotieren (R00010, grün), I0029 Diff bei Name mit ungültigem Byte (R00013; Karte #28, im Bau — **erst nach deren Merge bauen**, die Regel und die Rohbytes kommen von dort).
- Blockiert: I0010 Zusammen: Logik und Server (Stapel-Haken erbt die Sperre; Reihenfolge: nach #28, vor I0010), I0027 Oberfläche (Zähler, Haken im Diff-Kopf), I0025 und I0026 (Umgang mit gesperrten Stellen), I0018 Datei anmerken (Sperre auch dort).

Nicht Teil dieser Anforderung: Lesbar-Machen der Namen (Option C aus R00013, eigener Stellen-Schlüssel), ein bewusster Ausweg „außerhalb gelesen“ (Option D unten), Sperre aus der Laufzeit (500 beim Diff-Lesen), Sperre für zu große oder binäre Diffs (sie sind über „Trotzdem laden“ bzw. „Als Text zeigen“ lesbar), Windows und macOS (Entscheidung Zeile 86).

## Offene Fragen

Keine offen. Der product-owner hat alle fünf Fragen am 2026-11-24 nach der Empfehlung des planers entschieden (`AI-Team/po-entscheidungen.md`, Zeilen 87–92, Commit 02e432e). Der Bau ist nicht blockiert.

## Entscheidungen des product-owner

Quelle: `AI-Team/po-entscheidungen.md`, Zeilen 87–92, Commit 02e432e, Stand 2026-11-24.

| Frage | Entscheidung | Zeile | Wirkung auf diese Anforderung |
|---|---|---|---|
| 1. Abschnitt „Dateien“ auch ohne Haken, wenn gesperrte Stellen vorkommen? | **Nein.** Der Abschnitt erscheint ab dem ersten gesetzten Haken (Zeile 63); ohne Haken, auch nach entnommenem, bleibt das Ergebnis wie in R00002. Ehrlich dünn: „weder Haken noch Anmerkung“ bleibt für die KI mehrdeutig; „Abschnitt immer“ wäre eine Format-Entscheidung des Betreibers | 87 | Ergebnis (Funktionale Anforderung), Kriterium 5 (bedingte Klausel „gilt Frage 1 anders“ entfällt) |
| 2. Zählen gesperrte Stellen in m? | **Ja**, nie in n; „ (k nicht lesbar)“ **nur bei k ≥ 1**, k = 0 unverändert; gilt auch für den Zähler in „Zusammen“ (R00012). Geltung: Zähler in Liste, „Beenden“-Abfrage und Ergebnis | 88 | Zähler (Funktionale Anforderung), Vorgabe I0027; Kriterium 8 deckt k = 3 und k = 0 bereits |
| 3. Zeilenform im Ergebnis | **Anhang** ` — Diff nicht lesbar: <Grund>` an die Zeile unter „Ungeprüft“, keine eigene Liste; Zeilen ohne Sperre Byte für Byte wie in R00011 | 89 | Ergebnis, Kriterium 4 und Beispiel (unverändert) |
| 4. Sperre auch bei Lesefehler zur Laufzeit (500, R00013 Kriterium 9)? | **Nein.** Die Sperre entsteht allein aus der Übersicht; der Haken bleibt dort bedienbar | 90 | „Grenze, ehrlich“, „Nicht Teil dieser Anforderung“ (unverändert) |
| 5. Stapel-Haken (I0010) bei teilweise gesperrter Datei | **Ganz ablehnen**, nichts setzen, Grund nennen; **die lesbaren Stellen bleiben in „Einzeln“ einzeln abhakbar**. Geltung: I0010 Stapel, I0027 Haken im Diff-Kopf | 91 | Vorgaben für Folgekarten (I0010, I0027); keine Kriterien dieser Karte |
| Anmerkung bei unlesbarer Übersicht (zur Kenntnis) | **Anmerkung fail-open**, **Haken fail-closed** („Fortschritt konnte nicht gelesen werden“) | 92 | Anmerkung (Funktionale Anforderung), Kriterium 7 (unverändert) |

Die Kriterien 1 bis 4 und 6 bis 8 bleiben wortgleich; Kriterium 5 verliert nur die bedingte Klausel, weil die Frage entschieden ist (Inhalt unverändert).

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 6 Bubbles unterhalb I0030 (B1301–B1306), davon 3 klar (2 h) und 3 unklar (2–4 h) — Untergrenze 12 h, obere Schätzung 18 h. Enthalten: nur I0030; die Vorgaben für I0010, I0027, I0025, I0026 und I0018 sind nicht gezählt. Nicht beauftragt: Option D (Ausweg „außerhalb gelesen“) und Option C aus R00013.

## Warum löst diese Anforderung das Problem?

Auslöser: Nach R00013 meldet gitreviewA für eine Datei, deren Name sich nicht an `git` übergeben lässt, „Diff nicht lesbar“ statt eines leeren Diffs — aber der Haken und die Anmerkung bleiben offen, und im Ergebnis stünde `Abgehakt`. Zielbild: Die KI erfährt aus dem Ergebnis genau, was der Mensch nicht lesen konnte, und der Mensch kann sich nicht selbst täuschen. Kette: Die Übersicht kennt je Stelle die Lesbarkeit aus derselben Regel wie der Diff (Kriterium 3) → ein Haken oder eine Anmerkung an einer unlesbaren Stelle wird abgelehnt und im Kästchen mit Grund gezeigt (Kriterien 1, 6, 8) → „Beenden“ führt die Stelle unter „Ungeprüft“ mit dem Grund (Kriterium 4), und der Zähler erreicht „alle“ nie, solange eine Stelle unlesbar ist (Kriterium 8). Der Hebel ist die **Stelle** (Commit und Name), an der alle Pfade der Zustimmung zusammenlaufen — Haken, Stapel-Haken, Anmerkung und Ergebnis —, und die **eine** Regel: wer sie dort setzt, hat die Zusammen-Ansicht (I0010, I0027) schon geschützt, bevor sie gebaut ist; eine Prüfung nur in der Oberfläche wäre der Weg, den die Schnittstelle nicht kennt.

## Missing-Docs

- Barrierefreiheit eines nicht bedienbaren Kästchens mit Grund: `disabled` nimmt es aus der Tab-Reihenfolge (der Grund bliebe für Tastatur und Screenreader unauffindbar); `aria-disabled="true"` hält es fokussierbar und ändert beim Betätigen nichts. Kleiner Versuch vor dem Bauen (Skript mit Screenreader-Name und Tab-Folge, wie bei R00011 Missing-Docs); das Verhalten steht in Kriterium 8, die Wahl des Attributs beim Entwickler.
- Wie R00013 die Regel und die Rohbytes tatsächlich benennt und wo sie liegen (Karte #28 noch nicht gemerged): vor dem Bau auf `main` lesen und die Namen dieser Anforderung abgleichen.

## Notizen

- Priorität: Vorrang (Karte #29, Label `sicherheit`); Abnahme-Probe des product-owner ist Kriterium 1 wörtlich.
- Weiche (planer, `befunde-einplanen`): kein `aus-bug`. Der Bau von R00011 und R00010 hält seine Zusagen; erst R00013 schafft den Zustand „Diff nicht lesbar“, für den beide nichts sagen, und die Zusage „jede Datei ist abhakbar“ muss dadurch **enger** werden. Das ist fehlendes Verhalten (neue Interaction I0030, `/anforderung neu`), keine falsch gebaute Zusage. R00011 und R00010 bleiben, wie sie sind; die Änderungstabelle steht oben.
- Beobachtung (nicht Teil dieser Karte, kein Befund): `AnmerkungsPruefer` prüft den Namen der Datei nur auf Form (nicht leer, nicht zu lang, keine Steuerzeichen), nicht gegen die Übersicht; eine Anmerkung an einen Namen, den der Commit nicht kennt, wird angenommen (R00002 legt das so fest: „Die Stelle ist die Aussage des Aufrufers“). Kriterium 6 schützt nur Namen, die die Übersicht kennt und sperrt. Wer das auch schließen will, braucht einen eigenen Beschluss (Anmerkung gegen Übersicht prüfen, ein `git`-Aufruf beim ersten Anlegen); Empfehlung: nicht jetzt.
- Der Name der Sperrgründe ist absichtlich der von R00013 („Name nicht eindeutig“, „Name nicht übergebbar“) mit der Vorsilbe „Diff nicht lesbar: “; die Oberfläche in R00013 sagt für beide „Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)“ — dieselbe Sache in der Mitte des Diff-Bereichs, hier der kürzere Grund an der Zeile.

### Optionen (Form der Sperre)

PO-Entscheidung Zeile 85 nennt „gesperrt“ und lässt die Form als Optionen offen („sperren oder warnen“). Aufwand: A gezählt (6 Bubbles), B bis D Hypothese (Annahme: A plus ein Bestätigungsschritt, einen weiteren Zustand im Ergebnis, ungemessen).

| | Option | Täuschung möglich? | Bedienung | Aufwand | Testbarkeit | Reversibilität |
|---|---|---|---|---|---|---|
| A | **Sperren** (Haken und Anmerkung abgelehnt, Kästchen gesperrt mit Grund, Ergebnis „ungeprüft mit Grund“) | nein: nie „abgehakt“ ohne lesbaren Diff | wer die Datei im Terminal gelesen hat, kann sie in der Anwendung nicht abhaken; der Grund steht an der Zeile | 6 Bubbles, 12–18 h (gezählt, ungemessen) | Zustand je Stelle, eindeutig; Abtastung der ganzen Menge | trivial: Sperre aufheben ist eine Zeile |
| B | **Warnen** (Haken nach Bestätigung „Diff nie gelesen — trotzdem?“, Ergebnis „abgehakt“) | ja, nach einem Klick; das Ergebnis behauptet „gesehen“ | ein Dialog je Datei | A plus Dialog, Hypothese 8 Bubbles | Dialog und Ergebnis, zwei Zustände je Stelle | mittel |
| C | **Nur im Ergebnis kennzeichnen** (Haken frei, Ergebnis „abgehakt, Diff nicht lesbar“) | ja: der Mensch hakt wie bisher, die KI liest den Vermerk | nichts ändert sich für ihn | Hypothese 4 Bubbles | gering | trivial |
| D | **Sperren mit Ausweg „außerhalb gelesen“** (zweiter Zustand je Stelle, eigener Abschnitt im Ergebnis) | nein, wenn der Ausweg ausdrücklich im Ergebnis steht | der Mensch kann die Terminal-Lesung melden | A plus Zustand, Abschnitt, Oberfläche: Hypothese 9 Bubbles | drei Zustände je Stelle | mittel: ändert das Ergebnisformat |

**Empfehlung: A.** Die Vision will, dass der Mensch sieht, was geändert wurde, und dass die KI erfährt, was er nicht sehen konnte; B und C lassen „abgehakt“ an einer Datei zu, deren Inhalt nie angezeigt wurde (dieselbe Täuschung, die die Entscheidung vom 2026-11-24 benennt), D ist ehrlich, kostet aber ein neues Format. A ist die kleinste Form, die den Haken wieder wahr macht; D ist als spätere Ausbaustufe möglich, wenn der Betrieb zeigt, dass Menschen die gesperrten Dateien im Terminal lesen und das melden wollen (dann Format-Entscheidung des Betreibers).

### Verworfene Alternativen

- B (Warnen) — verworfen: ein Haken nach Bestätigung bleibt die Aussage „gesehen“ an einer ungesehenen Datei.
- C (nur im Ergebnis kennzeichnen) — verworfen: die Anzeige im Programm bleibt die Täuschung, und der Zähler erreicht „alle“.
- D (Ausweg „außerhalb gelesen“) — verschoben: zusätzlicher Zustand und neues Ergebnisformat ohne beauftragten Bedarf.
- Sperre in der Oberfläche allein — verworfen: die Schnittstelle (Stapel-Haken, Anfragen von außen) kennt sie nicht; die Sperre gehört an die Stelle, an der der Haken gespeichert wird.
- Sperre aus dem Lesen des Diffs (Zustand der Oberfläche) — verworfen: der Server weiß nicht, was der Browser zeigte; die Regel aus der Übersicht ist deterministisch und braucht keinen `git`-Aufruf (Frage 4).
- Gesperrte Stellen aus m herausnehmen — verworfen (Frage 2).
- Bubbles „Datenmodell/Endpunkt/Oberfläche“ als eigene Slices — verworfen: schneidet nach Schichten; ein Slice, sechs Bubbles.
