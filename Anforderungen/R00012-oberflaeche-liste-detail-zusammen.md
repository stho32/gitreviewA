---
id: R00012
status: Neu
datum: 2026-11-24
---

# R00012: Oberfläche Liste–Detail (Zusammen als Standard)

## Beschreibung

Nach dem Start sieht der prüfende Mensch links die Liste der Dateien der **ganzen Auswahl** (jede Datei einmal) und rechts den Diff der gewählten Datei in voller Höhe. Der Modus „Zusammen“ ist der Standard: der Diff ist netto über alle Commits der Auswahl, wo sie eine lückenlose Kette bilden, sonst stehen die Änderungen je Commit beschriftet; die Commits sind nur eine zugeklappte, schmale Zeile oben über der Dateiliste. „Einzeln“ ist ein bewusster Wechsel und geht Commit für Commit durch: ein Commit-Wähler wählt den Commit, die Dateiliste zeigt seine Dateien. Im Kopf steht der Fortschritt, in „Zusammen“ je Datei („7 von 17 Dateien abgehakt“), in „Einzeln“ je Stelle (Commit und Datei, „9 von 23 Stellen abgehakt“). Haken und Anmerken gehen in beiden Modi; „Zusammen“ ist eine Sicht auf dieselben Stellen, nichts wird doppelt gespeichert. Jeder Zustand der Diff-Fläche (leer, binär, Fehler, keine lückenlose Kette) sagt, was los ist und was als Nächstes geht.

Zahlt ein auf: [Vision](R00000-vision.md) — „Einzeln oder zusammen“ und „Zusammen ist der Standard, die Dateien führen“ (Ergänzung 2026-11-24), „Checkliste im Kopf entlasten“, „Anmerkungen an Stellen“ und die Leitplanken Lastprofil und „stdout gehört allein dem Ergebnis“.

Baut auf auf: [R00003](R00003-commits-und-dateien-sehen.md) (Commit-Leiste, Dateiliste, Baum/flach), [R00004](R00004-diff-einer-datei-lesen.md) (Diff-Bereich, Zustände), [R00008](R00008-ganze-datei-mit-diff.md) (Ansicht „ganze Datei“), [R00010](R00010-zeile-annotieren.md) (Anmerken, Hinweis außerhalb der Ansicht), [R00011](R00011-datei-abhaken.md) (Stellen, Haken, Stand, Ergebnisabschnitt), [R00002](R00002-beenden-mit-ergebnis.md) (Ergebnisformat, „Beenden“).

**Voraussetzung aus I0010 „Zusammen: Logik und Server“** (eigene Karte, hier keine Kriterien dafür): die Schnittstelle liefert für die Auswahl, ob die Commits eine lückenlose Kette bilden (festgelegt, product-owner 2026-11-24, Frage 7: nach Eltern geordnet ein durchgehender Pfad über erste Elternteile, unabhängig von der Reihenfolge im Aufruf; netto gegen den Elternstand des ältesten Commits, bei einer Wurzel gegen leer; alles andere gilt als „nicht lückenlos“ und wird je Commit beschriftet); die Netto-Dateiliste (je Datei einmal, mit den Commits, die sie ändern); je Datei den Netto-Diff, ohne Kette Abschnitte je Commit; einen Haken je Datei als **eine** atomare Anfrage, die alle Stellen der Datei setzt oder nimmt; und die Zuordnung einer Anmerkung in „Zusammen“ zum jüngsten Commit der Auswahl, der die Datei ändert (ohne Kette: Commit des Abschnitts). Diese Anforderung prüft nur, was die Oberfläche daraus macht.

**Wireframe mit Vorrang (Entscheidung des product-owner 2026-11-24):** [Entwurf Fassung 2](../Dokumentation/Wireframes/oberflaeche-fassung-2.html) — vom Betreiber abgenommen. Gilt für: Hauptbildschirm („Zusammen“, Datei gewählt), „Einzeln“ mit Wähler und Commit-Menü, „Zusammen“ mit aufgeklappten Commits und die Zustände der Diff-Fläche. Wo der Entwurf schweigt, gelten Material 3 und die Gestaltung aus kanbanD. **Gezeichnet wird nur, was gebaut ist** — nicht Teil dieser Anforderung, auch wenn der Entwurf es zeigt: „Datei anmerken“ (I0018), „nebeneinander“ (I0007), „In VS Code“ (I0011), „Nächste ungeprüfte“ (I0025), „Abgehakte ausblenden“ (I0026), „Abbrechen“ und die Bestätigung von „Beenden“ samt Zahl am Knopf (I0028), „Trotzdem laden“ (I0014), „Als Text zeigen“ (I0012) und die Dateigrößen bei Binärdateien (eigene Karte „Dateigrößen bei Binärdateien“, noch anzulegen), Tastenkürzel an den Bedienelementen, Statuszeile mit Kürzeln, „Abschnitt n von m“ und Hilfe `?` (I0015), die Ausgabe von `git` im Fehlerzustand, die Anmerkungszahl je Datei in der Liste. Bis I0028 bleibt „Beenden“ wie in R00002 (ohne Bestätigung).

**Ablösung:** Wortlaut und Ort der Fortschrittszeile aus R00011 („n von m abgehakt“ über der Dateiliste) werden durch den Kopf dieser Anforderung abgelöst; Stellen, Zählung je Stelle in „Einzeln“, Stand und Ergebnisabschnitt bleiben. Die Commit-Leiste aus R00003 ist jetzt die aufgeklappte Commit-Zeile (gleicher Inhalt: Kurz-Hash, Autor, Datum, Betreff, Message).

## Geschäftlicher Nutzen

Die KI hat bis zu 200 Commits geschrieben; der Mensch will die Dateien prüfen, nicht die Commits abzählen. Heute liegt die Commit-Liste über dem Diff und schiebt ihn an den unteren Rand; er muss pro Datei den Commit wählen, in dem sie vorkommt, und dieselbe Datei in mehreren Commits mehrfach lesen und abhaken. Mit den Dateien vorn, einem Netto-Diff je Datei und einem Haken je Datei sieht er jede Datei einmal, und nur wer einzelne Commits durchgehen will, wechselt bewusst auf „Einzeln“.

## Funktionale Anforderungen

- **Aufbau**: Kopf (Name der Anwendung „gitreviewA“, kein Name des Repositories — `GET /api/zustand` liefert nur Zustand und Zahl der Commits —, „n Commits · m Dateien“, Umschalter „Zusammen“/„Einzeln“, Fortschritt, „Beenden“), links die Commit-Zeile oben, schmal über der Dateiliste (wie im Entwurf Fassung 2; „die Dateien führen“ heißt Standardmodus und Höhe, nicht die Reihenfolge von oben nach unten), darunter die Dateiliste, rechts der Diff-Bereich in voller Höhe (Liste–Detail). Beim Start gilt „Zusammen“; der Modus ist ein Zustand der Seite (Neuladen: wieder „Zusammen“), nichts wird gespeichert.
- **Zusammen**: Die Dateiliste zeigt jede Datei der Auswahl einmal (Status, Pfad, `+`/`−` mit Balken, Summe, flach oder Baum wie R00003). Die Wahl einer Datei lädt ihren Diff erst dann (nie vorab). Bilden die Commits eine lückenlose Kette, zeigt der Diff-Bereich den Netto-Diff und der Diff-Kopf nennt die Commits, aus denen er stammt („netto aus …“). Sonst stehen die Änderungen je Commit als Abschnitte mit Kurz-Hash und Betreff, und der Kopf sagt „je Commit, nicht netto“ mit dem Grund.
- **Commit-Zeile**: steht oben, eine Zeile hoch, über der Dateiliste; zugeklappt „n Commits · <erster> … <letzter> · lückenlos · netto“ bzw. „… · keine lückenlose Kette · je Commit“ (erster und letzter in der Reihenfolge des Aufrufs); aufgeklappt je Commit Kurz-Hash, Autor, Datum, Betreff und die ausklappbare Message wie in R00003.
- **Einzeln**: Der Commit-Wähler zeigt „k/n“, Kurz-Hash, Betreff, Autor, Zeit und die ausklappbare Message des gewählten Commits; „zurück“ und „weiter“ wechseln ihn (an den Enden gesperrt), ein Menü nennt alle Commits mit den abgehakten Stellen je Commit („a von b“) und springt direkt zu einem Commit. Die Dateiliste zeigt die Dateien des gewählten Commits wie R00003, der Diff ist der des Commits wie R00004.
- **Moduswechsel**: Die gewählte Datei bleibt gewählt, wenn sie in der neuen Sicht vorkommt (in „Einzeln“: im gewählten Commit), sonst wird die erste Datei der Liste gewählt (gibt es keine Datei, steht „Keine Dateien geändert“). Der erste Wechsel auf „Einzeln“ wählt den ersten Commit der Auswahl, spätere Wechsel den zuletzt dort gewählten. Umbruch, Ansicht („nur Änderungen“/„ganze Datei“) und Darstellung der Liste (flach/Baum) bleiben.
- **Haken**: In „Zusammen“ gilt der Haken je Datei: er setzt oder nimmt alle Stellen der Datei mit **einer** Anfrage; die Datei zeigt „abgehakt“, wenn alle ihre Stellen abgehakt sind, „teilweise“ bei einem Teil (zählt nicht als abgehakt; ein Klick darauf setzt alle Stellen). In „Einzeln“ gilt er je Stelle. Der Haken steht in der Dateiliste und im Diff-Kopf der gewählten Datei (kommt in dieser Karte); beide zeigen denselben Zustand — in „Zusammen“ als Stapel je Datei, in „Einzeln“ je Stelle — und es gibt nur eine Zustandsquelle. Der Kopf zählt in „Zusammen“ Dateien („n von m Dateien abgehakt“), in „Einzeln“ Stellen („n von m Stellen abgehakt“), mit Balken. Das Ergebnis (`## Dateien`, R00011) bleibt je Stelle in beiden Modi.
- **Anmerken**: Ein Klick auf eine Zeile des Netto-Diffs legt die Anmerkung an der Stelle an, die die Schnittstelle zuordnet (jüngster Commit der Auswahl, der die Datei ändert; ohne Kette der Commit des Abschnitts); das Ergebnisformat von R00002 bleibt Byte für Byte gleich. Eine Anmerkung steht bei ihrem Commit unter ihrer Zeile; „ihr Commit“ ist in „Zusammen“ der zugeordnete (jüngster ändernder Commit, ohne Kette der Commit des Abschnitts), in „Einzeln“ der gewählte. Gehört sie in der gezeigten Ansicht zu einem anderen Commit **derselben Datei**, steht sie nicht an einer geratenen Zeile, sondern im Hinweis über dem Diff („Anmerkung an einer Zeile, die diese Ansicht nicht zeigt“) mit Commit und Zeile — in beiden Richtungen und in beiden Modi; keine Anmerkung verschwindet stumm. Entfernte Zeilen sind weiter nicht anmerkbar (Hinweis wie R00010).
- **Zustände** der Diff-Fläche nennen, was los ist, und den Weg weiter; Haken, Moduswechsel und die übrigen Dateien bleiben bedienbar: leer („Datei wählen, um ihren Diff zu sehen“), Binärdatei („Binärdatei“, R00004), Fehler („Diff konnte nicht gelesen werden“ mit „Erneut laden“), keine lückenlose Kette (Abschnitte je Commit), keine Dateien („Keine Dateien geändert“, „Keine Dateien zum Abhaken“).
- **Bedienung**: Mit Maus und Tab-Fokus erreichbar und bedienbar; die Tastenkürzel (`m`, `[`, `]`, `u`, `x`, …) gehören zu I0015.

## Nicht-funktionale Anforderungen

- Performance (Lastprofil der Vision): Bei 2 000 geänderten Dateien steht die Dateiliste in „Zusammen“ spätestens 1 s nach dem Laden der Seite, der Wechsel des Modus (hin und zurück) und der Haken je Datei wirken spätestens 1 s nach der Betätigung. Der Entwickler misst und hält mindestens 30 % Abstand (Messwert ≤ 0,7 s); liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium. Die Kriterien der Serverlogik (Netto-Diff bis 20 000 Zeilen je Datei) gehören zu I0010.
- Sicherheit: Alles aus dem fremden Repository (Pfade, Betreffe, Autoren, Messages) erscheint nur als Text (`textContent`, nie HTML); unsichtbare und richtungsändernde Zeichen in Namen erscheinen in der Oberfläche und im Ergebnis als Marke `⟨U+202E⟩` mit derselben Klasse wie bisher (`Fremdtext/UnsichtbareZeichen`, keine zweite Zeichenliste). Fehler zeigen nie die Ausgabe von `git`. Der Anfrageschutz für das Setzen von Haken und Anmerkungen bleibt wie in R00002 und R00011.
- Logging: stdout bleibt bis „Beenden“ leer; je Anfrage eine Debug-Zeile auf stderr (beim Haken je Datei: Pfad mit Marken und Zahl der Stellen); Fehler als Error mit Kontext.
- Benutzerfreundlichkeit: Entwurf Fassung 2 mit Vorrang, sonst Material 3 und kanbanD; jedes Bedienelement trägt einen Namen, der mit dem sichtbaren Text beginnt; Zustände ohne Sackgasse.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** im Wegwerf-Ordner (nie das Projekt-Repo): `z1` „Start“ legt `README.md` (`Lager`, `Beispiel`) und `src/a.txt` (`eins`, `zwei`, `drei`) an; `z2` „a ändern, b neu“ ändert in `src/a.txt` die Zeile `zwei` zu `ZWEI` und legt `src/b.txt` (`x`, `y`) an; `z3` „a und b ändern“ hängt in `src/a.txt` die Zeile `vier` an und ändert in `src/b.txt` `y` zu `Y`. `z1` ist ein Wurzelcommit; `z1 z2 z3` bilden eine lückenlose Kette, `z1 z3` nicht. **Netto** über alle drei: `README.md` +2 −0, `src/a.txt` +4 −0 (`eins`, `ZWEI`, `drei`, `vier`), `src/b.txt` +2 −0 (`x`, `Y`); **je Commit** wären es in `src/a.txt` +3, +1 −1 und +1. **Stellen**: `z1` 2 (`README.md`, `src/a.txt`), `z2` 2 (`src/a.txt`, `src/b.txt`), `z3` 2 (`src/a.txt`, `src/b.txt`), zusammen 6 bei 3 Dateien. Aufruf `gitreviewA <Hashes> --kein-browser`, Seite über die Startzeile, Fenster 1280 × 800. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Hot Path (Playwright): Kriterien 1, 3 und 13 als ein durchgehender Ablauf (Aufruf → Datei → Diff → Zeile annotieren → Beenden).

### Zusammen als Standard
- [ ] 1. Gegeben `gitreviewA z1 z2 z3`, wenn die Seite geladen ist, dann ist der Modus „Zusammen“ gewählt, die Dateiliste nennt die drei Dateien der ganzen Auswahl je einmal (`README.md` +2 −0, `src/a.txt` +4 −0, `src/b.txt` +2 −0), im Kopf stehen „3 Commits · 3 Dateien“ und „0 von 3 Dateien abgehakt“, der Diff-Bereich sagt „Datei wählen, um ihren Diff zu sehen“, und es wurde noch kein Diff angefragt. *Ebene: E2E (Hot Path, Start in „Zusammen“) und Oberfläche (Zählzeile, keine Anfrage).*
- [ ] 2. Gegeben dasselbe, wenn man die Commit-Zeile ansieht, dann steht die Zeile oben, eine Zeile hoch, über der Dateiliste (auf dem Bildschirm und im Dokument vor ihr), zugeklappt „3 Commits“, die Kurz-Hashes von `z1` und `z3` und „lückenlos · netto“; klappt man sie auf, stehen die drei Commits in der Reihenfolge des Aufrufs mit Kurz-Hash, Autor, Datum und Betreff, die Message eines Commits mit Rumpf lässt sich aus- und einklappen, Dateiliste und Wahl bleiben unverändert, und Zuklappen stellt die Zeile wieder her. *Ebene: Oberfläche.*
- [ ] 3. Gegeben `z1 z2 z3` in „Zusammen“, wenn man `src/a.txt` wählt, dann zeigt der Diff-Bereich einen Diff über alle drei Commits mit vier hinzugefügten Zeilen (`eins`, `ZWEI`, `drei`, `vier`) und keiner entfernten — die Zeile `zwei` aus `z1` kommt nicht vor —, und der Kopf nennt „netto aus“ mit den Kurz-Hashes von `z1`, `z2` und `z3`. Rechnung: je Commit +3, +1 −1, +1 ergäben +5 −1, netto sind es +4 −0. *Ebene: Oberfläche (die Rechnung des Netto-Diffs prüft I0010) und E2E im Hot Path.*
- [ ] 4. Gegeben `gitreviewA z1 z3` (`z2` fehlt), wenn man `src/a.txt` wählt, dann zeigt die Commit-Zeile „keine lückenlose Kette · je Commit“, der Diff-Bereich zwei Abschnitte, `z1` (+3 −0) und `z3` (+1 −0), jeder mit Kurz-Hash und Betreff beschriftet, und der Kopf sagt „je Commit, nicht netto“ mit dem Grund „Es fehlen Commits der Auswahl“; Haken, Anmerken und Moduswechsel bleiben bedienbar. *Ebene: Oberfläche.*

### Einzeln mit Commit-Wähler
- [ ] 5. Gegeben `z1 z2 z3` in „Zusammen“ mit `src/a.txt` gewählt, wenn man auf „Einzeln“ wechselt, dann zeigt der Commit-Wähler „1/3“ mit Kurz-Hash, Betreff, Autor und Zeit von `z1`, die Dateiliste die zwei Dateien von `z1` (`README.md` +2 −0, `src/a.txt` +3 −0), `src/a.txt` bleibt gewählt und zeigt den Diff von `z1` (+3 −0); der Wechsel zurück zeigt wieder den Netto-Diff (+4 −0) derselben Datei. War stattdessen `src/b.txt` gewählt, dann ist nach dem Wechsel auf „Einzeln“ die erste Datei der Liste gewählt (`README.md`, denn `z1` ändert `src/b.txt` nicht) und zeigt ihren Diff von `z1` (+2 −0). *Ebene: Unit (Wahl übernehmen) und Oberfläche.*
- [ ] 6. Gegeben „Einzeln“ mit `z1` gewählt, wenn man „weiter“ betätigt, dann steht „2/3“ mit `z2`, die Dateiliste zeigt `src/a.txt` und `src/b.txt`, und „zurück“ führt zu „1/3“; bei `z1` ist „zurück“, bei `z3` ist „weiter“ nicht bedienbar; das Menü des Wählers nennt alle drei Commits mit Betreff und „0 von 2“ je Commit und springt bei der Wahl von `z3` direkt zu „3/3“; wechselt man den Commit, während die Dateiliste noch lädt (Antwort um 1,5 s verzögert), zeigt sie am Ende die Dateien des zuletzt gewählten Commits; wechselt man danach auf „Zusammen“ und wieder auf „Einzeln“, steht wieder „3/3“ (spätere Wechsel wählen den zuletzt gewählten Commit). *Ebene: Oberfläche (verzögerter Fake).*

### Haken und Fortschritt je Modus
- [ ] 7. Gegeben „Zusammen“ ohne Haken, wenn man `src/a.txt` abhakt — in der Dateiliste oder im Diff-Kopf der gewählten Datei —, dann steht im Kopf „1 von 3 Dateien abgehakt“, beide Kästchen der Datei zeigen „abgehakt“, und die Oberfläche hat genau **eine** Anfrage gestellt, die alle drei Stellen von `src/a.txt` (`z1`, `z2`, `z3`) setzt; nimmt man den Haken weg, steht „0 von 3 Dateien abgehakt“. *Ebene: Oberfläche (Zahl der Anfragen; die Atomarität prüft I0010).*
- [ ] 8. Gegeben `src/a.txt` in „Zusammen“ abgehakt, wenn man auf „Einzeln“ wechselt, dann steht im Kopf „3 von 6 Stellen abgehakt“, `src/a.txt` ist in `z1`, `z2` und `z3` abgehakt und `src/b.txt` in `z2` nicht (Dateiliste und Diff-Kopf zeigen je Stelle dasselbe); hakt man `src/b.txt` bei `z2` ab, steht „4 von 6 Stellen abgehakt“, und das Menü nennt `z1` „1 von 2“, `z2` „2 von 2“, `z3` „1 von 2“. *Ebene: Unit (Zähler je Modus und je Commit) und Oberfläche.*
- [ ] 9. Gegeben `src/a.txt` abgehakt und `src/b.txt` nur bei `z2` (4 von 6 Stellen), wenn man auf „Zusammen“ wechselt, dann steht „1 von 3 Dateien abgehakt“ und `src/b.txt` zeigt „teilweise“ und zählt nicht; ein Klick darauf setzt `z2` und `z3` („2 von 3 Dateien“, in „Einzeln“ „5 von 6 Stellen“), ein weiterer nimmt beide weg („1 von 3“, „3 von 6“). Rechnung: 3 Stellen von `src/a.txt` plus 2 von `src/b.txt` ergeben 5. *Ebene: Unit (Zustand je Datei: abgehakt, teilweise, nein; jede Datei in beiden Modi abgetastet) und Oberfläche.*
- [ ] 10. Gegeben `src/a.txt` in „Zusammen“ abgehakt und keine Anmerkung, wenn beendet wird, dann nennt das Ergebnis im Abschnitt `## Dateien` „Abgehakt: 3 von 6“ mit drei Zeilen `src/a.txt` für `z1`, `z2`, `z3` (volle Hashes, Reihenfolge der Auswahl) und „Ungeprüft: 3 von 6“ mit `README.md` (`z1`), `src/b.txt` (`z2`) und `src/b.txt` (`z3`) — je Stelle, nicht je Datei. *Ebene: Integration (Programm: Haken über die Oberfläche, Beenden, stdout).*
- [ ] 11. Gegeben die Antwort auf das Abhaken kommt mit 500 (oder gar nicht), wenn man `src/a.txt` in „Zusammen“ abhakt, dann springt das Kästchen zurück auf „nicht abgehakt“, der Zähler bleibt „0 von 3 Dateien“, neben ihm steht „Haken konnte nicht gespeichert werden“, und keine der drei Stellen ist gesetzt; kommt die Antwort um 1,5 s verzögert und betätigt man währenddessen das Kästchen zweimal kurz hintereinander und wechselt den Modus, ist am Ende genau ein Zustand gespeichert (der zuletzt gewünschte), und beide Modi zeigen ihn. *Ebene: E2E (Fehlerpfad durch die Oberfläche, Antworten per `route`, verzögerter Fake — Browser-Eigenes).*
- [ ] 12. Gegeben der Stand der Haken lässt sich nicht lesen (500), wenn die Seite geladen ist, dann steht statt des Zählers „Fortschritt konnte nicht gelesen werden“, die Kästchen sind nicht bedienbar, Dateiliste, Diff und Moduswechsel bleiben bedienbar, nach dem Neuladen wird erneut gelesen, und „Beenden“ liefert das Ergebnis ohne Abschnitt `## Dateien`. *Ebene: Oberfläche (Fake, der wirft) und E2E (Darstellung per `route`).*

### Anmerken in „Zusammen“
- [ ] 13. Gegeben `z1 z2 z3` in „Zusammen“, wenn man in `src/a.txt` Zeile 4 (`vier`) mit dem Text „Prüfen“ und in `README.md` Zeile 2 (`Beispiel`) mit dem Text „Name“ anmerkt und beendet, dann steht jede Anmerkung unter ihrer Zeile, und das Ergebnis enthält `## 1. src/a.txt:4` mit `Commit: <voller Hash von z3>` und `## 2. README.md:2` mit `Commit: <voller Hash von z1>`; `z3` ist der jüngste Commit der Auswahl, der `src/a.txt` ändert, `z1` der einzige, der `README.md` ändert (der letzte Commit der Auswahl, `z3`, berührt `README.md` nicht); das Format entspricht Byte für Byte R00002. *Ebene: Integration (Programm: Ergebnis auf stdout) und E2E (Hot Path).*
- [ ] 14. Gegeben `z1 z3` (keine Kette), wenn man in `src/a.txt` im Abschnitt von `z1` Zeile 1 und im Abschnitt von `z3` Zeile 4 anmerkt, dann nennt das Ergebnis `Commit:` `z1` bzw. `z3`; die entfernte Zeile `y` im Abschnitt von `z3` in `src/b.txt` lässt sich nicht anmerken, es erscheint kein Notizfeld, sondern der Hinweis aus R00010. *Ebene: Oberfläche und Integration (Programm).*
- [ ] 15. Gegeben `z1 z2 z3` und in „Einzeln“ bei `z2` an `src/a.txt` Zeile 2 (`ZWEI`) die Anmerkung „Warum groß?“ angelegt, wenn man auf „Zusammen“ wechselt und `src/a.txt` wählt, dann steht sie nicht unter einer Zeile — obwohl der Netto-Diff eine Zeile 2 hat —, sondern über dem Diff steht „1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Commit <Kurz-Hash von z2>, Zeile 2“. Umgekehrt: Die in „Zusammen“ an Zeile 4 angelegte Anmerkung (Commit `z3`) steht in „Einzeln“ bei `z3` unter Zeile 4; bei `z2` (ebenfalls `src/a.txt`) steht sie nicht unter einer Zeile, sondern im Hinweis „1 Anmerkung an einer Zeile, die diese Ansicht nicht zeigt: Commit <Kurz-Hash von z3>, Zeile 4“; bei `z1` ebenso; in einem Commit, der `src/a.txt` nicht ändert, ist die Datei nicht gewählt und es gibt keinen Hinweis. Beide Anmerkungen bleiben im Ergebnis unverändert (`Commit:` `z2` bzw. `z3`). *Ebene: Unit (Zuordnung Anmerkung → unter Zeile oder Hinweis je Ansicht, beide Richtungen, mit und ohne Kette) und Oberfläche.*

### Zustände mit Ausweg
- [ ] 16. Gegeben (a) in „Zusammen“ noch keine Datei gewählt, (b) die Binärdatei `logo.bin` des Repos aus R00003 gewählt (`gitreviewA p q r`), (c) der Diff lässt sich nicht lesen (Antwort 500), (d) `gitreviewA r` mit dem leeren Commit, dann sagt der Diff-Bereich in jedem Fall, was los ist, und nennt den Weg weiter — (a) „Datei wählen, um ihren Diff zu sehen“, (b) „Binärdatei“ statt Zeilen, (c) „Diff konnte nicht gelesen werden“ mit „Erneut laden“, das beim nächsten Versuch mit Erfolg den Diff zeigt, (d) in der Dateiliste „Keine Dateien geändert“ und im Kopf „Keine Dateien zum Abhaken“ —; Dateiliste, Haken (außer in (d)), Moduswechsel und bereits angelegte Anmerkungen bleiben in jedem Fall erhalten, und keine Meldung gibt Ausgabe von `git` wieder. *Ebene: Oberfläche und E2E (Fehler per `route`, Browser-Eigenes).*

### Bedienung und Sicherheit
- [ ] 17. Gegeben `z1 z2 z3`, nur Tastatur (Tab, Enter, Leertaste), wenn man durch die Oberfläche geht, dann sind der Umschalter „Zusammen“/„Einzeln“, das Auf- und Zuklappen der Commit-Zeile, die Dateiliste, die Kästchen, im Modus „Einzeln“ der Wähler samt Menü und das Notizfeld erreichbar und bedienbar; jedes Bedienelement trägt einen Namen, der mit dem sichtbaren Text beginnt (etwa „Abgehakt: src/a.txt“); der Fokus bleibt nach Haken, Moduswechsel und Schließen des Menüs auf dem betätigten Element. *Ebene: E2E (Tastatur, Fokus — Browser-Eigenes).*
- [ ] 18. Gegeben ein Repo mit dem Commit `y` mit Betreff `<b>fett</b>` und einer Datei, deren Name `<b>x</b>`, U+202E, U+200B und U+E0041 enthält (herstellbar mit `printf`), wenn man `gitreviewA y` öffnet, die Datei wählt, abhakt und anmerkt und beendet, dann stehen Betreff und Name als sichtbarer Text da (mit spitzen Klammern, nicht fett, ohne Dialog), die drei Zeichen erscheinen in Dateiliste, Diff-Kopf und Kästchenname als Marken `⟨U+202E⟩`, `⟨U+200B⟩`, `⟨U+E0041⟩`, und derselbe Name steht mit denselben Marken im Ergebnis. *Ebene: E2E (DOM-Sicherheit, Browser-Eigenes) und Integration (Ergebnis).*
- [ ] 19. Gegeben ein Commit mit 2 000 hinzugefügten Dateien (je 1 Zeile), wenn die Seite geladen ist, dann steht die Dateiliste in „Zusammen“ spätestens 1 s später, der Wechsel auf „Einzeln“ und zurück wirkt je spätestens 1 s nach der Betätigung, und ein Haken zeigt spätestens 1 s später „1 von 2000 Dateien abgehakt“ (ereignisgenau gemessen, Messwerte ≤ 0,7 s). *Ebene: E2E (Zeit nur im Browser messbar).*

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md): Oberfläche unter `src/GitReviewA/web/`, Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`.

- `web/` — `index.html` (Aufbau Liste–Detail, Kopf), `gitreviewa.css`, `dateiliste.js`, `commits.js`, `diff.js`-Anschluss, `haken.js`, `haken-werte.js`; neu `modus.js` (Zustand), `commit-zeile.js`, `commit-waehler.js`.
- Server: keine Änderung durch diese Anforderung; die Endpunkte der Serverlogik liefert I0010.
- `tests/` und `e2e/` — Treiber und DSL (`modus`, `commitWaehler`, Haken je Modus) auf den vorhandenen Schichten; vorhandene Specs starten in „Einzeln“ bzw. klappen die Commit-Zeile auf.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Der Entwurf liegt unter `Dokumentation/Wireframes/oberflaeche-fassung-2.html` (Verweis, keine Nacherzählung).

### Ablauf

1. **Rahmen** — Seitenaufbau Liste–Detail, Kopf mit Umschalter; Zustand `Modus` (Start „Zusammen“, erst in der letzten Bubble; bis dahin bleiben die vorhandenen Tests grün)
2. **Dateiliste nach Modus** — Netto-Liste (I0010) bzw. Liste des Commits (R00003); Wahl `(Pfad)` bzw. `(Commit, Pfad)`; Wahl beim Moduswechsel übernehmen
3. **Commit-Zeile** und **Commit-Wähler** — aus `commits.js`; Menü mit Zähler je Commit
4. **Diff nach Modus** — Netto-Diff bzw. Abschnitte je Commit (I0010), Zustände mit Ausweg, nur zeichnen, wenn (Modus, Commit, Pfad, Ansicht) noch gelten
5. **Haken und Fortschritt** — Stand (R00011) rechnen: je Datei abgehakt/teilweise/nein, Zähler je Modus; Stapel-Anfrage je Datei (I0010) bzw. Anfrage je Stelle
6. **Anmerken** — Zeilenziel trägt den zugeordneten Commit; Hinweis über dem Diff für fremde Commits
7. **Standard „Zusammen“** und E2E; vorhandene Specs auf `einzeln` umstellen

### Grobentwurf

**Einstiegsstellen:** `index.html`, die Ereignisse `datei-gewaehlt` und `diff-gezeichnet`, die vorhandene Hakenzeile, `POST /api/anmerkungen` mit dem zugeordneten Commit.

- `modus.js` (Operation mit Zustand, rein testbar) — `Modus` (`zusammen`, `einzeln`), Wechsel, `uebernehmeWahl(alt, neu, datei, sicht)`.
- `haken-werte.js` (Operation, rein, erweitert) — `Hakensicht` je Modus: Zustand je Datei/Stelle, Zähltext, Balkenanteil, Zähler je Commit.
- `commit-zeile.js`, `commit-waehler.js` (Oberfläche) — Zeile und Wähler aus den Commit-Daten und der Kette.
- `dateiliste.js`, `diff.js`-Anschluss, `haken.js` (Oberfläche, erweitert).

### Änderungen an bestehenden Klassen

Keine Klassen; JavaScript wie oben. `Zeilenziel` (R00010) trägt den zugeordneten Commit statt des gewählten; die Anzeige der Anmerkungen (B0905, B0906) gruppiert nach (Commit, Datei).

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Betreiber-Vorgabe 2026-11-24: Akzeptanzkriterien als Integrationstests, Playwright nur auf dem Hot Path und für Browser-Eigenes. Die Logik dieser Karte liegt in der Oberfläche (die Serverlogik prüft I0010), darum laufen die Integrationstests gegen die Oberfläche mit einem Fake-Server und gegen das Programm als Prozess.

**Unit (rein):** `modus.js` (Wahl übernehmen: Datei in beiden Sichten, nur in einer, in keiner), `haken-werte.js` (0 von 3, 1 von 3, 3 von 6, 4 von 6, teilweise, 0 von 0, 2000; jede Datei in beiden Modi abgetastet), die Zuordnung der Anmerkungen zur Ansicht (unter Zeile oder Hinweis; Kriterium 15, beide Richtungen, mit und ohne Kette).
**Integration:** Oberfläche gegen Fake (Kriterien 2–9, 12, 14–16, darin 15 für den Hinweis in beiden Richtungen, verzögerter Fake für 6); Programm als Prozess (Kriterien 10, 13, 14, 18, Ergebnis Byte für Byte).
**E2E:** Hot Path (Kriterien 1, 3, 13 als ein Ablauf); Browser-Eigenes (Kriterien 11, 16, 17, 18, 19: Fehlerpfade per `route`, Tastatur und Fokus, DOM-Sicherheit, Zeiten ereignisgenau). Wegwerf-Repos: Repo Z, Repo aus R00003 (`p q r`), Repo `y`, Repo mit 2 000 Dateien.

## Abhängigkeiten

- Abhängig von: I0010 Zusammen: Logik und Server (Voraussetzung, noch rot; startet nach #16), I0016 Datei abhaken (R00011), I0006 Diff einer Datei lesen (R00004), I0005 Commits und Dateien sehen (R00003), I0017 Zeile annotieren (R00010), I0019 Beenden mit Ergebnis (R00002).
- Blockiert: I0028 Beenden und Abbrechen im Kopf, I0025 Nächste ungeprüfte Datei, I0026 Abgehakte zuklappen, I0015 Tastaturbedienung. Berührt: R00003 und R00011 (Darstellung abgelöst, Tests werden migriert).

Nicht Teil dieser Anforderung: die Serverlogik (I0010), Tasten (I0015), „Beenden“ und „Abbrechen“ mit Bestätigung (I0028), nächste ungeprüfte und ausblenden (I0025, I0026), Datei anmerken (I0018), nebeneinander (I0007), VS Code (I0011), große Dateien (I0014), Umbenennung und Bilder (I0012).

## Offene Fragen

Keine. Alle acht Fragen sind entschieden und oben eingearbeitet; `AI-Team/po-entscheidungen.md` Zeilen 76–82 meint die Zeilen des Protokolls (Commit 3bdc936).

1. **Lage der Commit-Zeile** — entschieden (Betreiber 2026-11-24, Antwort „1“): oben, schmal über der Dateiliste, wie im Entwurf Fassung 2. „Dateien über den Commits“ meint Vorrang und Höhe, nicht die Reihenfolge von oben nach unten. Eingearbeitet in Beschreibung, Aufbau, Commit-Zeile, Kriterium 2.
2. **Modus nach dem Neuladen** — entschieden (product-owner, Protokoll Zeile 76): wieder „Zusammen“. Aufbau.
3. **Wahl beim Moduswechsel** — entschieden (Zeile 77): die Datei bleibt, wenn sie vorkommt, sonst wird die erste der Liste gewählt (geändert gegenüber der Empfehlung „keine Wahl“); erster Wechsel auf „Einzeln“ wählt den ersten Commit, spätere den zuletzt gewählten. Moduswechsel, Kriterien 5 und 6.
4. **Haken im Diff-Kopf in #27** — entschieden (Zeile 78): kommt in #27, derselbe Zustand wie in der Liste, in „Zusammen“ als Stapel je Datei, in „Einzeln“ je Stelle. Haken, Kriterien 7 und 8.
5. **Anmerkungszahl je Datei** — entschieden (Zeile 79): nicht in #27; der Entwurf zeigt sie noch, #27 lässt sie bewusst weg; kleine Ausbaustufe später (Notiz von I0027 in der WBS).
6. **Name des Repositories im Kopf** — entschieden (Zeile 80): nur, wenn `GET /api/zustand` ihn schon liefert. Geprüft auf main: `ZustandAntwort(Zustand, Commits)` hat kein Namensfeld, also entfällt er; der Kopf trägt den Namen der Anwendung.
7. **Was „lückenlos“ heißt** — entschieden (Zeile 81): siehe Voraussetzung aus I0010; gilt für I0010 und alles, was Netto rechnet.
8. **Anmerkung aus „Zusammen“ in „Einzeln“** — entschieden (Zeile 82, abweichend von der Empfehlung des planers): bei ihrem Commit unter ihrer Zeile, bei anderen Commits derselben Datei im Hinweis über dem Diff mit Commit und Zeile, umgekehrt ebenso. Anmerken, Kriterium 15.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- `AI-Team/factory.md`, Hot Path: in „Zusammen“ entfällt „Commit wählen“ (Director, nach dem Bau).

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unterhalb I0027 (B1101–B1108), davon 2 klar (2 h) und 6 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 28 h. Enthalten: nur I0027. I0010 und I0028 sind nur bis Interaction geplant und nicht gezählt. Nicht beauftragt: Anmerkungszahl je Datei (Ausbaustufe, später), Name des Repositories (`GET /api/zustand` liefert ihn nicht). Die Entscheidungen zu Haken im Diff-Kopf und Anmerkungshinweis bringen Kriterien, aber keine Bubble: sie liegen in B1106 und B1107, die Zählung bleibt bei 8.

## Warum löst diese Anforderung das Problem?

Auslöser: Der Betreiber prüft viele Commits einer KI, will aber Dateien prüfen; die heutige Oberfläche stellt die Commits voran, schiebt den Diff an den unteren Rand und zwingt ihn, dieselbe Datei in jedem Commit einzeln zu lesen und abzuhaken. Das Zielbild ist ein Review, der bei der Datei beginnt. Wenn die Dateien der ganzen Auswahl links führen, der Diff netto über alle Commits rechts die volle Höhe hat und ein Haken je Datei alle ihre Stellen setzt, dann liest und hakt er jede Datei einmal, und weil gespeichert weiter je Stelle wird, erfährt die KI im Ergebnis unverändert je Commit, was ungeprüft blieb. Gerade dieser Schnitt ist der Hebel, weil er nur die Sicht ändert, nicht das Modell von Stellen, Haken und Anmerkungen und nicht den Vertrag mit der KI (Ergebnisformat R00002).

## Missing-Docs

- Die Dateiliste ist eine `listbox` mit `option`-Zeilen (R00003), das Kästchen darin ein interaktives Kind (Missing-Docs R00011): das Ergebnis des Versuchs aus der Karte #16 übernehmen; der Zustand „teilweise“ ist ein gemischtes Kästchen (`aria-checked="mixed"`) und vorab mit einem kleinen Versuch zu prüfen.
- Verhalten des Fokus beim Schließen des Commit-Menüs (Material 3 menu): kleiner Versuch vor dem Bauen.

## Notizen

### Optionen (Ort der Zählung im Kopf)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Kopf zählt in „Zusammen“ Dateien, in „Einzeln“ Stellen (gewählt) | Zähler rein rechenbar, beide Zahlen aus demselben Stand | zwei Zahlen für denselben Fortschritt, Wortlaut muss unterscheiden | klein |
| 2. Kopf zählt immer Stellen | einfach | „9 von 23“ in „Zusammen“ sagt dem Menschen nichts über seine Dateien | klein |
| 3. Kopf zählt immer Dateien | einfach | in „Einzeln“ hakt man Stellen; Zähler bewegt sich nicht bei jedem Haken | klein |

Gewählt: 1 (Entscheidung des product-owner). Der Mensch zählt in „Zusammen“ Dateien, in „Einzeln“ die Schritte, die er tut.

### Zuschnitt (Probe auf den Schnitt)

Die Karte war als „Zusammen-Ansicht“ (I0010) eine Interaction mit Server und Oberfläche; der product-owner hat sie in drei Karten geschnitten: I0010 Logik und Server, I0027 Oberfläche (diese Anforderung), I0028 Beenden und Abbrechen im Kopf (Muster „Schnittstellen“ und „Ablaufschritte“). I0027 zählt 8 Bubbles und liegt damit an der Grenze. Schnittlinie, falls der Bau sie sprengt (Regel des product-owner: „Zusammen“ wird erst Standard, wenn Haken und Anmerken dort gehen): der Commit-Wähler mit Menü (B1104) wird eine eigene Interaction, „Einzeln“ bleibt über die aufgeklappte Commit-Zeile bedienbar; Haken (B1106) und Anmerken (B1107) bleiben im Kern. Alternative: Zustände mit Ausweg als eigene Karte; verworfen, weil sie jede Bubble berühren und „Zusammen“ ohne sie Sackgassen hätte.

### Verworfene Alternativen

- Zwei getrennte Seiten für „Zusammen“ und „Einzeln“: doppelte Pflege von Liste, Haken und Diff; die Modi teilen alles außer der Quelle.
- Haken je Datei als eigenes Modell neben den Stellen: bräche den Vertrag mit der KI (Ergebnis je Stelle) und R00011.
- „Einzeln“ ohne Wähler, nur über die aufgeklappte Commit-Zeile: bleibt die Rückfallstufe, wenn die Karte zu groß wird (siehe Zuschnitt).

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-25 | „Gezeichnet wird nur, was gebaut ist“: die Dateigrößen bei Binärdateien verweisen auf die eigene Karte „Dateigrößen bei Binärdateien“ (noch anzulegen) statt auf I0012; „Als Text zeigen“ bleibt bei I0012 | Entscheidung des product-owner 2026-11-25 (`AI-Team/po-entscheidungen.md`, Zeilen 129–134, Commit 2373651): I0012 bleibt bei „nur benannt“; die Größe braucht einen eigenen `git`-Aufruf und wird eine eigene Karte |
