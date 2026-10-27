namespace RetroGame2091.Core.Interfaces
{
    public interface ICombatOrchestrationService
    {
        string? StartCombat(string enemyId, string? victoryChapter = null, string? defeatChapter = null, string? fleeChapter = null, string? victoryNode = null, string? defeatNode = null, string? fleeNode = null);
    }
}