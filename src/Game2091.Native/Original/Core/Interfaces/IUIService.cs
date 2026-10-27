using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IUIService
    {
        int ShowMenu(string title, string[] options, int startIndex = 0);
        int ShowMenuWithoutClear(string title, string[] options, int startIndex = 0);
        int ShowChapterOptions(List<Option> options);
        string GetUserInput(string prompt, string currentValue = "");
        void WriteWithColor(string text, string color);
        void WriteTextWithEffect(string text, string color);
        void WriteChapterTextWithEffect(List<string> lines, string color);
        void ClearScreen();
        void ShowTitleBanner();
        void ShowInitialScreen();
        void ShowStatusPanel();
        void ShowDialogUI(Chapter chapter);
        void ShowDialogUI(Chapter chapter, ChapterNode node);
        void ShowContinuePrompt();
        void SafeReadKey();
        void SafeReadKeyNoCombatSave();
        int ShowInventoryMenu();
    }
}