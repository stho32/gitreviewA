---
id: R00030
status: Neu
datum: 2026-11-25
---

# R00030: Tastaturbedienung der Review-Oberfläche

## Beschreibung

Der prüfende Mensch bedient die Review-Oberfläche vollständig per Tastatur: mit Kürzeln wählt er Dateien und Stellen, hakt sie ab, springt zu Abschnitten, merkt Zeilen und Dateien an, ändert und löscht Anmerkungen, schaltet Ansicht, Anordnung, Umbruch und Leerraum um, öffnet die Stelle in VS Code, sucht im Diff und ruft die Kürzel-Hilfe auf. Die Kürzel wirken nur außerhalb von Textfeldern und ohne Strg, Alt oder Meta; sie überschreiben keine Browser- oder Screenreader-Kürzel, und jedes Bedienelement bleibt unverändert per Tab erreichbar. Eine Statuszeile erinnert an die wichtigsten Kürzel des Bereichs, ein Hilfe-Overlay (`?`) zeigt alle, jedes Bedienelement trägt seinen Hinweis, und der Fokus ist an jedem Ziel sichtbar.

Zahlt ein auf: [Vision](R00000-vision.md) — „Checkliste im Kopf entlasten“ („Dateien abhaken, Fortschritt sehen, zur nächsten ungeprüften springen; **alles per Tastatur**“).

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md)/I0027 (die Oberfläche, in der die Kürzel leben und an der die Statuszeile sitzt, **rot**), [R00011](R00011-datei-abhaken.md)/I0016 (der Haken, den `x` setzt, grün), [R00028](R00028-naechste-ungepruefte-datei.md)/I0025 (die nächste ungeprüfte, die `u` anspringt, **rot**) und [R00029](R00029-abgehakte-dateien-ausblenden.md)/I0026 (der Schalter „Abgehakte ausblenden“, den `h` umschaltet, **rot**). Die Kürzel für bereits gebaute Bedienelemente rufen dieselben Knöpfe und Funktionen auf wie die Maus; Karten, die später ein Bedienelement mit Kürzel bauen (I0007, I0009, I0018, I0023, I0024, I0031), ergänzen ihren Eintrag im Katalog.

**Der Entwurf hat Vorrang:** [Entwurf Fassung 2](../Dokumentation/Wireframes/oberflaeche-fassung-2.html) zeichnet die Kürzel-Hilfe (`.hilfe`), die Statuszeile (`.statuszeile`) und die Kürzel an den Bedienelementen (`<kbd>`), und seine Tabelle ist für die vorhandenen Kürzel maßgeblich. Wo Auftrag und Entwurf abweichen (Auftrag: `n` nächste ungeprüfte, `c` anmerken; Entwurf: `u` nächste ungeprüfte, `Enter` Zeile anmerken, `a` Datei anmerken), folgt diese Anforderung dem Entwurf; die Abweichung ist eine offene Frage an den product-owner. Tasten für Bedienelemente, die der Entwurf nicht zeichnet, weil es sie noch nicht gibt (`l` Leerraum und `g` nächste Lücke aus [R00026](R00026-leerraum-und-luecken.md), `/` Suche aus [R00027](R00027-im-diff-suchen.md), `h` Abgehakte ausblenden aus [R00029](R00029-abgehakte-dateien-ausblenden.md), `v` Anordnung aus [R00023](R00023-nebeneinander-ansicht.md), `e`/`d` Ändern/Löschen aus [R00018](R00018-anmerkung-aendern.md)/[R00019](R00019-anmerkung-loeschen.md)) sind Vorschläge und offene Fragen an den product-owner; die jeweilige Karte setzt den Eintrag, sobald sie ihr Bedienelement baut.

## Geschäftlicher Nutzen

Eine KI schreibt in einem Lauf leicht 200 Commits mit über tausend geänderten Dateien. Wer jede Zeile mit der Maus anwählen, jedes Kästchen klicken und jede Umschaltung suchen muss, verliert beim Durchgehen Tempo und Konzentration; die Vision sagt ausdrücklich, dass die Checkliste im Kopf per Tastatur gehen soll. Wenn Datei-, Abschnitts- und Zeilenwechsel, Haken, Anmerken, Umschalten, Suchen und Hilfe an einer Stelle als Kürzel liegen und jedes Bedienelement seinen Hinweis trägt, dann geht der Mensch die lange Liste zügig durch, ohne zwischen Maus und Tastatur zu wechseln, und die Kürzel bleiben auffindbar (Statuszeile, `?`, Hinweise). Die Tastenschicht liest nur die schon geladene Liste und den Stand — **kein neuer Serverweg und kein neuer `git`-Aufruf**.

## Funktionale Anforderungen

- **Katalog an einer Stelle**: die Tastenbelegung ist eine Tabelle Taste → Aktion mit Kontext (Bereich) und einem Kennzeichen, ob die Aktion im aktuellen Modus verfügbar ist. Hilfe-Overlay, Statuszeile und die Hinweise an den Bedienelementen werden daraus erzeugt; es gibt keine zweite Liste. Der Katalog ist erweiterbar: eine Karte, die ein Bedienelement mit Kürzel baut, ergänzt ihren Eintrag.
- **Kürzel für die vorhandenen Bedienelemente** (Entwurf Fassung 2): `j`/`k` nächste/vorige Datei, `u` nächste ungeprüfte, `m` Zusammen/Einzeln, `[`/`]` voriger/nächster Commit (nur „Einzeln“), `x` gewählte Datei abhaken/entwerten, `n`/`p` nächster/voriger Abschnitt, `↑`/`↓` Zeile im Diff wählen, `Enter` Zeile anmerken, `a` Datei anmerken, `s` nur Änderungen/ganze Datei, `v` untereinander/nebeneinander, `w` Umbruch, `o` Stelle in VS Code öffnen, `/` Suche im Diff, `h` Abgehakte ausblenden, `l` Leerraum, `g` nächste Lücke, `e` Anmerkung ändern, `d` Anmerkung löschen, `?` diese Übersicht, `Strg+Enter` Anmerkung speichern, `Esc` Notizfeld verwerfen/ Ebene schließen.
- **Wo Kürzel **nicht** wirken**: in `input`, `textarea`, `select`, `contenteditable` und in offenen Eingabefeldern (Anmerkung, Suche, Muster) wirkt allein das Feld selbst — nur `Strg+Enter` (speichern) und `Esc` (verwerfen) sind dort zusätzlich erlaubt. Ein offener Dialog (Hilfe, Notizfeld) fängt nur `Esc` und `?`; alle übrigen Kürzel sind aus, solange er offen ist.
- **Keine Modifikator-Übernahme**: die Kürzel sind einzelne Zeichen ohne Strg, Alt oder Meta. Auf deutscher Tastatur liegen `[` und `]` hinter AltGr; die Erkennung unterscheidet AltGr (`AltGraph`) von Strg+Alt, damit diese Kürzel auf deutschen Tastaturen funktionieren. Tastenkombinationen des Browsers (`Strg+F`, `Strg+R`, `F5`, `Alt+Pfeil`) und der Funktionstasten werden nie abgefangen.
- **Screenreader**: jedes Bedienelement mit Kürzel trägt `aria-keyshortcuts`; der sichtbare Hinweis (`<kbd>`) ist für Screenreader `aria-hidden` und ändert den zugänglichen Namen nicht. Jede Kürzel-Aktion, die den Zustand ändert, wird über eine höfliche Live-Region angesagt (was geändert wurde, in Kürze). `accesskey` wird nicht verwendet. Alle Aktionen bleiben zusätzlich per Tab und die vorhandenen Bedienelemente erreichbar — die Kürzel sind eine Abkürzung, kein Ersatz.
- **Hilfe-Overlay**: `?` und der Knopf „Kürzel“ im Kopf öffnen einen Dialog (`role="dialog"`, `aria-modal="true"`) mit allen Kürzeln, gruppiert nach Bereich (Allgemein, Liste, Diff, Anmerkung); im aktuellen Modus nicht verfügbare Aktionen sind markiert (etwa `[`/`]` nur in „Einzeln“). `Esc`, der Schließen-Knopf und ein Klick daneben schließen; der Fokus wird im Dialog gefangen und kehrt nach dem Schließen zum Auslöser zurück.
- **Statuszeile**: eine Fußzeile zeigt die wichtigsten Kürzel des aktuellen Bereichs (Datei, Abschnitt, Zeile, anmerken, abhaken, nächste ungeprüfte, `?`); in „Einzeln“ zusätzlich `[`/`]`. Ihr Inhalt kommt aus dem Katalog und wechselt mit dem Modus; sie ist kein Bedienelement und keine Live-Region.
- **Kürzel sichtbar**: jedes Bedienelement mit Kürzel zeigt den Hinweis neben seinem sichtbaren Text (Entwurf: `<kbd>`), der Hinweis steht in keiner zweiten Farbe und ist ohne Farbwahrnehmung lesbar.
- **Fokus sichtbar**: jedes Bedienelement und die mit `↑`/`↓` gewählte Diff-Zeile tragen einen sichtbaren Fokusring (mindestens 2 px, mindestens 3:1 Kontrast zum Hintergrund, nicht nur Farbe). Nach `j`/`k`, `u`, `[`, `]` steht der Fokus auf der neuen Wahl (die Zeile kommt in den Blick); nach `x`, `m`, `s`, `v`, `w`, `l`, `h` bleibt der Fokus, wo er war.
- **Zustandswechsel ohne Sprung**: ein Kürzel löst genau die eine Aktion seines Bedienelements aus; es ändert keine andere Sicht und keine Auswahl, die nicht zu seiner Aktion gehört.

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): ein Kürzel wirkt sofort (eine reine Tastenentscheidung im Browser, ohne `git`); nur die ausgelöste Aktion kostet ihre eigene Zeit (Dateiwechsel ≤ 1 s an der Obergrenze, Suche ≤ 1 s bei 20 000 Zeilen, jeweils Messwert ≤ 0,7 s, `rollen/planer/zeitkriterien.md`). Die Statuszeile und die Hinweise stehen mit der Seite, ohne Nachladen.
- **Sicherheit**: keine neue Angriffsfläche — kein neuer Serverendpunkt, kein neuer `git`-Aufruf; die Kürzel sind feste Zeichen, keine fremde Eingabe. `?` und `/` sind lokale Sichten; der Suchbegriff bleibt eine Eingabe des Menschen und geht nie an `git` und nie im Wortlaut ins Protokoll ([R00027](R00027-im-diff-suchen.md)).
- **Logging**: stdout bleibt bis „Beenden“ leer; je Kürzel eine Debug-Zeile auf stderr (Aktion, Ziel mit Marken), nie der Anmerkungs- oder Suchtext im Wortlaut.
- **Barrierefreiheit**: `aria-keyshortcuts` an den Bedienelementen, Live-Region für Zustandsänderungen, Fokusfalle und Rückkehr im Hilfe-Overlay, sichtbarer Fokusring (≥ 2 px, ≥ 3:1), keine `accesskey`-Bindung, keine Übernahme von Browser- oder Screenreader-Kürzeln.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Entwurf Fassung 2 (`.hilfe`, `.statuszeile`, `<kbd>`, `:focus-visible`, `--gr-fokus`); der Statuszeilen-Text und die Hinweise beginnen mit dem sichtbaren Text; die Statuszeile ist ein Zustand, keine Sackgasse.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (Wegwerf-Ordner, nie das Projekt-Repo; aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md)): `z1` „Start“ legt `README.md` (2 Zeilen) und `src/a.txt` (3 Zeilen) an, `z2` ändert in `src/a.txt` eine Zeile und legt `src/b.txt` (2 Zeilen) an, `z3` ändert in `src/a.txt` und `src/b.txt` je eine Zeile. In „Zusammen“ sind das 3 Dateien, in „Einzeln“ 6 Stellen. Fenster 1280 × 800, Aufruf `gitreviewA $z1 $z2 $z3 --kein-browser`. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Die Tastenschicht liegt **nicht** auf dem Hot Path; Playwright nur für Browser-Eigenes (Tastendruck, Fokus, Fokusfalle, Zeit).

### Liste und Haken
- [ ] Gegeben `z1 z2 z3` in „Zusammen“ und die Dateiliste im Fokus, wenn man `j`, `j`, `k` drückt, dann ist nach dem ersten `j` `src/a.txt` gewählt (Fokus auf der Zeile, Diff lädt), nach dem zweiten `src/b.txt`, nach `k` wieder `src/a.txt`. *Ebene: Playwright (Tastendruck, Fokus — Browser-Eigenes) und Integration (Auswahl).*
- [ ] Gegeben `z1 z2 z3`, `README.md` gewählt und nicht abgehakt, wenn man `x` drückt, dann ist `README.md` abgehakt („1 von 3 Dateien abgehakt“), die Wahl und der Diff bleiben unverändert, und ein zweites `x` nimmt den Haken wieder weg. *Ebene: Integration (Haken) und Playwright (Tastendruck).*
- [ ] Gegeben `z1 z2 z3` in „Einzeln“, wenn man `[` und `]` drückt, dann wechselt der Commit (`z1` → `z2` → `z1`) samt Dateiliste; in „Zusammen“ haben `[` und `]` keine Wirkung. *Ebene: Playwright (Tastendruck, Modus) und Integration (Commit-Wähler).*
- [ ] Gegeben `z1 z2 z3`, wenn man `m` drückt, dann wechselt der Modus „Zusammen“/„Einzeln“ wie beim Klick auf den Umschalter, und die Wahl folgt [R00012](R00012-oberflaeche-liste-detail-zusammen.md) Kriterium 5. *Ebene: Integration (Modus) und Playwright.*
- [ ] Gegeben `z1 z2 z3` ohne Haken, wenn man `u` drückt, dann springt die nächste ungeprüfte wie der Knopf aus [R00028](R00028-naechste-ungepruefte-datei.md) (in „Zusammen“ je Datei, in „Einzeln“ je Stelle), und der Fokus bleibt auf dem Weg. *Ebene: Integration (Oberfläche) und Playwright (Fokus).*
- [ ] Gegeben `z1 z2 z3`, wenn man `h` drückt, dann schaltet „Abgehakte ausblenden“ wie der Schalter aus [R00029](R00029-abgehakte-dateien-ausblenden.md) um (Sicht ändert sich, Zähler nennt die Zahl). *Ebene: Integration (Oberfläche).*

### Diff und Anmerkung
- [ ] Gegeben `z1 z2 z3` mit gewählter Datei und zwei Abschnitten im Diff, wenn man `n` und `p` drückt, dann steht der Fokus auf der ersten Zeile des nächsten bzw. vorigen Abschnitts; am ersten bzw. letzten Abschnitt bleibt der Fokus stehen. *Ebene: Playwright (Fokus, Scroll) und Unit (Abschnittswechsel).*
- [ ] Gegeben `z1 z2 z3` mit gewählter Datei, wenn man in den Diff tabt, mit `↑`/`↓` zur Zeile `src/a.txt:2` geht und `Enter` drückt, dann öffnet das Feld „Anmerkung zu src/a.txt, Zeile 2“ mit Fokus im Textfeld; `Strg+Enter` speichert, der Fokus steht wieder auf der Zeile ([R00010](R00010-zeile-annotieren.md)); `Esc` verwirft das Feld ohne Anmerkung. *Ebene: E2E (Tastatur, Fokus — Browser-Eigenes).*
- [ ] Gegeben `z1 z2 z3` mit gewählter Datei, wenn man `a` drückt, dann öffnet „Datei anmerken“ wie der Knopf aus [R00018](R00018-anmerkung-aendern.md) (Feld „Anmerkung zu <Datei> (ganze Datei)“). *Ebene: Integration (Oberfläche).*
- [ ] Gegeben eine Anmerkung unter einer Zeile, wenn man `e` drückt, dann öffnet „Ändern“ mit dem vorhandenen Text; `d` löscht die Anmerkung wie der „Löschen“-Knopf aus [R00019](R00019-anmerkung-loeschen.md). *Ebene: Integration (Oberfläche).*
- [ ] Gegeben eine gewählte Datei, wenn man `s`, `v`, `w`, `l` drückt, dann schalten Ansicht, Anordnung, Umbruch und Leerraum wie ihre Bedienelemente um; `o` öffnet die Stelle in VS Code ([R00011](R00021-in-vs-code-springen.md)); `/` öffnet das Suchfeld und setzt den Fokus hinein ([R00027](R00027-im-diff-suchen.md)); `g` springt zur nächsten Lücke ([R00026](R00026-leerraum-und-luecken.md)). *Ebene: Integration (Oberfläche) und Playwright (Fokus).*
- [ ] Gegeben eine gesperrte Stelle ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)), wenn man `x` oder `a` drückt, dann ändert sich nichts (die Sperre wird nicht über die Tastatur umgangen); der Sperrgrund steht weiter an der Stelle. *Ebene: Integration (Oberfläche).*

### Nur außerhalb von Textfeldern, keine Browser-/Screenreader-Kürzel
- [ ] Gegeben das offene Notizfeld mit dem Text `Prüfung`, wenn man `j`, `k`, `n`, `p`, `x`, `m`, `s`, `v`, `w`, `h` drückt, dann erscheinen die Zeichen nicht (die Tasten wirken nicht im Feld), die Dateiliste und der Diff bleiben unverändert, und nur `Strg+Enter` (speichern) und `Esc` (verwerfen) wirken im Feld. *Ebene: Playwright (Tastatur, Fokus — Browser-Eigenes).*
- [ ] Gegeben die Seite geladen und kein Feld im Fokus, wenn man `Strg+F` und `Strg+R` und `F5` drückt, dann fängt das Programm die Kombinationen nicht ab (Strg+F erreicht die Suche des Browsers, Strg+R und F5 laden die Seite neu); kein Kürzel der Tabelle wird ausgelöst. *Ebene: Unit (Kontextfunktion, kein Modifikator) und Playwright (Browser-Eigenes).*
- [ ] Gegeben ein Fokusziel in einem `input`, `select` oder `contenteditable`, wenn man `x` oder `n` drückt, dann wirkt das Kürzel nicht (dieselbe Regel wie beim `textarea`); das Feld verhält sich unverändert. *Ebene: Unit (Kontextfunktion) und Playwright (Browser-Eigenes).*
- [ ] Gegeben das offene Hilfe-Overlay, wenn man `j` oder `x` drückt, dann wirkt kein Kürzel außer `Esc` und `?`; `Esc` schließt den Dialog und gibt den Fokus an den Auslöser zurück. *Ebene: Playwright (Fokus, Fokusfalle — Browser-Eigenes).*
- [ ] Gegeben die deutsche Tastaturbelegung, wenn man `[` und `]` mit AltGr drückt, dann wechselt der Commit (AltGr wird von Strg+Alt unterschieden); ohne AltGr (Strg+Alt) wirkt das Kürzel nicht. *Ebene: Unit (Kontextfunktion, `AltGraph`) und Playwright (Browser-Eigenes).*

### Hilfe, Statuszeile, Hinweise, Fokus
- [ ] Gegeben die Seite geladen, wenn man `?` drückt, dann öffnet das Hilfe-Overlay mit allen Kürzeln, gruppiert nach Bereich, und `[`/`]` ist nur in „Einzeln“ als verfügbar markiert; der Fokus steht im Dialog und ist gefangen; `Esc` schließt und der Fokus steht wieder auf dem Auslöser. *Ebene: Playwright (Dialog, Fokus — Browser-Eigenes).*
- [ ] Gegeben die Seite geladen, wenn man die Statuszeile ansieht und den Modus wechselt, dann nennt sie die wichtigsten Kürzel des aktuellen Bereichs und in „Einzeln“ zusätzlich `[`/`]`; sie ist kein Bedienelement und hat keine Live-Region. *Ebene: Playwright (DOM — Browser-Eigenes) und Unit (Katalog → Statuszeile).*
- [ ] Gegeben ein Bedienelement mit Kürzel (etwa das Kästchen in der Dateiliste, der Umschalter „Zusammen/Einzeln“, der Knopf „Nächste ungeprüfte“, der Verweis „In VS Code“), wenn man es mit Maus oder Tab fokussiert, dann trägt es den Hinweis (`<kbd>`) und `aria-keyshortcuts`, und sein zugänglicher Name ist unverändert (kein Kürzel im Namen). *Ebene: Playwright (DOM, `aria-keyshortcuts`) und Unit (Katalog → Hinweis).*
- [ ] Gegeben ein Bedienelement oder eine mit `↑`/`↓` gewählte Diff-Zeile, wenn es den Fokus hat, dann trägt es einen sichtbaren Fokusring (mindestens 2 px breit, mindestens 3:1 Kontrast zum Hintergrund, nicht nur Farbe). *Ebene: Playwright (berechneter Stil — Browser-Eigenes).*
- [ ] Gegeben `z1 z2 z3` mit gewählter Datei, wenn man `x` drückt, dann wird die Zustandsänderung über die höfliche Live-Region angesagt (etwa „README.md abgehakt“); die Ansage wiederholt sich nicht ohne Zustandsänderung. *Ebene: Playwright (Live-Region — Browser-Eigenes).*
- [ ] Gegeben eine Karte, die ein neues Bedienelement mit Kürzel baut (etwa [R00023](R00023-nebeneinander-ansicht.md)/`v`), wenn ihr Bedienelement erscheint, dann steht sein Eintrag im Katalog, sein Hinweis am Element und seine Zeile im Hilfe-Overlay, ohne dass die Tastenschicht umgebaut wird. *Ebene: Unit (Katalog erweiterbar) und Integration (Oberfläche).*

Grenz- und Leerfälle bedacht (Empfehlungen mangels Dialog als Anmerkung vermerkt): kein Kürzel wirkt doppelt (eine Taste, eine Aktion); `?` wirkt auch, wenn der Diff-Bereich den Fokus hat; `Esc` ohne offenes Feld/Dialog tut nichts (der Browser behält sein Verhalten); ein Kürzel bei fehlender Aktion (etwa `v`, solange I0007 nicht gebaut ist) tut nichts und erscheint nicht als verfügbar; leere Dateiliste (kein Kürzel wirkt, die Bedienelemente bleiben bedienbar); ein Kürzel während einer laufenden Anfrage wird wie der Klick behandelt (das Bedienelement entscheidet, ob es gesperrt ist).

## Betroffene Verzeichnisstruktur

Wie in [R00004](R00004-diff-einer-datei-lesen.md) (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- `web/` — neuer reiner Baustein `tasten-werte.js` (Katalog und Kontextentscheidung; läuft unter Node und im Browser, wie `diff-werte.js`/`haken-werte.js`), `tasten.js` (Verdrahtung: Tastendruck an den Katalog, Auslösen der Bedienelemente, Live-Region) und `hilfe.js` (Hilfe-Overlay aus dem Katalog, Fokusfalle); die Statuszeile und die Hinweise an den Bedienelementen kommen aus `index.html`/`gitreviewa.css` (Entwurf Fassung 2).
- Server: **keine Änderung** — die Tastenschicht rechnet im Browser.
- `tests/`, `e2e/` — Unit-Tests des Katalogs und der Kontextentscheidung unter Node; DSL und Treiber für Tastendruck auf den vorhandenen Schichten; Playwright-Specs für Hot Path, Hilfe, Fokus, Textfeld, Browser-Kürzel, Live-Region.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen (Optionen unter „Notizen“). Der Entwurf Fassung 2 zeichnet die Hilfe (`.hilfe`, Zeilen 551–571), die Statuszeile (Zeilen 540–549) und die Hinweise (`<kbd>`); die Gestaltung folgt kanbanD und Material 3.

### Ablauf

1. **Tastenentscheidung** — ein `keydown` auf dem Dokument geht durch den Katalog und die Kontextregeln (B2901): kein Eingabefeld, keine Modifikatortaste (außer `AltGraph` für `[`/`]`), offener Dialog nur für `Esc`/`?`; ohne Treffer bleibt die Taste beim Browser.
2. **Aktion auslösen** — die gefundene Aktion ruft dasselbe Bedienelement wie die Maus (Klick/`aria-pressed`/Toggle) oder die reine Funktion (Abschnittswechsel); danach rückt der Fokus, wo die Aktion es verlangt, und die Live-Region sagt die Änderung an (B2902).
3. **Abschnitt wechseln** — `n`/`p` sucht aus den Abschnittsanfängen die nächste/vorige Zielzeile und setzt den Fokus dorthin (B2903).
4. **Statuszeile** — aus Modus und Katalog die wichtigsten Kürzel des Bereichs rendern (B2904).
5. **Hilfe-Overlay** — `?`/Knopf öffnen den Dialog aus dem Katalog, gruppiert; Fokusfalle, `Esc`/Knopf schließen, Fokus zurück (B2905).
6. **Hinweise und Fokus** — der Katalog legt an jedes Bedienelement Hinweis und `aria-keyshortcuts` (B2906); der Fokusring ist CSS (B2907).
7. **Tests** — die Szenarien als Playwright-Specs (B2908).

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** das Dokument (`keydown`), die vorhandenen Bedienelemente aus I0027 (Dateiliste, Umschalter, Commit-Wähler, Diff-Kopf, Diff-Bereich, Anmerkungskopf), der Kopf der Seite (Hilfe-Knopf), die Statuszeile.

- `Tasteneintrag` (Wert, rein) — Taste, Aktion, Bereich, Beschriftung, Verfügbarkeit.
- `Tastenbelegung` (benannte Collection) — die Einträge in Anzeige- und Gruppenreihenfolge; `AktionFuer(taste, lage)` → `Aktion` oder `Nichts`.
- `Tastenziel` (Wert, rein) — `{ feldImFokus, modifikatoren, offenerDialog, modus }`; die Kontextentscheidung.
- JS `tasten-werte.js` (Operation, rein, läuft unter Node und im Browser) — `belegung()`, `aktionFuer(taste, lage)`.
- JS `tasten.js` (Oberfläche) — `keydown` binden, Aktion auslösen, Fokus setzen, Live-Region; hört auf die Bedienelemente aus I0027 und den Modus.
- JS `hilfe.js` (Oberfläche) — Hilfe-Overlay aus `belegen()`, Fokusfalle, Rückkehr.

### Änderungen an bestehenden Modulen

`index.html`/`gitreviewa.css` (Hilfe-Overlay, Statuszeile, `<kbd>`-Hinweise, Fokusring aus dem Entwurf), die Bedienelemente aus I0027 und den bereits gebauten Karten (Hinweis und `aria-keyshortcuts` ergänzen), `anmerkungen.js`/`diff.js` (Live-Region für Zustandsänderungen, `Esc`/`Strg+Enter` unverändert). `GitLeser`, die Endpunkte, `patchZeilen`, `sichtbarTeile`, die Färbung und der Hakenspeicher bleiben **unberührt**.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction, Akzeptanz gegen die Oberfläche mit Fake, Playwright nur Hot Path und Browser-Eigenes — **die Tastenschicht liegt nicht auf dem Hot Path** (der Hot Path wird per Tastatur einmal durchgespielt).

**Unit (rein, unter Node):** `aktionFuer` — jede Taste der Tabelle, unbekannte Taste, Eingabefeld, `Strg`/`Alt`/`Meta`, `AltGraph` für `[`/`]`, offener Dialog (`Esc`/`?` erlaubt, andere nicht), Modus (nur „Einzeln“ für `[`/`]`), nicht verfügbare Aktion; `belegung` — Gruppen, Reihenfolge, Verfügbarkeit; Statuszeilen-Text und Hinweis je Element; Abschnittswechsel (`naechsterAbschnitt`) — zwei Abschnitte, einer, erst/letzt.

**Integration (Oberfläche gegen Fake und Prozess):** Tastendruck → Bedienelement → Zustand (Haken, Modus, Ansicht, Anordnung, Umbruch, Leerraum, Datei-/Commit-Wahl, Anmerkung anlegen/ändern/löschen, Hilfe); kein zusätzlicher `git`-Aufruf, kein neuer Endpunkt; Debug-Zeile je Kürzel; Live-Region-Text.

**E2E (Playwright, nur Browser-Eigenes):** Hot Path per Tastatur (Datei wählen, Zeile anmerken, Beenden), Hilfe-Overlay (Fokusfalle, Rückkehr), Fokusring (berechneter Stil), Textfeld (kein Kürzel außer `Strg+Enter`/`Esc`), Browser-Kürzel (`Strg+F`, `Strg+R`, `F5`), Umlauf `u`, `[`/`]` mit AltGr, Zeitkriterium (Dateiwechsel ≤ 1 s, ereignisgenau).

## Abhängigkeiten

- Abhängig von: [R00011](R00011-datei-abhaken.md)/I0016 (grün, Haken), [R00012](R00012-oberflaeche-liste-detail-zusammen.md)/I0027 (**rot**, die Oberfläche und die Statuszeile), [R00028](R00028-naechste-ungepruefte-datei.md)/I0025 (**rot**, nächste ungeprüfte), [R00029](R00029-abgehakte-dateien-ausblenden.md)/I0026 (**rot**, Abgehakte ausblenden). Bereits gebaut und mitgenutzt: I0006 (Diff), I0011 (`o`), I0017 (Zeile/`↑`/`↓`/`Enter`/`Esc`), I0022 (`s`), I0023/I0024 (`e`/`d`), I0030 (Sperre).
- Nachbar-Karten, die ihren Eintrag ergänzen (**keine** Voraussetzung für den Bau der Tastenschicht): I0007 (`v`), I0009 (`l`/`g`), I0018 (`a`), I0031 (`/`).
- Blockiert: nichts. Berührt: alle Bedien-Anforderungen, deren Bedienelement einen Hinweis und `aria-keyshortcuts` bekommt.

Nicht Teil dieser Anforderung (eigene Karten): die Bedienelemente selbst (I0027 und die genannten Karten), ein Kürzel für „Ergebnis kopieren“ oder „Beenden/Abbrechen“ (nicht im Entwurf, die Knöpfe bleiben Tab-erreichbar), eine freie Tastenbelegung durch den Menschen, gespeicherte Kürzel, ein eigener Befehlssatz wie die `g`-Folgen in kanbanD.

## Offene Fragen

An den product-owner (Empfehlung gilt bis zur Antwort):

1. **Tastenbelegung: Entwurf oder Auftrags-Skizze?** Empfehlung: dem Entwurf Fassung 2 folgen (`u` nächste ungeprüfte, `Enter` Zeile anmerken, `a` Datei anmerken), weil er abgenommen ist und [R00028](R00028-naechste-ungepruefte-datei.md)/[R00022](R00022-datei-annotieren.md) schon darauf aufsetzen; die Auftrags-Skizze (`n` nächste ungeprüfte, `c` anmerken) weicht davon ab. Alternative: die Skizze umsetzen und die betroffenen Karten angleichen.
2. **Neue Tasten für noch nicht gebaute Bedienelemente:** Empfehlung: `l` Leerraum, `g` nächste Lücke, `/` Suche, `h` Abgehakte ausblenden, `e` Ändern, `d` Löschen (frei, sprechend, keine Kollision mit der Tabelle); Alternative: andere Buchstaben oder gar kein Kürzel für einzelne (dann bleiben sie nur per Tab erreichbar). Die jeweilige Karte setzt den Eintrag.
3. **Fokus nach `j`/`k`, `u`, `[`, `]`:** Empfehlung: der Fokus wandert auf die neue Wahl (Dateizeile bzw. Commit-Zeile), damit der Screenreader sie ansagt und die nächste Taste weitergeht; Alternative: der Fokus bleibt, wo er war (etwa auf dem Diff), nur Auswahl und Blick ändern sich. Für `u` ist die Linie schon entschieden ([R00028](R00028-nächste-ungepruefte-datei.md) Zeile 66: Fokus bleibt auf dem Knopf) — hier geht es um die Tasten `j`/`k`/`[`/`]`.
4. **Hilfe-Overlay: modal oder Panel?** Empfehlung: modaler Dialog mit Fokusfalle (bessere Bedienung für Tastatur und Screenreader); Alternative: das nicht-modale Panel des Entwurfs mit Fokusmanagement, ohne die übrige Seite zu sperren.
5. **Statuszeile für Screenreader:** Empfehlung: als `footer` mit `aria-label` sichtbar und lesbar lassen (der Entwurf zeichnet es so), aber keine Live-Region; Alternative: `aria-hidden` für die Kürzel-Hinweise, weil die vollständige Liste im Hilfe-Overlay steht.

Ohne Rückfrage entschieden (Begründung unter „Notizen“): eine Tabelle als Quelle für Hilfe, Statuszeile und Hinweise; Kürzel nur außerhalb von Eingabefeldern; offener Dialog fängt nur `Esc`/`?`; keine Modifikator-Kürzel, keine Browser-/Funktionstasten; `AltGraph` von Strg+Alt unterschieden (deutsche Tastatur); `aria-keyshortcuts` statt `accesskey`; Live-Region für Zustandsänderungen; Fokusring ≥ 2 px und ≥ 3:1; der Katalog ist erweiterbar und wird von der Karte des neuen Bedienelements ergänzt; kein neuer Serverweg und kein neuer `git`-Aufruf.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00001/R00003/R00012 hinaus (die Wegwerf-Repos legen die Tests an).

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unterhalb I0015 (B2901–B2908), davon 3 klar (2 h) und 5 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 26 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,25 h je Bubble; die Richtwerte sind ein Vielfaches davon. Enthalten: nur I0015. Die Einträge für noch nicht gebaute Bedienelemente (I0007, I0009, I0018, I0031) sind **nicht** enthalten — sie kommen mit ihren Karten und kosten je einen Eintrag im Katalog, einen Hinweis und eine Hilfe-Zeile. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: die KI liefert Hunderte Commits und Tausende Dateien, und der Mensch arbeitet sie über längere Zeit ab; Mauswege für jede Datei, jedes Kästchen und jede Umschaltung kosten Tempo, und die Vision verlangt ausdrücklich „alles per Tastatur“. Das Zielbild ist ein Review, in dem sich der prüfende Mensch ohne Moduswechsel durch die Liste und den Diff bewegt. Wenn die Tastenbelegung an einer Stelle liegt, jedes Kürzel genau das Bedienelement der Maus auslöst, jede Aktion per Hilfefenster, Statuszeile und Hinweis auffindbar ist, und die Kürzel nur außerhalb von Textfeldern wirken und keine Browser- oder Screenreader-Kürzel übernehmen, dann bedient der Mensch die Oberfläche zügig und ohne Sackgasse. Gerade dieser Schnitt ist der Hebel, weil die Tastenschicht nur liest, was schon da ist (die Oberfläche aus I0027, den Stand aus [R00011](R00011-datei-abhaken.md), die Listen aus I0010/I0003): sie öffnet keinen Serverweg, keinen `git`-Aufruf und keine neue Sicherheitsfläche und lässt jedes Bedienelement unverändert per Tab erreichbar. Ohne sie bliebe „alles per Tastatur“ der Vision unerfüllt, und jede neue Karte müsste ihr Kürzel an einer eigenen Stelle erfinden — mit der Gefahr von Tastenkonflikten über vier Karten.

## Missing-Docs

- Verhalten von `event.key` für `[`/`]` auf deutschen und US-Tastaturen und die Unterscheidung `AltGraph` von Strg+Alt in den Zielbrowsern — vor dem Bauen mit einem kleinen Versuch belegen.
- Fokusfalle und Fokus-Rückkehr im Hilfe-Overlay mit dem Aufbau des Entwurfs (positioniertes Panel, `region`/`dialog`) — kleiner Versuch vor dem Bauen (wie R00010/R00012 für ARIA).
- `aria-keyshortcuts`-Unterstützung der Zielbrowser und Screenreader für Einzelbuchstaben — vor dem Bauen prüfen; das Kürzel bleibt auch ohne Ansage über die Hilfe auffindbar.

## Notizen

### Optionen (Ort der Tastenschicht)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. Reine Tastenschicht im Browser, ein Katalog (`tasten-werte.js`), Kürzel lösen die vorhandenen Bedienelemente aus (gewählt)** | Katalog und Kontext als Unit unter Node; Auslösen gegen die Oberfläche mit Fake; eine Quelle für Hilfe/Status/Hinweise | gering: nur die schon gebaute Oberfläche, kein neuer Weg | klein |
| 2. Kürzel im Server (Interactor je Aktion) | Akzeptanz gegen den Interactor | eine Serveranfrage je Tastendruck, der Server müsste die Wahl und die Sicht kennen — doppelte Wahrheit; widerspricht „die Oberfläche rechnet im Browser“ | mittel |
| 3. Kürzel je Karte in deren eigenem Modul | je Karte für sich testbar | Tastenkonflikte über vier Karten, vier Hilfelisten, keine eine Quelle; die Entscheidung des product-owners (Zeile 72) schließt es aus | mittel |

Gewählt: **1.** Die Tastenschicht ist eine Sicht auf die vorhandene Oberfläche (I0027) und die vorhandenen Bedienelemente; es entsteht kein neuer `git`-Aufruf und kein neuer Datenweg, und Katalog, Hilfe, Statuszeile und Hinweise kommen aus einer Quelle. **Option 2** verworfen: ein neuer Serverweg ohne Not, gegen die Leitplanke „die Oberfläche rechnet im Browser“. **Option 3** verworfen: vier Tastenlisten und die absehbare Kollision — dieselbe Begründung wie Zeile 72 der po-entscheidungen.

### Verworfene Alternativen

- **Eigene Kürzel je Karte:** die Tastenbelegung steht an einem Ort (I0015); die Entscheidung des product-owners (Zeile 72) und die Kürzel-Zusagen in R00018/R00019/R00021/R00022/R00027/R00028/R00029 setzen es voraus.
- **`c` für „anmerken“ (Auftrags-Skizze):** der Entwurf nutzt `Enter` (Zeile) und `a` (Datei); `c` wäre eine zweite Belegung derselben Aktion — offene Frage 1.
- **`n` für „nächste ungeprüfte“ (Auftrags-Skizze):** der Entwurf nutzt `n` für den nächsten Abschnitt und `u` für die nächste ungeprüfte; R00028 nennt `u` — offene Frage 1.
- **Kürzel auch in Textfeldern:** die Buchstaben wären dann nicht mehr tippbar; nur `Strg+Enter` und `Esc` sind dort erlaubt.
- **Strg/Alt/Meta-Kürzel (etwa `Strg+K`):** der Auftrag nennt Einzeltasten; Modifikatorkombinationen kollidieren mit Browser und Screenreader und sind nicht Teil des Entwurfs.
- **`accesskey`:** kollidiert mit Browser- und Screenreader-Kürzeln und ist nicht konsistent; `aria-keyshortcuts` ist die informative Bindung.
- **Kürzel für „Ergebnis kopieren“/„Beenden/Abbrechen“:** nicht im Entwurf, die Knöpfe bleiben Tab-erreichbar; kein Kürzel ohne Bedienelement (offene Frage 2).
- **Statuszeile als Live-Region:** sie nennt nur die wichtigsten Kürzel und würde bei jedem Moduswechsel vorlesen; die Änderungen sagt die Live-Region der Aktionen an.
