# Angriffsmatrix R00043–R00046 (Karte #42) — Dateiansicht: neue Lesegrenze für Dateien vom Datenträger und `<commit>:<pfad>`

Geschrieben vom security-reviewer **vor dem Bau** (2026-11-25); der Entwickler baut Test zuerst gegen diese Matrix.
Sie beschreibt die **Klasse**, nicht ein Beispiel. Stand der Proben „heute“: Commit `f14fc51` (Zweig `karte/42`), gebaut und gegen eine
eigene Instanz auf freiem Port (Review-Lauf, Wegwerf-Repo) geprobt; die Dateiansicht selbst gibt es heute nicht (`--dateien` endet mit
Exit 2 „Argument 1 ist weder eine bekannte Option noch ein Commit-Hash“).

## Schutzziel, Akteure, Linien

**Schutzziel.** (1) Die Dateiansicht liest und zeigt nur die beim Start genannten Dateien — kein anderer Pfad, kein anderer Inhalt, kein
Hängen, kein unbegrenzter Speicher. (2) Was der Mensch **sieht**, ist, was er **kopiert** (Trojan Source, unsichtbare Zeichen, gekürzte Zeilen).
(3) Eine fremde Webseite im selben Browser oder ein fremder Host erreicht weder Inhalt noch „Schließen“. (4) stdout bleibt in jedem
Ausgang leer; stderr trägt nie Dateiinhalt und nie einen rohen Namen. (5) Ein neuer git-Lesepfad erbt Prozessschutz (`GitStart`),
Ausgabegrenze und Namensprüfung an **jeder** Aufrufstelle (Lehre #10).

**Akteure.** A0 berechtigt (Kontrolle) · A1 Aufrufer: Mensch oder KI, nennt Angaben, kann durch fremden Text gelenkt sein ·
A2 fremde Webseite im selben Browser (anderer Origin, DNS-Rebinding) · A3 Autor einer fremden Datei oder eines fremden Repos
(Name, Inhalt, `.git/config`, Objekte) · A4 anderes Konto auf demselben Rechner (erreicht `127.0.0.1:<port>`).

**Linien.** U Unit (reine Operation) · I Integration (Interactor in-process, Wegwerf-Repo) · P Prozess: echte Instanz, echter Einstieg,
Exit-Code, stdout/stderr getrennt, Start auch über `bash -c '… &'` (Lehre #21) · B Playwright (Chromium, headless; Browser-Eigenes).
Ein vorgelagerter Webserver oder Proxy besteht nicht (Kestrel, nur `127.0.0.1`): keine Linie L3.

**Kontrollpaar** (muss heute UND danach erlaubt sein, sonst misst die Probe nichts): K1–K4 unten. Für die HTTP-Zeilen ist der Review-Lauf
mit `GET /api/zustand` (Host richtig) die heutige Kontrolle (200, geprobt).

**Spalten.** `Deckung`: `R43-3` = Kriterium 3 (Tabellenzeile) der Anforderung R00043 usw.; `Bestand` = schützt der vorhandene Code heute schon
(hier trägt die Zeile als Regression); **`LÜCKE Ln`** = Kriterium fehlt oder ist unscharf, siehe Abschnitt „Lücken“.
`heute`: `n.v.` = Funktion fehlt (rot); sonst das geprobte Ergebnis am Bestand (Review-Lauf, derselbe Webserver und `Anfrageschutz`).

**Fachliche Konstanten** (aus den Anforderungen): 8 MiB je Datei (`Ausgabegrenze.Standard`), 50 Angaben, 32 MiB zusammen, zugeklappt ab 20 001 Zeilen,
10 000 Zeichen je gezeigter Zeile, Färbung ≤ 262 144 Zeichen und ≤ 1 000 je Zeile, Suchbegriff 1–200, 10 000 Treffer. Exit: 0 Schließen · 2 Aufruf/Quelle · 130 Abbruch · 1 sonstiger Laufzeitfehler (Port belegt).

## A. Kontrolle

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| K1 | `--dateien a.sql` (Ordner D) | A0 | `GET /api/dateiansicht` nennt eine Datei, `GET /api/dateiansicht/0` liefert den Text, `POST /api/schliessen` (Host, ohne Origin, `application/json`) → Antwort 200 und Exit 0, stdout 0 Bytes | P | Prozess starten, curl, Exit abwarten | R43-1 | n.v. |
| K2 | `--dateien <c1>:sql/a.sql` (Repo C) | A0 | wie K1; Text gleich `git cat-file blob <c1>:sql/a.sql` | P | Bytes vergleichen | R46-1 | n.v. |
| K3 | Browser: Seite, Knopf „Datei kopieren“ | A0 | Zwischenablage = Bytes der Datei | B | Zwischenablage mit Berechtigung lesen | R43-8 | n.v. |
| K4 | Review `gitreviewA <hash>` ohne `--dateien` | A0 | läuft wie bisher; `GET /api/dateiansicht/0` → 404 | P | curl | R43-2 | 404, Review läuft (geprobt) |

## B. Pfade beim Start (Datenträger) — Eingang A1/A3

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| P1 | `fehlt.sql`, `ordner`, `gesperrt.sql` (000, nicht als root) | A1 | Exit 2, Gründe „nicht gefunden“, „ist ein Verzeichnis“, „nicht lesbar“; kein Server | I+P | Tabelle R43-3 abtasten | R43-3 | n.v. |
| P2 | `.`, `..`, `/`, `ordner/`, `ordnerlink/` (Link auf Ordner, Schrägstrich am Ende) | A1 | Exit 2 „ist ein Verzeichnis“ (nie eine Auflistung) | I | je Angabe | R43-3 (nur `ordner`) | n.v. |
| P3 | `unter/../a.sql`, `ordnerlink/a.sql` (Link im Ordner davor) | A1 | zeigbar; Kopf nennt den **echten** Pfad (`<D>/a.sql`), nicht die Angabe | I | Kopf-Pfad = `realpath` des **geöffneten** Handles | R43-3 | n.v. |
| P4 | Link im letzten Teil: auf Datei, auf Link, auf Verzeichnis, **kaputter** Link, `link.sql/`, `link.sql/.` | A3 | Exit 2 „ist ein symbolischer Link — bitte das Ziel nennen“ (kaputter Link: derselbe Grund, nicht „nicht gefunden“); nie der Inhalt des Ziels | I | Marker im Ziel `ZIEL-4711`: nie in Antwort/stderr | R43-3 (nur ein Fall) | n.v. |
| P5 | FIFO ohne Schreiber, FIFO mit endlos schreibendem Schreiber, FIFO über Ordner-Link | A3 | Exit 2 „keine reguläre Datei“ in ≤ 2 s, ohne zu öffnen-und-hängen, 0 Bytes gelesen. **Geprobt:** `File.OpenHandle` auf eine FIFO blockiert (> 5 s Abbruch durch `timeout`), `FileAttributes` einer FIFO und eines Geräts ist `Normal` — Art nicht über Attribute erkennen | I+P | `timeout 2` um den Start; Exit 2 | R43-3 (nur ein Fall); L2 | n.v. |
| P6 | Gerät `/dev/zero`, `/dev/null`, `/dev/tty`, `/dev/random`; Socket-Datei | A3 | Exit 2 „keine reguläre Datei“ ≤ 2 s; Zähler gelesener Bytes 0 | I | Leseort-Zähler | R43-3 (nur `/dev/zero`) | n.v. |
| P7 | `/proc/self/maps` (regulär, `st_size` 0, kleiner Text) | A1 | zeigbar; Größe im Kopf = Länge der **gelesenen** Bytes, nicht 0 | I | Kopf-Größe > 0 | R43 NFA (Größe des Dateisystems zählt nicht) | n.v. |
| P8 | `/proc/self/mem` (regulär, Lesen schlägt mit EIO fehl), `/proc/self/environ`, `/proc/self/cmdline` | A1/A3 | `mem`: Exit 2 „Datei nicht lesbar“, kein Stacktrace, kein Exit 134; `environ`, `cmdline`: Exit 2 „Binärdatei“ (NUL) | I+P | Exit-Code und stderr (eine Zeile) | LÜCKE L14 | n.v. |
| P9 | Leere Angabe `''`, nur Leerzeichen, überlanger Pfad (5 000 Zeichen; Teil > 255) | A1 | Exit 2 mit Grund („nicht gefunden“), kein `ArgumentException`/`PathTooLongException`-Stacktrace, stderr-Zeile gekürzt | I+P | Exit 2, stderr 1 Zeile ≤ 400 Zeichen | LÜCKE L14 | n.v. |
| P10 | `-- -x.sql`; `--dateien -x.sql` ohne `--`; `--dateien=a.sql`; `--dateien a.sql --dateien b.sql`; `--dateien a.sql --port` (Wert fehlt); `--port 0/65536/abc` | A1 | `--`: Datei `-x.sql` zeigbar; alle übrigen Exit 2 mit einer Meldung, kein Server, stdout 0 | U+P | Aufrufleser-Tabelle | R43-2 (teilweise: Tests-Abschnitt) | n.v. |
| P11 | `--dateien a.sql <hash>`, `… -`, `… --ignore '*.md'`, `--dateien` allein | A1 | Exit 2 „Review oder Dateiansicht, nicht beides“ | U+P | | R43-2 | n.v. |
| P12 | Datei namens `-` (nach `--`): Dateiansicht liest **nie** stdin | A1 | zeigt die Datei `-` (oder Exit 2 „nicht gefunden“); stdin ist eine FIFO ohne Schreiber oder `/dev/zero` → Start trotzdem ≤ 2 s, RSS flach | P | `… < fifo` | LÜCKE L16 | n.v. |
| P13 | Reine Datenträger-Angaben starten **kein** git | A3 | Marker-`git` vor dem echten `git` im `PATH`, fremde `.git/config` im Startordner (`core.fsmonitor`, `diff.external` schreiben Marker): keine Markerdatei, `git` 0-mal aufgerufen | P | Markerdatei fehlt | R43-3 letzte Zeile (nur „ohne git im Suchpfad“); L16 | n.v. |
| P14 | Angabe sieht aus wie Commitquelle, ist aber Datei: Datei `cafe:x.sql` im Startordner | A3 | `cafe:x.sql` = Commitquelle (R46-Regel) → „Commit nicht gefunden“, **nie** die Datei; `./cafe:x.sql` zeigt die Datei, Anzeigename nennt sie als Datei | I | beide Angaben | R46-2 (`./`-Zeile) | n.v. |
| P15 | Wildcard, Tilde, Variable als Angabe: `*.sql`, `~/a.sql`, `$HOME/a.sql`, `a.sql ` (Leerzeichen am Ende), `[a].sql` | A1 | wörtlich genommen: Datei gleichen Namens oder Exit 2 „nicht gefunden“; nie Glob, nie Umgebung | U+I | Datei `*.sql` existiert: wird gezeigt, ohne die anderen | LÜCKE klein (L14) | n.v. |
| P16 | Lesen ohne Ende: reguläre Datei, deren `read` blockiert (`/proc/kmsg` als root, FUSE, hängendes NFS) | A3 | Lesen hat eine Zeitgrenze (Hypothese 10 s): Exit 2 „Datei nicht rechtzeitig lesbar“, nie unbegrenztes Warten vor dem Serverstart; Strg+C bricht das Lesen ab (130) | I | Lese-Quelle mit Haken, der nie liefert | **LÜCKE L11** (Optional) | n.v. |

## C. Namen und Zeichen — Eingang A3 (Name im Dateisystem oder im Repo)

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| N1 | LF, CR im Dateinamen (`zeile⏎umbruch.sql`, `cr⏎.sql`) | A3 | Datenträger: zeigbar, Name mit `⟨U+000A⟩`/`⟨U+000D⟩` in **einer** Zeile (Kopf, Liste, `aria-label`, Tab-Titel, stderr); kein git | I+B | stderr-Zeilenzahl = 1 | R43-3 | n.v. |
| N2 | `U+202E`, `U+200B`, `U+E0041`, `U+2066–2069`, `U+00AD`, `U+0085`, `U+2028/2029` roh im Namen — Datei fehlt und Datei vorhanden | A3 | Marken `⟨U+…⟩` auf stderr, in Kopf, Seitenleiste, Titel; nie roh (eine Klasse `UnsichtbareZeichen`, keine zweite Liste, Lehre #17) | I+B | Byte-Suche nach `E2 80 AE` in stderr und DOM-Text: 0 | R43-3, R45-6 | n.v. |
| N3 | Terminal-Injektion im Namen: `ESC[2J`, `ESC]0;titel BEL`, `U+009B` (C1-CSI), `DEL`, `BEL` | A3 | auf stderr kein Byte `0x1B`, `0x07`, `0x7F`, kein `C2 9B`; Marken | I+P | `od -c` über stderr | R43-3 (über Klasse) | n.v. |
| N4 | Log-Fälschung: Name `x⏎2026-11-25T00:00:00.000+01:00 INFO [Start] gitreviewA läuft auf http://127.0.0.1:1/` | A3 | genau **eine** `FEHLER [Dateiansicht]`-Zeile je Angabe, keine Zeile mit `http://127.0.0.1` | P | Zeilen zählen | R43-3 | n.v. |
| N5 | Ungültiges Byte im Namen: Angabe `f\xFF.sql`, **daneben** existiert `f\xEF\xBF\xBD.sql` (echtes U+FFFD) und `f\xFF.sql` selbst. **Geprobt:** .NET gibt `args` für `f\xFF.sql` als `f\uFFFD.sql` weiter, `File.Exists` ist wahr — geöffnet wird die **andere** Datei | A3 | Exit 2 „Name nicht übergebbar (ungültiges Byte oder Ersatzzeichen U+FFFD)“; **nie** der Inhalt von `f\uFFFD.sql` | I+P | Ordner enthält beide Dateien mit Markern `RAW`/`UTF8-FFFD`; Marker in Antwort: 0 | **LÜCKE L1** (R43-3 testet nur den Fall „Datei fehlt“) | n.v. |
| N6 | Dasselbe in `<c>:f\xFF.sql` (Baum enthält `f\xFF.sql` **und** `f\uFFFD.sql`) | A3 | Exit 2 wie N5; git bekommt nie den Ersatzzeichen-Namen | I | Repo mit beiden Blobs | **LÜCKE L1** | n.v. |
| N7 | Name mit `<b>`, `"`, `'`, `\`, `]`, `#`, `%`, `?`, `;`, Emoji, 255 Bytes, Tab | A3 | zeigbar, DOM nur Text; Selektoren/Attribute werfen nicht; Konsole leer | B | Seite bedienbar nach Wahl | R43-6 (teilweise) | n.v. |
| N8 | NFC- gegen NFD-Name (`é`), beide Dateien vorhanden | A3 | genau die bytegleiche Datei; keine Normalisierung | I | Marker je Datei | LÜCKE klein (L14) | n.v. |
| N9 | Windows-Pfadformen (nur Zeichenkettenprüfung, plattformunabhängig): `\\server\share\a.sql`, `//server/share/a.sql`, `\\?\C:\x`, `\\.\pipe\p`, `CON`, `NUL`, `COM1`, `a.sql::$DATA`, `a.sql.` oder `a.sql ` (Windows streicht), `PROGRA~1` | A1/A3 | Exit 2 „Netzwerk- und Gerätepfade werden nicht unterstützt“ (NTLM-Anmeldung an einen fremden Server wäre sonst die Folge); Probe auf Windows 11 durch den Betreiber | U (+ manuell) | Tabelle | **LÜCKE L12** (Entscheidung E5) | n.v. |

## D. Prüfen und Lesen — Zeit (TOCTOU)

Deterministisch (Lehre „Prüfen-dann-Handeln“): Zwischenstufen einzeln aufrufbar bzw. ein Haken zwischen Prüfung und Öffnen; Threads mit Barrier allein genügen nicht.

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| T1 | Datei wird nach der Art-Prüfung durch einen **Link** auf `/etc/hostname` ersetzt | A3 | Exit 2 „symbolischer Link“; Zielinhalt nie im Speicher (Öffnen **ohne Folgen**, `O_NOFOLLOW`, Art am geöffneten Handle) | I | Haken zwischen Prüfen und Öffnen; Marker im Ziel | R43 Beschreibung („am geöffneten Handle“), kein Kriterium | n.v. |
| T2 | …durch eine **FIFO** ersetzt | A3 | Exit 2 ≤ 2 s, kein Hängen (Öffnen nichtblockierend oder Art vor Öffnen am Pfad **und** am Handle) | I | Haken; `timeout 2` | LÜCKE L2 | n.v. |
| T3 | …durch Verzeichnis oder Gerät ersetzt | A3 | Exit 2, kein Lesen | I | Haken | LÜCKE L2 | n.v. |
| T4 | Datei **wächst** beim Lesen von 8 MiB−10 auf 20 MiB (Schreiber läuft weiter) | A3 | „zu groß (über 8 MiB)“; ganz oder gar nicht; gelesen ≤ Grenze + 1 | I | Zähler am Leseort | R43 NFA | n.v. |
| T5 | Datei wird beim Lesen gekürzt oder per `rename` ersetzt | A3 | entweder die Bytes **eines** Standes (Anzeige, Größe, Zeilenzahl, Kopie aus denselben Bytes) oder Exit 2; kein Absturz (kein `mmap`/SIGBUS) | I | Hash Anzeige = Hash Kopie = Hash gelesene Bytes | LÜCKE L2 | n.v. |
| T6 | Datei **nach dem Start** gelöscht, durch FIFO/Link ersetzt, verändert | A3 | `GET /…/0`, Neuladen, Kopieren liefern den Stand vom Start, ≤ 1 s; kein Zugriff auf den Pfad mehr | P | Pfad durch FIFO ersetzen, `GET /0` hängt nicht; `strace -f -e openat` falls vorhanden: 0 Öffnungen | R43 Beschreibung („kein Nachladen“) | n.v. |
| T7 | Zwischen Auflösen und Lesen entsteht ein Tag mit dem Präfix-Namen, der auf einen anderen Commit zeigt | A3 | gelesen wird über den **vollen aufgelösten Hash**, nie über die Eingabe-Zeichenfolge | I | Haken | R46 Auflösen (kein Kriterium der Reihenfolge) | n.v. |
| T8 | Eintrag (Art, Größe) und Blob-Lesen lösen den Pfad **gleich** auf | A3 | gleiche Auflösung: Pfade der Zeilen C8 liefern in beiden Schritten dasselbe oder beide „nicht gefunden“ | I | Tabelle C8 | **LÜCKE L7** | n.v. |
| T9 | `POST /api/schliessen` zweimal gleichzeitig; „Schließen“ und SIGINT gleichzeitig | A0/A1 | Prozess endet genau einmal: Exit 0 **oder** 130, stdout 0 Bytes | P | 20 Wiederholungen | LÜCKE klein (L14) | n.v. |

## E. Größen- und Anzahlgrenzen

Lehre „Grenzen, die Arbeit begrenzen“: Messen und Buchen in **einer** Funktion, Zähler am einzigen Lese- und Kopierort, „Arbeit ≤ k × Buchung“ bei 1, 10, 30 Angaben.

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| G1 | `grenze.sql` 8 388 608 / `ueber.sql` 8 388 609 Bytes | A3 | zeigbar / Exit 2 „zu groß (über 8 MiB)“; gelesen ≤ Grenze + 1 | I | Zähler | R43-3 | n.v. |
| G2 | Größe lügt: `/proc/kallsyms` (`st_size` 0, > 9 MB Inhalt); Sparse-Datei `truncate -s 100G` | A3 | „zu groß“ in ≤ 1 s; gelesen ≤ 8 388 609 Bytes; RSS wächst nicht um die behauptete Größe | I+P | Leseort-Zähler, `ps -o rss` | R43 NFA | n.v. |
| G3 | 50 / 51 Angaben | A1 | 50 laufen; 51 → „zu viele Dateien (51, höchstens 50)“ **ohne** eine Datei zu öffnen | U+I | Zähler geöffneter Dateien = 0 | R45-3 | n.v. |
| G4 | 4 × 8 MiB (= 32 MiB) / + 1 Byte | A1 | zeigbar / „zusammen zu groß (über 32 MiB)“; **Lesen bricht ab**, sobald die Summe überschritten ist | I | 50 Angaben je 8 MiB: gelesene Bytes ≤ 32 MiB + 8 MiB + 1, nicht 400 MiB | R45-3 (Abbruch fehlt) → L10 | n.v. |
| G5 | Summe über Datenträger **und** Commitquellen gemischt | A1 | eine gemeinsame Buchung | I | 3 × 8 MiB Datei + 2 × 8 MiB Commit → zu groß | LÜCKE L10 | n.v. |
| G6 | Dieselbe Datei 50 × unter verschiedenem Wortlaut (`a.sql`, `./a.sql`, `D/../D/a.sql` …) mit 8 MiB | A1/A3 | jede Angabe zählt in der Summe → „zusammen zu groß“; RSS ≤ Summe-Grenze × k | I | Zähler | LÜCKE L10 | n.v. |
| G7 | Speicherverstärkung: 8 MiB nur LF (8 388 608 Zeilen) · nur `<` · nur `ä` · nur `\x01` · nur 😀 | A3 | Start ≤ 2 s; Antwort ≤ 6 × Dateigröße + 1 KiB (Escape-Obergrenze von System.Text.Json); RSS-Zuwachs ≤ 10 × Summe + 100 MiB (**Hypothese**, vor dem Bau messen und eintragen); Zeilen nicht als Liste von Strings gehalten, Marken nur für gezeigte Zeilen | P | `ps -o rss`, `curl -w %{size_download}` | **LÜCKE L10** | n.v. |
| G8 | 30 gleichzeitige `GET /…/0` einer 8-MiB-Datei, Client liest 1 KiB/s | A2/A4 | RSS ≤ Basis + 1 Puffer + k × 64 KiB; Kestrel schließt langsame Leser (`MinResponseDataRate`); `POST /api/schliessen` antwortet trotzdem ≤ 1 s; Exit 0 innerhalb `HoechsteWartezeitAufOffeneAnfragen` (2 s) | P | gleichzeitig starten, Exit-Zeit messen | **LÜCKE L10** | n.v. |
| G9 | 20 000 / 20 001 Zeilen; Trotzdem laden mit 20 001 und mit 8 388 608 Zeilen | A3 | zugeklappt ab 20 001; nach „Trotzdem laden“ zeichnet die Seite in Blöcken (R00017), Tab bleibt bedienbar, Obergrenze der DOM-Zeilen benannt | B | Ereignisschleife antwortet ≤ 1 s | R43 (Grenzfälle) + **LÜCKE L13** | n.v. |
| G10 | Zeile 10 000 / 10 001 Zeichen; 8 MiB in einer Zeile | A3 | gezeigt ≤ 10 000 Zeichen plus Marke „… (k weitere Zeichen)“; DOM-Textknoten ≤ 10 000; Kopie ganz | U+B | Textknoten-Länge | R43-5 | n.v. |
| G11 | Kürzung mitten im Surrogatpaar: 9 999 × `a` + 😀; Kombinierzeichen an der Grenze | A3 | Schnitt an Zeichengrenze (Rune), nie ein einzelnes Surrogat (`⟨U+D83D⟩`); k zählt in derselben Einheit wie die Anzeige | U | Rücklese mit dem Zeichenzähler der Seite | **LÜCKE L20** | n.v. |
| G12 | Färbung: Datei > 262 144 Zeichen; Zeile > 1 000 Zeichen; ReDoS-Muster (`'''…`, `****…`, `<!--` × 1 000) | A3 | ungefärbt über den Grenzen; unter den Grenzen bleibt die Seite ≤ 2 s bedienbar (Worker) | B | Zeitmessung | R00007 (Bestand) | n.v. |
| G13 | Suche: Begriff 200 / 201 Zeichen; `a` in 8 MiB `a`; `(a+)+$`, `.*`, `\`, `⟨` als Begriff | A3 | wörtlich, Zählung stoppt bei 10 000 Treffern, ≤ 1 s | B | Zähler Vergleiche | R44 (R00027) | n.v. |
| G14 | Stapel: 50 Dateien je 0,64 MiB | A1 | Oberfläche ≤ 2 s (Lastprofil) | P | Zeit bis `GET /api/dateiansicht` | R45 NFA | n.v. |

## F. Inhalt: Binär, Kodierung, BOM, Zeilen

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| I1 | Null-Byte an Stelle 1, 8 000, 8 001, 1 MiB, letzte Stelle | A3 | immer Exit 2 „Binärdatei — enthält Null-Bytes“ (Kriterium sagt „enthält“, die Vorplanung prüft nur 8 000 Bytes; die ganze Datei liegt ohnehin im Speicher) | U | 5 Positionen | R43-3 vs. Vorplanung → **LÜCKE L3** | n.v. |
| I2 | UTF-16 LE (`FF FE`), UTF-16 BE (`FE FF`), UTF-32 LE (`FF FE 00 00`), UTF-16 ohne BOM | A3 | Exit 2; BOM-Grund vor Null-Byte-Grund; ohne BOM „Binärdatei“ | U | Tabelle | R43-3 (nur `FF FE`) → L9 | n.v. |
| I3 | Ungültiges UTF-8: `E9` allein, überlang `C0 AF`, Surrogat `ED A0 80`, `F4 90 80 80`, abgeschnitten `E2 82` am Ende, `80`, `FE`, `FF` | A3 | Exit 2 „keine gültige UTF-8-Kodierung (Byte 0x… an Stelle n)“; Stelle = Byteposition ab 1 (mit oder ohne BOM festlegen); keine Ersatzzeichen im Anzeigetext | U | Strikter Decoder (`throwOnInvalid`) | R43-3 (nur `E9`); Stelle bei BOM → L9 | n.v. |
| I4 | Gültig, aber sonderbar: U+FFFD roh, U+FFFE/FFFF, U+10FFFF, Emoji, Kombinierzeichen, NBSP, Hangul-Füller U+3164, U+2800 | A3 | zeigbar; Kopie bytegleich. U+3164/U+2800/NBSP sind heute **nicht** markiert (Klasse = Cc, Cf, Zl, Zp) — Anmerkung, kein Muss | U+B | Rücklese | R43-8; Härtung | n.v. |
| I5 | BOM: `bom.sql`; doppelte BOM; BOM-only (3 Bytes); BOM in Zeile 5; BOM + CRLF | A3 | Kopf „UTF-8 mit BOM“, erste BOM weder gezeigt noch kopiert; **weitere** U+FEFF stehen als `⟨U+FEFF⟩` und werden echt kopiert; BOM-only = leer (Knopf gesperrt) | U+B | Bytes Zwischenablage | R43-8 (nur eine BOM) | n.v. |
| I6 | Leer (0 Bytes); nur `\n`; nur `\r\n`; ohne Schluss-LF; nur Leerzeilen | A3 | 0 Bytes: „Datei ist leer“, 0 Zeilen, Knopf gesperrt; `\n`: 1 leere Zeile; Zeilenzahl = Anzahl der Zeilenenden (+1 wenn Rest) — **eine** Definition in Kopf, Liste, Bestätigung, Bereich | U | Rechnung je Fall | R43-9, LÜCKE L9 (Definition) | n.v. |
| I7 | Einzelnes CR (nicht vor LF) mitten in einer Zeile: `-- harmlos⏎CR` `DROP TABLE x;` | A3 | CR ist **kein** Zeilenende und **keine** unsichtbare Lücke: Marke `⟨U+000D⟩` sichtbar; Kopf-Zeilenende „gemischt“ zählt es nicht als LF. Ein Terminal führt eingefügtes CR als Eingabe aus, die Anzeige darf es nicht verbergen | U+B | Zeile enthält Marke; Kopie bytegleich | **LÜCKE L4** | n.v. |
| I8 | Andere Trenner: U+2028/2029, NEL U+0085, VT, FF | A3 | Marke, kein Zeilenende, Zeilenzahl unverändert | U | | R43 (Klasse) | n.v. |
| I9 | Zeilenende-Kopf: nur LF / nur CRLF / gemischt / keins | A3 | Kopf nennt LF, CRLF, gemischt, keins; Kopie ändert nichts | U | | R43-4, R43-8 | n.v. |
| I10 | Trojan Source: U+202E, U+2066–2069, U+200B–200F, U+E0041 im Inhalt | A3 | `⟨U+…⟩` sichtbar in der Anzeige, **im Kopierten das echte Zeichen** (Anzeige ≠ Kopie ist hier gewollt, die Marke ist der Hinweis) | B | | R43-6, R43-8 | n.v. |
| I11 | Gekürzte Zeile: Der Teil jenseits Zeichen 10 000 (z. B. `; DROP TABLE x;` nach 20 000 Leerzeichen) wird kopiert, aber weder gezeigt noch von der Suche gefunden | A3 | Bestätigung und Kopf nennen die Zahl der **nur gekürzt gezeigten Zeilen**; die Suche nennt Treffer im nicht gezeigten Teil; „Zeile ganz zeigen“ möglich oder Umbruch zeigt sie | B | `lang-zeile.sql` | **LÜCKE L5** (Entscheidung E3) | n.v. |

## G. Server und HTTP — Eingang A2, A4 (und A1 mit curl)

Linie P gegen eine echte Instanz. Die rohen Anfragen (Python-`socket`) lagen im Scratchpad; die Spalte `heute` ist am Review-Lauf geprobt, weil Host-Prüfung, `Anfrageschutz` und Routing derselbe Code sind.

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| H1 | Nummern: `/api/dateiansicht/1`, `/-1`, `/01`, `/00`, `/0x0`, `/+0`, `/%200`, `/0.0`, `/٠` (U+0660), `/０` (U+FF10), `/2147483648`, `/4294967296` (Überlauf → 0?), `/99999999999999999999`, `/0/`, `/0/x`, `//0`, `/%30`, `/..%2f..%2fetc%2fpasswd`, `/0?pfad=/etc/passwd`, `/0?nummer=1` | A2/A4 | Antwort enthält **nur** den Inhalt der Datei, die der Pfad nach der Normalisierung nennt (`/0`, gleichwertig `/%30`); alles andere 400/404 ohne Dateiinhalt | P | 3 Dateien mit Markern `M0 M1 M2`; Marker in jeder Antwort: nur der eigene | R43-10 (ohne Unicode-Ziffern, Überlauf, Schrägstrich) → **LÜCKE L15** | `/api/dateiansicht/0` → 404 (n.v.); Traversal-Pfade 404 (geprobt) |
| H2 | Methoden auf `/api/dateiansicht[/n]`: HEAD, OPTIONS, POST, PUT, DELETE, `X-HTTP-Method-Override` | A2 | 405 (nur GET), nie Inhalt | P | | R43-10 | HEAD/GET-auf-POST-Pfad 405 (geprobt) |
| H3 | **Laufart-Trennung:** alle Review-Endpunkte in der Dateiansicht (`/api/commits`, `/api/commits/<h>/dateien`, `/api/diff`, `/api/haken`, `/api/anmerkungen[/n[/loeschen]]`, `/api/ergebnis`, `/api/beenden`, `/api/zustand`, Bild, Sprung, Zusammen) in den Schreibweisen `/API/…`, `/api/…/`, `//api/…`, `/api/%2e%2e/api/…`; umgekehrt `/api/dateiansicht*` und `/api/schliessen` im Review | A2/A4 | je 404 (GET und POST), nie ein Zustand verändert; Routing wird je Laufart **nicht registriert**, nicht per Pfadtext gesperrt | P | alle Endpunkte × 5 Schreibweisen × GET/POST | R43 NFA (nur exakte Schreibweise) → **LÜCKE L15** | Review: `/API/zustand`, `/api/zustand/`, `/api/%2e%2e/api/zustand` → **200** (Routing tolerant; geprobt) |
| H4 | Host: `localhost:P`, ohne Port, `127.0.0.1.:P`, `127.1`, `2130706433`, `[::1]:P`, doppelt, Liste `127.0.0.1:P, evil`, HTTP/1.0 ohne Host, mit `X-Forwarded-Host: evil` | A2 | alle falschen → 403/400, nie Inhalt; `X-Forwarded-Host`/`Forwarded` wird ignoriert | P | Tabelle | R43-10 | 403/400, Forwarded ignoriert (geprobt) |
| H5 | DNS-Rebinding im echten Browser: Chromium mit `--host-resolver-rules="MAP rebind.test 127.0.0.1"`, fremde Seite von `http://rebind.test:Q` liest `http://rebind.test:P/api/dateiansicht/0` | A2 | 403 (Host `rebind.test:P`), Antwort für die Seite nicht lesbar | B | `fetch` meldet Fehler/403; kein Inhalt im fremden Dokument | R43-10 (nur curl-Ebene) → L19 | n.v. |
| H6 | Origin auf **POST**: fremd, `null`, doppelt (eigener + fremder), eigener mit Schrägstrich, kein Origin | A2 | fremd/`null`/doppelt/Schrägstrich → 403; kein Origin mit richtigem Host → angenommen (Kontrolle) | P | Tabelle | R43-10 | 403 ×4 (geprobt); kein Origin: angenommen |
| H7 | Origin auf **GET** `/api/dateiansicht[/n]`: fremder Origin, `Sec-Fetch-Site: cross-site` | A2 | 403 (Dateiansicht liest nur eigenen Origin); die Antwort trägt kein `Access-Control-Allow-*` | P | | **LÜCKE L6** (R43-10 sagt „fremder Origin … wie R00002“, R00002 gilt für POST) | `GET /api/commits` mit `Origin: http://evil` → **200** (geprobt) |
| H8 | CSRF auf „Schließen“: `text/plain`, `application/x-www-form-urlencoded`, `multipart/form-data`, `application/json; charset=latin1`, `Content-Type` doppelt, GET, `X-HTTP-Method-Override`, chunked mit fremdem Origin, `Content-Length` doppelt | A2 | 415/405/403/400; Lauf läuft weiter, stdout 0, Exit nicht ausgelöst | P | `/api/zustand` danach 200; Prozess lebt | R43-10 (`POST /api/schliessen` ohne Anfrageschutz) | 415/405/403/400 (geprobt, `/api/beenden`) |
| H9 | CSRF aus echtem Browser (zweite Seite auf anderem Port als „fremde Webseite“): `fetch` JSON, `fetch` `no-cors` `text/plain`, `sendBeacon` mit `application/json`-Blob, Formular `enctype=text/plain` (Autosubmit), `<img>`/`<script>`/`<iframe>` | A2 | Lauf läuft weiter; Prozess lebt; `/api/zustand` 200 | B | Prozess-ID lebt, Exit-Datei fehlt | LÜCKE klein (R43-10 nennt nur Anfrage-Ebene) | n.v. |
| H10 | Antwortköpfe von `/api/dateiansicht*` und Seite | A2 | `Content-Type: application/json` (nie `text/plain`/`text/html`), `X-Content-Type-Options: nosniff`, CSP mit `frame-ancestors 'none'`, `Cache-Control: no-store`, kein `Access-Control-Allow-*`; `<script src=…/api/dateiansicht/0>` einer fremden Seite führt nichts aus (Datei `window.pwned=1;`) | P+B | Header, Konsole | LÜCKE klein (L18) | Header vorhanden (geprobt) |
| H11 | Clickjacking: Seite in `<iframe>` einer fremden Seite | A2 | Rahmen bleibt leer (CSP `frame-ancestors 'none'`) | B | | LÜCKE klein (L18) | Header vorhanden (geprobt) |
| H12 | Statische Auslieferung: `/../../etc/passwd`, `/%2e%2e/…`, `/%252e%252e/`, `\`, `/Index.html`, `/web/..` | A2 | 404; nur eingebettete Dateien | P | | Bestand | 404 (geprobt) |
| H13 | Tröpfeln: Request-Body 1 B/s (Content-Length 100), Header 1 B/s, 100 offene Verbindungen ohne Anfrage | A4 | Server trennt langsame Clients (`MinRequestBodyDataRate`, Header-Frist); andere Anfragen ≤ 1 s; „Schließen“ weiter möglich | P | Zeit bis Trennung messen | LÜCKE klein (L10) | Body-Tröpfeln: Verbindung nach 7 s getrennt (geprobt) |
| H14 | Sehr großer Anfrageteil: Pfad 100 KB, 1 000 Header, Body 100 MiB auf `POST /api/schliessen` | A4 | 414/431/413 oder ignoriert; Lauf läuft weiter; RSS flach | P | | LÜCKE klein (L10) | Content-Length doppelt → 400 (geprobt) |
| H15 | Lauschen: nur `127.0.0.1`; von der LAN-Adresse unerreichbar | A4 | `ss -ltn` zeigt nur `127.0.0.1:P`; Verbindung zur LAN-Adresse abgelehnt | P | | Bestand (`IPAddress.Loopback`) | ok (Code) |
| H16 | Anderes Konto auf demselben Rechner liest `GET /api/dateiansicht/0` (kein Token) | A4 | **Entscheidung E1**: bewusst nicht geschützt (Vision: kein Mehrbenutzerbetrieb); der Inhalt ist hier ein ganzes Dateistück statt eines Diffs | P | `sudo -u` / zweites Konto | **Entscheidung E1** | Review gleich: 200 |

## H. Browser: DOM, Zwischenablage

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| B1 | Inhalt und Name als Text: `<img src=x onerror=…>`, `<script>`, `<svg onload>`, `"><`, `javascript:`, `</textarea></style></title>`, `&lt;b&gt;`, `&amp;`, Markdown/HTML-Datei mit `<iframe srcdoc>` | A3 | spitze Klammern sichtbar; in `#inhalt`, Kopf, Seitenleiste **0** Elemente `img/svg/iframe/script/b`; kein `dialog`-Ereignis; kein Netzwerkaufruf (route-Zähler); Entitäten bleiben wörtlich | B | DOM-Abfrage + `page.on('dialog')` | R43-6 | n.v. |
| B2 | Färbung (Prism im Worker, Rückgabe nur Indizes): `.md`, `.html`, `.php`, `.sql` mit `</span><img onerror>`; Endungen `.extend`, `.insertBefore`, `.DFS`, `.__proto__`, `.constructor`, `.toString`, `.hasOwnProperty` | A3 | nur `span.token`-Klassen; unbekannte/Hilfsnamen ungefärbt; Konsole leer | B | | R00007 (Bestand) + R43-4 | n.v. |
| B3 | Name und Pfad in Attributen und Selektoren: `title`, `aria-label`, `data-*`, `querySelector` mit Name | A3 | nie `innerHTML`; Name `x"] [a="` wirft keine Ausnahme | B | Konsole leer | R43 NFA („nur textContent“) | n.v. |
| B4 | **Kein Kopieren ohne Geste:** `addInitScript` zählt `navigator.clipboard.writeText/write/readText/read`, `document.execCommand('copy')`, `copy`-Ereignis mit `setData` — nach Laden, 3 s Warten, Neuladen, `w`, Suche, Dateiwechsel, „Trotzdem laden“, Fokuswechsel, Sichtbarkeitswechsel | A2/A3 | Zähler **0**; `readText/read` nie (0) | B | Spy | **LÜCKE L17** | n.v. |
| B5 | Unechte Ereignisse: `dispatchEvent(new KeyboardEvent('keydown',{key:'c'}))`, `button.dispatchEvent(new MouseEvent('click'))` aus der Seite | A3 | `isTrusted=false` löst kein Kopieren aus (Härtung gegen Fehler an anderer Stelle) | B | Spy 0 | LÜCKE L17 (Optional) | n.v. |
| B6 | Tastenregel: `c` im Suchfeld; `c` mit Strg/Alt/Meta; Taste gehalten; bei offenem Dialog | A1 | im Feld wird getippt, kein Kopieren; Strg+C ohne markierten Bereich = Browser-Standard; gehalten = je Druck eine Kopie | B | Spy | R43-8, R44-3 | n.v. |
| B7 | Inhalt der Zwischenablage: CRLF, ohne Schluss-LF, BOM weg, U+202E echt, U+FFFD echt, Surrogatpaare, 8 MiB (kein Abschneiden), Dauer ≤ 1 s | A3 | genau die Bytes (UTF-8); **nur** `text/plain` (kein `text/html`, kein `text/uri-list`); Bestätigung „Datei kopiert (n Zeilen)“ mit n = Kopf | B | Zwischenablage mit Marker vorbelegt: bei Verweigerung bleibt der Marker | R43-8 (ohne `text/plain`-nur, ohne 8 MiB) | n.v. |
| B8 | Ersatzweg: Zwischenablage fehlt / `NotAllowedError`; danach Strg+C; danach Strg+C auf freier Auswahl einer Meldung | A1 | Meldung „Zwischenablage verweigert — Strg+C kopiert die Datei“; Strg+C legt den Dateitext ab; **kein** zweites Feld; freie Auswahl kopiert die Auswahl, nicht die Datei | B | | R43-9, R44-3 | n.v. |
| B9 | Bereich (R00044): 3–5 mit CRLF; letzte Zeile ohne Ende; gekürzte Zeile ganz; Bereich über Zeilen mit einzelnem CR (L4); Bereich bei zugeklappter Datei | A1 | Ausschnitt aus dem **vollen** Text samt Zeilenenden, nie Nummern, nie Marken, nie die gekürzte Anzeige | U+B | | R44-2/5 | n.v. |
| B10 | Mehrere Tabs; „Schließen“ in Tab 1, Neuladen in Tab 2; Tab zu | A1 | Tab 2 zeigt einen Fehler ohne Absturz; ein geschlossener Tab beendet nichts | B | | R43 (Ende) | n.v. |
| B11 | Verzögerte Antwort (`route` +1,5 s) beim Wechsel zwischen Dateien | A1 | späte Antwort wird verworfen (R45-5); Kopie gehört zur **angezeigten** Datei | B | | R45-5 | n.v. |

## I. `<commit>:<pfad>` — Eingang A1/A3

Jeder neue git-Aufruf (Eintrag, Auflösen, Blob) läuft über `GitStart`, mit `Ausgabegrenze` und Namensprüfung **am Aufrufort** (Lehren #1, #6, #10, #28).

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| C1 | Erkennen: 3, 4, 64, 65 Hexziffern; `ABCD:x` (groß); `g123:x`; `0000:x`; `<c>:` (leer); `<c>::x`; `<c>:a:b.sql` (weitere `:`) | A1 | 4–64 Hex + nicht leerer Pfad = Commitquelle (erstes `:` trennt, Pfad `a:b.sql`); sonst Datenträger; Schreibweise der Hexziffern eindeutig geregelt | U | Tabelle | R46-2 (Teil) | n.v. |
| C2 | Unbekannter Hash; zweideutiges Kurzhash-Präfix (zwei Commits mit gleichem 4er-Präfix); Tag heißt wie das Präfix; Branch heißt wie das Präfix; `refs/replace` | A3 | „Commit nicht gefunden“ / „mehrdeutig … vollen Hash angeben“ / echter Commit | I | Wegwerf-Repo je Fall | R46-2 | n.v. |
| C3 | Hash eines **Trees**, eines **Blobs**, eines annotierten **Tag-Objekts**, `4b825dc…` (Leerbaum) | A3 | Exit 2 „kein Commit“; nie ein Inhalt (Tag-Objekt wird nicht still zum Commit) | I | je Objektart | **LÜCKE L8** | n.v. |
| C4 | Pfad außerhalb: `<c>:/etc/passwd`, `<c>:../x`, `<c>:../../etc/passwd`, `<c>:sql/../sql/a.sql`, `<c>:sql//a.sql`, `<c>:sql/./a.sql`, `<c>:sql/a.sql/`, `<c>:SQL/A.SQL` | A1/A3 | Exit 2 „Pfad im Commit nicht gefunden“ (wörtlich, Groß/Klein unterschieden); nie eine Datei vom Datenträger | I | **geprobt:** git meldet `outside repository` (Exit 128) bzw. nicht gefunden; Abbildung auf Exit 2 prüfen | R46 („wörtlich“) | n.v. |
| C5 | **Pathspec-Magie im Pfad:** `<c>:/sql/a.sql`, `<c>:(top)sql/a.sql`, `<c>:(icase)SQL/A.SQL`, `<c>:!sql/b.sql`, `<c>:(glob)sql/*.sql`, `<c>:*.sql`, Datei, die wirklich `:x` heißt. **Geprobt:** `git ls-tree -l <H> -- ':(top)sql/a.sql'` und `':/sql/a.sql'` liefern den Eintrag (Magie wird gelesen), `:(icase)`/`:!`/`:(glob)` enden mit Exit 128; ein Pfad mit führendem `:` ist so nicht wörtlich | A3 | alle → „Pfad im Commit nicht gefunden“ (außer die Datei heißt wirklich so); Eintrag und Blob lösen **gleich** auf (T8) | I | Repo C; Tabelle | **LÜCKE L7** (R46 verlangt „wörtlich“, die Vorplanung nennt `git ls-tree … -- <pfad>`) | n.v. |
| C6 | **Ausgabegrenze am Eintrag-Aufruf:** `<c>:big/` (Schrägstrich) in einem Baum mit 200 000 Einträgen | A3 | `ls-tree` mit Schrägstrich listet den **Inhalt**: der Aufruf liest nur bis zur Grenze oder meldet „ist im Commit ein Verzeichnis“ ohne Liste; RSS flach | I | 200 000 Dateien in `big/`, Zähler gelesener Bytes ≤ Grenze + 1 | **LÜCKE L7** (R46-4 bezieht die Grenze nur auf den Blob) | n.v. |
| C7 | Eintrag meldet Größe; Blob größer; Blob genau 8 MiB / + 1; kleine Grenze 16 Bytes bei 40 Bytes; `--batch`-Weg (Rohname) | A3 | „zu groß“ ohne gekürzten Inhalt; gelesen ≤ Grenze + 1; ganz oder gar nicht | I | Zähler | R46-4 | n.v. |
| C8 | Art im Commit: Datei, ausführbare Datei, Verzeichnis, Link (120000), Submodul (160000), fehlt | A3 | lesen / lesen / „Verzeichnis“ / „symbolischer Link“ / „Submodul“ / „nicht gefunden“ (Link-Ziel wird nie als Pfad gelesen) | I | | R46-2 | n.v. |
| C9 | Namen: LF, CR (→ „Name nicht übergebbar“, **kein** git-Aufruf), `ä`, `"`, Tab, `\`, Emoji, `f\xFF`, `U+202E` | A3 | LF/CR Exit 2 ohne git (Marker-`git`); `ä`/`"`/Tab/`\` zeigbar — die Ausgabe des Eintrag-Aufrufs wird nicht durch git-Anführungszeichen (`core.quotePath`) verfälscht (`-z` oder `cat-file --batch-check`); `f\xFF` → L1 | I | Repo mit allen Namen | R46-2 (LF/CR, `U+202E`); Quoting **LÜCKE L7**; L1 | n.v. |
| C10 | Fremde Konfiguration: `diff.<t>.textconv`, `filter.<t>.smudge`, `core.fsmonitor`, `log.showSignature` + `gpg.program`, Partial-Clone `remote.origin.uploadpack`, `core.sshCommand`, `url.<x>.insteadOf`, `include.path`, `.gitattributes` | A3 | keine Markerdatei; Inhalt = Blob ohne Umwandlung; jeder der drei Aufrufe (Auflösen, Eintrag, Blob) einzeln geprüft | I | Marker-Skripte | R46-3 (ohne `sshCommand`, ohne je Aufruf) | n.v. |
| C11 | Repo gehört einem anderen Konto (`dubious ownership`); `.git` als Datei mit `gitdir:`; Startordner im Unterordner, im Worktree | A3 | git verweigert → Exit 2 mit Grund; **nie** `safe.directory=*` gesetzt; Unterordner/Worktree finden das richtige Repo | I | `grep safe.directory src` leer; Lauf | R46-5 (Unterordner) | n.v. |
| C12 | Kein Repository / kein `git`; Mischung `--dateien a.sql <c1>:p` ohne Repo | A1 | Exit 2 mit Meldung aus R00016 **nur** für die Commitquelle; Datenträger-Angabe fehlerfrei; stdout 0 | I+P | | R46-2, R46-6 | n.v. |
| C13 | Dieselbe Commitquelle als Kurz- und Langhash (`c1[:7]:p`, `c1:p`) | A1 | zwei Zeilen (anderer Wortlaut), gleiche Bytes, beide in der Summe | I | | R45-4 (Analog) | n.v. |
| C14 | SHA-256-Repository (64 Hexziffern) | A1 | funktioniert oder Exit 2 mit klarem Grund; nie Absturz | I | | R46 NFA (Hash 4–64) | n.v. |

## J. Ausgänge: stdout, stderr, Exit-Codes

| # | Variante | Akt. | Erwartet | Ebene | Abnahmeprobe | Deckung | heute |
|---|---|---|---|---|---|---|---|
| X1 | stdout in **jedem** Ausgang | A1 | 0 Bytes bei Exit 0, 2, 130, 1; mit `--verbose` und `--quiet`; mit Browser-Öffner (`GITREVIEWA_BROWSER`-Skript schreibt auf stdout); mit git-Kindprozessen | P | `> out; stat -c %s out` = 0 | R43 NFA | Review: Browser und git umgeleitet (Code), Dateiansicht n.v. |
| X2 | stderr ohne Dateiinhalt | A3 | Marker `GEHEIM-7f3a` am Anfang, in der Mitte, am Ende von: Binär-, UTF-16-, Latin-1-, zu großer, guter Datei, Commit-Blob; Läufe: Fehlerstart, Normalstart `--verbose`, nach `GET /0`, Kopieren, Schließen, Strg+C — `grep -c GEHEIM stderr` = 0 (erlaubt: Byte-Wert und Stelle bei ungültigem UTF-8) | P | | R43 NFA („Debug-Zeile ohne Inhalt“) | n.v. |
| X3 | stderr-Form | A3 | genau eine Zeile `<Zeit> FEHLER [Dateiansicht] <Angabe mit Marken>: <Grund>` je fehlerhafter Angabe, in Aufrufreihenfolge; Länge einer Zeile begrenzt (Name 100 KB) | P | Zeilen zählen, Länge messen | R45-2; Länge → L14 | n.v. |
| X4 | Exit 2 vor dem Server | A1 | kein Port gebunden, Browser nicht gestartet (Marker-Browser-Skript wird nicht aufgerufen), stdout 0 | P | `ss -ltnp` ohne Prozess | R43-3 („keine Zeile `http://127.0.0.1`“) | n.v. |
| X5 | Exit 0 nur nach `POST /api/schliessen` | A1 | nicht nach Tab-Zu, nicht nach GET; Antwort 200 kommt **vor** Prozessende; Seite „Dateiansicht geschlossen“ | P+B | | R43-1 | n.v. |
| X6 | Exit 130: SIGINT, SIGTERM; Start über `bash -c '… &'` (geerbtes `SigIgn`, Lehre #21); Signal **während des Lesens** (50 Dateien) und vor dem Serverstart | A1 | 130, stdout 0, stderr „Review abgebrochen“, kein Server-Rest | P | `ps -p` danach, freier Port | R43-1 (nur ein Zeitpunkt) | n.v. |
| X7 | Port belegt; `--port` ungültig | A1 | belegt → Exit 1, ungültig → Exit 2; stdout 0; stderr ohne Dateiinhalt | P | | Bestand (Review) | Exit 1/2 (Code) |
| X8 | Unerwartete Ausnahme beim Lesen (EIO, Datei verschwindet, ENAMETOOLONG, git-Fehler bei Commitquelle: Repo defekt, Objekt fehlt, Zeitüberschreitung) | A3 | **Exit 2** mit Grund-Zeile (Quelle konnte nicht gelesen werden), nie `134`, nie Stacktrace, nie Exit 1 (Exit 1 bleibt dem Serverstart) | P | Fehler per Haken auslösen | **LÜCKE L14** | n.v. |
| X9 | Browser-Start | A1 | `GITREVIEWA_BROWSER`-Skript erhält **genau** `http://127.0.0.1:<port>/` — keine Datei, kein Pfad, kein Inhalt in der URL oder im Argument (Verlauf, `ps`) | P | Skript protokolliert `$@` | LÜCKE klein (L14) | n.v. |

## Lücken (Kriterium fehlt oder ist unscharf) — gehen über den Director an den planer

Schweregrad nach dem Maßstab der Rolle: **Wichtig** = über Oberfläche, Aufruf oder fremde Datei erreichbar und ändert, was gezeigt, kopiert oder gelesen wird; **Optional** = Härtung. Jede Lücke trägt Empfehlung und die Anforderung, in die das Kriterium gehört.

| Lücke | Schwere | Befund und Beleg | Empfehlung (Kriterium) | Gehört in |
|---|---|---|---|---|
| **L1** U+FFFD statt ungültigem Byte im Namen | Wichtig | .NET gibt `f\xFF.sql` als `f�.sql` in `args`; **geprobt:** `File.Exists` ist wahr, wenn eine Datei mit echtem U+FFFD daneben liegt — die Dateiansicht zeigt dann die **andere** Datei. R43-3 („nie eine andere Datei“) wird nur mit fehlender Datei geprüft. Gleiches für den Pfad einer Commitquelle (git bekommt den Ersatznamen) | Jede Angabe (und jeder Pfad einer Commitquelle) mit U+FFFD → Exit 2 „Name nicht übergebbar (ungültiges Byte oder Ersatzzeichen)“. Test mit beiden Dateien im Ordner (N5, N6) | R00043 Kriterium 3, R00046 Kriterium 2 |
| **L2** Art-Prüfung, Öffnen und Lesen als eine Handlung | Wichtig | **Geprobt:** `File.OpenHandle` auf eine FIFO blockiert; `FileAttributes` einer FIFO und eines Geräts ist `Normal`, `File.GetUnixFileMode` liefert nur Rechte. R43 nennt „Art am geöffneten Handle“ in der Beschreibung, aber kein Kriterium für den Austausch zwischen Prüfen und Öffnen und keines für Konsistenz bei sich änderndem Inhalt | Kriterium: Haken zwischen Prüfen und Öffnen — Austausch durch Link, FIFO, Verzeichnis ergibt Exit 2 in ≤ 2 s, Zielinhalt nie gelesen (T1–T3); Anzeige, Größe, Zeilenzahl und Kopie stammen aus **denselben** gelesenen Bytes (T5). Mechanik (nichtblockierend öffnen ohne Folgen, `fstat`) entscheidet der entwickler (Missing-Docs R00043 vorab proben) | R00043 |
| **L3** Null-Byte nur in den ersten 8 000 Bytes | Wichtig | Kriterium und Tabelle: „enthält Null-Bytes“; die Vorplanung übernimmt die 8 000-Byte-Regel des Diffs. Ein Null-Byte dahinter passiert; Terminal und Editoren schneiden beim Einfügen ab oder lassen es still fallen — was kopiert wird, ist nicht, was ausgeführt wird | Ganze gelesene Datei auf 0x00 prüfen (liegt ohnehin im Speicher); Unit-Tabelle I1 | R00043 Kriterium 3, Vorplanung B4203 |
| **L4** Einzelnes CR | Wichtig | R43: „ein CR vor dem LF ist Zeilenende, keine Marke“ — **ein CR ohne LF** ist nicht definiert. Im Browser rendert es als Leerraum (kein Umbruch, keine Marke), ein Terminal führt es beim Einfügen als Eingabe aus (`-- harmlos⏎DROP TABLE x;`) | Einzelnes CR (nicht vor LF) = Marke `⟨U+000D⟩`, kein Zeilenende, im Kopf „Zeilenende: gemischt“ nur bei LF und CRLF; Kopie unverändert (I7, B9) | R00043 (Anzeige, Kriterium 8), R00044 |
| **L5** Gekürzte Zeile: kopiert, aber unsichtbar und unauffindbar | Wichtig | Kopiert wird „ganz“, gezeigt 10 000 Zeichen, die Suche läuft über die **gezeigten** Zeilen: ein Anhang jenseits der Kürzung (`; DROP TABLE x;` nach 20 000 Leerzeichen) wird mitkopiert, ohne dass der Mensch ihn sehen oder finden kann. Die Marke „… (k weitere Zeichen)“ hilft nur dem, der sie liest | Siehe Entscheidung E3: Bestätigung „Datei kopiert (n Zeilen, davon k nur gekürzt gezeigt)“ und Kopf-Hinweis; Suche zählt Treffer im ungezeigten Teil; Probe I11 | R00043 (Anzeige, Kriterium 5/8), R00044 (Suche) |
| **L6** Fremder Origin auf **GET** | Optional | R43-10: „Anfrage mit fremdem Host oder Origin … abgelehnt wie in R00002“ — R00002 schützt nur POST. **Geprobt:** `GET /api/commits` mit `Origin: http://evil` → 200. Die Antwort trägt kein `Access-Control-Allow-*`, ist `application/json` mit `nosniff`: eine fremde Seite kann sie nicht lesen, aber der Leser wird nicht „abgewiesen“ | Entscheidung E2: für `/api/dateiansicht*` fremder oder `null`-Origin und `Sec-Fetch-Site: cross-site` → 403 (H7) | R00043 Kriterium 10 |
| **L7** Eintrag im Commit: Pathspec-Magie, Anführungszeichen, Ausgabegrenze | Wichtig | **Geprobt:** `git ls-tree -l <H> -- ':(top)sql/a.sql'` und `':/sql/a.sql'` werden als Magie gelesen und liefern den Eintrag; `:(icase)`, `:!`, `:(glob)` enden mit 128; ein Pfad mit führendem `:` ist nicht wörtlich. `ls-tree dir/` listet den **Inhalt** (Baum mit 200 000 Einträgen). Gequoteter Pfad (`core.quotePath`) bei `ä`, `"`, Tab. R46 verlangt „wörtlich“ und Grenze nur am Blob; der Eintrag (Vorplanung B4262) ist ein **neuer** git-Aufruf ohne eigenes Kriterium (Lehre #10) | Kriterium: derselbe Pfad löst im Eintrag-Aufruf und im Blob-Aufruf gleich auf (entweder beides über `<H>:<pfad>`, z. B. `cat-file --batch-check`, oder `GIT_LITERAL_PATHSPECS=1` in `GitStart`); `-z` oder `--batch-check` statt gequoteter Ausgabe; `Ausgabegrenze` auch am Eintrag-Aufruf; Marker- und Grenzprobe je Aufruf (C5, C6, C9, T8) | R00046 Kriterien 2–4 |
| **L8** Objektart des „Commits“ | Wichtig | R46 prüft Hash gegen die Eingabe, aber nicht, dass das Objekt ein **Commit** ist: Tree-Hash (`<tree>:pfad` löst in git auf), Blob-Hash, Hash eines annotierten Tag-Objekts (wird beim Peelen zu einem anderen Hash) | Nur Commit-Objekte; sonst Exit 2 „kein Commit“ (C3) | R00046 Kriterium 2 |
| **L9** Eindeutigkeit der Gründe und Zeilenzählung | Optional | Rangfolge bei mehreren Gründen (BOM-UTF-16 + Null-Bytes + > 8 MiB) unbestimmt; „Stelle“ bei BOM (ab Dateianfang oder nach BOM) ungeklärt; Zeilenzahl für 0 Bytes, `\n`, BOM-only; UTF-32-BOM; Hex-Schreibweise des `<commit>` (Groß/Klein) | Rangfolge festlegen: Art → Größe → UTF-16/32-BOM → Null-Byte → UTF-8; Stelle = Byte ab 1 der **Datei** (mit BOM); eine Definition der Zeilenzahl (I2, I3, I6, C1) | R00043 Kriterium 3 |
| **L10** Speicher und Zeit je Byte, Summe, gleichzeitige Abrufe | Wichtig | Verfügbarkeit mit fremder Datei (A3) und mehreren Lesern (A4): 8 MiB aus LF ergeben 8,4 Mio. Zeilen, aus `<`/`ä`/`\x01` bis zu 6 × Antwort (JSON-Escape) bzw. 8 × Marken; die Summe von 32 MiB wird nach R45-3 erst **nach** dem Lesen aller Angaben geprüft (50 × 8 MiB wären 400 MiB gelesen); Mehrfach-Abruf kopiert den Text je Antwort. Kein Kriterium nennt Speicher oder Lesemenge | Kriterien: (a) Lesen bricht ab, sobald die Summe überschritten ist, ein gemeinsamer Zähler für Datei und Commit (G4–G6); (b) RSS-Zuwachs ≤ 10 × Summe + 100 MiB und Antwort ≤ 6 × Datei + 1 KiB (**Hypothesen — messen und eintragen**), Zeilen nicht als Liste von Strings, Marken nur für gezeigte Zeilen (G7); (c) Antwort wird nicht je Abruf kopiert, langsame Leser werden getrennt, „Schließen“ bleibt ≤ 1 s möglich (G8, H13, H14) | R00043 NFA, R00045 |
| **L11** Lesen ohne Zeitgrenze | Optional | Reguläre Dateien, deren `read` nie zurückkehrt (`/proc/kmsg` als root, FUSE, NFS), halten den Start auf unbestimmte Zeit | Zeitgrenze (Hypothese 10 s) → Exit 2; Strg+C bricht das Lesen ab (P16) | R00043 NFA |
| **L12** Windows-Pfadformen | Optional | UNC (`\\host\share`) löst auf Windows eine Anmeldung am fremden Server aus; Gerätenamen, Datenströme (`::$DATA`), nachgestellter Punkt/Leerzeichen, 8.3-Namen ändern die Datei. Die Anwendung kennt Windows (`BrowserStart`) | Entscheidung E5: auf Windows Netzwerk- und Gerätepfade ablehnen; Probe auf Windows 11 durch den Betreiber (N9) | R00043 Kriterium 3 |
| **L13** Zeilenzahl im DOM nach „Trotzdem laden“ | Optional | Zuklappen ab 20 001 Zeilen ist definiert; 8,4 Mio. Zeilen nach dem Klick sind es nicht (Blockgrenze aus R00017 erwähnt, kein Kriterium) | Kriterium: Zeichnen in Blöcken oder Obergrenze, Tab bleibt bedienbar (G9) | R00043 Kriterium 5 |
| **L14** Fehler beim Lesen → Exit 2, nie Absturz; Randfälle der Angabe | Wichtig | Der Aufrufpfad fängt `GitFehler` und `IOException` mit **Exit 1** (Program.cs), unbehandelte Ausnahmen enden mit 134 und Stacktrace; die Dateiansicht liest vor dem Serverstart: Leerer Pfad, zu langer Pfad, EIO (`/proc/self/mem`), verschwundene Datei, defektes Repo, NFD/NFC | Kriterium: jede Ausnahme beim Lesen einer Angabe → Exit 2 mit einer Grund-Zeile, nie 1 oder 134, stderr-Zeile auf 400 Zeichen gekürzt; Browser-Öffner erhält nur die Adresse (P8, P9, P15, N8, X3, X8, X9) | R00043 Kriterium 3, R00045 |
| **L15** Routing tolerant, Zahlform | Wichtig | **Geprobt:** `/API/zustand`, `/api/zustand/`, `/api/%2e%2e/api/zustand` → 200 — die Laufart-Trennung (Review-Endpunkte 404) muss alle Schreibweisen treffen; R43-10 prüft nur die exakte. Nummern: Unicode-Ziffern, Überlauf (`4294967296`), Schrägstrich | Kriterium: H3 (alle Endpunkte × 5 Schreibweisen × GET/POST, beide Laufarten) und H1 (Marker je Datei) | R00043 Kriterium 10 |
| **L16** stdin und git bei Datenträger-Angaben | Optional | R43-3 prüft „ohne git im Suchpfad“; der Test sieht keinen Aufruf von git (Marker) und nicht, dass stdin nie gelesen wird (Hängen bei FIFO/`/dev/zero`) | Marker-`git`, fremde `.git/config`, stdin als FIFO (P12, P13) | R00043 Kriterium 2/3 |
| **L17** Zwischenablage nur auf Geste | Wichtig | Kriterien 8/9 beweisen das Kopieren, nicht, dass **nie** ohne Geste geschrieben oder gelesen wird | Spy-Test B4 (Zähler 0 in allen Zuständen); `isTrusted`-Prüfung (B5) als Härtung | R00043 Kriterium 8/9 |
| **L18** Antwortköpfe und Rahmen der Dateiansicht | Optional | Header sind am Bestand geprobt (CSP `frame-ancestors 'none'`, `nosniff`, `no-store`, kein CORS); für die neuen Endpunkte steht keine Probe | Test H10, H11 | R00043 Kriterium 10 |
| **L19** DNS-Rebinding im echten Browser | Optional | R43-10 prüft Host nur auf Anfrage-Ebene (curl) | Playwright-Test H5 mit `--host-resolver-rules` | R00043 Kriterium 10 |
| **L20** Kürzung an der Zeichengrenze | Optional | 10 000 „Zeichen“ in UTF-16-Einheiten können ein Surrogatpaar teilen (`⟨U+D83D⟩`, k falsch) | Unit G11 | R00043 Kriterium 5 |

## Entscheidungen (offen) — Empfehlung zuerst

- **E1 Anderes Konto auf demselben Rechner (H16).** Kein Zugriffstoken; jedes Konto erreicht `127.0.0.1:<port>` und liest den Dateiinhalt. Empfehlung: bewusst so lassen (Vision: „Kein Mehrbenutzerbetrieb“), in der Vision einen Satz zum Restrisiko ergänzen; ein Token je Lauf wäre eine eigene Karte mit Änderung der Adresse (R00001).
- **E2 Fremder Origin auf GET (L6).** Empfehlung: für `/api/dateiansicht*` bei vorhandenem fremdem oder `null`-Origin und bei `Sec-Fetch-Site: cross-site` 403 — ein Satz im Kriterium, eine Funktion, kein Eingriff in die Review-Endpunkte (die bleiben, bis eine eigene Karte sie anpasst).
- **E3 Gekürzte Zeilen (L5).** Empfehlung: die Bestätigung nennt „davon k nur gekürzt gezeigt“, der Kopf zeigt denselben Hinweis, die Suche zählt Treffer im ungezeigten Teil; **nicht** die Kürzung abschaffen (PO Zeile 204 bleibt). Alternative, falls billig: Umbruch an zeigt Zeilen bis 10 000 Zeichen ohnehin vollständig, nur darüber gilt die Kürzung — dann reicht der Hinweis.
- **E4 U+FFFD (L1).** Empfehlung: Angabe mit U+FFFD immer ablehnen, auch wenn die Datei wirklich so heißt (Eindeutigkeit vor Ausnahme).
- **E5 Windows (L12).** Empfehlung: Netzwerk- und Gerätepfade ablehnen, mehr nicht; falls Windows nicht Ziel dieser Karte ist, die Zeile N9 als nicht abgedeckt mit Grund führen.

## Nicht abgedeckt

- **Linie 3 (vorgelagerter Server/Proxy)**: besteht nicht; Kestrel lauscht allein auf `127.0.0.1`.
- **Name mit Null-Byte**: über `argv` nicht herstellbar.
- **Firefox/WebKit-Zwischenablage**: Playwright prüft Chromium; Verhalten der anderen Browser (Berechtigung, CRLF) bleibt manuelle Abnahme (R43 Missing-Docs).
- **Homoglyphen und Leerzeichen-Lookalikes** (kyrillisches `а`, NBSP, U+3164, U+2800): werden nicht markiert (Klasse Cc, Cf, Zl, Zp); Anmerkung, keine Lücke dieser Karte.
- **Fremde Objekte über `objects/info/alternates`** und die `GIT_*`-Umgebung des Aufrufers: der Aufrufer ist vertrauenswürdig; Alternates verraten nur Objekte, deren Hash man kennt.
- **Verlaufsprogramme der Zwischenablage** (Verlaufsprogramme, die Kopiertes protokollieren): außerhalb der Anwendung.
- **Timing-Enumeration**: es gibt kein Geheimnis, das Antwortzeiten verraten könnten.

## Abnahmeprobe-Reihenfolge für den Bau (Vorschlag)

1. Gründe-Tabelle R43-3 und P1–P16/N1–N9 als Tabellentest gegen `DateiansichtStartInteractor` (Haken für T1–T5).
2. Zähler am Leseort für G1–G6 (Datei und Commit gemeinsam), danach die RSS-Messung G7/G8.
3. HTTP-Zeilen H1–H4, H6, H8 als Prozess-Test gegen eine echte Instanz (Python-`socket` oder .NET-Client, **nicht** nur `TestServer`).
4. Browser: B1–B8 in einem Playwright-Spec (`--workers=1`), `c`-Taste und Ersatzweg mit `addInitScript`.
5. Commitquelle C1–C14 gegen Repo C und je ein Wegwerf-Repo für C2, C3, C5, C6.
6. **Mutationsprobe** (Lehre „Wächter einzeln abschalten“): je Wächter (Link, Art, Größe, Summe, Binär, UTF-8, U+FFFD, Origin, Host, Methode, Inhaltstyp, Laufart-Trennung, Commit-Hash-Prüfung, Objektart, Namensprüfung, Ausgabegrenze Eintrag/Blob) ein Mutant — jeder muss mindestens eine Zeile dieser Matrix rot färben.
