using RetroGame2091.Core.Models;

namespace RetroGame2091.Core.Interfaces
{
    public interface IEnemyService
    {
        Enemy? LoadEnemy(string enemyId);
        Enemy? CreateSampleEnemy();
        void CreateSampleEnemies();
        bool EnemyExists(string enemyId);
    }
}