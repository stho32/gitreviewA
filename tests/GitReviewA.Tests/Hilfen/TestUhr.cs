namespace GitReviewA.Tests.Hilfen;

internal sealed class TestUhr : TimeProvider
{
    private readonly DateTimeOffset jetzt;
    private readonly TimeZoneInfo zone;

    public TestUhr(DateTimeOffset jetzt)
    {
        this.jetzt = jetzt;
        zone = TimeZoneInfo.CreateCustomTimeZone("Testzone", jetzt.Offset, "Testzone", "Testzone");
    }

    public override TimeZoneInfo LocalTimeZone => zone;

    public override DateTimeOffset GetUtcNow()
    {
        return jetzt.ToUniversalTime();
    }
}
