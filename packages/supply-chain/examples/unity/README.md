# Unity Integration Guide - Supply Chain

This guide shows how to integrate the Supply Chain package into Unity projects for factory automation, inventory management, transportation networks, and logistics optimization in game development.

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
npm install @steamproject/supply-chain
```

## Quick Start

### 1. Basic Factory Setup

Add the `SupplyChainBridge` component to a GameObject in your scene:

```csharp
public class FactoryManager : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupFactory();
    }

    void SetupFactory()
    {
        // Create a basic factory
        supplyChainBridge.CreateFactory("steel-mill", new {
            name = "Steel Mill",
            position = new { x = 0, y = 0 },
            capacity = 1000,
            efficiency = 0.85f
        });

        // Add production line
        supplyChainBridge.CreateProductionLine("steel-line", new {
            factoryId = "steel-mill",
            inputItems = new[] {
                new { type = "iron-ore", quantity = 2 },
                new { type = "coal", quantity = 1 }
            },
            outputItems = new[] {
                new { type = "steel", quantity = 1 }
            },
            productionTime = 5.0f,
            efficiency = 0.9f
        });

        // Setup inventory system
        supplyChainBridge.CreateInventorySystem("main-storage", new {
            factoryId = "steel-mill",
            capacity = 10000,
            autoRestock = true,
            restockThreshold = 0.2f
        });
    }

    void Update()
    {
        // Update supply chain simulation
        supplyChainBridge.UpdateSimulation(Time.deltaTime);

        // Check production status
        if (Time.time % 1.0f < Time.deltaTime)
        {
            CheckProductionStatus();
        }
    }

    void CheckProductionStatus()
    {
        var status = supplyChainBridge.GetFactoryStatus("steel-mill");
        Debug.Log($"Factory Status: {status}");
    }
}
```

### 2. Transportation Network

```csharp
public class TransportationManager : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    [System.Serializable]
    public class VehicleData
    {
        public string id;
        public string type;
        public float capacity;
        public float speed;
        public Vector3 position;
    }

    [System.Serializable]
    public class RouteData
    {
        public string from;
        public string to;
        public float distance;
        public string priority;
    }

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupTransportation();
    }

    void SetupTransportation()
    {
        // Create transportation network
        supplyChainBridge.CreateTransportNetwork("main-network", new {
            optimization = "shortest-path",
            realTimeUpdates = true
        });

        // Add vehicles
        var truck = new VehicleData {
            id = "truck-001",
            type = "heavy-truck",
            capacity = 500,
            speed = 60,
            position = Vector3.zero
        };

        supplyChainBridge.AddVehicle("main-network", truck);

        // Create routes
        var route = new RouteData {
            from = "iron-mine",
            to = "steel-factory",
            distance = 150,
            priority = "high"
        };

        supplyChainBridge.AddRoute("main-network", route);
    }

    public void ScheduleDelivery(string from, string to, string cargoType, int quantity)
    {
        supplyChainBridge.ScheduleDelivery("main-network", new {
            from = from,
            to = to,
            cargo = new {
                type = cargoType,
                quantity = quantity
            },
            priority = "normal"
        });
    }
}
```

### 3. Supply Network Management

```csharp
public class SupplyNetworkManager : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    [System.Serializable]
    public class SupplierData
    {
        public string id;
        public string name;
        public Vector3 location;
        public float capacity;
        public float reliability;
        public ProductData[] products;
    }

    [System.Serializable]
    public class ProductData
    {
        public string type;
        public float pricePerUnit;
        public int availableQuantity;
    }

    [System.Serializable]
    public class CustomerData
    {
        public string id;
        public string name;
        public Vector3 location;
        public DemandData[] demands;
    }

    [System.Serializable]
    public class DemandData
    {
        public string type;
        public int quantity;
        public string urgency;
    }

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupSupplyNetwork();
    }

    void SetupSupplyNetwork()
    {
        // Create supply network
        supplyChainBridge.CreateSupplyNetwork("global-network", new {
            optimization = "cost-efficiency",
            riskManagement = true
        });

        // Add suppliers
        var ironMineSupplier = new SupplierData {
            id = "iron-mine-001",
            name = "Iron Valley Mine",
            location = new Vector3(100, 0, 200),
            capacity = 1000,
            reliability = 0.95f,
            products = new[] {
                new ProductData {
                    type = "iron-ore",
                    pricePerUnit = 15.0f,
                    availableQuantity = 800
                }
            }
        };

        supplyChainBridge.AddSupplier("global-network", ironMineSupplier);

        // Add customers
        var constructionCompany = new CustomerData {
            id = "construction-corp",
            name = "Construction Corporation",
            location = new Vector3(500, 0, 300),
            demands = new[] {
                new DemandData {
                    type = "steel",
                    quantity = 200,
                    urgency = "medium"
                }
            }
        };

        supplyChainBridge.AddCustomer("global-network", constructionCompany);
    }

    public void OptimizeSupplyChain()
    {
        supplyChainBridge.OptimizeNetwork("global-network", new {
            objectives = new[] { "minimize-cost", "maximize-service-level" },
            constraints = new[] { "capacity-limits", "budget-constraints" }
        });
    }
}
```

### 4. Advanced Factory Automation

```csharp
public class AdvancedFactorySystem : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    [System.Serializable]
    public class ProductionStage
    {
        public string name;
        public float duration;
        public int workers;
        public float efficiency;
    }

    [System.Serializable]
    public class QualityControlSettings
    {
        public float inspectionRate;
        public float defectThreshold;
        public bool autoReject;
        public bool batchTesting;
    }

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupAdvancedFactory();
    }

    void SetupAdvancedFactory()
    {
        // Create complex assembly line
        var assemblyStages = new ProductionStage[] {
            new ProductionStage {
                name = "component-insertion",
                duration = 2.0f,
                workers = 3,
                efficiency = 0.92f
            },
            new ProductionStage {
                name = "soldering",
                duration = 3.0f,
                workers = 2,
                efficiency = 0.88f
            },
            new ProductionStage {
                name = "quality-check",
                duration = 1.0f,
                workers = 1,
                efficiency = 0.99f
            }
        };

        supplyChainBridge.CreateAssemblyLine("electronics-assembly", new {
            factoryId = "electronics-factory",
            stages = assemblyStages,
            throughput = 50, // units per hour
            qualityRate = 0.95f
        });

        // Setup quality control
        var qualitySettings = new QualityControlSettings {
            inspectionRate = 0.1f,
            defectThreshold = 0.05f,
            autoReject = true,
            batchTesting = true
        };

        supplyChainBridge.CreateQualityControl("main-qc", new {
            factoryId = "electronics-factory",
            settings = qualitySettings
        });

        // Setup automated restocking
        supplyChainBridge.CreateRestockSystem("auto-restock", new {
            factoryId = "electronics-factory",
            rules = new[] {
                new {
                    itemType = "raw-materials",
                    threshold = 0.15f,
                    orderQuantity = "EOQ", // Economic Order Quantity
                    leadTime = 3
                },
                new {
                    itemType = "finished-goods",
                    threshold = 0.25f,
                    orderQuantity = "dynamic",
                    leadTime = 1
                }
            }
        });
    }
}
```

## Advanced Features

### Performance Monitoring

```csharp
public class SupplyChainAnalytics : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    [System.Serializable]
    public class KPIData
    {
        public float oee; // Overall Equipment Effectiveness
        public float inventoryTurnover;
        public float orderFulfillment;
        public float cycleTime;
    }

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupAnalytics();
    }

    void SetupAnalytics()
    {
        supplyChainBridge.CreateAnalyticsEngine("main-analytics", new {
            realTimeMetrics = true,
            historicalAnalysis = true,
            predictiveModeling = true,
            alerting = true
        });
    }

    void Update()
    {
        if (Time.time % 5.0f < Time.deltaTime) // Every 5 seconds
        {
            UpdateKPIs();
            CheckBottlenecks();
        }
    }

    void UpdateKPIs()
    {
        var kpis = supplyChainBridge.GetKPIs("main-analytics");
        Debug.Log($"OEE: {kpis["oee"]}%");
        Debug.Log($"Inventory Turnover: {kpis["inventoryTurnover"]}x/year");
        Debug.Log($"Order Fulfillment: {kpis["orderFulfillment"]}%");
    }

    void CheckBottlenecks()
    {
        var bottlenecks = supplyChainBridge.IdentifyBottlenecks("main-analytics");
        foreach (var bottleneck in bottlenecks)
        {
            Debug.LogWarning($"Bottleneck detected: {bottleneck}");
        }
    }
}
```

### Demand Forecasting

```csharp
public class DemandForecasting : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupForecasting();
    }

    void SetupForecasting()
    {
        supplyChainBridge.CreateDemandForecaster("main-forecaster", new {
            model = "neural-network",
            historicalPeriod = 365,
            seasonalityFactors = new[] { "monthly", "weekly", "holidays" },
            externalFactors = new[] { "weather", "economic-indicators" }
        });
    }

    public async void GenerateForecast()
    {
        var forecast = await supplyChainBridge.GenerateForecastAsync("main-forecaster", new {
            items = new[] { "steel", "aluminum", "copper" },
            horizon = 90, // days
            confidence = 0.95f
        });

        foreach (var item in forecast)
        {
            Debug.Log($"{item["type"]}: Predicted demand {item["quantity"]} units (±{item["uncertainty"]}%)");
        }
    }
}
```

### Risk Management

```csharp
public class RiskManagement : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    [System.Serializable]
    public class RiskScenario
    {
        public string type;
        public float probability;
        public string impact;
        public string[] affectedSuppliers;
        public string[] mitigationStrategies;
    }

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupRiskManagement();
    }

    void SetupRiskManagement()
    {
        supplyChainBridge.CreateRiskManager("main-risk-manager", new {
            riskAssessment = "continuous",
            mitigation = "automatic",
            contingencyPlanning = true
        });

        // Define risk scenarios
        var supplierDisruption = new RiskScenario {
            type = "supplier-disruption",
            probability = 0.15f,
            impact = "high",
            affectedSuppliers = new[] { "supplier-001", "supplier-003" },
            mitigationStrategies = new[] {
                "activate-backup-suppliers",
                "increase-safety-stock",
                "expedite-alternative-sourcing"
            }
        };

        supplyChainBridge.AddRiskScenario("main-risk-manager", supplierDisruption);
    }
}
```

## Event System Integration

```csharp
public class SupplyChainEventHandler : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        SetupEventHandlers();
    }

    void SetupEventHandlers()
    {
        if (supplyChainBridge != null)
        {
            supplyChainBridge.OnProductionCompleted.AddListener(HandleProductionCompleted);
            supplyChainBridge.OnInventoryLow.AddListener(HandleInventoryLow);
            supplyChainBridge.OnDeliveryCompleted.AddListener(HandleDeliveryCompleted);
            supplyChainBridge.OnQualityIssue.AddListener(HandleQualityIssue);
            supplyChainBridge.OnBottleneckDetected.AddListener(HandleBottleneckDetected);
        }
    }

    void HandleProductionCompleted(string factoryId, string productType, int quantity)
    {
        Debug.Log($"Production completed at {factoryId}: {quantity} {productType}");

        // Update UI
        UIManager.Instance.UpdateProductionStats(factoryId, productType, quantity);

        // Trigger achievement check
        AchievementManager.Instance.CheckProductionAchievements(productType, quantity);
    }

    void HandleInventoryLow(string factoryId, string itemType, float currentLevel)
    {
        Debug.LogWarning($"Low inventory at {factoryId}: {itemType} at {currentLevel}%");

        // Trigger automatic reordering
        supplyChainBridge.TriggerAutoRestock(factoryId, itemType);

        // Show warning to player
        UIManager.Instance.ShowInventoryWarning(factoryId, itemType);
    }

    void HandleDeliveryCompleted(string vehicleId, string from, string to, string cargoType)
    {
        Debug.Log($"Delivery completed by {vehicleId}: {cargoType} from {from} to {to}");

        // Update delivery tracking
        DeliveryTracker.Instance.CompleteDelivery(vehicleId);

        // Update customer satisfaction
        CustomerManager.Instance.UpdateSatisfaction(to, "delivery-completed");
    }

    void HandleQualityIssue(string factoryId, string issueType, float severity)
    {
        Debug.LogError($"Quality issue at {factoryId}: {issueType} (Severity: {severity})");

        if (severity > 0.8f)
        {
            // Critical issue - halt production
            supplyChainBridge.HaltProduction(factoryId);

            // Notify quality manager
            QualityManager.Instance.HandleCriticalIssue(factoryId, issueType);
        }
    }

    void HandleBottleneckDetected(string location, string cause, float impact)
    {
        Debug.LogWarning($"Bottleneck detected at {location}: {cause} (Impact: {impact}%)");

        // Suggest optimizations to player
        OptimizationSuggestions.Instance.SuggestBottleneckFix(location, cause);

        // Auto-optimize if impact is severe
        if (impact > 50f)
        {
            supplyChainBridge.AutoOptimizeBottleneck(location);
        }
    }
}
```

## Performance Optimization

### Memory Management

```csharp
public class SupplyChainOptimizer : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();
        ConfigureOptimization();
    }

    void ConfigureOptimization()
    {
        // Set memory limits
        supplyChainBridge.SetMemoryLimit(100 * 1024 * 1024); // 100MB

        // Enable auto-cleanup
        supplyChainBridge.EnableAutoCleanup(true);

        // Configure batch processing
        supplyChainBridge.EnableBatchProcessing(true);
        supplyChainBridge.SetBatchSize(100);
    }

    void OnApplicationPause(bool pauseStatus)
    {
        if (pauseStatus)
        {
            // Pause simulation when app is paused
            supplyChainBridge.PauseSimulation();
        }
        else
        {
            // Resume simulation
            supplyChainBridge.ResumeSimulation();
        }
    }

    void OnDestroy()
    {
        // Proper cleanup
        if (supplyChainBridge != null)
        {
            supplyChainBridge.Dispose();
        }
    }
}
```

### Batch Processing

```csharp
public class BatchedSupplyChainManager : MonoBehaviour
{
    private SupplyChainBridge supplyChainBridge;
    private List<SupplyChainOperation> pendingOperations = new List<SupplyChainOperation>();

    [System.Serializable]
    public class SupplyChainOperation
    {
        public string type;
        public string entityId;
        public object data;
        public float timestamp;
    }

    void Start()
    {
        supplyChainBridge = GetComponent<SupplyChainBridge>();

        // Process batches every 100ms
        InvokeRepeating(nameof(ProcessBatch), 0.1f, 0.1f);
    }

    public void AddOperation(string type, string entityId, object data)
    {
        pendingOperations.Add(new SupplyChainOperation {
            type = type,
            entityId = entityId,
            data = data,
            timestamp = Time.time
        });
    }

    void ProcessBatch()
    {
        if (pendingOperations.Count > 0)
        {
            supplyChainBridge.ProcessBatchOperations(pendingOperations.ToArray());
            pendingOperations.Clear();
        }
    }
}
```

## Blueprint Integration

Create Blueprint nodes for easier integration:

```csharp
// SupplyChainBlueprintLibrary.cs
using UnityEngine;

public static class SupplyChainBlueprintLibrary
{
    public static SupplyChainBridge CreateSupplyChainManager()
    {
        var gameObject = new GameObject("SupplyChainManager");
        return gameObject.AddComponent<SupplyChainBridge>();
    }

    public static void CreateSimpleFactory(SupplyChainBridge bridge, string factoryId, string name)
    {
        bridge.CreateFactory(factoryId, new {
            name = name,
            position = Vector3.zero,
            capacity = 1000,
            efficiency = 0.8f
        });
    }

    public static void CreateBasicProductionLine(SupplyChainBridge bridge, string lineId, string factoryId)
    {
        bridge.CreateProductionLine(lineId, new {
            factoryId = factoryId,
            inputItems = new[] {
                new { type = "raw-material", quantity = 1 }
            },
            outputItems = new[] {
                new { type = "finished-product", quantity = 1 }
            },
            productionTime = 5.0f,
            efficiency = 0.9f
        });
    }
}
```

## Troubleshooting

### Common Issues

1. **JavaScript Engine Not Found**
   - Ensure ClearScript V8 is properly installed
   - Check Unity console for JavaScript errors

2. **Performance Issues**
   - Enable batch processing
   - Reduce simulation complexity
   - Use appropriate time scaling

3. **Build Errors**
   - Ensure all JavaScript files are in StreamingAssets
   - Check platform-specific build settings

### Debug Mode

```csharp
public class SupplyChainDebugger : MonoBehaviour
{
    void Start()
    {
        var supplyChainBridge = GetComponent<SupplyChainBridge>();

        // Enable debug mode
        supplyChainBridge.SetDebugMode(true);
        supplyChainBridge.SetLogLevel("verbose");

        // Show performance stats
        supplyChainBridge.ShowPerformanceStats(true);
    }
}
```

## Best Practices

1. **Simulation Scale**: Start with smaller networks and scale up gradually
2. **Update Frequency**: Use appropriate update intervals for different systems
3. **Memory Management**: Set reasonable memory limits and enable auto-cleanup
4. **Error Handling**: Implement proper error handlers for production builds
5. **Performance**: Use batch processing for multiple operations
6. **Threading**: Keep main thread operations lightweight

## Example Project Structure

```
MyProject/
├── Assets/
│   ├── Scripts/
│   │   ├── SupplyChain/
│   │   │   ├── Bridge.cs
│   │   │   ├── Example.cs
│   │   │   └── Managers/
│   │   └── UI/
│   │       └── SupplyChainUI/
│   ├── StreamingAssets/
│   │   └── JavaScript/
│   │       └── node_modules/@steamproject/supply-chain/
│   └── Prefabs/
│       └── SupplyChain/
└── Package.unity
```

This integration provides a robust foundation for supply chain simulation in Unity projects, with comprehensive examples for factory automation, transportation networks, inventory management, and logistics optimization.