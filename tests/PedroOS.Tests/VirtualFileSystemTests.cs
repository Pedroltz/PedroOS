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
    [InlineData(@"C:\Projects", @"C:\Projetos")]
    [InlineData(@"C:\AboutMe\Readme.txt", @"C:\SobreMim\Leia-me.txt")]
    [InlineData(@"C:\Documents\Resume.doc", @"C:\Documentos\Curriculo.doc")]
    [InlineData(@"C:\Games\Minesweeper.exe", @"C:\Jogos\CampoMinado.exe")]
    public void LegacyPathsResolveToPortugueseNodes(string legacy, string localized)
    {
        Assert.Equal(localized, _vfs.ResolvePath(legacy)?.Path);
        Assert.Same(_vfs.ResolvePath(legacy), _vfs.ResolvePath(localized));
    }

    [Theory]
    [InlineData(@"C:\SobreMim\Leia-me.txt")]
    [InlineData(@"C:\Projetos\Ofizzy.exe")]
    [InlineData(@"C:\Projetos\RDP-Session-Manager.exe")]
    [InlineData(@"C:\Projetos\MaisProjetos\TaskProj.exe")]
    [InlineData(@"C:\Projetos\MaisProjetos\BinaryTreeStudy.exe")]
    [InlineData(@"C:\Projetos\MaisProjetos\UniNote.exe")]
    [InlineData(@"C:\Experiencia\Carreira.doc")]
    [InlineData(@"C:\Habilidades\Desenvolvimento.sys")]
    [InlineData(@"C:\Documentos\Curriculo.doc")]
    [InlineData(@"C:\Internet\GitHub.url")]
    [InlineData(@"C:\Jogos\CampoMinado.exe")]
    [InlineData(@"C:\Jogos\SkiFree.exe")]
    [InlineData(@"C:\Jogos\OpenTyrian.exe")]
    [InlineData(@"C:\Jogos\OneMustFall2097.exe")]
    public void ResolvePath_ResolvesRequiredFiles(string path)
    {
        var node = _vfs.ResolvePath(path);
        Assert.NotNull(node);
        Assert.Equal(path, node.Path);
    }

    [Theory]
    [InlineData(@"C:\..\Windows")]
    [InlineData(@"C:\Projetos\..\..\etc\passwd")]
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

    [Fact]
    public void SecretsAreDiscoverableWithoutLeakingHiddenDescendantsInSearch()
    {
        Assert.DoesNotContain(_vfs.ListDirectory(@"C:\"), n => n.Name == "Segredos");
        Assert.Contains(_vfs.ListDirectory(@"C:\", true), n => n.Name == "Segredos");
        Assert.Empty(_vfs.Search("NeonFist"));
        Assert.Single(_vfs.Search("NeonFist", true));
        Assert.NotEmpty(_vfs.ListDirectory(@"C:\Segredos"));
        Assert.Equal("unlock-secret", _vfs.ResolvePath(@"C:\Segredos\Arcade.theme")?.Action?.Kind);
        Assert.Contains(@"C:\", _vfs.ResolvePath(@"C:\Lixeira\nao_apagar.txt")!.Content!);
        Assert.Equal("neon-fist", _vfs.ResolvePath(@"C:\Segredos\Disquete\NeonFist.exe")?.Action?.AppId);
        Assert.NotNull(_vfs.ResolvePath(@"C:\PEDROOS\Segredos.txt"));
    }
}
