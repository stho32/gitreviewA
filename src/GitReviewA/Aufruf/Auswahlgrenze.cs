using System.Globalization;

namespace GitReviewA.Aufruf;

/// <summary>
/// Eine zu große Auswahl wird abgewiesen statt gekürzt: wer im Review fehlende Commits nicht sieht, prüft das Falsche.
/// </summary>
internal static class Auswahlgrenze
{
    public const int Hoechstzahl = 1000;
    private const int GroessteFluessigeAnzahl = 200;

    private static readonly NumberFormatInfo TausenderMitLeerzeichen = new() { NumberGroupSeparator = " " };

    public static Auswahlurteil Pruefe(int anzahl)
    {
        var istZuGross = anzahl > Hoechstzahl;
        if (istZuGross)
        {
            return Auswahlurteil.Abgelehnt;
        }
        var kannTraegeWerden = anzahl > GroessteFluessigeAnzahl;
        if (kannTraegeWerden)
        {
            return Auswahlurteil.MitWarnung;
        }
        return Auswahlurteil.Zulaessig;
    }

    public static string Ablehnungsmeldung()
    {
        return $"Die Auswahl umfasst mehr als {Zahl(Hoechstzahl)} Commits; erlaubt sind höchstens {Zahl(Hoechstzahl)} je Lauf — bitte die Auswahl teilen.";
    }

    public static string Warnmeldung(int anzahl)
    {
        return $"Die Auswahl umfasst {Zahl(anzahl)} Commits; ab {Zahl(GroessteFluessigeAnzahl + 1)} Commits kann die Oberfläche träge werden.";
    }

    private static string Zahl(int anzahl)
    {
        return anzahl.ToString("#,0", TausenderMitLeerzeichen);
    }
}
