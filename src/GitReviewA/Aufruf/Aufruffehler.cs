namespace GitReviewA.Aufruf;

/// <summary>
/// Ein ungültiger Aufruf: der Prozess endet vor dem Serverstart mit eigener Meldung und Exit-Code 2.
/// Der rohe git-Text hängt neben der Meldung und wird nur auf Stufe Debug gezeigt.
/// </summary>
internal class Aufruffehler : Exception
{
    public Aufruffehler(string meldung)
        : this(meldung, null, string.Empty)
    {
    }

    private Aufruffehler(string meldung, Aufrufgrund? grund, string debugtext)
        : base(meldung)
    {
        Grund = grund;
        Meldung = meldung;
        Debugtext = debugtext;
    }

    public Aufrufgrund? Grund { get; }

    public string Meldung { get; }

    public string Debugtext { get; }

    public int ExitCode => AufruffehlerMeldungen.ExitCode;

    public static Aufruffehler Fuer(Aufrufgrund grund, string debugtext = "")
    {
        return new Aufruffehler(AufruffehlerMeldungen.Meldung(grund), grund, debugtext);
    }

    public static Aufruffehler FuerAuswahlNichtAufloesbar(CommitHashes nichtAufloesbar, CommitHashes gesamteAuswahl, string debugtext)
    {
        return new Aufruffehler(
            AufruffehlerMeldungen.AuswahlNichtAufloesbar(nichtAufloesbar, gesamteAuswahl),
            Aufrufgrund.AuswahlNichtAufloesbar,
            debugtext);
    }
}
