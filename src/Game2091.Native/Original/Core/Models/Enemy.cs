using Newtonsoft.Json;

namespace RetroGame2091.Core.Models
{
    public class EnemyStats
    {
        public int Health { get; set; } = 100;
        public int Defense { get; set; } = 50;
        public int Attack { get; set; } = 50;
        public int HackingDefense { get; set; } = 50;
        public int FleeThreshold { get; set; } = 75; // How easy it is to flee (0-100, higher = easier to flee)
    }

    public class EnemyDialogs
    {
        public List<string> OnEncounter { get; set; } = new List<string>();
        public List<string> OnAttack { get; set; } = new List<string>();
        public List<string> OnHacked { get; set; } = new List<string>();
        public List<string> OnObserved { get; set; } = new List<string>();
        public List<string> OnFlee { get; set; } = new List<string>();
        public List<string> OnDefeat { get; set; } = new List<string>();
        public List<string> OnVictory { get; set; } = new List<string>();
    }

    public class Enemy
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public List<string> DetailedDescription { get; set; } = new List<string>(); // Revealed through Observe
        public EnemyStats Stats { get; set; } = new EnemyStats();
        public EnemyDialogs Dialogs { get; set; } = new EnemyDialogs();
        public List<ItemDrop>? DropItems { get; set; }  // Items dropped on victory
        public bool IsObserved { get; set; } = false; // Runtime flag for whether enemy has been observed
        
        [JsonIgnore]
        public int CurrentHealth { get; set; } = 100;
        
        public void InitializeCombat()
        {
            CurrentHealth = Stats.Health;
            IsObserved = false;
        }
        
        public bool IsAlive => CurrentHealth > 0;
        
        public void TakeDamage(int damage)
        {
            // More balanced defense calculation
            // Defense reduces damage by a percentage, not flat reduction
            float damageReduction = Math.Min(0.75f, Stats.Defense / 200.0f); // Max 75% damage reduction
            int actualDamage = Math.Max(1, (int)(damage * (1.0f - damageReduction)));
            CurrentHealth = Math.Max(0, CurrentHealth - actualDamage);
        }
        
        public int GetAttackDamage()
        {
            Random rnd = new Random();
            // Base attack with 20% variation
            int baseAttack = Stats.Attack;
            float variation = 1.0f + (rnd.Next(-20, 21) / 100.0f); // ±20% variation
            return Math.Max(1, (int)(baseAttack * variation));
        }
        
        public bool CanFlee(int playerAttribute)
        {
            Random rnd = new Random();
            int fleeChance = (Stats.FleeThreshold + playerAttribute) / 2;
            return rnd.Next(100) < fleeChance;
        }
        
        public bool ResistHacking(int playerIntelligence)
        {
            Random rnd = new Random();
            // Slightly favor intelligence over defense for more interesting gameplay
            int hackChance = (playerIntelligence * 110) / (playerIntelligence + Stats.HackingDefense);
            return rnd.Next(100) >= hackChance;
        }
    }
}