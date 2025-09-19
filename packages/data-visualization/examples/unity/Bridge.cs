using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Microsoft.ClearScript;
using Microsoft.ClearScript.V8;
using Newtonsoft.Json;

namespace SteamProject.DataVisualization
{
    /// <summary>
    /// Unity bridge for the Data Visualization JavaScript package
    /// Provides seamless integration between Unity C# and JavaScript charting library
    /// </summary>
    public class DataVisualizationBridge : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private bool enableDebugMode = false;
        [SerializeField] private string packagePath = "StreamingAssets/JavaScript/node_modules/@steamproject/data-visualization";
        [SerializeField] private int memoryLimit = 50 * 1024 * 1024; // 50MB
        [SerializeField] private bool autoCleanup = true;

        [Header("Performance")]
        [SerializeField] private bool enableBatchUpdates = true;
        [SerializeField] private float batchInterval = 0.1f; // 100ms
        [SerializeField] private int maxDataPointsPerChart = 1000;

        // JavaScript Engine
        private V8ScriptEngine scriptEngine;
        private bool isInitialized = false;

        // Chart Management
        private Dictionary<string, object> charts = new Dictionary<string, object>();
        private Dictionary<string, object> dashboards = new Dictionary<string, object>();

        // Batch Update System
        private List<BatchUpdateData> pendingUpdates = new List<BatchUpdateData>();
        private float lastBatchTime;

        // Events
        public event Action<string, object> OnThresholdCrossed;
        public event Action<string, object> OnDataPointAdded;
        public event Action<string, string> OnChartError;

        [System.Serializable]
        public class BatchUpdateData
        {
            public string chartId;
            public string method;
            public object data;
            public float timestamp;
        }

        [System.Serializable]
        public class ChartConfig
        {
            public string title;
            public bool realTime;
            public int maxDataPoints;
            public object yAxis;
            public object[] datasets;
            public string[] colors;
            public bool showLegend;
        }

        #region Unity Lifecycle

        void Awake()
        {
            InitializeJavaScriptEngine();
        }

        void Start()
        {
            if (isInitialized)
            {
                LoadDataVisualizationPackage();
            }
        }

        void Update()
        {
            if (enableBatchUpdates && Time.time - lastBatchTime >= batchInterval)
            {
                ProcessBatchedUpdates();
                lastBatchTime = Time.time;
            }
        }

        void OnDestroy()
        {
            Dispose();
        }

        #endregion

        #region Initialization

        private void InitializeJavaScriptEngine()
        {
            try
            {
                // Initialize V8 engine with optimized settings
                scriptEngine = new V8ScriptEngine(V8ScriptEngineFlags.EnableDynamicModuleImports)
                {
                    MaxRuntimeSize = (UIntPtr)memoryLimit,
                    MaxRuntimeStackUsage = (UIntPtr)(memoryLimit / 4)
                };

                // Add Unity-specific objects to JavaScript context
                scriptEngine.AddHostObject("Unity", new UnityBridge(this));
                scriptEngine.AddHostObject("Debug", new DebugBridge());
                scriptEngine.AddHostObject("Time", new TimeBridge());

                // Add basic JavaScript utilities
                scriptEngine.Execute(@"
                    global.console = {
                        log: function(msg) { Unity.Log(msg); },
                        warn: function(msg) { Unity.LogWarning(msg); },
                        error: function(msg) { Unity.LogError(msg); }
                    };

                    global.setTimeout = function(callback, delay) {
                        Unity.SetTimeout(callback, delay);
                    };

                    global.setInterval = function(callback, interval) {
                        return Unity.SetInterval(callback, interval);
                    };
                ");

                isInitialized = true;
                Debug.Log("DataVisualizationBridge: JavaScript engine initialized successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to initialize JavaScript engine: {ex.Message}");
                isInitialized = false;
            }
        }

        private void LoadDataVisualizationPackage()
        {
            try
            {
                string packageFullPath = Path.Combine(Application.streamingAssetsPath, "JavaScript/node_modules/@steamproject/data-visualization");
                string mainFile = Path.Combine(packageFullPath, "dist/index.js");

                if (!File.Exists(mainFile))
                {
                    Debug.LogError($"DataVisualizationBridge: Package not found at {mainFile}");
                    return;
                }

                // Load the main package file
                string packageCode = File.ReadAllText(mainFile);
                scriptEngine.Execute(packageCode);

                // Initialize the visualization manager
                scriptEngine.Execute(@"
                    global.vizManager = new DataVisualizationManager({
                        debug: " + enableDebugMode.ToString().ToLower() + @",
                        autoCleanup: " + autoCleanup.ToString().ToLower() + @",
                        memoryLimit: " + memoryLimit + @",
                        maxDataPointsPerChart: " + maxDataPointsPerChart + @"
                    });

                    // Set up event handlers
                    global.vizManager.on('thresholdCrossed', function(data) {
                        Unity.OnThresholdCrossed(data.chartId, JSON.stringify(data));
                    });

                    global.vizManager.on('dataPointAdded', function(data) {
                        Unity.OnDataPointAdded(data.chartId, JSON.stringify(data));
                    });

                    global.vizManager.on('error', function(error) {
                        Unity.OnChartError(error.chartId, error.message);
                    });
                ");

                Debug.Log("DataVisualizationBridge: Package loaded successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to load package: {ex.Message}");
            }
        }

        #endregion

        #region Chart Management

        /// <summary>
        /// Creates a new line chart
        /// </summary>
        public void CreateLineChart(string chartId, object config)
        {
            if (!isInitialized) return;

            try
            {
                string configJson = JsonConvert.SerializeObject(config);
                string script = $"global.vizManager.createLineChart('{chartId}', {configJson});";

                scriptEngine.Execute(script);
                charts[chartId] = config;

                Debug.Log($"DataVisualizationBridge: Created line chart '{chartId}'");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to create line chart '{chartId}': {ex.Message}");
            }
        }

        /// <summary>
        /// Creates a new bar chart
        /// </summary>
        public void CreateBarChart(string chartId, object config)
        {
            if (!isInitialized) return;

            try
            {
                string configJson = JsonConvert.SerializeObject(config);
                string script = $"global.vizManager.createBarChart('{chartId}', {configJson});";

                scriptEngine.Execute(script);
                charts[chartId] = config;

                Debug.Log($"DataVisualizationBridge: Created bar chart '{chartId}'");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to create bar chart '{chartId}': {ex.Message}");
            }
        }

        /// <summary>
        /// Creates a new pie chart
        /// </summary>
        public void CreatePieChart(string chartId, object config)
        {
            if (!isInitialized) return;

            try
            {
                string configJson = JsonConvert.SerializeObject(config);
                string script = $"global.vizManager.createPieChart('{chartId}', {configJson});";

                scriptEngine.Execute(script);
                charts[chartId] = config;

                Debug.Log($"DataVisualizationBridge: Created pie chart '{chartId}'");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to create pie chart '{chartId}': {ex.Message}");
            }
        }

        /// <summary>
        /// Creates a new heatmap
        /// </summary>
        public void CreateHeatmap(string chartId, object config)
        {
            if (!isInitialized) return;

            try
            {
                string configJson = JsonConvert.SerializeObject(config);
                string script = $"global.vizManager.createHeatmap('{chartId}', {configJson});";

                scriptEngine.Execute(script);
                charts[chartId] = config;

                Debug.Log($"DataVisualizationBridge: Created heatmap '{chartId}'");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to create heatmap '{chartId}': {ex.Message}");
            }
        }

        /// <summary>
        /// Creates a new gauge chart
        /// </summary>
        public void CreateGauge(string chartId, object config)
        {
            if (!isInitialized) return;

            try
            {
                string configJson = JsonConvert.SerializeObject(config);
                string script = $"global.vizManager.createGauge('{chartId}', {configJson});";

                scriptEngine.Execute(script);
                charts[chartId] = config;

                Debug.Log($"DataVisualizationBridge: Created gauge '{chartId}'");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to create gauge '{chartId}': {ex.Message}");
            }
        }

        /// <summary>
        /// Creates a new dashboard
        /// </summary>
        public void CreateDashboard(string dashboardId, object config)
        {
            if (!isInitialized) return;

            try
            {
                string configJson = JsonConvert.SerializeObject(config);
                string script = $"global.vizManager.createDashboard('{dashboardId}', {configJson});";

                scriptEngine.Execute(script);
                dashboards[dashboardId] = config;

                Debug.Log($"DataVisualizationBridge: Created dashboard '{dashboardId}'");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to create dashboard '{dashboardId}': {ex.Message}");
            }
        }

        #endregion

        #region Data Updates

        /// <summary>
        /// Updates a chart with single data point
        /// </summary>
        public void UpdateChart(string chartId, object timestamp, object value)
        {
            if (!isInitialized) return;

            if (enableBatchUpdates)
            {
                pendingUpdates.Add(new BatchUpdateData
                {
                    chartId = chartId,
                    method = "updateSingleData",
                    data = new { timestamp, value },
                    timestamp = Time.time
                });
            }
            else
            {
                UpdateChartImmediate(chartId, timestamp, value);
            }
        }

        /// <summary>
        /// Updates a chart with multiple data points
        /// </summary>
        public void UpdateChartMultiData(string chartId, object data)
        {
            if (!isInitialized) return;

            if (enableBatchUpdates)
            {
                pendingUpdates.Add(new BatchUpdateData
                {
                    chartId = chartId,
                    method = "updateMultiData",
                    data = data,
                    timestamp = Time.time
                });
            }
            else
            {
                UpdateChartMultiDataImmediate(chartId, data);
            }
        }

        /// <summary>
        /// Updates a chart with array data
        /// </summary>
        public void UpdateChart(string chartId, object[] data)
        {
            if (!isInitialized) return;

            if (enableBatchUpdates)
            {
                pendingUpdates.Add(new BatchUpdateData
                {
                    chartId = chartId,
                    method = "updateArrayData",
                    data = data,
                    timestamp = Time.time
                });
            }
            else
            {
                UpdateChartArrayDataImmediate(chartId, data);
            }
        }

        /// <summary>
        /// Updates a dashboard with new data
        /// </summary>
        public void UpdateDashboard(string dashboardId, object data)
        {
            if (!isInitialized) return;

            try
            {
                string dataJson = JsonConvert.SerializeObject(data);
                string script = $"global.vizManager.updateDashboard('{dashboardId}', {dataJson});";

                scriptEngine.Execute(script);
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to update dashboard '{dashboardId}': {ex.Message}");
            }
        }

        private void UpdateChartImmediate(string chartId, object timestamp, object value)
        {
            try
            {
                string valueJson = JsonConvert.SerializeObject(value);
                string script = $"global.vizManager.updateChart('{chartId}', {timestamp}, {valueJson});";

                scriptEngine.Execute(script);
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to update chart '{chartId}': {ex.Message}");
            }
        }

        private void UpdateChartMultiDataImmediate(string chartId, object data)
        {
            try
            {
                string dataJson = JsonConvert.SerializeObject(data);
                string script = $"global.vizManager.updateChartMultiData('{chartId}', {dataJson});";

                scriptEngine.Execute(script);
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to update chart multi-data '{chartId}': {ex.Message}");
            }
        }

        private void UpdateChartArrayDataImmediate(string chartId, object[] data)
        {
            try
            {
                string dataJson = JsonConvert.SerializeObject(data);
                string script = $"global.vizManager.updateChartArrayData('{chartId}', {dataJson});";

                scriptEngine.Execute(script);
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to update chart array data '{chartId}': {ex.Message}");
            }
        }

        #endregion

        #region Batch Updates

        private void ProcessBatchedUpdates()
        {
            if (pendingUpdates.Count == 0) return;

            try
            {
                // Group updates by chart ID for efficiency
                var groupedUpdates = new Dictionary<string, List<BatchUpdateData>>();

                foreach (var update in pendingUpdates)
                {
                    if (!groupedUpdates.ContainsKey(update.chartId))
                    {
                        groupedUpdates[update.chartId] = new List<BatchUpdateData>();
                    }
                    groupedUpdates[update.chartId].Add(update);
                }

                // Process updates for each chart
                foreach (var kvp in groupedUpdates)
                {
                    string chartId = kvp.Key;
                    var updates = kvp.Value;

                    // Build batch update script
                    string batchScript = $"global.vizManager.startBatch('{chartId}');";

                    foreach (var update in updates)
                    {
                        string dataJson = JsonConvert.SerializeObject(update.data);

                        switch (update.method)
                        {
                            case "updateSingleData":
                                batchScript += $"global.vizManager.batchUpdateSingle('{chartId}', {dataJson});";
                                break;
                            case "updateMultiData":
                                batchScript += $"global.vizManager.batchUpdateMulti('{chartId}', {dataJson});";
                                break;
                            case "updateArrayData":
                                batchScript += $"global.vizManager.batchUpdateArray('{chartId}', {dataJson});";
                                break;
                        }
                    }

                    batchScript += $"global.vizManager.commitBatch('{chartId}');";

                    scriptEngine.Execute(batchScript);
                }

                pendingUpdates.Clear();
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to process batched updates: {ex.Message}");
                pendingUpdates.Clear(); // Clear to prevent accumulation
            }
        }

        public void ApplyBatchedUpdates(BatchUpdateData[] updates)
        {
            pendingUpdates.AddRange(updates);
            ProcessBatchedUpdates();
        }

        #endregion

        #region Configuration

        public void SetTheme(object theme)
        {
            if (!isInitialized) return;

            try
            {
                string themeJson = JsonConvert.SerializeObject(theme);
                string script = $"global.vizManager.setTheme({themeJson});";

                scriptEngine.Execute(script);
                Debug.Log("DataVisualizationBridge: Theme applied successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to set theme: {ex.Message}");
            }
        }

        public void SetDebugMode(bool enabled)
        {
            enableDebugMode = enabled;

            if (isInitialized)
            {
                try
                {
                    string script = $"global.vizManager.setDebugMode({enabled.ToString().ToLower()});";
                    scriptEngine.Execute(script);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"DataVisualizationBridge: Failed to set debug mode: {ex.Message}");
                }
            }
        }

        public void SetLogLevel(string level)
        {
            if (!isInitialized) return;

            try
            {
                string script = $"global.vizManager.setLogLevel('{level}');";
                scriptEngine.Execute(script);
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to set log level: {ex.Message}");
            }
        }

        public void ShowPerformanceStats(bool show)
        {
            if (!isInitialized) return;

            try
            {
                string script = $"global.vizManager.showPerformanceStats({show.ToString().ToLower()});";
                scriptEngine.Execute(script);
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to toggle performance stats: {ex.Message}");
            }
        }

        public void SetMemoryLimit(int limitBytes)
        {
            memoryLimit = limitBytes;

            if (isInitialized)
            {
                try
                {
                    string script = $"global.vizManager.setMemoryLimit({limitBytes});";
                    scriptEngine.Execute(script);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"DataVisualizationBridge: Failed to set memory limit: {ex.Message}");
                }
            }
        }

        public void EnableAutoCleanup(bool enabled)
        {
            autoCleanup = enabled;

            if (isInitialized)
            {
                try
                {
                    string script = $"global.vizManager.enableAutoCleanup({enabled.ToString().ToLower()});";
                    scriptEngine.Execute(script);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"DataVisualizationBridge: Failed to set auto cleanup: {ex.Message}");
                }
            }
        }

        public void EnableBatchUpdates(bool enabled)
        {
            enableBatchUpdates = enabled;
        }

        public void SetBatchInterval(float interval)
        {
            batchInterval = interval;
        }

        #endregion

        #region Chart Management

        public void RemoveChart(string chartId)
        {
            if (!isInitialized) return;

            try
            {
                string script = $"global.vizManager.removeChart('{chartId}');";
                scriptEngine.Execute(script);

                charts.Remove(chartId);
                Debug.Log($"DataVisualizationBridge: Removed chart '{chartId}'");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to remove chart '{chartId}': {ex.Message}");
            }
        }

        public void ClearAllCharts()
        {
            if (!isInitialized) return;

            try
            {
                string script = "global.vizManager.clearAllCharts();";
                scriptEngine.Execute(script);

                charts.Clear();
                dashboards.Clear();
                Debug.Log("DataVisualizationBridge: Cleared all charts");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Failed to clear all charts: {ex.Message}");
            }
        }

        #endregion

        #region Cleanup

        public void Dispose()
        {
            try
            {
                if (isInitialized && scriptEngine != null)
                {
                    ClearAllCharts();
                    scriptEngine.Dispose();
                    scriptEngine = null;
                }

                charts.Clear();
                dashboards.Clear();
                pendingUpdates.Clear();

                isInitialized = false;
                Debug.Log("DataVisualizationBridge: Disposed successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Error during disposal: {ex.Message}");
            }
        }

        #endregion

        #region Unity Bridge Classes

        public class UnityBridge
        {
            private DataVisualizationBridge bridge;

            public UnityBridge(DataVisualizationBridge bridge)
            {
                this.bridge = bridge;
            }

            public void Log(string message) => Debug.Log($"[JS] {message}");
            public void LogWarning(string message) => Debug.LogWarning($"[JS] {message}");
            public void LogError(string message) => Debug.LogError($"[JS] {message}");

            public void OnThresholdCrossed(string chartId, string data)
            {
                bridge.OnThresholdCrossed?.Invoke(chartId, data);
            }

            public void OnDataPointAdded(string chartId, string data)
            {
                bridge.OnDataPointAdded?.Invoke(chartId, data);
            }

            public void OnChartError(string chartId, string error)
            {
                bridge.OnChartError?.Invoke(chartId, error);
            }

            public void SetTimeout(object callback, int delay)
            {
                // Implement Unity-based setTimeout
                bridge.StartCoroutine(bridge.DelayedCallback(callback, delay / 1000f));
            }

            public int SetInterval(object callback, int interval)
            {
                // Implement Unity-based setInterval
                return bridge.StartRepeatingCallback(callback, interval / 1000f);
            }
        }

        public class DebugBridge
        {
            public void Log(string message) => Debug.Log($"[DataViz] {message}");
        }

        public class TimeBridge
        {
            public float time => Time.time;
            public float deltaTime => Time.deltaTime;
            public float unscaledTime => Time.unscaledTime;
            public float unscaledDeltaTime => Time.unscaledDeltaTime;
        }

        #endregion

        #region Utility Methods

        private System.Collections.IEnumerator DelayedCallback(object callback, float delay)
        {
            yield return new WaitForSeconds(delay);
            // Execute JavaScript callback
            try
            {
                scriptEngine.Execute($"({callback})();");
            }
            catch (Exception ex)
            {
                Debug.LogError($"DataVisualizationBridge: Error executing delayed callback: {ex.Message}");
            }
        }

        private int StartRepeatingCallback(object callback, float interval)
        {
            // This would need a more sophisticated implementation for real intervals
            // For now, just execute once after the interval
            StartCoroutine(DelayedCallback(callback, interval));
            return UnityEngine.Random.Range(1000, 9999); // Return a fake ID
        }

        #endregion
    }
}