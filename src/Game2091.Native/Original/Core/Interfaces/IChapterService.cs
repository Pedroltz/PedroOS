using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IChapterService
    {
        Chapter? LoadChapter(string id);
        void SaveChapter(Chapter chapter);
        void CreateExampleChapters();
    }
}