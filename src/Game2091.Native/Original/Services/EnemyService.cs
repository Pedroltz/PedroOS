using Newtonsoft.Json;
using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.Services
{
    public class EnemyService : IEnemyService
    {
        private const string EnemiesFolder = "Enemies";

        public Enemy? LoadEnemy(string enemyId)
        {
            try
            {
                string resourcePath = $"Enemies/{enemyId}.json";

                // Try to load from embedded resources first (for build)
                string? json = RetroGame2091.Utils.ResourceLoader.LoadEmbeddedJson(resourcePath);

                // Fallback to file system (for debug mode)
                if (json == null)
                {
                    string enemyPath = Path.Combine(EnemiesFolder, $"{enemyId}.json");
                    if (File.Exists(enemyPath))
                    {
                        json = File.ReadAllText(enemyPath);
                    }
                }

                if (json != null)
                {
                    return JsonConvert.DeserializeObject<Enemy>(json);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading enemy {enemyId}: {ex.Message}");
            }

            return null;
        }

        public Enemy? CreateSampleEnemy()
        {
            return new Enemy
            {
                Id = "security_drone",
                Name = "Drone de Segurança Corporativo",
                Description = "Um drone de segurança patrulha a área, seus sensores vermelhos varrem constantemente em busca de intrusos.",
                DetailedDescription = new List<string>
                {
                    "O drone possui blindagem leve mas eficiente contra ataques físicos.",
                    "Seus sistemas de segurança parecem vulneráveis a ataques de hacking avançado.",
                    "Sistemas de fuga: O drone tem alta mobilidade, mas pode ser distraído facilmente.",
                    "Ponto fraco identificado: O painel de controle na parte inferior está exposto."
                },
                Stats = new EnemyStats
                {
                    Health = 120, // More health to make fights longer
                    Defense = 60,  // 30% damage reduction with new system
                    Attack = 35,   // Reasonable damage output
                    HackingDefense = 70, // Hackeable but requires good intelligence
                    FleeThreshold = 65   // Moderate escape difficulty
                },
                Dialogs = new EnemyDialogs
                {
                    OnEncounter = new List<string>
                    {
                        ">>> INTRUSO DETECTADO <<<",
                        ">>> ATIVANDO PROTOCOLOS DE SEGURANÇA <<<",
                        ">>> NEUTRALIZAÇÃO AUTORIZADA <<<"
                    },
                    OnAttack = new List<string>
                    {
                        ">>> RETALIAÇÃO INICIADA <<<",
                        ">>> SISTEMAS DE ARMAS ONLINE <<<",
                        "O drone dispara rajadas de energia em sua direção!"
                    },
                    OnHacked = new List<string>
                    {
                        ">>> ERRO DE SISTEMA DETECTADO <<<",
                        ">>> TENTATIVA DE INTRUSÃO CIBERNÉTICA <<<",
                        ">>> EXECUTANDO CONTRAMEDIDAS <<<"
                    },
                    OnObserved = new List<string>
                    {
                        "Você analisa cuidadosamente o drone, identificando seus pontos fracos.",
                        "Seus conhecimentos técnicos revelam informações valiosas sobre o inimigo."
                    },
                    OnFlee = new List<string>
                    {
                        ">>> ALVO FUGINDO <<<",
                        ">>> PERSEGUIÇÃO INICIADA <<<",
                        "O drone emite um sinal de alerta para outros sistemas de segurança."
                    },
                    OnDefeat = new List<string>
                    {
                        ">>> SISTEMAS CRÍTICOS FALHA <<<",
                        ">>> DESLIGAMENTO FORÇADO <<<",
                        "O drone cai no chão, suas luzes se apagando lentamente."
                    },
                    OnVictory = new List<string>
                    {
                        ">>> ALVO NEUTRALIZADO <<<",
                        ">>> MISSÃO CUMPRIDA <<<",
                        "O drone emite um som de satisfação eletrônica."
                    }
                }
            };
        }

        public void CreateSampleEnemies()
        {
            Directory.CreateDirectory(EnemiesFolder);

            // Create security drone
            var drone = CreateSampleEnemy();
            if (drone != null)
            {
                SaveEnemy(drone);
            }

            // Create corpo guard
            var guard = new Enemy
            {
                Id = "corpo_guard",
                Name = "Guarda Corporativo",
                Description = "Um guarda corporativo veterano, vestido com armadura tática pesada e portando armas de última geração.",
                DetailedDescription = new List<string>
                {
                    "O guarda possui treinamento militar extensivo e reflexos apurados.",
                    "Sua armadura é resistente a ataques físicos, mas limitada contra ataques cibernéticos.",
                    "Sistemas de fuga: O guarda é lento devido à armadura pesada.",
                    "Ponto fraco: Seu capacete possui um visor eletrônico vulnerável."
                },
                Stats = new EnemyStats
                {
                    Health = 120,
                    Defense = 60,
                    Attack = 70,
                    HackingDefense = 30,
                    FleeThreshold = 40
                },
                Dialogs = new EnemyDialogs
                {
                    OnEncounter = new List<string>
                    {
                        "Alto aí! Esta é uma área restrita!",
                        "Identifique-se ou será neutralizado!",
                        "Código vermelho ativado. Preparando para combate."
                    },
                    OnAttack = new List<string>
                    {
                        "Você escolheu o caminho difícil!",
                        "Vou acabar com você rapidamente!",
                        "O guarda saca sua arma e dispara em sua direção!"
                    },
                    OnHacked = new List<string>
                    {
                        "Que diabos? Meus sistemas estão falhando!",
                        "Impossível! Alguém está mexendo na minha armadura!",
                        "Contramedidas ativadas! Não vai me hackear!"
                    },
                    OnObserved = new List<string>
                    {
                        "Você estuda os movimentos do guarda, procurando por aberturas.",
                        "Sua experiência militar permite identificar padrões de combate."
                    },
                    OnFlee = new List<string>
                    {
                        "Está fugindo? Covarde!",
                        "Volte aqui! Não terminamos!",
                        "Pode correr, mas não pode se esconder!"
                    },
                    OnDefeat = new List<string>
                    {
                        "Impossível... como você me derrotou?",
                        "Maldito... você é melhor do que eu pensava...",
                        "O guarda cai pesadamente, sua armadura fazendo eco no chão."
                    },
                    OnVictory = new List<string>
                    {
                        "Mais um intruso neutralizado.",
                        "Trabalho concluído. Voltando à patrulha.",
                        "O guarda guarda sua arma com um sorriso de satisfação."
                    }
                }
            };
            SaveEnemy(guard);

            // Create cyber thug
            var thug = new Enemy
            {
                Id = "cyber_thug",
                Name = "Bandido Cibernético",
                Description = "Um criminoso das ruas com implantes cibernéticos visíveis, empunhando armas improvisadas e tecnologia roubada.",
                DetailedDescription = new List<string>
                {
                    "O bandido possui implantes baratos mas funcionais.",
                    "Seus sistemas são uma mistura caótica de tecnologia roubada e modificada.",
                    "Sistemas de fuga: Conhece bem as ruas e é ágil para escapar.",
                    "Ponto fraco: Seus implantes são instáveis e podem falhar sob pressão."
                },
                Stats = new EnemyStats
                {
                    Health = 90,
                    Defense = 25,
                    Attack = 55,
                    HackingDefense = 45,
                    FleeThreshold = 80
                },
                Dialogs = new EnemyDialogs
                {
                    OnEncounter = new List<string>
                    {
                        "Ei, o que você está fazendo no meu território?",
                        "Quer problemas? Porque eu tenho muitos para oferecer!",
                        "Seus implantes brilham de forma ameaçadora na escuridão."
                    },
                    OnAttack = new List<string>
                    {
                        "Vou te mostrar como se faz nas ruas!",
                        "Meus implantes vão te despedaçar!",
                        "O bandido ativa seus implantes de combate!"
                    },
                    OnHacked = new List<string>
                    {
                        "Que porra? Alguém está mexendo nos meus sistemas!",
                        "Malditos implantes baratos! Sempre falham na pior hora!",
                        "Não! Não consigo controlar meus próprios sistemas!"
                    },
                    OnObserved = new List<string>
                    {
                        "Você analisa os implantes do bandido, notando várias falhas.",
                        "Seus conhecimentos técnicos revelam vulnerabilidades nos sistemas dele."
                    },
                    OnFlee = new List<string>
                    {
                        "Até mais, otário! As ruas são minhas!",
                        "Você teve sorte dessa vez!",
                        "O bandido desaparece rapidamente pelos becos escuros."
                    },
                    OnDefeat = new List<string>
                    {
                        "Impossível... meus implantes...",
                        "As ruas vão cobrar essa...",
                        "O bandido cai, seus implantes piscando fracamente."
                    },
                    OnVictory = new List<string>
                    {
                        "Hah! Mais um playboy corpo mole!",
                        "Quem manda nas ruas sou eu!",
                        "O bandido ri enquanto conta os créditos do seu corpo."
                    }
                }
            };
            SaveEnemy(thug);
        }

        public bool EnemyExists(string enemyId)
        {
            string enemyPath = Path.Combine(EnemiesFolder, $"{enemyId}.json");
            return File.Exists(enemyPath);
        }

        private void SaveEnemy(Enemy enemy)
        {
            try
            {
                string enemyPath = Path.Combine(EnemiesFolder, $"{enemy.Id}.json");
                Directory.CreateDirectory(Path.GetDirectoryName(enemyPath)!);
                string json = JsonConvert.SerializeObject(enemy, Formatting.Indented);
                File.WriteAllText(enemyPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving enemy {enemy.Id}: {ex.Message}");
            }
        }
    }
}