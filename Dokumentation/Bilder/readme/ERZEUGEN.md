# Die Bilder der README erzeugen

Die Bilder unter `Dokumentation/Bilder/readme/` zeigen das echte Programm in einem **erfundenen** Beispiel-Repository „Wetterstation“. Diese Anleitung stellt dieselben Bilder nach einer Änderung der Oberfläche wieder her. Das Ergebnis im Terminal (README, Abschnitt „Erste Review in zwei Minuten“) ist kein Bild, sondern die unveränderte stdout-Ausgabe desselben Laufs.

Letzter Lauf: 2026-11-26, Stand des Zweigs `karte/59` (Basis: `main` mit dem neuen Design, der Dateiansicht `--dateien` und der Dateisuche). Alle acht Bilder stammen aus diesem Lauf.

## Voraussetzungen

- gebautes Programm: `dotnet build gitreviewA.sln -warnaserror --artifacts-path <build-ziel>`; die DLL liegt dann unter `<build-ziel>/bin/GitReviewA/debug/gitreviewA.dll` (ohne `--artifacts-path`: `src/GitReviewA/bin/Debug/net10.0/gitreviewA.dll`)
- `git`, `bash`, `python3`, ein Browser mit Playwright (Playwright-MCP oder eigenes Skript), **headless**
- ein leerer Arbeitsordner **außerhalb** dieses Repositories, im Folgenden `<arbeit>`

## 1. Das Wegwerf-Repository anlegen

Das Skript legt sechs Commits an; der Commit „Messwerte runden und Frost erkennen“ trägt zusätzlich eine Nachricht mit Rumpf (sie erscheint im Block **Absicht der KI** auf **Nachricht**). Autor ist `Alex Beispiel <alex@example.org>`, Autor- und Commit-Zeit sind fest (`+0000`), deshalb sind die Hashes bei jedem Lauf gleich. Die globale und die System-Konfiguration von git bleiben außen vor.

Das Beispiel enthält zwei Dateitypen mit Syntaxfarben (`.cs`, `.js`), eine Umbenennung (`docs/hinweise.txt` nach `docs/betrieb.txt`), eine Löschung (`src/Kalibrierung.cs`) und eine gemischte Änderung mit Leerraum (`src/Sensor.cs`, Tabulatoren statt Leerzeichen und eine echte Änderung).

```bash
#!/usr/bin/env bash
# Legt das erfundene Wegwerf-Repo "Wetterstation" an. Aufruf: baue-repo.sh <Zielordner>
set -euo pipefail
ziel="$1"
rm -rf "$ziel"; mkdir -p "$ziel"; cd "$ziel"
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME="Alex Beispiel" GIT_AUTHOR_EMAIL="alex@example.org"
export GIT_COMMITTER_NAME="Alex Beispiel" GIT_COMMITTER_EMAIL="alex@example.org"
git init -q -b main .
git config user.name "Alex Beispiel"; git config user.email alex@example.org
tag() { export GIT_AUTHOR_DATE="2026-03-$1T$2:00:00+0000" GIT_COMMITTER_DATE="2026-03-$1T$2:00:00+0000"; }
mkdir -p src web docs

# 1
tag 02 09:00
cat > src/Messwert.cs <<'X'
namespace Wetterstation;

public record Messwert(string Sensor, double Wert, string Einheit)
{
    public string Anzeige()
    {
        return Sensor + ": " + Wert + " " + Einheit;
    }
}
X
cat > src/Sensor.cs <<'X'
namespace Wetterstation;

public class Sensor
{
    private readonly string name;
    private readonly Func<double> lesen;

    public Sensor(string name, Func<double> lesen)
    {
        this.name = name;
        this.lesen = lesen;
    }

    public Messwert Messen()
    {
        var wert = lesen();
        return new Messwert(name, wert, "°C");
    }
}
X
cat > src/Kalibrierung.cs <<'X'
namespace Wetterstation;

public static class Kalibrierung
{
    // Alter Korrekturwert aus dem ersten Aufbau.
    public const double Verschiebung = 0.4;

    public static double Anwenden(double roh)
    {
        return roh - Verschiebung;
    }
}
X
cat > web/anzeige.js <<'X'
const liste = document.querySelector("#messwerte");

function zeige(messwerte) {
  liste.innerHTML = "";
  for (const m of messwerte) {
    const zeile = document.createElement("li");
    zeile.textContent = m.sensor + ": " + m.wert + " " + m.einheit;
    liste.appendChild(zeile);
  }
}

fetch("/api/messwerte").then(r => r.json()).then(zeige);
X
cat > docs/hinweise.txt <<'X'
Wetterstation - Hinweise zum Betrieb

Der Sensor wird alle zehn Sekunden gelesen.
Die Anzeige aktualisiert sich selbst.
Bei einem Ausfall zeigt die Liste den letzten Wert.
X
git add -A; git commit -q -m "Wetterstation anlegen"

# 2
tag 03 10:30
cat > web/anzeige.js <<'X'
const liste = document.querySelector("#messwerte");
const status = document.querySelector("#status");

function zeige(messwerte) {
  liste.innerHTML = "";
  for (const m of messwerte) {
    const zeile = document.createElement("li");
    zeile.textContent = m.sensor + ": " + m.wert + " " + m.einheit;
    liste.appendChild(zeile);
  }
  status.textContent = messwerte.length + " Messwerte";
}

async function laden() {
  const antwort = await fetch("/api/messwerte");
  zeige(await antwort.json());
}

laden();
setInterval(laden, 10000);
X
git add -A; git commit -q -m "Anzeige aktualisiert sich alle zehn Sekunden"

# 3
tag 04 14:15
cat > src/Messwert.cs <<'X'
namespace Wetterstation;

public record Messwert(string Sensor, double Wert, string Einheit)
{
    public string Anzeige()
    {
        var gerundet = Math.Round(Wert, 1);
        return $"{Sensor}: {gerundet} {Einheit}";
    }

    public bool IstFrost()
    {
        return Einheit == "°C" && Wert < 0;
    }
}
X
git add -A; git commit -q -m "Messwerte runden und Frost erkennen" -m "Die Anzeige rundet auf eine Stelle. IstFrost() gilt nur für °C und Werte unter null."

# 4
tag 05 08:45
git mv docs/hinweise.txt docs/betrieb.txt
cat > docs/betrieb.txt <<'X'
Wetterstation - Hinweise zum Betrieb

Der Sensor wird alle zehn Sekunden gelesen.
Die Anzeige aktualisiert sich selbst.
Bei einem Ausfall zeigt die Liste den letzten Wert.
Frost wird in der Liste gekennzeichnet.
X
git add -A; git commit -q -m "Hinweise in betrieb.txt umbenennen"

# 5
tag 06 16:00
git rm -q src/Kalibrierung.cs
git commit -q -m "Alten Kalibrierwert entfernen"

# 6
tag 09 11:20
cat > src/Sensor.cs <<'X'
namespace Wetterstation;

public class Sensor
{
	private readonly string name;
	private readonly Func<double> lesen;
	private readonly string einheit;

	public Sensor(string name, Func<double> lesen, string einheit = "°C")
	{
		this.name = name;
		this.lesen = lesen;
		this.einheit = einheit;
	}

	public Messwert Messen()
	{
		var wert = lesen();
		return new Messwert(name, wert, einheit);
	}
}
X
git add -A; git commit -q -m "Sensor kennt seine Einheit"
git log --format='%h %s'
```

Aufruf: `bash baue-repo.sh <arbeit>/wetterstation`. Erwartete Hashes (neueste zuerst):

| Hash | Commit |
|---|---|
| `c13e91a4e52f7f3e7bba3f9b9bce0b37a46b186d` | Sensor kennt seine Einheit |
| `74e3438e8ef3b48dab34fb582aeed7307d8bb655` | Alten Kalibrierwert entfernen |
| `a23713d3908f51db91dd9a70174ee01590f1eead` | Hinweise in betrieb.txt umbenennen |
| `d8cacccb4cf4022bb92093dbe13004f8da0b78b3` | Messwerte runden und Frost erkennen |
| `eb842340d24c9640344f659ba231ddf999a2fde0` | Anzeige aktualisiert sich alle zehn Sekunden |
| `ab1e5d228d87c00a5a8dc9791b303f5fcbec538d` | Wetterstation anlegen |

Prüfen: `git -C <arbeit>/wetterstation log --format=%H` muss genau diese Liste ausgeben. Weichen die Hashes ab, stimmen Bilder und Ergebnis-Beispiel nicht mehr zusammen.

## 2. Die SQL-Dateien für die Dateiansicht anlegen

Die Dateiansicht (`--dateien`) zeigt Dateien vom Datenträger. Dafür liegen zwei erfundene SQL-Dateien im Ordner `<arbeit>/datenbank/`, **nicht** im Repository `wetterstation`.

**Wichtig**: Der Kopf der Dateiansicht zeigt den **absoluten Pfad** der Datei. Arbeiten Sie deshalb in einem Ordner mit neutralem Pfad (im Lauf: `/tmp/beispiel/`), nie unter einem Benutzerordner. Das Repository `wetterstation` gehört für den Aufruf mit `<commit>:<pfad>` in denselben Ordner.

`<arbeit>/datenbank/schema.sql`:

```sql
-- Wetterstation: Tabellen für Sensoren und Messwerte
CREATE TABLE sensor (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    einheit   TEXT NOT NULL DEFAULT '°C'
);

CREATE TABLE messwert (
    id          INTEGER PRIMARY KEY,
    sensor_id   INTEGER NOT NULL REFERENCES sensor (id),
    gemessen_am TEXT NOT NULL,
    wert        REAL NOT NULL
);

CREATE INDEX ix_messwert_sensor_zeit
    ON messwert (sensor_id, gemessen_am);
```

`<arbeit>/datenbank/auswertung.sql`:

```sql
-- Wetterstation: Tagesauswertung je Sensor
SELECT s.name,
       date(m.gemessen_am)  AS tag,
       round(avg(m.wert), 1) AS mittel,
       min(m.wert)          AS tiefster,
       max(m.wert)          AS hoechster
  FROM messwert AS m
  JOIN sensor   AS s ON s.id = m.sensor_id
 WHERE m.gemessen_am >= date('now', '-7 days')
 GROUP BY s.name, date(m.gemessen_am)
 ORDER BY tag DESC, s.name;

-- Frosttage der letzten 30 Tage
SELECT date(gemessen_am) AS tag, min(wert) AS tiefster
  FROM messwert
 WHERE wert < 0
 GROUP BY date(gemessen_am);
```

## 3. Das Programm starten

Freien Port bestimmen und das Programm starten, stdout und stderr in Dateien. Für die Bilder 01 bis 07 im Beispiel-Repository:

```bash
P=$(python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1])")
cd <arbeit>/wetterstation
dotnet <pfad>/gitreviewA.dll HEAD~5..HEAD --kein-browser --port $P > ../ergebnis.out 2> ../ergebnis.err &
echo $! > ../pid
```

`../ergebnis.err` muss `INFO [Start] gitreviewA läuft auf http://127.0.0.1:<Port>/` zeigen. Der Aufruf `HEAD~5..HEAD` wählt die fünf neuesten Commits (alle außer „Wetterstation anlegen“).

Für Bild 08 (Dateiansicht) eine zweite Instanz auf einem anderen freien Port, im Ordner `<arbeit>` (nicht im Repository):

```bash
cd <arbeit>
dotnet <pfad>/gitreviewA.dll --dateien datenbank/schema.sql datenbank/auswertung.sql --kein-browser --port $P2 > da.out 2> da.err &
echo $! > pid2
```

## 4. Die Bilder aufnehmen

Fenster **1280 × 800**, Hell-Darstellung, kein Mauszeiger, keine Entwicklerwerkzeuge. Alle Zustände werden über die Oberfläche hergestellt (klicken, tippen), nicht im Browser verändert. Playwright-MCP: `browser_resize` auf 1280 × 800, `browser_navigate` auf `http://127.0.0.1:<Port>/`, Bilder mit `browser_take_screenshot` (PNG, Viewport, Dateiname im eigenen Ablageordner). Umschalt-Klick: `browser_click` mit `modifiers: ["Shift"]`. Einen Zeilentext wählen Sie über die Zelle, zum Beispiel `getByRole('cell', { name: /hinzugefügt: return \$/ })`.

Die Schritte bauen aufeinander auf; die Reihenfolge einhalten. Bei jeder Anmerkung zuerst die **Art** (Radiogruppe über dem Feld: **ohne**, **Muss**, **Frage**, **Idee**) wählen, dann den Text eintippen, dann **Speichern**.

| Bild | Schritte | Zustand im Bild |
|---|---|---|
| `01-zusammen.png` | **Zusammen** ist beim Start gewählt. Datei `src/Messwert.cs` in der Liste anklicken. Bild aufnehmen. | links Seitenleiste mit den fünf Dateien in den Gruppen **Code** und **Doku**, in der Mitte der Diff von `src/Messwert.cs` mit dem Block über dem Diff (Commit `d8caccc`), rechts die Ergebnis-Spalte mit **Keine Anmerkungen.**, im Kopf **0 von 5 Dateien abgehakt** |
| `02-zeile-annotieren.png` | In `src/Messwert.cs` die Zeile `return $"{Sensor}: {gerundet} {Einheit}";` (Nummer neu 8) anklicken. Art **Muss**, Text `Rundung auf eine Stelle: Soll der Rohwert für die Anzeige unverändert bleiben? Bitte Test für -0,04 ergänzen.`, **Speichern**. Bild aufnehmen. | Anmerkung 1 mit der Art **Muss** unter Zeile 8; rechts erscheint sie im Ergebnis mit `[Muss]` |
| (Vorbereitung) | `src/Sensor.cs` wählen. Zeile `var wert = lesen();` (Nummer neu 18) anklicken, mit gedrückter Umschalttaste `return new Messwert(name, wert, einheit);` (Nummer neu 19) anklicken. Art **Frage**, Text `Die Einheit steht jetzt im Sensor. Wird sie irgendwo noch fest als °C angenommen?`, **Speichern**. | Bereichsanmerkung `src/Sensor.cs:18-19` (Anmerkung 2) |
| (Vorbereitung) | `web/anzeige.js` wählen, **Datei anmerken**, Art **Idee**, Text `Bei einem Ausfall des Servers bleibt der Zähler stehen. Eine Fehlermeldung in der Liste wäre hilfreich.`, **Speichern**. | Dateianmerkung (Anmerkung 3) |
| `03-abhaken.png` | Die Kästchen vor `docs/betrieb.txt`, `src/Kalibrierung.cs` und `src/Messwert.cs` setzen. `web/anzeige.js` ist gewählt. Bild aufnehmen. | drei Haken, **3 von 5 Dateien abgehakt**, Dateianmerkung über dem Diff |
| `06-arbeitsplatz.png` | `src/Messwert.cs` wählen, im Block über dem Diff **Nachricht** wählen. Bild aufnehmen. | alle drei Bereiche: Seitenleiste, Diff mit aufgeklappter Nachricht des Commits, Ergebnis-Spalte mit den drei Anmerkungen |
| `04-nebeneinander.png` | `src/Sensor.cs` wählen. **Ansicht ▾** öffnen und **nebeneinander** wählen, **Ansicht ▾** erneut öffnen und **Leerraum ignorieren** wählen, dann **Ergebnis-Spalte einklappen** wählen (mehr Platz für den Diff). Bild aufnehmen. | zweispaltiger Diff mit Bereichsanmerkung 18–19; die Einrückungsänderung ist ausgeblendet; die Ergebnis-Spalte ist ein schmaler Streifen |
| `05-tastaturhilfe.png` | **Kürzel** im Kopf anklicken. Bild aufnehmen. Danach den Dialog mit **Kürzel schließen** (×) schließen. | Dialog **Tastaturkürzel** über der Oberfläche |
| `07-dateisuche.png` | **Ergebnis-Spalte ausklappen** wählen. Im Feld **Dateien suchen** `*.cs` eintippen. Bild aufnehmen. | Liste nur mit den drei `.cs`-Dateien, im Kopf **2 ausgeblendet, davon 2 Suche** |
| `08-dateiansicht.png` | Zweite Instanz (`--dateien`) öffnen. Datei `datenbank/auswertung.sql` in der Liste anklicken. Auf die Zeilennummer 2 klicken, mit gedrückter Umschalttaste auf die Nummer 10. Im Feld **Suchen** `messwert` eintippen und Enter drücken. Bild aufnehmen. | Kopf mit Dateiname und Pfad `/tmp/beispiel/datenbank/auswertung.sql`, Zeilen 2–10 markiert, **1 von 2** Treffer, **Bereich kopieren** aktiv |

Nicht aufgenommen ist ein Bild vom Beenden: Die Interaction „Beenden und Abbrechen im Kopf“ (I0028) ist nicht gebaut. **Beenden** beendet heute sofort, ohne Rückfrage.

Danach Bildgröße prüfen (jede Datei höchstens etwa 300 KB, 1280 × 800) und die Bilder nach `Dokumentation/Bilder/readme/` kopieren.

## 5. Das Ergebnis für die README holen

Im selben Lauf wie die Bilder 01–07 **Beenden** wählen (der Prozess endet mit Exit 0). Das Ergebnis steht in `<arbeit>/ergebnis.out` und kommt **unverändert** in den Codeblock der README. Die Hashes darin müssen denen der Tabelle oben entsprechen. Dateien mit Tabulatoren (`src/Sensor.cs`) liefern Tabulatoren im Zitat; sie bleiben erhalten.

Kontrolle: `Anmerkungen: 3`, Anmerkung 1 `src/Messwert.cs:8` mit Commit `d8cacccb…` und `[Muss]`, Anmerkung 2 `src/Sensor.cs:18-19` mit Commit `c13e91a4…` und `[Frage]`, Anmerkung 3 `web/anzeige.js (ganze Datei)` mit Commit `eb842340…` und `[Idee]`, `Abgehakt: 3 von 5`, `Ungeprüft: 2 von 5`.

In der Dateiansicht schließt **Schließen** den Lauf: stdout bleibt leer, Exit 0.

## 6. Aufräumen

- Beide Prozesse beenden, falls sie noch laufen: `kill $(cat <arbeit>/pid)`, `kill $(cat <arbeit>/pid2)` (nur diese PIDs).
- `<arbeit>` löschen, ebenso `.playwright-mcp/` im Arbeitsverzeichnis des Browser-Werkzeugs.
- Im Repository von gitreviewA darf nur `Dokumentation/Bilder/readme/` und `README.md` geändert sein: `git status --short`.

## Beachten

- Kein Inhalt aus gitreviewA selbst ins Bild (keine eigenen Pfade oder Dateinamen). Das Beispiel-Repository ist erfunden; Pfade des Arbeitsrechners erscheinen in den Bildern nicht — der `vscode://`-Link trägt sie nur als Verweisziel, und die Dateiansicht zeigt den Pfad des neutralen Ordners (siehe Abschnitt 2).
- Keine Markierungen ins Pixelbild malen; was zu sehen ist, sagt der Text in der README.
- Ändert sich die Oberfläche, die Bilder und diese Tabelle gemeinsam nachziehen (Bilder 01–07 teilen sich denselben Lauf).
