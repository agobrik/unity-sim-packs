using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Ecosystem
{
    [System.Serializable]
    public class EcosystemData
    {
        public long timestamp;
        public long currentTime;
        public EcosystemInfo ecosystem;

        public EcosystemData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            ecosystem = new EcosystemInfo();
        }
    }

    [System.Serializable]
    public class EcosystemInfo
    {
                public int species = 45;
        public float biodiversity = 78.5f;
        public int predators = 12;
        public int prey = 150;
        public float carbonLevel = 410f;
        public float oxygenLevel = 21f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-ecosystem";
    }

    public class EcosystemSystem : MonoBehaviour
    {
        [Header("Ecosystem Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private EcosystemData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<EcosystemData> OnEcosystemChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeEcosystem();
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

        private void InitializeEcosystem()
        {
            currentData = new EcosystemData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"EcosystemSystem initialized successfully");
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
                        currentData.ecosystem.biodiversity += UnityEngine.Random.Range(-1f, 1f);
            currentData.ecosystem.carbonLevel += UnityEngine.Random.Range(-0.5f, 0.5f);
            currentData.ecosystem.species = Mathf.Max(1, currentData.ecosystem.species + UnityEngine.Random.Range(-1, 2));
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnEcosystemChanged != null)
            {
                OnEcosystemChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"EcosystemSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("EcosystemSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"EcosystemSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"EcosystemSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public EcosystemData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeEcosystem();
            Debug.Log($"EcosystemSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Ecosystem Data")]
        public void ExportEcosystemToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== ECOSYSTEM DATA ===\n{data}");
        }

        [ContextMenu("Reset Ecosystem Data")]
        public void ResetEcosystemData()
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
            Debug.Log($"EcosystemSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}