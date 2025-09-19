
using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.ProceduralGeneration
{
    [System.Serializable]
    public class ProceduralGenerationData
    {
        public long timestamp;
        public long currentTime;
        public ProceduralGenerationInfo procedural-generation;

        public ProceduralGenerationData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            procedural-generation = new ProceduralGenerationInfo();
        }
    }

    [System.Serializable]
    public class ProceduralGenerationInfo
    {
        
        public int worldSeed = 12345;
        public Vector2Int worldSize = new Vector2Int(32, 32);
        public int generatedChunks = 0;
        public string biomeType = "forest";
        public string systemHealth = "operational";
        public string framework = "unity-sim-procedural-generation";
    }

    public class ProceduralGenerationSystem : MonoBehaviour
    {
        [Header("ProceduralGeneration Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private ProceduralGenerationData currentData;

        // Events
        public System.Action<ProceduralGenerationData> OnProceduralGenerationChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeProceduralGeneration();
        }

        void Update()
        {
            UpdateProceduralGeneration();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnProceduralGenerationChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeProceduralGeneration()
        {
            currentData = new ProceduralGenerationData();
        }

        private void UpdateProceduralGeneration()
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

        public ProceduralGenerationData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export ProceduralGeneration Data")]
        public void ExportProceduralGenerationToConsole()
        {
            Debug.Log("ProceduralGeneration Data: " + ExportState());
        }
    }
}