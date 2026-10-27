using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;

namespace RetroGame2091.Services
{
    public class ChapterService : IChapterService
    {
        private readonly IPlayerSaveService _playerSaveService;

        public ChapterService(IPlayerSaveService playerSaveService)
        {
            _playerSaveService = playerSaveService;
        }

        public Chapter? LoadChapter(string id)
        {
            return Chapter.LoadChapter(id);
        }

        public void SaveChapter(Chapter chapter)
        {
            chapter.SaveChapter();
        }

        public void CreateExampleChapters()
        {
            var chapterStart = new Chapter
            {
                Id = "init_inicio",
                Title = "[EXEMPLO] Capítulo Inicial de Demonstração",
                Text = new List<string>
                {
                    "*** ESTE É UM CAPÍTULO DE EXEMPLO CRIADO AUTOMATICAMENTE ***",
                    "",
                    "Aqui é onde você colocaria o texto narrativo da sua história.",
                    "Cada linha desta lista representa um parágrafo do texto.",
                    "Você pode usar variáveis como {name} para o nome do personagem.",
                    "",
                    "Este é apenas um exemplo para demonstrar como o sistema funciona.",
                    "Para criar sua própria história, substitua este arquivo JSON pelos seus capítulos reais."
                },
                Options = new List<Option>
                {
                    new Option { Text = "[TESTE] Ir para exemplo com opções", NextChapter = "exemplo_opcoes" },
                    new Option { Text = "[TESTE] Ir para exemplo sem opções", NextChapter = "exemplo_continuacao" },
                    new Option { Text = "[TESTE] Ver como funcionam os requisitos", NextChapter = "exemplo_opcoes", SkillRequirement = new SkillRequirement { Skill = "Inteligencia", MinValue = 50 } }
                }
            };

            var chapterOptions = new Chapter
            {
                Id = "exemplo_opcoes",
                Title = "[EXEMPLO] Demonstração de Opções",
                Text = new List<string>
                {
                    "*** CAPÍTULO DE EXEMPLO - DEMONSTRAÇÃO DE OPÇÕES ***",
                    "",
                    "Este capítulo mostra como as opções de escolha funcionam.",
                    "Cada opção pode levar para um capítulo diferente usando 'NextChapter'.",
                    "Você também pode definir requisitos de habilidades para certas opções.",
                    "",
                    "Substitua este conteúdo pela sua própria narrativa."
                },
                Options = new List<Option>
                {
                    new Option { Text = "[TESTE] Voltar ao início", NextChapter = "init_inicio" },
                    new Option { Text = "[TESTE] Ver exemplo de continuação", NextChapter = "exemplo_continuacao" }
                }
            };

            var chapterContinuation = new Chapter
            {
                Id = "exemplo_continuacao",
                Title = "[EXEMPLO] Demonstração de Continuação Automática",
                Text = new List<string>
                {
                    "*** CAPÍTULO DE EXEMPLO - CONTINUAÇÃO AUTOMÁTICA ***",
                    "",
                    "Este capítulo demonstra como funciona a continuação automática.",
                    "Quando um capítulo não tem opções, mas tem 'NextChapter' definido,",
                    "o jogador pressiona uma tecla e vai automaticamente para o próximo capítulo.",
                    "",
                    "Isto é útil para sequências narrativas longas sem escolhas."
                },
                NextChapter = "init_inicio"
            };

            SaveChapter(chapterStart);
            SaveChapter(chapterOptions);
            SaveChapter(chapterContinuation);
        }
    }
}