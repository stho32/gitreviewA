---
id: R00023
status: Neu
datum: 2026-11-25
---

# R00023: Nebeneinander-Ansicht des Diffs

## Beschreibung

Wählt der prüfende Mensch die Anordnung **„nebeneinander“**, zeigt der Diff-Bereich denselben Diff in zwei Spalten: links die alte Fassung mit der Nummer alt, rechts die neue Fassung mit der Nummer neu. Entfernte und hinzugefügte Zeilen eines Abschnitts stehen sich zeilenweise gegenüber (die i-te entfernte gegen die i-te hinzugefügte, ein Überhang gegen leer), eine unveränderte Zeile steht links und rechts. Die Anordnung ist eine **eigene Achse** neben dem Umfang „nur Änderungen“/„ganze Datei“ ([R00008](R00008-ganze-datei-mit-diff.md)) und gilt in beiden; Zeilenumbruch ([R00004](R00004-diff-einer-datei-lesen.md)), Syntaxfärbung ([R00007](R00007-syntaxhervorhebung.md)), Zuklappen großer Dateien ([R00017](R00017-grosse-diffs.md)), Anmerken an der Nummer neu ([R00010](R00010-zeile-annotieren.md)) und die Zeilennavigation bleiben unverändert. Die Wahl bleibt beim Wechsel von Datei und Commit.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (unified **oder nebeneinander**) und die Leitplanken Lastprofil (20 000 Diff-Zeilen je Datei, Dateiwechsel ≤ 1 s an der Obergrenze) und Sicherheit (fremdes Repo).

Baut auf [R00004](R00004-diff-einer-datei-lesen.md) auf (Diff-Bereich, Zeilen `{art, alt, neu, text}` aus `patchZeilen`, `data-art`/`data-alt`/`data-neu`, Umbruch-Umschalter, Verwerfen später Antworten) und auf [R00008](R00008-ganze-datei-mit-diff.md) (zweite Ansicht, Umschalter mit bleibender Wahl). Es färbt ([R00007](R00007-syntaxhervorhebung.md)) und klappt zu ([R00017](R00017-grosse-diffs.md)) über dieselben Auflagen; es färbt und zählt nichts neu. Der prüfende Mensch hakt und merkt über dieselben Zeilen an wie bisher ([R00010](R00010-zeile-annotieren.md), [R00012](R00012-oberflaeche-liste-detail-zusammen.md)).

**Vorlage kanbanD** (Betreiber 2026-11-24: „Design kann auch aus kanbanD kommen, Code darf übernommen werden“; Herkunft im Commit nennen, keine eigene Gestaltung): kanbanD hat die Nebeneinander-Ansicht (R00249, ADR-0042). Übernommen wird die **Rechnung**, nicht die HTML-Erzeugung (kanbanD baut Zeichenketten mit `esc()`, gitreviewA DOM-Knoten mit `textContent`):
- `web/review-uebersicht.js` `gegenueberstellen` — Zeilen aus `patchZeilen` → Tabellenzeilen; ein Lauf entfernter Zeilen gegen den direkt folgenden Lauf hinzugefügter, i-te gegen i-te, Überhang gegen leer (`null`); Kontext links und rechts mit demselben Index; Kopf über beide Spalten; Hinweiszeile eigene Tabellenzeile;
- aus `web/diff.js`: `NEBEN_KOPF` (Spaltenköpfe „alte Fassung“/„neue Fassung“), `nebenZeileHtml`, `nebenHinweisHtml` (Kontextzeile rechts `aria-hidden`, einmal gelesen), `nebenBlockBreite`/`zeichenBreite` (beide Code-Spalten gleich breit), `SEITENKLASSE`; die Zeilennummer alt/neu mit `nummerNeuHtml` (Anschluss für den VS-Code-Sprung);
- **nicht** übernommen: die Wortmarken je Zeile (`wortMarken`, R00247/ADR-0042 W1) — sie ist ein eigener Slice (siehe „Nicht Teil dieser Anforderung“), kein Bestandteil dieser Karte.

**Ort des Umschalters:** Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`, abgenommen, Vorrang vor Material 3): eine Gruppe „Anordnung“ neben „Umfang“ und „Umbruch“ im Diff-Werkzeugkasten (`.diff-werkzeug`, `data-gruppe="anordnung"`, Taste `v`); der Entwurf zeichnet „nebeneinander“ ausdrücklich nicht (Banner „Nebeneinander (I0007) ist geplant“). Den Werkzeugkasten baut [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (I0027); diese Anforderung setzt die Gruppe „Anordnung“ hinein (`Braucht` I0027).

## Geschäftlicher Nutzen

Ein Diff mit Vorzeichen untereinander zeigt eine ersetzte Zeile als entfernte **über** der hinzugefügten — bei mehreren Änderungen in einem Abschnitt muss der Prüfer im Kopf zusammenhalten, welche entfernte Zeile welche hinzugefügte ersetzt. Nebeneinander stehen sie sich gegenüber, und der Blick geht nicht mehr zwischen zwei Zeilenblöcken hin und her. Wer eine KI-Änderung liest, sieht „vorher / nachher“ an derselben Stelle; die Zeilennummern alt und neu bleiben dabei sichtbar, und eine Anmerkung haftet wie bisher an der Nummer neu. Die Ansicht nutzt dieselbe Zeilenrechnung und dieselbe Färbung wie die vorhandene Ansicht, öffnet keine neue Grenze zu `git` und keinen neuen Endpunkt — sie ist eine zweite Anordnung derselben Daten.

## Funktionale Anforderungen

- **Umschalter „Anordnung“**: zwei Stellungen „untereinander“ (Voreinstellung) und „nebeneinander“, als eigene Gruppe im Diff-Werkzeugkasten neben „Umfang“ und „Umbruch“. Das Umschalten ändert weder die gewählte Datei noch die Dateiliste noch den Umfang; der Diff-Bereich zeigt danach dieselbe Datei in der anderen Anordnung. Die Wahl bleibt beim Wechsel von Datei und Commit und auch dann, wenn sie ohne gewählte Datei getroffen wurde. Nur RAM; nach dem Neuladen der Seite gilt wieder „untereinander“.
- **Anordnung und Umfang sind unabhängig**: „nebeneinander“ wirkt in „nur Änderungen“ und in „ganze Datei“. Beide Umschalter stehen getrennt; die vier Kombinationen sind erreichbar.
- **Paarung je Abschnitt**: in jedem Abschnitt (zwischen zwei Hunk-Köpfen) steht ein Lauf entfernter Zeilen dem **direkt folgenden** Lauf hinzugefügter Zeilen zeilenweise gegenüber: die i-te entfernte gegen die i-te hinzugefügte; hat ein Lauf mehr Zeilen, steht der Überhang gegen eine leere Seite. Ein Lauf entfernter Zeilen **ohne** folgenden hinzugefügten Lauf steht links, rechts leer; ein Lauf hinzugefügter Zeilen ohne vorangehenden entfernten steht rechts, links leer. Ein Hunk-Kopf und eine Hinweiszeile (`\ No newline at end of file`) trennen die Paarung nicht künstlich, sondern sind eigene Tabellenzeilen.
- **Vier Zeilenbestandteile**: je Tabellenzeile die Nummer alt (nicht bei hinzugefügten Zeilen), der Text alt, die Nummer neu (nicht bei entfernten Zeilen) und der Text neu. Die Zellen tragen `data-art` (`plus`, `minus`, `kontext`), `data-alt` und `data-neu` wie [R00004](R00004-diff-einer-datei-lesen.md); die **Nummer-neu-Seite** ist die Stelle für Anmerkung ([R00010](R00010-zeile-annotieren.md)) und VS-Code-Link (I0011, R00021).
- **Zeilenart unverändert**: entfernte Zeilen links, hinzugefügte rechts, unveränderte Zeilen in beiden Spalten; ein Hunk-Kopf steht über beide Spalten; die Hinweiszeile `\ No newline at end of file` steht in der Spalte ihrer Seite, ohne Vorzeichen und Nummern wie [R00004](R00004-diff-einer-datei-lesen.md).
- **Breite und Umbruch**: beide Code-Spalten sind gleich breit; die Breite bestimmt die längste Zeile beider Seiten eines Blocks. Ohne „Umbruch“ steht jede lange Zeile einzeilig, der Bereich scrollt waagerecht; mit „Umbruch“ werden die Zeilen **innerhalb** der Spalten umbrochen und der Bereich scrollt nicht waagerecht. Der Zustand von „Umbruch“ und sein Bleiben bleiben wie [R00004](R00004-diff-einer-datei-lesen.md) und wirken in beiden Anordnungen.
- **Färbung**: die Anordnung färbt über **dieselbe** Auflage wie [R00007](R00007-syntaxhervorhebung.md) (R00007, B0605) — es gibt keine zweite Rechnung und keine zweite Farbschlange. Eine entfernte Zeile trägt die Rollen der alten Seite (links), eine hinzugefügte die der neuen Seite (rechts), eine unveränderte Zeile die der neuen Seite in beiden Spalten. Marken für Unsichtbares (`⟨U+…⟩`) bleiben ungefärbt und haben Vorrang; Text, Nummern, Zeilenart, Blöcke und Umbruch sind mit und ohne Farbe gleich. Das Umschalten der Anordnung verwirft einen laufenden Auftrag und färbt die nun gezeigte Anordnung neu; ohne Farbe bleibt die Ansicht lesbar.
- **Große Dateien**: Zuklappen und „Trotzdem laden“ sowie die Blockgrenze aus [R00017](R00017-grosse-diffs.md) gelten in beiden Anordnungen mit demselben Verfahren. Da die zweite Anordnung mehr Zellen zeigt, gilt die Grenze der Knotenzahl unverändert je Block; die Paarung geschieht **vor** der Blockbildung, sodass beide Seiten einer Tabellenzeile im selben Block liegen. Beim Umschalten der Anordnung wird der Zuklappzustand neu bewertet; eine späte Antwort einer früheren Anordnung (Datei, Commit, Umfang, Anordnung) wird verworfen.
- **Anmerken und Zeilennavigation**: ein Klick auf die neue Seite einer Tabellenzeile ist wie bisher an der Nummer neu annotierbar; ein Klick auf eine **entfernte** Zeile (nur linke Seite) öffnet kein Feld, sondern den Hinweis „Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei“ (R00010). Die Zeilenwanderung per Pfeiltasten und der Anmerkungshinweis „Anmerkung an einer Zeile, die diese Ansicht nicht zeigt“ ([R00012](R00012-oberflaeche-liste-detail-zusammen.md)) arbeiten in der zweispaltigen Tabelle wie in der einspaltigen; die Anmerkungszeilen ([R00010](R00010-zeile-annotieren.md)) bleiben unberührt.
- **Lesereihenfolge und Bedienung**: die Gruppe „Anordnung“ ist per Tastatur bedienbar und trägt einen Namen für Screenreader, der mit dem sichtbaren Text beginnt; jede Tabellenzeile ist als Zeile erreichbar. Eine unveränderte Zeile wird **einmal** gelesen (die rechte Zelle ist `aria-hidden`, wie in kanbanD), die Spalten tragen Namen „alte Fassung“/„neue Fassung“. Die Taste `v` gehört zu I0015 ([R00012](R00012-oberflaeche-liste-detail-zusammen.md)).
- **Zustände**: leer, Binärdatei, Datei ohne Zeilenänderung und Fehler zeigen in beiden Anordnungen dieselben Hinweise wie [R00004](R00004-diff-einer-datei-lesen.md) („Datei wählen, um ihren Diff zu sehen“, „Binärdatei“, „Keine Zeilenänderungen“, „Diff konnte nicht gelesen werden“); Dateiliste, Umschalter und die übrigen Dateien bleiben bedienbar.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): eine Datei mit 20 000 Diff-Zeilen steht in der Anordnung „nebeneinander“ ≤ 1 s nach dem Umschalten bzw. nach dem Klick auf die Datei (Obergrenze des Dateiwechsels); der Messwert muss ≤ 0,7 s sein (≥ 30 % Abstand zur Grenze, `rollen/planer/zeitkriterien.md`) — liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium. Während des Scrollens durch einen langen, dichten, gefärbten zweispaltigen Diff dauert keine Aufgabe des Hauptfadens länger als 150 ms (Long Tasks, wie [R00007](R00007-syntaxhervorhebung.md)/[R00017](R00017-grosse-diffs.md)). Die Zeitmessung steht in E2E (nur im Browser messbar); das Umschalten bei kleinen Dateien ist kein E2E-Zeitkriterium.
- **Sicherheit** (`AI-Team/gelerntes.md`): wie [R00004](R00004-diff-einer-datei-lesen.md), ohne Abstriche. Zeilentext, Pfade und Hunk-Titel sind fremder Text und erscheinen nur über `textContent` (kein `innerHTML`); unsichtbare und richtungsändernde Zeichen erscheinen als Marke `⟨U+…⟩` mit derselben Klasse wie bisher. Die zweite Anordnung erzeugt **keinen** neuen Endpunkt und **keinen** neuen `git`-Aufruf; sie verdoppelt die Zahl der DOM-Knoten je Zeile, weshalb die Blockgrenze an der Knotenzahl ([R00017](R00017-grosse-diffs.md)) hier besonders zählt.
- **Logging**: stdout bleibt leer; kein neuer Logeintrag (die Ansicht meldet dem Server nichts).
- **Benutzerfreundlichkeit**: Ort und Aufbau aus dem Entwurf Fassung 2 (Diff-Werkzeugkasten, Gruppe „Anordnung“); Stil aus kanbanD; keine eigenen Gestaltungsvorgaben. Der Vollständigkeitssatz „eine unveränderte Zeile wird einmal gelesen“ gilt als Zusage an Screenreader.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (Commits `p`, `q`, `s`), **Repo M** (Merge `m`) und **Repo U** (Commits `u`, `v`) sowie **Repo R** (Umbenennung mit Änderung) sind die Repos aus [R00004](R00004-diff-einer-datei-lesen.md) und [R00008](R00008-ganze-datei-mit-diff.md). Neu **Repo G** (herstellbar mit `git` allein; `t.txt`):

```bash
git init -q -b main G && cd G
git config user.name "Anna Beispiel"; git config user.email anna@example.org
printf 'eins\nzwei\ndrei\nvier\nfünf\nsechs\n' > t.txt
git add -A && git commit -q -m "Start"                                   # g1
printf 'eins\nX\nY\nZ\nvier\nfünf\nsechs\n' > t.txt
git add -A && git commit -q -m "Zwei weg, drei her"                      # g2
printf 'eins\nX\nY\nZ\nfünf\nsechs\n' > t.txt
git add -A && git commit -q -m "Nur vier weg"                            # g3
g2=$(git rev-parse HEAD~1); g3=$(git rev-parse HEAD)
```

„umschalten“ heißt die andere Stellung des Umschalters „untereinander“ / „nebeneinander“ wählen; „wählen“ = Klick in der Dateiliste; Fenster 1280 × 800. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright.

### Paarung (gegen den Baustein und die Oberfläche)

- [ ] **1. Überhang rechts.** Gegeben Repo G und `gitreviewA $g2`, wenn man auf „nebeneinander“ umschaltet und `t.txt` wählt, dann steht `eins` (alt 1 | neu 1), dann `−zwei` (alt 2) gegen `+X` (neu 2), `−drei` (alt 3) gegen `+Y` (neu 3), dann links leer gegen `+Z` (neu 4), dann `vier` (4/4), `fünf` (5/5), `sechs` (6/6); der Kopf `@@ -1,6 +1,7 @@` steht über beide Spalten. Rechnung: 2 entfernt, 3 hinzugefügt → das dritte Paar hat links keine Zeile. *Ebene: Unit (Gegenüberstellung) und Oberfläche.*
- [ ] **2. Entfernter Lauf ohne hinzugefügten.** Gegeben Repo G und `gitreviewA $g3`, wenn man `t.txt` in „nebeneinander“ wählt, dann steht `−vier` (alt 4) links und rechts leer, darunter `fünf` (5/5) und `sechs` (6/6) in beiden Spalten. *Ebene: Unit und Oberfläche.*
- [ ] **3. Reine Löschung, reine Hinzufügung, Hinweiszeile.** Gegeben Repo A und `gitreviewA $q $p` in „nebeneinander“: bei `src/b.txt` `eins` (1/1), `−zwei` (alt 2) gegen `+ZWEI` (neu 2), leer gegen `+drei` (neu 3); bei `alt.txt` (gelöscht) die vier `−`-Zeilen `a1` bis `a4` links und rechts leer; bei `breit.txt` (hinzugefügt) rechts zwei `+`-Zeilen (neu 1 und 2) und links leer; bei `ende.txt` nach `−a` (alt 1) die Zeile `\ No newline at end of file` als eigene Tabellenzeile ohne Vorzeichen und Nummern, dann `+a` (neu 1). *Ebene: Unit und Oberfläche.*
- [ ] **4. Umbenennung und Merge.** Gegeben Repo R und `gitreviewA $r2`, wenn man `v.txt` in „nebeneinander“ wählt: `l1` (1/1), `l2` (2/2), `−l3` (alt 3) gegen `+L3` (neu 3), `l4` (4/4), `l5` (5/5); gegeben Repo M und `gitreviewA $m`, wenn man `f.txt` wählt: links leer gegen `+neu` (neu 1). *Ebene: Oberfläche.*

### Beide Umfänge und Wahl

- [ ] **5. Anordnung und Umfang sind unabhängig.** Gegeben `gitreviewA $g2`, `t.txt` gewählt und die Anordnung „nebeneinander“, wenn man auf „ganze Datei“ umschaltet, dann bleiben die Paare `−zwei`/`+X`, `−drei`/`+Y`, leer/`+Z` stehen, dazu die zusätzlichen Kontextzeilen (in „ganze Datei“ auch die Zeilen, die „nur Änderungen“ auslässt); schaltet man zurück, stehen wieder genau die Zeilen von „nur Änderungen“ in zwei Spalten, und der Umschalter für den Umfang zeigt unverändert seine Stellung. *Ebene: Oberfläche.*
- [ ] **6. Die Wahl bleibt.** Gegeben die Anordnung „nebeneinander“, wenn man `t.txt` in `g2`, danach `t.txt` in `g3` (anderer Commit) wählt und die Seite neu lädt, dann bleibt „nebeneinander“ gewählt bis zum Neuladen; im zweiten Durchgang vom frischen Start wird ohne gewählte Datei auf „nebeneinander“ umgeschaltet und danach `t.txt` gewählt — die zweispaltige Ansicht erscheint, der Hinweis „Datei wählen, um ihren Diff zu sehen“ stand bis zur Wahl unverändert da. *Ebene: Oberfläche.*

### Breite und Umbruch

- [ ] **7. Breite und Umbruch.** Gegeben Repo A, `breit.txt` (Zeile 2 = 300 Zeichen) in „nebeneinander“, Fenster 1280 × 800: ohne „Umbruch“ belegt Zeile 2 dieselbe Höhe wie Zeile 1 und der Bereich lässt sich waagerecht scrollen; mit „Umbruch“ ist sie in beiden Spalten mehrere Bildschirmzeilen hoch und der Bereich scrollt nicht waagerecht; beide Code-Spalten sind gleich breit (die breitere Zeile beider Seiten gibt die Breite); der Text ist in beiden Fällen derselbe. *Ebene: E2E (Darstellung, Browser-Eigenes).*

### Färbung, große Dateien, Anmerken

- [ ] **8. Färbung über dieselbe Auflage.** Gegeben Repo A, `q`, `lang.txt` in „nebeneinander“ und Färbung fertig: `−z03` (links) und `+Z03` (rechts) tragen dieselben Rollen wie `−z03`/`+Z03` in „untereinander“; die entfernte Zeile nimmt die Rollen der alten Seite, die hinzugefügte die der neuen; bei `fremd.txt` steht `a`+U+202E+`b` als Marke und ist ungefärbt; schaltet man während eines laufenden Farbauftrags die Anordnung um, färbt die neu gezeigte Anordnung, und die späte Antwort der alten Anordnung legt keine Farbe auf (verzögerter Fake-Worker). *Ebene: Unit (Rollen je Seite) und E2E (Rolle im Browser, verzögerter Fake, Browser-Eigenes).*
- [ ] **9. Große Dateien.** Gegeben Repo U, `gitreviewA $v` und die Anordnung „nebeneinander“: `riesig.txt` (30 000 Diff-Zeilen) steht zugeklappt mit der Zahl und „Trotzdem laden“; „Trotzdem laden“ zeichnet die Paare; `gross.txt` (20 000 Zeilen, `zeile 10000` geändert) steht mit dem Paar `−zeile 10000`/`+geändert 10000`; jeder Block enthält höchstens 5 000 Knoten (Elemente und Textknoten, gezählt), beide Seiten einer Tabellenzeile liegen im selben Block, und das Umschalten der Anordnung bewertet den Zuklappzustand neu (keine stehen gebliebenen Zeilen). *Ebene: Integration (Blockgrenze, Knotenzähler, Paarung vor der Blockbildung) und E2E (Zuklappen).*
- [ ] **10. Anmerken und Zeilenwanderung.** Gegeben Repo A, `q`, `lang.txt` in „nebeneinander“: ein Klick auf die neue Seite der Zeile `z19` (alt 19, **neu 18**) öffnet das Feld mit dem Namen „Anmerkung zu lang.txt, Zeile 18“, die gespeicherte Anmerkung steht unter der Tabellenzeile, und das Ergebnis nennt `lang.txt:18` (Rechnung: 20 − `z18` entfernt = `z19` ist Zeile 18 im Stand danach); ein Klick auf die linke Seite von `−z18` (nur Nummer alt) öffnet kein Feld, sondern den Hinweis „Entfernte Zeile — Anmerkung an eine Zeile im neuen Stand oder an die Datei“; die Zeilenwanderung per Pfeil auf/ab erreicht die Zeilen auch zweispaltig, und der Anmerkungshinweis „Anmerkung an einer Zeile, die diese Ansicht nicht zeigt“ gilt unverändert. *Ebene: Unit (Zeilenziel je Zelle) und Integration (Oberfläche).*
- [ ] **11. Zustände mit Ausweg.** Gegeben „nebeneinander“: eine leere Datei zeigt „Keine Zeilenänderungen“, `logo.bin` „Binärdatei“ ohne Byte-Inhalt, ein nicht lesbarer Diff (Antwort 500) „Diff konnte nicht gelesen werden“; Dateiliste und Umschalter bleiben in jedem Fall bedienbar. *Ebene: Oberfläche.*

### Bedienung und fremder Text

- [ ] **12. Fremder Text und Lesereihenfolge.** Gegeben Repo A, `fremd.txt` in „nebeneinander“, dann nur Tastatur: `<img src=x onerror=alert(1)>` und `<b>fett</b>` stehen mit spitzen Klammern als sichtbarer Text, es erscheint kein Dialog, nichts ist fett, die dritte Zeile trägt die Marke `⟨U+202E⟩` als Text; die Gruppe „Anordnung“ ist per Tab und Leertaste bedienbar und trägt einen Namen, der mit dem sichtbaren Text beginnt; die Spalten tragen die Namen „alte Fassung“/„neue Fassung“, und eine unveränderte Zeile wird einmal gelesen (ihre rechte Zelle ist `aria-hidden`). *Ebene: E2E (DOM-Sicherheit, Tastatur, Browser-Eigenes) und Unit (Lesereihenfolge/aria).*
- [ ] **13. Zurückschalten ändert nichts.** Gegeben „nebeneinander“ mit Anmerkungen, wenn man auf „untereinander“ und wieder zurück schaltet, dann stehen dieselben Zeilen, Nummern, Marken und Anmerkungen wie zuvor; eine um 1,5 s verzögerte Antwort einer früheren Anordnung wird verworfen (kein spätes Neuzeichnen). *Ebene: Oberfläche (verzögerter Fake).*

### Lastprofil

- [ ] **14. Zwanzigtausend Zeilen.** Gegeben Repo U, `gitreviewA $v` und `gross.txt` gewählt in „nur Änderungen“, wenn man auf „nebeneinander“ umschaltet bzw. in „nebeneinander“ die Datei wählt, dann stehen spätestens 1 s nach dem Umschalten/Klick die Zeile `geändert 10000` (neu 10000) und die Zeile `zeile 20000` (neu 20000) im Dokument (ereignisgenau gemessen, Messwert ≤ 0,7 s). *Ebene: E2E (Zeit am Browser, ereignisgenau).*

## Betroffene Verzeichnisstruktur

Wie in [R00004](R00004-diff-einer-datei-lesen.md) und [R00008](R00008-ganze-datei-mit-diff.md): `src/GitReviewA/web/` (Oberfläche), Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit den Schichten `tests/`, `dsl/`, `treiber/`. Kein Server-, kein `Git/`- und kein `GitReviewA.csproj`-Zugriff; die Ansicht rechnet im Browser.

- `web/` — `nebeneinander-werte.js` (reine Gegenüberstellung, im Browser und unter Node testbar, nach `gegenueberstellen`), `nebeneinander.js` (zweispaltige Tabelle über die vorhandenen Zeilen, Breite, Anschluss an Färbung und Blockgrenze); die Gruppe „Anordnung“ liegt im Werkzeugkasten aus `index.html`/`gitreviewa.css` (I0027); nutzt `diff-werte.js` (`bloecke`) und die Auflage aus `diff.js` unverändert.
- `tests/`, `e2e/` — Wegwerf-Repo-Hilfsklasse um Repo G erweitert; DSL und Treiber für die Anordnung (`anordnung`, `zeilenPaar`) auf den vorhandenen Schichten.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Die Kriterien sind so geschrieben, dass die Paarung auch als reiner Baustein (ohne Browser) durchgeprüft werden kann.

### Ablauf
1. **Zeichnen vorbereiten** — nach dem Zeichnen der Zeilen (R00004/R00008, Antwort für die gewählte Datei und den Umfang liegt vor): ist die Anordnung „untereinander“, unverändert wie bisher; sonst die Zeilen zu einer `Tabelle` gegenüberstellen (jedes Paar eine Tabellenzeile).
2. **Paarung** — je Abschnitt: Lauf `minus` gegen den direkt folgenden Lauf `plus`, i-te gegen i-te, Überhang gegen leer; Kontext links und rechts derselbe Index; Hunk-Kopf über beide Spalten; Hinweiszeile eigene Tabellenzeile.
3. **Tabelle bauen** — vier Spalten je Zeile (Nummer alt, Text alt, Nummer neu, Text neu), Zellen mit `data-art`/`data-alt`/`data-neu`, alles `textContent`; Kontextzeile rechts `aria-hidden`; Spaltenköpfe „alte Fassung“/„neue Fassung“. Paarung **vor** der Blockbildung, damit beide Seiten eines Paares im selben Block liegen; Blockgrenze an der Knotenzahl (R00017).
4. **Anschlüsse** — Färbung (B0605) auf die Zellen (alte Seite / neue Seite je Spalte); Breite und `Umbruch`; Zuklappen/„Trotzdem laden“ (R00017); Anmerkziel und Zeilenwanderung (R00010); Linkziel an der Nummer-neu-Seite (I0011). Umschalten der Anordnung: Aufträge und späte Antworten verwerfen, Zuklappzustand neu bewerten, den Zustand `Anordnung` behalten.

### Grobentwurf
**Einstiegsstellen:** `Diffbereich` (R00004/R00008) beim Zeichnen der Antwort; Werkzeugkasten (I0027) für die Gruppe „Anordnung“.

- `Anordnung` (Wert, rein) — `Untereinander` | `Nebeneinander`; Zustand nur im Browser, Start `Untereinander`.
- `Gegenueberstellung` (Operation, rein, `nebeneinander-werte.js`) — `zeilen` (`{art, alt, neu, text}`) → `Tabelle` (Zeilen `{art: kopf|zeile|hinweis, links, rechts}` mit Indizes der Ausgangsliste); nach `gegenueberstellen` aus kanbanD. Unter Node und im Browser testbar.
- `Nebenbereich` (Oberfläche, `nebeneinander.js`) — `Tabelle` + Zeilen + Pfad → DOM-Tabelle mit vier Spalten, Breite (`nebenBlockBreite`-Regel), Anschluss an Färbung, Zuklappen und Zeilenziele; keine zweite Zeilenrechnung, keine zweite Farbschlange.

### Änderungen an bestehenden Modulen
- `diff.js` — beim Zeichnen der Antwort in der Anordnung „nebeneinander“ an `nebeneinander.js` abgeben statt einspaltig zu bauen; der Abgleich später Antworten und der Zuklappzustand bekommen `Anordnung` als fünften Bestandteil (nach Commit, Pfad, Umfang, Anordnung).
- `index.html`/`gitreviewa.css` — die Gruppe „Anordnung“ im Werkzeugkasten (I0027); Stil aus kanbanD.

## Tests

Nach `~/.claude/skills/test-pyramide/SKILL.md` und der ATDD-Regel des Projekts (`AI-Team/factory.md`): je Kriterium zuerst die Spezifikation in Fachsprache, dann DSL, Treiber, System. **Playwright nur für Browser-Eigenes** (Darstellung, Breite/Umbruch, Tastatur, Lesereihenfolge, Zeiten) — **nicht** für die Paarungsregeln; die tragen Unit- und Integrationstests gegen den Baustein und die Oberfläche.

**Unit (rein, `nebeneinander-werte.js`, in Node und im Browser):** `gegenueberstellen` — Paarung entfernter gegen hinzugefügte Läufe, Überhang links (Kriterium 2) und rechts (Kriterium 1), Kontext links und rechts, Hunk-Kopf, Hinweiszeile als eigene Tabellenzeile, Abschnittsgrenze (Kopf trennt), leere Liste; Zeilenziel je Zelle (Zelle links einer entfernten Zeile → nicht annotierbar).
**Integration (Oberfläche gegen Fake bzw. Programm):** Umschalter und Wahl (Kriterien 5, 6, 13); Tabelle und Zellattribute (2, 3, 4); Färbung über die vorhandene Auflage (8, mit verzögertem Fake-Worker); Zuklappen/Blockgrenze mit Knotenzähler (9); Zeilenziele, Anmerkungszeile und Hinweis (10); Zustände (11); Lesereihenfolge/aria (12).
**E2E (Playwright headless, Fenster 1280 × 800):** Breite und Umbruch (7), Darstellung und Lesereihenfolge mit Tastatur (12), Färbung im Browser (8), Zeitkriterium (14). Wegwerf-Repos: A, M, R, U und G; `page.route` für verzögerte Antworten.
**Mutanten** (je einzeln vorher rot): Paarung ohne Überhang (Kriterium 1), entfernter Lauf falsch gepaart (2), Kontext nur in einer Spalte (3/12), Blockgrenze am Zeichen- statt Knotenzahl (9), späte Antwort zeichnet die alte Anordnung (13), Kontextzeile zweimal gelesen (12).

## Abhängigkeiten
- Abhängig von: I0006 Diff einer Datei lesen (R00004, grün) — Zeilen, `data-*`, Umbruch; I0008 Syntaxhervorhebung (R00007, grün) — dieselbe Auflage (B0605); I0014 Große Diffs (R00017, grün) — Zuklappen, Blockgrenze; I0027 Oberfläche Liste–Detail (R00012, rot) — der Diff-Werkzeugkasten, in den die Gruppe „Anordnung“ kommt (`Braucht`) und in dem die Umschalter Umfang/Umbruch leben.
- Blockiert: nichts. Anschluss: I0011 (VS-Code-Link an der Nummer neu), I0015 (Taste `v`), I0027 (Werkzeugkasten) und I0010/I0027 (Netto-Diff) nutzen dieselben Zeilen, ohne von dieser Karte abzuhängen.

Nicht Teil dieser Anforderung (eigene Karten / Verworfenes): **Wortdiff** je Zeile (kanbanD `wortMarken`, R00247; eigener Slice, orthogonal — auch in „untereinander“ nützlich; von [R00004](R00004-diff-einer-datei-lesen.md) schon als eigene Karte geführt); Whitespace ausblenden und Kontext je Abschnitt aufklappen (I0009); die Taste `v` und die übrigen Kürzel (I0015); der VS-Code-Link selbst (I0011); Umbenennung mit Bildern und Binärdateien (I0012); Anmerkungszahl je Datei (Ausbaustufe nach I0027).

## Offene Fragen
1. An den product-owner: **Verhältnis zum Umfang** — ist „nebeneinander“ eine **eigene Achse** „Anordnung“ neben „nur Änderungen“/„ganze Datei“ (Empfehlung: ja, vier Kombinationen, wie der Entwurf zwei getrennte Gruppen zeigt), oder eine dritte Stellung des Umfang-Umschalters?
2. An den product-owner: **Träger des Umschalters** — R00012 (I0027) schließt „nebeneinander“ ausdrücklich aus, der Entwurf zeigt die Gruppe „Anordnung“ im Werkzeugkasten. Empfehlung: I0027 baut den Werkzeugkasten, diese Karte setzt die Gruppe „Anordnung“ hinein (`Braucht` I0027); Alternative: I0027 legt die Gruppe schon an (dann verdrahtet I0007 sie nur).
3. An den product-owner: **Paarung bei ungleichem Lauf** — die i-te entfernte gegen die i-te hinzugefügte, Überhang gegen leer (Empfehlung, wie kanbanD `gegenueberstellen`), oder eine inhaltliche Zuordnung (Ähnlichkeit)? Letzteres wäre eine eigene Rechnung und ein eigener Slice.
4. An den product-owner: **Breite und `Umbruch`** — beide Code-Spalten gleich breit, ohne „Umbruch“ einzeilig mit waagerechtem Scrollen, mit „Umbruch“ innerhalb der Spalten umbrochen (Empfehlung, wie kanbanD), oder eine andere Aufteilung (z. B. eine Spalte fest)?
5. An den product-owner: **Wortdiff** — eigener Slice (Empfehlung: ja, orthogonal zur Anordnung, auch in „untereinander“), oder Teil dieser Karte?
6. An den product-owner: **Wahl bleibt beim Wechsel** — Empfehlung: ja, wie „Ansicht“ ([R00008](R00008-ganze-datei-mit-diff.md)) und „Umbruch“ ([R00004](R00004-diff-einer-datei-lesen.md)).

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort. Ohne Rückfrage entschieden: Anmerken und Link an der **Nummer-neu-Seite**, eine entfernte (linke) Zeile nicht annotierbar (Hinweis wie R00010), eine unveränderte Zeile wird einmal gelesen (rechte Zelle `aria-hidden`), Spaltenköpfe „alte Fassung“/„neue Fassung“, kein neuer Endpunkt und kein neuer `git`-Aufruf, die Taste `v` bleibt bei I0015.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00004/R00008 hinaus (Repo G wird wie die übrigen Wegwerf-Repos von den Tests angelegt).

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unterhalb I0007 (B2201–B2208), davon 3 Standard (2 h) und 5 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 26 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble, die Richtwerte sind also ein Vielfaches davon. Enthalten: nur I0007; der Wortdiff je Zeile ist **nicht** enthalten (eigener Slice), I0027 nur als `Braucht`.

## Warum löst diese Anforderung das Problem?

Der Auslöser: eine KI ändert in einem Abschnitt mehrere Zeilen, und im einspaltigen Diff steht die entfernte Fassung über der hinzugefügten — der Prüfer muss im Kopf zuordnen, welche Zeile welche ersetzt, und verliert in größeren Änderungen den Faden. Wenn die entfernten und hinzugefügten Zeilen sich in zwei Spalten gegenüberstehen (die i-te gegen die i-te), dann liest der Prüfer „vorher / nachher“ an derselben Stelle und sieht die Änderung auf einen Blick. Der Hebel liegt genau hier, weil die Ansicht dieselbe Zeilenrechnung, dieselbe Färbung und dieselbe Blockgrenze wie die vorhandene Ansicht nutzt: sie öffnet keinen neuen Endpunkt, keinen neuen `git`-Aufruf und keine neue Sicherheitsgrenze, und die Zeilennummer neu bleibt die Stellenangabe, an der die Anmerkung (und später der Editor-Sprung) hängt — das Ergebnisformat nach R00002 bleibt unverändert. Ohne diesen Schnitt bliebe „nebeneinander“ aus dem Zielbild („unified oder nebeneinander“) offen, und jede mehrzeilige Änderung kostete den Prüfer Zeit beim Zuordnen.

## Missing-Docs
- Ob eine Tabelle mit `content-visibility: auto` je Block die Breite richtig bemisst (kanbanD schätzt über `contain-intrinsic-inline-size` und `--bb`, ADR-0033) — mit der Stilvorlage von gitreviewA vor dem Bauen proben; kanbanD hat es in seinem Browser gemessen.
- Verhalten der Lesereihenfolge mit `aria-hidden` an der rechten Kontextzelle in der zweispaltigen Tabelle (Screenreader-Reihenfolge „alte Fassung“/„neue Fassung“) — kleiner Versuch vor dem Bauen, wie in R00010/R00012 für die Anmerkungs-ARIA vorgesehen.
- Messwerte im Browser für 20 000 Zeilen zweispaltig fehlen; der Entwickler misst auf dem Stand.

## Notizen

### Optionen (Achse der Anordnung)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Eigene Achse „Anordnung“ neben dem Umfang (Empfehlung) | eine Paarungsfunktion, vier Kombinationen prüfbar; Färbung/Grenze unverändert | gering: nur eine zweite Darstellung derselben Zeilen | klein |
| 2. Dritte Stellung des Umfang-Umschalters | ein Umschalter weniger | „nebeneinander“ verträgt sich nicht mit jeder Umfangsstellung; die Differenzierung von R00008 (Färbung/Grenze am gezeigten Patch) verwischt | mittel |
| 3. Eigene Seite/Ansicht | einfach zu verstehen | doppelte Pflege von Liste, Zeilen, Färbung, Anmerkungen | groß |

Gewählt (Empfehlung): 1; der product-owner bestätigt sie (Offene Frage 1).

### Verworfene Alternativen
- **Wortdiff je Zeile** in diese Karte: eigener Slice (kanbanD `wortMarken` ist dort R00247, in gitreviewA nennt R00004 ihn schon als eigene Karte); die Paarung und der Wortvergleich sind zwei Rechnungen, getrennt prüfbar.
- **Paarung im Server**: der Server müsste den Patch zählen und umordnen; die Zeilenrechnung steht aber schon im Browser (R00004) und die Anzeige hängt an der gewählten Anordnung — nach Schichten geschnitten und doppelte Wahrheit (kanbanD rechnet im Browser).
- **Inhaltliche Zuordnung (Ähnlichkeit)** statt Lauf-Paarung: eigene, teure Rechnung mit schlechter Vorhersagbarkeit; verworfen zugunsten der einfachen i-ten-Regel.
- **Zwei Slices („Tabelle“ und „Umschalter mit Wahl“)**: die Tabelle ohne Umschalter ist nicht erreichbar, der Umschalter ohne Tabelle zeigt nichts — nach Schichten geschnitten. Falls die Karte im Bau zu groß wird: Breite/`Umbruch` (B2204) oder der Zuklappen-Anschluss (B2206) als eigene Karte; Paarung und Tabelle bleiben der Kern.
- **Färbung neu bauen**: die farbige zweispaltige Ansicht nutzt dieselbe Auflage (B0605) und dieselbe Schlange wie R00007; eine zweite wäre doppelte Wahrheit.
