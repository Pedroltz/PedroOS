using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.Services
{
    public class GameConfigService : IGameConfigService
    {
        private GameConfig _config;

        public GameConfig Config => _config;

        public GameConfigService()
        {
            _config = new GameConfig();
            LoadConfig();
        }

        public void LoadConfig()
        {
            _config = GameConfig.LoadConfig();
        }

        public void SaveConfig()
        {
            _config.SaveConfig();
        }

        public ConsoleColor GetColor(string colorName)
        {
            return _config.GetColor(colorName);
        }
    }
}