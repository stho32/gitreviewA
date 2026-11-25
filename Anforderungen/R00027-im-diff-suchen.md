---
id: R00027
status: Neu
datum: 2026-11-25
---

# R00027: Im Diff suchen

## Beschreibung

Der prüfende Mensch sucht im gezeigten Diff nach einem Textstück: ein Suchfeld markiert jedes wörtliche Vorkommen in den Zeilen, die gerade dastehen, ein Zähler nennt die Stelle („k von n“), und mit Enter springt er zum nächsten, mit Umschalt+Enter zum vorigen Treffer. Gesucht wird **nur in der gezeigten Datei** — nur in den Zeilen, die der Diff-Bereich gerade zeigt (in „nur Änderungen“ wie in „ganze Datei“) —, wörtlich (kein regulärer Ausdruck) und mit unterschiedener Groß-/Kleinschreibung. Zugeklappte Zeilen und nicht geladene Diffs werden nicht durchsucht; es wird nichts nachgeladen und kein neuer `git`-Aufruf gemacht.

Zahlt ein auf: [Vision](R00000-vision.md) — „Anmerkungen an Stellen“ („Ausblendmuster und Suche helfen, das Wesentliche zu finden“) und das Lastprofil („Diffs werden je Datei bei Bedarf geladen“).

Baut auf auf: [R00004](R00004-diff-einer-datei-lesen.md) (Diff-Bereich, Zeilenaufbau `{art, alt, neu, text}`, `patchZeilen`, `sichtbarTeile`, Marken `⟨U+202E⟩`), [R00008](R00008-ganze-datei-mit-diff.md) (Ansicht „ganze Datei“), [R00007](R00007-syntaxhervorhebung.md) (Färbung — die Treffermarke darf sie nicht brechen), [R00017](R00017-grosse-diffs.md) (zugeklappte große Datei: keine Treffer ohne gezeigte Zeilen), [R00012](R00012-oberflaeche-liste-detail-zusammen.md)/I0027 (der Diff-Werkzeugkasten, in dem das Suchfeld lebt). Alle außer I0027 sind grün.

**Abgrenzung (Schnitt, WBS-Notiz zu I0013):** Die ursprüngliche Interaction „Ausblenden und Suchen“ wurde geteilt: [R00025](R00025-dateien-ausblenden.md) trägt das Ausblenden (es bringt die neue Aufrufoption `--ignore`, also neues Verhalten an der Systemgrenze), die Suche ist dieser Slice. Sie bleibt ganz im Browser: **kein neuer Serverweg, kein neuer `git`-Aufruf.**

**Entscheidung des product-owners (2026-11-25, `AI-Team/po-entscheidungen.md` Zeile 139):** Gesucht wird nur im gezeigten Diff (auch in „ganze Datei“); kein Nachladen anderer Diffs, keine Treffer in zugeklappten oder ungeladenen Dateien.

## Geschäftlicher Nutzen

In einer großen, von einer KI geänderten Datei sucht der Mensch ein Symbol — einen Bezeichner, eine Konstante, eine Zeichenkette —, das an vielen Stellen vorkommt. Ohne Suche scrollt er die ganze Datei durch, verliert die Stelle aus dem Blick und übersieht beim Review die eine Zeile, auf die es ankommt; die KI erfährt davon nichts, weil „Keine Anmerkungen.“ wie Freigabe aussieht. Mit Suche markiert er alle Vorkommen auf einen Blick und springt sie der Reihe nach durch, im Diff und ohne den Editor zu öffnen. Weil die Suche nur die schon gezeigten Zeilen liest, kostet sie keinen zusätzlichen `git`-Aufruf und keinen zusätzlichen Serverweg — sie bleibt eine Sicht auf das, was ohnehin dasteht.

## Funktionale Anforderungen

- **Suchfeld** im Diff-Werkzeugkasten (I0027), neben „Umbruch“/„Ansicht“; per Tab erreichbar und mit Namen für Screenreader. Enter sucht und springt zum nächsten Treffer, Umschalt+Enter zum vorigen. Ein eigenes Tastenkürzel gibt es hier **nicht** — es gehört zu I0015 (Tastaturbedienung).
- **Wörtlich, kein Regex**: der Suchbegriff wird als Zeichenkette gesucht, nie als regulärer Ausdruck (kein ReDoS); `.*`, `[`, `\` und dergleichen haben keine Sonderbedeutung. Groß- und Kleinschreibung werden **unterschieden** (wie das Dateisystem unter Linux).
- **Nur die gezeigte Datei**: gesucht wird ausschließlich in den Zeilen, die der Diff-Bereich gerade zeigt — in „nur Änderungen“ und in „ganze Datei“ gleich. Zugeklappte Zeilen (R00017) und nicht geladene Diffs werden nicht durchsucht; es wird nichts nachgeladen und kein neuer `git`-Aufruf gemacht. Eine aufgeklappte Lücke (R00026) ist eine gezeigte Zeile und wird mitdurchsucht.
- **Gezeigter Text**: gesucht wird der Text, der dasteht — ein unsichtbares Zeichen steht als Marke `⟨U+202E⟩` da und ist genau so auffindbar; das rohe Steuerzeichen ist nicht auffindbar. Mehrere Treffer je Zeile zählen einzeln.
- **Markierung**: jedes Vorkommen wird als eigener Bereich im Text markiert, per DOM-Bereich und `textContent` (nie `innerHTML`); der Text jeder Zeile, die Zeilennummern, die Marken und die Färbung bleiben unverändert.
- **Zähler und Springen**: der Zähler nennt „k von n“ (aktueller Treffer von allen), „keine Treffer“ bei 0; vor und zurück mit Umlauf über die Treffer der gezeigten Datei.
- **Wechsel**: der Suchbegriff bleibt im Feld; beim Wechsel von Datei, Commit oder Ansicht werden die Treffer für die neu gezeigte Datei gerechnet und die Position beginnt bei 1; eine späte Antwort einer früheren Wahl wird verworfen. Die Färbung nimmt die Markierung nicht weg (sie wird nach dem Ende der Färbung erneut aufgetragen).
- **Grenzen**: Suchbegriff 1–200 Zeichen (leer oder über 200 → Meldung im Feld, keine Suche); höchstens 10 000 Treffer werden gezählt und markiert (darüber nennt der Zähler als Gesamtzahl „10000+“ statt einer Zahl).
- **Sicherheit**: der Suchbegriff ist Eingabe des Menschen; er geht nie an `git` und erscheint nie im Protokoll im Wortlaut (nur als Länge). Treffer und fremder Text erscheinen nur als Text.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): bei 20 000 Zeilen stehen Markierung und Zähler spätestens 1 s nach dem Enter (Messwert ≤ 0,7 s, ≥ 30 % Abstand, `rollen/planer/zeitkriterien.md`); während des Markierens dauert keine Aufgabe des Hauptfadens länger als 150 ms (Long Tasks, wie R00007).
- **Sicherheit** (`AI-Team/gelerntes.md`): kein Regex aus fremder Hand (ReDoS — der Suchbegriff ist fremde Eingabe); Treffer per `textContent`, nie `innerHTML`; kein neuer Serverweg, kein neuer `git`-Aufruf; der Suchbegriff erscheint nie im Protokoll im Wortlaut, nur als Länge. Fremder Text (Diff-Zeilen, Marken) bleibt Text.
- **Logging**: stdout bleibt leer; je Suche eine Debug-Zeile auf stderr (Länge des Suchbegriffs, Zahl der Treffer).
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und dem Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`); das Suchfeld ist per Tab erreichbar und trägt einen Namen, der mit dem sichtbaren Text beginnt; Zustand ohne Sackgasse („keine Treffer“ ist ein Ergebnis, kein Fehler).

## Akzeptanzkriterien

Vorbereitung: **Wegwerf-Repo Y** (eigener Ordner im Temp-Verzeichnis, nie das Projekt-Repo; mit `git` allein herstellbar): Commit `y1` „Anlegen“ fügt hinzu `suche.txt` (7 Zeilen `z01 eins zwei`, `z02 zwei drei`, `z03 drei zwei`, `z04 vier`, `z05 zwei vier`, `z06 a.c`, `z07 abc`), `fremd.txt` (2 Zeilen `var s = "<b>x</b>";` und `var t = "a`U+202E`b";`), `farbig.js` (2 Zeilen `function gruss() { return "Hallo"; }`, `return gruss();`), `gross.txt` (20 000 Zeilen `zeile 00001` … `zeile 20000`) und `riesig.txt` (30 000 Zeilen `zeile 00001` … `zeile 30000`). Aufruf `gitreviewA <y1> --kein-browser`, Seite über die Startzeile; „wählen“ heißt Klick in der Dateiliste, „suchen“ heißt den Suchbegriff ins Suchfeld eingeben und Enter drücken. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Die Suche liegt **nicht** auf dem Hot Path (`AI-Team/factory.md`); Playwright nur für Browser-Eigenes (Feld, Fokus, Markierung, Springen, DOM-Sicherheit, Zeit).

### Suchen in der gezeigten Datei
- [ ] Gegeben Repo Y und `suche.txt` gewählt, wenn man `zwei` sucht, dann sind die vier Vorkommen markiert (`z01`, `z02`, `z03`, `z05`), der Zähler nennt „1 von 4“, und der erste Treffer ist der aktuelle. *Ebene: JS-Unit (B2602, B2603) und Oberfläche (Markierung, Zähler).*
- [ ] Gegeben dasselbe, wenn man viermal Enter drückt und danach einmal Umschalt+Enter, dann steht nacheinander „2 von 4“, „3 von 4“, „4 von 4“ und wieder „1 von 4“ (Umlauf), und der aktuelle Treffer ist jeweils im Blick. *Ebene: JS-Unit (Umlauf) und Playwright (Enter/Umschalt+Enter im Feld, Springen — Browser-Eigenes).*
- [ ] Gegeben `suche.txt`, wenn man `zzz` sucht, dann steht „keine Treffer“ und keine Zeile ist markiert. *Ebene: JS-Unit und Oberfläche.*
- [ ] Gegeben `suche.txt` mit dem Suchbegriff `zwei` (4 Treffer), wenn man `fremd.txt` wählt, dann bleibt `zwei` im Feld, `fremd.txt` zeigt „keine Treffer“, und der Zähler beginnt bei 1; wählt man wieder `suche.txt`, stehen wieder vier Treffer da. Die Suche hat dabei keinen zusätzlichen `git`-Aufruf gemacht (Zahl der `git`-Aufrufe wie ohne Suche). *Ebene: Oberfläche (Wechsel) und Prozessprobe (Aufrufzählung).*
- [ ] Gegeben `riesig.txt` (über der Zuklappgrenze, zugeklappt, keine Zeile steht da), wenn man `zeile` sucht, dann steht „keine Treffer“ und es wird keine Zeile gezeigt; erst „Trotzdem laden“ zeichnet die Zeilen, und danach findet dieselbe Suche Treffer. *Ebene: Oberfläche und Playwright (Browser-Eigenes).*

### Wörtlich, Groß/Klein und fremder Text
- [ ] Gegeben `suche.txt`, wenn man `a.c` sucht, dann ist nur `z06` markiert (die Zeichenkette `a.c` wörtlich) und `z07` (`abc`) nicht; sucht man `.*`, dann steht „keine Treffer“. *Ebene: JS-Unit (kein Regex).*
- [ ] Gegeben `suche.txt`, wenn man `ZWEI` sucht, dann steht „keine Treffer“ (Groß und klein sind verschiedene Zeichen), während `zwei` die vier Vorkommen findet. *Ebene: JS-Unit und Oberfläche. (Nach der Empfehlung „unterscheiden“; offene Frage 1.)*
- [ ] Gegeben `fremd.txt`, wenn man `<b>` sucht, dann ist `<b>` in der Zeile als sichtbarer Text markiert, es entsteht kein `<b>`-Element und kein Dialog, der übrige Text der Zeile bleibt unverändert; wenn man `⟨U+202E⟩` sucht, dann ist die Marke in `var t = "a⟨U+202E⟩b";` markiert, die Marke bleibt als solche stehen, und das rohe Zeichen steht nicht im Dokument. *Ebene: Playwright (DOM-Sicherheit, Browser-Eigenes) und JS-Unit (Suchtext ist der gezeigte Text).*

### Färbung und Wechsel
- [ ] Gegeben `farbig.js` fertig gefärbt (`data-farbe="ja"`), wenn man `return` sucht, dann ist `return` markiert **und** trägt weiter seine Farbrolle (dasselbe Stück trägt die Klasse `tk-k`), der Text jeder Zeile ist unverändert, und `data-farbe` bleibt „ja“. *Ebene: Playwright (Browser-Eigenes).*
- [ ] Gegeben die Färbung von `farbig.js` läuft noch (`data-farbe="laeuft"`), wenn man sucht und die Färbung danach endet, dann bleiben die Treffer markiert (die Markierung wird nach dem Ende der Färbung erneut aufgetragen). *Ebene: Playwright (verzögerter Fake-Worker, Browser-Eigenes).*
- [ ] Gegeben `suche.txt` mit Suchbegriff `zwei` und die Antwort des Diffs ist um 1,5 s verzögert, wenn man innerhalb der Verzögerung `fremd.txt` wählt, dann stehen am Ende die Treffer von `fremd.txt` (keine Treffer) und nicht die späte Markierung von `suche.txt`. *Ebene: Oberfläche (verzögerter Fake).*

### Grenzen
- [ ] Gegeben `gross.txt` (20 000 Zeilen, jede enthält `zeile`) gewählt, wenn man `zeile` sucht, dann stehen Markierung und Zähler spätestens 1 s nach dem Enter (Messwert ≤ 0,7 s, ereignisgenau), höchstens 10 000 Treffer sind gezählt und markiert, der Zähler nennt „1 von 10000+“, und während des Markierens dauert keine Aufgabe des Hauptfadens länger als 150 ms (Long Tasks, `PerformanceObserver`). *Ebene: Playwright (Zeit und Long Tasks im Browser, ereignisgenau, Browser-Eigenes) und JS-Unit (Treffergrenze).*
- [ ] Gegeben ein Suchbegriff aus 201 Zeichen, wenn man ihn eingibt und Enter drückt, dann steht eine Meldung im Feld und es wird nicht gesucht (keine Markierung, kein Zähler); ein Suchbegriff aus genau 200 Zeichen sucht. *Ebene: JS-Unit (B2601) und Oberfläche.*

## Betroffene Verzeichnisstruktur

Wie in [R00004](R00004-diff-einer-datei-lesen.md) (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- `web/` — neuer reiner Baustein `suche-werte.js` (Suchbegriff prüfen, Treffer finden, Treffer auf die Textteile legen; läuft unter Node und im Browser, wie `diff-werte.js`) und `suche.js` (Suchfeld, Zähler, Markierung, Springen, Anschluss an Färbung und Wechsel); `diff.js` liefert die gezeigten Zeilen und meldet `diff-gezeichnet`/`data-farbe`.
- Server: **keine Änderung** — die Suche läuft ganz im Browser über die schon gezeigten Zeilen.
- `tests/` und `e2e/` — Wegwerf-Repo Y, DSL `suche`, Treiber; Unit-Tests des Bausteins unter Node.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen (Optionen unter „Notizen“). Der Entwurf Fassung 2 zeigt **kein** Suchfeld („Weiter ohne Suchen“); das Suchfeld ist eine kleine Ergänzung im Diff-Werkzeugkasten, seine Gestaltung folgt kanbanD und Material 3.

### Ablauf

1. **Suchbegriff prüfen** — leer oder über 200 Zeichen → Meldung im Feld, keine Suche (B2601).
2. **Treffer finden** — über den gezeigten Text jeder Zeile (`sichtbarTeile`), wörtlich, Groß/Klein unterschieden, bis zur Treffergrenze (B2602).
3. **Treffer auf die Textteile legen** — die Spannen je Zeile auf die Teile abbilden, damit sie ohne Umbau des Textes markierbar sind (B2603).
4. **Markieren und Springen** — je Treffer ein eigenes Element um den Text legen (`textContent`, kein `innerHTML`), den aktuellen Treffer in den Blick holen, vor/zurück mit Umlauf, in Häppchen (B2605); Feld und Zähler (B2604).
5. **Anschluss** — neues Zeichnen, Ende der Färbung, Datei-/Commit-/Ansichtswechsel und Zuklappen rechnen die Treffer neu oder verwerfen sie; nichts wird nachgeladen (B2606).

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `diff.js` (gezeichnete Zeilen, `diff-gezeichnet`, `data-farbe`), der Diff-Werkzeugkasten aus I0027, neuer reiner Baustein `web/suche-werte.js`.

- `Suchbegriff` (Wert, rein) — der geprüfte Suchtext; `pruefe(text)` → `Gueltig` oder `Abgelehnt(Grund: leer, zuLang)`.
- `Treffer` (DTO, immutable) — Zeilenindex und Zeichenspanne im gezeigten Text.
- `Trefferliste` (benannte Collection) — die Treffer in Reihenfolge; `Anzahl`, `Aktuell`, `Weiter`/`Zurueck` mit Umlauf.
- JS `suche-werte.js` (Operation, rein, läuft unter Node und im Browser) — `pruefe(text)`, `finde(gezeigteTexte, begriff)`, `aufTeile(teile, treffer)`, `zaehlertext(aktuell, gesamt)`.
- JS `suche.js` (Oberfläche) — Suchfeld, Zähler, Markierung (DOM-Bereich), Springen; hört auf `diff-gezeichnet`, `datei-gewaehlt`, `commit-gewaehlt` und den Wechsel von Ansicht/Färbung.

### Änderungen an bestehenden Klassen

`diff.js` (meldet `diff-gezeichnet` mit Bereich und Zeilen — schon vorhanden; `data-farbe` als Anschluss), `index.html`/`gitreviewa.css` (Suchfeld im Diff-Werkzeugkasten, Stil der Treffermarke). `patchZeilen`, `ganzeDateiZeilen`, `sichtbarTeile`, `bloecke`, `zuLang` und die Färbung (`faerben.js`, `farbschlange.js`) bleiben **unberührt**.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction, Akzeptanz gegen die Oberfläche mit Fake, Playwright nur Hot Path und Browser-Eigenes — **die Suche liegt nicht auf dem Hot Path.**

**Unit (rein, unter Node):**
- `pruefe` — leer, nur Leerraum, 200/201 Zeichen.
- `finde` — mehrere Treffer je Zeile, kein Treffer, Treffer am Zeilenrand, Sonderzeichen wie `.*`/`[`/`\` (wörtlich), Treffergrenze 10 000, Groß gegen klein, Treffer über eine Marke hinweg.
- `aufTeile` — Treffer innerhalb eines Teils, über eine Marke hinweg, am Teilrand; `zaehlertext` (0, 1 von 4, 10 000+).

**Integration (Oberfläche gegen Fake und Prozess):**
- Oberfläche gegen Fake: Markierung, Zähler, Springen (Umlauf), Wechsel von Datei/Commit/Ansicht, „keine Treffer“, zugeklappte Datei, verzögerte Antwort.
- Prozessprobe: kein zusätzlicher `git`-Aufruf, Suchbegriff nicht im Wortlaut im Protokoll (nur als Länge).

**E2E (Playwright, nur Browser-Eigenes):** Suchfeld (Tab, Name, Fokus), Enter/Umschalt+Enter, Markierung, Springen, DOM-Sicherheit (`<b>`, Marke U+202E), Zeitkriterium mit `gross.txt` (ereignisgenau), Long Tasks. Kein Hot-Path-Fall.

## Abhängigkeiten

- Abhängig von: R00004 (Diff-Bereich, Zeilenaufbau, grün), R00008 (ganze Datei, grün), R00007 (Färbung, grün), R00017 (Zuklappen großer Dateien, grün) und R00012/I0027 (der Diff-Werkzeugkasten, **rot** — `Braucht I0027`, weil das Suchfeld in ihm lebt).
- Blockiert: I0015 (Tastaturbedienung nimmt das Kürzel des Suchfelds in die Belegung auf).

Nicht Teil dieser Anforderung (eigene Karten): Suche über alle Dateien (verworfen, siehe Notizen), reguläre Ausdrücke oder unscharfe Suche, Suchen und Ersetzen, ein eigenes Tastenkürzel (I0015), Suche in zugeklappten oder nicht geladenen Zeilen, eine Trefferzahl je Datei in der Dateiliste, Wortdiff innerhalb einer Zeile, gespeicherter Suchverlauf.

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort):

1. **Groß/Klein?** Empfehlung: **unterscheiden** (Groß und klein sind verschiedene Zeichen), wie das Dateisystem unter Linux. Deterministisch und ohne Fallfaltung mit Locale-Eigenheiten (ß, türkisches i); eine spätere Stellung „ohne Rücksicht auf Groß/Klein“ bleibt als Option offen.
2. **Treffer-Navigation und Zähler?** Empfehlung: Zähler „k von n“ mit vor und zurück und Umlauf; Enter sucht und geht vor, Umschalt+Enter zurück; kein eigenes Tastenkürzel (das gehört zu I0015). Alternative: nur vorwärts, oder ein eigenes Kürzel schon hier.
3. **Marken in Suchbegriff und Treffern?** Empfehlung: gesucht wird der **gezeigte** Text — ein unsichtbares Zeichen steht als Marke `⟨U+202E⟩` da und ist genau so auffindbar; das rohe Steuerzeichen findet nichts. Alternative: über den Rohtext der Zeilen suchen (dann findet das rohe Zeichen, aber die sichtbare Marke nicht).
4. **Ort des Suchfelds?** Empfehlung: im Diff-Werkzeugkasten aus I0027, neben „Umbruch“/„Ansicht“; der Entwurf Fassung 2 zeigt kein Suchfeld („Weiter ohne Suchen“), es ist eine kleine Ergänzung wie das Musterfeld in R00025.

Ohne Rückfrage entschieden (Begründung unter „Notizen“): wörtlich, **kein Regex**; Längengrenze 200 Zeichen, Treffergrenze 10 000, Zeitgrenze 20 000 Zeilen ≤ 1 s; Treffer per DOM-Bereich und `textContent`, nie `innerHTML`; die Treffermarke bricht die Färbung nicht; der Suchbegriff geht nie an `git` und erscheint nie im Protokoll im Wortlaut; aufgeklappte Lücken (R00026) sind gezeigte Zeilen und werden mitdurchsucht; kein neuer Serverweg, kein neuer `git`-Aufruf.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00001/R00004 hinaus.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 7 Bubbles unterhalb I0031 (B2601–B2607), davon 2 klar (2 h) und 5 unklar (2–4 h) — Untergrenze 14 h, obere Schätzung 24 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,19 h je Bubble; die Richtwerte sind ein Vielfaches davon. Enthalten: nur I0031. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: in einer großen, von einer KI geänderten Datei sucht der prüfende Mensch ein Symbol, das an vielen Stellen vorkommt; ohne Suche scrollt er die Datei durch, verliert die Stelle aus dem Blick und lässt beim Review die eine Zeile ungeprüft, auf die es ankommt — und die KI liest „Keine Anmerkungen.“ als Freigabe. Wenn ein Suchfeld jedes wörtliche Vorkommen in den gezeigten Zeilen markiert und der Mensch sie mit einem Zähler der Reihe nach durchspringt, dann sieht er auf einen Blick, wo das Symbol steht, und prüft genau diese Stellen. Gerade dieser Schnitt ist der Hebel: die Suche liest nur, was ohnehin schon dasteht — sie braucht keinen neuen `git`-Aufruf, keinen Serverweg und kein Nachladen, deshalb bleibt sie klein und reversibel und berührt weder den Vertrag mit der KI (R00002) noch das Modell von Stellen, Haken und Anmerkungen. Sie zahlt genau dort ein, wo die Aufmerksamkeit verloren geht — in der einen großen Datei —, ohne das Lastprofil zu brechen.

## Missing-Docs

- Ob die Färbung (R00007) eine bereits gesetzte Markierung beim Auflegen erhält oder ob die Markierung nach dem Ende der Färbung neu aufgetragen werden muss — beim Bauen entscheiden; das Kriterium „Färbung nach der Suche“ verträgt beide Wege, solange die Markierung am Ende steht.
- Stil der Treffermarke (Hintergrund, aktueller gegen übrige Treffer) in kanbanD und Material 3 — der Entwurf Fassung 2 zeigt kein Suchfeld; vor dem Bauen gegen kanbanD prüfen.

## Notizen

### Optionen (Ort der Suche)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. Suche im Browser über die gezeigten Zeilen, ein reiner Baustein (`suche-werte.js`) (gewählt)** | Baustein als Unit unter Node; Oberfläche gegen Fake wie R00012; eine Suche (JS) | gering: nur die gezeigten Zeilen, Treffer per DOM-Bereich | klein |
| 2. Suche im Server (Interactor) über den gelieferten Patch | Akzeptanz gegen den Interactor | eine Serveranfrage je Suchbegriff; der Server müsste Trefferstellen liefern, die Markierung bleibt im Browser — doppelte Wahrheit über den Text; berührt den Schnitt aus I0013 | mittel |
| 3. `window.find`/die Browsersuche | — | nicht steuerbar (kein Zähler, kein Umlauf, keine DOM-Kontrolle), färbt und scrollt fremd | klein |

Gewählt: **1.** Die Suche ist eine Darstellung der bereits gezeigten Zeilen (R00004/R00008 liefern sie), es entsteht kein neuer `git`-Aufruf und kein neuer Datenweg, und die Trefferfindung wird nur einmal implementiert (der reine JS-Baustein, wie `diff-werte.js`, `haken-werte.js`). **Option 2** verworfen: ein neuer Serverweg ohne Not, gegen die Leitplanke „kein Nachladen“ und den Schnitt aus I0013. **Option 3** verworfen: nicht steuerbar, kein Zähler, keine Kontrolle über DOM und Färbung.

### Verworfene Alternativen

- **Reguläre Ausdrücke**: fremde Eingabe als Regex ist ein ReDoS-Risiko und für den Zweck zu mächtig; wörtliche Suche genügt.
- **Suche über alle Dateien**: verletzt das Lastprofil (alle Diffs laden) und die Entscheidung des product-owners (Zeile 139).
- **Suche in zugeklappten oder nicht geladenen Zeilen**: stilles Nachladen (R00017).
- **Live-Suche bei jedem Tastendruck**: über 20 000 Zeilen je Tastendruck zu teuer; gesucht wird auf Enter.
- **Groß/Klein immer ignorieren**: braucht eine Fallfaltung mit Locale-Eigenheiten (ß, türkisches i); unterscheiden ist deterministisch (offene Frage 1).
- **Suche über den Rohtext statt den gezeigten Text**: dann fände die sichtbare Marke `⟨U+202E⟩` nichts, obwohl sie dasteht (offene Frage 3).
