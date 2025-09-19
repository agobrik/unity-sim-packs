using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Resources
{
    [System.Serializable]
    public class ResourcesData
    {
        public long timestamp;
        public long currentTime;
        public ResourcesInfo resources;

        public ResourcesData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            resources = new ResourcesInfo();
        }
    }

    [System.Serializable]
    public class ResourcesInfo
    {
                public int totalResources = 1000;
        public int availableResources = 750;
        public float utilizationRate = 75f;
        public int resourceTypes = 8;
        public bool autoBalance = true;
        public float efficiency = 88f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-resources";
    }

    public class ResourcesSystem : MonoBehaviour
    {
        [Header("Resources Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private ResourcesData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<ResourcesData> OnResourcesChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeResources();
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

        private void InitializeResources()
        {
            currentData = new ResourcesData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"ResourcesSystem initialized successfully");
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
                        currentData.resources.availableResources = Mathf.Max(0, currentData.resources.availableResources + UnityEngine.Random.Range(-20, 10));
            currentData.resources.utilizationRate = (currentData.resources.totalResources - currentData.resources.availableResources) * 100f / currentData.resources.totalResources;
            currentData.resources.efficiency = Mathf.Clamp(currentData.resources.efficiency + UnityEngine.Random.Range(-1f, 2f), 60f, 100f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnResourcesChanged != null)
            {
                OnResourcesChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"ResourcesSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("ResourcesSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"ResourcesSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"ResourcesSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public ResourcesData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeResources();
            Debug.Log($"ResourcesSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Resources Data")]
        public void ExportResourcesToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== RESOURCES DATA ===\n{data}");
        }

        [ContextMenu("Reset Resources Data")]
        public void ResetResourcesData()
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
            Debug.Log($"ResourcesSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}