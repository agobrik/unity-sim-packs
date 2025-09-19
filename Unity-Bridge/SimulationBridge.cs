using System;
using System.Runtime.InteropServices;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Bridge
{
    public class SimulationBridge : MonoBehaviour
    {
        [Header("Bridge Settings")]
        public bool useWebGLBridge = true;
        public float updateInterval = 1f;

        [Header("Available Simulations")]
        public bool enableWeather = true;
        public bool enableEconomy = true;
        public bool enablePhysics = true;
        public bool enableAI = true;

        // Events for different simulation types
        public System.Action<string> OnWeatherDataReceived;
        public System.Action<string> OnEconomyDataReceived;
        public System.Action<string> OnPhysicsDataReceived;
        public System.Action<string> OnAIDataReceived;

        private float updateTimer;

        #if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void InitializeSimulations();

        [DllImport("__Internal")]
        private static extern string GetSimulationData(string simulationType);

        [DllImport("__Internal")]
        private static extern void UpdateSimulation(string simulationType, string parameters);
        #endif

        void Start()
        {
            InitializeBridge();
        }

        void Update()
        {
            updateTimer += Time.deltaTime;

            if (updateTimer >= updateInterval)
            {
                RequestAllSimulationData();
                updateTimer = 0f;
            }
        }

        private void InitializeBridge()
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            if (useWebGLBridge)
            {
                InitializeSimulations();
                Debug.Log("🌐 WebGL Simulation Bridge initialized");
            }
            #else
            Debug.Log("🔧 Using mock simulation data (Editor/Standalone)");
            #endif
        }

        private void RequestAllSimulationData()
        {
            if (enableWeather) RequestSimulationData("weather");
            if (enableEconomy) RequestSimulationData("economy");
            if (enablePhysics) RequestSimulationData("physics");
            if (enableAI) RequestSimulationData("ai");
        }

        public void RequestSimulationData(string simulationType)
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            if (useWebGLBridge)
            {
                string data = GetSimulationData(simulationType);
                ProcessSimulationData(simulationType, data);
            }
            else
            {
                GenerateMockData(simulationType);
            }
            #else
            GenerateMockData(simulationType);
            #endif
        }

        public void UpdateSimulationParameters(string simulationType, string parameters)
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
            if (useWebGLBridge)
            {
                UpdateSimulation(simulationType, parameters);
            }
            #endif
        }

        private void ProcessSimulationData(string simulationType, string jsonData)
        {
            if (string.IsNullOrEmpty(jsonData)) return;

            try
            {
                switch (simulationType.ToLower())
                {
                    case "weather":
                        OnWeatherDataReceived?.Invoke(jsonData);
                        break;
                    case "economy":
                        OnEconomyDataReceived?.Invoke(jsonData);
                        break;
                    case "physics":
                        OnPhysicsDataReceived?.Invoke(jsonData);
                        break;
                    case "ai":
                        OnAIDataReceived?.Invoke(jsonData);
                        break;
                    default:
                        Debug.LogWarning($"Unknown simulation type: {simulationType}");
                        break;
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"Error processing {simulationType} data: {e.Message}");
            }
        }

        private void GenerateMockData(string simulationType)
        {
            switch (simulationType.ToLower())
            {
                case "weather":
                    var weatherData = new
                    {
                        timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        weather = new
                        {
                            temperature = UnityEngine.Random.Range(-10f, 35f),
                            humidity = UnityEngine.Random.Range(30, 90),
                            pressure = UnityEngine.Random.Range(990f, 1030f),
                            windSpeed = UnityEngine.Random.Range(0f, 20f),
                            systemHealth = "operational",
                            framework = "unity-sim-weather"
                        }
                    };
                    OnWeatherDataReceived?.Invoke(JsonConvert.SerializeObject(weatherData));
                    break;

                case "economy":
                    var economyData = new
                    {
                        timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        economy = new
                        {
                            marketValue = UnityEngine.Random.Range(1000f, 10000f),
                            inflation = UnityEngine.Random.Range(0f, 5f),
                            unemployment = UnityEngine.Random.Range(3f, 12f),
                            systemHealth = "operational",
                            framework = "unity-sim-economy"
                        }
                    };
                    OnEconomyDataReceived?.Invoke(JsonConvert.SerializeObject(economyData));
                    break;

                case "physics":
                    var physicsData = new
                    {
                        timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        physics = new
                        {
                            gravity = -9.81f,
                            rigidBodies = UnityEngine.Random.Range(10, 100),
                            collisions = UnityEngine.Random.Range(0, 50),
                            systemHealth = "operational",
                            framework = "unity-sim-physics"
                        }
                    };
                    OnPhysicsDataReceived?.Invoke(JsonConvert.SerializeObject(physicsData));
                    break;

                case "ai":
                    var aiData = new
                    {
                        timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
                        ai = new
                        {
                            agents = UnityEngine.Random.Range(5, 50),
                            decisions = UnityEngine.Random.Range(0, 100),
                            behaviorTrees = UnityEngine.Random.Range(1, 10),
                            systemHealth = "operational",
                            framework = "unity-sim-ai"
                        }
                    };
                    OnAIDataReceived?.Invoke(JsonConvert.SerializeObject(aiData));
                    break;
            }
        }

        // Public methods for manual control
        [ContextMenu("Request Weather Data")]
        public void RequestWeatherData() => RequestSimulationData("weather");

        [ContextMenu("Request Economy Data")]
        public void RequestEconomyData() => RequestSimulationData("economy");

        [ContextMenu("Request Physics Data")]
        public void RequestPhysicsData() => RequestSimulationData("physics");

        [ContextMenu("Request AI Data")]
        public void RequestAIData() => RequestSimulationData("ai");
    }
}