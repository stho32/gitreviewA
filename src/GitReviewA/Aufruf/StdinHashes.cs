using System.Globalization;
using System.Text;

namespace GitReviewA.Aufruf;

internal static class StdinHashes
{
    private const int HoechsteZeilenlaenge = 100;
    private const string Erwartung = "gitreviewA - erwartet eine Pipe, ein Hash je Zeile, z. B. git rev-list <von>..<bis> | gitreviewA -";

    private static readonly NumberFormatInfo DeutscheZahl = new() { NumberDecimalSeparator = "," };

    public static async Task<CommitHashes> LesenAsync(TextReader eingabe, bool istTerminal, TimeSpan frist)
    {
        if (istTerminal)
        {
            throw new AuswahlFehler($"stdin ist ein Terminal: {Erwartung}.");
        }
        try
        {
            return await Task.Run(() => LeseBegrenzt(eingabe)).WaitAsync(frist);
        }
        catch (TimeoutException)
        {
            throw new AuswahlFehler(Fristmeldung(frist));
        }
    }

    public static string Fristmeldung(TimeSpan frist)
    {
        var sekunden = frist.TotalSeconds.ToString("0.###", DeutscheZahl);
        return $"stdin kam nicht innerhalb von {sekunden} s zum Ende: {Erwartung}.";
    }

    private static CommitHashes LeseBegrenzt(TextReader eingabe)
    {
        var sammlung = new StdinHashsammlung();
        var zeile = new StringBuilder();
        var zeilennummer = 1;
        var zeichen = eingabe.Read();
        while (zeichen != -1)
        {
            var istZeilenende = zeichen == '\n';
            if (istZeilenende)
            {
                sammlung.Nimm(zeile.ToString(), zeilennummer);
                zeile.Clear();
                zeilennummer++;
            }
            else
            {
                zeile.Append((char)zeichen);
                PruefeZeilenlaenge(zeile, zeilennummer);
            }
            zeichen = eingabe.Read();
        }
        sammlung.Nimm(zeile.ToString(), zeilennummer);
        return sammlung.Ergebnis();
    }

    private static void PruefeZeilenlaenge(StringBuilder zeile, int zeilennummer)
    {
        var istZuLang = zeile.Length > HoechsteZeilenlaenge;
        if (istZuLang)
        {
            throw new AuswahlFehler(StdinHashsammlung.Zeilenmeldung(zeilennummer));
        }
    }
}
