using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.UI.Components
{
    public class CombatUIService : ICombatUIService
    {
        private readonly IUIService _uiService;
        private readonly IGameConfigService _configService;

        public CombatUIService(IUIService uiService, IGameConfigService configService)
        {
            _uiService = uiService;
            _configService = configService;
        }

        public void ShowCombatEncounter(Enemy enemy)
        {
            _uiService.ClearScreen();
            
            _uiService.WriteWithColor("╔══════════════════════════════════════════════════════════╗", _configService.Config.Colors.Title);
            string paddedTitle = CenterTextInBox($"ENCONTRO DE COMBATE: {enemy.Name.ToUpper()}", 58);
            _uiService.WriteWithColor($"║{paddedTitle}║", _configService.Config.Colors.Title);
            _uiService.WriteWithColor("╚══════════════════════════════════════════════════════════╝", _configService.Config.Colors.Title);
            Console.WriteLine();
            
            var encounterText = new List<string>();
            
            encounterText.Add(enemy.Description);
            encounterText.Add("");
            
            if (enemy.Dialogs.OnEncounter.Count > 0)
            {
                encounterText.AddRange(enemy.Dialogs.OnEncounter);
                encounterText.Add("");
            }
            
            _uiService.WriteChapterTextWithEffect(encounterText, _configService.Config.Colors.NormalText);
            
            Console.WriteLine();
            _uiService.WriteWithColor("Pressione qualquer tecla para iniciar o combate...", _configService.Config.Colors.HighlightedText);
            _uiService.SafeReadKeyNoCombatSave();
        }

        public CombatAction? GetPlayerCombatActionWithHUD(CombatState combatState, Protagonist player)
        {
            _uiService.ClearScreen();
            var enemy = combatState.Enemy;
            
            DrawCompactCombatHUD(combatState, player, enemy);
            
            string[] combatOptions = {
                "COMBATE    │ Ataque físico direto",
                "HACKEAR    │ Invasão de sistemas inimigos", 
                "VARRER     │ Analisar vulnerabilidades do alvo",
                "ESCAPAR    │ Fugir do combate"
            };

            int choice = _uiService.ShowMenuWithoutClear("", combatOptions);
            
            return choice switch
            {
                0 => CombatAction.Fight,
                1 => CombatAction.Hack,
                2 => CombatAction.Observe,
                3 => CombatAction.Flee,
                -1 => null,
                _ => null
            };
        }

        public void ShowCombatResult(CombatResult result)
        {
            _uiService.ClearScreen();
            
            string actionName = result.Action switch
            {
                CombatAction.Fight => "ATAQUE",
                CombatAction.Hack => "HACK",
                CombatAction.Observe => "OBSERVAÇÃO",
                CombatAction.Flee => "FUGA",
                _ => "AÇÃO"
            };
            
            _uiService.WriteWithColor($"═══════════ {actionName} ═══════════", _configService.Config.Colors.Title);
            Console.WriteLine();
            
            var resultText = new List<string>();
            
            resultText.Add(result.Message);
            
            if (result.DialogLines.Count > 0)
            {
                resultText.Add("");
                resultText.AddRange(result.DialogLines);
            }
            
            if (result.EnemyDamage > 0)
            {
                resultText.Add("");
                resultText.Add($"→ Dano causado ao inimigo: {result.EnemyDamage}");
            }
            
            if (result.PlayerDamage > 0)
            {
                resultText.Add("");
                resultText.Add($"→ Dano recebido: {result.PlayerDamage}");
            }
            
            switch (result.Outcome)
            {
                case CombatOutcome.Victory:
                    resultText.Add("");
                    resultText.Add("VITÓRIA!");
                    break;
                case CombatOutcome.Defeat:
                    resultText.Add("");
                    resultText.Add("DERROTA!");
                    break;
                case CombatOutcome.Fled:
                    resultText.Add("");
                    resultText.Add("Você escapou do combate!");
                    break;
            }
            
            _uiService.WriteChapterTextWithEffect(resultText, _configService.Config.Colors.NormalText);
            
            Console.WriteLine();
        }

        public void ShowEnemyTurnIndicator(Enemy enemy)
        {
            _uiService.ClearScreen();
            
            _uiService.WriteWithColor("═══════════════ TURNO DO INIMIGO ═══════════════", _configService.Config.Colors.Title);
            Console.WriteLine();
            
            _uiService.WriteWithColor($"{enemy.Name} está se preparando para atacar...", _configService.Config.Colors.HighlightedText);
            Console.WriteLine();
            Console.WriteLine();
            
            _uiService.WriteWithColor("Pressione qualquer tecla para ver o ataque...", _configService.Config.Colors.NormalText);
            _uiService.SafeReadKeyNoCombatSave();
        }

        private string CenterTextInBox(string text, int boxWidth)
        {
            if (text.Length >= boxWidth) 
                return text.Substring(0, boxWidth - 3) + "...";
            
            int totalPadding = boxWidth - text.Length;
            int leftPadding = totalPadding / 2;
            int rightPadding = totalPadding - leftPadding;
            
            return new string(' ', leftPadding) + text + new string(' ', rightPadding);
        }

        private void DrawCompactCombatHUD(CombatState combatState, Protagonist player, Enemy enemy)
        {
            _uiService.WriteWithColor("═════════════════ NEURAL COMBAT INTERFACE 2091 ═════════════════", _configService.Config.Colors.Title);
            _uiService.WriteWithColor($"                   TURNO: {combatState.TurnCount + 1:D2} -- SYSTEM ONLINE", _configService.Config.Colors.Title);
            Console.WriteLine();
            
            DrawCombatBoxes(player, enemy);
            
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("              [█] NEURAL LINK ESTABELECIDO - AGUARDANDO INPUT [█]");
            Console.ResetColor();
        }

        private void DrawCombatBoxes(Protagonist player, Enemy enemy)
        {
            WriteColoredText("┌──────────────── AGENTE ────────────────┐", ConsoleColor.Cyan, false);
            Console.Write("  ");
            WriteColoredText("┌──────────────── TARGET ────────────────┐", ConsoleColor.Red, true);
            
            DrawCombatBoxRow(
                $"[{TruncateName(player.Name.ToUpper()),-25}]", ConsoleColor.White,
                $"[{TruncateName(enemy.Name.ToUpper()),-25}]", ConsoleColor.Red,
                ConsoleColor.Cyan, ConsoleColor.Red);
            
            DrawHealthRow(player, enemy);
            DrawSecondStatRow(player, enemy);
            DrawPlayerStatsRow(player);
            DrawEmptyRow();
            
            WriteColoredText("└────────────────────────────────────────┘", ConsoleColor.Cyan, false);
            Console.Write("  ");
            WriteColoredText("└────────────────────────────────────────┘", ConsoleColor.Red, true);
        }

        private void WriteColoredText(string text, ConsoleColor color, bool newLine)
        {
            Console.ForegroundColor = color;
            if (newLine) Console.WriteLine(text);
            else Console.Write(text);
            Console.ResetColor();
        }

        private string TruncateName(string name) => name.Length > 25 ? name.Substring(0, 22) + "..." : name;

        private void DrawCombatBoxRow(string leftContent, ConsoleColor leftContentColor, string rightContent, ConsoleColor rightContentColor, ConsoleColor leftBorderColor, ConsoleColor rightBorderColor)
        {
            WriteColoredText("│ ", leftBorderColor, false);
            WriteColoredText(leftContent, leftContentColor, false);
            Console.Write("            ");
            WriteColoredText("│", leftBorderColor, false);
            Console.Write("VS");
            WriteColoredText("│ ", rightBorderColor, false);
            WriteColoredText(rightContent, rightContentColor, false);
            Console.Write("            ");
            WriteColoredText("│", rightBorderColor, true);
        }

        private void DrawHealthRow(Protagonist player, Enemy enemy)
        {
            WriteColoredText("│ SAUDE: ", ConsoleColor.Cyan, false);
            DrawWideHealthBar(player.Attributes.Saude, player.Attributes.MaxSaude, 20, GetHealthColor(player.Attributes.Saude));
            WriteColoredText($" {player.Attributes.Saude:D3}", ConsoleColor.Green, false);
            Console.Write("      ");
            WriteColoredText("│", ConsoleColor.Cyan, false);
            Console.Write("  ");
            WriteColoredText("│ VIDA: ", ConsoleColor.Red, false);
            int enemyHealthPercent = enemy.CurrentHealth * 100 / enemy.Stats.Health;
            DrawWideHealthBar(enemy.CurrentHealth, enemy.Stats.Health, 20, GetHealthColor(enemyHealthPercent));
            WriteColoredText($" {enemy.CurrentHealth:D3}", ConsoleColor.Red, false);
            Console.Write("       ");
            WriteColoredText("│", ConsoleColor.Red, true);
        }

        private void DrawSecondStatRow(Protagonist player, Enemy enemy)
        {
            WriteColoredText("│ MENTE: ", ConsoleColor.Cyan, false);
            DrawWideHealthBar(player.Attributes.Psicologia, player.Attributes.MaxPsicologia, 20, GetHealthColor(player.Attributes.Psicologia));
            WriteColoredText($" {player.Attributes.Psicologia:D3}", ConsoleColor.Magenta, false);
            Console.Write("      ");
            WriteColoredText("│", ConsoleColor.Cyan, false);
            Console.Write("  ");
            
            if (enemy.IsObserved)
            {
                WriteColoredText("│ STATS: ", ConsoleColor.Red, false);
                WriteColoredText($"ATK:{enemy.Stats.Attack:D2} ", ConsoleColor.Red, false);
                WriteColoredText($"DEF:{enemy.Stats.Defense:D2} ", ConsoleColor.Blue, false);
                WriteColoredText($"FW:{enemy.Stats.HackingDefense:D2} ", ConsoleColor.Magenta, false);
                WriteColoredText($"ESC:{enemy.Stats.FleeThreshold:D2}%", ConsoleColor.Green, false);
                Console.Write(" ");
                WriteColoredText("│", ConsoleColor.Red, true);
            }
            else
            {
                WriteColoredText("│ ", ConsoleColor.Red, false);
                WriteColoredText("[███████ ENCRYPTED DATA ███████]", ConsoleColor.DarkGray, false);
                Console.Write("       ");
                WriteColoredText("│", ConsoleColor.Red, true);
            }
        }

        private void DrawPlayerStatsRow(Protagonist player)
        {
            WriteColoredText("│ STATS: ", ConsoleColor.Cyan, false);
            WriteColoredText($"FORCA:{player.Attributes.Forca:D2} ", ConsoleColor.White, false);
            WriteColoredText($"INT:{player.Attributes.Inteligencia:D2} ", ConsoleColor.White, false);
            WriteColoredText($"CONV:{player.Attributes.Conversacao:D2}", ConsoleColor.White, false);
            Console.Write("         ");
            WriteColoredText("│", ConsoleColor.Cyan, false);
            Console.Write("  ");
            WriteColoredText("│", ConsoleColor.Red, false);
            Console.Write(new string(' ', 40));
            WriteColoredText("│", ConsoleColor.Red, true);
        }

        private void DrawEmptyRow()
        {
            WriteColoredText("│", ConsoleColor.Cyan, false);
            Console.Write(new string(' ', 40));
            WriteColoredText("│", ConsoleColor.Cyan, false);
            Console.Write("  ");
            WriteColoredText("│", ConsoleColor.Red, false);
            Console.Write(new string(' ', 40));
            WriteColoredText("│", ConsoleColor.Red, true);
        }

        private void DrawWideHealthBar(int currentValue, int maxValue, int barWidth, string colorString)
        {
            ConsoleColor color = Enum.Parse<ConsoleColor>(colorString);
            double percentage = (double)currentValue / maxValue;
            int filledBars = (int)(percentage * barWidth);
            
            Console.Write("[");
            Console.ForegroundColor = color;
            
            Console.Write(new string('█', filledBars));
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write(new string('─', barWidth - filledBars));
            
            Console.ResetColor();
            Console.Write("]");
        }

        private string GetHealthColor(int health)
        {
            return health switch
            {
                >= 80 => ConsoleColor.Green.ToString(),
                >= 60 => ConsoleColor.Yellow.ToString(),
                >= 40 => ConsoleColor.DarkYellow.ToString(),
                >= 20 => ConsoleColor.Red.ToString(),
                _ => ConsoleColor.DarkRed.ToString()
            };
        }
    }
}