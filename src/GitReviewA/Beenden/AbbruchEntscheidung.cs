namespace GitReviewA.Beenden;

/// <summary>
/// Ein Ergebnis gibt es nur, wenn „Beenden“ angenommen wurde; jedes andere Ende des Laufs ist ein Abbruch ohne Urteil.
/// Ein Abbruchsignal nach angenommenem Beenden ändert daran nichts.
/// </summary>
internal static class AbbruchEntscheidung
{
    private const int ExitBeendet = 0;
    private const int ExitAbgebrochen = 130;

    public static Laufausgang Entscheide(bool istBeendenAngenommen)
    {
        if (istBeendenAngenommen)
        {
            return new Laufausgang(IstAbgebrochen: false, ExitCode: ExitBeendet);
        }
        return new Laufausgang(IstAbgebrochen: true, ExitCode: ExitAbgebrochen);
    }
}
