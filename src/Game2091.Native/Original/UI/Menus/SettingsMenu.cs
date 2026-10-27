using RetroGame2091.Core.Interfaces;

namespace RetroGame2091.UI.Menus
{
    public class SettingsMenu
    {
        private readonly IUIService _uiService;
        private readonly IPlayerSaveService _playerSaveService;
        private readonly IGameConfigService _configService;

        public SettingsMenu(IUIService uiService, IPlayerSaveService playerSaveService, IGameConfigService configService)
        {
            _uiService = uiService;
            _playerSaveService = playerSaveService;
            _configService = configService;
        }

        public void ShowSettings()
        {
            bool returnToMenu = false;
            
            while (!returnToMenu)
            {
                string[] settingsOptions = {
                    $"Nome do Protagonista: {_playerSaveService.PlayerSave.Character.Name}",
                    "Ver Atributos do Personagem",
                    $"Cor do Título: {_configService.Config.Colors.Title}",
                    $"Cor do Texto: {_configService.Config.Colors.NormalText}",
                    $"Velocidade do Texto: {_configService.Config.Settings.TextSpeed}ms",
                    $"Mostrar Dicas: {(_configService.Config.Settings.ShowHints ? "Ativado" : "Desativado")}",
                    "Voltar ao Menu Principal"
                };

                int choice = _uiService.ShowMenu("╔═══════════════════════════════════╗\n║          CONFIGURAÇÕES            ║\n╚═══════════════════════════════════╝", settingsOptions);
                
                switch (choice)
                {
                    case 0:
                        ChangeProtagonistName();
                        break;
                    case 1:
                        ViewCharacterAttributes();
                        break;
                    case 2:
                        ChangeColor("title");
                        break;
                    case 3:
                        ChangeColor("normal text");
                        break;
                    case 4:
                        ChangeTextSpeed();
                        break;
                    case 5:
                        ToggleHints();
                        break;
                    case 6:
                    case -1: // Escape
                        returnToMenu = true;
                        _configService.SaveConfig();
                        _playerSaveService.SaveGame();
                        break;
                }
            }
        }

        private void ChangeProtagonistName()
        {
            string newName = _uiService.GetUserInput("Digite o novo nome do protagonista:", _playerSaveService.PlayerSave.Character.Name);
            
            if (!string.IsNullOrWhiteSpace(newName) && newName != _playerSaveService.PlayerSave.Character.Name)
            {
                _playerSaveService.UpdateCharacterName(newName);
                _uiService.ClearScreen();
                _uiService.WriteWithColor($"Nome alterado para: {_playerSaveService.PlayerSave.Character.Name}", _configService.Config.Colors.HighlightedText);
            }
            else
            {
                _uiService.ClearScreen();
                _uiService.WriteWithColor("Nome não alterado.", _configService.Config.Colors.NormalText);
            }
            
            Thread.Sleep(1500);
        }

        private void ViewCharacterAttributes()
        {
            _uiService.ClearScreen();
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.WriteLine($"═══ ATRIBUTOS DE {_playerSaveService.PlayerSave.Character.Name.ToUpper()} ═══");
            Console.ResetColor();
            Console.WriteLine();
            
            _uiService.WriteWithColor($"💚 Saúde: {_playerSaveService.PlayerSave.Character.Attributes.Saude}/{_playerSaveService.PlayerSave.Character.Attributes.MaxSaude} (Pontos de Vida)", _configService.Config.Colors.HighlightedText);
            _uiService.WriteWithColor($"🧠 Psicologia: {_playerSaveService.PlayerSave.Character.Attributes.Psicologia}/{_playerSaveService.PlayerSave.Character.Attributes.MaxPsicologia} (Pontos de Sanidade)", _configService.Config.Colors.HighlightedText);
            _uiService.WriteWithColor($"💪 Força: {_playerSaveService.PlayerSave.Character.Attributes.Forca}/100 (Pontos de Força)", _configService.Config.Colors.HighlightedText);
            _uiService.WriteWithColor($"🧮 Inteligência: {_playerSaveService.PlayerSave.Character.Attributes.Inteligencia}/100 (Capacidade de Hackear)", _configService.Config.Colors.HighlightedText);
            
            Console.WriteLine();
            _uiService.WriteWithColor("═══════ DESCRIÇÃO DOS ATRIBUTOS ═══════", _configService.Config.Colors.Title);
            _uiService.WriteWithColor("• Saúde: Determina sua resistência física e pontos de vida", _configService.Config.Colors.NormalText);
            _uiService.WriteWithColor("• Psicologia: Sua estabilidade mental e resistência a eventos traumáticos", _configService.Config.Colors.NormalText);
            _uiService.WriteWithColor("• Força: Sua capacidade física para ações que exigem poder", _configService.Config.Colors.NormalText);
            _uiService.WriteWithColor("• Inteligência: Sua habilidade para hackear sistemas e resolver problemas técnicos", _configService.Config.Colors.NormalText);
            
            Console.WriteLine();
            _uiService.WriteWithColor("Pressione qualquer tecla para voltar...", _configService.Config.Colors.NormalText);
            try
            {
                Console.ReadKey();
            }
            catch (InvalidOperationException)
            {
                Console.Read();
            }
        }

        private void ChangeColor(string colorType)
        {
            string[] colors = { "Black", "Blue", "Cyan", "DarkBlue", "DarkCyan", "DarkGray", "DarkGreen", 
                              "DarkMagenta", "DarkRed", "DarkYellow", "Gray", "Green", "Magenta", "Red", "White", "Yellow" };
            
            string currentColor = colorType == "title" ? _configService.Config.Colors.Title : _configService.Config.Colors.NormalText;
            int currentIndex = Array.IndexOf(colors, currentColor);
            if (currentIndex == -1) currentIndex = 0;
            
            while (true)
            {
                _uiService.ClearScreen();
                
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                Console.WriteLine("╔══════════════════════════════════════════════╗");
                string title = $"SELEÇÃO DE COR - {colorType.ToUpper()}";
                string paddedTitle = title.PadLeft((46 + title.Length) / 2).PadRight(46);
                Console.WriteLine($"║{paddedTitle}║");
                Console.WriteLine("╚══════════════════════════════════════════════╝");
                Console.ResetColor();
                Console.WriteLine();
                
                _uiService.WriteWithColor($"Cores disponíveis para {colorType}:", _configService.Config.Colors.NormalText);
                Console.WriteLine();
                
                for (int i = 0; i < colors.Length; i++)
                {
                    if (i == currentIndex)
                    {
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.HighlightedText);
                        Console.Write("► ");
                        Console.ForegroundColor = _configService.GetColor(colors[i]);
                        Console.WriteLine($"{colors[i]}");
                        Console.ResetColor();
                    }
                    else
                    {
                        Console.Write("  ");
                        Console.ForegroundColor = _configService.GetColor(colors[i]);
                        Console.WriteLine($"{colors[i]}");
                        Console.ResetColor();
                    }
                }
                
                Console.WriteLine();
                if (_configService.Config.Settings.ShowHints)
                {
                    _uiService.WriteWithColor("Use ↑↓ para navegar, Enter para selecionar, Escape para cancelar", _configService.Config.Colors.NormalText);
                }
                
                ConsoleKeyInfo keyInfo;
                try
                {
                    keyInfo = Console.ReadKey(true);
                }
                catch (InvalidOperationException)
                {
                    keyInfo = new ConsoleKeyInfo('\r', ConsoleKey.Enter, false, false, false);
                }
                
                switch (keyInfo.Key)
                {
                    case ConsoleKey.UpArrow:
                        currentIndex = currentIndex > 0 ? currentIndex - 1 : colors.Length - 1;
                        break;
                    case ConsoleKey.DownArrow:
                        currentIndex = currentIndex < colors.Length - 1 ? currentIndex + 1 : 0;
                        break;
                    case ConsoleKey.Enter:
                        if (colorType == "title")
                            _configService.Config.Colors.Title = colors[currentIndex];
                        else
                            _configService.Config.Colors.NormalText = colors[currentIndex];
                            
                        _uiService.WriteWithColor($"Cor do {colorType} alterada para: {colors[currentIndex]}", _configService.Config.Colors.HighlightedText);
                        Thread.Sleep(1500);
                        return;
                    case ConsoleKey.Escape:
                        return;
                }
            }
        }

        private void ChangeTextSpeed()
        {
            Console.WriteLine();
            _uiService.WriteWithColor("Digite a nova velocidade do texto (em ms, recomendado: 30-100): ", _configService.Config.Colors.NormalText);
            
            if (int.TryParse(Console.ReadLine(), out int velocidade) && velocidade >= 0 && velocidade <= 500)
            {
                _configService.Config.Settings.TextSpeed = velocidade;
                _uiService.WriteWithColor($"Velocidade alterada para: {velocidade}ms", _configService.Config.Colors.HighlightedText);
            }
            else
            {
                _uiService.WriteWithColor("Velocidade inválida! Use um valor entre 0 e 500.", _configService.Config.Colors.Error);
            }
            
            Thread.Sleep(1500);
        }

        private void ToggleHints()
        {
            _configService.Config.Settings.ShowHints = !_configService.Config.Settings.ShowHints;
            string status = _configService.Config.Settings.ShowHints ? "ativadas" : "desativadas";
            _uiService.WriteWithColor($"Dicas {status}!", _configService.Config.Colors.HighlightedText);
            Thread.Sleep(1500);
        }
    }
}