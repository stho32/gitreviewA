using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

namespace GitReviewA.Dateiansicht;

/// <summary>Die Art einer Datei am geöffneten Handle (Linux/macOS), nie an Attributen des Pfads: FIFO und Gerät sind dort <c>Normal</c>.</summary>
internal enum Dateiart
{
    Regulaer,
    Verzeichnis,
    Fifo,
    Geraet,
    Socket,
}

/// <summary>
/// Der Unix-Weg der Dateiprüfung (Missing-Docs R00043, vor dem Bau geprobt): öffnen ohne dem letzten Link zu folgen
/// (<c>O_NOFOLLOW</c>), ohne bei einer FIFO zu hängen (<c>O_NONBLOCK</c>), die Art am Handle (<c>fstat</c>) und der echte Pfad
/// aus demselben Handle (<c>/proc/self/fd/&lt;n&gt;</c> bzw. <c>F_GETPATH</c>). Genau eine Handlung Prüfen und Öffnen: was nach dem
/// Öffnen am Handle steht, gilt.
/// </summary>
internal static class Unixdatei
{
    private const int O_Rdonly = 0;
    private const int O_NonblockLinux = 0x800;
    private const int O_NonblockMac = 0x4;
    private const int O_NofollowLinux = 0x20000;
    private const int O_NofollowMac = 0x100;
    private const int O_CloexecLinux = 0x80000;
    private const int O_CloexecMac = 0x1000000;

    private const int FehlerNoent = 2;
    private const int FehlerIo = 5;
    private const int FehlerEacces = 13;
    private const int FehlerEnotdir = 20;
    private const int FehlerEisdir = 21;
    private const int FehlerEnametoolong = 36;
    private const int FehlerEloop = 40;
    private const int FehlerEintr = 4;

    private const int FGetpathMac = 50;

    private const int SIfmt = 0xF000;
    private const int SIfifo = 0x1000;
    private const int SIfchr = 0x2000;
    private const int SIfdir = 0x4000;
    private const int SIfblk = 0x6000;
    private const int SIfreg = 0x8000;
    private const int SIfsock = 0xC000;

    private const int Puffergroesse = 256;
    private const int Pfadpuffergroesse = 8192;

    public static bool IstLetzterTeilEinLink(string pfad)
    {
        try
        {
            return new FileInfo(pfad).LinkTarget is not null;
        }
        catch (IOException)
        {
            return false;
        }
        catch (UnauthorizedAccessException)
        {
            return false;
        }
    }

    /// <summary>Der vom Betriebssystem aufgelöste Pfad; <c>null</c>, wenn der Pfad nicht auflösbar ist (zu lang, fehlt).</summary>
    public static string? EchterPfad(string pfad)
    {
        var puffer = Marshal.AllocHGlobal(Pfadpuffergroesse);
        try
        {
            var treffer = realpath(pfad, puffer);
            return treffer == IntPtr.Zero ? null : Marshal.PtrToStringUTF8(treffer);
        }
        finally
        {
            Marshal.FreeHGlobal(puffer);
        }
    }

    /// <summary>
    /// Der vom Betriebssystem aufgelöste Pfad des <b>geöffneten</b> Handles — die Quelle für den Kopf (R00043, P3/T1: zwischen
    /// Prüfung und Öffnen kann sich die Angabe ändern, das Handle nicht). Nur wo das Betriebssystem den Pfad nicht nennt, löst
    /// <paramref name="angabe"/> ihn auf.
    /// </summary>
    public static string PfadDesHandles(int deskriptor, string angabe)
    {
        var ausHandle = OperatingSystem.IsMacOS() ? PfadAusFcntl(deskriptor) : PfadAusProcHandle(deskriptor);
        return ausHandle ?? EchterPfad(angabe) ?? angabe;
    }

    /// <summary>Öffnet ohne Folgen und ohne Blockieren; liefert den Deskriptor und im Fehlerfall die errno.</summary>
    public static int Oeffnen(string pfad, out int fehler)
    {
        fehler = 0;
        var deskriptor = open(pfad, Oeffnungsflags());
        if (deskriptor >= 0)
        {
            return deskriptor;
        }
        fehler = Marshal.GetLastWin32Error();
        return -1;
    }

    public static void Schliessen(int deskriptor)
    {
        _ = close(deskriptor);
    }

    /// <summary>Die Art am geöffneten Handle aus <c>fstat</c>; <c>null</c>, wenn <c>fstat</c> scheitert.</summary>
    public static Dateiart? Art(int deskriptor)
    {
        var puffer = new byte[Puffergroesse];
        if (fstat(deskriptor, puffer) != 0)
        {
            return null;
        }
        return AusModus(Modus(puffer));
    }

    /// <summary>Liest bis <paramref name="hoechstmenge"/> Bytes in einem Zug; <c>false</c>, wenn das Lesen scheitert.</summary>
    public static bool Lies(int deskriptor, long hoechstmenge, out byte[] bytes)
    {
        using var inhalt = new MemoryStream();
        var puffer = new byte[64 * 1024];
        long gelesen = 0;
        while (gelesen < hoechstmenge)
        {
            var anzahl = (int)Math.Min(puffer.Length, hoechstmenge - gelesen);
            var ergebnis = read(deskriptor, puffer, (nuint)anzahl);
            if (ergebnis < 0)
            {
                var fehler = Marshal.GetLastWin32Error();
                if (fehler == FehlerEintr)
                {
                    continue;
                }
                bytes = [];
                return false;
            }
            if (ergebnis == 0)
            {
                break;
            }
            inhalt.Write(puffer, 0, (int)ergebnis);
            gelesen += (long)ergebnis;
        }
        bytes = inhalt.ToArray();
        return true;
    }

    /// <summary>Der Grund, den ein gescheitertes Öffnen trägt; alles andere als „nicht lesbar“ bleibt „nicht gefunden“.</summary>
    public static Quellengrund GrundAusFehler(int fehler)
    {
        return fehler switch
        {
            FehlerEloop => Quellengrund.IstEinSymbolischerLink,
            FehlerNoent or FehlerEnotdir or FehlerEnametoolong => Quellengrund.DateiNichtGefunden,
            FehlerEacces or FehlerEisdir or FehlerIo => Quellengrund.DateiNichtLesbar,
            _ => Quellengrund.DateiNichtLesbar,
        };
    }

    /// <summary>Der Pfad des offenen Handles aus <c>/proc/self/fd/&lt;n&gt;</c> (Linux); <c>null</c>, wenn das Betriebssystem ihn nicht nennt.</summary>
    private static string? PfadAusProcHandle(int deskriptor)
    {
        var verweis = $"/proc/self/fd/{deskriptor.ToString(CultureInfo.InvariantCulture)}";
        var puffer = new byte[Pfadpuffergroesse];
        var gelesen = readlink(verweis, puffer, (nuint)puffer.Length);
        if (gelesen <= 0)
        {
            return null;
        }
        var pfad = Encoding.UTF8.GetString(puffer, 0, (int)gelesen);
        // Eine nach dem Öffnen gelöschte Datei trägt im Verweis den Zusatz „ (deleted)“; der Kopf nennt den Pfad ohne ihn.
        const string geloescht = " (deleted)";
        return pfad.EndsWith(geloescht, StringComparison.Ordinal) ? pfad[..^geloescht.Length] : pfad;
    }

    /// <summary>Der Pfad des offenen Handles aus <c>F_GETPATH</c> (macOS); <c>null</c>, wenn der Aufruf scheitert.</summary>
    private static string? PfadAusFcntl(int deskriptor)
    {
        var puffer = new byte[Pfadpuffergroesse];
        if (fcntl(deskriptor, FGetpathMac, puffer) == -1)
        {
            return null;
        }
        var ende = Array.IndexOf(puffer, (byte)0);
        return ende <= 0 ? null : Encoding.UTF8.GetString(puffer, 0, ende);
    }

    private static int Oeffnungsflags()
    {
        if (OperatingSystem.IsMacOS())
        {
            return O_Rdonly | O_NonblockMac | O_NofollowMac | O_CloexecMac;
        }
        return O_Rdonly | O_NonblockLinux | O_NofollowLinux | O_CloexecLinux;
    }

    private static int Modus(byte[] puffer)
    {
        if (OperatingSystem.IsMacOS())
        {
            return BitConverter.ToUInt16(puffer, 4);
        }
        var versatz = RuntimeInformation.ProcessArchitecture == Architecture.Arm64 ? 16 : 24;
        return BitConverter.ToInt32(puffer, versatz);
    }

    private static Dateiart AusModus(int modus)
    {
        return (modus & SIfmt) switch
        {
            SIfreg => Dateiart.Regulaer,
            SIfdir => Dateiart.Verzeichnis,
            SIfifo => Dateiart.Fifo,
            SIfchr or SIfblk => Dateiart.Geraet,
            SIfsock => Dateiart.Socket,
            _ => Dateiart.Geraet,
        };
    }

    [DllImport("libc", EntryPoint = "open", SetLastError = true)]
    private static extern int open(string pfad, int flags);

    [DllImport("libc", EntryPoint = "close", SetLastError = true)]
    private static extern int close(int deskriptor);

    [DllImport("libc", EntryPoint = "read", SetLastError = true)]
    private static extern nint read(int deskriptor, byte[] puffer, nuint anzahl);

    [DllImport("libc", EntryPoint = "fstat", SetLastError = true)]
    private static extern int fstat(int deskriptor, byte[] puffer);

    [DllImport("libc", EntryPoint = "realpath", SetLastError = true)]
    private static extern IntPtr realpath(string pfad, IntPtr puffer);

    [DllImport("libc", EntryPoint = "readlink", SetLastError = true)]
    private static extern nint readlink(string pfad, byte[] puffer, nuint groesse);

    [DllImport("libc", EntryPoint = "fcntl", SetLastError = true)]
    private static extern int fcntl(int deskriptor, int befehl, byte[] puffer);
}