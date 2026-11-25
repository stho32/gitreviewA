---
id: R00033
status: Neu
datum: 2026-11-25
---

# R00033: Seitenleiste bleibt stehen

## Beschreibung

Beim Scrollen im Diff bleibt die **Seitenleiste** — die Commit-Zeile und die Dateiliste — stehen, sodass der prüfende Mensch die Orientierung nicht verliert. Seitenleiste und Diff werden **zwei getrennte Rollbereiche**, jeder mit eigener Bildlaufleiste; der Kopf der Anwendung und die Werkzeugzeilen (Dateiliste und Diff) bleiben oben, und die Seite selbst scrollt nicht. Springt die Wahl auf eine Datei, deren Zeile nicht im Blick ist (`j`/`k`, „Nächste ungeprüfte“, Tastatur), wird die **Listenzeile in den Blick** gescrollt und der Diff beginnt oben. Der Aufbau gilt in beiden Modi („Zusammen“/„Einzeln“), beiden Ansichten („nur Änderungen“/„ganze Datei“) und beiden Anordnungen („untereinander“/„nebeneinander“).

Zahlt ein auf: [Vision](R00000-vision.md) — „Zusammen ist der Standard, die Dateien führen“ (die Liste bleibt sichtbar, während der Diff läuft) und „Checkliste im Kopf entlasten“.

Baut auf auf: [R00012](R00012-oberflaeche-liste-detail-zusammen.md) (Aufbau Liste–Detail, Kopf, Commit-Zeile, Dateiliste, Modus), [R00004](R00004-diff-einer-datei-lesen.md) (Diff-Bereich, `diff-gezeichnet`), [R00017](R00017-grosse-diffs.md) (Blockgrenze, `content-visibility`), [R00026](R00026-leerraum-und-luecken.md) (Lücken aufklappen), [R00027](R00027-im-diff-suchen.md) (Treffer in den Blick scrollen), [R00028](R00028-naechste-ungepruefte-datei.md) (nächste ungeprüfte), [R00023](R00023-nebeneinander-ansicht.md) (zweispaltige Anzeige), [R00030](R00030-tastaturbedienung.md) (`j`/`k`, Abschnittswechsel, Fokus).

### Domänenbezug

Das Projekt führt kein Glossar (`Dokumentation/Domaenenwissen/` fehlt); die Begriffe Dateiliste, Commit-Zeile, Modus, Ansicht, Anordnung und Rollbereich sind die von R00012, R00004, R00008 und R00023.

## Geschäftlicher Nutzen

Heute scrollt die Seite als Ganzes: sobald der Mensch in einer großen Datei nach unten läuft, verschwinden Commit-Zeile und Dateiliste aus dem Bild, und er muss zurückscrollen, um die nächste Datei zu wählen oder den Fortschritt zu sehen — genau die „Orientierung“, die der Betreiber vermisst. Mit zwei getrennten Rollbereichen bleibt die Liste stehen, während der Diff läuft; ihre eigene Bildlaufleiste und die automatisch in den Blick gerückte gewählte Zeile zeigen jederzeit, wo man ist. Der Nutzen kommt ohne neuen Serverweg und ohne gespeicherten Zustand: es ist derselbe Aufbau, nur in einem festen Rahmen mit zwei Rollbereichen.

## Funktionale Anforderungen

- **Getrennte Rollbereiche**: Kopf der Anwendung (`.kz`) und die beiden Werkzeugzeilen (Dateiliste, Diff) bleiben stehen; die **Seitenleiste** (Commit-Zeile und Dateiliste) und der **Diff-Bereich** sind je ein eigener Rollbereich mit eigener Bildlaufleiste; die **Seite selbst scrollt nicht** (kein doppelter Bildlauf). Der Rahmen füllt die Fensterhöhe (Vorlage: Entwurf Fassung 2, `.app` mit festem Rahmen, `.koerper` 360px + Rest, `.leiste`/`.liste{overflow:auto}`, `.diff-sc{overflow:auto}`).
- **Gewählte Zeile in den Blick**: Ist die gewählte Zeile der Dateiliste außerhalb ihres sichtbaren Bereichs, wird sie in den Blick gescrollt (kleinste Bewegung, oben/unten begrenzt); ist sie schon sichtbar, scrollt nichts. Der Diff springt bei neuem Inhalt (Datei-, Commit-, Modus- oder Ansichtswechsel) an den Anfang. Das gilt für den Klick in der Liste, für `j`/`k` (R00030), für „Nächste ungeprüfte“ ([I0025](R00028-naechste-ungepruefte-datei.md), B2703) und für den Tastensprung `u`.
- **Gilt in allen Anzeigeverfahren** (Lehre #7): Der Rahmen und die getrennten Rollbereiche gelten in beiden **Modi** („Zusammen“/„Einzeln“), beiden **Ansichten** („nur Änderungen“/„ganze Datei“) und beiden **Anordnungen** („untereinander“/„nebeneinander“, R00023). Die Blockgrenze (`content-visibility`, R00017) und das Aufklappen von Lücken (R00026) bleiben im Diff-Rollbereich, nicht auf der Seite.
- **Anschluss an die vorhandenen Sprünge**: Treffer der Suche (R00027) und der Abschnittswechsel (`n`/`p`, R00030) scrollen im Diff-Rollbereich; die Liste scrollt die gewählte Zeile in ihren eigenen Bereich. Beide Bereiche haben ihre eigene Bildlaufleiste; ein Scrollen im einen bewegt den anderen nicht.
- **Schmales Fenster**: Unten einer Mindestbreite für zwei Spalten (Seitenleiste + Diff + Trenner, Empfehlung siehe unten) fällt der Aufbau auf **eine** Spalte zurück — die Seitenleiste steht über dem Diff, und die Seite scrollt wie bisher; dann gibt es keinen Trenner (R00034) und kein Ausklappen (R00035).
- **Fokus und Tab-Reihenfolge**: Die getrennten Rollbereiche brechen die Tab-Reihenfolge nicht: die Reihenfolge bleibt Kopf → Seitenleiste → Diff → Statuszeile, jeder Bereich erreicht seine inneren Elemente wie bisher; der Diff-Bereich bleibt ein Tab-Stopp (wandernder `tabindex`, B0908/R00030).
- **Kein neuer Weg**: kein neuer Serverweg, kein neuer `git`-Aufruf, kein neuer gespeicherter Zustand (die Fensterbreite des Nutzers wird nicht gemerkt, nur die Darstellung angepasst).

## Nicht-funktionale Anforderungen

- **Performance** (Lastprofil der Vision): Der Dateiwechsel bleibt ≤ 200 ms typisch und ≤ 1 s an der Obergrenze; das Scrollen durch 20 000 Zeilen bleibt flüssig (`content-visibility`, R00017, B1605). Der Entwickler misst am laufenden Programm und hält die Werte im Bericht fest; liegt er darüber, geht das als Befund zurück, nicht als lockereres Kriterium. **Keine künstliche Last** in Leistungsproben (AI-Team/gelerntes.md, „Keine künstliche Last erzeugen“): mehrere volle Läufe mit der echten Last parallel arbeitender Rollen, kein Lastskript.
- **Sicherheit**: unverändert — fremder Text (Pfade, Betreffe) nur über `textContent`; der Rahmen zeigt nichts aus dem Repository, was ein Rollbereich preisgeben könnte; Fehler zeigen nie die Ausgabe von `git`.
- **Logging**: unverändert — die Darstellung schreibt nichts auf stderr; stdout bleibt bis „Beenden“ leer.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Entwurf Fassung 2, keine eigenen Vorgaben; der Rahmen und die zwei Rollbereiche sind die Form, die der Entwurf (`.app`, `.koerper`, `.leiste`, `.diff-sc`) schon zeichnet; die gewählte Zeile wird nie aus dem Blick gelassen, wenn eine Taste oder ein Klick sie wechselt.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (aus [R00012](R00012-oberflaeche-liste-detail-zusammen.md)) und **Repo S** mit einer Datei `lang.txt` über 200 Zeilen (mindestens die vierfache Fensterhöhe), damit beide Rollbereiche tatsächlich scrollen. Aufruf `gitreviewA <Hashes> --kein-browser`, Seite über die Startzeile, Fenster 1280 × 800. Die Kriterien dieses Slices sind **Browser-Eigenes** (Layout, Scrollen, Fokus); sie werden in Playwright geprüft, ein Serverweg entsteht nicht. „Rollbereich“ = das Element, das scrollt (Dateiliste bzw. Diff-Bereich). „Seite scrollt nicht“ = `document.scrollingElement` hat keinen Überhang.

### Zwei Rollbereiche
- [ ] Gegeben `gitreviewA s1` in „Zusammen“, `lang.txt` gewählt (200 Zeilen), wenn die Seite geladen ist, dann hat die Seite selbst keinen Bildlauf (`scrollHeight ≤ innerHeight`), und sowohl die Dateiliste als auch der Diff-Bereich sind scrollbar (`overflow`) und haben je eine eigene Bildlaufleiste. *Ebene: Playwright (Browser-Eigenes: Darstellung).*
- [ ] Gegeben dasselbe, wenn man im **Diff** bis ans Ende scrollt, dann stehen der Kopf, die Commit-Zeile, die Werkzeugzeilen und die **Dateiliste** unverändert im Bild (ihre Position ändert sich nicht) — nur die Diff-Zeilen sind weitergewandert; scrollt man danach in der **Dateiliste**, bewegt sich der Diff nicht. *Ebene: Playwright (Browser-Eigenes: getrenntes Scrollen).*
- [ ] Gegeben dasselbe, wenn man ein Fenster kleiner zieht (Höhe 600 px, Breite 1280 px), dann bleiben beide Rollbereiche intakt, und der Kopf samt Werkzeugzeilen bleibt sichtbar. *Ebene: Playwright (Browser-Eigenes).*

### Wahl in den Blick
- [ ] Gegeben Repo S mit 60 Dateien, die Dateiliste so gescrollt, dass die erste Zeile nicht sichtbar ist, wenn man `j` mehrfach drückt und die gewählte Zeile unten aus dem sichtbaren Bereich geriete, dann scrollt die Liste gerade so weit, dass die gewählte Zeile sichtbar ist (kleinste Bewegung), der Diff zeigt die gewählte Stelle, und der **Fokus** steht auf der gewählten Zeile. *Ebene: Playwright (Browser-Eigenes: Tastatur, Fokus, Scroll).*
- [ ] Gegeben „Nächste ungeprüfte“ (I0025) gewählt, wenn der Sprung auf eine Datei geht, deren Zeile nicht sichtbar ist, dann scrollt die Liste die Zeile in den Blick, der Diff beginnt oben, und der Fokus ist auf dem Sprung-Knopf (wie R00028, Kriterium „Fokus bleibt auf dem Knopf“). *Ebene: Playwright (Browser-Eigenes).*
- [ ] Gegeben die gewählte Zeile ist bereits sichtbar, wenn man `j`/`k` drückt und die neue Wahl im Blick liegt, dann scrollt die Liste **nicht** (keine überflüssige Bewegung). *Ebene: Playwright (Browser-Eigenes).*

### Alle Anzeigeverfahren (Lehre #7)
- [ ] Gegeben `gitreviewA z1 z3` (keine lückenlose Kette) und eine Datei mit Lücke, wenn man die Ansicht auf „ganze Datei“ umschaltet, in „Einzeln“ wechselt, die Anordnung auf „nebeneinander“ stellt und eine Lücke aufklappt, dann gelten die getrennten Rollbereiche und die Wahl-in-den-Blick-Regel in jeder dieser Kombinationen unverändert; das Aufklappen bewegt den Diff-Rollbereich, nicht die Seite. *Ebene: Playwright (jede Kombination abgetastet: 2 Modi × 2 Ansichten × 2 Anordnungen = 8, mindestens je Modus und Anordnung einmal).*
- [ ] Gegeben ein Treffer der Suche (R00027) außerhalb des Sichtbereichs, wenn man zum nächsten Treffer springt, dann scrollt der **Diff-Rollbereich** den Treffer in den Blick (nicht die Seite), und die Dateiliste bleibt stehen. *Ebene: Playwright (Browser-Eigenes).*

### Schmales Fenster und Grenzen
- [ ] Gegeben ein Fenster unter der Mindestbreite für zwei Spalten, wenn die Seite geladen ist, dann stehen Seitenleiste und Diff in **einer** Spalte (Seitenleiste über dem Diff), es gibt keinen Trenner (R00034) und keinen Ausklapp-Knopf (R00035), und die Seite scrollt wie bisher; zieht man das Fenster wieder über die Mindestbreite, stehen die zwei Spalten mit getrennten Rollbereichen wieder da. *Ebene: Playwright (Browser-Eigenes).*

Grenz- und Leerfälle bedacht: leere Dateiliste („Keine Dateien geändert“) → nur der Diff-Rollbereich; keine gewählte Datei → kein Sprung in den Blick; Fenster genau an der Mindestbreite → zwei Spalten. Verworfen als eigenes Kriterium: Touch-Gesten, gespeicherte Fensterbreite (nichts wird gespeichert), ein zweiter Bildlauf für die Commit-Zeile.

## Betroffene Verzeichnisstruktur

Wie in [R00001](R00001-mit-commit-hashes-aufrufen.md) und R00012 (Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/`).

- `web/index.html` — Rahmen mit Kopf, Werkzeugzeilen, Seitenleiste (Commit-Zeile + Liste) und Diff-Bereich als zwei Rollbereiche (der Aufbau `.gr-ansicht`/`.gr-links`/`.gr-dateiliste`/`.gr-diff` wird zum festen Rahmen).
- `web/gitreviewa.css` — fester Rahmen (Höhe = Fenster), `min-height:0`/`overflow:auto` für die beiden Rollbereiche, Rückfall auf eine Spalte unter der Mindestbreite.
- `web/dateiliste.js`/`web/zusammen.js`/`web/diff.js` — die vorhandenen `scrollIntoView`-Aufrufe (R00027, R00028, R00030) zielen auf den jeweiligen Rollbereich.
- `e2e/` — Playwright-Specs für getrenntes Scrollen, Wahl in den Blick, alle Anzeigeverfahren, schmales Fenster; kein neuer Serverweg.

## Technische Überlegungen

**Vorplanung** — welche Bubbles es am Ende werden, entscheidet der Entwickler beim Bauen. Die Bubbles stehen in der WBS unter I0034 (B3201–B3205).

**Artboard**: [Entwurf Fassung 2](../Dokumentation/Wireframes/oberflaeche-fassung-2.html) (abgenommen, Vorrang vor Material 3). Er zeichnet den festen Rahmen schon: `.app` (feste Höhe, `overflow:hidden`), `.koerper` (360px + `minmax(0,1fr)`), `.leiste` (Commit-Zeile `auto` + Liste `minmax(0,1fr)`), `.liste{overflow:auto}`, `.diff-sc{flex:1;min-height:0;overflow:auto}`. Diese Anforderung setzt an der gezeichneten Form an; sie erfindet keine eigene Gestaltung.

### Ablauf

1. **Rahmen** (Oberfläche) — `Fensterhöhe + Kopfhöhe → Aufbau mit Kopf, Werkzeugzeilen und zwei Rollbereichen` (die Seite selbst scrollt nicht).
2. **Wahl in den Blick** — `datei-gewaehlt`/Sprung → die Listenzeile in den eigenen Rollbereich scrollen; der Diff bei neuem Inhalt an den Anfang.
3. **Anschluss** — Suche (R00027), Abschnittswechsel (R00030), Lücke (R00026) und „Trotzdem laden“ (R00017) scrollen im Diff-Rollbereich.
4. **Schmales Fenster** — unter der Mindestbreite auf eine Spalte zurückfallen.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `web/index.html` (Aufbau), `gitreviewa.css`, die `scrollIntoView`-Stellen in `dateiliste.js`/`zusammen.js`/`suche.js`/`tasten.js`/`naechste.js`.

Es entsteht keine neue Klasse und kein neuer Serverweg. Reine Bausteine gibt es hier nicht (das Scrollen ist Browser-Eigenes).

### Änderungen an bestehenden Klassen

`web/index.html`: `.gr-ansicht` wird zum festen Rahmen mit zwei Rollbereichen. `web/gitreviewa.css`: Höhe/Überlauf der Rollbereiche, Rückfallregel. `web/diff.js`/`dateiliste.js`/`suche.js`/`tasten.js`/`naechste.js`: die vorhandenen `scrollIntoView`-Aufrufe bleiben, zielen aber auf den jeweiligen Rollbereich.

## Tests

Nach Test-Pyramide und Konfiguration (Interactor je Interaction; Playwright nur Hot Path und Browser-Eigenes). Dieser Slice ist **ausschließlich** Browser-Eigenes (Layout, Scrollen, Fokus); es gibt keinen Serverweg und keine reine Rechnung. Ein Playwright-Spec trägt die Kriterien; die Kombinationen der Anzeigeverfahren werden abgetastet (Lehre #7), nicht je Beispiel.

**E2E (Playwright headless):** zwei Bildlaufleisten und kein Seitenbildlauf; Scrollen im Diff lässt die Liste stehen (und umgekehrt); Wahl in den Blick über `j`/`k`, „Nächste ungeprüfte“ und eine bereits sichtbare Zeile; alle Anzeigeverfahren (Modi × Ansichten × Anordnungen); Suche und Abschnittswechsel scrollen im Diff-Bereich; schmales Fenster (eine Spalte, kein Trenner). Wegwerf-Repos Z (R00012) und S (200 Zeilen, 60 Dateien). Messwerte (Dateiwechsel, Scrollen) mit mindestens 30 % Abstand zur Grenze, ereignisgenau gewartet.

## Abhängigkeiten

- Abhängig von: I0027 Oberfläche Liste–Detail ([R00012](R00012-oberflaeche-liste-detail-zusammen.md), grün — der Aufbau, in den der Rahmen kommt).
- Blockiert: nichts (I0035 und I0036 sind eigenständig, siehe unten).
- Mitgenutzt und unverändert: I0006/I0022 (Diff-Bereich, beide Ansichten), I0014 (Blockgrenze, `content-visibility`), I0009 (Lücken), I0007 (Anordnung), I0025 (nächste ungeprüfte), I0031 (Suche), I0015 (`j`/`k`, Abschnittswechsel, Fokus).
- **Abstimmung mit I0033 (Umbruch standardmäßig an, Karte #36)**: der Umbruch-Standard ändert die Breite der Zeilen im Diff; der Rahmen muss beide Stände (Umbruch an/aus) unverändert tragen. Kein `Braucht` (die Anzeige ist orthogonal).

## Offene Fragen

Offen beim product-owner (die Antworten des Betreibers betreffen die Gestalt, nicht den Vertrag):

1. **Mindestbreite für zwei Spalten**: Empfehlung: die Summe aus Mindestbreite der Seitenleiste (240 px), Mindestbreite des Diffs (320 px) und Trenner (6 px) — also rund 566 px; darunter eine Spalte. Ausgangswert aus dem Entwurf und dem heutigen `minmax(280px,2fr) minmax(320px,3fr)`. Alternativen: an der heutigen Grenze 899 px bleiben (mehr Luft, früher einspaltig) oder gar kein Rückfall (schmale Spalten bleiben).
2. **Gewählte Zeile in den Blick**: Empfehlung: ja, kleinste Bewegung (`block:'nearest'`), nur wenn nötig — und **kein** Scrollen, wenn die Zeile schon sichtbar ist. Alternative: immer zentrieren (mehr Bewegung, aber gleichmäßiger).
3. **Streifen/Progress im Kopf**: Empfehlung: der Fortschritt bleibt allein im Kopf (der eine Zähler, R00012/R00029); der Rahmen wiederholt ihn nicht.

Ohne Rückfrage entschieden (Empfehlung des planers, gilt bis zur Antwort): die Seite selbst scrollt nicht; beide Rollbereiche haben eine eigene Bildlaufleiste; der Diff springt bei neuem Inhalt an den Anfang; unter der Mindestbreite fällt der Aufbau auf eine Spalte zurück, und Trenner und Ausklappen gibt es dann nicht; nichts wird gespeichert; kein neuer Serverweg.

## Manuelle Vorbereitungstätigkeiten

- Keine über R00012 hinaus (das Wegwerf-Repo S legen die Tests an).

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 5 Bubbles unterhalb I0034 (B3201–B3205), davon 1 klar (2 h) und 4 unklar (2–4 h) — Untergrenze 10 h, obere Schätzung 18 h. Zum Maßstab: die gemessenen Ist-Zeiten aus R00001 liegen bei 0,01–0,25 h je Bubble; mit einem gemessenen Slice dieser Art rechne ich noch nicht um. Enthalten: nur I0034. Nicht beauftragt: gespeicherte Fensterbreite, Touch-Gesten, ein zweiter Bildlauf für die Commit-Zeile.

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: der Betreiber schreibt, dass er „wenn man in einer Datei herunterscrollt“, „die Informationen an der Seite verliert“ — die Orientierung. Heute scrollt die ganze Seite; die Dateiliste wandert mit dem Diff nach oben aus dem Bild, und der Mensch muss zurückscrollen, um die nächste Datei zu wählen. Zielbild ist eine Liste, die steht, während der Diff läuft. Wenn die Seite zu einem festen Rahmen wird, in dem Seitenleiste und Diff je einen eigenen Rollbereich mit eigener Bildlaufleiste haben, dann bleibt die Orientierung — Dateiliste, Commit-Zeile und Fortschritt — immer sichtbar; springt die Wahl auf eine Datei außerhalb des Blicks, holt ein kleines Scrollen ihre Zeile heran. Gerade dieser Schritt ist der Hebel, weil er nur die Anordnung des vorhandenen Aufbaus ändert: derselbe Inhalt, dieselben Elemente, kein neuer Serverweg und kein gespeicherter Zustand — und er ist die Voraussetzung dafür, dass Trenner (R00034) und Ausklappen (R00035) überhaupt eine Grenze zum Ziehen und Einklappen haben.

## Missing-Docs

- Ob `scrollIntoView({block:'nearest'})` bei zwei verschachtelten Rollbereichen genau den inneren scrollt und den äußeren nicht bewegt — vor dem Bauen mit einem kleinen Versuch im Browser belegen.
- Ob `content-visibility:auto` (R00017) in einem eigenen Rollbereich weiterhin den Knotenzähler je Block hält — beim Bauen mit dem vorhandenen E2E-Knotenzähler prüfen.

## Notizen

### Optionen (Ort des Bildlaufs)

| Option | Orientierung | Aufwand | Risiko |
|---|---|---|---|
| **1. Fester Rahmen, zwei Rollbereiche (gewählt)** | hoch: Liste und Kopf bleiben immer stehen | CSS/DOM des Rahmens umbauen; vorhandene `scrollIntoView`-Stellen prüfen | doppelte Bildlaufleisten können verwirren; der Rahmen muss die Werkzeugzeilen mitnehmen |
| 2. Seitenleiste `position:sticky` | mittel: die Liste bleibt stehen, der Kopf scrollt weg | klein | Werkzeugzeilen und Kopf sind nicht durchgängig sticky; Grenzen der Liste bleiben unklar; der Trenner (R00034) sitzt auf einer unsteten Grenze |
| 3. Alles wie heute (eine Seite) | keine | keiner | löst das Problem nicht |

Gewählt: 1 — der Entwurf Fassung 2 zeichnet diesen Rahmen schon; Option 2 wäre ein zweiter Weg zum selben Ziel und deckt die Werkzeugzeilen nicht ab.

### Verworfene Alternativen

- Die Seitenleiste als Overlay/Schublade bei jedem Scrollen: verworfen — sie würde den Diff verdecken und die Grenze (R00034/R00035) unscharf machen.
- Ein gespeicherter Bildlauf je Bereich (Position merken): verworfen — neue Zustandsverwaltung ohne Nutzen, widerspricht „nichts wird gespeichert“.
- Schichtenschnitt „Layout/Scroll/Fokus“ als eigene Slices: verworfen — schneidet nach Schichten, ein Slice.
