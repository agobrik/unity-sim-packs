
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
        
        public float marketValue = 5000f;
        public float inflation = 2.5f;
        public float unemployment = 7.2f;
        public float gdpGrowth = 3.1f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-economy";
    }

    public class EconomySystem : MonoBehaviour
    {
        [Header("Economy Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private EconomyData currentData;

        // Events
        public System.Action<EconomyData> OnEconomyChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeEconomy();
        }

        void Update()
        {
            UpdateEconomy();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnEconomyChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeEconomy()
        {
            currentData = new EconomyData();
        }

        private void UpdateEconomy()
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
            
            currentData.economy.marketValue *= (1 + UnityEngine.Random.Range(-0.02f, 0.02f));
            currentData.economy.inflation += UnityEngine.Random.Range(-0.1f, 0.1f);
            currentData.economy.unemployment = Mathf.Clamp(currentData.economy.unemployment + UnityEngine.Random.Range(-0.2f, 0.2f), 0f, 20f);
        }

        public string ExportState()
        {
            return JsonConvert.SerializeObject(currentData, Formatting.Indented);
        }

        public EconomyData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export Economy Data")]
        public void ExportEconomyToConsole()
        {
            Debug.Log("Economy Data: " + ExportState());
        }
    }
}