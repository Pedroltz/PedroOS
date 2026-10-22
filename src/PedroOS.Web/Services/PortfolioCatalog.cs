using System.Text.Json;
using System.Text.RegularExpressions;
using PedroOS.Web.Models;

namespace PedroOS.Web.Services;

/// <summary>
/// Abstraction over portfolio data (projects, skills, professional profile).
/// Backed by JSON files in the MVP; can be replaced by a database implementation without changing callers.
/// </summary>
public interface IPortfolioCatalog
{
    IReadOnlyList<Project> GetProjects(bool featuredOnly = false);
    Project? GetProjectBySlug(string? slug);
    IReadOnlyList<SkillCategory> GetSkillCategories();
    SkillCategory? GetSkillCategory(string? categoryId);
    Profile GetProfile();
}

public sealed partial class JsonPortfolioCatalog : IPortfolioCatalog
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly IReadOnlyList<Project> _projects;
    private readonly Dictionary<string, Project> _projectsBySlug;
    private readonly IReadOnlyList<SkillCategory> _skills;
    private readonly Dictionary<string, SkillCategory> _skillsById;
    private readonly Profile _profile;

    [GeneratedRegex("^[a-z0-9-]{1,64}$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex SafeSlugRegex();

    public JsonPortfolioCatalog(IWebHostEnvironment env)
        : this(Path.Combine(env.ContentRootPath, "Data"))
    {
    }

    public JsonPortfolioCatalog(string dataDirectory)
    {
        var projectsPath = Path.Combine(dataDirectory, "projects.json");
        var skillsPath = Path.Combine(dataDirectory, "skills.json");
        var profilePath = Path.Combine(dataDirectory, "profile.json");

        _projects = LoadJson<List<Project>>(projectsPath) ?? [];
        _projectsBySlug = _projects.ToDictionary(p => p.Slug, StringComparer.OrdinalIgnoreCase);

        _skills = LoadJson<List<SkillCategory>>(skillsPath) ?? [];
        _skillsById = _skills.ToDictionary(s => s.Id, StringComparer.OrdinalIgnoreCase);

        _profile = LoadJson<Profile>(profilePath) ?? new Profile
        {
            Name = "Pedro Tunin",
            Headline = "Engenheiro de Software",
        };
    }

    public IReadOnlyList<Project> GetProjects(bool featuredOnly = false) =>
        featuredOnly ? _projects.Where(p => p.Featured).ToList() : _projects;

    public Project? GetProjectBySlug(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug) || !SafeSlugRegex().IsMatch(slug))
        {
            return null;
        }

        return _projectsBySlug.GetValueOrDefault(slug);
    }

    public IReadOnlyList<SkillCategory> GetSkillCategories() => _skills;

    public SkillCategory? GetSkillCategory(string? categoryId)
    {
        if (string.IsNullOrWhiteSpace(categoryId) || !SafeSlugRegex().IsMatch(categoryId))
        {
            return null;
        }

        return _skillsById.GetValueOrDefault(categoryId);
    }

    public Profile GetProfile() => _profile;

    private static T? LoadJson<T>(string path)
    {
        if (!File.Exists(path))
        {
            return default;
        }

        using var stream = File.OpenRead(path);
        return JsonSerializer.Deserialize<T>(stream, JsonOptions);
    }
}
