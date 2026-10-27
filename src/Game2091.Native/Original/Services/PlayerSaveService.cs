using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.Services
{
    public class PlayerSaveService : IPlayerSaveService
    {
        private PlayerSave _playerSave;

        public PlayerSave PlayerSave => _playerSave;

        public PlayerSaveService()
        {
            _playerSave = new PlayerSave();
            LoadSave();
        }

        public void LoadSave()
        {
            _playerSave = PlayerSave.LoadSave();
            // Always reset session start time when loading
            _playerSave.Character.SessionStartTime = DateTime.Now;
        }

        public void SaveGame()
        {
            UpdatePlaytime(); // Update playtime before saving
            _playerSave.SaveGame();
        }

        public void UpdateCharacterName(string name)
        {
            _playerSave.Character.Name = name;
            SaveGame();
        }

        public void UpdateAttribute(string attributeName, int value)
        {
            switch (attributeName.ToLower())
            {
                case "saude":
                    _playerSave.Character.Attributes.Saude = value;
                    break;
                case "psicologia":
                    _playerSave.Character.Attributes.Psicologia = value;
                    break;
                case "forca":
                    _playerSave.Character.Attributes.Forca = value;
                    break;
                case "inteligencia":
                    _playerSave.Character.Attributes.Inteligencia = value;
                    break;
            }
            SaveGame();
        }

        public void UpdateGameProgress(string currentChapter, string? currentNode = null)
        {
            _playerSave.Character.CurrentChapter = currentChapter;
            _playerSave.Character.CurrentNode = currentNode;
            _playerSave.Character.LastPlayed = DateTime.Now;
            UpdatePlaytime();
        }
        
        public void UpdatePlaytime()
        {
            var sessionTime = DateTime.Now - _playerSave.Character.SessionStartTime;
            _playerSave.Character.PlaytimeMinutes += (int)sessionTime.TotalMinutes;
            _playerSave.Character.SessionStartTime = DateTime.Now; // Reset session timer
        }
        
        public void StartNewSession()
        {
            _playerSave.Character.SessionStartTime = DateTime.Now;
        }

        public bool SaveGameWithConfirmation(IUIService uiService, IGameConfigService configService)
        {
            string[] saveOptions = {
                "Sim - Salvar progresso",
                "Não - Continuar sem salvar"
            };
            
            int choice = uiService.ShowMenu("╔═════════════════════════════════════╗\n║         SALVAR PROGRESSO            ║\n╚═════════════════════════════════════╝", saveOptions);
            
            if (choice == 0)
            {
                SaveGame();
                uiService.ClearScreen();
                uiService.WriteWithColor("✓ Progresso salvo com sucesso!", configService.Config.Colors.HighlightedText);
                Console.WriteLine();
                uiService.WriteWithColor("Pressione qualquer tecla para continuar...", configService.Config.Colors.NormalText);
                uiService.SafeReadKey();
                uiService.ClearScreen(); // Clear screen again before returning to game
                return true;
            }
            else
            {
                uiService.ClearScreen(); // Clear screen if user cancels save
                return false;
            }
        }

        public bool HasSaveFile()
        {
            string savePath = Path.Combine("Saves", "player.json");
            return File.Exists(savePath);
        }
    }
}