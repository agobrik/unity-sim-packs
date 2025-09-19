using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.SimulationAlgorithms
{
    [System.Serializable]
    public class SimulationAlgorithmsData
    {
        public long timestamp;
        public long currentTime;
        public SimulationAlgorithmsInfo simulationalgorithms;

        public SimulationAlgorithmsData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            simulationalgorithms = new SimulationAlgorithmsInfo();
        }
    }

    [System.Serializable]
    public class SimulationAlgorithmsInfo
    {
                public int pathfindingRequests = 0;
        public float algorithmEfficiency = 92f;
        public string currentAlgorithm = "A*";
        public int nodesProcessed = 0;
        public float computationTime = 0.15f;
        public bool optimized = true;
        public string systemHealth = "operational";
        public string framework = "unity-sim-simulation-algorithms";
    }

    public class SimulationAlgorithmsSystem : MonoBehaviour
    {
        [Header("SimulationAlgorithms Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private SimulationAlgorithmsData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<SimulationAlgorithmsData> OnSimulationAlgorithmsChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeSimulationAlgorithms();
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

        private void InitializeSimulationAlgorithms()
        {
            currentData = new SimulationAlgorithmsData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"SimulationAlgorithmsSystem initialized successfully");
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
                        currentData.simulationalgorithms.pathfindingRequests += UnityEngine.Random.Range(5, 15);
            currentData.simulationalgorithms.nodesProcessed += UnityEngine.Random.Range(100, 500);
            currentData.simulationalgorithms.computationTime += UnityEngine.Random.Range(-0.02f, 0.05f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnSimulationAlgorithmsChanged != null)
            {
                OnSimulationAlgorithmsChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"SimulationAlgorithmsSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("SimulationAlgorithmsSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"SimulationAlgorithmsSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"SimulationAlgorithmsSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public SimulationAlgorithmsData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeSimulationAlgorithms();
            Debug.Log($"SimulationAlgorithmsSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export SimulationAlgorithms Data")]
        public void ExportSimulationAlgorithmsToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== SIMULATIONALGORITHMS DATA ===\n{data}");
        }

        [ContextMenu("Reset SimulationAlgorithms Data")]
        public void ResetSimulationAlgorithmsData()
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
            Debug.Log($"SimulationAlgorithmsSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}