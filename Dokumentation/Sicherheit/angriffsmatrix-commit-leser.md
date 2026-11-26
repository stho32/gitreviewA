# Angriffsmatrix R00048 (Karte #60) — Commit-Leser: Feldtrenner im Commit und Ausgabegrenze an jedem git-Lesepfad

Geschrieben vom security-reviewer **vor dem Bau** (2026-11-26); der Entwickler baut Test zuerst gegen diese Matrix. Sie beschreibt die **Klasse**
(fremde Bytes im Commit verschieben Felder; ein Leseweg ohne Zähler bindet Speicher), nicht das gemeldete Beispiel. Stand „heute“: Zweig `karte/60`
(`a44781e`, Code wie `1b405a3`); Proben mit git 2.48.1 im Wegwerf-Repo (Ablage `srev-60`, Repo F des planers plus Commits `c1`–`c8` über
`git hash-object -t commit -w --literally`), die Anwendung selbst wurde nicht neu gebaut: „heute“ stammt aus den Proben des planers an `1b405a3` (R00048) und aus
eigenen git-Proben; `n.g.` = nicht geprobt (Unit am Code lesbar).

## Schutzziel, Akteure, Linien

**Schutzziel.** (1) Autor, Datum, Betreff und Message eines Commits erscheinen genau so, wie git sie ausgibt — kein Byte im fremden Commit verschiebt ein
Feld, erzeugt einen Datensatz oder lässt Felder fehlen. (2) Jede Lesung aus dem fremden Repo ist an **einer** Stelle begrenzt: über der Grenze ganz oder gar
nicht, sichtbar, nie still gekürzt, Arbeit und Speicher höchstens Grenze plus ein Puffer. (3) Die fremde Konfiguration ändert weder Format noch Inhalt.
(4) stdout bleibt in jedem Ausgang leer; stderr trägt eine Zeile und keinen rohen fremden Text.

**Akteure.** A0 berechtigt (Kontrolle) · A3 Autor des fremden Repos (Commit-Kopf, Message, `.git/config`, Objekte) · A1 aufrufende KI oder Mensch (Auswahl, stdin).
**Linien.** U Unit (Zerleger, Format) · I Integration (Interactor/Endpunkt in-process, Wegwerf-Repo, kleine Grenze als Testparameter) · P Prozess (echte Instanz,
Exit-Code, stdout/stderr getrennt, Start auch über `bash -c '… &'`, Lehre #21, und aus einem Unterordner, Lehre #6). Kein vorgelagerter Server: keine Linie L3.

**Spalte „heute“** = Stand vor dem Bau (`a44781e`). Der Stand nach dem Bau (`a5c359b`) steht am Ende im Abschnitt „Stand nach dem Bau“.

**Kontrollpaar:** K1 und K2 müssen heute und danach dasselbe liefern; sonst misst keine Zeile.

Legende `Kriterium`: Nummer aus R00048, `Test-Strategie` = Abschnitt Regressionstests ohne eigene Nummer, **LÜCKE Ln** = Kriterium fehlt (Vorschlag unten).
`heute`: geprobt = gemessen; `grün` = schützt der Bestand schon (Regression bleibt drin).

## A. Kontrolle

| # | Variante | Leser/Weg | Erwartet | Ebene | Kriterium | heute |
|---|---|---|---|---|---|---|
| K1 | Repo F, Commit `p` (nur ASCII) und Umlaute/Emoji im Betreff, Rumpf mit zwei Absätzen | alle drei Wege | Felder wie git sie gibt, Rumpf ohne das letzte LF, Mehrzeiler erhalten | I | 1 (Gegenprobe) | grün |
| K2 | 1 000 Commits mit je 1 KiB Message (Spanne unter der Grenze); 1 001 Commits im Bereich | Start | 1 000 starten mit ganzer Message; 1 001 weiter von `Auswahlgrenze` abgewiesen (unverändert) | I | 5, Test-Strategie | grün (n.g.) |
| K3 | Message knapp unter der Grenze (Testgrenze 4 KiB, 3 KiB), Dateiliste knapp unter der Grenze | Start, Dateiliste | ganz gelesen, nichts gekürzt (die Spanne misst „Grenze × 0,5“ und „ignoriert“) | I | 5, 6 | grün (n.g.) |

## B. Feldtrenner in Autor, Betreff, Rumpf (Leser: Commit-Angaben, alle drei Wege: Einzelcommits/stdin, ein Bereich, mehrere Bereiche)

Jede Zeile läuft gegen **alle drei Wege**; der Test der Wege teilt den Zerleger nicht, sondern ruft den Interactor auf (Pflichtpunkt 5).

| # | Variante | Erwartet | Ebene | Kriterium | heute |
|---|---|---|---|---|---|
| F1 | 0x1F im Autor (`Anna␟Beispiel`) | Autor `Anna␟Beispiel`, Datum, Betreff, Rumpf unverschoben | U+I | 1, 2 | **rot** (Autor `Anna`, Datum `Beispiel`), geprobt am Interactor und über `GET /api/commits` |
| F2 | 0x1F im Betreff und im Rumpf (`Betreff␟mit Trenner`, `Rumpf␟mit Trenner`) | Betreff und Rumpf getrennt, 0x1F bleibt im Wert | U+I | 1 | **rot** (Betreff ins Rumpffeld verschoben) |
| F3 | 0x1E in Autor, Betreff, Rumpf (`Bernd␞Beispiel`, `Zweiter␞`, `Zeile eins␟␟`/`Zeile zwei`) | unverschoben; 0x1E ist kein Trenner | U+I | 2 | grün (geprobt, u). Bleibt als Regression: Mutant „Zerleger trennt auch an 0x1E“ muss rot werden |
| F4 | 0x1F und 0x1E zugleich, am Anfang und am Ende jedes Felds; ein Feld nur aus `␟` | unverschoben, kein Feld verschwindet | U | 1 (Test-Strategie Unit) | n.g. (rot, F1) |
| F5 | NUL in der Message (`z`: `Vor dem NUL␀danach`) | Start läuft, Betreff `Vor dem NUL`, Rumpf leer, Autor und Datum unverschoben | I | 3 | grün (geprobt: git schneidet, 5 NUL je Commit) |
| F6 | NUL im Autorkopf (`author Nul␀Name <…>`) | Start läuft, genau ein Commit, Felder unverschoben, **Autor leer** | U+I | Test-Strategie („leerer Autor“); Datum: **LÜCKE L2** | git gibt `%an` leer und das **Datum als wörtlichen Text `%aI`** aus (geprobt, c2): die Leiste zeigt „%aI“ als Datum |
| F7 | NUL im Rumpf **nach** einem gültigen Betreff (`B␀` im zweiten Absatz) | Rumpf an der Stelle des NUL abgeschnitten, keine weiteren Datensätze | U+I | 3 | grün (geprobt, `z`: git schneidet am ersten NUL der ganzen Message) |
| F8 | NUL **durch Umkodierung**: `encoding UTF-16LE` mit NUL-Bytes, `encoding UTF-7` mit `+AAA-` (U+0000) in Autor, Betreff, Rumpf | genau 5 NUL je Commit, Felder unverschoben (git schneidet vor dem Umkodieren oder lehnt ab) | I | **LÜCKE L3** (Klasse „Bytes, die erst nach der Umkodierung ein Trenner werden“, in R00048 nicht genannt) | grün (geprobt, c3 UTF-16LE: Rumpf `A`, c6 UTF-7: Rohtext, c7 ohne NUL: 5 NUL); als Regression fordern |
| F9 | `encoding ISO-8859-1` mit `é`, 0x1F, 0x1E, 0xFF | Ausgabe UTF-8 (`--encoding=UTF-8`), Trenner bleiben Werte | I | 1 (Gegenprobe) | grün (geprobt, c4) |
| F10 | Ungültiges UTF-8 in der Message ohne `encoding`-Kopf: `C0 80` (überlanges NUL), `ED A0 80` (Surrogat), `FF` | der Decoder (`Utf8MitBytemarken`) liefert Marken `⟨0xC0⟩`, **nie** U+0000, U+001F, U+001E; Felder unverschoben | U | Test-Strategie (Unit, Zerleger auf dem **dekodierten** Text) | n.g. (Decoder-Bestand, Marken im Quelltext) |
| F11 | CR im Autor, CRLF im Betreff und im Rumpf | unverschoben; CR bleibt im Wert, `%s` fasst CRLF zusammen (geprobt, c1: Betreff `Betreff`), Rumpf `Rumpf\r\nzwei` | U+I | Test-Strategie | grün (geprobt) |
| F12 | Leere Felder in jeder Stellung: leere Message (c5), leerer Autor, leerer Betreff, alles leer | je Commit 5 Felder, Position stabil; Zerleger darf **leere Teile nicht verwerfen** (`RemoveEmptyEntries` auf der NUL-Folge würde jedes leere Feld löschen und alle folgenden verschieben) | U | Test-Strategie („leerer Rumpf, leerer Autor“) | n.g. (neue Funktion; im Bestand verwirft `Zerlegen` leere **Datensätze** und darf das auch nur dort) |
| F13 | Zerleger bekommt Unsinn: Teilzahl nicht durch 5 teilbar, Hash mit 39 oder 41 Hexziffern, Hash mit Großbuchstaben/Leerraum/`\n` davor, leere Ausgabe, nur ein NUL | leere Ausgabe → keine Commits; sonst `GitFehler` mit **einer** Zeile, ohne Feldinhalt (nur Längen, wie im Bestand) | U | Test-Strategie | grün für Teilzahl (Bestand prüft `< 5`), n.g. für Hashform |
| F14 | Zwei Commits, bei denen der erste Rumpf mit LF endet und der zweite Hash mit Leerraum beginnen könnte (Rumpf endet auf `\n`, Hash folgt nach NUL) | Rumpf `TrimEnd('\n')` nimmt nur LF vom Ende des **Felds**; Hash des Folgecommits bleibt unberührt | U | Test-Strategie | n.g. |
| F15 | Zwei Commits mit gleicher Sekunde und gleichen Feldern, nur Hash verschieden | Reihenfolge wie bisher (Auswahl-/Neueste-zuerst-Regel), nichts doppelt | I | Test-Strategie (Lehre #2) | grün (n.g.) |

## C. Größe, Abbruch, Speicher (Leser je Zeile der Tabelle in R00048, Ursachenanalyse: zehn Zeilen)

Alle Zeilen mit **kleiner Grenze als Testparameter** (4 KiB), der Produktwert 8 MiB in genau einem Prozesstest je Weg.

| # | Variante | Erwartet | Ebene | Kriterium | heute |
|---|---|---|---|---|---|
| G1 | Message 9 MiB (`g`), Auswahl `g`, `u..g`, `g` über stdin, `t u g` (gemischt) | Exit 2, kein Server (Port nicht offen), stdout 0 Byte, stderr genau eine Zeile mit „8 MiB“, nicht „nicht auflösbar“; `t u` startet weiter | I+P | 4 | **rot** (Start läuft, 9 437 183 Zeichen Message) |
| G2 | Zwei Messages 20 MiB + 6 MiB (27 MB) | wie G1; Speicher-Spitze (VmHWM) des Prozesses ≤ 128 MiB (grobe Schranke, keine enge Marge) | P | 4; **LÜCKE L4** (Speicher des Prozesses, nicht nur die gezählten Bytes) | **rot**: 514 652 kB, geprobt |
| G3 | Grenze genau erreicht: Ausgabe = Grenze, = Grenze + 1 | Grenze selbst gelesen, +1 → „zu groß“ (Spanne, Mutanten „ignoriert“, „× 2“, „/ 2“) | I | 5 | n.g. (rot) |
| G4 | Zu große Auswahl **mehrere Bereiche** `p..t p..u` mit großer Message in `t` | wie G1 | I | 4 (Satz „dasselbe gilt für `u..g`“; mehrere Bereiche fehlen dort als Beispiel) | n.g. (Code Z. 486 ohne Grenze, also rot) |
| G5 | **Zwei Bereiche weit auseinander**: Auswahl 2 × 10 Commits (33 KB), dazwischen 2 900 Commits mit je 3,2 KiB Message in einem Repo | startet; „zu groß“ nur, wenn die **Auswahl** über der Grenze liegt. Der Leseweg `LeseNeuesteZuerst` liest den Verlauf von den Spitzen bis zum gemeinsamen Vorfahren der **Anfänge** (nicht die Auswahl) | I | **LÜCKE L1** | geprobt: dieselbe Lesung liefert 9 743 233 Byte (> 8 MiB) für eine Auswahl von 20 Commits; nach dem Fix würde sie fälschlich abgewiesen, heute liest sie 9,7 MB ungebremst |
| G6 | Dateiliste je Commit: 200 Dateien × 46 Zeichen, Grenze 4 KiB (Repo W); Commit mit 100 000 Dateien bei Produktgrenze | Fehlerzustand mit Grund „zu groß“ und Grenze, nie leer, nie „Keine Dateien geändert“; Nachbar-Commit bleibt lesbar; HTTP-Status des Endpunkts ist der bestehende Fehlerstatus, nie 500 ohne Text | I | 6 | n.g. (Code: `AusfuehrenAlsBytes` ohne Grenze, also rot) |
| G7 | Ansicht „Zusammen“: Merge mit 120 Eltern (Elternfolge), Netto-Dateiliste, Übersicht — **je Leser einzeln** über der Grenze, die anderen darunter | Zusammen im Fehlerzustand „zu groß“; Abhaken von Dateien des Commits abgelehnt; Ergebnis nennt Zitate als nicht lesbar; Grund unterscheidet „zu groß“ von „nicht lesbar“ | I | 7 | n.g. (Code ohne Grenze, also rot) |
| G8 | Tabellentest aller zehn Leser (Start, Elternfolge, Netto, Dateiliste, Übersicht, Diff-Attribut, Wurzel, nacktes Repo, Hash auflösen, merge-base) mit Grenze unter der Ausgabe | jeder endet „zu groß“; gezählte Bytes ≤ Grenze + 80 KiB; **danach kein git-Prozess mehr** (`/proc`, Kinder gezählt) | I | 8 | n.g. (sieben Leser ohne Grenze, Code gelesen, also rot) |
| G9 | Abbruch **beim Lesen**: git schreibt endlos (`yes`-artige Ausgabe über Test-`git` im `PATH`/Attrappe) bei Grenze 4 KiB; git blockiert **ohne** Ausgabe (hängender Leser) | Prozess nach höchstens Grenze + Puffer beendet (Kill samt Kindern); keine Zombies; im zweiten Fall bleibt die Frist Sache von R00017 Frage 3 (eigene Karte) | I | 8 | n.g. (Code: `ReadToEnd`/`CopyTo` warten bis zum Ende, also rot) |
| G10 | 1 000 Commits mit je 8 KiB Message (nahe 8 MiB, unter der Grenze) und gleichzeitig Zusammen-Ansicht | startet und bleibt bedienbar; kein „zu groß“ (Gegenprobe: die Grenze trifft nur echte Überschreitung) | I | 5, K2 | grün (n.g.) |
| G11 | Zwei Lesungen unmittelbar nacheinander über der Grenze (Dateiliste `w`, dann `w` erneut) | gleiches Ergebnis, kein Rest des ersten Prozesses, Speicher fällt zurück | I | 6 | n.g. |
| G12 | stderr von git unbegrenzt (der Zähler gilt nur für stdout): `fehler` ist ein `StringBuilder` ohne Obergrenze in allen Lesewegen, sein Text wandert in `GitFehler.Message` | stderr von git wird gelesen, aber auf eine Länge gekappt; Meldung bleibt eine Zeile ≤ 400 Zeichen | I | **LÜCKE L5** (Optional) | n.g. (kein billiger Weg, git viel stderr schreiben zu lassen) |

## D. Meldung: genau eine Zeile, stdout leer

| # | Variante | Erwartet | Ebene | Kriterium | heute |
|---|---|---|---|---|---|
| M1 | G1 mit Autor `‮…`, LF, U+E0041 im Commit; Hash-Kurzform in der Zeile | stderr **eine** Zeile, nennt „8 MiB“; kein roher Autor/Betreff/Message (nur Längen, Kurz-Hash); stdout 0 Byte; Exit 2 | P | 4 (Zeile und Grenze), **LÜCKE L5** (kein fremder Text, keine Steuerzeichen in der Zeile) | n.g. |
| M2 | G6 und G7: Warnung auf stderr | je Ereignis eine Zeile mit Kurz-Hash und Ansicht, ohne fremden Text; keine Zeile je Nachbar-Commit | I | 6 | n.g. |
| M3 | Grenze in einer Ansicht **zur Laufzeit** nach erfolgreichem Start (Server läuft) | Prozess bleibt bedienbar, „Schließen“ endet mit Exit 0, kein Absturz, kein Exit 134, keine 500 ohne Text | I+P | 6, 7 | n.g. (heute gibt es den Ausgang in diesen Wegen nicht; `Program` fängt nur `GitFehler`, `GitZuGross` erbt nicht davon) |
| M4 | Alle Ausgänge „zu groß“ und `GitFehler` | stdout bleibt 0 Byte (`> stdout.txt`); Exit-Codes: Start 2, Laufzeitfehler 1 | P | 4 | n.g. |
| M5 | G1 gestartet über `bash -c '… &'` (ignoriertes SIGINT, Lehre #21) und aus einem Unterordner des Repos (Lehre #6) | gleiche Meldung und Exit 2 | P | Test-Strategie | n.g. |

## E. Fremde Konfiguration

Alle Zeilen in einem Repo mit gesetzter fremder `.git/config`; Vergleich: Ausgabe von `Lesen` mit und ohne Konfiguration **byte-gleich** (Zeilen `E1`–`E6`), und für `E7` ein Marker-Skript.

| # | Variante (`.git/config`) | Erwartet | Ebene | Kriterium | heute |
|---|---|---|---|---|---|
| E1 | `format.pretty=oneline`, `log.abbrevCommit=true`, `log.date=short` | Format bleibt `--format` mit `%x00`; Hash 40/64 Hexziffern voll, Datum `%aI` | I | Test-Strategie („Marker-Proben unverändert“) | grün (geprobt: Ausgabe byte-gleich mit und ohne, md5) |
| E2 | `i18n.logOutputEncoding=ISO-8859-1`, `i18n.commitEncoding=ISO-8859-1` | UTF-8 aus `--encoding=UTF-8` und `-c i18n.logOutputEncoding=UTF-8` | I | dito | grün (geprobt; ohne die Flags: Bytes `351` statt UTF-8) |
| E3 | `log.decorate=full`, `log.mailmap=true`, `log.showRoot=false`, `core.notesRef=refs/notes/x`, `core.quotePath=true` | Ausgabe unverändert (das Format nutzt `%an`, nicht `%aN`; `%d` kommt nicht vor) | I | dito | grün (geprobt, md5 gleich) |
| E4 | `log.showSignature=true` + `gpg.program`/`gpg.ssh.program` auf Marker-Skript, Commit `c8` mit `gpgsig`-Kopf | Marker-Datei entsteht nicht; Ausgabe wie ohne Signatur | I | dito (Lehre #1) | grün (geprobt; Kontrolle ohne `-c log.showSignature=false`: Marker feuert) |
| E5 | `core.fsmonitor`, `core.attributesFile`, `diff.external` auf Marker-Skripte; fremde `.gitattributes` | keine Markerdatei; auch für alle neuen/umgebauten Lesewege (ein Marker-Test je Aufruf, bestehende Probe läuft unverändert) | I | dito (Lehre #1, #28) | grün (Bestand) |
| E6 | Einstellung, die das Zeilenformat selbst ändert, ohne `--format` zu schlagen: `log.showSignature` (E4), `log.decorate`/`format.pretty` wirken nur ohne `--format` bzw. bei `%d` | **Unit-Test auf die Argumentliste von `GitLogMitFormat`**: `-z`, `--format=…`, `--no-color`, `--encoding=UTF-8` und die sieben `GitStart`-Optionen sind vorhanden, `--format` kommt aus **einer** Konstante (dieselbe, die der Zerleger kennt) | U | Test-Strategie (Feldzahl im Format = Feldzahl im Zerleger) | grün (n.g.) |
| E7 | Partial-Clone mit `remote.*.uploadpack`/`core.sshCommand` auf Marker-Skript; Commit-Lesung triggert **keinen** Lazy-Fetch | keine Markerdatei | I | dito (Lehre #28) | grün (n.g., `GIT_NO_LAZY_FETCH=1` im Bestand) |
| E8 | `refs/replace` unter dem Hash von `t` | Ausgabe zeigt den echten Commit, nicht den Ersatz | I | dito (Lehre #5) | grün (Bestand `GIT_NO_REPLACE_OBJECTS`) |

## Lücken in R00048 und vorgeschlagene Kriterien (nur Vorschlag, die Datei R00048 ändert der planer)

- **L1 (Wichtig; Verfügbarkeit und Richtigkeit)** — *Mehrere Bereiche: Die Grenze zählt Bytes außerhalb der Auswahl.* `LeseNeuesteZuerst` liest den ganzen Verlauf zwischen den Spitzen und dem gemeinsamen Vorfahren der Anfänge samt Betreff und Rumpf und filtert erst danach (`NurDieAusDerVereinigung`). Probe: Auswahl `a..b c..d` mit je 10 Commits, 2 900 Commits dazwischen mit je 3,2 KiB Message → 9 743 233 Byte Ausgabe bei 33 KB Auswahl. Mit dem Fix wiese der Start diese Auswahl als „größer als 8 MiB“ ab, und das wäre falsch (und ohne Fix las er 9,7 MB). Vorschlag **Kriterium 10**: *Gegeben ein Repo mit 3 000 Commits (je 3 KiB Message) und die Auswahl `a..b c..d` aus je 10 weit auseinanderliegenden Commits, wenn `gitreviewA a..b c..d` startet, dann startet der Lauf mit den 20 Commits, und die gezählten Bytes aller git-Aufrufe liegen unter der Grenze. Test: Grenze 64 KiB (Testparameter).* Umsetzungsweg: Reihenfolge aus einer Lesung nur mit `%H` (Ordnung `--date-order`) und die Angaben nur der Auswahl aus einer zweiten, begrenzten Lesung.
- **L2 (Wichtig; Darstellung)** — *NUL im Autor- oder Datumskopf: git gibt `%aI` als Text aus.* Geprobt: `author Nul␀Name` → Autor leer, Datum `%aI`. Die Leiste zeigt „%aI“ als Datum. Vorschlag **Kriterium 11**: *Gegeben ein Commit, dessen Autorkopf ein NUL trägt, wenn `gitreviewA` startet, dann startet der Lauf, es gibt genau diesen einen Commit, und das Datum ist entweder ein ISO-8601-Datum mit Zeitzone oder leer (nie ein anderer Text); Autor, Betreff und Message stehen unverschoben.* Entscheidung unten.
- **L3 (Optional; Regression der Klasse)** — *Trenner nach Umkodierung.* In F8 ist die Klasse geprobt und sicher (UTF-16LE, UTF-7). Der Test hält die Klasse fest: Vorschlag **Kriterium 12 (Unit/Integration)**: *Commits mit `encoding UTF-16LE`, `UTF-7` (`+AAA-`), `ISO-8859-1` ergeben je genau 5 Felder.* Ohne Kriterium bleibt das ein Test ohne Anforderung.
- **L4 (Wichtig; Verfügbarkeit)** — *Speicherspitze des Prozesses, nicht nur der Zähler.* Kriterium 8 zählt Bytes am Leseort (≤ Grenze + 80 KiB). Heute 514 MB bei 27 MB Ausgabe; der Leseweg kopiert (`MemoryStream` → `ToArray()` → `GetString`). Vorschlag **Kriterium 13**: *Gegeben Repo F mit `g` und die zwei Messages 20 MiB + 6 MiB, wenn der Start abgewiesen wird, dann bleibt die Speicherspitze (`VmHWM`) des Prozesses unter 128 MiB.* Grobe Schranke gegen den Einbruch nach 514 MB, keine enge Marge (Betreiber 2026-11-26, `AI-Team/gelerntes.md`).
- **L5 (Optional)** — *Meldung ohne fremden Text und stderr von git begrenzt.* Kriterium 4 nennt „genau eine Zeile“ und die Grenze, aber nicht, was **nicht** darin steht (Autor, Betreff, Message, Pfade mit LF/U+202E). Vorschlag Ergänzung zu Kriterium 4 (ein Satz): *Die Zeile enthält keinen Text aus dem Commit und kein Steuer- oder Formatzeichen; stderr von git wird gelesen und auf höchstens 64 KiB gekürzt.*

## Entscheidungen offen

- **L2: Was zeigt die Leiste, wenn das Datum nicht lesbar ist?** Empfehlung: Lauf starten, Datum leer lassen, die Leiste zeigt „Datum nicht lesbar“. Gründe: git liefert den festen Text `%aI`, kein freier Text des Autors; ein Abweisen des ganzen Laufs wegen eines Commits wäre die Lösung, die ein fremdes Repo zur Sperre machen könnte (Verfügbarkeit). Der Zerleger prüft die Form an der **einen** Stelle, an der er auch die Felder trennt.
- **L1: Reihenfolge der Auswahl ohne Rumpf lesen.** Empfehlung: zwei Lesungen (Reihenfolge nur mit Hash, dann Angaben der Auswahl über `--no-walk`), beide über den einen begrenzten Leseweg. Alternative (eine Lesung, Grenze zählt nur Bytes der Auswahl) bräuchte Zählen nach dem Zerlegen und ließe den Prozess weiterlaufen: verworfen, weil das die Eigenschaft „Abbruch beim Lesen“ aufgibt.

## Nicht abgedeckt

- Zeitgrenze für hängende git-Aufrufe (R00017 Frage 3, eigene Karte).
- Summe mehrerer Lesungen in der Ansicht „Zusammen“ (Elternfolge, Netto, Übersicht, je höchstens 8 MiB, nacheinander): je Lesung begrenzt, die Summe ist es nicht. Gewollt (PO #60, Grenze je Lesung); bei nur 8 MiB je Aufruf und nacheinander kein Weg zu mehr als einem Puffer.
- Zeichenliste der Anzeige in `web/commit-werte.js` (R00048, Notizen): entfernt Richtungszeichen, statt sie wie `UnsichtbareZeichen` zu markieren; eigene Karte.
- Anzeigegrenze von 20 000 Zeichen je Message in der Commit-Leiste: eigene neue Karte (PO #60 Folgefrage).
- Hash-Auflösung (`rev-parse`, Hashpräfix gegen Tag-Namen): R00006/Lehre #2, unverändert.
- Browser (Playwright): keine neue Spec, die Darstellung der Leiste ändert sich nicht (R00048, Test-Strategie).

## Stand nach dem Bau (a5c359b, security-reviewer 2026-11-26)

Eigene Kopie des Standes, eigener Build (`--artifacts-path …/target-60-srev`), Wegwerf-Repos mit Rohcommits (`git hash-object -t commit --literally`), echte Instanz auf freiem Port, git 2.48.1. `geprobt` = von mir an der Instanz gemessen; `Test` = Test des Pakets, in meiner Kopie grün (55 von 55 in `CommitGrenzeTests`, `CommitFelderTests`, `GitLeserGrenzeTests`, `GitLogAusgabeTests`, `CommitZuGrossAnsichtenTests`, `CommitSpeicherTests`, `GitLeserBereicheTests`).

| # | Ergebnis | Beleg |
|---|---|---|
| K1–K3 | grün | geprobt (Basis, Umlaute) und Test |
| F1, F2, F4 | **grün** (war rot) | geprobt über `GET /api/commits`: Autor `Anna␟Beispiel`, Betreff/Rumpf mit 0x1F unverschoben, ein Feld nur aus 0x1F/0x1E bleibt |
| F3 | grün | geprobt |
| F5, F7 | grün | geprobt: Betreff `Vor dem NUL`, Rumpf leer bzw. `B` |
| F6 | **grün in der Form, aber siehe F16** | geprobt: Autor leer, genau ein Commit, Betreff/Rumpf unverschoben, Datum leer |
| F8 | grün | geprobt: UTF-16LE → Betreff `A`; UTF-7 `+AAA-` bleibt Text; je ein Commit |
| F9 | grün | geprobt: ISO-8859-1 mit 0x1F/0xFF → UTF-8, Trenner bleiben Werte |
| F10 | grün | geprobt: `C0 80`, `ED A0 80`, `FF` → Marken `⟨0xC0⟩…`, nie U+0000/U+001F |
| F11 | grün | geprobt: Autor `A\rB`, Betreff `Betreff zwei`, Rumpf `Rumpf\r\nzwei` |
| F12 | grün | geprobt: leere Message, leerer Autor/Betreff/Rumpf: je ein Commit, Position stabil |
| F13–F15 | grün | Test (`GitLogAusgabeTests`) |
| **F16 (neu)** | **rot** | Commit mit Zeitzone `+0000`: git 2.48.1 gibt `%aI` als `2023-11-14T22:13:20Z` aus; `Datumsform` (`TryParseExact` mit `zzz`) lehnt `Z` ab → Datum leer → die Leiste zeigt „Datum nicht lesbar“ bei **jedem Commit in UTC**. Geprobt: `+0000`/`-0000` leer, `+0200`/`-0530` richtig. Erwartet: Datum `…Z` bleibt. Der Test nutzt nur `+00:00` |
| G1 | grün | geprobt: 9 MiB als Hash, `a..g`, gemischt `ok g`: Exit 2, stdout 0 Byte, eine Zeile mit „8 MiB“; stdin-Weg siehe G4 |
| G2 | grün | geprobt: Grundlauf 180 584 kB, 20+6 MiB 203 000 / 205 960 kB (Zuwachs 22–25 MB, vorher 514 MB); Exit 2 |
| G3 | grün | Test (`GitLeserGrenzeTests`) |
| G4 | grün | geprobt: zwei Bereiche `a..g a..h` Exit 2 mit „8 MiB“ |
| G5 | grün | geprobt: 3 000 Commits à 3,2 KiB, zwei Bereiche zu je 10 Commits mit 2 970 dazwischen: startet mit 20 Commits |
| G6–G8, G10, G11 | grün | Test (`CommitZuGrossAnsichtenTests`, `GitLeserGrenzeTests`); nicht eigens an der Instanz geprobt |
| G9 | grün | geprobt: `git log` als Attrappe, die endlos schreibt (`yes`), Grenze 8 MiB: Exit 2 nach 0,47 s, kein `yes`-Prozess übrig. Hängender Leser ohne Ausgabe bleibt R00017 Frage 3 |
| G12 | grün (Optional) | `Fehlertext` kappt auf 64 KiB; die Meldung kann bei git-stderr mit LF mehrzeilig sein: Anmerkung, kein Muss |
| M1, M4, M5 | grün | geprobt: stderr genau eine Zeile ohne fremden Text, stdout 0 Byte, Exit 2; auch über `bash -c '… &'` aus einem Unterordner |
| M2, M3 | grün | Test; nicht eigens geprobt |
| E1–E4, E6 | grün | geprobt: Repo mit `format.pretty`, `log.*`, `i18n.*`, `gpg.program`, `gpg.ssh.program`, `core.fsmonitor`, `core.sshCommand`, `diff.external`, `remote.origin.uploadpack` (Partial Clone) auf Marker-Skript, dazu ein Commit mit `gpgsig`: Ausgabe byte-gleich mit und ohne Konfiguration, Markerverzeichnis leer |
| E5, E7, E8 | grün | E5/E7 durch dieselbe Probe; E8 Bestand, nicht verändert |
