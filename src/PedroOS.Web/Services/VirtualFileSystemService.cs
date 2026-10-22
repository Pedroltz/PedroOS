using PedroOS.Web.Models;

namespace PedroOS.Web.Services;

public interface IVirtualFileSystem
{
    VirtualNode GetRoot();
    VirtualNode? ResolvePath(string? virtualPath);
    VirtualNode? GetById(string? nodeId);
    IReadOnlyList<VirtualNode> ListDirectory(string? virtualPath, bool includeHidden = false);
    IReadOnlyList<VirtualNode> Search(string? query, bool includeHidden = false);
    string NormalizePath(string? virtualPath);
}

/// <summary>
/// Purely virtual, metadata-driven file system (C:\...).
/// Never reads from or writes to the host operating system's disk on behalf of a visitor.
/// </summary>
public sealed class VirtualFileSystemService : IVirtualFileSystem
{
    private readonly VirtualNode _root;
    private readonly Dictionary<string, VirtualNode> _byPath = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, VirtualNode> _byId = new(StringComparer.OrdinalIgnoreCase);

    public VirtualFileSystemService(IPortfolioCatalog portfolio)
    {
        _root = BuildTree(portfolio);
        Index(_root);
    }

    public VirtualNode GetRoot() => _root;

    public VirtualNode? GetById(string? nodeId) =>
        string.IsNullOrWhiteSpace(nodeId) ? null : _byId.GetValueOrDefault(nodeId.Trim());

    public VirtualNode? ResolvePath(string? virtualPath)
    {
        var normalized = NormalizePath(virtualPath);
        return string.IsNullOrEmpty(normalized) ? null : _byPath.GetValueOrDefault(normalized);
    }

    public IReadOnlyList<VirtualNode> ListDirectory(string? virtualPath, bool includeHidden = false)
    {
        var node = ResolvePath(virtualPath);
        if (node?.Children is null)
        {
            return [];
        }

        return includeHidden
            ? node.Children
            : node.Children.Where(c => !c.Hidden).ToList();
    }

    public IReadOnlyList<VirtualNode> Search(string? query, bool includeHidden = false)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        var term = query.Trim();
        return _byPath.Values
            .Where(n => n.Type != VirtualNodeType.Drive)
            .Where(n => includeHidden || !n.Hidden)
            .Where(n =>
                n.Name.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                n.Path.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                (n.Description?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false))
            .OrderBy(n => n.Path, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public string NormalizePath(string? virtualPath)
    {
        if (string.IsNullOrWhiteSpace(virtualPath))
        {
            return @"C:\";
        }

        var raw = virtualPath.Trim().Replace('/', '\\');

        // Reject traversal tokens, control characters, UNC paths, or non-C: drives
        if (raw.Contains("..", StringComparison.Ordinal) ||
            raw.StartsWith(@"\\", StringComparison.Ordinal) ||
            raw.Any(char.IsControl))
        {
            return string.Empty;
        }

        if (raw.Equals("C:", StringComparison.OrdinalIgnoreCase) ||
            raw.Equals(@"C:\", StringComparison.OrdinalIgnoreCase))
        {
            return @"C:\";
        }

        if (!raw.StartsWith(@"C:\", StringComparison.OrdinalIgnoreCase))
        {
            return string.Empty;
        }

        var segments = raw[3..]
            .Split('\\', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (segments.Any(s => s is "." or ".."))
        {
            return string.Empty;
        }

        return segments.Length == 0 ? @"C:\" : @"C:\" + string.Join('\\', segments);
    }

    private void Index(VirtualNode node)
    {
        _byPath[node.Path] = node;
        _byId[node.Id] = node;
        if (node.Children is null)
        {
            return;
        }

        foreach (var child in node.Children)
        {
            Index(child);
        }
    }

    private static VirtualNode BuildTree(IPortfolioCatalog portfolio)
    {
        var projects = portfolio.GetProjects();
        var featuredProjects = projects.Where(p => p.Featured).ToList();
        var moreProjects = projects.Where(p => !p.Featured).ToList();

        var projectNodes = new List<VirtualNode>();
        foreach (var project in featuredProjects)
        {
            projectNodes.Add(new VirtualNode
            {
                Id = $"file-project-{project.Slug}",
                Name = project.ExecutableName,
                Type = VirtualNodeType.Application,
                Path = $@"C:\Projects\{project.ExecutableName}",
                Icon = project.Icon,
                Size = "64 KB",
                Description = project.Summary,
                Action = new FileAction
                {
                    Kind = "open-app",
                    AppId = "project",
                    Args = new Dictionary<string, string> { ["slug"] = project.Slug },
                },
            });
        }

        var moreProjectNodes = moreProjects.Select(project => new VirtualNode
        {
            Id = $"file-project-{project.Slug}",
            Name = project.ExecutableName,
            Type = VirtualNodeType.Application,
            Path = $@"C:\Projects\MoreProjects\{project.ExecutableName}",
            Icon = project.Icon,
            Size = "32 KB",
            Description = project.Summary,
            Action = new FileAction
            {
                Kind = "open-app",
                AppId = "project",
                Args = new Dictionary<string, string> { ["slug"] = project.Slug },
            },
        }).ToList();

        projectNodes.Add(new VirtualNode
        {
            Id = "dir-more-projects",
            Name = "MoreProjects",
            Type = VirtualNodeType.Folder,
            Path = @"C:\Projects\MoreProjects",
            Icon = "folder",
            Description = "Outros projetos e experimentos no repositório de trabalho",
            Action = new FileAction { Kind = "navigate" },
            Children = moreProjectNodes,
        });

        var readmeContent =
            """
            ====================================================================
            PEDROOS 95 (Build 4.00.950) — LEIAME / README.TXT
            ====================================================================

            Bem-vindo ao PedroOS 95, o portfólio interativo de Pedro Tunin!

            Este ambiente funciona como um sistema operacional clássico direto
            no navegador, construído com ASP.NET Core (.NET 10 LTS), Razor Pages,
            TypeScript, 98.css (adaptado para Windows 95) e interact.js.

            COMO NAVEGAR:
            - Duplo clique (ou toque simples no celular) nos ícones do Desktop.
            - Use o botão "Start" na barra inferior para acessar todos os programas.
            - Arraste janelas pela barra de título e redimensione pelas bordas.
            - Abra C:\Projects para inspecionar projetos como Ofizzy, RDP Session
              Manager e ZellaPedia.
            - Abra Resume.doc (WordPad) para ler ou baixar o currículo em PDF.
            - Abra System Properties para ver as competências técnicas organizadas
              como componentes de hardware.

            DICAS E ATALHOS DE SISTEMA:
            - Pressione Alt+F4 para fechar a janela ativa.
            - Pressione Ctrl+Alt+B (ou digite "bsod" em Start > Run...) para testar
              a tela azul clássica de diagnóstico (pressione qualquer tecla para voltar).
            - No Campo Minado, experimente digitar "xyzzy" + Enter durante a partida.
            - Ative "Show hidden files" no Explorer para ver C:\PEDROOS.
            """;

        var creditsContent =
            """
            PEDROOS 95 — CRÉDITOS E LICENÇAS DE TERCEIROS
            =============================================
            - 98.css (MIT License, Copyright (c) 2020 Jordan Scales)
            - interact.js (MIT License, Copyright (c) Taye Adeyemi)
            - Pixelarticons (MIT License, Copyright (c) Gerrit Halfmann)
            - Ícones de desktop e aplicativos: pixel art 16x16/32x32/48x48
              original gerada especificamente para o PedroOS 95 seguindo a
              paleta de 16 cores do Windows 95.
            Consulte THIRD_PARTY_NOTICES.md na raiz do repositório.
            """;

        return new VirtualNode
        {
            Id = "drive-c",
            Name = "PedroOS (C:)",
            Type = VirtualNodeType.Drive,
            Path = @"C:\",
            Icon = "drive",
            Description = "Disco Local Virtual (C:)",
            Action = new FileAction { Kind = "navigate" },
            Children =
            [
                new VirtualNode
                {
                    Id = "dir-aboutme",
                    Name = "AboutMe",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\AboutMe",
                    Icon = "folder",
                    Description = "Apresentação e instruções de uso do PedroOS 95",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-readme",
                            Name = "Readme.txt",
                            Type = VirtualNodeType.Text,
                            Path = @"C:\AboutMe\Readme.txt",
                            Icon = "text",
                            Size = "2 KB",
                            Description = "Instruções de navegação e apresentação do PedroOS 95",
                            Content = readmeContent,
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "notepad",
                                Args = new Dictionary<string, string> { ["path"] = @"C:\AboutMe\Readme.txt" },
                            },
                        },
                    ],
                },
                new VirtualNode
                {
                    Id = "dir-projects",
                    Name = "Projects",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Projects",
                    Icon = "projects",
                    Description = "Projetos de software de Pedro Tunin",
                    Action = new FileAction { Kind = "navigate" },
                    Children = projectNodes,
                },
                new VirtualNode
                {
                    Id = "dir-experience",
                    Name = "Experience",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Experience",
                    Icon = "folder",
                    Description = "Histórico e trajetória profissional",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-career",
                            Name = "Career.doc",
                            Type = VirtualNodeType.Document,
                            Path = @"C:\Experience\Career.doc",
                            Icon = "doc",
                            Size = "28 KB",
                            Description = "Histórico profissional e experiências (WordPad)",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "resume",
                                Args = new Dictionary<string, string> { ["section"] = "experience" },
                            },
                        },
                    ],
                },
                new VirtualNode
                {
                    Id = "dir-skills",
                    Name = "Skills",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Skills",
                    Icon = "folder",
                    Description = "Drivers e módulos de competências técnicas",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-skill-dev",
                            Name = "Development.sys",
                            Type = VirtualNodeType.SystemFile,
                            Path = @"C:\Skills\Development.sys",
                            Icon = "sys",
                            Size = "48 KB",
                            Description = "C#, .NET, ASP.NET Core, Python, TypeScript, Angular, SQL",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "sysprops",
                                Args = new Dictionary<string, string> { ["tab"] = "development" },
                            },
                        },
                        new VirtualNode
                        {
                            Id = "file-skill-devops",
                            Name = "DevOps.sys",
                            Type = VirtualNodeType.SystemFile,
                            Path = @"C:\Skills\DevOps.sys",
                            Icon = "sys",
                            Size = "44 KB",
                            Description = "Linux, Docker, Docker Compose, GitHub Actions, CI/CD, Bash, Terraform, Kubernetes",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "sysprops",
                                Args = new Dictionary<string, string> { ["tab"] = "devops" },
                            },
                        },
                        new VirtualNode
                        {
                            Id = "file-skill-ai",
                            Name = "ArtificialIntelligence.sys",
                            Type = VirtualNodeType.SystemFile,
                            Path = @"C:\Skills\ArtificialIntelligence.sys",
                            Icon = "sys",
                            Size = "52 KB",
                            Description = "LLMs, RAG, Embeddings, Agentes de IA, Tool Calling, vLLM",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "sysprops",
                                Args = new Dictionary<string, string> { ["tab"] = "ai" },
                            },
                        },
                    ],
                },
                new VirtualNode
                {
                    Id = "dir-documents",
                    Name = "Documents",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Documents",
                    Icon = "folder",
                    Description = "Documentos e currículo profissional",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-resume",
                            Name = "Resume.doc",
                            Type = VirtualNodeType.Document,
                            Path = @"C:\Documents\Resume.doc",
                            Icon = "resume",
                            Size = "36 KB",
                            Description = "Currículo completo de Pedro Tunin no WordPad",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "resume",
                            },
                        },
                    ],
                },
                new VirtualNode
                {
                    Id = "dir-internet",
                    Name = "Internet",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Internet",
                    Icon = "folder",
                    Description = "Atalhos para perfis externos e navegador",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-github-url",
                            Name = "GitHub.url",
                            Type = VirtualNodeType.Shortcut,
                            Path = @"C:\Internet\GitHub.url",
                            Icon = "github",
                            Size = "1 KB",
                            Description = "Perfil oficial no GitHub (https://github.com/Pedroltz)",
                            Action = new FileAction
                            {
                                Kind = "open-url",
                                Url = "https://github.com/Pedroltz",
                            },
                        },
                        new VirtualNode
                        {
                            Id = "file-linkedin-url",
                            Name = "LinkedIn.url",
                            Type = VirtualNodeType.Shortcut,
                            Path = @"C:\Internet\LinkedIn.url",
                            Icon = "linkedin",
                            Size = "1 KB",
                            Description = "Perfil oficial no LinkedIn (https://www.linkedin.com/in/pedrotunin/)",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "linkedin",
                            },
                        },
                    ],
                },
                new VirtualNode
                {
                    Id = "dir-games",
                    Name = "Games",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Games",
                    Icon = "folder",
                    Description = "Jogos clássicos do sistema",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-minesweeper",
                            Name = "Minesweeper.exe",
                            Type = VirtualNodeType.Application,
                            Path = @"C:\Games\Minesweeper.exe",
                            Icon = "minesweeper",
                            Size = "24 KB",
                            Description = "Campo Minado clássico (Iniciante, Intermediário e Avançado)",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "minesweeper",
                            },
                        },
                    ],
                },
                new VirtualNode
                {
                    Id = "dir-pedroos-sys",
                    Name = "PEDROOS",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\PEDROOS",
                    Icon = "folder",
                    Hidden = true,
                    Description = "Diretório oculto de sistema e easter eggs",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-credits",
                            Name = "Credits.txt",
                            Type = VirtualNodeType.Text,
                            Path = @"C:\PEDROOS\Credits.txt",
                            Icon = "text",
                            Hidden = true,
                            Size = "1 KB",
                            Description = "Créditos e atribuições de código aberto",
                            Content = creditsContent,
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "notepad",
                                Args = new Dictionary<string, string> { ["path"] = @"C:\PEDROOS\Credits.txt" },
                            },
                        },
                        new VirtualNode
                        {
                            Id = "file-secret",
                            Name = "EasterEggs.txt",
                            Type = VirtualNodeType.Text,
                            Path = @"C:\PEDROOS\EasterEggs.txt",
                            Icon = "text",
                            Hidden = true,
                            Size = "1 KB",
                            Description = "Segredos do PedroOS 95",
                            Content = "Segredos desbloqueados:\n1. Start > Run > digite 'bsod' para acionar a tela azul segura.\n2. No Internet Explorer, navegue para 'about:mozilla' ou 'pedroos://credits'.\n3. No Campo Minado, digite 'xyzzy' + Enter para ativar o radar de pixel no canto superior esquerdo.",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "notepad",
                                Args = new Dictionary<string, string> { ["path"] = @"C:\PEDROOS\EasterEggs.txt" },
                            },
                        },
                    ],
                },
            ],
        };
    }
}
