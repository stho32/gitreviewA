using GitReviewA.Git;

namespace GitReviewA.Sprung;

/// <summary>
/// Der Arbeitsbaum als Sprungquelle: Dateisystemzugriff hinter <see cref="ISprungquelle"/>. Beurteilt wird der **aufgelöste** Pfad —
/// jeder Bestandteil wird durch sein Endziel ersetzt, `.` und `..` gerechnet —, und erst das Ergebnis gegen die ebenso aufgelöste
/// Repositorywurzel geprüft: die letzte Komponente allein genügt nicht, ein Symlink im **Elternverzeichnis** führte den Link sonst aus
/// der Wurzel. Liegt der aufgelöste Pfad außerhalb, ist das <see cref="Sprungvorhandensein.VerlaesstWurzel"/> — auch wenn das Ziel
/// existiert; sonst zählt, ob es da ist. `File.Exists` allein genügt nicht: .NET meldet auch einen ins Leere zeigenden Symlink als vorhanden.
/// </summary>
internal sealed class GitSprungquelle : ISprungquelle
{
    /// <summary>Ab so vielen Verweisen in einem Pfad gilt die Verkettung als nicht auflösbar (wie das Betriebssystem, `MAXSYMLINKS`).</summary>
    private const int HoechstzahlVerweiseInEinemPfad = 40;

    private readonly Ausgabegrenze grenze;
    private readonly string aufgeloesteWurzel;

    public GitSprungquelle(string repositorywurzel) : this(repositorywurzel, Ausgabegrenze.Standard)
    {
    }

    public GitSprungquelle(string repositorywurzel, Ausgabegrenze grenze)
    {
        Repositorywurzel = repositorywurzel;
        this.grenze = grenze;
        aufgeloesteWurzel = AufgeloesteWurzel(repositorywurzel);
    }

    public string Repositorywurzel { get; }

    public bool IstGeaendertSeit(string hash, Dateiaenderung datei)
    {
        return GitLeser.ArbeitsbaumGeaendertLesen(hash, datei, Repositorywurzel, grenze);
    }

    public Sprungvorhandensein PruefeVorhandensein(string absoluterPfad)
    {
        var ziel = AufgeloesterPfad(absoluterPfad);
        if (ziel is null)
        {
            return Sprungvorhandensein.Fehlt;
        }
        var verlaesstDieWurzel = !LiegtInWurzel(ziel);
        if (verlaesstDieWurzel)
        {
            return Sprungvorhandensein.VerlaesstWurzel;
        }
        return DateiZustand(ziel);
    }

    private static Sprungvorhandensein DateiZustand(string pfad)
    {
        var istVorhanden = File.Exists(pfad);
        if (istVorhanden)
        {
            return Sprungvorhandensein.Vorhanden;
        }
        return Sprungvorhandensein.Fehlt;
    }

    /// <summary>
    /// Die Repositorywurzel ebenso aufgelöst wie jeder geprüfte Pfad: liegt die Wurzel selbst hinter Verweisen, sähe sonst jeder
    /// aufgelöste Pfad darin wie „außerhalb“ aus.
    /// </summary>
    private static string AufgeloesteWurzel(string repositorywurzel)
    {
        var aufgeloest = AufgeloesterPfad(repositorywurzel);
        if (aufgeloest is null)
        {
            aufgeloest = Path.GetFullPath(repositorywurzel);
        }
        return Path.TrimEndingDirectorySeparator(aufgeloest);
    }

    /// <summary>
    /// Der Pfad mit jedem Bestandteil aufgelöst: `Path.GetFullPath` rechnet `.` und `..`, jeder Bestandteil, der ein Verweis ist, wird
    /// durch sein (ebenso aufgelöstes) Ziel ersetzt — erst dieser Pfad ist der, auf den der Dateizugriff wirklich geht. `null` heißt
    /// „nicht auflösbar“ (unsyntaktischer Pfad oder Verkettung ohne Ende); ein solcher Pfad liegt nicht außerhalb der Wurzel.
    /// </summary>
    private static string? AufgeloesterPfad(string pfad)
    {
        try
        {
            return Aufloesen(Path.GetFullPath(pfad));
        }
        catch (Exception fehler) when (fehler is ArgumentException or IOException or NotSupportedException)
        {
            return null;
        }
    }

    private static string Aufloesen(string pfad)
    {
        var loesung = WurzelVon(pfad);
        var offen = new Queue<string>(BestandteileNachDerWurzel(pfad, loesung));
        var verweise = 0;
        while (offen.Count > 0)
        {
            var naechster = Path.Combine(loesung, offen.Dequeue());
            var ziel = Verweisziel(naechster);
            if (ziel is null)
            {
                loesung = naechster;
                continue;
            }
            verweise += 1;
            var verweiseSindOhneEnde = verweise > HoechstzahlVerweiseInEinemPfad;
            if (verweiseSindOhneEnde)
            {
                throw new IOException($"Verweise ohne Ende ab {pfad}");
            }
            var zielpfad = Zielpfad(ziel, loesung);
            loesung = WurzelVon(zielpfad);
            offen = new Queue<string>(BestandteileNachDerWurzel(zielpfad, loesung).Concat(offen));
        }
        return loesung;
    }

    /// <summary>Die Wurzel eines absoluten Pfades; ohne Wurzel leer (dann ist der Pfad nicht absolut).</summary>
    private static string WurzelVon(string pfad)
    {
        var wurzel = Path.GetPathRoot(pfad);
        if (wurzel is null)
        {
            return string.Empty;
        }
        return wurzel;
    }

    /// <summary>Das rohe Ziel eines Verweises oder `null`, wenn der Pfad kein Verweis ist — auch für einen ins Leere zeigenden.</summary>
    private static string? Verweisziel(string pfad)
    {
        try
        {
            return new FileInfo(pfad).LinkTarget;
        }
        catch (Exception fehler) when (fehler is ArgumentException or IOException or NotSupportedException)
        {
            return null;
        }
    }

    /// <summary>Das Ziel eines Verweises als absoluter Pfad; ein relatives Ziel gilt ab dem Verzeichnis des Verweises.</summary>
    private static string Zielpfad(string ziel, string verzeichnisDesVerweises)
    {
        var istAbsolut = Path.IsPathRooted(ziel);
        if (istAbsolut)
        {
            return Path.GetFullPath(ziel);
        }
        return Path.GetFullPath(Path.Combine(verzeichnisDesVerweises, ziel));
    }

    /// <summary>Die Bestandteile eines absoluten Pfades ohne seine Wurzel, in Reihenfolge.</summary>
    private static IEnumerable<string> BestandteileNachDerWurzel(string pfad, string wurzel)
    {
        var bestandteile = pfad[wurzel.Length..];
        return bestandteile.Split([Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar], StringSplitOptions.RemoveEmptyEntries);
    }

    private bool LiegtInWurzel(string aufgeloesterPfad)
    {
        var istDieWurzelSelbst = aufgeloesterPfad == aufgeloesteWurzel;
        if (istDieWurzelSelbst)
        {
            return true;
        }
        var istWurzelverzeichnis = aufgeloesteWurzel == Path.DirectorySeparatorChar.ToString();
        if (istWurzelverzeichnis)
        {
            return true;
        }
        return aufgeloesterPfad.StartsWith(aufgeloesteWurzel + Path.DirectorySeparatorChar, StringComparison.Ordinal);
    }
}
