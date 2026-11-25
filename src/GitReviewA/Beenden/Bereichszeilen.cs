using System.Text;
using GitReviewA.Diff;
using GitReviewA.Fremdtext;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Protokoll;

namespace GitReviewA.Beenden;

internal enum Bereichszeilenausgang
{
    Gelesen,
    NichtLesbar,
    UeberDerGrenze,
    HinterDemDateiende,
}

/// <summary>Die Zeilen `von..bis` als Text oder der Grund, warum es kein Zitat gibt (R00031).</summary>
internal sealed record Bereichszeilenlesung(Bereichszeilenausgang Ausgang, string[] Zeilen, string Grund)
{
    public bool IstLesbar => Ausgang == Bereichszeilenausgang.Gelesen;
}

/// <summary>Alle Zeilen einer Datei im Stand eines Commits (Nummer neu) oder der Grund, warum es kein Zitat gibt (R00031).</summary>
internal sealed record Bereichsdateilesung(string[]? Zeilen, Bereichszeilenausgang Ausgang, string Grund);

/// <summary>
/// Der neue Lesepfad für das Zitat der markierten Zeilen (R00031, B3007): über <see cref="GitStart"/> mit allen Schutzoptionen,
/// mit **Ausgabegrenze** und **Namensprüfung** an der Aufrufstelle (Lehre #10). Der Name geht immer über stdin
/// (`git cat-file --batch`) — ein Name aus fremden Bytes darf nie Argument werden; ein Name mit LF oder CR wird vor dem Aufruf
/// abgewiesen, weil git dort an LF trennt und daraus ein anderer Pfad würde (AI-Team/gelerntes.md #16/#28). Je (Commit, Datei)
/// höchstens einmal liest der Aufrufer. Unsichtbares im fremden Text erscheint als Marke; Textzeilenenden werden zu LF.
/// </summary>
internal sealed class Bereichszeilen(GemerkteUebersicht uebersicht, string arbeitsordner, Ausgabegrenze grenze, StderrProtokoll protokoll)
{
    private const string Kontext = "Bereich";
    private const string UebersichtNichtLesbar = "Diff nicht lesbar: Übersicht der Dateien ließ sich nicht lesen";
    private const string DateiNichtGefunden = "Diff nicht lesbar: Datei nicht gefunden";
    private const string UeberDerGrenze = "Diff nicht lesbar: über der Ausgabegrenze";
    private const string HinterDemDateiende = "Bereich liegt hinter dem Dateiende";

    /// <summary>Der Bereich `von..bis` (Nummer neu) einer Datei; prüft das Dateiende und meldet den Ausgang auf stderr.</summary>
    public Bereichszeilenlesung Lies(string commit, string datei, int von, int bis)
    {
        var bereich = LiesAus(LiesDatei(commit, datei), von, bis);
        if (bereich.Ausgang == Bereichszeilenausgang.HinterDemDateiende)
        {
            Melde(Protokollstufe.Warnung, commit, datei, HinterDemDateiende);
        }
        return bereich;
    }

    /// <summary>
    /// Alle Zeilen einer Datei im Stand des Commits (Nummer neu) — der eine Lesevorgang je (Commit, Datei), den mehrere Bereiche
    /// derselben Stelle teilen. Der Ausgang steht auf stderr.
    /// </summary>
    public Bereichsdateilesung LiesDatei(string commit, string datei)
    {
        var suche = SucheDatei(commit, datei);
        if (suche.Datei is null)
        {
            return NichtLesbar(commit, datei, suche.Grund);
        }
        if (Namenspruefung.TraegtZeilenende(suche.Datei))
        {
            return NichtLesbar(commit, datei, Sperrgruende.NameNichtUebergebbar);
        }
        var gelesen = LiesZeilen(commit, suche.Datei);
        if (gelesen.Zeilen is null)
        {
            return NichtLesbar(commit, datei, gelesen.Grund, gelesen.Ausgang);
        }
        Melde(Protokollstufe.Debug, commit, datei, $"gelesen ({gelesen.Zeilen.Length} Zeilen)");
        return gelesen;
    }

    /// <summary>Schneidet `von..bis` aus einer gelesenen Datei; rein, ohne git und ohne Protokoll (für den Zitat-Weg).</summary>
    public static Bereichszeilenlesung LiesAus(Bereichsdateilesung dateiinhalt, int von, int bis)
    {
        if (dateiinhalt.Zeilen is null)
        {
            return new Bereichszeilenlesung(dateiinhalt.Ausgang, [], dateiinhalt.Grund);
        }
        var liegtAusserhalb = von < 1 || bis > dateiinhalt.Zeilen.Length;
        if (liegtAusserhalb)
        {
            return new Bereichszeilenlesung(Bereichszeilenausgang.HinterDemDateiende, [], HinterDemDateiende);
        }
        return new Bereichszeilenlesung(Bereichszeilenausgang.Gelesen, dateiinhalt.Zeilen[(von - 1)..bis], string.Empty);
    }

    /// <summary>Der Bereich aus dem Blob des Commits (Nummer neu): Zeilenenden zu LF, Unsichtbares als Marke, nie still gekürzt.</summary>
    private Bereichsdateilesung LiesZeilen(string commit, Dateiaenderung datei)
    {
        Blobinhalt inhalt;
        try
        {
            var rohname = datei.Rohpfad ?? new Rohname(Encoding.UTF8.GetBytes(datei.Pfad));
            inhalt = GitLeser.BlobLesen(commit, datei.Pfad, rohname, arbeitsordner, grenze);
        }
        catch (GitFehler fehler)
        {
            return new Bereichsdateilesung(null, Bereichszeilenausgang.NichtLesbar, $"Diff nicht lesbar: {fehler.Message}");
        }
        if (inhalt.UeberschritteneGrenze is not null)
        {
            return new Bereichsdateilesung(null, Bereichszeilenausgang.UeberDerGrenze, UeberDerGrenze);
        }
        var zeilen = ZerlegeZeilen(FremdeBytes.Utf8MitBytemarken.GetString(inhalt.Bytes));
        return new Bereichsdateilesung(zeilen, Bereichszeilenausgang.Gelesen, string.Empty);
    }

    private Dateisuche SucheDatei(string commit, string datei)
    {
        Dateiuebersicht gelesen;
        try
        {
            gelesen = uebersicht.Lesen();
        }
        catch (GitFehler fehler)
        {
            protokoll.Melde(Protokollstufe.Fehler, Kontext, $"Übersicht nicht lesbar, kein Zitat: {fehler.Message}");
            return new Dateisuche(null, UebersichtNichtLesbar);
        }
        var treffer = Namenspruefung.Pruefe(gelesen.DateienDesCommits(commit), datei);
        return treffer.Fall switch
        {
            Namensfall.Lesbar => new Dateisuche(treffer.Datei, string.Empty),
            Namensfall.NichtGefunden => new Dateisuche(null, DateiNichtGefunden),
            _ => new Dateisuche(null, Sperrgruende.Aus(treffer.Fall)),
        };
    }

    /// <summary>
    /// Zerlegt in Zeilen: `\r\n` und `\r` werden zu LF, das abschließende LF ergibt keine eigene Zeile. Der Text bleibt sonst roh
    /// (nur ungültige Bytes tragen aus der Dekodierung eine Marke); Unsichtbares markiert der Ausgaberand
    /// (<see cref="ErgebnisFormatierer"/>) — dieselbe eine Zeichenliste.
    /// </summary>
    private static string[] ZerlegeZeilen(string text)
    {
        var mitLf = text.Replace("\r\n", "\n").Replace('\r', '\n');
        if (mitLf.Length == 0)
        {
            return [];
        }
        var roh = mitLf.Split('\n');
        var endetMitZeilenende = roh[^1].Length == 0;
        return endetMitZeilenende ? roh[..^1] : roh;
    }

    private Bereichsdateilesung NichtLesbar(string commit, string datei, string grund, Bereichszeilenausgang ausgang = Bereichszeilenausgang.NichtLesbar)
    {
        Melde(Protokollstufe.Warnung, commit, datei, grund);
        return new Bereichsdateilesung(null, ausgang, grund);
    }

    /// <summary>Der Ausgang steht auf stderr; der Name mit Marken, nie roh.</summary>
    private void Melde(Protokollstufe stufe, string commit, string datei, string ausgangstext)
    {
        var name = UnsichtbareZeichen.AlsMarken(datei);
        var kurz = commit.Length > 7 ? commit[..7] : commit;
        protokoll.Melde(stufe, Kontext, $"{name} in {kurz}: {ausgangstext}");
    }

    private sealed record Dateisuche(Dateiaenderung? Datei, string Grund);
}
