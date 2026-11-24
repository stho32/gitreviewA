namespace GitReviewA.Git;

/// <summary>Datum ist das Autordatum in ISO 8601 mit der Zeitzone des Autors; Rumpf ist der Text nach dem Betreff.</summary>
internal sealed record Commitzeile(string Hash, string Autor, string Datum, string Betreff, string Rumpf)
{
    private const int KurzHashLaenge = 7;

    public string KurzHash => Hash[..KurzHashLaenge];
}
