---
id: R00041
status: Neu
datum: 2026-11-25
---

# R00041: Abschlussschritt vor Beenden

## Beschreibung

Bevor das Ergebnis an die KI geht, zeigt der Bestätigungsdialog von „Beenden“ (I0028, [R00050](R00050-beenden-und-abbrechen-im-kopf.md)) zwei weitere Abschnitte: **„Nicht angesehen“** — die Dateien, die der Mensch in diesem Lauf nie im Diff-Bereich geöffnet hat, jede mit einem Weg dorthin — und **„Ergebnis für die KI“** — den Text, der auf stdout gehen wird. Wer eine Datei öffnen will, kommt mit einem Klick dorthin; der Dialog schließt, der Lauf läuft weiter. Das Ergebnisformat bleibt unverändert.

Den **Dialog selbst** — Anzeige und Bedienung, Tastatur (Enter auf dem fokussierten Knopf, sonst Bestätigung), Esc und Fokusrückgabe, Höhengrenze und der Rollbereich unter den Hinweiszeilen — liefert I0028; diese Anforderung füllt nur das dort gelieferte Feld `abschnitte` und den Weg von einem Eintrag zur Datei (`schliesse({ grund })`).

Zahlt ein auf: [Vision](R00000-vision.md) — „Abschlussschritt vor ‚Beenden‘“ (ergänzt 2026-11-25), „Beenden und Abbrechen im Kopf“ und „Ergebnis als Rückkanal“.

Baut auf auf: I0028 „Beenden und Abbrechen im Kopf“ ([R00050](R00050-beenden-und-abbrechen-im-kopf.md): der Dialog mit der Zahl der Anmerkungen, den ungeprüften Dateien und dem Feld `abschnitte`; Enter wirkt auf den fokussierten Knopf, sonst bestätigt es „Beenden“; Esc und „Zurück“ schließen, der Fokus kehrt auf den Auslöser zurück), [R00037](R00037-ergebnis-spalte-live.md) (Anzeige des Ergebnistextes), [R00002](R00002-beenden-mit-ergebnis.md) (Beenden), [R00011](R00011-datei-abhaken.md) und [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Stelle, gesperrt), [R00025](R00025-dateien-ausblenden.md) (ausgeblendet).

### Domänenbezug

Kein Glossar. **„Angesehen“** ist neu: eine Stelle (Commit, Datei) gilt als angesehen, sobald der Diff-Bereich sie einmal gezeigt hat — Diff, „Keine Zeilenänderungen“, Binärdatei oder zugeklappte große Datei. In „Zusammen“ zeigt das Öffnen einer Datei alle ihre Stellen. „Angesehen“ ist nicht „abgehakt“: der Haken ist die Aussage des Menschen, „angesehen“ nur die Beobachtung des Werkzeugs.

## Geschäftlicher Nutzen

Der Dialog aus I0028 sagt, wie viele Dateien ungeprüft bleiben — aber nicht, welche der Mensch nie geöffnet hat. Gerade bei 40 Dateien rutscht eine durch, und „Keine Anmerkungen“ zu einer nie geöffneten Datei liest die KI als „gesehen, nichts gefunden“. Der Abschlussschritt zeigt die Lücke im letzten Moment und den genauen Text, der rausgeht — der Mensch beendet bewusst.

## Funktionale Anforderungen

- **Angesehen festhalten** (Pflichtpunkt 5: die eine Stelle): zeichnet der Diff-Bereich eine Datei (ein Ereignis „Diff gezeigt“ in der Oberfläche), meldet die Oberfläche die gezeigten Stellen einmal an `POST /api/angesehen`; der Server hält den **Ansichtsstand** im RAM (nichts wird gespeichert, der Stand überlebt das Neuladen der Seite wie die Haken). `GET /api/angesehen` liefert ihn. Liste, Zähler und Dialog lesen nur diesen Stand.
- **Was nicht zählt**: eine gesperrte Stelle (R00014, „Diff nicht lesbar“) wird nie als angesehen gemeldet und erscheint im Dialog nicht unter „Nicht angesehen“, weil sie schon als ungeprüft mit Grund steht — als Zahl „(k nicht lesbar)“ im Kopf des Dialogs (I0028, R00050 Kriterium 4) und je Datei als Zeile `- <Pfad> (Commit <Hash>) — <Sperrgrund>` im Abschnitt „Ergebnis für die KI“ (R00014, `## Dateien`). Eine Datei, die nur in der Liste stand, gilt nicht als angesehen.
- **Zählung der Kopfzeile** (aus I0028, unverändert): die Zeile „u von m Dateien sind nicht abgehakt“ zählt Dateien über die **ganze Auswahl**, unabhängig von Modus und Sicht (Dateisuche, Muster, ausgeblendete Abgehakte) — dieselbe Rechnung wie der Zähler in „Zusammen“ (`fortschrittZusammen`, R00050/PO Zeile 264). Davon getrennt zählt der Abschnitt „Nicht angesehen“ seine eigenen Einträge (nächste Zeile): in „Zusammen“ Dateien, in „Einzeln“ Stellen.
- **Nicht angesehen bestimmen**: in „Zusammen“ jede Datei, von der keine Stelle angesehen ist; in „Einzeln“ jede Stelle, die nicht angesehen ist — in der Reihenfolge der gezeigten Liste. Ausgeblendete Dateien (Muster, Abgehakte) gehören dazu und tragen den Vermerk „ausgeblendet“.
- **Abschnitt „Nicht angesehen (n)“** im Dialog: höchstens 20 Einträge, danach „… und k weitere“; jeder Eintrag ist ein Knopf mit dem Pfad, der den Dialog über `schliesse({ grund })` der Hülle aus I0028 schließt, die Datei wählt (blendet sie bei Bedarf ein — Ausblenden bleibt sonst unverändert) und den Lauf weiterlaufen lässt. Bei n = 0 steht „Alle Dateien angesehen“.
- **Abschnitt „Ergebnis für die KI“** im Dialog: der Text aus `GET /api/ergebnis` in einem eigenen Rollbereich, gezeichnet von derselben Anzeige wie die Ergebnis-Spalte (R00037).
- **Bedienung** (kommt aus I0028, wird hier nicht nachgebaut): der Dialog ist modal, nie höher als das Fenster, sein Inhalt rollt innen. **Enter wirkt auf den fokussierten Knopf, sonst bestätigt es „Beenden“** (R00050, „Anschluss an I0042“) — ein fokussierter Eintrag löst also seinen Weg zur Datei aus, nicht „Beenden“. Esc und „Zurück“ schließen den Dialog, der Lauf läuft weiter, und der Fokus kehrt auf den Auslöser „Beenden“ zurück. Die Einträge sind per Tab erreichbar (die Fokusfalle fragt ihre Elemente je Tab neu ab).
- **Ergebnis unverändert**: „angesehen“ steht nicht im Ergebnis; stdout ist Byte für Byte, was es ohne diesen Schritt wäre.

## Nicht-funktionale Anforderungen

- **Grenzen** (Pflichtpunkt 1): bis 2 000 Stellen (Lastprofil) — der Ansichtsstand ist eine Menge von Stellen, `POST` nimmt je Anfrage höchstens die Stellen einer Datei (bis 200 Commits) und lehnt mehr mit 400 ab; die Liste im Dialog zeigt höchstens 20 Einträge mit je einem Pfad (Länge durch das Dateisystem begrenzt); der Ergebnis-Abschnitt ist ein Rollbereich und zeigt denselben Text wie stdout mit dessen Grenzen (R00002, R00011). Der Dialog steht am Lastprofil (500 Anmerkungen, 2 000 Stellen) spätestens 5 s nach „Beenden“ (Anzeige-Schranke, R00047); „Beenden“ bis Ausgabe spätestens 5 s (R00047 löst das engere Ziel aus R00002 ab); keine Aufgabe friert die Oberfläche länger als 2 s ein (Einfrier-Schranke, R00047).
- **Sicherheit**: `POST /api/angesehen` ist ein neuer zustandsändernder Endpunkt — Anfrageschutz wie R00002 (Host, Origin, nur POST, nur `application/json`), Stellen werden gegen die Übersicht geprüft (unbekannte Stelle → 400); Namen mit Rohbytes über denselben Schlüssel wie bei den Haken (`AI-Team/gelerntes.md` #16), nie als Pfad an `git`. Pfade im Dialog nur als `textContent` mit Marken.
- **Logging** (Pflichtpunkt 4: Server-Prozess): `POST /api/angesehen` schreibt eine Debug-Zeile mit der **Anzahl** der Stellen, keinen Namen; die Oberfläche nichts.
- **Benutzerfreundlichkeit**: der Dialog bleibt modal wie in I0028 (Fokusfalle); er ist nie höher als das Fenster, sein Inhalt rollt innen.

## Akzeptanzkriterien

Vorbereitung: **Repo Z** (`user-stories/R00012.md`, drei Dateien `README.md`, `src/a.txt`, `src/b.txt`), **Repo N plus `v`** (`user-stories/R00014.md`), **Commit `g`** (2 000 Dateien, `user-stories/R00011.md` Szenario 10). Aufruf `gitreviewA <Hashes> --kein-browser`, Start in „Zusammen“. Der Dialog ist der Bestätigungsdialog aus I0028 (R00050).

- [ ] 1. Gegeben Repo Z in „Zusammen“, nur `src/a.txt` geöffnet, `README.md` abgehakt ohne Öffnen, wenn man „Beenden“ betätigt, dann nennt der Dialog „Nicht angesehen (2)“ mit `README.md` und `src/b.txt` in der Reihenfolge der Liste, und darunter steht im Abschnitt „Ergebnis für die KI“ der Text, den stdout nach Enter zeigt. Rechnung: drei Dateien, eine geöffnet. *Ebene: Unit (Bestimmen) und Integration (Interactor `angesehen`); ein Fall Playwright (Hot Path: Beenden über den Dialog).*
- [ ] 2. Gegeben der Dialog aus Kriterium 1, wenn man den Eintrag `src/b.txt` betätigt, dann ist der Dialog zu, `src/b.txt` gewählt und ihr Diff gezeigt, der Lauf läuft (stdout leer); öffnet man „Beenden“ erneut, steht „Nicht angesehen (1)“ mit `README.md`. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 3. Gegeben Repo Z in „Einzeln“, im Commit `z3` `src/a.txt` und `src/b.txt` geöffnet, sonst nichts, wenn man „Beenden“ betätigt, dann stehen die Stellen `(z1, README.md)`, `(z1, src/a.txt)`, `(z2, src/a.txt)`, `(z2, src/b.txt)` unter „Nicht angesehen (4)“; wechselt man auf „Zusammen“ und betätigt „Beenden“, steht „Nicht angesehen (1)“ mit `README.md`. Rechnung: 6 Stellen (`z1`: `README.md`, `src/a.txt`; `z2` und `z3`: `src/a.txt`, `src/b.txt`), 2 angesehen → 4 offen; in „Zusammen“ haben `src/a.txt` und `src/b.txt` eine angesehene Stelle, `README.md` keine. *Ebene: Unit (Bestimmen je Modus, alle Stellen abgetastet).*
- [ ] 4. Gegeben Repo Z, `src/a.txt` geöffnet, die Seite neu geladen, wenn man „Beenden“ betätigt, dann gilt `src/a.txt` weiter als angesehen (Stand im Server-RAM). *Ebene: Integration (Interactor und Endpunkt).*
- [ ] 5. Gegeben Repo N plus `v` mit gesperrten Dateien (R00014, Rechnung dort), wenn man „Beenden“ betätigt, dann stehen die gesperrten Dateien nicht unter „Nicht angesehen“; ihre Zahl steht im Kopf des Dialogs als „(k nicht lesbar)“ hinter den ungeprüften Dateien (I0028, R00050 Kriterium 4), und ihr Grund je Datei steht Zeile für Zeile im Abschnitt „Ergebnis für die KI“ (`- <Pfad> (Commit <Hash>) — <Sperrgrund>`, R00014 `## Dateien`); eine per Muster ausgeblendete, nie geöffnete Datei steht unter „Nicht angesehen“ mit dem Vermerk „ausgeblendet“ und wird beim Betätigen gewählt und gezeigt. *Ebene: Integration (Oberfläche gegen Fake).*
- [ ] 6. Gegeben Commit `g` (2 000 Dateien, keine geöffnet), wenn man „Beenden“ betätigt, dann zeigt der Abschnitt 20 Einträge und „… und 1980 weitere“, der Dialog ist nicht höher als das Fenster (1280 × 800), und er steht spätestens 5 s nach dem Klick (Anzeige-Schranke, R00047). *Ebene: Playwright (Darstellung, Lastprofil; die Höhengrenze liefert I0028).*
- [ ] 7. Gegeben eine fremde Herkunft (`Origin: http://evil.example`), ein `GET` auf `POST /api/angesehen`, ein Körper mit 201 Stellen und eine unbekannte Stelle, wenn `POST /api/angesehen` aufgerufen wird, dann antwortet der Server 403, 405, 400 und 400, und der Ansichtsstand ist unverändert; stderr nennt mit `--verbose` nur Anzahlen, keinen Pfad. *Ebene: Integration (Endpunkt, Programm als Prozess).*
- [ ] 8. Gegeben `POST /api/angesehen` scheitert (500) und danach `GET /api/angesehen` beim Öffnen des Dialogs, wenn man `src/a.txt` öffnet und „Beenden“ betätigt, dann zeigt der Diff keine Fehlermeldung, im Dialog steht „Nicht angesehene Dateien konnten nicht bestimmt werden“, und Enter beendet trotzdem mit unverändertem stdout und Exit 0. *Ebene: Integration (Oberfläche gegen Fake), Fehlerpfad.*
- [ ] 9. Gegeben zwei Anmerkungen und ein Haken, wenn man über den Dialog beendet, dann ist stdout Byte für Byte das Ergebnis ohne diesen Schritt (kein Abschnitt über angesehene Dateien). *Ebene: Integration (Programm, stdout).*

Grenz- und Leerfälle bedacht: n = 0 (Kriterium 3 „Alle Dateien angesehen“); Neuladen (4); gesperrt und ausgeblendet (5); 2 000 Dateien (6); Fehler (8); Esc (Funktionale Anforderungen, aus I0028). Verworfen: Ungeprüfte und nicht angesehene zusammenlegen (zwei verschiedene Aussagen: Haken des Menschen gegen Beobachtung des Werkzeugs).

**Pflichtpunkte der Detailplanung**: 1 Grenzen — Kriterien 6, 7, NFA; 2 Anzeigeverfahren — Kriterium 3 („Zusammen“ und „Einzeln“), Kriterium 5 (ausgeblendet, gesperrt); „angesehen“ gilt in jeder Ansicht und Anordnung gleich; 3 festes Layout — Kriterium 6 (die 20 Einträge und der Ergebnis-Rollbereich bleiben in dem von I0028 gelieferten, nie fensterhöheren Dialog); 4 Ausführungsort — Logging nur aus dem Server (Kriterium 7); 5 eine Stelle — der Ansichtsstand im Server, gemeldet aus dem einen Ereignis „Diff gezeigt“.

## Betroffene Verzeichnisstruktur

- `src/GitReviewA/Ansicht/` (neu): `Ansichtsstand`, `AngesehenInteractor`; Endpunkte in `Server/`.
- `src/GitReviewA/web/abschluss-werte.js` (neu, rein), `beenden.js` (füllt `abschnitte` im Dialog aus I0028), `diff.js` (Ereignis „Diff gezeigt“), Anzeige aus `ergebnis-spalte.js` (R00037).
- `tests/` (Unit, Integration), `e2e/` (Hot Path Beenden).

## Technische Überlegungen

**Vorplanung** — Bubbles B4001–B4005 unter I0042; der Dialog selbst (Bedienung, Höhengrenze, Rollbereich, das Feld `abschnitte`, `schliesse({ grund })`) kommt aus I0028/[R00050](R00050-beenden-und-abbrechen-im-kopf.md) — B4003 füllt nur `abschnitte`, B4004 nur den Weg zur Datei. **Artboard**: Variante B von „gitreviewA – Review-Fluss A/B“ (Abschlussschritt), übernommen nach Empfehlung des Directors; Entwurf Fassung 2 zeichnet den Beenden-Dialog ohne diese Abschnitte.

### Ablauf

1. Diff-Bereich zeichnet → Ereignis „Diff gezeigt“ mit den Stellen → `POST /api/angesehen` (B4001).
2. „Beenden“ → Dialog (I0028) holt `GET /api/angesehen`, Übersicht und `GET /api/ergebnis` (B4002, B4003).
3. Eintrag → `schliesse({ grund })` (I0028) → Dialog zu, Datei gewählt (B4004); Enter wirkt auf den fokussierten Knopf, auf „Beenden“ beendet es wie bisher.

### Grobentwurf

- `Ansichtsstand` (RAM, Menge von Stellen) — `void Markiere(Stellen stellen)`, `Stellen Angesehen()`.
- `AngesehenInteractor` (Integration) — prüft Stellen gegen die Übersicht, Grenze 200 je Anfrage.
- `abschluss-werte.js` (rein) — `nichtAngesehen(modus, liste, stand, gesperrt, ausgeblendet)`.

### Änderungen an bestehenden Klassen

Server-Routen (zwei Endpunkte), `beenden.js` (I0028, Abschnitte), `diff.js` (ein Ereignis).

## Tests

**Unit:** Bestimmen je Modus, Grenze 20, Vermerk „ausgeblendet“.
**Integration:** Interactor und Endpunkte (Schutz, Grenze, Neuladen), Programm (stdout unverändert).
**E2E (Playwright):** Hot Path „Beenden mit Ergebnis“ über den erweiterten Dialog; Lastprofil des Dialogs.

## Abhängigkeiten

- Abhängig von: **I0028 Beenden und Abbrechen im Kopf** ([R00050](R00050-beenden-und-abbrechen-im-kopf.md), rot — muss vorher gebaut werden; liefert den Dialog, das Feld `abschnitte`, die Enter-Regel und `schliesse({ grund })`), I0038 Ergebnis-Spalte live (R00037, rot — Anzeige des Ergebnistextes).
- Blockiert: nichts.

## Offene Fragen

Keine offenen. Der product-owner hat die Fragen 1 und 2 am 2026-11-25 und Punkt 3 am 2026-11-26 entschieden (`AI-Team/po-entscheidungen.md`, Zeile 198); die Antworten sind oben eingearbeitet:

1. **Was heißt „angesehen“, und wo wird es gehalten?** — entschieden (PO Zeile 198): einmal im Diff-Bereich gezeigt (auch „Keine Zeilenänderungen“, Binärdatei, zugeklappte große Datei), gemeldet von der Oberfläche, gehalten im RAM des Servers (überlebt das Neuladen wie die Haken, nie gespeichert). Alternativen verworfen: (a) nur im Browser — ein Neuladen machte alle Dateien wieder „nicht angesehen“ und der Hinweis würde falsch laut; (b) der Server markiert beim Ausliefern eines Diffs — mehrere Lesewege (nur Änderungen, ganze Datei, Als Text, Netto) müssten alle markieren, ein `GET` bekäme eine Nebenwirkung.
2. **„Nicht angesehen“ im Ergebnis?** — entschieden (PO Zeile 198): nein — es ist ein Hinweis an den Menschen und steht nur im Abschlussdialog („Nicht angesehen“); im Ergebnis wäre es eine Formatänderung (Vertrag mit der KI), und „ungeprüft“ steht dort schon ab dem ersten Haken.
3. entschieden (PO Zeile 266): **nein, nur für die Kopfzeile**; der Abschnitt zählt seine Einträge, Kriterium 3 bleibt. Frage (aus dem Abgleich mit R00050, Karte #50, 2026-11-26) · **Zählweise des Abschnitts „Nicht angesehen (n)“** — R00041 legt in Kriterium 3 fest: in „Einzeln“ zählt der Abschnitt Stellen („Nicht angesehen (4)“), in „Zusammen“ Dateien („Nicht angesehen (1)“). R00050 (PO Zeile 264) bestimmt „Dateien über die ganze Auswahl, unabhängig von Modus und Sicht“ und sagt, R00041 erbe diese Zählweise. Gilt sie auch für den Abschnitt? **Empfehlung: nein, nur für die Kopfzeile** („u von m Dateien sind nicht abgehakt“, I0028). Der Abschnitt bleibt bei R00041, weil ein Eintrag in „Einzeln“ die Stelle (Commit + Datei) wählen muss — ein Zähler über die ganze Auswahl in Dateien hätte dort kein Ziel für den Klick, und ein zweiter Zähler für denselben Dialog wäre die zweite Rechnung, die R00050 vermeiden will. Alternativen: den Abschnitt immer in Dateien zählen (dann braucht der Klick in „Einzeln“ eine Stelle, die der Abschnitt nicht nennt) und PO 264 auf den Abschnitt ausdehnen. R00041 bleibt bis zur Antwort unverändert; die Entscheidungen zur Bedienung sind geprüft und widersprechen nicht — Enter auf dem fokussierten Knopf (R00050), Enter bestätigt „Beenden“, bei „Abbrechen“ liegt die Vorgabe auf „Zurück“ (PO Zeile 265), und „Abbrechen“ spielt in R00041 keine Rolle.

## Manuelle Vorbereitungstätigkeiten

- Keine; I0028 hat mit [R00050](R00050-beenden-und-abbrechen-im-kopf.md) seit dem 2026-11-26 seine Anforderung und ist bis Bubble verfeinert.

## Manuelle Nachbereitungstätigkeiten

- Keine.

## Umfang

Gezählt (bis Bubble, Richtwerte ungemessen): 5 Bubbles unterhalb I0042 (B4001–B4005), 2 klar (2 h), 3 unklar (2–4 h) — 10–16 h. Nicht enthalten: I0028 mit eigener Anforderung [R00050](R00050-beenden-und-abbrechen-im-kopf.md).

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser ist die Empfehlung des Directors, den Abschlussschritt aus Variante B zu übernehmen: vor „Beenden“ das Ergebnis und nicht angesehene Dateien zeigen. Ohne ihn endet ein Review oft mit einer Datei, die der Mensch nie geöffnet hat, und die KI liest das Schweigen dazu als Zustimmung. Wenn das Werkzeug festhält, was gezeigt wurde, und genau diese Lücke im letzten Dialog nennt — mit einem Klick zur Datei —, schließt der Mensch sie oder beendet bewusst. Der Hebel ist der vorhandene Dialog aus I0028: kein neuer Schritt im Ablauf, nur mehr Information an der Stelle, an der entschieden wird.

## Missing-Docs

- Wann genau „Diff gezeigt“ in `diff.js` feuert (nach dem ersten Block oder nach dem ganzen Diff) — beim Bauen an einer Stelle festlegen und in `diff.js` dokumentieren.

## Notizen

### Verworfene Alternativen

- Eigene Seite „Abschluss“ statt Dialog (Variante B wörtlich): verworfen — I0028 hat den Dialog schon; ein zweiter Weg zu „Beenden“ wäre doppelt.
- Hinweis dauerhaft in der Liste („nie geöffnet“-Marke an jeder Zeile): verworfen — nicht beauftragt; wäre eine Ausbaustufe von I0041.
