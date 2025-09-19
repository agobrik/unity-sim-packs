using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnitySim.Weather;
using UnitySim.Economy;
using UnitySim.Physics;
using UnitySim.AI;

public class PackageExamplesManager : MonoBehaviour
{
    [Header("Example Systems")]
    public WeatherSystem weatherSystem;
    public EconomySystem economySystem;
    public PhysicsSystem physicsSystem;
    public AISystem aiSystem;

    [Header("Example Configuration")]
    public bool autoSetupExamples = true;
    public float exampleUpdateInterval = 2f;

    void Start()
    {
        if (autoSetupExamples)
        {
            SetupAllExamples();
        }
    }

    [ContextMenu("Setup All Examples")]
    public void SetupAllExamples()
    {
        Debug.Log("=== Setting up Unity Simulation Package Examples ===");

        SetupWeatherExample();
        SetupEconomyExample();
        SetupPhysicsExample();
        SetupAIExample();

        Debug.Log("✅ All package examples setup complete!");
    }

    private void SetupWeatherExample()
    {
        if (weatherSystem == null)
        {
            GameObject weatherGO = new GameObject("Weather System Example");
            weatherSystem = weatherGO.AddComponent<WeatherSystem>();
        }

        // Configure weather system
        weatherSystem.updateInterval = exampleUpdateInterval;
        weatherSystem.enableLogging = true;
        weatherSystem.enableEvents = true;

        // Subscribe to weather events
        weatherSystem.OnWeatherChanged += (weatherData) =>
        {
            Debug.Log($"Weather Update: {weatherData.weather.temperature}°C, {weatherData.weather.conditions}");
        };

        weatherSystem.OnDataExported += (jsonData) =>
        {
            Debug.Log("Weather data exported successfully");
        };

        Debug.Log("Weather System example configured");
    }

    private void SetupEconomyExample()
    {
        if (economySystem == null)
        {
            GameObject economyGO = new GameObject("Economy System Example");
            economySystem = economyGO.AddComponent<EconomySystem>();
        }

        // Configure economy system
        economySystem.updateInterval = exampleUpdateInterval;
        economySystem.enableLogging = true;
        economySystem.enableEvents = true;

        // Subscribe to economy events
        economySystem.OnEconomyChanged += (economyData) =>
        {
            Debug.Log($"Economy Update: GDP ${economyData.economy.gdp:F0}, Inflation {economyData.economy.inflation:F1}%");
        };

        economySystem.OnDataExported += (jsonData) =>
        {
            Debug.Log("Economy data exported successfully");
        };

        Debug.Log("Economy System example configured");
    }

    private void SetupPhysicsExample()
    {
        if (physicsSystem == null)
        {
            GameObject physicsGO = new GameObject("Physics System Example");
            physicsSystem = physicsGO.AddComponent<PhysicsSystem>();
        }

        // Configure physics system
        physicsSystem.updateInterval = exampleUpdateInterval;
        physicsSystem.enableLogging = true;
        physicsSystem.enableEvents = true;

        // Subscribe to physics events
        physicsSystem.OnPhysicsChanged += (physicsData) =>
        {
            Debug.Log($"Physics Update: {physicsData.physics.rigidBodies} bodies, {physicsData.physics.collisions} collisions");
        };

        physicsSystem.OnDataExported += (jsonData) =>
        {
            Debug.Log("Physics data exported successfully");
        };

        Debug.Log("Physics System example configured");
    }

    private void SetupAIExample()
    {
        if (aiSystem == null)
        {
            GameObject aiGO = new GameObject("AI System Example");
            aiSystem = aiGO.AddComponent<AISystem>();
        }

        // Configure AI system
        aiSystem.updateInterval = exampleUpdateInterval;
        aiSystem.enableLogging = true;
        aiSystem.enableEvents = true;

        // Subscribe to AI events
        aiSystem.OnAIChanged += (aiData) =>
        {
            Debug.Log($"AI Update: {aiData.ai.agentCount} agents, {aiData.ai.accuracy:F1}% accuracy");
        };

        aiSystem.OnDataExported += (jsonData) =>
        {
            Debug.Log("AI data exported successfully");
        };

        Debug.Log("AI System example configured");
    }

    [ContextMenu("Test All Systems")]
    public void TestAllSystems()
    {
        Debug.Log("\n=== Testing All Systems ===");

        if (weatherSystem != null)
        {
            weatherSystem.ForceUpdate();
            string weatherData = weatherSystem.ExportState();
            Debug.Log($"Weather System Test: {!string.IsNullOrEmpty(weatherData)}");
        }

        if (economySystem != null)
        {
            economySystem.ForceUpdate();
            string economyData = economySystem.ExportState();
            Debug.Log($"Economy System Test: {!string.IsNullOrEmpty(economyData)}");
        }

        if (physicsSystem != null)
        {
            physicsSystem.ForceUpdate();
            string physicsData = physicsSystem.ExportState();
            Debug.Log($"Physics System Test: {!string.IsNullOrEmpty(physicsData)}");
        }

        if (aiSystem != null)
        {
            aiSystem.ForceUpdate();
            string aiData = aiSystem.ExportState();
            Debug.Log($"AI System Test: {!string.IsNullOrEmpty(aiData)}");
        }

        Debug.Log("✅ All system tests completed");
    }

    [ContextMenu("Export All Data")]
    public void ExportAllData()
    {
        Debug.Log("\n=== Exporting All System Data ===");

        weatherSystem?.ExportWeatherToConsole();
        economySystem?.ExportEconomyToConsole();
        physicsSystem?.ExportPhysicsToConsole();
        aiSystem?.ExportAIToConsole();

        Debug.Log("✅ All data exported to console");
    }

    [ContextMenu("Reset All Systems")]
    public void ResetAllSystems()
    {
        Debug.Log("\n=== Resetting All Systems ===");

        weatherSystem?.ResetData();
        economySystem?.ResetData();
        physicsSystem?.ResetData();
        aiSystem?.ResetData();

        Debug.Log("✅ All systems reset to default state");
    }

    void Update()
    {
        // Example of runtime interaction
        if (Input.GetKeyDown(KeyCode.T))
        {
            TestAllSystems();
        }

        if (Input.GetKeyDown(KeyCode.E))
        {
            ExportAllData();
        }

        if (Input.GetKeyDown(KeyCode.R))
        {
            ResetAllSystems();
        }
    }
}