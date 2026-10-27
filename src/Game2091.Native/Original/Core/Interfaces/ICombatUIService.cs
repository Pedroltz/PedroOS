using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface ICombatUIService
    {
        void ShowCombatEncounter(Enemy enemy);
        CombatAction? GetPlayerCombatActionWithHUD(CombatState combatState, Protagonist player);
        void ShowCombatResult(CombatResult result);
        void ShowEnemyTurnIndicator(Enemy enemy);
    }
}