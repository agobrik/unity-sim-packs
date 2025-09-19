using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.NetworkMultiplayer
{
    [System.Serializable]
    public class NetworkMultiplayerData
    {
        public long timestamp;
        public long currentTime;
        public NetworkMultiplayerInfo networkmultiplayer;

        public NetworkMultiplayerData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            networkmultiplayer = new NetworkMultiplayerInfo();
        }
    }

    [System.Serializable]
    public class NetworkMultiplayerInfo
    {
                public int connectedPlayers = 0;
        public int maxPlayers = 4;
        public bool isHost = false;
        public string sessionId = "";
        public float latency = 45f;
        public int packetsPerSecond = 120;
        public string systemHealth = "operational";
        public string framework = "unity-sim-network-multiplayer";
    }

    public class NetworkMultiplayerSystem : MonoBehaviour
    {
        [Header("NetworkMultiplayer Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private NetworkMultiplayerData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<NetworkMultiplayerData> OnNetworkMultiplayerChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeNetworkMultiplayer();
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

        private void InitializeNetworkMultiplayer()
        {
            currentData = new NetworkMultiplayerData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"NetworkMultiplayerSystem initialized successfully");
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
                        currentData.networkmultiplayer.latency += UnityEngine.Random.Range(-5f, 5f);
            currentData.networkmultiplayer.packetsPerSecond += UnityEngine.Random.Range(-10, 20);
            currentData.networkmultiplayer.connectedPlayers = UnityEngine.Random.Range(0, currentData.networkmultiplayer.maxPlayers + 1);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnNetworkMultiplayerChanged != null)
            {
                OnNetworkMultiplayerChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"NetworkMultiplayerSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("NetworkMultiplayerSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"NetworkMultiplayerSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"NetworkMultiplayerSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public NetworkMultiplayerData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeNetworkMultiplayer();
            Debug.Log($"NetworkMultiplayerSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export NetworkMultiplayer Data")]
        public void ExportNetworkMultiplayerToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== NETWORKMULTIPLAYER DATA ===\n{data}");
        }

        [ContextMenu("Reset NetworkMultiplayer Data")]
        public void ResetNetworkMultiplayerData()
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
            Debug.Log($"NetworkMultiplayerSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}