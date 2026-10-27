using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.UI.Components
{
    public class ChatUIService : IChatUIService
    {
        private readonly IUIService _uiService;
        private readonly IGameConfigService _configService;
        private readonly IChatService _chatService;
        private readonly INPCService _npcService;
        private readonly IDeepSeekService _deepSeekService;
        private readonly IPlayerSaveService _playerSaveService;

        private int _typingLine = -1;
        private const int BOX_WIDTH = 70;

        public ChatUIService(
            IUIService uiService,
            IGameConfigService configService,
            IChatService chatService,
            INPCService npcService,
            IDeepSeekService deepSeekService,
            IPlayerSaveService playerSaveService)
        {
            _uiService = uiService;
            _configService = configService;
            _chatService = chatService;
            _npcService = npcService;
            _deepSeekService = deepSeekService;
            _playerSaveService = playerSaveService;
        }

        public async Task ShowChatInterface(string npcId)
        {
            // Check if API is configured
            if (!_deepSeekService.IsConfigured())
            {
                ShowErrorBox("SISTEMA DE CHAT NÃO CONFIGURADO",
                    new[] {
                        "A chave de API não foi encontrada.",
                        "",
                        "Para usar o sistema de conversação com NPCs:",
                        "1. Abra o arquivo Config/api-keys.json",
                        "2. Adicione sua chave DeepSeek API",
                        "3. Reinicie o jogo"
                    });
                _uiService.SafeReadKey();
                return;
            }

            var npc = _npcService.LoadNPC(npcId);
            if (npc == null)
            {
                ShowErrorBox("NPC NÃO ENCONTRADO",
                    new[] { $"O NPC '{npcId}' não existe ou não pôde ser carregado." });
                Thread.Sleep(2000);
                return;
            }

            _uiService.ClearScreen();

            // Show NPC introduction
            ShowNPCIntroduction(npc);

            // Get or create session
            var session = _chatService.GetChatSession(npcId);

            // Show conversation history if exists
            if (session != null && session.Messages.Count > 0)
            {
                ShowSystemMessage("Retomando conversa anterior...");
                Thread.Sleep(800);

                // Show last 6 messages as context
                var recentMessages = session.Messages.TakeLast(6);
                foreach (var msg in recentMessages)
                {
                    ShowChatMessage(
                        msg.Role == "assistant" ? npc.Name : _playerSaveService.PlayerSave.Character.Name,
                        msg.Content,
                        msg.Role == "assistant"
                    );
                }
            }
            else
            {
                // Start new conversation
                ShowTypingIndicator();
                var greeting = await _chatService.StartChatSession(npcId);
                HideTypingIndicator();

                if (greeting != null)
                {
                    ShowChatMessage(npc.Name, greeting, true);
                    session = _chatService.GetChatSession(npcId);
                }
                else
                {
                    ShowErrorBox("ERRO DE CONEXÃO",
                        new[] { "Não foi possível iniciar a conversa.", "Verifique sua conexão e tente novamente." });
                    Thread.Sleep(2000);
                    return;
                }
            }

            // Main conversation loop
            bool chatActive = true;
            while (chatActive && session != null)
            {
                // Save cursor position before showing input prompt
                int promptStartLine = Console.CursorTop;

                ShowInputPrompt(npc.Name, session.MessageCount, npc.ImpatienceThreshold);

                Console.ForegroundColor = ConsoleColor.White;
                Console.Write("  > ");
                string? userInput = Console.ReadLine();
                Console.ResetColor();

                if (string.IsNullOrWhiteSpace(userInput))
                {
                    // Clear the empty prompt and continue
                    ClearLinesFrom(promptStartLine);
                    continue;
                }

                userInput = userInput.Trim();

                // Clear the input prompt area (status bar + "Sua mensagem:" + user input line)
                ClearLinesFrom(promptStartLine);

                if (userInput.Equals("sair", StringComparison.OrdinalIgnoreCase) ||
                    userInput.Equals("exit", StringComparison.OrdinalIgnoreCase) ||
                    userInput.Equals("tchau", StringComparison.OrdinalIgnoreCase))
                {
                    ShowFarewellMessage(npc.Name, _playerSaveService.PlayerSave.Character.Name);
                    session.IsActive = false;
                    _chatService.SaveChatHistory(npcId, session);
                    Thread.Sleep(1500);
                    break;
                }

                // Add user message to session
                session.Messages.Add(new ChatMessage
                {
                    Role = "user",
                    Content = userInput
                });
                session.MessageCount++;

                // Show user message (formatted nicely)
                ShowChatMessage(_playerSaveService.PlayerSave.Character.Name, userInput, false);

                // Get NPC response
                ShowTypingIndicator();
                var player = _playerSaveService.PlayerSave.Character;
                string systemPrompt = _chatService.BuildSystemPrompt(npc, player, session.MessageCount);
                var response = await _deepSeekService.SendMessageAsync(session.Messages, systemPrompt);
                HideTypingIndicator();

                if (response != null)
                {
                    session.Messages.Add(new ChatMessage
                    {
                        Role = "assistant",
                        Content = response
                    });
                    session.MessageCount++;

                    ShowChatMessage(npc.Name, response, true);

                    // Save after each exchange
                    _chatService.SaveChatHistory(npcId, session);

                    // Check if NPC wants to end (impatience threshold + buffer)
                    if (session.MessageCount >= npc.ImpatienceThreshold + 5)
                    {
                        ShowSystemMessage($"{npc.Name} parece estar ocupado e encerra a conversa educadamente.");
                        session.IsActive = false;
                        _chatService.SaveChatHistory(npcId, session);
                        Thread.Sleep(2000);
                        break;
                    }
                }
                else
                {
                    ShowSystemMessage("Erro de conexão. Tente novamente ou digite 'sair'.", ConsoleColor.Red);
                }
            }
        }

        private void ShowNPCIntroduction(NPCDefinition npc)
        {
            int width = Math.Max(BOX_WIDTH, npc.Name.Length + 20);
            string topBorder = "╔" + new string('═', width - 2) + "╗";
            string bottomBorder = "╚" + new string('═', width - 2) + "╝";
            string midBorder = "╠" + new string('═', width - 2) + "╣";

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine(topBorder);

            // Title
            string title = $"  CONVERSANDO COM: {npc.Name.ToUpper()}  ";
            int padding = (width - 2 - title.Length) / 2;
            string titleLine = "║" + new string(' ', padding) + title + new string(' ', width - 2 - padding - title.Length) + "║";
            Console.WriteLine(titleLine);

            Console.WriteLine(midBorder);

            // Role
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            string roleLine = $"  [{npc.Role}]";
            Console.WriteLine("║" + roleLine.PadRight(width - 2) + "║");

            // Appearance (with word wrap)
            Console.ForegroundColor = ConsoleColor.Gray;
            var appearanceLines = WrapText(npc.Appearance, width - 6);
            foreach (var line in appearanceLines)
            {
                Console.WriteLine("║  " + line.PadRight(width - 4) + "║");
            }

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine(bottomBorder);
            Console.ResetColor();

            // Instructions
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("  Digite 'sair' para encerrar a conversa");
            Console.ResetColor();
            Console.WriteLine();
        }

        public void ShowChatMessage(string speaker, string message, bool isNPC)
        {
            Console.WriteLine();

            int maxMessageWidth = BOX_WIDTH - 8;
            var wrappedLines = WrapText(message, maxMessageWidth);

            if (isNPC)
            {
                // NPC message - left aligned with cyan accent
                Console.ForegroundColor = ConsoleColor.DarkCyan;
                Console.Write("  ┌─ ");
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.Write(speaker);
                Console.ForegroundColor = ConsoleColor.DarkCyan;
                Console.WriteLine(" ─────────────────────────────────");

                Console.ForegroundColor = ConsoleColor.White;
                foreach (var line in wrappedLines)
                {
                    Console.ForegroundColor = ConsoleColor.DarkCyan;
                    Console.Write("  │ ");
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine(line);
                }

                Console.ForegroundColor = ConsoleColor.DarkCyan;
                Console.WriteLine("  └────────────────────────────────────────────────");
            }
            else
            {
                // Player message - right-ish aligned with green accent
                Console.ForegroundColor = ConsoleColor.DarkGreen;
                Console.Write("      ┌─ ");
                Console.ForegroundColor = ConsoleColor.Green;
                Console.Write(speaker);
                Console.ForegroundColor = ConsoleColor.DarkGreen;
                Console.WriteLine(" (você) ───────────────────────");

                Console.ForegroundColor = ConsoleColor.Gray;
                foreach (var line in wrappedLines)
                {
                    Console.ForegroundColor = ConsoleColor.DarkGreen;
                    Console.Write("      │ ");
                    Console.ForegroundColor = ConsoleColor.Gray;
                    Console.WriteLine(line);
                }

                Console.ForegroundColor = ConsoleColor.DarkGreen;
                Console.WriteLine("      └──────────────────────────────────────────");
            }

            Console.ResetColor();
        }

        private void ShowInputPrompt(string npcName, int messageCount, int impatienceThreshold)
        {
            Console.WriteLine();

            // Status bar
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write("  ─── ");

            // Message counter with color indication
            if (messageCount >= impatienceThreshold)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Write($"[{npcName} parece impaciente] ");
            }
            else if (messageCount >= impatienceThreshold - 3)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.Write($"[Msgs: {messageCount}] ");
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.Write($"[Msgs: {messageCount}] ");
            }

            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("────────────────────────────────────────");

            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("  Sua mensagem:");
            Console.ResetColor();
        }

        private void ShowSystemMessage(string message, ConsoleColor color = ConsoleColor.DarkYellow)
        {
            Console.WriteLine();
            Console.ForegroundColor = color;
            Console.WriteLine($"  ◆ {message}");
            Console.ResetColor();
        }

        private void ShowFarewellMessage(string npcName, string playerName)
        {
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            Console.WriteLine("  ╭────────────────────────────────────────────╮");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"  │  {npcName} acena em despedida.");
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.WriteLine($"  │  'Até mais, {playerName}.'");
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            Console.WriteLine("  ╰────────────────────────────────────────────╯");
            Console.ResetColor();
        }

        private void ShowErrorBox(string title, string[] lines)
        {
            _uiService.ClearScreen();

            int maxLen = Math.Max(title.Length + 4, lines.Max(l => l.Length) + 4);
            int width = Math.Max(maxLen, 50);

            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("╔" + new string('═', width) + "╗");

            string titlePadded = title.PadLeft((width + title.Length) / 2).PadRight(width);
            Console.WriteLine("║" + titlePadded + "║");

            Console.WriteLine("╠" + new string('═', width) + "╣");

            Console.ForegroundColor = ConsoleColor.White;
            foreach (var line in lines)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Write("║ ");
                Console.ForegroundColor = ConsoleColor.White;
                Console.Write(line.PadRight(width - 2));
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(" ║");
            }

            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("╚" + new string('═', width) + "╝");
            Console.ResetColor();

            Console.WriteLine();
            Console.WriteLine("Pressione qualquer tecla para continuar...");
        }

        public void ShowTypingIndicator()
        {
            Console.WriteLine();
            _typingLine = Console.CursorTop;
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            Console.Write("  ● ");
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.Write("Pensando");

            // Animated dots
            for (int i = 0; i < 3; i++)
            {
                Thread.Sleep(350);
                Console.Write(".");
            }
            Console.ResetColor();
        }

        public void HideTypingIndicator()
        {
            if (_typingLine >= 0)
            {
                try
                {
                    int width = Console.WindowWidth;
                    if (width > 0)
                    {
                        Console.SetCursorPosition(0, _typingLine);
                        Console.Write(new string(' ', Math.Min(width, 80)));
                        Console.SetCursorPosition(0, _typingLine);
                    }
                }
                catch
                {
                    // Ignore errors from window resize
                }
                finally
                {
                    _typingLine = -1;
                }
            }
        }

        /// <summary>
        /// Clears all lines from the specified line to the current cursor position
        /// </summary>
        private void ClearLinesFrom(int startLine)
        {
            try
            {
                int currentLine = Console.CursorTop;
                int width = Console.WindowWidth;

                if (width <= 0) width = 80;

                // Clear each line from start to current
                for (int line = startLine; line <= currentLine; line++)
                {
                    Console.SetCursorPosition(0, line);
                    Console.Write(new string(' ', Math.Min(width - 1, 120)));
                }

                // Move cursor back to start position
                Console.SetCursorPosition(0, startLine);
            }
            catch
            {
                // Ignore errors from window resize or other console issues
            }
        }

        /// <summary>
        /// Wraps text to fit within specified width
        /// </summary>
        private List<string> WrapText(string text, int maxWidth)
        {
            var lines = new List<string>();

            if (string.IsNullOrEmpty(text))
            {
                lines.Add("");
                return lines;
            }

            // Handle text that already contains newlines
            var paragraphs = text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);

            foreach (var paragraph in paragraphs)
            {
                if (string.IsNullOrEmpty(paragraph))
                {
                    lines.Add("");
                    continue;
                }

                var words = paragraph.Split(' ');
                var currentLine = "";

                foreach (var word in words)
                {
                    if (string.IsNullOrEmpty(word))
                        continue;

                    if (currentLine.Length + word.Length + 1 <= maxWidth)
                    {
                        currentLine += (currentLine.Length > 0 ? " " : "") + word;
                    }
                    else
                    {
                        if (currentLine.Length > 0)
                        {
                            lines.Add(currentLine);
                        }

                        // Handle very long words
                        if (word.Length > maxWidth)
                        {
                            for (int i = 0; i < word.Length; i += maxWidth)
                            {
                                lines.Add(word.Substring(i, Math.Min(maxWidth, word.Length - i)));
                            }
                            currentLine = "";
                        }
                        else
                        {
                            currentLine = word;
                        }
                    }
                }

                if (currentLine.Length > 0)
                {
                    lines.Add(currentLine);
                }
            }

            if (lines.Count == 0)
            {
                lines.Add("");
            }

            return lines;
        }
    }
}
