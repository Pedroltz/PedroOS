using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IPlayerSaveService
    {
        PlayerSave PlayerSave { get; }
        void SaveGame();
        void LoadSave();
        void UpdateCharacterName(string name);
        void UpdateAttribute(string attributeName, int value);
        void UpdateGameProgress(string currentChapter, string? currentNode = null);
        bool SaveGameWithConfirmation(IUIService uiService, IGameConfigService configService);
        bool HasSaveFile();
        void UpdatePlaytime();
        void StartNewSession();
    }
}