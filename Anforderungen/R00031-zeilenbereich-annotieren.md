---
id: R00031
status: Neu
datum: 2026-11-25
---

# R00031: Zeilenbereich annotieren

## Beschreibung

Der prüfende Mensch markiert im Diff einen zusammenhängenden Zeilenbereich — von einer Zeile `von` bis zu einer Zeile `bis` in der **Nummer neu** —, etwa eine ganze Funktion, und schreibt dazu seine Anmerkung. Die Anmerkung steht sichtbar am Bereichsende, bleibt über Datei- und Commitwechsel, Ansichtswechsel, Neuzeichnen und Neuladen erhalten und erscheint beim „Beenden“ im Ergebnis als `<Datei>:<von>-<bis>` statt `<Datei>:<Zeile>`; die Einzelzeile und die Dateianmerkung bleiben Byte für Byte wie [R00002](R00002-beenden-mit-ergebnis.md). Ändern und Löschen laufen unverändert über die stabile Nummer (I0023, I0024), weil eine Bereichsanmerkung dieselbe Stelle trägt wie eine Zeilenanmerkung — nur mit zwei Nummern. Die Bedienung lebt in der Liste–Detail-Oberfläche (I0027).

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen“ (eine Stelle ist hier ein Bereich, den die KI ohne Rückfrage findet) und „Ergebnis als Rückkanal“ (derselbe eine Ausgang auf stdout).

Baut auf auf: [R00010](R00010-zeile-annotieren.md) (Zeilenanmerkung, `zeilenziel`, `anmerkungsstand`, Notizfeld, `POST /api/anmerkungen`, stabile Nummer), [R00004](R00004-diff-einer-datei-lesen.md)/[R00008](R00008-ganze-datei-mit-diff.md) (Zeilenaufbau `{art, alt, neu, text}`, `diff-gezeichnet`, beide Ansichten), [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat, „Beenden“), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Sperre je Stelle) und [R00021](R00021-in-vs-code-springen.md) (VS-Code-Link).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Anmerkung, Stelle, Nummer neu, Abschnitt, Diff-Zeile sind die von R00002, R00004 und R00010.

## Geschäftlicher Nutzen

Heute hängt eine Anmerkung an genau einer Zeile. Wer eine Funktion, einen Block oder eine zusammenhängende Stelle beurteilen will, muss die Stelle entweder an einer Zeile festmachen (die KI sieht dann nicht, worüber der Satz gilt) oder die Zeilennummern von Hand in den Text schreiben — was verrutscht, sobald alt und neu auseinanderfallen. Mit einem markierten Bereich genügt ein Zug oder zwei Klicks, und die KI erhält im Ergebnis den Bereich `<Datei>:<von>-<bis>` samt Text (und, wenn entschieden, den ersten Zeilen daraus): sie kann die Funktion ohne Rückfrage aufschlagen. Der Rückkanal wächst dabei nur um die zweite Nummer (und, wenn entschieden, um das Zitat) — die Stelle ist die vorhandene Stellenangabe, und die Einzelzeile bleibt unverändert.

## Funktionale Anforderungen

- **Markieren**: ein Klick auf eine Zeile mit Nummer neu setzt den **Anker** und öffnet wie bisher das Feld für eine Zeile; ein **Umschalt-Klick** auf eine andere Zeile desselben Abschnitts oder ein **Ziehen** über die Zeilennummern erweitert auf den Bereich `von..bis` (kleinste und größte Nummer neu der beiden Enden) und öffnet das Feld unter `bis`. Ist beim Klick Text ausgewählt, öffnet sich nichts (Text bleibt kopierbar, wie R00010). Anker und Ziel tragen beide eine Nummer neu; eine **entfernte** Zeile (nur Nummer alt), ein Abschnittskopf (`@@ …`) und die Zeile `\ No newline at end of file` sind keine Grenzen und öffnen keinen Bereich.
- **Grenze des Bereichs**: beide Enden liegen im **selben Abschnitt** der gezeigten Datei und in **demselben Commit**. Ein Bereich überschreitet nie eine zugeklappte Lücke ([R00026](R00026-leerraum-und-luecken.md)) und in „Zusammen“ ohne lückenlose Kette nie die Grenze zwischen zwei Commit-Abschnitten; die aufgeklappten Zeilen einer Lücke sind gezeigte Zeilen und dürfen Grenzen sein. Eine entfernte Zeile **innerhalb** des Bereichs ist kein Teil des Bereichs (sie hat keine Nummer neu) und wird nicht markiert. Anker und Ziel auf derselben Zeile ergeben einen **einzeiligen** Bereich und werden wie eine Zeilenanmerkung behandelt (`<Datei>:<Zeile>`, kein `-`).
- **Anzeige**: die markierten Zeilen sind sichtbar hervorgehoben (nicht allein durch Farbe); die Anmerkungszeile steht **unter `bis`** mit der Stelle `<Datei>:<von>-<bis>`, der stabilen Nummer, „Ändern“ und „Löschen“ (I0023, I0024) und dem Text als reinem Text. Eine Anmerkungszeile ist keine Diff-Zeile: sie trägt kein `data-art`, `data-alt`, `data-neu`; die Zeilenzählungen von R00004/R00008 und die Farbauflage von R00007 bleiben unberührt. **Mehrere und überlappende Bereiche** sind erlaubt (wie mehrere Anmerkungen je Zeile, R00010); eine überlappte Zeile trägt die Markierung jedes Bereichs, jede Anmerkung steht unter ihrem eigenen `bis` in Anlegereihenfolge.
- **Notizfeld**: mehrzeiliges Feld mit dem Namen „Anmerkung zu <Datei>, Zeile <von>–<bis>“, „Speichern“ (Strg+Enter) und „Abbrechen“ (Esc); „Speichern“ ist gesperrt, solange die Anfrage läuft (kein doppeltes Anlegen); Fehler stehen als Meldung im Feld, der Text bleibt; höchstens ein Feld.
- **Offenes Feld übersteht das Neuzeichnen** (Lehre #23): wird der Diff neu gezeichnet — die Färbung trifft ein, die Blockgrenze greift, eine späte Antwort verwirft sich, der Blockaufbau wechselt —, bleiben Markierung, offenes Feld, Text und Fokus erhalten; ein Neuzeichnen verwirft keine Eingabe und verschiebt die Anmerkung nicht.
- **Bleibt sichtbar**: eine Bereichsanmerkung erscheint in jedem Diff ihres Commits und ihrer Datei an ihren Zeilen — in „nur Änderungen“ und „ganze Datei“ (R00008), mit und ohne Umbruch, in beiden Anordnungen ([R00023](R00023-nebeneinander-ansicht.md)), nach Wechsel von Datei und Commit und zurück und nach Neuladen der Seite. Sie erscheint nie an einer anderen Zeile, Datei oder in einem anderen Commit, auch nicht, wenn dort dieselben Nummern vorkommen. In „Zusammen“ gehört sie dem zugeordneten Commit (jüngster Commit der Auswahl, der die Datei ändert; ohne Kette der Commit des Abschnitts, [R00015](R00015-zusammen-logik-und-server.md)).
- **Außerhalb der Ansicht**: zeigt die Ansicht die Zeilen nicht, die der Bereich braucht (Beispiel: „nur Änderungen“ zeigt die Lücke 9–21 nicht), oder gehört der Bereich zu einem anderen Commit derselben Datei, steht über dem Diff der Hinweis mit Commit und Bereich („Anmerkung an lang.txt:3-7, Commits …“) und die Anmerkung bleibt im Ergebnis. Zeigt die Ansicht die Zeilen (aufgeklappte Lücke, „ganze Datei“), entfällt der Hinweis.
- **Serverweg**: derselbe `POST /api/anmerkungen` (R00002); statt `zeile` trägt die Anfrage `von` und `bis` (beide ganzzahlig, `von` ≥ 1, `bis` ≥ `von`). `zeile` und das Paar `von`/`bis` schließen sich aus (400); fehlt beides, ist es eine Dateianmerkung wie bisher. Die **Sperre je Stelle** (R00014) gilt und benutzt **denselben kanonischen Anzeigenamen** wie die Zeilenanmerkung und das Ergebnis; die Nummer kommt aus demselben Zähler (nie wiederverwendet); `GET /api/anmerkungen` nennt `von`/`bis` neben `nummer`, `commit`, `datei`, `text`.
- **Ergebnis** (Erweiterung von R00002): eine Bereichsanmerkung ergibt den Abschnitt `## <n>. <Datei>:<von>-<bis>` mit `Commit: <voller Hash>` und dem Text als Zitat; darunter, wenn die markierten Zeilen lesbar sind, ein Zitat der markierten Zeilen (Regeln unten). Eine **Zeilenanmerkung** (`<Datei>:<Zeile>`) und eine **Dateianmerkung** (`<Datei> (ganze Datei)`) bleiben Byte für Byte wie in R00002, ebenso das Ergebnis ohne Bereichsanmerkung. Die Nummerierung bleibt fortlaufend ab 1 nach Anlegereihenfolge.
- **Zitat der markierten Zeilen**: je markierter Zeile eine Zeile `    <Nummer neu>: <Text>` (vier Leerzeichen, damit Markdown einen Codeblock liest), höchstens 20 Zeilen je Bereich, danach genau eine Zeile `    … (k weitere Zeilen)`; unsichtbare und richtungsändernde Zeichen des fremden Textes erscheinen als Marke `⟨U+…⟩` (dieselbe Zeichenliste wie in R00011/R00012/R00021, keine zweite), Textzeilenenden werden zu LF vereinheitlicht. Ist der Bereich nicht lesbar (Name nicht übergebbar, über der Ausgabegrenze, Zeilen hinter dem Dateiende, Lesefehler), fehlt das Zitat und der Abschnitt bleibt bei Stelle und Text — nichts wird still behauptet; der Grund steht auf stderr. Der Lesepfad ist neu und trägt **Ausgabegrenze und Namensprüfung** an der Aufrufstelle (Lehre #10); je (Commit, Datei) wird höchstens einmal gelesen.
- **Grundform bleibt lesbar**: eine Bereichsangabe beginnt mit derselben Form wie eine Zeilenangabe (`<Datei>:<von>`); wer wie bisher `<Datei>:<Zahl>` liest, erhält weiter eine Zahl (die erste Zeile des Bereichs), und wer das Zitat sucht, findet es hinter `Commit:` und vor dem Textzitat.
- **Tastatur**: `Umschalt+↑`/`Umschalt+↓` erweitern den Bereich um die Nachbarzeile — das ist ein Eintrag im Katalog von I0015 (der Bereich ist vollständig mit Maus und Tab bedienbar, auch ohne I0015).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): Die Auswahl rechnet im Browser (kein neuer Anfrageweg beim Markieren); die Anmerkung nutzt den vorhandenen `POST /api/anmerkungen`. Die Grenzen aus R00010 (500 Anmerkungen an einer Datei mit 20 000 Diff-Zeilen ≤ 1 s nach dem Klick) und R00002 („Beenden“ mit 500 Anmerkungen ≤ 1 s, Messwert ≤ 0,7 s) gelten unverändert; das Lesen der markierten Zeilen (B3007) darf sie nicht brechen — der Entwickler misst „Beenden“ mit 500 Bereichsanmerkungen und hält das Ergebnis im Bericht fest (liegt es darüber, geht das als Befund zurück, nicht als lockereres Kriterium).
- **Sicherheit** (Label `sicherheit`): Der markierte Bereich ist die Aussage des Menschen über den gezeigten Text; der Server prüft nur die Form (`von`/`bis` ganzzahlig, `von` ≥ 1, `bis` ≥ `von`, nicht mit `zeile` gemischt) und die Sperre je Stelle — wie R00002 die Zeile nicht gegen die Datei prüft. Der neue Lesepfad (B3007) geht über `GitStart` mit allen Schutzoptionen, mit **Ausgabegrenze** und **Namensprüfung** an der Aufrufstelle (Lehre #10); ein Name mit Rohbytes geht **nie** als Argument an `git`, nur über stdin (`AI-Team/gelerntes.md` #16/#28); Rohbytes- und LF/CR-Namen werden vor dem Aufruf geprüft. Fremder Text (Pfade, markierte Zeilen) erscheint nur über `textContent` und auf stdout mit Marken; der Anmerkungstext bleibt Zitat und die Textregel aus R00010 (Steuer- und Richtungszeichen abgelehnt) gilt unverändert. **Sperre und Ergebnis vergleichen denselben kanonischen Anzeigenamen** (Lehre #29/#27/#18) — kein zweiter Schlüssel.
- **Logging**: stdout bleibt bis „Beenden“ leer; je Anlage und je Bereich eine Debug-Zeile auf stderr mit Nummer, Bereich (`von`–`bis`) und Textlänge, **nie** dem Text; das Lesen der markierten Zeilen schreibt seinen Ausgang (gelesen / nicht lesbar / Ausgabegrenze) auf stderr, Namen mit Marken; Fehler als Error mit Kontext.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Entwurf Fassung 2, keine eigenen Vorgaben; die Markierung ist nicht allein Farbe und hängt nicht am Fokus; das Feld ist per Tastatur bedienbar und trägt einen Namen für Screenreader; Fehlermeldungen als `role="alert"`; die Bereichsangabe im Anmerkungskopf beginnt mit dem sichtbaren Text.
- **Verträglichkeit mit parallelen Karten**: R00012 (Oberfläche, `Braucht`), R00026 (Lücken: Überschreiten verboten), R00023 (beide Anordnungen), R00021 (VS-Code-Link) und R00010 bleiben unverändert und gelten mit; R00014 gilt unverändert.

## Akzeptanzkriterien

Vorbereitung: **Repo R** im Wegwerf-Ordner (nie das Projekt-Repo): `r1` „Anlegen“ legt `lang.txt` mit 30 Zeilen `z01` … `z30` und `fremd.txt` mit zwei Zeilen (`<b>z20</b>` und `a`+U+202E+`b`) an; `r2` „Ändern“ ändert `z05` zu `Z05` und `z25` zu `Z25`. `lang.txt` hat in `r2` zwei Abschnitte `@@ -2,7 +2,7 @@` (Nummern neu 2–8) und `@@ -22,7 +22,7 @@` (Nummern neu 22–28); die Lücke dazwischen sind die Zeilen 9–21, in `r1` ist `lang.txt` ein einziger Abschnitt `@@ -0,0 +1,30 @@` (Nummern neu 1–30). Aufruf, wo nichts anderes steht: `gitreviewA <r2> --kein-browser`, `lang.txt` gewählt, Fenster 1280 × 800. **Repo N plus `v`** (gesperrte Stellen) und **Repo Z** (lückenlose Kette) kommen aus `user-stories/R00014.md` bzw. `user-stories/R00012.md`. „Markieren“ = Anker setzen (Klick auf eine Zeile) und mit Umschalt-Klick oder Ziehen bis zur zweiten Zeile erweitern. Die Angabe *Ebene* nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Die Bereichsauswahl liegt **nicht** auf dem Hot Path (`AI-Team/factory.md`); Playwright nur für die Auswahl im Browser (Ziehen, Markierung, offenes Feld).

### Markieren und Anzeigen
- [ ] Gegeben `r2` und `lang.txt`, wenn man von `z03` (neu 3) bis `z07` (neu 7) markiert, dann sind die fünf Zeilen 3–7 hervorgehoben, das Feld heißt „Anmerkung zu lang.txt, Zeile 3–7“; nach „Speichern“ steht die Anmerkung unter `z07`, und nach „Beenden“ steht auf stdout `## 1. lang.txt:3-7` mit `Commit: <voller Hash von r2>` und `> …` bei Exit-Code 0. Rechnung: kleinste und größte Nummer neu der beiden Enden, 3 und 7. *Ebene: Unit (Bereichsziel) und Integration (Interactor, Endpunkt, Programm als Prozess).*
- [ ] Gegeben der Zeilenaufbau eines Diffs, wenn man den Anker auf eine Zeile **ohne Nummer neu** setzt (entfernte Zeile, Abschnittskopf `@@ -2,7 +2,7 @@`, Hinweiszeile `\ No newline at end of file`), dann entsteht kein Bereich und kein Feld; gegeben dieselbe Datei, wenn man den Anker auf `z05` (neu 5) setzt und mit Umschalt-Klick auf `z25` (neu 25, zweiter Abschnitt) erweitert, dann entsteht kein Bereich und die Oberfläche sagt, dass ein Bereich nur innerhalb eines Abschnitts geht. *Ebene: Unit (Bereichsziel: entfernte Zeile, Kopf, Hinweiszeile, Abschnittsgrenze) und Playwright (Anzeige des Hinweises, Browser-Eigenes).*
- [ ] Gegeben die Anker auf `z05` (neu 5) und `z25` (neu 25) in „Zusammen“ **ohne** lückenlose Kette (Repo Z, Aufruf `z1 z3`), wenn die beiden Enden in Abschnitten verschiedener Commits liegen, dann entsteht kein Bereich. Rechnung: zwei Commits, eine `Commit:`-Zeile im Ergebnis — der Bereich gehört zu einem Commit. *Ebene: Unit (Bereichsziel, Commit-Grenze).*
- [ ] Gegeben `r2` und `lang.txt`, wenn die Lücke 9–21 zugeklappt ist und man die Anker auf `z07` (neu 7) und — nach einmaligem Aufklappen einer Lücke ([R00026](R00026-leerraum-und-luecken.md)) — auf `z20` setzt, dann sind die aufgeklappten Zeilen 9–20 gezeigte Zeilen: ein Bereich 7–20 entsteht, ein Bereich über eine **zugeklappte** Lücke (Anker 7, Umschalt-Klick 22 ohne Aufklappen) entsteht nicht. *Ebene: Unit (Bereichsziel mit gezeigter Zeilenmenge) und Integration (Oberfläche gegen Fake).*
- [ ] Gegeben `r2` und `lang.txt`, wenn man den Bereich 3–7 und danach den Bereich 5–10 anlegt, dann stehen die Anmerkung 3–7 unter `z07` und die Anmerkung 5–10 unter `z10`, die Zeilen 5–7 tragen beide Markierungen, und im Ergebnis stehen `## 1. lang.txt:3-7` und `## 2. lang.txt:5-10` in Anlegereihenfolge. *Ebene: Unit (Bereichsstand) und Integration (Ergebnis).*
- [ ] Gegeben ein offenes Feld für den Bereich 3–7 mit Text „Klammer fehlt“ und die Antwort der Färbung ist um 1,5 s verzögert, wenn der Diff während des offenen Feldes neu gezeichnet wird (Färbung trifft ein, danach wechselt ein Blockaufbau), dann ist das Feld weiter offen, der Text steht unverändert darin, der Fokus liegt im Feld, die Markierung 3–7 steht, und „Speichern“ legt genau eine Anmerkung an. *Ebene: Integration (Oberfläche, verzögerter Fake; Lehre #23).*

### Serverweg, Sperre, Ändern und Löschen
- [ ] Gegeben `r2`, wenn eine Anmerkung mit `von: 3`, `bis: 7` angelegt wird, dann antwortet `POST /api/anmerkungen` mit 201 und der Nummer 1, und `GET /api/anmerkungen` nennt `von: 3`, `bis: 7`; mit `von: 5`, `bis: 3`, mit `von: 0`, mit `bis: -1`, mit fehlendem `bis` oder mit `zeile` **und** `von`/`bis` zusammen wird sie abgelehnt (400), nichts gespeichert und keine Nummer verbraucht. *Ebene: Integration (Interactor und Endpunkt).*
- [ ] Gegeben Repo N plus `v`, wenn man einen Bereich auf `f⟨0xFF⟩.txt` in `n` (Doppelgänger-Paar, „Name nicht eindeutig“) oder auf `z⏎⟨0xFF⟩.txt` („Name nicht übergebbar“) anlegen will, dann wird sie abgelehnt (400, derselbe Sperrgrund wie die Zeilenanmerkung, keine Nummer verbraucht) und die Anzeige nennt den Grund; dieselbe Datei in `v` (lesbar) lässt sich als Bereich anmerken. Und: ein Bereich auf `a⟨0xFF⟩.sh` in `n` steht im Ergebnis mit demselben Anzeigenamen, den die Sperre prüft (Abtastung beider Stellen; Mutant „Bereich prüft einen anderen Namen als die Sperre/Ergebnis“ → Kriterium rot). *Ebene: Integration (Interactor, Endpunkt) und Unit (ein kanonischer Anzeigename; Lehre #29/#27/#18).*
- [ ] Gegeben eine Bereichsanmerkung 3–7 (Nummer 1) und eine Zeilenanmerkung `lang.txt:20` (Nummer 2) in `r2`, wenn man den Text der Bereichsanmerkung über ihre Nummer ändert, dann bleibt die Stelle 3–7 und die Position im Ergebnis, nur der Text wechselt; löscht man sie, dann verschwindet sie aus der Anzeige und dem Ergebnis, die verbleibende wird als `## 1.` nummeriert, und die gelöschte Nummer wird nicht wiederverwendet. *Ebene: Integration (I0023/I0024 ohne Umbau, Adressierung über die Nummer).*
- [ ] Gegeben `gitreviewA <r2> --verbose` mit gesammeltem stderr und stdout, wenn man einen Bereich anlegt, dann steht auf stdout bis „Beenden“ nichts, und stderr enthält eine Debug-Zeile mit der Nummer, dem Bereich `3–7` und der Textlänge 15, aber nicht den Text. *Ebene: Integration (Programm als Prozess).*

### Ergebnis und Zitat
- [ ] Gegeben `r2` und nichts angemerkt, wenn beendet wird, dann entspricht stdout Byte für Byte dem Ergebnis aus R00002 („Keine Anmerkungen.“). Gegeben eine Zeilenanmerkung `lang.txt:20` und eine Dateianmerkung (ohne `zeile` und ohne `von`/`bis`), wenn beendet wird, dann entspricht stdout Byte für Byte dem Beispiel aus R00002 bzw. `lang.txt (ganze Datei)`; die Bereichsregeln ändern daran nichts. *Ebene: Unit (`ErgebnisFormatierer`: Leerfall, Zeile, Datei unverändert) und Integration (Programm, stdout).*
- [ ] Gegeben eine Bereichsanmerkung 3–7 mit „Klammer fehlt“, wenn beendet wird, dann steht zwischen `Commit: <voller Hash von r2>` und dem Textzitat ein Zitat der markierten Zeilen: fünf Zeilen `    3: z03` … `    7: z07`; wer `<Datei>:<Zahl>` liest, erhält aus `## 1. lang.txt:3-7` die Zahl 3. *Ebene: Unit (`ErgebnisFormatierer`) und Integration (Programm als Prozess, stdout).*
- [ ] Gegeben `gitreviewA <r1>` (einziger Abschnitt 1–30) und ein Bereich über die Zeilen 1–23 von `lang.txt` (über die Schnittstelle angelegt), wenn beendet wird, dann stehen die ersten 20 Zeilen als `    1: z01` … `    20: z20` und danach genau eine Zeile `    … (3 weitere Zeilen)`. *Ebene: Unit (Kürzung des Zitats) und Integration.*
- [ ] Gegeben ein Bereich, dessen markierte Zeilen nicht lesbar sind — der Name trägt LF/CR, die Datei liegt über der Ausgabegrenze, oder `bis` liegt hinter dem Dateiende —, wenn beendet wird, dann steht der Abschnitt mit Stelle und Text **ohne** Zitat, stdout behauptet keinen Zeileninhalt, und stderr nennt den Grund; der Name mit LF/CR geht **nie** als Argument an `git` (Marker-Probe schlägt an, wenn doch), die Grenzprobe knapp unter/über der Ausgabegrenze liefert beim einen Zitat und beim anderen den Ausgang „zu groß“. *Ebene: Integration (Programm als Prozess; neuer Lesepfad, Ausgabegrenze und Namensprüfung — Lehre #10; `AI-Team/gelerntes.md` #16/#28).*

### Fremder Text
- [ ] Gegeben `gitreviewA <r1>`, `fremd.txt` gewählt und eine Bereichsanmerkung über seine zwei Zeilen (`<b>z20</b>` und `a`+U+202E+`b`) mit dem Text `<img src=x onerror=alert(1)>`, wenn man sie anlegt, die Seite neu lädt und beendet, dann stehen im Zitat und im Text die spitzen Klammern und Sternchen als sichtbarer Text, das rohe U+202E erscheint als Marke `⟨U+202E⟩`, es entsteht kein `img`/`b`/Dialog, und auf stdout steht das Zitat mit Marken unverändert. *Ebene: Playwright (DOM-Sicherheit, Browser-Eigenes) und Unit (`ErgebnisFormatierer`, Marken).*

Grenz- und Leerfälle bedacht: Anker und Ziel auf derselben Zeile → einzeilige Anmerkung (kein `-`); zwei Anmerkungen mit gleichem `bis` und verschiedenem `von` → beide unter `bis` in Anlegereihenfolge; Bereich in „ganze Datei“ (R00008) → dieselben Nummern; Bereich nach Neuladen → aus `GET` wieder da; Bereich, dessen Zeilen die Ansicht nicht zeigt → Hinweis (wie R00010). Verworfen als eigenes Kriterium: Windows/macOS, Berührungsgesten, ein zweiter Endpunkt, Markdown im Text.

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) und R00010 (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `Anmerkungen/` — der `ZeileAnnotierenInteractor` nimmt statt `zeile` die Spanne `von`/`bis`; `Anmerkung` (DTO) trägt optional `von`/`bis`; der `AnmerkungsPruefer` prüft die Form; die Sperre fragt weiter dieselbe gemerkte Übersicht über den kanonischen Anzeigenamen.
- `Beenden/` — `ErgebnisFormatierer` um den Bereichsabschnitt und das Zitat; ein neuer Lesepfad für die markierten Zeilen (in der Art von `GitLeser`, Schutzoptionen + Ausgabegrenze + Namensprüfung).
- `Server/` — keine neue Route; `POST /api/anmerkungen` und `GET /api/anmerkungen` liefern `von`/`bis` mit.
- `web/` — neuer reiner Baustein `bereich-werte.js` (Bereichsziel und Bereichsstand), `bereich.js` (Auswahlgeste, Markierung, Notizfeld), Ergänzung in `diff.js` (Ereignis `diff-gezeichnet`, Markierungsauflage) und `anmerkungen.js`; Stil in `gitreviewa.css`.
- `tests/` — Unit (`bereich-werte.js` unter Node, `ErgebnisFormatierer`), Integration gegen den Interactor und den Endpunkt; `e2e/` — Playwright nur für die Auswahl im Browser, Wegwerf-Repo R.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Die Bubbles stehen in der WBS unter I0032 (B3001–B3008).

**Artboard**: [Entwurf Fassung 2](../Dokumentation/Wireframes/oberflaeche-fassung-2.html) (vom Betreiber abgenommen, Vorrang vor Material 3) ist die Grundlage für den Diff-Bereich und den Anmerkungskopf dieses Slices; er zeichnet die **Bereichsauswahl nicht** (kein Zug über die Zeilennummern, keine Bereichsmarkierung, kein Notizfeld mit Bereichsnamen). Für diesen Teil gilt derselbe Standard wie für die übrigen nicht gezeichneten Bedienelemente: die Geste und die Markierung werden aus Material 3 und kanbanD ausgelegt, Inhalt und Reihenfolge nach Entwurf und User Story. Das Notizfeld ist die Form aus R00010, der Anmerkungskopf die Form aus I0023/I0024.

### Ablauf

1. **Zeile wählen** (Oberfläche) — Klick/Umschalt-Klick/Ziehen auf Zeilen mit Nummer neu → `Bereichsziel` (rein): `bereich` mit `von`/`bis`, `zeile`, `entfernt` (Hinweis), `keines`.
2. **Notizfeld** — öffnen unter `bis`, Fokus ins Feld; Esc/„Abbrechen“ schließt und gibt den Fokus zurück; Markierung, Text und Fokus überstehen ein Neuzeichnen.
3. **Speichern** — `POST /api/anmerkungen` mit `commit`, `datei`, `von`, `bis`, `text`; gesperrt bis zur Antwort; Fehler im Feld.
   - 3.1 Server: Anfrageschutz (R00002) → Form prüfen (`von`/`bis`, nicht mit `zeile` gemischt) → Sperre je Stelle (R00014) → Zähler → Speicher (409 nach „Beenden“).
   - 3.2 201: die Oberfläche nimmt die Anmerkung auf und zeichnet sie unter `bis`, nur wenn (Commit, Pfad) noch gelten.
4. **Zeigen** — nach jedem `diff-gezeichnet` (Commit, Pfad, Ansicht) → `Bereichsstand` (rein) → Markierungen und Anmerkungszeilen; Hinweis „außerhalb“ mit Commit und Bereich.
5. **Beenden** — für jede Bereichsanmerkung die markierten Zeilen lesen (ein neuer Lesepfad, je (Commit, Datei) höchstens einmal, Ausgabegrenze + Namensprüfung) → Zitat; `ErgebnisFormatierer` schreibt Stelle und Zitat.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `ZeileAnnotierenInteractor` und der Endpunkt `POST /api/anmerkungen`, `ErgebnisFormatierer` und der „Beenden“-Ablauf, `web/bereich.js`/`bereich-werte.js`, das Ereignis `diff-gezeichnet` aus `diff.js`.

- `Bereich` (Wert, rein) — `von`, `bis` (Nummer neu), `von ≤ bis`.
- `Anmerkung` (DTO, erweitert) — `von`/`bis` optional; `zeile` für die Einzelzeile, nichts für die ganze Datei.
- `AnmerkungsPruefer` (Operation, rein, erweitert) — Form der Spanne (`von`/`bis` ganzzahlig, `von` ≥ 1, `bis` ≥ `von`, nicht mit `zeile` gemischt).
- `ZeileAnnotierenInteractor` (Interactor, erweitert) — `LegeAn` nimmt die Spanne; dieselbe Sperre und Textregel.
- `ErgebnisFormatierer` (Operation, rein, erweitert) — Bereichsabschnitt `## <n>. <Datei>:<von>-<bis>` und das Zitat aus den übergebenen Zeilen.
- `Bereichszeilen` (Ressourcenzugriff, neu) — `Lies(commit, datei, rohbytes, von, bis, grenze)` → Zeilen mit Marken oder Grund; Schutzoptionen, Ausgabegrenze, Namensprüfung.
- JS `bereich-werte.js` (Operation, rein, läuft unter Node und im Browser) — `bereichsziel(...)`, `bereichsstand(...)`.
- JS `bereich.js` (Oberfläche) — Auswahlgeste, Markierung, Notizfeld; `diff.js` liefert `diff-gezeichnet`.

### Änderungen an bestehenden Klassen

`ZeileAnnotierenInteractor`-Pruefung und -Speicher (Spanne), `Anmerkung`/`AnmerkungsPruefer`, `ErgebnisFormatierer`, der Host-Aufbau (Lesepfad), `web/diff.js` (Markierungsauflage nach `zeichneZeilen`), `web/anmerkungen.js`/`gitreviewa.css`. `patchZeilen`, `ganzeDateiZeilen`, `sichtbarTeile`, `bloecke`, die Färbung, der Hakenspeicher und der Anfrageschutz bleiben unberührt.

## Tests

Nach Test-Pyramide und Konfiguration (Interactor je Interaction; Playwright nur Hot Path und Browser-Eigenes). Die Bereichsauswahl liegt nicht auf dem Hot Path; Playwright nur für die Auswahl im Browser.

**Unit (rein):** `bereich-werte.js` (Anker/Ziel, min/max der Nummer neu, entfernte Zeile/Kopf/Hinweiszeile, Abschnittsgrenze, Commit-Grenze, zugeklappte versus aufgeklappte Lücke, überlappende Bereiche, Bereich außerhalb der Ansicht, einzeiliger Bereich); `AnmerkungsPruefer` (Form der Spanne); `ErgebnisFormatierer` (Leerfall, Zeile und Datei unverändert, Bereich mit und ohne Zitat, Kürzung auf 20 + Rest, Marken für U+202E/U+200B/U+E0041).
**Integration (NUnit gegen den Interactor, echtes `git` im Wegwerf-Repo):** Anlegen/Auflisten mit `von`/`bis`, 400-Gründe, 409 nach Beenden, Sperre je Stelle (Repo N plus `v`), Stelle im Ergebnis, Ändern und Löschen über die Nummer (I0023/I0024), der neue Lesepfad (Marker-Skript-, Konfigurations-, Grenz- und Unterordner-Probe, Rohbyte-Name über stdin), Programm als Prozess (stdout/stderr getrennt).
**E2E (Playwright headless, nur Auswahl im Browser):** Ziehen und Umschalt-Klick, Markierung sichtbar, Notizfeld im Bereichsfeld, offenes Feld übersteht das Neuzeichnen, DOM-Sicherheit der markierten fremden Zeilen. Kein Hot-Path-Fall.

## Abhängigkeiten

- Abhängig von: I0017 Zeile annotieren ([R00010](R00010-zeile-annotieren.md), grün — Serverweg, Notizfeld, stabile Nummer), I0023 Anmerkung ändern ([R00018](R00018-anmerkung-aendern.md), grün) und I0024 Anmerkung löschen ([R00019](R00019-anmerkung-loeschen.md), grün — Ändern und Löschen der Bereichsanmerkung über die Nummer, ohne Umbau), I0027 Oberfläche Liste–Detail ([R00012](R00012-oberflaeche-liste-detail-zusammen.md), **rot** — die Auswahl lebt in der neuen Oberfläche).
- Blockiert: nichts.
- Mitgenutzt und unverändert: I0006 (Diff-Zeilen), I0022 (ganze Datei), I0029/I0030 (Rohbytes und Sperre), I0010 (Zuordnung in „Zusammen“), I0020 (dasselbe Ergebnis), I0011 (VS-Code-Link), I0015 (Tastenkatalog).
- **Vorgabe an I0015** (R00030, nicht Abnahme dieser Karte): `Umschalt+↑`/`Umschalt+↓` erweitern den markierten Bereich um die Nachbarzeile; der Eintrag steht im Katalog und in der Hilfe.
- **Vorgabe an I0011** (R00021, nicht Abnahme dieser Karte): der VS-Code-Link einer Bereichsanmerkung öffnet ihren **Anfang** `von`.
- **Vorgabe an I0023/I0024** (R00018/R00019): eine Bereichsanmerkung wird wie jede Anmerkung über die stabile Nummer geändert und gelöscht; nur der Text ist änderbar, die Stelle (Bereich) bleibt.

## Offene Fragen

Offen beim product-owner (Format: Betreiber, weil es der Vertrag mit der KI ist, R00002):

1. **Zitat der markierten Zeilen: ja/nein und Form?** Empfehlung: **ja**, höchstens 20 Zeilen je Bereich (danach `… (k weitere Zeilen)`), je Zeile `    <Nummer neu>: <Text>`, zwischen `Commit:` und dem Textzitat; Einzelzeile und Dateianmerkung unverändert. Alternative: **kein** Zitat — dann entfällt der neue Lesepfad und der Vertrag bleibt kleiner; die KI liest den Bereich selbst (`git show <commit>:<datei>`). Begründung unten.
2. **Grenze des Bereichs**: Empfehlung: beide Enden mit Nummer neu im **selben Abschnitt und Commit**; eine zugeklappte Lücke (R00026) und eine Commit-Grenze werden nie überschritten; entfernte Zeilen sind keine Grenzen; Anker = Ziel ergibt eine Einzelzeile.
3. **Auswahl**: Empfehlung: Klick setzt den Anker, Umschalt-Klick oder Ziehen erweitert; der Tastaturweg `Umschalt+↑`/`Umschalt+↓` gehört zu I0015.
4. **Anzeige**: Empfehlung: markierte Zeilen hervorgehoben (nicht allein Farbe), Anmerkung unter dem Bereichsende, mehrere und überlappende Bereiche erlaubt, Hinweis „außerhalb“ mit Commit und Bereich.
5. **VS-Code-Link**: Empfehlung: auf den Bereichsanfang `von` (Vorgabe an I0011).

Ohne Rückfrage entschieden (Empfehlung des planers, gilt bis zur Antwort): derselbe `POST /api/anmerkungen` mit `von`/`bis` (kein eigener Endpunkt, kein eigener Interactor); `zeile` und `von`/`bis` schließen sich aus; Sperre und Ergebnis über denselben kanonischen Anzeigenamen; Nummer aus demselben Zähler; `GET` nennt `von`/`bis`; fremder Text nur per `textContent` und im Zitat mit Marken; die Grundform `<Datei>:<von>` bleibt für Leser von `:10` gültig.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00004/R00008/R00010/R00012 hinaus (die Wegwerf-Repos legen die Tests an).

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unterhalb I0032 (B3001–B3008), davon 2 klar (2 h) und 6 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 28 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,25 h je Bubble; mit einem gemessenen Slice rechne ich noch nicht um. Enthalten: nur I0032; die Vorgaben an I0011 und I0015 sind nicht gezählt. Keine Ausbaustufen. Der Slice liegt mit acht Bubbles an der Grenze; der Ausweg im Bau ist der Schnitt „Auswahl und Anzeige“ gegen „Ergebnis und Zitat“ (B3006/B3007 als eigene Interaction abspalten, Schnittmuster Schnittstellen).

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: der prüfende Mensch sieht, dass eine ganze Funktion falsch ist, und kann heute nur eine Zeile anmerken; die KI bekommt dann einen Satz an einer Zeile und weiß nicht, worüber er gilt, oder einen Satz mit abgetippten Zeilennummern, die bei jeder Änderung verrutschen. Zielbild ist ein Rückkanal, der die Stelle so genau nennt, wie der Mensch sie meint. Wenn ein Zug oder zwei Klicks einen zusammenhängenden Bereich markieren, das Notizfeld unter dem Bereichsende aufgeht und „Beenden“ die Anmerkung als `<Datei>:<von>-<bis>` mit dem Text (und, wenn entschieden, den ersten Zeilen daraus) auf stdout schreibt, dann liest die KI die Funktion im Stand nach dem Commit, auf den sie ohnehin zugreift. Gerade dieser Schritt ist der Hebel, weil er die vorhandene Stellenangabe nur um eine zweite Nummer erweitert: derselbe Endpunkt, dieselbe Sperre, derselbe Zähler, dasselbe Ergebnisformat — kein zweiter Weg und keine zweite Wahrheit. Die Grenzen (ein Abschnitt, ein Commit, Nummer neu) halten den Bereich ehrlich: er enthält nur Zeilen, die der Mensch gesehen hat, und die Sperre (R00014) verhindert, dass eine Anmerkung an eine unlesbare Stelle geht.

## Missing-Docs

- Ob ein Zitat aus `git cat-file --batch` mit der Ausgabegrenze und dem Abbruch beim Erreichen des Dateiendes genau die Zeilen `von..bis` liefert (Zeilenende, letzte Zeile ohne LF) — vor dem Bauen mit einem kleinen Versuch belegen.
- „Beenden“ mit 500 Bereichsanmerkungen ≤ 1 s (R00002) bei gelesenen Zitaten — beim Bauen messen; ob das Zitat dann je (Commit, Datei) oder je Anmerkung fällt, entscheidet die Messung.

## Notizen

### Optionen (Form der Stellenangabe)

| Option | Verträglichkeit mit den Lesern von `:10` | Kürze | Risiko |
|---|---|---|---|
| **1. `<Datei>:<von>-<bis>` (gewählt)** | erhält durch `<Datei>:<von>` die Zahl `von`; das `-<bis>` ist ein Anhang | kurz, ein Muster | gering: `-` ist im Dateinamen möglich, aber die Trennung liegt vor der Zahl am Ende |
| 2. `<Datei>:<von>..<bis>` | erhält die Zahl; `..` ist git-Sprache (`rev-list`) | kurz | verwechselbar mit einer git-Revision |
| 3. `<Datei>:<von>+<spanne>` | erhält die Zahl | kurz | die zweite Zahl ist keine Zeile, sondern eine Länge — mehr Rechnung beim Leser |
| 4. Eigene Zeile `Zeilen: 3-7` | Titel bleibt `<Datei>:<von>` | zwei Zeilen je Anmerkung | das Format wächst an einer zweiten Stelle; die Stelle steht getrennt |

Gewählt: 1 — die kleinste Erweiterung des vorhandenen Formulars, die Leser von `<Datei>:<Zeile>` behält.

### Optionen (Zitat der markierten Zeilen)

| Option | Selbst-Enthaltenheit für die KI | Vertrag/Last | Risiko |
|---|---|---|---|
| **1. Zitat, auf 20 Zeilen begrenzt (Empfehlung)** | hoch: der Bereich steht im Ergebnis, ohne `git` | ein neuer Lesepfad (Ausgabegrenze, Namensprüfung), Lastprofil zu messen | das Zitat ist gekürzt und damit nicht die ganze Funktion |
| 2. Kein Zitat | der Leser liest den Bereich selbst (`git show <commit>:<datei>`) | kein neuer Lesepfad, kein neues Format-Element | in „Zusammen“ netto muss die KI den Netto-Stand selbst rekonstruieren |
| 3. Zitat ohne Grenze | hoch | stdout kann um Megabyte wachsen (20 000 Zeilen je Datei) | widerspricht der knappen Ausgabe |

Empfehlung 1 mit der Alternative 2; die Entscheidung gehört dem Betreiber (Format des Rückkanals).

### Verworfene Alternativen

- Ein zweiter Endpunkt oder ein zweiter Interactor für Bereiche: verworfen — die Bereichsanmerkung ist dieselbe Anmerkung mit zwei Nummern (Schnittmuster „Schnittstellen“: kein neuer Weg).
- Schichtenschnitt „Datenmodell/Endpunkt/Oberfläche“ als eigene Slices: verworfen — schneidet nach Schichten, ein Slice.
- Bereich über mehrere Commits: verworfen — das Ergebnis hat eine `Commit:`-Zeile.
- „Nur der Bereichsanfang wird gespeichert“: verworfen — die zweite Nummer ist die Aussage.
- Markdown im Anmerkungstext: verworfen (wie R00010).
