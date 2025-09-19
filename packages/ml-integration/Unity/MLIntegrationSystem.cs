using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.MLIntegration
{
    [System.Serializable]
    public class MLIntegrationData
    {
        public long timestamp;
        public long currentTime;
        public MLIntegrationInfo mlintegration;

        public MLIntegrationData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            mlintegration = new MLIntegrationInfo();
        }
    }

    [System.Serializable]
    public class MLIntegrationInfo
    {
                public int modelsLoaded = 3;
        public bool trainingActive = false;
        public float inferenceTime = 0.05f;
        public int predictions = 0;
        public float modelAccuracy = 94.2f;
        public string framework = "TensorFlow";
        public string systemHealth = "operational";
        public string framework = "unity-sim-ml-integration";
    }

    public class MLIntegrationSystem : MonoBehaviour
    {
        [Header("MLIntegration Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private MLIntegrationData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<MLIntegrationData> OnMLIntegrationChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeMLIntegration();
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

        private void InitializeMLIntegration()
        {
            currentData = new MLIntegrationData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"MLIntegrationSystem initialized successfully");
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
                        currentData.mlintegration.predictions += UnityEngine.Random.Range(1, 10);
            currentData.mlintegration.inferenceTime += UnityEngine.Random.Range(-0.01f, 0.01f);
            currentData.mlintegration.modelAccuracy = Mathf.Clamp(currentData.mlintegration.modelAccuracy + UnityEngine.Random.Range(-0.2f, 0.2f), 85f, 99f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnMLIntegrationChanged != null)
            {
                OnMLIntegrationChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"MLIntegrationSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("MLIntegrationSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"MLIntegrationSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"MLIntegrationSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public MLIntegrationData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeMLIntegration();
            Debug.Log($"MLIntegrationSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export MLIntegration Data")]
        public void ExportMLIntegrationToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== MLINTEGRATION DATA ===\n{data}");
        }

        [ContextMenu("Reset MLIntegration Data")]
        public void ResetMLIntegrationData()
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
            Debug.Log($"MLIntegrationSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}