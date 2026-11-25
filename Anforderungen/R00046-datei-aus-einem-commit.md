---
id: R00046
status: Neu
datum: 2026-11-25
---

# R00046: Datei aus einem Commit (Dateiansicht)

## Beschreibung

Eine Angabe der Form `<commit>:<pfad>` zeigt den Stand einer Datei in einem Commit — etwa `gitreviewA --dateien 3f2a9c1:sql/001.sql` —, mit allem, was die Dateiansicht für Dateien vom Datenträger kann ([R00043](R00043-datei-ansehen-und-kopieren.md), [R00044](R00044-stelle-suchen-und-bereich-kopieren.md)). Der neue Lesepfad über `git` läuft über `GitStart`, mit Ausgabegrenze und Namensprüfung an der Aufrufstelle (Lehre #10). Unbekannter Commit, unbekannter Pfad, Verzeichnis, Link, Submodul, ein Name mit Zeilenumbruch oder kein Repository: Grund auf stderr, Exit 2, kein Server.

Zahlt ein auf: [Vision](R00000-vision.md) — „Einzelne Dateien ansehen und kopieren“ („der Stand in einem Commit über `<commit>:<pfad>`“) und Leitplanke „Git über die `git`-Kommandozeile … gilt für Diffs und `<commit>:<pfad>`“.

Entschieden vom product-owner (`AI-Team/po-entscheidungen.md`, Zeile 200): `<commit>:<pfad>` neben Dateien vom Datenträger.

### Domänenbezug

Kein Glossar. „Commitquelle“: eine Angabe `<commit>:<pfad>`.

## Geschäftlicher Nutzen

Die KI hat die Migration schon committet und schreibt weiter; der Arbeitsbaum ist inzwischen anders. Ausgeführt werden soll der Stand, der im Commit steht — genau der, den der Mensch im Review gesehen hat. Mit `<commit>:<pfad>` liest gitreviewA diesen Stand aus git, ohne Checkout, und der Mensch kopiert ihn wie eine Datei.

## Funktionale Anforderungen

- **Erkennen** (Pflichtpunkt 5, die eine Stelle): eine Angabe ist eine Commitquelle, wenn vor dem ersten `:` 4–64 Hexziffern stehen (dieselbe Form wie im Review-Aufruf, R00001) und dahinter ein nicht leerer Pfad; sonst ist sie ein Pfad auf dem Datenträger. `./` vorn erzwingt den Datenträger (`./cafe:x.sql`). Lesen, Anzeigename, Kopf und Startgründe fragen nur diese Unterscheidung. Namen wie `HEAD` oder Zweige sind hier keine Commits (wie im Review; offene Frage 1).
- **Pfad**: wie bei git relativ zur Wurzel des Repositories (`<c>:sql/a.sql`); `<c>:./a.sql` relativ zum Startordner. Der Pfad wird wörtlich genommen (keine Pathspec-Magie).
- **Namensprüfung**: ein Pfad mit LF oder CR → „Name nicht übergebbar“ (Wortlaut wie R00014), ohne git zu starten. Unsichtbare und richtungsändernde Zeichen sind erlaubt und erscheinen als Marke.
- **Auflösen**: der Commit wird über `GitStart` aufgelöst und der gelieferte volle Hash gegen die Eingabe geprüft (ein Tag, der wie das Präfix heißt, lenkt nie still um — Meldung wie `HashpraefixPruefer`, Lehre #2). Der Eintrag des Pfads im Commit bestimmt die Art: Datei oder ausführbare Datei → lesen; „ist im Commit ein Verzeichnis“, „ist im Commit ein symbolischer Link“, „ist im Commit ein Submodul“, „Pfad im Commit nicht gefunden“, „Commit nicht gefunden“; Größe über 8 MiB → „zu groß (über 8 MiB)“ vor dem Lesen.
- **Lesen**: der Inhalt kommt über den bestehenden Blob-Leser (`GitLeser`, `git cat-file blob` mit `Ausgabegrenze.Standard`, ganz oder gar nicht) und wird wie eine Datei vom Datenträger eingeordnet (Binär, BOM, UTF-16, UTF-8 — Gründe aus R00043). Kein Textconv, kein Filter: gezeigt werden die Bytes im Commit.
- **Anzeige**: Anzeigename `<Kurzhash 7>:<pfad>`; der Kopf nennt den vollen Hash statt des echten Pfads, sonst wie R00043. Kopieren, Bereich und Suche unverändert.
- **Repository**: nur Commitquellen brauchen eins; ohne Repository oder ohne `git` → Exit 2 mit dem Wortlaut aus R00016. Dateien vom Datenträger im selben Aufruf starten weiter kein git.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): Hash 4–64 Hexziffern; Pfad nicht leer, ohne LF/CR; je Datei 8 MiB vor und beim Lesen (Ausgabegrenze an der Aufrufstelle, Lehre #10); Anzahl und Summe wie R00045.
- **Sicherheit**: jeder neue git-Aufruf über `GitStart` (kein Programmstart aus fremder Konfiguration, keine Ersatzrefs, kein Lazy-Fetch); Marker-Probe je Aufruf (Lehren #1, #28); Start aus einem Unterordner (Lehre #6); Ausgabegrenze und Namensprüfung je Aufrufstelle (Lehre #10).
- **Performance**: Auflösen und Lesen einer Commitquelle ≤ 1 s bis 8 MiB.
- **Logging** (Pflichtpunkt 4): Startgründe auf stderr; roher git-Text nur mit `--verbose` als Debug-Zeile (wie R00016).

## Akzeptanzkriterien

Vorbereitung: **Repo C** (Skript in `user-stories/R00046.md`): Commit `c1` mit `sql/a.sql`, `sql/gross.bin` (Null-Byte), Ordner `sql/alt/`, Link `link.sql` → `/etc/hostname`, Submodul-Eintrag `sub`, `x⟨U+202E⟩.sql`; Commit `c2` ändert `sql/a.sql`; Arbeitsbaum danach noch einmal geändert (nicht committet). Aufruf `gitreviewA --dateien … --kein-browser` im Repo.

- [ ] 1. Gegeben Repo C, wenn man `--dateien <c1>:sql/a.sql` startet, dann zeigt die Ansicht den Stand aus `c1` (nicht `c2`, nicht den Arbeitsbaum), der Anzeigename ist `<c1 kurz>:sql/a.sql`, der Kopf nennt den vollen Hash, und „Datei kopieren“ legt genau die Bytes aus `git cat-file blob <c1>:sql/a.sql` ab. *Ebene: Integration gegen den Interactor (Text) und Playwright (Kopf, Kopieren).*
- [ ] 2. Gegeben Repo C, wenn man je Zeile der Tabelle startet, dann gilt „Ergebnis“, jeweils stdout 0 Bytes; bei Exit 2 genau eine `FEHLER [Dateiansicht]`-Zeile je fehlerhafter Angabe. Abgetastet wird die ganze Tabelle. *Ebene: Integration gegen den Interactor.*

| Angabe (Angriffsmatrix, Teil Commit) | Ergebnis |
|---|---|
| `<c1>:sql/fehlt.sql` / `deadbeef:sql/a.sql` | Exit 2, „Pfad im Commit nicht gefunden“ / „Commit nicht gefunden“ |
| `<c1>:sql/alt` / `<c1>:link.sql` / `<c1>:sub` | Exit 2, „ist im Commit ein Verzeichnis“ / „… ein symbolischer Link“ / „… ein Submodul“ |
| `<c1>:sql/gross.bin` | Exit 2, „Binärdatei — enthält Null-Bytes“ |
| `<c1>:sql/a⏎b.sql` (LF), `<c1>:sql/a⏎.sql` (CR) | Exit 2, „Name nicht übergebbar“, kein git-Aufruf |
| `<c1>:` (leerer Pfad) | Datenträgerpfad `<c1>:` → „Datei nicht gefunden“ |
| `<c1>:x⟨U+202E⟩.sql` | zeigbar, Name mit Marke im Kopf und in der Liste |
| `./<c1>:sql/a.sql` | Datenträger → „Datei nicht gefunden“ |
| Präfix `<p>` von `c2`, Tag `<p>` zeigt auf `c1` | Exit 2, Meldung „mehrdeutig … vollen Hash angeben“, nie der Inhalt aus `c1` |
| `refs/replace` ersetzt `c1` durch einen anderen Commit | gezeigt wird der Inhalt des echten `c1` |
| Ordner ohne Repository, `<c1>:sql/a.sql` | Exit 2, Meldung „Kein Git-Repository …“ (R00016) |

- [ ] 3. Gegeben Repo C mit `.gitattributes` `*.sql diff=m filter=m`, Konfiguration `diff.m.textconv`, `filter.m.smudge`, `core.fsmonitor`, `log.showSignature` + `gpg.program` und ein Partial-Clone mit `remote.origin.uploadpack`, die je eine Markerdatei schreiben, wenn man `--dateien <c1>:sql/a.sql` startet und die Datei kopiert, dann ist keine Markerdatei entstanden und der Inhalt ist der Blob ohne Umwandlung. *Ebene: Integration (Marker-Probe, Lehren #1, #28).*
- [ ] 4. Gegeben die Ausgabegrenze über einen internen Parameter auf 16 Bytes gesetzt und `sql/a.sql` mit 40 Bytes, wenn man die Commitquelle liest, dann ist das Ergebnis „zu groß“ ohne gekürzten Inhalt (ganz oder gar nicht); dasselbe, wenn der Eintrag eine falsche Größe meldete, greift die Grenze beim Lesen. *Ebene: Integration (kleine Grenze, Lehre #10).*
- [ ] 5. Gegeben Repo C und der Start im Unterordner `sql/`, wenn man `<c1>:sql/a.sql` und `<c1>:./a.sql` startet, dann zeigen beide `sql/a.sql` aus `c1`; `<c1>:a.sql` ergibt „Pfad im Commit nicht gefunden“. *Ebene: Integration (Lehre #6).*
- [ ] 6. Gegeben `--dateien a.sql <c1>:sql/a.sql` (Datenträger und Commit gemischt, mit R00045), dann stehen beide in Aufrufreihenfolge in der Liste, und ein Wechsel zwischen ihnen zeigt die zwei Stände. *Ebene: Integration (Liste).*

Grenz- und Leerfälle bedacht: Hash mit 4 und 64 Ziffern sowie 3 und 65 (Unit beim Bauen: 3/65 sind Datenträgerpfade), leerer Pfad (2), Größe genau 8 MiB (wie R00043), Merge- und Wurzelcommit (derselbe Weg, ein Test beim Bauen). Verworfen: Namen wie `HEAD:pfad` (offene Frage 1).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 2, 4 (Hashform, Pfad, 8 MiB an der Aufrufstelle); 2 Anzeigeverfahren — nicht betroffen über R00043 hinaus (dieselbe Ansicht, Kopf mit Hash, Kriterium 1); 3 festes Layout — nicht betroffen (Kopf wie R00043, voller Hash statt Pfad in derselben Zeile); 4 Ausführungsort — Startgründe stderr, git-Rohtext nur Debug; 5 eine Stelle — das Erkennen der Quellenart (Kriterium 2, Zeilen „leerer Pfad“ und `./`; Lesen, Anzeigename, Kopf, Gründe fragen nur sie).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Dateiansicht/` — Quellenart, Commitquelle, Leser aus dem Commit.
- `src/GitReviewA/Git/GitLeser.cs` — Eintrag im Commit (neuer Aufruf), Blob lesen (bestehend).
- `tests/GitReviewA.Tests/Dateiansicht/` — Wegwerf-Repo C, Marker-Proben.

## Technische Überlegungen

**Vorplanung** — Bubbles B4261–B4264 unter I0047.

### Ablauf

1. Angabe → Quellenart (B4261): Commitquelle oder Datenträger; LF/CR → Grund.
2. Commit auflösen, vollen Hash prüfen, Eintrag lesen (`git ls-tree -l <H> -- <pfad>` über `GitStart`, wörtliche Pfade) → Art und Größe (B4262).
3. Blob lesen mit Ausgabegrenze → Einordnen aus R00043 (B4263).

### Grobentwurf

- `Quellenart` (Operation, rein) — `Quelle Erkenne(string angabe)` → `Commitquelle(Hash, Pfad)` oder `Datentraegerquelle(Pfad)` oder `Quellengrund`.
- `ICommitDateiquelle` / `GitCommitDateiquelle` (Ressourcenzugriff) — `Commiteintrag Eintrag(Commitquelle quelle)`, `Blobinhalt Lies(string vollerHash, string pfad, Ausgabegrenze grenze)`.

### Änderungen an bestehenden Klassen

`GitLeser` (Eintrag im Commit), `DateiansichtStartInteractor` (zwei Quellenarten), `HashpraefixPruefer` (wiederverwendet).

## Tests

**Unit:** Quellenart (Hashlängen 3/4/64/65, `./`, leerer Pfad, LF/CR, Doppelpunkt im Pfad).
**Integration:** Tabelle (Kriterium 2), Marker-Proben (3), kleine Grenze (4), Unterordner (5), gemischte Liste (6).
**E2E:** Kopf und Kopieren einer Commitquelle (Kriterium 1, ein Test).

## Abhängigkeiten

- Abhängig von: I0044 Eine Datei ansehen und ganz kopieren (R00043, rot).
- Blockiert: nichts. Kriterium 6 braucht zusätzlich I0046 (R00045); ohne sie fällt es auf eine Angabe zurück.

## Offene Fragen

An den product-owner; bis zur Antwort gilt die Empfehlung.

1. **Namen statt Hash** (`HEAD:pfad`, `main:pfad`): nicht jetzt (Empfehlung: wie im Review nur Hexhashes; Namen gemeinsam mit der offenen Frage zu Zweig- und Tag-Namen aus R00006 entscheiden).
2. **`git cat-file blob` statt `git show`**: der PO nennt `git show`. Empfehlung: den bestehenden, gehärteten Blob-Leser (`git cat-file blob`, Ausgabegrenze, auch für Namen mit Rohbytes) nehmen — er liefert die Bytes des Commits und kennt kein Textconv; `git show` brächte einen zweiten Lesepfad mit eigener Härtung (Lehre #10). Beides liest über die git-Kommandozeile (Leitplanke).
3. **Pfad relativ zur Wurzel** (git-Regel, `./` für den Startordner): Empfehlung so — die KI kennt die Form aus `git show`.

## Manuelle Vorbereitungstätigkeiten

- security-reviewer prüft die Angriffsmatrix (Kriterien 2–4) vor dem Bau (Empfehlung an den Director).

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 4 Bubbles unterhalb I0047 (B4261–B4264), 2 klar (2 h), 2 unklar (2–4 h) — 8–12 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Ausgeführt werden soll oft der geprüfte Stand, nicht der Arbeitsbaum, den die KI schon weiterschreibt. Wenn gitreviewA `<commit>:<pfad>` über denselben gehärteten Blob-Leser wie die Bilder liest, dann sieht und kopiert der Mensch genau die Bytes, die im Commit stehen, ohne Checkout und ohne dass fremde Konfiguration ein Programm startet oder einen anderen Inhalt unterschiebt. Der Hebel ist die Aufrufstelle: Ausgabegrenze, Namensprüfung und Hashprüfung sitzen dort, wo der neue Pfad git aufruft — dort, wo sie nach Lehre #10 fehlten.

## Missing-Docs

- `git ls-tree -l` bei Namen mit unsichtbaren Zeichen und `--literal-pathspecs`: Ausgabeform mit `-z` vor dem Bau proben.

## Notizen

### Verworfene Alternativen

- Commitquelle an jedem `:` erkennen: verworfen — `C:\x.sql` oder `a:b.sql` auf dem Datenträger würden zu Commits.
- Inhalt mit Textconv oder Filtern zeigen: verworfen — gezeigt wird, was im Commit steht, und Treiber starten Programme.
