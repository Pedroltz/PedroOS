using PedroOS.Web.Models;

namespace PedroOS.Web.Services;

internal static class SecretFiles
{
    public static IReadOnlyList<VirtualNode> Create() =>
    [
        Folder(@"C:\Lixeira", "recycle-bin", false,
            Text(@"C:\Lixeira\curriculo_final_FINAL.txt", "VERSÃO DEFINITIVA (7)\n\nHabilidades: renomear arquivos até resolver o problema.\nEste rascunho é uma brincadeira; o currículo de verdade está em Documentos."),
            Text(@"C:\Lixeira\ideias_descartadas.txt", "IDEIAS PARA ECONOMIZAR MEMÓRIA\n\n[descartada] Abrir só mais uma aba.\n[descartada] Colocar o servidor dentro de uma geladeira.\n[aprovada] Deixar o navegador do visitante trabalhar."),
            Text(@"C:\Lixeira\nao_apagar.txt", "Se alguém perguntar, esta pasta nunca existiu.\n\nNo Explorador: Exibir > Exibir arquivos ocultos.\nDepois dê uma olhada na raiz C:\\ e procure Segredos.\n\nPS: quem joga fora uma pista dentro da Lixeira?")),
        Folder(@"C:\Segredos", "folder", true,
            Text(@"C:\Segredos\Leia-me.txt", "Você achou. O departamento de esconder pastas está decepcionado.\n\nO disquete aqui ao lado ainda funciona. Abra-o: alguém deixou um jogo de luta lá dentro.\n\nO arquivo Arcade.theme também pode mudar o clima deste computador.\nTudo é temporário: ao recarregar a página, os segredos se escondem de novo."),
            Text(@"C:\Segredos\Sequencia.txt", "TESTE DO CONTROLE — 1995\n\n↑ ↑ ↓ ↓ ← → ← → B A\n\nClique em uma área vazia do desktop e digite a sequência.\nNão funciona dentro de caixas de texto.\n\nSem teclado? Abra Arcade.theme nesta pasta."),
            new VirtualNode { Id = "secret-theme", Name = "Arcade.theme", Path = @"C:\Segredos\Arcade.theme",
                Type = VirtualNodeType.SystemFile, Icon = "display", Description = "Uma configuração de vídeo esquecida",
                Action = new FileAction { Kind = "unlock-secret" } },
            Folder(@"C:\Segredos\Disquete", "floppy", false,
                new VirtualNode { Id = "secret-neon-fist", Name = "NeonFist.exe", Path = @"C:\Segredos\Disquete\NeonFist.exe",
                    Type = VirtualNodeType.Application, Icon = "gamepad", Description = "Neon Fist — luta arcade contra CPU",
                    Action = new FileAction { Kind = "open-app", AppId = "neon-fist" } },
                Text(@"C:\Segredos\Disquete\Controles.txt", "NEON FIST\n\nA/D: mover · W: pular · S: agachar\nJ: soco · K: chute · L: defender\nP: pausar · Enter: revanche após a luta\nNo celular, use os controles de toque.\n\nO adversário é a CPU do seu navegador. Minimize a janela para pausar."),
                Text(@"C:\Segredos\Disquete\Creditos.txt", "NEON FIST\nCopyright (c) 2026 Rutu (developerrutu). Licença MIT.\nhttps://github.com/developerrutu/neon-fist\n\nAdaptação PedroOS: modo local contra CPU, sem telemetria ou serviços online.\nLicença completa e registro da versão: assets/games/neon-fist/LICENSE.txt e UPSTREAM.md.\n\nO disquete é virtual. Ninguém precisou assoprar os contatos.")))
    ];

    private static VirtualNode Folder(string path, string icon, bool hidden, params VirtualNode[] children) => new()
    {
        Id = "secret-dir-" + path.Replace('\\', '-').Replace(':', '-').ToLowerInvariant(),
        Name = path[(path.LastIndexOf('\\') + 1)..], Path = path, Type = VirtualNodeType.Folder,
        Icon = icon, Hidden = hidden, Children = children, Action = new FileAction { Kind = "navigate" },
    };

    private static VirtualNode Text(string path, string content) => new()
    {
        Id = "secret-text-" + path.Replace('\\', '-').Replace(':', '-').ToLowerInvariant(),
        Name = path[(path.LastIndexOf('\\') + 1)..], Path = path, Type = VirtualNodeType.Text,
        Icon = "text", Size = "1 KB", Content = content,
        Action = new FileAction { Kind = "open-app", AppId = "notepad", Args = new Dictionary<string, string> { ["path"] = path } },
    };
}
