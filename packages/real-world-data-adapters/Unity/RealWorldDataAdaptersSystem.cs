using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.RealWorldDataAdapters
{
    [System.Serializable]
    public class RealWorldDataAdaptersData
    {
        public long timestamp;
        public long currentTime;
        public RealWorldDataAdaptersInfo realworlddataadapters;

        public RealWorldDataAdaptersData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            realworlddataadapters = new RealWorldDataAdaptersInfo();
        }
    }

    [System.Serializable]
    public class RealWorldDataAdaptersInfo
    {
                public int apiConnections = 3;
        public float dataFreshness = 95f;
        public int recordsProcessed = 0;
        public bool realTimeSync = true;
        public float latency = 150f;
        public string dataSource = "REST_API";
        public string systemHealth = "operational";
        public string framework = "unity-sim-real-world-data-adapters";
    }

    public class RealWorldDataAdaptersSystem : MonoBehaviour
    {
        [Header("RealWorldDataAdapters Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private RealWorldDataAdaptersData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<RealWorldDataAdaptersData> OnRealWorldDataAdaptersChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeRealWorldDataAdapters();
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

        private void InitializeRealWorldDataAdapters()
        {
            currentData = new RealWorldDataAdaptersData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"RealWorldDataAdaptersSystem initialized successfully");
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
                        currentData.realworlddataadapters.recordsProcessed += UnityEngine.Random.Range(10, 100);
            currentData.realworlddataadapters.dataFreshness = Mathf.Clamp(currentData.realworlddataadapters.dataFreshness + UnityEngine.Random.Range(-2f, 1f), 70f, 100f);
            currentData.realworlddataadapters.latency += UnityEngine.Random.Range(-10f, 20f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnRealWorldDataAdaptersChanged != null)
            {
                OnRealWorldDataAdaptersChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"RealWorldDataAdaptersSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("RealWorldDataAdaptersSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"RealWorldDataAdaptersSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"RealWorldDataAdaptersSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public RealWorldDataAdaptersData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeRealWorldDataAdapters();
            Debug.Log($"RealWorldDataAdaptersSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export RealWorldDataAdapters Data")]
        public void ExportRealWorldDataAdaptersToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== REALWORLDDATAADAPTERS DATA ===\n{data}");
        }

        [ContextMenu("Reset RealWorldDataAdapters Data")]
        public void ResetRealWorldDataAdaptersData()
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
            Debug.Log($"RealWorldDataAdaptersSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}