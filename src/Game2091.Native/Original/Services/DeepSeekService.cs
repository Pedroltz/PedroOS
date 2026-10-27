using Newtonsoft.Json;
using RetroGame2091.Core.Interfaces;
using RetroGame2091.Core.Models;
using System.Net.Http.Headers;
using System.Text;

namespace RetroGame2091.Services
{
    public class DeepSeekService : IDeepSeekService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private const string API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";

        public DeepSeekService()
        {
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
            _apiKey = LoadAPIKey();

            if (!string.IsNullOrEmpty(_apiKey))
            {
                _httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", _apiKey);
            }
        }

        private string LoadAPIKey()
        {
            try
            {
                string configPath = Path.Combine("Config", "api-keys.json");
                if (File.Exists(configPath))
                {
                    string json = File.ReadAllText(configPath);
                    var config = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
                    return config?.GetValueOrDefault("deepseek_api_key", "") ?? "";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading API key: {ex.Message}");
            }

            return "";
        }

        public bool IsConfigured()
        {
            return !string.IsNullOrEmpty(_apiKey);
        }

        public async Task<string?> SendMessageAsync(List<ChatMessage> conversationHistory, string systemPrompt)
        {
            if (!IsConfigured())
            {
                return null;
            }

            try
            {
                var messages = new List<DeepSeekMessage>
                {
                    new DeepSeekMessage { Role = "system", Content = systemPrompt }
                };

                // Add conversation history
                foreach (var msg in conversationHistory)
                {
                    messages.Add(new DeepSeekMessage
                    {
                        Role = msg.Role,
                        Content = msg.Content
                    });
                }

                var request = new DeepSeekRequest
                {
                    Model = "deepseek-chat",
                    Messages = messages,
                    Temperature = 0.7f,
                    MaxTokens = 300
                };

                string jsonRequest = JsonConvert.SerializeObject(request);
                var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(API_ENDPOINT, content);

                if (!response.IsSuccessStatusCode)
                {
                    string errorBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"DeepSeek API error: {response.StatusCode} - {errorBody}");
                    return null;
                }

                string jsonResponse = await response.Content.ReadAsStringAsync();
                var deepSeekResponse = JsonConvert.DeserializeObject<DeepSeekResponse>(jsonResponse);

                return deepSeekResponse?.Choices?.FirstOrDefault()?.Message?.Content;
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Network error calling DeepSeek: {ex.Message}");
                return null;
            }
            catch (TaskCanceledException)
            {
                Console.WriteLine("DeepSeek API request timed out");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Unexpected error calling DeepSeek: {ex.Message}");
                return null;
            }
        }
    }
}
