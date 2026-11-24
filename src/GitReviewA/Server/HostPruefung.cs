namespace GitReviewA.Server;

internal static class HostPruefung
{
    public const string Rechneradresse = "127.0.0.1";

    /// <summary>Nur genau die Adresse des Laufs: Schutz gegen DNS-Rebinding, keine Präfix- oder Namensvarianten.</summary>
    public static bool IstErlaubt(string? host, int port)
    {
        var erlaubterHost = $"{Rechneradresse}:{port}";
        return string.Equals(host, erlaubterHost, StringComparison.Ordinal);
    }
}
