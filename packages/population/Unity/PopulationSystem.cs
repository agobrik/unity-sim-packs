using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Population
{
    [System.Serializable]
    public class PopulationData
    {
        public long timestamp;
        public long currentTime;
        public PopulationInfo population;

        public PopulationData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            population = new PopulationInfo();
        }
    }

    [System.Serializable]
    public class PopulationInfo
    {
                public int totalPopulation = 50000;
        public float birthRate = 12.5f;
        public float deathRate = 8.2f;
        public float migrationRate = 2.1f;
        public int ageGroups = 5;
        public float lifeExpectancy = 78.5f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-population";
    }

    public class PopulationSystem : MonoBehaviour
    {
        [Header("Population Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private PopulationData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<PopulationData> OnPopulationChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializePopulation();
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

        private void InitializePopulation()
        {
            currentData = new PopulationData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"PopulationSystem initialized successfully");
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
                        currentData.population.totalPopulation += UnityEngine.Random.Range(-10, 25);
            currentData.population.birthRate += UnityEngine.Random.Range(-0.2f, 0.2f);
            currentData.population.deathRate += UnityEngine.Random.Range(-0.1f, 0.1f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnPopulationChanged != null)
            {
                OnPopulationChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"PopulationSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("PopulationSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"PopulationSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"PopulationSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public PopulationData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializePopulation();
            Debug.Log($"PopulationSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Population Data")]
        public void ExportPopulationToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== POPULATION DATA ===\n{data}");
        }

        [ContextMenu("Reset Population Data")]
        public void ResetPopulationData()
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
            Debug.Log($"PopulationSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}