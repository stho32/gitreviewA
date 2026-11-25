---
id: R00043
status: Neu
datum: 2026-11-25
---

# R00043: Eine Datei ansehen und ganz kopieren

## Beschreibung

`gitreviewA --dateien <pfad>` öffnet statt eines Reviews die **Dateiansicht**: eine Datei vom Datenträger steht ganz da, mit Zeilennummern, Syntaxhervorhebung und Umbruch. „Datei kopieren“ (Knopf und Kürzel `c`) legt ihren Text byte-genau in die Zwischenablage, ohne Zeilennummern, mit sichtbarer Bestätigung und einem Ersatzweg, wenn der Browser die Zwischenablage verweigert. Lässt sich die Datei nicht zeigen (fehlt, nicht lesbar, Verzeichnis, Link, keine reguläre Datei, binär, zu groß, nicht UTF-8), nennt gitreviewA den Grund auf stderr und endet vor dem Serverstart mit Exit 2. Die Dateiansicht hat kein Ergebnis: stdout bleibt leer, „Schließen“ endet mit Exit 0, Strg+C oder Signal mit „Review abgebrochen“ und Exit 130.

Zahlt ein auf: [Vision](R00000-vision.md) — „Einzelne Dateien ansehen und kopieren“ (Betreiber 2026-11-25: „Außerdem brauch ich noch irgendwas um nur einzelne Dateien anzusehen. Zum Beispiel habe ich öfter das Problem, dass man eine oder mehrere SQL Dateien ausführen soll. Die könnte man mit dem Review Tool anzeigen. Man müsste natürlich den Inhalt ganz oder teilweise kopieren können.“).

Entschieden vom product-owner (`AI-Team/po-entscheidungen.md`, Zeilen 200/201): Quellen sind Dateien vom Datenträger, auch ungetrackt oder außerhalb jedes Repositories, und `<commit>:<pfad>` (R00046); nur die beim Start genannten Dateien, der Browser nennt nur eine Nummer; nur Ansehen und Kopieren; stdout leer, Exit 0 beim Schließen, 130 beim Abbruch. Ein Lauf ist entweder Review oder Dateiansicht.

Baut auf auf: [R00001](R00001-mit-commit-hashes-aufrufen.md) (Start, Port, Browser), [R00016](R00016-ungueltiger-aufruf.md) (Exit 2 vor dem Server), [R00005](R00005-review-abbrechen.md) (Abbruch), [R00007](R00007-syntaxhervorhebung.md) (Färbung), [R00017](R00017-grosse-diffs.md) (Ausgabegrenze, Zuklappen, Blockgrenze), [R00032](R00032-umbruch-standardmaessig-an.md) (Umbruch an), [R00020](R00020-befunde-kopieren.md) (Zwischenablage).

### Domänenbezug

Kein Glossar. „Dateiansicht“: die Laufart neben dem Review. „Angabe“: ein Argument nach `--dateien`. „Echter Pfad“: der vom Betriebssystem aufgelöste absolute Pfad.

## Geschäftlicher Nutzen

Eine KI schreibt eine SQL-Datei und sagt „bitte ausführen“. Heute öffnet der Mensch dafür einen Editor oder `cat` im Terminal und markiert von Hand — mit Zeilennummern, abgeschnittenen Zeilen oder falschen Zeilenenden im Kopierten. Mit der Dateiansicht ruft die KI (oder der Mensch) gitreviewA mit der Datei auf, der Mensch liest sie gefärbt und kopiert sie mit einem Druck genau so, wie sie auf dem Datenträger steht.

## Funktionale Anforderungen

- **Aufruf**: `gitreviewA --dateien <pfad> [--port n] [--kein-browser] [--verbose|--quiet]`; Optionen dürfen vor und nach der Angabe stehen, nach `--` ist jedes Argument eine Angabe (so ist `-x.sql` zeigbar). Diese Anforderung zeigt **genau eine** Angabe; zwei oder mehr enden bis [R00045](R00045-mehrere-dateien-in-der-seitenleiste.md) mit Exit 2 und der Meldung „Die Dateiansicht zeigt eine Datei“.
- **Entweder Review oder Dateiansicht** (Pflichtpunkt 5, die eine Stelle): der Aufrufleser bestimmt die **Laufart** einmal. `--dateien` zusammen mit einem Hash, einem Bereich, `-` (stdin) oder `--ignore` endet mit Exit 2 („Review oder Dateiansicht, nicht beides“); `--dateien` ohne Angabe ebenso. Server (welche Endpunkte es gibt), Oberfläche (welche Seite), Ende (Ergebnis auf stdout oder keines) und Abbruch lesen nur diese Laufart.
- **Nur die genannte Datei**: die Angabe wird beim Start gelesen und geprüft; der Server hält ihren Inhalt im RAM (Stand beim Start) und liefert ihn nur über eine **Nummer** (`0`); der Browser nennt nie einen Pfad. Es gibt kein Verzeichnis-Listing, kein Durchwandern, kein Nachladen vom Datenträger nach dem Start; ein Neuladen der Seite zeigt denselben Stand.
- **Prüfung beim Start** (eine Stelle: `Quellengrund`, Wortlaut fest): „Datei nicht gefunden“, „Datei nicht lesbar“, „ist ein Verzeichnis“, „ist ein symbolischer Link — bitte das Ziel nennen“, „keine reguläre Datei“ (FIFO, Gerät, Socket), „zu groß (über 8 MiB)“, „Binärdatei — enthält Null-Bytes“ (wie R00024), „UTF-16 wird nicht unterstützt“, „keine gültige UTF-8-Kodierung (Byte 0xE9 an Stelle 12)“. Mit Grund: eine Zeile `<Zeit> FEHLER [Dateiansicht] <Angabe mit Marken>: <Grund>` auf stderr, Exit 2, kein Server, stdout 0 Bytes.
- **Links und Pfade**: ist der **letzte** Teil der Angabe ein symbolischer Link, wird abgelehnt (der Name sagte etwas anderes als der Inhalt). Links in Ordnern davor und `..` sind erlaubt — die Angabe kommt vom Aufrufer, der dieselben Rechte hat wie `cat`; der Kopf zeigt deshalb immer den **echten Pfad** neben der Angabe, so ist jeder Umweg sichtbar. Ein Git-Repository ist nicht nötig, `git` wird für Dateien vom Datenträger nicht gestartet.
- **Kodierung**: UTF-8 mit oder ohne BOM. Die BOM wird nicht gezeigt und nicht mitkopiert; der Kopf nennt „UTF-8 mit BOM“. Ungültiges UTF-8 wird abgelehnt statt mit Marken gezeigt, weil Marken das byte-genaue Kopieren brächen.
- **Anzeige** (Standard zuerst): ganze Datei, Zeilennummern ab 1, Umbruch **an** (Schalter und `w` wie R00032), Färbung nach Dateiendung mit den Sprachen aus R00007 (SQL, C#, JavaScript, Python, Bash, YAML, JSON, Markdown, TOML, PHP, Rust, CSS, HTML), unbekannte Endung ungefärbt; Grenzen der Färbung wie R00007. Über 20 000 Zeilen ist der Inhalt zugeklappt mit „Trotzdem laden“ (R00017). Eine gezeigte Zeile endet nach 10 000 Zeichen mit der Marke „… (k weitere Zeichen)“; kopiert wird sie ganz. Eine leere Datei zeigt „Datei ist leer“. Unsichtbare und richtungsändernde Zeichen in Namen und Inhalt erscheinen als Marke `⟨U+202E⟩` (`Fremdtext/UnsichtbareZeichen`, keine zweite Liste); ein CR vor dem LF ist Zeilenende, keine Marke.
- **Kopf**: Angabe, echter Pfad, Größe in Bytes, Zeilenzahl, Kodierung, Zeilenende (LF, CRLF, gemischt, keins), Knopf „Datei kopieren“, Knopf „Schließen“; höchstens zwei Zeilen hoch, längere Pfade in der Mitte gekürzt mit „…“, der volle Pfad als zugänglicher Name.
- **Datei kopieren**: Knopf und Kürzel `c` (außerhalb von Feldern, ohne Strg/Alt/Meta, Eintrag im Katalog von R00030 mit Laufart) schreiben den Text der Datei in die Zwischenablage — byte-genau: die UTF-8-Bytes des Kopierten gleichen den Bytes der Datei nach einer BOM, samt CRLF und fehlendem Schluss-Zeilenumbruch; nie Zeilennummern, nie Marken, nie die gekürzte Anzeige. Bestätigung „Datei kopiert (n Zeilen)“ als höfliche Live-Region; bei leerer Datei ist der Knopf gesperrt mit Grund.
- **Ersatzweg**: fehlt die Zwischenablage oder verweigert der Browser sie, steht „Zwischenablage verweigert — Strg+C kopiert die Datei“, die Datei ist als Kopierziel markiert, und Strg+C legt denselben Text ab (Kopier-Ereignis des Browsers, das ohne Berechtigung schreiben darf). Der Inhalt erscheint dafür in keinem zweiten Feld.
- **Ende**: „Schließen“ (ohne Nachfrage, es geht nichts verloren) beendet den Lauf mit Exit 0, stdout 0 Bytes, die Seite zeigt „Dateiansicht geschlossen“. Strg+C oder Signal: stdout leer, „Review abgebrochen“ auf stderr (Wortlaut der Vision), Exit 130. Ein geschlossener Tab beendet nichts.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): eine Angabe; je Datei höchstens 8 MiB (`Ausgabegrenze.Standard`, ganz oder gar nicht: gelesen wird höchstens Grenze + 1 Byte, die Größenangabe des Dateisystems zählt nicht); Zuklappen ab 20 001 Zeilen; gezeigte Zeile höchstens 10 000 Zeichen; Färbung nur bis 262 144 Zeichen und 1 000 Zeichen je Zeile (R00007); stdout in jedem Ausgang 0 Bytes; stderr eine Zeile je Grund, Name mit Marken.
- **Sicherheit**: Angriffsmatrix unten ist Kriterium; nur `textContent`, nie `innerHTML` für Namen und Inhalt; Endpunkte nur mit Anfrageschutz (Host, Origin, POST für Schließen) wie R00002; die Review-Endpunkte (`/api/commits`, `/api/diff`, `/api/haken`, `/api/anmerkungen`, `/api/ergebnis`, `/api/beenden`) antworten in der Dateiansicht 404.
- **Performance**: Oberfläche ≤ 2 s nach Aufruf bei einer 8-MiB-Datei (Lastprofil); Lesen beim Start ≤ 1 s für 8 MiB.
- **Logging** (Pflichtpunkt 4): Startgründe auf stderr (Prozess); Kopieren, Ersatzweg und Zuklappen nur im Browser, keine stderr-Zeile; Debug-Zeile beim Schließen ohne Inhalt.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Entwurf Fassung 2 (Kopf, Knöpfe, Rollbereich), keine eigenen Vorgaben; Gründe als Text, nie nur Farbe.

## Akzeptanzkriterien

Vorbereitung: **Ordner D** außerhalb jedes Repositories, angelegt mit dem Skript in `user-stories/R00043.md` (u. a. `a.sql` 3 Zeilen LF, `crlf.sql`, `ohne-ende.sql`, `bom.sql`, `leer.sql`, `latin1.sql`, `utf16.sql`, `bin.dat`, `lang.sql` 30 000 Zeilen, `breit.sql` eine Zeile mit 50 000 Zeichen, `grenze.sql` genau 8 388 608 Bytes, `ueber.sql` 8 388 609 Bytes, `trojan.sql`, `xss.sql`). Aufruf `gitreviewA --dateien <angabe> --kein-browser`, im Browser 1280 × 800.

### Aufruf und Ende
- [ ] 1. Gegeben Ordner D, wenn man `--dateien a.sql` startet, dann läuft der Server, `GET /api/dateiansicht` nennt genau eine Datei (Nummer 0, 3 Zeilen, UTF-8, LF), und nach „Schließen“ endet der Prozess mit Exit 0, stdout hat 0 Bytes. Mit Strg+C (Start über `bash -c '… &'`, Lehre #21) oder SIGTERM statt „Schließen“: stdout 0 Bytes, „Review abgebrochen“ auf stderr, Exit 130. *Ebene: Integration (Programm als Prozess).*
- [ ] 2. Gegeben ein Repository mit Commit `a`, wenn man `--dateien a.sql <a>`, `--dateien a.sql -`, `--dateien a.sql --ignore '*.md'` oder `--dateien` allein startet, dann je Exit 2, eine Meldung auf stderr, kein Server, stdout 0 Bytes; `gitreviewA <a>` ohne `--dateien` startet unverändert den Review. *Ebene: Unit (Aufrufleser) und Integration.*

### Gründe beim Start (Angriffsmatrix, Teil Datenträger)
- [ ] 3. Gegeben Ordner D, wenn man je Zeile der Tabelle startet, dann gilt die Spalte „Ergebnis“, jeweils mit stdout 0 Bytes; bei Exit 2 steht genau eine Zeile `FEHLER [Dateiansicht]` mit dem Grund im Wortlaut und keine Zeile mit `http://127.0.0.1`. Abgetastet wird die ganze Tabelle, kein Beispiel. *Ebene: Integration gegen den `DateiansichtStartInteractor` (Tabelle) und je eine Zeile als Prozess.*

| Angabe | Ergebnis |
|---|---|
| `fehlt.sql` | Exit 2, „Datei nicht gefunden“ |
| `gesperrt.sql` (Rechte 000, Test nicht als root) | Exit 2, „Datei nicht lesbar“ |
| `ordner` | Exit 2, „ist ein Verzeichnis“ |
| `link.sql` → `/etc/hostname` | Exit 2, „ist ein symbolischer Link — bitte das Ziel nennen“ |
| `fifo.sql` (FIFO ohne Schreiber), `/dev/zero` | Exit 2, „keine reguläre Datei“, ohne Hängen (≤ 2 s) |
| `ueber.sql` (8 388 609 Bytes) / `grenze.sql` (8 388 608 Bytes) | Exit 2, „zu groß (über 8 MiB)“ / zeigbar |
| `bin.dat` (`A`, Null-Byte, `B`) | Exit 2, „Binärdatei — enthält Null-Bytes“ |
| `utf16.sql` (BOM FF FE) | Exit 2, „UTF-16 wird nicht unterstützt“ |
| `latin1.sql` (`SELECT 'caf` + Byte 0xE9) | Exit 2, „keine gültige UTF-8-Kodierung (Byte 0xE9 an Stelle 12)“ — Stelle ab 1 gezählt, `SELECT 'caf` hat 11 Bytes |
| `fehlt⟨U+202E⟩⟨U+200B⟩⟨U+E0041⟩.sql` (die drei Zeichen roh im Namen, Datei fehlt) | Exit 2, Name auf stderr mit genau diesen Marken, nie roh |
| `unter/../a.sql`, `ordnerlink/a.sql` (Ordner-Link auf D) | zeigbar, Kopf nennt den echten Pfad `<D>/a.sql` |
| `zeile⏎umbruch.sql` (LF im Namen), `cr⏎.sql` (CR im Namen) | zeigbar, Name mit `⟨U+000A⟩` bzw. `⟨U+000D⟩` in einer Zeile |
| `-- -x.sql` | zeigbar (Angabe nach `--`) |
| Angabe mit ungültigem Byte im Namen (`f\xFF.sql`, über python3 angelegt) | Exit 2, „Datei nicht gefunden“ — nie eine andere Datei |
| `a.sql` in einem Ordner ohne Repository und ohne `git` im Suchpfad | zeigbar (kein git-Aufruf) |

### Anzeige
- [ ] 4. Gegeben `a.sql`, wenn die Seite steht, dann zeigt der Kopf `a.sql`, den echten Pfad, „36 Bytes · 3 Zeilen · UTF-8 · LF“, die Zeilen tragen die Nummern 1–3, `SELECT` ist als Schlüsselwort gefärbt, und der Umbruch ist an; nach `w` ist er aus, nach dem Neuladen wieder an. Rechnung: `SELECT 1;` (9) + `-- Kommentar` (12) + `SELECT 'ä';` (12, ä = 2 Bytes) + 3 × LF = 33 + 3 = 36. *Ebene: Integration (Liste am Interactor) und Playwright (Darstellung, Browser-Eigenes).*
- [ ] 5. Gegeben `lang.sql` (30 000 Zeilen), dann ist der Inhalt zugeklappt mit „Trotzdem laden“ und 30 000 im Hinweis; „Datei kopieren“ kopiert trotzdem alle 30 000 Zeilen. Gegeben `breit.sql`, dann endet die gezeigte Zeile nach 10 000 Zeichen mit „… (40 000 weitere Zeichen)“, und kopiert werden 50 000 Zeichen. Rechnung: 50 000 − 10 000 = 40 000. *Ebene: Integration (Text am Interactor) und Playwright (Zuklappen, Kürzung).*
- [ ] 6. Gegeben `xss.sql` (Inhalt `<img src=x onerror=alert(1)>`, Name `<b>x</b>.sql`) und `trojan.sql` (Zeile mit U+202E), wenn sie gezeigt werden, dann stehen Name und Inhalt als Text (spitze Klammern sichtbar, kein `img`/`b`-Element, kein Dialog), und U+202E steht als `⟨U+202E⟩`. *Ebene: Playwright (DOM-Sicherheit, Browser-Eigenes).*
- [ ] 7. Gegeben ein Pfad von 300 Zeichen, dann ist der Kopf höchstens zwei Zeilen hoch, der Pfad in der Mitte gekürzt, und sein zugänglicher Name nennt ihn ganz; der Inhalt scrollt im eigenen Rollbereich, Kopf und Knöpfe stehen. *Ebene: Playwright (Darstellung).*

### Kopieren
- [ ] 8. Gegeben `crlf.sql`, `ohne-ende.sql`, `bom.sql` und `trojan.sql`, wenn man „Datei kopieren“ bzw. `c` betätigt, dann gleicht die Zwischenablage (UTF-8) Byte für Byte der Datei — bei `bom.sql` ohne die drei BOM-Bytes —, enthält keine Zeilennummer und keine Marke (U+202E ist das echte Zeichen), und „Datei kopiert (n Zeilen)“ steht da. *Ebene: Unit (Text am Interactor) und Playwright (Zwischenablage gelesen mit Berechtigung, Chromium).*
- [ ] 9. Gegeben ein Browser, in dem die Zwischenablage fehlt oder mit `NotAllowedError` ablehnt (`addInitScript`), wenn man „Datei kopieren“ betätigt, dann steht „Zwischenablage verweigert — Strg+C kopiert die Datei“, und ein folgendes Strg+C legt denselben Text wie Kriterium 8 ab; der Inhalt erscheint in keinem zweiten Feld. Gegeben `leer.sql`, dann ist „Datei kopieren“ gesperrt mit „Datei ist leer“. *Ebene: Playwright (Browser-Eigenes).*

### Nur über die Nummer
- [ ] 10. Gegeben ein laufender Lauf mit `a.sql`, wenn man `GET /api/dateiansicht/1`, `/-1`, `/01`, `/0x0`, `/..%2f..%2fetc%2fpasswd`, `/0?pfad=/etc/passwd` und die Review-Endpunkte abfragt, dann liefert nur `/0` den Inhalt von `a.sql` (`/0?pfad=…` liefert ihn ebenfalls oder 400, nie einen anderen Inhalt), alle anderen 400 oder 404 ohne Dateiinhalt; eine Anfrage mit fremdem Host oder Origin, und `POST /api/schliessen` ohne Anfrageschutz, werden abgelehnt wie in R00002 (der Lauf läuft weiter). *Ebene: Integration (Endpunkte gegen echten Server).*

Grenz- und Leerfälle bedacht: 8 MiB genau und + 1 (Kriterium 3), leere Datei (9), 20 000/20 001 Zeilen (Grenze aus R00017, Test im Bau), Zeile 10 000/10 001 Zeichen (5, Unit), Datei ohne Schluss-LF (8). Verworfen: Datei nach dem Start ändern und neu laden (Stand beim Start ist Regel, ein Test genügt beim Bauen); Latin-1/UTF-16 anzeigen (entschieden, PO Zeile 209: spätere Ausbaustufe, bis dahin Exit 2 — Notiz unten).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 3, 5 (eine Angabe, 8 MiB, 20 000 Zeilen, 10 000 Zeichen je Zeile, stdout 0 Bytes); 2 Anzeigeverfahren — die Dateiansicht kennt ganze Datei mit Umbruch an (Standard, Kriterium 4), Umbruch aus (4), zugeklappt (5); „Zusammen/Einzeln“, Anordnung, Leerraum, Lücken gibt es hier nicht und das Menü „Ansicht ▾“ (R00039) erscheint nicht; 3 festes Layout — Kriterium 7 (Kopf höchstens zwei Zeilen, Inhalt im Rollbereich), Meldungen einzeilig; 4 Ausführungsort — Startgründe auf stderr, Kopieren nur Browser (Kriterien 3, 9); 5 eine Stelle — die Laufart aus dem Aufrufleser (Kriterium 2: Server, Seite, Ende, Abbruch lesen sie) und `Quellengrund` für alle Startgründe (Kriterium 3).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Aufruf/` — `Aufrufleser` (Laufart, `--dateien`, `--`).
- `src/GitReviewA/Dateiansicht/` (neu) — Lesen, Einordnen, Interactor, Endpunkte.
- `src/GitReviewA/Program.cs` — Verzweigung nach Laufart (dünner Adapter).
- `src/GitReviewA/web/` — `dateiansicht.js`, `kopieren.js`, Seite der Dateiansicht, `gitreviewa.css`, Katalog in `tasten-werte.js`.
- `tests/GitReviewA.Tests/Dateiansicht/`, `e2e/`.

## Technische Überlegungen

**Vorplanung** — Bubbles B4201–B4208 unter I0044; was gebaut wird, entscheidet der entwickler.

### Ablauf

1. **Aufruf lesen** (B4201) → `Dateiaufruf` oder `Aufruffehler` (Exit 2).
2. **Datei lesen** (B4202) — Link im letzten Teil nicht folgen, Art am geöffneten Handle prüfen (regulär), höchstens Grenze + 1 Byte lesen.
3. **Einordnen** (B4203) — Binärregel (Null-Byte in den ersten 8 000 Bytes, wie `Diffaufbereitung`), BOM, UTF-16, UTF-8 streng, Zeilenende, Zeilen.
4. **Start** (B4204) — Grund → stderr + Exit 2; sonst Server mit `Dateiansichtsstand` im RAM.
5. **Liefern** (B4205) — Liste und Text nach Nummer; `POST /api/schliessen` → Exit 0.
6. **Zeigen und kopieren** (B4206, B4207) — Seite, Kopf, Zeilen, Kopierstelle mit Ersatzweg.

### Grobentwurf

- `Laufart` (Enum: Review, Dateiansicht) — entsteht nur im `Aufrufleser`.
- `Dateiaufruf` (DTO) — Angaben, Port, KeinBrowser, Stufe.
- `Quellengrund` (Enum) + `QuellengrundMeldungen` (Operation, rein) — Wortlaut je Grund, eine Stelle.
- `DateiLeser` (Ressourcenzugriff) — `Dateilesung Lies(string angabe, Ausgabegrenze grenze)`.
- `Inhaltseinordnung` (Operation, rein) — `Einordnung Ordne(byte[] bytes)` → `Dateitext` oder `Quellengrund`.
- `DateiansichtStartInteractor` (Integration) — `Startausgang Starte(Dateiaufruf aufruf)`.
- `DateiansichtInteractor` — `Dateiliste Liste()`, `Dateitext? Text(int nummer)`.
- Web: `kopieren.js` — `kopiere(text, bestaetigung)` mit Ersatzweg über das `copy`-Ereignis.

### Änderungen an bestehenden Klassen

`Aufrufleser`, `Program`, `Webserver` (Endpunkte je Laufart), `tasten-werte.js` (Einträge mit Laufart), `faerben.js`/`farbe-werte.js` (Färbung für ganze Dateien wiederverwenden).

## Tests

**Unit:** `Aufrufleser` (Laufart, Ausschlüsse, `--`), `Inhaltseinordnung` (Binär, BOM, UTF-16, ungültiges UTF-8 mit Stelle, Zeilenenden, leer), Kürzung je Zeile.
**Integration:** Startinteractor über die Tabelle (Kriterium 3), Prozess für Exit 0/2/130 und stdout 0 Bytes, Endpunkte (Kriterium 10).
**E2E (Playwright, Browser-Eigenes, kein Hot Path):** Darstellung und Umbruch, Zuklappen, DOM-Sicherheit, Kopieren mit gelesener Zwischenablage, Ersatzweg, `c`.

## Abhängigkeiten

- Abhängig von: I0001 Mit Commit-Hashes aufrufen (R00001, grün), I0008 Syntaxhervorhebung (R00007, grün), I0021 Review abbrechen (R00005, grün), I0033 Umbruch standardmäßig an (R00032, grün).
- Blockiert: I0045 (R00044), I0046 (R00045), I0047 (R00046).

## Offene Fragen

Keine offenen. Der product-owner hat die Fragen am 2026-11-25 entschieden (`AI-Team/po-entscheidungen.md`, Zeilen 202–206, 209); die Antworten sind oben eingearbeitet:

1. **Aufrufform** — entschieden (PO Zeile 202): `--dateien <angabe…>`, dieselben Optionen wie im Review (`--port`, `--kein-browser`, `--verbose`/`--quiet`), kein reserviertes erstes Argument; der Ausschluss gegen Hashes, Bereich, `-` und `--ignore` steht einmal im Aufrufleser. Unterbefehl `zeigen` verworfen (fiele mit einem Datei- oder Zweignamen zusammen).
2. **Fehlerhafte Angabe** — entschieden (PO Zeile 203): ganzer Start abgelehnt, Exit 2 wie R00016, stdout leer, vorher alle fehlerhaften Angaben je Zeile auf stderr; keine teilweise gezeigte Liste. Die übrigen zu zeigen, verworfen.
3. **Zeichen je gezeigter Zeile** — entschieden (PO Zeile 204): 10 000 Zeichen je gezeigter Zeile (Hypothese, zehnmal die Färbegrenze aus R00007; eine Zeile bleibt im DOM ein Textknoten), kopiert wird immer ganz.
4. **UTF-8-BOM** — entschieden (PO Zeile 205): nicht mitkopieren, der Kopf nennt „UTF-8 mit BOM“; die Datei auf dem Datenträger bleibt unberührt. Mitkopieren verworfen (macht in Terminal und Editor das erste Wort zu einem anderen).
5. **Kürzel** — entschieden (PO Zeile 206): `c` bleibt „Datei kopieren“; `y` wird „Bereich kopieren“ (R00044), weil R00035 `b` schon für die Seitenleiste vergibt. Der Katalogeintrag trägt die Laufart Dateiansicht.
6. **Weitere Kodierungen** (UTF-16 aus älteren SQL-Werkzeugen, Latin-1) — entschieden (PO Zeile 209): spätere Ausbaustufe, bis dahin Exit 2 mit klarem Grund („UTF-16 wird nicht unterstützt“); Auslöser ist, dass der Betreiber eine solche Datei nennt (Notiz unten). Latin-1 wird nie geraten.

## Manuelle Vorbereitungstätigkeiten

- security-reviewer prüft die Angriffsmatrix (Kriterien 3 und 10) vor dem Bau und ergänzt Zeilen (Empfehlung des planers an den Director).

## Manuelle Nachbereitungstätigkeiten

- `/wireframe verfeinern` für D0005 anbieten (Dateiansicht ist nicht gezeichnet), keine Sperre.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 8 Bubbles unterhalb I0044 (B4201–B4208), 2 klar (2 h), 6 unklar (2–4 h) — 16–28 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist der Satz des Betreibers, dass er SQL-Dateien ausführen soll und dafür etwas zum Ansehen und Kopieren braucht. Wenn gitreviewA eine genannte Datei beim Start liest, prüft und im RAM hält, dann sieht der Mensch sie gefärbt mit Nummern, und „Datei kopieren“ legt genau die Bytes der Datei in die Zwischenablage — ohne Nummern, mit den echten Zeilenenden —, sodass das Einfügen in die SQL-Konsole dasselbe ausführt, was die KI geschrieben hat. Der Hebel ist die Prüfung beim Start: weil der Browser nur eine Nummer nennt und der Server nur das Gelesene hält, kann die Oberfläche keinen anderen Pfad erreichen, und jeder Fehler (falscher Name, Link, binär, zu groß) kommt als Exit 2 zur aufrufenden KI zurück statt als halbe Ansicht.

## Missing-Docs

- .NET 10 auf Linux, macOS, Windows: Datei öffnen, ohne dem letzten Link zu folgen, und die Art (regulär, FIFO, Gerät) am geöffneten Handle prüfen — welche API trägt das ohne P/Invoke (`File.OpenHandle`, `File.GetUnixFileMode(SafeFileHandle)`, `FileSystemInfo.LinkTarget`)? Vor dem Bau proben.
- Zwischenablage: ob Chromium und Firefox CRLF in `navigator.clipboard.writeText` und in `clipboardData.setData` unverändert ablegen (Linux, Windows) — vor dem Bau proben.
- Wie .NET Argumente mit ungültigem UTF-8 an `args` gibt (Ersatzzeichen) — bestimmt, warum `f\xFF.sql` „nicht gefunden“ ist.

## Notizen

### Verworfene Alternativen

- Unterbefehl statt `--dateien`: verworfen (entschieden, PO Zeile 202).
- Datei bei jeder Anfrage neu vom Datenträger lesen: verworfen — zwischen Prüfung und Lesen ließe sich die Datei gegen einen Link oder eine FIFO tauschen, und die Anzeige wäre nicht der geprüfte Stand.
- Ungültiges UTF-8 mit Marken `⟨0xE9⟩` zeigen (wie Diffs): verworfen für diese Laufart — das Kopierte wäre nicht mehr die Datei.
- Ersatzweg über ein Textfeld mit dem Inhalt: verworfen — ein Textfeld vereinheitlicht Zeilenenden zu LF und brächte das byte-genaue Kopieren.
- Jeden symbolischen Link im Pfad ablehnen: verworfen — Systempfade wie `/tmp` unter macOS sind Links; der echte Pfad im Kopf macht Umwege sichtbar.

### Spätere Ausbaustufe — UTF-16 (nicht Umfang)

Kein Umfang dieser Karte (Umfang: keine Ausbaustufen). Auslöser (PO Zeile 209): **der Betreiber nennt eine solche Datei**. Dann zuerst UTF-16 mit BOM (eindeutig erkennbar), Latin-1 nie raten. Bis dahin bleibt der Wortlaut „UTF-16 wird nicht unterstützt“ mit Exit 2 (Prüfung beim Start, Kriterium 3); die Datei auf dem Datenträger bleibt unberührt.
