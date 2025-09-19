
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
        public SupplyChainInfo supply-chain;

        public SupplyChainData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            supply-chain = new SupplyChainInfo();
        }
    }

    [System.Serializable]
    public class SupplyChainInfo
    {
        
        public int suppliers = 0;
        public int warehouses = 0;
        public float efficiency = 100f;
        public int activeRoutes = 0;
        public string systemHealth = "operational";
        public string framework = "unity-sim-supply-chain";
    }

    public class SupplyChainSystem : MonoBehaviour
    {
        [Header("SupplyChain Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private SupplyChainData currentData;

        // Events
        public System.Action<SupplyChainData> OnSupplyChainChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeSupplyChain();
        }

        void Update()
        {
            UpdateSupplyChain();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnSupplyChainChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeSupplyChain()
        {
            currentData = new SupplyChainData();
        }

        private void UpdateSupplyChain()
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

        public SupplyChainData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export SupplyChain Data")]
        public void ExportSupplyChainToConsole()
        {
            Debug.Log("SupplyChain Data: " + ExportState());
        }
    }
}