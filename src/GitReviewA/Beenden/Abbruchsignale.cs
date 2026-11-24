using System.Runtime.InteropServices;

namespace GitReviewA.Beenden;

/// <summary>
/// Strg+C und das Beendigungssignal beenden den Prozess nie hart: der Lauf endet geordnet und entscheidet selbst,
/// ob ein Ergebnis vorliegt. Den laufenden Server stoppt bei diesen Signalen der Host; ein Signal vor dessen Start
/// bleibt hier gemerkt.
/// </summary>
internal sealed class Abbruchsignale : IDisposable
{
    private readonly List<PosixSignalRegistration> registrierungen = [];
    private volatile bool istAbbruchAngefordert;

    public bool IstAbbruchAngefordert => istAbbruchAngefordert;

    public static Abbruchsignale Abfangen()
    {
        var abbruchsignale = new Abbruchsignale();
        abbruchsignale.registrierungen.Add(PosixSignalRegistration.Create(PosixSignal.SIGINT, abbruchsignale.MerkeAbbruch));
        abbruchsignale.registrierungen.Add(PosixSignalRegistration.Create(PosixSignal.SIGTERM, abbruchsignale.MerkeAbbruch));
        return abbruchsignale;
    }

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
    }
}
