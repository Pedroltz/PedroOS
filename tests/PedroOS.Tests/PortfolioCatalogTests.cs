using PedroOS.Web.Services;

namespace PedroOS.Tests;

public class PortfolioCatalogTests
{
    private readonly JsonPortfolioCatalog _catalog;

    public PortfolioCatalogTests()
    {
        // Find the solution root Data directory
        var baseDir = AppContext.BaseDirectory;
        var dataDir = Path.Combine(baseDir, "..", "..", "..", "..", "..", "src", "PedroOS.Web", "Data");
        dataDir = Path.GetFullPath(dataDir);
        _catalog = new JsonPortfolioCatalog(dataDir);
    }

    [Fact]
    public void GetProjects_ReturnsRequiredProjects()
    {
        var projects = _catalog.GetProjects();
        Assert.NotEmpty(projects);

        var slugs = projects.Select(p => p.Slug).ToList();
        Assert.Contains("ofizzy", slugs);
        Assert.Contains("rdp-session-manager", slugs);
        Assert.Contains("zellapedia", slugs);
    }

    [Fact]
    public void Ofizzy_HasVerifiedStackAndScreenshots()
    {
        var ofizzy = _catalog.GetProjectBySlug("ofizzy");
        Assert.NotNull(ofizzy);
        Assert.Equal("Ofizzy.exe", ofizzy.ExecutableName);
        Assert.Contains("C#", ofizzy.Stack);
        Assert.Contains(".NET 10", ofizzy.Stack);
        Assert.Contains("Angular 21", ofizzy.Stack);
        Assert.Contains("PostgreSQL 18", ofizzy.Stack);
        Assert.NotEmpty(ofizzy.Screenshots);
        Assert.False(ofizzy.IsPlaceholder);
    }

    [Fact]
    public void RdpSessionManager_HasGtkAndPythonStack()
    {
        var rdp = _catalog.GetProjectBySlug("rdp-session-manager");
        Assert.NotNull(rdp);
        Assert.Equal("RDP-Session-Manager.exe", rdp.ExecutableName);
        Assert.Contains("Python", rdp.Stack);
        Assert.Contains("GTK 4", rdp.Stack);
        Assert.Equal("GPL-3.0", rdp.License);
        Assert.Equal("https://pedroltz.github.io/rdp-session-manager/", rdp.DemoUrl);
    }

    [Fact]
    public void ZellaPedia_IsExplicitlyMarkedAsPlaceholder()
    {
        var zella = _catalog.GetProjectBySlug("zellapedia");
        Assert.NotNull(zella);
        Assert.True(zella.IsPlaceholder);
        Assert.False(string.IsNullOrWhiteSpace(zella.PlaceholderNote));
    }

    [Fact]
    public void GetSkillCategories_ReturnsDevelopmentDevOpsAndAI()
    {
        var categories = _catalog.GetSkillCategories();
        Assert.Equal(3, categories.Count);

        var ids = categories.Select(c => c.Id).ToList();
        Assert.Contains("development", ids);
        Assert.Contains("devops", ids);
        Assert.Contains("ai", ids);

        var dev = _catalog.GetSkillCategory("development");
        Assert.NotNull(dev);
        Assert.Contains(dev.Items, s => s.Name.Contains("C#") || s.Name.Contains(".NET"));
    }

    [Fact]
    public void GetProfile_LoadsProfileWithVerifiedLinks()
    {
        var profile = _catalog.GetProfile();
        Assert.Equal("Pedro Tunin", profile.Name);
        Assert.Contains(profile.Links, l => l.Url.Contains("github.com/Pedroltz"));
        Assert.Contains(profile.Links, l => l.Url.Contains("linkedin.com/in/pedrotunin"));
    }
}
