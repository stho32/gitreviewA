---
id: R00029
status: Neu
datum: 2026-11-25
---

# R00029: Abgehakte Dateien ausblenden

## Beschreibung

Der prüfende Mensch arbeitet eine lange Dateiliste ab; was er abgehakt hat, interessiert ihn nicht mehr und schiebt sich zwischen die offenen Dateien. Ein Schalter „Abgehakte ausblenden“ in der Werkzeugzeile der Dateiliste (Entwurf Fassung 2) blendet die abgehakten Dateien aus der Dateiliste aus — flach und als Baum, in „Zusammen“ und „Einzeln“ — und nennt ihre Zahl; ausgeschaltet stehen sie wieder da. Der Zustand bleibt beim Wechsel von Datei, Commit und Modus, ein Neuladen setzt ihn auf aus (nichts wird gespeichert). Ausblenden ist auch hier eine **Sicht**: die ausgeblendete Datei bleibt Teil der Auswahl — sie zählt in „n von m abgehakt“ und wird im Ergebnis genannt —, und gesperrte Stellen ([R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md), nie abgehakt) werden nie ausgeblendet.

Zahlt ein auf: [Vision](R00000-vision.md) — „Checkliste im Kopf entlasten“ („Dateien abhaken, Fortschritt sehen, zur nächsten ungeprüften springen“) und das Lastprofil (2 000 geänderte Dateien).

Baut auf auf: [R00011](R00011-datei-abhaken.md) (Stelle, Haken, Stand, Fortschritt, Ergebnisabschnitt), [R00012](R00012-oberflaeche-liste-detail-zusammen.md)/I0027 (die neue Dateiliste, in der der Schalter lebt, und der Zustand je Datei/Stelle), [R00015](R00015-zusammen-logik-und-server.md)/I0010 (die Netto-Dateiliste in „Zusammen“), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (gesperrte Stellen, „k nicht lesbar“), [R00003](R00003-commits-und-dateien-sehen.md) (Dateiliste des Commits in „Einzeln“, flach und Baum) und [R00025](R00025-dateien-ausblenden.md) (die Muster-Ausblendung, mit der dieser Schalter nebeneinander steht).

**Zwei Ausblendgründe nebeneinander (Vorgabe):** [R00025](R00025-dateien-ausblenden.md) blendet nach Mustern aus, diese Anforderung nach dem Haken. Beide Gründe wirken in derselben Liste, beide sind eine **Sicht**, und der Zähler im Kopf neben dem Fortschritt nennt beide Anteile. Eine Datei, die beide Gründe trifft, wird einmal ausgeblendet und einmal gezählt.

**Gesperrte Stellen (Vorgabe aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)):** „Abgehakte ausblenden“ blendet sie nie aus (sie sind nie abgehakt), und der Fortschritt trägt weiter „ (k nicht lesbar)“.

**Schnitt (WBS I0016 → I0026):** „Abgehakte zuklappen“ stand im Fertig-Kriterium der Karte I0016 und wurde als eigene Interaction abgeschnitten (Probe: über acht Bubbles). Diese Anforderung ist das Ausblenden abgehakter Dateien aus der Liste; der Haken, der Fortschritt und der Ergebnisabschnitt liegen in [R00011](R00011-datei-abhaken.md), das Springen zur nächsten ungeprüften in I0025 ([R00028](R00028-naechste-ungepruefte-datei.md), parallel).

## Geschäftlicher Nutzen

Eine KI schreibt in einem Lauf leicht 200 Commits mit über tausend geänderten Dateien. Der Mensch hakt ab, was er gesehen hat, und die Liste bleibt trotzdem lang: die abgehakten Zeilen stehen zwischen den offenen und schieben die wenigen Dateien, die noch zu tun sind, aus dem Blick. Ohne Ausblenden scrollt er weiter durch Erledigtes, verliert die offenen Dateien und lässt am Ende eine ungeprüft, die nie auf den Schirm kam — die KI liest „Keine Anmerkungen.“ dann als Freigabe. Mit dem Schalter „Abgehakte ausblenden“ sieht er nur die noch offene Arbeit; weil Ausblenden eine **Sicht** ist und nicht die Auswahl ändert, bleibt jede ausgeblendete Datei abhakbar und wird im Ergebnis weiter als abgehakt genannt, sodass der Rückkanal an die KI ehrlich bleibt. Zusammen mit der Muster-Ausblendung ([R00025](R00025-dateien-ausblenden.md)) hat er damit zwei Werkzeuge gegen das Rauschen: „was mich nicht interessiert“ und „was ich schon gesehen habe“.

## Funktionale Anforderungen

- **Bedienelement**: ein Schalter „Abgehakte ausblenden“ in der Werkzeugzeile der Dateiliste (Entwurf Fassung 2, `#ausblenden`, neben „Nächste ungeprüfte“). Er ist per Tab erreichbar und mit der Leertaste zu bedienen; sein Name beginnt mit dem sichtbaren Text. Ein eigenes Tastenkürzel gibt es hier **nicht** — die Tastenbelegung gehört zu I0015.
- **Sicht, nicht Auswahl**: Ausgeblendete Dateien verschwinden nur aus der **Anzeige** der Dateiliste (flach und als Baum, in „Zusammen“ und „Einzeln“). Haken, Stellen, Fortschritt („n von m abgehakt“, mit „ (k nicht lesbar)“ aus [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)) und der Ergebnisabschnitt `## Dateien` bleiben über die **ganze** Auswahl gerechnet; eine ausgeblendete Datei bleibt abhakbar und wird im Ergebnis genannt.
- **Was „abgehakt“ heißt**: in „Zusammen“ eine Datei, deren Stellen **alle** abgehakt sind (eine Datei mit nur einem Teil der Haken — „teilweise“ aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md) — bleibt sichtbar); in „Einzeln“ eine **Stelle** (Commit und Datei). Gesperrte Stellen sind nie abgehakt und werden nie ausgeblendet.
- **Zähler**: die Zahl der ausgeblendeten Dateien steht als Text **im Kopf** neben dem Fortschritt ([R00012](R00012-oberflaeche-liste-detail-zusammen.md) löst Ort und Wortlaut des Fortschritts ab) — „n ausgeblendet, davon a abgehakt, b Muster“ — und nennt den Anteil je Grund (Muster aus [R00025](R00025-dateien-ausblenden.md), Haken hier); ein Anteil von 0 wird weggelassen, bei 0 ausgeblendeten steht kein Zähler.
- **Zustand**: der Schalter startet **aus** (alle Dateien sichtbar), bleibt beim Wechsel von Datei, Commit und Modus und setzt beim Neuladen der Seite auf aus zurück (nichts wird gespeichert, wie der Modus in [R00012](R00012-oberflaeche-liste-detail-zusammen.md) und die Muster in [R00025](R00025-dateien-ausblenden.md)).
- **Gewählte Datei**: wird die gerade gezeigte Datei ausgeblendet, bleibt ihre Wahl und ihr Diff bestehen; die Zeile verschwindet nur aus der Liste, und **über der Liste** steht, solange sie ausgeblendet und der Schalter an ist, der Hinweis „Die gewählte Datei ist ausgeblendet“.
- **Baum**: Ordner, in denen nach dem Ausblenden keine sichtbare Datei mehr steht — weder in ihm noch in einem Unterordner —, verschwinden samt Zeile; ein Ordner mit mindestens einer sichtbaren Datei bleibt und zeigt nur die sichtbaren.
- **Kein neuer Weg**: die Sicht rechnet aus der schon geladenen Liste (I0027) und dem Stand aus [R00011](R00011-datei-abhaken.md)/[R00012](R00012-oberflaeche-liste-detail-zusammen.md); **kein neuer Serverendpunkt, kein neuer `git`-Aufruf, kein Nachladen** von Diffs. „Nächste ungeprüfte“ (I0025) folgt derselben Sicht und überspringt ausgeblendete Dateien.
- **Sicherheit**: Pfade und fremder Text erscheinen nur als Text (`textContent`, nie HTML); es entsteht keine zweite Zeichenliste (dieselbe Marken-Klasse wie bisher, `AI-Team/gelerntes.md` #17).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): bei 2 000 geänderten Dateien wirkt das Umschalten spätestens 1 s nach der Betätigung (Messwert ≤ 0,7 s, ≥ 30 % Abstand, `rollen/planer/zeitkriterien.md`). Der Abgleich läuft im Browser über die bereits geladene Liste — kein zusätzlicher `git`-Aufruf, keine zusätzliche Serveranfrage, kein Nachladen von Diffs.
- **Sicherheit**: keine neue Angriffsfläche — kein neuer Endpunkt, kein neuer `git`-Aufruf, keine neue fremde Eingabe (das ist allein das Musterfeld aus [R00025](R00025-dateien-ausblenden.md)); Pfade nur als Text und auf stderr nur mit Marken (dieselbe Funktion wie [R00011](R00011-datei-abhaken.md), keine zweite Zeichenliste).
- **Logging**: stdout bleibt bis „Beenden“ leer; je Betätigung eine Debug-Zeile auf stderr (Schalterzustand, Zahl der Ausgeblendeten je Grund); Pfade nur mit Marken.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und dem Entwurf Fassung 2 (`Dokumentation/Wireframes/oberflaeche-fassung-2.html`, `.schalter`, M3 switch); der Schalter trägt einen Namen, der mit dem sichtbaren Text beginnt; „alle Dateien abgehakt“ (die Liste ist dann leer) ist ein Zustand mit Ausweg, keine Sackgasse.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (Wegwerf-Ordner, nie das Projekt-Repo; aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md)): `z1` „Start“ legt `README.md` (2 Zeilen) und `src/a.txt` (3 Zeilen) an; `z2` ändert in `src/a.txt` eine Zeile und legt `src/b.txt` (2 Zeilen) an; `z3` ändert in `src/a.txt` und `src/b.txt` je eine Zeile. In „Zusammen“ sind das **3 Dateien**, in „Einzeln“ **6 Stellen** (`z1`: `README.md`, `src/a.txt`; `z2`: `src/a.txt`, `src/b.txt`; `z3`: `src/a.txt`, `src/b.txt`). Dazu **Repo Q** aus [R00025](R00025-dateien-ausblenden.md) (Commit `i1` legt sieben Dateien an: `README.md`, `src/a.txt`, `src/b.txt`, `docs/README.md`, `app.lock`, `build/out.log`, `src/generated/api.cs`; für den Baum eine ganze, von `build/out.log` allein gebildete Ordnerzeile) und **Repo N plus `v`** aus [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md)/[R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (10 Stellen, davon **3 gesperrt**). Aufruf `gitreviewA <Hashes> --kein-browser`, Seite über die Startzeile, Fenster 1280 × 800. „Abgehakte ausblenden“ = den Schalter in der Werkzeugzeile der Dateiliste betätigen. Die Angabe „Ebene“ nennt, wo das Kriterium geprüft wird; „Oberfläche“ heißt Integrationstest der Oberfläche gegen einen Fake-Server bzw. das laufende Programm, nicht Playwright. Das Ausblenden liegt **nicht** auf dem Hot Path (`AI-Team/factory.md`); Playwright nur für Browser-Eigenes (Schalter, Fokus, Neuladen, Zeit).

### Grundfall: Sicht in „Zusammen“
- [ ] Gegeben `gitreviewA z1 z2 z3` in „Zusammen“ mit `README.md` abgehakt und dem Schalter aus, wenn man „Abgehakte ausblenden“ einschaltet, dann steht `README.md` nicht mehr in der Dateiliste, `src/a.txt` und `src/b.txt` stehen da, und im Kopf nennt der Zähler „1 ausgeblendet, davon 1 abgehakt“; schaltet man aus, stehen wieder alle drei Dateien und kein Zusatz im Kopf. *Ebene: JS-Unit (B2801) und Oberfläche gegen Fake; der Schalter selbst Playwright (Kriterium 10).*
- [ ] Gegeben `gitreviewA z1 z2 z3` in „Einzeln“ mit `src/a.txt` bei `z2` abgehakt und dem Schalter an, dann fehlt in `z2` nur die Zeile `src/a.txt`; `src/a.txt` in `z1` und `z3` und die übrigen Stellen stehen da, der Kopf nennt weiter „1 von 6 Stellen abgehakt“ und der Zähler „1 ausgeblendet, davon 1 abgehakt“ (Rechnung: 6 Stellen, 1 abgehakt). *Ebene: JS-Unit (B2801) und Oberfläche gegen Fake.*
- [ ] Gegeben `src/b.txt` in „Zusammen“ nur bei `z2` abgehakt („teilweise“, [R00012](R00012-oberflaeche-liste-detail-zusammen.md)) und der Schalter an, dann bleibt `src/b.txt` sichtbar und im Kopf steht kein Zusatz; wird die zweite Stelle abgehakt, sodass die Datei ganz abgehakt ist, verschwindet sie und der Zähler nennt „1 ausgeblendet, davon 1 abgehakt“. *Ebene: JS-Unit (B2801) und Oberfläche gegen Fake.*

### Baum (leere Ordner)
- [ ] Gegeben Repo Q in „Zusammen“ als Baum, `build/out.log` abgehakt und der Schalter an, dann verschwindet der Ordner `build` samt seiner alleinigen Datei (`build/out.log`), die Ordner `docs` und `src` bleiben und die Wurzeldatei `README.md` bleibt sichtbar; hat ein Ordner eine sichtbare und eine ausgeblendete Datei (`src/` bleibt mit `src/a.txt`, `src/b.txt` und `src/generated/api.cs` sichtbar), bleibt er stehen und zeigt nur die sichtbaren Zeilen; wird umgekehrt `src/generated/api.cs` abgehakt, sodass der **Unterordner** `src/generated` keine sichtbare Datei mehr hat, verschwindet nur `src/generated`, und `src` bleibt mit `src/a.txt` und `src/b.txt` stehen. *Ebene: JS-Unit (B2802) und Oberfläche gegen Fake.*

### Zwei Gründe und gesperrte Stellen
- [ ] Gegeben Repo Q mit `--ignore '*.lock'` und `build/out.log` abgehakt, Schalter an, dann fehlen `app.lock` (Muster, [R00025](R00025-dateien-ausblenden.md)) und `build/out.log` (Haken), und der Zähler nennt „2 ausgeblendet, davon 1 abgehakt, 1 Muster“ — ein Anteil von 0 wird weggelassen, eine Datei, die beide Gründe trifft, wird einmal gezählt. *Ebene: JS-Unit (B2801) und Oberfläche gegen Fake.*
- [ ] Gegeben Repo N plus `v` (10 Stellen, 3 gesperrt), Schalter an, dann werden die drei gesperrten Stellen nie ausgeblendet (sie sind nie abgehakt), der Kopf nennt weiter „n von 10 abgehakt (3 nicht lesbar)“, und eine Datei, deren offene Stellen alle gesperrt sind (etwa das Paar-Mitglied, das nur in `n` vorkommt), bleibt sichtbar. *Ebene: Integration gegen die Oberfläche mit Fake.*

### Sicht, nicht Auswahl
- [ ] Gegeben Repo Q mit `--ignore '*.lock'`, `build/out.log` abgehakt und dem Schalter an, wenn beendet wird, dann nennt der Abschnitt `## Dateien` unverändert „Abgehakt: 1 von 7“ und „Ungeprüft: 6 von 7“ und führt `build/out.log` unter Abgehakt und `app.lock` unter Ungeprüft; die Sicht hat m und das Ergebnis nicht verändert. *Ebene: Integration (Programm als Prozess: stdout Byte für Byte).*

### Zustand, Wechsel und Neuladen
- [ ] Gegeben `z1 z2 z3` in „Einzeln“ mit `README.md` in `z1` abgehakt und dem Schalter an, dann bleibt der Schalter an beim Commit-Wechsel (`z1` → `z2` → `z1`), beim Datei-Wechsel und beim Wechsel auf „Zusammen“ und zurück; nach dem Neuladen der Seite steht er **aus** (alle Dateien sichtbar, nichts wird gespeichert). *Ebene: Oberfläche gegen Fake und Playwright (Neuladen — Browser-Eigenes).*
- [ ] Gegeben die gewählte Datei `README.md` wird bei eingeschaltetem Schalter abgehakt, dann verschwindet ihre Zeile aus der Liste, ihr Diff bleibt stehen, und über der Liste steht der Hinweis, dass die gewählte Datei ausgeblendet ist; schaltet man aus, erscheint die Zeile wieder und ist weiter gewählt. *Ebene: Oberfläche gegen Fake und Playwright (Fokus, Hinweis — Browser-Eigenes).*

### Bedienung und kein neuer Weg
- [ ] Gegeben `z1 z2 z3`, nur Tastatur, wenn man mit Tab zum Schalter „Abgehakte ausblenden“ geht und die Leertaste drückt, dann schaltet er um; sein Name beginnt mit dem sichtbaren Text („Abgehakte ausblenden“), und die Zahl der ausgeblendeten Dateien wird per Live-Region (höflich) angesagt. *Ebene: Playwright (Tastatur, Fokus, Name — Browser-Eigenes).*
- [ ] Gegeben `z1 z2 z3`, wenn man den Schalter mehrfach betätigt, die Sicht wechselt und beendet, dann ist die Zahl der `git`-Aufrufe dieselbe wie ohne (kein neuer Serverendpunkt, kein neuer `git`-Aufruf, kein Nachladen von Diffs). *Ebene: Prozessprobe (Aufrufzählung).*
- [ ] Gegeben Repo Q mit `build/out.log` abgehakt und dem Schalter an, wenn man „Nächste ungeprüfte“ wiederholt betätigt, dann landet es nie auf einer ausgeblendeten Datei (dieselbe Regel wie für per Muster ausgeblendete, [R00028](R00028-naechste-ungepruefte-datei.md) Szenario 6). *Ebene: Oberfläche gegen Fake.*

Grenz- und Leerfälle bedacht (Empfehlungen mangels Dialog als Anmerkung vermerkt): leere Auswahl (`gitreviewA r` mit dem leeren Commit, „Keine Dateien geändert“) — der Schalter bleibt bedienbar, im Kopf steht kein Zusatz; alle Dateien der Liste ausgeblendet (die Liste ist dann leer, ein Zustand mit Ausweg, kein toter Punkt); genau eine Datei, die abgehakt ist (Liste leer, Ausweg); eine Datei, die **beide** Gründe trifft (einmal ausgeblendet und einmal gezählt); eine Datei mit teilweisem Haken (bleibt sichtbar); das Neuladen (Schalter aus); die gesperrte Stelle (nie ausgeblendet). Verworfen als eigenes Kriterium: die Zeitmessung mit 2 000 Dateien (liegt auf der E2E-Ebene), der Baum-Fall mit einem Ordner ohne sichtbare Datei (Kriterium „Baum“), die Rückgabe des Schalters nach „Beenden“ (der Lauf endet, kein eigener Test nötig).

## Betroffene Verzeichnisstruktur

Wie in [R00004](R00004-diff-einer-datei-lesen.md) (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- `web/` — neuer reiner Baustein `abgehakte-werte.js` (Sicht aus Einträgen, Haken-Stand, Mustern und Schalterzustand; Zahl je Grund; Zählertext; läuft unter Node und im Browser, wie `diff-werte.js`/`haken-werte.js`/`ausblenden-werte.js`) und `abgehakte.js` (Schalter, Zähler, Hinweis, Anschluss an die Liste, den Stand und die Modi); der `Baumbildner` (B0207/B1102) baut den Baum über die **sichtbaren** Einträge.
- Server: **keine Änderung** — die Sicht rechnet aus der schon geladenen Liste und dem Stand.
- `tests/` und `e2e/` — Repo Q, Repo N plus `v`, Repo Z; DSL `abgehaktAusblenden`, Treiber; Unit-Tests des Bausteins unter Node.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen (Optionen unter „Notizen“). Der Entwurf Fassung 2 zeichnet den Schalter „Abgehakte ausblenden“ in der Werkzeugzeile der Dateiliste (`.schalter` mit `role="switch"`, `#ausblenden`); seine Gestaltung folgt kanbanD und Material 3.

### Ablauf

1. **Sicht rechnen** — je gezeigter Liste (Netto-Liste in „Zusammen“, Dateiliste des Commits in „Einzeln“) und dem Haken-Stand ([R00011](R00011-datei-abhaken.md), Zustand je Datei/Stelle [R00012](R00012-oberflaeche-liste-detail-zusammen.md), Sperrgründe [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md)) jeden Eintrag gegen den Schalter und die Muster ([R00025](R00025-dateien-ausblenden.md)) prüfen: sichtbar / ausgeblendet (Grund Muster oder Haken); je Grund eine Zahl (B2801).
2. **Baum über die sichtbaren Einträge** — Ordner ohne sichtbare Datei fallen weg (B2802).
3. **Schalter** — Zustand `AbgehakteAusblenden` (RAM, Start aus), bleibt beim Wechsel von Datei, Commit und Modus; Betätigung rechnet die Sicht neu (B2803).
4. **Zähler und Meldung im Kopf** — ein Zählertext mit beiden Anteilen neben dem Fortschritt; Zustand „alle ausgeblendet“ mit Ausweg (B2804).
5. **Anschluss** — Haken-Änderung, `datei-gewaehlt`, Moduswechsel und Neuladen rechnen die Sicht neu; die gewählte Datei bleibt gewählt und ihr Diff stehen (B2805).

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** die Dateiliste aus I0027 (Werkzeugzeile, Wahl, `datei-gewaehlt`), der Haken-Stand ([R00011](R00011-datei-abhaken.md)), die Muster-Sicht ([R00025](R00025-dateien-ausblenden.md)), der `Baumbildner` (B0207/B1102), neuer reiner Baustein `web/abgehakte-werte.js`.

- `Sichteintrag` (Wert, rein) — ein Listeneintrag mit Grund `sichtbar` / `abgehakt` / `muster`; in „Zusammen“ eine Datei, in „Einzeln“ eine Stelle.
- `Sicht` (benannte Collection) — die sichtbaren Einträge in der Reihenfolge der gezeigten Liste; `Sichtbare()`, `AusgeblendetAbgehakt`, `AusgeblendetMuster`.
- JS `abgehakte-werte.js` (Operation, rein, läuft unter Node und im Browser) — `sicht(liste, stand, muster, schalter)`, `zaehlertext(sicht)`, `meldung(zustand)`.
- JS `abgehakte.js` (Oberfläche) — Schalter, Zähler, Hinweis, Anschluss an die Liste und den Stand; hört auf den Stand und setzt die Sicht über das vorhandene `datei-gewaehlt` (I0027).

### Änderungen an bestehenden Klassen

`haken-werte.js` (der Zustand je Datei/Stelle aus B1106 wird mitgenutzt), `ausblenden-werte.js`/`ausblenden.js` (die Muster-Sicht [R00025](R00025-dateien-ausblenden.md) wird mitgenutzt, der Zähler trägt den zweiten Anteil), `dateiliste.js`/`dateiliste-werte.js`/`Baumbildner`/`modus.js` (die gezeigte Liste kommt aus der Sicht), `index.html`/`gitreviewa.css` (Schalter, Zähler, Hinweis, Stil aus kanbanD und Entwurf). `diff.js`, die Färbung (`faerben.js`, `farbschlange.js`), `patchZeilen`, `sichtbarTeile` und die Serverendpunkte bleiben **unberührt**.

## Tests

Nach Test-Pyramide, Test zuerst je Bubble; Interactor je Interaction, Akzeptanz gegen die Oberfläche mit Fake, Playwright nur Hot Path und Browser-Eigenes — **das Ausblenden liegt nicht auf dem Hot Path.**

**Unit (rein, unter Node):**
- `sicht` — leer, ein Eintrag, „teilweise“ bleibt sichtbar, alles abgehakt, gesperrte Stelle nie ausgeblendet, zwei Gründe, Datei, die beide Gründe trifft; je Modus (Datei/Stelle); Ausblenden aus lässt alles stehen.
- `zaehlertext` — 0 (kein Zähler), nur Haken, nur Muster, beide, 2 000; `meldung` (alle ausgeblendet, „k nicht lesbar“).
- `Baumbildner` über die sichtbare Liste — Ordner mit einer, mit keiner sichtbaren Datei, Wurzeldatei, leere Liste.

**Integration (Oberfläche gegen Fake und Prozess):**
- Oberfläche gegen Fake: Schalter, Sicht in beiden Modi und Darstellungen, Zähler, gewählte Datei, Wechsel von Commit/Datei/Modus, Neuladen (aus), verzögerte Antwort.
- Prozessprobe: kein zusätzlicher `git`-Aufruf, kein neuer Endpunkt; Debug-Zeile je Betätigung.

**E2E (Playwright, nur Browser-Eigenes):** Schalter (Tab, Name, Live-Region), Hinweis und Neuladen, Zeitkriterium mit 2 000 Dateien (ereignisgenau). Kein Hot-Path-Fall.

## Abhängigkeiten

- Abhängig von: [R00011](R00011-datei-abhaken.md) (Stelle, Haken, Stand, Fortschritt, grün), [R00015](R00015-zusammen-logik-und-server.md)/I0010 (Netto-Dateiliste, grün), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (gesperrte Stellen, grün), [R00003](R00003-commits-und-dateien-sehen.md) (Dateiliste in „Einzeln“, grün) und [R00012](R00012-oberflaeche-liste-detail-zusammen.md)/I0027 (die Dateiliste, **rot** — `Braucht I0027`, weil der Schalter in ihr lebt).
- Nachbarn, **keine** Voraussetzung: [R00025](R00025-dateien-ausblenden.md)/I0013 (die Muster-Ausblendung; der Zähler geht mit ihr zusammen, ohne sie nennt er nur den Haken-Anteil) und [R00028](R00028-naechste-ungepruefte-datei.md)/I0025 (das Springen folgt derselben Sicht).
- Blockiert: nichts. Berührt: I0015 (die Tastaturbelegung; hier kein Kürzel).

Nicht Teil dieser Anforderung (eigene Karten): die Taste für den Schalter (I0015), das Springen zur nächsten ungeprüften ([R00028](R00028-naechste-ungepruefte-datei.md)/I0025), das Ausblenden nach Mustern ([R00025](R00025-dateien-ausblenden.md)/I0013), das Ausblenden nach Status (`D`, `A`), nach Größe oder nach Sprache, ein Ausblenden im Diff-Bereich (dort steht immer nur eine Datei), Haken an Ordnern des Baums, gespeicherte Schalterzustände über den Lauf hinaus (Vision: nichts wird gespeichert).

## Offene Fragen

Keine offenen. Der product-owner hat alle vier Fragen am 2026-11-25 entschieden (`AI-Team/po-entscheidungen.md`, Zeilen 153–156, Commit `121bb1f`); die Antworten sind oben eingearbeitet:

1. **Gewählte Datei beim Ausblenden: Wahl und Diff bleiben.** Nur die Zeile verschwindet, und über der Liste steht, solange sie ausgeblendet und der Schalter an ist, „Die gewählte Datei ist ausgeblendet“; Ausschalten oder die Wahl einer anderen Datei nimmt ihn weg. Eingearbeitet in die funktionale Anforderung „Gewählte Datei“ und das Kriterium (Z. 67, Story Szenario 10).
2. **Leere Ordner im Baum: sie verschwinden** samt Zeile, auch wenn die Datei nur in einem Unterordner lag; ein Ordner mit mindestens einer sichtbaren Datei bleibt und zeigt nur die sichtbaren. Eingearbeitet in „Baum“ und das Kriterium (Z. 56, Story Szenario 5).
3. **Zähler bei zwei Gründen: ein Zähler im Kopf neben dem Fortschritt**, „n ausgeblendet, davon a abgehakt, b Muster“, Anteil 0 weggelassen, bei 0 ausgeblendeten kein Zähler; „ (k nicht lesbar)“ bleibt am Fortschritt. Eingearbeitet in „Zähler“ und die Kriterien (Z. 51–53, 59, Story Szenarien 1–4, 6); [R00025](R00025-dateien-ausblenden.md)/I0013 wird nach derselben Entscheidung angeglichen.
4. **Zustand: bleibt beim Wechsel von Datei, Commit und Modus, nach dem Neuladen aus** (nur RAM, nichts wird gespeichert). Eingearbeitet in „Zustand“ und das Kriterium (Z. 66, Story Szenario 9).

Ohne Rückfrage entschieden (Begründung unter „Notizen“): Ausblenden ist eine Sicht (m und Ergebnis unverändert, ausgeblendete Dateien bleiben abhakbar und im Ergebnis); gesperrte Stellen werden nie ausgeblendet; „abgehakt“ heißt in „Zusammen“ ganz abgehakt (teilweise bleibt sichtbar), in „Einzeln“ die Stelle; die Sicht rechnet ganz im Browser (kein neuer Serverweg, kein neuer `git`-Aufruf, kein Nachladen); „nächste ungeprüfte“ folgt derselben Sicht; Pfade nur als Text; der Schalter hat hier kein Tastenkürzel (I0015).

## Manuelle Vorbereitungstätigkeiten

- Keine über R00001/R00003 hinaus.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 6 Bubbles unterhalb I0026 (B2801–B2806), davon 2 klar (2 h) und 4 unklar (2–4 h) — Untergrenze 12 h, obere Schätzung 20 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 (autonom, `Schaetzungen/_ist-zeiten.md`) liegen bei 0,01–0,25 h je Bubble; die Richtwerte sind ein Vielfaches davon. Enthalten: nur I0026. R00025/I0013 und R00028/I0025 sind Nachbarn und nicht gezählt. Keine Ausbaustufen.

## Warum löst diese Anforderung das Problem? (Pflicht)

Der Auslöser: Eine KI hat bis zu 200 Commits mit über tausend geänderten Dateien geschrieben, und der Mensch arbeitet sie über längere Zeit ab; die abgehakten Zeilen bleiben in der Liste stehen und schieben die wenigen noch offenen Dateien aus dem Blick, sodass am Ende eine ungeprüft bleibt, die nie auf den Schirm kam — und die KI liest „Keine Anmerkungen.“ als Freigabe. Das Zielbild ist ein Review, in dem der Stand der Prüfung sichtbar ist und der Mensch die offenen Dateien zügig durchgeht. Wenn ein Schalter die abgehakten Dateien aus der Liste nimmt, in beiden Modi und beiden Darstellungen, ihre Zahl nennt und der Zustand über Wechsel bleibt, dann sieht er nur noch die offene Arbeit. Gerade dieser Schnitt ist der Hebel, weil das Ausblenden nur die **Sicht** ändert: die Liste und der Stand liegen ohnehin schon vor (I0027, [R00011](R00011-datei-abhaken.md)), m und das Ergebnis bleiben unberührt, und es entsteht kein neuer `git`-Aufruf und kein neuer Serverweg — dieselbe Linie wie die Muster-Ausblendung ([R00025](R00025-dateien-ausblenden.md)), mit der zusammen er das Rauschen in zwei Richtungen bekämpft. Er zahlt genau dort ein, wo die Aufmerksamkeit verloren geht — in der langen Dateiliste —, und macht die Zusage „Checkliste im Kopf entlasten“ der Vision wahr.

## Missing-Docs

- Verhalten des Fokus und der Liste, wenn die gewählte Datei ausgeblendet wird (Frage 1): bleibt die `aria-selected`-Zeile in einer Liste ohne sichtbare Auswahl, oder wandert der Fokus — vor dem Bauen mit einem kleinen Versuch (Listbox, Auswahl außerhalb der gezeigten Zeilen) klären; das Kriterium (Diff bleibt, Hinweis genannt) verträgt beide Wege.
- Stil des Schalters und des Zählers mit zwei Anteilen in kanbanD und Material 3 (M3 switch, `.schalter`; Zählertext im Kopf neben dem Fortschritt) — vor dem Bauen gegen kanbanD prüfen; der Entwurf Fassung 2 zeigt den Schalter, nicht den kombinierten Zähler.

## Notizen

### Optionen (Ort der Sicht)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| **1. Sicht im Browser, ein reiner Baustein (`abgehakte-werte.js`), wie [R00025](R00025-dateien-ausblenden.md) (gewählt)** | Baustein als Unit unter Node; Oberfläche gegen Fake wie R00012; eine Rechnung (JS) | gering: nur die schon geladene Liste und der Stand, kein neuer Weg | klein |
| 2. Sicht im Server (Interactor), die Liste ohne Abgehakte liefern | Akzeptanz als NUnit gegen den Interactor | eine Serveranfrage je Betätigung; der Server müsste den Haken-Stand je Datei liefern, den der Browser für die Kästchen schon hat — doppelte Wahrheit; berührt die Listenendpunkte von I0027 | mittel |
| 3. Nur im DOM ausblenden (CSS-Klasse wie im Entwurf, `.ausblenden-an .datei.abgehakt{display:none}`) | nur der Browser | leere Ordner bleiben stehen, und die Zählung und der Baum bekämen eine zweite Rechnung neben dem Baumbildner | klein |

Gewählt: **1.** Das Ausblenden ist eine Darstellung der bereits geladenen Liste (I0027 liefert sie) und des Standes ([R00011](R00011-datei-abhaken.md)); es entsteht kein neuer `git`-Aufruf und kein neuer Datenweg, und die Sicht wird nur einmal implementiert (derselbe reine JS-Baustein wie [R00025](R00025-dateien-ausblenden.md), `diff-werte.js`, `haken-werte.js`, `modus.js`). **Option 2** verworfen: ein neuer Serverweg ohne Not, gegen die Leitplanke „kein Nachladen“ und den Schnitt aus I0016. **Option 3** verworfen: CSS-Ausblenden lässt leere Ordnerzeilen stehen (Frage 2) und umgeht die Rechnung, die Zähler und Baum brauchen.

### Verworfene Alternativen

- **Ein eigenes Tastenkürzel hier:** die Tastenbelegung steht an einem Ort (I0015), sonst Tastenkonflikt über mehrere Karten (Entscheidung des product-owners, WBS I0027/I0015).
- **Zwei getrennte Zähler (je Grund):** zwei Zahlen für eine Sache; der eine Zähler trägt beide Anteile (Frage 3, entschieden).
- **Ausgeblendete Dateien aus m und dem Ergebnis nehmen:** stiller Verlust im Rückkanal an die KI; dieselbe Entscheidung wie in [R00025](R00025-dateien-ausblenden.md) (offene Frage 1 dort, Empfehlung „mitzählen“).
- **Ausblenden im Diff-Bereich (Einklappen des Diffs durch den Haken, kanbanD R00246):** der Diff-Bereich zeigt immer nur die gewählte Datei, es gäbe nichts einzuklappen; „ausblenden“ ist hier die Liste.
- **Eine Datei mit teilweisem Haken schon ausblenden:** „teilweise“ ist nicht abgehakt ([R00012](R00012-oberflaeche-liste-detail-zusammen.md)); sie zu verstecken nähme dem Menschen die Stelle, an der er den Rest abhaken kann.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-25 | Zwei Klarstellungen: der Hinweis „Die gewählte Datei ist ausgeblendet“ steht **über der Liste** (Z. 34); leere Ordner verschwinden auch dann, wenn die Datei nur in einem **Unterordner** lag (Z. 35), dafür das Kriterium „Baum“ um den Fall `src/generated` (leerer Unterordner) erweitert. Zähler durchgehend **im Kopf neben dem Fortschritt** (Z. 17, 32, 162), „ (k nicht lesbar)“ bleibt am Fortschritt, nicht am Zähler (Z. 19). „Offene Fragen“ als entschieden geschlossen (vier Antworten eingearbeitet, Empfehlungs-Marker entfernt); Story Szenario 2 sagt „im Kopf“ statt „daneben“ | Entscheidungen des product-owner 2026-11-25 (`AI-Team/po-entscheidungen.md`, Zeilen 153–156, Commit `121bb1f`): die vier Empfehlungen bestätigt; Frage 1 legt den Hinweis über die Liste, Frage 2 die Ordner samt Unterordnern, Frage 3 den Zähler in den Kopf, Frage 4 den Zustand |
