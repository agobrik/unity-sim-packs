using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.ElectricalGrid
{
    [System.Serializable]
    public class ElectricalGridData
    {
        public long timestamp;
        public long currentTime;
        public ElectricalGridInfo electricalgrid;

        public ElectricalGridData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            electricalgrid = new ElectricalGridInfo();
        }
    }

    [System.Serializable]
    public class ElectricalGridInfo
    {
                public float totalGeneration = 2500f;
        public float totalConsumption = 2200f;
        public float gridFrequency = 60f;
        public float voltage = 220f;
        public int powerPlants = 8;
        public float efficiency = 85f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-electrical-grid";
    }

    public class ElectricalGridSystem : MonoBehaviour
    {
        [Header("ElectricalGrid Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private ElectricalGridData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<ElectricalGridData> OnElectricalGridChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeElectricalGrid();
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

        private void InitializeElectricalGrid()
        {
            currentData = new ElectricalGridData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"ElectricalGridSystem initialized successfully");
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
                        currentData.electricalgrid.totalConsumption += UnityEngine.Random.Range(-100f, 100f);
            currentData.electricalgrid.gridFrequency = 60f + UnityEngine.Random.Range(-0.1f, 0.1f);
            currentData.electricalgrid.efficiency = Mathf.Clamp(currentData.electricalgrid.efficiency + UnityEngine.Random.Range(-1f, 1f), 70f, 95f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnElectricalGridChanged != null)
            {
                OnElectricalGridChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"ElectricalGridSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("ElectricalGridSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"ElectricalGridSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"ElectricalGridSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public ElectricalGridData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeElectricalGrid();
            Debug.Log($"ElectricalGridSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export ElectricalGrid Data")]
        public void ExportElectricalGridToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== ELECTRICALGRID DATA ===\n{data}");
        }

        [ContextMenu("Reset ElectricalGrid Data")]
        public void ResetElectricalGridData()
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
            Debug.Log($"ElectricalGridSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}