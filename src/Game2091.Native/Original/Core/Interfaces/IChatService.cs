using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IChatService
    {
        Task<string?> StartChatSession(string npcId);
        ChatSession? GetChatSession(string npcId);
        void SaveChatHistory(string npcId, ChatSession session);
        string BuildSystemPrompt(NPCDefinition npc, Protagonist player, int messageCount);
    }
}
