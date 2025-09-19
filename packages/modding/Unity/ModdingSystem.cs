
using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Modding
{
    [System.Serializable]
    public class ModdingData
    {
        public long timestamp;
        public long currentTime;
        public ModdingInfo modding;

        public ModdingData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            modding = new ModdingInfo();
        }
    }

    [System.Serializable]
    public class ModdingInfo
    {
        
        public int loadedMods = 0;
        public bool hotReload = false;
        public string modsDirectory = "./mods";
        public int apiCalls = 0;
        public string systemHealth = "operational";
        public string framework = "unity-sim-modding";
    }

    public class ModdingSystem : MonoBehaviour
    {
        [Header("Modding Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private ModdingData currentData;

        // Events
        public System.Action<ModdingData> OnModdingChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeModding();
        }

        void Update()
        {
            UpdateModding();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnModdingChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeModding()
        {
            currentData = new ModdingData();
        }

        private void UpdateModding()
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

        public ModdingData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export Modding Data")]
        public void ExportModdingToConsole()
        {
            Debug.Log("Modding Data: " + ExportState());
        }
    }
}