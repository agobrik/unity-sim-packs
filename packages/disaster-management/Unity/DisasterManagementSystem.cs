using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.DisasterManagement
{
    [System.Serializable]
    public class DisasterManagementData
    {
        public long timestamp;
        public long currentTime;
        public DisasterManagementInfo disastermanagement;

        public DisasterManagementData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            disastermanagement = new DisasterManagementInfo();
        }
    }

    [System.Serializable]
    public class DisasterManagementInfo
    {
                public string disasterType = "none";
        public float intensity = 0f;
        public float radius = 0f;
        public bool emergencyActive = false;
        public int evacuatedPeople = 0;
        public float responseTime = 0f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-disaster-management";
    }

    public class DisasterManagementSystem : MonoBehaviour
    {
        [Header("DisasterManagement Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private DisasterManagementData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<DisasterManagementData> OnDisasterManagementChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeDisasterManagement();
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

        private void InitializeDisasterManagement()
        {
            currentData = new DisasterManagementData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"DisasterManagementSystem initialized successfully");
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
                        if (UnityEngine.Random.Range(0f, 1f) < 0.1f) {
              currentData.disastermanagement.emergencyActive = !currentData.disastermanagement.emergencyActive;
              currentData.disastermanagement.intensity = UnityEngine.Random.Range(1f, 10f);
            }
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnDisasterManagementChanged != null)
            {
                OnDisasterManagementChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"DisasterManagementSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("DisasterManagementSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"DisasterManagementSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"DisasterManagementSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public DisasterManagementData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeDisasterManagement();
            Debug.Log($"DisasterManagementSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export DisasterManagement Data")]
        public void ExportDisasterManagementToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== DISASTERMANAGEMENT DATA ===\n{data}");
        }

        [ContextMenu("Reset DisasterManagement Data")]
        public void ResetDisasterManagementData()
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
            Debug.Log($"DisasterManagementSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}