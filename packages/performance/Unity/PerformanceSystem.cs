using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Performance
{
    [System.Serializable]
    public class PerformanceData
    {
        public long timestamp;
        public long currentTime;
        public PerformanceInfo performance;

        public PerformanceData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            performance = new PerformanceInfo();
        }
    }

    [System.Serializable]
    public class PerformanceInfo
    {
                public float cpuUsage = 45f;
        public float memoryUsage = 2.1f;
        public float frameRate = 60f;
        public int drawCalls = 150;
        public float gpuUsage = 30f;
        public float loadTime = 2.5f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-performance";
    }

    public class PerformanceSystem : MonoBehaviour
    {
        [Header("Performance Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private PerformanceData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<PerformanceData> OnPerformanceChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializePerformance();
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

        private void InitializePerformance()
        {
            currentData = new PerformanceData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"PerformanceSystem initialized successfully");
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
                        currentData.performance.cpuUsage = Mathf.Clamp(currentData.performance.cpuUsage + UnityEngine.Random.Range(-5f, 5f), 0f, 100f);
            currentData.performance.frameRate = Mathf.Max(30f, currentData.performance.frameRate + UnityEngine.Random.Range(-2f, 2f));
            currentData.performance.memoryUsage += UnityEngine.Random.Range(-0.1f, 0.1f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnPerformanceChanged != null)
            {
                OnPerformanceChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"PerformanceSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("PerformanceSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"PerformanceSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"PerformanceSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public PerformanceData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializePerformance();
            Debug.Log($"PerformanceSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Performance Data")]
        public void ExportPerformanceToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== PERFORMANCE DATA ===\n{data}");
        }

        [ContextMenu("Reset Performance Data")]
        public void ResetPerformanceData()
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
            Debug.Log($"PerformanceSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}