using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.FluidDynamics
{
    [System.Serializable]
    public class FluidDynamicsData
    {
        public long timestamp;
        public long currentTime;
        public FluidDynamicsInfo fluiddynamics;

        public FluidDynamicsData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            fluiddynamics = new FluidDynamicsInfo();
        }
    }

    [System.Serializable]
    public class FluidDynamicsInfo
    {
                public float velocity = 5.2f;
        public float pressure = 101.3f;
        public float density = 1.225f;
        public float viscosity = 0.018f;
        public string flowType = "laminar";
        public float temperature = 20f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-fluid-dynamics";
    }

    public class FluidDynamicsSystem : MonoBehaviour
    {
        [Header("FluidDynamics Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private FluidDynamicsData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<FluidDynamicsData> OnFluidDynamicsChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeFluidDynamics();
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

        private void InitializeFluidDynamics()
        {
            currentData = new FluidDynamicsData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"FluidDynamicsSystem initialized successfully");
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
                        currentData.fluiddynamics.velocity += UnityEngine.Random.Range(-0.5f, 0.5f);
            currentData.fluiddynamics.pressure += UnityEngine.Random.Range(-2f, 2f);
            currentData.fluiddynamics.temperature += UnityEngine.Random.Range(-1f, 1f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnFluidDynamicsChanged != null)
            {
                OnFluidDynamicsChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"FluidDynamicsSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("FluidDynamicsSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"FluidDynamicsSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"FluidDynamicsSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public FluidDynamicsData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeFluidDynamics();
            Debug.Log($"FluidDynamicsSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export FluidDynamics Data")]
        public void ExportFluidDynamicsToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== FLUIDDYNAMICS DATA ===\n{data}");
        }

        [ContextMenu("Reset FluidDynamics Data")]
        public void ResetFluidDynamicsData()
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
            Debug.Log($"FluidDynamicsSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}