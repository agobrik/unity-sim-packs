# Unity Integration Guide - Data Visualization

This guide shows how to integrate the Data Visualization package into Unity projects for real-time game analytics, performance monitoring, and player statistics visualization.

## Requirements

- Unity 2021.3+ (LTS recommended)
- .NET Framework 4.8 or .NET Standard 2.1
- ClearScript V8 or Jint JavaScript Engine

## Installation

### 1. Install ClearScript V8 (Recommended)

Download ClearScript from NuGet or the official repository:

```bash
# Via Unity Package Manager
# Add this to manifest.json:
"com.clearscript.v8": "7.4.0"
```

### 2. Add Package to Unity Project

1. Copy the `Bridge.cs` and `Example.cs` files to your Unity project's `Scripts` folder
2. Install the npm package in your project's streaming assets:

```bash
# Create StreamingAssets/JavaScript folder
mkdir Assets/StreamingAssets/JavaScript
cd Assets/StreamingAssets/JavaScript
npm install @steamproject/data-visualization
```

## Quick Start

### 1. Basic Setup

Add the `DataVisualizationBridge` component to a GameObject in your scene:

```csharp
public class GameManager : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();
        SetupCharts();
    }

    void SetupCharts()
    {
        // Create FPS monitor
        vizBridge.CreateLineChart("fpsChart", new {
            title = "FPS Monitor",
            maxDataPoints = 100,
            realTime = true,
            yAxis = new { min = 0, max = 120 }
        });

        // Create player stats dashboard
        vizBridge.CreateDashboard("playerDashboard", new {
            container = "player-stats",
            layout = "grid",
            columns = 3
        });
    }

    void Update()
    {
        // Update FPS chart every frame
        float fps = 1.0f / Time.deltaTime;
        vizBridge.UpdateChart("fpsChart", DateTime.Now.Ticks, fps);

        // Update player stats every second
        if (Time.time % 1.0f < Time.deltaTime)
        {
            UpdatePlayerStats();
        }
    }

    void UpdatePlayerStats()
    {
        var playerData = new {
            health = GetPlayerHealth(),
            mana = GetPlayerMana(),
            experience = GetPlayerExperience(),
            level = GetPlayerLevel()
        };

        vizBridge.UpdateDashboard("playerDashboard", playerData);
    }
}
```

### 2. Performance Monitoring

```csharp
public class PerformanceMonitor : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;
    private float updateInterval = 0.5f;
    private float lastUpdate;

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();
        SetupPerformanceCharts();
    }

    void SetupPerformanceCharts()
    {
        // Multi-line performance chart
        vizBridge.CreateLineChart("performanceChart", new {
            title = "System Performance",
            datasets = new[] {
                new { name = "FPS", color = "#ff6b6b" },
                new { name = "Memory (MB)", color = "#4ecdc4" },
                new { name = "CPU %", color = "#45b7d1" }
            },
            realTime = true,
            maxDataPoints = 200
        });

        // Memory usage heatmap
        vizBridge.CreateHeatmap("memoryHeatmap", new {
            title = "Memory Usage Zones",
            width = 50,
            height = 50,
            colorScale = new[] { "#000033", "#0066cc", "#00ccff", "#ffff00", "#ff0000" }
        });
    }

    void Update()
    {
        if (Time.time - lastUpdate >= updateInterval)
        {
            UpdatePerformanceMetrics();
            lastUpdate = Time.time;
        }
    }

    void UpdatePerformanceMetrics()
    {
        float fps = 1.0f / Time.deltaTime;
        float memoryMB = (float)GC.GetTotalMemory(false) / 1024f / 1024f;
        float cpuUsage = GetCPUUsage(); // Implement platform-specific CPU monitoring

        long timestamp = DateTime.Now.Ticks;

        vizBridge.UpdateChartMultiData("performanceChart", new {
            timestamp = timestamp,
            data = new {
                FPS = fps,
                Memory = memoryMB,
                CPU = cpuUsage
            }
        });
    }

    // Platform-specific CPU usage implementation
    private float GetCPUUsage()
    {
        // Implement CPU monitoring based on platform
        // This is a simplified example
        return UnityEngine.Random.Range(10f, 80f);
    }
}
```

### 3. Game Analytics Dashboard

```csharp
public class GameAnalytics : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;

    [System.Serializable]
    public class PlayerStats
    {
        public string playerName;
        public int score;
        public float playtime;
        public int level;
        public Dictionary<string, int> achievements;
    }

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();
        SetupAnalyticsDashboard();
    }

    void SetupAnalyticsDashboard()
    {
        // Leaderboard bar chart
        vizBridge.CreateBarChart("leaderboard", new {
            title = "Top Players",
            horizontal = true,
            maxEntries = 10
        });

        // Player progress pie chart
        vizBridge.CreatePieChart("playerProgress", new {
            title = "Completion Status",
            showLegend = true
        });

        // Achievement progress gauges
        vizBridge.CreateGauge("achievementProgress", new {
            title = "Achievement Progress",
            min = 0,
            max = 100,
            thresholds = new[] {
                new { value = 25, color = "#ff4444" },
                new { value = 50, color = "#ffaa00" },
                new { value = 75, color = "#44ff44" }
            }
        });
    }

    public void UpdateLeaderboard(List<PlayerStats> players)
    {
        var leaderboardData = players
            .OrderByDescending(p => p.score)
            .Take(10)
            .Select(p => new { name = p.playerName, value = p.score })
            .ToArray();

        vizBridge.UpdateChart("leaderboard", leaderboardData);
    }

    public void UpdatePlayerProgress(PlayerStats player)
    {
        var progressData = new[] {
            new { name = "Completed", value = player.achievements.Count },
            new { name = "In Progress", value = GetInProgressCount(player) },
            new { name = "Not Started", value = GetNotStartedCount(player) }
        };

        vizBridge.UpdateChart("playerProgress", progressData);
    }
}
```

### 4. Economy Visualization

```csharp
public class EconomyVisualizer : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;

    [System.Serializable]
    public class EconomyData
    {
        public Dictionary<string, float> resources;
        public Dictionary<string, float> prices;
        public List<Transaction> transactions;
    }

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();
        SetupEconomyCharts();
    }

    void SetupEconomyCharts()
    {
        // Resource distribution
        vizBridge.CreatePieChart("resourceDistribution", new {
            title = "Resource Distribution",
            donut = true,
            innerRadius = 0.4f
        });

        // Price trends over time
        vizBridge.CreateLineChart("priceHistory", new {
            title = "Market Prices",
            datasets = new[] {
                new { name = "Wood", color = "#8b4513" },
                new { name = "Stone", color = "#696969" },
                new { name = "Iron", color = "#708090" },
                new { name = "Gold", color = "#ffd700" }
            },
            realTime = true,
            maxDataPoints = 100
        });

        // Transaction volume
        vizBridge.CreateBarChart("transactionVolume", new {
            title = "Daily Transaction Volume",
            stacked = true
        });
    }

    public void UpdateEconomyData(EconomyData data)
    {
        // Update resource distribution
        var resourceData = data.resources
            .Select(kvp => new { name = kvp.Key, value = kvp.Value })
            .ToArray();
        vizBridge.UpdateChart("resourceDistribution", resourceData);

        // Update price trends
        long timestamp = DateTime.Now.Ticks;
        vizBridge.UpdateChartMultiData("priceHistory", new {
            timestamp = timestamp,
            data = data.prices
        });

        // Update transaction volume
        var volumeData = GetDailyTransactionVolume(data.transactions);
        vizBridge.UpdateChart("transactionVolume", volumeData);
    }
}
```

## Advanced Features

### Event System Integration

```csharp
public class EventVisualization : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();

        // Listen to chart events
        vizBridge.OnThresholdCrossed += HandleThresholdCrossed;
        vizBridge.OnDataPointAdded += HandleDataPointAdded;
    }

    void HandleThresholdCrossed(string chartId, object thresholdData)
    {
        // Handle performance warnings, achievement unlocks, etc.
        if (chartId == "fpsChart")
        {
            var data = JsonUtility.FromJson<ThresholdData>(thresholdData.ToString());
            if (data.value < 30)
            {
                ShowPerformanceWarning();
            }
        }
    }

    void HandleDataPointAdded(string chartId, object dataPoint)
    {
        // React to new data points
        Debug.Log($"New data added to {chartId}: {dataPoint}");
    }
}
```

### Custom Themes

```csharp
public class ThemeManager : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();
        ApplyGameTheme();
    }

    void ApplyGameTheme()
    {
        var gameTheme = new {
            colors = new {
                primary = "#ff6b6b",
                secondary = "#4ecdc4",
                background = "#1a1a2e",
                text = "#eee"
            },
            fonts = new {
                title = "Orbitron",
                body = "Roboto Mono"
            },
            borders = new {
                radius = 8,
                glow = true
            }
        };

        vizBridge.SetTheme(gameTheme);
    }
}
```

### WebGL Build Considerations

When building for WebGL, ensure proper JavaScript engine configuration:

```csharp
#if UNITY_WEBGL && !UNITY_EDITOR
    // WebGL-specific implementation
    private void InitializeWebGLBridge()
    {
        // Use Unity's built-in JavaScript interop for WebGL
        Application.ExternalCall("initializeDataVisualization");
    }
#endif
```

## Troubleshooting

### Common Issues

1. **JavaScript Engine Not Found**
   - Ensure ClearScript V8 is properly installed
   - Check Unity console for JavaScript errors

2. **Performance Issues**
   - Reduce chart update frequency
   - Limit the number of data points
   - Use object pooling for frequent updates

3. **Build Errors**
   - Ensure all JavaScript files are in StreamingAssets
   - Check platform-specific build settings

### Debug Mode

```csharp
public class DebugVisualization : MonoBehaviour
{
    void Start()
    {
        var vizBridge = GetComponent<DataVisualizationBridge>();

        // Enable debug mode
        vizBridge.SetDebugMode(true);
        vizBridge.SetLogLevel("verbose");

        // Show performance stats
        vizBridge.ShowPerformanceStats(true);
    }
}
```

## Performance Optimization

### Memory Management

```csharp
public class OptimizedVisualization : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();

        // Configure memory limits
        vizBridge.SetMemoryLimit(50 * 1024 * 1024); // 50MB
        vizBridge.EnableAutoCleanup(true);
    }

    void OnDestroy()
    {
        // Proper cleanup
        vizBridge?.Dispose();
    }
}
```

### Batch Updates

```csharp
public class BatchedUpdates : MonoBehaviour
{
    private DataVisualizationBridge vizBridge;
    private List<ChartUpdateData> pendingUpdates = new List<ChartUpdateData>();

    void Start()
    {
        vizBridge = GetComponent<DataVisualizationBridge>();

        // Enable batch updates
        vizBridge.EnableBatchUpdates(true);
        vizBridge.SetBatchInterval(0.1f); // 100ms batches
    }

    void Update()
    {
        // Collect updates instead of applying immediately
        CollectUpdateData();

        // Apply batched updates
        if (pendingUpdates.Count > 0)
        {
            vizBridge.ApplyBatchedUpdates(pendingUpdates.ToArray());
            pendingUpdates.Clear();
        }
    }
}
```

## Best Practices

1. **Update Frequency**: Don't update charts every frame unless necessary
2. **Data Management**: Use appropriate data point limits for real-time charts
3. **Memory Cleanup**: Always dispose of charts when no longer needed
4. **Performance Monitoring**: Use the built-in performance stats during development
5. **Thread Safety**: All chart updates should happen on the main thread

## Example Scenes

The `Package.unity` file includes several example scenes demonstrating:
- Real-time performance monitoring
- Player statistics dashboard
- Game economy visualization
- Achievement progress tracking
- Multiplayer leaderboards

Import the Unity package to access these examples and start building your own data visualization solutions!