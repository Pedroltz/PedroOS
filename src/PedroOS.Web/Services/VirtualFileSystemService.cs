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
    private readonly HashSet<string> _hiddenPaths = new(StringComparer.OrdinalIgnoreCase);

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
        if (string.IsNullOrEmpty(normalized)) return null;
        if (_byPath.TryGetValue(normalized, out var node)) return node;
        var aliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Projects"] = "Projetos", ["MoreProjects"] = "MaisProjetos", ["AboutMe"] = "SobreMim",
            ["Documents"] = "Documentos", ["Experience"] = "Experiencia", ["Skills"] = "Habilidades", ["Games"] = "Jogos",
            ["Readme.txt"] = "Leia-me.txt", ["Resume.doc"] = "Curriculo.doc", ["Career.doc"] = "Carreira.doc",
            ["Development.sys"] = "Desenvolvimento.sys", ["ArtificialIntelligence.sys"] = "InteligenciaArtificial.sys",
            ["Minesweeper.exe"] = "CampoMinado.exe", ["Credits.txt"] = "Creditos.txt", ["EasterEggs.txt"] = "Segredos.txt",
        };
        var localized = string.Join('\\', normalized.Split('\\').Select(segment => aliases.GetValueOrDefault(segment, segment)));
        return _byPath.GetValueOrDefault(localized);
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
            .Where(n => includeHidden || !_hiddenPaths.Contains(n.Path))
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

    private void Index(VirtualNode node, bool hiddenParent = false)
    {
        var hidden = hiddenParent || node.Hidden;
        if (hidden) _hiddenPaths.Add(node.Path);
        _byPath[node.Path] = node;
        _byId[node.Id] = node;
        if (node.Children is null)
        {
            return;
        }

        foreach (var child in node.Children)
        {
            Index(child, hidden);
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
                Path = $@"C:\Projetos\{project.ExecutableName}",
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
            Path = $@"C:\Projetos\MaisProjetos\{project.ExecutableName}",
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
            Name = "MaisProjetos",
            Type = VirtualNodeType.Folder,
            Path = @"C:\Projetos\MaisProjetos",
            Icon = "folder",
            Description = "Outros projetos e experimentos no repositório de trabalho",
            Action = new FileAction { Kind = "navigate" },
            Children = moreProjectNodes,
        });

        var readmeContent =
            """
            ====================================================================
            PEDROOS 95 (Versão 4.00.950) — LEIA-ME.TXT
            ====================================================================

            Bem-vindo ao PedroOS 95, o portfólio interativo de Pedro Tunin!

            Este ambiente funciona como um sistema operacional clássico direto
            no navegador, construído com ASP.NET Core (.NET 10 LTS), Razor Pages,
            TypeScript, 98.css (adaptado para PedroOS 95) e interact.js.

            COMO NAVEGAR:
            - Duplo clique (ou toque simples no celular) nos ícones da área de trabalho.
            - Use o botão "Iniciar" na barra inferior para acessar todos os programas.
            - Arraste janelas pela barra de título e redimensione pelas bordas.
            - Abra C:\Projetos para inspecionar projetos como Ofizzy, RDP Session
              Manager, TaskProj e AnyComic.
            - Abra Curriculo.doc (Editor de Documentos) para ler ou baixar o currículo em PDF.
            - Abra Propriedades do Sistema para ver as competências técnicas organizadas
              como componentes de hardware.

            DICAS E ATALHOS DE SISTEMA:
            - Pressione Alt+F4 para fechar a janela ativa.
            - Pressione Ctrl+Alt+B (ou digite "bsod" em Iniciar > Executar...) para testar
              a tela azul clássica de diagnóstico (pressione qualquer tecla para voltar).
            - No Campo Minado, experimente digitar "xyzzy" + Enter durante a partida.
            - Ative "Exibir arquivos ocultos" no Explorador de Arquivos para ver C:\PEDROOS.
            """;

        var creditsContent =
            """
            PEDROOS 95 — CRÉDITOS E LICENÇAS DE TERCEIROS
            =============================================
            - 98.css (Licença MIT, Copyright (c) 2020 Jordan Scales)
            - interact.js (Licença MIT, Copyright (c) Taye Adeyemi)
            - Pixelarticons (Licença MIT, Copyright (c) Gerrit Halfmann)
            - Ícones de desktop e aplicativos: pixel art 16x16/32x32/48x48
              original gerada especificamente para o PedroOS 95 seguindo a
              paleta clássica de 16 cores do PedroOS 95.
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
                .. SecretFiles.Create(),
                new VirtualNode
                {
                    Id = "dir-aboutme",
                    Name = "SobreMim",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\SobreMim",
                    Icon = "folder",
                    Description = "Apresentação e instruções de uso do PedroOS 95",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-readme",
                            Name = "Leia-me.txt",
                            Type = VirtualNodeType.Text,
                            Path = @"C:\SobreMim\Leia-me.txt",
                            Icon = "text",
                            Size = "2 KB",
                            Description = "Instruções de navegação e apresentação do PedroOS 95",
                            Content = readmeContent,
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "notepad",
                                Args = new Dictionary<string, string> { ["path"] = @"C:\SobreMim\Leia-me.txt" },
                            },
                        },
                    ],
                },
                new VirtualNode
                {
                    Id = "dir-projects",
                    Name = "Projetos",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Projetos",
                    Icon = "projects",
                    Description = "Projetos de software de Pedro Tunin",
                    Action = new FileAction { Kind = "navigate" },
                    Children = projectNodes,
                },
                new VirtualNode
                {
                    Id = "dir-experience",
                    Name = "Experiencia",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Experiencia",
                    Icon = "folder",
                    Description = "Histórico e trajetória profissional",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-career",
                            Name = "Carreira.doc",
                            Type = VirtualNodeType.Document,
                            Path = @"C:\Experiencia\Carreira.doc",
                            Icon = "doc",
                            Size = "28 KB",
                            Description = "Histórico profissional e experiências (Editor de Documentos)",
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
                    Name = "Habilidades",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Habilidades",
                    Icon = "folder",
                    Description = "Drivers e módulos de competências técnicas",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-skill-dev",
                            Name = "Desenvolvimento.sys",
                            Type = VirtualNodeType.SystemFile,
                            Path = @"C:\Habilidades\Desenvolvimento.sys",
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
                            Path = @"C:\Habilidades\DevOps.sys",
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
                            Name = "InteligenciaArtificial.sys",
                            Type = VirtualNodeType.SystemFile,
                            Path = @"C:\Habilidades\InteligenciaArtificial.sys",
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
                    Name = "Documentos",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Documentos",
                    Icon = "folder",
                    Description = "Documentos e currículo profissional",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode
                        {
                            Id = "file-resume",
                            Name = "Curriculo.doc",
                            Type = VirtualNodeType.Document,
                            Path = @"C:\Documentos\Curriculo.doc",
                            Icon = "resume",
                            Size = "36 KB",
                            Description = "Currículo completo de Pedro Tunin no Editor de Documentos",
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
                                Kind = "open-app",
                                AppId = "github",
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
                    Name = "Jogos",
                    Type = VirtualNodeType.Folder,
                    Path = @"C:\Jogos",
                    Icon = "folder",
                    Description = "Jogos clássicos do sistema",
                    Action = new FileAction { Kind = "navigate" },
                    Children =
                    [
                        new VirtualNode { Id = "file-skifree", Name = "SkiFree.exe", Path = @"C:\Jogos\SkiFree.exe", Type = VirtualNodeType.Application,
                            Icon = "skifree", Description = "Esqui clássico com mouse, teclado ou toque", Action = new FileAction { Kind = "open-app", AppId = "skifree" } },
                        new VirtualNode { Id = "file-opentyrian", Name = "OpenTyrian.exe", Path = @"C:\Jogos\OpenTyrian.exe", Type = VirtualNodeType.Application,
                            Icon = "opentyrian", Description = "Tyrian — nave de tiro arcade clássica", Action = new FileAction { Kind = "open-app", AppId = "opentyrian" } },
                        new VirtualNode { Id = "file-omf2097", Name = "OneMustFall2097.exe", Path = @"C:\Jogos\OneMustFall2097.exe", Type = VirtualNodeType.Application,
                            Icon = "omf2097", Description = "One Must Fall 2097 — luta clássica de robôs", Action = new FileAction { Kind = "open-app", AppId = "omf2097" } },
                        new VirtualNode
                        {
                            Id = "file-doom",
                            Name = "Doom.exe",
                            Type = VirtualNodeType.Application,
                            Path = @"C:\Jogos\Doom.exe",
                            Icon = "gamepad",
                            Description = "Chocolate Doom com Freedoom e opção de IWAD local",
                            Action = new FileAction { Kind = "open-app", AppId = "doom" },
                        },
                        new VirtualNode
                        {
                            Id = "file-minesweeper",
                            Name = "CampoMinado.exe",
                            Type = VirtualNodeType.Application,
                            Path = @"C:\Jogos\CampoMinado.exe",
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
                            Name = "Creditos.txt",
                            Type = VirtualNodeType.Text,
                            Path = @"C:\PEDROOS\Creditos.txt",
                            Icon = "text",
                            Hidden = true,
                            Size = "1 KB",
                            Description = "Créditos e atribuições de código aberto",
                            Content = creditsContent,
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "notepad",
                                Args = new Dictionary<string, string> { ["path"] = @"C:\PEDROOS\Creditos.txt" },
                            },
                        },
                        new VirtualNode
                        {
                            Id = "file-secret",
                            Name = "Segredos.txt",
                            Type = VirtualNodeType.Text,
                            Path = @"C:\PEDROOS\Segredos.txt",
                            Icon = "text",
                            Hidden = true,
                            Size = "1 KB",
                            Description = "Segredos do PedroOS 95",
                            Content = "Segredos desbloqueados:\n1. Iniciar > Executar > digite 'bsod' para acionar a tela azul segura.\n2. No Navegador PedroOS, navegue para 'about:mozilla' ou 'pedroos://credits'.\n3. No Campo Minado, digite 'xyzzy' + Enter para ativar o radar de pixel no canto superior esquerdo.",
                            Action = new FileAction
                            {
                                Kind = "open-app",
                                AppId = "notepad",
                                Args = new Dictionary<string, string> { ["path"] = @"C:\PEDROOS\Segredos.txt" },
                            },
                        },
                    ],
                },
            ],
        };
    }
}
