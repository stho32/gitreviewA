---
id: R00007
status: Neu
datum: 2026-11-24
---

# R00007: Syntaxhervorhebung im Diff

## Beschreibung

Zeigt der Diff-Bereich ([R00004](R00004-diff-einer-datei-lesen.md)) eine Datei in einer bekannten Sprache — in der Ansicht „nur Änderungen“ ebenso wie in „ganze Datei“ ([R00008](R00008-ganze-datei-mit-diff.md)) —, sind ihre Zeilen farbig hervorgehoben: Schlüsselwörter, Zeichenketten, Kommentare, Zahlen, Funktionen, Typen und Makros tragen je eine eigene Farbe, in hell und dunkel. Die Sprache folgt der Dateiendung; bei unbekannter Endung, zu großen Dateien und bei jedem Ausfall der Färbung bleibt die Datei ungefärbt, ohne Meldung. Die Farbe ist eine **Auflage**: Text, Marken für Unsichtbares, Zeilennummern, Vorzeichen, Zeilenumbruch und Laden bleiben genau so, wie R00004 sie festlegt; der Text steht sofort da, die Farbe kommt einen Moment später.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (Syntaxhervorhebung) und die Leitplanken Lastprofil (20 000 Diff-Zeilen je Datei, Dateiwechsel ≤ 1 s an der Obergrenze) und Sicherheit (fremdes Repo).

Baut auf [R00004](R00004-diff-einer-datei-lesen.md) auf: Diff-Zeilen mit `data-art`, Text per `textContent`, Marke `⟨U+202E⟩`, Blöcke zu 500 Zeilen, Umbruch-Umschalter, Verwerfen später Antworten. R00004 ist gebaut (Zweig `karte/6`), aber noch nicht auf `main` — bis dahin ist diese Anforderung rot. Baut ebenso auf [R00008](R00008-ganze-datei-mit-diff.md) auf: die Ansicht „ganze Datei“ (Karte #22 I0022) wird **vor** dieser Karte gebaut und enthält keine Syntaxfarben; die Zeilenelemente (`data-art`, `data-alt`, `data-neu`), das Laden erst bei der Ansicht und der Abgleich (Commit, Pfad, Ansicht) sind dort festgelegt. Diese Anforderung färbt beide Ansichten.

**Übernahme aus kanbanD** (Betreiber 2026-11-24; Herkunft im Commit nennen, keine eigene Gestaltung): kanbanD färbt seine Diffs so seit R00217 (`~/Projekte/kanbanD/Anforderungen/R00217-syntaxfarben-in-der-review-seite.md`, ADR-0037 und ADR-0040 dort). Als Vorlage:
- `web/vendor/prism.js` (Prism 1.30.0, MIT; Komponenten unverändert: core, clike, markup, css, javascript, rust, markup-templating, php, python, bash, yaml, markdown, json, sql, csharp, toml, diff) mit `LICENSE-prism.txt`;
- `web/faerben.js` — `hunkTokens` (Tokens je Hunk und Seite), Rollentabelle, Worker-Rahmen;
- `web/farbschlange.js` — ein Worker, ein Auftrag zur Zeit, Frist, verworfene Altaufträge;
- aus `web/diff.js`: `spracheZuPfad`, `SPRACHEN`, `faerbbar`, `GRENZE_PATCH`, `GRENZE_ZEILE`, `TK_KLASSEN` und die Idee von `farbigHtml` (Stücke auf `sichtbarTeile` legen, Marken haben Vorrang);
- Farben: die Tokens `--kd-tk-*` stehen schon in `kd-tokens.css` (alle drei Themen-Blöcke, wie in kanbanD); die Regeln `.tk-*` (aus `kd-app.css`) kommen dazu.

kanbanD baut Zeilen als HTML-Zeichenketten; gitreviewA baut DOM-Knoten mit `textContent` (R00004). Übernommen wird die Rechnung, nicht die HTML-Erzeugung; **Prism liefert nie HTML in die Seite**.

## Geschäftlicher Nutzen

Wer KI-Code prüft, liest ihn Zeile für Zeile. Ein auskommentierter Block, eine Zeichenkette mit Code darin oder ein Schlüsselwort zwischen Bezeichnern sieht ohne Farbe aus wie jede andere Zeile; mit Farbe erkennt der Prüfer auf einen Blick, was Kommentar, Text und Code ist, und liest schneller die Stellen, an denen er eine Anmerkung macht. Der Betreiber nennt die Hervorhebung ausdrücklich wichtig. Weil die Farbe nur aufgelegt ist, sieht der Prüfer weiter jedes unsichtbare Zeichen, das ein feindlicher Commit einschmuggeln will, und weil sie außerhalb der Seite gerechnet wird, kann ein Commit mit absichtlich teurem Inhalt die Oberfläche nicht einfrieren.

## Funktionale Anforderungen

- **Sprache nach Endung** des gezeigten Pfads (bei Umbenennung der neue, bei gelöschter Datei der alte): der Teil nach dem letzten Punkt im Dateinamen, Groß- und Kleinschreibung egal, ein Ordner im Pfad zählt nicht; eine Sprache für beide Seiten der Datei. Keine Endung oder eine andere als diese: ungefärbt. Endungen (aus kanbanD, ohne `diff`/`patch`, die Prism-Rollen dort nicht färbt):

  | Sprache | Endungen |
  |---|---|
  | C# | `cs` |
  | JavaScript | `js`, `mjs`, `cjs` |
  | JSON | `json` |
  | CSS | `css` |
  | HTML, XML, SVG | `html`, `htm`, `xml`, `svg` |
  | Markdown | `md` |
  | Python | `py` |
  | Bash | `sh`, `bash` |
  | YAML | `yml`, `yaml` |
  | SQL | `sql` |
  | Rust | `rs` |
  | TOML | `toml` |
  | PHP | `php` |
  | TypeScript (letzte Ausbaustufe) | `ts`, `mts`, `cts` |

  TypeScript kommt als **letzte Ausbaustufe** nach den 13 Sprachen davor (Entscheidung des product-owner 2026-11-24): erst wenn diese grün sind, wird die Prism-Komponente `typescript` aus `prismjs@1.30.0` ergänzt (kanbanD bündelt sie nicht, ungeprüft gegen den Worker-Rahmen). Trägt die Stufe im Bau nicht, wird sie als eigene Karte abgespalten, ohne die übrigen Sprachen aufzuhalten. Ungefärbt bleiben ausdrücklich `tsx` (bräuchte zusätzlich `jsx`), Go, Java, C/C++, `csproj` und `razor` (eigene Karte nur auf Wunsch des Betreibers); siehe Offene Fragen 1.
- **Sieben Rollen**: Schlüsselwort, Zeichenkette, Kommentar, Zahl, Funktion, Typ, Makro (bei HTML und XML auch der Attributname). Bei verschachtelten Teilen gilt die innerste Rolle; alles andere bleibt in der Textfarbe. Nur der Kommentar ist kursiv. Welche Teile einer Sprache eine Rolle bekommen, bestimmt Prism (Beispiel: in CSS und Markdown nur Kommentar bzw. Code-Auszeichnung).
- **Je Hunk und Seite**: die alte Seite eines Hunks (Kontext und entfernte Zeilen) und die neue Seite (Kontext und hinzugefügte Zeilen) werden je als zusammenhängender Text gefärbt; eine entfernte Zeile nimmt die Farbe der alten Seite, hinzugefügte und Kontextzeilen die der neuen. So stehen Kommentare und Zeichenketten über mehrere Zeilen. Hunk-Köpfe, die Zeile `\ No newline at end of file`, Vorzeichen und Zeilennummern bleiben ungefärbt. In der Ansicht „ganze Datei“ (R00008) ist die ganze Datei ein einziger Abschnitt: seine alte Seite (Kontext und entfernte Zeilen) und seine neue Seite (Kontext und hinzugefügte Zeilen) werden wie ein Hunk gefärbt — ein Kommentar, der vor einer Änderung beginnt, steht dort vollständig; die Einschränkung zum Kommentar vor dem sichtbaren Hunk entfällt.
- **Grenzen je Datei**: gefärbt wird nur ein Patch mit höchstens 262 144 Zeichen (UTF-16-Einheiten), dessen Zeilen höchstens je 1 000 Zeichen lang sind (mit Vorzeichen, ohne Zeilenumbruch); sonst bleibt die ganze Datei ungefärbt, und es geht kein Auftrag an die Färbung. Maßgeblich ist der Patch der **gezeigten Ansicht**: in „ganze Datei“ der Patch mit allen Zeilen der Datei (Auflage, Grenzen und Frist sonst gleich). Folge: dieselbe Datei kann in „nur Änderungen“ gefärbt und in „ganze Datei“ ungefärbt sein, wenn sie über die Grenze wächst; das ist hingenommen (Ausfall ohne Folgen, der Text ist derselbe).
- **Färbung außerhalb der Seite, mit Frist**: Prism läuft nur in einem Hintergrund-Worker, nie auf der Seite. Ein Auftrag je gezeigter Datei und Ansicht, einer zur Zeit; 1 000 ms ab Übergabe, danach wird der Worker beendet, die Datei bleibt ungefärbt, und der nächste Auftrag bekommt einen neuen Worker. Der Worker antwortet nur mit Zahlen (Zeile, von, bis, Rolle 0–6), nie mit Text oder HTML. Eine Antwort für eine Datei, die nicht mehr gezeigt wird (andere Datei, anderer Commit oder andere Ansicht gewählt), wird verworfen; Umschalten zwischen den Ansichten verwirft den laufenden Auftrag und startet für die neu gezeigte Ansicht einen eigenen.
- **Farbe ohne Folgen**: ohne bekannte Endung, über den Grenzen, nach der Frist, ohne Worker, wenn Worker oder Bibliothek nicht laden oder die Bibliothek wirft, steht die Datei ungefärbt da — ohne Hinweis an der Datei und ohne Eintrag in der Konsole der Seite (außer der Ladefehlermeldung des Browsers selbst).
- **Zeichnen in zwei Schritten**: die Datei wird wie in R00004 sofort ungefärbt gezeichnet; die Farbe wird danach blockweise aufgelegt (ein Block zu 500 Zeilen je Aufgabe des Hauptfadens). Text jeder Zeile, Marken, Nummern, Blöcke, der Zustand von „Umbruch“ und die Wahl der Ansicht sind mit und ohne Farbe gleich; Marken (`⟨U+202E⟩`) bleiben ungefärbt und haben Vorrang vor einer Teilgrenze. Am Diff-Bereich jeder Datei steht unsichtbar `data-farbe="laeuft|ja|nein"` (Anschluss für Tests, wie in kanbanD): `laeuft` ab dem gezeichneten Text, `ja` nach dem Auflegen, `nein` ohne Farbe.
- **Einbettung**: `prism.js`, `LICENSE-prism.txt` und `faerben.js` sind im Programm eingebettet (wie die übrige Oberfläche, R00001), abrufbar unter `/vendor/prism.js`, `/vendor/LICENSE-prism.txt` und `/faerben.js`; `index.html` lädt Prism nicht, die Seite kennt kein `window.Prism`, es gibt kein Inline-Skript, und es wird nichts von außen nachgeladen (die Sicherheitsrichtlinie `default-src 'self'` bleibt wie sie ist).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): die Färbung darf den Dateiwechsel an der Obergrenze nicht verlangsamen — Diff mit 20 000 Zeilen steht ≤ 1 s nach dem Klick (wie R00004), gemessen mit gefärbter Datei; zusätzlich dauert während des Auflegens keine Aufgabe des Hauptfadens länger als 150 ms (Long Tasks), auch bei feindlichem Inhalt. Herleitung: 1 000 ms und 150 ms sind die Werte aus kanbanD (ADR-0040). **Gemessen** (Node 20 mit dem Code aus kanbanD, nicht im Browser, nicht im Worker): `gross.js` (20 000 Zeilen `x00001=1;`, Patch 220 020 Zeichen) 0,11 s, `feindlich.md` (64 Zeilen aus `<!-- `, Patch 64 081 Zeichen) 4,7 s; in kanbanD im Chromium 5,3 s gemessen. Wann die Farbe erscheint, ist Lastbeobachtung und kein Zeitkriterium (Lehre aus kanbanD: kein Wanduhr-Test nahe der Frist; ein Fall wie `feindlich.md` liegt mit Faktor ≥ 4 über der Frist, einer wie `gross.js` mit Faktor ≈ 9 darunter).
- **Sicherheit** (Wissen „Sicherheit“, `AI-Team/gelerntes.md`): Diff-Text ist fremder Text. Kein HTML stammt von Prism oder aus dem Dateiinhalt: Teile entstehen als Elemente mit `textContent`, ihre Klassen nur aus den sieben `tk-…` (nie ein Typname der Grammatik, nie `token`); der Worker gibt nur Zahlen zurück; im Worker steht `self.Prism = {disableWorkerMessageHandler: true}` vor dem Laden (sonst beantwortet Prism fremde Nachrichten mit HTML). Teure Eingaben (verschachtelte Muster) blockieren nur den Worker, nie die Seite — das ist die eigentliche Angriffsfläche dieser Karte. Keine neue Anfrage an `git`, kein neuer Endpunkt; kein Code und keine Daten von außen (kein CDN).
- **Barrierefreiheit**: der Kontrast jeder Rolle gegen den Hintergrund der Kontext-, entfernten und hinzugefügten Zeile ist ≥ 4,5 : 1, hell und dunkel; Strg+F, Textauswahl und Bildschirmleser sehen denselben Text wie ohne Farbe.
- **Lizenz**: Prism steht unter MIT; Kopfkommentar mit Version, Komponentenliste und Lizenz in `prism.js`, Lizenztext wird mit ausgeliefert.
- **Logging**: stdout bleibt leer; kein neuer Logeintrag. Ein Ausfall der Färbung ist kein Fehler des Servers.
- **Benutzerfreundlichkeit**: Farben aus den Tokens von kanbanD (`--kd-tk-*`); keine eigenen Gestaltungsvorgaben.

## Akzeptanzkriterien

Vorbereitung (herstellbar mit `git` allein, siehe User Story; alle Dateien enden mit Zeilenumbruch). Eine Textstelle **trägt die Rolle X**, wenn sie in der Anzeige so hervorgehoben ist, dass der Prüfer sie als X erkennt (die sieben Rollen oben).

**Repo F** (Commits `e` „Start“, `f` „Farbige Dateien“; Aufruf `gitreviewA f e`, Wahl `f`): `e` fügt hinzu `seiten.js` (`var a = 1;`, `/* weg`, `*/ var c = 3;`), `rollen.rs` (zwei Zeilen `fn gruss(name: &str) -> String { format!("Hallo {}", 42) } // Gruß`, die zweite mit `41`), `alt.py` (`def alt(): pass`), `umbenannt.txt` (`// eins`, `// zwei`, `// drei`, `fn y() {}`), `weit.js` (`/* Kopf`, `   zwei`, `   drei`, `   vier`, `   fünf`, `*/`, `var x = 1;`). `f` ändert `seiten.js` zu `var a = 1;`, `var b = 2;`, `*/ var c = 3;`; `rollen.rs` zweite Zeile `41` zu `43`; ändert in `weit.js` die letzte Zeile zu `var x = 2;`; löscht `alt.py`; benennt `umbenannt.txt` in `umbenannt.rs` um und ändert die letzte Zeile zu `fn z() {}`; fügt hinzu `kommentar.js` (`/* Kopf`, `   zweite Zeile`, `*/`, `function main() {}`), `fremd.js` (`var s = "<img src=x onerror=alert(1)>"; // <b>fett</b>`, `var t = "a`U+202E`b";`), je Endung der Tabelle eine Datei `beispiel.<Endung>` mit der Beispielzeile aus Kriterium 1, `SRC/GROSS.RS` (`fn y() {}`), `beispiel.ts`, `beispiel.mts`, `beispiel.cts` (Zeile aus Kriterium 1; erst mit der Ausbaustufe TypeScript), die Dateien mit ausdrücklich ungefärbter Endung `beispiel.tsx`, `beispiel.go`, `beispiel.java`, `beispiel.c`, `beispiel.cpp`, `App.csproj`, `Seite.razor` (je eine Zeile `function f() {}`), und die Dateien ohne bekannte Endung `Makefile`, `notiz.unbekannt`, `LIESMICH`, `a.js.txt` (je mit einer Zeile `fn x() {}`).
**Repo L** (zwei Commits, `l` ist der zweite, Aufruf `gitreviewA l`): der erste Commit „Basis“ legt `mittel.js` an (16 000 Zeilen `zeile00001 = 1;` bis `zeile16000 = 1;`, je 15 Zeichen; Patch der ganzen Datei rund 272 000 Zeichen, mit `git show -U99999` gemessen 272 289); `l` ändert in `mittel.js` Zeile 8 000 zu `zeile08000 = 2;` und fügt hinzu `gross.js` (20 000 Zeilen `x00001=1;` bis `x20000=1;`), `grenze.js` (Zeile 1: 999 × `a`; Zeile 2: `function g() {}`), `drueber.js` (Zeile 1: 1 000 × `a`; Zeile 2: `function h() {}`), `zu-gross.js` (299 Zeilen aus je 999 × `a`, danach `function g() {}`; Patch 299 334 Zeichen), `feindlich.md` (64 Zeilen, jede aus 999 Zeichen des wiederholten Musters `<!-- `), `gut.rs` (`fn gut() {}`).
„Wählen“ heißt Klick auf die Datei in der Dateiliste; geurteilt wird erst, wenn die Färbung der Datei abgeschlossen ist (Zustand `ja` bzw. `nein`, ereignisgenau gewartet, nie nach Zeit).

### Farbe
- [ ] **1. Sprache nach Endung.** Gegeben Repo F, wenn man nacheinander `beispiel.<Endung>` für jede Endung der Tabelle wählt, dann trägt der genannte Text die genannte Rolle:

  | Endungen | Zeile | Text → Rolle |
  |---|---|---|
  | `cs` | `public string Gruss(string name) { return "Hallo " + 42; }` | `return` → Schlüsselwort |
  | `js`, `mjs`, `cjs` | `function gruss(name) { return "Hallo " + 42; }` | `gruss` → Funktion |
  | `json` | `  "n": 42,` | `42` → Zahl |
  | `css` | `/* Gruß */` | ganze Zeile → Kommentar |
  | `html`, `htm`, `xml`, `svg` | `<!-- Gruß -->` | ganze Zeile → Kommentar |
  | `md` | ``Text mit `code` `` | `` `code` `` → Schlüsselwort |
  | `py` | `def gruss(name):` | `def` → Schlüsselwort |
  | `sh`, `bash` | `# Gruß` | ganze Zeile → Kommentar |
  | `yml`, `yaml` | `n: 42` | `42` → Zahl |
  | `sql` | `SELECT name FROM nutzer WHERE id = 42;` | `SELECT` → Schlüsselwort |
  | `rs` | `fn gruss(name: &str) -> String { format!("Hallo {}", 42) }` | `format!` → Makro |
  | `toml` | `n = 42` | `42` → Zahl |
  | `php` | zweite Zeile `echo "Hallo" . 42;` (erste `<?php`) | `echo` → Schlüsselwort |
  | `ts`, `mts`, `cts` (Ausbaustufe) | `export abstract class Gruss { readonly n = 42; }` | `readonly` → Schlüsselwort (nur die Komponente `typescript` kennt es, `javascript` allein färbt es nicht) |

  Ebenso: `SRC/GROSS.RS` trägt in `fn y() {}` für `fn` die Rolle Schlüsselwort (Ordner zählt nicht, Großschreibung egal); die gelöschte `alt.py` trägt in `−def alt(): pass` für `def` die Rolle Schlüsselwort (alter Pfad); in der umbenannten `umbenannt.rs` tragen `// eins` bis `// drei` (Kontext) die Rolle Kommentar und `fn` in `−fn y() {}` und `+fn z() {}` die Rolle Schlüsselwort (neuer Pfad: als `.txt` wäre nichts gefärbt). *Testebene:* Playwright (Rolle im Browser) und Unit (Endungstabelle); die Zeile `ts` kommt erst mit der Ausbaustufe B0609 dazu und lässt die Basis unberührt.
- [ ] **2. Kommentar über mehrere Zeilen.** Gegeben Repo F, wenn man `kommentar.js` wählt, dann tragen alle drei Zeilen des Blockkommentars die Rolle Kommentar (auch die mittlere `   zweite Zeile` ganz), `function` trägt die Rolle Schlüsselwort, und der Hunk-Kopf `@@ -0,0 +1,4 @@`, die Vorzeichen und die Zeilennummern tragen keine Rolle. *Testebene:* Playwright (Rolle im Browser, Browser-Eigenes); die Rechnung je Hunk zusätzlich als Unit (`hunkTokens`).
- [ ] **3. Alte und neue Seite.** Gegeben Repo F, wenn man `seiten.js` wählt (Hunk: Kontext `var a = 1;`, `−/* weg`, `+var b = 2;`, Kontext `*/ var c = 3;`), dann trägt die entfernte Zeile `/* weg` die Rolle Kommentar (alte Seite); in der Kontextzeile `*/ var c = 3;` trägt `*/` keine Rolle und `var` die Rolle Schlüsselwort (neue Seite, dort ist der Kommentar zu Ende); in `+var b = 2;` trägt `var` die Rolle Schlüsselwort. *Testebene:* Playwright (Rolle im Browser); die Rechnung je Hunk-Seite zusätzlich als Unit (`hunkTokens`).
- [ ] **4. Sieben Rollen, hell und dunkel.** Gegeben Repo F und das Hell-Schema des Browsers, dann das Dunkel-Schema, wenn man `rollen.rs` wählt (Kontext-, entfernte und hinzugefügte Zeile tragen je alle sieben Rollen: `fn` Schlüsselwort, `gruss` Funktion, `String` Typ, `format!` Makro, `"Hallo {}"` Zeichenkette, `42` Zahl, `// Gruß` Kommentar), dann haben die sieben Rollen paarweise verschiedene Farben, die sich von der Textfarbe unterscheiden; die Farbe des Schlüsselworts ist hell und dunkel verschieden; jede Rolle hat gegen den Hintergrund ihrer Zeile (Kontext, entfernt, hinzugefügt) einen Kontrast ≥ 4,5 : 1 (7 Rollen × 3 Zeilenarten × 2 Schemata = 42 Messungen, im Bericht des Entwicklers); nur der Kommentar ist kursiv. *Testebene:* Playwright (Darstellung, Kontrast aus berechneten Farben in hell und dunkel, Browser-Eigenes); Rollentabelle zusätzlich als Unit.

### Wo nicht gefärbt wird
- [ ] **5. Ungefärbt bleibt lesbar.** Gegeben Repo F bzw. L, wenn man die folgenden Dateien wählt, dann trägt in keiner Zeile eine Textstelle eine Rolle, der Text jeder Zeile ist derselbe wie im Diff ohne Färbung, und im Diff-Bereich steht keine Meldung: `Makefile`, `notiz.unbekannt`, `LIESMICH` (keine Endung), `a.js.txt` (zählt `txt`); `beispiel.tsx`, `beispiel.go`, `beispiel.java`, `beispiel.c`, `beispiel.cpp`, `App.csproj`, `Seite.razor` (Zeile `function f() {}`: ausdrücklich ungefärbt, auch nach der Ausbaustufe TypeScript); `drueber.js` (Zeile von 1 000 Zeichen, mit Vorzeichen 1 001); `zu-gross.js` (Patch 299 334 Zeichen > 262 144). Zur Gegenprobe trägt in `grenze.js` (Zeile von 999 Zeichen, mit Vorzeichen genau 1 000) `function` die Rolle Schlüsselwort. *Testebene:* Playwright (Text und Meldungen im Browser); die Grenzen zusätzlich als Unit (`faerbbar`, `spracheZuPfad`).
- [ ] **6. Ausfall der Färbung.** Gegeben Repo F, wenn man `kommentar.js` wählt und dabei (a) die Prism-Datei nicht abrufbar ist (Antwort 404), (b) der Browser keine Worker kennt oder (c) die Färbung mit einer Ausnahme endet, dann steht die Datei jeweils ungefärbt da, mit demselben Text wie gefärbt, ohne Meldung im Diff-Bereich, die Seite meldet keinen Fehler (`pageerror`), und in der Konsole steht außer der Ladefehlermeldung des Browsers zu (a) nichts; Dateiliste und Umbruch-Umschalter bleiben bedienbar. *Testebene:* Playwright (404 und fehlender Worker, Browser-Eigenes); Ausnahme und Ladefehler zusätzlich als Unit der Schlange mit Fake-Worker.
- [ ] **7. Teurer Inhalt blockiert nichts.** Gegeben Repo L, wenn man `feindlich.md` wählt, dann stehen alle 64 Zeilen mit ihrem Text da; vom Stehen des Textes bis zum Ende der Färbung meldet die Seite keine Aufgabe über 150 ms; die Datei endet ungefärbt (die Frist von 1 s ist verstrichen); wählt man danach `gut.rs`, trägt `fn` die Rolle Schlüsselwort (ein neuer Worker hat den beendeten ersetzt). *Testebene:* Playwright (Long Tasks im Browser, Browser-Eigenes); die Frist zusätzlich als Unit mit injizierter Uhr.

### Fremder Text
- [ ] **8. Fremder Inhalt bleibt Text.** Gegeben Repo F, wenn man `fremd.js` wählt, dann steht `"<img src=x onerror=alert(1)>"` mit den spitzen Klammern als sichtbarer Text da und trägt die Rolle Zeichenkette, `// <b>fett</b>` trägt die Rolle Kommentar, es erscheint kein Dialog, der Diff-Bereich enthält kein `img`- und kein `b`-Element, in der zweiten Zeile steht die Marke `⟨U+202E⟩` als Text (das Zeichen selbst steht nicht im Text; `a` und `b` stehen in dieser Reihenfolge), der Text jeder Zeile ist derselbe wie ohne Färbung, `window.Prism` ist nicht definiert, und die Seite hat keine Anfrage an einen fremden Host gestellt. *Testebene:* Playwright (DOM-Sicherheit, Browser-Eigenes); die Auflage im DOM zusätzlich als Integration.

### Lastprofil
- [ ] **9. Zwanzigtausend Zeilen.** Gegeben Repo L, wenn man `gross.js` wählt, dann stehen spätestens 1 s nach dem Klick der Kopf `@@ -0,0 +1,20000 @@` und die Zeile `x20000=1;` (neu 20000) im Dokument (gemessen vom Klick bis diese Zeile im Dokument steht, wie in R00004; Messwert und Abstand siehe Technische Überlegungen); danach — ohne Zeitgrenze — endet die Färbung, und `1` trägt in Zeile 1 und in Zeile 20000 die Rolle Zahl. *Testebene:* Playwright (Zeit am Browser gemessen, Hot Path und Browser-Eigenes).

### Ganze Datei
- [ ] **10. Ganze Datei färbt wie die Änderungen.** Gegeben Repo F und die Ansicht „ganze Datei“ (R00008), wenn man `weit.js` wählt, dann stehen acht Zeilen da: die sechs Kontextzeilen `/* Kopf` bis `*/` (neu 1 bis 6), `−var x = 1;` (alt 7) und `+var x = 2;` (neu 7); alle sechs Kontextzeilen tragen ganz die Rolle Kommentar (auch `   vier` und `*/`, die „nur Änderungen“ als Kontext zeigt, und die Zeilen davor, die es gar nicht zeigt); `var` trägt in der entfernten wie in der hinzugefügten Zeile die Rolle Schlüsselwort, `1` bzw. `2` die Rolle Zahl; Vorzeichen und Nummern tragen keine Rolle; Text, Nummern (alt, neu) und Zeilenart (Kontext, entfernt, hinzugefügt) jeder Zeile sind dieselben wie unmittelbar nach dem Zeichnen vor der Färbung. *Testebene:* Playwright (Rolle im Browser, Browser-Eigenes); die Rechnung der Seiten (alte Seite = Kontext und entfernte Zeilen, neue = Kontext und hinzugefügte) als Unit-Test unter Node mit dem Rechenbeispiel `weit.js`.
- [ ] **11. Ansicht wechseln färbt neu.** Gegeben Repo F, `weit.js` in „nur Änderungen“ gewählt und fertig gefärbt, wenn man auf „ganze Datei“ umschaltet, dann färbt sich die Datei erneut (die Färbung läuft und endet noch einmal) und die Zeilen tragen die Rollen aus Kriterium 10; schaltet man zurück, steht „nur Änderungen“ (fünf Zeilen: `   vier`, `   fünf`, `*/`, `−var x = 1;`, `+var x = 2;`) wieder gefärbt da — `var` trägt in `+var x = 2;` die Rolle Schlüsselwort — mit demselben Text wie vorher; wählt man in „ganze Datei“ danach `kommentar.js`, tragen alle drei Kommentarzeilen die Rolle Kommentar, und der Umschalter zeigt weiter „ganze Datei“. *Testebene:* Playwright (Rolle im Browser, Browser-Eigenes).
- [ ] **12. Grenze am gezeigten Patch.** Gegeben Repo L, wenn man `mittel.js` in „nur Änderungen“ wählt, dann trägt `2` in `+zeile08000 = 2;` die Rolle Zahl; wählt man dieselbe Datei in „ganze Datei“ (Patch rund 272 000 Zeichen > 262 144), dann stehen alle 16 001 Zeilen mit ihrem Text da (15 999 Kontextzeilen, `−zeile08000 = 1;`, `+zeile08000 = 2;`), keine trägt eine Rolle, und es erscheint keine Meldung. *Testebene:* Playwright (Rolle im Browser); die Grenze am Patch der gezeigten Ansicht zusätzlich als Unit-Test (`faerbbar` mit 272 289 und 262 144 Zeichen).
- [ ] **13. Späte Antwort färbt die andere Ansicht nicht.** Gegeben die Färbung von `weit.js` läuft und die Antwort des Workers kommt erst nach dem Umschalten der Ansicht (im Test über einen verzögerten Fake-Worker herstellbar), wenn sie eintrifft, dann färbt sie keine Zeile der neu gezeigten Ansicht, diese wird dennoch gefärbt, und Text und Nummern bleiben gleich. *Testebene:* Integration (Oberfläche) mit verzögertem Fake-Worker, kein Wanduhr-Test.

## Betroffene Verzeichnisstruktur

Wie in R00001 und R00004 (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- `web/` — neue Module neben `diff.js` und `diff-werte.js`: Sprache und Grenze, Tokens je Hunk und Seite (`faerben.js`, läuft im Worker und unter Node), Schlange mit Frist, Auflage; `vendor/prism.js` und `vendor/LICENSE-prism.txt`; Regeln `.tk-*` in `gitreviewa.css`.
- `GitReviewA.csproj` — drei weitere eingebettete Dateien; kein neuer Endpunkt, kein neuer `git`-Aufruf, kein C#-Code außer der Auslieferung (Inhaltstyp `text/javascript`).
- `tests/`, `e2e/` — Wegwerf-Repo-Hilfsklasse erweitert um Repo F und L; DSL und Treiber für die Färbung.

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Nach dem Zeichnen des Diffs** (R00004 bzw. R00008 für „ganze Datei“, nach der Antwort, nur wenn (Commit, Pfad, Ansicht) noch gelten): Sprache aus dem Pfad (`spracheZuPfad`); keine Sprache oder `faerbbar(patch)` falsch → `data-farbe="nein"`, fertig.
2. **Auftrag** `{sprache, zeilen}` an die Schlange (ein Worker, ein Auftrag zur Zeit, Frist 1 000 ms, `aktuell()` sagt, ob die Datei noch gezeigt wird); der Worker lädt Prism (`importScripts('/vendor/prism.js')`, vorher `self.Prism = {disableWorkerMessageHandler: true}`), rechnet `hunkTokens` und antwortet mit einem `Int32Array` (Viererpaare, übertragen).
3. **Auflage**: je Block zu 500 Zeilen eine Aufgabe des Hauptfadens; die Stücke einer Zeile gehen auf die Teile von `sichtbarTeile` (Marken bleiben ungefärbt und haben Vorrang), jedes Stück wird ein Element `<span class="tk-<rolle>">` mit `textContent`. Zustand `data-farbe`: `laeuft` → `ja`/`nein`.
4. **Fehler** (kein Worker, Ladefehler, Ausnahme, Frist): `data-farbe="nein"`, keine Meldung. Wechsel von Datei oder Commit: Auftrag verworfen, Antwort verworfen.

### Grobentwurf
**Einstiegsstellen:** `Diffbereich` (R00004) ruft nach dem Zeichnen die Färbung; Server liefert drei zusätzliche eingebettete Dateien.
- `Sprachwahl` (Operation, rein) — `spracheZuPfad(pfad)` → Grammatikname oder `null`; `faerbbar(patch)` → bool (Grenzen).
- `Tokenfolge` (Operation, rein, in `faerben.js`) — `hunkTokens(zeilen, grammatik)` → `Int32Array` `[Zeile, von, bis, Rolle]*`.
- `Farbschlange` (Integration, Worker) — `farbschlange({workerAnlegen, frist, uhr})` → `auftrag({sprache, zeilen, aktuell, fertig})`; Fake-Worker für Tests.
- `Farbauflage` (Oberfläche) — `legeFarbeAuf(zeilenElemente, stuecke, rolle → Klasse)`; nur `textContent`, Klassen nur aus `TK_KLASSEN`. Sie nimmt beliebige Zeilenelemente und kennt die Ansicht nicht: „nur Änderungen“ und „ganze Datei“ rufen dieselbe Funktion (Anschluss B0606 und B0610), es gibt nur eine Rechnung und einen Worker. Die ganze Datei geht als ein Abschnitt in `hunkTokens`; die Zeilen kommen als `{art, text}` aus dem Zeilenaufbau von R00004 und R00008 (`data-art`, `data-alt`, `data-neu`).

### Optionen (Zuschnitt der Färbung)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Prism im Worker mit Frist, Antwort nur Zahlen, Auflage als DOM (kanbanD ADR-0040; Empfehlung) | Zahlen und Grenzen rein testbar, Frist injizierbar, Ausfall über `route` | gering: Worker-Rahmen und Eigenheiten von Prism im Worker sind neu hier | mittel |
| 2. `Prism.tokenize` auf der Seite, Tokens → DOM | einfach, aber der teure Fall `feindlich.md` friert die Seite 5 s ein (kanbanD gemessen) | Verfügbarkeit gegen fremdes Repo | klein |
| 3. `Prism.highlight` → HTML-Text → `innerHTML` | einfach | fremder Text wird nur von der Bibliothek maskiert; schwächt die Regel „Text, nie HTML“ aus R00004 | klein |
| 4. eigener leichter Scanner | alles selbst prüfbar | Sprachen nachbauen, was Prism bereits tut | groß |

Gewählt: 1.

### Messung des Zeitkriteriums (Kriterium 9)
Startpunkt: Klick auf die Datei; Ereignis: die Zeile `x20000=1;` steht im Dokument (E2E wartet auf dieses Ereignis, nicht im Standardraster); Grenze 1 s (Obergrenze des Dateiwechsels, Lastprofil). Der Entwickler misst `gross.js` (gefärbt) und die ungefärbte `gross.txt` aus R00004 und nennt beide Werte im Bericht; mindestens 30 % Abstand zur Grenze (Messwert ≤ 0,7 s), liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium. Die Dauer der Färbung selbst ist kein Zeitkriterium (kein Wanduhr-Test unter Last).

## Tests
Nach `~/.claude/skills/test-pyramide/SKILL.md` und der ATDD-Regel des Projekts (`AI-Team/factory.md`): je Kriterium zuerst die Spezifikation in Fachsprache, dann DSL, Treiber, System; die vorhandenen Schichten in `e2e/` werden erweitert.

**Unit (rein):** `spracheZuPfad` (Tabelle, Großschreibung, Ordner, `a.js.txt`, keine Endung, `.gitignore`; nach der Ausbaustufe `ts`, `mts`, `cts` → `typescript`, `tsx` → keine Sprache), `faerbbar` an der Grenze (262 144 gefärbt / 262 145 nicht; Zeile 1 000 / 1 001 mit Vorzeichen; `😀`-Zeile zählt 2 je Zeichen), `hunkTokens` (Kriterien 2 und 3, Hunk ohne zweite Seite, Hunk-Kopf und `\ No newline` ohne Rolle, **Hunk beginnt im Kommentar** → dort falsch gefärbt, wie in kanbanD hingenommen), Rollentabelle (innerste gewinnt), Schlange mit Fake-Worker (Frist mit injizierter Uhr, veraltete Antwort verworfen, Ladefehler, Ausnahme, ein Auftrag zur Zeit).
**Integration:** Auslieferung (`/vendor/prism.js` mit Kopfkommentar Version 1.30.0 und MIT, `/vendor/LICENSE-prism.txt`, `/faerben.js`, jeweils `text/javascript` bzw. `text/plain`; `index.html` ohne Inline-Skript und ohne Prism); Worker unter der Sicherheitsrichtlinie `default-src 'self'` (kein Verstoß in der Konsole); Auflage im DOM (`textContent`, nur `tk-…`-Klassen, Marken bleiben).
**E2E (Playwright headless, Fenster 1280 × 800):** Kriterien 1–13 gegen Wegwerf-Repos F und L (Kriterium 1 ohne die Zeile `ts` bis B0609; 10 bis 13 mit dem Umschalter aus R00008); `page.route` (404 für `prism.js`; fängt es Worker-Anfragen nicht ab, gilt `context.route`), `addInitScript` (kein `Worker`), Long Tasks (`PerformanceObserver`), Hell/Dunkel über `emulateMedia`, Kontrast aus berechneten Farben.
**Mutanten** (je einzeln vorher rot): Prism auf der Seite statt im Worker (Kriterium 7), Frist entfernt (7), Grenze entfernt (5), eine Seite statt je Hunk-Seite (3), `innerHTML` statt `textContent` (8), Marke ohne Vorrang (8), Ansicht fehlt im Abgleich später Antworten (13), Grenze am Patch von „nur Änderungen“ statt am gezeigten Patch (12).

## Abhängigkeiten
- Abhängig von: I0006 Diff einer Datei lesen (R00004) — gebaut auf Zweig `karte/6`, in den Reviews, noch nicht auf `main`; rot bis dahin. I0022 Ganze Datei mit Diff (R00008, Karte #22) — wird vor dieser Karte gebaut, ohne Farben; Voraussetzung für B0610 (die Bubbles B0601–B0608 brauchen sie nicht). I0001 (Gerüst, Wegwerf-Repo-Hilfsklasse, E2E-Gerüst).
- Blockiert: nichts. Anschluss: die Ansicht „ganze Datei“ (R00008) ist Teil dieser Anforderung (Kriterien 10 bis 13, B0610); die Nebeneinander-Ansicht (I0007) färbt später dieselben Zeilen über dieselbe Auflage.

Nicht Teil dieser Anforderung: `tsx`, Go, Java, C/C++, `csproj`, `razor` und weitere Sprachen (eigene Karte nur auf Wunsch des Betreibers), Nebeneinander-Ansicht (I0007; sie färbt dieselben Zeilen, die Auflage ist dafür zu nutzen), Wortmarken innerhalb einer Zeile, ein Hinweis an ungefärbten Dateien, eine Auswahl des Farbschemas in der Oberfläche (es folgt dem System, wie kanbanD).

## Offene Fragen
Alle fünf entschieden vom product-owner am 2026-11-24 (`AI-Team/po-entscheidungen.md`, Zeilen „#8 I0008“); nichts offen.

1. ~~Welche Sprachen?~~ **Entschieden**: die 13 Sprachen der Tabelle, dazu **TypeScript** (`ts`, `mts`, `cts`) als letzte Ausbaustufe (Prism-Komponente `typescript` aus `prismjs@1.30.0`, erst wenn die 13 grün sind; trägt sie im Bau nicht, eigene Karte). `tsx`, Go, Java, C/C++, `csproj`, `razor` bleiben ungefärbt, eigene Karte nur auf Wunsch. Weicht von der Empfehlung („später eigene Karte“) ab. Eingearbeitet: Tabelle, Kriterien 1 und 5, B0609.
2. ~~Grenzen und Frist?~~ **Entschieden**: wie kanbanD (Patch ≤ 262 144 Zeichen, Zeile ≤ 1 000, Frist 1 s); anheben erst nach dem ersten Ausprobieren und einer Messung im Browser. Geltung auch für R00008 und I0007. Folge (Hypothese, 40 Zeichen je Zeile): etwa 6 400 Zeilen als Obergrenze, größere Dateien bleiben ungefärbt.
3. ~~Hinweis an ungefärbter Datei?~~ **Entschieden**: nein.
4. ~~Färbt „Ganze Datei mit Diff“ ebenfalls?~~ **Entschieden**: ja, mit derselben Auflage, denselben Grenzen und Frist. Reihenfolge nach Auftrag des Directors am selben Tag: Karte #22 wird vor #8 gebaut und enthält keine Farben; diese Anforderung färbt beide Ansichten (Kriterien 10 bis 13, B0610). Die PO-Zeile nennt Karte #22 als Bauherrin der Färbung; der Auftrag hat das aufgelöst — die Rechnung steht einmal, hier.
5. ~~Kommentar vor dem sichtbaren Hunk?~~ **Entschieden**: hinnehmen, kein Kriterium; in „ganze Datei“ entfällt es (Kriterium 10 prüft das dort).

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 und R00004 hinaus. (Der Entwickler übernimmt `prism.js` und `LICENSE-prism.txt` unverändert aus kanbanD; die Prüfsumme des Pakets steht im Kopfkommentar der Datei.)

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 10 Bubbles unterhalb I0008 (B0601–B0610), davon 4 Standard (2 h) und 6 unklar (2–4 h) — Untergrenze 20 h, obere Schätzung 32 h (vorher 8 Bubbles, 16–24 h; dazu B0609 TypeScript und B0610 Anschluss an „ganze Datei“, beide unklar). Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom) liegen bei 0,01–0,19 h je Bubble; weil der Code aus kanbanD übernommen wird, ist der Richtwert hier ein Vielfaches davon. Bauordnung: B0601–B0608, dann B0610, zuletzt B0609. B0609 ist beauftragt (Entscheidung des product-owner), aber abspaltbar: trägt sie im Bau nicht, wird sie eigene Karte und die übrigen neun Bubbles bleiben der Umfang dieser Karte. Weitere Sprachen: nicht beauftragt.

## Warum löst diese Anforderung das Problem?

Der Auslöser: der Prüfer liest KI-Code im Diff Zeile für Zeile und kann ohne Farbe Kommentar, Zeichenkette und Code nicht auf einen Blick trennen; ihm entgeht, was in einem auskommentierten Block oder zwischen Anführungszeichen steht, und er braucht länger für die Stelle, an der er eine Anmerkung (I0017) macht. Wenn jede Zeile einer bekannten Sprache nach den sieben Rollen eingefärbt ist, dann erkennt er die Art einer Zeile im Vorbeilesen und verbringt seine Zeit an den Stellen, die den Review tragen. Der Hebel gerade hier: Diff-Text ist die einzige Eingabe, die ein fremdes Repo frei bestimmt, und Prism ist eine Bibliothek, die über fremden Text rechnet — wenn sie im Worker mit Frist läuft, nur Zahlen zurückgibt und die Auflage Text per `textContent` setzt, kann ein präpariertes Repo weder ein Skript in die Seite bringen noch sie einfrieren, und die Farbe bleibt eine Auflage, die nichts verändert, was der Prüfer liest.

## Missing-Docs
- Ob `page.route` in der eingesetzten Playwright-Fassung die Anfragen eines Dedicated Workers (`importScripts`, `new Worker`) abfängt, ist nicht belegt (kanbanD hat es als erste Probe vorgesehen, Ausweg `context.route`).
- Ob ein Worker aus `/faerben.js` unter `default-src 'self'` startet (Rückfall `worker-src` → `child-src` → `script-src` → `default-src`): in kanbanD gemessen, hier mit der Sicherheitsrichtlinie von gitreviewA vor dem Bauen zu proben (Integration, Konsole ohne Verstoß).
- TypeScript: die Prism-Komponente `typescript` liegt nirgends lokal vor (nicht in kanbanD), die Rolle von `readonly` in Kriterium 1 ist aus der Prism-Quelle erinnert und im Bau zu bestätigen (Unit-Test mit `Prism.tokenize` unter Node zuerst); ob der Worker-Rahmen mit der größeren `prism.js` die Frist einhält, ist ungeprüft.
- Messwerte im Browser fehlen; die genannten stammen aus Node (Scratchpad `gemeinsam/scratchpad/plan-8/` der Factory) und aus kanbanD.

## Notizen

### Entscheidungen zur Karte (product-owner 2026-11-24, `AI-Team/po-entscheidungen.md`)
- TypeScript als letzte Ausbaustufe B0609, abspaltbar; `tsx` ausdrücklich nicht.
- Färbung der ganzen Datei gehört zu dieser Karte (Auftrag des Directors: Karte #22 vorher, ohne Farben); eigene Bubble B0610 statt B0606 zu erweitern, weil sie von I0022 abhängt (B0601–B0608 nicht), den Abgleich um die Ansicht erweitert und eigene Kriterien (10 bis 13) hat.
- Hinweis an ungefärbten Dateien: nein; Kommentar vor dem Hunk: hinnehmen.

### Verworfene Alternativen
- Option 2 (Prism auf der Seite): `feindlich.md` friert die Seite 4,7–5,3 s ein; ein Fremdrepo könnte so die Oberfläche lahmlegen.
- Option 3 (`innerHTML` mit Prism-Ausgabe): schwächt die Regel „fremder Text nie als HTML“ ohne Not.
- Eigene Grenze je Hunk-Seite statt je Datei: kanbanD hat sie abgewogen (ADR-0037, später ADR-0040) und verworfen; die Datei-Grenze ist einfacher zu prüfen.
- Zeit-Kriterium für die Färbedauer (z. B. „Farbe ≤ 3 s“): Wanduhr unter Last wackelt (Lehre aus kanbanD und `gemeinsam/gelerntes.md`); geprüft wird das Ereignis (`ja`/`nein`), nicht die Zeit.
- Schnitt in „Sprachen“ und „Grenzen/Frist“ als zwei Slices: die Frist und der Worker sind die Sicherheitsgrenze der Färbung und mit der ersten Sprache nötig — nach Schichten geschnitten. Falls der Slice im Bau zu groß wird, ist die erste Ausbaustufe **Sprachen** (Daten: erst JavaScript, C#, Rust, dann der Rest der Tabelle).
- `diff`/`patch` als Endungen: Prism hat keine Rolle für eingefügt/entfernt (kanbanD bündelt die Grammatik, färbt aber nichts); weggelassen. Die Komponente `diff` kann beim Übernehmen aus `prism.js` bleiben (unverändert übernommen) — Entscheidung des Entwicklers.
- Zehn Kriterien in kanbanD, dreizehn hier (neun der Basis, vier für „ganze Datei“): kein Test der Frist nahe der Grenze, kein Worker-Nachrichtentest (Worker-Rahmen ist Integration), Hunk-übergreifende Fehler nur als Unit-Test.
