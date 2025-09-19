using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Time
{
    [System.Serializable]
    public class TimeData
    {
        public long timestamp;
        public long currentTime;
        public TimeInfo time;

        public TimeData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            time = new TimeInfo();
        }
    }

    [System.Serializable]
    public class TimeInfo
    {
                public float timeScale = 1f;
        public bool paused = false;
        public float simulationTime = 0f;
        public int scheduledEvents = 0;
        public float deltaTime = 0.016f;
        public string timeFormat = "24h";
        public string systemHealth = "operational";
        public string framework = "unity-sim-time";
    }

    public class TimeSystem : MonoBehaviour
    {
        [Header("Time Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private TimeData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<TimeData> OnTimeChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeTime();
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

        private void InitializeTime()
        {
            currentData = new TimeData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"TimeSystem initialized successfully");
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
                        currentData.time.simulationTime += UnityEngine.Time.deltaTime * currentData.time.timeScale;
            currentData.time.deltaTime = UnityEngine.Time.deltaTime;
            currentData.time.scheduledEvents += UnityEngine.Random.Range(0, 2);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnTimeChanged != null)
            {
                OnTimeChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"TimeSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("TimeSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"TimeSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"TimeSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public TimeData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeTime();
            Debug.Log($"TimeSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Time Data")]
        public void ExportTimeToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== TIME DATA ===\n{data}");
        }

        [ContextMenu("Reset Time Data")]
        public void ResetTimeData()
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
            Debug.Log($"TimeSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}