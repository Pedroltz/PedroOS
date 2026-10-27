using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.Services
{
    public class CombatService : ICombatService
    {
        private readonly Random _random = new Random();

        public CombatResult ExecuteAction(CombatState combatState, CombatAction action, Protagonist player)
        {
            // Only execute if it's player's turn
            if (combatState.CurrentTurn != TurnOwner.Player)
            {
                return new CombatResult(action, CombatOutcome.Failed) { Message = "Não é seu turno!" };
            }

            CombatResult result = action switch
            {
                CombatAction.Fight => ProcessFightAction(combatState, player),
                CombatAction.Hack => ProcessHackAction(combatState, player),
                CombatAction.Observe => ProcessObserveAction(combatState, player),
                CombatAction.Flee => ProcessFleeAction(combatState, player),
                _ => new CombatResult(action, CombatOutcome.Failed) { Message = "Ação inválida!" }
            };

            // Move to next turn if combat continues and player didn't flee/fail
            if (result.Outcome == CombatOutcome.Continue && combatState.Enemy.IsAlive)
            {
                combatState.NextTurn();
            }

            return result;
        }

        public CombatResult ExecuteEnemyTurn(CombatState combatState, Protagonist player)
        {
            // Only execute if it's enemy's turn
            if (combatState.CurrentTurn != TurnOwner.Enemy)
            {
                return new CombatResult(CombatAction.Fight, CombatOutcome.Failed) { Message = "Não é turno do inimigo!" };
            }

            var enemy = combatState.Enemy;
            
            // Enemy attack
            int enemyDamage = enemy.GetAttackDamage();
            ApplyDamageToPlayer(player, enemyDamage);
            
            var result = new CombatResult(CombatAction.Fight, CombatOutcome.Continue)
            {
                PlayerDamage = enemyDamage,
                Message = $"{enemy.Name} ataca causando {enemyDamage} de dano!"
            };

            // Add enemy attack dialog
            if (enemy.Dialogs.OnAttack.Count > 0)
            {
                string dialog = enemy.Dialogs.OnAttack[_random.Next(enemy.Dialogs.OnAttack.Count)];
                result.DialogLines.Add(dialog);
            }
            
            // Check if player is defeated
            if (IsPlayerDefeated(player))
            {
                result.Outcome = CombatOutcome.Defeat;
                result.Message += " Você foi derrotado!";
                
                if (enemy.Dialogs.OnVictory.Count > 0)
                {
                    string victoryDialog = enemy.Dialogs.OnVictory[_random.Next(enemy.Dialogs.OnVictory.Count)];
                    result.DialogLines.Add(victoryDialog);
                }
            }
            else
            {
                // Move to next turn (back to player)
                combatState.NextTurn();
            }

            return result;
        }

        public CombatResult ProcessFightAction(CombatState combatState, Protagonist player)
        {
            var enemy = combatState.Enemy;
            
            // Balanced damage calculation for 50-100 strength range
            // Base damage scales from 15 (at 50 strength) to 35 (at 100 strength)
            int baseDamage = 10 + (player.Attributes.Forca / 2); // 35 at 50str, 60 at 100str
            float variation = 1.0f + (_random.Next(-20, 21) / 100.0f); // ±20% variation
            int playerDamage = Math.Max(1, (int)(baseDamage * variation));
            
            enemy.TakeDamage(playerDamage);
            
            var result = new CombatResult(CombatAction.Fight, CombatOutcome.Continue)
            {
                EnemyDamage = playerDamage,
                Message = $"Você ataca com força! Causando {playerDamage} de dano."
            };

            // Add combat dialog
            if (enemy.Dialogs.OnAttack.Count > 0)
            {
                string dialog = enemy.Dialogs.OnAttack[_random.Next(enemy.Dialogs.OnAttack.Count)];
                result.DialogLines.Add(dialog);
            }

            // Check if enemy is defeated
            if (!enemy.IsAlive)
            {
                result.Outcome = CombatOutcome.Victory;
                result.Message += " O inimigo foi derrotado!";
                
                if (enemy.Dialogs.OnDefeat.Count > 0)
                {
                    string defeatDialog = enemy.Dialogs.OnDefeat[_random.Next(enemy.Dialogs.OnDefeat.Count)];
                    result.DialogLines.Add(defeatDialog);
                }
                
                result.NextChapter = combatState.VictoryChapter;
            }

            return result;
        }

        public CombatResult ProcessHackAction(CombatState combatState, Protagonist player)
        {
            var enemy = combatState.Enemy;
            
            // Check if hacking succeeds based on intelligence vs enemy hacking defense
            int hackingPower = player.Attributes.Inteligencia;
            bool hackingSucceeds = !enemy.ResistHacking(hackingPower);
            
            var result = new CombatResult(CombatAction.Hack, CombatOutcome.Continue);

            if (hackingSucceeds)
            {
                // Balanced hack damage for 50-100 intelligence range
                // Hack damage scales from 20 (at 50 int) to 45 (at 100 int)
                int baseDamage = 5 + (hackingPower / 2); // 30 at 50int, 55 at 100int
                float variation = 1.0f + (_random.Next(-25, 26) / 100.0f); // ±25% variation
                int hackDamage = Math.Max(1, (int)(baseDamage * variation));
                
                enemy.TakeDamage(hackDamage);
                
                result.EnemyDamage = hackDamage;
                result.Message = $"Hack bem-sucedido! Você disrupta os sistemas inimigos causando {hackDamage} de dano.";
                
                // Reduce enemy's next attack by disrupting their systems
                enemy.Stats.Attack = Math.Max(10, enemy.Stats.Attack - 10);
            }
            else
            {
                // Failed hack
                result.Message = "Tentativa de hack falhou! Os sistemas inimigos resistiram à intrusão.";
            }

            // Add hacking dialog
            if (enemy.Dialogs.OnHacked.Count > 0)
            {
                string dialog = enemy.Dialogs.OnHacked[_random.Next(enemy.Dialogs.OnHacked.Count)];
                result.DialogLines.Add(dialog);
            }

            // Check if enemy is defeated
            if (!enemy.IsAlive)
            {
                result.Outcome = CombatOutcome.Victory;
                result.Message += " O inimigo foi neutralizado pelo hack!";
                
                if (enemy.Dialogs.OnDefeat.Count > 0)
                {
                    string defeatDialog = enemy.Dialogs.OnDefeat[_random.Next(enemy.Dialogs.OnDefeat.Count)];
                    result.DialogLines.Add(defeatDialog);
                }
                
                result.NextChapter = combatState.VictoryChapter;
            }

            return result;
        }

        public CombatResult ProcessObserveAction(CombatState combatState, Protagonist player)
        {
            var enemy = combatState.Enemy;
            
            var result = new CombatResult(CombatAction.Observe, CombatOutcome.Continue);

            // Observation success based on conversation skill
            int observationPower = player.Attributes.Conversacao;
            int observationThreshold = 40; // Base threshold for observation
            
            bool observationSucceeds = observationPower >= observationThreshold;

            if (observationSucceeds && !enemy.IsObserved)
            {
                enemy.IsObserved = true;
                result.EnemyRevealed = true;
                result.Message = "Você analisa cuidadosamente o inimigo e descobre informações valiosas!";
                
                // Add detailed description
                result.DialogLines.AddRange(enemy.DetailedDescription);
                
                // Add observation dialog
                if (enemy.Dialogs.OnObserved.Count > 0)
                {
                    string dialog = enemy.Dialogs.OnObserved[_random.Next(enemy.Dialogs.OnObserved.Count)];
                    result.DialogLines.Add(dialog);
                }
            }
            else if (enemy.IsObserved)
            {
                result.Message = "Você já analisou este inimigo. Não há mais informações para descobrir.";
                
                // Show stats summary
                result.DialogLines.Add($"Vida: {enemy.CurrentHealth}/{enemy.Stats.Health}");
                result.DialogLines.Add($"Defesa: {enemy.Stats.Defense}");
                result.DialogLines.Add($"Ataque: {enemy.Stats.Attack}");
                result.DialogLines.Add($"Defesa contra Hack: {enemy.Stats.HackingDefense}");
                result.DialogLines.Add($"Facilidade de Fuga: {enemy.Stats.FleeThreshold}%");
            }
            else
            {
                result.Message = "Sua tentativa de análise falha. Você precisa de mais habilidade de conversação.";
                result.DialogLines.Add("O inimigo nota suas intenções e fica mais alerta.");
                
                // Failed observation makes enemy more aggressive for next turn
                enemy.Stats.Attack += 5;
                result.DialogLines.Add("Seu comportamento suspeito deixou o inimigo mais agressivo!");
            }

            return result;
        }

        public CombatResult ProcessFleeAction(CombatState combatState, Protagonist player)
        {
            var enemy = combatState.Enemy;
            
            // Flee success based on a combination of player's best physical attribute and enemy's flee threshold
            int fleeAttribute = Math.Max(player.Attributes.Saude, Math.Max(player.Attributes.Forca, player.Attributes.Conversacao));
            bool fleeSucceeds = enemy.CanFlee(fleeAttribute);
            
            var result = new CombatResult(CombatAction.Flee, fleeSucceeds ? CombatOutcome.Fled : CombatOutcome.Continue);

            if (fleeSucceeds)
            {
                result.Message = "Você consegue fugir com sucesso!";
                result.NextChapter = combatState.FleeChapter;
                combatState.IsActive = false;
                
                // Reduce player's psychological state due to fleeing
                ApplyPsychologyDamage(player, 10, "fleeing");
                result.DialogLines.Add("Fugir do combate afeta sua confiança. (-10 Psicologia)");
            }
            else
            {
                result.Message = "Tentativa de fuga falhou! O inimigo bloqueia sua saída.";
                
                // Failed flee attempt makes enemy more aggressive
                enemy.Stats.Attack += 10;
                result.DialogLines.Add("Sua tentativa frustrada de fuga deixa o inimigo furioso!");
            }

            // Add flee dialog
            if (enemy.Dialogs.OnFlee.Count > 0)
            {
                string dialog = enemy.Dialogs.OnFlee[_random.Next(enemy.Dialogs.OnFlee.Count)];
                result.DialogLines.Add(dialog);
            }

            return result;
        }

        public void ApplyDamageToPlayer(Protagonist player, int damage)
        {
            // Player defense calculation for 50-100 attribute range
            // 50 str = 10% defense, 100 str = 35% defense
            // 50 psy = 5% defense, 100 psy = 20% defense
            float physicalDefense = (player.Attributes.Forca - 50) * 0.005f + 0.10f; // 10%-35%
            float mentalDefense = (player.Attributes.Psicologia - 50) * 0.003f + 0.05f; // 5%-20%
            float totalDefense = Math.Min(0.50f, physicalDefense + mentalDefense); // Max 50% damage reduction
            
            int actualDamage = Math.Max(1, (int)(damage * (1.0f - totalDefense)));
            
            if (player.Attributes.Saude > 0)
            {
                player.Attributes.Saude = Math.Max(0, player.Attributes.Saude - actualDamage);
            }
        }
        
        public void ApplyPsychologyDamage(Protagonist player, int damage, string reason)
        {
            player.Attributes.Psicologia = Math.Max(0, player.Attributes.Psicologia - damage);
        }

        public bool IsPlayerDefeated(Protagonist player)
        {
            return player.Attributes.Saude <= 0 || player.Attributes.Psicologia <= 0;
        }

    }
}