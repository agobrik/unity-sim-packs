
using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.DisasterManagement
{
    [System.Serializable]
    public class DisasterManagementData
    {
        public long timestamp;
        public long currentTime;
        public DisasterManagementInfo disaster-management;

        public DisasterManagementData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            disaster-management = new DisasterManagementInfo();
        }
    }

    [System.Serializable]
    public class DisasterManagementInfo
    {
        
        public string disasterType = "none";
        public float intensity = 0f;
        public float radius = 0f;
        public bool emergencyActive = false;
        public string systemHealth = "operational";
        public string framework = "unity-sim-disaster-management";
    }

    public class DisasterManagementSystem : MonoBehaviour
    {
        [Header("DisasterManagement Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private DisasterManagementData currentData;

        // Events
        public System.Action<DisasterManagementData> OnDisasterManagementChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeDisasterManagement();
        }

        void Update()
        {
            UpdateDisasterManagement();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnDisasterManagementChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeDisasterManagement()
        {
            currentData = new DisasterManagementData();
        }

        private void UpdateDisasterManagement()
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

        public DisasterManagementData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export DisasterManagement Data")]
        public void ExportDisasterManagementToConsole()
        {
            Debug.Log("DisasterManagement Data: " + ExportState());
        }
    }
}