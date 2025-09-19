using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.UI;
using Newtonsoft.Json;

namespace UnitySim.Testing
{
    /// <summary>
    /// Specialized validator for JSON export functionality across all Unity simulation systems
    /// Ensures all systems properly export their data in JSON format
    /// </summary>
    public class JsonExportValidator : MonoBehaviour
    {
        [Header("JSON Export Testing")]
        public bool runTestOnStart = true;
        public bool enableDetailedLogging = true;
        public float testDuration = 5f;
        public bool realTimeValidation = true;

        [Header("UI Display")]
        public Text statusDisplay;
        public Text resultsDisplay;
        public Button startTestButton;
        public Button exportReportButton;

        [Header("Test Configuration")]
        public bool validateJsonStructure = true;
        public bool testDataConsistency = true;
        public bool checkTimestampFields = true;
        public bool verifyDataTypes = true;

        // Test Results
        [System.Serializable]
        public class JsonExportTestResult
        {
            public string systemName;
            public bool exportMethodExists;
            public bool exportExecutesSuccessfully;
            public bool jsonIsValid;
            public bool hasRequiredFields;
            public bool timestampsValid;
            public bool dataTypesCorrect;
            public string exportedJson;
            public List<string> missingFields = new List<string>();
            public List<string> errors = new List<string>();
            public float responseTime;
            public int dataSize;

            public bool IsFullyValid => exportMethodExists && exportExecutesSuccessfully &&
                                       jsonIsValid && hasRequiredFields && timestampsValid && dataTypesCorrect;
        }

        private List<JsonExportTestResult> testResults = new List<JsonExportTestResult>();
        private bool isTesting = false;
        private int systemsProcessed = 0;

        // Expected systems for JSON export testing
        private readonly string[] expectedSystems = {
            "AdvancedEconomicsSystem", "AgricultureSystem", "AISystem", "AIDecisionFrameworkSystem",
            "AnalyticsSystem", "DataVisualizationSystem", "DisasterManagementSystem", "EconomySystem",
            "EcosystemSystem", "ElectricalGridSystem", "FluidDynamicsSystem", "ManufacturingSystem",
            "MiningGeologySystem", "MLIntegrationSystem", "ModdingSystem", "NetworkMultiplayerSystem",
            "PerformanceSystem", "PhysicsSystem", "PopulationSystem", "ProceduralSystem",
            "ProceduralGenerationSystem", "RealWorldDataAdaptersSystem", "ResourcesSystem",
            "SimulationAlgorithmsSystem", "SupplyChainSystem", "TimeSystem", "UITemplatesSystem",
            "UrbanPlanningSystem", "VehicleSimulationSystem", "WeatherSystem"
        };

        // Required fields that should be present in JSON exports
        private readonly string[] requiredFields = {
            "timestamp", "currentTime"
        };

        #region Unity Lifecycle

        void Start()
        {
            InitializeValidator();
            if (runTestOnStart)
            {
                StartJsonExportTest();
            }
        }

        void Update()
        {
            if (realTimeValidation && isTesting)
            {
                UpdateStatusDisplay();
            }
        }

        #endregion

        #region Initialization

        private void InitializeValidator()
        {
            SetupUI();

            Debug.Log("📊 JSON Export Validator Initialized");
            Debug.Log($"🎯 Systems to test: {expectedSystems.Length}");
        }

        private void SetupUI()
        {
            if (startTestButton != null)
                startTestButton.onClick.AddListener(StartJsonExportTest);

            if (exportReportButton != null)
                exportReportButton.onClick.AddListener(ExportTestReport);

            UpdateStatusDisplay();
        }

        #endregion

        #region JSON Export Testing

        public void StartJsonExportTest()
        {
            if (isTesting) return;

            Debug.Log("🚀 Starting JSON Export Validation Test...");
            StartCoroutine(RunJsonExportTestSequence());
        }

        private IEnumerator RunJsonExportTestSequence()
        {
            isTesting = true;
            testResults.Clear();
            systemsProcessed = 0;

            UpdateStatusDisplay();

            foreach (string systemName in expectedSystems)
            {
                Debug.Log($"📊 Testing JSON export for: {systemName}");

                var result = new JsonExportTestResult
                {
                    systemName = systemName,
                    responseTime = Time.time
                };

                yield return StartCoroutine(TestSystemJsonExport(systemName, result));

                result.responseTime = Time.time - result.responseTime;
                testResults.Add(result);
                systemsProcessed++;

                UpdateStatusDisplay();

                // Small delay between tests
                yield return new WaitForSeconds(0.1f);
            }

            isTesting = false;
            FinalizeJsonExportTest();
        }

        private IEnumerator TestSystemJsonExport(string systemName, JsonExportTestResult result)
        {
            try
            {
                // Step 1: Find and test the system
                yield return StartCoroutine(FindAndTestSystem(systemName, result));

                // Step 2: Validate JSON structure if export was successful
                if (result.exportExecutesSuccessfully && !string.IsNullOrEmpty(result.exportedJson))
                {
                    yield return StartCoroutine(ValidateJsonStructure(result));
                    yield return StartCoroutine(ValidateRequiredFields(result));
                    yield return StartCoroutine(ValidateTimestamps(result));
                    yield return StartCoroutine(ValidateDataTypes(result));
                }

            }
            catch (System.Exception e)
            {
                result.errors.Add($"JSON export test failed: {e.Message}");
                Debug.LogError($"❌ JSON export test failed for {systemName}: {e.Message}");
            }
        }

        private IEnumerator FindAndTestSystem(string systemName, JsonExportTestResult result)
        {
            try
            {
                // Find system type
                Type systemType = FindSystemType(systemName);

                if (systemType == null)
                {
                    result.exportMethodExists = false;
                    result.errors.Add($"System type {systemName} not found");
                    yield break;
                }

                // Check if ExportState method exists
                MethodInfo exportMethod = systemType.GetMethod("ExportState");
                result.exportMethodExists = exportMethod != null;

                if (!result.exportMethodExists)
                {
                    result.errors.Add("ExportState method not found");
                    yield break;
                }

                // Create temporary instance for testing
                GameObject testObject = new GameObject($"JsonTest_{systemName}");

                try
                {
                    MonoBehaviour systemComponent = testObject.AddComponent(systemType) as MonoBehaviour;

                    if (systemComponent == null)
                    {
                        result.errors.Add("Failed to create system component");
                        yield break;
                    }

                    // Wait for system initialization
                    yield return new WaitForSeconds(0.2f);

                    // Test JSON export
                    float startTime = Time.realtimeSinceStartup;
                    string jsonData = (string)exportMethod.Invoke(systemComponent, null);
                    float exportTime = Time.realtimeSinceStartup - startTime;

                    result.responseTime = exportTime;
                    result.exportExecutesSuccessfully = !string.IsNullOrEmpty(jsonData);
                    result.exportedJson = jsonData;
                    result.dataSize = jsonData?.Length ?? 0;

                    if (!result.exportExecutesSuccessfully)
                    {
                        result.errors.Add("ExportState returned null or empty data");
                    }

                    if (enableDetailedLogging)
                        Debug.Log($"✅ JSON export test for {systemName}: Success={result.exportExecutesSuccessfully}, Size={result.dataSize} bytes");
                }
                finally
                {
                    DestroyImmediate(testObject);
                }
            }
            catch (System.Exception e)
            {
                result.exportExecutesSuccessfully = false;
                result.errors.Add($"System testing failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateJsonStructure(JsonExportTestResult result)
        {
            try
            {
                if (validateJsonStructure && !string.IsNullOrEmpty(result.exportedJson))
                {
                    // Try to parse JSON to verify it's valid
                    var parsed = JsonConvert.DeserializeObject(result.exportedJson);
                    result.jsonIsValid = parsed != null;

                    if (!result.jsonIsValid)
                    {
                        result.errors.Add("JSON parsing failed - invalid JSON structure");
                    }
                    else if (enableDetailedLogging)
                    {
                        Debug.Log($"✅ JSON structure valid for {result.systemName}");
                    }
                }
                else
                {
                    result.jsonIsValid = false;
                    result.errors.Add("No JSON data to validate");
                }
            }
            catch (JsonException e)
            {
                result.jsonIsValid = false;
                result.errors.Add($"JSON validation failed: {e.Message}");
            }
            catch (System.Exception e)
            {
                result.jsonIsValid = false;
                result.errors.Add($"JSON structure validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateRequiredFields(JsonExportTestResult result)
        {
            try
            {
                if (result.jsonIsValid && !string.IsNullOrEmpty(result.exportedJson))
                {
                    var parsed = JsonConvert.DeserializeObject<Dictionary<string, object>>(result.exportedJson);

                    result.hasRequiredFields = true;
                    result.missingFields.Clear();

                    foreach (string requiredField in requiredFields)
                    {
                        if (!parsed.ContainsKey(requiredField))
                        {
                            result.hasRequiredFields = false;
                            result.missingFields.Add(requiredField);
                        }
                    }

                    if (result.hasRequiredFields && enableDetailedLogging)
                    {
                        Debug.Log($"✅ Required fields present for {result.systemName}");
                    }
                    else if (!result.hasRequiredFields)
                    {
                        result.errors.Add($"Missing required fields: {string.Join(", ", result.missingFields)}");
                    }
                }
                else
                {
                    result.hasRequiredFields = false;
                    result.errors.Add("Cannot validate fields - invalid JSON");
                }
            }
            catch (System.Exception e)
            {
                result.hasRequiredFields = false;
                result.errors.Add($"Required fields validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateTimestamps(JsonExportTestResult result)
        {
            try
            {
                if (checkTimestampFields && result.jsonIsValid && !string.IsNullOrEmpty(result.exportedJson))
                {
                    var parsed = JsonConvert.DeserializeObject<Dictionary<string, object>>(result.exportedJson);

                    result.timestampsValid = true;

                    // Check timestamp field
                    if (parsed.ContainsKey("timestamp"))
                    {
                        if (!long.TryParse(parsed["timestamp"].ToString(), out long timestamp) || timestamp <= 0)
                        {
                            result.timestampsValid = false;
                            result.errors.Add("Invalid timestamp format or value");
                        }
                    }

                    // Check currentTime field
                    if (parsed.ContainsKey("currentTime"))
                    {
                        if (!long.TryParse(parsed["currentTime"].ToString(), out long currentTime) || currentTime <= 0)
                        {
                            result.timestampsValid = false;
                            result.errors.Add("Invalid currentTime format or value");
                        }
                    }

                    if (result.timestampsValid && enableDetailedLogging)
                    {
                        Debug.Log($"✅ Timestamps valid for {result.systemName}");
                    }
                }
                else
                {
                    result.timestampsValid = false;
                    result.errors.Add("Cannot validate timestamps - invalid JSON");
                }
            }
            catch (System.Exception e)
            {
                result.timestampsValid = false;
                result.errors.Add($"Timestamp validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateDataTypes(JsonExportTestResult result)
        {
            try
            {
                if (verifyDataTypes && result.jsonIsValid && !string.IsNullOrEmpty(result.exportedJson))
                {
                    var parsed = JsonConvert.DeserializeObject<Dictionary<string, object>>(result.exportedJson);

                    result.dataTypesCorrect = true;

                    // Check for nested data structure (e.g., weather, economy, physics)
                    string expectedDataKey = result.systemName.Replace("System", "").ToLower();
                    bool hasNestedData = parsed.Keys.Any(k => k.ToLower().Contains(expectedDataKey) ||
                                                            k.ToLower() == expectedDataKey ||
                                                            parsed[k] is Newtonsoft.Json.Linq.JObject);

                    if (!hasNestedData)
                    {
                        result.dataTypesCorrect = false;
                        result.errors.Add($"Expected nested data structure not found");
                    }

                    if (result.dataTypesCorrect && enableDetailedLogging)
                    {
                        Debug.Log($"✅ Data types correct for {result.systemName}");
                    }
                }
                else
                {
                    result.dataTypesCorrect = false;
                    result.errors.Add("Cannot validate data types - invalid JSON");
                }
            }
            catch (System.Exception e)
            {
                result.dataTypesCorrect = false;
                result.errors.Add($"Data type validation failed: {e.Message}");
            }

            yield return null;
        }

        #endregion

        #region Helper Methods

        private Type FindSystemType(string systemName)
        {
            foreach (Assembly assembly in System.AppDomain.CurrentDomain.GetAssemblies())
            {
                Type[] types = assembly.GetTypes();
                foreach (Type type in types)
                {
                    if (type.Name == systemName && typeof(MonoBehaviour).IsAssignableFrom(type))
                    {
                        return type;
                    }
                }
            }
            return null;
        }

        #endregion

        #region Results and Display

        private void UpdateStatusDisplay()
        {
            if (statusDisplay != null)
            {
                string status = isTesting ?
                    $"📊 JSON EXPORT TESTING...\n" +
                    $"Progress: {systemsProcessed}/{expectedSystems.Length}\n" +
                    $"✅ Valid Exports: {testResults.Count(r => r.IsFullyValid)}\n" +
                    $"❌ Invalid Exports: {testResults.Count(r => !r.IsFullyValid)}" :
                    $"🏁 JSON EXPORT TEST COMPLETED\n" +
                    $"Total Systems: {testResults.Count}\n" +
                    $"✅ Valid Exports: {testResults.Count(r => r.IsFullyValid)}\n" +
                    $"❌ Invalid Exports: {testResults.Count(r => !r.IsFullyValid)}\n" +
                    $"Success Rate: {(testResults.Count > 0 ? (testResults.Count(r => r.IsFullyValid) * 100f / testResults.Count) : 0):F1}%";

                statusDisplay.text = status;
            }
        }

        private void FinalizeJsonExportTest()
        {
            Debug.Log("📊 JSON EXPORT VALIDATION SUMMARY:");
            Debug.Log("==================================");

            int validExports = testResults.Count(r => r.IsFullyValid);
            int invalidExports = testResults.Count - validExports;

            Debug.Log($"Total Systems Tested: {testResults.Count}");
            Debug.Log($"✅ Valid JSON Exports: {validExports}");
            Debug.Log($"❌ Invalid JSON Exports: {invalidExports}");
            Debug.Log($"Success Rate: {(testResults.Count > 0 ? (validExports * 100f / testResults.Count) : 0):F1}%");

            // Performance statistics
            if (testResults.Count > 0)
            {
                float avgResponseTime = testResults.Average(r => r.responseTime);
                int avgDataSize = (int)testResults.Average(r => r.dataSize);
                Debug.Log($"📈 Average Response Time: {avgResponseTime:F3}s");
                Debug.Log($"📈 Average JSON Size: {avgDataSize} bytes");
            }

            // Detailed results
            foreach (var result in testResults)
            {
                string status = result.IsFullyValid ? "✅" : "❌";
                Debug.Log($"{status} {result.systemName}: " +
                    $"Export={result.exportExecutesSuccessfully}, " +
                    $"JSON={result.jsonIsValid}, " +
                    $"Fields={result.hasRequiredFields}, " +
                    $"Timestamps={result.timestampsValid}, " +
                    $"Types={result.dataTypesCorrect}");

                if (!result.IsFullyValid)
                {
                    foreach (string error in result.errors)
                        Debug.LogWarning($"  Error: {error}");
                    foreach (string missing in result.missingFields)
                        Debug.LogWarning($"  Missing: {missing}");
                }
            }

            UpdateResultsDisplay();
        }

        private void UpdateResultsDisplay()
        {
            if (resultsDisplay != null)
            {
                string results = "📊 JSON EXPORT VALIDATION RESULTS:\n\n";

                foreach (var result in testResults)
                {
                    string status = result.IsFullyValid ? "✅" : "❌";
                    results += $"{status} {result.systemName}\n";
                    results += $"  Size: {result.dataSize} bytes, Time: {result.responseTime:F3}s\n";

                    if (!result.IsFullyValid && result.errors.Count > 0)
                    {
                        results += $"  Issues: {string.Join(", ", result.errors.Take(2))}\n";
                    }
                    results += "\n";
                }

                int validCount = testResults.Count(r => r.IsFullyValid);
                results += $"🎯 FINAL SCORE: {validCount}/{testResults.Count} " +
                          $"({(testResults.Count > 0 ? (validCount * 100f / testResults.Count) : 0):F1}%)";

                resultsDisplay.text = results;
            }
        }

        public void ExportTestReport()
        {
            var exportData = new
            {
                testDate = System.DateTime.Now.ToString(),
                totalSystems = testResults.Count,
                validExports = testResults.Count(r => r.IsFullyValid),
                invalidExports = testResults.Count(r => !r.IsFullyValid),
                successRate = testResults.Count > 0 ? (testResults.Count(r => r.IsFullyValid) * 100f / testResults.Count) : 0,
                averageResponseTime = testResults.Count > 0 ? testResults.Average(r => r.responseTime) : 0,
                averageDataSize = testResults.Count > 0 ? testResults.Average(r => r.dataSize) : 0,
                testConfiguration = new
                {
                    validateJsonStructure,
                    testDataConsistency,
                    checkTimestampFields,
                    verifyDataTypes,
                    testDuration
                },
                detailedResults = testResults
            };

            string jsonData = JsonConvert.SerializeObject(exportData, Formatting.Indented);

            // Save to file
            string fileName = $"json_export_validation_report_{System.DateTime.Now:yyyyMMdd_HHmmss}.json";
            string filePath = System.IO.Path.Combine(Application.persistentDataPath, fileName);
            System.IO.File.WriteAllText(filePath, jsonData);

            Debug.Log($"📄 JSON export validation report exported to: {filePath}");
            Debug.Log($"📊 Summary: {testResults.Count(r => r.IsFullyValid)}/{testResults.Count} systems have valid JSON export");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Test JSON Exports")]
        public void TestAllJsonExports()
        {
            StartJsonExportTest();
        }

        [ContextMenu("Export Test Report")]
        public void ForceExportReport()
        {
            ExportTestReport();
        }

        #endregion

        void OnGUI()
        {
            GUILayout.BeginArea(new Rect(Screen.width - 300, 10, 290, 400));

            GUILayout.Label("JSON Export Validator", GUI.skin.box);

            if (!isTesting)
            {
                if (GUILayout.Button("📊 Test All JSON Exports"))
                    StartJsonExportTest();

                if (GUILayout.Button("📄 Export Report"))
                    ExportTestReport();
            }
            else
            {
                GUILayout.Label($"Testing: {systemsProcessed}/{expectedSystems.Length}");
                float progress = expectedSystems.Length > 0 ? (float)systemsProcessed / expectedSystems.Length : 0f;
                GUILayout.Label($"Progress: {progress * 100:F0}%");
            }

            GUILayout.Space(10);

            if (testResults.Count > 0)
            {
                int validCount = testResults.Count(r => r.IsFullyValid);
                GUILayout.Label($"✅ Valid: {validCount}");
                GUILayout.Label($"❌ Invalid: {testResults.Count - validCount}");
                GUILayout.Label($"Success: {(validCount * 100f / testResults.Count):F1}%");

                if (testResults.Count > 0)
                {
                    float avgTime = testResults.Average(r => r.responseTime);
                    int avgSize = (int)testResults.Average(r => r.dataSize);
                    GUILayout.Label($"Avg Time: {avgTime:F3}s");
                    GUILayout.Label($"Avg Size: {avgSize} bytes");
                }
            }

            GUILayout.EndArea();
        }
    }
}