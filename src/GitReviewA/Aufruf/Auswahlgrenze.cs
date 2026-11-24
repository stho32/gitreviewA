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
        var istLeer = anzahl == 0;
        if (istLeer)
        {
            return Auswahlurteil.Leer;
        }
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

    public static string Meldung(Auswahlurteil urteil, int anzahl)
    {
        return urteil switch
        {
            Auswahlurteil.Leer => Leermeldung(),
            Auswahlurteil.Abgelehnt => Ablehnungsmeldung(),
            Auswahlurteil.MitWarnung => Warnmeldung(anzahl),
            _ => throw new ArgumentOutOfRangeException(nameof(urteil), urteil, "zulässiges oder unbekanntes Urteil hat keine Meldung"),
        };
    }

    public static string Leermeldung()
    {
        return "Die Auswahl ist leer: kein Commit ausgewählt — bitte einen Bereich mit mindestens einem Commit wählen oder einen Hash je Zeile angeben.";
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
