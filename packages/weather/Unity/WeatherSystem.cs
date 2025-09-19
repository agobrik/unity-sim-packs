
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
        
        public float temperature = 25.0f;
        public int humidity = 60;
        public float pressure = 1013.25f;
        public float windSpeed = 5.5f;
        public string systemHealth = "operational";
        public string framework = "unity-sim-weather";
    }

    public class WeatherSystem : MonoBehaviour
    {
        [Header("Weather Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private WeatherData currentData;

        // Events
        public System.Action<WeatherData> OnWeatherChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeWeather();
        }

        void Update()
        {
            UpdateWeather();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnWeatherChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeWeather()
        {
            currentData = new WeatherData();
        }

        private void UpdateWeather()
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
            
            currentData.weather.temperature += UnityEngine.Random.Range(-0.5f, 0.5f);
            currentData.weather.windSpeed = Mathf.Max(0, currentData.weather.windSpeed + UnityEngine.Random.Range(-1f, 1f));
            currentData.weather.humidity = UnityEngine.Random.Range(20, 95);
        }

        public string ExportState()
        {
            return JsonConvert.SerializeObject(currentData, Formatting.Indented);
        }

        public WeatherData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export Weather Data")]
        public void ExportWeatherToConsole()
        {
            Debug.Log("Weather Data: " + ExportState());
        }
    }
}