using System.Runtime.InteropServices;

namespace GitReviewA.Beenden;

/// <summary>
/// Strg+C und das Beendigungssignal beenden den Prozess nie hart: der Lauf endet geordnet und entscheidet selbst,
/// ob ein Ergebnis vorliegt. Den laufenden Server stoppt bei diesen Signalen der Host; ein Signal vor dessen Start
/// bleibt hier gemerkt. Aus einem Skript im Hintergrund gestartet (`… &`) erbt der Prozess ein ignoriertes Strg+C;
/// eine aufrufende KI bricht den Review aber genau so ab, deshalb gilt vor dem Abfangen wieder die Standardbehandlung.
/// </summary>
internal sealed class Abbruchsignale : IDisposable
{
    private const int SigintNummer = 2;
    private static readonly nint Standardbehandlung = 0;

    private readonly List<PosixSignalRegistration> registrierungen = [];
    private volatile bool istAbbruchAngefordert;

    public bool IstAbbruchAngefordert => istAbbruchAngefordert;

    /// <summary>Der eine Einmal-Schalter (R00050): ein Signal nimmt denselben Weg wie der Knopf „Abbrechen“.</summary>
    public Laufende Laufende { get; } = new();

    public static Abbruchsignale Abfangen()
    {
        StelleStandardbehandlungFuerStrgCHer();
        var abbruchsignale = new Abbruchsignale();
        abbruchsignale.registrierungen.Add(PosixSignalRegistration.Create(PosixSignal.SIGINT, abbruchsignale.MerkeAbbruch));
        abbruchsignale.registrierungen.Add(PosixSignalRegistration.Create(PosixSignal.SIGTERM, abbruchsignale.MerkeAbbruch));
        return abbruchsignale;
    }

    private static void StelleStandardbehandlungFuerStrgCHer()
    {
        var istUnix = OperatingSystem.IsLinux() || OperatingSystem.IsMacOS();
        if (!istUnix)
        {
            return;
        }
        SetzeSignalbehandlung(SigintNummer, Standardbehandlung);
    }

    [DllImport("libc", EntryPoint = "signal")]
    private static extern nint SetzeSignalbehandlung(int signalnummer, nint behandlung);

    public void Dispose()
    {
        foreach (var registrierung in registrierungen)
        {
            registrierung.Dispose();
        }
    }

    private void MerkeAbbruch(PosixSignalContext kontext)
    {
        kontext.Cancel = true;
        istAbbruchAngefordert = true;
        Laufende.Versuche(Laufentscheidung.Abbruch);
    }
}
