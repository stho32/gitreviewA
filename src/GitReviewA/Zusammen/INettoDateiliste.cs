namespace GitReviewA.Zusammen;

/// <summary>
/// Die Netto-Dateiliste, wie der Stapel-Haken sie braucht: die Einträge mit einem Anzeigepfad (mehrere bei gleichem Anzeigenamen
/// zweier Rohnamen) und den Sperrgrund eines Anzeigenamens. <see cref="NettoDateitreffer.IstLesbar"/> ist falsch, wenn die
/// Netto-Liste nicht gelesen werden konnte.
/// </summary>
internal interface INettoDateiliste
{
    NettoDateitreffer DateienMitAnzeigepfad(string anzeigepfad);

    /// <summary>Leer, wenn genau ein Eintrag den Anzeigenamen trägt; sonst der Grund, aus dem der Name keine Datei meint.</summary>
    string Sperrgrund(string anzeigepfad);
}

internal sealed record NettoDateitreffer(bool IstLesbar, NettoDatei[] Dateien);