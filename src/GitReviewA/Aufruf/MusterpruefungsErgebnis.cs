namespace GitReviewA.Aufruf;

/// <summary>Ergebnis der Musterprüfung: gültig oder der Grund der Ablehnung.</summary>
internal sealed record MusterpruefungsErgebnis(bool IstGueltig, Musterablehnungsgrund? Grund)
{
    public static MusterpruefungsErgebnis Gueltig()
    {
        return new MusterpruefungsErgebnis(true, null);
    }

    public static MusterpruefungsErgebnis Abgelehnt(Musterablehnungsgrund grund)
    {
        return new MusterpruefungsErgebnis(false, grund);
    }
}
