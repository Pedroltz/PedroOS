using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.UI.Menus
{
    public class CharacterCreationMenu
    {
        private readonly IUIService _uiService;
        private readonly IPlayerSaveService _playerSaveService;
        private readonly IGameConfigService _configService;
        
        private readonly AttributeInfo[] _attributeData;

        public CharacterCreationMenu(IUIService uiService, IPlayerSaveService playerSaveService, IGameConfigService configService)
        {
            _uiService = uiService;
            _playerSaveService = playerSaveService;
            _configService = configService;
            
            _attributeData = new AttributeInfo[]
            {
                new("Saúde", "Resistência física e vitalidade", "A Saúde determina sua resistência a danos físicos e doenças. Valores mais altos permitem sobreviver a situações perigosas e se recuperar mais rapidamente de ferimentos."),
                new("Psicologia", "Estabilidade mental e sanidade", "A Psicologia representa sua estabilidade mental e resistência a eventos traumáticos. Mantém você focado em situações de estresse e evita colapsos mentais."),
                new("Força", "Poder físico e resistência", "A Força afeta sua capacidade de combate corpo a corpo, carregar objetos pesados e realizar ações que exigem poder físico bruto."),
                new("Inteligência", "Capacidade analítica e hacking", "A Inteligência determina sua habilidade de hackear sistemas, resolver quebra-cabeças complexos e compreender tecnologias avançadas."),
                new("Conversação", "Habilidade social e persuasão", "A Conversação afeta sua capacidade de persuadir, negociar e obter informações de outros personagens através do diálogo.")
            };
        }

        public void ShowCharacterCreation()
        {
            // Configure name with enhanced UI
            ShowCharacterNameConfiguration();
            
            // Reset attributes to base values
            _playerSaveService.PlayerSave.Character.Attributes.Saude = 50;
            _playerSaveService.PlayerSave.Character.Attributes.Psicologia = 50;
            _playerSaveService.PlayerSave.Character.Attributes.MaxSaude = 50;
            _playerSaveService.PlayerSave.Character.Attributes.MaxPsicologia = 50;
            _playerSaveService.PlayerSave.Character.Attributes.Forca = 50;
            _playerSaveService.PlayerSave.Character.Attributes.Inteligencia = 50;
            _playerSaveService.PlayerSave.Character.Attributes.Conversacao = 50;
            _playerSaveService.PlayerSave.Character.Attributes.PointsToDistribute = 50;
            
            ShowAttributeDistributionInterface();
            
            while (true)
            {
                _uiService.ClearScreen();
                ShowFinalAttributeStatus();
                Console.WriteLine();
                
                // Corporate confirmation message with options
                Console.WriteLine();
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════╗");
                Console.Write("║ ");
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                Console.Write("                  CONFIRMAÇÃO DE CONTRATO                             ");
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("║");
                Console.WriteLine("╠═══════════════════════════════════════════════════════════════════════╣");
                Console.Write("║ ");
                Console.ForegroundColor = ConsoleColor.Gray;
                Console.Write("Revisão completa. Aguardando confirmação para finalização do processo.");
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("║");
                Console.WriteLine("╠═══════════════════════════════════════════════════════════════════════╣");
                Console.Write("║ ");
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.HighlightedText);
                Console.Write("► [ENTER] Assinar contrato e iniciar operações");
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("                        ║");
                Console.Write("║ ");
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Options);
                Console.Write("► [ESC] Solicitar reajuste de perfil");
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("                                  ║");
                Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════╝");
                Console.ResetColor();
                
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
                    case ConsoleKey.Enter:
                        // Definir valores máximos baseados nos pontos distribuídos
                        _playerSaveService.PlayerSave.Character.Attributes.MaxSaude = _playerSaveService.PlayerSave.Character.Attributes.Saude;
                        _playerSaveService.PlayerSave.Character.Attributes.MaxPsicologia = _playerSaveService.PlayerSave.Character.Attributes.Psicologia;
                        _playerSaveService.SaveGame();
                        return;
                    case ConsoleKey.Escape:
                        // Return to attribute distribution
                        ShowAttributeDistributionInterface();
                        break;
                }
            }
        }

        private void ShowCharacterNameConfiguration()
        {
            string currentName = _playerSaveService.PlayerSave.Character.Name;
            string newName = "";
            bool namingComplete = false;
            
            while (!namingComplete)
            {
                _uiService.ClearScreen();
                DisplayNameConfigurationInterface(newName, currentName);
                
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
                    case ConsoleKey.Enter:
                        if (IsValidName(newName))
                        {
                            _playerSaveService.PlayerSave.Character.Name = newName;
                            namingComplete = true;
                        }
                        break;
                    case ConsoleKey.Backspace:
                        if (newName.Length > 0)
                        {
                            newName = newName.Substring(0, newName.Length - 1);
                        }
                        break;
                    case ConsoleKey.Escape:
                        newName = currentName;
                        _playerSaveService.PlayerSave.Character.Name = newName;
                        namingComplete = true;
                        break;
                    default:
                        if (char.IsLetterOrDigit(keyInfo.KeyChar))
                        {
                            if (newName.Length < 12)
                            {
                                newName += keyInfo.KeyChar;
                            }
                        }
                        break;
                }
            }
        }
        
        private void DisplayNameConfigurationInterface(string currentInput, string originalName)
        {
            // Header with cyberpunk styling
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════════════╗");
            Console.Write("║");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("                          CONFIGURAÇÃO DE IDENTIDADE                           ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("║");
            Console.Write("║");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("                             [ARQUIVO PESSOAL]                                 ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("║");
            Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════════════╝");
            Console.ResetColor();
            Console.WriteLine();
            
            // Agent profile creation panel
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════════════╗");
            Console.Write("║");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("                        REGISTRO DE NOVO AGENTE                                ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("║");
            Console.WriteLine("╠═══════════════════════════════════════════════════════════════════════════════╣");
            Console.ResetColor();
            
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("║ ");
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.Write("Sistema de Identificação Neural - Versão 2092.1.1                             ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("║");
            Console.Write("║ ");
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.Write("Data de Registro: 04/02/2091 14:30                                            ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("║");
            Console.ResetColor();
            
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╠═══════════════════════════════════════════════════════════════════════════════╣");
            Console.ResetColor();
            
            // Name input field with visual feedback
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("║ ");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.HighlightedText);
            Console.Write("NOME DO AGENTE: ");
            Console.ResetColor();
            
            // Input field with border
            Console.Write("[");
            Console.ForegroundColor = string.IsNullOrWhiteSpace(currentInput) ? ConsoleColor.DarkGray : _configService.GetColor(_configService.Config.Colors.HighlightedText);
            string displayText = string.IsNullOrWhiteSpace(currentInput) ? "Digite seu nome..." : currentInput;
            Console.Write(displayText.PadRight(12));
            Console.ResetColor();
            Console.Write("]                                        ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("  ║");
            Console.ResetColor();
            
            // Character count and validation feedback
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("║ ");
            Console.ResetColor();
            if (string.IsNullOrWhiteSpace(currentInput))
            {
                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.Write("Aguardando entrada...");
            }
            else if (IsValidName(currentInput))
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.Write($"✓ Nome válido ({currentInput.Length}/12 caracteres)");
            }
            else
            {
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Error);
                Console.Write($"✗ {GetNameValidationError(currentInput)} ({currentInput.Length}/12)");
            }
            Console.ResetColor();
            
            // Calculate remaining space for padding
            string statusText = string.IsNullOrWhiteSpace(currentInput) ? "Aguardando entrada..." : 
                               IsValidName(currentInput) ? $"✓ Nome válido ({currentInput.Length}/12 caracteres)" :
                               $"✗ {GetNameValidationError(currentInput)} ({currentInput.Length}/12)";
            int remainingSpace = 78 - statusText.Length;
            Console.Write(new string(' ', Math.Max(0, remainingSpace)));
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("║");
            Console.ResetColor();
            
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╠═══════════════════════════════════════════════════════════════════════════════╣");
            Console.ResetColor();
            
            // Original name display if exists
            if (!string.IsNullOrWhiteSpace(originalName) && originalName != "NovoAgente")
            {
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.Write("║ ");
                Console.ForegroundColor = ConsoleColor.Gray;
                string nameDisplay = $"Nome anterior: {originalName}";
                Console.Write(nameDisplay);
                int nameSpacing = 76 - nameDisplay.Length;
                Console.Write(new string(' ', Math.Max(0, nameSpacing)));
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine("  ║");
                Console.ResetColor();
                
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine("╠═══════════════════════════════════════════════════════════════════════════════╣");
                Console.ResetColor();
            }
            
            // Instructions panel
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("║ ");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Options);
            Console.Write("Digite o nome desejado para seu agente                                     ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("   ║");
            Console.Write("║ ");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Options);
            Console.Write("Pressione ENTER para confirmar o nome                                      ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("   ║");
            Console.Write("║ ");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Options);
            Console.Write("Use BACKSPACE para apagar caracteres                                       ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("   ║");
            Console.Write("║ ");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Options);
            Console.Write("Pressione ESC para manter o nome atual                                     ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("   ║");
            Console.ResetColor();
            
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════════════╝");
            Console.ResetColor();
            Console.WriteLine();
            
            // Status panel at bottom
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════════════╗");
            Console.Write("║");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("                          STATUS DO SISTEMA                                    ");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("║");
            Console.WriteLine("╠═══════════════════════════════════════════════════════════════════════════════╣");
            Console.ResetColor();
            
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.Write("║ ");
            Console.ResetColor();
            Console.Write("Estado: ");
            string statusValue = "";
            if (string.IsNullOrWhiteSpace(currentInput))
            {
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Error);
                statusValue = "AGUARDANDO ENTRADA";
                Console.Write(statusValue);
            }
            else if (IsValidName(currentInput))
            {
                Console.ForegroundColor = ConsoleColor.Green;
                statusValue = "PRONTO PARA CONFIRMAÇÃO";
                Console.Write(statusValue);
            }
            else
            {
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Error);
                statusValue = "ENTRADA INVÁLIDA";
                Console.Write(statusValue);
            }
            Console.ResetColor();
            
            int statusSpacing = 68 - statusValue.Length;
            Console.Write(new string(' ', Math.Max(0, statusSpacing)));
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("  ║");
            Console.ResetColor();
            
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════════════╝");
            Console.ResetColor();
        }
        
        private bool IsValidName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return false;
            if (name.Length < 2) return false;
            if (name.Length > 12) return false;
            if (name.Trim() != name) return false; // No leading/trailing spaces
            
            // Check for valid characters (only letters and numbers)
            foreach (char c in name)
            {
                if (!char.IsLetterOrDigit(c))
                {
                    return false;
                }
            }
            
            return true;
        }
        
        private string GetNameValidationError(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "Nome não pode estar vazio";
            if (name.Length < 2) return "Nome muito curto (mín. 2 caracteres)";
            if (name.Length > 12) return "Nome muito longo (máx. 12 caracteres)";
            if (name.Trim() != name) return "Remova espaços no início/fim";
            foreach (char c in name)
            {
                if (!char.IsLetterOrDigit(c))
                {
                    return "Apenas letras e números são permitidos";
                }
            }
            
            return "Nome inválido";
        }

        private void ShowAttributeDistributionInterface()
        {
            int selectedAttribute = 0;
            bool configuring = true;
            
            while (configuring)
            {
                _uiService.ClearScreen();
                
                // Enhanced header design with panels
                DisplayHeaderWithPanels(selectedAttribute);
                
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
                        selectedAttribute = selectedAttribute > 0 ? selectedAttribute - 1 : 4;
                        break;
                    case ConsoleKey.DownArrow:
                        selectedAttribute = selectedAttribute < 4 ? selectedAttribute + 1 : 0;
                        break;
                    case ConsoleKey.LeftArrow:
                        DecreaseAttribute(selectedAttribute);
                        break;
                    case ConsoleKey.RightArrow:
                        IncreaseAttribute(selectedAttribute);
                        break;
                    case ConsoleKey.Enter:
                        if (_playerSaveService.PlayerSave.Character.Attributes.PointsToDistribute == 0)
                        {
                            configuring = false;
                        }
                        break;
                    case ConsoleKey.Escape:
                        configuring = false;
                        break;
                }
            }
        }


        private void DisplayHeaderWithPanels(int selectedAttribute)
        {
            // Main title
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.WriteLine("╔════════════════════════════════════════════════╗");
            Console.WriteLine("║           DISTRIBUIÇÃO DE ATRIBUTOS            ║");
            Console.WriteLine("╚════════════════════════════════════════════════╝");
            Console.ResetColor();
            Console.WriteLine();

            // Character profile with status panel on top right
            DisplayCharacterProfileWithStatusPanel(selectedAttribute);

            // Display detailed hint for selected attribute with controls beside it
            DisplayAttributeHintWithControls(_attributeData[selectedAttribute]);
        }

        private void DisplayCharacterProfileWithStatusPanel(int selectedAttribute)
        {
            string characterName = _playerSaveService.PlayerSave.Character.Name.ToUpper();
            string agentId = $"{DateTime.Now:yyyyMMdd}-{characterName.Substring(0, Math.Min(3, characterName.Length)).ToUpper()}";

            // Linha 1: Header do perfil + Header do status
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("╔═══════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("  ┌─ STATUS DOS PONTOS ──┐");
            
            // Linha 2: Nome do agente + Pontos disponíveis
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("║ ");
            Console.ResetColor();
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.HighlightedText);
            Console.Write($"PERFIL DO AGENTE: {characterName}");
            Console.ResetColor();
            Console.Write(new string(' ', 66 - $"PERFIL DO AGENTE: {characterName}".Length));
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("║");
            Console.ResetColor();
            Console.Write("  │ ");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.HighlightedText);
            Console.Write($"Disponíveis: {_playerSaveService.PlayerSave.Character.Attributes.PointsToDistribute.ToString().PadLeft(2)}      ");
            Console.ResetColor();
            Console.WriteLine("│");
            
            // Linha 3: ID do agente + Status do sistema
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("║ ");
            Console.ResetColor();
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.Write($"ID: {agentId}");
            Console.ResetColor();
            Console.Write(new string(' ', 66 - $"ID: {agentId}".Length));
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("║");
            Console.ResetColor();
            Console.Write("  │ ");
            if (_playerSaveService.PlayerSave.Character.Attributes.PointsToDistribute > 0)
            {
                Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Error);
                Console.Write("Sistema aguardando   ");
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.Write("Perfil sincronizado  ");
            }
            Console.ResetColor();
            Console.WriteLine("│");
            
            // Linha 4: Footer do perfil + Footer do status
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("╚═══════════════════════════════════════════════════════════════════╝");
            Console.WriteLine("  └──────────────────────┘");
            Console.ResetColor();
            Console.WriteLine();

            // Display attributes
            for (int i = 0; i < _attributeData.Length; i++)
            {
                int value = GetAttributeValueByIndex(i);
                string line = i == selectedAttribute 
                    ? $"► {_attributeData[i].Name.PadRight(14)}: {value.ToString().PadLeft(2)}/100"
                    : $"  {_attributeData[i].Name.PadRight(14)}: {value.ToString().PadLeft(2)}/100";
                
                Console.ForegroundColor = i == selectedAttribute 
                    ? _configService.GetColor(_configService.Config.Colors.HighlightedText)
                    : _configService.GetColor(_configService.Config.Colors.NormalText);
                
                Console.Write(line);
                Console.ResetColor();
                Console.Write(" ");
                
                // Simple progress bar
                int filled = (int)((double)value / 100 * 20);
                double percentage = (double)value / 100;
                string classification;
                ConsoleColor barColor;
                
                (classification, barColor) = percentage switch
                {
                    <= 0.3 => ("INADEQUADO", ConsoleColor.Red),
                    <= 0.5 => ("BÁSICO", ConsoleColor.Yellow),
                    <= 0.7 => ("COMPETENTE", ConsoleColor.Green),
                    <= 0.85 => ("AVANÇADO", ConsoleColor.Cyan),
                    _ => ("EXCEPCIONAL", ConsoleColor.Magenta)
                };
                
                Console.Write("[");
                Console.ForegroundColor = barColor;
                Console.Write(new string('█', filled));
                Console.ResetColor();
                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.Write(new string('░', 20 - filled));
                Console.ResetColor();
                Console.Write("] ");
                Console.ForegroundColor = barColor;
                Console.Write($"[{classification}]");
                Console.ResetColor();
                Console.WriteLine();
            }

            Console.WriteLine();
        }

        private void DisplayAttributeHintWithControls(AttributeInfo selectedAttr)
        {
            var hintLines = new List<string>();
            var controlLines = new List<string>();

            // Build hint panel
            hintLines.Add("╔══════════════════════════════════════════════════════════════════════════════╗");
            hintLines.Add($"║ {selectedAttr.Name.ToUpper()} - {selectedAttr.Description}".PadRight(79) + "║");
            hintLines.Add("╠══════════════════════════════════════════════════════════════════════════════╣");
            
            // Word wrap the detailed info
            string detailedInfo = selectedAttr.DetailedInfo;
            var wrappedLines = WrapText(detailedInfo, 76);
            
            foreach (string wrappedLine in wrappedLines)
            {
                hintLines.Add($"║ {wrappedLine}".PadRight(79) + "║");
            }
            
            hintLines.Add("╚══════════════════════════════════════════════════════════════════════════════╝");

            // Build controls panel - positioned beside hint
            controlLines.Add("┌─── CONTROLES ─────────┐");
            controlLines.Add("│ ↑↓ Navegar atributos  │");
            controlLines.Add("│ ←→ Ajustar pontos     │");
            controlLines.Add("│ Enter Finalizar       │");
            controlLines.Add("│ Esc Cancelar          │");
            controlLines.Add("└───────────────────────┘");

            // Display hint and controls side by side
            int maxLines = Math.Max(hintLines.Count, controlLines.Count);
            for (int i = 0; i < maxLines; i++)
            {
                // Left side - hint panel
                string hintLine = i < hintLines.Count ? hintLines[i] : "";
                
                if (hintLine.StartsWith("╔") || hintLine.StartsWith("╚") || hintLine.StartsWith("╠"))
                {
                    Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                    Console.Write(hintLine.PadRight(80));
                    Console.ResetColor();
                }
                else if (hintLine.StartsWith("║"))
                {
                    Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                    Console.Write("║ ");
                    Console.ResetColor();
                    
                    string content = hintLine.Substring(2).TrimEnd('║').Trim();
                    if (content.Contains(" - "))
                    {
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.HighlightedText);
                    }
                    else
                    {
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.NormalText);
                    }
                    Console.Write(content.PadRight(76));
                    Console.ResetColor();
                    
                    Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                    Console.Write(" ║");
                    Console.ResetColor();
                }
                else
                {
                    Console.Write(hintLine.PadRight(80));
                }

                // Right side - controls panel
                string controlLine = i < controlLines.Count ? controlLines[i] : "";
                if (!string.IsNullOrEmpty(controlLine))
                {
                    Console.Write(" "); // Space between panels
                    
                    if (controlLine.Contains("CONTROLES") || controlLine.StartsWith("┌") || controlLine.StartsWith("└"))
                    {
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                        Console.WriteLine(controlLine);
                        Console.ResetColor();
                    }
                    else if (controlLine.StartsWith("│ ") && (controlLine.Contains("↑↓") || controlLine.Contains("←→") || controlLine.Contains("Enter") || controlLine.Contains("Esc")))
                    {
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                        Console.Write("│ ");
                        Console.ResetColor();
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Options);
                        Console.Write(controlLine.Substring(2, controlLine.Length - 3));
                        Console.ResetColor();
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                        Console.WriteLine("│");
                        Console.ResetColor();
                    }
                    else
                    {
                        Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
                        Console.WriteLine(controlLine);
                        Console.ResetColor();
                    }
                }
                else
                {
                    Console.WriteLine();
                }
            }
        }


        private List<string> WrapText(string text, int maxWidth)
        {
            var lines = new List<string>();
            var words = text.Split(' ');
            var currentLine = "";

            foreach (string word in words)
            {
                if (currentLine.Length + word.Length + 1 <= maxWidth)
                {
                    if (currentLine.Length > 0)
                        currentLine += " ";
                    currentLine += word;
                }
                else
                {
                    if (currentLine.Length > 0)
                    {
                        lines.Add(currentLine);
                        currentLine = word;
                    }
                    else
                    {
                        lines.Add(word);
                    }
                }
            }

            if (currentLine.Length > 0)
                lines.Add(currentLine);

            return lines;
        }


        private void IncreaseAttribute(int attributeIndex)
        {
            if (_playerSaveService.PlayerSave.Character.Attributes.PointsToDistribute <= 0) return;
            
            int currentValue = GetAttributeValueByIndex(attributeIndex);
            if (currentValue >= 100) return;
            
            SetAttributeValueByIndex(attributeIndex, currentValue + 1);
            _playerSaveService.PlayerSave.Character.Attributes.PointsToDistribute--;
        }
        
        private void DecreaseAttribute(int attributeIndex)
        {
            int currentValue = GetAttributeValueByIndex(attributeIndex);
            if (currentValue <= 50) return;
            
            SetAttributeValueByIndex(attributeIndex, currentValue - 1);
            _playerSaveService.PlayerSave.Character.Attributes.PointsToDistribute++;
        }

        private int GetAttributeValueByIndex(int index)
        {
            var attrs = _playerSaveService.PlayerSave.Character.Attributes;
            return index switch
            {
                0 => attrs.Saude,
                1 => attrs.Psicologia,
                2 => attrs.Forca,
                3 => attrs.Inteligencia,
                4 => attrs.Conversacao,
                _ => 50
            };
        }
        
        private void SetAttributeValueByIndex(int index, int value)
        {
            var attrs = _playerSaveService.PlayerSave.Character.Attributes;
            switch (index)
            {
                case 0: attrs.Saude = value; break;
                case 1: attrs.Psicologia = value; break;
                case 2: attrs.Forca = value; break;
                case 3: attrs.Inteligencia = value; break;
                case 4: attrs.Conversacao = value; break;
            }
        }

        private void ShowFinalAttributeStatus()
        {
            string characterName = _playerSaveService.PlayerSave.Character.Name;
            string contractId = $"CT-{DateTime.Now:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
            
            // Corporate contract header
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════╗");
            Console.Write("║");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("                    CONTRATO CORPORATIVO                               ");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("║");
            Console.Write("║ ");
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.Title);
            Console.Write("                   AVALIAÇÃO PSICOMÉTRICA                             ");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("║");
            Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════╝");
            Console.ResetColor();
            
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.WriteLine($"ID: {contractId}  |  Agente: {characterName}  |  Status: APROVADO");
            Console.ResetColor();
            Console.WriteLine();
            
            // Attributes with enhanced but compact styling
            var attributes = new[]
            {
                ("RESISTÊNCIA FÍSICA", _playerSaveService.PlayerSave.Character.Attributes.Saude),
                ("ESTABILIDADE MENTAL", _playerSaveService.PlayerSave.Character.Attributes.Psicologia),
                ("FORÇA BRUTA", _playerSaveService.PlayerSave.Character.Attributes.Forca),
                ("APTIDÃO TÉCNICA", _playerSaveService.PlayerSave.Character.Attributes.Inteligencia),
                ("COMUNICAÇÃO", _playerSaveService.PlayerSave.Character.Attributes.Conversacao)
            };
            
            foreach (var (name, value) in attributes)
            {
                DisplayEnhancedAttribute(name, value);
            }
            
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════╗");
            Console.Write("║ ");
            Console.ForegroundColor = ConsoleColor.Green;
            Console.Write("✓ CANDIDATO APROVADO PARA OPERAÇÕES CORPORATIVAS");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("                      ║");
            Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════╝");
            Console.ResetColor();
        }
        
        private void DisplayEnhancedAttribute(string name, int value)
        {
            // Enhanced attribute display with classification
            Console.ForegroundColor = _configService.GetColor(_configService.Config.Colors.HighlightedText);
            Console.Write($"{name.PadRight(18)}: ");
            Console.ResetColor();
            
            // Classification and color
            double percentage = (double)value / 100;
            string classification;
            ConsoleColor classColor;
            
            (classification, classColor) = percentage switch
            {
                <= 0.3 => ("INADEQUADO", ConsoleColor.Red),
                <= 0.5 => ("BÁSICO", ConsoleColor.Yellow),
                <= 0.7 => ("COMPETENTE", ConsoleColor.Green),
                <= 0.85 => ("AVANÇADO", ConsoleColor.Cyan),
                _ => ("EXCEPCIONAL", ConsoleColor.Magenta)
            };
            
            // Score and classification
            Console.ForegroundColor = ConsoleColor.White;
            Console.Write($"{value}/100 ");
            Console.ResetColor();
            Console.Write("(");
            Console.ForegroundColor = classColor;
            Console.Write(classification);
            Console.ResetColor();
            Console.Write(")");
            
            // Progress bar
            Console.Write(" [");
            int segments = (int)(percentage * 15);
            Console.ForegroundColor = classColor;
            Console.Write(new string('▓', segments));
            Console.ResetColor();
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write(new string('░', 15 - segments));
            Console.ResetColor();
            Console.WriteLine("]");
        }
    }
    
    public record AttributeInfo(string Name, string Description, string DetailedInfo);
}