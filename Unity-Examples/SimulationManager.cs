using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnitySim.Weather;
using UnitySim.Economy;
using UnitySim.Physics;
using UnitySim.Ai;

namespace UnitySim.Examples
{
    public class SimulationManager : MonoBehaviour
    {
        [Header("Simulation Systems")]
        public WeatherSystem weatherSystem;
        public EconomySystem economySystem;
        public PhysicsSystem physicsSystem;
        public AiSystem aiSystem;

        [Header("UI Elements")]
        public Text weatherDisplay;
        public Text economyDisplay;
        public Text physicsDisplay;
        public Text aiDisplay;
        public Button exportAllButton;

        [Header("Settings")]
        public bool autoExport = false;
        public float exportInterval = 5f;

        private float exportTimer = 0f;
        private Dictionary<string, object> allSimulationData = new Dictionary<string, object>();

        void Start()
        {
            SetupEventListeners();
            SetupUI();
        }

        void Update()
        {
            if (autoExport)
            {
                exportTimer += Time.deltaTime;
                if (exportTimer >= exportInterval)
                {
                    ExportAllData();
                    exportTimer = 0f;
                }
            }
        }

        private void SetupEventListeners()
        {
            if (weatherSystem != null)
                weatherSystem.OnWeatherChanged += UpdateWeatherDisplay;

            if (economySystem != null)
                economySystem.OnEconomyChanged += UpdateEconomyDisplay;

            if (physicsSystem != null)
                physicsSystem.OnPhysicsChanged += UpdatePhysicsDisplay;

            if (aiSystem != null)
                aiSystem.OnAiChanged += UpdateAIDisplay;
        }

        private void SetupUI()
        {
            if (exportAllButton != null)
            {
                exportAllButton.onClick.AddListener(ExportAllData);
            }
        }

        private void UpdateWeatherDisplay(WeatherData data)
        {
            if (weatherDisplay != null)
            {
                weatherDisplay.text = $"🌡️ Weather\\n" +
                    $"Temperature: {data.weather.temperature:F1}°C\\n" +
                    $"Humidity: {data.weather.humidity}%\\n" +
                    $"Wind: {data.weather.windSpeed:F1} km/h\\n" +
                    $"Pressure: {data.weather.pressure:F1} hPa";
            }

            allSimulationData["weather"] = data;
        }

        private void UpdateEconomyDisplay(EconomyData data)
        {
            if (economyDisplay != null)
            {
                economyDisplay.text = $"💰 Economy\\n" +
                    $"Market: ${data.economy.marketValue:F0}\\n" +
                    $"Inflation: {data.economy.inflation:F1}%\\n" +
                    $"Unemployment: {data.economy.unemployment:F1}%\\n" +
                    $"GDP Growth: {data.economy.gdpGrowth:F1}%";
            }

            allSimulationData["economy"] = data;
        }

        private void UpdatePhysicsDisplay(PhysicsData data)
        {
            if (physicsDisplay != null)
            {
                physicsDisplay.text = $"⚡ Physics\\n" +
                    $"Gravity: {data.physics.gravity:F2}\\n" +
                    $"Rigid Bodies: {data.physics.rigidBodies}\\n" +
                    $"Constraints: {data.physics.constraints}\\n" +
                    $"Collisions: {data.physics.collisions}";
            }

            allSimulationData["physics"] = data;
        }

        private void UpdateAIDisplay(AiData data)
        {
            if (aiDisplay != null)
            {
                aiDisplay.text = $"🤖 AI\\n" +
                    $"Agents: {data.ai.agents}\\n" +
                    $"Decisions: {data.ai.decisions}\\n" +
                    $"Behavior Trees: {data.ai.behaviorTrees}\\n" +
                    $"Learning: {(data.ai.learning ? "Active" : "Inactive")}";
            }

            allSimulationData["ai"] = data;
        }

        public void ExportAllData()
        {
            Debug.Log("🎯 EXPORTING ALL SIMULATION DATA:");

            foreach (var kvp in allSimulationData)
            {
                Debug.Log($"=== {kvp.Key.ToUpper()} DATA ===");

                switch (kvp.Key)
                {
                    case "weather":
                        Debug.Log(weatherSystem?.ExportState());
                        break;
                    case "economy":
                        Debug.Log(economySystem?.ExportState());
                        break;
                    case "physics":
                        Debug.Log(physicsSystem?.ExportState());
                        break;
                    case "ai":
                        Debug.Log(aiSystem?.ExportState());
                        break;
                }
            }
        }

        // Public methods for UI buttons
        public void ToggleAutoExport()
        {
            autoExport = !autoExport;
            Debug.Log($"Auto Export: {(autoExport ? "Enabled" : "Disabled")}");
        }

        public void ExportWeatherOnly()
        {
            if (weatherSystem != null)
            {
                Debug.Log("Weather Data: " + weatherSystem.ExportState());
            }
        }

        public void ExportEconomyOnly()
        {
            if (economySystem != null)
            {
                Debug.Log("Economy Data: " + economySystem.ExportState());
            }
        }

        public void SaveDataToFile()
        {
            string fileName = $"simulation_data_{System.DateTime.Now:yyyyMMdd_HHmmss}.json";
            string filePath = System.IO.Path.Combine(Application.persistentDataPath, fileName);

            var allData = new Dictionary<string, object>();

            if (weatherSystem != null)
                allData["weather"] = weatherSystem.GetData();
            if (economySystem != null)
                allData["economy"] = economySystem.GetData();
            if (physicsSystem != null)
                allData["physics"] = physicsSystem.GetData();
            if (aiSystem != null)
                allData["ai"] = aiSystem.GetData();

            string jsonData = Newtonsoft.Json.JsonConvert.SerializeObject(allData, Newtonsoft.Json.Formatting.Indented);
            System.IO.File.WriteAllText(filePath, jsonData);

            Debug.Log($"📄 Data saved to: {filePath}");
        }

        void OnDestroy()
        {
            // Clean up event listeners
            if (weatherSystem != null)
                weatherSystem.OnWeatherChanged -= UpdateWeatherDisplay;
            if (economySystem != null)
                economySystem.OnEconomyChanged -= UpdateEconomyDisplay;
            if (physicsSystem != null)
                physicsSystem.OnPhysicsChanged -= UpdatePhysicsDisplay;
            if (aiSystem != null)
                aiSystem.OnAiChanged -= UpdateAIDisplay;
        }

        void OnGUI()
        {
            GUILayout.BeginArea(new Rect(10, 10, 300, 400));

            GUILayout.Label("Unity Simulation Dashboard", GUI.skin.box);

            if (GUILayout.Button("Export All Data"))
            {
                ExportAllData();
            }

            if (GUILayout.Button("Save to File"))
            {
                SaveDataToFile();
            }

            GUILayout.Label($"Auto Export: {(autoExport ? "ON" : "OFF")}");
            if (GUILayout.Button("Toggle Auto Export"))
            {
                ToggleAutoExport();
            }

            GUILayout.Space(10);

            GUILayout.Label("Individual Exports:");
            if (GUILayout.Button("Export Weather"))
                ExportWeatherOnly();
            if (GUILayout.Button("Export Economy"))
                ExportEconomyOnly();

            GUILayout.EndArea();
        }
    }
}