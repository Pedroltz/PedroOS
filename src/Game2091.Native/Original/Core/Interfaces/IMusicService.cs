namespace RetroGame2091.Core.Interfaces
{
    public interface IMusicService
    {
        void StartTitleMusic();
        void StopMusic();
        bool IsMusicPlaying();
    }
}