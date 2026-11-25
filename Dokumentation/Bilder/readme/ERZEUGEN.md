# Die Bilder der README erzeugen

Die Bilder unter `Dokumentation/Bilder/readme/` zeigen das echte Programm in einem **erfundenen** Beispiel-Repository „Wetterstation“. Diese Anleitung stellt dieselben Bilder nach einer Änderung der Oberfläche wieder her. Das Ergebnis im Terminal (README, Abschnitt „Erste Review in zwei Minuten“) ist kein Bild, sondern die unveränderte stdout-Ausgabe desselben Laufs.

Letzter Lauf: 2026-11-25, Stand von `main` mit I0032 (Zeilenbereich), I0033 (Umbruch an), I0034 (Seitenleiste bleibt stehen).

## Voraussetzungen

- gebautes Programm: `dotnet build gitreviewA.sln -warnaserror --artifacts-path <build-ziel>`; die DLL liegt dann unter `<build-ziel>/bin/GitReviewA/debug/gitreviewA.dll` (ohne `--artifacts-path`: `src/GitReviewA/bin/Debug/net10.0/gitreviewA.dll`)
- `git`, `bash`, `python3`, ein Browser mit Playwright (Playwright-MCP oder eigenes Skript), **headless**
- ein leerer Arbeitsordner **außerhalb** dieses Repositories, im Folgenden `<arbeit>`

## 1. Das Wegwerf-Repository anlegen

Das Skript legt sechs Commits an. Autor ist `Alex Beispiel <alex@example.org>`, Autor- und Commit-Zeit sind fest (`+0000`), deshalb sind die Hashes bei jedem Lauf gleich. Die globale und die System-Konfiguration von git bleiben außen vor.

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
git add -A; git commit -q -m "Messwerte runden und Frost erkennen"

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
| `0160cae50b3f566f5af420b64273c53236d6e7bf` | Sensor kennt seine Einheit |
| `27d6ef5ebafd4abb5baac521ef8f1d985f3dbf72` | Alten Kalibrierwert entfernen |
| `2c56ed5a78b23ead8c29e96b88e1c3a3a39e9926` | Hinweise in betrieb.txt umbenennen |
| `3f8bdc2391cfb2b0fb392c7c1aad546c4dfe2e4a` | Messwerte runden und Frost erkennen |
| `eb842340d24c9640344f659ba231ddf999a2fde0` | Anzeige aktualisiert sich alle zehn Sekunden |
| `ab1e5d228d87c00a5a8dc9791b303f5fcbec538d` | Wetterstation anlegen |

Prüfen: `git -C <arbeit>/wetterstation log --format=%H` muss genau diese Liste ausgeben. Weichen die Hashes ab, stimmen Bilder und Ergebnis-Beispiel nicht mehr zusammen.

## 2. Das Programm starten

Freien Port bestimmen und das Programm im Beispiel-Repository starten, stdout und stderr in Dateien:

```bash
P=$(python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1])")
cd <arbeit>/wetterstation
dotnet <pfad>/gitreviewA.dll HEAD~5..HEAD --kein-browser --port $P > ../ergebnis.out 2> ../ergebnis.err &
echo $! > ../pid
```

`../ergebnis.err` muss `INFO [Start] gitreviewA läuft auf http://127.0.0.1:<Port>/` zeigen. Der Aufruf `HEAD~5..HEAD` wählt die fünf neuesten Commits (alle außer „Wetterstation anlegen“).

## 3. Die Bilder aufnehmen

Fenster **1280 × 800**, Hell-Darstellung, kein Mauszeiger, keine Entwicklerwerkzeuge. Alle Zustände werden über die Oberfläche hergestellt (klicken, tippen), nicht im Browser verändert. Playwright-MCP: `browser_resize` auf 1280 × 800, `browser_navigate` auf `http://127.0.0.1:<Port>/`, Bilder mit `browser_take_screenshot` (PNG, Viewport).

Die Schritte bauen aufeinander auf; die Reihenfolge einhalten.

| Bild | Schritte | Zustand im Bild |
|---|---|---|
| `01-zusammen.png` | **Zusammen** ist beim Start gewählt. Datei `src/Messwert.cs` in der Liste anklicken. Bild aufnehmen. | links die fünf Dateien, rechts der Diff von `src/Messwert.cs`, Commits als zugeklappte Zeile, Fortschritt **0 von 5 Dateien abgehakt** |
| `02-zeile-annotieren.png` | In `src/Messwert.cs` die Zeile `return $"{Sensor}: {gerundet} {Einheit}";` (Nummer neu 8) anklicken. Im Feld eintippen: `Rundung auf eine Stelle: Soll der Rohwert für die Anzeige unverändert bleiben? Bitte Test für -0,04 ergänzen.` **Speichern** wählen. Bild aufnehmen. | Anmerkung 1 unter Zeile 8 |
| `05-tastaturhilfe.png` | **Kürzel** im Kopf anklicken. Bild aufnehmen. Danach den Dialog mit **×** schließen. | Dialog **Tastaturkürzel** über der Oberfläche |
| (Vorbereitung) | `src/Sensor.cs` wählen. Zeile `var wert = lesen();` (Nummer neu 18) anklicken, mit gedrückter Umschalttaste die Zeile `return new Messwert(name, wert, einheit);` (Nummer neu 19) anklicken. Eintippen: `Die Einheit steht jetzt im Sensor. Wird sie irgendwo noch fest als °C angenommen?` **Speichern**. | Bereichsanmerkung `src/Sensor.cs:18-19` (Anmerkung 2) |
| (Vorbereitung) | `web/anzeige.js` wählen, **Datei anmerken** wählen, eintippen: `Bei einem Ausfall des Servers bleibt der Zähler stehen. Bitte eine Fehlermeldung in der Liste zeigen.` **Speichern**. | Dateianmerkung (Anmerkung 3) |
| `03-abhaken.png` | Die Kästchen vor `docs/betrieb.txt`, `src/Kalibrierung.cs` und `src/Messwert.cs` setzen. `web/anzeige.js` ist gewählt. Bild aufnehmen. | drei Haken, Fortschritt **3 von 5 Dateien abgehakt**, Dateianmerkung über dem Diff |
| `04-nebeneinander.png` | **nebeneinander** wählen, `src/Sensor.cs` wählen, **Leerraum ignorieren** einschalten. Bild aufnehmen. | zweispaltiger Diff mit Bereichsanmerkung 18–19; die Einrückungsänderung ist ausgeblendet |

Nicht aufgenommen ist Bild 6 (Rückfrage vor **Beenden**): Die Interaction „Beenden und Abbrechen im Kopf“ (I0028) war beim Lauf noch nicht umgesetzt. Sobald sie grün ist, kommt `06-beenden.png` hinzu: nach Schritt `03-abhaken` **Beenden** wählen und die Rückfrage aufnehmen.

Danach Bildgröße prüfen (jede Datei höchstens etwa 300 KB, 1280 × 800) und die Bilder nach `Dokumentation/Bilder/readme/` kopieren.

## 4. Das Ergebnis für die README holen

Im selben Lauf **Beenden** wählen (der Prozess endet mit Exit 0). Das Ergebnis steht in `<arbeit>/ergebnis.out` und kommt **unverändert** in den Codeblock der README. Die Hashes darin müssen denen der Tabelle oben entsprechen. Dateien mit Tabulatoren (`src/Sensor.cs`) liefern Tabulatoren im Zitat; sie bleiben erhalten.

Kontrolle: `Anmerkungen: 3`, Anmerkung 1 `src/Messwert.cs:8` mit Commit `3f8bdc2…`, Anmerkung 2 `src/Sensor.cs:18-19` mit Commit `0160cae…`, Anmerkung 3 `web/anzeige.js (ganze Datei)` mit Commit `eb84234…`, `Abgehakt: 3 von 5`, `Ungeprüft: 2 von 5`.

## 5. Aufräumen

- Prozess beenden, falls er noch läuft: `kill $(cat <arbeit>/pid)` (nur diese PID).
- `<arbeit>` löschen, ebenso `.playwright-mcp/` im Arbeitsverzeichnis des Browser-Werkzeugs.
- Im Repository von gitreviewA darf nur `Dokumentation/Bilder/readme/` und `README.md` geändert sein: `git status --short`.

## Beachten

- Kein Inhalt aus gitreviewA selbst ins Bild (keine eigenen Pfade oder Dateinamen). Das Beispiel-Repository ist erfunden; Pfade des Arbeitsrechners erscheinen in den Bildern nicht (der `vscode://`-Link trägt sie nur als Verweisziel).
- Keine Markierungen ins Pixelbild malen; was zu sehen ist, sagt der Text in der README.
- Ändert sich die Oberfläche, die Bilder und diese Tabelle gemeinsam nachziehen (Bilder 01–05 teilen sich denselben Lauf).
