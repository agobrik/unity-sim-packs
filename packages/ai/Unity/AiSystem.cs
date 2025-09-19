using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.AI
{
    [System.Serializable]
    public class AIData
    {
        public long timestamp;
        public long currentTime;
        public AIInfo ai;

        public AIData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            ai = new AIInfo();
        }
    }

    [System.Serializable]
    public class AIInfo
    {
                public int agentCount = 15;
        public int decisionsMade = 0;
        public float learningRate = 0.01f;
        public bool neuralNetworkActive = true;
        public float accuracy = 92.5f;
        public int trainingIterations = 1000;
        public string systemHealth = "operational";
        public string framework = "unity-sim-ai";
    }

    public class AISystem : MonoBehaviour
    {
        [Header("AI Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private AIData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<AIData> OnAIChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeAI();
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

        private void InitializeAI()
        {
            currentData = new AIData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"AISystem initialized successfully");
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
                        currentData.ai.decisionsMade += UnityEngine.Random.Range(1, 5);
            currentData.ai.accuracy = Mathf.Clamp(currentData.ai.accuracy + UnityEngine.Random.Range(-0.5f, 0.5f), 80f, 100f);
            currentData.ai.trainingIterations += UnityEngine.Random.Range(10, 50);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnAIChanged != null)
            {
                OnAIChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"AISystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("AISystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"AISystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"AISystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public AIData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeAI();
            Debug.Log($"AISystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export AI Data")]
        public void ExportAIToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== AI DATA ===\n{data}");
        }

        [ContextMenu("Reset AI Data")]
        public void ResetAIData()
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
            Debug.Log($"AISystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}