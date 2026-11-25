---
id: R00032
status: Neu
datum: 2026-11-25
---

# R00032: Umbruch standardmäßig an

## Beschreibung

Nach dem Start zeigt gitreviewA lange Diff-Zeilen umbrochen: der Umschalter „Umbruch“ steht auf „an“, in jeder Ansicht („nur Änderungen“, „ganze Datei“), jeder Anordnung („untereinander“, „nebeneinander“) und beiden Modi („Zusammen“ netto und je Abschnitt, „Einzeln“). Der Umschalter bleibt bedienbar und zeigt seinen Zustand „an“; die Wahl bleibt beim Wechsel von Datei, Commit, Modus und Anordnung und wird nicht gespeichert (nur Arbeitsspeicher, Neuladen = neuer Start). Der Auslöser ist der Auftrag des Betreibers 2026-11-25 („zeilenumbruch sollte per default an sein“); er löst den bisherigen Start „aus“ ab, ohne Umschalter, bleibende Wahl oder den Weg zu `git` anzutasten.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ (Zeilenumbruch).

Dieser Slice ändert nur eine Voreinstellung der Anzeige; Text, Zeilennummern, Marken, Färbung, Suche, Zuklappen, Anmerken und das Ergebnis auf stdout bleiben unverändert (kein neuer Endpunkt, kein neuer `git`-Aufruf).

### Abgelöste Zusagen (Start „aus“)

Diese Anforderung **ersetzt** den Startwert „aus“ in den folgenden Stellen; alles Übrige dort (der Umschalter selbst, die bleibende Wahl, das Verhalten mit und ohne Umbruch) bleibt gültig. Die früheren Dokumente werden nicht geändert — sie bleiben der Beleg für die alte Entscheidung.

- [R00004](R00004-diff-einer-datei-lesen.md), „Funktionale Anforderungen“, Punkt **Zeilenumbruch** (Zeile 38): „… beim Start aus; die Wahl bleibt …“ → „beim Start an“.
- [R00004](R00004-diff-einer-datei-lesen.md), Akzeptanzkriterien „Diff lesen“, letztes Kriterium (Zeile 61): es beginnt bei „ohne Umbruch“ und schaltet dann ein — die Reihenfolge kehrt sich um (Start umbrochen, Umschalten auf einzeilig).
- [R00004](R00004-diff-einer-datei-lesen.md), Offene Frage 1 (Zeile 122): „Zeilenumbruch beim Start aus … oder an?“ — beantwortet: **an**.
- [R00023](R00023-nebeneinander-ansicht.md), Akzeptanzkriterium 7 „Breite und Umbruch“ (Zeile 81): es beginnt bei „ohne „Umbruch““ — die Reihenfolge kehrt sich um.
- [R00023](R00023-nebeneinander-ansicht.md), Offene Frage „Breite und `Umbruch`“ (Zeile 146): die Empfehlung „Start „Umbruch“ aus“ gilt nicht mehr.
- `AI-Team/po-entscheidungen.md`, Zeile 29 (2026-11-24, #6 I0006 „Zeilenumbruch beim Start aus oder an?“ → „Aus; Umschalter bleibt, Wahl bleibt“) und Zeile 126 (2026-11-25, #7 I0007 „Start „Umbruch“ aus, Wahl bleibt“): der **Startwert** wird ersetzt, die bleibende Wahl bleibt.
- WBS `Dokumentation/Planung/gitreviewa.md`, B0306 (I0006) „… beim Start aus“ → „beim Start an“ (mit dem Bau von I0033).

Ebenso unberührt und weiter gültig: „mit und ohne Umbruch“ in [R00007](R00007-syntaxhervorhebung.md), [R00010](R00010-zeile-annotieren.md), [R00017](R00017-grosse-diffs.md), [R00022](R00022-datei-annotieren.md), [R00026](R00026-leerraum-und-luecken.md), [R00027](R00027-im-diff-suchen.md), [R00031](R00031-zeilenbereich-annotieren.md), die bleibende Wahl in [R00008](R00008-ganze-datei-mit-diff.md)/[R00012](R00012-oberflaeche-liste-detail-zusammen.md) und die Taste `w` in [R00030](R00030-tastaturbedienung.md). Kein Widerspruch zur Vision; der abgenommene Entwurf Fassung 2 zeichnet den Umschalter „aus“ (Zeile 478) — die Voreinstellung folgt dem Betreiber, das Standbild des Entwurfs zieht die Familie `/wireframe` nach (siehe Offene Fragen).

## Geschäftlicher Nutzen

Ein Diff zeigt bei einer KI-Änderung oft lange Zeilen; ohne Umbruch muss der prüfende Mensch je Zeile waagerecht scrollen, um das Ende zu sehen, und verliert dabei den Zusammenhang. Steht der Umbruch beim Start an, liest er jede Zeile vollständig, ohne zuerst einen Schalter zu suchen — das Häufige ist die Voreinstellung. Wer Spalten und Einrückung vergleichen will, schaltet in einem Klick auf einzeilig um; die Wahl bleibt wie bisher für den ganzen Lauf.

## Funktionale Anforderungen

- **Startzustand**: nach dem Start (Seite geladen) steht der Umschalter „Umbruch“ auf „an“, und lange Zeilen sind umbrochen — in „nur Änderungen“ und „ganze Datei“, in „untereinander“ und „nebeneinander“, in „Zusammen“ wie in „Einzeln“.
- **Umschalter**: der Umschalter zeigt seinen Zustand „an“ an (sein Kontrollzustand — bei der gezeichneten Checkbox mit `role="switch"` `checked`/`aria-checked`, als Knopf `aria-pressed="true"`); er bleibt per Maus und per Tab bedienbar und schaltet wie bisher zwischen umbrochen und einzeilig um.
- **Wahl bleibt**: die Stellung gilt für jede weitere Datei und jeden weiteren Commit und überlebt den Wechsel von Modus („Zusammen“/„Einzeln“), Ansicht („nur Änderungen“/„ganze Datei“) und Anordnung („untereinander“/„nebeneinander“), auch wenn sie ohne gewählte Datei getroffen wurde; nichts wird gespeichert (nur RAM), nach dem Neuladen der Seite gilt wieder „an“.
- **Unberührt**: Text, Zeilennummern alt/neu, Marken für Unsichtbares, Einfärbung, Suche, Zuklappen/„Trotzdem laden“, Lücken und Anmerken bleiben wie ohne Umbruch; keine zweite Rechnung, kein neuer Endpunkt, kein neuer `git`-Aufruf.
- **Grenzfälle**: ohne gewählte Datei (Hinweis „Datei wählen, um ihren Diff zu sehen“) und bei „Binärdatei“/„Keine Zeilenänderungen“ gibt es nichts umzubrechen — der Umschalter steht trotzdem „an“ und wirkt auf die nächste Wahl; ein sehr langer Diff (bis 20 000 Zeilen) wird auch umbrochen rechtzeitig gezeigt (siehe Nicht-funktionale Anforderungen).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): der Umbruch ändert die Darstellung, nicht die gelesene Menge. Ein Diff einer Datei mit 20 000 Zeilen steht auch mit Umbruch an ≤ 1 s nach dem Klick (Obergrenze des Dateiwechsels); der Messwert muss ≤ 0,7 s sein (≥ 30 % Abstand zur Grenze, `rollen/planer/zeitkriterien.md`), ereignisgenau gewartet. Die Zuklappgrenzen aus [R00017](R00017-grosse-diffs.md) (20 000 Diff-Zeilen, 262 144 Zeichen, 10 000 Marken) und die Blockgrenze nach Knotenzahl (etwa 5 000) gelten unverändert — der Umbruch zählt keine Zeichen und keine Knoten, er bricht nur die Darstellung um (waagerechtes Scrollen entfällt, die Zeilenhöhe wächst).
- **Sicherheit** (`AI-Team/gelerntes.md`): es kommt kein neuer Weg zu `git` und kein neuer Anfrageparameter hinzu; Text und Pfade bleiben fremder Text und werden nur per `textContent` gezeigt, Unsichtbares/Richtungsänderndes als Marke `⟨U+202E⟩`. Der Zustand „Umbruch“ liegt im Browser (RAM) und wird nicht gespeichert.
- **Logging**: stdout bleibt leer und byteweise wie bisher (die Voreinstellung ist keine Ausgabe); keine neue Debug-Zeile.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und dem abgenommenen Entwurf Fassung 2 (`.ru-sch`/`.umbr`, Schalter); der Kontrollzustand ist sichtbar (nicht nur Farbe) und per Tastatur erreichbar; keine eigenen Gestaltungsvorgaben.

## Akzeptanzkriterien

Vorbereitung: **Repo A** (Commits `p`, `q`, `s`) und **Repo U** (Commit `u` mit `gross.txt` aus 20 000 Zeilen) wie in [R00004](R00004-diff-einer-datei-lesen.md), „Akzeptanzkriterien“ und `user-stories/R00004.md`; `breit.txt` hat als Zeile 2 dreißigmal `0123456789` (300 Zeichen). Aufruf wie in R00004 (`gitreviewA q p --kein-browser`), Fenster 1280 × 800; „wählen“ = Klick in der Dateiliste, „umschalten“ = die andere Stellung „Umbruch“ wählen.

### Startzustand
- [ ] Gegeben ein frischer Start (`gitreviewA q p --kein-browser`), wenn die Seite geladen ist — **ohne** gewählte Datei —, dann steht der Umschalter „Umbruch“ auf „an“; wählt man danach `breit.txt`, ist die 300 Zeichen lange Zeile 2 mehrere Bildschirmzeilen hoch und der Bereich lässt sich nicht waagerecht scrollen (Start umbrochen, ohne dass jemand schaltet). *Ebene: Playwright (Browser-Eigenes, Darstellung); der Startwert selbst zusätzlich als Baustein (siehe Tests).*
- [ ] Gegeben ein frischer Start und `breit.txt` gewählt, wenn man den Umschalter betätigt (auf „aus“), dann belegt Zeile 2 dieselbe Höhe wie Zeile 1 und der Bereich scrollt waagerecht; betätigt man ihn wieder (auf „an“), ist sie wieder umbrochen und der Text jeder Zeile ist unverändert — der Umschalter ist und bleibt bedienbar. *Ebene: Playwright.*

### Überall und bleibend
- [ ] Gegeben `q` und `breit.txt`, wenn man die Datei in **jeder** Kombination aus {„nur Änderungen“, „ganze Datei“} × {„untereinander“, „nebeneinander“} × {„Einzeln“, „Zusammen“} zeigt, dann ist in jeder dieser acht Kombinationen der Umschalter „an“ und Zeile 2 umbrochen (der Bereich scrollt in keiner Kombination waagerecht). *Abtastung aller Kombinationen, nicht Stichproben; Ebene: Playwright je Anordnung.*
- [ ] Gegeben `q`, `breit.txt` umbrochen und die Anordnung „untereinander“, wenn man in dieser Reihenfolge — Ansicht auf „ganze Datei“ und zurück, Anordnung auf „nebeneinander“ und zurück, Datei auf `src/b.txt` und zurück, Commit auf `p` und zurück — wechselt, dann ist „Umbruch“ nach jedem Wechsel weiter „an“ und Zeile 2 umbrochen, ohne dass man ihn erneut betätigt; lädt man die Seite neu, ist er wieder „an“ (nur RAM, nichts gespeichert). *Ebene: Playwright.*
- [ ] Gegeben `q` und `breit.txt` umbrochen in „Einzeln“, wenn man auf „Zusammen“ umschaltet (der Netto-Diff der Auswahl wird gezeigt), dann ist Zeile 2 weiter umbrochen und der Umschalter „an“; dasselbe, wenn die Auswahl keine lückenlose Kette bildet und die Abschnitte je Commit gezeigt werden. *Ebene: Playwright.*

### Unberührt und Ergebnis
- [ ] Gegeben `q` und `breit.txt` mit Umbruch an, wenn man `lang.txt`, `fremd.txt`, `LIESMICH.md` (umbenannt, unverändert) und `logo.bin` (binär) wählt, dann sind Text, Zeilennummern alt/neu, die Marke `U+202E` in `fremd.txt` und die Hinweise „Keine Zeilenänderungen“/„Binärdatei“ dieselben wie ohne Umbruch; eine Zeile lässt sich weiter anmerken, und ein Treffer der Suche ([R00027](R00027-im-diff-suchen.md)) wird weiter in den Blick gescrollt. *Ebene: Playwright (Browser-Eigenes).*
- [ ] Gegeben `gitreviewA q p --kein-browser` mit `breit.txt` und Umbruch an, wenn man eine Zeile anmerkt und mit „Beenden“ abschließt, dann ist das Ergebnis auf stdout Byte für Byte wie ohne Umbruch, und auf stderr steht keine neue Zeile und kein zusätzlicher `git`-Aufruf. *Ebene: Integration (Programm als Prozess, stdout roh verglichen).*

### Lastprofil
- [ ] Gegeben Repo U mit `gitreviewA u --kein-browser`, wenn man `gross.txt` (20 000 Zeilen) mit Umbruch an wählt, dann steht spätestens 1 s nach dem Klick (Messwert ≤ 0,7 s, ereignisgenau) die Zeile `zeile 20000` (neu 20000) im Dokument, und die Zuklappgrenze aus [R00017](R00017-grosse-diffs.md) greift wie ohne Umbruch (über der Grenze bleibt der Text zugeklappt mit „Trotzdem laden“). *Ebene: Playwright, ereignisgenau.*

## Betroffene Verzeichnisstruktur

Wie in [R00004](R00004-diff-einer-datei-lesen.md) (`src/GitReviewA/web/` mit `diff.js`, `index.html`, `gitreviewa.css`; Tests in `e2e/tests/` mit den Schichten `dsl/`, `treiber/`, Bausteine unter `e2e/tests/bausteine/`).

- `web/` — der Startwert des Zustands „Umbruch“ und das Zeichnen des Umschalters beim Start; die Umbruch-Klasse (`.umbr`) am Diff-Bereich.
- `e2e/` — die Tests, die den Start „aus“ zusichern, werden auf „an“ umgestellt (Liste siehe Tests); Fälle je Ansicht und Anordnung.

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen. Heute ist „Umbruch“ eine Checkbox `.umbruch-schalter` im Werkzeugbereich des Diff-Bereichs; ihr `checked`-Startwert kommt aus dem Markup, die Klasse `.umbr` am Bereich schaltet die Umbruch-Regeln in `gitreviewa.css` (`.umbr .dz{…}`, `.umbr .dz.ru-nb col.cc{…}`). Der Startwert ist die einzige Änderung.

### Ablauf
1. **Startzustand** — beim Laden setzt der Diff-Bereich den Zustand „Umbruch“ auf „an“ (Baustein liefert den Startwert) und legt die Klasse `.umbr` an; der Umschalter zeigt „an“.
2. **Wechsel** — wie heute: Datei-, Commit-, Modus- und Anordnungswechsel zeichnen neu, ohne den Zustand „Umbruch“ zurückzusetzen; die bleibende Wahl liegt am Bereich (RAM).
3. **Unberührt** — Zeilenrechnung (`patchZeilen`, `ganzeDateiZeilen`), Färbung, Suche, Zuklappen und Anmerken lesen den Zustand „Umbruch“ nur als Darstellungsmerkmal; keine Rechnung ändert sich.

### Grobentwurf
**Einstiegsstellen:** Oberfläche `web/` (Startzustand und Umschalter). Keine Server-, `Git/`- oder Endpunkt-Änderung.

- `Umbruchzustand` (Wert/Operation, rein) — der Startwert „an“ und der Umschaltwert; als kleiner Baustein (`umbruch-werte.js`) unter Node und im Browser testbar, oder als Vorgabewert in `diff.js`.
- `Diffbereich` (Oberfläche, `diff.js`) — setzt beim Start die Klasse `.umbr` und den Kontrollzustand des Umschalters; behält den Zustand über die Wechsel.
- `index.html`/`gitreviewa.css` — Startwert des Umschalters bzw. die vorhandene `.umbr`-Regel (unverändert).

### Änderungen an bestehenden Klassen
- `diff.js` — Startzustand setzen (statt aus dem unchecked-Markup); `schalteUmbruch` unverändert.
- `index.html` — der Umschalter zeichnet beim ersten Bild „an“ (Startwert); `gitreviewa.css` bleibt.

### Messung des Zeitkriteriums
Startpunkt: Klick auf `gross.txt`; Ereignis: die Zeile `zeile 20000` steht im Dokument (ereignisgenau, nicht im Standardraster, `rollen/planer/zeitkriterien.md`). Grenze 1 s, Messwert ≤ 0,7 s. Gemessen wird mit Umbruch an; der Vergleich mit dem Stand ohne Umbruch steht im Testbericht. Die Umbruch-Regel ändert nur die Darstellung (Zeilenumbruch der Zelle), die Anzahl der Zeilen und Blöcke bleibt wie ohne Umbruch.

## Tests
Nach `~/.claude/skills/test-pyramide/SKILL.md` und der ATDD-Regel des Projekts (`AI-Team/factory.md`): je Kriterium zuerst die Spezifikation in Fachsprache, dann DSL, Treiber, System; Testnamen „soll …“.

**Baustein/Unit:** der Startwert des Zustands „Umbruch“ ist „an“ (`umbruch-werte.js` bzw. die Zustandsfunktion in `diff.js`; Mutant Startwert „aus“ → Kriterium 1 rot); die Umschaltfunktion liefert „an“↔„aus“ wie bisher.

**Playwright (Browser-Eigenes, je Ansicht und Anordnung):** Start an in jeder der acht Kombinationen (Kriterium 3), der Umschalter zeigt „an“ und ist per Maus und Tab bedienbar, die Wahl bleibt über Ansicht/Anordnung/Modus/Datei/Commit und ist nach dem Neuladen wieder „an“, Text/Nummern/Marken/Färbung/Anmerken/Suche unverändert, Leistungsprobe 20 000 Zeilen mit Umbruch an.

**Integration (Programm als Prozess):** das Ergebnis auf stdout ist Byte für Byte wie ohne Umbruch; keine neue Debug-Zeile, kein zusätzlicher `git`-Aufruf.

**Umzustellende Tests** (sie sichern heute den Start „aus“ zu und werden gezielt auf „an“ gedreht — nie abgeschwächt, nie ohne Ersatz gelöscht; die Umbruch-Zusicherung selbst bleibt in jedem Fall erhalten):

| Fundstelle | heute | nach der Änderung |
|---|---|---|
| `e2e/treiber/diff-oberflaeche.js`, `pruefeEinzeilig`/`pruefeUmbrochen` (Z. 209–224) | `pruefeEinzeilig` prüft `not.toBeChecked()`, `pruefeUmbrochen` `toBeChecked()` | die Zusicherung bleibt, aber der Startzustand ist „an“ — der Aufruf, der heute ohne Schalten einzeilig erwartet, schaltet vorher um |
| `e2e/tests/diff-einer-datei-lesen.spec.js`, „lange Zeilen … auf Wunsch umbrechen und die Wahl behalten“ (Z. 102–112) | erst `langeZeileEinzeilig`, dann umschalten, dann `langeZeileUmbrochen` | erst `langeZeileUmbrochen` (Start), dann umschalten, dann `langeZeileEinzeilig`; die bleibende Wahl wird weiter geprüft |
| `e2e/tests/ganze-datei-mit-diff.spec.js`, „Umbruch in beiden Ansichten … behalten“ (Z. 132–148) | beginnt mit `langeZeileEinzeilig` (Z. 136/138) | beginnt mit `langeZeileUmbrochen`; die beiden Ansichten werden weiter abgetastet |
| `e2e/treiber/nebeneinander-oberflaeche.js`, `pruefeBreiteUndUmbruch` (Z. 143–168) und `e2e/tests/nebeneinander-weitere.spec.js` Kriterium 7 (Z. 109–121) | misst erst „ohne Umbruch“, schaltet dann um | misst zuerst den Startzustand „umbrochen“, schaltet dann auf einzeilig; beide Messungen bleiben |
| `e2e/dsl/faerbung.js`, `umbruchAn` (Z. 36, Z. 71–76) mit `e2e/tests/syntaxhervorhebung.spec.js` (Z. 225–264) | nimmt Start „aus“ an (`umbruchAn = false`) | nimmt Start „an“ an (`umbruchAn = true`); der Umschaltweg bleibt |

## Abhängigkeiten
- Abhängig von: I0006 Diff einer Datei lesen ([R00004](R00004-diff-einer-datei-lesen.md), grün) — führt den Umschalter „Umbruch“ ein; I0022 Ganze Datei mit Diff ([R00008](R00008-ganze-datei-mit-diff.md), grün); I0007 Nebeneinander-Ansicht ([R00023](R00023-nebeneinander-ansicht.md), grün); I0009 Whitespace und Lücken ([R00026](R00026-leerraum-und-luecken.md), grün, Umschalter „Leerraum“ neben „Umbruch“).
- Blockiert: nichts. Berührt die Tests und die Anzeige von [R00007](R00007-syntaxhervorhebung.md), [R00017](R00017-grosse-diffs.md), [R00027](R00027-im-diff-suchen.md), [R00030](R00030-tastaturbedienung.md), ohne von ihnen abzuhängen; die Tastatur ([R00030](R00030-tastaturbedienung.md), rot) übernimmt den Umschalter mit der Taste `w` unverändert.

Nicht Teil dieser Anforderung: der Umschalter selbst, die bleibende Wahl (beide bleiben wie in R00004/R00008/R00023/R00026) und jede Änderung an Server, `git`-Lesepfaden oder am Entwurf Fassung 2 (die Familie `/wireframe` zieht das Standbild nach, siehe Offene Fragen).

## Offene Fragen
1. An den product-owner: **`Braucht`-Umfang** — meine Wahl nennt I0006 (führt den Umschalter ein), I0007, I0022 und I0009 (Ansichten und Anordnungen, deren Tests den Start „aus“ zusichern). Empfehlung: so lassen; I0010/I0027 („Zusammen“/Werkzeugkasten) und I0015 (Tastatur) **nicht** als Vorbedingung nennen — sie erben den einen geteilten Zustand, und I0015 bindet sonst eine kleine Anzeigeänderung an eine rote Karte. Soll ich I0010/I0027/I0015 trotzdem aufnehmen?
2. An den product-owner: **Form des Umschalters** — Empfehlung: am vorhandenen Bedienelement bleiben (Checkbox mit `role="switch"`, „an“ = `checked`/`aria-checked`); die Aufgabe nennt `aria-pressed`, das gehört zum Knopf und wird nur dann gesetzt, wenn der Umschalter ein Knopf wird. Bleibt es bei der Checkbox (dann liest die Probe `checked`), oder wird er zum Knopf mit `aria-pressed`?
3. An den product-owner: **Entwurf Fassung 2** — das abgenommene Standbild zeichnet den Umschalter „aus“ (Zeile 478) und hat Vorrang, wo es spricht; hier folgt die Voreinstellung dem Betreiber. Empfehlung: die Familie `/wireframe` zeichnet den Schalter beim nächsten Lauf „an“ (der Betreiberauftrag geht dem Entwurf vor); bis dahin ist die Anforderung nicht blockiert. Soll ich das beim Director als `/wireframe verfeinern` anmelden?
4. An den product-owner: **Neuladen** — Empfehlung: nach dem Neuladen wieder „an“ (der Startwert, nichts wird gespeichert), passend zu „nichts wird gespeichert“ der Vision. Einigkeit, oder soll die Stellung das Neuladen überleben?

Keine davon blockiert den Bau; die Empfehlungen gelten bis zur Antwort.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00001 hinaus.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Warum löst diese Anforderung das Problem?

Der Auslöser: der Betreiber liest im Diff lange Zeilen und muss heute je Zeile waagerecht scrollen, weil gitreviewA den Umbruch standardmäßig aus lässt — der nützliche Zustand ist einen Klick entfernt. Wenn der Umbruch beim Start an ist, dann liest jeder prüfende Mensch jede Zeile vom Anfang bis zum Ende, ohne Schlaufen zu scrollen, und wer die Spalten vergleichen will, schaltet in einem Klick um; die Wahl bleibt wie bisher für den Lauf. Der Hebel liegt genau hier und nicht in einer Klappzustands-Ausbaustufe, weil der Umbruch ein reines Darstellungsmerkmal ist, das die bestehenden Anzeigeverfahren (Einzeln/Zusammen, nur Änderungen/ganze Datei, untereinander/nebeneinander) und die Verbraucher (Nummern, Färbung, Suche, Anmerken) unangetastet lässt — eine Voreinstellung, kein neuer Weg, nichts an der Sicherheitsgrenze zu `git`, nichts auf stdout. Deshalb bleibt die Änderung klein und mit wenigen Kriterien prüfbar, und der einzige Preis ist, dass einige Tests, die den Start „aus“ zusichern, mitgedreht werden müssen.

## Missing-Docs
- Der abgenommene Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`, Zeile 478) zeichnet den Umschalter „Umbruch“ ohne Startwert „an“; er und die PO-Entscheidungen (Zeilen 29, 126) sind der alte Stand. Ein Wireframe als Standbild führt keinen Laufzeitzustand, deshalb ist es keine Sperre — die Nachführung gehört in einen `/wireframe`-Lauf, nicht in dieses Dokument.

## Notizen

### Optionen (Umsetzung des Startwerts)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Startwert als kleiner Baustein (Startfunktion „an‘) plus Setzen der Klasse beim Laden (Empfehlung) | Baustein unter Node testbar, Startwert als Unit; Browser je Ansicht/Anordnung | gering: eine Stelle, ein Vorgabewert | klein |
| 2. Startwert im Markup ausdrücken (`checked` am Umschalter, Klasse im HTML) | im Browser prüfbar; Baustein/Unit entfällt | das Markup der Seite trägt den Startwert doppelt (Checkbox und Klasse) — zwei Stellen, die auseinanderlaufen können | klein |
| 3. Startwert im Serverzustand (`GET /api/zustand`) führen | über den Server prüfbar | falsche Stelle: der Umschalter ist eine reine Anzeigevoreinstellung, kein Weg zu `git`; neuer Endpunktweg und Protokollzeile ohne Nutzen | mittel |

Gewählt: 1 (der Entwickler entscheidet beim Bauen; die Kriterien tragen 1 und 2).

### Verworfene Alternativen
- Startwert im Markup doppelt führen (Option 2): die Klasse und die Checkbox können auseinanderlaufen; ein Baustein hat eine Quelle.
- Den Umschalter neu bauen (Knopf mit `aria-pressed`): der vorhandene Schalter erfüllt die Anforderung; ein Umbau wäre Umfang ohne Nutzen (siehe Offene Frage 2).
- Startwert über den Server (Option 3): `GET /api/zustand` trägt Zustand und Commits; die Voreinstellung einer Anzeige gehört nicht in den Rückkanal, und die Vision verbietet Speichern.
- Die Sätze der früheren Anforderungen (R00004, R00023) umschreiben: Anforderungsdateien werden nach der Erstellung nie geändert; R00032 benennt die abgelösten Zusagen und die alten Dokumente bleiben der Beleg für die Vorentscheidung.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 4 Bubbles unterhalb I0033 (B3101–B3104), davon 2 Standard (2 h) und 2 unklar (2–4 h) — Untergrenze 8 h, obere Schätzung 12 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; die Richtwerte sind also ein Vielfaches davon. Enthalten: nur I0033; die Anschlüsse an R00007/R00017/R00027/R00030 sind Tests, kein neuer Umfang.
