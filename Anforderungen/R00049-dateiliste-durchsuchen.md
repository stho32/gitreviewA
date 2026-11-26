---
id: R00049
status: Neu
datum: 2026-11-26
---

# R00049: Dateiliste durchsuchen

## Beschreibung

Der prüfende Mensch gibt in der Dateiliste einen Suchtext ein — ein Wort wie `app` oder ein Muster wie `*.sql` — und sieht nur noch die Dateien, die dazu passen. Die Suche **findet**, was [R00025](R00025-dateien-ausblenden.md) **ausblendet**: Sie ist wie dort eine **Sicht** auf die Liste, nicht die Auswahl — nicht passende Dateien bleiben abhakbar, zählen in „n von m abgehakt“ und stehen im Ergebnis; der Zähler im Kopf nennt sie als dritten Grund neben „abgehakt“ und „Muster“. Mustersprache, Längengrenze und Groß/Klein kommen aus R00025 (ein Baustein, kein Nachbau).

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen“ („Ausblendmuster und Suche helfen, das Wesentliche zu finden“) und das Lastprofil (2 000 geänderte Dateien).

Baut auf auf: [R00025](R00025-dateien-ausblenden.md) (Muster-Abgleich `passt`, Musterprüfung, Zählertext), [R00029](R00029-abgehakte-dateien-ausblenden.md) (die gemeinsame Sicht mit Gründen, Hinweis „gewählte Datei ausgeblendet“), [R00040](R00040-dateiliste-nach-gruppen.md) (Gruppen), [R00028](R00028-naechste-ungepruefte-datei.md) (nächste ungeprüfte), [R00030](R00030-tastaturbedienung.md) (Kürzel-Katalog), [R00035](R00035-seitenleiste-ein-und-ausklappen.md) (eingeklappt), [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Liste, Modi, Kopf).

**Abgrenzung:** [R00027](R00027-im-diff-suchen.md) sucht **im Text des Diffs** der gewählten Datei (Taste `/`); diese Anforderung sucht **unter den Dateinamen** der Liste. Zwei Felder, zwei Orte, zwei Wirkungen — sie teilen nur die Regel „Groß und klein unterscheiden“. R00025 blendet **dauerhaft per Aufruf oder Chip** aus; die Suche ist ein einzelner, flüchtiger Text, der sich mit einem Griff leeren lässt.

### Domänenbezug

Kein Glossar. „Suche“ meint hier nur die Dateiliste; „Muster“ ist das Muster aus R00025.

## Geschäftlicher Nutzen

In einer KI-Änderung mit 400 Dateien will der Mensch zwischendurch „alle SQL-Dateien“ oder „alles, was `app` heißt“ sehen, etwa um die Migrationen nacheinander zu lesen oder zu prüfen, ob zu `app.js` auch ein Test geändert wurde. Heute scrollt er durch die Liste oder blendet mit einem Muster aus — das ist ein Weg für Rauschen, nicht für „zeig mir nur das“. Mit einem Suchfeld über der Liste tippt er `*.sql` und hat die drei Dateien vor sich; leert er das Feld, ist die ganze Liste wieder da, und kein Haken und keine Datei ist dabei verloren gegangen.

## Funktionale Anforderungen

- **Suchfeld** in der Dateiliste, mit sichtbarer Beschriftung „Dateien suchen“ und einem Platzhalter („Name oder Muster, z. B. `*.sql`“). Die Liste folgt jeder Eingabe ohne Bestätigung.
- **Regel (die eine Stelle, die über „passt“ entscheidet):** Der Suchtext wird gegen den **Anzeigenamen** des Pfades gehalten (neuer Pfad bei Umbenennung, unsichtbare Zeichen als Marke `⟨U+202E⟩`, Rohbytes als `⟨0xFF⟩`; wer die Marke tippt, findet die Datei).
  - Enthält der Text **kein** `*`, `?` und `[`, passt jede Datei, deren Anzeigename ihn als **Teilzeichenkette** enthält (`app` findet `src/app.js` und `src/data/app.sql`).
  - Enthält er mindestens eins davon, gilt er als **Muster** und wird vom selben Abgleich `passt` geprüft wie in R00025 (ohne `/` gegen den Dateinamen jeder Ebene, mit `/` gegen den ganzen Pfad; `*` bleibt im Segment, `**` geht darüber).
  - **Groß und klein werden unterschieden**, wie in R00025 und R00027.
  - Ein leerer Text oder einer nur aus Leerraum ist **keine Suche**: alle Dateien stehen da, kein Zähler, keine Meldung.
- **Gültig:** 1 bis 200 Zeichen ohne Steuer- und Richtungszeichen (dieselbe Prüfung wie das Musterfeld, R00025). Ein ungültiger Text zeigt eine Meldung am Feld und **lässt die Liste so, wie der letzte gültige Text sie gemacht hat**. Führender und folgender Leerraum bleibt Teil des Textes (wie in R00025).
- **Sicht, nicht Auswahl:** Nicht passende Dateien verschwinden nur aus der **Anzeige** (beide Modi, flach und Baum, mit Gruppen). Haken, Stellen, Fortschritt „n von m abgehakt“, Gruppenköpfe (b zählt alle), Beenden und der Abschnitt `## Dateien` rechnen über die **ganze** Auswahl. Der Suchtext erreicht den Server nie.
- **Dritter Grund im Zähler (eine Sicht, ein Ort):** die Sicht aus R00029 bekommt den Grund „Suche“. Der Zähler im Kopf lautet „n ausgeblendet, davon a abgehakt, b Muster, c Suche“; ein Anteil von 0 entfällt, bei 0 Ausgeblendeten steht kein Zähler. Trifft eine Datei mehrere Gründe, wird sie einmal gezählt, und zwar bei dem ersten Grund der Reihe **Muster, Suche, abgehakt**. Das erweitert den Wortlaut aus R00029; dessen Fälle ohne Suche bleiben unverändert.
- **Gewählte Datei:** passt sie nicht (mehr), bleiben Wahl und Diff stehen, und über der Liste steht der Hinweis „Die gewählte Datei ist ausgeblendet“ (derselbe Hinweis wie in R00029, für jeden Grund).
- **Navigation folgt der gezeigten Liste:** `j`/`k`, `u` und „Nächste ungeprüfte“ springen nie auf eine nicht passende Datei; „Alles Sichtbare abgehakt, n ausgeblendet“ zählt auch die durch die Suche verdeckten offenen Dateien (PO Zeile 149).
- **Leerfall:** passt nichts, steht statt der Liste „Keine Datei passt zur Suche“ (Feld und Zähler bleiben bedienbar).
- **Zustand:** nur im Arbeitsspeicher der Seite, wie Muster und Schalter „Abgehakte ausblenden“; der Suchtext bleibt beim Wechsel von Datei, Commit, Modus und Darstellung, ein Neuladen leert ihn.
- **Kürzel `f`** (Empfehlung, offen — siehe Fragen): außerhalb von Feldern fokussiert `f` das Suchfeld; ist die Seitenleiste eingeklappt, klappt sie zuerst aus. Im Feld ist `f` Text; `Esc` im Feld leert es und gibt den Fokus an die gewählte Dateizeile zurück. `/` bleibt die Suche im Diff (R00027, PO Zeile 158). Der Eintrag steht einmal im Katalog von R00030.
- **Eingeklappte Seitenleiste:** der Suchtext bleibt wirksam, der Zähler im Kopf zeigt, dass gefiltert wird; das Feld liegt in der Seitenleiste und ist erst nach dem Ausklappen zu sehen.
- **Kein neuer Weg:** kein Endpunkt, kein `git`-Aufruf, keine Serveranfrage, keine Zeile auf stderr.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): Suchtext höchstens 200 Zeichen (Prüfung aus R00025, **einmal**). Die Arbeit je Suchlauf ist begrenzt, und Messen und Buchen stehen in **einer** Funktion: je geprüftem Pfad wird vor dem Abgleich gebucht, was er kostet (Teile des Musters × (Pfadlänge + 1), bei einer Teilzeichenkette Pfadlänge + 1); überschreitet die Summe das Budget von **20 000 000 Zellen** (Hypothese, ungemessen: 2 000 Pfade × 100 Zeichen × 100 Teile; ein Muster wie `*.sql` braucht bei 2 000 Dateien unter 1 Mio.), bricht der Lauf ab, die Meldung „Suche zu aufwendig — Text kürzen“ erscheint, und die Liste bleibt wie zuvor. Pfade bis 4 096 Zeichen, bis 2 000 Dateien (Lastprofil).
- **Zeit** (nur grobe Schranke, `AI-Team/gelerntes.md` „Keine harten Performance-Ziele“, R00047): keine Aufgabe des Hauptfadens friert die Seite länger als 2 s ein, auch bei 2 000 Dateien und einem 200 Zeichen langen Muster.
- **Sicherheit:** Pfade sind fremder Text und erscheinen nur per `textContent`; der Suchtext ist nie Regex, nie HTML, nie Argument eines Programms; der Abgleich ist der begrenzte, rückverfolgungsfreie Glob aus R00025.
- **Logging** (Pflichtpunkt 4): nur Browser — nichts auf stderr, der Suchtext steht in keinem Protokoll.
- **Benutzerfreundlichkeit:** Gestaltung aus kanbanD und Material 3 (Textfeld); der Entwurf Fassung 2 zeigt kein solches Feld, es ist wie das Musterfeld eine kleine Ergänzung. Das Feld ist per Tab erreichbar, sein Name beginnt mit dem sichtbaren Text, der Zähler ist Text, der Hinweis `<kbd>` und `aria-keyshortcuts` stehen am Feld.

## Akzeptanzkriterien

Vorbereitung: **Repo P** (neu, `user-stories/R00049.md`; Wegwerf-Ordner, nie das Projekt-Repo): Commit `p1` „Anlegen“ legt je mit einer Zeile an `README.md`, `db/001_anlegen.sql`, `db/002_aendern.sql`, `docs/api.md`, `src/app.js`, `src/data/app.sql`, `src/util.js`, `tests/app.test.js` (acht Dateien: Code 5, Tests 1, Doku 2); Commit `p2` „Ändern“ ändert `src/app.js` und `db/002_aendern.sql`. Aufruf `gitreviewA <p1> <p2> --kein-browser` (Start in „Zusammen“), wo nicht anders genannt. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server, nicht Playwright. Die Suche liegt **nicht** auf dem Hot Path; Playwright nur für Browser-Eigenes (Fokus, Tastatur, Neuladen, Einklappen, Zeit).

### Regel und Eingabe
- [ ] 1. Gegeben die Pfade von Repo P, wenn man sie gegen einen Suchtext hält, dann trifft `app` genau `src/app.js`, `src/data/app.sql` und `tests/app.test.js` (Teilzeichenkette); `readme` trifft nichts, `README` trifft `README.md` (Groß und klein verschieden); `*.sql` trifft `db/001_anlegen.sql`, `db/002_aendern.sql` und `src/data/app.sql` (Dateiname auf jeder Ebene); `db/*` trifft die beiden Dateien in `db`; `src/*` trifft `src/app.js` und `src/util.js`, **nicht** `src/data/app.sql` (ein `*` bleibt im Segment); `src/?pp.js` trifft `src/app.js`. Rechnung: 3 + 0 + 1 + 3 + 2 + 2 + 1. *Ebene: Unit.*
- [ ] 2. Gegeben die Liste mit `*.sql` (drei Dateien), wenn man das Feld leert, einen Text aus Leerraum oder einen aus genau 200 Zeichen eingibt, dann stehen bei leer und Leerraum alle acht Dateien da ohne Zähler und ohne Meldung, und der 200-Zeichen-Text wird angewendet; bei einem Text aus 201 Zeichen oder mit U+202E erscheint eine Meldung am Feld, und die Liste zeigt weiter die Treffer des letzten gültigen Textes. Der Text `⟨U+202E⟩` findet die Datei `ab⟨U+202E⟩.sql` (Name mit U+202E, nur im Fake). *Ebene: Unit (Prüfung, Regel) und Oberfläche gegen Fake (Meldung, Liste).*

### Liste, Zähler, Zusammenspiel
- [ ] 3. Gegeben „Zusammen“, wenn man `*.sql` eingibt, dann stehen nur `db/001_anlegen.sql`, `db/002_aendern.sql` und `src/data/app.sql` in der Liste, der Kopf nennt „5 ausgeblendet, davon 5 Suche“ und weiter „0 von 8 abgehakt“ (m bleibt 8); als Baum fehlen die Ordner `docs` und `tests`; in „Einzeln“ mit `p2` gewählt steht nur `db/002_aendern.sql` da, der Zähler lautet „1 ausgeblendet, davon 1 Suche“ und der Commit-Zähler „0 von 2“ (zwei Stellen); leert man das Feld, stehen wieder alle da, und der Zähler verschwindet. *Ebene: Oberfläche gegen Fake, vier Darstellungen abgetastet (Zusammen/Einzeln × flach/Baum).*
- [ ] 4. Gegeben der Aufruf mit `--ignore 'db/**'`, `README.md` abgehakt und „Abgehakte ausblenden“ an, wenn man `*.md` sucht, dann steht nur `docs/api.md` in der Liste, der Zähler lautet „7 ausgeblendet, davon 1 abgehakt, 2 Muster, 4 Suche“, und der Fortschritt bleibt „1 von 8 abgehakt“. Rechnung: `db/001` und `db/002` treffen Muster und Suche, zählen aber nur als Muster (2); von den übrigen sechs passen `README.md` und `docs/api.md`; `README.md` ist abgehakt (1), die vier anderen passen nicht zur Suche (4); 2 + 4 + 1 = 7. *Ebene: Unit (Sicht, Reihenfolge der Gründe) und Oberfläche gegen Fake.*
- [ ] 5. Gegeben „Zusammen“ (Gruppen aus R00040), wenn man `app` sucht, dann zeigt Code `src/app.js` und `src/data/app.sql` unter „Code 0 von 5 abgehakt“, Tests `tests/app.test.js` unter „Tests 0 von 1 abgehakt“, und Doku hat keinen Kopf; die Summe der Köpfe 0 von 8 ist der Fortschritt im Kopf. *Ebene: Oberfläche gegen Fake.*
- [ ] 6. Gegeben `app` gesucht, `src/app.js` gewählt und nichts abgehakt, wenn man `j` drückt, dann ist `src/data/app.sql` gewählt, beim zweiten `j` `tests/app.test.js`, beim dritten mit Umlauf `src/app.js` — `docs/api.md` und `README.md` werden nie gewählt; sind die drei abgehakt, ist „Nächste ungeprüfte“ nicht bedienbar und daneben steht „Alles Sichtbare abgehakt, 5 ausgeblendet“; ist `docs/api.md` gewählt und man sucht danach `app`, bleiben Wahl und Diff stehen, und über der Liste steht „Die gewählte Datei ist ausgeblendet“. *Ebene: Oberfläche gegen Fake, ein Fall Playwright (Tastatur).*
- [ ] 7. Gegeben ein Suchtext, der nichts trifft (`zzz`), wenn die Liste neu gezeichnet wird, dann steht „Keine Datei passt zur Suche“ statt der Liste, der Zähler lautet „8 ausgeblendet, davon 8 Suche“, und leert man das Feld, stehen alle acht Dateien wieder da; in einem Fake mit der zusätzlichen Datei `fremd<b>.txt` wird sie mit dem Text `<b>` gefunden und als Text gezeigt, nicht als HTML. *Ebene: Oberfläche gegen Fake.*

### Zustand, Tastatur, Ergebnis
- [ ] 8. Gegeben `*.sql` gesucht, wenn man Datei, Commit, Modus und Darstellung wechselt, dann bleibt der Suchtext stehen und wirkt in jeder Ansicht; klappt man die Seitenleiste ein, bleibt der Zähler im Kopf sichtbar und die Suche wirksam (`j`/`k` bleiben bei den drei Treffern); lädt man die Seite neu, ist das Feld leer und alle acht Dateien stehen da. *Ebene: Playwright (Neuladen, Einklappen — Browser-Eigenes) und Oberfläche gegen Fake (Wechsel).*
- [ ] 9. Gegeben die Seite geladen und kein Feld im Fokus, wenn man `f` drückt, dann steht der Fokus im Suchfeld (bei eingeklappter Seitenleiste ist sie vorher ausgeklappt); tippt man in dem Feld `f`, erscheint der Buchstabe als Text und löst nichts aus; `Esc` leert das Feld und der Fokus steht auf der gewählten Dateizeile; `/` fokussiert weiter das Suchfeld im Diff und nicht dieses; im Katalog steht `f` genau einmal (Bereich Liste), und das Feld trägt den Hinweis `f` und `aria-keyshortcuts="f"`. *Ebene: Unit (Katalog) und Playwright (Fokus, Tastatur — Browser-Eigenes).*
- [ ] 10. Gegeben `*.sql` gesucht und `README.md` abgehakt, wenn man beendet (`gitreviewA <p1>`), dann ist stdout Byte für Byte so wie im Lauf ohne Suche: „Abgehakt: 1 von 8“, „Ungeprüft: 7 von 8“, und die Liste der Ungeprüften nennt auch `docs/api.md (Commit <voller Hash von p1>)`, die nicht passte. *Ebene: Playwright (Suche im Browser, Beenden, stdout verglichen).*

### Grenzen
- [ ] 11. Gegeben 2 000 Dateien mit Pfaden bis 4 096 Zeichen und ein 200 Zeichen langes Muster aus vielen `*`, wenn man es eingibt, dann bucht der Suchlauf vor jedem Abgleich seine Kosten, die tatsächliche Arbeit (gezählte Zellen) ist höchstens die Buchung — bei 1, 10, 30 und 2 000 Pfaden —, bei Überschreiten des Budgets bricht er ab, die Meldung „Suche zu aufwendig — Text kürzen“ steht am Feld, und die Liste bleibt wie zuvor; die Seite friert dabei nicht länger als 2 s ein. Das Eintippen von `*.sql` verursacht keine zusätzliche Serveranfrage und keinen `git`-Aufruf (Zählung wie in R00025) und schreibt nichts auf stderr. *Ebene: Unit (Zähler am einzigen Ort), Integration (Aufrufzählung) und ein Fall Playwright (2-s-Schranke, ereignisgenau).*

Grenz- und Leerfälle bedacht: leerer Text und Leerraum (Kriterium 2), 200/201 Zeichen (2), Steuer- und Richtungszeichen (2), eine Suche ohne Treffer (7), alle Dateien durch Muster ausgeblendet und dazu eine Suche (Kriterium 4 zählt jede Datei einmal; der Leerfall-Text aus R00029 „Alle Dateien ausgeblendet“ gilt, wenn **kein** Treffer der Suche übrig ist und Muster oder Abgehakte beteiligt sind — sonst „Keine Datei passt zur Suche“), eine wörtliche Klammer im Suchtext (`[` gilt als Muster; `[[]` findet ein wörtliches `[`), ein Rohbyte-Name (Marke tippbar, Kriterium 2). Verworfen: Treffer markieren und springen statt filtern (Fragen), Suchtext als regulärer Ausdruck, mehrere Suchtexte als Chips (dafür gibt es die Muster aus R00025), Suche im Alten Pfad einer Umbenennung.

**Pflichtpunkte der Detailplanung**: 1 Grenzen — NFA „Grenzen“, Kriterien 2 und 11 (Länge 200, Aufwand je Lauf, Pfadlänge 4 096; die Meldung nennt den Suchtext nicht, es gibt keine Ausgabe auf stdout); 2 Anzeigeverfahren — Kriterien 3–5 („Zusammen“ zuerst, „Einzeln“, flach und Baum, Gruppen, beide anderen Ausblendgründe; die Diff-Verfahren (untereinander/nebeneinander, Umbruch, Lücken) sind nicht betroffen, die Suche wirkt nur auf die Liste); 3 festes Layout — das Feld ist eine Zeile fester Höhe im Kopf der Dateiliste, die Meldung eine Zeile; nichts wächst über oder neben dem Rollbereich der Liste (R00033); 4 Ausführungsort — nur Browser, nichts auf stderr; 5 eine Stelle — die Regel (Kriterium 1) bestimmt „passt“, die eine Sicht (Kriterium 4) bestimmt „ausgeblendet“ und den Zähler; Liste, Gruppen, Navigation und Meldung lesen nur sie, das Ergebnis kennt sie nicht (Kriterium 10). **Nicht betroffen:** die Dateiansicht `--dateien` (eigene Laufart, höchstens 50 Dateien — eine Suche dort wäre eine eigene Karte).

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/web/` — neuer reiner Baustein `dateisuche-werte.js` (Regel, Prüfung, Suchlauf mit Aufwandsbuchung) und `dateisuche.js` (Feld, Meldung, Zustand, Kürzel-Anschluss); `abgehakte-werte.js` bekommt den dritten Grund; `ausblenden-werte.js` liefert `passt` und `musterFehler` **unverändert** und eine kleine Aufwandsangabe; `dateiliste.js`, `naechste.js`, `tasten-werte.js`/`tasten.js`, `index.html`, `gitreviewa.css`.
- `tests/` (Node-Unit, Wegwerf-Repo P, Oberfläche gegen Fake) und `e2e/` (DSL `dateisuche`).
- **Kein** C#-Code, kein Endpunkt: der Server bleibt unberührt.

## Technische Überlegungen

**Vorplanung** — Bubbles B4501–B4507 unter I0050; welche es am Ende werden, entscheidet der Entwickler beim Bauen. Der „Interactor“ der Interaction ist der reine Baustein (Anfrage: Suchtext und Einträge, Ergebnis: Sicht), wie bei R00025 und R00029; Adapter (Feld, Liste) tragen keine Logik.

### Ablauf

1. **Text prüfen** — `musterFehler(text, 0)` aus R00025; Leerraum und leer sind keine Suche.
2. **Suchlauf** — je Eintrag der gezeigten Liste: Kosten buchen, dann Abgleich (Teilzeichenkette oder `passt`); bei Überschreiten des Budgets abbrechen.
3. **Sicht** — die gemeinsame Sicht (`abgehakte-werte.js sicht`) bekommt die Treffermenge als dritten Grund; Zähler und Leerfall aus ihr.
4. **Zeichnen** — Liste (flach/Baum, Gruppen), Zähler im Kopf, Hinweis „gewählte Datei“; `naechste.js` und `j`/`k` lesen die gezeigte Liste.
5. **Kürzel** — `f` öffnet die Seitenleiste bei Bedarf und fokussiert das Feld.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `dateiliste.js sichtVon` (Sicht), `abgehakte-werte.js sicht`/`zaehlertext`/`meldung` (dritter Grund), `tasten-werte.js` (Eintrag `f`).

- JS `dateisuche-werte.js` (Operation, rein, Node und Browser) — `suchtextFehler(text)` → `null` oder Meldung (ruft `musterFehler`), `trifft(text, anzeigename)` → bool (Teilzeichenkette oder `passt`), `suchlauf(text, eintraege, budget)` → `{ treffer, abgebrochen, gebucht }`.
- JS `dateisuche.js` (Adapter) — Feld, Meldung, Zustand im Speicher, Ereignis `suche-geaendert`.

### Änderungen an bestehenden Klassen

`abgehakte-werte.js` (`sicht`, `zaehlertext`, `meldung` um den Grund „Suche“), `abgehakte.js` (Hinweis „gewählte Datei“ für jeden Grund), `dateiliste.js` (Sicht und Gruppen), `naechste.js` (verdeckte Dateien), `tasten-werte.js` (Eintrag `f`), `index.html`/`gitreviewa.css` (Feld). `ausblenden-werte.js`: nur eine Aufwandsangabe zusätzlich, `passt` und `musterFehler` unverändert. `ErgebnisFormatierer`, `Hakenspeicher` und der ganze Server bleiben **unberührt**.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Akzeptanz gegen den reinen Baustein und die Oberfläche mit Fake, Playwright nur für Browser-Eigenes — **die Suche liegt nicht auf dem Hot Path.**

**Unit (rein, Node):** Regel (alle Beispiele aus Kriterium 1, Marke, Rohbyte-Name, `[[]`), Prüfung (leer, Leerraum, 200/201, U+202E), Aufwandszähler (Arbeit ≤ Buchung bei 1, 10, 30, 2 000 Pfaden, Budget überschritten), Sicht mit drei Gründen (Reihenfolge Muster, Suche, abgehakt; Zählertext in allen Anteilen), Katalog (`f` genau einmal).
**Integration:** Oberfläche gegen Fake (Kriterien 2–7), Aufrufzählung (kein zusätzlicher Aufruf), jeweils auch mit verzögert antwortendem Fake beim Moduswechsel.
**E2E (Playwright, nur Browser-Eigenes):** Fokus und Tastatur (`f`, `Esc`, `/` bleibt), Neuladen, Einklappen, Beenden-Vergleich (Kriterium 10), 2-s-Schranke. Ein Fall je Eigenschaft.

## Abhängigkeiten

- Abhängig von: R00025/I0013 (Muster-Abgleich, grün), R00029/I0026 (Sicht, grün), R00040/I0041 (Gruppen, grün), R00028/I0025 (nächste ungeprüfte, grün), R00030/I0015 (Katalog, grün), R00012/I0027 (Liste, grün).
- Blockiert: nichts. Parallel baubar zu I0031 (Suche im Diff) und zu den Karten am Diff.

Nicht Teil dieser Anforderung (eigene Karten, falls gewünscht): Treffer in der Liste markieren und mit Pfeilen springen (Frage 1), unscharfe Suche wie „Gehe zu Datei“ (Buchstaben in Reihenfolge), Suche unabhängig von Groß/Klein, Suche in der Dateiansicht `--dateien`, Suche im Inhalt der Dateien.

## Offene Fragen

An den product-owner (die Empfehlung ist vorläufig eingearbeitet und gilt bis zur Antwort):

1. **Filter oder Suche mit Springen?** Empfehlung: **Filter** — nur passende Dateien stehen in der Liste. Die Liste führt die Prüfung (Vision „die Dateien führen“), bis 2 000 Dateien lassen sich durch Zeigen und Weglassen schneller überblicken als durch Springen, und der Filter nutzt die vorhandene Sicht samt Zähler, Gruppen und Navigation. So macht es der Dateifilter von GitHub (PO Zeilen 136/137). Alternative: die Liste bleibt voll, Treffer sind markiert, Enter springt zum nächsten (wie „Im Diff suchen“, R00027) — das braucht eine eigene Treffer-Navigation und lässt das Rauschen stehen.
2. **Verhältnis zu den Haken und zum Ergebnis?** Empfehlung: **Sicht, nicht Auswahl** — m, Haken, Gruppenköpfe und das Ergebnis über die ganze Auswahl; der Zähler nennt die Suche als dritten Grund („…, c Suche“). Das folgt PO Zeile 136 (ausgeblendete Dateien zählen in m); offen ist nur der Wortlaut des Zählers und die Reihenfolge der Gründe (Muster, Suche, abgehakt). Alternative: gesuchte Dateien fallen aus m — dann ändert sich der Vertrag mit der KI.
3. **Tastenkürzel?** Empfehlung: **`f`** (Bereich Liste), weil `/` für die Suche im Diff vergeben ist (PO Zeile 158) und `f` im Katalog frei ist (Strg-Kombinationen sind ausgeschlossen, R00030). Alternativen: `/` für die Dateiliste und eine andere Taste für den Diff (ändert eine entschiedene Zeile), oder kein Kürzel (die Suche bliebe ohne Tastaturweg, gegen „Alles per Tastatur“).
4. **Eingabeform?** Empfehlung: **ein Feld, zwei Arten** — ohne `*`, `?`, `[` eine Teilzeichenkette („Enthält“), mit eins davon ein Muster nach R00025. So findet `app` ohne Umweg `app.js`, und der Betreiber, der „nach Mustern“ suchen will, schreibt `*.sql` oder `db/*`. Alternative: immer Muster (dann braucht „app“ ein `*app*`) oder zwei Felder.
5. **Groß und klein?** Empfehlung: **unterscheiden**, wie R00025 und R00027 (PO Zeilen 137/145). Folge: `readme` findet `README.md` nicht; eine Suche ohne Rücksicht auf Groß/Klein (wie GitHub und „Gehe zu Datei“) wäre ein späterer Schalter — wenn der Betreiber es im Alltag vermisst.

Ohne Rückfrage entschieden (Begründung unter „Notizen“): ein einzelner Suchtext (kein Chip), live ohne Bestätigung, Treffer gegen den Anzeigenamen (neuer Pfad bei Umbenennung), Abbruchgrenze als Aufwandsbudget, `Esc` leert, die Dateiansicht bleibt außen vor.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00025/R00040 hinaus.

## Manuelle Nachbereitungstätigkeiten

- README: der Absatz zur Dateiliste nennt die Suche, sobald sie grün ist (Auftrag an den dokumentar, nicht Teil dieser Karte).

## Umfang

Gezählt (bis Bubble geplant, Richtwerte je Bubble ungemessen, Hypothese): 7 Bubbles unterhalb I0050 (B4501–B4507), davon 3 klar (2 h) und 4 unklar (2–4 h) — Untergrenze 14 h, obere Schätzung 22 h. Enthalten: nur I0050. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: Der Betreiber (2026-11-25, wörtlich): „Ich möchte in der Dateiliste gerne nach Mustern suchen können.“ Wenn ein Suchfeld über der Liste nach jeder Eingabe nur die passenden Dateien zeigt und ein Muster wie `*.sql` versteht, dann sieht der Mensch in einer langen Änderung sofort die Gruppe, die er gerade lesen will, statt zu scrollen oder ein Ausblendmuster zu bauen, das er danach wieder entfernen muss. Weil die Suche eine Sicht ist, die den Server nie erreicht, bleibt jede nicht passende Datei abhakbar und im Ergebnis genannt — die KI erfährt weiter, was nicht angesehen wurde. Der Hebel ist die Wiederverwendung: dieselbe Mustersprache, dieselbe Sicht, derselbe Zähler wie bei R00025 und R00029, ein Grund mehr statt eines neuen Mechanismus.

## Missing-Docs

- Gestaltung des Feldes im Kopf der Dateiliste neben dem Musterfeld: zwei Eingabefelder untereinander müssen unterscheidbar sein („Dateien suchen“ gegen „Muster ausblenden“); vor dem Bauen gegen kanbanD und Material 3 (Text field, Search) prüfen — der Entwurf Fassung 2 zeigt kein Feld.
- Belege der Referenzprodukte (GitHub-Dateifilter, VS Code „Gehe zu Datei“) sind hier nicht neu abgerufen; die GitHub-Angabe stützt sich auf die Abruf-Fundstelle in PO Zeilen 136/137 (2026-11-25), die Aussage zu VS Code (unscharf, ohne Rücksicht auf Groß/Klein, springt statt zu filtern) auf Wissen ohne Fundstelle.

## Notizen

### Optionen (Wirkung der Suche)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. Filter als dritter Grund der gemeinsamen Sicht, Abgleich im Browser (gewählt)** | Regel und Sicht als Unit unter Node; Oberfläche gegen Fake; kein Serverweg | ein Feld mehr neben dem Musterfeld (Verwechslung); die Sicht bekommt einen dritten Grund | klein |
| 2. Suche mit Treffermarkierung und Springen, Liste bleibt voll | Treffer-Navigation braucht eigenen Zustand (Position, Umlauf) wie R00027 | lässt das Rauschen stehen; zwei Orte, die „aktuelle Datei“ bestimmen (Treffer und Wahl) | mittel |
| 3. Server filtert (`git ls-files`/Pathspec) | am nächsten an git | Suchtext als Argument an ein fremdes `git`; die Auswahl würde still kleiner; Leitplanke „nie an git“ | groß |

Gewählt: **1.** Die Suche ist eine Darstellung der geladenen Liste; sie braucht weder einen neuen Weg noch einen neuen Zustand beim Server, und alles, was die Sicht schon kann (Zähler, Gruppen, Navigation, Hinweis zur gewählten Datei), kommt ohne Nachbau mit. **Option 2** ist der Rückfall, falls der Betreiber Springen statt Filtern will (Frage 1). **Option 3** verworfen wie bei R00025.

### Wiederverwendete Bausteine (kein Nachbau)

- `passt(muster, pfad)` und `musterFehler(text, anzahlBisher)` in `src/GitReviewA/web/ausblenden-werte.js` (Muster-Abgleich, Prüfung 200 Zeichen/Steuerzeichen) — unverändert, nur eine Aufwandsangabe kommt hinzu.
- `sicht(eintraege, muster, schalter)`, `zaehlertext`, `meldung` in `src/GitReviewA/web/abgehakte-werte.js` — um den dritten Grund erweitert, keine zweite Sichtrechnung.
- `sichtbarerName` in `src/GitReviewA/web/dateiliste-werte.js` (Anzeigename mit Marken) — der Text, gegen den gesucht wird.
- Gruppenzähler `gruppen-werte.js` (b zählt alle), Navigation `naechste.js`/`tasten.js` (gezeigte Liste), Katalog `tasten-werte.js` (ein Eintrag).

### Verworfene Alternativen

- **Immer Muster:** `app` fände nur eine Datei, die genau so heißt; das Wort „suchen“ verspräche mehr.
- **Suchtext als Regex:** ReDoS-Risiko, ungewohnt für Dateinamen (wie R00025).
- **Unscharfe Suche („Gehe zu Datei“):** eigene Rangfolge und eine zweite Mustersprache; nicht beauftragt.
- **Suchtext im Ergebnis oder im Protokoll:** der Suchtext ist Sicht, nicht Befund.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-26 | Angelegt | Karte #33, Auftrag des Betreibers 2026-11-25 („Ich möchte in der Dateiliste gerne nach Mustern suchen können.“); Fragen 1–5 offen, Empfehlungen eingearbeitet |
