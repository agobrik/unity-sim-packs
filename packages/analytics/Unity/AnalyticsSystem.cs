using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Analytics
{
    [System.Serializable]
    public class AnalyticsData
    {
        public long timestamp;
        public long currentTime;
        public AnalyticsInfo analytics;

        public AnalyticsData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            analytics = new AnalyticsInfo();
        }
    }

    [System.Serializable]
    public class AnalyticsInfo
    {
                public int totalEvents = 0;
        public int activeSessions = 0;
        public float averageSessionTime = 0f;
        public int dataPoints = 0;
        public float conversionRate = 0f;
        public int uniqueUsers = 0;
        public string systemHealth = "operational";
        public string framework = "unity-sim-analytics";
    }

    public class AnalyticsSystem : MonoBehaviour
    {
        [Header("Analytics Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private AnalyticsData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<AnalyticsData> OnAnalyticsChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeAnalytics();
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

        private void InitializeAnalytics()
        {
            currentData = new AnalyticsData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"AnalyticsSystem initialized successfully");
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
                        currentData.analytics.totalEvents += UnityEngine.Random.Range(5, 20);
            currentData.analytics.activeSessions = UnityEngine.Random.Range(10, 100);
            currentData.analytics.dataPoints += UnityEngine.Random.Range(50, 200);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnAnalyticsChanged != null)
            {
                OnAnalyticsChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"AnalyticsSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("AnalyticsSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"AnalyticsSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"AnalyticsSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public AnalyticsData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeAnalytics();
            Debug.Log($"AnalyticsSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Analytics Data")]
        public void ExportAnalyticsToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== ANALYTICS DATA ===\n{data}");
        }

        [ContextMenu("Reset Analytics Data")]
        public void ResetAnalyticsData()
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
            Debug.Log($"AnalyticsSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}