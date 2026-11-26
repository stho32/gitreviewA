using GitReviewA.Git;

namespace GitReviewA.Dateiansicht;

/// <summary>
/// Liest eine genannte Datei beim Start (R00043, B4202): letzten Teil nicht folgen, Art am geöffneten Handle prüfen, höchstens
/// Grenze + 1 Byte lesen, ganz oder gar nicht. <paramref name="vorDemOeffnen"/> ist der Haken der Angriffsmatrix (T1–T3) zwischen
/// Prüfung und Öffnen; er gehört zu keiner Laufzeitentscheidung.
/// </summary>
internal sealed class DateiLeser : IDateiLeser
{
    private readonly Quellenbuchung buchung;
    private readonly Action<string>? vorDemOeffnen;

    public DateiLeser(Quellenbuchung buchung, Action<string>? vorDemOeffnen = null)
    {
        this.buchung = buchung;
        this.vorDemOeffnen = vorDemOeffnen;
    }

    public Lesergebnis Lies(string angabe, Ausgabegrenze grenze)
    {
        var enthaeltErsatzzeichen = angabe.Contains('\uFFFD', StringComparison.Ordinal);
        if (enthaeltErsatzzeichen)
        {
            return Lesergebnis.Abgelehnt(Quellengrund.NameNichtUebergebbar);
        }
        if (string.IsNullOrWhiteSpace(angabe))
        {
            return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtGefunden);
        }
        try
        {
            return OperatingSystem.IsWindows() ? LiesWindows(angabe, grenze) : LiesUnix(angabe, grenze);
        }
        catch (PathTooLongException)
        {
            return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtGefunden);
        }
        catch (ArgumentException)
        {
            return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtGefunden);
        }
        catch (UnauthorizedAccessException)
        {
            return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtLesbar);
        }
        catch (IOException)
        {
            return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtLesbar);
        }
    }

    private Lesergebnis LiesUnix(string angabe, Ausgabegrenze grenze)
    {
        if (Unixdatei.IstLetzterTeilEinLink(angabe))
        {
            return Lesergebnis.Abgelehnt(Quellengrund.IstEinSymbolischerLink);
        }
        if (Directory.Exists(angabe))
        {
            return Lesergebnis.Abgelehnt(Quellengrund.IstEinVerzeichnis);
        }
        vorDemOeffnen?.Invoke(angabe);
        var deskriptor = Unixdatei.Oeffnen(angabe, out var fehler);
        if (deskriptor < 0)
        {
            return Lesergebnis.Abgelehnt(Unixdatei.GrundAusFehler(fehler));
        }
        try
        {
            var art = Unixdatei.Art(deskriptor);
            if (art is null)
            {
                return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtLesbar);
            }
            var artGrund = GrundFuerArt(art.Value);
            if (artGrund is not null)
            {
                return Lesergebnis.Abgelehnt(artGrund);
            }
            var echterPfad = Unixdatei.PfadDesHandles(deskriptor, angabe);
            return LiesBytes(angabe, echterPfad, deskriptor, grenze);
        }
        finally
        {
            Unixdatei.Schliessen(deskriptor);
        }
    }

    private static Quellengrund? GrundFuerArt(Dateiart art)
    {
        return art switch
        {
            Dateiart.Regulaer => null,
            Dateiart.Verzeichnis => Quellengrund.IstEinVerzeichnis,
            _ => Quellengrund.KeineRegulaereDatei,
        };
    }

    private Lesergebnis LiesBytes(string angabe, string echterPfad, int deskriptor, Ausgabegrenze grenze)
    {
        var hoechstmenge = buchung.Lesehoechstmenge(grenze.Bytes);
        if (!Unixdatei.Lies(deskriptor, hoechstmenge, out var bytes))
        {
            return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtLesbar);
        }
        return Buche(angabe, echterPfad, bytes, grenze);
    }

    private Lesergebnis Buche(string angabe, string echterPfad, byte[] bytes, Ausgabegrenze grenze)
    {
        if (bytes.LongLength > grenze.Bytes)
        {
            buchung.Buchen(bytes.LongLength);
            return Lesergebnis.Abgelehnt(Quellengrund.ZuGross);
        }
        if (!buchung.Buchen(bytes.LongLength))
        {
            return Lesergebnis.Abgelehnt(Quellengrund.ZusammenZuGross);
        }
        return Lesergebnis.Gelesen(new Dateilesung(angabe, bytes, echterPfad));
    }

    /// <summary>Windows ohne FIFO und Gerätedateien: Link und Verzeichnis am Pfad, dann eine Handlung Öffnen und Lesen am Handle.</summary>
    private Lesergebnis LiesWindows(string angabe, Ausgabegrenze grenze)
    {
        if (new FileInfo(angabe).LinkTarget is not null)
        {
            return Lesergebnis.Abgelehnt(Quellengrund.IstEinSymbolischerLink);
        }
        if (Directory.Exists(angabe))
        {
            return Lesergebnis.Abgelehnt(Quellengrund.IstEinVerzeichnis);
        }
        if (!File.Exists(angabe))
        {
            return Lesergebnis.Abgelehnt(Quellengrund.DateiNichtGefunden);
        }
        var echterPfad = Path.GetFullPath(angabe);
        vorDemOeffnen?.Invoke(angabe);
        using var handle = File.OpenHandle(angabe, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        var hoechstmenge = buchung.Lesehoechstmenge(grenze.Bytes);
        using var inhalt = new MemoryStream();
        var puffer = new byte[64 * 1024];
        long gelesen = 0;
        while (gelesen < hoechstmenge)
        {
            var anzahl = (int)Math.Min(puffer.Length, hoechstmenge - gelesen);
            var teil = RandomAccess.Read(handle, puffer.AsSpan(0, anzahl), gelesen);
            if (teil == 0)
            {
                break;
            }
            inhalt.Write(puffer, 0, teil);
            gelesen += teil;
        }
        return Buche(angabe, echterPfad, inhalt.ToArray(), grenze);
    }
}