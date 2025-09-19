using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using SupplyChainSimulation.Unity;

namespace SupplyChainSimulation.Examples
{
    /// <summary>
    /// Complete Supply Chain Simulation Example for Unity
    /// Demonstrates factory automation, inventory management, and logistics
    /// </summary>
    public class SupplyChainExample : MonoBehaviour
    {
        [Header("UI References")]
        public Text statusText;
        public Text metricsText;
        public Text productionText;
        public Button startSimulationButton;
        public Button stopSimulationButton;
        public Button createFactoryButton;
        public Slider simulationSpeedSlider;

        [Header("Visualization")]
        public Transform factoryParent;
        public GameObject factoryPrefab;
        public GameObject vehiclePrefab;
        public LineRenderer routeRenderer;

        [Header("Simulation Settings")]
        public int numberOfFactories = 5;
        public int numberOfWarehouses = 3;
        public float mapSize = 100f;
        public bool enableVisualization = true;

        // Core components
        private SupplyChainBridge supplyChainBridge;
        private Dictionary<string, GameObject> factoryObjects = new Dictionary<string, GameObject>();
        private Dictionary<string, GameObject> vehicleObjects = new Dictionary<string, GameObject>();
        private Dictionary<string, object> currentMetrics = new Dictionary<string, object>();

        // Simulation state
        private bool isSimulationRunning = false;
        private float lastMetricsUpdate = 0f;
        private List<string> logMessages = new List<string>();

        // Sample data
        private readonly Dictionary<string, ProductSpec> sampleProducts = new Dictionary<string, ProductSpec>
        {
            ["iron_ore"] = new ProductSpec { name = "Iron Ore", basePrice = 10f, weight = 5f },
            ["iron_ingot"] = new ProductSpec { name = "Iron Ingot", basePrice = 25f, weight = 3f },
            ["steel"] = new ProductSpec { name = "Steel", basePrice = 50f, weight = 2f },
            ["gears"] = new ProductSpec { name = "Gears", basePrice = 100f, weight = 1f },
            ["engines"] = new ProductSpec { name = "Engines", basePrice = 500f, weight = 10f }
        };

        void Start()
        {
            InitializeUI();
            InitializeSupplyChain();
        }

        /// <summary>
        /// Initialize UI components and event handlers
        /// </summary>
        private void InitializeUI()
        {
            // Button event handlers
            if (startSimulationButton != null)
                startSimulationButton.onClick.AddListener(StartSimulation);

            if (stopSimulationButton != null)
                stopSimulationButton.onClick.AddListener(StopSimulation);

            if (createFactoryButton != null)
                createFactoryButton.onClick.AddListener(CreateRandomFactory);

            if (simulationSpeedSlider != null)
                simulationSpeedSlider.onValueChanged.AddListener(OnSimulationSpeedChanged);

            // Initial UI state
            UpdateUI();
        }

        /// <summary>
        /// Initialize the supply chain simulation
        /// </summary>
        private void InitializeSupplyChain()
        {
            // Get or create the bridge component
            supplyChainBridge = GetComponent<SupplyChainBridge>();
            if (supplyChainBridge == null)
            {
                supplyChainBridge = gameObject.AddComponent<SupplyChainBridge>();
            }

            // Subscribe to events
            supplyChainBridge.OnProductionCompleted += OnProductionCompleted;
            supplyChainBridge.OnInventoryAlert += OnInventoryAlert;
            supplyChainBridge.OnTransportUpdate += OnTransportUpdate;
            supplyChainBridge.OnMetricsUpdate += OnMetricsUpdate;
            supplyChainBridge.OnError += OnError;

            LogMessage("Supply Chain Bridge initialized");
        }

        /// <summary>
        /// Start the simulation
        /// </summary>
        public void StartSimulation()
        {
            if (isSimulationRunning) return;

            try
            {
                LogMessage("Starting supply chain simulation...");

                // Create the basic supply network
                CreateBasicSupplyNetwork();

                isSimulationRunning = true;
                UpdateUI();

                LogMessage("Supply chain simulation started successfully");
            }
            catch (Exception ex)
            {
                LogMessage($"Failed to start simulation: {ex.Message}");
            }
        }

        /// <summary>
        /// Stop the simulation
        /// </summary>
        public void StopSimulation()
        {
            if (!isSimulationRunning) return;

            isSimulationRunning = false;
            UpdateUI();

            LogMessage("Supply chain simulation stopped");
        }

        /// <summary>
        /// Create a comprehensive supply network
        /// </summary>
        private void CreateBasicSupplyNetwork()
        {
            // 1. Create raw material suppliers
            Vector3 supplier1Pos = new Vector3(-mapSize * 0.4f, 0, -mapSize * 0.3f);
            Vector3 supplier2Pos = new Vector3(-mapSize * 0.4f, 0, mapSize * 0.3f);

            CreateSupplierNode("supplier_1", supplier1Pos, "iron_ore", 1000);
            CreateSupplierNode("supplier_2", supplier2Pos, "iron_ore", 800);

            // 2. Create manufacturing facilities
            Vector3 smelter1Pos = new Vector3(-mapSize * 0.1f, 0, 0f);
            Vector3 steelFactoryPos = new Vector3(mapSize * 0.1f, 0, 0f);
            Vector3 gearFactoryPos = new Vector3(mapSize * 0.3f, 0, -mapSize * 0.2f);
            Vector3 engineFactoryPos = new Vector3(mapSize * 0.3f, 0, mapSize * 0.2f);

            CreateManufacturingFacility("smelter_1", smelter1Pos, "iron_ingot", "iron_ore", 2, 1, 5f);
            CreateManufacturingFacility("steel_factory", steelFactoryPos, "steel", "iron_ingot", 3, 1, 8f);
            CreateManufacturingFacility("gear_factory", gearFactoryPos, "gears", "steel", 2, 5, 12f);
            CreateManufacturingFacility("engine_factory", engineFactoryPos, "engines", "gears", 10, 1, 30f);

            // 3. Create warehouses
            Vector3 warehouse1Pos = new Vector3(0f, 0, -mapSize * 0.4f);
            Vector3 warehouse2Pos = new Vector3(0f, 0, mapSize * 0.4f);

            CreateWarehouse("warehouse_1", warehouse1Pos, 5000);
            CreateWarehouse("warehouse_2", warehouse2Pos, 3000);

            // 4. Create distribution centers
            Vector3 distributionPos = new Vector3(mapSize * 0.4f, 0, 0f);
            CreateDistributionCenter("distribution_1", distributionPos, 2000);

            // 5. Create transportation routes
            CreateTransportationNetwork();

            // 6. Start initial production
            StartInitialProduction();

            LogMessage("Basic supply network created with 6 facilities and transportation routes");
        }

        /// <summary>
        /// Create a supplier node
        /// </summary>
        private void CreateSupplierNode(string nodeId, Vector3 position, string resourceType, int capacity)
        {
            var config = new Dictionary<string, object>
            {
                ["capacity"] = capacity,
                ["resourceType"] = resourceType,
                ["productionRate"] = 10, // units per minute
                ["operatingCost"] = 50
            };

            supplyChainBridge.CreateFactory(nodeId, position, config);

            if (enableVisualization)
            {
                CreateVisualNode(nodeId, position, Color.green, "Supplier");
            }

            LogMessage($"Created supplier: {nodeId} at {position}");
        }

        /// <summary>
        /// Create a manufacturing facility
        /// </summary>
        private void CreateManufacturingFacility(string facilityId, Vector3 position, string outputProduct,
            string inputProduct, int inputQuantity, int outputQuantity, float duration)
        {
            var config = new Dictionary<string, object>
            {
                ["capacity"] = 1000,
                ["operatingCost"] = 100,
                ["maintenanceCost"] = 20,
                ["qualityStandard"] = 0.95f
            };

            supplyChainBridge.CreateFactory(facilityId, position, config);

            var inputs = new Dictionary<string, int> { [inputProduct] = inputQuantity };
            supplyChainBridge.AddProductionRecipe(facilityId, outputProduct, inputs, outputQuantity, duration);

            if (enableVisualization)
            {
                CreateVisualNode(facilityId, position, Color.blue, "Factory");
            }

            LogMessage($"Created manufacturing facility: {facilityId} ({inputProduct} -> {outputProduct})");
        }

        /// <summary>
        /// Create a warehouse
        /// </summary>
        private void CreateWarehouse(string warehouseId, Vector3 position, int capacity)
        {
            var config = new Dictionary<string, object>
            {
                ["capacity"] = capacity,
                ["operatingCost"] = 30,
                ["storageTypes"] = new string[] { "raw_materials", "finished_goods" }
            };

            supplyChainBridge.CreateFactory(warehouseId, position, config);

            if (enableVisualization)
            {
                CreateVisualNode(warehouseId, position, Color.yellow, "Warehouse");
            }

            LogMessage($"Created warehouse: {warehouseId} with capacity {capacity}");
        }

        /// <summary>
        /// Create a distribution center
        /// </summary>
        private void CreateDistributionCenter(string centerId, Vector3 position, int capacity)
        {
            var config = new Dictionary<string, object>
            {
                ["capacity"] = capacity,
                ["operatingCost"] = 75,
                ["distributionRadius"] = 50f
            };

            supplyChainBridge.CreateFactory(centerId, position, config);

            if (enableVisualization)
            {
                CreateVisualNode(centerId, position, Color.magenta, "Distribution");
            }

            LogMessage($"Created distribution center: {centerId}");
        }

        /// <summary>
        /// Create transportation network
        /// </summary>
        private void CreateTransportationNetwork()
        {
            // Supplier to smelter routes
            supplyChainBridge.CreateRoute("route_s1_sm1", "supplier_1", "smelter_1", 15f, "truck");
            supplyChainBridge.CreateRoute("route_s2_sm1", "supplier_2", "smelter_1", 20f, "truck");

            // Smelter to steel factory
            supplyChainBridge.CreateRoute("route_sm1_sf1", "smelter_1", "steel_factory", 10f, "conveyor");

            // Steel factory to gear factory
            supplyChainBridge.CreateRoute("route_sf1_gf1", "steel_factory", "gear_factory", 12f, "truck");

            // Gear factory to engine factory
            supplyChainBridge.CreateRoute("route_gf1_ef1", "gear_factory", "engine_factory", 8f, "truck");

            // Warehouses connections
            supplyChainBridge.CreateRoute("route_sm1_w1", "smelter_1", "warehouse_1", 25f, "truck");
            supplyChainBridge.CreateRoute("route_sf1_w2", "steel_factory", "warehouse_2", 22f, "truck");

            // Distribution connections
            supplyChainBridge.CreateRoute("route_ef1_d1", "engine_factory", "distribution_1", 15f, "truck");
            supplyChainBridge.CreateRoute("route_w1_d1", "warehouse_1", "distribution_1", 30f, "truck");

            LogMessage("Transportation network created with 9 routes");
        }

        /// <summary>
        /// Start initial production orders
        /// </summary>
        private void StartInitialProduction()
        {
            // Start iron ore production at suppliers
            Invoke(nameof(StartSupplierProduction), 1f);

            // Schedule manufacturing orders
            Invoke(nameof(StartManufacturingOrders), 3f);
        }

        private void StartSupplierProduction()
        {
            supplyChainBridge.StartProduction("supplier_1", "iron_ore", 100);
            supplyChainBridge.StartProduction("supplier_2", "iron_ore", 80);
            LogMessage("Started iron ore production at suppliers");
        }

        private void StartManufacturingOrders()
        {
            supplyChainBridge.StartProduction("smelter_1", "iron_ingot", 50);
            supplyChainBridge.StartProduction("steel_factory", "steel", 25);
            supplyChainBridge.StartProduction("gear_factory", "gears", 10);
            supplyChainBridge.StartProduction("engine_factory", "engines", 5);
            LogMessage("Started manufacturing orders across all facilities");
        }

        /// <summary>
        /// Create a random factory for demonstration
        /// </summary>
        public void CreateRandomFactory()
        {
            if (!isSimulationRunning) return;

            string factoryId = $"factory_{UnityEngine.Random.Range(1000, 9999)}";
            Vector3 randomPos = new Vector3(
                UnityEngine.Random.Range(-mapSize * 0.4f, mapSize * 0.4f),
                0,
                UnityEngine.Random.Range(-mapSize * 0.4f, mapSize * 0.4f)
            );

            var config = new Dictionary<string, object>
            {
                ["capacity"] = UnityEngine.Random.Range(500, 1500),
                ["operatingCost"] = UnityEngine.Random.Range(50, 150)
            };

            supplyChainBridge.CreateFactory(factoryId, randomPos, config);

            if (enableVisualization)
            {
                CreateVisualNode(factoryId, randomPos, Color.cyan, "Random Factory");
            }

            LogMessage($"Created random factory: {factoryId}");
        }

        /// <summary>
        /// Create visual representation of a node
        /// </summary>
        private void CreateVisualNode(string nodeId, Vector3 position, Color color, string nodeType)
        {
            if (factoryPrefab == null || factoryParent == null) return;

            GameObject nodeObject = Instantiate(factoryPrefab, position, Quaternion.identity, factoryParent);
            nodeObject.name = $"{nodeType}_{nodeId}";

            // Set color
            Renderer renderer = nodeObject.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.material.color = color;
            }

            // Add label
            Canvas canvas = nodeObject.GetComponentInChildren<Canvas>();
            if (canvas != null)
            {
                Text label = canvas.GetComponentInChildren<Text>();
                if (label != null)
                {
                    label.text = $"{nodeType}\n{nodeId}";
                }
            }

            factoryObjects[nodeId] = nodeObject;
        }

        /// <summary>
        /// Handle production completed events
        /// </summary>
        private void OnProductionCompleted(string data)
        {
            LogMessage($"Production completed: {data}");

            // Parse the JSON data and update visualization if needed
            // This could trigger particle effects, sound, or UI updates
        }

        /// <summary>
        /// Handle inventory alert events
        /// </summary>
        private void OnInventoryAlert(string data)
        {
            LogMessage($"Inventory alert: {data}");

            // Could trigger UI warnings, visual indicators, or automatic reordering
        }

        /// <summary>
        /// Handle transport update events
        /// </summary>
        private void OnTransportUpdate(string data)
        {
            LogMessage($"Transport update: {data}");

            // Update vehicle positions, cargo status, etc.
        }

        /// <summary>
        /// Handle metrics update events
        /// </summary>
        private void OnMetricsUpdate(Dictionary<string, object> metrics)
        {
            currentMetrics = metrics;
            lastMetricsUpdate = Time.time;
        }

        /// <summary>
        /// Handle error events
        /// </summary>
        private void OnError(string error)
        {
            LogMessage($"ERROR: {error}");
        }

        /// <summary>
        /// Handle simulation speed changes
        /// </summary>
        private void OnSimulationSpeedChanged(float speed)
        {
            Time.timeScale = speed;
            LogMessage($"Simulation speed changed to: {speed:F1}x");
        }

        /// <summary>
        /// Update UI elements
        /// </summary>
        private void UpdateUI()
        {
            if (statusText != null)
            {
                statusText.text = isSimulationRunning ? "Simulation: RUNNING" : "Simulation: STOPPED";
                statusText.color = isSimulationRunning ? Color.green : Color.red;
            }

            if (startSimulationButton != null)
                startSimulationButton.interactable = !isSimulationRunning;

            if (stopSimulationButton != null)
                stopSimulationButton.interactable = isSimulationRunning;
        }

        /// <summary>
        /// Update metrics display
        /// </summary>
        void Update()
        {
            if (metricsText != null && currentMetrics.Count > 0)
            {
                UpdateMetricsDisplay();
            }

            if (productionText != null && logMessages.Count > 0)
            {
                UpdateProductionLog();
            }
        }

        /// <summary>
        /// Update metrics display text
        /// </summary>
        private void UpdateMetricsDisplay()
        {
            if (Time.time - lastMetricsUpdate > 5f) return; // Only show recent metrics

            var metricsDisplay = new System.Text.StringBuilder();
            metricsDisplay.AppendLine("=== SUPPLY CHAIN METRICS ===");

            foreach (var kvp in currentMetrics)
            {
                if (kvp.Value is Dictionary<string, object> nestedMetrics)
                {
                    metricsDisplay.AppendLine($"{kvp.Key.ToUpper()}:");
                    foreach (var nested in nestedMetrics)
                    {
                        metricsDisplay.AppendLine($"  {nested.Key}: {nested.Value}");
                    }
                }
                else
                {
                    metricsDisplay.AppendLine($"{kvp.Key}: {kvp.Value}");
                }
            }

            metricsText.text = metricsDisplay.ToString();
        }

        /// <summary>
        /// Update production log display
        /// </summary>
        private void UpdateProductionLog()
        {
            var logDisplay = new System.Text.StringBuilder();
            logDisplay.AppendLine("=== PRODUCTION LOG ===");

            int startIndex = Mathf.Max(0, logMessages.Count - 10); // Show last 10 messages
            for (int i = startIndex; i < logMessages.Count; i++)
            {
                logDisplay.AppendLine(logMessages[i]);
            }

            productionText.text = logDisplay.ToString();
        }

        /// <summary>
        /// Log a message with timestamp
        /// </summary>
        private void LogMessage(string message)
        {
            string timestampedMessage = $"[{Time.time:F1}s] {message}";
            logMessages.Add(timestampedMessage);

            if (logMessages.Count > 50) // Keep only recent messages
            {
                logMessages.RemoveAt(0);
            }

            Debug.Log($"[SupplyChain] {timestampedMessage}");
        }

        /// <summary>
        /// Cleanup on destroy
        /// </summary>
        void OnDestroy()
        {
            if (supplyChainBridge != null)
            {
                supplyChainBridge.OnProductionCompleted -= OnProductionCompleted;
                supplyChainBridge.OnInventoryAlert -= OnInventoryAlert;
                supplyChainBridge.OnTransportUpdate -= OnTransportUpdate;
                supplyChainBridge.OnMetricsUpdate -= OnMetricsUpdate;
                supplyChainBridge.OnError -= OnError;
            }
        }
    }

    /// <summary>
    /// Product specification helper class
    /// </summary>
    [System.Serializable]
    public class ProductSpec
    {
        public string name;
        public float basePrice;
        public float weight;
        public string category;
        public Dictionary<string, object> properties;
    }
}