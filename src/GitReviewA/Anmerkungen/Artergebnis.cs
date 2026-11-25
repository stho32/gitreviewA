namespace GitReviewA.Anmerkungen;

/// <summary>Ergebnis der Art-Prüfung: die gelesene Angabe oder der eine Ablehnungsgrund „Art unbekannt“ (R00036).</summary>
internal sealed record Artergebnis(Artangabe Angabe, string Grund)
{
    public bool IstGueltig => Grund.Length == 0;

    public static Artergebnis Gueltig(Artangabe angabe) => new(angabe, string.Empty);

    public static Artergebnis Abgelehnt() => new(Artangabe.Fehlt, Anmerkungsart.Unbekannt);
}