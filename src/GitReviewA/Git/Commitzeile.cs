namespace GitReviewA.Git;

internal sealed record Commitzeile(string Hash, string Betreff)
{
    private const int KurzHashLaenge = 7;

    public string KurzHash => Hash[..KurzHashLaenge];
}
