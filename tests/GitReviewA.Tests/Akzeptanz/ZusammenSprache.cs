using GitReviewA.Anmerkungen;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;


namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Testsprache „Zusammen-Ansicht“ (R00015): Commits heißen wie in der User Story (`z1`, `z2`, `z3`), Dateien wie in der Netto-Liste.
/// Darunter der Treiber, der Liste, Diff und Stapel-Haken in-process gegen echtes git ruft.
/// </summary>
internal sealed class ZusammenSprache
{
    private readonly ZusammenTreiber treiber;
    private readonly Dictionary<string, string> hashNachName;
    private readonly Dictionary<string, string> nameNachHash;

    private ZusammenSprache(ZusammenTreiber treiber, Func<string, string> hash, string[] commits)
    {
        this.treiber = treiber;
        hashNachName = commits.ToDictionary(commit => commit, hash);
        nameNachHash = commits.ToDictionary(hash, commit => commit);
    }

    /// <summary>`gitreviewA <commits…>` in der Wurzel des Repos.</summary>
    public static ZusammenSprache Aufruf(string ordner, Func<string, string> hash, params string[] commits)
    {
        return new ZusammenSprache(ZusammenTreiber.Starten(ordner, commits.Select(hash)), hash, commits);
    }

    /// <summary>Wie <see cref="Aufruf"/>, aber mit einer kleinen Ausgabegrenze für die Grenzprobe (Muster R00017).</summary>
    public static ZusammenSprache AufrufMitAusgabegrenze(string ordner, Func<string, string> hash, Ausgabegrenze grenze, params string[] commits)
    {
        return new ZusammenSprache(ZusammenTreiber.Starten(ordner, commits.Select(hash), grenze), hash, commits);
    }

    /// <summary>Wie <see cref="Aufruf"/>, aber die Übersicht der Dateien lässt sich nicht lesen.</summary>
    public static ZusammenSprache AufrufMitUnlesbarerUebersicht(string ordner, Func<string, string> hash, params string[] commits)
    {
        return new ZusammenSprache(ZusammenTreiber.MitUnlesbarerUebersicht(ordner, commits.Select(hash)), hash, commits);
    }

    public bool Lueckenlos()
    {
        return treiber.Stand().Lueckenlos;
    }

    public string Basis()
    {
        return treiber.Stand().Basis;
    }

    public string Beschriftung()
    {
        return treiber.Stand().Dateien.Beschriftung;
    }

    /// <summary>Die Netto-Liste als „Pfad|Status|+|−|zuständiger Commitname“ in ihrer Reihenfolge.</summary>
    public string[] Dateien()
    {
        return treiber.Stand().Dateien.AlsArray().Select(datei =>
            $"{datei.Anzeigepfad}|{datei.Datei.Status}|{datei.Datei.Plus}|{datei.Datei.Minus}|{Name(datei.ZustaendigerCommit)}").ToArray();
    }

    /// <summary>Die Stellen der Datei als „Commitname:Pfad“ in ihrer Reihenfolge.</summary>
    public string[] Stellen(string pfad)
    {
        return Blatt(pfad).Stellen.Select(stelle => $"{Name(stelle.Commit)}:{stelle.Datei.Pfad}").ToArray();
    }

    public Diffbild Diff(string pfad, Diffumfang umfang = Diffumfang.Aenderungen)
    {
        var ergebnis = treiber.Diff(pfad, umfang);
        var meldung = "";
        if (ergebnis.Meldung is not null)
        {
            meldung = ergebnis.Meldung;
        }
        var antwort = ergebnis.Antwort;
        if (antwort is null)
        {
            return new Diffbild(AusgangAlsWort(ergebnis.Ausgang), false, "", null, [], [], [], meldung);
        }
        var abschnitte = antwort.Abschnitte
            .Select(abschnitt => new Abschnittbild(Name(abschnitt.Commit), abschnitt.Art, Zeilen(abschnitt.Patch)))
            .ToArray();
        var zeilen = Zeilen(antwort.Patch ?? string.Join("\n", antwort.Abschnitte.Select(abschnitt => abschnitt.Patch)));
        return new Diffbild("gelesen", antwort.Netto, antwort.Art, antwort.Grund, antwort.Commits.Select(Name).ToArray(), abschnitte, zeilen, meldung);
    }

    /// <summary>Eine einzelne Stelle abhaken („Einzeln“), Commitname aus der Story.</summary>
    public (string Ausgang, int Gesetzt, int Gesamt, string Grund) Hake(string commit, string pfad, bool abgehakt)
    {
        var ergebnis = treiber.Hake(hashNachName[commit], pfad, abgehakt);
        return (AusgangAlsWort(ergebnis.Ausgang), ergebnis.Abgehakt, ergebnis.Gesamt, ergebnis.Grund);
    }

    /// <summary>Der Stapel-Haken über die Datei der Netto-Liste („eine“ Anfrage).</summary>
    public (string Ausgang, int Gesetzt, int Gesamt, string Grund) HakeDatei(string pfad, bool abgehakt)
    {
        var ergebnis = treiber.Hake(null, pfad, abgehakt);
        return (AusgangAlsWort(ergebnis.Ausgang), ergebnis.Abgehakt, ergebnis.Gesamt, ergebnis.Grund);
    }

    /// <summary>„n von m abgehakt“ aus dem gelesenen Stand.</summary>
    public string Fortschritt()
    {
        var stand = treiber.Hakenstand();
        return $"{stand.Dateien.Abgehakt} von {stand.Dateien.Gesamt} abgehakt";
    }

    public (string Ausgang, int? Nummer, string Grund) Annotiere(string commit, string pfad, int zeile)
    {
        var ergebnis = treiber.Annotiere(hashNachName[commit], pfad, zeile);
        return ergebnis.Ausgang switch
        {
            Annotierenausgang.Angelegt => ("angelegt", ergebnis.Angelegt!.Nummer, ""),
            Annotierenausgang.Ungueltig => ("ungültig", null, ergebnis.Grund),
            _ => ("beendet", null, ergebnis.Grund),
        };
    }

    public string Beenden()
    {
        return treiber.Beenden();
    }

    public int NettoLesevorgaenge => treiber.NettoLesevorgaenge;

    public int NettoDiffLesevorgaenge => treiber.NettoDiffLesevorgaenge;

    public string[] Protokollzeilen()
    {
        return treiber.Protokollzeilen();
    }

    private NettoDatei Blatt(string pfad)
    {
        return treiber.Stand().Dateien.MitAnzeigepfad(pfad).Single();
    }

    private string Name(string hash)
    {
        return nameNachHash.TryGetValue(hash, out var name) ? name : hash;
    }

    private static string[] Zeilen(string patch)
    {
        return patch.Split('\n').Where(zeile => zeile.StartsWith('+') || zeile.StartsWith('-')).ToArray();
    }

    private static string AusgangAlsWort(ZusammenDiffausgang ausgang)
    {
        return ausgang switch
        {
            ZusammenDiffausgang.Gelesen => "gelesen",
            ZusammenDiffausgang.ZuGross => "zu groß",
            ZusammenDiffausgang.NichtGefunden => "nicht gefunden",
            ZusammenDiffausgang.NameNichtLesbar => "name nicht lesbar",
            _ => "nicht lesbar",
        };
    }

    private static string AusgangAlsWort(Hakenausgang ausgang)
    {
        return ausgang switch
        {
            Hakenausgang.Gesetzt => "gesetzt",
            Hakenausgang.Ungueltig => "ungültig",
            Hakenausgang.Beendet => "beendet",
            _ => "nicht lesbar",
        };
    }
}

/// <summary>Die Antwort des Zusammen-Diffs in Testwörtern: Ausgang, Kennzeichen „netto“, Art, Grund, Commits, Abschnitte, +/-Zeilen und bei „zu groß“ die Meldung.</summary>
internal sealed record Diffbild(string Ausgang, bool Netto, string Art, string? Grund, string[] Commits, Abschnittbild[] Abschnitte, string[] Zeilen, string Meldung)
{
    public int Hinzugefuegt => Zeilen.Count(zeile => zeile.StartsWith('+'));

    public int Entfernt => Zeilen.Count(zeile => zeile.StartsWith('-'));
}

internal sealed record Abschnittbild(string Commit, string Art, string[] Zeilen)
{
    public int Hinzugefuegt => Zeilen.Count(zeile => zeile.StartsWith('+'));

    public int Entfernt => Zeilen.Count(zeile => zeile.StartsWith('-'));
}
