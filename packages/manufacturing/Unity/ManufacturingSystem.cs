using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Manufacturing
{
    [System.Serializable]
    public class ManufacturingData
    {
        public long timestamp;
        public long currentTime;
        public ManufacturingInfo manufacturing;

        public ManufacturingData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            manufacturing = new ManufacturingInfo();
        }
    }

    [System.Serializable]
    public class ManufacturingInfo
    {
                public int unitsProduced = 0;
        public float efficiency = 88f;
        public int qualityScore = 95;
        public int defectRate = 2;
        public float machineUptime = 92f;
        public int workersActive = 45;
        public string systemHealth = "operational";
        public string framework = "unity-sim-manufacturing";
    }

    public class ManufacturingSystem : MonoBehaviour
    {
        [Header("Manufacturing Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private ManufacturingData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<ManufacturingData> OnManufacturingChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeManufacturing();
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

        private void InitializeManufacturing()
        {
            currentData = new ManufacturingData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"ManufacturingSystem initialized successfully");
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
                        currentData.manufacturing.unitsProduced += UnityEngine.Random.Range(10, 50);
            currentData.manufacturing.efficiency = Mathf.Clamp(currentData.manufacturing.efficiency + UnityEngine.Random.Range(-2f, 2f), 60f, 100f);
            currentData.manufacturing.qualityScore = UnityEngine.Random.Range(85, 100);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnManufacturingChanged != null)
            {
                OnManufacturingChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"ManufacturingSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("ManufacturingSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"ManufacturingSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"ManufacturingSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public ManufacturingData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeManufacturing();
            Debug.Log($"ManufacturingSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Manufacturing Data")]
        public void ExportManufacturingToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== MANUFACTURING DATA ===\n{data}");
        }

        [ContextMenu("Reset Manufacturing Data")]
        public void ResetManufacturingData()
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
            Debug.Log($"ManufacturingSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}