namespace GitReviewA.Git;

/// <summary>Zerlegt die Ausgabe von <c>git log -z</c>: Datensätze nach NUL, Felder Hash, Autor, Datum, Betreff, Rumpf nach 0x1f.</summary>
internal static class GitLogAusgabe
{
    public const string Feldtrenner = "\u001f";
    private const char Datensatztrenner = '\0';
    private const int FelderJeDatensatz = 5;

    public static Commitzeilen Zerlegen(string ausgabe)
    {
        var datensaetze = ausgabe.Split(Datensatztrenner, StringSplitOptions.RemoveEmptyEntries);
        return new Commitzeilen(datensaetze.Select(ZerlegeDatensatz));
    }

    private static Commitzeile ZerlegeDatensatz(string datensatz)
    {
        var felder = datensatz.Split(Feldtrenner, FelderJeDatensatz);
        var feldFehlt = felder.Length < FelderJeDatensatz;
        if (feldFehlt)
        {
            throw new GitFehler($"unerwartete Ausgabe von git log (Länge {datensatz.Length}, {felder.Length} von {FelderJeDatensatz} Feldern)");
        }
        var rumpf = felder[4].TrimEnd('\n');
        return new Commitzeile(felder[0], felder[1], felder[2], felder[3], rumpf);
    }
}
