namespace GitReviewA.Protokoll;

internal sealed class StderrProtokoll
{
    private const string Startkontext = "Start";

    private readonly TextWriter ziel;
    private readonly TimeProvider uhr;
    private readonly Lock schreibsperre = new();

    public StderrProtokoll(TextWriter ziel, TimeProvider uhr, Protokollstufe mindeststufe)
    {
        this.ziel = ziel;
        this.uhr = uhr;
        Mindeststufe = mindeststufe;
    }

    public Protokollstufe Mindeststufe { get; }

    public void Melde(Protokollstufe stufe, string kontext, string meldung)
    {
        var istSichtbar = stufe >= Mindeststufe;
        if (!istSichtbar)
        {
            return;
        }
        Schreibe(stufe, kontext, meldung);
    }

    public void MeldeStart(string adresse)
    {
        var istQuiet = Mindeststufe == Protokollstufe.Fehler;
        if (istQuiet)
        {
            return;
        }
        Schreibe(Protokollstufe.Information, Startkontext, $"gitreviewA läuft auf {adresse}");
    }

    private void Schreibe(Protokollstufe stufe, string kontext, string meldung)
    {
        var zeile = Protokollzeile.Formatiere(uhr.GetLocalNow(), stufe, kontext, meldung);
        lock (schreibsperre)
        {
            ziel.WriteLine(zeile);
            ziel.Flush();
        }
    }
}
