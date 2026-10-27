using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IDeepSeekService
    {
        Task<string?> SendMessageAsync(List<ChatMessage> conversationHistory, string systemPrompt);
        bool IsConfigured();
    }
}
