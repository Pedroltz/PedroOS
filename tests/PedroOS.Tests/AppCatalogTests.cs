using PedroOS.Web.Services;

namespace PedroOS.Tests;

public class AppCatalogTests
{
    private readonly AppCatalog _catalog;

    public AppCatalogTests()
    {
        var baseDir = AppContext.BaseDirectory;
        var dataDir = Path.Combine(baseDir, "..", "..", "..", "..", "..", "src", "PedroOS.Web", "Data");
        dataDir = Path.GetFullPath(dataDir);
        var portfolio = new JsonPortfolioCatalog(dataDir);
        _catalog = new AppCatalog(portfolio);
    }

    [Fact]
    public void GetAll_ContainsAllRequiredApps()
    {
        var apps = _catalog.GetAll();
        var ids = apps.Select(a => a.Id).ToList();

        Assert.Contains("explorer", ids);
        Assert.Contains("projects", ids);
        Assert.Contains("project", ids);
        Assert.Contains("resume", ids);
        Assert.Contains("sysprops", ids);
        Assert.Contains("iexplore", ids);
        Assert.Contains("minesweeper", ids);
        Assert.Contains("notepad", ids);
        Assert.Contains("about", ids);
        Assert.Contains("find", ids);
        Assert.Contains("run", ids);
        Assert.Contains("display", ids);
        Assert.Contains("shutdown", ids);
    }

    [Theory]
    [InlineData("/", "")]
    [InlineData("/projects", "projects")]
    [InlineData("/projects/ofizzy", "project")]
    [InlineData("/resume", "resume")]
    [InlineData("/skills", "sysprops")]
    public void ResolveRoute_ResolvesSupportedRoutes(string route, string expectedAppId)
    {
        var resolution = _catalog.ResolveRoute(route);
        Assert.NotNull(resolution);
        Assert.Equal(expectedAppId, resolution.AppId);
        Assert.False(string.IsNullOrWhiteSpace(resolution.PageTitle));
        Assert.False(string.IsNullOrWhiteSpace(resolution.MetaDescription));
    }

    [Fact]
    public void ResolveRoute_ReturnsNullForUnknownRoute()
    {
        var resolution = _catalog.ResolveRoute("/unknown-path-xyz");
        Assert.Null(resolution);
    }
}
