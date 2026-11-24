using GitReviewA.Git;

namespace GitReviewA.Aufruf;

/// <summary>
/// Liefert die Wurzel des Arbeitsbaums oder den Aufrufgrund, an dem das Repository scheitert.
/// Die Zuordnung gehört in die Aufruf-Schicht: das Git-Layer bleibt bei <see cref="GitFehler"/> und <see cref="GitNichtGefunden"/>.
/// </summary>
internal static class Reposituation
{
    public static string WurzelOderGrund(string arbeitsordner)
    {
        try
        {
            return GitLeser.WurzelLesen(arbeitsordner);
        }
        catch (GitNichtGefunden fehler)
        {
            throw Aufruffehler.Fuer(Aufrufgrund.GitNichtGefunden, fehler.Message);
        }
        catch (GitFehler fehler)
        {
            throw Aufruffehler.Fuer(Grund(arbeitsordner), fehler.Message);
        }
    }

    private static Aufrufgrund Grund(string arbeitsordner)
    {
        try
        {
            return GitLeser.IstNacktesRepository(arbeitsordner)
                ? Aufrufgrund.NacktesRepository
                : Aufrufgrund.KeinRepository;
        }
        catch (GitNichtGefunden fehler)
        {
            throw Aufruffehler.Fuer(Aufrufgrund.GitNichtGefunden, fehler.Message);
        }
        catch (GitFehler)
        {
            return Aufrufgrund.KeinRepository;
        }
    }
}
