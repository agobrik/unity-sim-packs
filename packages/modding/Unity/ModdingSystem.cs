using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Modding
{
    [System.Serializable]
    public class ModdingData
    {
        public long timestamp;
        public long currentTime;
        public ModdingInfo modding;

        public ModdingData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            modding = new ModdingInfo();
        }
    }

    [System.Serializable]
    public class ModdingInfo
    {
                public int loadedMods = 5;
        public bool hotReloadEnabled = true;
        public int apiCalls = 0;
        public string modsDirectory = "./mods";
        public int activeMods = 3;
        public bool sandboxMode = true;
        public string systemHealth = "operational";
        public string framework = "unity-sim-modding";
    }

    public class ModdingSystem : MonoBehaviour
    {
        [Header("Modding Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private ModdingData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<ModdingData> OnModdingChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeModding();
        }

        void Update()
        {
            if (!isInitialized) return;

            UpdateSystem();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                ProcessUpdate();
                updateTimer = 0f;
            }
        }

        #endregion

        #region Initialization

        private void InitializeModding()
        {
            currentData = new ModdingData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"ModdingSystem initialized successfully");
        }

        #endregion

        #region Update Logic

        private void UpdateSystem()
        {
            if (currentData == null) return;

            // Update timestamps
            currentData.timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentData.currentTime = currentData.timestamp;

            // Package-specific updates
            UpdateSpecificData();
        }

        private void UpdateSpecificData()
        {
                        currentData.modding.apiCalls += UnityEngine.Random.Range(1, 5);
            currentData.modding.activeMods = Mathf.Max(0, currentData.modding.activeMods + UnityEngine.Random.Range(-1, 2));
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnModdingChanged != null)
            {
                OnModdingChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"ModdingSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("ModdingSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"ModdingSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"ModdingSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public ModdingData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeModding();
            Debug.Log($"ModdingSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Modding Data")]
        public void ExportModdingToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== MODDING DATA ===\n{data}");
        }

        [ContextMenu("Reset Modding Data")]
        public void ResetModdingData()
        {
            ResetData();
        }

        [ContextMenu("Force Update")]
        public void ForceUpdate()
        {
            UpdateSystem();
            ProcessUpdate();
        }

        #endregion

        #region Editor Helpers

        void OnValidate()
        {
            updateInterval = Mathf.Max(0.1f, updateInterval);
            maxUpdatesPerFrame = Mathf.Max(1, maxUpdatesPerFrame);
        }

        #endregion

        #region Debug Info

        public void GetSystemInfo()
        {
            Debug.Log($"ModdingSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}