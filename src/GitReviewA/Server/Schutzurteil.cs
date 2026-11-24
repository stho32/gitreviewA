namespace GitReviewA.Server;

internal sealed record Schutzurteil(bool IstZugelassen, int Statuscode, string Meldung)
{
    public static readonly Schutzurteil Zugelassen = new(true, StatusCodes.Status200OK, string.Empty);

    public static Schutzurteil Abgewiesen(int statuscode, string meldung)
    {
        return new Schutzurteil(false, statuscode, meldung);
    }
}
