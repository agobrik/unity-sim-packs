
using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Analytics
{
    [System.Serializable]
    public class AnalyticsData
    {
        public long timestamp;
        public long currentTime;
        public AnalyticsInfo analytics;

        public AnalyticsData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            analytics = new AnalyticsInfo();
        }
    }

    [System.Serializable]
    public class AnalyticsInfo
    {
        
        public int totalEvents = 0;
        public int activeSessions = 0;
        public float avgSessionTime = 0f;
        public int dataPoints = 0;
        public string systemHealth = "operational";
        public string framework = "unity-sim-analytics";
    }

    public class AnalyticsSystem : MonoBehaviour
    {
        [Header("Analytics Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private AnalyticsData currentData;

        // Events
        public System.Action<AnalyticsData> OnAnalyticsChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializeAnalytics();
        }

        void Update()
        {
            UpdateAnalytics();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnAnalyticsChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializeAnalytics()
        {
            currentData = new AnalyticsData();
        }

        private void UpdateAnalytics()
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
            // Package-specific update logic here
        }

        public string ExportState()
        {
            return JsonConvert.SerializeObject(currentData, Formatting.Indented);
        }

        public AnalyticsData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export Analytics Data")]
        public void ExportAnalyticsToConsole()
        {
            Debug.Log("Analytics Data: " + ExportState());
        }
    }
}