using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Procedural
{
    [System.Serializable]
    public class ProceduralData
    {
        public long timestamp;
        public long currentTime;
        public ProceduralInfo procedural;

        public ProceduralData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            procedural = new ProceduralInfo();
        }
    }

    [System.Serializable]
    public class ProceduralInfo
    {
                public int seed = 12345;
        public int chunksGenerated = 0;
        public string algorithm = "Perlin";
        public float noiseScale = 0.1f;
        public int octaves = 4;
        public float persistence = 0.5f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-procedural";
    }

    public class ProceduralSystem : MonoBehaviour
    {
        [Header("Procedural Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private ProceduralData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<ProceduralData> OnProceduralChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeProcedural();
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

        private void InitializeProcedural()
        {
            currentData = new ProceduralData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"ProceduralSystem initialized successfully");
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
                        currentData.procedural.chunksGenerated += UnityEngine.Random.Range(1, 3);
            currentData.procedural.noiseScale += UnityEngine.Random.Range(-0.01f, 0.01f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnProceduralChanged != null)
            {
                OnProceduralChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"ProceduralSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("ProceduralSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"ProceduralSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"ProceduralSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public ProceduralData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeProcedural();
            Debug.Log($"ProceduralSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Procedural Data")]
        public void ExportProceduralToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== PROCEDURAL DATA ===\n{data}");
        }

        [ContextMenu("Reset Procedural Data")]
        public void ResetProceduralData()
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
            Debug.Log($"ProceduralSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}