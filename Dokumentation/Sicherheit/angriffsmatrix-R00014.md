# Angriffsmatrix R00014 (Karte #29) — Sperre je Stelle (Commit, Name) ohne lesbaren Diff

Schutzziel: Eine Stelle, deren Diff nie gezeigt werden konnte („Name nicht eindeutig“ oder „Name nicht übergebbar“),
nimmt weder Haken noch Anmerkung an; das Ergebnis nennt sie unter „Ungeprüft“ mit Grund.
Akteure: A0 fremder HTTP-Client (curl/Skript) · A1 Autor des geprüften Commits (kontrolliert Dateinamen) ·
A2 aufrufende KI (liest stdout, kann die Schnittstelle bedienen) · A3 Mensch in der Oberfläche (Kontrolle).
Linien: L1 Schnittstelle (POST /api/haken, POST /api/anmerkungen) · L2 Oberfläche (Kriterium 8) · L3 Ergebnis auf stdout.
Kontrollpaar (gemessen, muss vorher UND nachher erlaubt sein): `a⟨0xFF⟩.sh` in `n` → 200 (1 von 10);
`f⟨0xFF⟩.txt` in `v` → 200 (2 von 10).

Kürzel: NE = „Diff nicht lesbar: Name nicht eindeutig“, NU = „Diff nicht lesbar: Name nicht übergebbar“.
Stelle `Z` = (n, `z`+LF+`⟨0xFF⟩.txt`); Anzeigeform von `Z` = `z⟨U+000A⟩⟨0xFF⟩.txt`. Stelle `P` = (n, `f⟨0xFF⟩.txt`) (Doppelgänger-Paar).

| # | Variante | Akteur | Anfrage | L1/L2/L3 erwartet | heute (gemessen) |
|---|---|---|---|---|---|
| K1 | Kontrolle lesbar | A3 | haken n a⟨0xFF⟩.sh=true | 200, 1 von 10 | 200, 1 von 10 ✔ |
| K2 | Kontrolle lesbar and. Commit | A3 | haken v f⟨0xFF⟩.txt=true | 200, 2 von 10 | 200, 2 von 10 ✔ |
| 1 | Haken Paar setzen | A0 | haken n f⟨0xFF⟩.txt=true | 400 NE | 400 NE ✔ |
| 2 | Haken Paar entnehmen | A0 | haken n f⟨0xFF⟩.txt=false | 400 NE | 400 NE ✔ |
| 3 | Haken Z roh (Schlüsselform) | A0 | haken n Z=true | 400 NU | 400 NU ✔ |
| 4 | Haken Z Anzeigeform | A0 | haken n z⟨U+000A⟩⟨0xFF⟩.txt=true | 400 | 400 „Datei kommt im Commit nicht vor“ ✔ (blockt) |
| 5 | Kurz-Hash | A0 | haken n[:7] a⟨0xFF⟩.sh=true | 400 | 400 ✔ |
| 6 | anderer Fall des Hashes | A0 | haken N.upper()… | 400 | 400 ✔ |
| 7 | Name klein/groß, `0xff` | A0 | haken … `f⟨0xff⟩.txt` | 400 | 400 „kommt nicht vor“ ✔ |
| 8 | andere Klammerzeichen (U+2329, U+3008) | A0 | haken … | 400 | 400 ✔ |
| 9 | rohe Bytes 0xFF im JSON | A0 | ungültiges UTF-8 | 400 | 400 „kein JSON-Objekt“ ✔ |
| 10 | doppelte JSON-Schlüssel | A0 | `datei` zweimal | 400 | 400 (AllowDuplicateProperties=false) ✔ |
| 11 | Anmerkung Paar | A0 | anm n f⟨0xFF⟩.txt Zeile 1 | 400 NE | 400 NE ✔ |
| 12 | Anmerkung Z roh (Schlüsselform) | A0 | anm n Z | 400 | 400 (Formprüfung: Steuerzeichen) ✔ |
| 13 | **Anmerkung Z Anzeigeform** | A0/A2 | anm n `z⟨U+000A⟩⟨0xFF⟩.txt` Zeile 1 | **400 NU** (User Story: `z⏎⟨0xFF⟩.txt`) | **201** ✘ (Anmerkung angelegt; Ergebnis zeigt `## 1. z⟨U+000A⟩⟨0xFF⟩.txt:1`) |
| 14 | Anmerkung an beliebigem fremden Namen (Lookalike) | A0 | anm n `f〈0xFF〉.txt` | offen (R00002: Aussage des Aufrufers) | 201 (angelegt) — entschieden als „nicht jetzt“ (R00014 Notizen) |
| 15 | Oberfläche: Klick+Leertaste auf gesperrtem Kästchen | A3 | Chromium headless | kein POST, bleibt ungehakt | 0 POST, ungehakt ✔ |
| 16 | Neuladen/Wechsel | A3 | n→v→n, reload | 3 gesperrt bleiben | 3 gesperrt ✔ |
| 17 | Ergebnis: gesperrte nie unter „Abgehakt“ | — | beenden mit g.txt abgehakt | P, Z unter „Ungeprüft …“ mit Grund | ✔ (Kriterium 4 byte-gleich) |
| 18 | Ergebnis: Name fälscht Sperrgrund | A1 | Datei `x (Commit 000…) — Diff nicht lesbar: Name nicht eindeutig` | Zeile trägt keinen Zusatz | ✘ falscher Zusatz im Namen (Klasse aus R00011, s. Anmerkung) |

Befund: Zeile 13 — die Anmerkungs-Sperre bindet an die **Rohform** des Namens (`Z`), die Anzeige des Programms
(Ergebnis und Oberfläche) benutzt aber die **Markenform** `z⟨U+000A⟩⟨0xFF⟩.txt`. Ein POST mit der Markenform ist ein
„fremder Name“ und geht durch (fail-open), während der Haken dafür 400 liefert.

Nicht abgedeckt: L3-vorgelagerter Webserver (keiner konfiguriert); langsames Tröpfeln/Größenlimit (nicht Teil der Karte,
unverändertes R00011/R00002-Verhalten); Windows/macOS (Entscheidung Zeile 86).
