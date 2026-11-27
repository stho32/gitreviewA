---
id: R00058
status: Neu
datum: 2026-11-27
---

# R00058: Unsichtbare Zeichen — Variationsselektoren, Füller und Tag-Block in der einen Klasse

## Beschreibung

Die eine Klasse unsichtbarer Zeichen (Server `Fremdtext/UnsichtbareZeichen`, Oberfläche `UNSICHTBARE_KLASSE` in `web/dateiliste-werte.js`) umfasst künftig auch die Zeichen, die Unicode als „standardmäßig unsichtbar“ führt (Eigenschaft `Default_Ignorable_Code_Point`: Variationsselektoren, Mongolische Variationsselektoren, Grapheme Joiner, Hangul-Füller, reservierte Codepunkte des Tag-Blocks) und das leere Braille-Muster U+2800. Server und Oberfläche markieren dieselben Codepunkte; bewiesen wird das über eine gemeinsame Tabelle, gegen die beide Seiten über alle Codepunkte abgetastet werden. In `web/` steht die Klasse weiter genau einmal.

Ein Autor `Anna` + U+FE0F sieht heute aus wie `Anna`; danach zeigt jede Ausgabe `Anna⟨U+FE0F⟩`.

Zahlt ein auf: [Vision](R00000-vision.md) — „Lesbare Diffs“ und „fremder Text nur als Text“ (der Mensch sieht, was die KI geschrieben hat, unverfälscht). Folgt Lehre #17 (`AI-Team/gelerntes.md`: jede Ausgabe fremder Namen mit derselben Klasse, keine zweite Liste) und PO-Entscheidung 2026-11-24 (`AI-Team/po-entscheidungen.md` Zeile 31: Marke `⟨U+202E⟩`).

Kein Glossar (`Dokumentation/Domaenenwissen/` fehlt). „Zeichen“ und „Marke“ wie in R00054: Unicode-Codepunkt; Marke = `⟨U+` + Hex in Großbuchstaben, mindestens vier Stellen + `⟩`.

### Bestand am heutigen Code (main fd7c365, geprüft 2026-11-27)

- Klasse heute: Server `src/GitReviewA/Fremdtext/UnsichtbareZeichen.cs` Z. 61–68 (`Control` außer Tab, `Format`, `LineSeparator`, `ParagraphSeparator`, dazu einzelne Surrogate Z. 21/38); Oberfläche `src/GitReviewA/web/dateiliste-werte.js` Z. 52 `'\\p{Cc}\\p{Cf}\\p{Zl}\\p{Zp}'`. Abgetastet über U+0000–U+10FFFF ohne Surrogate und ohne Tab: beide Seiten markieren dieselben 236 Codepunkte (gezählt mit .NET 10.0.100 und Node 20.20.2, kein Unterschied).
- **Die „zwei weiteren Literale“ der Karte gibt es nicht mehr**: `web/ausblenden-werte.js` Z. 87–91 (`traegtUnsichtbares`) und `web/dateiansicht-werte.js` Z. 12, 22–27 (`istUnsichtbar`) holen `UNSICHTBARER_TEXT` aus `dateiliste-werte.js` (Commit 2e5b2c2, „[R00054] Fix B1“). Die Quelltext-Sonde dazu steht schon: `e2e/tests/bausteine/commit-werte.spec.js` Z. 172–205 (Kriterium 3 von R00054) — der Kartenteil „ein Literal“ ist heute grün und wird hier nur auf die neuen Zeichen erweitert.
- Heute rot (Node gegen `sichtbarerName`): `Anna`+U+FE0F, `a`+U+3164+`b`, `a`+U+2800+`b`, `a`+U+E0000+`b` bleiben unverändert; `❤️` (U+2764 U+FE0F) bleibt unverändert. Heute schon markiert: U+200D (`a⟨U+200D⟩b`), U+E0001, U+E0041.
- **Tag-Block**: U+E0001 (LANGUAGE TAG) und U+E0020–U+E007F (TAG SPACE … CANCEL TAG) sind `Cf` und werden schon markiert (Test `UnsichtbareZeichenTests.cs` Z. 21–22, Abtastung: U+E0001 in der Liste). Die Karte nennt U+E0000 und U+E0080 „Tags“ — beide sind **nicht zugewiesen** (`Cn`), wie U+E0002–U+E001F und U+E0080–U+E00FF; sie liegen im von Unicode reservierten unsichtbaren Bereich U+E0000–U+E0FFF (`Default_Ignorable_Code_Point`, darin auch die Variationsselektoren U+E0100–U+E01EF, `Mn`). Gemeint sein muss der ganze Bereich U+E0000–U+E0FFF, nicht zwei Codepunkte (Beleg: Python `unicodedata` 15.1 für die Kategorien, `/\p{Default_Ignorable_Code_Point}/u` in Node für die Eigenschaft).
- Wer die Klasse nutzt (alle Wege, Pflichtpunkt 5): **Server** — Ergebnis auf stdout (`Beenden/ErgebnisFormatierer.cs`, `Beenden/Bereichszeilen.cs`), Protokoll auf stderr (`Protokoll/Protokollzeile.cs`), Start-Fehlerzeilen (`Program.cs` Z. 105), Anzeigepfad in „Zusammen“ (`Zusammen/NettoDatei.cs`, `ZusammenEndpunkt.cs`, `ZusammenLesenInteractor.cs`), Dateiansicht (`Dateiansicht/Dateieintrag.cs`), Haken (`Haken/Dateiuebersicht.cs`, `DateiAbhakenInteractor.cs`), Schlüssel der Namensprüfung (`Diff/Namenspruefung.cs`), **Ablehnung** von `--ignore`-Mustern (`Aufruf/Musterpruefer.cs` Z. 18) und **kein VS-Code-Sprung** bei Namen mit Zeichen der Klasse (`Sprung/Sprungpfad.cs` Z. 53–57); **Oberfläche** — `sichtbarerName` (Dateiliste, Commit-Leiste, Streifen „Absicht der KI“, Dateisuche, Haken, Anmerkungen), Diff (`diff-werte.js` Z. 55–76), Dateiansicht (`dateiansicht-werte.js`), **Ablehnung** im Musterfeld und in der Dateisuche (`ausblenden-werte.js` `musterFehler`, `dateisuche-werte.js` Z. 43–47).
- Nicht betroffen: die Regel für den **eigenen** Anmerkungstext (`Anmerkungen/Anmerkungstext.cs`, eigene Liste, PO Zeile 59: „Emoji erlaubt“) — eigener Text des Menschen, kein fremder; er übernimmt die erweiterte Klasse ausdrücklich nicht, sonst würde ein getipptes ❤️ abgelehnt.

## Geschäftlicher Nutzen

Ein fremdes Repo kann heute einen Autor, Betreff oder Dateinamen mit einem Variationsselektor, einem Hangul-Füller oder einem leeren Braille-Muster versehen, das in keiner Ausgabe sichtbar wird: `Anna`+U+FE0F sieht aus wie `Anna`, ein Dateiname aus U+3164 sieht leer aus, `hㅤ.txt` und `h.txt` sehen gleich aus. Mit der erweiterten Klasse zeigt jede Ausgabe — Oberfläche, Ergebnis auf stdout, Protokoll — an genau der Stelle eine Marke, und Server und Oberfläche können sich nicht still auseinanderentwickeln, weil eine gemeinsame Tabelle beide über alle Codepunkte festhält.

## Funktionale Anforderungen

- Die Klasse ist: Steuerzeichen (`Cc`) außer Tab, Formatzeichen (`Cf`), Zeilentrenner (`Zl`), Absatztrenner (`Zp`), **dazu** die Codepunkte mit `Default_Ignorable_Code_Point`, die nicht schon `Cf` sind, und U+2800. Einzelne Surrogate bleiben im Server Teil der Klasse wie heute.
- Neu in der Klasse (gezählt, 13 Bereiche + U+2800, zusammen 4037 Codepunkte):

  | Bereich | Anzahl | Kategorie | Name |
  |---|---|---|---|
  | U+034F | 1 | Mn | COMBINING GRAPHEME JOINER |
  | U+115F–U+1160 | 2 | Lo | HANGUL CHOSEONG / JUNGSEONG FILLER |
  | U+17B4–U+17B5 | 2 | Mn | KHMER VOWEL INHERENT AQ / AA |
  | U+180B–U+180D | 3 | Mn | MONGOLIAN FREE VARIATION SELECTOR ONE–THREE |
  | U+180F | 1 | Mn | MONGOLIAN FREE VARIATION SELECTOR FOUR |
  | U+2065 | 1 | Cn | (nicht zugewiesen, im Bereich U+2060–U+206F) |
  | U+2800 | 1 | So | BRAILLE PATTERN BLANK (nicht `Default_Ignorable`, aus der Karte; entschieden, PO-Zeile 284) |
  | U+3164 | 1 | Lo | HANGUL FILLER |
  | U+FE00–U+FE0F | 16 | Mn | VARIATION SELECTOR-1–16 (entschieden, PO-Zeile 283) |
  | U+FFA0 | 1 | Lo | HALFWIDTH HANGUL FILLER |
  | U+FFF0–U+FFF8 | 9 | Cn | (nicht zugewiesen) |
  | U+E0000, U+E0002–U+E001F | 1 + 30 | Cn | (nicht zugewiesen, Tag-Block) |
  | U+E0080–U+E0FFF | 3968 | Cn, Mn | darin VARIATION SELECTOR-17–256 (U+E0100–U+E01EF, `Mn`), sonst nicht zugewiesen |

  Schon heute in der Klasse und unverändert: U+180E (`Cf`), U+200B–U+200F, U+202A–U+202E, U+2060–U+2064, U+2066–U+206F, U+FEFF, U+1BCA0–U+1BCA3, U+1D173–U+1D17A, U+E0001, U+E0020–U+E007F (alle `Cf`), U+00AD, U+061C.
- Rechnung: heute 236 Codepunkte (ohne Tab, ohne Surrogate) + 4036 aus `Default_Ignorable_Code_Point` + 1 (U+2800) = **4273** Codepunkte, gezählt mit .NET 10.0.100 und Node 20.20.2 am 2026-11-27. Die Zahl hängt an der Unicode-Version der Laufzeit; maßgeblich ist die gemeinsame Tabelle (Kriterium 2).
- Server und Oberfläche markieren genau die Codepunkte einer gemeinsamen Tabelle im Repo (Bereichsliste als Text), die beide Testseiten lesen.
- Jede Stelle, die die Klasse heute nutzt (Bestand oben), nutzt die erweiterte Klasse ohne eigene Änderung an ihrer Logik: Marken in allen Anzeigen und Ausgaben, Ablehnung von Mustern und Suchtexten, kein VS-Code-Sprung.
- Die Meldung bei abgelehnten Mustern nennt das Zeichen richtig: „Ein Muster darf keine unsichtbaren Zeichen enthalten.“ (Musterfeld, Dateisuche) bzw. „Ein --ignore-Muster darf keine unsichtbaren Zeichen enthalten.“ (Aufruf) — entschieden, PO-Zeile 285.
- In `web/` steht die Klasse genau einmal (`dateiliste-werte.js`); die Sonde aus R00054 Kriterium 3 kennt auch die neuen Zeichen.

## Nicht-funktionale Anforderungen

- Sicherheit: Marken entstehen weiter nur als Text (`textContent`), fremde Texte gehen nie als HTML aus. Die Klasse ersetzt nie ein Zeichen still, sie markiert.
- Grenzen (Pflichtpunkt 1): die längste Marke bleibt 9 Zeichen (`⟨U+E0FFF⟩` wie `⟨U+E007F⟩`), die Grenzen aus R00051/R00054 (20 000 Zeichen je Feld, höchstens 180 000 nach dem Markieren) und die Zuklappgrenze des Diffs (R00017, 10 000 Marken) gelten unverändert — eine Datei mit vielen Emoji-Selektoren kann dadurch früher zugeklappt werden; das ist gewollt und keine neue Grenze. stdout: das Ergebnis trägt die Marke statt des rohen Zeichens (wie heute für `Cf`), die Zeilengrenze des Ergebnisses gilt unverändert.
- Performance: keine neue Schranke; die Abtastung über alle Codepunkte ist ein Test, kein Laufzeitpfad.
- Ausführungsort: Server und Browser; keine neue stderr-Zeile.

## Akzeptanzkriterien

Vorbereitung: Repo V aus `user-stories/R00058.md` (Wegwerf-Ordner; Autor über `git -c user.name=…`, Dateinamen und Messages schreibt python3). „Zeigt“ heißt `textContent` bzw. die Zeile auf stdout. Testebene je Kriterium in Klammern.

### Abnahme-Probe der Karte

- [ ] 1. Gegeben Commit `vsel` mit Autor `Anna`+U+FE0F und Betreff `Gut`+U+3164, wenn der Mensch gitreviewA mit `vsel` startet, dann zeigt die Zeile der Leiste den Autor `Anna⟨U+FE0F⟩` und den Betreff `Gut⟨U+3164⟩`, und im Text der Leiste steht weder U+FE0F noch U+3164. Heute rot (Autor erscheint als `Anna`). (Unit `zeilenwerte`; Playwright einmal in der bestehenden Spec `commit-leiste-marken.spec.js` — Commit wählen liegt auf dem Hot Path)

### Eine Klasse, bewiesen über alle Codepunkte

- [ ] 2. Gegeben die gemeinsame Tabelle der Klasse (Bereiche wie in „Funktionale Anforderungen“), wenn jeder Codepunkt U+0000 bis U+10FFFF außer den Surrogaten einzeln durch den Server (`AlsMarken`, `EnthaeltUnsichtbares`) und durch die Oberfläche (`sichtbarerName`, `UNSICHTBARER_TEXT`) läuft, dann markieren beide genau die Codepunkte der Tabelle — heute 4273 —, und die Ränder stimmen: U+FE00, U+FE0F, U+E0000, U+E0FFF, U+2800 und U+3164 werden markiert, U+FDFF, U+FE10, U+E1000, U+2801 (⠁), U+3163 (ㅣ) und U+1161 (ᅡ) nicht. Die Abtastung im Browser (eine Seite, dieselbe Tabelle) ergibt dasselbe. Heute rot (beide Seiten 236). (Unit NUnit und Node über die ganze Menge, Allquantor; Playwright einmal für die Unicode-Daten des Browsers — nur im Browser prüfbar)

### Alle Ausgaben, alle Prüfungen (Pflichtpunkt 5)

- [ ] 3. Gegeben Commit `vnamen` mit den Dateien `v❤️.txt` (U+2764 U+FE0F) und `hㅤ.txt` (U+3164), wenn der Mensch beide in „Zusammen“ abhakt, `hㅤ.txt` eine Zeile anmerkt und beendet, dann zeigen Dateiliste und Diff-Kopf `v❤⟨U+FE0F⟩.txt` und `h⟨U+3164⟩.txt`, das Ergebnis auf stdout nennt `h⟨U+3164⟩.txt` mit der Anmerkung und kein rohes U+FE0F oder U+3164, und der Diff-Kopf von `hㅤ.txt` trägt keinen VS-Code-Link, sondern den Grund wie bei einem Namen mit U+200B (R00021). (Integration gegen Ergebnis- und Sprung-Interactor; Unit `sichtbarerName`; kein neuer Playwright-Lauf)
- [ ] 4. Gegeben ein laufendes gitreviewA, wenn der Mensch im Musterfeld `*❤️*` (U+2764 U+FE0F) eingibt, in der Dateisuche `ㅤ` (U+3164) eingibt oder gitreviewA mit `--ignore 'a⠀b'` (U+2800) startet, dann wird jedes abgelehnt: Musterfeld und Dateisuche melden „Ein Muster darf keine unsichtbaren Zeichen enthalten.“, der Start endet mit der Meldung „Ein --ignore-Muster darf keine unsichtbaren Zeichen enthalten.“ und demselben Exit-Code wie heute bei U+202E; `*❤*` (ohne Selektor) wird angenommen. (Unit `musterFehler`, Unit `Musterpruefer`; die bestehende Spec `eine-zeichenliste.spec.js` auf den neuen Wortlaut umgestellt, ein Fall U+FE0F dazu)

### Legitime Inhalte (entschieden, PO-Zeilen 283–285)

- [ ] 5. Gegeben eine Message `Gut ❤️ 👨‍👩‍👧 😀`, ein Betreff `안녕하세요` (NFC) und ein Dateiname `안녕하세요.txt` in NFD (U+110B U+1161 U+11AB …), ein Betreff `⠁⠃⠉` und ein Betreff `a⠀b`, wenn die Leiste und die Dateiliste sie zeigen, dann steht `Gut ❤⟨U+FE0F⟩ 👨⟨U+200D⟩👩⟨U+200D⟩👧 😀` (der ZWJ war schon vorher markiert), beide koreanischen Texte und `⠁⠃⠉` erscheinen unverändert, `a⠀b` als `a⟨U+2800⟩b`. (Unit `sichtbarerName` und `AlsMarken`)

### Eine Liste in `web/`

- [ ] 6. Gegeben der Quelltext von `src/GitReviewA/web/*.js`, wenn die Sonde aus R00054 Kriterium 3 (`bausteine/commit-werte.spec.js`) läuft, dann findet sie außerhalb von `dateiliste-werte.js` keine Zeichenklasse mit `\p{Cc}`, `\p{Cf}`, `\p{Zl}`, `\p{Zp}`, `\p{Default_Ignorable_Code_Point}` (auch `\p{DI}`), `️`/`︀`, `ㅤ`, `⠀`, `\u{E0000}` oder einem dieser Zeichen literal, und findet die Klasse in `dateiliste-werte.js` (Positivkontrolle). Heute für die alten Muster grün (Bestand 2e5b2c2), für die neuen ohne Muster; Mutant „Klasse in `ausblenden-werte.js` kopiert“ wird rot. (Unit, Sonde)

Grenz- und Leerfälle bedacht: Ränder der Bereiche (2); Zeichen über U+FFFF (`⟨U+E0000⟩`, `⟨U+E01EF⟩`, 2); leerer Text und Text nur aus Zeichen der Klasse — unverändert nach R00054 Kriterium 7 (eine Message nur aus U+FE0F hat einen Rumpf); Emoji ohne Selektor bleibt (5); Selektor direkt am Anfang eines Namens (`⟨U+FE0F⟩a.txt`) über die Abtastung (2). **Verworfen**: eigene Kriterien je Ausgabeweg (Protokoll, Dateiansicht, Haken) — alle nutzen dieselbe Funktion, die Abtastung (2) und ein Weg je Art (3, 4) tragen sie; die Bestandstests der Wege bleiben grün.

**Pflichtpunkte der Detailplanung**: 1 Grenzen je Einheit — Marke bleibt höchstens 9 Zeichen, Feld- und Zuklappgrenzen unverändert (NFA), stdout trägt Marken statt Rohzeichen (3). 2 Anzeigeverfahren — nicht betroffen in der Form: „Zusammen“ ist der Standard in 3; „Einzeln“, Ansichten, Umbruch und Suche zeigen über dieselbe Funktion (Abtastung 2). 3 Festes Layout — nicht betroffen (Marken sind Text im bestehenden Rollbereich; Grenzen aus R00054 Kriterium 6 gelten). 4 Ausführungsort — Server und Browser, keine stderr-Zeile neu. 5 Eine Unterscheidung, ein Ort — eine Klasse je Laufzeit, eine gemeinsame Tabelle, alle Wege aus dem Bestand (2, 3, 4, 6); der eigene Anmerkungstext bleibt ausdrücklich außen vor.

## Betroffene Verzeichnisstruktur

- Server: `src/GitReviewA/Fremdtext/UnsichtbareZeichen.cs` (Klasse), `src/GitReviewA/Aufruf/Musterpruefer.cs` (nur Meldungstext).
- Oberfläche: `src/GitReviewA/web/dateiliste-werte.js` (die eine Klasse), `src/GitReviewA/web/ausblenden-werte.js` (nur Meldungstext).
- Tests: gemeinsame Tabelle z. B. `tests/GitReviewA.Tests/Fremdtext/unsichtbare-klasse.txt` (Ort entscheidet der Entwickler, beide Testseiten lesen dieselbe Datei); `tests/GitReviewA.Tests/Fremdtext/UnsichtbareZeichenTests.cs`, `MusterpruefungTests`/Aufruf-Tests; `e2e/tests/bausteine/dateiliste-werte.spec.js` bzw. eine neue Bausteinspec für die Abtastung, `bausteine/commit-werte.spec.js` (Sonde), `bausteine/ausblenden-werte.spec.js`; Playwright `commit-leiste-marken.spec.js`, `eine-zeichenliste.spec.js`; Treiber für Repo V unter `e2e/treiber/`.

## Technische Überlegungen

### Ablauf
1. **Tabelle zuerst** (rot) — Bereichsliste als Textdatei (`0000-0008`, `000A-001F`, …, je Zeile ein Bereich); NUnit tastet `EnthaeltUnsichtbares`/`AlsMarken` über alle Codepunkte ab und fasst zu Bereichen zusammen, Node tastet `UNSICHTBARER_TEXT`/`sichtbarerName` ebenso ab; beide vergleichen mit der Datei. Eine Playwright-Probe fährt dieselbe Abtastung in der Seite.
2. **Server** — `IstUnsichtbar(Rune)`: Kategorien wie heute **oder** Treffer in einer festen Bereichstabelle (die 13 Bereiche + U+2800). .NET kennt `Default_Ignorable_Code_Point` nicht als API; die Tabelle stammt aus `DerivedCoreProperties.txt` (Unicode) und ist Teil des Codes.
3. **Oberfläche** — `UNSICHTBARE_KLASSE` um dieselben Bereiche erweitern; Empfehlung: ausgeschriebene Bereiche (`͏ᅟᅠ…\u{E0000}\u{E0002}-\u{E001F}\u{E0080}-\u{E0FFF}`) statt `\p{Default_Ignorable_Code_Point}`, damit beide Seiten wörtlich dieselbe Liste tragen und keine Laufzeit-Unicode-Version die Oberfläche still verschiebt; die Abtastung (1) entscheidet.
4. **Meldungen** — Wortlaut in `Musterpruefer` und `musterFehler` nach PO-Zeile 285.
5. **Sonde** — `bausteine/commit-werte.spec.js` Kriterium 3 um die neuen Muster erweitern.

### Grobentwurf (Klassen-Entwurf ohne Implementierungen)

**Wichtige Einstiegsstellen:** `UnsichtbareZeichen.IstUnsichtbar` (privat, die eine Stelle im Server); `UNSICHTBARE_KLASSE` in `dateiliste-werte.js` (die eine Stelle in der Oberfläche).

- `UnsichtbareZeichen` (statische Operation, rein; bestehend) — öffentliche Signaturen unverändert:
  - `bool EnthaeltUnsichtbares(string text)`
  - `string AlsMarken(string text)`
- `sichtbarerName(name)`, `UNSICHTBARER_TEXT` (Operation bzw. Konstante, rein; bestehend) — unverändert in der Schnittstelle.

### Änderungen an bestehenden Klassen
- `Fremdtext/UnsichtbareZeichen.cs`: `IstUnsichtbar` um die Bereichstabelle; Doku-Kommentar nennt die neuen Gruppen.
- `web/dateiliste-werte.js`: `UNSICHTBARE_KLASSE` erweitert, Kommentar nennt die Tabelle.
- `Aufruf/Musterpruefer.cs`, `web/ausblenden-werte.js`: Meldungstext (PO-Zeile 285).

## Tests

Nach Skill `test-pyramide`: die Klasse ist reine Logik — Unit auf beiden Seiten über die ganze Menge; Integration nur für die Wege mit Folge (Ergebnis, Sprung, Aufruf); Playwright zweimal (Leiste auf dem Hot Path, Unicode-Daten des Browsers).

**Kandidaten für Unit Tests:** `UnsichtbareZeichen` und `sichtbarerName` (2, 5), `musterFehler` und `Musterpruefer` (4), Sonde (6). Mutanten: „Bereich FE00–FE0F fehlt“, „E0080–E0FFF fehlt“, „U+2800 fehlt“, „Tab markiert“, „Tabelle nur auf einer Seite erweitert“ — je einer rot.
**Integration:** Ergebnis auf stdout und kein Sprung für `hㅤ.txt` (3), Start mit `--ignore 'a⠀b'` (4), jeweils gegen den Interactor mit echtem git im Wegwerf-Repo V.
**E2E:** `commit-leiste-marken.spec.js` um `vsel` (1); eine Abtastung in der Seite (2); `eine-zeichenliste.spec.js` auf den neuen Wortlaut (4).

## Abhängigkeiten
- Abhängig von: R00054 (eine Zeichenliste, Sonde, I0054 grün), R00011/R00014 (Marken in Namen), R00021 (Sprung, kein Link bei Zeichen der Klasse), R00025/R00049 (Musterprüfung, Dateisuche), R00048 (Angriffsmatrix F-Trojan-Source).
- Blockiert: —

## Offene Fragen

Keine offenen. Der product-owner hat die drei Fragen am 2026-11-27 entschieden (`AI-Team/po-entscheidungen.md` Zeilen 283–285); je Frage wurde die Empfehlung übernommen und ist oben eingearbeitet:

1. **Emoji-Variationsselektor U+FE0F (❤️, ♻️, ⚠️) immer markieren?** — **entschieden, PO-Zeile 283: (a) ja, überall gleich** — `❤️` erscheint als `❤⟨U+FE0F⟩` in Leiste, Dateiliste, Diff und Ergebnis; gleich wie heute schon ZWJ-Folgen (`👨⟨U+200D⟩👩`) und Flaggen-Tags. Eine Klasse, keine Kontextregel, kein Täuschungsrest. Ein Review-Werkzeug soll zeigen, was im Text steht. Verworfen: (b) Selektor nach einem Emoji-Zeichen nicht markieren (Kontextregel; `Anna`+U+FE0F bleibt markiert) — in .NET eine zweite Tabelle (Emoji-Eigenschaft, gut 1 400 Codepunkte) und eine Paar-Regel in zwei Sprachen, Abtastung über Paare; Ziffern, `#`, `*` sind Emoji-Zeichen (`1`+U+FE0F sähe aus wie `1`), bräuchten eine Ausnahme; ZWJ bliebe markiert, also bliebe Emoji-Text uneinheitlich — etwa 2 Bubbles mehr (Hypothese); (c) Selektoren nur in Namen (Autor, Dateiname) markieren, nicht in Message und Diff — zwei Klassen, widerspricht Lehre #17.
2. **U+2800 (leeres Braille-Muster) aufnehmen?** — **entschieden, PO-Zeile 284: (a) ja** (Vorschlag der Karte) — bekanntes „unsichtbarer Name“-Zeichen; Folge: Braille-Kunst in einem Diff zeigt je Leerpunkt `⟨U+2800⟩` (gleiche Folgen als eine Marke mit Anzahl, R00054/diff-werte), alle anderen Braille-Muster (U+2801–U+28FF) bleiben unverändert. Verworfen: (b) nein — Braille-Kunst bliebe lesbar, ein leer aussehender Name bliebe möglich.
3. **Wortlaut der Ablehnung**: heute „… keine Steuer- oder Richtungszeichen …“; für U+FE0F oder U+3164 falsch. — **entschieden, PO-Zeile 285: (a) „Ein Muster darf keine unsichtbaren Zeichen enthalten.“ / „Ein --ignore-Muster darf keine unsichtbaren Zeichen enthalten.“** — drei Bestandstests werden umgestellt. Verworfen: (b) Wortlaut bleibt.

Vom planer entschieden (mit Beleg, keine Produktfrage):
- **Hangul-Füller** U+115F, U+1160, U+3164, U+FFA0 werden markiert: echter koreanischer Text nutzt sie nicht — NFC verwendet Silben U+AC00–U+D7A3, NFD (z. B. Dateinamen von macOS) zerlegt jede Silbe in Anlaut, Vokal, ggf. Auslaut ohne Füller (geprobt: `안녕하세요` NFD = U+110B U+1161 U+11AB …); Füller stehen nur in unvollständigen Silben und als bekannter „leerer Name“-Trick.
- **Ganzer `Default_Ignorable_Code_Point`** statt der Kartenliste: die Karte ließ U+180F, U+1160, U+17B4–U+17B5, U+FFF0–U+FFF8, U+2065, U+E0002–U+E001F und U+E0081–U+E0FFF aus; eine Unicode-Eigenschaft ist eine nachprüfbare Quelle statt einer geratenen Liste.
- Mongolische Variationsselektoren, U+034F und Khmer U+17B4/U+17B5 werden markiert (Unicode rät von U+17B4/U+17B5 ab; Mongolisch in Commit-Texten eines KI-Reviews ist selten, die Marke zeigt nur, was da ist).

## Manuelle Vorbereitungstätigkeiten
- keine

## Manuelle Nachbereitungstätigkeiten
- Angriffsmatrix (`Dokumentation/Sicherheit/`, Zeile F-Trojan-Source aus R00048) um die neuen Gruppen ergänzen (security-reviewer).

## Warum löst diese Anforderung das Problem? (Pflicht)

Auslöser: Der security-reviewer fand nach #64, dass `Anna`+U+FE0F, ein Name aus U+3164 oder `a`+U+E0000 in jeder Ausgabe unsichtbar bleiben, weil die Klasse nur nach den Kategorien `Cc`/`Cf`/`Zl`/`Zp` fragt und Variationsselektoren (`Mn`), Füller (`Lo`, `So`) und reservierte Codepunkte (`Cn`) nicht trägt. → Die Klasse nimmt die Unicode-Eigenschaft „standardmäßig unsichtbar“ und U+2800 auf, an der einen Stelle je Laufzeit → weil alle Ausgaben und Prüfungen schon über diese eine Stelle laufen (Bestand oben), zeigt danach jede Ausgabe die Marke und jede Prüfung lehnt ab, ohne dass ein Weg einzeln angefasst wird (1, 3, 4) → die gemeinsame Tabelle mit Abtastung über alle Codepunkte auf beiden Seiten und im Browser (2) verhindert, dass Server und Oberfläche sich bei der nächsten Unicode-Version oder Erweiterung still trennen. Der Hebel ist die Klasse selbst und nicht die einzelnen Ausgaben, weil eine Liste je Ausgabe genau die Lücke wäre, die Lehre #17 schließt.

## Missing-Docs

- `Default_Ignorable_Code_Point` ist in .NET nicht als API verfügbar; Herkunft der Bereichstabelle (Unicode `DerivedCoreProperties.txt`, Version) gehört als Kommentar an die Tabelle.

## Notizen

- **Optionen (Umfang der Klasse)**: (A) Kartenliste wörtlich — verworfen, lässt acht Bereiche derselben Art aus (siehe Entscheidung oben). (B) heutige Klasse ∪ `Default_Ignorable_Code_Point` ∪ U+2800 — **gewählt**. (C) alles außer sichtbaren Kategorien markieren (auch alle nicht zugewiesenen `Cn` und privaten `Co`) — verworfen: Symbole aus Entwicklerschriften (Private Use, z. B. Statuszeilen-Glyphen) in Commit-Texten würden markiert, nicht zugewiesene Zeichen außerhalb der reservierten Bereiche erscheinen ohnehin als Ersatzkästchen, also sichtbar.
- **Optionen (Beweis der Gleichheit)**: (A) gemeinsame Tabelle, beide Seiten tasten dagegen ab — **gewählt**. (B) der Server liefert die Klasse an die Oberfläche aus (ein Ort für beide) — verworfen: neuer Ladeweg vor jedem Zeichnen, Bausteintests in Node bräuchten den Server; die Ladereihenfolge-Lehre aus R00054 zeigt, wie empfindlich der Weg ist. (C) Node-Test startet `dotnet` und vergleicht direkt — verworfen: Testlaufzeit und Kopplung der Bausteintests an den Build.
- Leerzeichen-Varianten (U+00A0, U+2000–U+200A, U+3000, `Zs`) sind sichtbar als Abstand und nicht Teil dieser Karte.
- Herkunft: Karte #68 (Folge aus #64, security-reviewer 2026-11-27, Einstufung Optional), Labels sicherheit und oberflaeche.

## Änderungshistorie

| Datum | Änderung | Grund |
|---|---|---|
| 2026-11-27 | angelegt | Karte #68, planer, Lauf 68-planer-1 |
| 2026-11-27 | Offene Fragen geschlossen (PO-Entscheidungen 283–285, alle Empfehlungen übernommen); Vorbehalte „bis zur Antwort auf Frage n“ entfernt | Karte #68, planer, Lauf 68-planer-2 |
