using GitReviewA.Dateiansicht;
using GitReviewA.Git;

namespace GitReviewA.Tests.Dateiansicht;

/// <summary>Ein Wegwerfordner D außerhalb jedes Repositories (User Story R00043, „Vorbereitung: Ordner D“).</summary>
internal sealed class OrdnerD : IDisposable
{
    private OrdnerD(string ordner)
    {
        Ordner = ordner;
    }

    public string Ordner { get; }

    public string Pfad(string name)
    {
        return Path.Combine(Ordner, name);
    }

    public static OrdnerD Anlegen()
    {
        var ordner = Directory.CreateTempSubdirectory("gitreviewa-dateiansicht-").FullName;
        var d = new OrdnerD(ordner);
        File.WriteAllText(d.Pfad("a.sql"), "SELECT 1;\n-- Kommentar\nSELECT 'ä';\n");
        File.WriteAllText(d.Pfad("crlf.sql"), "CREATE TABLE t (id int);\r\nINSERT INTO t VALUES (1);\r\n");
        File.WriteAllText(d.Pfad("ohne-ende.sql"), "SELECT 2;");
        File.WriteAllBytes(d.Pfad("bom.sql"), [0xEF, 0xBB, 0xBF, .. "SELECT 3;\n"u8.ToArray()]);
        File.WriteAllBytes(d.Pfad("leer.sql"), []);
        File.WriteAllBytes(d.Pfad("latin1.sql"), [.. "SELECT 'caf"u8.ToArray(), 0xE9, (byte)'\'', (byte)';', (byte)'\n']);
        File.WriteAllBytes(d.Pfad("utf16.sql"), [0xFF, 0xFE, (byte)'S', 0x00, (byte)'E', 0x00]);
        File.WriteAllBytes(d.Pfad("bin.dat"), [(byte)'A', 0x00, (byte)'B']);
        File.WriteAllText(d.Pfad("trojan.sql"), "SELECT 1; -- \u202e;2 TCELES\n");
        File.WriteAllText(d.Pfad("xss.sql"), "<img src=x onerror=alert(1)>\n");
        File.WriteAllText(d.Pfad("<b>x<b>.sql"), "<img src=x onerror=alert(1)>\n");
        File.WriteAllText(d.Pfad("cr.sql"), "-- harmlos\rDROP TABLE x;\n");
        File.WriteAllText(d.Pfad("-x.sql"), "SELECT '-x';\n");
        File.WriteAllText(d.Pfad("zeile\numbruch.sql"), "SELECT 1;\n");
        File.WriteAllText(d.Pfad("cr\r.sql"), "SELECT 1;\n");
        File.WriteAllText(d.Pfad("f\uFFFD.sql"), "INHALT-FFFD\n");
        Directory.CreateDirectory(d.Pfad("ordner"));
        Directory.CreateDirectory(d.Pfad("unter"));
        File.CreateSymbolicLink(d.Pfad("link.sql"), "/etc/hostname");
        File.CreateSymbolicLink(d.Pfad("kaputt.sql"), d.Pfad("gibtsnicht"));
        Directory.CreateSymbolicLink(d.Pfad("ordnerlink"), ordner);
        ErzeugeFifo(d.Pfad("fifo.sql"));
        File.Copy(d.Pfad("a.sql"), d.Pfad("gesperrt.sql"));
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
        {
            File.SetUnixFileMode(d.Pfad("gesperrt.sql"), UnixFileMode.None);
        }
        File.Copy(d.Pfad("a.sql"), d.Pfad("haken.sql"));
        foreach (var nummer in new[] { "001", "002", "003" })
        {
            File.WriteAllText(d.Pfad($"{nummer}.sql"), $"-- Migration {nummer}\nSELECT {nummer};\n");
        }
        return d;
    }

    private static void ErzeugeFifo(string pfad)
    {
        using var fifo = System.Diagnostics.Process.Start("mkfifo", pfad);
        fifo?.WaitForExit();
    }

    public void Dispose()
    {
        if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
        {
            try
            {
                File.SetUnixFileMode(Pfad("gesperrt.sql"), UnixFileMode.UserRead | UnixFileMode.UserWrite);
            }
            catch (IOException)
            {
                // schon weg
            }
        }
        try
        {
            Directory.Delete(Ordner, recursive: true);
        }
        catch (IOException)
        {
            // Fremde Werkzeuge legen Dateien mit Rohbytes an, die .NET nicht aufzählen kann; der Ordner bleibt dann liegen.
        }
    }
}