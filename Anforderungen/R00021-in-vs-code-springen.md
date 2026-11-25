---
id: R00021
status: Neu
datum: 2026-11-25
---

# R00021: In VS Code springen

## Beschreibung

Der prüfende Mensch öffnet jede Stelle des gezeigten Diffs per Klick in VS Code: jede Zeile mit einer Nummer **neu** — in „nur Änderungen“ auch jeder Abschnittskopf — führt auf `vscode://file/<absoluter Pfad>:<Zeile neu>`, und ein Verweis „In VS Code“ im Diff-Kopf öffnet die gerade gewählte Zeile. Ist die Datei seit dem Commit im Arbeitsbaum geändert, sagt der Diff-Kopf das; fehlt sie dort oder lässt sich ihr Name nicht sicher übergeben, gibt es keinen Link, und der Kopf nennt den Grund.

Zahlt ein auf: [Vision](R00000-vision.md) — „Sprung in den Editor“ („jede Stelle öffnet sich per Klick in VS Code, mit Hinweis, wenn die Datei sich seit dem Commit geändert hat“).

Baut auf [R00004](R00004-diff-einer-datei-lesen.md) auf (Diff-Bereich, Zeilen mit `data-art`/`data-alt`/`data-neu`, Diff-Kopf, Ansicht „nur Änderungen“) und auf [R00008](R00008-ganze-datei-mit-diff.md) (Ansicht „ganze Datei“); beide Ansichten tragen dieselben **Zeilen**links; der Abschnittskopf-Link gilt in der Ansicht, die Abschnittsköpfe zeigt. Der Vergleichsstand ist der Commit, dessen Stand der Diff zeigt — in „Einzeln“ der gewählte Commit; in „Zusammen“ der zuständige Commit der Datei ([R00015](R00015-zusammen-logik-und-server.md), [R00012](R00012-oberflaeche-liste-detail-zusammen.md)). Die Rohbytes der Namen kommen aus [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md), die Sperre für Namen, die sich nicht sicher übergeben lassen, folgt derselben Linie wie [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md).

**Herkunft:** Wunsch des Betreibers in der Vision („Sprung in den Editor“). Der Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`) zeigt den Verweis „In VS Code“ im Diff-Kopf (`.diff-kopf .rechts`, Symbol `#i-extern`, Taste `o`); die Taste selbst gehört zu I0015. Vorlage im Code: kanbanD `web/review-uebersicht.js` (`vscodeLink`, `teileKodiert`, `sprungZeile`, `linkErlaubt`) — übernommen wird die Rechnung, nicht die HTML-Erzeugung.

## Geschäftlicher Nutzen

Wer eine Stelle prüfen oder weiterlesen will, muss heute den Pfad aus der Dateiliste und die Zeile aus dem Diff abtippen und beides im Editor zusammensetzen. Mit dem Link ist die Stelle ein Klick: der Mensch landet dort, wo sein Editorwerkzeug anfängt (Springen zur Definition, Suche, Historie). Der Hinweis sagt ihm, wenn die Zeilennummern seit dem Commit verrutscht sind, statt ihn in die falsche Zeile zu schicken. Und weil das geprüfte Repository fremd ist, darf gitreviewA aus dessen Namen keinen Link auf ein Ziel außerhalb der Wurzel, auf eine doppeldeutige Datei oder auf einen Namen mit unsichtbaren Zeichen bauen — sonst führte der sichtbare Pfad in die Irre.

## Funktionale Anforderungen

- **Sprungziel je Stelle**: jede Diff-Zeile mit einer Nummer **neu** trägt einen Link auf `vscode://file/<absoluter Pfad>:<Zeile neu>`; jeder Abschnittskopf (`@@ …`) trägt einen Link auf die erste Zeile der neuen Seite seines Abschnitts. Entfernte Zeilen (keine Nummer neu) und die Hinweiszeile `\ No newline at end of file` tragen keinen Link. Beide Ansichten (R00004, R00008) tragen dieselben **Zeilen**links; der Abschnittskopf-Link gilt in der Ansicht, die Abschnittsköpfe zeigt.
- **Absoluter Pfad**: der Link nennt den Pfad absolut aus der Repositorywurzel (`git rev-parse --show-toplevel`), je Pfadteil prozent-kodiert (`encodeURIComponent`, die Trenner `/` bleiben unkodiert); das Schema ist immer `vscode://file`. Bei einer Umbenennung gilt der neue Pfad (der Stand nach dem Commit), wie in der Dateiliste.
- **Verweis im Diff-Kopf**: der Verweis „In VS Code“ öffnet die gewählte Zeile; ist keine Zeile gewählt, die erste Zeile mit Nummer neu der gezeigten Ansicht.
- **Hinweis**: weicht der Arbeitsbaum vom Commit ab (die Datei ist geändert), steht im Diff-Kopf „Datei seit dem Commit geändert“ als Text; sonst fehlt der Hinweis. Der Link bleibt in beiden Fällen bestehen.
- **Kein Link**: es gibt keinen Link, und der Diff-Kopf nennt den Grund als Text, wenn
  - die Datei im Arbeitsbaum fehlt (auch im Commit gelöscht, Status `D`),
  - ihr Name ein Byte außerhalb von UTF-8 trägt (R00013) oder ein Zeichen aus der Klasse `Fremdtext/UnsichtbareZeichen` (Steuerzeichen außer Tab, Formatzeichen wie U+202E, Zeilen-/Absatztrenner) — bei einer Umbenennung der neue **oder** der alte Name; sonst täuschte der sichtbare Pfad über das Ziel,
  - mehrere Dateien des Commits denselben Anzeigenamen tragen (R00013/R00014), oder
  - der Pfad die Repositorywurzel verlässt (`..`-Bestandteil oder ein Symlink, dessen Ziel außerhalb der Wurzel liegt).
- **Laden**: das Sprungziel einer Datei wird bei ihrer Auswahl einmal angefragt, nie vorab; eine späte Antwort einer früheren Wahl (Commit, Pfad) wird verworfen. Ohne gewählte Datei gibt es keinen Link.
- **Zustände**: der Link ist auch im Fehlerzustand des Diffs (`Diff konnte nicht gelesen werden`) und bei einer Binärdatei vorhanden, solange die Datei im Arbeitsbaum liegt und der Name übergebbar ist; er hängt an der Datei, nicht am gezeigten Patch.

## Nicht-funktionale Anforderungen

- **Performance**: kein eigenes Zeitkriterium. Die Sprunganfrage läuft bei der Auswahl der Datei und kostet je Datei höchstens einen `git`-Aufruf (`git diff --quiet`); die Leitplanken der Vision (Dateiwechsel ≤ 1 s an der Obergrenze) bleiben die Grenze.
- **Sicherheit** (Wissen „Sicherheit“, `AI-Team/gelerntes.md`): das geprüfte Repository ist fremd. Der Pfad der Anfrage erreicht `git` nur, wenn er **genau** (Groß-/Kleinschreibung beachtet) in der Dateiliste des Commits steht, der Commit nur aus der Aufrufmenge (voller Hash). Ein Name mit Rohbytes, Zeilenende oder unsichtbarem Zeichen wird gar nicht erst zu einem Link und geht **nie** als Argument an `git`. Der neue `git`-Aufruf erbt die Schutzmaßnahmen der übrigen Lesepfade **an der Aufrufstelle** (Lehre #10: neue Lesepfade erben sie nicht): `GitStart` mit Argumentliste (nie über eine Shell), `--no-ext-diff --no-textconv --ignore-submodules=none`, `--literal-pathspecs`, `--end-of-options`, Ausgabegrenze; kein `diff.external`/`textconv`/`command` startet ein Programm, kein `core.fsmonitor`, kein Lazy-Fetch. Das Linkziel ist eine Zeichenkette aus einem festen Schema und dem prozent-kodierten Pfad; ein `javascript:`-Ziel ist damit ausgeschlossen. Namen erscheinen auf stderr nur als Länge oder mit Marken (`UnsichtbareZeichen`, dieselbe Klasse wie R00011/R00014).
- **Logging**: stdout bleibt leer; je Anfrage eine Debug-Zeile auf stderr (`GET /api/commits/<voller Hash>/sprung`, Kontext Datei), Fehler beim Lesen als Error mit Commit und Pfad.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und dem Entwurf Fassung 2, keine eigenen Vorgaben; der Verweis ist per Tastatur erreichbar (Tab) und trägt einen Namen, der mit dem sichtbaren Text beginnt; der Grund steht als Text, nie nur als Farbe oder Symbol.

## Akzeptanzkriterien

Vorbereitung (herstellbar mit `git` allein, Wegwerf-Ordner, nie das Projekt-Repo; Linux; Skript in `user-stories/R00021.md`): **Repo S** im Wegwerf-Ordner, `maintenance.auto=false` und `gc.auto=0`. Commit `s1` „Start“ legt an: `README.md` (`Zeile eins`, `Zeile zwei`), `src/a.txt` (`a1`, `a2`, `a3`), `Ordner mit Leerzeichen/datei#1.txt` (`x`, `y`), `prozent%25.txt` (`z`), `weg.txt` (`w1`, `w2`). Commit `s2` „Ändern“ ändert in `src/a.txt` `a2` zu `A2` und hängt `a4` an, löscht `README.md` und hängt in `weg.txt` `w3` an. Der Aufruf ist `gitreviewA s1 s2 --kein-browser`, Seite über die Startzeile, Fenster 1280 × 800; wo nichts anderes steht, ist `s2` gewählt und eine Wahl heißt Klick in der Dateiliste bzw. in der Commit-Leiste. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Integration“ heißt NUnit gegen `SprungInteractor` und Endpunkt mit echtem `git`, „Playwright“ heißt die Prüfung des Attributs `href` im Browser (kein echter Start von VS Code).

### Sprungziel je Stelle
- [ ] Gegeben `s2` gewählt und `src/a.txt` angezeigt (Kopf `@@ -1,3 +1,4 @@`, Zeilen `a1` (1/1), `−a2` (alt 2), `+A2` (neu 2), `a3` (3/3), `+a4` (neu 4)), wenn man die Zeilen ansieht, dann trägt `a1` den Link `vscode://file/<Wurzel>/src/a.txt:1`, `+A2` `…:2`, `a3` `…:3`, `+a4` `…:4` und der Abschnittskopf `…:1`; `−a2` trägt keinen Link. Rechnung: die Nummer neu der Zeilen ist 1, 2, 3, 4; die entfernte Zeile hat keine. `<Wurzel>` ist der absolute Pfad aus `git rev-parse --show-toplevel`. *Ebene: Integration (Ziel je Stelle) und Playwright (das Attribut `href` im Browser).*
- [ ] Gegeben `s2` gewählt und `src/a.txt` in der Ansicht „ganze Datei“ (R00008) angezeigt, dann tragen dieselben Zeilen dieselben Links (`a1` `…:1`, `+A2` `…:2`, `a3` `…:3`, `+a4` `…:4`); die Ansicht zeigt keine Abschnittsköpfe (R00008) und ändert die Links nicht. *Ebene: Integration und Playwright.*
- [ ] Gegeben `s2` gewählt und `weg.txt` (`w1`, `w2`, `+w3`) angezeigt, dann trägt `+w3` den Link `…/weg.txt:3` und `w2` `…/weg.txt:2`. *Ebene: Integration.*
- [ ] Gegeben ein Commit, dessen Datei einen Hunk mit einer Hinweiszeile `\ No newline at end of file` zeigt, dann trägt die Hinweiszeile keinen Link, die Zeilen davor und danach tragen ihren. *Ebene: Integration.*
- [ ] Gegeben `s1` gewählt und `Ordner mit Leerzeichen/datei#1.txt` angezeigt, dann lautet der Link der Zeile 1 `vscode://file/<Wurzel>/Ordner%20mit%20Leerzeichen/datei%231.txt:1` (Leerzeichen `%20`, `#` `%23`, die Trenner `/` bleiben unkodiert); gegeben `prozent%25.txt`, dann lautet er `vscode://file/<Wurzel>/prozent%2525.txt:1` (`%` `%25`). *Ebene: Unit (Kodierung) und Integration (Ziel).*
- [ ] Gegeben `s2` gewählt und `src/a.txt` angezeigt, wenn man die Zeile `+a4` wählt und den Verweis „In VS Code“ im Diff-Kopf ansieht, dann nennt er `vscode://file/<Wurzel>/src/a.txt:4`; ohne gewählte Zeile nennt er `…:1` (die erste Zeile mit Nummer neu). *Ebene: Playwright (gewählte Zeile und Verweis; das Ziel wird als Attribut gelesen, nicht geöffnet).*

### Hinweis und fehlende Datei
- [ ] Gegeben `s2` gewählt und `weg.txt` im Arbeitsbaum unverändert, wenn der Diff angezeigt wird, dann steht im Diff-Kopf kein Hinweis „seit dem Commit geändert“ und der Verweis „In VS Code“ ist da. *Ebene: Integration (Zustand) und Playwright (Text).*
- [ ] Gegeben `s2` gewählt und `weg.txt` angezeigt, und die Datei ist danach im Arbeitsbaum auf `w1`, `w2`, `W3` geändert, wenn der Diff neu angezeigt wird, dann steht im Diff-Kopf „Datei seit dem Commit geändert“ als Text, und die Zeilen tragen weiter ihre Links (`…/weg.txt:1`, `…:2`, `…:3`). *Ebene: Integration und Playwright.*
- [ ] Gegeben `s2` gewählt und `README.md` (in `s2` gelöscht) angezeigt, dann trägt keine Zeile einen Link, und im Diff-Kopf steht statt des Verweises ein Grund als Text (die Datei liegt nicht im Arbeitsbaum). Gegeben `s2` gewählt, `src/a.txt` angezeigt und die Datei danach aus dem Arbeitsbaum entfernt, dann steht derselbe Grund, und keine Zeile trägt einen Link. *Ebene: Integration und Playwright (Darstellung).*

### Fremde Namen, Wurzel und der neue git-Aufruf
- [ ] Gegeben ein Commit `f`, der eine Datei `f\xFF.txt` (Byte `FF`, angelegt über `printf`), eine Datei mit U+202E im Namen und eine Datei `g.txt` hinzufügt, wenn man je Datei den Diff zeigt, dann tragen die Zeilen von `f\xFF.txt` und der Datei mit U+202E **keinen** Link und der Diff-Kopf nennt an ihrer Stelle einen Grund als Text, während `g.txt` einen Link trägt. *Ebene: Integration (Abtastung der drei Namen, kein Beispiel).*
- [ ] Gegeben ein Commit `l`, der einen Symlink `link.txt` mit dem Ziel `/etc/hostname` hinzufügt, wenn man ihn wählt, dann trägt keine Zeile einen Link (der Pfad verlässt die Wurzel), und der Diff-Kopf nennt den Grund. *Ebene: Integration.*
- [ ] Gegeben `gitreviewA s2`, wenn man `GET /api/commits/<voller Hash von s2>/sprung` nacheinander mit `pfad=nicht-da.txt`, `../README.md`, `--output=pwn`, `:(top)src/a.txt`, `*.txt` und `SRC/A.TXT` anfragt, dann antwortet jede mit 404, ohne dass `git` gestartet wird, und die Datei `pwn` entsteht nicht; ohne `pfad` antwortet die Anfrage mit 400; mit `HEAD` oder dem Hash von `s1` anstelle des Hashes antwortet sie mit 404; mit dem vollen Hash von `s2` und `pfad=src/a.txt` antwortet sie mit 200, `ziel = vscode://file/<Wurzel>/src/a.txt` (ohne `:<Zeile>`), `geaendert = false` und leerem Grund. *Ebene: Integration (Endpunkt).*
- [ ] Gegeben in `.git/config` von Repo S Marker-Skripte für `diff.external`, `diff.marker.textconv` und `diff.marker.command` und eine `.gitattributes` mit `*.txt diff=marker`, wenn die Sprunganfrage für `src/a.txt` läuft, dann ist die Antwort dieselbe wie ohne diese Einstellungen und keine der Markerdateien existiert. *Ebene: Integration (Marker-Probe, je Mechanismus vorher rot).*
- [ ] Gegeben der Aufruf startet in einem Unterordner von Repo S, wenn die Sprunganfrage für `src/a.txt` läuft, dann ist der Link derselbe wie beim Start im Wurzelordner. *Ebene: Integration (Start aus einem Unterordner).*

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md): Themenordner unter `src/GitReviewA/`, Oberfläche unter `src/GitReviewA/web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`.

- `Git/` — `GitLeser` bekommt den neuen Aufruf „Arbeitsbaum gegen Commit“ (`git diff --quiet`); `GitStart` bleibt der einzige Weg zu `git`.
- `Sprung/` (neu) — `Sprungpfad` (Prüfung des Namens und des Pfads), `Sprungziel` (Kodierung), `SprungInteractor`, `ISprungquelle`/`GitSprungquelle` (der neue `git`-Aufruf), `SprungEndpunkt`, `Sprungantwort`, `Sprungergebnis`.
- `Server/` — Endpunkt `GET /api/commits/{hash}/sprung` neben den vorhandenen.
- `web/` — `diff.js` und `diff-werte.js` (Links an Zeilen und Abschnittsköpfen), `index.html` und `gitreviewa.css` (Verweis und Hinweis im Diff-Kopf), `sprung.js` (neu: Abruf und Zustand).
- `tests/`, `e2e/` — Wegwerf-Repo S (erweitert um Namen mit Leerzeichen, `#`, `%`, Rohbyte, U+202E, Symlink, gelöschte und im Arbeitsbaum geänderte Datei), DSL und Treiber auf den vorhandenen Schichten.

## Technische Überlegungen

Vorplanung; welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Die WBS führt den Entwurf als B2001–B2009 unter I0011.

### Ablauf
1. **Anfrage prüfen** — `GET /api/commits/{hash}/sprung?pfad=<Pfad>`: Hash gegen die Aufrufmenge (voller Hash), danach der Pfad exakt gegen die Dateiliste des Commits (`Namenspruefung`, wie in R00004). Kein Treffer → 404 ohne `git`-Aufruf, kein `pfad` → 400.
2. **Sprungpfad bilden** (rein) — `Dateiaenderung` + `Repositorywurzel` → absoluter Pfad oder „kein Sprung“ mit Grund: Status `D`; Rohbytes (`Rohpfad`/`RohAlterPfad`) oder ein Zeichen aus `UnsichtbareZeichen` im neuen **oder** alten Namen (dieselbe Klasse wie R00011/R00014, keine zweite Liste); der zusammengesetzte Pfad muss in der Wurzel bleiben (kein `..`-Bestandteil).
3. **Ziel kodieren** (rein) — je Pfadteil `encodeURIComponent`, die Trenner `/` bleiben; `vscode://file` + Wurzel + `/` + Pfad, das `:<Zeile>` hängt der Browser an (die Zeile kennt nur er).
4. **Arbeitsbaum prüfen** (Ressourcenzugriff) — Vorhandensein (Dateisystem; ein Symlink, dessen Ziel aus der Wurzel hinausführt, gilt als fehlend) und Änderung seit dem Commit über einen neuen `git`-Aufruf `git diff --quiet … <hash> -- <pfad>` mit den Schutzoptionen der übrigen Lesepfade; Exit 0 = unverändert, 1 = geändert, sonst `GitFehler`.
5. **Antwort** — `{ziel, geaendert, grund}`; fehlt die Datei oder ist der Name nicht übergebbar, bleibt `ziel` leer und `grund` trägt den Text.
6. **Oberfläche** — bei `datei-gewaehlt` (und beim Wechsel der Ansicht) das Sprungziel einmal anfragen; beim Zeichnen des Diffs jede Zeile mit Nummer neu und jeden Abschnittskopf verlinken; den Verweis und den Hinweis im Diff-Kopf setzen; nur zeichnen, wenn (Commit, Pfad) noch gelten.

### Grobentwurf

**Einstiegsstellen:** `index.html` (Diff-Kopf), `diff.js` (Zeilen und Abschnittsköpfe), `Webserver.BildeRueckkanal`, `GitLeser` (neuer Aufruf).

- `Sprungpfad` (Operation, rein) — `Dateiaenderung` + `Repositorywurzel` → absoluter Pfad oder Ablehnungsgrund; teilt die Regel mit `Namenspruefung` und `UnsichtbareZeichen`.
- `Sprungziel` (Operation, rein) — absoluter Pfad (+ Zeile) → `vscode://file/…`; Vorlage kanbanD `vscodeLink`/`teileKodiert`.
- `ISprungquelle` (Interface) — `Vorhanden(string absoluterPfad)` und `GeaendertSeit(string hash, string pfad)`; Ableitung `GitSprungquelle` (Ressourcenzugriff, wirft `GitFehler`).
- `SprungInteractor` (Integration) — `Sprunganfrage(Hash, Pfad)` + Arbeitsordner + `Repositorywurzel` → `Sprungergebnis(Ziel, Geaendert, Grund)`; ruft `Namenspruefung`, `Sprungpfad`, `Sprungziel`, `ISprungquelle`.
- `SprungEndpunkt` (Integration) — dünner Adapter: 200 `{ziel, geaendert, grund}`, 400, 404.
- JS: `sprung.js` (Abruf und Zustand je Datei), Erweiterung von `diff.js`/`diff-werte.js` (Verlinkung) und `index.html`/`gitreviewa.css` (Verweis, Hinweis).

### Änderungen an bestehenden Klassen
- `GitLeser` — neue Methode für „Arbeitsbaum gegen Commit“ (`git diff --quiet`), die Exit 0 und 1 als Urteil liest (nicht als Fehler).
- `Webserver` — ein weiterer `MapGet` in `BildeRueckkanal`; `Program` reicht die Arbeitsbaumwurzel weiter (liegt dort schon vor).
- `diff.js`, `index.html`, `gitreviewa.css` — Verlinkung, Verweis und Hinweis.

### Messung des Zeitkriteriums
Kein eigenes; die Sprunganfrage läuft bei der Auswahl der Datei und kostet höchstens einen `git`-Aufruf. Der Entwickler hält im Bericht fest, dass die Messungen aus R00004 (Dateiwechsel ≤ 1 s an der Obergrenze) mit der zusätzlichen Anfrage grün bleiben.

## Tests

Nach `~/.claude/skills/test-pyramide/SKILL.md` und der Vorgabe des Betreibers 2026-11-24 (Interactor je Interaction, Playwright nur für den Hot Path und für Browser-Eigenes).

**Unit (pure Logik):** `Sprungpfad` (gültiger Name, Leerzeichen/`#`/`%`, Rohbyte, U+202E, LF, `..`, Symlink nach außen, Status `D`), `Sprungziel` (Kodierung je Pfadteil, Leerzeichen `%20`, `#` `%23`, `%` `%25`, Umlaut, kein anderes Schema), Zuordnung „Zeile → Link“ (`data-neu`; entfernte Zeile ohne Link; Abschnittskopf auf die erste Zeile der neuen Seite (nur Änderungen)).
**Integration:** `SprungInteractor` und Endpunkt gegen Wegwerf-Repos S, `f` (Rohbyte, U+202E) und `l` (Symlink) mit echtem `git` — die Kriterien der Gruppen „Sprungziel je Stelle“, „Hinweis und fehlende Datei“ und „Fremde Namen, Wurzel und der neue git-Aufruf“; **Marker-Skript-Probe** (`diff.external`, `textconv`, `command` — je Mechanismus vorher rot), Konfigurationsprobe und Start aus einem Unterordner für den neuen `git`-Aufruf; Pfadliste des Endpunkts ohne `git`-Aufruf bei 404; Programm als Prozess (stdout bleibt leer).
**E2E:** Playwright headless nur für das Attribut `href` und die Darstellung des Verweises und des Hinweises (kein echter Start von VS Code); die Ansicht „ganze Datei“ über den vorhandenen Umschalter.

## Abhängigkeiten

- Abhängig von: I0006 Diff einer Datei lesen ([R00004](R00004-diff-einer-datei-lesen.md), grün) und I0005 Commits und Dateien sehen ([R00003](R00003-commits-und-dateien-sehen.md), grün); I0022 ([R00008](R00008-ganze-datei-mit-diff.md), grün) liefert die zweite Ansicht; I0003 ([R00016](R00016-ungueltiger-aufruf.md), grün) die Repositorywurzel (`WurzelLesen`).
- Blockiert: nichts. Übernommen von I0027 ([R00012](R00012-oberflaeche-liste-detail-zusammen.md)) — der Entwurf Fassung 2 zeichnet den Verweis erst, wenn diese Karte da ist; in „Zusammen“ gilt der zuständige Commit ([R00015](R00015-zusammen-logik-und-server.md)) als Vergleichsstand.

Nicht Teil dieser Anforderung: die Taste `o` (I0015), die Nebeneinander-Ansicht (I0007), Syntaxfarben (I0008), große Dateien (I0014), die Neuauslegung der Oberfläche (I0027), das Öffnen des Diff-Inhalts selbst.

## Offene Fragen

1. An den product-owner: **wo der Link sitzt** — an jeder Zeile (Nummer neu) und jedem Abschnittskopf (Fertig-Kriterium von I0011) **und** als Verweis „In VS Code“ im Diff-Kopf (Entwurf Fassung 2), oder nur am Verweis im Diff-Kopf? Empfehlung: beides, es ist eine Mechanik mit drei Stellen; der Verweis bedient die gewählte Zeile.
2. An den product-owner: **eine entfernte Zeile** — kein Link (Empfehlung: die Zeile hat keine Nummer neu, und der Abschnittskopf deckt die Stelle ab), oder die nächste Zeile mit Nummer neu?
3. An den product-owner: **Grund statt Link** — als Text im Diff-Kopf nennen (Empfehlung, wie die Sperre in R00014), oder still weglassen?
4. An den product-owner: **Wortlaut** des Hinweises (Empfehlung „Datei seit dem Commit geändert“) und des Grundes (Empfehlung „Datei liegt nicht im Arbeitsbaum“ / „Datei nicht in VS Code zu öffnen“).

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00001 hinaus.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 9 Bubbles unterhalb I0011 (B2001–B2009), davon 3 Standard (2 h) und 6 unklar (2–4 h) — Untergrenze 18 h, obere Schätzung 30 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (`Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble, die Richtwerte sind also ein Vielfaches davon. Enthalten: nur I0011; I0027 (Oberfläche) und I0010 (Zusammen) sind nicht mitgezählt.

## Warum löst diese Anforderung das Problem?

Der Auslöser: der Mensch liest im Diff eine Stelle, die er im Editor weiterverfolgen will (Definition, Aufrufer, Historie) — heute heißt das Pfad und Zeile abtippen. Wenn jede Zeile mit Nummer neu und jeder Abschnittskopf einen Link auf `vscode://file/<absoluter Pfad>:<Zeile neu>` tragen, dann ist die Stelle ein Klick, und die Nummer ist dieselbe Stellenangabe, die der Diff ohnehin zeigt (R00004: Nummer neu = Zeile im Stand nach dem Commit). Der Hebel liegt darin, dass der Link nichts Neues rechnet — er nimmt die vorhandene Zeilennummer —, und dass er dort gebaut wird, wo die Bytes des fremden Namens bekannt sind: so bekommt eine Datei, deren Name Rohbytes oder unsichtbare Zeichen trägt oder deren Pfad die Wurzel verlässt, gar keinen Link, statt einen, der über das Ziel täuscht. Der Hinweis aus dem Vergleich Arbeitsbaum gegen Commit ist die zweite Hälfte: er sagt, wann die Zeilennummer verrutscht ist, statt den Menschen in die falsche Zeile zu schicken.

## Missing-Docs

- Wie VS Code `vscode://file/<pfad>:<zeile>` liest — insbesondere Prozent-Kodierung, Umlaute, Leerzeichen und `#` im Pfad, Windows-Laufwerksbuchstaben und ein `:<zeile>` bei einem Pfad mit Doppelpunkt: vor dem Bauen mit einem Wegwerf-Repo und VS Code (oder dem Protokollhandler) proben; bis dahin stützt sich die Kodierung auf kanbanD `review-uebersicht.js` (`teileKodiert`).
- Exit-Codes von `git diff --quiet <commit> -- <pfad>` bei fehlender Datei, gelöschter Datei und bei einem Pfad, den der Index kennt: vor dem Bauen im Wegwerf-Repo messen (0 = unverändert, 1 = geändert erwartet; die fehlende Datei unterscheidet der Arbeitsbaum, nicht der Exit-Code).

## Notizen

### Optionen (wo das Ziel entsteht)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Der Server liefert das kodierte Ziel **ohne** Zeile, der Browser hängt `:<Nummer neu>` an (Empfehlung) | Ziel als Attribut prüfbar; Kodierung in C# unit-testbar | gering: eine Anfrage je Datei, die Zeile kennt nur der Browser | klein |
| 2. Der Browser baut den Link selbst aus Wurzel + Anzeigepfad (kanbanD-Weg) | im Browser testbar | die Entscheidung „welcher Name ist übergebbar“ läge im Browser, der nur den Anzeigenamen mit Marken hat | klein |
| 3. Der Server liefert die fertige Adresse je Zeile | ein Aufruf | eine Anfrage je Zeile oder ein zweiter Patch-Durchlauf; verletzt „bei Bedarf“ | mittel |

Gewählt: 1. Der Server entscheidet (dort liegen die Bytes des fremden Namens), der Browser hängt nur die Nummer an.

### Verworfene Alternativen
- Option 2: der Browser kennt nur den Anzeigenamen mit Marken (`⟨0xFF⟩`), nicht die Rohbytes; die Sicherheitsentscheidung gehört dorthin, wo die Bytes bekannt sind.
- Option 3: die Zeilennummer ist schon im DOM (`data-neu`); sie dem Server zu schicken, hieße, dieselbe Rechnung zweimal zu führen.
- Ein Link nur am Verweis im Diff-Kopf: das Fertig-Kriterium von I0011 nennt „Link je Hunk und Zeile“, und die Vision sagt „jede Stelle“ — bleibt als Schnittlinie, falls der Bau zu groß wird (siehe Offene Frage 1).
- Der Hinweis „seit dem Commit geändert“ als eigene Karte: bleibt als Schnittlinie, falls der Bau zu groß wird (Muster Regeln — erst der Link, dann der Hinweis).
- Die Zeilennummer aus dem **alten** Stand statt dem neuen: das Ergebnis und die Anmerkung (R00002, R00010) adressieren die Zeile im Stand nach dem Commit; ein zweites Maß täuschte.
- Einen Link auch für Namen mit Rohbytes oder unsichtbaren Zeichen bauen (prozent-kodierte Bytes): der sichtbare Pfad zeigte dann etwas anderes als das Ziel; verworfen (dieselbe Linie wie `linkErlaubt` in kanbanD).

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-25 | Kriterium 2 (Ansicht „ganze Datei“) auf die Zeilenlinks eingeengt — die Klausel „und der eine Abschnittskopf `…:1`“ entfällt; Beschreibung, Sprungziel (Z. 15, 25) und Testabschnitt entsprechend nachgezogen; WBS B2007 (Hunk-Kopf nur in „nur Änderungen“) | Entscheidung des product-owner 2026-11-25 (`AI-Team/po-entscheidungen.md`): „ganze Datei“ zeichnet lückenlos, dort gibt es keinen Abschnittskopf (R00008), kein sichtbarer Verlust; der Abschnittskopf-Link bleibt in „nur Änderungen“ (Kriterium 1), der Verweis „In VS Code“ im Diff-Kopf (Kriterium 5) gilt in beiden Ansichten |
