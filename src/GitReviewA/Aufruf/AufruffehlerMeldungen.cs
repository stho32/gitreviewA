namespace GitReviewA.Aufruf;

using GitReviewA.Git;

/// <summary>
/// Eine Stelle für Meldungen und den Exit-Code eines ungültigen Aufrufs. Die Meldung nennt den Grund und den Ausweg;
/// der rohe git-Text bleibt im Debug-Text. Bei einer nur teilweise auflösbaren Auswahl nennt sie die nicht auflösbaren Hashes.
/// </summary>
internal static class AufruffehlerMeldungen
{
    public const int ExitCode = 2;

    private const int HoechstensGenannteHashes = 5;

    public static string Meldung(Aufrufgrund grund)
    {
        return grund switch
        {
            Aufrufgrund.KeinRepository => "Kein Git-Repository: der Arbeitsordner liegt in keinem Repository — bitte in einem Repository starten.",
            Aufrufgrund.NacktesRepository => "Nacktes Repository: der Arbeitsordner hat keinen Arbeitsbaum — bitte in einem Repository mit Arbeitsbaum starten.",
            Aufrufgrund.GitNichtGefunden => "git wurde nicht gefunden — bitte git installieren und im Suchpfad bereitstellen.",
            Aufrufgrund.LeereAuswahl => Auswahlgrenze.Leermeldung(),
            Aufrufgrund.AuswahlNichtAufloesbar => "Die Auswahl ließ sich nicht auflösen — bitte einen Hash dieses Repositories angeben.",
            Aufrufgrund.CommitAngabenZuGross => CommitAngabenZuGross(Ausgabegrenze.Standard.Bytes),
            _ => throw new ArgumentOutOfRangeException(nameof(grund), grund, "Unbekannter Aufrufgrund."),
        };
    }

    /// <summary>
    /// Die eine Zeile für zu große Commit-Angaben (R00048 Kriterium 4): sie nennt die Grenze und den Ausweg und **keinen** Text aus
    /// dem Commit — kein Autor, kein Betreff, keine Message, keine Pfade, kein Steuer- oder Formatzeichen (L5).
    /// </summary>
    public static string CommitAngabenZuGross(long grenze)
    {
        var anzeige = Ausgabegrenze.AlsText(grenze);
        return $"Die Commit-Angaben der Auswahl sind größer als {anzeige} (Autor, Betreff, Message); bitte die Auswahl teilen.";
    }

    /// <summary>
    /// Meldung für eine Auswahl, deren Hashes nicht alle zu einem Commit aufgelöst werden konnten.
    /// <paramref name="nichtAufloesbar"/> ist die Teilmenge der nicht auflösbaren Hashes; <paramref name="gesamteAuswahl"/>
    /// die ursprüngliche Auswahl. Sind alle Hashes nicht auflösbar, bleibt der bekannte Satz stehen; bei einer Teilmenge
    /// werden nur die betroffenen Hashes genannt. Die Liste ist gekürzt, damit die Meldung eine Zeile bleibt.
    /// </summary>
    public static string AuswahlNichtAufloesbar(CommitHashes nichtAufloesbar, CommitHashes gesamteAuswahl)
    {
        if (nichtAufloesbar.Anzahl == 0)
        {
            return "Die Auswahl ließ sich nicht auflösen — bitte einen Hash dieses Repositories angeben.";
        }

        if (nichtAufloesbar.Anzahl == gesamteAuswahl.Anzahl)
        {
            return "Die Auswahl ließ sich nicht auflösen: kein genannter Commit ist in diesem Repository vorhanden — bitte einen Hash dieses Repositories angeben.";
        }

        return $"Die Auswahl ließ sich nicht auflösen: nicht auflösbar sind {GenannteHashes(nichtAufloesbar)} — bitte einen Hash dieses Repositories angeben.";
    }

    private static string GenannteHashes(CommitHashes hashes)
    {
        var anzahl = Math.Min(hashes.Anzahl, HoechstensGenannteHashes);
        var genannt = new List<string>(anzahl);
        for (var i = 0; i < anzahl; i++)
        {
            genannt.Add(hashes[i]);
        }

        var weitere = hashes.Anzahl - anzahl;
        var text = string.Join(", ", genannt);
        return weitere > 0 ? $"{text} und {weitere} weitere" : text;
    }
}
