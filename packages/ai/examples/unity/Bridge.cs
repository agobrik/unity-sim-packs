using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Microsoft.ClearScript;
using Microsoft.ClearScript.V8;

namespace SteamSim.AI.Unity
{
    /// <summary>
    /// JavaScript execution bridge for Unity integration with Steam AI package
    /// Supports both ClearScript V8 and Jint engines
    /// </summary>
    public class JavaScriptBridge : MonoBehaviour
    {
        public static JavaScriptBridge Instance { get; private set; }

        [Header("Configuration")]
        [SerializeField] private bool useV8Engine = true;
        [SerializeField] private bool enableDebugLogging = false;
        [SerializeField] private string aiPackagePath = "JavaScript/steam-ai.js";

        private V8ScriptEngine v8Engine;
        private bool isInitialized = false;
        private Dictionary<string, object> globalObjects = new Dictionary<string, object>();

        // Events
        public event Action<string> OnJavaScriptError;
        public event Action OnEngineInitialized;

        void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializeEngine();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        void OnDestroy()
        {
            CleanupEngine();
        }

        /// <summary>
        /// Initialize the JavaScript engine and load the Steam AI package
        /// </summary>
        private void InitializeEngine()
        {
            try
            {
                if (useV8Engine)
                {
                    InitializeV8Engine();
                }
                else
                {
                    Debug.LogError("Jint engine not implemented in this example. Please use V8 engine.");
                    return;
                }

                LoadSteamAIPackage();
                SetupUnityBindings();
                isInitialized = true;
                OnEngineInitialized?.Invoke();

                if (enableDebugLogging)
                {
                    Debug.Log("JavaScript Bridge initialized successfully");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to initialize JavaScript engine: {ex.Message}");
                OnJavaScriptError?.Invoke(ex.Message);
            }
        }

        /// <summary>
        /// Initialize V8 JavaScript engine
        /// </summary>
        private void InitializeV8Engine()
        {
            v8Engine = new V8ScriptEngine(V8ScriptEngineFlags.EnableDebugging);

            // Set up global objects
            v8Engine.AddHostType("Console", typeof(Console));
            v8Engine.AddHostType("Math", typeof(Math));
            v8Engine.AddHostType("DateTime", typeof(DateTime));

            // Add Unity-specific objects
            v8Engine.AddHostObject("Unity", new UnityBridge());
            v8Engine.AddHostObject("Debug", new DebugBridge());
            v8Engine.AddHostObject("Time", new TimeBridge());
            v8Engine.AddHostObject("Vector3", new Vector3Bridge());
        }

        /// <summary>
        /// Load the Steam AI package JavaScript code
        /// </summary>
        private void LoadSteamAIPackage()
        {
            string filePath = Path.Combine(Application.streamingAssetsPath, aiPackagePath);

            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"Steam AI package not found at: {filePath}");
            }

            string jsCode = File.ReadAllText(filePath);
            ExecuteScript(jsCode);

            if (enableDebugLogging)
            {
                Debug.Log("Steam AI package loaded successfully");
            }
        }

        /// <summary>
        /// Set up Unity-specific bindings for the JavaScript environment
        /// </summary>
        private void SetupUnityBindings()
        {
            // Create Unity-specific helper functions
            string unityHelpers = @"
                // Unity helper functions
                window.Unity = {
                    log: function(message) {
                        Debug.Log(message);
                    },
                    warn: function(message) {
                        Debug.LogWarning(message);
                    },
                    error: function(message) {
                        Debug.LogError(message);
                    },
                    time: function() {
                        return Time.time;
                    },
                    deltaTime: function() {
                        return Time.deltaTime;
                    },
                    createVector3: function(x, y, z) {
                        return Vector3.create(x, y, z);
                    },
                    distance: function(a, b) {
                        return Vector3.distance(a, b);
                    }
                };

                // Console compatibility
                if (typeof console === 'undefined') {
                    window.console = {
                        log: Unity.log,
                        warn: Unity.warn,
                        error: Unity.error
                    };
                }
            ";

            ExecuteScript(unityHelpers);
        }

        /// <summary>
        /// Execute JavaScript code in the engine
        /// </summary>
        public T ExecuteScript<T>(string script)
        {
            if (!isInitialized)
            {
                throw new InvalidOperationException("JavaScript engine not initialized");
            }

            try
            {
                if (useV8Engine)
                {
                    return (T)v8Engine.Evaluate(script);
                }
                else
                {
                    throw new NotImplementedException("Jint engine not implemented");
                }
            }
            catch (Exception ex)
            {
                string error = $"JavaScript execution error: {ex.Message}";
                if (enableDebugLogging)
                {
                    Debug.LogError(error);
                }
                OnJavaScriptError?.Invoke(error);
                throw;
            }
        }

        /// <summary>
        /// Execute JavaScript code without return value
        /// </summary>
        public void ExecuteScript(string script)
        {
            ExecuteScript<object>(script);
        }

        /// <summary>
        /// Execute a JavaScript function with parameters
        /// </summary>
        public T ExecuteFunction<T>(string functionName, params object[] parameters)
        {
            if (!isInitialized)
            {
                throw new InvalidOperationException("JavaScript engine not initialized");
            }

            try
            {
                if (useV8Engine)
                {
                    var func = v8Engine.Evaluate(functionName);
                    return (T)v8Engine.Invoke(func, parameters);
                }
                else
                {
                    throw new NotImplementedException("Jint engine not implemented");
                }
            }
            catch (Exception ex)
            {
                string error = $"JavaScript function execution error: {ex.Message}";
                if (enableDebugLogging)
                {
                    Debug.LogError(error);
                }
                OnJavaScriptError?.Invoke(error);
                throw;
            }
        }

        /// <summary>
        /// Add a global object to the JavaScript environment
        /// </summary>
        public void AddGlobalObject(string name, object obj)
        {
            if (!isInitialized)
            {
                globalObjects[name] = obj;
                return;
            }

            if (useV8Engine)
            {
                v8Engine.AddHostObject(name, obj);
            }

            globalObjects[name] = obj;
        }

        /// <summary>
        /// Remove a global object from the JavaScript environment
        /// </summary>
        public void RemoveGlobalObject(string name)
        {
            globalObjects.Remove(name);

            if (isInitialized && useV8Engine)
            {
                v8Engine.Execute($"delete {name};");
            }
        }

        /// <summary>
        /// Force garbage collection in the JavaScript engine
        /// </summary>
        public void ForceGarbageCollection()
        {
            if (!isInitialized) return;

            if (useV8Engine)
            {
                v8Engine.CollectGarbage(true);
            }
        }

        /// <summary>
        /// Cleanup the JavaScript engine
        /// </summary>
        private void CleanupEngine()
        {
            try
            {
                if (v8Engine != null)
                {
                    v8Engine.Dispose();
                    v8Engine = null;
                }

                isInitialized = false;

                if (enableDebugLogging)
                {
                    Debug.Log("JavaScript engine cleaned up");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"Error during JavaScript engine cleanup: {ex.Message}");
            }
        }

        /// <summary>
        /// Begin a batch operation for better performance
        /// </summary>
        public void BeginBatch()
        {
            // V8 doesn't have explicit batch operations, but we can disable interrupts
            if (useV8Engine && v8Engine != null)
            {
                v8Engine.DisableTypeRestriction = true;
            }
        }

        /// <summary>
        /// End a batch operation
        /// </summary>
        public void EndBatch()
        {
            if (useV8Engine && v8Engine != null)
            {
                v8Engine.DisableTypeRestriction = false;
            }
        }

        public bool EnableDebugLogging
        {
            get => enableDebugLogging;
            set => enableDebugLogging = value;
        }

        public bool IsInitialized => isInitialized;
    }

    /// <summary>
    /// Unity bridge class for JavaScript access
    /// </summary>
    public class UnityBridge
    {
        public string version => Application.version;
        public string platform => Application.platform.ToString();
        public bool isPlaying => Application.isPlaying;
        public string dataPath => Application.dataPath;
    }

    /// <summary>
    /// Debug bridge class for JavaScript access
    /// </summary>
    public class DebugBridge
    {
        public void Log(string message) => Debug.Log(message);
        public void LogWarning(string message) => Debug.LogWarning(message);
        public void LogError(string message) => Debug.LogError(message);
    }

    /// <summary>
    /// Time bridge class for JavaScript access
    /// </summary>
    public class TimeBridge
    {
        public float time => Time.time;
        public float deltaTime => Time.deltaTime;
        public float fixedTime => Time.fixedTime;
        public float timeScale => Time.timeScale;
        public int frameCount => Time.frameCount;
    }

    /// <summary>
    /// Vector3 bridge class for JavaScript access
    /// </summary>
    public class Vector3Bridge
    {
        public object create(float x, float y, float z)
        {
            return new { x = x, y = y, z = z };
        }

        public float distance(object a, object b)
        {
            try
            {
                dynamic va = a;
                dynamic vb = b;
                float dx = va.x - vb.x;
                float dy = va.y - vb.y;
                float dz = va.z - vb.z;
                return Mathf.Sqrt(dx * dx + dy * dy + dz * dz);
            }
            catch
            {
                return 0f;
            }
        }

        public object normalize(object vector)
        {
            try
            {
                dynamic v = vector;
                float magnitude = Mathf.Sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                if (magnitude > 0f)
                {
                    return new { x = v.x / magnitude, y = v.y / magnitude, z = v.z / magnitude };
                }
                return new { x = 0f, y = 0f, z = 0f };
            }
            catch
            {
                return new { x = 0f, y = 0f, z = 0f };
            }
        }
    }
}