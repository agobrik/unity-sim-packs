
using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Ai
{
    [System.Serializable]
    public class AiData
    {
        public long timestamp;
        public long currentTime;
        public AiInfo ai;

        public AiData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            ai = new AiInfo();
        }
    }

    [System.Serializable]
    public class AiInfo
    {
        
        public int agents = 0;
        public int decisions = 0;
        public int behaviorTrees = 0;
        public bool learning = false;
        public string systemHealth = "operational";
        public string framework = "unity-sim-ai";
    }

    public class AiSystem : MonoBehaviour
    {
        [Header("Ai Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private AiData currentData;

        // Events
        public System.Action<AiData> OnAiChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeAi();
        }

        void Update()
        {
            UpdateAi();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnAiChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeAi()
        {
            currentData = new AiData();
        }

        private void UpdateAi()
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
            
            currentData.ai.decisions += UnityEngine.Random.Range(0, 5);
            currentData.ai.agents = UnityEngine.Random.Range(1, 20);
        }

        public string ExportState()
        {
            return JsonConvert.SerializeObject(currentData, Formatting.Indented);
        }

        public AiData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export Ai Data")]
        public void ExportAiToConsole()
        {
            Debug.Log("Ai Data: " + ExportState());
        }
    }
}