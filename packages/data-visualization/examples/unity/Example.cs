using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using SteamProject.DataVisualization;

namespace SteamProject.DataVisualization.Examples
{
    /// <summary>
    /// Comprehensive example demonstrating data visualization integration in Unity
    /// Shows real-time performance monitoring, player statistics, and game analytics
    /// </summary>
    public class DataVisualizationExample : MonoBehaviour
    {
        [Header("Bridge Reference")]
        public DataVisualizationBridge visualizationBridge;

        [Header("Example Configuration")]
        [SerializeField] private bool enablePerformanceMonitoring = true;
        [SerializeField] private bool enablePlayerStats = true;
        [SerializeField] private bool enableGameAnalytics = true;
        [SerializeField] private bool enableEconomyTracking = true;

        [Header("Update Intervals")]
        [SerializeField] private float performanceUpdateInterval = 0.1f;
        [SerializeField] private float playerStatsUpdateInterval = 1.0f;
        [SerializeField] private float analyticsUpdateInterval = 5.0f;
        [SerializeField] private float economyUpdateInterval = 2.0f;

        [Header("Simulated Game Data")]
        [SerializeField] private PlayerData currentPlayer;
        [SerializeField] private List<PlayerData> leaderboardData;
        [SerializeField] private EconomyData economyData;

        // Performance tracking
        private PerformanceTracker performanceTracker;
        private float lastPerformanceUpdate;
        private float lastPlayerStatsUpdate;
        private float lastAnalyticsUpdate;
        private float lastEconomyUpdate;

        // Chart references
        private readonly Dictionary<string, object> activeCharts = new Dictionary<string, object>();

        #region Data Structures

        [System.Serializable]
        public class PlayerData
        {
            public string playerName = "Player";
            public int level = 1;
            public float health = 100f;
            public float mana = 100f;
            public float experience = 0f;
            public int score = 0;
            public float playtime = 0f;
            public Vector3 position = Vector3.zero;
            public Dictionary<string, int> achievements = new Dictionary<string, int>();
            public Dictionary<string, float> skills = new Dictionary<string, float>();
            public Dictionary<string, int> inventory = new Dictionary<string, int>();
        }

        [System.Serializable]
        public class EconomyData
        {
            public Dictionary<string, float> resources = new Dictionary<string, float>();
            public Dictionary<string, float> prices = new Dictionary<string, float>();
            public List<Transaction> recentTransactions = new List<Transaction>();
            public float totalGold = 1000f;
        }

        [System.Serializable]
        public class Transaction
        {
            public string item;
            public int quantity;
            public float price;
            public DateTime timestamp;
            public string playerName;
        }

        #endregion

        #region Unity Lifecycle

        void Start()
        {
            InitializeExample();
        }

        void Update()
        {
            UpdateSimulatedGameData();
            UpdateVisualizationsBasedOnIntervals();
        }

        void OnDestroy()
        {
            CleanupExample();
        }

        #endregion

        #region Initialization

        private void InitializeExample()
        {
            // Initialize bridge if not assigned
            if (visualizationBridge == null)
            {
                visualizationBridge = GetComponent<DataVisualizationBridge>();
                if (visualizationBridge == null)
                {
                    visualizationBridge = gameObject.AddComponent<DataVisualizationBridge>();
                }
            }

            // Initialize performance tracker
            performanceTracker = new PerformanceTracker();

            // Initialize simulated data
            InitializeSimulatedData();

            // Set up event handlers
            SetupEventHandlers();

            // Create visualization components
            StartCoroutine(InitializeVisualizationsWithDelay());
        }

        private IEnumerator InitializeVisualizationsWithDelay()
        {
            // Wait for bridge to initialize
            yield return new WaitForSeconds(1f);

            if (enablePerformanceMonitoring)
                SetupPerformanceMonitoring();

            if (enablePlayerStats)
                SetupPlayerStatistics();

            if (enableGameAnalytics)
                SetupGameAnalytics();

            if (enableEconomyTracking)
                SetupEconomyTracking();

            // Apply custom theme
            ApplyGameTheme();

            Debug.Log("DataVisualizationExample: All visualizations initialized");
        }

        private void InitializeSimulatedData()
        {
            // Initialize current player
            currentPlayer = new PlayerData
            {
                playerName = "TestPlayer",
                level = 15,
                health = 85f,
                mana = 60f,
                experience = 750f,
                score = 12500,
                playtime = 3600f // 1 hour
            };

            // Initialize skills
            currentPlayer.skills = new Dictionary<string, float>
            {
                { "Combat", 85f },
                { "Magic", 62f },
                { "Crafting", 43f },
                { "Trade", 78f },
                { "Stealth", 35f }
            };

            // Initialize inventory
            currentPlayer.inventory = new Dictionary<string, int>
            {
                { "Health Potions", 15 },
                { "Mana Potions", 8 },
                { "Iron Sword", 1 },
                { "Magic Staff", 1 },
                { "Gold Coins", 250 }
            };

            // Initialize leaderboard
            leaderboardData = new List<PlayerData>();
            for (int i = 0; i < 10; i++)
            {
                leaderboardData.Add(new PlayerData
                {
                    playerName = $"Player{i + 1}",
                    level = UnityEngine.Random.Range(10, 25),
                    score = UnityEngine.Random.Range(5000, 20000),
                    playtime = UnityEngine.Random.Range(1800, 7200)
                });
            }

            // Initialize economy data
            economyData = new EconomyData();
            economyData.resources = new Dictionary<string, float>
            {
                { "Wood", 35f },
                { "Stone", 28f },
                { "Iron", 20f },
                { "Gold", 17f }
            };

            economyData.prices = new Dictionary<string, float>
            {
                { "Wood", 2.5f },
                { "Stone", 3.2f },
                { "Iron", 8.7f },
                { "Gold", 25.4f }
            };
        }

        private void SetupEventHandlers()
        {
            if (visualizationBridge != null)
            {
                visualizationBridge.OnThresholdCrossed += HandleThresholdCrossed;
                visualizationBridge.OnDataPointAdded += HandleDataPointAdded;
                visualizationBridge.OnChartError += HandleChartError;
            }
        }

        #endregion

        #region Performance Monitoring

        private void SetupPerformanceMonitoring()
        {
            // Real-time FPS monitor
            visualizationBridge.CreateLineChart("fpsChart", new
            {
                title = "FPS Monitor",
                maxDataPoints = 100,
                realTime = true,
                yAxis = new { min = 0, max = 120 },
                datasets = new[]
                {
                    new { name = "FPS", color = "#ff6b6b" }
                }
            });

            // System performance multi-line chart
            visualizationBridge.CreateLineChart("systemPerformance", new
            {
                title = "System Performance",
                maxDataPoints = 200,
                realTime = true,
                datasets = new[]
                {
                    new { name = "FPS", color = "#ff6b6b" },
                    new { name = "Memory (MB)", color = "#4ecdc4" },
                    new { name = "CPU %", color = "#45b7d1" }
                }
            });

            // Performance gauge
            visualizationBridge.CreateGauge("performanceGauge", new
            {
                title = "Overall Performance",
                min = 0,
                max = 100,
                thresholds = new[]
                {
                    new { value = 30, color = "#ff4444" },
                    new { value = 60, color = "#ffaa00" },
                    new { value = 85, color = "#44ff44" }
                }
            });

            Debug.Log("DataVisualizationExample: Performance monitoring setup complete");
        }

        private void UpdatePerformanceMonitoring()
        {
            var perfData = performanceTracker.GetCurrentMetrics();

            // Update FPS chart
            visualizationBridge.UpdateChart("fpsChart", DateTimeOffset.Now.ToUnixTimeMilliseconds(), perfData.fps);

            // Update multi-line performance chart
            visualizationBridge.UpdateChartMultiData("systemPerformance", new
            {
                timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                data = new
                {
                    FPS = perfData.fps,
                    Memory = perfData.memoryUsageMB,
                    CPU = perfData.cpuUsagePercent
                }
            });

            // Update performance gauge (composite score)
            float performanceScore = CalculatePerformanceScore(perfData);
            visualizationBridge.UpdateChart("performanceGauge", DateTimeOffset.Now.ToUnixTimeMilliseconds(), performanceScore);
        }

        private float CalculatePerformanceScore(PerformanceMetrics metrics)
        {
            float fpsScore = Mathf.Clamp01(metrics.fps / 60f) * 40f;
            float memoryScore = Mathf.Clamp01(1f - (metrics.memoryUsageMB / 2048f)) * 30f;
            float cpuScore = Mathf.Clamp01(1f - (metrics.cpuUsagePercent / 100f)) * 30f;

            return fpsScore + memoryScore + cpuScore;
        }

        #endregion

        #region Player Statistics

        private void SetupPlayerStatistics()
        {
            // Player health/mana bars
            visualizationBridge.CreateGauge("healthGauge", new
            {
                title = "Health",
                min = 0,
                max = 100,
                value = currentPlayer.health,
                color = "#ff4444"
            });

            visualizationBridge.CreateGauge("manaGauge", new
            {
                title = "Mana",
                min = 0,
                max = 100,
                value = currentPlayer.mana,
                color = "#4444ff"
            });

            // Experience progress
            visualizationBridge.CreateGauge("experienceGauge", new
            {
                title = "Experience",
                min = 0,
                max = 1000,
                value = currentPlayer.experience,
                color = "#ffaa00"
            });

            // Skills radar/bar chart
            visualizationBridge.CreateBarChart("skillsChart", new
            {
                title = "Player Skills",
                horizontal = true,
                data = currentPlayer.skills.Select(kvp => new { name = kvp.Key, value = kvp.Value }).ToArray()
            });

            // Inventory pie chart
            visualizationBridge.CreatePieChart("inventoryChart", new
            {
                title = "Inventory Distribution",
                data = currentPlayer.inventory.Select(kvp => new { name = kvp.Key, value = kvp.Value }).ToArray()
            });

            Debug.Log("DataVisualizationExample: Player statistics setup complete");
        }

        private void UpdatePlayerStatistics()
        {
            // Simulate player data changes
            SimulatePlayerDataChanges();

            // Update gauges
            visualizationBridge.UpdateChart("healthGauge", DateTimeOffset.Now.ToUnixTimeMilliseconds(), currentPlayer.health);
            visualizationBridge.UpdateChart("manaGauge", DateTimeOffset.Now.ToUnixTimeMilliseconds(), currentPlayer.mana);
            visualizationBridge.UpdateChart("experienceGauge", DateTimeOffset.Now.ToUnixTimeMilliseconds(), currentPlayer.experience);

            // Update skills chart
            var skillsData = currentPlayer.skills.Select(kvp => new { name = kvp.Key, value = kvp.Value }).ToArray();
            visualizationBridge.UpdateChart("skillsChart", skillsData);

            // Update inventory chart
            var inventoryData = currentPlayer.inventory.Select(kvp => new { name = kvp.Key, value = kvp.Value }).ToArray();
            visualizationBridge.UpdateChart("inventoryChart", inventoryData);
        }

        private void SimulatePlayerDataChanges()
        {
            // Simulate health/mana regeneration and usage
            if (UnityEngine.Random.value < 0.3f)
            {
                currentPlayer.health = Mathf.Clamp(currentPlayer.health + UnityEngine.Random.Range(-5f, 3f), 0f, 100f);
            }

            if (UnityEngine.Random.value < 0.3f)
            {
                currentPlayer.mana = Mathf.Clamp(currentPlayer.mana + UnityEngine.Random.Range(-8f, 5f), 0f, 100f);
            }

            // Simulate experience gain
            if (UnityEngine.Random.value < 0.1f)
            {
                currentPlayer.experience += UnityEngine.Random.Range(5f, 25f);
                if (currentPlayer.experience >= 1000f)
                {
                    currentPlayer.level++;
                    currentPlayer.experience = 0f;
                }
            }

            // Simulate skill progression
            if (UnityEngine.Random.value < 0.05f)
            {
                var skillKeys = currentPlayer.skills.Keys.ToArray();
                if (skillKeys.Length > 0)
                {
                    string randomSkill = skillKeys[UnityEngine.Random.Range(0, skillKeys.Length)];
                    currentPlayer.skills[randomSkill] = Mathf.Min(currentPlayer.skills[randomSkill] + UnityEngine.Random.Range(0.5f, 2f), 100f);
                }
            }
        }

        #endregion

        #region Game Analytics

        private void SetupGameAnalytics()
        {
            // Leaderboard
            visualizationBridge.CreateBarChart("leaderboard", new
            {
                title = "Top Players",
                horizontal = true,
                maxEntries = 10,
                data = leaderboardData
                    .OrderByDescending(p => p.score)
                    .Take(10)
                    .Select(p => new { name = p.playerName, value = p.score })
                    .ToArray()
            });

            // Player activity heatmap
            visualizationBridge.CreateHeatmap("activityHeatmap", new
            {
                title = "Player Activity Zones",
                width = 20,
                height = 20,
                colorScale = new[] { "#000033", "#0066cc", "#00ccff", "#ffff00", "#ff0000" }
            });

            // Session time distribution
            visualizationBridge.CreatePieChart("sessionTimeChart", new
            {
                title = "Session Time Distribution",
                data = new[]
                {
                    new { name = "0-30 min", value = 25 },
                    new { name = "30-60 min", value = 35 },
                    new { name = "1-2 hours", value = 25 },
                    new { name = "2+ hours", value = 15 }
                }
            });

            Debug.Log("DataVisualizationExample: Game analytics setup complete");
        }

        private void UpdateGameAnalytics()
        {
            // Update leaderboard with simulated changes
            SimulateLeaderboardChanges();

            var updatedLeaderboard = leaderboardData
                .OrderByDescending(p => p.score)
                .Take(10)
                .Select(p => new { name = p.playerName, value = p.score })
                .ToArray();

            visualizationBridge.UpdateChart("leaderboard", updatedLeaderboard);

            // Update activity heatmap with simulated player positions
            UpdateActivityHeatmap();
        }

        private void SimulateLeaderboardChanges()
        {
            // Randomly update some player scores
            for (int i = 0; i < leaderboardData.Count; i++)
            {
                if (UnityEngine.Random.value < 0.2f)
                {
                    leaderboardData[i].score += UnityEngine.Random.Range(50, 200);
                }
            }
        }

        private void UpdateActivityHeatmap()
        {
            // Generate simulated activity data
            var heatmapData = new float[20, 20];

            for (int x = 0; x < 20; x++)
            {
                for (int y = 0; y < 20; y++)
                {
                    // Simulate hotspots around certain areas
                    float distance1 = Vector2.Distance(new Vector2(x, y), new Vector2(10, 10));
                    float distance2 = Vector2.Distance(new Vector2(x, y), new Vector2(5, 15));

                    float intensity = Mathf.Max(0, 1f - (distance1 / 10f)) + Mathf.Max(0, 1f - (distance2 / 8f));
                    intensity += UnityEngine.Random.Range(0f, 0.2f);

                    heatmapData[x, y] = Mathf.Clamp01(intensity);
                }
            }

            // Convert to format expected by visualization
            var flatData = new float[400];
            for (int x = 0; x < 20; x++)
            {
                for (int y = 0; y < 20; y++)
                {
                    flatData[x * 20 + y] = heatmapData[x, y];
                }
            }

            visualizationBridge.UpdateChart("activityHeatmap", flatData);
        }

        #endregion

        #region Economy Tracking

        private void SetupEconomyTracking()
        {
            // Resource distribution
            visualizationBridge.CreatePieChart("resourceDistribution", new
            {
                title = "Resource Distribution",
                donut = true,
                data = economyData.resources.Select(kvp => new
                {
                    name = kvp.Key,
                    value = kvp.Value,
                    color = GetResourceColor(kvp.Key)
                }).ToArray()
            });

            // Price history
            visualizationBridge.CreateLineChart("priceHistory", new
            {
                title = "Market Prices",
                datasets = economyData.prices.Keys.Select(resource => new
                {
                    name = resource,
                    color = GetResourceColor(resource)
                }).ToArray(),
                realTime = true,
                maxDataPoints = 50
            });

            // Transaction volume
            visualizationBridge.CreateBarChart("transactionVolume", new
            {
                title = "Transaction Volume",
                data = economyData.resources.Keys.Select(resource => new
                {
                    name = resource,
                    value = UnityEngine.Random.Range(5, 25)
                }).ToArray()
            });

            Debug.Log("DataVisualizationExample: Economy tracking setup complete");
        }

        private void UpdateEconomyTracking()
        {
            // Simulate market fluctuations
            SimulateMarketChanges();

            // Update resource distribution
            var resourceData = economyData.resources.Select(kvp => new
            {
                name = kvp.Key,
                value = kvp.Value,
                color = GetResourceColor(kvp.Key)
            }).ToArray();
            visualizationBridge.UpdateChart("resourceDistribution", resourceData);

            // Update price history
            long timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            visualizationBridge.UpdateChartMultiData("priceHistory", new
            {
                timestamp = timestamp,
                data = economyData.prices
            });

            // Simulate new transaction
            if (UnityEngine.Random.value < 0.3f)
            {
                SimulateTransaction();
            }
        }

        private void SimulateMarketChanges()
        {
            // Simulate price fluctuations
            var resourceKeys = economyData.prices.Keys.ToArray();
            foreach (var resource in resourceKeys)
            {
                float change = UnityEngine.Random.Range(-0.5f, 0.5f);
                economyData.prices[resource] = Mathf.Max(0.1f, economyData.prices[resource] + change);
            }

            // Simulate resource quantity changes
            var resourceQuantityKeys = economyData.resources.Keys.ToArray();
            foreach (var resource in resourceQuantityKeys)
            {
                float change = UnityEngine.Random.Range(-2f, 3f);
                economyData.resources[resource] = Mathf.Max(0f, economyData.resources[resource] + change);
            }
        }

        private void SimulateTransaction()
        {
            var resources = economyData.resources.Keys.ToArray();
            if (resources.Length > 0)
            {
                string randomResource = resources[UnityEngine.Random.Range(0, resources.Length)];
                var transaction = new Transaction
                {
                    item = randomResource,
                    quantity = UnityEngine.Random.Range(1, 10),
                    price = economyData.prices[randomResource],
                    timestamp = DateTime.Now,
                    playerName = $"Player{UnityEngine.Random.Range(1, 100)}"
                };

                economyData.recentTransactions.Add(transaction);

                // Keep only recent transactions
                if (economyData.recentTransactions.Count > 100)
                {
                    economyData.recentTransactions.RemoveAt(0);
                }

                Debug.Log($"New transaction: {transaction.playerName} bought {transaction.quantity} {transaction.item} for {transaction.price:F2} each");
            }
        }

        private string GetResourceColor(string resource)
        {
            return resource switch
            {
                "Wood" => "#8b4513",
                "Stone" => "#696969",
                "Iron" => "#708090",
                "Gold" => "#ffd700",
                _ => "#cccccc"
            };
        }

        #endregion

        #region Theme and Configuration

        private void ApplyGameTheme()
        {
            var gameTheme = new
            {
                colors = new
                {
                    primary = "#ff6b6b",
                    secondary = "#4ecdc4",
                    background = "#1a1a2e",
                    text = "#eee",
                    accent = "#ffd93d"
                },
                fonts = new
                {
                    title = "Orbitron",
                    body = "Roboto Mono"
                },
                borders = new
                {
                    radius = 8,
                    glow = true,
                    color = "#333"
                },
                animations = new
                {
                    enabled = true,
                    duration = 300
                }
            };

            visualizationBridge.SetTheme(gameTheme);
            Debug.Log("DataVisualizationExample: Game theme applied");
        }

        #endregion

        #region Update Logic

        private void UpdateSimulatedGameData()
        {
            // Simulate player movement
            currentPlayer.position += new Vector3(
                UnityEngine.Random.Range(-0.1f, 0.1f),
                0,
                UnityEngine.Random.Range(-0.1f, 0.1f)
            );

            // Update playtime
            currentPlayer.playtime += Time.deltaTime;

            // Update performance tracker
            performanceTracker.Update();
        }

        private void UpdateVisualizationsBasedOnIntervals()
        {
            float currentTime = Time.time;

            // Performance monitoring updates
            if (enablePerformanceMonitoring && currentTime - lastPerformanceUpdate >= performanceUpdateInterval)
            {
                UpdatePerformanceMonitoring();
                lastPerformanceUpdate = currentTime;
            }

            // Player statistics updates
            if (enablePlayerStats && currentTime - lastPlayerStatsUpdate >= playerStatsUpdateInterval)
            {
                UpdatePlayerStatistics();
                lastPlayerStatsUpdate = currentTime;
            }

            // Game analytics updates
            if (enableGameAnalytics && currentTime - lastAnalyticsUpdate >= analyticsUpdateInterval)
            {
                UpdateGameAnalytics();
                lastAnalyticsUpdate = currentTime;
            }

            // Economy tracking updates
            if (enableEconomyTracking && currentTime - lastEconomyUpdate >= economyUpdateInterval)
            {
                UpdateEconomyTracking();
                lastEconomyUpdate = currentTime;
            }
        }

        #endregion

        #region Event Handlers

        private void HandleThresholdCrossed(string chartId, object data)
        {
            Debug.Log($"Threshold crossed in chart '{chartId}': {data}");

            // Handle specific threshold events
            switch (chartId)
            {
                case "fpsChart":
                    HandleFPSThreshold(data);
                    break;
                case "healthGauge":
                    HandleHealthThreshold(data);
                    break;
                case "performanceGauge":
                    HandlePerformanceThreshold(data);
                    break;
            }
        }

        private void HandleDataPointAdded(string chartId, object data)
        {
            // Log data point additions if needed
            if (enableDebugLogging)
            {
                Debug.Log($"Data point added to '{chartId}': {data}");
            }
        }

        private void HandleChartError(string chartId, string error)
        {
            Debug.LogError($"Chart error in '{chartId}': {error}");
        }

        private void HandleFPSThreshold(object data)
        {
            // Show performance warning UI
            Debug.LogWarning("FPS dropped below threshold!");
        }

        private void HandleHealthThreshold(object data)
        {
            // Trigger health warning effects
            Debug.LogWarning("Player health is critically low!");
        }

        private void HandlePerformanceThreshold(object data)
        {
            // Adjust quality settings automatically
            Debug.LogWarning("Overall performance below threshold - consider reducing quality settings");
        }

        #endregion

        #region Cleanup

        private void CleanupExample()
        {
            if (visualizationBridge != null)
            {
                visualizationBridge.OnThresholdCrossed -= HandleThresholdCrossed;
                visualizationBridge.OnDataPointAdded -= HandleDataPointAdded;
                visualizationBridge.OnChartError -= HandleChartError;

                visualizationBridge.ClearAllCharts();
            }

            activeCharts.Clear();
            Debug.Log("DataVisualizationExample: Cleanup complete");
        }

        #endregion

        #region Public Interface

        [Header("Debug")]
        [SerializeField] private bool enableDebugLogging = false;

        public void TogglePerformanceMonitoring()
        {
            enablePerformanceMonitoring = !enablePerformanceMonitoring;
            Debug.Log($"Performance monitoring: {(enablePerformanceMonitoring ? "Enabled" : "Disabled")}");
        }

        public void TogglePlayerStats()
        {
            enablePlayerStats = !enablePlayerStats;
            Debug.Log($"Player statistics: {(enablePlayerStats ? "Enabled" : "Disabled")}");
        }

        public void ToggleGameAnalytics()
        {
            enableGameAnalytics = !enableGameAnalytics;
            Debug.Log($"Game analytics: {(enableGameAnalytics ? "Enabled" : "Disabled")}");
        }

        public void ToggleEconomyTracking()
        {
            enableEconomyTracking = !enableEconomyTracking;
            Debug.Log($"Economy tracking: {(enableEconomyTracking ? "Enabled" : "Disabled")}");
        }

        public void ResetAllCharts()
        {
            visualizationBridge.ClearAllCharts();
            StartCoroutine(InitializeVisualizationsWithDelay());
        }

        #endregion
    }

    #region Performance Tracking Utility

    public class PerformanceTracker
    {
        private List<float> fpsHistory = new List<float>();
        private List<float> memoryHistory = new List<float>();
        private float lastMemoryCheck;
        private const int maxHistorySize = 60; // 1 minute at 1fps tracking

        public void Update()
        {
            // Track FPS
            float currentFPS = 1.0f / Time.deltaTime;
            fpsHistory.Add(currentFPS);

            // Track memory (check every second to avoid performance impact)
            if (Time.time - lastMemoryCheck >= 1.0f)
            {
                float memoryMB = (float)GC.GetTotalMemory(false) / 1024f / 1024f;
                memoryHistory.Add(memoryMB);
                lastMemoryCheck = Time.time;
            }

            // Maintain history size
            if (fpsHistory.Count > maxHistorySize)
                fpsHistory.RemoveAt(0);

            if (memoryHistory.Count > maxHistorySize)
                memoryHistory.RemoveAt(0);
        }

        public PerformanceMetrics GetCurrentMetrics()
        {
            return new PerformanceMetrics
            {
                fps = fpsHistory.Count > 0 ? fpsHistory[fpsHistory.Count - 1] : 0f,
                memoryUsageMB = memoryHistory.Count > 0 ? memoryHistory[memoryHistory.Count - 1] : 0f,
                cpuUsagePercent = GetCPUUsage(),
                averageFPS = fpsHistory.Count > 0 ? fpsHistory.Average() : 0f,
                minFPS = fpsHistory.Count > 0 ? fpsHistory.Min() : 0f,
                maxFPS = fpsHistory.Count > 0 ? fpsHistory.Max() : 0f
            };
        }

        private float GetCPUUsage()
        {
            // This is a simplified CPU usage simulation
            // In a real implementation, you would use platform-specific APIs
            return UnityEngine.Random.Range(10f, 80f);
        }
    }

    public struct PerformanceMetrics
    {
        public float fps;
        public float memoryUsageMB;
        public float cpuUsagePercent;
        public float averageFPS;
        public float minFPS;
        public float maxFPS;
    }

    #endregion
}