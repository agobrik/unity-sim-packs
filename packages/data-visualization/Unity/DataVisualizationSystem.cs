using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.DataVisualization
{
    [System.Serializable]
    public class DataVisualizationData
    {
        public long timestamp;
        public long currentTime;
        public DataVisualizationInfo datavisualization;

        public DataVisualizationData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            datavisualization = new DataVisualizationInfo();
        }
    }

    [System.Serializable]
    public class DataVisualizationInfo
    {
                public int chartsGenerated = 0;
        public int dataPoints = 0;
        public string chartType = "line";
        public bool realTimeUpdate = true;
        public float refreshRate = 1f;
        public int colorPalette = 1;
        public string systemHealth = "operational";
        public string framework = "unity-sim-data-visualization";
    }

    public class DataVisualizationSystem : MonoBehaviour
    {
        [Header("DataVisualization Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private DataVisualizationData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<DataVisualizationData> OnDataVisualizationChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeDataVisualization();
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

        private void InitializeDataVisualization()
        {
            currentData = new DataVisualizationData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"DataVisualizationSystem initialized successfully");
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
                        currentData.datavisualization.chartsGenerated += UnityEngine.Random.Range(1, 3);
            currentData.datavisualization.dataPoints += UnityEngine.Random.Range(10, 50);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnDataVisualizationChanged != null)
            {
                OnDataVisualizationChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"DataVisualizationSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("DataVisualizationSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"DataVisualizationSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"DataVisualizationSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public DataVisualizationData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeDataVisualization();
            Debug.Log($"DataVisualizationSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export DataVisualization Data")]
        public void ExportDataVisualizationToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== DATAVISUALIZATION DATA ===\n{data}");
        }

        [ContextMenu("Reset DataVisualization Data")]
        public void ResetDataVisualizationData()
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
            Debug.Log($"DataVisualizationSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}