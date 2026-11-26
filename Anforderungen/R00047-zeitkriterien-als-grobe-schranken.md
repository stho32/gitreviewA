---
id: R00047
status: Neu
datum: 2026-11-26
---

# R00047: Zeitkriterien als grobe Schranken

## Beschreibung

gitreviewA prüft sein Zeitverhalten nur noch gegen **grobe Schranken**: ein Ergebnis steht am Lastprofil spätestens **5 s** nach der auslösenden Handlung, und die Oberfläche friert während der Arbeit nie länger als **2 s** ein. Die engen Ziele mit 30-%-Abstand (etwa „Messwert ≤ 0,7 s“) entfallen ersatzlos. Die Tests messen weiterhin **ereignisgenau** — gewartet wird auf das Ereignis, nicht im Standardraster —, aber ihre Erwartung ist die grobe Schranke statt einer Marge. Anlass: der Betreiber hat harte Performance-Bedingungen abgelehnt („Wir brauchen so harte Performance-Bedingungen nicht. Bisher gesehen war die Performance für die real-Nutzung vollkommen in Ordnung. Wenn es Probleme gibt melde ich mich.“); die bisherige Performance ist für die reale Nutzung in Ordnung, enge Zeitziele erzeugen nur wackelige Tests und Nacharbeit ohne Nutzen.

Zahlt ein auf: [Vision](R00000-vision.md) — Leitplanke „Lastprofil“ (flüssig bis 200 Commits, 2 000 geänderte Dateien, 20 000 Diff-Zeilen je Datei, 500 Annotationen).

**Vision angeglichen (2026-11-26):** die Vision nannte unter „Leitplanken → Lastprofil“ (Zeilen 113–117) engere Ziele („Oberfläche ≤ 2 s nach Aufruf, Dateiwechsel ≤ 200 ms typisch und ≤ 1 s an der Obergrenze, ‚Beenden‘ bis Ausgabe ≤ 1 s“). Diese Anforderung löst genau diese Zahlen ab; auf Entscheidung des `product-owner` (`AI-Team/po-entscheidungen.md`, letzte Zeile) hat der `planer` die Vision über `/vision fortschreiben` auf dieselben groben Schranken gezogen — der Widerspruch ist damit aufgelöst, die Vision bleibt sonst unverändert.

## Geschäftlicher Nutzen

Der Auslöser: die Gate-Suite prüfte das Zeitverhalten mit engen Margen („Messwert ≤ 0,7 s bei Zusage 1 s“, mindestens 30 % Abstand). Am Lastprofil (20 000 Zeilen mit Umbruch) liegen die Messwerte bei etwa 530 ms unter niedriger Last und 720–780 ms unter Last — die 0,7-s-Grenze war damit **unter Last nicht mit Abstand haltbar**. Ein solches Kriterium wackelt, kostet je Lauf Nachfahren und Bewerten und lässt ein echtes Rot im Rauschen untergehen; zugleich löst es keine reale Nutzerbeobachtung aus, denn die Performance ist im Betrieb in Ordnung. Wenn die Zeitprüfungen stattdessen nur noch **grobe Schranken gegen echte Einbrüche** sind (Größenordnung Sekunden), prüfen sie weiterhin genau das, was ein Nutzer bemerken würde — eine hängende, einfrierende Oberfläche —, ohne bei normalem Rechnerlast-Rauschen rot zu werden. Der Hebel liegt bei den Prüfungen selbst: die Messung bleibt ereignisgenau, nur die Erwartung wird grob; der zu prüfende Code ändert sich nicht.

## Funktionale Anforderungen

- **Zwei Schranken statt vieler Ziele**: das Zeitverhalten wird über genau zwei Schranken geprüft — die **Anzeige-Schranke** (Ergebnis steht) und die **Einfrier-Schranke** (Oberfläche bedienbar). Es gibt keine dritte Zahl, kein „typisch“, keine Abstandsregel.
- **Anzeige-Schranke 5 s**: nach einer auslösenden Handlung am Lastprofil steht das erwartete Ergebnis spätestens **5 s** später am Bildschirm — beim Aufruf die Commit-Leiste, beim Dateiwechsel der Diff, beim Umschalten der neue Zustand, beim Filtern/Ausblenden die Liste, bei der Suche Markierung und Zähler, beim Speichern einer Anmerkung die Ergebnis-Spalte; „Beenden“ endet mit Ausgabe spätestens 5 s nach der Anforderung.
- **Einfrier-Schranke 2 s**: während einer laufenden Operation blockiert keine einzelne Aufgabe des Hauptfadens länger als **2 s**, und die Oberfläche bleibt bedienbar (eine Betätigung wirkt). Das ersetzt die bisherige Long-Task-Grenze von 150 ms.
- **Messung unverändert ereignisgenau**: die Tests warten weiter auf das Ereignis (Zeile steht, Zuklapphinweis steht, Liste steht, Spalte steht, Prozess endet) und messen vom Auslöser bis dorthin; das Standardraster des Test-Frameworks bleibt verpönt (`rollen/planer/zeitkriterien.md`, „E2E ereignisgenau“).
- **Keine engen Ziele, kein Abstand**: „Messwert ≤ 0,7 s“, „≤ 1,4 s“, „≥ 30 % Abstand“, „≤ 200 ms typisch“ und „Long Task ≤ 150 ms“ sind keine Kriterien mehr und entfallen aus den Prüfungen.
- **Strukturelle Grenzen bleiben**: die Zuschnitt-Grenzen des Zuklappens und der Blockbildung (20 000 Diff-Zeilen, 262 144 Zeichen, 10 000 Marken, 5 000 DOM-Knoten je Block, 500 Zeilen je Block, 8 MiB Ausgabegrenze, 10 000 Suche-Treffer) sind **keine** Zeitkriterien und werden von dieser Anforderung nicht berührt.

## Nicht-funktionale Anforderungen

- **Zeitverhalten (neu)**: Anzeige-Schranke **5 s**, Einfrier-Schranke **2 s** am Lastprofil der Vision (200 Commits, 2 000 Dateien, 20 000 Diff-Zeilen je Datei, 500 Annotationen, 2 000 Haken). Beide Zahlen sind Obergrenzen gegen Einbrüche, keine Zielwerte; sie gelten unter der echten Rechnerlast paralleler Rollen, ohne künstliche Last (`AI-Team/gelerntes.md`, „Keine künstliche Last erzeugen“).
- **Testbarkeit**: die Schranke ist eine Konstante an **einer** Stelle der E2E-Suite (kein Zahlenstreuen in Specs und DSL); die pos. Kontrolle bleibt erhalten (eine eingebaute Verzögerung über der Schranke macht den Test rot).
- **Kein Produktverhalten geändert**: diese Anforderung ändert nur Prüfungen und die Vertragsformulierung; Produktcode wird nicht umgebaut.

## Akzeptanzkriterien

### Grobe Schranken statt enger Ziele
- [ ] Gegeben der Bauplan (unten, „Spec-Bauplan“), wenn ein betroffener Spec oder eine DSL-Frist auf die neuen Schranken umgestellt ist, dann enthält die Datei **keine** 0,7-s-/1,4-s-Erwartung, keine „≥ 30 % Abstand“-Zusage und keine 150-ms-Long-Task-Erwartung mehr, sondern `anzeigeSchrankeMs = 5000` bzw. `einfrierSchrankeMs = 2000` aus der einen gemeinsamen Konstanten. *Ebene: Unit/Bausteintest (Konstanten) und Sichtprüfung der Datei.*

### Anzeige-Schranke hält und wird rot, wenn sie gerissen wird
- [ ] Gegeben die umgestellten Lastprofil-Specs (`umbruch-standardmaessig-an`, `diff-einer-datei-lesen`, `grosse-diffs`, `syntaxhervorhebung`, `zeile-annotieren`, `im-diff-suchen`, `nebeneinander-weitere`, `ergebnis-lastprofil`, `abgehakte-ausblenden`, `dateien-ausblenden`, `datei-abhaken-programm`, `beenden`), wenn man sie auf dem Stand fährt, dann sind sie grün, und kein Messwert muss die 5-s-Schranke einhalten als Abstand, sondern unterschreiten. *Ebene: E2E (Playwright headless).*
- [ ] Gegeben dieselbe Prüfung mit einer eingebauten Verzögerung von 6 s (künstlich über die Anzeige-Schranke, im Test, nicht als Systemlast), wenn der betroffene Spec läuft, dann wird er **rot** (die Schranke greift). *Ebene: E2E (Fault-Injection im Test).*

### Einfrier-Schranke ersetzt die Long-Task-Zusage
- [ ] Gegeben `dicht.js` geladen und gezeigt bzw. `gross.txt` gesucht, wenn man scrollt bzw. sucht, dann blockiert keine Aufgabe des Hauptfadens länger als 2 s (Absenzprobe, `PerformanceObserver`); die Positivkontrolle (Knotenzähler, Verzögerung über der Schranke) bleibt. *Ebene: E2E (Long Tasks im Browser, Browser-Eigenes).*
- [ ] Gegeben dieselbe Probe mit einer künstlichen Blockade von 3 s (über der Einfrier-Schranke), wenn sie läuft, dann wird sie **rot**. *Ebene: E2E (Fault-Injection im Test).*

### Ablösung nachgewiesen
- [ ] Gegeben die Tabelle „Abgelöste Kriterien“ dieser Anforderung, wenn die Specs umgestellt sind, dann ist jede dort genannte Zahl entweder durch eine der beiden Schranken oder ausdrücklich durch eine strukturelle Grenze ersetzt; kein Spec prüft weiter eine abgelöste Zahl. *Ebene: Sichtprüfung + Grep über `e2e/`.*

## Betroffene Verzeichnisstruktur

Wie im Projekt üblich: E2E-Spezifikationen unter `e2e/tests/`, ihre Hilfsschichten unter `e2e/dsl/` und `e2e/treiber/`. Produktcode unter `src/GitReviewA/web/` wird **nicht** geändert — auch die Arbeitsfrist des Färbe-Workers (`FRIST_MS = 1000`) bleibt (Frage 4, entschieden); abgelöst ist nur ihr Zeitkriterium (Ablöse-Tabelle).

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen.

### Ablauf
1. **Gemeinsame Konstanten** — in der E2E-Suite zwei Konstanten `anzeigeSchrankeMs = 5000` und `einfrierSchrankeMs = 2000` an einer Stelle (`e2e/dsl/`), alle Specs und DSL-Fristen lesen sie.
2. **Specs umstellen** — je Zeile der Bauplan-Tabelle: die enge Erwartung durch die Schranke ersetzen; Annotations- und Kommentar-Texte („Grenze 1000 ms, Ziel 700 ms“) auf die Schranke ziehen; ereignisgenaue Messung unverändert.
3. **Nachweis** — Suite am Lastprofil grün; je Schranke eine Positivkontrolle mit künstlich eingebauter Verzögerung (rot über der Schranke).

### Grobentwurf (kein Produktcode)

- `e2e/dsl/schranken.js` (neu, rein) — die zwei Konstanten und (falls nötig) ein Helfer, der eine Messung gegen die Schranke prüft.
  - `anzeigeSchrankeMs = 5000`, `einfrierSchrankeMs = 2000`
- Betroffene Spec-/DSL-Dateien je Bauplan-Zeile: Frist-Konstante bzw. Erwartung auf die Schranke zeigen, alte Zahl entfernen.

### Änderungen an bestehenden Klassen
- Nur Testschicht: `e2e/tests/*.spec.js` (Zeilen des Bauplans) und `e2e/dsl/*.js` (Frist-Konstanten). Keine Änderung an `src/`.

## Tests

Nach `~/.claude/skills/test-pyramide/SKILL.md` und der ATDD-Regel des Projekts ist diese Änderung selbst **Prüfschicht**: sie stellt die Erwartungen der E2E-Specs um. Kein neuer Produktcode, deshalb keine neuen Unit-/Integrationstests am System; die Prüfung ist „Suite am Lastprofil grün“ plus die zwei Positivkontrollen der Schranken.

## Abhängigkeiten

- Abhängig von: alle Interactions, deren Specs die Bauplan-Tabelle nennt und die bereits `gruen` sind (I0005, I0006, I0008, I0014, I0016, I0017, I0022, I0025, I0026, I0027, I0031, I0033, I0034, I0035, I0036, I0037, I0038, I0044). Sie liefern die Tests, die umgestellt werden.
- Blockiert: nichts.

## Offene Fragen

Alle sechs Fragen sind entschieden (PO-Protokoll, letzte Zeile, 2026-11-26, Commit `76a789a`); die Anforderung ist umsetzungsbereit.

1. ~~**Zahlen der Schranken**: Anzeige 5 s, Einfrier 2 s, „Beenden“ 5 s, Aufruf/Start 5 s?~~ **Entschieden (PO-Protokoll, letzte Zeile):** ja, wie empfohlen — Anzeige 5 s, Einfrier 2 s, „Beenden“ 5 s, Aufruf/Start 5 s.
2. ~~**Vision angleichen?**~~ **Entschieden (PO-Protokoll, letzte Zeile):** ja, über `/vision fortschreiben`; in diesem Lauf eingearbeitet (Vision, Leitplanke „Lastprofil“, Ergänzungshistorie 2026-11-26).
3. ~~**`AI-Team/po-entscheidungen.md` Zeile 245** (Entscheidung „(a) Zeilenaufbau beschleunigen, Messwert ≤ 0,7 s bleibt“)?~~ **Entschieden (PO-Protokoll, letzte Zeile):** Zeile 245 ist durch R00047 abgelöst — **keine** Beschleunigung des Zeilenaufbaus.
4. ~~**Arbeitsfrist des Färbe-Workers** (`src/GitReviewA/web/farbschlange.js`, `FRIST_MS = 1000`, R00007 Kriterium 7: die Datei endet ungefärbt nach 1 s)?~~ **Entschieden (PO-Protokoll, letzte Zeile):** die Färbe-Frist 1 s ist als Zeitkriterium durch die 2-s-Einfrier-Schranke abgelöst (Ablöse-Tabelle unten); das Aufgeben-Budget im Produktcode (`FRIST_MS = 1000`) und sein Bausteintest bleiben.
5. ~~**„typisch ≤ 200 ms“ streichen?**~~ **Entschieden (PO-Protokoll, letzte Zeile):** als Kriterium streichen, als Messwert im Bericht behalten (Beobachtung, kein Gate).
6. ~~**Umfang der Umstellung**: nur die Specs/DSL der Bauplan-Tabelle, oder auch die Textzeilen in unabgenommenen Dokumenten?~~ **Entschieden (PO-Protokoll, letzte Zeile):** nur Specs/DSL; bestehende Anforderungen bleiben unverändert (sie werden über die Ablöse-Tabelle ersetzt, nicht editiert).

## Umfang

Gezählt: diese Anforderung ist eine **Prüfschicht-Änderung** — kein neuer Produktcode, keine neue Bubble im Produkt. Die WBS-Interaction I0048 trägt 3 Bubbles (2 Standard, 1 unklar), Richtwert 6–8 h ungemessen. Zum Maßstab: die Ist-Zeiten aus `Schaetzungen/_ist-zeiten.md` liegen bei 0,01–0,19 h je Bubble; der Richtwert ist ein Vielfaches davon.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: die Gate-Suite zwang die Zeitmessung des Zeilenaufbaus in eine Marge, die unter normalem Rechnerlast-Rauschen nicht mit Abstand hielt (Messwerte 720–780 ms gegen ein 0,7-s-Ziel), und löste deshalb Nacharbeit ohne echte Nutzerbeobachtung aus. Wenn die Prüfungen nur noch grobe Schranken gegen echte Einbrüche sind, dann hört das Wackeln auf, ohne dass eine reale Regression unentdeckt bleibt — denn eine hängende oder einfrierende Oberfläche überschreitet die Sekunden-Schranken deutlich. Der Hebel liegt bei der **Erwartung**, nicht beim Code: die ereignisgenaue Messung bleibt erhalten und misst weiter genau das, was der Nutzer erlebt; nur die Zahl, an der sie rot wird, wird grob. Eine vorgelagerte Änderung (den Zeilenaufbau beschleunigen) wäre Leistungsarbeit an einem Pfad, der im Betrieb in Ordnung ist — sie kostet Bauzeit und Risiko ohne Nutzen. Eine nachgelagerte Änderung (die Messungen abschalten) würde eine echte Regression gar nicht mehr sehen; die Schranken behalten diese Wache. Deshalb ist genau diese Änderung der Hebel: grobe Schranke statt Marge, Messung und Wache bleiben.

## Missing-Docs

- Keine.

## Notizen

### Abgelöste Kriterien (wörtlich; bestehende Anforderungen werden nicht geändert)

Diese Anforderung löst die folgenden **Zeitkriterien** ab (Anforderung:Zeile, bisherige Zahl → neue Schranke). Strukturelle Grenzen (Zeilenzahl, Zeichen, Marken, Knoten, Treffer, MiB) sind nicht betroffen.

| Anforderung:Zeile | bisherige Zahl | neue Schranke |
|---|---|---|
| R00000 (Vision):115–116 | Oberfläche ≤ 2 s, Dateiwechsel ≤ 200 ms typisch / ≤ 1 s, Beenden ≤ 1 s | 5 s Anzeige / 2 s Einfrier (Vision angeglichen 2026-11-26 über `/vision fortschreiben`, Frage 2) |
| R00002:72, 85 | „Beenden“ ≤ 1 s | 5 s Anzeige |
| R00003:39, 100 | Leiste ≤ 2 s, Dateiliste ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00004:45, 106 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00006:42, 104 | ≤ 2 s, ≥ 30 % Abstand | 5 s Anzeige |
| R00007:62, 111, 156 | ≤ 1 s, Long Task ≤ 150 ms, Messwert ≤ 0,7 s | 5 s Anzeige / 2 s Einfrier |
| R00007:105 (Kriterium 7, Färbe-Frist) | „die Datei endet ungefärbt (die Frist von 1 s ist verstrichen)“ | 2 s Einfrier (die 1 s liegen darunter; das Aufgeben-Budget `FRIST_MS = 1000` und sein Bausteintest bleiben — kein Produktverhalten geändert) |
| R00008:36, 69, 70, 99 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00010:48, 85 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00011:71, 103 | ≤ 2 s / ≤ 1 s, Messwerte ≤ 1,4 s / ≤ 0,7 s | 5 s Anzeige |
| R00012:41, 79 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00014:56 | verweist auf R00011/R00010 | 5 s Anzeige |
| R00015:36, 67 | ≤ 2 s / ≤ 1 s, Messwerte ≤ 1,4 s / ≤ 0,7 s | 5 s Anzeige |
| R00017:33, 39, 51, 62 | ≤ 1 s, Messwert ≤ 0,7 s, Long Task ≤ 150 ms | 5 s Anzeige / 2 s Einfrier |
| R00018:39, R00019:39, R00022:39 | verweisen auf R00010/R00002 | 5 s Anzeige |
| R00023:44, 97 | ≤ 1 s, Messwert ≤ 0,7 s, Long Task ≤ 150 ms | 5 s Anzeige / 2 s Einfrier |
| R00024:39, 95 | ≈ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00025:35, 61 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00026:39, 106 | verweist auf R00008 | 5 s Anzeige |
| R00027:39, 66 | ≤ 1 s, Messwert ≤ 0,7 s, Long Task ≤ 150 ms | 5 s Anzeige / 2 s Einfrier |
| R00028:42, R00029:41, R00030:38 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00031:42 | verweist auf R00010/R00002 | 5 s Anzeige |
| R00032:45, 68, 98 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00033:37 | ≤ 200 ms typisch, ≤ 1 s | 5 s Anzeige |
| R00034:38 | Long Task ≤ 150 ms | 2 s Einfrier |
| R00035:39 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00036:37 | ≤ 1 s | 5 s Anzeige |
| R00037:40, 56 | ≤ 1 s, Messwert ≤ 0,7 s | 5 s Anzeige |
| R00040:40 | ≤ 200 ms typisch, ≤ 1 s | 5 s Anzeige |
| R00041:37, 51 | ≤ 1 s, Messwert ≤ 0,7 s | Abschlussdialog bei 2 000 Dateien 15 s (PO Zeile 273); „Beenden“ bis Ausgabe 5 s |
| R00042:37, 51 | Long Task ≤ 150 ms | 2 s Einfrier |
| R00043:45 | ≤ 2 s / ≤ 1 s | 5 s Anzeige |
| R00044:36 | Long Task ≤ 150 ms, ≤ 1 s | 2 s Einfrier / 5 s Anzeige |
| R00045:34 | ≤ 2 s, ≤ 200 ms typisch, ≤ 1 s | 5 s Anzeige |

> **Ausnahme (PO Zeile 273, 2026-11-26):** der Abschlussdialog aus [R00041](R00041-abschlussschritt-vor-beenden.md) (Kriterium 6, 2 000 Dateien) steht erst innerhalb **15 s** — die Einzelprobe lag bei etwa 1 s, unter Last bei etwa 5 s. Das ist die einzige dritte Zahl neben Anzeige-Schranke und Einfrier-Schranke; sie fängt einen echten Einbruch weiterhin und setzt keine engen Ziele (Entscheidung des Betreibers: keine harten Performance-Ziele).

### Spec-Bauplan (für den `entwickler`)

Jede Zeile: Datei:Zeile, bisherige Schwelle, neue Schranke. „(Test)“ = Testname/Beschreibung, der/die die Zahl nennt. Die Messung bleibt ereignisgenau.

| Datei:Zeile | bisher | neu |
|---|---|---|
| `e2e/tests/umbruch-standardmaessig-an.spec.js:165` (Test :159) | `expect(dauerMs ≤ 700)` | `≤ anzeigeSchrankeMs` |
| `e2e/tests/diff-einer-datei-lesen.spec.js:326` (`alsTextBleibtBedienbar(…, 1000)`), :312–317, :322, :328 | Frist 1000 ms, Aufschrift „Grenze 1000 ms, Ziel 700 ms“ | `anzeigeSchrankeMs` |
| `e2e/tests/grosse-diffs.spec.js:10` (`ZEILE_FRIST_MS = 1000`), :50–54, :101, :109, :111 | 1000 ms; `> 150 → []` | `anzeigeSchrankeMs`; `> einfrierSchrankeMs → []` |
| `e2e/tests/syntaxhervorhebung.spec.js:235`, :250, :296, :303 | `> 150 → []`; (:296 dauer ohne Assert) | `> einfrierSchrankeMs → []`; dauer gegen `anzeigeSchrankeMs` |
| `e2e/tests/im-diff-suchen.spec.js:232`, :268, :269, :444, :447, :448, :459, :462, :463 | `≤ 1000`, `≤ 150`, Aufschrift „Grenze 1000, Ziel 700“ | `≤ anzeigeSchrankeMs`, `≤ einfrierSchrankeMs` |
| `e2e/tests/zeile-annotieren.spec.js:231` (via DSL, s. u.) | Frist 1000 ms, Long Task 150 ms | `anzeigeSchrankeMs`, `einfrierSchrankeMs` |
| `e2e/tests/nebeneinander-weitere.spec.js:213` (`paarBinnen(…, 1000)`), :214 | Frist 1000 ms | `anzeigeSchrankeMs` |
| `e2e/tests/ergebnis-lastprofil.spec.js:8`, :35, :37 | `≤ 1000` | `≤ anzeigeSchrankeMs` |
| `e2e/tests/abgehakte-ausblenden.spec.js:201`, :212, :214 | `≤ 1000` | `≤ anzeigeSchrankeMs` |
| `e2e/tests/dateien-ausblenden.spec.js:122`, :140, :146, :148 | `≤ 1000` | `≤ anzeigeSchrankeMs` |
| `e2e/tests/datei-abhaken-programm.spec.js:122`, :137 | `≤ 1000` | `≤ anzeigeSchrankeMs` |
| `e2e/tests/beenden.spec.js:6` (`BEENDEN_FRIST_MS = 1000`), :108, :129 | 1000 ms | `anzeigeSchrankeMs` |
| `e2e/tests/einklappen-erhalt.spec.js:9` (`FRIST_MS = 700`), :58, :74, :75 | 700 ms; Vergleichsfaktor 0.7 bleibt strukturell | `anzeigeSchrankeMs`; Faktor 0.7 = Positivkontrolle, bleibt |
| `e2e/dsl/diff-lesen.js:15` (`ZEILE_FRIST_MS = 1000`), :119, :121, :203, :204, :244 | 1000 ms | `anzeigeSchrankeMs` |
| `e2e/dsl/faerbung.js:13` (`ZEILE_FRIST_MS = 1000`), :139 | 1000 ms | `anzeigeSchrankeMs` |
| `e2e/dsl/zeile-annotieren.js:14` (`LADEFRIST_MS = 1000`), :16 (`BEDIENBAR_FRIST_MS = 150`), :17 (`KLICK_FRIST_MS = 1000`), :347, :352 | 1000/150/1000 ms | `anzeigeSchrankeMs`/`einfrierSchrankeMs`/`anzeigeSchrankeMs` |
| `e2e/dsl/commits-und-dateien.js:8` (`LEISTE_FRIST_MS = 2000`), :10 (`DATEILISTE_FRIST_MS = 1000`), :129, :131 | 2000/1000 ms | `anzeigeSchrankeMs` |
| `e2e/dsl/datei-abhaken.js:17` (`START_FRIST_MS = 2000`), :181 | 2000/1000 ms | `anzeigeSchrankeMs` |
| `e2e/dsl/auswahl.js:11` (`STARTZEILE_FRIST_MS = 2000`) | 2000 ms | `anzeigeSchrankeMs` |
| `e2e/dsl/gitreviewa.js:17` (`STARTZEILE_FRIST_MS = 2000`), :128 (`aufEndeWarten` default 5000) | 2000 ms | `anzeigeSchrankeMs` (Beenden-Default 5000 bleibt) |
| `e2e/dsl/veroeffentlichung.js:7` (`STARTZEILE_FRIST_MS = 5000`) | 5000 ms | unverändert (schon Schranke) |

Nicht betroffen (kein Zeitkriterium): Knoten-/Zeilen-/Zeichen-/Treffer-Grenzen in `e2e/tests/bausteine/diff-werte.spec.js:100`, `suche-werte.spec.js:72`, `farbe-werte.spec.js:46`; die Positivkontrolle `einklappen-erhalt.spec.js:75` (Faktor 0,7 gegen eine verzögerte Quelle).

Die Arbeitsfrist des Färbe-Workers (`src/GitReviewA/web/farbschlange.js:8`, `FRIST_MS = 1000`, R00007 Kriterium 7) ist dagegen ein Zeitkriterium und steht seit der Entscheidung zu Frage 4 in der Ablöse-Tabelle (2 s Einfrier); Produktcode und Bausteintest bleiben.

### Verworfene Alternativen
- **Optimiere den Zeilenaufbau (Betriebs-Commit f4614d1)**: verworfen mit der Karte #57 — es ist Leistungsarbeit an einem im Betrieb unauffälligen Pfad; der Betreiber hat harte Performance-Bedingungen abgelehnt.
- **Messgröße unter Normallast fassen (Last < 4)**: verworfen als Abschwächung — es streicht den Abstand gerade dort, wo er nötig wäre; die grobe Schranke ist die einfachere, ehrlichere Antwort.
- **Messungen abschalten**: verworfen — dann sähe die Suite einen echten Einbruch nicht mehr. Die Schranken behalten die Wache.
- **Nur die 0,7-s-Zahl erhöhen (etwa auf 1 s), Marge behalten**: verworfen — der Betreiber will keine engen Margen; eine neue enge Zahl wäre derselbe Fehler.
- **Schranken je Interaction unterschiedlich**: verworfen — zwei Zahlen an einer Stelle sind einfacher zu halten und zu lesen als viele.
