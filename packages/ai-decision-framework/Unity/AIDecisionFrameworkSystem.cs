using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.AIDecisionFramework
{
    [System.Serializable]
    public class AIDecisionFrameworkData
    {
        public long timestamp;
        public long currentTime;
        public AIDecisionFrameworkInfo aidecisionframework;

        public AIDecisionFrameworkData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            aidecisionframework = new AIDecisionFrameworkInfo();
        }
    }

    [System.Serializable]
    public class AIDecisionFrameworkInfo
    {
                public int behaviorTrees = 8;
        public int stateMachines = 12;
        public int goalPlanning = 5;
        public float decisionTime = 0.15f;
        public bool adaptiveBehavior = true;
        public int activeAgents = 25;
        public string systemHealth = "operational";
        public string framework = "unity-sim-ai-decision-framework";
    }

    public class AIDecisionFrameworkSystem : MonoBehaviour
    {
        [Header("AIDecisionFramework Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private AIDecisionFrameworkData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<AIDecisionFrameworkData> OnAIDecisionFrameworkChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeAIDecisionFramework();
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

        private void InitializeAIDecisionFramework()
        {
            currentData = new AIDecisionFrameworkData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"AIDecisionFrameworkSystem initialized successfully");
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
                        currentData.aidecisionframework.decisionTime += UnityEngine.Random.Range(-0.02f, 0.02f);
            currentData.aidecisionframework.activeAgents = Mathf.Max(1, currentData.aidecisionframework.activeAgents + UnityEngine.Random.Range(-2, 3));
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnAIDecisionFrameworkChanged != null)
            {
                OnAIDecisionFrameworkChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"AIDecisionFrameworkSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("AIDecisionFrameworkSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"AIDecisionFrameworkSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"AIDecisionFrameworkSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public AIDecisionFrameworkData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeAIDecisionFramework();
            Debug.Log($"AIDecisionFrameworkSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export AIDecisionFramework Data")]
        public void ExportAIDecisionFrameworkToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== AIDECISIONFRAMEWORK DATA ===\n{data}");
        }

        [ContextMenu("Reset AIDecisionFramework Data")]
        public void ResetAIDecisionFrameworkData()
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
            Debug.Log($"AIDecisionFrameworkSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}