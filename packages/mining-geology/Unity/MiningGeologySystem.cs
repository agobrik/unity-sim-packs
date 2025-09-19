using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.MiningGeology
{
    [System.Serializable]
    public class MiningGeologyData
    {
        public long timestamp;
        public long currentTime;
        public MiningGeologyInfo mininggeology;

        public MiningGeologyData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            mininggeology = new MiningGeologyInfo();
        }
    }

    [System.Serializable]
    public class MiningGeologyInfo
    {
                public float coalExtracted = 1250f;
        public float ironOreExtracted = 850f;
        public int activeMines = 6;
        public float safetyScore = 92f;
        public float environmentalImpact = 15f;
        public int minersActive = 120;
        public string systemHealth = "operational";
        public string framework = "unity-sim-mining-geology";
    }

    public class MiningGeologySystem : MonoBehaviour
    {
        [Header("MiningGeology Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private MiningGeologyData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<MiningGeologyData> OnMiningGeologyChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeMiningGeology();
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

        private void InitializeMiningGeology()
        {
            currentData = new MiningGeologyData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"MiningGeologySystem initialized successfully");
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
                        currentData.mininggeology.coalExtracted += UnityEngine.Random.Range(10f, 100f);
            currentData.mininggeology.ironOreExtracted += UnityEngine.Random.Range(5f, 50f);
            currentData.mininggeology.safetyScore = Mathf.Clamp(currentData.mininggeology.safetyScore + UnityEngine.Random.Range(-1f, 1f), 80f, 100f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnMiningGeologyChanged != null)
            {
                OnMiningGeologyChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"MiningGeologySystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("MiningGeologySystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"MiningGeologySystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"MiningGeologySystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public MiningGeologyData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeMiningGeology();
            Debug.Log($"MiningGeologySystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export MiningGeology Data")]
        public void ExportMiningGeologyToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== MININGGEOLOGY DATA ===\n{data}");
        }

        [ContextMenu("Reset MiningGeology Data")]
        public void ResetMiningGeologyData()
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
            Debug.Log($"MiningGeologySystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}