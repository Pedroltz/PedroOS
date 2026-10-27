using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface INPCService
    {
        NPCDefinition? LoadNPC(string npcId);
        bool NPCExists(string npcId);
        void CreateSampleNPCs();
    }
}
