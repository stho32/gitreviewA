---
id: R00038
status: Neu
datum: 2026-11-25
---

# R00038: Absicht der KI über dem Diff

## Beschreibung

Über dem Diff der gewählten Datei steht, **warum** sie geändert wurde: die Commits der Auswahl, die diese Datei ändern, je Commit mit Kurz-Hash und Betreff, der Rumpf der Commit-Nachricht aufklappbar. In „Zusammen“ sind es alle Commits, die die Datei ändern (mit und ohne lückenlose Kette), in „Einzeln“ der gewählte Commit. Der Block liegt im Diff-Rollbereich und scrollt mit dem Diff weg; der Diff-Kopf mit der Herkunft bleibt, wie er ist.

Zahlt ein auf: [Vision](R00000-vision.md) — „Arbeitsplatz mit entkoppelten Bereichen“ (in der Mitte der Diff mit der Absicht der KI, den Commit-Nachrichten zur Datei; ergänzt 2026-11-25).

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Modi, Commit-Zeile, Herkunft im Kopf), [R00003](R00003-commits-und-dateien-sehen.md) (Message = Text nach dem Betreff), [R00015](R00015-zusammen-logik-und-server.md) (Stellen je Datei, Umbenennung), [R00039](R00039-werkzeugleiste-einzeilig.md) (Diff-Kopf, Kürzung mit „…“), [R00042](R00042-ergebnis-spalte-ziehen.md) (Diff mindestens 320 px, Grenze 590 px).

### Domänenbezug

Kein Glossar. „Absicht der KI“ heißt hier: die Commit-Nachrichten der Commits, die die Datei ändern — was die KI über ihre Änderung gesagt hat.

## Geschäftlicher Nutzen

In „Zusammen“ sieht der Mensch eine Datei netto über alle Commits, aber nicht mehr, was die KI mit den Änderungen wollte; die Nachrichten stehen zugeklappt in der Commit-Zeile, getrennt von der Datei. Wer weiß, was gewollt war („Null-Prüfung ergänzt“), prüft gezielt, ob es auch so gebaut ist — und merkt, wenn eine Datei geändert wurde, die zu keiner Nachricht passt.

## Funktionale Anforderungen

- **Welche Commits** (Pflichtpunkt 5: eine Stelle): In „Zusammen“ sind es die Commits der **Stellen** des gewählten Eintrags der Netto-Liste (`GET /api/zusammen`, Feld `stellen`). Diese Stellen bestimmt der Server an genau einer Stelle (`NettoDateilisteBauen.StellenZu`, über Umbenennungen verkettet, PO Zeile 69); aus denselben Stellen nennt der Diff-Kopf seine Herkunft „netto aus …“ (`ZusammenLesenInteractor`, `commitsDerDatei`). Die Oberfläche rechnet keine Umbenennung nach und hält keine zweite Liste. Ohne lückenlose Kette gelten dieselben Stellen (ein Commit je Abschnitt). In „Einzeln“ ist es der gewählte Commit. Betreff und Rumpf kommen aus der Commit-Liste, die die Oberfläche beim Start einmal holt (`GET /api/commits`). Reihenfolge wie in der Commit-Zeile, jeder Commit einmal.
- **Block**: über dem Inhalt des Diffs (erste Diff-Zeile, erster Abschnitt oder Bild), **im** Diff-Rollbereich; eine Meldung (`.diff-meldung`) steht wie heute über dem Rollbereich, der Block darunter. Je Commit eine Zeile: Kurz-Hash (7 Zeichen) und Betreff, **einzeilig**; passt der Betreff nicht, wird er sichtbar mit „…“ gekürzt und steht ganz in `title` und `aria-label` — dieselbe Regel wie für die Herkunft im Kopf (R00039, PO Zeile 247). Hat der Commit einen Rumpf, ein Knopf „Nachricht“ (Start zu, `aria-expanded`), der den Rumpf darunter zeigt, umbrochen, mit seinen Zeilenumbrüchen. Ändern mehr als 5 Commits die Datei, stehen die ersten 5 da und ein Knopf „k weitere“ zeigt den Rest.
- **Ohne Datei** (Zustand „Datei wählen“, Wahl aufgehoben): kein Block.
- **Jeder Zustand mit gewählter Datei** zeigt den Block: Diff, Abschnitte ohne Kette, Bild, Binärdatei, „Keine Zeilenänderungen“, zu großer Diff (zugeklappt), Lesefehler, gesperrte Datei (R00014). Die Commits sind in jedem dieser Zustände lesbar.
- **Wechsel**: Datei-, Commit- und Moduswechsel bestimmen den Block neu, aufgeklappte Nachrichten und „k weitere“ sind danach wieder zu. Ansicht (nur Änderungen / ganze Datei), Anordnung, Umbruch, Leerraum, Suche und Lücken aufklappen ändern den Block nicht: dieselben Commits, aufgeklappte Nachrichten bleiben offen. Der Diff lädt und zeichnet dabei wie bisher (ganze Datei und Leerraum holen ihn neu); der Block selbst löst keine Anfrage aus.
- **Kein neuer Weg**: kein neuer Endpunkt, kein neuer `git`-Aufruf, keine Änderung am Server.
- **Unverändert**: der Diff-Kopf (Herkunft, Kürzung, Höhe — R00039 Kriterium 1, PO Zeile 247), die Commit-Zeile der Seitenleiste und das Ergebnis auf stdout (R00002).

## Nicht-funktionale Anforderungen

- **Grenzen je Einheit** (Pflichtpunkt 1):
  - *Zahl der Commits*: eine Datei kann von allen Commits der Auswahl geändert werden, also von bis zu 1000 (`Auswahlgrenze.Hoechstzahl`; flüssig bis 200, Lastprofil). Zugeklappt stehen höchstens 6 Zeilen (5 Commits und „k weitere“); nach „k weitere“ alle, je eine Zeile.
  - *Länge je Betreff*: eine sichtbare Zeile (oben). *Länge je Nachricht* (Betreff im `title`, Rumpf aufgeklappt): höchstens 20 000 Zeichen; darüber endet der Text sichtbar mit „… (n Zeichen nicht gezeigt)“, nie mitten in einer Marke `⟨U+…⟩` (wie `kuerzeTeile`, Lehre #17). Herleitung: gemessen in den beiden Repos der Factory (1410 Commits von KI-Rollen, 2026-11-26): längster Rumpf 1395 Zeichen, längster Betreff 300 Zeichen; 20 000 ist das gut 14-Fache. *Offene Frage 1* (PO Zeile 195 sagt „auf Klick ganz“).
  - *Gesamtmenge*: ein Rumpf entsteht im DOM erst beim Aufklappen; zugeklappt trägt der Block nur Hash und Betreff.
  - Die Menge, die der Server beim Start liest und über `GET /api/commits` ausliefert, ist heute **nicht** begrenzt (`GitLeser.Lesen` ohne `Ausgabegrenze`). Das ist kein Teil dieser Anforderung (kein Serverweg), sondern *Offene Frage 2*.
- **Festes Layout** (Pflichtpunkt 3): Der Block liegt im Rollbereich und hat deshalb keine eigene Obergrenze; er nimmt dem Rollbereich keine Höhe und dem Kopf keinen Platz. Auch bei einer Diff-Breite von 320 px bleibt jede Commit-Zeile einzeilig, und zugeklappt ist die erste Diff-Zeile ohne Bildlauf zu sehen.
- **Sicherheit**: Betreff und Rumpf sind fremder Text aus dem Repo — nur `textContent`, nie HTML; unsichtbare und richtungsändernde Zeichen als Marke `⟨U+…⟩` mit **der einen** Zeichenklasse der Namen (`sichtbarerName` in `dateiliste-werte.js`, gleich `Fremdtext/UnsichtbareZeichen`: Steuerzeichen außer Tab, Cf, U+2028/2029), beim Rumpf je Zeile (der Zeilenumbruch bleibt Umbruch). Keine eigene Zeichenliste; insbesondere nicht `ohneSteuerzeichen` aus `commit-werte.js`, die Richtungszeichen entfernt statt markiert. Rohbyte-Marken `⟨0xFF⟩` aus `FremdeBytes` bleiben, wie sie kommen.
- **Performance**: keine zusätzliche Anfrage; der Dateiwechsel bleibt unter den groben Schranken aus R00047 (keine Aufgabe friert länger als 2 s ein). Kein eigenes Zeitkriterium.
- **Logging** (Pflichtpunkt 4): nur Browser — nichts auf stderr, kein Kriterium auf Prozessausgaben.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (`user-stories/R00012.md`: `z1` „Start“, `z2` „a ändern, b neu“, `z3` „a und b ändern“; `z1 z3` ohne Kette) und **Repo M** (neu, `user-stories/R00038.md`: sechs Commits `m1`–`m6` ändern je `x.txt`, `m1` legt sie mit 20 Zeilen an, `m4` mit fremdem Text im Rumpf, `m6` mit Rumpf und `bild.bin`, `m2` mit langem Betreff). Aufruf `gitreviewA <Hashes> --kein-browser`, 1280 × 800, wo nichts anderes steht.

- [ ] 1. Gegeben Repo Z in „Zusammen“, wenn man `src/a.txt` wählt, dann stehen über dem Diff drei Zeilen mit Kurz-Hash und Betreff von `z1`, `z2`, `z3` in der Reihenfolge der Commit-Zeile, dieselben Hashes wie „netto aus …“ im Kopf; wählt man `README.md`, steht nur `z1`. Rechnung: `src/a.txt` wird von `z1` (neu), `z2` und `z3` geändert, `README.md` nur von `z1`. *Ebene: Unit (Rechnung aus Stellen und Commit-Liste) und Integration (Oberfläche gegen Fake).*
- [ ] 2. Gegeben Repo Z in „Einzeln“ mit `z2` gewählt, wenn man `src/a.txt` wählt, dann steht nur `z2`; wechselt man auf `z3`, steht nur `z3`. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 3. Gegeben Repo Z ohne Kette (`gitreviewA $z1 $z3`) in „Zusammen“, wenn man `src/a.txt` wählt, dann stehen über dem ersten Abschnitt `z1` und `z3`, der Kopf sagt weiter „je Commit, nicht netto“. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 4. Gegeben Repo M in „Zusammen“ und `x.txt`, wenn die Datei gewählt ist, dann stehen 5 Zeilen (`m1`–`m5` in Leistenreihenfolge) und ein Knopf „1 weitere“; nach dem Betätigen steht auch `m6`. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 5. Gegeben Repo M und `x.txt`, wenn man bei `m4` „Nachricht“ aufklappt, dann steht der Rumpf als Text `<b>fett</b>` und `<img src=x onerror=alert(1)>` (spitze Klammern, kein Element `b` oder `img` entsteht, kein Dialog), die zweite Zeile als `a⟨U+202E⟩b⟨U+200B⟩c⟨U+E0041⟩d`, `aria-expanded` ist `true`; vor dem Aufklappen enthält das DOM den Rumpf nicht. Der Betreff von `m2` (400 Zeichen) steht in einer Zeile, endet mit „…“, und `title` trägt ihn ganz. *Ebene: Playwright (DOM-Sicherheit, Browser-Eigenes); die Marken zusätzlich Unit gegen die eine Zeichenklasse.*
- [ ] 6. Gegeben Repo M in „Zusammen“, `x.txt` gewählt, bei `m4` die Nachricht aufgeklappt und der Diff halb hinuntergescrollt, wenn man nacheinander „ganze Datei“, „nebeneinander“, Umbruch und Leerraum umschaltet und sucht, dann stehen nach jedem Schritt dieselben 6 Zeilen und die Nachricht von `m4` ist offen; der Block löst keine Anfrage aus (`/api/commits` und `/api/zusammen` nicht erneut geholt); scrollt man nach oben, steht der Block über der ersten Zeile. In „Einzeln“ mit `m6` bleibt der Block (`m6`, Nachricht offen) auch beim Aufklappen der Lücke über den Zeilen von `m1`. Wählt man eine andere Datei und wieder `x.txt`, ist die Nachricht zu. *Ebene: Playwright (Browser-Eigenes, Anfragen gezählt).*
- [ ] 7. Gegeben eine Umbenennung (`alt.txt` in `n1` angelegt, in `n2` zu `neu.txt` umbenannt und geändert) in „Zusammen“, wenn man `neu.txt` wählt, dann stehen `n1` und `n2`. *Ebene: Unit (Rechnung mit den Stellen, wie sie der Server liefert); die Verkettung selbst prüft I0010.*
- [ ] 8. Gegeben Repo M bei 590 × 800 (Seitenleiste 240 px, Ergebnis-Spalte zu, Diff 320 px, PO Zeile 249) und `x.txt` gewählt, wenn man den Bereich betrachtet, dann ist jede der 6 Zeilen des Blocks einzeilig und die erste Diff-Zeile ohne Bildlauf sichtbar; klappt man „1 weitere“ und die Nachricht von `m4` auf, bleiben Höhe und Inhalt des Diff-Kopfs und die Höhe des Rollbereichs gleich, der Block wächst nur im Rollbereich. Rechnung: 24 + 240 + 6 + 320 = 590. *Ebene: Playwright (Darstellung).*
- [ ] 9. Gegeben Repo M, wenn man `bild.bin` wählt, dann steht unter der Meldung des Diffs im Rollbereich der Block mit `m6`. Abgetastet über alle Zustände mit gewählter Datei: liefert der Fake für `x.txt` nacheinander Diff, Abschnitte ohne Kette, Bild, Binär, „Keine Zeilenänderungen“, zu groß (zugeklappt), Lesefehler und gesperrte Datei, dann steht in jedem dieselbe Liste `m1`–`m5` und „1 weitere“. *Ebene: Integration (Oberfläche gegen Fake, Abtastung der ganzen Menge, Lehre „Allquantor-Kriterien abtasten“).*

Grenz- und Leerfälle bedacht: keine Datei gewählt (kein Block, Funktionale Anforderungen); Commit ohne Rumpf (kein Knopf „Nachricht“); viele Commits (5 sichtbar, Kriterium 4 tastet die Grenze bei 6 ab; bis 1000 möglich); Nachricht über 20 000 Zeichen (Unit der Kürzung, Offene Frage 1); Meldungszustände (Kriterium 9 tastet alle ab); gesperrte Datei (R00014) — der Block steht wie bei jeder Datei (kein eigenes Kriterium). Verworfen: Absicht als eigener Rollbereich über dem Diff (bräuchte eine Obergrenze und nähme Diff-Höhe weg).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — NFA „Grenzen je Einheit“, Kriterien 4, 5, 8; 2 Anzeigeverfahren — Kriterium 1 („Zusammen“ netto, der Standard, zuerst), 3 (ohne Kette), 2 („Einzeln“), 6 (Ansicht, Anordnung, Umbruch, Leerraum, Suche, Lücken), 9 (Meldungen); 3 festes Layout — der Block liegt im Rollbereich (Kriterien 6, 8); 4 Ausführungsort — nur Browser; 5 eine Stelle — die Stellen des Servers sind die eine Quelle für Block und Herkunft (Kriterien 1, 7), die Marken die eine Zeichenklasse (Kriterium 5).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/absicht-werte.js` (neu, rein), `absicht.js` (neu), `diff.js`, `index.html`, `gitreviewa.css`.
- `tests/` (Node-Unit wie `haken-werte`), `e2e/`.

## Technische Überlegungen

**Vorplanung** — Bubbles B3701–B3705 unter I0039. **Artboard**: Variante A (Absicht der KI über dem Diff); Entwurf Fassung 2 zeigt `.diff-herkunft` im Diff-Kopf ohne Nachricht — die Lücke füllt Material 3 (list mit expandierbaren Einträgen).

### Ablauf

1. `datei-gewaehlt`/`modus-gewechselt`/Commit-Wechsel → Commits der Datei aus den Stellen (B3701).
2. Block zeichnen, Nachricht und „k weitere“ aufklappbar (B3702).
3. Block bleibt erster Inhalt des Rollbereichs über alle Zeichenwege (B3705).
4. Anzeige-Wechsel lassen ihn stehen (B3703).

### Grobentwurf

- `absicht-werte.js` (rein) — `commitsDerDatei(modus, wahl, stellen, commits)` → Liste; `sichtbare(commits, 5)`; Kürzung je Nachricht; Marken über `sichtbarerName` je Zeile.
- `absicht.js` (Oberfläche) — Block, Knöpfe, Aufklappzustand je Wahl; Betreff über dieselbe Kürzung wie die Herkunft (`setzeSichtbarenText`, `title`/`aria-label`).

### Änderungen an bestehenden Klassen

`diff.js`: Der Rollbereich `.df-sc` wird heute an vier Stellen mit `replaceChildren` neu befüllt (Zeilen, nebeneinander, Abschnitte, Meldung) und bei jeder Meldung verborgen (`zeigeMeldung`: `hidden = true`); das Bild zeichnet ebenfalls dort. Ein Block im Rollbereich verschwände dabei. Alle Wege setzen den Inhalt künftig über **eine** Funktion, die den Block als erstes Kind behält; bei einer Meldung bleibt der Rollbereich mit dem Block sichtbar. Vorhandene Tests, die „Rollbereich verborgen“ bei Meldungen zusichern, ziehen auf „nur der Block“ um — nie abschwächen. Keine Serverklasse.

## Tests

**Unit:** Rechnung (Zusammen, ohne Kette, Einzeln, Umbenennung, 0/1/6 Commits, Name mit Rohbyte-Marke), Kürzung bei 20 000 Zeichen (nie in einer Marke), Marken mit U+202E, U+200B, U+E0041.
**Integration:** Oberfläche gegen Fake (Block, „k weitere“, ohne Kette, Meldungszustand).
**E2E:** DOM-Sicherheit von Rumpf und Betreff, Stehenbleiben beim Umschalten, Darstellung bei 320 px Diff-Breite — Browser-Eigenes, nicht Hot Path.

## Abhängigkeiten

- Abhängig von: I0027 Oberfläche Liste–Detail (R00012, grün), I0040 Werkzeugleiste (R00039, grün), I0043 drei Bereiche (R00042, grün).
- Blockiert: nichts.

## Offene Fragen

Entschieden (PO Zeile 195, 2026-11-25): höchstens 5 Zeilen sichtbar, darüber „k weitere“; der Rumpf beim Start zu. Offen:

1. **Länge je Nachricht**: PO Zeile 195 sagt „auf Klick ganz“, der Server begrenzt den Rumpf aber nicht (Frage 2). Empfehlung: höchstens 20 000 Zeichen zeigen, darüber sichtbar „… (n Zeichen nicht gezeigt)“ — gemessen trägt das jede bisherige Nachricht ganz (längste 1395 Zeichen), und ein feindlicher Rumpf von Megabytes legt die Seite nicht lahm. Alternative: ganz zeigen wie entschieden.
2. **Menge der Commit-Liste beim Start**: `GitLeser.Lesen` liest `git log` ohne `Ausgabegrenze`, und die Feldtrennung (0x1F) in `GitLogAusgabe` lässt sich durch ein 0x1F in Autor oder Betreff verschieben (geprobt 2026-11-26: git behält 0x1F in `%an` und `%s`), dann stünde etwa das Datum als Betreff. Beides betrifft die Commit-Zeile schon heute (R00003) und den Block gleich. Empfehlung: eigene Befund-Karte über `/anforderung aus-bug` gegen R00003 vor dem Bau dieser Karte; R00038 bleibt ohne Serverweg.

## Manuelle Vorbereitungstätigkeiten

- Keine.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 5 Bubbles unterhalb I0039 (B3701–B3705), 2 klar (2 h), 3 unklar (2–4 h) — 10–16 h. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist Richtung A: über dem Diff steht die Absicht der KI. In „Zusammen“, dem Standard, ist die Verbindung zwischen Datei und Nachricht verloren gegangen, weil die Commits nur noch eine zugeklappte Zeile sind. Wenn die Nachrichten genau der Commits, die die Datei ändern, über ihrem Diff stehen, vergleicht der Mensch Absicht und Änderung an einem Ort, ohne die Commit-Zeile aufzuklappen und zu suchen. Der Hebel ist eine Rechnung über vorhandene Daten: kein neuer Weg zum Server, kein neues Lesen aus dem fremden Repo.

## Missing-Docs

- Keine.

## Notizen

### Verworfene Alternativen

- Nachricht im Diff-Kopf (feste Leiste): verworfen — wachsender Text über dem Rollbereich (Pflichtpunkt 3).
- Nachricht je Abschnitt im Diff (am Hunk): verworfen — netto gibt es keine Zuordnung von Abschnitt zu Commit (R00015), außer ohne lückenlose Kette, wo die Abschnitte schon beschriftet sind.
- Eigene Rechnung der Umbenennung in der Oberfläche: verworfen — der Server verkettet die Stellen schon (`StellenZu`); eine zweite Rechnung wäre ein zweiter Ort für dieselbe Unterscheidung.

### Hinweis zu PO Zeile 247

Im heutigen Code nennt die Herkunft „netto aus …“ dieselben Commits wie dieser Block (beide aus den Stellen der Datei, `ZusammenLesenInteractor.cs` Z. 155), nicht alle Commits der Auswahl. Die Entscheidung (a) aus Zeile 247 bleibt davon unberührt: der Kopf bleibt, wie er ist; der Block ergänzt Betreff und Rumpf.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-26 | Detailplanung abgeglichen (Karte #47, planer): Quelle der Commits = Stellen des Servers statt eigener Rechnung; Zustand ohne Kette und Meldungszustände ergänzt; Betreff einzeilig mit Kürzung wie die Herkunft; „Wechsel“ korrigiert (der Diff lädt bei ganzer Datei und Leerraum neu, der Block bleibt); Grenzen je Einheit neu (bis 1000 Commits, 20 000 Zeichen je Nachricht, Rumpf erst beim Aufklappen im DOM), falsche Aussage „Rumpf durch 8 MiB begrenzt“ gestrichen; eine Zeichenklasse für die Marken benannt; Performance-Zahl 200 ms durch R00047 ersetzt; Kriterien 3, 8, 9 neu, 5 und 6 geschärft; `diff.js` (vier Füllwege, verborgener Rollbereich) unter Technik; B3705 neu; Offene Fragen 1 und 2 | Abgleich mit dem Code auf `main` nach #48 (R00039), #51 (R00042), den Pflichtpunkten in `AI-Team/planer.md` und den Lehren #10, #17 (`AI-Team/gelerntes.md`); Fundstellen: `GitLeser.cs` Z. 16–21 (ohne Grenze), `Auswahlgrenze.cs` Z. 10, `diff.js` Z. 333–336, 582, 717, 745, `commit-werte.js` Z. 10, `dateiliste-werte.js` Z. 55, `ZusammenLesenInteractor.cs` Z. 155; gemessene Nachrichtenlängen; gelerntes 2026-11-26 (keine harten Zeitziele) |
