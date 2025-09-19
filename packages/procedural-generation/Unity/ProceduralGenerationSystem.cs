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
        public ProceduralGenerationInfo proceduralgeneration;

        public ProceduralGenerationData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            proceduralgeneration = new ProceduralGenerationInfo();
        }
    }

    [System.Serializable]
    public class ProceduralGenerationInfo
    {
                public Vector2Int worldSize = new Vector2Int(64, 64);
        public int biomes = 4;
        public int cities = 2;
        public int roads = 15;
        public float terrainHeight = 50f;
        public int landmarks = 8;
        public string systemHealth = "operational";
        public string framework = "unity-sim-procedural-generation";
    }

    public class ProceduralGenerationSystem : MonoBehaviour
    {
        [Header("ProceduralGeneration Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private ProceduralGenerationData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<ProceduralGenerationData> OnProceduralGenerationChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeProceduralGeneration();
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

        private void InitializeProceduralGeneration()
        {
            currentData = new ProceduralGenerationData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"ProceduralGenerationSystem initialized successfully");
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
                        currentData.proceduralgeneration.cities += UnityEngine.Random.Range(0, 1);
            currentData.proceduralgeneration.roads += UnityEngine.Random.Range(1, 3);
            currentData.proceduralgeneration.landmarks += UnityEngine.Random.Range(0, 2);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnProceduralGenerationChanged != null)
            {
                OnProceduralGenerationChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"ProceduralGenerationSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("ProceduralGenerationSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"ProceduralGenerationSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"ProceduralGenerationSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public ProceduralGenerationData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeProceduralGeneration();
            Debug.Log($"ProceduralGenerationSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export ProceduralGeneration Data")]
        public void ExportProceduralGenerationToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== PROCEDURALGENERATION DATA ===\n{data}");
        }

        [ContextMenu("Reset ProceduralGeneration Data")]
        public void ResetProceduralGenerationData()
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
            Debug.Log($"ProceduralGenerationSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}