---
id: R00024
status: Neu
datum: 2026-11-25
---

# R00024: Umbenennung, Bild, Binärdatei

## Beschreibung

Wählt der prüfende Mensch in der Dateiliste eine Datei, zeigt die Diff-Fläche ihren Inhalt dem Inhalt gemäß: eine **Umbenennung** nennt den alten und den neuen Pfad, ein **Bild** erscheint als Bild in **vorher/nachher**, eine **Binärdatei** (kein Bild) bleibt **nur benannt** — mit Grund und, auf ausdrückliche Wahl, als Text. Der Diff selbst, die Dateiwahl und die Zustände der Fläche bleiben wie in [R00004](R00004-diff-einer-datei-lesen.md).

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ („Umbenennungen erkannt, Bilder als Vorher/Nachher, Binärdateien benannt“) und die Leitplanken Sicherheit (fremdes Repo) und Lastprofil (Diffs je Datei bei Bedarf).

Baut auf [R00004](R00004-diff-einer-datei-lesen.md) auf (Diff-Bereich, Ereignis `datei-gewaehlt`, `GET /api/commits/{hash}/diff`, `DiffLesenInteractor`, `GitStart`, Ausgabegrenze) und [R00003](R00003-commits-und-dateien-sehen.md) (`Dateiaenderung` mit `alterPfad`, Zustand „gewählte Datei“). Weiter benutzt und **nicht geändert**: [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md) (Rohbytes der Namen, `Namenspruefung`, stdin-Weg), [R00014](R00014-haken-und-anmerkung-bei-nicht-lesbarem-diff.md) (Sperre je Stelle), [R00017](R00017-grosse-diffs.md) (Ausgabegrenze 8 MiB und der Ausgang „zu groß“), [R00021](R00021-in-vs-code-springen.md) (der VS-Code-Link nennt nur den neuen Pfad).

**Ausdrücklich bestehend, nicht Teil dieser Anforderung:** die Anzeige „Binärdatei — <Grund>“ („enthält Null-Bytes“, „per Attribut als binär markiert“) und der Schalter „Als Text zeigen“ (R00004 Nacharbeit, R00013, R00017). Diese Anforderung prüft sie nur als Regression (Abschnitt „Binärdatei bleibt benannt“). **Nicht Teil dieser Anforderung:** die Dateigrößen bei Binärdateien — eigene Karte „Dateigrößen bei Binärdateien“ (noch anzulegen; Entscheidung des product-owners 2026-11-25, Frage 3).

**Entscheidung des product-owners (2026-11-24, `AI-Team/po-entscheidungen.md`, Zeile 48):** „Bild und Vorher/Nachher bleiben I0012“ — die Binärdatei selbst ist mit „als Text zeigen“ gelöst; diese Karte ergänzt das Bild.

**Entwurf Fassung 2** ([oberflaeche-fassung-2.html](../Dokumentation/Wireframes/oberflaeche-fassung-2.html)) zeigt in der Dateiliste für eine Binärdatei „binär“ und für eine Umbenennung `R` mit dem neuen Pfad; die Zustände der Diff-Fläche sagen ihren Ausweg. Der Entwurf **zeichnet kein Bild und keinen alten Pfad** — beides ist hier zu gestalten; wo er schweigt, gelten Material 3 und die Gestaltung aus kanbanD (`web/diff.js`, `web/review-uebersicht.js`, `src/`).

## Geschäftlicher Nutzen

Ein Review sieht nicht nur Zeilen: eine KI benennt Dateien um, ändert Bilder und legt Archive ab. Ohne diese Karte zeigt gitreviewA eine umbenannte Datei nur unter ihrem neuen Namen (der alte ist unsichtbar), ein geändertes Bild als „Binärdatei“ ohne Anschauung und einen Screenshot gar nicht — der Mensch müsste `git show` und einen Bildbetrachter daneben aufmachen. Mit der Karte liest er in derselben Fläche, was sich geändert hat: bei einer Umbenennung beide Namen, bei einem Bild die zwei Fassungen, und bei allem Übrigen die klare Ansage, dass es kein Text ist.

## Funktionale Anforderungen

- **Umbenennung**: trägt eine Datei den Status `R`, nennt die Zeile der Dateiliste **und** der Diff-Kopf den alten und den neuen Pfad; der neue Pfad führt, der alte steht als „← alter Pfad“ daneben (`LIESMICH.md ← README.md`). Eine reine Umbenennung (ohne Zeilenänderung) steht weiter bei „Keine Zeilenänderungen“. Unsichtbare und richtungsändernde Zeichen sowie Rohbytes beider Namen erscheinen als Marke `⟨U+…⟩` wie in R00004/R00013.
- **Bild**: ist der Inhalt der gewählten Datei ein Bild der festen Typen **PNG, JPEG, GIF oder WebP**, zeigt die Diff-Fläche die Fassung **vor** der Änderung und die Fassung **nach** der Änderung — bei genügender Breite nebeneinander (im Prüffenster 1280 × 800), unter 600 dp untereinander, beide Bilder gleich breit wie die Spalten in [R00023](R00023-nebeneinander-ansicht.md) —, je mit Beschriftung („vorher“, „nachher“), Dateiname und Größe. Gibt es eine Seite nicht, steht nur die andere mit dem Grund („neu“, „gelöscht“); bei einer Umbenennung stehen beide Namen. Der Typ wird **am Inhalt** erkannt (Magic Bytes), die Endung ist nur ein Hinweis; **SVG ist nie ein Bild**.
- **Binärdatei bleibt benannt**: ist die Datei kein Bild, bleibt es bei „Binärdatei — <Grund>“ ohne Byte-Inhalt und beim Schalter „Als Text zeigen“ (bestehend, unverändert).
- **Endpunkt**: das Bild kommt über einen eigenen Endpunkt `GET /api/commits/{hash}/bild?pfad=<Pfad>&seite=vorher` bzw. `…&seite=nachher`; der `Content-Type` ist fest (`image/png`, `image/jpeg`, `image/gif`, `image/webp`), dazu `X-Content-Type-Options: nosniff` und die Länge. Hash und Pfad werden wie beim Diff geprüft (Hash aus der Aufrufmenge, Pfad exakt in der Dateiliste des Commits) — kein Treffer endet vor jedem `git`-Aufruf.
- **Zustände und Auswege**: kein Bild → „Binärdatei“ (bestehend); über der Ausgabegrenze → „zu groß“ mit der Grenze; fehlender oder nicht lesbarer Bildinhalt → „Bild konnte nicht gelesen werden“; in jedem Fall bleiben Dateiliste und Commit-Leiste bedienbar.
- **Laden**: das Bild wird erst bei der Wahl der Datei geladen, nie vorab; antwortet der Server nach einem Wechsel der Wahl, wird die späte Antwort verworfen (wie R00004).

## Nicht-funktionale Anforderungen

- **Sicherheit** (Wissen „Sicherheit“, `AI-Team/gelerntes.md`): das geprüfte Repository ist fremd, sein Bildinhalt ist fremder Inhalt. `git` läuft nur über `GitStart` mit Argumentliste und den Schutzoptionen (signaturlos, kein ext-diff/textconv, Submodule, `refs/replace`, `core.fsmonitor=false`, `GIT_NO_LAZY_FETCH=1`); der Blob wird nur mit **Ausgabegrenze** und **Namensprüfung an der Aufrufstelle** gelesen (Lehre #10), ein Name mit Rohbytes geht nie als Argument an `git` (Lehre #28). Der Bildtyp kommt **nie aus dem Repo**: nur die vier festen Typen, am Inhalt erkannt, mit festem `Content-Type` und `nosniff`. In die Seite kommt das Bild **ausschließlich als `<img>`** mit `src` auf den eigenen Endpunkt — kein `object`, kein `iframe`, kein Inline-SVG, kein aus dem Repo stammendes Attribut. Der Endpunkt liegt hinter der Host-Prüfung, ohne CORS; es wird nichts gespeichert (nur RAM).
- **Lastprofil** (Vision): der Bildwechsel folgt dem Dateiwechsel (`≈ 1 s` an der Obergrenze); die Ausgabegrenze von 8 MiB (R00017) gilt auch für Bilder und schützt Server und Browser.
- **Logging**: stdout bleibt leer; je Anfrage eine Debug-Zeile auf stderr (`GET /api/commits/<voller Hash>/bild`, Kontext Datei, Seite, Typ, Größe — Name nur als Länge), Fehler als Error ohne Ablage des Inhalts.
- **Benutzerfreundlichkeit**: Gestaltung aus kanbanD und Material 3; Beschriftungen und der Dateiname stehen als Text (Screenreader), das Bild trägt einen sinnvollen Alternativtext (der Dateiname mit Marken); keine eigenen Gestaltungsvorgaben.

## Akzeptanzkriterien

Vorbereitung (Wegwerf-Repo im Temp-Ordner, nie das Projekt-Repo; Linux; Programm mit `--kein-browser`, Seite über die Startzeile, Fenster 1280 × 800). **Repos A und N** sind die aus [R00004](R00004-diff-einer-datei-lesen.md) bzw. [R00013](R00013-diff-leer-bei-name-mit-ungueltigem-byte.md). Neu **Repo V** (Wegwerf-Repo, `git` allein; Bilder als fest eingebettete Bytes, je ein gültiges 1×1-Bild):

```bash
git init -q -b main V && cd V
git config user.name "Anna Beispiel"; git config user.email anna@example.org
mkdir -p bilder
# Je Typ ein gültiges 1×1-Bild, Bytes fest eingebettet ($PNG1, $PNG2, $JPG, $GIF, $WEBP, $PNGGROSS
# sind base64-Zeichenketten der Testdaten; $PNGGROSS ist größer als die klein gesetzte Bildgrenze):
bild() { printf '%s' "$2" | base64 -d > "bilder/$1"; }
bild logo.png "$PNG1"; bild weg.png "$PNG1"; bild alt.png "$PNG1"
bild foto.jpg "$JPG"; bild bunt.gif "$GIF"; bild klein.webp "$WEBP"
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>\n' > bilder/karte.svg
printf 'nur Text\n' > bilder/keinbild.png                                 # Textinhalt mit .png-Endung
printf 'eins\nzwei\ndrei\nvier\nfuenf\nsechs\n' > notizen.txt
git add -A && git commit -q -m "Start"                                    # p
bild logo.png "$PNG2"                                                     # andere Bytes, gleicher Typ
bild neu.png "$PNG1"                                                      # neu
git rm -q bilder/weg.png                                                  # gelöscht
git mv bilder/alt.png bilder/umbenannt.png                                # unverändert umbenannt
git mv notizen.txt notizen2.txt && printf 'eins\nZWEI\ndrei\nvier\nfuenf\nsechs\n' > notizen2.txt
bild gross.png "$PNGGROSS"                                                # über der Grenze (Grenzprobe)
bild $'b\xff.png' "$PNG1"                                                 # Name mit ungültigem Byte
git add -A && git commit -q -m "Bilder ändern"                            # q
p=$(git rev-parse HEAD~1); q=$(git rev-parse HEAD)
```

Der Aufruf ist, wo nichts anderes steht, `gitreviewA $q $p --kein-browser` (Wahl `q`); die Bildgrenze wird für die Grenzprobe über einen internen Parameter (kein Produktwert) klein gesetzt, wie in R00017. „Wählen“ heißt Klick auf die Datei in der Dateiliste. Die Ebene nennt, wo das Kriterium geprüft wird (Integration gegen den `BildLesenInteractor` bzw. Endpunkt mit echtem `git`; Playwright nur für Browser-Eigenes).

### Umbenennung
- [ ] Gegeben Repo A und `q` gewählt, wenn man `LIESMICH.md` (umbenannt aus `README.md`, unverändert) ansieht, dann nennt die Zeile der Dateiliste **und** der Diff-Kopf den alten und den neuen Pfad (`LIESMICH.md ← README.md`), beide als Text, und der Diff-Bereich sagt weiter „Keine Zeilenänderungen“ — kein Zeileninhalt aus `README.md`. *Ebene: Integration (Interactor-Ausgang trägt den alten Pfad) und Playwright (Anzeige, Browser-Eigenes).*
- [ ] Gegeben Repo V und `q` gewählt, wenn man `notizen2.txt` (umbenannt aus `notizen.txt`, mit Änderung) wählt, dann nennt der Diff-Kopf beide Pfade, und der Diff zeigt `−zwei` (alt 2) und `+ZWEI` (neu 2) — nicht die Datei als neu hinzugefügt. *Ebene: Integration.*
- [ ] Gegeben Repo N und `n` gewählt, wenn man `t⟨0xFE⟩.txt` (umbenannt aus `s⟨0xFE⟩.txt`, Name mit ungültigem Byte) ansieht, dann stehen beide Namen als Text mit der Marke `⟨0xFE⟩` da (kein rohes Byte im Text), und der Diff zeigt `−zeile8` (alt 8) und `+GEAENDERT` (neu 8). *Ebene: Integration (Abtastung der Rohbyte-Namen) und Playwright (Anzeige).*
- [ ] Gegeben Repo A `q` gewählt, wenn man `src/b.txt` (nur geändert) wählt, dann steht kein „←“ und kein zweiter Name da (Abwesenheitsprobe: die Umbenennungs-Anzeige erscheint nicht bei anderen Status). *Ebene: Unit (Anzeige bilden: Status ≠ `R`).*

### Bild vorher/nachher
- [ ] Gegeben Repo V und `q` gewählt, wenn man `logo.png` (geändert) wählt, dann stehen **zwei** Bilder nebeneinander — bei der Fensterbreite 1280 × 800 — mit den Beschriftungen „vorher“ und „nachher“, Dateiname und Größe daneben, beide sind geladen (im Dokument je ein `img` mit `naturalWidth` > 0), und die Bytes der beiden Fassungen unterscheiden sich; im selben Lauf bei einer Fensterbreite von 500 × 800 stehen die beiden Bilder untereinander (zweite Variante). *Ebene: Integration (Endpunkt liefert je Seite die richtigen Bytes) und Playwright (Bild sichtbar, Browser-Eigenes).*
- [ ] Gegeben `neu.png` (nur in `q`), `weg.png` (in `q` gelöscht) und `umbenannt.png` (umbenannt, unverändert), wenn man jede wählt, dann steht bei `neu.png` nur „nachher“ mit „neu“, bei `weg.png` nur „vorher“ mit „gelöscht“, und bei `umbenannt.png` stehen beide Namen („umbenannt.png ← alt.png“) mit beiden Bildern. *Ebene: Integration und Playwright (Anzeige).*
- [ ] Gegeben je ein 1×1-Bild der vier Typen (`logo.png`, `foto.jpg`, `bunt.gif`, `klein.webp`), wenn man jedes wählt, dann steht je ein Bild da, und der Endpunkt antwortet je mit `Content-Type` `image/png`, `image/jpeg`, `image/gif` bzw. `image/webp`; wählt man `karte.svg`, dann steht dort ein **Text-Diff** und kein Bild (kein `img` im Bereich, kein Skript wird ausgeführt), und `keinbild.png` (Textinhalt) wird nicht als Bild gezeigt. *Ebene: Unit (Erkennung am Inhalt), Integration (Content-Type je Typ) und Playwright (`.svg` und Textdatei ohne Bild, DOM-Sicherheit).*
- [ ] Gegeben die Bildgrenze klein gesetzt und `gross.png` gewählt, dann steht „zu groß“ mit der genannten Grenze und **kein** `img` im Bereich, die Dateiliste bleibt bedienbar; ist die Objektdatei des Bildes entfernt, dann steht „Bild konnte nicht gelesen werden“ (und nicht „zu groß“). *Ebene: Integration und Playwright (Meldung).*

### Endpunkt und fremdes Repo
- [ ] Gegeben der Aufruf mit `$q $p`, wenn man nacheinander `GET /api/commits/<voller Hash von q>/bild?pfad=bilder/logo.png&seite=vorher`, `…&seite=nachher`, ohne `seite`, mit `seite=unten`, mit `pfad=bilder/gibt-es-nicht.png`, mit `pfad=notizen2.txt` (Textdatei), mit dem Hash von `p` (nicht übergeben) und mit den ersten 7 Zeichen von `q` anfragt, dann antwortet der erste und zweite Aufruf mit 200 und `image/png` plus `X-Content-Type-Options: nosniff`, die übrigen mit 400 bzw. 404, und für keine der abgewiesenen Anfragen wird ein `git`-Prozess gestartet. *Ebene: Integration (Endpunkt, gezählte `git`-Aufrufe).*
- [ ] Gegeben in `.git/config` von Repo V `diff.external`, `diff.marker.textconv`, `diff.marker.command` und eine `.gitattributes` mit `*.png diff=marker` (wie R00004), der Aufruf aus einem Unterordner von V, wenn man `logo.png` wählt, dann sind die Bildbytes dieselben wie ohne diese Konfiguration, und keine Markerdatei entsteht. *Ebene: Integration (Marker- und Konfigurationsprobe, Start aus einem Unterordner).*
- [ ] Gegeben die Datei `bilder/b⟨0xFF⟩.png` (Rohbyte im Namen), wenn man sie wählt, dann wird ihr Bild gezeigt (der Name geht über stdin an `git`, nie als Argument) und der Name steht mit Marke als Text; eine Anfrage von fremdem `Host` oder `Origin` wird wie bei den übrigen Endpunkten abgewiesen. *Ebene: Integration (Rohbyte-Namen, Host- und Origin-Prüfung).*
- [ ] Gegeben `logo.png` gewählt und die Antwort des Bildes um 1,5 s verzögert, wenn man innerhalb der Verzögerung `neu.png` wählt, dann steht am Ende `neu.png` (nur „nachher“) und nicht die späte Antwort von `logo.png`; im Diff-Bereich steht zu keinem Zeitpunkt ein Element außer `img` aus dem Bildinhalt (`object`, `iframe`, `svg`, `a` oder ein Attribut wie `onerror` fehlen). *Ebene: Playwright (verzögerte Antwort, DOM-Sicherheit, Browser-Eigenes) und Unit (verworfene Antwort).*

### Binärdatei bleibt benannt
- [ ] Gegeben Repo A und `q` gewählt, wenn man `logo.bin` wählt, dann steht „Binärdatei — enthält Null-Bytes“, **kein** Bild und kein Byte-Inhalt, und „Als Text zeigen“ liest den Text wie bisher; dasselbe gilt für `b⟨0xFF⟩.bin` aus Repo N. *Ebene: Integration (unverändert) und Playwright (unverändert).*

### Lastprofil
- [ ] Gegeben ein Bild von rund 2 MB, wenn man es wählt, dann ist es spätestens 1 s nach dem Klick im Dokument geladen (`complete` und `naturalWidth` > 0), gemessen vom Klick bis dahin (Messwert ≤ 0,7 s, ereignisgenau — kein Warten im Standardraster). *Ebene: Playwright (Zeit am Browser, Browser-Eigenes).*

## Betroffene Verzeichnisstruktur

Wie in R00004 (`src/GitReviewA/` mit Themenordnern; Oberfläche unter `src/GitReviewA/web/`; Tests in `tests/GitReviewA.Tests/`, E2E in `e2e/` mit `dsl/` und `treiber/`).

- Neuer Themenordner `src/GitReviewA/Bild/` — Bildart (rein), Lesen des Blobs über `GitStart`, `BildLesenInteractor`.
- `src/GitReviewA/Server/` — der Endpunkt in `Webserver.BildeRueckkanal`.
- `src/GitReviewA/web/` — Anzeige des Bildes und der Umbenennung (`bild.js`, `bild-werte.js`) neben `diff.js` und `dateiliste.js`.
- `tests/`, `e2e/` — Wegwerf-Repo-Hilfsklasse um Bilder und Umbenennungen erweitert, DSL `bild` und `umbenennung`.

## Technische Überlegungen

Vorplanung; was am Ende gebaut wird, entscheidet der Entwickler beim Bauen. Die Bubbles sind der Datenfluss-Entwurf aus der WBS (I0012, B2301–B2308); die Binärdatei-Anzeige (B2309) ist `bestehend`.

### Ablauf
1. **Wahl** — Ereignis `datei-gewaehlt` (Commit, Pfad, Status, `alterPfad`): der Diff lädt wie bisher (R00004); ist der Inhalt ein Bild, lädt die Fläche zusätzlich die beiden Seiten.
2. **Bildart bestimmen** — der Pfad liefert die Endung nur als Hinweis; entschieden wird an den ersten Bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, GIF `47 49 46 38`, WebP `52 49 46 46 … 57 45 42 50`). Kein Treffer → kein Bild.
3. **Blob lesen** — `vorher` ist die Fassung des ersten Elternteils (bei `A`: nichts), `nachher` die des Commits (bei `D`: nichts); jeweils `git cat-file blob <Revid>:<Pfad>` mit Argumentliste über `GitStart`, bei einem Namen mit Rohbytes über den stdin-Weg (`git cat-file --batch`, gelesen wie B1202 den stdin-Weg für `git log --stdin` nutzt) — der Name geht dort nie als Argument an `git`. Gelesen wird gegen die **Ausgabegrenze** (`Ausgabegrenze.Standard`, 8 MiB) — darüber „zu groß“, nie ein gekürztes Bild.
4. **Anfrage prüfen** — Hash gegen die übergebenen vollen Hashes, danach der Pfad exakt gegen die Dateiliste des Commits (wie `DiffLesenInteractor`), danach die Bildart. Kein Treffer → 400/404 ohne `git`-Aufruf.
5. **Zeichnen** — Beschriftungen („vorher“, „nachher“, „neu“, „gelöscht“), Dateiname und Größe als Text; je Seite ein `<img>` mit `src` auf den Endpunkt; späte Antworten werden verworfen (jüngste Wahl gewinnt).
6. **Umbenennung** — derselbe Zustand wie beim Diff: Status `R` und `alterPfad` (beide Namen mit Marken) werden in Dateiliste und Diff-Kopf angezeigt; eine reine Umbenennung bleibt bei „Keine Zeilenänderungen“.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Einstiegsstellen:** `Webserver.BildeRueckkanal` (neuer GET-Endpunkt), `GitStart` (neuer Lesepfad), der Diff-Bereich in `web/diff.js` (Anschluss an die Bildanzeige), `web/dateiliste.js` (Anzeige der Umbenennung).

- `Bildart` (Wertobjekt/Enum) — `png`, `jpeg`, `gif`, `webp`; `Medientyp` je Wert.
- `Bildbestimmung` (Operation, rein) — aus dem Anfang des Inhalts die `Bildart` oder nichts.
  - `Bildart? Art(IReadOnlyList<byte> anfang)`
- `Bildseite` (Wertobjekt) — `vorher`, `nachher`.
- `IBildquelle` (Ressourcenzugriff, wirft) — liest die Bytes einer Seite aus dem fremden Repo.
  - `byte[] Lesen(string hash, Dateiaenderung datei, Bildseite seite)`
- `GitBildquelle` (Adapter auf `GitStart`).
- `Bildanfrage` (DTO, immutable) — `Hash`, `Pfad`, `Seite`.
- `Bildantwort` (DTO, immutable) — `Art` (`Bildart?`), `Vorher`, `Nachher` (Bytes, leer wenn die Seite fehlt).
- `Bildergebnis` (Ergebnis der Interaction) — `Lesbar(Bildantwort)`, `KeinBild`, `ZuGross(Grenze)`, `NichtGefunden`, `NameNichtLesbar`, `NichtLesbar`.
- `BildLesenInteractor` (Integration) — prüft Hash, Namen und Bildart, ruft die Quelle, fängt `GitZuGross`/`GitFehler`, meldet auf stderr.
  - `Bildergebnis Lesen(Bildanfrage anfrage)`
- `BildEndpunkt` (Integration, HTTP) — dünner Adapter: `GET /api/commits/{hash}/bild`, feste `Content-Type`-Köpfe, Status 200/400/404/413/500.
- Oberfläche: `Bildbeschriftung` (Operation, rein — Beschriftung, Seite, Zustand), `Bildbereich` (Zustand und Zeichnen), `Umbenennungsbeschriftung` (Operation, rein — beide Namen mit Marken).

### Änderungen an bestehenden Modulen
- `Webserver.BildeRueckkanal`: zusätzliche Route `GET /api/commits/{hash}/bild`; `/api/commits/{hash}/diff` und die übrigen Routen unberührt.
- `web/diff.js`: nach der Antwort entscheiden, ob Bild oder Text; die Bildanzeige aufrufen.
- `web/dateiliste.js` / `dateiliste-werte.js`: der Zeilentext einer umbenannten Datei nennt zusätzlich den alten Pfad (das grüne R00003-Kriterium „`R` mit neuem Pfad“ wird nachgezogen).
- `Git/`: `GitStart` und die Schutzoptionen unverändert; die Ausgabegrenze gilt auch für den neuen Lesepfad.

## Tests

Nach `~/.claude/skills/test-pyramide/SKILL.md`: die User-Story-Szenarien werden Tests.

**Unit (pure Logik):** `Bildbestimmung` (vier Typen, `.svg`, Textinhalt mit `.png`-Endung, leere Datei, abgeschnittene Magic Bytes); `Bildbeschriftung` und `Umbenennungsbeschriftung` in JS (beide Namen, Marken, `R` ohne `alterPfad`, Status ≠ `R`, verworfene Antwort).

**Integration (NUnit gegen `BildLesenInteractor` und den Endpunkt, echtes `git` im Wegwerf-Repo):** Repo V (Bild je Seite, neu, gelöscht, umbenannt, Name mit Rohbyte, über der Grenze), Repo A (`logo.bin`, Umbenennung ohne Änderung), Repo N (Rohbyte-Name und Umbenennung mit ungültigem Byte); Marker-Skript-, Konfigurations-, Unterordner- und Grenzprobe (knapp unter und über) für den neuen Aufruf, jede zuerst rot; Statuscodes und `git`-Aufrufzahlen; `Content-Type` und `nosniff` je Typ.

**E2E (Playwright, headless):** nur Browser-Eigenes — Bild sichtbar (`naturalWidth` > 0), Umbenennungs-Anzeige, DOM-Sicherheit (nur `img`, kein `object`/`iframe`/`svg`/`onerror`, `.svg` als Text), verzögerte Antwort über `route`, Zeitkriterium ereignisgenau. I0012 liegt **nicht** auf dem Hot Path.

## Abhängigkeiten

- Abhängig von: I0006 Diff einer Datei lesen (R00004; Diff-Bereich, `datei-gewaehlt`, `DiffLesenInteractor`, `GitStart`) — gebaut; I0005 Commits und Dateien sehen (R00003; `alterPfad`, Zustand „gewählte Datei“) — gebaut. Benutzt, nicht abhängig: I0029 (R00013, Rohbytes und stdin-Weg), I0030 (R00014, Sperre je Stelle), I0014 (R00017, Ausgabegrenze), I0011 (R00021, Link nur neuer Pfad).
- Blockiert: I0027 Oberfläche Liste–Detail (R00012) übernimmt die Bild- und Umbenennungs-Anzeige in die neue Oberfläche; R00012 zeichnet beide bewusst nicht, weil sie zu I0012 gehören.

## Offene Fragen

Keine. Alle sechs Fragen sind vom product-owner entschieden (`AI-Team/po-entscheidungen.md`, 2026-11-25, Zeilen 129–134, Commit 2373651); die Antworten sind oben eingearbeitet.

1. **Form der Umbenennungs-Anzeige** — entschieden: der neue Pfad führt, der alte steht als „← alter Pfad“ daneben (`LIESMICH.md ← README.md`), dieselbe Form in Dateiliste und Diff-Kopf, beide Namen als Text mit Marken. Eingearbeitet in Beschreibung, Funktionale Anforderung „Umbenennung“ und die Kriterien unter „Umbenennung“.
2. **„binär“ statt Strich** in der Dateiliste — entschieden: „binär“ als Wort an der Stelle der `+`/`−`-Zahlen, für jede Binärdatei auch mit unbekanntem Bildtyp; eingearbeitet in [R00003](R00003-commits-und-dateien-sehen.md) (Z. 31 und Kriterium Z. 56); diese Anforderung bleibt unberührt.
3. **Dateigrößen bei Binärdateien** — entschieden: eigene Karte „Dateigrößen bei Binärdateien“ (legt der Director auf Freigabe des Betreibers an), nicht Teil dieser Anforderung.
4. **Verhältnis zu I0027/„Zusammen“** — entschieden: I0012 gilt je Commit; die Netto-Seite klärt I0027 ([R00015](R00015-zusammen-logik-und-server.md)); hier unverändert.
5. **Ort des Bildes** — entschieden: nebeneinander bei genügender Breite (im Prüffenster 1280 × 800), untereinander unter 600 dp; eingearbeitet in Funktionale Anforderung „Bild“ und Kriterium „Bild vorher/nachher“.
6. **„Trotzdem laden“ für ein zu großes Bild** — entschieden: nein, die Grenze bleibt hart wie beim Text; Kriterium Z. 83 sagt es schon, keine Änderung.

## Manuelle Vorbereitungstätigkeiten
- Keine über R00004 hinaus; die Bilder von Repo V werden im Test als Bytes eingebettet.

## Manuelle Nachbereitungstätigkeiten
- Keine.

## Umfang
Gezählt (bis Bubble geplant, Richtwerte ungemessen, keine Hypothese): 8 Bubbles unter I0012 (B2301–B2308), davon 2 Standard (2 h) und 6 unklar (2–4 h) — Untergrenze 16 h, obere Schätzung 28 h. `bestehend` und nicht gezählt: B2309 (Binärdatei-Anzeige). Enthalten: nur I0012; I0013 ff. sind nicht bis Bubble geplant und nicht gezählt.

## Warum löst diese Anforderung das Problem?

Der Auslöser: eine KI benennt Dateien um und ändert Bilder, und der prüfende Mensch sieht im Diff nur den neuen Namen bzw. „Binärdatei“ — er kann nicht erkennen, woher die Datei kam oder was sich im Bild geändert hat, und muss `git show` und einen Bildbetrachter daneben aufmachen. Wenn die Umbenennung beide Namen nennt, ein Bild seine zwei Fassungen zeigt und eine Binärdatei klar benannt bleibt, dann liest der Mensch in einer Fläche, was sich geändert hat. Die Kette: Bildart am Inhalt erkannt → Blob je Seite über denselben geschützten `git`-Weg mit Ausgabegrenze gelesen → Endpunkt liefert nur die vier festen Typen mit festem `Content-Type` und `nosniff` → die Oberfläche baut daraus ausschließlich `<img>`; so bleibt der fremde Inhalt fremder Inhalt. Hebel gerade hier: das Bild ist die erste Stelle, an der **Binärdaten** eines fremden Repos in die Seite gelangen — die vier festen Typen, das Verbot von SVG im DOM und die festen Köpfe sind genau an dieser Grenze richtig, eine spätere Nachrüstung wäre der offene Weg; und die Umbenennung ist die billigste Stelle, an der die Datei ihre Herkunft nicht mehr verschweigt.

## Missing-Docs
- Format und Verhalten von `git cat-file blob <Revid>:<Pfad>` und von `git cat-file --batch` mit einem Pfad aus dem fremden Repo (Rohbytes, fehlender Blob, Symlink-Modus, Unterordner-Start) — vor dem Bauen gegen die git-Dokumentation und eine Probe im Wegwerf-Repo prüfen; Vorbild ist der stdin-Weg aus B1202.
- WebP-Magic-Bytes (RIFF-Container mit `WEBP` an Offset 8) und die Erkennung von GIF87a/GIF89a — mit je einem 1×1-Bild als Probe festhalten.

## Notizen

### Optionen (wo das Bild entsteht)

| Option | Testbarkeit | Risiko | Scope |
|---|---|---|---|
| 1. Eigener Endpunkt liefert die Bytes, Oberfläche baut `<img>` (Empfehlung) | Typ, Köpfe und Bytes direkt prüfbar; `git`-Aufrufe zählbar | gering; neuer Endpunkt, aber dieselbe Host-Prüfung | mittel |
| 2. Bytes als Data-URL im Diff-JSON (`GET …/diff`) | ein Aufruf, aber die Diff-Antwort trägt beliebig große Bytes | Base64 sprengt die Ausgabegrenze und die Antwortzeit; Vorschaubild kann nicht getrennt geladen werden | klein |
| 3. Kein Endpunkt; die Oberfläche liest die Datei aus dem Arbeitsbaum | kein Serverweg | falsch bei gelöschten/umbenannten Dateien und bei Inhalt aus dem Commit-Stand | klein |

Gewählt: 1.

### Verworfene Alternativen
- Option 2: das Bild würde Teil des Diff-Textes; die 8-MiB-Grenze ließe sich nicht je Seite greifen, und ein spätes Bild könnte nicht verworfen werden.
- Option 3: zeigt den Arbeitsbaum statt den Stand des Commits — ein falsches Bild bei gelöschten oder umbenannten Dateien und ein zweiter Wahrheitsbegriff.
- SVG als Bild zeigen: `.svg` ist Text mit Skriptanteil; es wird als Text-Diff gezeigt (R00004), nie als Bild — die Entscheidung der Sicherheit, nicht der Gestaltung.
- Der Typ aus der Endung: eine Textdatei mit `.png`-Endung würde als Bild geliefert und als `image/png` ausgegeben; der Typ wird am Inhalt erkannt.
- Bild vorher/nachher in `GET …/diff` mitliefern (Feld `bild`): macht aus der Text-Antwort eine Binär-Antwort und vermischt zwei Ausgänge; der eigene Endpunkt hält „Diff lesen“ unberührt (R00004 „Nicht Teil dieser Anforderung“).

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-25 | Umbenennungs-Anzeige auf `neuer Pfad ← alter Pfad` umgestellt (Z. 29, Kriterien Z. 74, 77 und 81); Ort des Bildes festgelegt (Z. 30 und Kriterium Z. 80: nebeneinander bei 1280 × 800, untereinander unter 600 dp); „Dateigrößen bei Binärdateien“ als nicht Teil dieser Anforderung vermerkt; Offene Fragen als entschieden gekennzeichnet; User Story nachgezogen | Entscheidungen des product-owner 2026-11-25 (`AI-Team/po-entscheidungen.md`, Zeilen 129–134, Commit 2373651): der neue Pfad führt und der alte steht daneben (Form nach dem abgenommenen Entwurf), das Bild steht nebeneinander wie die Spalten in R00023, die Dateigrößen brauchen einen eigenen `git`-Aufruf und damit eine eigene Karte |
