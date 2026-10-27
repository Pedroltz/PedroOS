using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IGameConfigService
    {
        GameConfig Config { get; }
        void SaveConfig();
        void LoadConfig();
        ConsoleColor GetColor(string colorName);
    }
}