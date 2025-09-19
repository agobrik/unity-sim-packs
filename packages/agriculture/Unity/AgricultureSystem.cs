using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Agriculture
{
    [System.Serializable]
    public class AgricultureData
    {
        public long timestamp;
        public long currentTime;
        public AgricultureInfo agriculture;

        public AgricultureData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            agriculture = new AgricultureInfo();
        }
    }

    [System.Serializable]
    public class AgricultureInfo
    {
                public float cropYield = 85f;
        public float soilQuality = 78f;
        public float rainfall = 650f;
        public int plantedAcres = 1200;
        public float fertilizer = 45f;
        public string season = "spring";
        public string systemHealth = "operational";
        public string framework = "unity-sim-agriculture";
    }

    public class AgricultureSystem : MonoBehaviour
    {
        [Header("Agriculture Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private AgricultureData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<AgricultureData> OnAgricultureChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeAgriculture();
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

        private void InitializeAgriculture()
        {
            currentData = new AgricultureData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"AgricultureSystem initialized successfully");
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
                        currentData.agriculture.cropYield += UnityEngine.Random.Range(-2f, 3f);
            currentData.agriculture.soilQuality = Mathf.Clamp(currentData.agriculture.soilQuality + UnityEngine.Random.Range(-1f, 1f), 0f, 100f);
            currentData.agriculture.rainfall += UnityEngine.Random.Range(-10f, 15f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnAgricultureChanged != null)
            {
                OnAgricultureChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"AgricultureSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("AgricultureSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"AgricultureSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"AgricultureSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public AgricultureData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeAgriculture();
            Debug.Log($"AgricultureSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Agriculture Data")]
        public void ExportAgricultureToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== AGRICULTURE DATA ===\n{data}");
        }

        [ContextMenu("Reset Agriculture Data")]
        public void ResetAgricultureData()
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
            Debug.Log($"AgricultureSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}