using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.VehicleSimulation
{
    [System.Serializable]
    public class VehicleSimulationData
    {
        public long timestamp;
        public long currentTime;
        public VehicleSimulationInfo vehiclesimulation;

        public VehicleSimulationData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            vehiclesimulation = new VehicleSimulationInfo();
        }
    }

    [System.Serializable]
    public class VehicleSimulationInfo
    {
                public int vehicles = 50;
        public float averageSpeed = 45f;
        public int trafficLights = 15;
        public float congestionLevel = 0.3f;
        public int accidents = 0;
        public float fuelConsumption = 8.5f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-vehicle-simulation";
    }

    public class VehicleSimulationSystem : MonoBehaviour
    {
        [Header("VehicleSimulation Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private VehicleSimulationData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<VehicleSimulationData> OnVehicleSimulationChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeVehicleSimulation();
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

        private void InitializeVehicleSimulation()
        {
            currentData = new VehicleSimulationData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"VehicleSimulationSystem initialized successfully");
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
                        currentData.vehiclesimulation.vehicles += UnityEngine.Random.Range(-2, 5);
            currentData.vehiclesimulation.averageSpeed = Mathf.Clamp(currentData.vehiclesimulation.averageSpeed + UnityEngine.Random.Range(-5f, 5f), 15f, 80f);
            currentData.vehiclesimulation.congestionLevel = Mathf.Clamp(currentData.vehiclesimulation.congestionLevel + UnityEngine.Random.Range(-0.1f, 0.1f), 0f, 1f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnVehicleSimulationChanged != null)
            {
                OnVehicleSimulationChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"VehicleSimulationSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("VehicleSimulationSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"VehicleSimulationSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"VehicleSimulationSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public VehicleSimulationData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeVehicleSimulation();
            Debug.Log($"VehicleSimulationSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export VehicleSimulation Data")]
        public void ExportVehicleSimulationToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== VEHICLESIMULATION DATA ===\n{data}");
        }

        [ContextMenu("Reset VehicleSimulation Data")]
        public void ResetVehicleSimulationData()
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
            Debug.Log($"VehicleSimulationSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}