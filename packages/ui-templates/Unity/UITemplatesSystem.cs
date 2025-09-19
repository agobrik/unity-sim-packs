using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.UITemplates
{
    [System.Serializable]
    public class UITemplatesData
    {
        public long timestamp;
        public long currentTime;
        public UITemplatesInfo uitemplates;

        public UITemplatesData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            uitemplates = new UITemplatesInfo();
        }
    }

    [System.Serializable]
    public class UITemplatesInfo
    {
                public int templatesLoaded = 15;
        public string currentTheme = "dark";
        public bool responsiveDesign = true;
        public int componentsRendered = 0;
        public float loadTime = 1.2f;
        public int customizations = 5;
        public string systemHealth = "operational";
        public string framework = "unity-sim-ui-templates";
    }

    public class UITemplatesSystem : MonoBehaviour
    {
        [Header("UITemplates Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private UITemplatesData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<UITemplatesData> OnUITemplatesChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeUITemplates();
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

        private void InitializeUITemplates()
        {
            currentData = new UITemplatesData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"UITemplatesSystem initialized successfully");
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
                        currentData.uitemplates.componentsRendered += UnityEngine.Random.Range(1, 5);
            currentData.uitemplates.customizations += UnityEngine.Random.Range(0, 1);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnUITemplatesChanged != null)
            {
                OnUITemplatesChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"UITemplatesSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("UITemplatesSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"UITemplatesSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"UITemplatesSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public UITemplatesData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeUITemplates();
            Debug.Log($"UITemplatesSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export UITemplates Data")]
        public void ExportUITemplatesToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== UITEMPLATES DATA ===\n{data}");
        }

        [ContextMenu("Reset UITemplates Data")]
        public void ResetUITemplatesData()
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
            Debug.Log($"UITemplatesSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}