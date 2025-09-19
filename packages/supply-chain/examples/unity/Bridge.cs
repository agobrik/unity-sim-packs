using System;
using System.Collections.Generic;
using UnityEngine;
using Microsoft.ClearScript.V8;
using Microsoft.ClearScript;
using System.IO;
using System.Threading.Tasks;

namespace SupplyChainSimulation.Unity
{
    /// <summary>
    /// Unity Bridge for Supply Chain Simulation Package
    /// Provides C# interface to the TypeScript supply chain simulation system
    /// </summary>
    public class SupplyChainBridge : MonoBehaviour
    {
        [Header("Configuration")]
        public bool enableDebugLogging = true;
        public bool autoInitialize = true;
        public int simulationUpdateInterval = 100; // milliseconds

        [Header("Performance")]
        public int maxEventsPerFrame = 50;
        public bool enablePerformanceMonitoring = true;

        // JavaScript Engine
        private V8ScriptEngine engine;
        private bool isInitialized = false;
        private Queue<Action> mainThreadActions = new Queue<Action>();
        private Dictionary<string, object> gameData = new Dictionary<string, object>();

        // Performance tracking
        private float lastUpdateTime;
        private int eventCount;
        private List<float> performanceMetrics = new List<float>();

        // Events
        public event Action<string> OnProductionCompleted;
        public event Action<string> OnInventoryAlert;
        public event Action<string> OnTransportUpdate;
        public event Action<Dictionary<string, object>> OnMetricsUpdate;
        public event Action<string> OnError;

        void Start()
        {
            if (autoInitialize)
            {
                InitializeAsync();
            }
        }

        /// <summary>
        /// Initialize the Supply Chain simulation system
        /// </summary>
        public async void InitializeAsync()
        {
            try
            {
                LogDebug("Initializing Supply Chain Simulation Bridge...");

                // Create V8 engine with proper configuration
                engine = new V8ScriptEngine(V8ScriptEngineFlags.EnableDynamicModuleImports)
                {
                    AllowReflection = true,
                    MaxRuntimeHeapSize = 64 * 1024 * 1024 // 64MB
                };

                // Add Unity-specific global objects
                SetupUnityGlobals();

                // Load the supply chain package
                await LoadSupplyChainPackage();

                // Setup event handlers
                SetupEventHandlers();

                // Start simulation loop
                StartSimulation();

                isInitialized = true;
                LogDebug("Supply Chain Simulation Bridge initialized successfully");
            }
            catch (Exception ex)
            {
                LogError($"Failed to initialize Supply Chain Bridge: {ex.Message}");
                OnError?.Invoke(ex.Message);
            }
        }

        /// <summary>
        /// Setup Unity-specific global objects in JavaScript context
        /// </summary>
        private void SetupUnityGlobals()
        {
            // Console implementation
            engine.AddHostObject("console", new
            {
                log = new Action<object>(msg => LogDebug($"JS: {msg}")),
                warn = new Action<object>(msg => Debug.LogWarning($"JS Warning: {msg}")),
                error = new Action<object>(msg => LogError($"JS Error: {msg}"))
            });

            // Performance API
            engine.AddHostObject("performance", new
            {
                now = new Func<double>(() => Time.realtimeSinceStartup * 1000.0)
            });

            // Timer functions
            engine.AddHostObject("setInterval", new Func<ScriptObject, double, double>((callback, interval) =>
            {
                return StartCoroutine(IntervalCoroutine(callback, interval / 1000.0f)).GetHashCode();
            }));

            engine.AddHostObject("setTimeout", new Func<ScriptObject, double, double>((callback, delay) =>
            {
                return StartCoroutine(TimeoutCoroutine(callback, delay / 1000.0f)).GetHashCode();
            }));

            // Game-specific data bridge
            engine.AddHostObject("Unity", new
            {
                GetGameData = new Func<string, object>(key => gameData.ContainsKey(key) ? gameData[key] : null),
                SetGameData = new Action<string, object>((key, value) => gameData[key] = value),
                TriggerEvent = new Action<string, object>((eventName, data) =>
                    EnqueueMainThreadAction(() => TriggerUnityEvent(eventName, data)))
            });
        }

        /// <summary>
        /// Load the supply chain package and initialize the simulation
        /// </summary>
        private async Task LoadSupplyChainPackage()
        {
            try
            {
                // Load the main supply chain simulation package
                string packagePath = Path.Combine(Application.streamingAssetsPath, "SupplyChain", "index.js");
                if (!File.Exists(packagePath))
                {
                    throw new FileNotFoundException($"Supply chain package not found at: {packagePath}");
                }

                string packageCode = File.ReadAllText(packagePath);
                engine.Execute(packageCode);

                // Initialize the supply chain engine
                engine.Execute(@"
                    const supplyChain = new SupplyChainEngine({
                        timeScale: 1.0,
                        realTimeMode: true,
                        maxNodes: 1000,
                        enableAnalytics: true,
                        enableOptimization: true
                    });

                    // Global reference for Unity access
                    window.supplyChainEngine = supplyChain;

                    // Initialize the engine
                    supplyChain.initialize().then(() => {
                        console.log('Supply Chain Engine initialized');
                        Unity.TriggerEvent('EngineInitialized', {});
                    }).catch(error => {
                        console.error('Failed to initialize Supply Chain Engine:', error);
                        Unity.TriggerEvent('EngineError', { error: error.message });
                    });
                ");

                LogDebug("Supply chain package loaded successfully");
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to load supply chain package: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Setup event handlers for supply chain events
        /// </summary>
        private void SetupEventHandlers()
        {
            engine.Execute(@"
                if (window.supplyChainEngine) {
                    const engine = window.supplyChainEngine;

                    // Production events
                    engine.getEventBus().subscribe('production_completed', (event) => {
                        Unity.TriggerEvent('ProductionCompleted', {
                            facilityId: event.sourceId,
                            productId: event.data.productId,
                            quantity: event.data.quantity,
                            timestamp: event.timestamp
                        });
                    });

                    // Inventory events
                    engine.getEventBus().subscribe('inventory_low', (event) => {
                        Unity.TriggerEvent('InventoryAlert', {
                            nodeId: event.sourceId,
                            resourceId: event.data.resourceId,
                            currentLevel: event.data.currentLevel,
                            threshold: event.data.threshold
                        });
                    });

                    // Transportation events
                    engine.getEventBus().subscribe('transport_update', (event) => {
                        Unity.TriggerEvent('TransportUpdate', {
                            vehicleId: event.sourceId,
                            status: event.data.status,
                            location: event.data.location,
                            cargo: event.data.cargo
                        });
                    });

                    // Performance metrics
                    setInterval(() => {
                        if (engine.isRunning()) {
                            const metrics = engine.getAnalytics().getSupplyChainMetrics();
                            Unity.TriggerEvent('MetricsUpdate', metrics);
                        }
                    }, 5000); // Every 5 seconds
                }
            ");
        }

        /// <summary>
        /// Start the simulation update loop
        /// </summary>
        private void StartSimulation()
        {
            InvokeRepeating(nameof(UpdateSimulation), 0f, simulationUpdateInterval / 1000.0f);
        }

        /// <summary>
        /// Update the simulation and process events
        /// </summary>
        private void UpdateSimulation()
        {
            if (!isInitialized || engine == null) return;

            float startTime = Time.realtimeSinceStartup;

            try
            {
                // Process main thread actions
                ProcessMainThreadActions();

                // Update simulation if running
                engine.Execute(@"
                    if (window.supplyChainEngine && window.supplyChainEngine.isRunning()) {
                        window.supplyChainEngine.update();
                    }
                ");

                // Track performance
                if (enablePerformanceMonitoring)
                {
                    float updateTime = (Time.realtimeSinceStartup - startTime) * 1000f;
                    TrackPerformance(updateTime);
                }
            }
            catch (Exception ex)
            {
                LogError($"Simulation update error: {ex.Message}");
            }
        }

        /// <summary>
        /// Process queued main thread actions
        /// </summary>
        private void ProcessMainThreadActions()
        {
            int processedCount = 0;
            while (mainThreadActions.Count > 0 && processedCount < maxEventsPerFrame)
            {
                Action action = mainThreadActions.Dequeue();
                try
                {
                    action?.Invoke();
                }
                catch (Exception ex)
                {
                    LogError($"Error processing main thread action: {ex.Message}");
                }
                processedCount++;
            }
        }

        /// <summary>
        /// Create a factory node in the supply chain
        /// </summary>
        public void CreateFactory(string factoryId, Vector3 position, Dictionary<string, object> config)
        {
            if (!isInitialized) return;

            try
            {
                engine.Execute($@"
                    if (window.supplyChainEngine) {{
                        const node = window.supplyChainEngine.getNetwork().createNode({{
                            id: '{factoryId}',
                            type: 'MANUFACTURER',
                            name: 'Factory {factoryId}',
                            position: {{ x: {position.x}, y: {position.y}, z: {position.z} }},
                            config: {ConvertToJavaScript(config)}
                        }});
                        console.log('Factory created:', '{factoryId}');
                    }}
                ");
            }
            catch (Exception ex)
            {
                LogError($"Failed to create factory: {ex.Message}");
            }
        }

        /// <summary>
        /// Add a production recipe to a factory
        /// </summary>
        public void AddProductionRecipe(string factoryId, string productId, Dictionary<string, int> inputs, int outputQuantity, float duration)
        {
            if (!isInitialized) return;

            try
            {
                engine.Execute($@"
                    if (window.supplyChainEngine) {{
                        const scheduler = window.supplyChainEngine.getProductionScheduler();
                        scheduler.addRecipe({{
                            id: '{productId}_recipe',
                            productId: '{productId}',
                            facilityId: '{factoryId}',
                            inputs: {ConvertToJavaScript(inputs)},
                            outputQuantity: {outputQuantity},
                            duration: {duration * 1000}
                        }});
                        console.log('Recipe added for product:', '{productId}');
                    }}
                ");
            }
            catch (Exception ex)
            {
                LogError($"Failed to add production recipe: {ex.Message}");
            }
        }

        /// <summary>
        /// Start production at a factory
        /// </summary>
        public void StartProduction(string factoryId, string productId, int quantity)
        {
            if (!isInitialized) return;

            try
            {
                engine.Execute($@"
                    if (window.supplyChainEngine) {{
                        const scheduler = window.supplyChainEngine.getProductionScheduler();
                        scheduler.scheduleProduction({{
                            facilityId: '{factoryId}',
                            productId: '{productId}',
                            quantity: {quantity},
                            priority: 'normal'
                        }});
                        console.log('Production started:', '{factoryId}', '{productId}', {quantity});
                    }}
                ");
            }
            catch (Exception ex)
            {
                LogError($"Failed to start production: {ex.Message}");
            }
        }

        /// <summary>
        /// Create a transportation route between two nodes
        /// </summary>
        public void CreateRoute(string routeId, string fromNodeId, string toNodeId, float distance, string vehicleType)
        {
            if (!isInitialized) return;

            try
            {
                engine.Execute($@"
                    if (window.supplyChainEngine) {{
                        const network = window.supplyChainEngine.getNetwork();
                        const route = network.createRoute({{
                            id: '{routeId}',
                            fromNodeId: '{fromNodeId}',
                            toNodeId: '{toNodeId}',
                            distance: {distance},
                            vehicleType: '{vehicleType}',
                            capacity: 100,
                            cost: {distance * 0.1f}
                        }});
                        console.log('Route created:', '{routeId}');
                    }}
                ");
            }
            catch (Exception ex)
            {
                LogError($"Failed to create route: {ex.Message}");
            }
        }

        /// <summary>
        /// Get current supply chain metrics
        /// </summary>
        public Dictionary<string, object> GetMetrics()
        {
            if (!isInitialized) return new Dictionary<string, object>();

            try
            {
                var result = engine.Evaluate(@"
                    window.supplyChainEngine ?
                    window.supplyChainEngine.getAnalytics().getSupplyChainMetrics() :
                    {}
                ");

                return ConvertFromJavaScript(result) as Dictionary<string, object> ?? new Dictionary<string, object>();
            }
            catch (Exception ex)
            {
                LogError($"Failed to get metrics: {ex.Message}");
                return new Dictionary<string, object>();
            }
        }

        /// <summary>
        /// Trigger Unity events from JavaScript
        /// </summary>
        private void TriggerUnityEvent(string eventName, object data)
        {
            switch (eventName)
            {
                case "ProductionCompleted":
                    OnProductionCompleted?.Invoke(data.ToString());
                    break;
                case "InventoryAlert":
                    OnInventoryAlert?.Invoke(data.ToString());
                    break;
                case "TransportUpdate":
                    OnTransportUpdate?.Invoke(data.ToString());
                    break;
                case "MetricsUpdate":
                    if (data is Dictionary<string, object> metrics)
                        OnMetricsUpdate?.Invoke(metrics);
                    break;
                case "EngineError":
                    OnError?.Invoke(data.ToString());
                    break;
            }
        }

        /// <summary>
        /// Enqueue action to run on main thread
        /// </summary>
        private void EnqueueMainThreadAction(Action action)
        {
            lock (mainThreadActions)
            {
                mainThreadActions.Enqueue(action);
            }
        }

        /// <summary>
        /// Track performance metrics
        /// </summary>
        private void TrackPerformance(float updateTime)
        {
            performanceMetrics.Add(updateTime);
            if (performanceMetrics.Count > 100)
            {
                performanceMetrics.RemoveAt(0);
            }

            eventCount++;
            if (Time.realtimeSinceStartup - lastUpdateTime >= 10f) // Every 10 seconds
            {
                float avgUpdateTime = 0f;
                foreach (float time in performanceMetrics)
                    avgUpdateTime += time;
                avgUpdateTime /= performanceMetrics.Count;

                LogDebug($"Supply Chain Performance - Avg Update Time: {avgUpdateTime:F2}ms, Events/sec: {eventCount / 10f:F1}");

                lastUpdateTime = Time.realtimeSinceStartup;
                eventCount = 0;
            }
        }

        /// <summary>
        /// Convert C# object to JavaScript format
        /// </summary>
        private string ConvertToJavaScript(object obj)
        {
            if (obj == null) return "null";
            if (obj is string str) return $"'{str}'";
            if (obj is bool boolean) return boolean.ToString().ToLower();
            if (obj is Dictionary<string, object> dict)
            {
                var pairs = new List<string>();
                foreach (var kvp in dict)
                {
                    pairs.Add($"'{kvp.Key}': {ConvertToJavaScript(kvp.Value)}");
                }
                return "{" + string.Join(", ", pairs) + "}";
            }
            return obj.ToString();
        }

        /// <summary>
        /// Convert JavaScript result to C# object
        /// </summary>
        private object ConvertFromJavaScript(object jsObject)
        {
            // Basic conversion - could be enhanced based on needs
            return jsObject;
        }

        /// <summary>
        /// Coroutine for setInterval implementation
        /// </summary>
        private System.Collections.IEnumerator IntervalCoroutine(ScriptObject callback, float interval)
        {
            while (true)
            {
                yield return new WaitForSeconds(interval);
                try
                {
                    callback.InvokeAsFunction();
                }
                catch (Exception ex)
                {
                    LogError($"Interval callback error: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Coroutine for setTimeout implementation
        /// </summary>
        private System.Collections.IEnumerator TimeoutCoroutine(ScriptObject callback, float delay)
        {
            yield return new WaitForSeconds(delay);
            try
            {
                callback.InvokeAsFunction();
            }
            catch (Exception ex)
            {
                LogError($"Timeout callback error: {ex.Message}");
            }
        }

        /// <summary>
        /// Debug logging
        /// </summary>
        private void LogDebug(string message)
        {
            if (enableDebugLogging)
                Debug.Log($"[SupplyChain] {message}");
        }

        /// <summary>
        /// Error logging
        /// </summary>
        private void LogError(string message)
        {
            Debug.LogError($"[SupplyChain] {message}");
        }

        /// <summary>
        /// Cleanup on destroy
        /// </summary>
        void OnDestroy()
        {
            try
            {
                if (engine != null)
                {
                    engine.Execute("if (window.supplyChainEngine) window.supplyChainEngine.dispose();");
                    engine.Dispose();
                }
            }
            catch (Exception ex)
            {
                LogError($"Cleanup error: {ex.Message}");
            }
        }
    }
}