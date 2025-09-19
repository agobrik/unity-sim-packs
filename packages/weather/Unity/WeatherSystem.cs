using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Weather
{
    [System.Serializable]
    public class WeatherData
    {
        public long timestamp;
        public long currentTime;
        public WeatherInfo weather;

        public WeatherData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            weather = new WeatherInfo();
        }
    }

    [System.Serializable]
    public class WeatherInfo
    {
                public float temperature = 25f;
        public int humidity = 60;
        public float pressure = 1013.25f;
        public float windSpeed = 5.5f;
        public string conditions = "partly_cloudy";
        public float precipitation = 0f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-weather";
    }

    public class WeatherSystem : MonoBehaviour
    {
        [Header("Weather Settings")]
        public float updateInterval = 1f;
        public bool enableLogging = false;
        public bool enableEvents = true;

        [Header("Current Data")]
        [SerializeField] private WeatherData currentData;

        [Header("Performance")]
        public bool enableOptimization = true;
        public int maxUpdatesPerFrame = 1;

        // Events
        public System.Action<WeatherData> OnWeatherChanged;
        public System.Action<string> OnDataExported;

        // Private fields
        private float updateTimer = 0f;
        private bool isInitialized = false;
        private int updateCounter = 0;

        #region Unity Lifecycle

        void Start()
        {
            InitializeWeather();
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

        private void InitializeWeather()
        {
            currentData = new WeatherData();
            isInitialized = true;

            if (enableLogging)
                Debug.Log($"WeatherSystem initialized successfully");
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
                        currentData.weather.temperature += UnityEngine.Random.Range(-2f, 2f);
            currentData.weather.windSpeed = Mathf.Max(0f, currentData.weather.windSpeed + UnityEngine.Random.Range(-1f, 1f));
            currentData.weather.humidity = UnityEngine.Random.Range(30, 95);
            currentData.weather.pressure += UnityEngine.Random.Range(-5f, 5f);
        }

        private void ProcessUpdate()
        {
            updateCounter++;

            // Trigger events
            if (enableEvents && OnWeatherChanged != null)
            {
                OnWeatherChanged.Invoke(currentData);
            }

            // Optional logging
            if (enableLogging && updateCounter % 10 == 0)
            {
                Debug.Log($"WeatherSystem - Update #{updateCounter}");
            }
        }

        #endregion

        #region Public API

        public string ExportState()
        {
            if (currentData == null)
            {
                Debug.LogWarning("WeatherSystem: Cannot export - no data available");
                return "{}";
            }

            try
            {
                string jsonData = JsonConvert.SerializeObject(currentData, Formatting.Indented);

                OnDataExported?.Invoke(jsonData);

                if (enableLogging)
                    Debug.Log($"WeatherSystem: Data exported successfully");

                return jsonData;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"WeatherSystem: Export failed - {e.Message}");
                return "{}";
            }
        }

        public WeatherData GetData()
        {
            return currentData;
        }

        public void SetUpdateInterval(float interval)
        {
            updateInterval = Mathf.Max(0.1f, interval);
        }

        public void ResetData()
        {
            InitializeWeather();
            Debug.Log($"WeatherSystem: Data reset");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Export Weather Data")]
        public void ExportWeatherToConsole()
        {
            string data = ExportState();
            Debug.Log($"=== WEATHER DATA ===\n{data}");
        }

        [ContextMenu("Reset Weather Data")]
        public void ResetWeatherData()
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
            Debug.Log($"WeatherSystem Info:");
            Debug.Log($"- Initialized: {isInitialized}");
            Debug.Log($"- Update Interval: {updateInterval}s");
            Debug.Log($"- Updates Count: {updateCounter}");
            Debug.Log($"- Events Enabled: {enableEvents}");
            Debug.Log($"- Logging Enabled: {enableLogging}");
        }

        #endregion
    }
}