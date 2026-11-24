namespace GitReviewA.Aufruf;

/// <summary>
/// Eine Stelle für Meldung und Exit-Code jedes ungültigen Aufrufs: deutscher Text, der den Grund und den Ausweg nennt,
/// ohne rohen git-Text — der steht nur im Debugtext daneben.
/// </summary>
internal static class AufruffehlerMeldungen
{
    public const int ExitUngueltigerAufruf = 2;

    public static string Meldung(Aufrufgrund grund)
    {
        return grund switch
        {
            Aufrufgrund.KeinRepository => "Kein Git-Repository: der Arbeitsordner liegt in keinem Repository — bitte in einem Repository starten.",
            Aufrufgrund.NacktesRepository => "Nacktes Repository: der Arbeitsordner hat keinen Arbeitsbaum — bitte in einem Repository mit Arbeitsbaum starten.",
            Aufrufgrund.GitNichtGefunden => "git wurde nicht gefunden — bitte git installieren und im Suchpfad bereitstellen.",
            Aufrufgrund.LeereAuswahl => Auswahlgrenze.Leermeldung(),
            Aufrufgrund.AuswahlNichtAufloesbar => "Die Auswahl ließ sich nicht auflösen: kein genannter Commit ist in diesem Repository vorhanden — bitte einen Hash dieses Repositories angeben.",
            _ => throw new ArgumentOutOfRangeException(nameof(grund), grund, "unbekannter Aufrufgrund"),
        };
    }

    public static int ExitCode(Aufrufgrund grund)
    {
        return ExitUngueltigerAufruf;
    }
}
