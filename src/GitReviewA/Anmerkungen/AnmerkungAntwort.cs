namespace GitReviewA.Anmerkungen;

/// <summary>
/// Eine Anmerkung, wie `GET /api/anmerkungen` sie nennt: dieselben Felder wie die Anmerkung, die Art aber als Wert
/// („muss“, „frage“, „idee“ oder `null`) — dieselbe Schreibweise, die `POST` annimmt (R00036: eine Stelle für die Werte).
/// </summary>
internal sealed record AnmerkungAntwort(int Nummer, string Commit, string Datei, int? Zeile, string Text, int? Von, int? Bis, string? Art)
{
    public static AnmerkungAntwort Aus(Anmerkung anmerkung)
    {
        return new AnmerkungAntwort(
            anmerkung.Nummer,
            anmerkung.Commit,
            anmerkung.Datei,
            anmerkung.Zeile,
            anmerkung.Text,
            anmerkung.Von,
            anmerkung.Bis,
            Anmerkungsart.Wert(anmerkung.Art));
    }
}