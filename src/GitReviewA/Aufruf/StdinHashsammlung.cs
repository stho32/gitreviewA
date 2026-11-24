namespace GitReviewA.Aufruf;

/// <summary>
/// Prüft stdin Zeile für Zeile. Meldungen nennen nur die Zeilennummer: der Inhalt ist fremde Eingabe und gehört nicht ins Protokoll.
/// </summary>
internal sealed class StdinHashsammlung
{
    private readonly List<string> hashes = [];
    private readonly HashSet<string> bekannteHashes = new(StringComparer.OrdinalIgnoreCase);

    public static string Zeilenmeldung(int zeilennummer)
    {
        return $"Zeile {zeilennummer} von stdin ist kein Commit-Hash; erwartet wird ein Hash je Zeile ({CommitHashForm.Beschreibung}).";
    }

    public void Nimm(string zeile, int zeilennummer)
    {
        var inhalt = zeile.TrimEnd('\r');
        var istLeerzeile = inhalt.Length == 0;
        if (istLeerzeile)
        {
            return;
        }
        var istCommitHash = CommitHashForm.IstCommitHash(inhalt);
        if (!istCommitHash)
        {
            throw new AuswahlFehler(Zeilenmeldung(zeilennummer));
        }
        var istNeu = bekannteHashes.Add(inhalt);
        if (!istNeu)
        {
            return;
        }
        hashes.Add(inhalt);
        var istZuGross = Auswahlgrenze.Pruefe(hashes.Count) == Auswahlurteil.Abgelehnt;
        if (istZuGross)
        {
            throw new AuswahlFehler(Auswahlgrenze.Ablehnungsmeldung());
        }
    }

    public CommitHashes Ergebnis()
    {
        var istLeer = hashes.Count == 0;
        if (istLeer)
        {
            throw new AuswahlFehler($"stdin enthielt keinen Commit-Hash; erwartet wird ein Hash je Zeile ({CommitHashForm.Beschreibung}).");
        }
        return new CommitHashes(hashes);
    }
}
