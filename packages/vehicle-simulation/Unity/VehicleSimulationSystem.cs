
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
        public VehicleSimulationInfo vehicle-simulation;

        public VehicleSimulationData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            vehicle-simulation = new VehicleSimulationInfo();
        }
    }

    [System.Serializable]
    public class VehicleSimulationInfo
    {
        
        public int vehicles = 0;
        public float averageSpeed = 45f;
        public int trafficLights = 0;
        public float congestionLevel = 0.3f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-vehicle-simulation";
    }

    public class VehicleSimulationSystem : MonoBehaviour
    {
        [Header("VehicleSimulation Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private VehicleSimulationData currentData;

        // Events
        public System.Action<VehicleSimulationData> OnVehicleSimulationChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeVehicleSimulation();
        }

        void Update()
        {
            UpdateVehicleSimulation();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnVehicleSimulationChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeVehicleSimulation()
        {
            currentData = new VehicleSimulationData();
        }

        private void UpdateVehicleSimulation()
        {
            // Update timestamps
            currentData.timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentData.currentTime = currentData.timestamp;

            // Specific update logic will be added here
            UpdateSpecificData();
        }

        private void UpdateSpecificData()
        {
            // Package-specific update logic
            // Package-specific update logic here
        }

        public string ExportState()
        {
            return JsonConvert.SerializeObject(currentData, Formatting.Indented);
        }

        public VehicleSimulationData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export VehicleSimulation Data")]
        public void ExportVehicleSimulationToConsole()
        {
            Debug.Log("VehicleSimulation Data: " + ExportState());
        }
    }
}