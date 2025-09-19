using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.AdvancedEconomics
{
    [System.Serializable]
    public class AdvancedEconomicsData
    {
        public long timestamp;
        public long currentTime;
        public AdvancedEconomicsInfo advancedeconomics;

        public AdvancedEconomicsData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            advancedeconomics = new AdvancedEconomicsInfo();
        }
    }

    [System.Serializable]
    public class AdvancedEconomicsInfo
    {
                public float marketCapitalization = 1000000f;
        public float stockIndex = 2500f;
        public float commodityPrices = 75f;
        public float exchangeRate = 1.2f;
        public float interestRate = 3.5f;
        public float inflationRate = 2.1f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-advanced-economics";
    }

    public class AdvancedEconomicsSystem : MonoBehaviour
    {
        [Header("AdvancedEconomics Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private AdvancedEconomicsData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<AdvancedEconomicsData> OnAdvancedEconomicsChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeAdvancedEconomics();
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

        private void InitializeAdvancedEconomics()
        {
            currentData = new AdvancedEconomicsData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"AdvancedEconomicsSystem initialized successfully");
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
                        currentData.advancedeconomics.marketCapitalization *= (1 + UnityEngine.Random.Range(-0.05f, 0.05f));
            currentData.advancedeconomics.stockIndex += UnityEngine.Random.Range(-50f, 50f);
            currentData.advancedeconomics.commodityPrices *= (1 + UnityEngine.Random.Range(-0.02f, 0.02f));
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnAdvancedEconomicsChanged != null)
            {
                OnAdvancedEconomicsChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"AdvancedEconomicsSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("AdvancedEconomicsSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"AdvancedEconomicsSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"AdvancedEconomicsSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public AdvancedEconomicsData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeAdvancedEconomics();
            Debug.Log($"AdvancedEconomicsSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export AdvancedEconomics Data")]
        public void ExportAdvancedEconomicsToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== ADVANCEDECONOMICS DATA ===\n{data}");
        }

        [ContextMenu("Reset AdvancedEconomics Data")]
        public void ResetAdvancedEconomicsData()
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
            Debug.Log($"AdvancedEconomicsSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}