namespace RetroGame2091.Core.Models
{
    public enum CombatAction
    {
        Fight,
        Hack,
        Observe,
        Flee
    }

    public enum CombatOutcome
    {
        Continue,
        Victory,
        Defeat,
        Fled,
        Failed
    }

    public class CombatResult
    {
        public CombatAction Action { get; set; }
        public CombatOutcome Outcome { get; set; }
        public string Message { get; set; } = "";
        public List<string> DialogLines { get; set; } = new List<string>();
        public int PlayerDamage { get; set; } = 0;
        public int EnemyDamage { get; set; } = 0;
        public bool EnemyRevealed { get; set; } = false;
        public string? NextChapter { get; set; }

        public CombatResult(CombatAction action, CombatOutcome outcome)
        {
            Action = action;
            Outcome = outcome;
        }
    }

    public enum TurnOwner
    {
        Player,
        Enemy
    }

    public class CombatState
    {
        public Enemy Enemy { get; set; }
        public bool IsActive { get; set; } = true;
        public int TurnCount { get; set; } = 0;
        public TurnOwner CurrentTurn { get; set; } = TurnOwner.Player;
        public bool WaitingForPlayerAction { get; set; } = true;
        public string? VictoryChapter { get; set; }
        public string? DefeatChapter { get; set; }
        public string? FleeChapter { get; set; }
        public string? VictoryNode { get; set; }
        public string? DefeatNode { get; set; }
        public string? FleeNode { get; set; }

        public CombatState(Enemy enemy)
        {
            Enemy = enemy;
            Enemy.InitializeCombat();
            CurrentTurn = TurnOwner.Player; // Player always starts
        }

        public void NextTurn()
        {
            if (CurrentTurn == TurnOwner.Player)
            {
                CurrentTurn = TurnOwner.Enemy;
                WaitingForPlayerAction = false;
            }
            else
            {
                CurrentTurn = TurnOwner.Player;
                WaitingForPlayerAction = true;
                TurnCount++;
            }
        }
    }
}