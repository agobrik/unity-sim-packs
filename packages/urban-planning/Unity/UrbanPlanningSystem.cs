using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.UrbanPlanning
{
    [System.Serializable]
    public class UrbanPlanningData
    {
        public long timestamp;
        public long currentTime;
        public UrbanPlanningInfo urbanplanning;

        public UrbanPlanningData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            urbanplanning = new UrbanPlanningInfo();
        }
    }

    [System.Serializable]
    public class UrbanPlanningInfo
    {
                public Vector2Int gridSize = new Vector2Int(100, 100);
        public int buildings = 250;
        public float citizenHappiness = 82f;
        public int population = 15000;
        public float trafficFlow = 75f;
        public int greenSpaces = 12;
        public string systemHealth = "operational";
        public string framework = "unity-sim-urban-planning";
    }

    public class UrbanPlanningSystem : MonoBehaviour
    {
        [Header("UrbanPlanning Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private UrbanPlanningData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<UrbanPlanningData> OnUrbanPlanningChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeUrbanPlanning();
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

        private void InitializeUrbanPlanning()
        {
            currentData = new UrbanPlanningData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"UrbanPlanningSystem initialized successfully");
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
                        currentData.urbanplanning.buildings += UnityEngine.Random.Range(0, 3);
            currentData.urbanplanning.population += UnityEngine.Random.Range(-10, 50);
            currentData.urbanplanning.citizenHappiness = Mathf.Clamp(currentData.urbanplanning.citizenHappiness + UnityEngine.Random.Range(-2f, 2f), 0f, 100f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnUrbanPlanningChanged != null)
            {
                OnUrbanPlanningChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"UrbanPlanningSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("UrbanPlanningSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"UrbanPlanningSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"UrbanPlanningSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public UrbanPlanningData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeUrbanPlanning();
            Debug.Log($"UrbanPlanningSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export UrbanPlanning Data")]
        public void ExportUrbanPlanningToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== URBANPLANNING DATA ===\n{data}");
        }

        [ContextMenu("Reset UrbanPlanning Data")]
        public void ResetUrbanPlanningData()
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
            Debug.Log($"UrbanPlanningSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}