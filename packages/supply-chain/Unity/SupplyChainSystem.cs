using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.SupplyChain
{
    [System.Serializable]
    public class SupplyChainData
    {
        public long timestamp;
        public long currentTime;
        public SupplyChainInfo supplychain;

        public SupplyChainData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            supplychain = new SupplyChainInfo();
        }
    }

    [System.Serializable]
    public class SupplyChainInfo
    {
                public int suppliers = 12;
        public int warehouses = 5;
        public float deliveryEfficiency = 89f;
        public int activeOrders = 45;
        public float costOptimization = 15f;
        public int transportVehicles = 25;
        public string systemHealth = "operational";
        public string framework = "unity-sim-supply-chain";
    }

    public class SupplyChainSystem : MonoBehaviour
    {
        [Header("SupplyChain Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private SupplyChainData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<SupplyChainData> OnSupplyChainChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeSupplyChain();
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

        private void InitializeSupplyChain()
        {
            currentData = new SupplyChainData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"SupplyChainSystem initialized successfully");
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
                        currentData.supplychain.activeOrders += UnityEngine.Random.Range(-5, 10);
            currentData.supplychain.deliveryEfficiency = Mathf.Clamp(currentData.supplychain.deliveryEfficiency + UnityEngine.Random.Range(-2f, 2f), 70f, 100f);
            currentData.supplychain.costOptimization += UnityEngine.Random.Range(-1f, 1f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnSupplyChainChanged != null)
            {
                OnSupplyChainChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"SupplyChainSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("SupplyChainSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"SupplyChainSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"SupplyChainSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public SupplyChainData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeSupplyChain();
            Debug.Log($"SupplyChainSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export SupplyChain Data")]
        public void ExportSupplyChainToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== SUPPLYCHAIN DATA ===\n{data}");
        }

        [ContextMenu("Reset SupplyChain Data")]
        public void ResetSupplyChainData()
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
            Debug.Log($"SupplyChainSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}