using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Physics
{
    [System.Serializable]
    public class PhysicsData
    {
        public long timestamp;
        public long currentTime;
        public PhysicsInfo physics;

        public PhysicsData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            physics = new PhysicsInfo();
        }
    }

    [System.Serializable]
    public class PhysicsInfo
    {
                public float gravity = -9.81f;
        public int rigidBodies = 0;
        public int constraints = 0;
        public int collisions = 0;
        public float timeStep = 0.02f;
        public int physicsIterations = 6;
        public string systemHealth = "operational";
        public string framework = "unity-sim-physics";
    }

    public class PhysicsSystem : MonoBehaviour
    {
        [Header("Physics Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private PhysicsData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<PhysicsData> OnPhysicsChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializePhysics();
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

        private void InitializePhysics()
        {
            currentData = new PhysicsData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"PhysicsSystem initialized successfully");
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
                        currentData.physics.rigidBodies = FindObjectsOfType<Rigidbody>().Length;
            currentData.physics.collisions += UnityEngine.Random.Range(0, 5);
            currentData.physics.constraints = currentData.physics.rigidBodies * UnityEngine.Random.Range(0, 3);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnPhysicsChanged != null)
            {
                OnPhysicsChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"PhysicsSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("PhysicsSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"PhysicsSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"PhysicsSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public PhysicsData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializePhysics();
            Debug.Log($"PhysicsSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Physics Data")]
        public void ExportPhysicsToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== PHYSICS DATA ===\n{data}");
        }

        [ContextMenu("Reset Physics Data")]
        public void ResetPhysicsData()
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
            Debug.Log($"PhysicsSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}