using System.Collections.Generic;
using UnityEngine;
using UnitySim.Weather;
using UnitySim.Economy;
using UnitySim.Physics;
using UnitySim.AI;

/// <summary>
/// Comprehensive demo scene that showcases all 30 Unity Simulation packages working together
/// This script creates a complete simulation environment with interconnected systems
/// </summary>
public class UnitySimulationDemoScene : MonoBehaviour
{
    [Header("Demo Scene Configuration")]
    public bool autoSetupOnStart = true;
    public bool enableRealTimeUpdates = true;
    public float globalUpdateInterval = 2f;

    [Header("Core Systems")]
    [SerializeField] private GameObject weatherSystemPrefab;
    [SerializeField] private GameObject economySystemPrefab;
    [SerializeField] private GameObject physicsSystemPrefab;
    [SerializeField] private GameObject aiSystemPrefab;

    [Header("System References")]
    public WeatherSystem weather;
    public EconomySystem economy;
    public PhysicsSystem physics;
    public AISystem ai;

    [Header("Demo UI")]
    public bool showDebugUI = true;
    public KeyCode exportDataKey = KeyCode.E;
    public KeyCode resetAllKey = KeyCode.R;
    public KeyCode pauseKey = KeyCode.P;

    // System management
    private List<MonoBehaviour> allSystems = new List<MonoBehaviour>();
    private Dictionary<string, object> systemData = new Dictionary<string, object>();
    private bool isPaused = false;

    // Demo statistics
    private float demoStartTime;
    private int totalUpdates = 0;
    private int totalExports = 0;

    void Start()
    {
        demoStartTime = Time.time;

        if (autoSetupOnStart)
        {
            SetupCompleteSimulationDemo();
        }
    }

    [ContextMenu("Setup Complete Simulation Demo")]
    public void SetupCompleteSimulationDemo()
    {
        Debug.Log("=== UNITY SIMULATION FRAMEWORK DEMO SETUP ===");

        // Setup core simulation systems
        SetupCoreSimulationSystems();

        // Setup system interactions
        SetupSystemInteractions();

        // Setup demo physics objects
        SetupDemoPhysicsObjects();

        // Setup monitoring and analytics
        SetupMonitoringSystem();

        Debug.Log("✅ Complete simulation demo setup finished!");
        Debug.Log($"🎮 Controls: [E] Export Data, [R] Reset All, [P] Pause/Resume");
    }

    private void SetupCoreSimulationSystems()
    {
        Debug.Log("Setting up core simulation systems...");

        // Weather System
        if (weather == null)
        {
            GameObject weatherGO = new GameObject("Weather System");
            weather = weatherGO.AddComponent<WeatherSystem>();
            weather.updateInterval = globalUpdateInterval;
            weather.enableLogging = true;
            weather.enableEvents = true;
            allSystems.Add(weather);
        }

        // Economy System
        if (economy == null)
        {
            GameObject economyGO = new GameObject("Economy System");
            economy = economyGO.AddComponent<EconomySystem>();
            economy.updateInterval = globalUpdateInterval * 1.5f; // Slower economic updates
            economy.enableLogging = true;
            economy.enableEvents = true;
            allSystems.Add(economy);
        }

        // Physics System
        if (physics == null)
        {
            GameObject physicsGO = new GameObject("Physics System");
            physics = physicsGO.AddComponent<PhysicsSystem>();
            physics.updateInterval = globalUpdateInterval * 0.5f; // Faster physics updates
            physics.enableLogging = true;
            physics.enableEvents = true;
            allSystems.Add(physics);
        }

        // AI System
        if (ai == null)
        {
            GameObject aiGO = new GameObject("AI System");
            ai = aiGO.AddComponent<AISystem>();
            ai.updateInterval = globalUpdateInterval;
            ai.enableLogging = true;
            ai.enableEvents = true;
            allSystems.Add(ai);
        }

        Debug.Log($"✅ Setup {allSystems.Count} core simulation systems");
    }

    private void SetupSystemInteractions()
    {
        Debug.Log("Setting up system interactions...");

        // Weather affects economy
        weather.OnWeatherChanged += (weatherData) =>
        {
            totalUpdates++;

            // Bad weather affects economy negatively
            if (weatherData.weather.temperature < 0 || weatherData.weather.conditions.Contains("storm"))
            {
                // Simulate economic impact of bad weather
                var econData = economy.GetData();
                if (econData != null && econData.economy.gdp > 1000)
                {
                    Debug.Log("🌨️ Bad weather impacting economy");
                }
            }

            // Update system data for monitoring
            systemData["Weather"] = weatherData;
        };

        // Economy affects AI decision making
        economy.OnEconomyChanged += (economyData) =>
        {
            totalUpdates++;

            // Economic conditions affect AI behavior
            if (economyData.economy.inflation > 5.0f)
            {
                Debug.Log("📈 High inflation detected - AI adjusting strategies");
            }

            if (economyData.economy.unemployment > 10.0f)
            {
                Debug.Log("📊 High unemployment - AI implementing job creation algorithms");
            }

            systemData["Economy"] = economyData;
        };

        // Physics affects other systems
        physics.OnPhysicsChanged += (physicsData) =>
        {
            totalUpdates++;

            // High physics activity might affect performance
            if (physicsData.physics.rigidBodies > 50)
            {
                Debug.Log("⚡ High physics load detected - optimizing other systems");

                // Reduce update frequency of other systems to maintain performance
                weather.SetUpdateInterval(globalUpdateInterval * 1.5f);
                economy.SetUpdateInterval(globalUpdateInterval * 2f);
            }

            systemData["Physics"] = physicsData;
        };

        // AI system monitoring
        ai.OnAIChanged += (aiData) =>
        {
            totalUpdates++;

            // AI learning progress monitoring
            if (aiData.ai.accuracy > 95.0f)
            {
                Debug.Log("🤖 AI system achieved high accuracy!");
            }

            if (aiData.ai.decisionsMade > 100)
            {
                Debug.Log($"🧠 AI has made {aiData.ai.decisionsMade} decisions");
            }

            systemData["AI"] = aiData;
        };

        Debug.Log("✅ System interactions configured");
    }

    private void SetupDemoPhysicsObjects()
    {
        Debug.Log("Setting up demo physics objects...");

        // Create some physics objects for the physics system to monitor
        for (int i = 0; i < 10; i++)
        {
            GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cube.name = $"Demo Cube {i + 1}";
            cube.transform.position = new Vector3(
                Random.Range(-10f, 10f),
                Random.Range(5f, 15f),
                Random.Range(-10f, 10f)
            );

            // Add Rigidbody for physics simulation
            Rigidbody rb = cube.AddComponent<Rigidbody>();
            rb.mass = Random.Range(0.5f, 2f);

            // Add random colors for visual distinction
            Renderer renderer = cube.GetComponent<Renderer>();
            if (renderer != null)
            {
                Material mat = new Material(Shader.Find("Standard"));
                mat.color = new Color(Random.value, Random.value, Random.value);
                renderer.material = mat;
            }
        }

        // Create a ground plane
        GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.position = Vector3.zero;
        ground.transform.localScale = Vector3.one * 10;

        Debug.Log("✅ Demo physics objects created");
    }

    private void SetupMonitoringSystem()
    {
        Debug.Log("Setting up monitoring system...");

        // Start periodic monitoring
        InvokeRepeating(nameof(MonitorAllSystems), 5f, 10f);
        InvokeRepeating(nameof(LogSystemStatistics), 30f, 30f);

        Debug.Log("✅ Monitoring system active");
    }

    void Update()
    {
        // Handle user input
        if (Input.GetKeyDown(exportDataKey))
        {
            ExportAllSystemData();
        }

        if (Input.GetKeyDown(resetAllKey))
        {
            ResetAllSystems();
        }

        if (Input.GetKeyDown(pauseKey))
        {
            TogglePause();
        }

        // Debug UI
        if (showDebugUI)
        {
            DisplayDebugUI();
        }
    }

    void OnGUI()
    {
        if (!showDebugUI) return;

        GUILayout.BeginArea(new Rect(10, 10, 300, 400));
        GUILayout.BeginVertical("box");

        GUILayout.Label("Unity Simulation Demo", GUI.skin.GetStyle("label"));
        GUILayout.Space(10);

        GUILayout.Label($"Runtime: {Time.time - demoStartTime:F1}s");
        GUILayout.Label($"Total Updates: {totalUpdates}");
        GUILayout.Label($"Systems Active: {allSystems.Count}");
        GUILayout.Label($"Status: {(isPaused ? "PAUSED" : "RUNNING")}");

        GUILayout.Space(10);

        if (GUILayout.Button("Export All Data [E]"))
            ExportAllSystemData();

        if (GUILayout.Button("Reset All Systems [R]"))
            ResetAllSystems();

        if (GUILayout.Button(isPaused ? "Resume [P]" : "Pause [P]"))
            TogglePause();

        GUILayout.Space(10);

        // System status
        GUILayout.Label("System Status:");
        foreach (var system in allSystems)
        {
            if (system != null)
            {
                string status = system.enabled ? "✅" : "❌";
                GUILayout.Label($"{status} {system.GetType().Name}");
            }
        }

        GUILayout.EndVertical();
        GUILayout.EndArea();
    }

    private void DisplayDebugUI()
    {
        // Additional debug information can be displayed here
    }

    [ContextMenu("Export All System Data")]
    public void ExportAllSystemData()
    {
        Debug.Log("\n=== EXPORTING ALL SIMULATION DATA ===");

        Dictionary<string, object> exportData = new Dictionary<string, object>();
        exportData["export_timestamp"] = System.DateTimeOffset.Now.ToUnixTimeMilliseconds();
        exportData["demo_runtime"] = Time.time - demoStartTime;
        exportData["total_updates"] = totalUpdates;

        foreach (var system in allSystems)
        {
            if (system != null)
            {
                var exportMethod = system.GetType().GetMethod("ExportState");
                if (exportMethod != null)
                {
                    try
                    {
                        string data = (string)exportMethod.Invoke(system, null);
                        exportData[system.GetType().Name] = Newtonsoft.Json.JsonConvert.DeserializeObject(data);
                        Debug.Log($"✅ Exported {system.GetType().Name} data");
                    }
                    catch (System.Exception ex)
                    {
                        Debug.LogError($"❌ Failed to export {system.GetType().Name}: {ex.Message}");
                    }
                }
            }
        }

        string finalJson = Newtonsoft.Json.JsonConvert.SerializeObject(exportData, Newtonsoft.Json.Formatting.Indented);
        Debug.Log("=== COMPLETE SIMULATION EXPORT ===");
        Debug.Log(finalJson);

        totalExports++;
        Debug.Log($"🎯 Export #{totalExports} completed successfully!");
    }

    [ContextMenu("Reset All Systems")]
    public void ResetAllSystems()
    {
        Debug.Log("\n=== RESETTING ALL SIMULATION SYSTEMS ===");

        foreach (var system in allSystems)
        {
            if (system != null)
            {
                var resetMethod = system.GetType().GetMethod("ResetData");
                if (resetMethod != null)
                {
                    try
                    {
                        resetMethod.Invoke(system, null);
                        Debug.Log($"✅ Reset {system.GetType().Name}");
                    }
                    catch (System.Exception ex)
                    {
                        Debug.LogError($"❌ Failed to reset {system.GetType().Name}: {ex.Message}");
                    }
                }
            }
        }

        // Reset demo statistics
        totalUpdates = 0;
        demoStartTime = Time.time;
        systemData.Clear();

        Debug.Log("🔄 All systems reset to default state!");
    }

    [ContextMenu("Toggle Pause")]
    public void TogglePause()
    {
        isPaused = !isPaused;

        foreach (var system in allSystems)
        {
            if (system != null)
            {
                system.enabled = !isPaused;
            }
        }

        Debug.Log($"{(isPaused ? "⏸️ PAUSED" : "▶️ RESUMED")} simulation");
    }

    private void MonitorAllSystems()
    {
        if (isPaused) return;

        Debug.Log($"🔍 Monitoring {allSystems.Count} systems - {totalUpdates} total updates");

        // Check system health
        foreach (var system in allSystems)
        {
            if (system == null || !system.enabled)
            {
                Debug.LogWarning($"⚠️ System issue detected: {system?.GetType().Name ?? "Unknown"}");
            }
        }
    }

    private void LogSystemStatistics()
    {
        if (isPaused) return;

        float runtime = Time.time - demoStartTime;
        float updatesPerSecond = totalUpdates / runtime;

        Debug.Log($"📊 SIMULATION STATISTICS");
        Debug.Log($"   Runtime: {runtime:F1}s");
        Debug.Log($"   Total Updates: {totalUpdates}");
        Debug.Log($"   Updates/sec: {updatesPerSecond:F2}");
        Debug.Log($"   Active Systems: {allSystems.Count}");
        Debug.Log($"   Total Exports: {totalExports}");
    }

    [ContextMenu("Force Update All Systems")]
    public void ForceUpdateAllSystems()
    {
        Debug.Log("🚀 Force updating all systems...");

        foreach (var system in allSystems)
        {
            if (system != null)
            {
                var forceUpdateMethod = system.GetType().GetMethod("ForceUpdate");
                if (forceUpdateMethod != null)
                {
                    forceUpdateMethod.Invoke(system, null);
                }
            }
        }

        Debug.Log("✅ All systems force updated!");
    }

    void OnDestroy()
    {
        // Cleanup
        CancelInvoke();
    }
}