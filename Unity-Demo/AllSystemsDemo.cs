using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using System.Reflection;
using Newtonsoft.Json;

namespace UnitySim.Demo
{
    public class AllSystemsDemo : MonoBehaviour
    {
        [Header("Demo Configuration")]
        public bool autoStartSystems = true;
        public float dataRefreshRate = 2f;
        public bool enableRealTimeDisplay = true;

        [Header("UI Components")]
        public Transform systemsParent;
        public Text globalStatusText;
        public Button exportAllButton;
        public Button resetAllButton;
        public Button toggleAllButton;
        public ScrollRect systemsScrollView;

        [Header("System Prefabs")]
        public GameObject systemDisplayPrefab;

        // Dynamic system tracking
        private Dictionary<string, MonoBehaviour> activeSystems = new Dictionary<string, MonoBehaviour>();
        private Dictionary<string, GameObject> systemDisplays = new Dictionary<string, GameObject>();
        private Dictionary<string, string> systemData = new Dictionary<string, string>();

        private bool allSystemsActive = true;
        private float refreshTimer = 0f;
        private int totalSystemsFound = 0;
        private int totalSystemsWorking = 0;

        // Expected system types for comprehensive demo
        private readonly string[] systemTypes = {
            "AdvancedEconomicsSystem", "AgricultureSystem", "AISystem", "AIDecisionFrameworkSystem",
            "AnalyticsSystem", "DataVisualizationSystem", "DisasterManagementSystem", "EconomySystem",
            "EcosystemSystem", "ElectricalGridSystem", "FluidDynamicsSystem", "ManufacturingSystem",
            "MiningGeologySystem", "MLIntegrationSystem", "ModdingSystem", "NetworkMultiplayerSystem",
            "PerformanceSystem", "PhysicsSystem", "PopulationSystem", "ProceduralSystem",
            "ProceduralGenerationSystem", "RealWorldDataAdaptersSystem", "ResourcesSystem",
            "SimulationAlgorithmsSystem", "SupplyChainSystem", "TimeSystem", "UITemplatesSystem",
            "UrbanPlanningSystem", "VehicleSimulationSystem", "WeatherSystem"
        };

        #region Unity Lifecycle

        void Start()
        {
            InitializeDemo();
            if (autoStartSystems)
            {
                StartAllSystems();
            }
        }

        void Update()
        {
            if (enableRealTimeDisplay)
            {
                refreshTimer += Time.deltaTime;
                if (refreshTimer >= dataRefreshRate)
                {
                    RefreshAllSystemData();
                    refreshTimer = 0f;
                }
            }
        }

        #endregion

        #region Initialization

        private void InitializeDemo()
        {
            SetupUI();
            ScanForSystems();
            CreateSystemDisplays();

            Debug.Log($"🎮 All Systems Demo Initialized");
            Debug.Log($"📊 Found {totalSystemsFound} systems");
        }

        private void SetupUI()
        {
            if (exportAllButton != null)
                exportAllButton.onClick.AddListener(ExportAllSystemData);

            if (resetAllButton != null)
                resetAllButton.onClick.AddListener(ResetAllSystems);

            if (toggleAllButton != null)
                toggleAllButton.onClick.AddListener(ToggleAllSystems);
        }

        private void ScanForSystems()
        {
            activeSystems.Clear();
            MonoBehaviour[] allBehaviours = FindObjectsOfType<MonoBehaviour>();

            foreach (string systemType in systemTypes)
            {
                foreach (var behaviour in allBehaviours)
                {
                    if (behaviour.GetType().Name == systemType)
                    {
                        activeSystems[systemType] = behaviour;
                        totalSystemsFound++;

                        // Subscribe to system events if available
                        SubscribeToSystemEvents(systemType, behaviour);

                        Debug.Log($"✅ Found and registered: {systemType}");
                        break;
                    }
                }
            }

            totalSystemsWorking = totalSystemsFound; // Assume all found systems are working initially
        }

        private void SubscribeToSystemEvents(string systemType, MonoBehaviour system)
        {
            try
            {
                // Use reflection to find and subscribe to events
                var eventFields = system.GetType().GetFields()
                    .Where(f => f.FieldType.IsGenericType &&
                               f.FieldType.GetGenericTypeDefinition() == typeof(System.Action<>));

                foreach (var eventField in eventFields)
                {
                    if (eventField.Name.Contains("Changed") || eventField.Name.Contains("Updated"))
                    {
                        // Create a dynamic event handler
                        var eventHandler = CreateEventHandler(systemType, eventField.FieldType);
                        if (eventHandler != null)
                        {
                            var currentValue = eventField.GetValue(system);
                            if (currentValue == null)
                            {
                                eventField.SetValue(system, eventHandler);
                            }
                            else
                            {
                                // Combine with existing delegates
                                var combinedHandler = System.Delegate.Combine((System.Delegate)currentValue, (System.Delegate)eventHandler);
                                eventField.SetValue(system, combinedHandler);
                            }
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"⚠️ Could not subscribe to events for {systemType}: {e.Message}");
            }
        }

        private System.Delegate CreateEventHandler(string systemType, System.Type actionType)
        {
            // Create a generic event handler that updates our display
            var method = typeof(AllSystemsDemo).GetMethod("HandleSystemUpdate", BindingFlags.NonPublic | BindingFlags.Instance);
            if (method != null)
            {
                return System.Delegate.CreateDelegate(actionType, this, method);
            }
            return null;
        }

        private void HandleSystemUpdate(object data)
        {
            // Generic handler for all system updates
            string systemType = data?.GetType().Name ?? "Unknown";
            if (systemDisplays.ContainsKey(systemType))
            {
                // Update the display for this system
                UpdateSystemDisplay(systemType, data);
            }
        }

        #endregion

        #region System Displays

        private void CreateSystemDisplays()
        {
            if (systemsParent == null) return;

            foreach (var kvp in activeSystems)
            {
                CreateSystemDisplay(kvp.Key, kvp.Value);
            }
        }

        private void CreateSystemDisplay(string systemType, MonoBehaviour system)
        {
            GameObject display = new GameObject($"{systemType}_Display");
            display.transform.SetParent(systemsParent);

            // Add UI components
            var rectTransform = display.AddComponent<RectTransform>();
            rectTransform.sizeDelta = new Vector2(280, 120);

            var image = display.AddComponent<Image>();
            image.color = new Color(0.2f, 0.2f, 0.2f, 0.8f);

            // Title
            GameObject titleObj = new GameObject("Title");
            titleObj.transform.SetParent(display.transform);
            var titleText = titleObj.AddComponent<Text>();
            titleText.text = FormatSystemName(systemType);
            titleText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            titleText.fontSize = 14;
            titleText.fontStyle = FontStyle.Bold;
            titleText.color = Color.white;

            var titleRect = titleObj.GetComponent<RectTransform>();
            titleRect.anchorMin = new Vector2(0, 0.7f);
            titleRect.anchorMax = new Vector2(1, 1);
            titleRect.offsetMin = new Vector2(5, 0);
            titleRect.offsetMax = new Vector2(-5, -5);

            // Status
            GameObject statusObj = new GameObject("Status");
            statusObj.transform.SetParent(display.transform);
            var statusText = statusObj.AddComponent<Text>();
            statusText.text = "Initializing...";
            statusText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            statusText.fontSize = 10;
            statusText.color = Color.green;

            var statusRect = statusObj.GetComponent<RectTransform>();
            statusRect.anchorMin = new Vector2(0, 0.4f);
            statusRect.anchorMax = new Vector2(1, 0.7f);
            statusRect.offsetMin = new Vector2(5, 0);
            statusRect.offsetMax = new Vector2(-5, 0);

            // Data preview
            GameObject dataObj = new GameObject("Data");
            dataObj.transform.SetParent(display.transform);
            var dataText = dataObj.AddComponent<Text>();
            dataText.text = "No data";
            dataText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            dataText.fontSize = 8;
            dataText.color = Color.cyan;

            var dataRect = dataObj.GetComponent<RectTransform>();
            dataRect.anchorMin = new Vector2(0, 0);
            dataRect.anchorMax = new Vector2(1, 0.4f);
            dataRect.offsetMin = new Vector2(5, 5);
            dataRect.offsetMax = new Vector2(-5, 0);

            systemDisplays[systemType] = display;
        }

        private string FormatSystemName(string systemType)
        {
            return systemType.Replace("System", "").Replace("Simulation", "");
        }

        private void UpdateSystemDisplay(string systemType, object data)
        {
            if (!systemDisplays.ContainsKey(systemType)) return;

            GameObject display = systemDisplays[systemType];
            Text statusText = display.transform.Find("Status")?.GetComponent<Text>();
            Text dataText = display.transform.Find("Data")?.GetComponent<Text>();

            if (statusText != null)
            {
                statusText.text = "✅ Active & Running";
                statusText.color = Color.green;
            }

            if (dataText != null && data != null)
            {
                // Show abbreviated data
                string dataPreview = GetDataPreview(data);
                dataText.text = dataPreview;
            }
        }

        private string GetDataPreview(object data)
        {
            try
            {
                string json = JsonConvert.SerializeObject(data);
                var parsed = JsonConvert.DeserializeObject<Dictionary<string, object>>(json);

                string preview = "";
                int count = 0;
                foreach (var kvp in parsed)
                {
                    if (count >= 2) break;
                    preview += $"{kvp.Key}: {kvp.Value}\\n";
                    count++;
                }

                return preview;
            }
            catch
            {
                return data.ToString();
            }
        }

        #endregion

        #region System Control

        private void StartAllSystems()
        {
            foreach (var kvp in activeSystems)
            {
                if (kvp.Value != null)
                {
                    kvp.Value.enabled = true;
                    kvp.Value.gameObject.SetActive(true);
                }
            }

            Debug.Log($"🚀 Started all {activeSystems.Count} systems");
            UpdateGlobalStatus();
        }

        private void RefreshAllSystemData()
        {
            int workingSystems = 0;

            foreach (var kvp in activeSystems)
            {
                try
                {
                    string systemType = kvp.Key;
                    MonoBehaviour system = kvp.Value;

                    if (system != null && system.isActiveAndEnabled)
                    {
                        // Try to get data from ExportState method
                        var exportMethod = system.GetType().GetMethod("ExportState");
                        if (exportMethod != null)
                        {
                            string jsonData = (string)exportMethod.Invoke(system, null);
                            systemData[systemType] = jsonData;
                            workingSystems++;

                            // Update display
                            if (systemDisplays.ContainsKey(systemType))
                            {
                                UpdateSystemDisplayFromJson(systemType, jsonData);
                            }
                        }
                    }
                }
                catch (System.Exception e)
                {
                    Debug.LogWarning($"⚠️ Failed to refresh data for {kvp.Key}: {e.Message}");
                }
            }

            totalSystemsWorking = workingSystems;
            UpdateGlobalStatus();
        }

        private void UpdateSystemDisplayFromJson(string systemType, string jsonData)
        {
            if (!systemDisplays.ContainsKey(systemType)) return;

            GameObject display = systemDisplays[systemType];
            Text dataText = display.transform.Find("Data")?.GetComponent<Text>();

            if (dataText != null && !string.IsNullOrEmpty(jsonData))
            {
                try
                {
                    var parsed = JsonConvert.DeserializeObject<Dictionary<string, object>>(jsonData);
                    string preview = "";
                    int count = 0;

                    foreach (var kvp in parsed)
                    {
                        if (count >= 3) break;
                        if (kvp.Key != "timestamp" && kvp.Key != "currentTime")
                        {
                            preview += $"{kvp.Key}: {kvp.Value}\\n";
                            count++;
                        }
                    }

                    dataText.text = preview;
                }
                catch
                {
                    dataText.text = "Data parsing error";
                }
            }
        }

        #endregion

        #region Public Controls

        public void ExportAllSystemData()
        {
            var allData = new Dictionary<string, object>();

            foreach (var kvp in systemData)
            {
                if (!string.IsNullOrEmpty(kvp.Value))
                {
                    try
                    {
                        allData[kvp.Key] = JsonConvert.DeserializeObject(kvp.Value);
                    }
                    catch
                    {
                        allData[kvp.Key] = kvp.Value;
                    }
                }
            }

            var exportData = new
            {
                exportTime = System.DateTime.Now,
                totalSystems = totalSystemsFound,
                workingSystems = totalSystemsWorking,
                systems = allData
            };

            string jsonData = JsonConvert.SerializeObject(exportData, Formatting.Indented);

            // Save to file
            string fileName = $"all_systems_data_{System.DateTime.Now:yyyyMMdd_HHmmss}.json";
            string filePath = System.IO.Path.Combine(Application.persistentDataPath, fileName);
            System.IO.File.WriteAllText(filePath, jsonData);

            Debug.Log("📄 All Systems Data Exported:");
            Debug.Log($"File: {filePath}");
            Debug.Log($"Systems: {totalSystemsWorking}/{totalSystemsFound}");
            Debug.Log(jsonData);
        }

        public void ResetAllSystems()
        {
            foreach (var kvp in activeSystems)
            {
                try
                {
                    var resetMethod = kvp.Value.GetType().GetMethod("ResetData");
                    resetMethod?.Invoke(kvp.Value, null);
                }
                catch (System.Exception e)
                {
                    Debug.LogWarning($"⚠️ Could not reset {kvp.Key}: {e.Message}");
                }
            }

            Debug.Log("🔄 All systems reset");
        }

        public void ToggleAllSystems()
        {
            allSystemsActive = !allSystemsActive;

            foreach (var kvp in activeSystems)
            {
                if (kvp.Value != null)
                {
                    kvp.Value.enabled = allSystemsActive;
                }
            }

            string status = allSystemsActive ? "enabled" : "disabled";
            Debug.Log($"🔄 All systems {status}");
            UpdateGlobalStatus();
        }

        #endregion

        #region Status Updates

        private void UpdateGlobalStatus()
        {
            if (globalStatusText != null)
            {
                string status = $"🎮 UNITY SIMULATION SYSTEMS\\n" +
                               $"Found: {totalSystemsFound}/30\\n" +
                               $"Active: {totalSystemsWorking}\\n" +
                               $"Status: {(allSystemsActive ? "RUNNING" : "PAUSED")}\\n" +
                               $"Success Rate: {(totalSystemsWorking * 100f / 30):F1}%";

                globalStatusText.text = status;
            }
        }

        #endregion

        #region Context Menu

        [ContextMenu("Export All Data")]
        public void ForceExportAllData()
        {
            RefreshAllSystemData();
            ExportAllSystemData();
        }

        [ContextMenu("Reset All Systems")]
        public void ForceResetAllSystems()
        {
            ResetAllSystems();
        }

        [ContextMenu("Refresh Data")]
        public void ForceRefreshData()
        {
            RefreshAllSystemData();
        }

        #endregion

        void OnGUI()
        {
            // Control panel in top-right corner
            GUILayout.BeginArea(new Rect(Screen.width - 250, 10, 240, 200));

            GUILayout.Label("🎮 All Systems Control", GUI.skin.box);

            if (GUILayout.Button("📊 Export All Data"))
                ExportAllSystemData();

            if (GUILayout.Button("🔄 Reset All Systems"))
                ResetAllSystems();

            if (GUILayout.Button(allSystemsActive ? "⏸️ Pause All" : "▶️ Resume All"))
                ToggleAllSystems();

            if (GUILayout.Button("🔍 Refresh Data"))
                RefreshAllSystemData();

            GUILayout.Space(10);

            GUILayout.Label($"Systems: {totalSystemsWorking}/{totalSystemsFound}");
            GUILayout.Label($"Success: {(totalSystemsWorking * 100f / 30):F1}%");
            GUILayout.Label($"Status: {(allSystemsActive ? "RUNNING" : "PAUSED")}");

            GUILayout.EndArea();
        }
    }
}