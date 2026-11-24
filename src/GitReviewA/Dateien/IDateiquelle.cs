using GitReviewA.Git;

namespace GitReviewA.Dateien;

internal interface IDateiquelle
{
    Dateiaenderungen Lesen(string hash);
}
