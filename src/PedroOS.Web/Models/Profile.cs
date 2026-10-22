namespace PedroOS.Web.Models;

/// <summary>Professional profile / resume data (Data/profile.json). Edit that file to update the resume.</summary>
public sealed record Profile
{
    public required string Name { get; init; }
    public required string Headline { get; init; }
    public string Location { get; init; } = string.Empty;
    public string Summary { get; init; } = string.Empty;
    public IReadOnlyList<string> About { get; init; } = [];
    public IReadOnlyList<ProfileLink> Links { get; init; } = [];
    public IReadOnlyList<Experience> Experience { get; init; } = [];
    public IReadOnlyList<Education> Education { get; init; } = [];
    public IReadOnlyList<string> Certifications { get; init; } = [];
    public IReadOnlyList<string> Languages { get; init; } = [];
    public IReadOnlyList<CompetencyGroup> Competencies { get; init; } = [];
    /// <summary>Optional static PDF under wwwroot (e.g. "assets/docs/resume.pdf"). When absent, a PDF is generated from this file.</summary>
    public string? ResumePdf { get; init; }
}

public sealed record ProfileLink
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public required string Url { get; init; }
    public string Icon { get; init; } = "url";
}

public sealed record Experience
{
    public required string Role { get; init; }
    public required string Organization { get; init; }
    public string Period { get; init; } = string.Empty;
    public string Location { get; init; } = string.Empty;
    public IReadOnlyList<string> Bullets { get; init; } = [];
    public bool IsPlaceholder { get; init; }
}

public sealed record Education
{
    public required string Course { get; init; }
    public required string Institution { get; init; }
    public string Period { get; init; } = string.Empty;
    public bool IsPlaceholder { get; init; }
}

public sealed record CompetencyGroup
{
    public required string Name { get; init; }
    public IReadOnlyList<string> Items { get; init; } = [];
}
