using GitReviewA.Aufruf;
using GitReviewA.Tests.Hilfen;
using GitReviewA.Zusammen;

namespace GitReviewA.Tests.Zusammen;

/// <summary>
/// B1402: die Kettenregel des product-owner (2026-11-24, Zeile 81) als reine Operation — Aufrufreihenfolge `z3 z1 z2` (lückenlos),
/// `z1 z3` (nicht lückenlos), ein einzelner Commit als Wurzel und als Nicht-Wurzel, Merge, zwei Wurzeln, eine Verzweigung.
/// </summary>
public class KetteBeurteilenTests
{
    [Test]
    [Description("R00015 B1402: lückenlos mit leerer Basis, unabhängig von der Aufrufreihenfolge")]
    public void Wenn_die_Auswahl_eine_lueckenlose_Kette_ist_dann_lueckenlos_mit_Basis_des_aeltesten()
    {
        var gemischt = Beurteile(
            [("z3", "z2"), ("z1", ""), ("z2", "z1")], "z3", "z1", "z2");
        var inReihenfolge = Beurteile(
            [("z1", ""), ("z2", "z1"), ("z3", "z2")], "z1", "z2", "z3");

        Assert.That((gemischt.Lueckenlos, gemischt.Basis, gemischt.Reihenfolge.AlsArray()), Is.EqualTo((true, "", new[] { "z1", "z2", "z3" })));
        Assert.That((inReihenfolge.Lueckenlos, inReihenfolge.Basis), Is.EqualTo((true, "")), "die Aufrufreihenfolge ändert nichts");
    }

    [Test]
    [Description("R00015 B1402: ein fehlendes Glied ergibt nicht lückenlos")]
    public void Wenn_in_der_Kette_ein_Commit_fehlt_dann_nicht_lueckenlos()
    {
        var kette = Beurteile([("z1", ""), ("z3", "z2")], "z1", "z3");

        Assert.That(kette.Lueckenlos, Is.False);
        Assert.That(kette.Basis, Is.Empty);
        Assert.That(kette.Reihenfolge.AlsArray(), Is.EqualTo(new[] { "z1", "z3" }));
    }

    [Test]
    [Description("R00015 B1402: ein einzelner Commit ist lückenlos; Basis ist sein Elternstand, leer nur bei einer Wurzel")]
    public void Wenn_nur_ein_Commit_gewaehlt_ist_dann_lueckenlos_mit_seinem_Elternstand()
    {
        var wurzel = Beurteile([("z1", "")], "z1");
        var nichtWurzel = Beurteile([("z2", "z1")], "z2");

        Assert.That((wurzel.Lueckenlos, wurzel.Basis), Is.EqualTo((true, "")), "eine Wurzel hat gegen leer netto zu sein");
        Assert.That((nichtWurzel.Lueckenlos, nichtWurzel.Basis), Is.EqualTo((true, "z1")), "sonst zeigte der Netto-Diff jede Datei als neu");
    }

    [Test]
    [Description("R00015 B1402: ein Merge läuft über seinen ersten Elternteil")]
    public void Wenn_ein_Merge_in_der_Auswahl_steht_dann_laeuft_die_Kette_ueber_den_ersten_Elternteil()
    {
        var kette = Beurteile([("c1", ""), ("m", "c1")], "c1", "m");

        Assert.That((kette.Lueckenlos, kette.Basis, kette.Reihenfolge.AlsArray()), Is.EqualTo((true, "", new[] { "c1", "m" })));
    }

    [Test]
    [Description("R00015 B1402: zwei Wurzeln bilden keine Kette")]
    public void Wenn_zwei_Wurzeln_gewaehlt_sind_dann_nicht_lueckenlos()
    {
        var kette = Beurteile([("a", ""), ("b", "")], "a", "b");

        Assert.That(kette.Lueckenlos, Is.False);
    }

    [Test]
    [Description("R00015 B1402: ein Commit mit zwei Nachfolgern in der Auswahl ist keine Kette")]
    public void Wenn_ein_Commit_zwei_Nachfolger_in_der_Auswahl_hat_dann_nicht_lueckenlos()
    {
        var kette = Beurteile([("p", ""), ("c1", "p"), ("c2", "p")], "p", "c1", "c2");

        Assert.That(kette.Lueckenlos, Is.False);
    }

    private static Kette Beurteile((string Commit, string Eltern)[] paare, params string[] auswahl)
    {
        return KetteBeurteilen.Beurteile(new Elternfolge(paare.Select(paar => new Elternzeile(paar.Commit, paar.Eltern))), new CommitHashes(auswahl));
    }
}
