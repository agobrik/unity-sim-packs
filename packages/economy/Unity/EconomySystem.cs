using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Economy
{
    [System.Serializable]
    public class EconomyData
    {
        public long timestamp;
        public long currentTime;
        public EconomyInfo economy;

        public EconomyData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            economy = new EconomyInfo();
        }
    }

    [System.Serializable]
    public class EconomyInfo
    {
                public float gdp = 50000f;
        public float inflation = 2.5f;
        public float unemployment = 6.2f;
        public float marketValue = 8500f;
        public float consumerSpending = 75f;
        public float businessInvestment = 23f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-economy";
    }

    public class EconomySystem : MonoBehaviour
    {
        [Header("Economy Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private EconomyData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<EconomyData> OnEconomyChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeEconomy();
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

        private void InitializeEconomy()
        {
            currentData = new EconomyData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"EconomySystem initialized successfully");
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
                        currentData.economy.gdp *= (1 + UnityEngine.Random.Range(-0.01f, 0.02f));
            currentData.economy.inflation += UnityEngine.Random.Range(-0.1f, 0.1f);
            currentData.economy.unemployment = Mathf.Clamp(currentData.economy.unemployment + UnityEngine.Random.Range(-0.2f, 0.2f), 0f, 25f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnEconomyChanged != null)
            {
                OnEconomyChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"EconomySystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("EconomySystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"EconomySystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"EconomySystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public EconomyData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeEconomy();
            Debug.Log($"EconomySystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Economy Data")]
        public void ExportEconomyToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== ECONOMY DATA ===\n{data}");
        }

        [ContextMenu("Reset Economy Data")]
        public void ResetEconomyData()
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
            Debug.Log($"EconomySystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}