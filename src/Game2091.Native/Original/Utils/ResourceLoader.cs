using System.Reflection;
using System.Text;

namespace RetroGame2091.Utils
{
    public static class ResourceLoader
    {
        private static readonly Assembly _assembly = Assembly.GetExecutingAssembly();
        private static bool _debugMode = false;

        /// <summary>
        /// Loads an embedded JSON resource from the assembly
        /// </summary>
        /// <param name="resourcePath">Path like "Chapters/Prologo/init_inicio.json"</param>
        /// <returns>JSON content as string, or null if not found</returns>
        public static string? LoadEmbeddedJson(string resourcePath)
        {
            // Convert file path to resource name format
            // "Chapters/Prologo/init_inicio.json" -> "RetroGame2091.Chapters.Prologo.init_inicio.json"
            string resourceName = $"RetroGame2091.{resourcePath.Replace('/', '.').Replace('\\', '.')}";

            try
            {
                // Try exact match first
                using (Stream? stream = _assembly.GetManifestResourceStream(resourceName))
                {
                    if (stream != null)
                    {
                        using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
                        {
                            return reader.ReadToEnd();
                        }
                    }
                }

                // If not found, try to find a matching resource (case-insensitive, partial match)
                var allResources = _assembly.GetManifestResourceNames();
                var searchPattern = resourcePath.Replace('/', '.').Replace('\\', '.');

                var matchingResource = allResources.FirstOrDefault(r =>
                    r.EndsWith(searchPattern, StringComparison.OrdinalIgnoreCase) ||
                    r.Contains(searchPattern, StringComparison.OrdinalIgnoreCase));

                if (matchingResource != null)
                {
                    using (Stream? stream = _assembly.GetManifestResourceStream(matchingResource))
                    {
                        if (stream != null)
                        {
                            using (StreamReader reader = new StreamReader(stream, Encoding.UTF8))
                            {
                                return reader.ReadToEnd();
                            }
                        }
                    }
                }

                // Debug: List all resources if in debug mode
                if (_debugMode)
                {
                    Console.WriteLine($"[DEBUG] Resource not found: {resourceName}");
                    Console.WriteLine($"[DEBUG] Available resources ({allResources.Length}):");
                    foreach (var res in allResources)
                    {
                        Console.WriteLine($"  - {res}");
                    }
                }
            }
            catch (Exception ex)
            {
                if (_debugMode)
                {
                    Console.WriteLine($"[DEBUG] Error loading resource: {ex.Message}");
                }
            }

            return null;
        }

        /// <summary>
        /// Checks if an embedded resource exists
        /// </summary>
        public static bool ResourceExists(string resourcePath)
        {
            string resourceName = $"RetroGame2091.{resourcePath.Replace('/', '.').Replace('\\', '.')}";
            return _assembly.GetManifestResourceNames().Contains(resourceName);
        }

        /// <summary>
        /// Lists all embedded resources matching a pattern
        /// </summary>
        public static string[] GetResourceNames(string pattern)
        {
            return _assembly.GetManifestResourceNames()
                .Where(r => r.Contains(pattern))
                .ToArray();
        }

        /// <summary>
        /// Lists ALL embedded resources (for debugging)
        /// </summary>
        public static string[] GetAllResourceNames()
        {
            return _assembly.GetManifestResourceNames();
        }

        /// <summary>
        /// Enables debug mode to print resource loading information
        /// </summary>
        public static void EnableDebugMode()
        {
            _debugMode = true;
        }
    }
}
