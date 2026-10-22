using PedroOS.Web.Services;

namespace PedroOS.Tests;

public class VirtualFileSystemTests
{
    private readonly VirtualFileSystemService _vfs;

    public VirtualFileSystemTests()
    {
        var baseDir = AppContext.BaseDirectory;
        var dataDir = Path.Combine(baseDir, "..", "..", "..", "..", "..", "src", "PedroOS.Web", "Data");
        dataDir = Path.GetFullPath(dataDir);
        var catalog = new JsonPortfolioCatalog(dataDir);
        _vfs = new VirtualFileSystemService(catalog);
    }

    [Fact]
    public void GetRoot_ReturnsDriveC()
    {
        var root = _vfs.GetRoot();
        Assert.NotNull(root);
        Assert.Equal(@"C:\", root.Path);
    }

    [Theory]
    [InlineData(@"C:\AboutMe\Readme.txt")]
    [InlineData(@"C:\Projects\Ofizzy.exe")]
    [InlineData(@"C:\Projects\RDP-Session-Manager.exe")]
    [InlineData(@"C:\Experience\Career.doc")]
    [InlineData(@"C:\Skills\Development.sys")]
    [InlineData(@"C:\Documents\Resume.doc")]
    [InlineData(@"C:\Internet\GitHub.url")]
    [InlineData(@"C:\Games\Minesweeper.exe")]
    public void ResolvePath_ResolvesRequiredFiles(string path)
    {
        var node = _vfs.ResolvePath(path);
        Assert.NotNull(node);
        Assert.Equal(path, node.Path);
    }

    [Theory]
    [InlineData(@"C:\..\Windows")]
    [InlineData(@"C:\Projects\..\..\etc\passwd")]
    [InlineData(@"D:\Secret")]
    [InlineData(@"/etc/shadow")]
    [InlineData(@"\\network\share")]
    public void NormalizePath_RejectsTraversalAndUnsafePaths(string path)
    {
        var normalized = _vfs.NormalizePath(path);
        Assert.Empty(normalized);
    }

    [Fact]
    public void ListDirectory_FiltersHiddenFilesByDefault()
    {
        var cNodes = _vfs.ListDirectory(@"C:\", includeHidden: false);
        Assert.DoesNotContain(cNodes, n => n.Name.Equals("PEDROOS", StringComparison.OrdinalIgnoreCase));

        var cNodesWithHidden = _vfs.ListDirectory(@"C:\", includeHidden: true);
        Assert.Contains(cNodesWithHidden, n => n.Name.Equals("PEDROOS", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Search_FindsMatchingNodes()
    {
        var results = _vfs.Search("ofizzy");
        Assert.NotEmpty(results);
        Assert.Contains(results, r => r.Name.Contains("Ofizzy"));
    }
}
