using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Hilfen;

/// <summary>Feste Netto-Dateiliste für Interactor- und Endpunkttests; <c>istLesbar=false</c> steht für eine unlesbare Zusammen-Ansicht.</summary>
internal sealed class TestNettoDateiliste(bool istLesbar = true, params NettoDatei[] dateien) : INettoDateiliste
{
    private readonly NettoDateiliste liste = new(istLesbar, dateien);

    public static TestNettoDateiliste Leer()
    {
        return new TestNettoDateiliste();
    }

    public NettoDateitreffer DateienMitAnzeigepfad(string anzeigepfad)
    {
        return new NettoDateitreffer(istLesbar, dateien.Where(datei => datei.Anzeigepfad == anzeigepfad).ToArray());
    }

    public string Sperrgrund(string anzeigepfad)
    {
        return istLesbar ? liste.Sperrgrund(anzeigepfad) : string.Empty;
    }
}
