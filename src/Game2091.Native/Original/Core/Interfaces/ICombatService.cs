using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface ICombatService
    {
        CombatResult ExecuteAction(CombatState combatState, CombatAction action, Protagonist player);
        CombatResult ExecuteEnemyTurn(CombatState combatState, Protagonist player);
        CombatResult ProcessFightAction(CombatState combatState, Protagonist player);
        CombatResult ProcessHackAction(CombatState combatState, Protagonist player);
        CombatResult ProcessObserveAction(CombatState combatState, Protagonist player);
        CombatResult ProcessFleeAction(CombatState combatState, Protagonist player);
        void ApplyDamageToPlayer(Protagonist player, int damage);
        void ApplyPsychologyDamage(Protagonist player, int damage, string reason);
        bool IsPlayerDefeated(Protagonist player);
    }
}