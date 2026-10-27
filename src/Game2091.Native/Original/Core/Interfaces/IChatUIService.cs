namespace RetroGame2091.Core.Interfaces
{
    public interface IChatUIService
    {
        Task ShowChatInterface(string npcId);
        void ShowChatMessage(string speaker, string message, bool isNPC);
        void ShowTypingIndicator();
        void HideTypingIndicator();
    }
}
